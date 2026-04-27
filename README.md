# HAMi Documentation Website

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FProject-HAMi%2Fwebsite.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2FProject-HAMi%2Fwebsite?ref=badge_shield)

Official documentation and website for [HAMi (Heterogeneous AI Computing Virtualization Middleware)](https://project-hami.io/) - an open-source GPU virtualization solution for heterogeneous AI computing.

This repository contains:
- **Complete HAMi documentation** covering installation, usage, and development
- **Official HAMi website** built with [Docusaurus 3](https://docusaurus.io/)
- **Device-specific guides** for NVIDIA, Ascend, Cambricon, Enflame, Hygon, and more
- **Multi-language support** (English and Chinese)
- **Release notes and changelog**

## Links

- **Website**: https://project-hami.io/
- **Documentation**: https://project-hami.io/docs/
- **Main Repository**: https://github.com/Project-HAMi/HAMi
- **Issues**: https://github.com/Project-HAMi/website/issues
- **Discussions**: https://github.com/Project-HAMi/HAMi/discussions

## Project Structure

```
docs/
├── core-concepts/        # Introduction and architecture
├── installation/         # Installation guides and prerequisites
├── userguide/           # User documentation and guides
├── developers/          # Developer documentation and build guides
├── contributor/         # Contribution guidelines and governance
├── faq/                 # Frequently asked questions
├── releases.md          # Release notes and changelog
└── troubleshooting/     # Troubleshooting and diagnostics
```

## Getting Started

### Prerequisites

- Node.js v20+ (configured in `.nvmrc`)
- npm v10+

### Installation

```bash
npm install
```

### Local Development

Start a live development server:

```bash
npm run start
```

This command opens a browser window and enables hot-reloading. Most changes are reflected immediately without restarting the server.

For local network access (testing on other devices):

```bash
npm run start:network
```

### Build for Production

Generate static site content:

```bash
npm run build
```

For faster builds (English only, skips Chinese translation):

```bash
npm run build:fast
```

The generated content is in the `build/` directory.

### Preview Production Build

Serve the production build locally:

```bash
npm run serve
```

Visit `http://localhost:3000` to preview.

## Performance Optimizations

This site uses several build optimizations for fast builds despite containing:
- 250+ English documentation pages
- 1700+ translated (English/Chinese) pages
- 7 historical versions (v1.3.0 to v2.8.0)
- Full-text search indexing

See [BUILD_OPTIMIZATION.md](./BUILD_OPTIMIZATION.md) for details on optimizations including:
- Docusaurus Faster (Rspack)
- SWC JavaScript compiler
- Multi-threaded static generation
- Search index optimization

## Deployment

For GitHub Pages (requires appropriate permissions):

```bash
GIT_USER=<your_github_username> USE_SSH=true npm run deploy
```

For other hosting services, deploy the `build/` directory as a static site.

## Contributing

Contributions are welcome! Before contributing, please:

1. **Read the contribution guidelines** - See [contributor/contributing.md](./docs/contributor/contributing.md)
2. **Check existing issues** - Avoid duplicate work
3. **Follow the code of conduct** - https://github.com/cncf/foundation/blob/main/code-of-conduct.md
4. **Review the documentation style guide** - Maintain consistency with existing docs

### Common Tasks

- **Fix typos or improve wording**: Edit the relevant `.md` file in `docs/`
- **Add new documentation**: Create `.md` file in appropriate `docs/` subdirectory
- **Update sidebars**: Edit `sidebars.js` to reflect documentation structure changes
- **Translate content**: Contribute to Chinese translations in `i18n/zh/`

### DCO (Developer Certificate of Origin)

All commits must be signed with:

```bash
git commit -s
```

This adds the DCO signature: `Signed-off-by: Your Name <your.email@example.com>`

## Build Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start development server with hot-reload |
| `npm start:network` | Start dev server accessible on local network |
| `npm run build` | Build full production site (all languages) |
| `npm run build:fast` | Build English only (faster for testing) |
| `npm run serve` | Serve production build locally |
| `npm run fetch-changelog` | Fetch changelog from GitHub releases |
| `npm run write-translations` | Update translation files |
| `npm run clear` | Clear Docusaurus cache |

## Multi-Language Support

The site supports English and Chinese (Simplified). Content is organized as:
- **English**: `docs/` and `i18n/en/`
- **Chinese**: `i18n/zh/`

To contribute translations, update the corresponding files in `i18n/zh/`.

## Technology Stack

- **Framework**: Docusaurus 3.10.0
- **Build Tool**: Rspack (via @docusaurus/faster)
- **Compiler**: SWC
- **Runtime**: Node.js v20+
- **Package Manager**: npm
- **Hosting**: GitHub Pages / Netlify

## Maintainers

See [OWNERS](./OWNERS) for current maintainers.

## License

The documentation and website are part of the HAMi project. See the main repository for license information.

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FProject-HAMi%2Fwebsite.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2FProject-HAMi%2Fwebsite?ref=badge_large)
