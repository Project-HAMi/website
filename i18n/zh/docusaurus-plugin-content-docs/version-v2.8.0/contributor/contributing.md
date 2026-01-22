---
title: 贡献指南
translated: true
---

欢迎来到 HAMi！

- [贡献](#contributing)
- [在您开始之前](#before-you-get-started)
  - [行为准则](#code-of-conduct)
  - [社区期望](#community-expectations)
- [入门](#getting-started)
- [您的第一次贡献](#your-first-contribution)
  - [找到要处理的内容](#find-something-to-work-on)
    - [找到一个好的入门主题](#find-a-good-first-topic)
      - [处理一个问题](#work-on-an-issue)
    - [提交一个问题](#file-an-issue)
- [贡献者工作流程](#contributor-workflow)
  - [创建拉取请求](#creating-pull-requests)
  - [代码审查](#code-review)

# 在您开始之前

## 行为准则

请务必阅读并遵守我们的[行为准则](https://github.com/cncf/foundation/blob/main/code-of-conduct.md)

## 社区期望

HAMi 是一个由社区驱动的项目，致力于促进一个健康、友好和富有成效的环境。

# 入门

- 在 GitHub 上 fork 这个仓库。
- 在您的 fork 仓库中进行更改。
- 提交一个 PR。

# 您的第一次贡献

我们将帮助您在不同领域进行贡献，如提交问题、开发功能、修复关键错误以及让您的工作得到审查和合并。

如果您对开发过程有疑问，请随时[提交一个问题](https://github.com/Project-HAMi/HAMi/issues/new/choose)。

## 找到要处理的内容

我们总是需要帮助，无论是修复文档、报告错误还是编写代码。
查看您认为没有遵循最佳编码实践的地方，需要代码重构或缺少测试的地方。
以下是您如何开始的步骤。

### 找到一个好的入门主题

在 HAMi 组织内有[多个仓库](https://github.com/Project-HAMi/)。
每个仓库都有适合初学者的问题，提供一个好的入门问题。
例如，[Project-HAMi/HAMi](https://github.com/Project-HAMi/HAMi) 有
[需要帮助](https://github.com/Project-HAMi/HAMi/issues?q=is%3Aopen+is%3Aissue+label%3A%22help+wanted%22)和
[好的入门问题](https://github.com/Project-HAMi/HAMi/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22)
标签的问题，这些问题不需要对系统有深入的了解。
我们可以帮助希望处理这些问题的新贡献者。

另一个好的贡献方式是找到文档改进的地方，比如缺失/损坏的链接。
请参阅下面的[贡献](#contributing)以了解工作流程。

#### 处理一个问题

当您愿意承担一个问题时，只需在问题上回复。维护者会将其分配给您。

### 提交一个问题

虽然我们鼓励每个人贡献代码，但也欢迎有人报告问题。
问题应在相应的 HAMi 子仓库下提交。

*示例：* HAMi 问题应提交到 [Project-HAMi/HAMi](https://github.com/Project-HAMi/HAMi/issues)。

请在提交问题时遵循提示的提交指南。

# 贡献者工作流程

请不要犹豫提出问题或发送拉取请求。

这是贡献者工作流程的大致概述：

- 创建一个主题分支作为贡献的基础。通常是 master。
- 进行逻辑单元的提交。
- 将更改推送到个人 fork 的仓库的主题分支。
- 提交一个拉取请求到 [Project-HAMi/HAMi](https://github.com/Project-HAMi/HAMi)。

## 创建拉取请求

拉取请求通常简称为 "PR"。
HAMi 通常遵循标准的[github 拉取请求](https://help.github.com/articles/about-pull-requests/)流程。
要提交建议的更改，请开发代码/修复并添加新的测试用例。
之后，在提交拉取请求之前运行这些本地验证，以预测持续集成的通过或失败。

* 运行并通过 `make verify`

## 代码审查

为了让您的 PR 更容易获得审查，请考虑审查者需要您：

* 遵循[良好的编码指南](https://github.com/golang/go/wiki/CodeReviewComments)。
* 撰写[良好的提交信息](https://chris.beams.io/posts/git-commit/)。
* 将大的更改分解为一系列逻辑的小补丁，这些补丁单独进行易于理解的更改，并在整体上解决更广泛的问题。