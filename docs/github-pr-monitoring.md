# GitHub PR Monitoring Workflow

**Repository**: `cfogelklou/perpetual-presentation`
**Main Branch**: `main`
**Purpose**: Active monitoring of GitHub PRs for AI agents

---

## Scope

**Default Behavior**: Monitor GitHub Actions failures on `main` branch only.

**When Triggered**: When the user explicitly requests **"Monitor PR #XXX"**, the agent monitors that specific PR for:
- GitHub Actions status
- Review comments (human or Copilot)

**Important**: This workflow is for **manual PR monitoring** when the user requests it.

---

## Trigger

When the user requests: **"Monitor PR #XXX"**

The AI agent should **actively monitor** the pull request for GitHub Actions status and review comments. This is an ongoing polling cycle that continues until the PR is merged, closed, or reaches a terminal state.

---

## Phase 0: Pre-Check - SSH Key Verification

**BEFORE starting any PR monitoring work, IMMEDIATELY verify SSH keys work:**

```bash
git fetch origin
```

**If `git fetch` prompts for a password/key passphrase, STOP and inform the user:**

> Your SSH keys require a password/passphrase. Git commits and pushes will fail. Please either:
> 1. Add your key to ssh-agent with `ssh-add`
> 2. Use HTTPS with a Personal Access Token
> 3. Set up passwordless SSH keys
>
> I cannot proceed with PR monitoring until git operations work without password prompts.

---

## Phase 1: Initial Assessment

### 1.1 Check PR Status and Review Comments

> **IMPORTANT: ALWAYS use GraphQL API** - The REST API endpoint `/repos/{owner}/{repo}/pulls/{number}/comments` does NOT return all review comments from Copilot.

```bash
# Get PR status
gh pr view {PR_NUMBER} --json state,mergeable,mergeStateStatus,reviewDecision,statusCheckRollup,title,url

# Get ALL review comments via GraphQL (recommended)
gh api graphql -f query='
  query {
    repository(owner: "cfogelklou", name: "perpetual-presentation") {
      pullRequest(number: {PR_NUMBER}) {
        reviews(first: 100) {
          nodes {
            id
            author { login }
            state
            createdAt
            comments(first: 100) {
              nodes {
                id
                databaseId
                body
                path
                line
                createdAt
                replyTo { id databaseId }
              }
            }
          }
        }
      }
    }
  }
' --jq '.data.repository.pullRequest.reviews.nodes[] | select(.author.login == "copilot-pull-request-reviewer") | .comments.nodes[] | select(.replyTo.id == null) | {databaseId, body: .body[0:100], path, line}'

# Alternative: Get PR reviews overview
gh pr view {PR_NUMBER} --json reviews --jq '.reviews[] | {author: .author.login, state: .state, body: .body}'
```

**IMPORTANT**: Always check BOTH:
1. Review comments (inline comments on specific lines) - Use GraphQL
2. PR reviews (top-level reviews that contain inline comments, like Copilot's)

### 1.2 Record Initial State

- PR state (open/closed/merged)
- Mergeable status
- Review decision (approved/changes_requested/commented)
- GitHub Actions status (passing/failing/pending)
- List of unresolved review comments
- List of PR reviews (especially from `copilot-pull-request-reviewer`)

---

## Phase 2: Polling Loop

> **DO NOT use `gh pr checks --watch`** — it only monitors CI check status changes and will NOT alert on new review comments.

**Poll Interval**: Every 4 minutes

### Each Polling Cycle:

1. **Check GitHub Actions Status**
   - Build (TypeScript, Vite)
   - Tests (Vitest)
   - Deployment (SFTP)

2. **Check for New Review Comments**

   > **CRITICAL**: Copilot can run MULTIPLE reviews on a PR. Each push may trigger a NEW review with HIGHER databaseId values.

   ```bash
   # Store the last comment ID you've processed
   LAST_SEEN_ID=3020000000  # Update after each poll

   # Get only NEW Copilot comments
   gh api graphql -f query='...' --jq "
     .data.repository.pullRequest.reviews.nodes[]
     | select(.author.login == \"copilot-pull-request-reviewer\")
     | .comments.nodes[]
     | select(.databaseId > $LAST_SEEN_ID)
     | {databaseId, body: .body[0:100], path, line}
   "
   ```

3. **Continue Until**:
   - All GitHub Actions checks pass
   - All review comments have replies
   - No NEW Copilot comments appear after latest push

---

## Phase 3: GitHub Actions Failures

When a GitHub Actions check fails:

### 3.1 Fix Locally (Never via GitHub UI)

```bash
# 1. Sync local branch to remote (hard reset to avoid conflicts)
git fetch origin
git checkout -B {BRANCH_NAME} origin/{BRANCH_NAME} --force

# 2. Fix the issue locally

# 3. Run sanity checks
./scripts/sanity_checks.sh

# 4. Commit and push
git add .
git commit -m "{descriptive commit message explaining the fix}"
git push origin
```

### 3.2 Monitor Re-run

After pushing, the GitHub Actions will automatically re-run. Continue polling to verify the fix.

---

## Phase 4: Review Comments - Critical Rules

**ALL comments MUST be replied to on GitHub** — This is non-negotiable.

### 4.1 Process Each Review Comment

#### a. Read Full Thread

If `in_reply_to_id != null`, read ALL replies to check if already addressed:

```bash
# Fetch all comments and filter by in_reply_to
gh api /repos/cfogelklou/perpetual-presentation/pulls/{PR_NUMBER}/comments --jq '.[] | select(.in_reply_to == {COMMENT_ID})'
```

#### b. Verify in Current Code

Use the `Read` tool to check if the issue actually exists in the current codebase at the specified path and line.

#### c. Critically Evaluate

| Comment Status | Action |
|----------------|--------|
| **Valid and needs fixing** | Fix it, test locally, commit/push, reply explaining the fix |
| **Already fixed** | Reply explaining it was already addressed (provide commit hash if available) |
| **Incorrect/false positive** | Reply politely explaining why it's not an issue |
| **Requires clarification** | Reply asking for more details |

#### d. ALWAYS Reply

**Quick reference** - Reply to comment ID `{COMMENT_ID}` on PR `{PR_NUMBER}`:

```bash
gh api -X POST "/repos/cfogelklou/perpetual-presentation/pulls/{PR_NUMBER}/comments/{COMMENT_ID}/replies" \
  -f body="Fixed — [explain what was changed and why]"
```

### 4.2 Reply Templates

**Fixed:**
```
Fixed — {explain what was changed and why}. Verified locally with {test name}.
```

**Already fixed:**
```
This was already addressed in commit {ABC123} — {explanation}. The current code is correct.
```

**Intentional / Not an issue:**
```
This is intentional — {technical justification}. The code is correct as written.
```

**False positive:**
```
This appears to be a false positive — {explanation of why the comment is incorrect}.
```

**Clarification needed:**
```
Could you clarify this comment? I'm not sure what change you're suggesting. {specific question}.
```

---

## Phase 5: After Local Changes

**CRITICAL**: You MUST `git commit` and `git push` — This is required for the user to see changes and for CI to re-run.

---

## Phase 6: Completion Criteria

### Manual PR Monitoring (When Triggered)

**Scope**: Monitor a specific PR when user requests "Monitor PR #XXX".

**Stop polling and notify the user when ANY of the following occur:**

| Condition | Action |
|-----------|--------|
| **PR Merged** | Stop monitoring THIS PR, notify user of successful merge |
| **PR Closed** | Stop monitoring THIS PR, notify user PR was closed without merge |
| **Checks Pass + Comments Replied** | Notify user ready for merge/review, stop polling THIS PR |
| **Draft PR** | Notify user PR is in draft state, stop polling THIS PR |

**Terminal States:**

```bash
# Check if PR is in a terminal state
gh pr view {PR_NUMBER} --json state,merged,mergedAt,closedAt,isDraft
```

**Stop monitoring THIS PR if:**
- `state: "MERGED"` → Success, notify user
- `state: "CLOSED"` and not merged → PR closed, notify user
- `isDraft: true` → Draft state, notify user

**Ready for User Action:**

When GitHub Actions pass AND all comments have replies:
- Notify the user: "PR #{PR_NUMBER} is ready for merge. All checks pass and all comments have been addressed."
- Stop polling THIS PR (awaiting user decision to merge or request changes)

**Do NOT automatically merge** — merging requires explicit user approval.

---

## Useful Commands

```bash
# Check GitHub Actions status
gh pr checks {PR_NUMBER}

# Get failed build logs
gh run view {RUN_ID} --log-failed

# Open PR in browser
gh pr view {PR_NUMBER} --web

# List all comments on a PR
gh pr view {PR_NUMBER} --json comments --jq '.comments[] | {body: .body, author: .author.login, path: .path, line: .line}'

# Get PR diff
gh pr diff {PR_NUMBER}

# Merge PR (when ready, with user approval)
gh pr merge {PR_NUMBER} --merge
```

---

## Important Notes

1. **Don't blindly accept all comments** — Verify if issues exist in current code and align with project guidelines. If a comment is incorrect or outdated, politely explain why with technical justification.

2. **Always test locally before pushing** — Use `./scripts/sanity_checks.sh` to catch issues before pushing.

3. **Keep polling** — GitHub Actions may flake. If a check fails without local changes, simply re-run it via the GitHub UI or wait for the next automatic run.

4. **Document decisions** — If you disagree with a review comment, explain your reasoning clearly so the human reviewer can understand your perspective.

---

**Sources**:
- [GitHub CLI Documentation](https://docs.github.com/en/cli)
- [GitHub REST API](https://docs.github.com/en/rest)
- Adapted from [strobopro_dev/wow_github_monitoring.md](../../strobopro_dev/wow_github_monitoring.md)
