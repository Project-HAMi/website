---
title: How to cherry-pick PRs
sidebar_label: Cherry Picks
---

This document explains how cherry picks are managed on release branches in the `Project-HAMi/HAMi` repository. The typical use case is backporting a bug fix from master to an active release branch.

## Prerequisites

- A pull request already merged into master.
- The target release branch exists (for example, `release-2.4`).
- Git and GitHub configured with your fork as `origin` and the upstream as `upstream`.
- [GitHub CLI (`gh`)](https://github.com/cli/cli#installation) installed.
- A GitHub personal access token with `repo` and `read:org` scopes, used for `gh auth login`.

## What qualifies for a cherry pick

Release branches receive far fewer merges than master because the bar is higher. Cherry picks are reserved for critical fixes only:

- Data loss
- Memory corruption
- Panic, crash, or hang
- Security vulnerabilities

A bug that affects only an alpha feature does not qualify, even if it is a real bug.

If the fix is not clearly critical, support the case with:

- A GitHub issue describing the problem
- Scope of the change
- Risks of adding the change
- Risks of regression
- Tests added or updated
- Sign-off from key stakeholders or reviewers

Features that were not enabled on a specific vendor's platform belong in master for the next release. They will not be backported.

## Initiate a cherry pick

Run the [cherry pick script][cherry-pick-script]. This example backports PR #1206 to `upstream/release-1.0`:

```bash
hack/cherry_pick_pull.sh upstream/release-1.0 1206
```

Notes:

- The script expects a remote named `upstream` pointing to `https://github.com/Project-HAMi/HAMi`.
- Run the script separately for each release branch that needs the fix.
- If `GITHUB_TOKEN` is not set, the script will prompt for a token. Use a [personal access token](https://github.com/settings/tokens) rather than your account password.

## Cherry pick review

Cherry pick PRs follow the same review process as normal PRs. Code owners review (`/lgtm`) and approve (`/approve`) as they see fit.

Release notes auto-populate from the original master PR.

## Troubleshooting

**The cherry pick does not apply cleanly.**
The patch conflicts with changes already in the release branch. Fetch the auto-generated branch from your fork, resolve the conflicts manually, and force-push.

**CI fails on the cherry pick branch.**
Fetch the auto-generated branch, amend the failing commit, and force-push. Alternatively, open a new PR manually - it is noisier but sometimes cleaner.

## Unsupported releases

Fixes for end-of-life release branches are not accepted without prior discussion. Open an issue to start that conversation before submitting a cherry pick against an unsupported branch.

[cherry-pick-script]: https://github.com/Project-HAMi/HAMi/blob/master/hack/cherry_pick_pull.sh
