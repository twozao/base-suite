#!/usr/bin/env bash
# Local dev for Base Suite: SvelteKit app (Vite) plus a local Supabase stack in Docker.
set -euo pipefail
cd "$(dirname "$0")"
PROJECT_DIR="$PWD"
PORT="${BASE_SUITE_PORT:-5173}"
PID_FILE=/tmp/base-suite-dev.pid
PORT_FILE=/tmp/base-suite-dev.port
LOG_FILE=/tmp/base-suite-dev.log
API_URL="http://127.0.0.1:54321"
STUDIO_URL="http://127.0.0.1:54323"
MAIL_URL="http://127.0.0.1:54324"
DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

log() { printf '\033[36m%s\033[0m\n' "$*"; }
ok() { printf '\033[32m%s\033[0m\n' "$*"; }
warn() { printf '\033[33m%s\033[0m\n' "$*"; }
err() { printf '\033[31m%s\033[0m\n' "$*" >&2; }

need() { command -v "$1" >/dev/null 2>&1 || { err "$1 is required ($2)"; exit 1; }; }
check_prereqs() {
  need node "https://nodejs.org"
  need npm "comes with node"
  need docker "colima start, or Docker Desktop"
  need supabase "brew install supabase/tap/supabase"
  need psql "brew install postgresql@15"
  need lsof "macOS built in"
  need curl "macOS built in"
  docker info >/dev/null 2>&1 || { err 'Docker is not running. Start colima or Docker Desktop first.'; exit 1; }
}

# App process: only ever kill the vite we started (PID file + command check), never a stranger on the port.
check_port() { ! lsof -iTCP:"$1" -sTCP:LISTEN -t >/dev/null 2>&1; }
owned_pid() {
  [[ -f "$PID_FILE" ]] || return 1
  local pid command
  pid="$(cat "$PID_FILE")"
  [[ "$pid" =~ ^[0-9]+$ ]] || return 1
  command="$(ps -p "$pid" -o command= 2>/dev/null)" || return 1
  [[ "$command" == *"$PROJECT_DIR/node_modules/.bin/vite"* ]]
}
kill_port() {
  if owned_pid; then
    kill "$(cat "$PID_FILE")"
    for _ in {1..30}; do owned_pid || break; sleep 0.2; done
    owned_pid && { err 'App did not stop'; return 1; }
    ok 'App stopped'
  fi
  rm -f "$PID_FILE" "$PORT_FILE"
}
pick_port() {
  local p i
  for i in 0 1 2 3 4 5; do
    p=$((PORT + i))
    if check_port "$p"; then printf '%s' "$p"; return; fi
  done
  err "Ports $PORT to $((PORT + 5)) are all in use"; return 1
}
app_url() { printf 'http://localhost:%s' "$(cat "$PORT_FILE" 2>/dev/null || echo "$PORT")"; }

# Supabase stack
db_running() { curl -fsS "$API_URL/auth/v1/health" >/dev/null 2>&1; }
db_wait() {
  for _ in {1..90}; do db_running && return; sleep 1; done
  err 'Supabase did not become healthy; try ./setup.sh logs db'; return 1
}
db_start() {
  if db_running; then ok 'Supabase already running'; return; fi
  log 'Starting local Supabase (first run pulls Docker images, takes a few minutes)...'
  supabase start >/dev/null
  db_wait
  ok "Supabase ready: API $API_URL, Studio $STUDIO_URL, Mail $MAIL_URL"
}
db_stop() { if supabase stop >/dev/null 2>&1; then ok 'Supabase stopped'; else warn 'Supabase was not running'; fi; }

# .env from the local stack's keys. Keeps an existing Stripe key, otherwise uses a placeholder.
write_env() {
  db_running || { err 'Supabase must be running to read its keys (./setup.sh start)'; exit 1; }
  local st url anon svc stripe
  st="$(supabase status -o env)"
  val() { printf '%s\n' "$st" | sed -n "s/^$1=//p" | sed -e 's/^"//' -e 's/"$//'; }
  url="$(val API_URL)"; anon="$(val ANON_KEY)"; svc="$(val SERVICE_ROLE_KEY)"
  [[ -n "$url" && -n "$anon" && -n "$svc" ]] || { err 'Could not read keys from supabase status'; exit 1; }
  stripe=''
  [[ -f .env ]] && stripe="$(sed -n "s/^PRIVATE_STRIPE_API_KEY='\(.*\)'$/\1/p" .env)"
  [[ -n "$stripe" ]] || stripe='sk_test_placeholder'
  cat > .env <<EOF
# Local Supabase (supabase start). Regenerate with: ./setup.sh env
PUBLIC_SUPABASE_URL='$url'
PUBLIC_SUPABASE_ANON_KEY='$anon'
PRIVATE_SUPABASE_SERVICE_ROLE='$svc'

# Stripe test key. Placeholder until you add a real sk_test_ key.
PRIVATE_STRIPE_API_KEY='$stripe'
EOF
  ok '.env written'
}

start() {
  [[ -d node_modules ]] || { err 'Run ./setup.sh setup first'; exit 1; }
  check_prereqs
  db_start
  [[ -f .env ]] || write_env
  if owned_pid; then ok "App already running at $(app_url)"; return; fi
  local port
  port="$(pick_port)"
  [[ "$port" == "$PORT" ]] || warn "Port $PORT is busy, using $port"
  nohup "$PROJECT_DIR/node_modules/.bin/vite" dev --port "$port" --strictPort >>"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"; echo "$port" >"$PORT_FILE"
  for _ in {1..60}; do
    if curl -fsS "http://localhost:$port/" >/dev/null 2>&1; then
      ok "App ready at http://localhost:$port (sign up at /login/sign_up, admin portal at /admin)"; return
    fi
    sleep 1
  done
  err "App did not start; see $LOG_FILE"; kill_port; exit 1
}
status() {
  if db_running; then ok "Supabase: running (API $API_URL, Studio $STUDIO_URL, Mail $MAIL_URL)"; else warn 'Supabase: stopped'; fi
  if owned_pid; then ok "App: running at $(app_url)"; else warn 'App: stopped'; fi
}
logs() {
  case "${1:-app}" in
    app) tail -n 100 "$LOG_FILE" ;;
    db|auth|rest|kong|studio|storage|realtime|inbucket|edge_runtime|pg_meta|analytics|vector) docker logs --tail 100 "supabase_${1}_base-suite" ;;
    *) err "Unknown service '$1'. Use app, db, auth, rest, kong, studio, storage, realtime or inbucket"; exit 1 ;;
  esac
}
# Grants the admin role to an existing user. Sign up in the app first.
admin() {
  local email="${1:-}" found
  [[ -n "$email" ]] || { err 'Usage: ./setup.sh admin you@example.com'; exit 1; }
  db_running || { err 'Supabase is not running'; exit 1; }
  # SQL goes in on stdin: psql only interpolates :'email' there, not in -c strings.
  psql "$DB_URL" -q -v ON_ERROR_STOP=1 -v email="$email" <<'SQL'
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where lower(email) = lower(:'email')
on conflict do nothing;
SQL
  found="$(psql "$DB_URL" -At -v email="$email" <<'SQL'
select count(*) from public.user_roles r join auth.users u on u.id = r.user_id
where lower(u.email) = lower(:'email') and r.role = 'admin';
SQL
)"
  if [[ "$found" == "1" ]]; then ok "$email is now an admin. Open $(app_url)/admin"; else err "No user with email $email. Sign up first at $(app_url)/login/sign_up"; exit 1; fi
}

case "${1:-help}" in
  setup)
    check_prereqs
    npm install
    db_start
    [[ -f .env ]] || write_env
    start ;;
  start) start ;;
  stop) kill_port; db_stop ;;
  restart) kill_port; start ;;
  status) status ;;
  logs) logs "${2:-app}" ;;
  env) write_env ;;
  admin) admin "${2:-}" ;;
  db:reset) warn 'This wipes local data and re-applies supabase/migrations'; supabase db reset ;;
  db:shell) psql "$DB_URL" ;;
  test) npm run test_run ;;
  test:rls) DATABASE_URL="$DB_URL" sh supabase/tests/run.sh && ok 'RLS tests passed' ;;
  check) npm run check && npm run lint ;;
  build) npm run build ;;
  clean) kill_port; supabase stop --no-backup >/dev/null 2>&1 || true; rm -rf node_modules .svelte-kit build; ok 'Cleaned (node_modules, build output, local DB data)' ;;
  help)
    log 'setup | start | stop | restart | status | logs [app|db|auth|...] | env | admin EMAIL'
    log 'db:reset | db:shell | test | test:rls | check | build | clean'
    log "App on port $PORT (BASE_SUITE_PORT to change), Supabase API $API_URL, Studio $STUDIO_URL, Mail $MAIL_URL" ;;
  *) err 'Unknown command. Use help.'; exit 1 ;;
esac
