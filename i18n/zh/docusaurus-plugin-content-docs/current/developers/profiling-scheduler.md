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
