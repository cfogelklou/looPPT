# LooPPT vibe-model use

This document records how LooPPT uses the local `vibe-model` binary, how to keep that binary current, and what helper scripts/logs exist in this project.

## Canonical locations

- **vibe-model source repo**: `/Volumes/Projects/dev/vibe_apps/vibe-model`
- **installed binary used for runs**: `~/.bin/vibe-model`
- **target project dir for LooPPT runs**: `/Volumes/Projects/dev/applicaudia_web/looPPT`

Important: use `~/.bin/vibe-model`, not `~/bin/vibe-model`.

## Why `--project-dir` is required

`applicaudia_web` is a monorepo. If `vibe-model` is run without `--project-dir`, it may detect the monorepo root instead of the `looPPT` app.

Use:

```bash
~/.bin/vibe-model --project-dir /Volumes/Projects/dev/applicaudia_web/looPPT "your goal"
```

## Current LooPPT-specific workflow

### Goal input file

The animation run used a checked-in local goal file:

- `.vibe-model-goal-animations.txt`

That file lets us keep a reusable long-form goal prompt outside shell history.

Example start command:

```bash
cd /Volumes/Projects/dev/applicaudia_web/looPPT
goal="$(<.vibe-model-goal-animations.txt)"
~/.bin/vibe-model --project-dir "$PWD" --autonomous --review -v "$goal"
```

### Resume command

To continue an existing journey in `looPPT`:

```bash
cd /Volumes/Projects/dev/applicaudia_web/looPPT
~/.bin/vibe-model --project-dir "$PWD"
```

## Keeping vibe-model up to date

When `vibe-model` source changes, rebuild it from the source repo and copy the compiled binary into `~/.bin/`.

### Standard update procedure

```bash
cd /Volumes/Projects/dev/vibe_apps/vibe-model

# optional but recommended
bun test

# required
bun run build

# install the freshly built binary
cp bin/vibe-model ~/.bin/vibe-model
```

### Recommended verification after update

```bash
~/.bin/vibe-model --help
```

If the update was made to fix a real LooPPT run failure, also verify against the target project:

```bash
cd /Volumes/Projects/dev/applicaudia_web/looPPT
~/.bin/vibe-model --project-dir "$PWD" status
```

## Local helper scripts created during the animation run

### 1. `.vibe-model-watch.sh`

Purpose:
- append periodic status snapshots to `.vibe-model-status.log`

Behavior:
- records process info
- records `vibe-model status`
- records a short tail of the run log
- useful for after-the-fact inspection

Outputs:
- `.vibe-model-status.log`

### 2. `.vibe-model-watchdog.sh`

Purpose:
- detect a stuck or looping `vibe-model` run
- preserve diagnostics
- restart the run with a safer mode when appropriate

Behavior:
- checks every 4 minutes
- treats **60 minutes of no activity** as stuck
- also treats repeated identical milestone/state/progress signatures as a livelock
- captures a forensic bundle before restarting
- may restart in **no-review mode** if the stuck pattern looks review-related

Current loop heuristics:
- `IDLE_TIMEOUT_SECONDS=3600`
- `SAME_SIGNATURE_THRESHOLD=6`
- `CHECK_EVERY_SECONDS=240`

Meaning:
- pure idle hang: restart after 60 minutes
- same signature livelock: restart after ~24 minutes (6 checks × 4 minutes)

### Watchdog state and logs

Files:
- `.vibe-model-watchdog.log`
- `.vibe-model-watchdog.pid`
- `.vibe-model-watchdog.state`

Forensic bundles:
- `_watchdog/stuck-YYYYMMDD-HHMMSS/`

Each bundle may contain:
- run log copy
- watchdog log copy
- status log copy
- PRD / PRD review
- milestone files
- process snapshot
- git status / git log snapshot

## Run bookkeeping files in LooPPT

Generated during local runs:

- `.vibe-model-run.pid` — active `vibe-model` process id
- `.vibe-model-run.log` — raw stdout/stderr from the run
- `.vibe-model-status.log` — periodic status snapshots
- `vibe-model/` — active journey state written by `vibe-model`

Archived prior run:
- `_archive/vibe-model-previous-run-20260513-203437`

## What we learned from this run

### 1. Autonomous review can livelock

A real failure mode occurred where `vibe-model` kept rerunning the same phase after sub-agent review failures, creating repeated REQUIREMENTS commits without meaningful forward progress.

This led to a source fix in `vibe-model`:
- autonomous review retries are now capped
- after repeated review failures, `vibe-model` proceeds with the latest artifact instead of looping forever

### 2. Local watchdog mitigation is still useful

Even with the source fix, the watchdog remains valuable because it:
- catches unknown future stalls
- preserves evidence for debugging `vibe-model`
- can switch strategy automatically (for example, restart without `--review`)

## Suggested operating policy for future LooPPT runs

1. Keep `vibe-model` source current in `/Volumes/Projects/dev/vibe_apps/vibe-model`
2. Rebuild and copy to `~/.bin/vibe-model` after any source fix
3. Always run with `--project-dir "$PWD"` from `looPPT`
4. Keep the watchdog enabled for long autonomous runs
5. If a run gets stuck, inspect `_watchdog/stuck-*` before discarding evidence
6. If the root cause is in `vibe-model`, fix the source repo first, then rebuild and redeploy the binary

## Minimal commands cheat sheet

### Start new run from the saved animation goal

```bash
cd /Volumes/Projects/dev/applicaudia_web/looPPT
goal="$(<.vibe-model-goal-animations.txt)"
nohup ~/.bin/vibe-model --project-dir "$PWD" --autonomous --review -v "$goal" >> .vibe-model-run.log 2>&1 &
echo $! > .vibe-model-run.pid
```

### Start the watchdog

```bash
cd /Volumes/Projects/dev/applicaudia_web/looPPT
nohup ./.vibe-model-watchdog.sh >/dev/null 2>&1 &
echo $! > .vibe-model-watchdog.pid
```

### Check status

```bash
cd /Volumes/Projects/dev/applicaudia_web/looPPT
~/.bin/vibe-model --project-dir "$PWD" status
tail -80 .vibe-model-run.log
tail -40 .vibe-model-watchdog.log
```

### Rebuild/install vibe-model after a source fix

```bash
cd /Volumes/Projects/dev/vibe_apps/vibe-model
bun test
bun run build
cp bin/vibe-model ~/.bin/vibe-model
```
