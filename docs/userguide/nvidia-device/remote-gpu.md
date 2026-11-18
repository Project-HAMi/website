---
title: Remote GPU access with Lupine
sidebar_label: Remote GPU
---

HAMi can schedule a workload on a client node while its CUDA calls execute on a separate GPU server through [Lupine](https://github.com/lupinemachines/lupine). The client node can be CPU-only and does not need an NVIDIA driver. HAMi selects the server and delivers the client libraries automatically.

## Prerequisites

- HAMi v2.11.0 or later.
- NVIDIA drivers and the NVIDIA container runtime on GPU server nodes.
- TCP connectivity from client Pods to the server node's InternalIP and configured port.
- The HAMi admission webhook enabled, and compatible Lupine client and server versions.

Automatic library delivery currently targets the supplied amd64 Ubuntu 24.04 CUDA and vLLM example images. Other images may need additional integration; see [Library delivery and compatibility](#library-delivery-and-compatibility).

For mirror selection and disconnected clusters, see [online installation](../../installation/online-installation.md) and [offline installation](../../installation/offline-installation.md).

## Configure the server

Enable remote mode in the device plugin node configuration:

```yaml
devicePlugin:
  enabled: true
  nvidiaNodeSelector:
    gpu: "on"
  nodeConfiguration:
    config: |
      {
        "nodeconfig": [
          {
            "name": "gpu-server-1",
            "operatingmode": "remote"
          }
        ]
      }
devices:
  remotegpu:
    enabled: true
```

Replace `gpu-server-1` with the name of the node that will serve remote GPUs.

The device plugin still runs on the GPU server. In `remote` mode it registers the remote GPU fleet instead of advertising GPUs to the local kubelet, and automatically applies the `hami.io/lupine-server` discovery label. The server listens on port `14833` by default.

Wait for the HAMi scheduler, device plugin and Lupine server Pods to be ready before creating workloads. Inspect the discovery label and component status with:

```bash
kubectl get node gpu-server-1 --show-labels
kubectl get pods -n kube-system -o wide
```

### Resource and image settings

| Setting | Meaning |
| --- | --- |
| `nvidia.com/remote-gpu` | Number of physical GPUs on the selected server. |
| `nvidia.com/remote-gpu-memory` | GPU memory quota in MiB **per GPU**, enforced by HAMi-core. |
| `devices.remotegpu.libImage` | Image supplying HAMi-core for memory enforcement. Unset uses the HAMi device plugin image; an empty string disables enforcement. |
| `devices.remotegpu.clientImage` | Image supplying Lupine client libraries. An empty string disables automatic client library delivery. |

:::warning Current limitation

A workload reserves the entire GPU server. Set the GPU count to the server's physical GPU count: the endpoint exposes all its GPUs. A smaller memory quota does not make the remaining server capacity available to another workload. Run the following two-GPU examples sequentially on a server with two A100 GPUs, or use separate servers.

:::

## Monitor Remote GPU workloads {#monitor-remote-gpu-workloads}

Remote GPU monitoring is off by default. To enable it, add these settings to the Helm values for your chart-managed Lupine server:

```yaml
devices:
  remotegpu:
    enabled: true
    server:
      enabled: true
    monitor:
      enabled: true
```

The chart runs `remoteGPUmonitor` as a sidecar in each Lupine server Pod. The image configured by `devicePlugin.monitor.image` must contain that binary. Use a Lupine server image that exposes `LUPINE_WORKLOAD_ID` as `client_id` in its metrics so HAMi can associate usage with the workload Pod. The sidecar reads Lupine's `/metrics` over loopback on `devices.remotegpu.defaultPort` and serves HAMi metrics on `devices.remotegpu.monitor.port` (31993 by default).

### Scrape with Prometheus

The chart creates a ClusterIP Service named `<chart-fullname>-remote-monitor`. It also creates a ServiceMonitor when `prometheus.enabled` is `true` and the ServiceMonitor CRD is installed before the chart is applied. Configure your Prometheus instance to select that ServiceMonitor. Its `remote-metrics` endpoint scrapes `/metrics` on the Lupine server Pods.

### Check readiness and metrics

Find the monitor Service in the HAMi namespace, then forward its port. Adjust `namespace` and `service` to match your release. Port forwarding checks one server Pod selected by the Service. If you changed the monitor port, replace the second `31993` with the configured Service port.

```bash
namespace=kube-system
service=hami-remote-monitor
kubectl -n "$namespace" get svc -l app.kubernetes.io/component=hami-lupine-server
kubectl -n "$namespace" port-forward "svc/$service" 31993:31993
```

In another terminal:

```bash
curl --fail --show-error --silent --output /dev/null http://127.0.0.1:31993/readyz
curl --fail --show-error --silent http://127.0.0.1:31993/metrics
```

`/readyz` returns HTTP 200 once the monitor has synchronized its Kubernetes Pod cache. Check `hami_remote_gpumonitor_collect_success` in the metrics output to verify collection. A value of `0` means collection failed. Check the `remote-gpu-monitor` container logs and confirm that the Lupine server exposes `/metrics` on the configured port.

Look for `hami_vgpu_memory_used_bytes`, `hami_vgpu_memory_limit_bytes`, and `hami_container_device_utilization_ratio` for workloads with attributable samples. Host GPU usage is exposed through `hami_host_gpu_memory_used_bytes` and `hami_host_gpu_utilization_ratio`. The `node` label identifies the GPU server node.

## Run the CUDA example

From the HAMi source checkout, use [default_use.yaml](https://github.com/Project-HAMi/HAMi/blob/master/examples/remotegpu/default_use.yaml):

```bash
kubectl apply -f examples/remotegpu/default_use.yaml
kubectl wait --for=jsonpath='{.status.phase}'=Succeeded pod/remote-gpu-pod --timeout=600s
kubectl logs remote-gpu-pod -c cuda-container
kubectl delete -f examples/remotegpu/default_use.yaml
```

The example uses `nvidia/cuda:13.0.2-devel-ubuntu24.04`, requests two remote GPUs and limits each to 3000 MiB. It compiles an `sm_80` kernel and checks that each GPU returns `42` for `35 + 7`. Change the compilation architecture when targeting a different GPU generation. Use the computation result to verify the remote CUDA path. HAMi also delivers a Lupine-compatible `nvidia-smi` when automatic client library delivery is enabled.

## Run the vLLM example

Use [vllm_deployment.yaml](https://github.com/Project-HAMi/HAMi/blob/master/examples/remotegpu/vllm_deployment.yaml):

```bash
kubectl apply -f examples/remotegpu/vllm_deployment.yaml
kubectl rollout status deployment/vllm-remote-gpu --timeout=900s
kubectl port-forward service/vllm-remote-gpu 8000:8000
```

In another terminal, request a completion:

```bash
curl -fsS http://127.0.0.1:8000/v1/completions \
  -H 'Content-Type: application/json' \
  -d '{"model":"Qwen/Qwen3-8B","prompt":"The capital of France is","max_tokens":16,"temperature":0}'
```

:::note Libraries loaded by absolute path

This vLLM image loads NCCL by absolute path, so the example mounts `libnccl.so.2` at `/usr/local/lib/python3.12/dist-packages/nvidia/nccl/lib/libnccl.so.2`. Check this path when changing the image; other libraries loaded by absolute path need similar handling.

:::

## Library delivery and compatibility

HAMi uses an init container to inject Lupine interception libraries. The CUDA/NVML libraries and `libnghttp2.so.14` are mounted as individual files in `/usr/local/nvidia/lib64`, which is already in the example images' library search paths. Custom images may not use this path, so automatic injection may not work. See [HAMi issue #3250](https://github.com/Project-HAMi/HAMi/issues/3250).

When memory enforcement is enabled, another init container delivers HAMi-core and adds it to `LD_PRELOAD`. HAMi-core forwards CUDA calls to Lupine, whose libraries load on demand.

For an image that supplies its own libraries, set this **Pod** annotation:

```yaml
hami.io/remote-gpu-client-injection: "disabled"
```

This disables automatic Lupine library delivery for that Pod. Server endpoint injection, workload identity and configured HAMi-core memory enforcement still apply. The workload must supply any libraries used by explicit mounts, such as the NCCL mount above.
