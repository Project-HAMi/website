---
title: 如何在 HAMi 中使用 Coscheduling
sidebar_label: 如何使用 Coscheduling
---

[Coscheduling](https://github.com/kubernetes-sigs/scheduler-plugins/tree/master/pkg/coscheduling) 是 [kubernetes-sigs/scheduler-plugins](https://github.com/kubernetes-sigs/scheduler-plugins) 提供的调度插件，用于实现 gang scheduling。只有当一组 Pod 中至少 `minMember` 个可以同时被放置时，这组 Pod 才会被准入。这正是分布式训练所需要的语义：一个作业要么拿到全部 GPU，要么一个都不拿。

本文介绍如何在 HAMi 调度器中运行 Coscheduling，以及如何调整 gang 绑定阶段会触发的节点锁行为。

## 工作原理

HAMi 与 Coscheduling 作用在调度周期的两个不同阶段。

Coscheduling 作用于 **Permit** 阶段。每个通过过滤的成员 Pod 会被放入等待队列，当等待中的成员达到 `minMember` 时，它们会被同时释放进入绑定阶段。

HAMi 通过扩展器作用于 **Bind** 阶段。绑定前，扩展器会在 Node 对象上写入 `hami.io/mutex.lock` 注解，从而获取该节点的锁：

```text
hami.io/mutex.lock: 2026-06-14T15:05:03Z,default,gang-pod-1
```

该锁用于串行化节点上的设备分配。如果没有它，同一时刻绑定的两个 Pod 会读到同一份设备使用快照，可能被分配到同一张 GPU 的重叠切片。锁由设备插件在 `Allocate()` 完成并更新 Pod 注解后释放，在真实 GPU 上耗时约 20 毫秒。若锁始终未被释放，则在节点锁超时（默认 5 分钟）后过期。

这两个机制在 gang 释放时相遇。Coscheduling 会在同一毫秒内释放全部成员，因此当多个成员落在同一节点时，它们会争抢一把只持有几十毫秒的锁。抢锁失败的 Pod 绑定失败并回到 Pending，随后经由 kube-scheduler 的退避重试回来，而退避是以秒为单位的。5 个成员的 gang 最终会收敛，但需要经过多轮退避。

为了消除这段空转，扩展器会为属于某个 PodGroup 的 Pod 重试节点锁：

- 带有非空 `scheduling.x-k8s.io/pod-group` 标签的 Pod 算作分组成员。这类 Pod 每 100 毫秒轮询一次锁，直到 `--node-lock-retry-timeout` 超时。
- 每次重试前会释放已部分获取的锁，因此同时申请多个厂商设备的 Pod 不会残留过期锁。
- 非锁争抢类错误会立即返回，不做重试。
- 不属于任何分组的 Pod 保持原有的快速失败行为。

:::note

`--node-lock-retry-timeout` 在高于 v2.9.0 的版本中可用。把它传给更早版本的扩展器会因无法识别该参数而退出，因此请在确认所用构建包含该参数后再添加。

:::

## 前置条件

- 一个已安装 HAMi 且具备 GPU 节点的 Kubernetes 集群。
- 与集群 Kubernetes 次版本匹配的 [scheduler-plugins 版本](https://github.com/kubernetes-sigs/scheduler-plugins/releases)。scheduler-plugins 的次版本与其编译所用的 Kubernetes 客户端库版本一致，请对照[兼容性矩阵](https://github.com/kubernetes-sigs/scheduler-plugins#compatibility-matrix)选择与集群匹配的版本。下文示例使用 v0.34.7，该版本基于 Kubernetes v1.34 构建。
- Helm 3.10 或更高版本。
- 具备 cluster-admin 权限的 `kubectl`。

## 1. 使用 scheduler-plugins 的 kube-scheduler 安装 HAMi

HAMi 调度器 Pod 中运行两个容器：上游 `kube-scheduler` 和 HAMi `vgpu-scheduler-extender`。Coscheduling 编译在 scheduler-plugins 版本的 kube-scheduler 中，因此需要把 chart 指向该镜像：

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update

helm install hami hami-charts/hami \
  --namespace kube-system \
  --set scheduler.kubeScheduler.image.registry=registry.k8s.io \
  --set scheduler.kubeScheduler.image.repository=scheduler-plugins/kube-scheduler \
  --set scheduler.kubeScheduler.image.tag=v0.34.7 \
  --wait --timeout 10m
```

对已有安装，使用 `helm upgrade --reuse-values` 传入相同的三个 `--set` 参数。

## 2. 安装 PodGroup CRD

Coscheduling 读取 `PodGroup` 资源。从同一个 scheduler-plugins 版本安装 CRD：

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/scheduler-plugins/v0.34.7/config/crd/bases/scheduling.x-k8s.io_podgroups.yaml
```

## 3. 部署 scheduler-plugins 控制器

gang 准入本身并不依赖该控制器：Coscheduling 插件依据 `PodGroup` 的 spec 以及自身的内存记账来判断。控制器提供的是 `PodGroup.status` —— 它负责协调 `phase`、`running`、`succeeded` 与 `failed`，这正是 `kubectl get podgroup` 展示的内容，也是跟踪一组 Pod 进度所需的信息。它以独立镜像随同一版本发布。

从发布清单部署控制器：

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/scheduler-plugins/v0.34.7/manifests/install/all-in-one.yaml
```

该清单会创建 `scheduler-plugins` 命名空间、控制器 Deployment 以及控制器所需的 RBAC，**不会**安装第二个调度器，因此可以与 HAMi 调度器共存。清单中同时创建的 `system:kube-scheduler:plugins` ClusterRole 绑定的是 `system:kube-scheduler` 用户，并不覆盖 HAMi 调度器的 ServiceAccount，这部分由[第 5 步](#5-授予访问-podgroup-的权限)单独处理。

确认控制器已就绪：

```bash
kubectl rollout status deploy/scheduler-plugins-controller -n scheduler-plugins
```

## 4. 在调度器配置中启用 Coscheduling

chart 会把 KubeSchedulerConfiguration 渲染到 `hami-scheduler` ConfigMap 中。将插件加入 profile：

```bash
kubectl edit configmap hami-scheduler -n kube-system
```

`profiles` 条目应如下所示：

```yaml
profiles:
  - schedulerName: hami-scheduler
    plugins:
      multiPoint:
        enabled:
          - name: Coscheduling
      queueSort:
        disabled:
          - name: PrioritySort
    pluginConfig:
      - name: Coscheduling
        args:
          permitWaitingTimeSeconds: 10
```

:::warning

必须禁用 `PrioritySort`。Coscheduling 会注册自己的队列排序插件，而 kube-scheduler 在存在两个排序插件时拒绝启动：

```text
only one queue sort plugin required for profile with scheduler name "hami-scheduler", but got 2
```

:::

该 ConfigMap 由 chart 管理，`helm upgrade` 会覆盖这次修改。每次升级后需要重新应用，或者把该 ConfigMap 移出 chart 自行管理。

重启调度器使配置生效：

```bash
kubectl rollout restart deploy/hami-scheduler -n kube-system
kubectl rollout status deploy/hami-scheduler -n kube-system
```

## 5. 授予访问 PodGroup 的权限

chart 安装的调度器 ServiceAccount 无法读取 `PodGroup` 资源。Coscheduling 插件只会读取它们——解析 Pod 所属的分组、统计同组成员数量，并与 `minMember` 比较——因此调度器只需要只读权限：

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: hami-podgroup-reader
rules:
  - apiGroups: ["scheduling.x-k8s.io"]
    resources: ["podgroups"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: hami-podgroup-reader
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: hami-podgroup-reader
subjects:
  - kind: ServiceAccount
    name: hami-scheduler
    namespace: kube-system
```

该 ServiceAccount 以 Helm release 名称命名：release 名为 `hami` 时对应 `hami-scheduler`。若使用了其他 release 名称或命名空间，请相应调整 `name` 与 `namespace`。

对 `PodGroup.status` 的写入来自[步骤 3](#3-部署-scheduler-plugins-控制器)部署的控制器，它拥有自己的 ServiceAccount 与 RBAC，因此调度器在这里不需要 `create`、`update` 或 `patch` 权限。

缺少该 ClusterRole 时，调度器的 PodGroup lister 始终为空。`PreFilter` 仍会通过 —— 它把无法解析的分组当作没有分组处理 —— 但随后 `Permit` 会以 `PodGroup not found` 拒绝每个成员，整组 Pod 一直处于 Pending。

## 6. 提交一个 gang

创建 `PodGroup`，并给每个成员打上分组名标签。成员照常申请 vGPU 资源：

```yaml
apiVersion: scheduling.x-k8s.io/v1alpha1
kind: PodGroup
metadata:
  name: gang-training
spec:
  minMember: 4
  scheduleTimeoutSeconds: 60
---
apiVersion: v1
kind: Pod
metadata:
  name: gang-worker-1
  labels:
    scheduling.x-k8s.io/pod-group: gang-training
spec:
  schedulerName: hami-scheduler
  containers:
    - name: worker
      image: ubuntu:22.04
      command: ["sleep", "3600"]
      resources:
        limits:
          nvidia.com/gpu: "1"
          nvidia.com/gpumem: "3000"
          nvidia.com/gpucores: "30"
```

上面的清单定义的是该 gang 中的一个 Pod。请创建更多带有相同 `scheduling.x-k8s.io/pod-group` 标签的 Pod 以满足 `minMember`。每个 Pod 的名称必须不同，否则该组无法达到所需的成员数量，这些 Pod 会一直停留在 Pending。

:::warning

`scheduling.x-k8s.io/pod-group` 必须放在 `metadata.labels` 下。放在 `metadata.annotations` 下会静默绕过全部 gang 逻辑，不产生任何报错：Pod 会无视 `minMember` 逐个被调度。

:::

确认整组被同时准入：

```bash
kubectl get pods -l scheduling.x-k8s.io/pod-group=gang-training -o wide
```

当成员数量少于 `minMember` 时，`PreFilter` 会在请求到达 HAMi 扩展器之前拒绝该组：

```text
pre-filter pod gang-worker-1 cannot find enough sibling pods,
current pods number: 3, minMember of group: 5
```

## 调整节点锁

有两个扩展器参数控制节点锁行为：`--node-lock-retry-timeout` 限定 `Bind` 为分组成员重试被占用的锁的时长，`--node-lock-timeout` 限定一把锁在被其他 Pod 接管前的有效期。两者的完整说明见[全局配置](../configure.md#调度器配置扩展器参数)。

通过 chart 设置重试超时。`scheduler.extender.extraArgs` 会替换整个默认列表，因此需要保留已有条目：

```bash
helm upgrade hami hami-charts/hami -n kube-system --reuse-values \
  --set-json 'scheduler.extender.extraArgs=["--debug","-v=4","--node-lock-retry-timeout=28s"]'
```

:::warning

`--node-lock-retry-timeout` 必须小于 KubeSchedulerConfiguration 中扩展器的 `httpTimeout`，chart 将其设为 `30s`。如果重试时间超过该 HTTP 调用时长，kube-scheduler 会在扩展器仍在等锁时放弃这次绑定请求，Pod 将从头重新调度。

:::

默认值 `28s` 在 `30s` 超时之下预留了 2 秒余量。

## 故障排查

**Pod 持续 Pending，事件为 `BindingFailed: node <name> has been locked within 5m0s`**

这些 Pod 上的重试没有生效。确认 `scheduling.x-k8s.io/pod-group` 标签打在 Pod 上（不能只打在 PodGroup 上，也不能放在 annotations 里），并确认 `--node-lock-retry-timeout` 没有被设为 `0`。

**调度器容器启动后反复崩溃**

在 kube-scheduler 日志中查找 `only one queue sort plugin required`。这表示 `PrioritySort` 仍与 Coscheduling 同时启用，见[步骤 4](#4-在调度器配置中启用-coscheduling)。

**整组 Pod 一直 Pending 且从未选中节点**

要么创建的成员数少于 `minMember`，要么调度器读不到 `PodGroup` 资源。两种情况的日志不同：成员不足会在 `PreFilter` 阶段以 `cannot find enough sibling pods` 被拒绝，而 RBAC 缺失则表现为 `Permit` 阶段的 `PodGroup not found`。属于后者时，请确认[步骤 5](#5-授予访问-podgroup-的权限)的 RBAC 已应用。

**`kubectl get podgroup` 看不到 status**

`scheduler-plugins-controller` 缺失或反复崩溃。gang 调度本身仍然可用，只是看不到状态。执行 `kubectl get deploy -n scheduler-plugins` 检查，并确认[步骤 3](#3-部署-scheduler-plugins-控制器)已应用。如果控制器日志中出现 `podgroups/status` 的 `forbidden` 报错，说明其自身的 RBAC 未被创建，请重新应用该步骤中的清单。

**容器报错 `libdl.so.2: cannot open shared object file`**

HAMi 注入的 `LD_PRELOAD` 指向基于 glibc 构建的 `libvgpu.so`。基于 musl 的镜像（如 `busybox`、`alpine`）无法加载它。GPU 工作负载请使用 glibc 镜像。

## 相关链接

- [Coscheduling 插件](https://github.com/kubernetes-sigs/scheduler-plugins/tree/master/pkg/coscheduling)
- [scheduler-plugins 版本列表](https://github.com/kubernetes-sigs/scheduler-plugins/releases)
- [全局配置](../configure.md)
- [如何在 KAI Scheduler 中使用 HAMi](../kai-scheduler/how-to-use-kai-scheduler.md)
