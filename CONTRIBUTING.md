# Contributing to the HAMi Website

Thank you for your interest in improving the HAMi documentation! This file covers the technical workflow for contributing changes to this repository.

For contribution guidelines, code of conduct, and the review process, see [Contributing to HAMi](https://project-hami.io/docs/contributor/contributing).

## Quick Start

```bash
# Install dependencies
npm install

# Start local dev server (hot reload)
npm start

# Build the production site
npm run build

# Serve the built site locally
npm run serve
```

## Running Checks Locally

All PRs must pass the following checks. Run them locally before pushing:

### 1. Install Dependencies

```bash
npm install
```

### 2. Lint (Markdown)

Checks Markdown files for structural issues (heading hierarchy, blank lines, list formatting, etc.):

```bash
npm run lint
```

To auto-fix common issues:

```bash
npx markdownlint --fix 'docs/**/*.md' 'tutorials/**/*.md' 'blog/**/*.md'
```

### 3. Format Check

Verifies that all files follow consistent formatting (Prettier):

```bash
npm run format:check
```

To auto-fix formatting:

```bash
npm run format
```

### 4. Build

Builds the full site (both `en` and `zh` locales). This also validates internal links:

```bash
npm run build
```

For a faster build (English only):

```bash
npm run build:fast
```

### 5. Run All Checks

```bash
npm run check:all
```

This runs lint → format check → build in sequence.

## CI

Every pull request automatically runs:

| Check            | What it does                                              |
| ---------------- | --------------------------------------------------------- |
| **Lint**         | `npm run lint` — Markdown structural checks               |
| **Format**       | `npm run format:check` — Prettier formatting verification |
| **Build**        | `npm run build` — Full site build with link validation    |
| **Broken Links** | Internal link check against the built site                |

A weekly scheduled run also validates the `master` branch health.

## Project Structure

```
docs/              Main documentation (English)
tutorials/         Tutorial content
blog/              Blog posts
i18n/zh/           Chinese translations
src/               Custom React components, plugins, CSS
static/            Static assets (images, files)
docusaurus.config.js  Site configuration
sidebars.js        Documentation sidebar definition
```

## Adding a New Page

1. Create a `.md` file in the appropriate directory under `docs/`
2. Add a frontmatter block with `title` and optionally `sidebar_label`
3. Add an entry in `sidebars.js` if needed
4. For Chinese translation, add the corresponding file under `i18n/zh/docusaurus-plugin-content-docs/current/`

## Questions?

Open an issue at [Project-HAMi/website](https://github.com/Project-HAMi/website/issues) or reach out on the [community channels](https://project-hami.io/community).
