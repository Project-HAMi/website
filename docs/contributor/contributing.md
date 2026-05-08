---
title: Contributing to HAMi
sidebar_label: Contributing
---

HAMi is a CNCF Sandbox project that brings GPU and AI accelerator virtualization to Kubernetes. The scheduler, device plugins, documentation, and tooling are all built and maintained by community contributors.

This guide is the starting point for any contribution, whether you are fixing a typo or implementing a new hardware backend.

## The Critical Rule

**You must understand every change you submit.**

Using tools to help write code or documentation is fine. Submitting a change you cannot explain is not. If a reviewer asks why a piece of code works the way it does and you cannot answer, the PR will not be merged. This applies to every contribution, regardless of how it was produced.

This matters more in HAMi than in most projects. Code that manages GPU memory, device scheduling, or accelerator lifecycle can cause data corruption, hardware faults, or silent misallocation if it is wrong. "It looked right" is not enough.

## Code of Conduct

All community members must follow the [CNCF Code of Conduct](https://github.com/cncf/foundation/blob/main/code-of-conduct.md). Report violations to the CNCF CoC committee via cncf-coc@lists.cncf.io.

## Ways to Contribute

Writing code is not the only way to contribute.

| Contribution type | What it involves |
| --- | --- |
| Bug reports | Open a detailed issue with reproduction steps and environment info |
| Bug fixes | Submit a PR with a test case that covers the fix |
| New features | Open an issue first to align on approach, then submit a PR |
| Documentation | Fix errors, fill gaps, add examples, improve clarity |
| Blog posts | Write about HAMi use cases, integrations, or release highlights |
| Translations | Translate English docs into Chinese or help maintain the existing Chinese translations |
| Code review | Read open PRs and share technical feedback |
| Issue triage | Reproduce bugs, ask for missing info, close stale issues |
| Community support | Answer questions in Slack or GitHub Discussions |

## Community

| Channel | Purpose |
| --- | --- |
| [GitHub Issues](https://github.com/Project-HAMi/HAMi/issues) | Bug reports and feature requests |
| [GitHub Discussions](https://github.com/Project-HAMi/HAMi/discussions) | Questions, ideas, design proposals |
| [CNCF Slack #hami](https://cloud-native.slack.com/archives/C03E57Q30FY) | Real-time chat |
| [MAINTAINERS](https://github.com/Project-HAMi/HAMi/blob/master/MAINTAINERS.md) | Current maintainer list |
| [Community Meetings](https://github.com/Project-HAMi/community) | Bi-weekly video meetings |

Before opening an issue or PR, search existing issues and discussions for related work.

**New to HAMi?** Join [CNCF Slack](https://cloud-native.slack.com/archives/C03E57Q30FY) and introduce yourself in `#hami`. Maintainers and existing contributors are happy to help you find a good first issue, review a draft, or answer questions before you open a PR.

## Prerequisites

**For all contributions:**
- Git with a GitHub account
- You must be able to certify contributions under the [Developer Certificate of Origin](https://developercertificate.org/)

**For HAMi core (Go):**
- Go 1.21+
- `kubectl` and access to a Kubernetes cluster with a supported GPU or accelerator

**For documentation (website):**
- Node.js v20
- npm

## Setup

### Fork and Clone

Fork the target repository on GitHub, then clone your fork:

```bash
export user="your-github-username"

# For core HAMi
git clone https://github.com/$user/HAMi.git
cd HAMi
git remote add upstream https://github.com/Project-HAMi/HAMi.git
git remote set-url --push upstream no_push   # prevent accidental upstream push

# For the docs website
git clone https://github.com/$user/website.git
cd website
git remote add upstream https://github.com/Project-HAMi/website.git
npm install
```

### Stay in Sync

Keep your local master branch current with upstream before starting new work:

```bash
git fetch upstream
git checkout master
git rebase upstream/master
```

Use `rebase`, not `merge`, to keep a clean commit history.

For a detailed walkthrough of the full Git workflow, see the [GitHub Workflow guide](github-workflow.md).

## Finding Work

Good starting points:

- [`good first issue`](https://github.com/Project-HAMi/HAMi/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22) - scoped, well-documented, friendly to new contributors
- [`help wanted`](https://github.com/Project-HAMi/HAMi/issues?q=is%3Aopen+is%3Aissue+label%3A%22help+wanted%22) - open for contributions, may need domain knowledge
- Documentation gaps and broken links in the [website repository](https://github.com/Project-HAMi/website/issues)

When you decide to work on an issue, comment on it. A maintainer will assign it to you to prevent duplicate effort.

## Contributor Workflow

### Branch Naming

Use short, descriptive branch names that reflect the change:

```bash
git checkout -b fix/gpu-memory-calculation
git checkout -b feat/kunlunxin-multi-card
git checkout -b docs/update-ascend-guide
```

### Small vs. Large Changes

**Any PR that adds or changes more than 100 lines of code or documentation requires a GitHub issue or discussion first.** Open the issue, describe what you want to do and why, and wait for maintainer feedback before writing the code. Only then open the PR.

**Small changes** (bug fixes, typo corrections, docs improvements under 100 lines): open a PR directly, no issue required.

**Large changes** (new features, API changes, new hardware backends, refactors spanning multiple packages, docs additions over 100 lines):

1. Open a GitHub issue describing the problem and your proposed approach.
2. Get alignment from maintainers before investing significant time.
3. Open a draft PR early once you have direction - share progress before the implementation is final.

PRs opened without a prior issue for large changes will be asked to go back and open one first.

### Validate Before Pushing

For Go code:

```bash
make verify
make test
```

For documentation:

```bash
npm run build:fast   # English-only, ~45 seconds - use during development
npm run build        # Full build with all locales, ~80 seconds - mirrors CI
```

## Code Style

### Go

- Format all code with `gofmt` before committing. Unformatted code will fail CI.
- Follow [Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments) for style decisions.
- Write table-driven tests where it makes sense. Test names should describe the scenario, not the function.
- Keep functions small and focused. If a function needs a long comment to explain what it does, consider splitting it.
- Error messages should be lowercase and not end with punctuation (Go convention).

### Documentation

See the [Writing Style](contribute-docs.md#writing-style) section in the docs contribution guide.

## Commit Standards

### Format

HAMi uses [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <description>

[optional body]

[optional footer(s)]
```

**Types:**

| Type | Use for |
| --- | --- |
| `feat` | New functionality |
| `fix` | Bug fix |
| `docs` | Documentation changes only |
| `chore` | Maintenance: deps, build config, CI |
| `refactor` | Code restructure with no behavior change |
| `test` | Adding or updating tests |
| `perf` | Performance improvement |

**Good examples:**

```
feat(scheduler): add memory oversell ratio config option
fix(deviceplugin): handle graceful shutdown on SIGTERM
docs: correct vGPU memory limit example in Ascend guide
chore: bump Go to 1.22
test: add unit tests for MLU device discovery
```

**Rules:**
- Subject line: 72 characters or fewer
- Imperative mood: "add", "fix", "update" - not "added", "fixed", "updates"
- Body: explain *what* and *why*, not *how*
- No period at the end of the subject line

### DCO Sign-off (Required)

Every commit must include a `Signed-off-by` line. CI blocks PRs that are missing it.

```bash
git commit -s -m "fix: correct memory calculation for MLU"
```

The `-s` flag appends:

```
Signed-off-by: Your Name <your@email.com>
```

This certifies you have the right to submit the work under the project's license. See the [Developer Certificate of Origin](https://developercertificate.org/) for the full text.

**Forgot to sign off?** Fix it before pushing:

```bash
# Single commit
git commit --amend -s --no-edit

# Multiple commits on the branch
git rebase HEAD~<n> --signoff
```

## Pull Requests

### Before Opening

- [ ] Every commit has a `Signed-off-by` line
- [ ] Commit messages follow Conventional Commits format
- [ ] If this PR changes more than 100 lines, a GitHub issue was opened first and is linked below
- [ ] Local checks pass (`make verify` for Go, `npm run build:fast` for docs)
- [ ] Tests added or updated for code changes
- [ ] Docs updated if user-facing behavior changed
- [ ] Related issue linked in the PR description

### PR Description

Keep it short and factual:

- What does this change do?
- Why is it needed?
- How was it tested?
- Reference related issues: `Fixes #123` or `Relates to #456`

**Formatting rules for PR descriptions, issue bodies, and commit messages:**
- No em-dashes (`—`) - use a regular hyphen (`-`) instead
- No emojis
- No filler phrases ("This PR aims to...", "In this PR, we...")
- No marketing language ("seamless", "robust", "powerful", "innovative")
- Write in your own words - short, direct sentences

### Keeping PRs Focused

One logical change per PR. Large, unfocused PRs take longer to review and are harder to revert if something breaks. If you are fixing multiple independent issues, open separate PRs.

### Squashing Commits

Before merge, clean up your commit history. Squash fixup commits, review-feedback commits, and typo corrections into the relevant logical commit. Each remaining commit should represent a meaningful unit of work that compiles and passes tests independently.

For step-by-step squash instructions, see the [GitHub Workflow guide](github-workflow.md#squash-commits).

### Review Process

1. After the PR is opened, a maintainer or reviewer is assigned.
2. Address all review comments. If you disagree with feedback, explain why in the thread.
3. Update the PR by pushing to the same branch - do not close and reopen.
4. CI must pass before merge.
5. Once an approver marks the PR approved, it will be merged.

## Code Review

When reviewing others' PRs:

- Reference the exact line and explain the concern - do not just flag something as wrong.
- Distinguish blocking issues from optional suggestions. Use `nit:` for minor style notes that should not block merge.
- Acknowledge what works well. A review that only lists problems is harder to act on.
- If you spot something minor (typo, formatting), use a GitHub suggestion so the author can apply it in one click.
- Reviews are collaborative. Assume good intent.

## AI Usage

AI tools may be used to assist with writing code, documentation, or commit messages. There is one hard rule:

**Do not submit AI-generated text directly as your PR description, issue body, or commit message.**

Maintainers need to communicate with the person behind the contribution - not with a language model. Write in your own words, even if AI helped you draft a starting point. Text that is clearly AI-generated (verbose summaries, excessive lists, filler phrases, "In conclusion") will be flagged and the author asked to rewrite.

What is acceptable:
- Using AI to help understand unfamiliar code
- Using AI to draft a commit message that you then edit and own
- Using AI to check grammar or clarity
- Using AI to generate code that you review, test, and understand

What is not acceptable:
- Pasting an AI-generated PR description without reading and rewriting it
- Submitting code you cannot explain if asked during review
- Using AI-generated text as issue comments or discussion posts

If AI played a significant role beyond autocomplete, mention it briefly in the PR description. This helps reviewers calibrate their review depth.

## Documentation Contributions

Documentation lives in the [Project-HAMi/website](https://github.com/Project-HAMi/website) repository and is built with Docusaurus 3.

For a complete guide covering frontmatter, sidebar registration, image paths, local preview, and Chinese translation workflow, see [How to Contribute Docs](contribute-docs.md).

**Quick rules:**
- English is the source language. All new docs go to `docs/` first.
- Chinese translations go under `i18n/zh/docusaurus-plugin-content-docs/current/`.
- Every new doc must be added to `sidebars.js`.
- Run `npm run build:fast` to validate before opening a PR.

## Hardware Vendor Contributions

HAMi supports multiple GPU and accelerator vendors. If you are adding support for a new device or fixing vendor-specific behavior:

- Follow the existing structure in `pkg/device/` (one directory per vendor).
- Test on real hardware where possible. Simulated tests are acceptable for CI, but hardware validation is expected for new backends before merge.
- Follow the documentation pattern under `docs/userguide/<vendor>-device/`.
- Include working YAML examples under `docs/userguide/<vendor>-device/examples/`.

Supported vendors: NVIDIA, Cambricon (MLU), Hygon (DCU), Mthreads, Iluvatar, Enflame (GCU), AWS Neuron, Kunlunxin (XPU), Metax, Ascend.

## Translations

The HAMi website supports two languages: **English** (primary) and **Simplified Chinese**. No other languages are currently supported.

English is the authoritative source. All new documentation is written in English first. Chinese translations live in `i18n/zh/`.

To add or update a translation:

1. Find the corresponding file under `i18n/zh/docusaurus-plugin-content-docs/current/`.
2. Translate the content, keeping frontmatter and document structure identical to the English source.
3. Submit a PR with only translation changes - do not mix translation and content edits in the same PR.

If an English page has no Chinese counterpart yet, you can create one. A placeholder (`TBD`) in the body is acceptable if you want to register the page before completing the translation.

## Contributor Roles

HAMi uses a defined contributor ladder with progressively more responsibility and access:

- **Community Participant** - follows the CoC, participates in discussions
- **Contributor** - submits PRs and issues, helps other users
- **Organization Member** - established contributor with at least 5 accepted PRs, enabled 2FA, and two sponsors
- **Reviewer** - responsible for reviewing PRs in a specific area, at least 10 reviews on record
- **Maintainer** - responsible for the project as a whole, approves and merges PRs

For full role requirements, the promotion path, and how to nominate yourself or others, see the [Contributor Ladder](ladder.md).

## Filing Issues

Use the [HAMi issue tracker](https://github.com/Project-HAMi/HAMi/issues) for bugs and feature requests. Before filing:

- Search for existing issues that cover the same problem.
- For security vulnerabilities, follow the [security policy](https://github.com/Project-HAMi/HAMi/blob/master/SECURITY.md) instead of opening a public issue.

For website issues, use the [website issue tracker](https://github.com/Project-HAMi/website/issues).

When filing a bug, include:
- HAMi version and installation method
- Kubernetes version and cluster setup
- GPU or accelerator type and driver version
- Steps to reproduce
- Actual vs. expected behavior
- Relevant logs or error output

## License

By contributing to HAMi, you agree that your contributions will be licensed under the [Apache License 2.0](https://github.com/Project-HAMi/HAMi/blob/master/LICENSE).
