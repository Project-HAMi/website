---
title: HAMi WebUI Developer Guide
linktitle: HAMi WebUI
---

## Project positioning

[HAMi WebUI](https://github.com/Project-HAMi/HAMi-WebUI) is the web visualization and O&M interface of HAMi. It is mainly used to monitor, inspect, and manage nodes, GPU resources, and workloads.

The project adopts a frontend-backend separation architecture:

- Frontend (browser) is responsible for pages and interactions.
- Backend BFF is responsible for static asset hosting and API proxying.

## Architecture and runtime flow

### System architecture

The architecture includes frontend UI, backend services, and underlying cluster resources. Through GPU usage data collection and processing, the system provides unified visualization and analysis of resource status.

<div align="center">

![HAMi WebUI architecture](/img/docs/common/developers/hami-webui-architecture-diagram.svg)

</div>

### Repository structure

- **Root (Node/NestJS, BFF)**
  - Hosts static assets from `public/`
  - Proxies unified `/api*` requests to backend services
  - In development, forwards frontend page requests to the Vite dev server
- **`packages/web` (frontend, Vue3 + Vite)**
  - Organizes pages, components, and routes
  - Calls `/api/vgpu/*` through Axios (forwarded by BFF)
- **`server`**
  - Go backend service

### Runtime ports

- BFF: `http://localhost:3000/`
- Vite dev server: `http://localhost:8080/`
- Backend service (proxied by BFF): `http://127.0.0.1:8000`

### Requests and static assets

- Frontend build output goes to root `public/` (`outDir: '../../public'`, assets in `public/static`)
- BFF static hosting: `src/main.ts` with `app.useStaticAssets(join(__dirname, '..', 'public'))`
- API proxy:
  - Frontend uses `/api/vgpu/...`
  - BFF `ApiProxyMiddleware` proxies to `http://127.0.0.1:8000` (with `^/api/vgpu -> ''` rewrite)

## Frontend stack and module organization

### Tech stack

- Vue 3 (Composition API + script setup)
- Vue Router (`packages/web/src/router/index.js`, module routes in `packages/web/projects/vgpu/router.js`)
- Vuex (`packages/web/src/store`, with global state and localStorage persistence)
- i18n (`packages/web/src/locales/index.js`, `en.js` / `zh.js`)
- Axios (`packages/web/src/utils/request.js`, unified `code/msg/data` error handling)
- UI libraries:
  - TDesign (`packages/web/src/plugins/tdesign.js`, preferred)
  - Element Plus (`packages/web/src/plugins/element.js`)

### Directory conventions

1. **Common foundation layer** (`packages/web/src/`)
   - `layout/`: global layout (Sidebar / TopBar / AppMain)
   - `components/`: common components (BackHeader / BlockBox / Echarts-plus / Message / Confirm, etc.)
   - `hooks/`: common hooks (for example, `useFetchList`)
   - `utils/`: utility helpers (for example, `request.js` and calculation helpers)
   - `icons/` and `components/SvgIcon/`: SVG icon registration and rendering
2. **Business module layer** (`packages/web/projects/vgpu/`)
   - `router.js`: module routes
   - `views/`: page components (monitoring, nodes, cards, tasks, etc.)
   - `api/`: API wrappers (`apiPrefix = '/api/vgpu'`)
   - `hooks/`: business hooks
   - `components/`: business components (charts/dashboards, etc.)

### Routing and menu conventions

1. Route entry (`packages/web/src/router/index.js`)
   - Mount `vgpuRoutes` in `constantRoutes` with `Layout` as top-level layout
2. Module route (`packages/web/projects/vgpu/router.js`)
   - Root: `/admin/vgpu`
   - Child routes use dynamic imports
   - `meta.title` should be i18n keys (for example, `routes.resourceAdmin`, `routes.nodes`)
3. Menu generation (Sidebar)
   - Sidebar (`packages/web/src/layout/components/Sidebar/index.vue`) generates menu from current matched routes
   - `meta.title` is rendered with `$t(meta.title)`
4. Required when adding a route/menu item:
   - Add `meta.title` in routes
   - Add matching i18n keys in both `packages/web/src/locales/en.js` and `packages/web/src/locales/zh.js`

## Local development and build

### One-command startup

Run from repository root:

```bash
make start-dev
```

This starts:

- BFF (NestJS, port 3000)
- Vite dev server (port 8080)

## Coding conventions

### Code style (Prettier / ESLint)

Based on repository configuration:

- `singleQuote: true`
- `trailingComma: 'all'`
- ESLint style constraints include:
  - `semi: 'never'`
  - `quotes: ['single', ...]`

### Vue writing conventions

1. Prefer `script setup`
2. Do not hardcode Chinese/English strings in templates; use i18n keys
   - Template: `$t('xxx.yyy')`
   - JS/TS: `const { t } = useI18n(); t('xxx.yyy')`
3. Styles usually use `scoped` + `lang="scss"`; use `:deep(...)` when needed

### API wrapper conventions

Under `packages/web/projects/vgpu/api/`:

- Use:
  - `const apiPrefix = '/api/vgpu'`
  - Endpoints organized as `apiPrefix + '/v1/...'`
- Wrappers usually return:
  - `request({ url, method, data/params })` directly
  - or axios config objects, then call `request(config)` in components/hooks (for example, `getNodeListReq`, `getCardListReq`, `getTaskListReq`)

### Hooks and reuse

Prefer extracting reusable fetch/filter/pagination logic into hooks:

- Common hooks: `packages/web/src/hooks`
- VGPU business hooks: `packages/web/projects/vgpu/hooks`

## What this guide helps with

- Quickly understand how the project runs (BFF + Vite + API proxy)
- Clarify where to place code and how to connect routes/menus/i18n/API
- Reduce PR rework caused by inconsistent conventions

