---
title: 如何贡献文档
translated: true
---

本指南涵盖为 HAMi 文档网站做贡献所需的一切，从搭建本地环境到撰写、预览、提交改动。

文档网站使用 [Docusaurus 3](https://docusaurus.io/) 构建，支持英文（主要语言）和简体中文。英文是所有内容的源语言。

## 前提条件

- Node.js v20（必需，其他版本不受支持）
- npm
- 带 GitHub 账号的 Git

检查你的 Node 版本：

```bash
node -v   # 应输出 v20.x.x
```

## 设置

在 GitHub 上 fork [Project-HAMi/website](https://github.com/Project-HAMi/website) 仓库，然后克隆你的 fork：

```bash
git clone https://github.com/<your-username>/website.git
cd website
git remote add upstream https://github.com/Project-HAMi/website.git
npm install
```

## 本地开发

```bash
npm run start          # 开发服务器，http://localhost:3000，支持热更新
npm run start:network  # 同上，但可在本地网络中访问
npm run build:fast     # 仅英文的生产构建，约 45 秒（用于验证）
npm run build          # 包含中文和所有版本的完整构建，约 80 秒（与 CI 一致）
npm run clear           # 清除 Docusaurus 缓存（遇到过期构建错误时使用）
```

写文档时用 `npm run start`。提交 PR 前用 `npm run build:fast` 验证。CI 会在每个提交到 `master` 的 PR 上运行完整的 `npm run build`。

## 仓库结构

```text
website/
├── docs/                          # 英文源文档（权威版本）
├── i18n/zh/
│   └── docusaurus-plugin-content-docs/
│       └── current/               # 中文翻译
├── versioned_docs/version-vX.Y.Z/ # 归档的文档快照
├── blog/                          # 博客文章
├── sidebars.js                    # 导航结构
├── docusaurus.config.js           # 站点配置
└── versions.json                  # 可用的版本快照列表
```

贡献者主要在 `docs/`（英文源文档）和 `i18n/zh/`（中文翻译）中工作。

## 新增文档

### 1. 创建文件

将文件放在 `docs/` 下合适的子目录中：

```text
docs/userguide/nvidia-device/new-feature.md
docs/get-started/new-guide.md
docs/contributor/new-policy.md
```

### 2. 添加 frontmatter

每个文档都必须以 frontmatter 开头：

```yaml
---
title: 完整页面标题
sidebar_label: 侧边栏短标题
---
```

- `title` 用作页面的 `<h1>` 标题，也用于元数据
- `sidebar_label` 是侧边栏显示的简短版本，如果和 `title` 相同可以省略

### 3. 在 sidebars.js 中注册

每个新文档都必须添加到 `sidebars.js` 中才会出现在导航里。找到合适的分类，添加文档 ID（相对于 `docs/` 的路径，不带 `.md`）：

```js
{
  type: "category",
  label: "Get Started",
  items: [
    "get-started/deploy-with-helm",
    "get-started/verify-hami",
    "get-started/your-new-doc"   // 在这里添加
  ]
}
```

如果不确定属于哪个分类，在 PR 中说明，维护者会帮忙。

### 4. 添加中文翻译（可选）

在 `i18n/zh/docusaurus-plugin-content-docs/current/` 下镜像相同的文件路径，目录结构与 `docs/` 完全一致。frontmatter 保持不变，只翻译正文内容。

如果翻译还没准备好，用占位符也可以：

```md
---
title: 完整页面标题
sidebar_label: 侧边栏短标题
---

（翻译进行中）
```

## 链接

**内部链接**：用相对路径链接到其他文档的 `.md` 文件：

```md
[GitHub Workflow](github-workflow.md) [Installation](../get-started/deploy-with-helm.md)
```

Docusaurus 会自动把这些解析为正确的 URL，包括版本和语言。

**外部链接**：使用完整 URL：

```md
[Kubernetes](https://kubernetes.io)
```

**失效链接**：完整构建（`npm run build`）会报告失效的内部链接，提交 PR 前先修复。

## 图片

图片放在 `/static/img/docs/` 下，按语言区分子目录：

| 路径                       | 用途             |
| -------------------------- | ---------------- |
| `/static/img/docs/common/` | 中英文共享的图片 |
| `/static/img/docs/en/`     | 仅英文的图片     |
| `/static/img/docs/zh/`     | 仅中文的图片     |

用相对于站点根目录的绝对路径引用图片：

```md
![Architecture diagram](/img/docs/common/architecture/hami-arch.png) ![WebUI Overview](/img/docs/en/userguide/webui-overview.png)
```

使用有意义的 alt 文本，不要链接外部图片，图片要托管在本仓库中。

## 写作风格

以下规则适用于本站的所有文档。

**语言和语气：**

- 句子简短、直接
- 使用主动语态
- 随意但专业，就像一个开发者向另一个开发者解释东西
- 不用填充词："simply"、"just"、"Note that"、"It's worth noting"、"Please note"
- 不用第一人称：避免 "I"、"we"、"our"、"let's"
- 例外：直接引用或 HAMi 项目团队的官方公告中，"we" 可以指代项目团队本身

**格式：**

- 无序列表用 `-`，不要用 `*` 或 `•`
- 用普通连字符（`-`），不要用 em-dash（`—`）
- 标题层级用 `##` 和 `###`，不要跳级
- 代码块要注明语言（` ```bash`、` ```yaml`、` ```go`）
- 文档正文中不使用表情符号

**避免营销式语言：**

- 不用："innovative"、"seamless"、"robust"、"powerful"、"cutting-edge"、"state-of-the-art"
- 不用："streamline"、"leverage"、"intuitive"、"comprehensive"
- 不用："In conclusion,"、"In summary,"、"To summarize,"

## 版本管理

HAMi 文档随每次发布进行版本管理：

| 位置                             | 版本                   | URL              |
| -------------------------------- | ---------------------- | ---------------- |
| `docs/`                          | 开发版/next（未发布）  | `/docs/next/*`   |
| `versioned_docs/version-v2.9.0/` | v2.9.0（最新稳定版本） | `/docs/*`        |
| `versioned_docs/version-v2.8.0/` | v2.8.0                 | `/docs/v2.8.0/*` |

> `docs/` 目录是**未发布的开发版**（托管在 `/docs/next`），**不是**"当前/最新稳定版本"。最新稳定版本是 `versions.json` 的第一项（目前是 v2.9.0），托管在 `/docs`。编辑 `docs/` 只影响下一个版本。

**为 `docs/` 贡献**适用于影响下一个版本的改动，大多数贡献者应该编辑这里。

对已发布版本文档的修复由维护者通过 cherry-pick 处理。如果你在某个版本化文档中发现错误，开一个 issue 或直接修复 `docs/` 中的对应内容，维护者会视需要回填到旧版本。

## 中文翻译流程

分两种情况：

**翻译已有的英文文档：**

1. 在 `i18n/zh/docusaurus-plugin-content-docs/current/` 下找到对应的文件路径。
2. 目录结构与 `docs/` 完全一致。
3. 翻译内容，frontmatter 字段保持和英文源一致。
4. 要翻译侧边栏分类标签，编辑 `i18n/zh/docusaurus-plugin-content-docs/current.json`。

**添加没有英文版本的中文文档：**

不建议这样做。英文是源语言，如果你想用中文贡献内容，先写英文版本（哪怕是草稿），再补充中文翻译。

## 预览改动

开发服务器默认只显示英文：

```bash
npm run start
```

要在本地预览中文翻译：

```bash
npm run start -- --locale zh
```

要同时预览两种语言，运行完整构建并启动本地服务：

```bash
npm run build
npm run serve
```

## CI 和 PR 预览

当你向 `master` 提交 PR 时，CI 会运行 `npm run build`（完整构建）。如果构建失败，PR 无法合并。

PR 还会自动收到一个预览部署链接。点击它，在请求审查前先看看改动在真实站点上的渲染效果，用它来检查链接、图片和格式是否正确。

## 更新日志

更新日志由仓库根目录的 `CHANGELOG.md` 通过一个自定义 Docusaurus 插件自动生成，不要直接编辑 `changelog/source/` 下的文件，它们每次构建都会被覆盖。

要更新日志，直接编辑 `CHANGELOG.md`。

## 常见问题

**构建报了一个失效链接错误。** 在本地运行 `npm run build` 查看具体的文件和行号，修复链接后重新构建。

**我的新页面没有出现在侧边栏里。** 检查 `sidebars.js` 中的文档 ID 是否和文件路径完全一致（相对于 `docs/`，不带 `.md` 扩展名）。

**开发服务器显示的是缓存的旧版本。** 停止服务器，运行 `npm run clear`，然后重新启动。

**如何为即将发布的功能撰写文档？** 把文档加到 `docs/`（不是 `versioned_docs/`），发布新版本时会自动生成快照到 `versioned_docs/` 中。
