---
title: Remote GPU access with Lupine
sidebar_label: Remote GPU
---

HAMi can schedule a workload on a client node while its CUDA calls execute on a separate GPU server through [Lupine](https://github.com/lupinemachines/lupine). The client node can be CPU-only and does not need an NVIDIA driver. HAMi selects the server and delivers the client libraries automatically.

## Prerequisites

- Use a HAMi chart and images that include remote GPU client delivery. This guide describes the unreleased version; do not assume an older release includes these settings. See [Building HAMi](../../developers/build.md) when building from source.
- GPU server nodes need NVIDIA drivers and the NVIDIA container runtime. Workload client nodes must be separate from the GPU server nodes.
- Client Pods must reach the server node's InternalIP over TCP, on port `14833` by default.
- Enable the HAMi admission webhook and use compatible Lupine client/server builds and workload ABIs.

Automatic library delivery currently targets the supplied amd64 Ubuntu 24.04 CUDA and vLLM example images. Other images may need additional integration; see [Library delivery and compatibility](#library-delivery-and-compatibility).

## Configure the server

In the HAMi source checkout, create `remote-values.yaml`. Replace `gpu-server-1` with your GPU node name and `<matching-hami-build-tag>` with the tag of your HAMi build:

```yaml
global:
  imageTag: "<matching-hami-build-tag>"
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
    defaultPort: 14833
    clientImage: ghcr.io/lupinemachines/lupine-client:cuda-13.3.1-ubuntu24.04
    server:
      enabled: true
      runtimeClassName: nvidia
      image:
        registry: ghcr.io
        repository: lupinemachines/lupine-server
        tag: cuda-13.3.1-ubuntu24.04
```

Set `runtimeClassName` to an existing RuntimeClass that selects the NVIDIA runtime. Leave it empty if NVIDIA is already the default runtime. Preserve other node configuration entries and your existing Helm settings when upgrading an installation.

```bash
kubectl label node gpu-server-1 gpu=on --overwrite
helm upgrade --install hami ./charts/hami -n kube-system --create-namespace -f remote-values.yaml
```

The device plugin still runs on the GPU server. In `remote` mode it registers the remote GPU fleet instead of advertising GPUs to the local kubelet, and automatically applies the `hami.io/lupine-server` discovery label. Leave the label value empty for the chart-managed server, which listens on `defaultPort`. Do not label CPU-only client nodes with `gpu=on`.

A nonempty discovery label value specifies the port of a server managed outside the chart; the chart-managed server excludes such nodes. `remote`, `hami-core` and `mig` are alternative operating modes for a node.

Wait for the HAMi scheduler, device plugin and Lupine server Pods to be ready before creating workloads. Inspect the discovery label and server Pods with:

```bash
kubectl get node gpu-server-1 --show-labels
kubectl get pods -n kube-system -o wide
```

### Resource and image settings

| Setting | Meaning |
| --- | --- |
| `nvidia.com/remote-gpu` | Number of physical GPUs on the selected server. |
| `nvidia.com/remote-gpu-memory` | GPU memory quota in MiB **per GPU**, enforced by HAMi-core. |
| `devices.remotegpu.libImage` | Image supplying HAMi-core for memory enforcement. Unset uses the device plugin image; an empty string disables enforcement. |
| `devices.remotegpu.clientImage` | Image supplying Lupine client libraries. An empty string disables automatic client library delivery. |

A workload reserves the **entire GPU server**. Set the GPU count to the server's physical GPU count: the endpoint exposes all its GPUs. A smaller memory quota does not make the remaining server capacity available to another workload. Run the following two-GPU examples sequentially on a server with two A100 GPUs, or use separate servers.

## Run the CUDA example

From the HAMi source checkout, use [default_use.yaml](https://github.com/Project-HAMi/HAMi/blob/master/examples/remotegpu/default_use.yaml):

```bash
kubectl apply -f examples/remotegpu/default_use.yaml
kubectl wait --for=jsonpath='{.status.phase}'=Succeeded pod/remote-gpu-pod --timeout=600s
kubectl logs remote-gpu-pod -c cuda-container
kubectl delete -f examples/remotegpu/default_use.yaml
```

The example uses `nvidia/cuda:13.0.2-devel-ubuntu24.04`, requests two remote GPUs and limits each to 3000 MiB. It compiles an `sm_80` kernel and checks that each GPU returns `42` for `35 + 7`. Change the compilation architecture when targeting a different GPU generation. GPU computation is the check; the image does not include `nvidia-smi` without driver injection.

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

The example uses `vllm/vllm-openai:v0.25.1-ubuntu2404` and serves `Qwen/Qwen3-8B` in float16 with tensor parallelism across two GPUs. Its HAMi quota is 20480 MiB (20 GiB) per GPU. vLLM's `--gpu-memory-utilization=0.8` plans its budget within that memory view; it does not replace the HAMi quota. Host RAM requests/limits are separate from GPU memory.

The context limit is 4096 tokens with at most four sequences. Eager execution, TRITON attention, synchronous CUDA launches and the cuBLAS preference are compatibility settings rather than throughput tuning. The Deployment uses `Recreate` so an update does not require an extra GPU server while the previous replica still holds the current one.

Model download requires Internet access. The example's model cache is temporary; use a PVC for persistence. Remove the workload when finished:

```bash
kubectl delete -f examples/remotegpu/vllm_deployment.yaml
```

### Libraries loaded by absolute path

PyTorch in this vLLM image loads NCCL by absolute path. The example therefore mounts Lupine's `libnccl.so.2` from the injected `hami-lupine-client` volume at:

```text
/usr/local/lib/python3.12/dist-packages/nvidia/nccl/lib/libnccl.so.2
```

This is a standard `volumeMounts` entry using `subPath: libnccl.so.2`, without a library-specific HAMi annotation. The Deployment explicitly declares the volume as `emptyDir` because controllers validate mount references before Pod admission; HAMi reuses and populates it. Recheck the destination path when changing the vLLM image. Other libraries loaded by absolute path can use the same approach.

## Library delivery and compatibility

HAMi adds the `hami-lupine-client` init container and an `emptyDir` containing the client libraries. The full library directory is available at `/opt/lupine/lib`. Individual CUDA/NVML libraries and `libnghttp2.so.14` are mounted into `/usr/local/nvidia/lib64`, already present in the example images' library search paths. Other files in that directory are preserved. HAMi does not inject or change `LD_LIBRARY_PATH`.

The client image must provide `/opt/lupine/lib`, `sh` and `cp`. The init container locates `libnghttp2.so.14` in Debian/Ubuntu multiarch directories or common `/usr/lib64`, `/lib64`, `/usr/lib` and `/lib` directories. A missing library fails initialization with a diagnostic. This accommodates known missing dependencies in the examples; it does not bundle every dependency. The workload image must still provide compatible glibc, OpenSSL and libstdc++.

When memory enforcement is enabled, a separate init container delivers HAMi-core, which is added to `LD_PRELOAD`. HAMi-core forwards CUDA calls to Lupine, whose libraries load on demand. HAMi also supplies `LUPINE_SERVER`, `LUPINE_WORKLOAD_ID` and `NVIDIA_VISIBLE_DEVICES=void` to remote GPU workloads.

For an image that supplies its own libraries, set this **Pod** annotation (under `spec.template.metadata.annotations` for a Deployment):

```yaml
hami.io/remote-gpu-client-injection: "disabled"
```

This disables automatic Lupine library delivery for that Pod. Server endpoint injection, workload identity and configured HAMi-core memory enforcement still apply. Disabling delivery also means the workload must supply any libraries used by explicit mounts such as the NCCL mount above.

GPU memory quotas require compatible Lupine NVML RPC support, including `nvmlDeviceGetProcessUtilization`, and HAMi-core with missing NVML symbol guards (upstream commit `a3bae57` or later). An unavailable `nvmlDeviceGetP2PStatus` can produce a vLLM NVLink detection error while startup continues; check readiness and an actual inference request to determine workload health.
