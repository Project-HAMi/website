---
title: Chart 运维
sidebar_label: Chart 运维
---

本文说明已安装 HAMi 的运维配置。将 values 保存在 release 使用的配置文件中。值的优先级见[配置指南](./configure.md)，release 升级见[升级指南](../installation/upgrade.md)。

## 调度器性能分析 {#scheduler-profiling}

默认不启用 profiling。在调度器附加参数中加入 `--profiling`，并保留需要的其他参数：

```yaml
scheduler:
  profilingBindAddress: "127.0.0.1:6060"
  extender:
    extraArgs:
      - --debug
      - -v=4
      - --profiling
```

独立的 profiling 监听器使用明文 HTTP，默认绑定回环地址。调度器 Service 不暴露该端口。通过端口转发访问：

```bash
kubectl -n kube-system port-forward pod/<scheduler-pod> 6060:6060
```

然后在本机打开 `http://127.0.0.1:6060/debug/pprof/`。

此前，启用 profiling 会在面向集群的 HTTP 服务上暴露 pprof。现在相关路由仅由独立监听器提供。使用旧端点的部署需要改用端口转发，或显式将 `scheduler.profilingBindAddress` 设置为非回环地址。修改绑定地址不会让调度器 Service 暴露 pprof，旧 Service 端点仍对 pprof 路由返回 404。

非回环访问需要通过受限网络路径连接 Pod IP 和 profiling 端口。绑定非回环地址会记录安全警告：pprof 没有身份验证，可能暴露进程诊断数据。选择暴露时必须限制网络访问。未启用 profiling 时，绑定地址被忽略，监听器不会启动。

## vGPU 缓存垃圾回收 {#vgpu-cache-garbage-collection}

Chart 将 `devicePlugin.vgpuCache.gracePeriod` 通过 `HAMI_VGPU_CACHE_GRACE_PERIOD` 传给设备插件。使用 Go duration 字符串，例如 `"30s"`、`"5m"` 或 `"1h"`。该值表示从缓存目录修改时间起计算的最短保留时间。

省略或为空时使用 `"5m"`；无效字符串会记录警告并使用 `"5m"`；负数会阻止设备插件启动。`"0s"` 仅移除保留时间，不会关闭垃圾回收，删除仍需要确认 Pod 状态并通过原有安全检查。

```yaml
devicePlugin:
  monitor:
    resyncInterval: "30s"
  vgpuCache:
    gracePeriod: "5m"
```

**迁移说明：** `devicePlugin.monitor.resyncInterval` / `HAMI_RESYNC_INTERVAL` 不再控制设备插件的目录垃圾回收。若之前通过监控组件的 resync 值调整清理等待时间，需要显式设置 `devicePlugin.vgpuCache.gracePeriod` 才能保留该时间。非 Helm 部署在设备插件容器中设置 `HAMI_VGPU_CACHE_GRACE_PERIOD`。未设置新字段时，无论 monitor resync 为何值，GC 均使用 `5m`。监控组件保留原有 resync 和 mmap 释放行为，不删除目录。

该配置不改变 GC 扫描间隔、确认重试的退避时间或目录删除最多失败五次的限制。

## 重新加载配置 {#configuration-reload}

通过 Helm 修改生成的设备配置，会触发调度器和 Chart 管理的 NVIDIA 设备插件滚动更新。单独部署的插件按各自流程处理。

仅修改 `devicePlugin.nodeConfiguration.config` 或外部节点 ConfigMap 不会触发滚动更新。重启 NVIDIA 设备插件以加载这些修改：

```bash
kubectl rollout restart daemonset/hami-device-plugin -n kube-system
kubectl rollout status daemonset/hami-device-plugin -n kube-system --timeout=5m
```

以上命令使用默认资源名称和命名空间，按实际安装替换。修改独立管理的 ConfigMap 前先备份。持久配置保存在 Helm values 或外部 ConfigMap 中；后续 Helm 操作可能覆盖对 Chart 管理的 ConfigMap 所做的手工修改。
