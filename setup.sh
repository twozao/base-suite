#!/usr/bin/env bash
# Local dev for Base Suite: SvelteKit app (Vite) on SQLite. No database server, no Docker.
set -euo pipefail
cd "$(dirname "$0")"
PROJECT_DIR="$PWD"
PORT="${BASE_SUITE_PORT:-5173}"
PID_FILE=/tmp/base-suite-dev.pid
PORT_FILE=/tmp/base-suite-dev.port
LOG_FILE=/tmp/base-suite-dev.log
DB_FILE="$PROJECT_DIR/data/base-suite.db"

log() { printf '\033[36m%s\033[0m\n' "$*"; }
ok() { printf '\033[32m%s\033[0m\n' "$*"; }
warn() { printf '\033[33m%s\033[0m\n' "$*"; }
err() { printf '\033[31m%s\033[0m\n' "$*" >&2; }

need() { command -v "$1" >/dev/null 2>&1 || { err "$1 is required ($2)"; exit 1; }; }
check_prereqs() {
  need node "https://nodejs.org, version 22 or newer"
  need npm "comes with node"
  need lsof "macOS built in"
  need curl "macOS built in"
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

ensure_env() {
  [[ -f .env ]] && return
  printf '# Local development. SQLite at data/base-suite.db; see .env.example for the optional keys.\n' > .env
  ok 'Wrote .env'
}

start() {
  [[ -d node_modules ]] || { err 'Run ./setup.sh setup first'; exit 1; }
  if owned_pid; then ok "App already running at $(app_url)"; return; fi
  local port
  port="$(pick_port)"
  [[ "$port" != "$PORT" ]] && warn "Port $PORT is busy, using $port"
  mkdir -p data
  nohup "$PROJECT_DIR/node_modules/.bin/vite" dev --port "$port" --strictPort >> "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
  echo "$port" > "$PORT_FILE"
  for _ in {1..40}; do
    if curl -fs -o /dev/null "http://localhost:$port/"; then ok "App ready at http://localhost:$port"; return; fi
    owned_pid || { err "App exited early; see $LOG_FILE"; tail -n 20 "$LOG_FILE"; exit 1; }
    sleep 0.5
  done
  err "App did not answer in time; see $LOG_FILE"; exit 1
}

status() {
  if owned_pid; then ok "App running at $(app_url) (pid $(cat "$PID_FILE"))"; else warn 'App stopped'; fi
  if [[ -f "$DB_FILE" ]]; then ok "Database: $DB_FILE ($(du -h "$DB_FILE" | cut -f1))"; else warn 'Database not created yet (starts with the app)'; fi
}

case "${1:-help}" in
  setup)
    check_prereqs
    npm install
    ensure_env
    npm run db:migrate
    npm run db:seed
    start ;;
  start) check_prereqs; ensure_env; start ;;
  stop) kill_port ;;
  restart) kill_port; start ;;
  status) status ;;
  logs) tail -n "${2:-100}" "$LOG_FILE" ;;
  admin) [[ -n "${2:-}" ]] || { err 'Usage: ./setup.sh admin EMAIL'; exit 1; }; npm run --silent db:admin -- "$2" ;;
  db:migrate) npm run db:migrate ;;
  db:seed) npm run db:seed ;;
  db:shell) need sqlite3 "brew install sqlite"; sqlite3 "$DB_FILE" ;;
  db:reset) kill_port; rm -f "$DB_FILE" "$DB_FILE-wal" "$DB_FILE-shm"; ok 'Local database removed'; npm run db:migrate; npm run db:seed ;;
  test) npm run test_run ;;
  check) ./checks.sh ;;
  build) npm run build ;;
  clean) kill_port; rm -rf node_modules .svelte-kit build; ok 'Cleaned' ;;
  help|*)
    log 'setup | start | stop | restart | status | logs [n] | admin EMAIL'
    log 'db:migrate | db:seed | db:shell | db:reset | test | check | build | clean'
    log 'SQLite lives at data/base-suite.db. Set DATABASE_URL in .env to use Postgres instead.'
    log 'The first account created at /login/sign_up becomes the admin; admin EMAIL grants it to another.' ;;
esac
