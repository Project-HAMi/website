---
title: 如何贡献文档
translated: true
---

从1.3版本开始，社区文档将在HAMi网站上提供。本文件解释了如何向`Project-HAMi/website`仓库贡献文档。

## 前提条件

- 文档和代码一样，也按版本分类和存储。1.3是我们归档的第一个版本。
- 文档需要翻译成多种语言，以便来自不同地区的读者阅读。社区现在支持中文和英文。英文是文档的官方语言。
- 我们的文档使用Markdown。如果您不熟悉Markdown，请参阅https://guides.github.com/features/mastering-markdown/或https://www.markdownguide.org/以获取更详细的信息。
- 我们通过[Docusaurus 2](https://docusaurus.io/)获得了一些附加功能，这是一个现代静态网站生成器。

## 设置

您可以通过克隆我们的网站仓库来设置本地环境。

```shell
git clone https://github.com/Project-HAMi/website.git
cd website
```

我们的网站组织如下：

```
website
├── sidebars.json        # 当前文档版本的侧边栏
├── docs                 # 当前文档版本的文档目录
│   ├── foo
│   │   └── bar.md       # https://mysite.com/docs/next/foo/bar
│   └── hello.md         # https://mysite.com/docs/next/hello
├── versions.json        # 指示可用版本的文件
├── versioned_docs
│   ├── version-1.1.0
│   │   ├── foo
│   │   │   └── bar.md   # https://mysite.com/docs/foo/bar
│   │   └── hello.md
│   └── version-1.0.0
│       ├── foo
│       │   └── bar.md   # https://mysite.com/docs/1.0.0/foo/bar
│       └── hello.md
├── versioned_sidebars
│   ├── version-1.1.0-sidebars.json
│   └── version-1.0.0-sidebars.json
├── docusaurus.config.js
└── package.json
```

`versions.json`文件是一个版本列表，从最新到最早。下表解释了版本化文件如何映射到其版本和生成的URL。

| 路径                                    | 版本          | URL               |
| --------------------------------------- | -------------- | ----------------- |
| `versioned_docs/version-1.0.0/hello.md` | 1.0.0          | /docs/1.0.0/hello |
| `versioned_docs/version-1.1.0/hello.md` | 1.1.0 (最新)   | /docs/hello       |
| `docs/hello.md`                         | 当前           | /docs/next/hello  |

:::提示

`docs`目录中的文件属于`current`文档版本。

`current`文档版本标记为`Next`，托管在`/docs/next/*`下。

贡献者主要为当前版本贡献文档。
:::

## 撰写文档

### 在顶部开始一个标题

在Markdown文件的顶部指定有关文章的元数据是很重要的，这个部分称为**Front Matter**。

现在，让我们看一个快速示例，它应该解释**Front Matter**中最相关的条目：

```
---
title: 带有标签的文档
---

## 二级标题
```

在两行---之间的顶部部分是Front Matter部分。在这里，我们定义了一些条目，告诉Docusaurus如何处理文章：

- 标题相当于HTML文档中的`<h1>`或Markdown文章中的`# <title>`。
- 每个文档都有一个唯一的ID。默认情况下，文档ID是与根文档目录相关的文档名称（不带扩展名）。

### 链接到其他文档

您可以通过添加以下任何链接轻松路由到其他地方：

- 指向外部站点的绝对URL，如`https://github.com`或`https://k8s.io` - 您可以使用任何Markdown标记来实现这一点，因此
  - `<https://github.com>`或
  - `[kubernetes](https://k8s.io)`都可以。
- 链接到Markdown文件或生成的路径。您可以使用相对路径索引相应的文件。
- 链接到图片或其他资源。如果您的文章包含图片或其他资源，您可以在`/docs/resources`中创建相应的目录，并将文章相关文件放在该目录中。现在我们将关于HAMi的公共图片存储在`/docs/resources/general`中。您可以使用以下方式链接图片：
  - `![Git工作流](../resources/contributor/git_workflow.png)`

### 目录组织

Docusaurus 2使用侧边栏来管理文档。

创建侧边栏有助于：

- 组织多个相关文档
- 在每个文档上显示侧边栏
- 提供分页导航，带有下一页/上一页按钮

对于我们的文档，您可以从[https://github.com/Project-HAMi/website/blob/main/sidebars.js](https://github.com/Project-HAMi/website/blob/main/sidebars.js)了解我们的文档是如何组织的。

```js
module.exports = {
    docs: [
        {
            type: "category",
            label: "核心概念",
            collapsed: false,
            items: [
                "core-concepts/introduction",
                "core-concepts/concepts",
                "core-concepts/architecture",
            ],
        },
        {
            type: "doc",
            id: "key-features/features",
        },
        {
            type: "category",
            label: "入门",
            items: [
                "get-started/nginx-example"
            ],
        },
....
```

目录中文档的顺序严格按照项目的顺序。

```yaml
type: "category",
label: "核心概念",
collapsed: false,
items: [
  "core-concepts/introduction",
  "core-concepts/concepts",
  "core-concepts/architecture",
],
```

如果您添加了文档，您必须将其添加到`sidebars.js`中以使其正确显示。如果您不确定您的文档位于何处，可以在PR中询问社区成员。

### 关于中文文档

关于文档的中文版有两种情况：

- 您想将我们现有的英文文档翻译成中文。在这种情况下，您需要修改相应文件的内容，路径为[https://github.com/Project-HAMi/website/tree/main/i18n/zh/docusaurus-plugin-content-docs/current](https://github.com/Project-HAMi/website/tree/main/i18n/zh/docusaurus-plugin-content-docs/current)。该目录的组织与外层完全相同。`current.json`保存了文档目录的翻译。如果您想翻译目录名称，可以编辑它。
- 您想贡献没有英文版的中文文档。欢迎任何类型的文章。在这种情况下，您可以先将文章和标题添加到主目录。文章内容可以先标记为TBD。然后将相应的中文内容添加到中文目录中。

## 调试文档

现在您已经完成了文档。在您向`Project-HAMi/website`发起PR后，如果通过CI，您可以在网站上预览您的文档。

点击红色标记的**Details**，您将进入网站的预览视图。

点击**Next**，您可以看到相应的更改。如果您有与中文版相关的更改，请点击旁边的语言下拉框切换到中文。

如果预览页面不是您期望的，请再次检查您的文档。

## 常见问题

### 版本控制

对于每个版本的新补充文档，我们将在每个版本的发布日期同步到最新版本，旧版本的文档将不再修改。对于文档中发现的勘误，我们将在每次发布时修复。