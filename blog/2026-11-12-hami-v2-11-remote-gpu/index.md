---
title: "HAMi v2.11 Remote GPU in Practice: Run CUDA Anywhere"
date: "2026-11-12"
slug: hami-v2-11-remote-gpu
description: "Deploy HAMi v2.11 Remote GPU, run CUDA Samples and vLLM on a CPU-only Kubernetes node, and verify real inference on a remote Tesla T4."
authors: [lixd]
tags: ["HAMi", "GPU", "Kubernetes", { label: "vLLM", permalink: "vllm" }]
---

HAMi v2.11.0 introduces **Remote GPU access**, allowing CPU-only machines to use GPUs on other machines. CUDA workloads and GPU resources can now run on separate nodes.

Running CUDA or vLLM on Kubernetes usually means scheduling the Pod onto a GPU node. With Remote GPU, the Pod can run on a separate CPU node and use a GPU Server over the network. The client needs neither a local GPU nor an NVIDIA driver.

<!-- truncate -->

## 1. Introducing Lupine Remote GPU

Lupine is a `GPU-over-IP` project that lets CPU-only machines run CUDA workloads using GPUs on other machines over the network.

Lupine has two node roles:

- The Server has the GPU, an NVIDIA driver, and the Lupine server process. It receives remote CUDA calls, executes GPU computation, and returns the results.
- The Client runs the CUDA application. Lupine client libraries forward CUDA calls to the Server over the network, without a local GPU or NVIDIA driver.

![Local GPU and Remote GPU execution paths](/img/blog/hami-v2-11-remote-gpu/en/remote-gpu-principle.svg#light-only) ![Local GPU and Remote GPU execution paths](/img/blog/hami-v2-11-remote-gpu/en/remote-gpu-principle-dark.svg#dark-only)

The application process runs on the CPU Client. Client libraries forward CUDA calls to the GPU Server, where the driver accesses the GPU, performs the computation, and returns the results.

## 2. How HAMi integrates Remote GPU

With HAMi Remote GPU, the Client and Server run on different nodes in the same Kubernetes cluster. GPU nodes provide Server resources, while applications can run on CPU-only nodes and access those GPUs over the network.

Integrating this into Kubernetes requires resource discovery, Server selection, and client setup. HAMi identifies nodes that can provide remote GPUs, assigns a Server to each Pod, and prepares the client libraries and connection address before the application starts.

![HAMi Remote GPU architecture](/img/blog/hami-v2-11-remote-gpu/en/remote-gpu-architecture.svg#light-only) ![HAMi Remote GPU architecture](/img/blog/hami-v2-11-remote-gpu/en/remote-gpu-architecture-dark.svg#dark-only)

### 2.1 Register a GPU node as a Server

Administrators select remote mode with `operatingmode: remote`. The Device Plugin registers GPU information as remote resources and automatically adds the `hami.io/lupine-server` discovery label to the node. The remote server runs on the GPU node and provides the CUDA endpoint for workloads.

HAMi can then discover GPU Servers available for allocation. Node labels can also group Servers into resource pools for different workloads.

### 2.2 Select the Client and GPU Server for a Pod

A workload requests remote GPUs with `nvidia.com/remote-gpu`. The optional `nvidia.com/remote-gpu-memory` resource sets a memory quota in MiB per GPU.

This Pod excerpt places the application on a CPU node, requests one remote GPU, and sets a 3000 MiB memory quota per GPU:

```yaml
spec:
  nodeSelector:
    kubernetes.io/hostname: cpu-client-01
  containers:
    - name: cuda
      image: nvidia/cuda:13.0.2-devel-ubuntu24.04
      command: ["nvidia-smi", "-L"]
      resources:
        limits:
          nvidia.com/remote-gpu: 1 # Remote GPU count
          nvidia.com/remote-gpu-memory: 3000 # Memory quota per GPU, in MiB
```

Scheduling determines two locations: the Client node running the Pod and the Server providing the GPU. Here, `nodeSelector` pins the Pod to a CPU node, while HAMi assigns the remote Server.

> To select a particular resource pool, a Pod can set the `hami.io/remote-server` annotation.

:::warning Current limitation

A workload reserves the entire GPU server. The endpoint exposes all its GPUs, so set the GPU count to the server's physical GPU count. A smaller memory quota does not make the remaining server capacity available to another workload. Run the test Pods in this post sequentially, or use separate servers.

:::

### 2.3 Prepare the application client environment

After allocation, the application needs the client libraries and the address of its assigned Server.

HAMi delivers Lupine client libraries and a compatible `nvidia-smi` through an init container, mounts the libraries into the application container, and injects the selected endpoint through `LUPINE_SERVER`. When memory enforcement is enabled, it also delivers HAMi-core and adds it to the call path through `LD_PRELOAD` to enforce the memory quota.

The following excerpt shows the injected init containers and key fields for a workload with a memory quota:

> HAMi injects these fields. They do not need to be added to the workload manifest.

```yaml
spec:
  initContainers:
    - name: hami-remote-gpu-lib
      image: docker.m.daocloud.io/projecthami/hami:v2.11.0
      volumeMounts:
        - name: hami-remote-gpu-lib
          mountPath: /hami-remote-gpu
    - name: hami-lupine-client
      image: ghcr.io/lupinemachines/lupine-client:cuda-13.3.1-ubuntu24.04
      volumeMounts:
        - name: hami-lupine-client
          mountPath: /lupine-lib
  containers:
    - name: vllm
      env:
        - name: LUPINE_SERVER
          valueFrom:
            fieldRef:
              fieldPath: metadata.annotations['hami.io/lupine-endpoint']
        - name: LD_PRELOAD
          value: /hami-remote-gpu/libvgpu.so
        - name: CUDA_DEVICE_MEMORY_LIMIT
          value: 15360m
      volumeMounts:
        - name: hami-remote-gpu-lib
          mountPath: /hami-remote-gpu
        - name: hami-lupine-client
          mountPath: /opt/lupine/lib
          readOnly: true
  volumes:
    - name: hami-remote-gpu-lib
      emptyDir: {}
    - name: hami-lupine-client
      emptyDir: {}
```

| Init container | Purpose | Exit code |
| --- | --- | --- |
| `hami-remote-gpu-lib` | Copies HAMi-core `libvgpu.so` into a shared volume | 0 |
| `hami-lupine-client` | Copies Lupine client libraries, dependencies, and a compatible `nvidia-smi` into a shared volume | 0 |

Both shared volumes use `emptyDir`. The init containers write the files before the application container mounts them.

### 2.4 Start the application and execute remote CUDA calls

Once its client environment is ready, the application starts on the CPU Client. Its CUDA calls pass through the client libraries to the assigned GPU Server, which executes them on the GPU and returns the results.

## 3. Environment and deployment

### 3.1 Prepare a Kubernetes cluster

Prepare a Kubernetes cluster with a GPU node and a CPU-only node.

Node names in the manifests and captured output use example names. Replace them with the actual node names in your cluster.

| Component               | Test environment                                             |
| ----------------------- | ------------------------------------------------------------ |
| GPU Server              | `gpu-server-01`, 8 vCPU, 16 GiB RAM, Tesla T4 with 15360 MiB |
| CPU Client              | `cpu-client-01`, 4 vCPU, about 8 GiB RAM, no GPU             |
| Kubernetes / containerd | v1.37.0 / 2.2.4                                              |
| HAMi                    | v2.11.0                                                      |

Pods on the CPU Client must be able to reach the GPU Server's InternalIP. The default server port is TCP 14833.

List the cluster nodes. Replace the node names in subsequent commands and YAML with those from your cluster.

```bash
kubectl get nodes
```

Both test nodes were Ready:

```text
NAME            STATUS   ROLES           VERSION
cpu-client-01   Ready    <none>          v1.37.0
gpu-server-01   Ready    control-plane   v1.37.0
```

The GPU Server in this example is also a master (control-plane) node. Remove any control-plane `NoSchedule` taint before deployment so the HAMi Device Plugin and Lupine Server can be scheduled on that node.

### 3.2 Deploy GPU Operator

GPU Operator installs the NVIDIA driver, Container Toolkit, and monitoring components. Disable the native NVIDIA Device Plugin so HAMi can manage the GPUs.

```bash
helm repo add nvidia https://helm.ngc.nvidia.com/nvidia
helm repo update

helm upgrade --install gpu-operator nvidia/gpu-operator \
  -n gpu-operator --create-namespace \
  --version=v26.3.1 \
  --set driver.enabled=true \
  --set devicePlugin.enabled=false \
  --wait
```

> If the node already has an NVIDIA driver, set `driver.enabled` to `false`.

### 3.3 Install HAMi and enable Remote GPU

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update hami-charts
```

Install HAMi with Remote GPU enabled:

```bash
kubectl get runtimeclass

helm upgrade --install hami hami-charts/hami \
  --version 2.11.0 -n hami-system --create-namespace \
  --set devices.remotegpu.enabled=true \
  --set devices.nvidia.runtimeClassName=nvidia \
  --set devices.remotegpu.server.runtimeClassName=nvidia \
  --wait
```

After installation, update the Device Plugin node configuration to switch the GPU Server to `remote` mode:

```bash
kubectl -n hami-system patch configmap hami-device-plugin \
  --type=merge --patch-file=/dev/stdin <<'EOF'
data:
  config.json: |
    {
      "nodeconfig": [
        {
          "name": "gpu-server-01",
          "operatingmode": "remote"
        }
      ]
    }
EOF

kubectl -n hami-system rollout restart daemonset/hami-device-plugin
kubectl -n hami-system rollout status daemonset/hami-device-plugin --timeout=180s
```

The Device Plugin adds the discovery label to the GPU Server, and the remote server is scheduled onto that node.

Finally, label the node `gpu=on`. HAMi does not manage nodes without this label.

```bash
# kubectl label nodes {nodeid} gpu=on
kubectl label nodes gpu-server-01 gpu=on --overwrite
```

### 3.4 Check the deployment

Check that the GPU Server has the `hami.io/lupine-server` label and that the HAMi components are ready.

```bash
kubectl get nodes -l hami.io/lupine-server -o wide
kubectl -n hami-system get pods -o wide
```

The components in this test were:

```text
NAME                             READY   STATUS    NODE
hami-device-plugin-cphp2         2/2     Running   gpu-server-01
hami-lupine-server-4xjb8         1/1     Running   gpu-server-01
hami-scheduler-c9c5cf696-lgvgn   2/2     Running   cpu-client-01
```

Query the GPU from the remote server container to confirm that the Server can access the device.

```bash
kubectl -n hami-system exec daemonset/hami-lupine-server -- \
  nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
```

The output was:

```text
Tesla T4, 15360 MiB
```

The GPU Server is ready. Next, run CUDA Samples and vLLM on the CPU Client to verify allocation and actual GPU computation.

## 4. Verify Remote GPU

### 4.1 Inspect the remote GPU

Create a Pod that stays running on the CPU node, then use `kubectl exec` to run `nvidia-smi` and confirm that the remote GPU is visible. Save the following as `remote-gpu-smi.yaml`, replacing `nodeSelector` with the actual CPU node name.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: remote-gpu-smi
  namespace: default
spec:
  nodeSelector:
    kubernetes.io/hostname: cpu-client-01
  restartPolicy: Never
  containers:
    - name: smi
      image: vllm/vllm-openai:v0.25.1-ubuntu2404
      command: ["sleep", "infinity"]
      resources:
        limits:
          nvidia.com/remote-gpu: 1
```

Create the Pod, wait for it to become ready, and check its placement.

```bash
kubectl apply -f remote-gpu-smi.yaml
```

The Pod runs on the CPU node `cpu-client-01`:

```text
NAME             READY   STATUS    RESTARTS   AGE   IP              NODE         NOMINATED NODE   READINESS GATES
remote-gpu-smi   1/1     Running   0          13s   172.25.58.225   cpu-client-01   <none>           <none>
```

Run the query inside the container:

```bash
kubectl exec remote-gpu-smi -c smi -- nvidia-smi
```

The full `nvidia-smi` output was:

```text
Tue Nov 10 04:25:13 2026
+-----------------------------------------------------------------------------------------+
| NVIDIA-SMI 615.71.09              KMD Version: 580.178.04    CUDA UMD Version: 13.3     |
+-----------------------------------------+------------------------+----------------------+
| GPU  Name                 Persistence-M | Bus-Id          Disp.A | Volatile Uncorr. ECC |
| Fan  Temp   Perf          Pwr:Usage/Cap |           Memory-Usage | GPU-Util  Compute M. |
|                                         |                        |               MIG M. |
|=========================================+========================+======================|
|   0  Tesla T4 (via lupine 172...    Off |   00000000:00:06.0 Off |                    0 |
| N/A   34C    P8             15W /   70W |       0MiB /  15360MiB |      0%      Default |
|                                         |                        |                  N/A |
+-----------------------------------------+------------------------+----------------------+

+-----------------------------------------------------------------------------------------+
| Processes:                                                                              |
|  GPU   GI   CI              PID   Type   Process name                        GPU Memory |
|        ID   ID                                                               Usage      |
|=========================================================================================|
|  No running processes found                                                             |
+-----------------------------------------------------------------------------------------+
```

The remote Tesla T4 is visible with 15360 MiB of memory. Its device name includes `via lupine`.

The `sleep` command keeps the Pod running and retains its remote GPU allocation. Delete this Pod before running the CUDA examples.

```bash
kubectl delete pod remote-gpu-smi
```

### 4.2 Run the official NVIDIA CUDA Samples

Before loading a model, verify CUDA independently. Two basic NVIDIA CUDA Samples check device discovery and actual computation.

| Sample | What it checks | Observed result |
| --- | --- | --- |
| `deviceQuery` | Device count, name, compute capability, and memory through the CUDA Runtime | One Tesla T4, compute capability 7.5, 3000 MiB visible memory, `Result = PASS` |
| `vectorAdd` | GPU memory allocation, input upload, vector-add kernel execution, result download, and element-by-element CPU verification | 50,000 elements computed correctly, `Test PASSED` |

`deviceQuery` can also print PASS when no device is found, so check the device count and name. The manifest adds a device-count check, then runs `vectorAdd` to verify data transfers and kernel results.

Prepare the source on the CPU Client, pinned to `v13.0` to match CUDA 13.0 in the image.

```bash
git clone --depth 1 --branch v13.0 --filter=blob:none --sparse \
  https://github.com/NVIDIA/cuda-samples.git /opt/cuda-samples-hami-v13.0
git -C /opt/cuda-samples-hami-v13.0 sparse-checkout set \
  Common Samples/1_Utilities/deviceQuery Samples/0_Introduction/vectorAdd
```

Save the following as `cuda-samples-pod.yaml`, replacing `nodeSelector` with the actual CPU node name.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: cuda-samples-remote
  namespace: default
spec:
  nodeSelector:
    kubernetes.io/hostname: cpu-client-01
  restartPolicy: Never
  containers:
    - name: cuda-samples
      image: vllm/vllm-openai:v0.25.1-ubuntu2404
      command: ["bash", "-ec"]
      args:
        - |
          set -o pipefail
          NVCC=/usr/local/cuda-13.0/bin/nvcc
          cd /tmp

          "$NVCC" -std=c++17 -O2 -arch=sm_75 -I/samples/Common \
            /samples/Samples/1_Utilities/deviceQuery/deviceQuery.cpp -o deviceQuery
          "$NVCC" -std=c++17 -O2 -arch=sm_75 -I/samples/Common \
            /samples/Samples/0_Introduction/vectorAdd/vectorAdd.cu -o vectorAdd

          ./deviceQuery | tee /tmp/device-query.log
          grep -Eq 'Detected [1-9][0-9]* CUDA Capable device' /tmp/device-query.log
          ./vectorAdd
          echo "REMOTE CUDA SAMPLES PASS"
      resources:
        requests:
          cpu: "1"
          memory: 1Gi
        limits:
          cpu: "2"
          memory: 2Gi
          nvidia.com/remote-gpu: 1
          nvidia.com/remote-gpu-memory: 3000
      volumeMounts:
        - name: samples
          mountPath: /samples
          readOnly: true
  volumes:
    - name: samples
      hostPath:
        path: /opt/cuda-samples-hami-v13.0
        type: Directory
```

Create the Pod from a terminal with cluster access and wait for execution to finish.

```bash
kubectl apply -f cuda-samples-pod.yaml
kubectl logs cuda-samples-remote -c cuda-samples
```

The Pod ran on the CPU-only node and produced:

```text
Detected 1 CUDA Capable device(s)
Device 0: "Tesla T4"
Result = PASS
```

```text
[Vector addition of 50000 elements]
Test PASSED
Done
REMOTE CUDA SAMPLES PASS
```

Delete the Pod after completion to release the Server reservation before running vLLM.

```bash
kubectl delete pod cuda-samples-remote
```

### 4.3 Deploy vLLM on the CPU node

> Prepare the `Qwen2.5-0.5B-Instruct` model on the CPU Client under `/opt/models/Qwen2.5-0.5B-Instruct` before continuing.

Save the following as `vllm-remote.yaml`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: vllm-remote
spec:
  nodeSelector:
    kubernetes.io/hostname: cpu-client-01
  containers:
    - name: vllm
      image: vllm/vllm-openai:v0.25.1-ubuntu2404
      command: ["vllm", "serve", "/models/Qwen2.5-0.5B-Instruct"]
      args:
        - --served-model-name=qwen
        - --dtype=float16
        - --gpu-memory-utilization=0.7
        - --max-model-len=1024
        - --max-num-seqs=4
        - --enforce-eager
        - --attention-config.backend=TRITON_ATTN
      env:
        - name: TORCH_BLAS_PREFER_CUBLASLT
          value: "0"
        - name: CUDA_LAUNCH_BLOCKING
          value: "1"
      readinessProbe:
        httpGet:
          path: /health
          port: 8000
      resources:
        limits:
          nvidia.com/remote-gpu: 1
      volumeMounts:
        - name: models
          mountPath: /models
          readOnly: true
  volumes:
    - name: models
      hostPath:
        path: /opt/models
```

The Pod requests one remote GPU. `gpu-memory-utilization=0.7` controls the fraction of GPU memory vLLM uses.

`--enforce-eager` and `CUDA_LAUNCH_BLOCKING=1` follow the official example.

Create the Pod, wait for the service to become ready, and inspect its placement and startup logs.

```bash
kubectl apply -f vllm-remote.yaml

kubectl get pod vllm-remote \
  -o jsonpath='{.spec.nodeName}{"\n"}{.metadata.annotations.hami\.io/lupine-endpoint}{"\n"}'
```

The allocation in this test was:

```text
cpu-client-01
172.16.131.132:14833
```

After the Pod enters Running, wait for model loading to finish. A 200 response from `/health` indicates that the service is ready. Run `nvidia-smi` on the GPU Server host to inspect memory use and GPU processes.

```bash
nvidia-smi
```

The full output after model loading was:

```text
Tue Nov 10 05:55:16 2026
+-----------------------------------------------------------------------------------------+
| NVIDIA-SMI 580.178.04             Driver Version: 580.178.04     CUDA Version: 13.0     |
+-----------------------------------------+------------------------+----------------------+
| GPU  Name                 Persistence-M | Bus-Id          Disp.A | Volatile Uncorr. ECC |
| Fan  Temp   Perf          Pwr:Usage/Cap |           Memory-Usage | GPU-Util  Compute M. |
|                                         |                        |               MIG M. |
|=========================================+========================+======================|
|   0  Tesla T4                       Off |   00000000:00:06.0 Off |                    0 |
| N/A   41C    P0             28W /   70W |   10765MiB /  15360MiB |      0%      Default |
|                                         |                        |                  N/A |
+-----------------------------------------+------------------------+----------------------+

+-----------------------------------------------------------------------------------------+
| Processes:                                                                              |
|  GPU   GI   CI              PID   Type   Process name                        GPU Memory |
|        ID   ID                                                               Usage      |
|=========================================================================================|
|    0   N/A  N/A         3442254      C   ...pine/bin/lupine_driver_server        122MiB |
|    0   N/A  N/A         3443585      C   ...pine/bin/lupine_driver_server      10640MiB |
+-----------------------------------------------------------------------------------------+
```

T4 memory use increased to 10765 MiB. The `lupine_driver_server` processes run on the GPU Server and execute GPU computation. The vLLM application process runs on the CPU Client.

Send a request through the OpenAI-compatible API from a machine that can reach the Pod network. This test sent the request from the GPU node to the vLLM service on the CPU node.

```bash
POD_IP=$(kubectl get pod vllm-remote \
  -o jsonpath='{.status.podIP}')
curl --fail --silent --show-error -o /dev/null -w '%{http_code}\n' \
  "http://${POD_IP}:8000/health"

curl --fail-with-body "http://${POD_IP}:8000/v1/chat/completions" \
  -H 'Content-Type: application/json' \
  -d '{"model":"qwen","messages":[{"role":"user","content":"用一句话解释 Kubernetes。"}],"max_tokens":64,"temperature":0}'
```

The original response was in Chinese:

> Kubernetes（简称K8s）是一种开源的容器编排平台，它允许用户定义和管理应用程序在多个节点上的部署、运行和扩展。通过使用Kubernetes，开发者可以轻松地创建、管理和维护复杂的容器化应用集群，从而提高开发效率和资源利用率。

We have now successfully completed an inference request using Remote GPU.

Delete the test Pod when finished to release the remote GPU resources.

```bash
kubectl delete pod vllm-remote
```

## 5. Use cases and challenges

### 5.1 Why separate the application from the GPU?

Lupine describes itself as a GPU-over-IP bridge that lets CPU-only machines access GPUs over the network. HAMi adds the Kubernetes workflow: the workload runs on a Client node, CUDA calls execute on a separate GPU Server, and HAMi selects that Server and delivers the client libraries.

This separates CPU and GPU placement. The machine providing application CPU and memory can be selected independently from the machine providing the GPU.

Remote GPU offers another deployment option. Whether it helps a particular workload requires measurement.

### 5.2 Scenarios to try

This execution model is useful to explore in the following scenarios.

**Applications with substantial CPU or memory needs.** Preprocessing, postprocessing, and GPU computation may need different resource ratios. Running the application on a suitable CPU node and using a separate GPU Server allows each side to be sized independently. Data transfer costs still need evaluation. A [GPU API Remoting study](https://arxiv.org/html/2401.13354v1#S2.SS2) also identifies mismatches between fixed CPU/GPU ratios and application needs as a motivation for disaggregation.

**Centralized GPUs with distributed applications.** Maintaining GPUs and drivers on Servers while applications access them from different CPU nodes offers another deployment model. Start by verifying separate CPU Clients and GPU Servers within a HAMi cluster. Sharing, isolation, and scheduling capabilities need to be checked for the specific implementation.

**Development and functional testing.** Test nodes without GPUs can use remote GPUs to validate CUDA programs, frameworks, and models. The sequence in this post checks device visibility with `nvidia-smi`, actual CUDA computation with CUDA Samples, and inference responses with vLLM. A CPU-only runner accessing a remote GPU could use the same sequence for functional tests.

### 5.3 What to check before use

**Performance depends on both the network and the remote-call implementation.** CUDA calls and related data travel between Client and Server. Frequent synchronization magnifies round-trip latency, while large transfers consume bandwidth. Serialization, deserialization, and call forwarding add software overhead. The [GPU API Remoting study](https://arxiv.org/html/2401.13354v1#S3) analyzes these costs and the effect of asynchronous execution. Network bandwidth alone cannot predict performance, and throughput loss cannot all be attributed to the network. This post verifies functionality; application latency and throughput still need measurement.

**A driver-free client still needs a compatible environment.** HAMi automatic library delivery currently targets the supplied amd64 Ubuntu 24.04 CUDA and vLLM example images. Custom images may need changes to library search paths, and libraries loaded by absolute path need separate checks. Re-run basic computation and application verification after changing CUDA, framework, or image versions.

**Troubleshooting covers both ends.** Application startup failures and interrupted inference require checks of the Client, network, remote service, and GPU Server. Test recovery after a connection loss or Server restart, as well as long-running stability, before production use.

## 6. Results

HAMi v2.11 Remote GPU ran CUDA Samples and vLLM inference on a CPU node with neither a GPU nor an NVIDIA driver. The application process ran on the CPU Client, while a T4 on another node performed the GPU computation. The tests covered remote device discovery, CUDA computation, and model inference.

Applications can use a CPU node for compute and memory while accessing a GPU Server over the network. HAMi connects remote GPU discovery, allocation, and client setup to its scheduling workflow, so this deployment can be managed through familiar Pod resource requests.

For platforms exploring separate CPU and GPU placement or centralized GPU capacity, these functional tests provide a starting point for evaluating the deployment model.

## Further reading

- [HAMi v2.11.0 release overview](/blog/hami-v2-11-0-release)
- [Remote GPU user guide](/docs/userguide/nvidia-device/remote-gpu)
- [HAMi v2.11.0 Remote GPU examples](https://github.com/Project-HAMi/HAMi/tree/v2.11.0/examples/remotegpu)
- [Characterizing Network Requirements for GPU API Remoting in AI Applications](https://arxiv.org/abs/2401.13354)
