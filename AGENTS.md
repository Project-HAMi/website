# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

### Deploy to GitHub Pages

```bash
GIT_USER=<Your GitHub username> USE_SSH=true yarn deploy
```

Builds and deploys the website to the `gh-pages` branch for GitHub Pages hosting.

## Architecture

### Docusaurus Configuration

- **Config file:** `docusaurus.config.js`
- **Node version:** 18 (required - see `netlify.toml` and `.github/workflows/pr-test.yml`)
- **Default locale:** English (`en`)
- **Supported locales:** English, Chinese (`zh`)

### Content Structure

**Documentation (`docs/`):**

- Organized by categories defined in `sidebars.js`
- Main sections:
  - Core Concepts
  - Key Features
  - Get Started
  - Installation (including device-specific guides for NVIDIA, Cambricon, Hygon, Mthreads, Iluvatar, Enflame, AWS Neuron, Kunlunxin, Metax, Ascend)
  - User Guide (with monitoring and device-specific subsections)
  - Developer Guide
  - Contributor Guide
  - Troubleshooting
  - FAQ

**Multi-version documentation:**

- Current version in `docs/`
- Historical versions in `versioned_docs/version-vX.Y.Z/`
- Version list in `versions.json`
- When adding new versions, use `npm run docusaurus docs:version <version>`

**Blog (`blog/`):**

- Standard Docusaurus blog with YYYY-MM-DD-title directory structure

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

**Custom Pages:**

- `src/pages/index.js` - Homepage
- `src/pages/adopters.mdx` - Adopters page

### Custom Styling

- `src/css/custom.css` - Global CSS overrides
- `src/pages/styles.module.css` - Homepage styles

### Search Configuration

**Algolia:**

- App ID: IWSUKSVX6L
- Index: project-hami
- Contextual search enabled for version/language awareness
- Configured in `docusaurus.config.js`

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

When releasing a new HAMi version:

1. Run `npm run fetch-changelog <version>` to update changelog
2. Use `npm run docusaurus docs:version <version>` to version current docs
3. Update `versions.json` if needed

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

### Custom Changelog Plugin Details

The changelog plugin (`src/plugins/changelog/index.js`) is a customized Docusaurus blog plugin that:

- Reads `CHANGELOG.md` from repository root
- Parses markdown sections into blog posts
- Extracts GitHub author information from commit references
- Generates custom blog list and post components
- Watches `CHANGELOG.md` for changes in development

## Deployment

### CI/CD

**Pull Request Tests** (`.github/workflows/pr-test.yml`):

- Triggers on PR to `master` branch
- Runs `npm install` and `npm run build`
- Uploads build artifact for preview
- Uses Node.js 18

### Hosting

- **Production:** Netlify (configured in `netlify.toml`)
- **Custom domain:** project-hami.io (via `static/CNAME`)
- **Build command:** `npm run build`
- **Node version:** 18

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
- **Metax** - Chinese GPU with topology-aware scheduling
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
