#!/bin/bash
set -u

PROJECT_DIR="/Volumes/Projects/dev/applicaudia_web/looPPT"
BIN="/Users/chris/.bin/vibe-model"
PID_FILE="$PROJECT_DIR/.vibe-model-run.pid"
RUN_LOG="$PROJECT_DIR/.vibe-model-run.log"
WATCHDOG_LOG="$PROJECT_DIR/.vibe-model-watchdog.log"
WATCHDOG_PID_FILE="$PROJECT_DIR/.vibe-model-watchdog.pid"
WATCHDOG_STATE_FILE="$PROJECT_DIR/.vibe-model-watchdog.state"
BUNDLE_ROOT="$PROJECT_DIR/_watchdog"
CHECK_EVERY_SECONDS=240
IDLE_TIMEOUT_SECONDS=3600
REVIEW_LOOP_THRESHOLD=3
SAME_SIGNATURE_THRESHOLD=6

cd "$PROJECT_DIR" || exit 1
shopt -s nullglob
mkdir -p "$BUNDLE_ROOT"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$WATCHDOG_LOG"
}

load_state() {
  STUCK_COUNT=0
  LAST_STUCK_SIGNATURE=""
  LAST_START_MODE="review"
  LAST_OBSERVED_SIGNATURE=""
  SAME_SIGNATURE_COUNT=0

  if [ -f "$WATCHDOG_STATE_FILE" ]; then
    # shellcheck disable=SC1090
    source "$WATCHDOG_STATE_FILE"
  fi
}

save_state() {
  cat > "$WATCHDOG_STATE_FILE" <<EOF
STUCK_COUNT=${STUCK_COUNT}
LAST_STUCK_SIGNATURE='${LAST_STUCK_SIGNATURE}'
LAST_START_MODE='${LAST_START_MODE}'
LAST_OBSERVED_SIGNATURE='${LAST_OBSERVED_SIGNATURE}'
SAME_SIGNATURE_COUNT=${SAME_SIGNATURE_COUNT}
EOF
}

latest_activity_epoch() {
  local latest=0
  local path mtime

  for path in \
    "$RUN_LOG" \
    "$PROJECT_DIR"/.vibe-model-status.log \
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

current_signature() {
  local status_output active state progress
  status_output="$($BIN --project-dir "$PROJECT_DIR" status 2>/dev/null || true)"
  active="$(printf '%s\n' "$status_output" | sed -n 's/^.*Active: #\([0-9][0-9]*\) .*$/\1/p' | head -1)"
  state="$(printf '%s\n' "$status_output" | sed -n 's/^  State: \(.*\)$/\1/p' | head -1)"

  if [ -n "$active" ] && [ -n "$state" ]; then
    progress="$(awk '/^- Progress: / {gsub(/^- Progress: /, ""); gsub(/%$/, ""); print; exit}' "$PROJECT_DIR"/vibe-model/milestones/*.md 2>/dev/null | head -1)"
    if [ -n "$progress" ]; then
      printf '%s:%s:%s\n' "$active" "$state" "$progress"
    else
      printf '%s:%s\n' "$active" "$state"
    fi
  else
    printf 'unknown\n'
  fi
}

recent_review_failures() {
  [ -f "$RUN_LOG" ] || { echo 0; return; }
  tail -400 "$RUN_LOG" | grep -c 'Review failed — recording findings and pausing for HIL review' || true
}

capture_bundle() {
  local reason="$1"
  local run_pid="$2"
  local signature="$3"
  local bundle_dir
  bundle_dir="$BUNDLE_ROOT/stuck-$(date '+%Y%m%d-%H%M%S')"
  mkdir -p "$bundle_dir"

  {
    echo "reason=$reason"
    echo "run_pid=$run_pid"
    echo "signature=$signature"
    echo "timestamp=$(date '+%Y-%m-%d %H:%M:%S')"
    echo "review_failures=$(recent_review_failures)"
  } > "$bundle_dir/summary.txt"

  cp -f "$RUN_LOG" "$bundle_dir/run.log" 2>/dev/null || true
  cp -f "$WATCHDOG_LOG" "$bundle_dir/watchdog.log" 2>/dev/null || true
  cp -f "$PROJECT_DIR/.vibe-model-status.log" "$bundle_dir/status.log" 2>/dev/null || true
  cp -f "$PROJECT_DIR/vibe-model/prd.md" "$bundle_dir/prd.md" 2>/dev/null || true
  cp -f "$PROJECT_DIR/vibe-model/prd-review.md" "$bundle_dir/prd-review.md" 2>/dev/null || true
  cp -Rf "$PROJECT_DIR/vibe-model/milestones" "$bundle_dir/" 2>/dev/null || true

  {
    echo '--- ps ---'
    ps -p "$run_pid" -o pid=,ppid=,stat=,etime=,%cpu=,command= 2>/dev/null || true
    children="$(pgrep -P "$run_pid" || true)"
    if [ -n "$children" ]; then
      echo '--- children ---'
      ps -p "$children" -o pid=,ppid=,stat=,etime=,%cpu=,command= 2>/dev/null || true
    fi
    echo '--- git status ---'
    git status --short 2>/dev/null || true
    echo '--- git log ---'
    git log --oneline -n 25 2>/dev/null || true
  } > "$bundle_dir/process-and-git.txt"

  "$BIN" --project-dir "$PROJECT_DIR" status > "$bundle_dir/vibe-model-status.txt" 2>&1 || true

  log "captured diagnostic bundle at $bundle_dir"
}

choose_restart_mode() {
  local signature="$1"
  local failures same_signature
  failures="$(recent_review_failures)"
  same_signature=0

  if [ "$signature" = "$LAST_STUCK_SIGNATURE" ]; then
    same_signature=1
  fi

  if [ "$failures" -ge "$REVIEW_LOOP_THRESHOLD" ] || [ "$same_signature" -eq 1 ]; then
    echo "no-review"
  else
    echo "review"
  fi
}

start_run() {
  local mode="$1"
  local args

  if [ "$mode" = "no-review" ]; then
    args=(--project-dir "$PROJECT_DIR" --autonomous -v)
  else
    args=(--project-dir "$PROJECT_DIR" --autonomous --review -v)
  fi

  LAST_START_MODE="$mode"
  save_state

  log "starting vibe-model continue run (mode=$mode)"
  nohup "$BIN" "${args[@]}" >> "$RUN_LOG" 2>&1 &
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

handle_stuck_run() {
  local run_pid="$1"
  local reason="$2"
  local signature next_mode

  signature="$(current_signature)"
  capture_bundle "$reason" "$run_pid" "$signature"

  STUCK_COUNT=$((STUCK_COUNT + 1))
  LAST_STUCK_SIGNATURE="$signature"
  LAST_OBSERVED_SIGNATURE="$signature"
  SAME_SIGNATURE_COUNT=0
  next_mode="$(choose_restart_mode "$signature")"
  save_state

  log "stuck detected (reason=$reason, signature=$signature, count=$STUCK_COUNT); restarting in mode=$next_mode"
  stop_run_tree "$run_pid"
  start_run "$next_mode"
}

if [ -f "$WATCHDOG_PID_FILE" ]; then
  existing_watchdog_pid="$(cat "$WATCHDOG_PID_FILE" 2>/dev/null || true)"
  if [ -n "$existing_watchdog_pid" ] && kill -0 "$existing_watchdog_pid" 2>/dev/null; then
    log "watchdog already running as pid $existing_watchdog_pid"
    exit 0
  fi
fi

load_state

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
      start_run "$LAST_START_MODE"
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
  signature="$(current_signature)"

  if [ "$signature" = "$LAST_OBSERVED_SIGNATURE" ]; then
    SAME_SIGNATURE_COUNT=$((SAME_SIGNATURE_COUNT + 1))
  else
    LAST_OBSERVED_SIGNATURE="$signature"
    SAME_SIGNATURE_COUNT=1
  fi
  save_state

  if [ "$latest_epoch" -eq 0 ]; then
    log "no activity files yet; pid $run_pid still alive (signature=$signature, same-signature-count=$SAME_SIGNATURE_COUNT)"
  else
    log "pid $run_pid idle for ${idle_seconds}s (signature=$signature, same-signature-count=$SAME_SIGNATURE_COUNT)"
  fi

  if [ "$latest_epoch" -gt 0 ] && [ "$idle_seconds" -ge "$IDLE_TIMEOUT_SECONDS" ]; then
    handle_stuck_run "$run_pid" "idle-timeout"
    sleep "$CHECK_EVERY_SECONDS"
    continue
  fi

  if [ "$signature" != "unknown" ] && [ "$SAME_SIGNATURE_COUNT" -ge "$SAME_SIGNATURE_THRESHOLD" ]; then
    handle_stuck_run "$run_pid" "same-signature-loop"
    sleep "$CHECK_EVERY_SECONDS"
    continue
  fi

  sleep "$CHECK_EVERY_SECONDS"
done
