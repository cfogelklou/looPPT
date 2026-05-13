#!/bin/bash
set -u

PROJECT_DIR="/Volumes/Projects/dev/applicaudia_web/looPPT"
BIN="/Users/chris/.bin/vibe-model"
PID_FILE="$PROJECT_DIR/.vibe-model-run.pid"
RUN_LOG="$PROJECT_DIR/.vibe-model-run.log"
WATCHDOG_LOG="$PROJECT_DIR/.vibe-model-watchdog.log"
WATCHDOG_PID_FILE="$PROJECT_DIR/.vibe-model-watchdog.pid"
CHECK_EVERY_SECONDS=240
IDLE_TIMEOUT_SECONDS=3600

cd "$PROJECT_DIR" || exit 1
shopt -s nullglob

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$WATCHDOG_LOG"
}

latest_activity_epoch() {
  local latest=0
  local path mtime

  for path in \
    "$RUN_LOG" \
    "$PROJECT_DIR"/vibe-model/prd.md \
    "$PROJECT_DIR"/vibe-model/prd-review.md \
    "$PROJECT_DIR"/vibe-model/milestones/*.md
  do
    [ -e "$path" ] || continue
    mtime="$(stat -f %m "$path" 2>/dev/null || echo 0)"
    if [ "$mtime" -gt "$latest" ]; then
      latest="$mtime"
    fi
  done

  echo "$latest"
}

find_existing_run_pid() {
  pgrep -f "$BIN --project-dir $PROJECT_DIR" | head -1
}

has_incomplete_work() {
  [ -f "$PROJECT_DIR/vibe-model/prd.md" ] || return 1
  ! "$BIN" --project-dir "$PROJECT_DIR" status 2>/dev/null | grep -q "All milestones complete"
}

start_run() {
  log "starting vibe-model continue run"
  nohup "$BIN" --project-dir "$PROJECT_DIR" --autonomous --review -v >> "$RUN_LOG" 2>&1 &
  echo $! > "$PID_FILE"
  log "started pid $(cat "$PID_FILE")"
}

stop_run_tree() {
  local pid="$1"
  [ -n "$pid" ] || return 0

  log "stopping stuck run pid $pid"
  pkill -P "$pid" 2>/dev/null || true
  kill "$pid" 2>/dev/null || true
  sleep 2
  pkill -P "$pid" 2>/dev/null || true
  kill -9 "$pid" 2>/dev/null || true
}

if [ -f "$WATCHDOG_PID_FILE" ]; then
  existing_watchdog_pid="$(cat "$WATCHDOG_PID_FILE" 2>/dev/null || true)"
  if [ -n "$existing_watchdog_pid" ] && kill -0 "$existing_watchdog_pid" 2>/dev/null; then
    log "watchdog already running as pid $existing_watchdog_pid"
    exit 0
  fi
fi

echo $$ > "$WATCHDOG_PID_FILE"
trap 'rm -f "$WATCHDOG_PID_FILE"' EXIT

log "watchdog started (idle timeout ${IDLE_TIMEOUT_SECONDS}s, check every ${CHECK_EVERY_SECONDS}s)"

while true; do
  run_pid="$(cat "$PID_FILE" 2>/dev/null || true)"

  if [ -z "$run_pid" ] || ! kill -0 "$run_pid" 2>/dev/null; then
    adopted_pid="$(find_existing_run_pid)"
    if [ -n "$adopted_pid" ] && kill -0 "$adopted_pid" 2>/dev/null; then
      echo "$adopted_pid" > "$PID_FILE"
      log "adopted existing run pid $adopted_pid"
      sleep "$CHECK_EVERY_SECONDS"
      continue
    fi

    if has_incomplete_work; then
      log "run missing but work remains; restarting"
      start_run
    else
      log "no active run and no incomplete work; watchdog exiting"
      break
    fi

    sleep "$CHECK_EVERY_SECONDS"
    continue
  fi

  latest_epoch="$(latest_activity_epoch)"
  now_epoch="$(date +%s)"
  idle_seconds=$((now_epoch - latest_epoch))

  if [ "$latest_epoch" -eq 0 ]; then
    log "no activity files yet; pid $run_pid still alive"
  else
    log "pid $run_pid idle for ${idle_seconds}s"
  fi

  if [ "$latest_epoch" -gt 0 ] && [ "$idle_seconds" -ge "$IDLE_TIMEOUT_SECONDS" ]; then
    log "idle threshold exceeded; restarting run"
    stop_run_tree "$run_pid"
    start_run
  fi

  sleep "$CHECK_EVERY_SECONDS"
done
