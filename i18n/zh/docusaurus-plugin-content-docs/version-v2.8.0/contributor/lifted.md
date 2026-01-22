---
title: 如何管理提升的代码
translated: true
---

本文档解释了如何管理提升的代码。此任务的一个常见用户案例是开发人员从其他代码库中提升代码到 `pkg/util/lifted` 目录。

- [提升代码的步骤](#steps-of-lifting-code)
- [如何编写提升注释](#how-to-write-lifted-comments)
- [示例](#examples)

## 提升代码的步骤

- 从另一个代码库中复制代码并将其保存到 `pkg/util/lifted` 下的一个 go 文件中。
- 可选择性地更改提升的代码。
- 为代码添加提升注释 [如指导](#how-to-write-lifted-comments)。
- 运行 `hack/update-lifted.sh` 来更新提升文档 `pkg/util/lifted/doc.go`。

## 如何编写提升注释

提升注释应放置在提升代码之前（可以是函数、类型、变量或常量）。
在提升注释和提升代码之间只允许有空行和注释。

提升注释由一行或多行注释组成，每行格式为 `+lifted:KEY[=VALUE]`。对于某些键，值是可选的。

有效的键如下：

- source:

  键 `source` 是必需的。其值指示代码从何处提升。

- changed:

  键 `changed` 是可选的。它指示代码是否已更改。
  值是可选的（`true` 或 `false`，默认为 `true`）。
  不添加此键或将其设置为 `false` 表示没有代码更改。

## 示例

### 提升函数

将函数 `IsQuotaHugePageResourceName` 提升到 `corehelpers.go`：

```go
// +lifted:source=https://github.com/kubernetes/kubernetes/blob/release-1.23/pkg/apis/core/helper/helpers.go#L57-L61

// IsQuotaHugePageResourceName 返回 true 如果资源名称具有与配额相关的大页资源前缀。
func IsQuotaHugePageResourceName(name corev1.ResourceName) bool {
	return strings.HasPrefix(string(name), corev1.ResourceHugePagesPrefix) || strings.HasPrefix(string(name), corev1.ResourceRequestsHugePagesPrefix)
}
```

在 `doc.go` 中添加：

```markdown
| 提升文件 | 源文件 | 常量/变量/类型/函数 | 更改 |
| ----------- | ----------- | ------------------- | ------- |
| corehelpers.go | https://github.com/kubernetes/kubernetes/blob/release-1.23/pkg/apis/core/helper/helpers.go#L57-L61 | func IsQuotaHugePageResourceName | N |
```

### 更改提升函数

提升并更改函数 `GetNewReplicaSet` 到 `deployment.go`

```go
// +lifted:source=https://github.com/kubernetes/kubernetes/blob/release-1.22/pkg/controller/deployment/util/deployment_util.go#L536-L544
// +lifted:changed

// GetNewReplicaSet 返回与给定部署意图匹配的副本集；从客户端接口获取 ReplicaSetList。
// 如果新的副本集尚不存在，则返回 nil。
func GetNewReplicaSet(deployment *appsv1.Deployment, f ReplicaSetListFunc) (*appsv1.ReplicaSet, error) {
	rsList, err := ListReplicaSetsByDeployment(deployment, f)
	if err != nil {
		return nil, err
	}
	return FindNewReplicaSet(deployment, rsList), nil
}
```

在 `doc.go` 中添加：

```markdown
| 提升文件 | 源文件 | 常量/变量/类型/函数 | 更改 |
| ----------- | ----------- | ------------------- | ------- |
| deployment.go | https://github.com/kubernetes/kubernetes/blob/release-1.22/pkg/controller/deployment/util/deployment_util.go#L536-L544 | func GetNewReplicaSet | Y |
```

### 提升常量

将常量 `isNegativeErrorMsg` 提升到 `corevalidation.go `：

```go
// +lifted:source=https://github.com/kubernetes/kubernetes/blob/release-1.22/pkg/apis/core/validation/validation.go#L59
const isNegativeErrorMsg string = apimachineryvalidation.IsNegativeErrorMsg
```

在 `doc.go` 中添加：

```markdown
| 提升文件 | 源文件 | 常量/变量/类型/函数 | 更改 |
| ----------- | ----------- | ------------------- | ------- |
| corevalidation.go | https://github.com/kubernetes/kubernetes/blob/release-1.22/pkg/apis/core/validation/validation.go#L59 | const isNegativeErrorMsg | N |
```

### 提升类型

将类型 `Visitor` 提升到 `visitpod.go`：

```go
// +lifted:source=https://github.com/kubernetes/kubernetes/blob/release-1.23/pkg/api/v1/pod/util.go#L82-L83

// Visitor 被调用时传入每个对象名称，并返回 true 如果访问应继续
type Visitor func(name string) (shouldContinue bool)
```

在 `doc.go` 中添加：

```markdown
| 提升文件 | 源文件 | 常量/变量/类型/函数 | 更改 |
| ----------- | ----------- | ------------------- | ------- |
| visitpod.go | https://github.com/kubernetes/kubernetes/blob/release-1.23/pkg/api/v1/pod/util.go#L82-L83 | type Visitor | N |