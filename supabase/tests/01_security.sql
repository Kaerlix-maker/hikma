-- Security tests for Hikma. Any failure stops the run.
\set ON_ERROR_STOP on
\set QUIET on

insert into auth.users values
  ('00000000-0000-0000-0000-00000000000a', 'alice@shop.test'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@shop.test');

create or replace function test_as(role_name text, uid text default null) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid, ''), false);
  execute format('set role %I', role_name);
end $$;
grant execute on function test_as(text, text) to anon, authenticated, service_role;

select test_as('authenticated', '00000000-0000-0000-0000-00000000000a');
insert into assistants (owner_id, name, knowledge) values ('00000000-0000-0000-0000-00000000000a', 'Alice Bakery', 'SECRET: supplier margin is 60%');
reset role;
select test_as('service_role');
insert into questions (assistant_id, question, answer, answered) select id, 'Open on Sunday?', 'Yes, 8-13.', true from assistants;
insert into leads (assistant_id, email, question) select id, 'client@mail.test', 'Do you deliver?' from assistants;
reset role;

\echo '1. visitors cannot read the private knowledge base'
select test_as('anon');
do $$ begin
  if (select count(*) from assistants) <> 1 then raise exception 'FAIL: anon cannot see public face'; end if;
  begin perform knowledge from assistants; raise exception 'FAIL: anon read knowledge';
  exception when insufficient_privilege then null; end;
  begin perform owner_id from assistants; raise exception 'FAIL: anon read owner_id';
  exception when insufficient_privilege then null; end;
end $$;

\echo '2. visitors cannot read questions or leads, or call the limiter'
do $$ begin
  begin perform 1 from questions; raise exception 'FAIL: anon read questions'; exception when insufficient_privilege then null; end;
  begin perform 1 from leads;     raise exception 'FAIL: anon read leads';     exception when insufficient_privilege then null; end;
  begin perform ai_allow('x', gen_random_uuid()); raise exception 'FAIL: anon called ai_allow'; exception when insufficient_privilege then null; end;
end $$;
reset role;

\echo '3. owners are isolated from each other'
select test_as('authenticated', '00000000-0000-0000-0000-00000000000b');
do $$ begin
  if (select count(*) from assistants) <> 0 then raise exception 'FAIL: Bob sees Alice''s assistant'; end if;
  if (select count(*) from questions) <> 0 then raise exception 'FAIL: Bob sees Alice''s questions'; end if;
  if (select count(*) from leads) <> 0 then raise exception 'FAIL: Bob sees Alice''s leads'; end if;
  update assistants set knowledge = 'hacked';
  delete from assistants;
  if exists (select 1 from assistant_stats((select id from public.assistants limit 1))) then raise exception 'FAIL: stats leak'; end if;
end $$;
reset role;
do $$ begin
  if (select knowledge from assistants) <> 'SECRET: supplier margin is 60%' then raise exception 'FAIL: Bob modified Alice''s knowledge'; end if;
end $$;

\echo '4. owners cannot hand an assistant to someone else or forge leads'
select test_as('authenticated', '00000000-0000-0000-0000-00000000000a');
do $$ begin
  begin update assistants set owner_id = '00000000-0000-0000-0000-00000000000b'; raise exception 'FAIL: owner_id changed';
  exception when insufficient_privilege then null; end;
  begin insert into leads (assistant_id, email, question) select id, 'x@y.z', 'q' from assistants; raise exception 'FAIL: owner inserted lead';
  exception when insufficient_privilege then null; end;
  update leads set handled = true;
  if (select count(*) from leads where handled) <> 1 then raise exception 'FAIL: owner cannot mark lead handled'; end if;
  begin update leads set email = 'changed@x.y'; raise exception 'FAIL: owner edited lead email';
  exception when insufficient_privilege then null; end;
end $$;

\echo '5. at most 3 assistants per account'
do $$ begin
  insert into assistants (owner_id, name) values ('00000000-0000-0000-0000-00000000000a', 'Two'), ('00000000-0000-0000-0000-00000000000a', 'Three');
  begin
    insert into assistants (owner_id, name) values ('00000000-0000-0000-0000-00000000000a', 'Four');
    raise exception 'FAIL: 4th assistant created';
  exception when insufficient_privilege then null; end;
end $$;

\echo '6. stats are visible to the owner'
do $$ declare r record; begin
  select * into r from assistant_stats((select id from assistants where name = 'Alice Bakery'));
  if r.questions_30d <> 1 or r.answered_pct <> 100 or r.leads_open <> 0 then raise exception 'FAIL: stats %', r; end if;
end $$;
reset role;

\echo '7. AI limits: per visitor, per assistant, global'
select test_as('service_role');
do $$ declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); begin
  for i in 1..3 loop if not ai_allow('v1', a, 3, 100, 100) then raise exception 'FAIL: call % refused', i; end if; end loop;
  if ai_allow('v1', a, 3, 100, 100) then raise exception 'FAIL: visitor hourly cap ignored'; end if;
  if not ai_allow('v2', a, 3, 100, 100) then raise exception 'FAIL: other visitor blocked'; end if;
  if ai_allow('v3', a, 10, 4, 100) then raise exception 'FAIL: assistant daily cap ignored'; end if;
  if not ai_allow('v3', b, 10, 4, 100) then raise exception 'FAIL: other assistant blocked'; end if;
  if ai_allow('v4', gen_random_uuid(), 10, 10, 5) then  /* 5 calls already made today */ raise exception 'FAIL: global cap ignored'; end if;
end $$;
reset role;

\echo 'ALL DATABASE TESTS PASSED'
