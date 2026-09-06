# Technical Debt Database

This file tracks technical debt and known gaps encountered during development.
Add entries whenever you find issues that won't be fixed immediately. Entries
are numbered TD-N with Added / Location / Issue / Impact / Proposed Fix /
Severity; newest first.

## Active Items

### TD-001: Hub link-back + stale CLAUDE.md CI/deploy note (verified 2026-09-06)

**Added**: 2026-09-06 (seo branch)

**Location**: app footer/about surface; `CLAUDE.md`

**Issue**: The SEO head is complete — the only SEO gap is the missing link
back to the Applicaudia studio hub. Separately, CLAUDE.md says "no CI/CD,
manual deploy" but `.github/workflows/cd.yml` exists — a stale doc note.

**Impact**: The app is invisible in the studio's cross-network graph; the
stale CLAUDE.md note misleads contributors about how deploys happen.

**Proposed Fix**:
1. Link back to the Applicaudia hub: add a small footer or about mention
   linking https://applicaudia.se/apps/looppt/ (landing page for this app)
   and https://applicaudia.se/home/ (studio directory). The landing pages
   exist and are deployed from the root monorepo.
2. Update CLAUDE.md to reflect the cd.yml CI/CD pipeline instead of "no
   CI/CD, manual deploy".

**Severity**: Low
