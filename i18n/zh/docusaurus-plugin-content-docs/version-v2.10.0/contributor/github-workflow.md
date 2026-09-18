---
title: GitHub 工作流
sidebar_label: GitHub 工作流
translated: true
---

本指南涵盖为 HAMi 贡献代码的完整 Git 和 GitHub 工作流程，适用于 [HAMi 核心仓库](https://github.com/Project-HAMi/HAMi)和[文档网站](https://github.com/Project-HAMi/website)。

![Git 工作流](/img/docs/common/contributor/github-workflow/git-workflow.png)

## Fork 和克隆

在 GitHub 上 fork 目标仓库，然后把你的 fork 克隆到本地：

```bash
export user="your-github-username"

# HAMi 核心代码
git clone https://github.com/$user/HAMi.git
cd HAMi
git remote add upstream https://github.com/Project-HAMi/HAMi.git
git remote set-url --push upstream no_push

# 文档网站
git clone https://github.com/$user/website.git
cd website
git remote add upstream https://github.com/Project-HAMi/website.git
git remote set-url --push upstream no_push
```

检查你的远程仓库设置：

```bash
git remote -v
```

预期输出：

```text
origin    https://github.com/<your-username>/HAMi.git (fetch)
origin    https://github.com/<your-username>/HAMi.git (push)
upstream  https://github.com/Project-HAMi/HAMi.git (fetch)
upstream  no_push (push)
```

`no_push` 这个设置可以防止误推送到 upstream 仓库。

## 保持 master 同步

在开始任何新工作之前，让本地 master 与 upstream 保持同步：

```bash
git fetch upstream
git checkout master
git rebase upstream/master
```

用 `rebase`，不要用 `merge`。合并提交会让历史变得杂乱，也更难 cherry-pick 修复。

## 创建分支

从 master 上分出一个简短、能反映内容的分支名：

```bash
git checkout -b fix/gpu-memory-calculation
git checkout -b feat/kunlunxin-multi-card
git checkout -b docs/update-ascend-guide
```

完全在这个分支上工作，不要直接提交到 master。

## 保持你的分支同步

如果你工作期间 upstream master 有了新的提交：

```bash
git fetch upstream
git rebase upstream/master
```

解决冲突后继续：

```bash
git rebase --continue
```

## 提交

HAMi 使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范，且每个提交都需要 DCO 签名。

```bash
git commit -s -m "fix: correct memory calculation for MLU devices"
```

`-s` 参数会添加必需的 `Signed-off-by` 行，没有它 CI 会拦截 PR。

关于提交类型规范和消息格式规则，参见[贡献指南](contributing.md)。

## 推送

把分支推送到你的 fork：

```bash
git push origin fix/gpu-memory-calculation
```

如果之前推送过之后又做了 rebase，用 `--force-with-lease` 而不是 `--force`：

```bash
git push origin fix/gpu-memory-calculation --force-with-lease
```

`--force-with-lease` 会在别人在你上次 fetch 之后也推送过同一分支时拒绝推送，避免误覆盖别人的改动。

## 创建拉取请求

1. 打开你的 fork：`https://github.com/<your-username>/HAMi`
2. 点击你分支旁边的 **Compare & Pull Request**。
3. 把 base 仓库设为 `Project-HAMi/HAMi`，base 分支设为 `master`。
4. 填写 PR 描述：这个改动做了什么、为什么需要它、是如何测试的。
5. 关联相关 issue：`Fixes #123` 或 `Relates to #456`。

保持 PR 只做一件事。关于 PR 范围的建议，参见[贡献指南](contributing.md)。

## 压缩提交

PR 合并前先整理提交历史。把修修补补的提交、审查反馈产生的提交、错别字修正合并进它们所属的逻辑提交中。每个保留下来的提交都应代表一个有意义的工作单元。

交互式压缩提交：

```bash
# 3 替换成你要 rebase 的提交数量
git rebase -i HEAD~3
```

编辑器会打开一个提交列表：

```text
pick abc1234 fix: correct memory calculation for MLU devices
pick def5678 address review feedback
pick ghi9012 fix typo
```

把要合并到上一个提交里的那些改成 `squash`（或 `s`）：

```text
pick abc1234 fix: correct memory calculation for MLU devices
squash def5678 address review feedback
squash ghi9012 fix typo
```

保存关闭编辑器，Git 会打开另一个编辑器让你合并提交信息，写一条干净的消息并保存。

强制推送结果：

```bash
git push origin fix/gpu-memory-calculation --force-with-lease
```

## 处理审查反馈

在处理反馈时，把新提交推送到同一个分支，不要关闭 PR 再重新打开。

```bash
# 修改代码，然后：
git add <files>
git commit -s -m "fix: address review feedback on memory limit check"
git push origin fix/gpu-memory-calculation
```

在 PR 合并前，把这些提交压缩进相关的提交中。

## 撤销提交

要撤销一个已合并的提交，从 master 创建一个新分支，用 `git revert`：

```bash
git fetch upstream
git checkout master
git rebase upstream/master
git checkout -b revert/fix-gpu-memory-calculation

# 撤销单个提交
git revert <SHA>

# 撤销合并提交
git revert -m 1 <SHA>
```

推送分支，像平常一样开一个 PR。不要使用 GitHub UI 上的 **Revert** 按钮，它会在 upstream 仓库里创建分支，而不是在你的 fork 里。
