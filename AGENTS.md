# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

This is the HAMi documentation website built with [Docusaurus 3](https://docusaurus.io/). HAMi is an open-source GPU virtualization solution for heterogeneous AI computing. The site serves as the primary documentation portal and official website.

**Key URLs:**

- Website: <https://project-hami.io/>
- GitHub Repo: <https://github.com/Project-HAMi/HAMi>
- Docs Repository: <https://github.com/Project-HAMi/website>

## Development Commands

### Start Local Development Server

```bash
npm run start
```

Starts a local development server with hot-reloading. Opens a browser window automatically.

### Build for Production

```bash
npm run build
```

Generates static content into the `build` directory. Used for deployment.

### Serve Production Build Locally

```bash
npm run serve
```

Serves the built site locally to test production output before deploying.

### Fetch Changelog from GitHub

```bash
npm run fetch-changelog <version>
```

Example:

```bash
npm run fetch-changelog 2.6.0
```

Fetches release information from GitHub API and updates changelog files. Requires `GH_PAT` environment variable for authentication.

### Clear Build Cache

```bash
npm run clear
```

Clears Docusaurus cache and generated files. Useful when troubleshooting build issues.

### Write Translations

```bash
npm run write-translations
```

Extracts translatable strings for i18n.

### Lint, Format & Link Checks

```bash
npm run lint          # markdownlint on docs/tutorials/blog/i18n
npm run format:check  # prettier --check . (CI runs this)
npm run format        # prettier --write .
npm run check-links   # build + linkinator on ./build
npm run check:all     # lint && format:check && build
npm run build:fast    # build English locale only (skips zh, for quick iteration)
```

CI (`.github/workflows/docs-health.yml`) runs `lint`, `format:check`, and `build` on every PR.

### Deployment

The site deploys automatically to Netlify on every merge to `master` (see `netlify.toml`). No manual deploy step is needed.

## Commit Convention

This project enforces **DCO (Developer Certificate of Origin)** — every commit MUST include a `Signed-off-by:` line, or CI will block the PR. It also follows [Conventional Commits](https://www.conventionalcommits.org/).

**Always commit with `-s`** (lowercase) to add the DCO sign-off:

```bash
git commit -s -m "fix(versions): version v2.9.0 and restore standard model"
```

Do NOT confuse `-s` (lowercase = DCO `Signed-off-by`) with `-S` (uppercase = GPG cryptographic signature). This repo's `commit.gpgsign` is already `true`, so GPG signing happens automatically; you only need to add `-s` explicitly.

**Conventional Commit prefixes used in this repo:** `fix:`, `feat:`, `style:`, `docs:`, `chore:`, `refactor:`, with an optional scope like `fix(versions):` or `style(blog):`.

**Forgot to sign off?** Before pushing, fix all unpushed commits in one go:

```bash
git rebase --exec "git commit --amend --no-edit -s" <branch-base>
```

See `docs/contributor/contributing.md` (§ DCO Sign-off) and `docs/contributor/github-workflow.md` for the full policy.

## Architecture

### Docusaurus Configuration

- **Config file:** `docusaurus.config.js`
- **Node version:** 20 (required - see `netlify.toml` and `.github/workflows/docs-health.yml`)
- **Default locale:** English (`en`)
- **Supported locales:** English, Chinese (`zh`)

### Content Structure

**Documentation (`docs/`):**

- Organized by categories defined in `sidebars.js`
- Main sections:
  - Core Concepts
  - Key Features
  - Get Started
  - Installation (including device-specific guides for NVIDIA, Cambricon, Hygon, Mthreads, Iluvatar, Enflame, AWS Neuron, Kunlunxin, MetaX, Ascend)
  - User Guide (with monitoring and device-specific subsections)
  - Developer Guide
  - Contributor Guide
  - Troubleshooting
  - FAQ

**Multi-version documentation:**

- Dev/next (unreleased) version in `docs/` (ZH mirror: `i18n/zh/docusaurus-plugin-content-docs/current/` — note: the `current` dir name is a Docusaurus convention for the _unreleased_ version, NOT the "current/stable" release; see Version Management below)
- Historical versions in `versioned_docs/version-vX.Y.Z/` (immutable snapshots)
- Version list in `versions.json` (first entry = default version served at `/docs`)
- To release a new version, see **Version Management** below (do NOT hand-copy)

**Blog (`blog/`):**

- Standard Docusaurus blog with YYYY-MM-DD-title directory structure

**Tutorials (`tutorials/`):**

- Hands-on lab guides, separate docs plugin (id: `tutorials`, routeBasePath: `tutorials`)
- Sidebar: `sidebars-tutorials.js` (separate from the main `sidebars.js`)
- ZH mirror: `i18n/zh/docusaurus-plugin-content-docs-tutorials/current/`

**Changelog:**

- Source file: `CHANGELOG.md` in root
- Custom plugin: `src/plugins/changelog/index.js`
- Parses CHANGELOG.md and generates blog posts at `/changelog`
- Extracts committers and creates author profiles
- Generated files go to `changelog/source/`

### Internationalization (i18n)

**Chinese translations:**

- Location: `i18n/zh/`
- Structure mirrors `docs/` but with translated content
- Sidebar labels: `i18n/zh/docusaurus-plugin-content-docs/current.json`
- When editing English docs, consider if Chinese translation needs updating

### Custom Components

**Location:** `src/components/`

- `button.js` - Custom button component
- `featuresList.js` - Features display
- `gitHubButton.js` - GitHub integration button
- `supportersList.js` - Supporters/community display
- `whatIs.js` - "What is HAMi" content component
- `adoptersList.js` - Adopters list (data from `src/data/adopters.json`)
- `caseStudiesList.js` - Case studies listing
- `contributorsList.js` - Contributors display
- `BeforeAfterComparison.js` - Before/after image comparison widget

**Custom Pages:**

- `src/pages/index.js` - Homepage
- `src/pages/community.js` - Community page
- `src/pages/case-studies.js` - Case studies page

### Custom Styling

- `src/css/custom.css` - Global CSS overrides
- `src/pages/styles.module.css` - Homepage styles

### Search Configuration

**Local search** via [`@easyops-cn/docusaurus-search-local`](https://github.com/easyops-cn/docusaurus-search-local) (no external Algolia dependency):

- Search contexts: `docs`, `zh/docs`, `tutorials`, `zh/tutorials`
- `useAllContextsWithNoSearchContext: true` — queries with no context search all
- `searchResultLimits: 8`, `searchResultContextMaxLength: 50` (performance caps)
- Configured in `docusaurus.config.js` under `themes`

### Static Assets

**Location:** `static/`

- `img/` - Images (logos, diagrams, screenshots)
- `favicons/` - Website favicons in multiple sizes
- `CNAME` - Custom domain record for project-hami.io

## Key Patterns

### Adding New Documentation

1. Create markdown file in appropriate `docs/` subdirectory
2. Add entry to `sidebars.js` in the relevant category
3. Follow existing frontmatter patterns:

   ```yaml
   ---
   title: Page Title
   sidebar_label: Short Title
   ---
   ```

4. If updating Chinese content, mirror changes in `i18n/zh/docusaurus-plugin-content-docs/current/`

### Adding Device Types

The documentation follows a consistent pattern for each hardware device type (NVIDIA, Cambricon, Hygon, etc.):

1. **Main guide:** `userguide/<Device>-device/enable-<device>-sharing.md`
2. **Resource specification:** `specify-device-memory-usage.md`, `specify-device-core-usage.md`
3. **Type selection:** `specify-device-type-to-use.md`, `specify-device-uuid-to-use.md`
4. **Examples:** `examples/` subdirectory with common use cases

### Version Management

HAMi is released in the [HAMi code repo](https://github.com/Project-HAMi/HAMi), but **docs versioning must be triggered manually in this (website) repo**. Docusaurus does NOT auto-version on release — forgetting this step was the root cause of the v2.9.0 dropdown bug (the version was shipped but never snapshotted, so it was missing from the site).

**⚠️ Terminology gotcha:** The word `current` is overloaded here. `current/` (a directory name, hardcoded by Docusaurus as `CURRENT_VERSION_NAME`) = the **unreleased dev version** at `/docs/next`. "Latest stable release" (e.g. v2.9.0, the first entry in `versions.json`, served at `/docs`) is a _different thing_. They are NOT the same — confusing them was the root cause of the v2.9.0 version bug.

**How versioning works (read this once):**

- `docs/` (EN) and `i18n/zh/docusaurus-plugin-content-docs/current/` (ZH) are the **only** working directories. They hold the _next_ (unreleased) version, served at `/docs/next`. Edit these for all day-to-day work.
- `versioned_docs/version-vX.Y.Z/` and `i18n/zh/.../version-vX.Y.Z/` are **immutable frozen snapshots** generated by the versioning command. Never hand-copy files into them.
- The first entry in `versions.json` is the default version served at `/docs` (the **latest stable release**, e.g. v2.9.0 — _not_ the `current/` directory, which is the unreleased dev version).

**When releasing a new HAMi version** (e.g. v2.10.0), in this repo:

1. `npm run docusaurus docs:version v2.10.0`
   - Snapshots `docs/` → `versioned_docs/version-v2.10.0/` (EN) **and** `i18n/zh/.../current/` → `i18n/zh/.../version-v2.10.0/` (ZH) automatically. One command covers both locales — do NOT copy manually.
   - Prepends `v2.10.0` to `versions.json` (becomes the new default at `/docs`).
   - **Version string MUST include the `v` prefix** (`v2.10.0`, not `2.10.0`).
   - `docs/` stays in place and continues accumulating the _next_ version's changes.
2. **Fix the ZH version label.** The command copies `current.json` into `version-vX.Y.Z.json`, which leaves the dev label `"下一个"` in place. Edit `i18n/zh/docusaurus-plugin-content-docs/version-vX.Y.Z.json` and set `version.label.message` to the version string (e.g. `"v2.10.0"`), matching the convention of older version JSON files. Leave `current.json` as `"下一个"`.
3. `npm run fetch-changelog <version>` to regenerate the changelog blog post from `CHANGELOG.md`.
4. `npm run build` and verify the version dropdown shows: `Next` / `vX.Y.Z` (active) / older versions — in BOTH `en` and `zh`.

**Fixing the latest stable version** (e.g. v2.9.0 has errors / untranslated content / wording issues):

The released version and the dev (`docs/`) version share the same files, so a fix usually needs to land in **both** — otherwise it either never reaches the live site (only fixed in `docs/`, which is the _next_ version) or regresses in the next release (only fixed in `version-vX.Y.Z/`, but `docs/` still has the old bug and gets snapshotted again at the next `docs:version`).

The clean workflow is **edit `docs/` first, then sync to the released version**:

1. **Make all fixes in `docs/` (EN) + `i18n/zh/.../current/` (ZH)** — your single source of truth. Commit (or open the PR) here.
2. **Sync the changed files into the released version.** Use git to get the exact list of files you touched, then copy each one across — this avoids both missing files and dragging in unrelated drift:

   ```bash
   # From the repo root, after committing your docs/ changes:
   VERSION=v2.9.0

   # English: sync each changed file from docs/ → versioned_docs/version-$VERSION/
   git diff --name-only HEAD~1 -- docs/ | while read f; do
     cp "$f" "versioned_docs/version-$VERSION/${f#docs/}"
   done

   # Chinese: sync each changed file from current/ → version-$VERSION/
   git diff --name-only HEAD~1 -- i18n/zh/docusaurus-plugin-content-docs/current/ | while read f; do
     cp "$f" "i18n/zh/docusaurus-plugin-content-docs/version-$VERSION/${f#*i18n/zh/docusaurus-plugin-content-docs/current/}"
   done
   ```

   Adjust `HEAD~1` / the version to match your situation. If you're syncing across multiple commits, use a commit range like `HEAD~5` or a branch base.

3. `npm run build` and verify the fix appears in **both** the released version (`/docs`) and the next version (`/docs/next`), in both `en` and `zh`.

**When to sync vs. not:**

- **Sync both** (the common case): the fix applies equally to the released and dev versions — e.g. typo, broken link, wrong command, missing translation, wording clarity. This is what the steps above are for.
- **Released version only**: the dev version's copy of that passage has already been rewritten/removed, so the fix doesn't apply there anymore. Rare — check by diffing the two files first.
- **Dev (`docs/`) only**: genuinely new content or improvements that belong to the _next_ release, not the latest stable one. Don't backport to a released version.

> Note: `docs/` (EN) and `versioned_docs/version-vX.Y.Z/` start out byte-identical right after a `docs:version`. The ZH `current/` and `version-vX.Y.Z/` may already have minor drift (e.g. CJK spacing normalization). The per-file sync above preserves any unrelated differences and only copies the files you actually changed.

**Do NOT** set `lastVersion: "current"` in `docusaurus.config.js`. That makes the in-development `docs/` the default version and breaks the current/next distinction (this was the v2.9.0 bug). The standard model — latest `versions.json` entry at `/docs`, dev at `/docs/next` — is correct.

### Editing Changelog

**Important:** Do NOT edit files in `changelog/source/` directly. They are auto-generated.

Edit `CHANGELOG.md` in the root directory instead. The changelog plugin will:

- Parse sections starting with `##`
- Extract committers from `#### Committers:` sections
- Generate blog posts with proper frontmatter
- Create author profiles with GitHub images

### Code Blocks and Syntax Highlighting

The site uses Prism.js with additional languages:

- bash
- diff
- json

Add more in `docusaurus.config.js` under `prism.additionalLanguages`.

### Mermaid Diagrams

Mermaid blocks are rendered through a custom wrapper at `src/theme/Mermaid/index.js`. To give a diagram a visible caption, add a `%% title: <text>` line as the **first line inside the mermaid fence**:

````
```mermaid
%% title: HAMi Ecosystem Integrations
flowchart TB
    A --> B
```
````

The wrapper extracts that comment and renders it as a `<figcaption>` (the lightbox picks it up too). `%%` is otherwise a plain mermaid comment, so the title only appears because of this wrapper. Do **not** use mermaid's YAML frontmatter form (`---\ntitle: ...\n---`) — it is not rendered on this site.

### Custom Changelog Plugin Details

The changelog plugin (`src/plugins/changelog/index.js`) is a customized Docusaurus blog plugin that:

- Reads `CHANGELOG.md` from repository root
- Parses markdown sections into blog posts
- Extracts GitHub author information from commit references
- Generates custom blog list and post components
- Watches `CHANGELOG.md` for changes in development

## Deployment

### CI/CD

**Docs Health Check** (`.github/workflows/docs-health.yml`):

- Triggers on PR to `master` branch (+ weekly schedule)
- Runs `npm run lint`, `npm run format:check`, `npm run build`, and a broken-internal-link check (`linkinator`)
- Uses Node.js 20

### Hosting

- **Production:** Netlify (configured in `netlify.toml`)
- **Custom domain:** project-hami.io (via `static/CNAME`)
- **Build command:** `npm run build`
- **Node version:** 20

## Content Guidelines

### Device-Specific Documentation

Each device vendor has a dedicated section under `userguide/<Vendor>-device/`:

- **NVIDIA** - Most comprehensive with MIG, DRA, and Volcano vGPU support
- **Cambricon (MLU)** - Chinese chipmaker
- **Hygon (DCU)** - Chinese GPU
- **Mthreads** - Moore Threads GPU
- **Iluvatar** - Chinese AI GPU
- **Enflame (GCU)** - Chinese AI accelerator
- **AWS Neuron** - AWS Inferentia/Trainium
- **Kunlunxin (XPU)** - Chinese AI chip
- **MetaX** - Chinese GPU with topology-aware scheduling
- **Ascend** - Huawei NPU

### Translation Sync

When updating documentation:

- English content is the source of truth in `docs/`
- Chinese translations in `i18n/zh/` may lag behind
- Check `i18n/zh/docusaurus-plugin-content-docs/current.json` for translated sidebar labels
- Blog posts have separate i18n structure in `i18n/zh/docusaurus-plugin-content-blog/`

### Resource Links

Documentation often references external resources:

- Helm charts
- GitHub repositories
- Device vendor documentation
- Example YAML manifests

Ensure all external links are correct and use HTTPS where applicable.
