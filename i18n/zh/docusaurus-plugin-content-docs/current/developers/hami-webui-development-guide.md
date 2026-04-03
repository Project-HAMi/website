---
title: HAMi WebUI 开发者指南
linktitle: HAMi WebUI
translated: true
---

## 项目定位

[HAMi WebUI](https://github.com/Project-HAMi/HAMi-WebUI) 是 HAMi 的 Web 可视化与运维界面，主要用于对节点、GPU 资源与任务（Workloads）进行监控、查看与管理展示。

项目采用前后端分离：浏览器前端负责页面与交互，后端 BFF 负责静态资源托管与 API 透传。

## 总体架构与运行流程

### 系统架构图

该图展示了 HAMi WebUI 的整体架构，包括前端界面、后端服务及底层集群资源。系统通过对 GPU 使用数据的采集与处理，实现对资源状态的统一展示与可视化分析。

<div align="center">

![HAMi WebUI 系统架构图](/img/docs/common/developers/hami-webui-archticture-diagram.svg)

</div>

### 仓库结构

HAMi WebUI 仓库结构说明，介绍项目各模块的职责划分及前后端协作方式，包括 BFF 层、前端应用与后端服务的整体组织结构。

- 根目录（Node/NestJS）：BFF 层，负责
  - 托管 `public/` 下的静态资源
  - 统一将 `/api*` 请求透传到后端服务
  - 开发环境下将前端页面请求转发到 Vite 开发服务器
- `packages/web`（前端）：Vue3 + Vite
  - 页面/组件/路由组织
  - 通过 Axios 调用 `/api/vgpu/*`（由 BFF 代理转发到后端）
- `server`：Go 侧服务

### 运行端口

本地开发环境运行端口说明，列出了 HAMi WebUI 各模块在开发模式下的访问地址，包括 BFF 服务、前端开发服务器以及后端业务服务。

- BFF：`http://localhost:3000/`
- 前端开发服务器（Vite）：`http://localhost:8080/`
- 后端业务服务（被 BFF 代理）：`http://127.0.0.1:8000`

### 请求与静态资源

请求转发与静态资源处理机制说明，介绍前端构建产物的输出位置、BFF 的静态资源托管方式，以及前端请求通过代理转发至后端服务的流程。

- 前端构建产物会输出到根目录 `public/`（Vite 配置 `outDir: '../../public'`，assets 目录为 `public/static`）
- BFF 静态资源托管：`src/main.ts` 中 `app.useStaticAssets(join(__dirname, '..', 'public'))`
- API 透传：
  - 前端请求一般以 `/api/vgpu/...` 为入口
  - BFF 使用 `ApiProxyMiddleware` 将请求代理到后端业务服务（开发/生产 proxy 配置均为 `target: http://127.0.0.1:8000`，并做 `^/api/vgpu -> ''` 的路径重写）

## 前端技术栈与模块组织

### 栈

前端技术栈说明，介绍 HAMi WebUI 在前端开发中所使用的核心框架与工具，包括状态管理、路由、国际化及请求处理等基础能力。

- Vue 3：组合式 API + script setup
- Vue Router：路由配置在 `packages/web/src/router/index.js` + 模块路由在 `packages/web/projects/vgpu/router.js`
- Vuex：`packages/web/src/store`（包含布局/全局状态与 localStorage 持久化）
- i18n：`packages/web/src/locales/index.js`（`en.js`/`zh.js`）
- Axios：`packages/web/src/utils/request.js`（统一处理后端返回 `code/msg/data` 的错误逻辑）
- UI 框架：
  - TDesign：`packages/web/src/plugins/tdesign.js`（优先使用）
  - Element Plus：`packages/web/src/plugins/element.js`

### 目录组织

前端目录组织规范说明，定义了通用基础层与业务模块层的代码划分方式，帮助统一项目结构并提升代码可维护性与扩展性。

1. 通用基础层（`packages/web/src/`）
   - `layout/`：全局布局（Sidebar / TopBar / AppMain）
   - `components/`：通用组件（例如 BackHeader / BlockBox / Echarts-plus / Message / Confirm 等）
   - `hooks/`：通用 hooks（例如 `useFetchList`）
   - `utils/`：通用工具函数（例如 `request.js`、各种计算函数）
   - `icons/` 与 `components/SvgIcon/`：SVG 图标注册与渲染
2. 业务模块层（`packages/web/projects/vgpu/`）
   - `router.js`：vgpu 模块路由（管理页面的入口与子路由）
   - `views/`：页面组件（监控、节点、卡片、任务等）
   - `api/`：该模块的 API 封装（统一 `apiPrefix = '/api/vgpu'`）
   - `hooks/`：该模块的业务 hooks
   - `components/`：该模块的业务组件（图表/仪表盘等）

### 路由与菜单约定

路由与菜单生成约定说明，介绍 HAMi WebUI 中路由配置与侧边栏菜单的关联机制，包括模块路由挂载方式、动态加载规则以及基于 i18n 的菜单标题渲染规范。

1. 路由入口（`packages/web/src/router/index.js`）
   - 在 `constantRoutes` 中挂载 `vgpuRoutes`，并使用 `Layout` 作为顶层布局组件
2. 模块路由（`packages/web/projects/vgpu/router.js`）
   - vgpu 模块根路径：`/admin/vgpu`
   - 子路由通过动态 import 引入视图组件
   - `meta.title` 需要填写 i18n key（例如 `routes.resourceAdmin`、`routes.nodes`）
3. 菜单生成机制（Sidebar）
   - 侧边栏（`packages/web/src/layout/components/Sidebar/index.vue`）会根据当前匹配路由的 meta 信息自动生成菜单
   - `meta.title` 会通过 `$t(meta.title)` 进行国际化渲染
4. 约定要求：
   - 新增路由或菜单项时，必须同时：
     1. 在路由中提供 `meta.title`
     2. 在 `packages/web/src/locales/en.js` 与 `packages/web/src/locales/zh.js` 中补齐对应的 i18n key

## 本地开发与构建

### 一键启动

HAMi WebUI 本地开发一键启动指南，支持在开发环境下通过单条命令快速启动 HAMi WebUI 所需的前端与 BFF 服务，便于本地调试与联调开发。

在仓库根目录执行：

```bash
make start-dev
```

会同时启动：

- BFF（NestJS，端口 3000）
- 前端开发服务器（Vite，端口 8080）

## 编码规范

### 代码风格（Prettier / ESLint）

代码风格与规范说明，基于 Prettier 与 ESLint 对项目中的代码格式与语法风格进行统一约束，以提升代码一致性与可维护性。

从仓库配置可见的约定：

- 单引号：`singleQuote: true`
- 末尾逗号：`trailingComma: 'all'`
- ESLint（根的 TypeScript 规则）中对语法风格有约束，例如：
  - `semi: 'never'`（不使用分号）
  - `quotes: ['single', ...]`

### Vue 编写方式

Vue 组件编写规范，统一组件开发方式与国际化、样式处理约定，以提升代码一致性与可维护性。

1. 组件优先使用 `script setup`
2. 禁止在模板中直接写中文/英文字符串，必须通过 i18n key 管理
   - 模板：`$t('xxx.yyy')`
   - JS/TS：`const { t } = useI18n(); t('xxx.yyy')`
3. 组件样式通常使用 `scoped` + `lang="scss"`，需要穿透子组件时使用 `:deep(...)`

### API 封装规范

API 封装规范，统一前端接口调用方式与路径组织结构，提升接口管理的可维护性与一致性。

在 `packages/web/projects/vgpu/api/` 下新增或修改 API：

- 统一使用：
  - `const apiPrefix = '/api/vgpu'`
  - 所有请求以 `apiPrefix + '/v1/...'` 组织
- 封装类通常返回两种形态：
  - `return request({ url, method, data/params })`：直接返回请求结果（Promise）
  - 或返回 axios config 对象，再由组件/Hook 调用 `request(config)`（见 `getNodeListReq` / `getCardListReq` / `getTaskListReq` 等用法）

### Hooks 与复用

Hooks 与逻辑复用规范，统一可复用逻辑的抽离方式，提升代码复用性与可维护性。

优先把可复用的取数/筛选/分页逻辑放进 hooks：

- 通用 hooks：`packages/web/src/hooks`
- vgpu 业务 hooks：`packages/web/projects/vgpu/hooks`

## 这份指南能帮你什么

本指南用于帮助开发者快速理解 HAMi WebUI 的项目结构与开发约定，提升开发效率并减少协作成本。

- 快速了解项目运行方式（BFF + Vite + API 代理）
- 明确前端的「放哪里、怎么写、怎么接路由/菜单/文案/接口」
- 减少因约定不一致造成的 PR 返工
