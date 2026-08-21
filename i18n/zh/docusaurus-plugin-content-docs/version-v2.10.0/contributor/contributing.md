---
title: 贡献 HAMi
translated: true
---

HAMi 是一个 CNCF Sandbox 项目，为 Kubernetes 带来 GPU 和 AI 加速器虚拟化能力。调度器、device plugin、文档和工具链都由社区贡献者共同构建和维护。

无论你是修复一个错别字，还是实现一个全新的硬件后端，本指南都是你开始贡献的起点。

## 核心原则

**你必须理解自己提交的每一处改动。**

使用工具辅助编写代码或文档是可以的，但提交一个你无法解释的改动是不可以的。如果审阅者询问某段代码为什么这样写而你答不上来，这个 PR 就不会被合并。无论改动是如何产生的，这条原则适用于所有贡献。

在 HAMi 中，这一点比大多数项目更重要。管理 GPU 显存、设备调度或加速器生命周期的代码如果出错，可能导致数据损坏、硬件故障或静默的资源错误分配。"看起来是对的"是不够的。

## 行为准则

所有社区成员都必须遵守 [CNCF 行为准则](https://github.com/cncf/foundation/blob/main/code-of-conduct.md)。违规行为请通过 `cncf-coc@lists.cncf.io` 报告给 CNCF 行为准则委员会。

## 贡献方式

写代码并不是贡献的唯一方式。

| 贡献类型   | 具体内容                                     |
| ---------- | -------------------------------------------- |
| 缺陷报告   | 提交带有复现步骤和环境信息的详细 issue       |
| 缺陷修复   | 提交带有覆盖该修复的测试用例的 PR            |
| 新功能     | 先开 issue 对齐方案，再提交 PR               |
| 文档       | 修正错误、补齐缺失内容、增加示例、提升可读性 |
| 博客文章   | 分享 HAMi 的使用场景、集成方案或版本亮点     |
| 翻译       | 将英文文档翻译为中文，或维护现有的中文翻译   |
| 代码审查   | 阅读开放的 PR 并给出技术反馈                 |
| Issue 分类 | 复现缺陷、追问缺失信息、关闭过期 issue       |
| 社区支持   | 在 Slack 或 GitHub Discussions 中回答问题    |

## 社区

| 渠道 | 用途 |
| --- | --- |
| [GitHub Issues](https://github.com/Project-HAMi/HAMi/issues) | 缺陷报告和功能请求 |
| [GitHub Discussions](https://github.com/Project-HAMi/HAMi/discussions) | 提问、想法、设计方案 |
| [Discord](https://discord.gg/Amhy7XmbNq) | 实时聊天（推荐） |
| [CNCF Slack #hami-dev](https://cloud-native.slack.com/archives/C07T10BU4R2) | 实时聊天 |
| [MAINTAINERS](https://github.com/Project-HAMi/HAMi/blob/master/MAINTAINERS.md) | 当前维护者列表 |
| [社区会议](https://docs.google.com/document/d/1YC6hco03_oXbF9IOUPJ29VWEddmITIKIfSmBX8JtGBw/edit#heading=h.g61sgp7w0d0c) | 双周 Zoom 会议，周三 16:30 UTC+8。[iCal 订阅](https://webcal.prod.itx.linuxfoundation.org/lfx/lfmd9wcrbnW1NXUzPl) |
| [Zoom 会议链接](https://zoom-lfx.platform.linuxfoundation.org/meeting/95994137931?password=55b961b5-3e8e-4040-8657-0f2d26511f1d) | 加入双周社区会议 |

在提交 issue 或 PR 之前，请先搜索已有的 issue 和讨论，确认是否已有相关工作。

**刚接触 HAMi？** 加入 [Discord](https://discord.gg/Amhy7XmbNq) 或 [CNCF Slack #hami-dev](https://cloud-native.slack.com/archives/C07T10BU4R2) 并自我介绍一下。维护者和现有贡献者都乐意在你提交 PR 之前帮你找一个合适的入门 issue、审阅草稿或回答问题。

## 前提条件

**所有贡献都需要：**

- 一个带 Git 的 GitHub 账号
- 能够根据[开发者原创声明（DCO）](https://developercertificate.org/)对贡献进行认证

**贡献 HAMi 核心代码（Go）需要：**

- Go 1.26+
- `kubectl`，以及一个带受支持 GPU 或加速器的 Kubernetes 集群

**贡献文档（网站）需要：**

- Node.js v20
- npm

## 环境搭建

### Fork 和克隆

在 GitHub 上 fork 目标仓库，然后克隆你的 fork：

```bash
export user="your-github-username"

# 贡献 HAMi 核心代码
git clone https://github.com/$user/HAMi.git
cd HAMi
git remote add upstream https://github.com/Project-HAMi/HAMi.git
git remote set-url --push upstream no_push   # 防止误推送到 upstream

# 贡献文档网站
git clone https://github.com/$user/website.git
cd website
git remote add upstream https://github.com/Project-HAMi/website.git
npm install
```

### 保持同步

在开始新工作之前，让本地 master 分支与 upstream 保持同步：

```bash
git fetch upstream
git checkout master
git rebase upstream/master
```

使用 `rebase` 而不是 `merge`，以保持干净的提交历史。

关于完整 Git 工作流程的详细说明，参见 [GitHub 工作流程指南](github-workflow.md)。

## 寻找可以处理的工作

好的起点：

- [`good first issue`](https://github.com/Project-HAMi/HAMi/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22) - 范围明确、文档齐全，对新贡献者友好
- [`help wanted`](https://github.com/Project-HAMi/HAMi/issues?q=is%3Aopen+is%3Aissue+label%3A%22help+wanted%22) - 欢迎贡献，可能需要一些领域知识
- [网站仓库](https://github.com/Project-HAMi/website/issues)中的文档缺口和失效链接

当你决定处理某个 issue 时，请在上面留言。维护者会将其分配给你，以避免重复劳动。

## 贡献者工作流程

### 分支命名

使用简短、能反映改动内容的分支名：

```bash
git checkout -b fix/gpu-memory-calculation
git checkout -b feat/kunlunxin-multi-card
git checkout -b docs/update-ascend-guide
```

### 小改动与大改动

**任何新增或改动超过 100 行代码或文档的 PR，都需要先有一个 GitHub issue 或讨论。** 先开 issue，说明你想做什么、为什么要做，等待维护者反馈后再开始写代码，之后才提交 PR。

**小改动**（缺陷修复、错别字修正、100 行以内的文档改进）：可以直接提交 PR，无需先开 issue。

**大改动**（新功能、API 变更、新硬件后端、跨多个包的重构、超过 100 行的文档新增）：

1. 开一个 GitHub issue，描述问题和你提议的方案。
2. 在投入大量时间之前，先获得维护者的认可。
3. 一旦方向明确，尽早开一个草稿 PR，在实现完成前就分享进展。

对于大改动，如果 PR 在没有先开 issue 的情况下提交，会被要求回去先开一个 issue。

### 推送前先验证

Go 代码：

```bash
make verify
make test
```

文档：

```bash
npm run build:fast   # 仅英文，约 45 秒，开发过程中使用
npm run build        # 全量构建，包含所有语言，约 80 秒，与 CI 一致
```

## 代码风格

### Go

- 提交前用 `gofmt` 格式化所有代码，未格式化的代码会导致 CI 失败。
- 遵循 [Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments) 中的风格约定。
- 在合适的地方编写表驱动测试，测试名称应描述场景，而不是函数本身。
- 保持函数短小、专注。如果一个函数需要很长的注释才能说明它在做什么，考虑拆分它。
- 错误信息应为小写，且不以标点结尾（Go 惯例）。

### 文档

参见[文档贡献指南](contribute-docs.md#写作风格)中的写作风格一节。

## 提交规范

### 格式

HAMi 使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```plaintext
<type>(<optional scope>): <description>

[optional body]

[optional footer(s)]
```

**类型：**

| 类型       | 用于                           |
| ---------- | ------------------------------ |
| `feat`     | 新功能                         |
| `fix`      | 缺陷修复                       |
| `docs`     | 仅文档改动                     |
| `chore`    | 维护性工作：依赖、构建配置、CI |
| `refactor` | 不改变行为的代码重构           |
| `test`     | 新增或更新测试                 |
| `perf`     | 性能改进                       |

**好的示例：**

```plaintext
feat(scheduler): add memory oversell ratio config option
fix(deviceplugin): handle graceful shutdown on SIGTERM
docs: correct vGPU memory limit example in Huawei Ascend guide
chore: bump Go to 1.22
test: add unit tests for MLU device discovery
```

**规则：**

- 标题行不超过 72 个字符
- 使用祈使语气："add"、"fix"、"update"，而不是 "added"、"fixed"、"updates"
- 正文说明 _做了什么_ 和 _为什么_，而不是 _怎么做的_
- 标题行末尾不加句号

### DCO 签名（必需）

每个提交都必须包含 `Signed-off-by` 行，缺少它 CI 会拦截 PR。

```bash
git commit -s -m "fix: correct memory calculation for MLU"
```

`-s` 参数会追加：

```plaintext
Signed-off-by: Your Name <your@email.com>
```

这表明你有权在项目许可下提交这份工作。完整文本参见[开发者原创声明（DCO）](https://developercertificate.org/)。

**忘记签名了？** 推送前修复它：

```bash
# 单个提交
git commit --amend -s --no-edit

# 分支上有多个提交
git rebase HEAD~<n> --signoff
```

## Pull Request

### 提交前检查

- [ ] 每个提交都有 `Signed-off-by` 行
- [ ] 提交信息符合 Conventional Commits 格式
- [ ] 如果这个 PR 改动超过 100 行，已经先开了 GitHub issue 并在下方关联
- [ ] 本地检查已通过（Go 用 `make verify`，文档用 `npm run build:fast`）
- [ ] 代码改动已添加或更新测试
- [ ] 如果用户可见行为有变化，文档已同步更新
- [ ] PR 描述中关联了相关 issue

### PR 描述

保持简短、客观：

- 这个改动做了什么？
- 为什么需要它？
- 是如何测试的？
- 关联相关 issue：`Fixes #123` 或 `Relates to #456`

**PR 描述、issue 正文和提交信息的格式规则：**

- 不使用 em-dash（`—`），用普通连字符（`-`）代替
- 不使用表情符号
- 不使用套话（"This PR aims to..."、"In this PR, we..."）
- 不使用营销式语言（"seamless"、"robust"、"powerful"、"innovative"）
- 用自己的话写，句子要简短、直接

### 保持 PR 聚焦

一个 PR 只做一件事。庞大、不聚焦的 PR 审查耗时更长，出问题时也更难回退。如果你在修复多个互相独立的问题，请拆成多个 PR。

### 压缩提交

合并前请整理你的提交历史。将修修补补的提交、审查反馈产生的提交、错别字修正合并进相关的逻辑提交中。每个保留下来的提交都应代表一个能独立编译并通过测试的、有意义的工作单元。

关于压缩提交的详细步骤，参见 [GitHub 工作流程指南](github-workflow.md#压缩提交)。

### 审查流程

1. PR 提交后，会分配一名维护者或审阅者。
2. 处理所有审查意见。如果你不认同某条反馈，在讨论区说明原因。
3. 通过推送到同一分支来更新 PR，不要关闭后重新打开。
4. 合并前 CI 必须通过。
5. 一旦审批者将 PR 标记为已批准，它就会被合并。

## 代码审查

审查他人的 PR 时：

- 指出具体行号并说明问题所在，不要只是笼统地标记"有问题"。
- 区分阻塞性问题和可选建议，对不影响合并的风格类小建议使用 `nit:` 前缀。
- 认可做得好的地方，只列问题的审查意见更难被采纳。
- 如果发现的是小问题（错别字、格式），使用 GitHub suggestion 功能，方便作者一键应用。
- 审查是协作性的，请假定对方是善意的。

## AI 使用规范

可以使用 AI 工具辅助编写代码、文档或提交信息，但有一条硬性规则：

**不要把 AI 生成的文本直接作为 PR 描述、issue 正文或提交信息提交。**

维护者需要和贡献改动的人沟通，而不是和一个语言模型沟通。即使 AI 帮你起草了初稿，也要用自己的话重新表达。明显是 AI 生成的文本（冗长的总结、过多的列表、套话、"综上所述"这类结尾）会被指出，并要求作者重写。

可以接受的做法：

- 用 AI 帮助理解不熟悉的代码
- 用 AI 起草提交信息，然后自己修改并对内容负责
- 用 AI 检查语法或表达是否清晰
- 用 AI 生成代码，但你要审查、测试并理解它

不可接受的做法：

- 未经阅读和改写就粘贴 AI 生成的 PR 描述
- 提交你在审查时无法解释的代码
- 将 AI 生成的文本用作 issue 评论或讨论帖

如果 AI 在改动中发挥了超出自动补全的重要作用，请在 PR 描述中简要说明，这有助于审阅者判断该投入多深的审查力度。

## 文档贡献

文档存放在 [Project-HAMi/website](https://github.com/Project-HAMi/website) 仓库中，使用 Docusaurus 3 构建。

关于 frontmatter、侧边栏注册、图片路径、本地预览和中文翻译流程的完整指南，参见[如何贡献文档](contribute-docs.md)。

**基本规则：**

- 英文是源语言，所有新文档都先添加到 `docs/`。
- 中文翻译放在 `i18n/zh/docusaurus-plugin-content-docs/current/` 下。
- 每个新文档都必须在 `sidebars.js` 中注册。
- 提交 PR 前运行 `npm run build:fast` 进行验证。

## 硬件厂商贡献

HAMi 支持多个 GPU 和加速器厂商。如果你要新增某个设备的支持，或修复厂商相关的行为：

- 遵循 `pkg/device/` 下已有的目录结构（每个厂商一个目录）。
- 尽可能在真实硬件上测试。CI 可以接受模拟测试，但新后端合并前需要有硬件验证。
- 遵循 `docs/userguide/<vendor>-device/` 下已有的文档模式。
- 在 `docs/userguide/<vendor>-device/examples/` 下提供可运行的 YAML 示例。

已支持的厂商：NVIDIA、寒武纪（MLU）、海光（DCU）、Mthreads、天数智芯、燧原（GCU）、AWS Neuron、昆仑芯（XPU）、沐曦、华为昇腾。

## 翻译

HAMi 网站支持两种语言：**英文**（主要语言）和**简体中文**，目前不支持其他语言。

英文是权威源语言，所有新文档都先用英文撰写，中文翻译存放在 `i18n/zh/` 下。

新增或更新翻译的步骤：

1. 在 `i18n/zh/docusaurus-plugin-content-docs/current/` 下找到对应文件。
2. 翻译内容，保持 frontmatter 和文档结构与英文源一致。
3. 提交一个只包含翻译改动的 PR，不要把翻译和内容改动混在同一个 PR 里。

如果某个英文页面还没有对应的中文版本，你可以新建一个。如果你想先注册这个页面再补全翻译，正文中放一个占位符（`TBD`）是可以的。

## 贡献者角色

HAMi 使用一套明确的贡献者阶梯，责任和权限逐级递增：

- **社区参与者** - 遵守行为准则，参与讨论
- **贡献者** - 提交 PR 和 issue，帮助其他用户
- **组织成员** - 资深贡献者，至少有 5 个被接受的 PR，已启用 2FA，且有两位推荐人
- **审阅者** - 负责审查某个特定领域的 PR，有至少 10 次审查记录
- **维护者** - 对整个项目负责，批准并合并 PR

完整的角色要求、晋升路径，以及如何自荐或推荐他人，参见[贡献者阶梯](ladder.md)。

## 提交 Issue

缺陷和功能请求请使用 [HAMi issue 跟踪器](https://github.com/Project-HAMi/HAMi/issues)。提交前请：

- 搜索是否已有涵盖同一问题的 issue。
- 如果是安全漏洞，请遵循[安全策略](https://github.com/Project-HAMi/HAMi/blob/master/SECURITY.md)，而不是公开提交 issue。

网站相关问题请使用[网站 issue 跟踪器](https://github.com/Project-HAMi/website/issues)。

提交缺陷报告时，请包含：

- HAMi 版本和安装方式
- Kubernetes 版本和集群配置
- GPU 或加速器型号及驱动版本
- 复现步骤
- 实际行为与预期行为
- 相关日志或错误输出

## 许可证

通过为 HAMi 贡献代码，你同意你的贡献将在 [Apache License 2.0](https://github.com/Project-HAMi/HAMi/blob/master/LICENSE) 下授权。
