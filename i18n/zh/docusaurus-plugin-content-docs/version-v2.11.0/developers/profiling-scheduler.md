---
id: profiling-scheduler
title: HAMi 调度器性能分析指南
sidebar_label: 调度器性能分析
---

## 前提条件

### 启用性能分析

在 Helm Chart 的 `scheduler.extender` 的 `extraArgs` 字段中添加 `--profiling` 标志，使 pprof 通过 HTTP(S) 服务器在 `<POD_IP>` 上可访问。

```yaml
scheduler:
  extender:
    extraArgs:
      - --debug
      - -v=4
      - --profiling
```

### 准备性能分析环境

- 在您的系统上[安装 Go](https://go.dev/doc/install)。
- 获取 HAMi [源代码](https://github.com/Project-HAMi/HAMi) 并将其放置在 `/k8s-vgpu` 目录下。
- 安装依赖项：

```shell
cd /k8s-vgpu
make tidy
go install github.com/NVIDIA/mig-parted/cmd/nvidia-mig-parted@v0.10.0
```

### （可选）准备性能分析镜像

```dockerfile
FROM golang:1.24.4-bullseye
ADD . /k8s-vgpu
RUN cd /k8s-vgpu && make tidy
RUN go install github.com/NVIDIA/mig-parted/cmd/nvidia-mig-parted@v0.10.0
```

## 对调度器进行性能分析

**注意：** 如果 HAMi 源代码和依赖项正确放置，您可以在 pprof 中使用 `list` 命令查看源代码。否则，您可能会遇到 `no such file or directory` 错误。有关 pprof 的详细信息，请参阅[官方文档](https://pkg.go.dev/net/http/pprof)。

### CPU 性能分析

运行以下命令捕获 120 秒的 CPU 性能分析：

```bash
go tool pprof --seconds 120 https+insecure://<POD_IP>/debug/pprof/profile
```

### 内存性能分析

- **当前活动对象：**

```bash
go tool pprof https+insecure://<POD_IP>/debug/pprof/heap
```

- **累计分配历史：**

```bash
go tool pprof https+insecure://<POD_IP>/debug/pprof/allocs
```

分配性能分析的示例输出：

```bash
root@hami-scheduler-ffd687cb7-7gqm2:/# /usr/local/go/bin/go tool pprof --seconds 120 https+insecure://10.42.0.24/debug/pprof/allocs
Fetching profile over HTTP from https+insecure://10.42.0.24/debug/pprof/allocs?seconds=120
Saved profile in /root/pprof/pprof.scheduler.alloc_objects.alloc_space.inuse_objects.inuse_space.041.pb.gz
File: scheduler
Type: alloc_space
Time: 2025-04-01 07:03:05 UTC
Entering interactive mode (type "help" for commands, "o" for options)
(pprof) top
Showing nodes accounting for 4383.93MB, 69.18% of 6336.84MB total
Dropped 376 nodes (cum <= 31.68MB)
Showing top 10 nodes out of 164
      flat  flat%   sum%        cum   cum%
 1114.44MB 17.59% 17.59%  1114.94MB 17.59%  io.ReadAll
  980.52MB 15.47% 33.06%   980.52MB 15.47%  sync.(*Pool).pinSlow
  606.88MB  9.58% 42.64%   606.88MB  9.58%  golang.org/x/net/http2.init.func5
  357.15MB  5.64% 48.27%   357.15MB  5.64%  k8s.io/apimachinery/pkg/runtime.(*RawExtension).UnmarshalJSON
  293.20MB  4.63% 52.90%   293.20MB  4.63%  reflect.mapassign_faststr0
  265.58MB  4.19% 57.09%   265.58MB  4.19%  reflect.unsafe_NewArray
  234.07MB  3.69% 60.78%   461.59MB  7.28%  sigs.k8s.io/json/internal/golang/encoding/json.(*decodeState).literalStore
  210.54MB  3.32% 64.11%  3409.63MB 53.81%  github.com/Project-HAMi/HAMi/pkg/scheduler.(*Scheduler).RegisterFromNodeAnnotations
  162.02MB  2.56% 66.66%   331.76MB  5.24%  github.com/Project-HAMi/HAMi/pkg/scheduler.(*Scheduler).getNodesUsage
  159.52MB  2.52% 69.18%   225.53MB  3.56%  encoding/json.Unmarshal
(pprof) list RegisterFromNodeAnnotations
Total: 6.21GB
ROUTINE ======================== github.com/Project-HAMi/HAMi/pkg/scheduler.(*Scheduler).RegisterFromNodeAnnotations in /k8s-vgpu/pkg/scheduler/scheduler.go
  210.54MB     3.33GB (flat, cum) 53.73% of Total
         .          .    158:func (s *Scheduler) RegisterFromNodeAnnotations() {
         .    46.84MB    169:  klog.InfoS("Ticker triggered")
  512.05kB   512.05kB    165:    select {
    1.50MB     1.50MB    187:      nodeNames = append(nodeNames, val.Name)
       2MB   203.15MB    218:        klog.InfoS("New timestamp for annotation", ...)
         .     1.25GB    219:        n, err := util.GetNode(val.Name)
         .     1.21GB    225:        if err := util.PatchNodeAnnotations(n, tmppat); err != nil {
```
