---
id: profiling-scheduler
title: Profiling the HAMi Scheduler
sidebar_label: Profiling Scheduler
---

## Prerequisites

### Enable Profiling

Add the `--profiling` flag to the `extraArgs` field of `scheduler.extender` in the Helm Chart to make pprof available via the HTTP(S) server on `<POD_IP>`.

```yaml
scheduler:
  extender:
    extraArgs:
      - --debug
      - -v=4
      - --profiling
```

### Prepare the Profiling Environment

- [Install Go](https://go.dev/doc/install) on your system.
- Get the HAMi [source code](https://github.com/Project-HAMi/HAMi) and place it at `/k8s-vgpu`.
- Install dependencies:

```shell
cd /k8s-vgpu
make tidy
go install github.com/NVIDIA/mig-parted/cmd/nvidia-mig-parted@v0.10.0
```

### (Optional) Prepare a Profiling Image

```dockerfile
FROM golang:1.24.4-bullseye
ADD . /k8s-vgpu
RUN cd /k8s-vgpu && make tidy
RUN go install github.com/NVIDIA/mig-parted/cmd/nvidia-mig-parted@v0.10.0
```

## Profiling the Scheduler

**Note:** If the HAMi source code and dependencies are correctly placed, you can use the `list` command in pprof to view source code. Otherwise you may encounter a `no such file or directory` error. For detailed information about pprof, see the [official documentation](https://pkg.go.dev/net/http/pprof).

### CPU Profiling

Run the following command to capture a 120-second CPU profile:

```bash
go tool pprof --seconds 120 https+insecure://<POD_IP>/debug/pprof/profile
```

Example output:

```bash
root@hami-pprof-76cfcb66f6-jpjnm:/# go tool pprof --seconds 120 https+insecure://10.42.0.24/debug/pprof/profile
Fetching profile over HTTP from https+insecure://10.42.0.24/debug/pprof/profile?seconds=120
Please wait... (2m0s)
Saved profile in /root/pprof/pprof.scheduler.samples.cpu.002.pb.gz
File: scheduler
Type: cpu
Time: 2025-04-01 07:08:42 UTC
Duration: 120s, Total samples = 10ms (0.0083%)
Entering interactive mode (type "help" for commands, "o" for options)
(pprof) top
Showing nodes accounting for 10ms, 100% of 10ms total
Showing top 10 nodes out of 12
      flat  flat%   sum%        cum   cum%
      10ms   100%   100%       10ms   100%  sigs.k8s.io/json/internal/golang/encoding/json.unquoteBytes
         0     0%   100%       10ms   100%  k8s.io/apimachinery/pkg/runtime.Decode (inline)
         0     0%   100%       10ms   100%  k8s.io/apimachinery/pkg/runtime.WithoutVersionDecoder.Decode
         0     0%   100%       10ms   100%  k8s.io/apimachinery/pkg/runtime/serializer/json.(*Serializer).Decode
         0     0%   100%       10ms   100%  k8s.io/apimachinery/pkg/runtime/serializer/json.(*Serializer).unmarshal
         0     0%   100%       10ms   100%  k8s.io/apimachinery/pkg/watch.(*StreamWatcher).receive
         0     0%   100%       10ms   100%  k8s.io/client-go/rest/watch.(*Decoder).Decode
         0     0%   100%       10ms   100%  sigs.k8s.io/json.UnmarshalCaseSensitivePreserveInts (inline)
         0     0%   100%       10ms   100%  sigs.k8s.io/json/internal/golang/encoding/json.(*decodeState).object
         0     0%   100%       10ms   100%  sigs.k8s.io/json/internal/golang/encoding/json.(*decodeState).unmarshal
```

### Memory Profiling

To analyze memory usage, choose one of the following:

- **Current live objects:**

```bash
go tool pprof https+insecure://<POD_IP>/debug/pprof/heap
```

- **Cumulative allocation history:**

```bash
go tool pprof https+insecure://<POD_IP>/debug/pprof/allocs
```

Example output from the allocation profile:

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
