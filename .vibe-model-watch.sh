#!/bin/bash
set -u
cd /Volumes/Projects/dev/applicaudia_web/looPPT || exit 1
LOG_FILE=.vibe-model-status.log
PID_FILE=.vibe-model-run.pid

while true; do
  {
    echo "=== $(date '+%Y-%m-%d %H:%M:%S') ==="

    if [ -f "$PID_FILE" ]; then
      PID="$(cat "$PID_FILE")"
      echo "run_pid=$PID"
      if kill -0 "$PID" 2>/dev/null; then
        echo "run_process=alive"
        ps -p "$PID" -o pid=,ppid=,stat=,etime=,command=
        CHILDREN="$(pgrep -P "$PID" || true)"
        if [ -n "$CHILDREN" ]; then
          echo "children=$CHILDREN"
          ps -p "$CHILDREN" -o pid=,ppid=,stat=,etime=,command=
        fi
      else
        echo "run_process=dead"
      fi
    else
      echo "run_pid=missing"
    fi

    echo "--- vibe-model status ---"
    ~/.bin/vibe-model --project-dir "$PWD" status 2>&1 || true

    echo "--- filesystem ---"
    find vibe-model -maxdepth 2 -type f 2>/dev/null | sort || true

    echo "--- recent log tail ---"
    tail -40 .vibe-model-run.log 2>/dev/null || true
    echo
  } >> "$LOG_FILE"

  if [ ! -f "$PID_FILE" ]; then
    break
  fi
  PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -z "$PID" ] || ! kill -0 "$PID" 2>/dev/null; then
    break
  fi

  sleep 240
done
