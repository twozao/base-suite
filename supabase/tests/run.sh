#!/bin/sh
# Applies all migrations to a throwaway Postgres database and runs the RLS
# checks. Usage: DATABASE_URL=postgres://... ./supabase/tests/run.sh
set -e
DB_URL="${DATABASE_URL:-postgresql:///postgres}"
DIR="$(cd "$(dirname "$0")" && pwd)"
psql "$DB_URL" -q -c "drop database if exists platform_test" -c "create database platform_test"
TEST_URL="$(echo "$DB_URL" | sed 's#/[^/]*$#/platform_test#')"
psql "$TEST_URL" -q -v ON_ERROR_STOP=1 -f "$DIR/stub_supabase.sql"
for f in "$DIR"/../migrations/*.sql; do
  psql "$TEST_URL" -q -v ON_ERROR_STOP=1 -f "$f"
done
psql "$TEST_URL" -q -v ON_ERROR_STOP=1 -f "$DIR/rls_test.sql"
