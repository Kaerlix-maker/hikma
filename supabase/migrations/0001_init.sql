-- =====================================================================
-- Hikma — an AI assistant any business can embed on its website.
--
-- Security model:
--   * Owners manage only their own assistants (RLS on owner_id).
--   * The knowledge base is PRIVATE: visitors never read it directly —
--     only the server reads it to answer, through the service role.
--   * Visitors only see an assistant's public face (name, colour, welcome)
--     through column-level grants.
--   * Questions and leads are written by the server only.
--   * AI usage is capped per visitor, per assistant and globally.
-- =====================================================================

create table public.assistants (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  name            text not null check (char_length(name) between 2 and 80),          -- business name
  bot_name        text not null default 'Assistant' check (char_length(bot_name) between 1 and 40),
  welcome         text not null default 'Hi! How can I help you today?' check (char_length(welcome) <= 300),
  brand_color     text not null default '#4f8cff' check (brand_color ~ '^#[0-9a-fA-F]{6}$'),
  knowledge       text not null default '' check (char_length(knowledge) <= 40000),
  allowed_domains text[] not null default '{}' check (cardinality(allowed_domains) <= 10),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on public.assistants (owner_id);

create table public.questions (
  id           bigserial primary key,
  assistant_id uuid not null references public.assistants(id) on delete cascade,
  question     text not null check (char_length(question) <= 500),
  answer       text not null check (char_length(answer) <= 2000),
  answered     boolean not null,
  sources      text[] not null default '{}',
  created_at   timestamptz not null default now()
);
create index on public.questions (assistant_id, created_at desc);

create table public.leads (
  id           bigserial primary key,
  assistant_id uuid not null references public.assistants(id) on delete cascade,
  email        text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 200),
  question     text not null check (char_length(question) <= 500),
  handled      boolean not null default false,
  created_at   timestamptz not null default now()
);
create index on public.leads (assistant_id, created_at desc);

create table public.ai_requests (
  id           bigserial primary key,
  key_hash     text not null,
  assistant_id uuid,
  created_at   timestamptz not null default now()
);
create index on public.ai_requests (key_hash, created_at);
create index on public.ai_requests (assistant_id, created_at);
create index on public.ai_requests (created_at);

-- ---------- helpers ----------
create function public.owns_assistant(a uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.assistants x where x.id = a and x.owner_id = auth.uid());
$$;

create function public.can_add_assistant() returns boolean
language sql stable security definer set search_path = '' as $$
  select (select count(*) from public.assistants where owner_id = auth.uid()) < 3;
$$;

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger assistants_touch before update on public.assistants
  for each row execute function public.touch_updated_at();

-- ---------- RLS ----------
alter table public.assistants  enable row level security;
alter table public.questions   enable row level security;
alter table public.leads       enable row level security;
alter table public.ai_requests enable row level security;   -- no policies: server only

create policy "owner manages assistants" on public.assistants for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "max 3 assistants per account" on public.assistants as restrictive for insert to authenticated
  with check (public.can_add_assistant());
create policy "public reads assistants" on public.assistants for select to anon using (true);

create policy "owner reads questions" on public.questions for select to authenticated using (public.owns_assistant(assistant_id));
create policy "owner reads leads"     on public.leads     for select to authenticated using (public.owns_assistant(assistant_id));
create policy "owner updates leads"   on public.leads     for update to authenticated
  using (public.owns_assistant(assistant_id)) with check (public.owns_assistant(assistant_id));

-- ---------- column-level grants ----------
revoke all on public.assistants, public.questions, public.leads, public.ai_requests from anon, authenticated;

-- visitors: the assistant's public face only — never the knowledge base
grant select (id, name, bot_name, welcome, brand_color, allowed_domains) on public.assistants to anon;

grant select, delete on public.assistants to authenticated;
grant insert (owner_id, name, bot_name, welcome, brand_color, knowledge, allowed_domains) on public.assistants to authenticated;
grant update (name, bot_name, welcome, brand_color, knowledge, allowed_domains) on public.assistants to authenticated;
grant select on public.questions to authenticated;
grant select on public.leads to authenticated;
grant update (handled) on public.leads to authenticated;

grant all on public.assistants, public.questions, public.leads, public.ai_requests to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ---------- AI limits (server only) ----------
create function public.ai_allow(p_key text, p_assistant uuid,
  p_per_hour int default 15, p_per_assistant_day int default 60, p_global_day int default 200)
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext('ai_allow'));
  if (select count(*) from public.ai_requests where created_at > now() - interval '1 day') >= p_global_day then return false; end if;
  if (select count(*) from public.ai_requests where assistant_id = p_assistant and created_at > now() - interval '1 day') >= p_per_assistant_day then return false; end if;
  if (select count(*) from public.ai_requests where key_hash = p_key and created_at > now() - interval '1 hour') >= p_per_hour then return false; end if;
  insert into public.ai_requests (key_hash, assistant_id) values (p_key, p_assistant);
  delete from public.ai_requests where created_at < now() - interval '2 days';
  return true;
end $$;
revoke execute on function public.ai_allow(text, uuid, int, int, int) from public, anon, authenticated;
grant execute on function public.ai_allow(text, uuid, int, int, int) to service_role;

-- ---------- dashboard stats ----------
create function public.assistant_stats(a uuid)
returns table (questions_30d int, answered_pct int, leads_open int)
language sql stable security definer set search_path = '' as $$
  select
    (select count(*) from public.questions q where q.assistant_id = a and q.created_at > now() - interval '30 days')::int,
    coalesce((select (100 * count(*) filter (where q.answered) / nullif(count(*), 0))
              from public.questions q where q.assistant_id = a and q.created_at > now() - interval '30 days'), 0)::int,
    (select count(*) from public.leads l where l.assistant_id = a and not l.handled)::int
  where public.owns_assistant(a);
$$;
grant execute on function public.assistant_stats(uuid) to authenticated;
