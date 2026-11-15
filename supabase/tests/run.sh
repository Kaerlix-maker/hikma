#!/usr/bin/env bash
# Runs the migration + security tests on a throwaway local database.
# Usage: PGHOST=/tmp PGPORT=54329 PGUSER=postgres ./supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")"
psql -q -v ON_ERROR_STOP=1 -c "drop database if exists hikma_test" -c "create database hikma_test" postgres
run() { psql -q -v ON_ERROR_STOP=1 -d hikma_test -f "$1"; }
run 00_supabase_stub.sql
run ../migrations/0001_init.sql
run 01_security.sql
