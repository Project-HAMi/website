---
title: 如何 cherry-pick PRs
translated: true
---

本文档解释了如何在 `Project-HAMi/HAMi` 仓库的发布分支上管理 cherry pick。一个常见的用例是将 PR 从 master 分支回移到发布分支。

## 先决条件

- 一个已合并到 `master` 分支的拉取请求。
- 发布分支已存在（例如：[`release-2.4`](https://github.com/Project-HAMi/HAMi/releases)）
- 正常配置的 git 和 GitHub shell 环境，用于推送到 GitHub 上的 HAMi `origin` fork，并对配置的远程 `upstream` 提交拉取请求，该 `upstream` 跟踪 `https://github.com/Project-HAMi/HAMi`，包括 `GITHUB_USER`。
- 按照[安装说明](https://github.com/cli/cli#installation)安装 GitHub CLI (`gh`)。
- 一个具有 "repo" 和 "read:org" 权限的 GitHub 个人访问令牌。权限是为 [gh auth login](https://cli.github.com/manual/gh_auth_login) 所需，与 cherry-pick 创建过程无关（创建分支和发起 PR）。

## 哪些 PR 适合进行 Cherry Pick

与正常的 master 分支的合并量相比，发布分支的 PR 数量要少一个或两个数量级。这是因为发布分支的审查更为严格。重点在于关键的错误修复，例如：

- 数据丢失
- 内存损坏
- 崩溃、挂起
- 安全问题

仅影响 alpha 功能的功能性问题的错误修复（不是数据丢失或安全问题）不符合关键错误修复的标准。

如果您提议进行 cherry pick，但它不是一个明显的关键错误修复，请重新考虑。如果在反思后您仍希望继续，请通过补充您的 PR 来加强您的理由，例如：

- 详细描述问题的 GitHub issue

- 变更的范围

- 添加变更的风险

- 相关回归的风险

- 执行的测试，添加的测试用例

- 关键利益相关者的审阅者/批准者对变更为必要的回移的信心的证明

确保我们的整个社区积极参与项目的增强是至关重要的。如果某个已发布的功能未在特定提供商的平台上启用，这是一个需要在 `master` 分支中解决的社区失误，以便后续发布。这样的启用不会被回移到补丁发布分支。

## 发起 Cherry Pick

- 运行 [cherry pick 脚本][cherry-pick-script]

  此示例将 master 分支的 PR #1206 应用于远程分支 `upstream/release-1.0`：

  ```shell
  hack/cherry_pick_pull.sh upstream/release-1.0 1206
  ```

  - 请注意，cherry pick 脚本假定您有一个名为 `upstream` 的 git 远程指向 HAMi GitHub 组织。

  - 您需要为每个想要进行 cherry pick 的补丁发布单独运行 cherry pick 脚本。cherry pick 应应用于所有适用修复的活动发布分支。

  - 如果未设置 `GITHUB_TOKEN`，您将被要求输入 GitHub 密码：提供 GitHub [个人访问令牌](https://github.com/settings/tokens) 而不是实际的 GitHub 密码。如果您可以安全地将环境变量 `GITHUB_TOKEN` 设置为您的个人访问令牌，则可以避免交互式提示。参考 [https://github.com/github/hub/issues/2655#issuecomment-735836048](https://github.com/github/hub/issues/2655#issuecomment-735836048)

## Cherry Pick 审核

与其他 PR 一样，代码 OWNERS 会根据需要对 cherry pick PR 进行审核 (`/lgtm`) 和批准 (`/approve`)。

与正常的拉取请求相同，发布说明要求适用，除了发布说明部分将自动从发起 cherry pick 的 master 分支拉取请求中填充。

## Cherry Pick 故障排除

贡献者在发起 cherry pick 时可能会遇到以下一些困难。

- cherry pick PR 无法干净地应用于旧的发布分支。在这种情况下，您需要手动修复冲突。

- cherry pick PR 包含无法通过 CI 测试的代码。在这种情况下，您需要从您的 fork 中获取自动生成的分支，修改有问题的提交并强制推送到自动生成的分支。或者，您可以创建一个新的 PR，这样会更繁琐。

## 不支持版本的 Cherry Pick

社区支持和补丁的版本需要讨论。

[cherry-pick-script]: https://github.com/Project-HAMi/HAMi/blob/master/hack/cherry_pick_pull.sh
