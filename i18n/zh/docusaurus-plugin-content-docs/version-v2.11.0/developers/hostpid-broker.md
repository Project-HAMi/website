---
title: Host PID Broker
---

该功能默认关闭。

## 目的

NVML 上报的进程 PID 位于宿主机 PID 命名空间中，因此 HAMi-core 需要知道每个 CUDA 进程在宿主机上的 PID。当前的兜底方案是在持有 post init 锁的情况下创建 CUDA primary context 来获取这个 PID。当大量进程同时调用 `cuInit()` 时，这一步就变成了串行执行。

Host PID broker 通过 Linux 的 `SO_PEERCRED` 返回调用方自身的宿主机 PID。它运行在 NVIDIA device plugin 内部，而 device plugin 所在的 Pod 本来就使用宿主机 PID 命名空间。broker 不读取宿主机的 procfs，也不接受客户端传入的 PID。

## 前置要求

1. NVIDIA device plugin 必须以 root 身份运行在 Linux 上。

2. `devicePlugin.hostPID` 必须保持为 `true`。

3. 工作负载使用的 HAMi-core 版本必须支持协议版本 1 以及 `LIBVGPU_HOSTPID_BROKER` 开关。

4. 容器运行时必须支持 `/tmp/vgpulock/hostpid` 所用的只读嵌套 bind mount。

5. 共享的父目录 `/tmp/vgpulock` 必须属于 root，权限为 `01777`。sticky 位既允许旧版逻辑创建锁文件，又能防止普通工作负载用户替换其他用户创建的条目。

## 启用方式

设置如下 Chart 参数：

```yaml
devicePlugin:
  hostPID: true
  hostPIDBroker:
    enabled: true
```

如果启用了 broker 却关闭了 device plugin 的宿主机 PID 命名空间，Chart 会拒绝该配置。

启用后，Chart 会做四件事：

1. 在 device plugin 中设置 `LIBVGPU_HOSTPID_BROKER=1`。

2. 把宿主机目录 `/var/run/hami/hostpid` 挂载到 device plugin 中。

3. device plugin 创建 `/var/run/hami/hostpid/broker.sock`，并提供协议版本 1 的服务。

4. 每个注入了 HAMi-core 的分配还会带上 `LIBVGPU_HOSTPID_BROKER=1`，以及一个从 `/var/run/hami/hostpid` 到 `/tmp/vgpulock/hostpid` 的只读挂载。

device plugin 在返回分配结果之前，会先把 `/tmp/vgpulock` 准备好并设置为 `01777` 权限。即使 broker 关闭、HAMi-core 走现有兜底路径，这一步同样会执行。如果无法安全地准备好该目录，分配会失败。

准备过程中，先以不跟随符号链接的方式打开 `/tmp`，校验其属主和 sticky 规则，然后基于该文件描述符创建并打开 `vgpulock`。第一次 `mkdirat()` 请求的权限是 `01777`，再通过基于描述符的 `chmod` 补回被进程 umask 去掉的权限位。最后再核对一次身份和权限，防止目录在准备过程中被替换。

分配响应中包含一个挂载到 `/tmp/vgpulock` 的可写父目录。启用 broker 时，还会额外包含一个挂载到 `/tmp/vgpulock/hostpid` 的只读 broker 挂载。集成逻辑会用这两个规范挂载替换重复的或路径等价的条目，同时保留无关的挂载。父目录挂载排在嵌套的 broker 挂载之前，这样运行时应用响应时，父目录就不会把 broker 挂载遮住。

在应用当前开关状态之前，分配辅助逻辑会先清除 broker 保留的环境变量键。broker 关闭时，还会移除残留的 broker 挂载，但保留可写的父目录挂载和无关挂载。

只有取值严格等于字符串 `1` 时才会启用服务端或客户端。

## 协议

协议基于 Unix 流式连接，一次连接只有一个请求和一个响应。所有整数均为无符号数，使用网络字节序编码。

| 字段              | 请求字节数 | 响应字节数 |
| ----------------- | ---------: | ---------: |
| Magic `HPID`      |          4 |          4 |
| Version           |          2 |          2 |
| Command 或 status |          2 |          2 |
| Host PID          |          0 |          4 |

协议版本 1 支持命令 1，即获取调用方的宿主机 PID。状态 0 表示成功，状态 1 表示请求无效。

服务端在校验请求之后，从已连接的 socket 上读取对端凭据。客户端从不发送 PID。

## 安全边界

1. 使用默认路径时，服务端要求有效 UID 为 0。

2. 服务端目录属于 root，权限为 `0711`。

3. 共享锁父目录属于 root，权限为 `01777`。如果属主、对象类型、符号链接或最终权限不安全，分配会被拒绝。

4. 通过一个属于 root、权限为 `0600` 的锁文件，防止两个 broker 互相替换。

5. 服务端会拒绝以下情况：目录是符号链接、锁文件是符号链接、与普通文件路径冲突、socket 属于其他 UID，以及 socket 仍处于活跃状态。

6. 服务端只会删除属于预期 UID 的残留 socket。关闭时，只有当路径对应的设备号和 inode 仍与自己创建的 socket 一致，才会删除该路径。

7. 工作负载通过只读挂载访问 broker 目录。HAMi-core 客户端在信任响应之前，会检查目录属主、目录写权限位、socket 类型、socket 属主、只读挂载标志以及已连接对端的 UID。

8. 调用方只能获取自己的 PID。这个身份由内核在 broker 所在的宿主机 PID 命名空间中通过 `SO_PEERCRED` 提供。

只有拿到分配挂载的工作负载才能访问该 socket。工作负载仍可能制造连接压力，因此服务端会限制同时处理的连接数，为整个请求-响应交互设置一个总的超时时间，并关闭超出限制的连接。无法完成交互的客户端会回退到 HAMi-core 现有的、有时间上限的兜底路径。

## 失败处理

| 场景 | 服务端行为 | HAMi-core 行为 |
| --- | --- | --- |
| 功能关闭 | 不创建 socket | 走现有的 NVML 发现路径 |
| 服务端无法启动 | device plugin 启动失败 | 该插件实例不再处理新的分配 |
| 无法安全准备锁父目录 | 分配失败 | 不会返回不安全的父目录挂载 |
| 工作负载中 socket 缺失或已失效 | 没有 broker 响应 | 走现有的 NVML 发现路径 |
| 属主、权限、挂载或对端 UID 不安全 | 不信任该请求 | 走现有的 NVML 发现路径 |
| 协议响应格式错误 | 请求失败 | 走现有的 NVML 发现路径 |
| broker 响应慢或无响应 | 服务端和客户端的超时机制关闭请求 | 走现有的 NVML 发现路径 |
| 插件启动后 broker 退出 | device plugin 带着 broker 错误退出 | Kubernetes 重启 device plugin |

broker 绝不返回猜测的 PID。成功的响应中包含的是内核提供的 PID，其他任何结果都视为失败，由现有路径负责发现 PID。

## 灰度上线

1. 安装支持服务端的 HAMi 版本，并设置 `hostPIDBroker.enabled=false`。

2. 安装兼容的 HAMi-core 库。没有 broker 挂载时，它会使用现有的兜底路径。

3. 开启 `hostPIDBroker.enabled`，等待所有 NVIDIA device plugin Pod 就绪。

4. 重启或重建选定的工作负载，使它们的分配响应带上 broker 挂载和环境变量开关。

5. 扩大范围之前，先验证这些工作负载：检查宿主机 PID 是否正确、CUDA context 统计是否准确、是否实际用到了 broker，以及兜底行为是否正常。

device plugin 变更后，已有工作负载不会自动获得新的挂载。在重建之前，它们会继续走原来的路径。

## 回滚

1. 设置 `hostPIDBroker.enabled=false`。

2. 等待 NVIDIA device plugin 滚动更新完成。

3. 需要移除 broker 挂载时，重建相应的工作负载。仍然带有兼容 broker 挂载的工作负载可以一直运行到退出。

4. 新版 HAMi-core 在没有 broker 可用时会使用现有兜底路径，因此不需要先回滚库版本。

以上上线约定只适用于 broker 功能。[HAMi-core#248](https://github.com/Project-HAMi/HAMi-core/pull/248) 中独立的锁迁移仍需遵循它自己的新旧版本混用策略。

## 发布前需要完成的验证

1. 针对 broker、生命周期和分配集成的 Go race 测试。

2. C 客户端与 Go 服务端之间的真实契约测试。

3. broker 缺失、失效、不安全、响应格式错误、响应慢、连接饱和、重启中以及退出中等场景。

4. HAMi-core 在 Linux 和 CUDA 下的构建，以及客户端和 context 统计测试。

5. 在 Kubernetes 中分别验证功能关闭、开启、升级和回滚。

6. 并发 `cuInit()` 和首次创建 primary context 的基准测试，需附带原始输出、环境信息、源码版本和校验和。

## 已知限制

1. 该设计依赖 Linux 的 `SO_PEERCRED`，以及运行在宿主机 PID 命名空间中的 device plugin。

2. 沙箱类运行时必须在真实环境中测试。挂载进去的 Unix socket 可能被拦截，也可能无法保留本设计所需的对端身份。

3. 已有工作负载需要重建才能获得或移除分配挂载。

4. 其他 NVIDIA 架构、驱动版本、CRI-O、rootless 运行时、gVisor 和 Kata 在分别测试之前，都视为独立的兼容性场景。
