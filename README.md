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

## Why HAMi

Running AI workloads on Kubernetes without GPU virtualization means each pod receives an entire physical GPU, regardless of how much memory or compute it actually needs. This leaves most GPU capacity idle when workloads are small, and blocks other workloads from running at all.

Static partitioning approaches such as NVIDIA MIG divide a GPU at the hardware level, but partitions are fixed at creation time and require specific hardware support. They do not adapt to changing workload sizes.

HAMi virtualizes GPU resources at the Kubernetes scheduler and CUDA driver levels. Multiple pods share a single physical GPU with isolated memory limits and enforced compute quotas. Workloads do not require modification - the limits are applied transparently through a library injected at container start.

HAMi is a CNCF Sandbox project. It supports NVIDIA GPUs and a range of heterogeneous accelerators including Ascend NPU, Cambricon MLU, Hygon DCU, and others.

## Architecture

HAMi operates across two planes:

**Control plane**

- A scheduler extender intercepts pod scheduling decisions and selects the node and device that satisfy the pod's GPU resource request.
- A mutating webhook injects the libvgpu library and sets environment variables into containers that request GPU resources.

**Data plane**

- A device plugin on each node advertises virtual GPU resources to the Kubernetes API and handles device allocation.
- libvgpu, loaded inside each container, intercepts CUDA API calls and enforces the memory and compute limits set by the scheduler.

The scheduler and device plugin communicate through Kubernetes node annotations. No sidecar containers are required.

## Ecosystem Integrations

| Project | What the integration enables |
|---------|------------------------------|
| [vLLM](https://github.com/vllm-project/vllm) | Run inference servers with GPU memory caps, enabling multiple models to share one GPU |
| [Volcano](https://volcano.sh/) | Gang scheduling and queue-based batch scheduling for GPU workloads |
| [Prometheus](https://prometheus.io/) | HAMi exposes per-container GPU metrics including memory usage and utilization |
| [Grafana](https://grafana.com/) | Pre-built dashboard available for visualizing HAMi GPU metrics |
| [NVIDIA GPU Operator](https://github.com/NVIDIA/gpu-operator) | Can coexist with GPU Operator when HAMi manages scheduling and the Operator manages drivers |

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

- Node.js v20+
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

| Command                      | Description                                  |
| ---------------------------- | -------------------------------------------- |
| `npm start`                  | Start development server with hot-reload     |
| `npm start:network`          | Start dev server accessible on local network |
| `npm run build`              | Build full production site (all languages)   |
| `npm run build:fast`         | Build English only (faster for testing)      |
| `npm run serve`              | Serve production build locally               |
| `npm run fetch-changelog`    | Fetch changelog from GitHub releases         |
| `npm run write-translations` | Update translation files                     |
| `npm run clear`              | Clear Docusaurus cache                       |

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
