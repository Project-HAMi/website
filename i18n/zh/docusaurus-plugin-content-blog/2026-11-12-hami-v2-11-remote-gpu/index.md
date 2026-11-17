---
title: "HAMi v2.11 Remote GPU 实战：Run CUDA Anywhere"
date: "2026-11-12"
slug: hami-v2-11-remote-gpu
description: "介绍 HAMi v2.11 Remote GPU 的部署方式，在纯 CPU Kubernetes 节点运行 CUDA Samples 和 vLLM，通过远端 T4 完成真实推理。"
authors: [lixd]
tags: ["HAMi", "GPU", "Kubernetes", { label: "vLLM", permalink: "vllm" }]
---

HAMi v2.11.0 新增了 **Remote GPU（远程 GPU 访问）** 功能，可以让 CPU-only 机器访问其他机器上的 GPU，该功能可以让 CUDA 工作负载与 GPU 资源可以跨节点部署。

以往在 Kubernetes 中运行 CUDA 或 vLLM 工作负载，通常需要将 Pod 调度到 GPU 所在的节点。现在，Pod 可以运行在独立的 CPU 节点上，通过网络使用 GPU Server 提供的算力，客户端无需本地 GPU 和 NVIDIA 驱动。

<!-- truncate -->

## 1. Lupine Remote GPU 介绍

Lupine 是一个 `GPU-over-IP` 项目，可以让 CPU-only 机器通过网络使用其他机器上的 GPU，运行 CUDA 工作负载。

在 Lupine 中节点角色分为 Server 节点和 Client 节点。

- Server 节点拥有 GPU，需要安装 NVIDIA 驱动并运行 Lupine 服务端，负责接收远程 CUDA 调用、执行 GPU 计算并返回结果。
- Client 节点运行 CUDA 应用，通过加载 Lupine 客户端库，将 CUDA 调用经网络转发给 Server，无需本地 GPU 和 NVIDIA 驱动。

![本地 GPU 与 Remote GPU 的工作原理对比](/img/blog/hami-v2-11-remote-gpu/zh/remote-gpu-principle.svg#light-only) ![本地 GPU 与 Remote GPU 的工作原理对比](/img/blog/hami-v2-11-remote-gpu/zh/remote-gpu-principle-dark.svg#dark-only)

应用进程运行在 CPU Client，客户端库将 CUDA 调用通过网络转发给 GPU Server，由服务端驱动访问 GPU 执行计算，再返回调用结果。

## 2. HAMi 如何集成 Remote GPU

在 HAMi 的 Remote GPU 中，Client 与 Server 分别部署在同一个集群的不同节点上，或者说可以指定集群中的 GPU 节点作为 Server 提供计算资源，应用程序可以运行在 CPU-Only 节点，通过网络远程访问 Server 上的 GPU。

将这套能力接入 Kubernetes，需要解决几个问题。哪些节点可以提供远程 GPU？一个 Pod 应该使用哪台 Server？应用启动时，客户端库和连接地址如何准备？HAMi 将这些工作接入了资源发现、调度和 Pod 注入流程。

![HAMi Remote GPU 控制面与远程 CUDA 调用架构](/img/blog/hami-v2-11-remote-gpu/zh/remote-gpu-architecture.svg#light-only) ![HAMi Remote GPU 控制面与远程 CUDA 调用架构](/img/blog/hami-v2-11-remote-gpu/zh/remote-gpu-architecture-dark.svg#dark-only)

### 2.1 将 GPU 节点注册为 Server

管理员通过 `operatingmode: remote` 指定 GPU 节点的运行模式。Device Plugin 将 GPU 信息注册为远程资源，并自动为节点添加 `hami.io/lupine-server` 发现标签，供 HAMi 选择 GPU Server。远程服务端在 GPU 节点运行，为后续工作负载提供 CUDA 调用入口。

这样，HAMi 就能发现集群中可供分配的 GPU Server。服务器还可以按节点标签划分资源池，供不同工作负载选择。

### 2.2 为 Pod 选择 Client 和 GPU Server

工作负载通过 `nvidia.com/remote-gpu` 声明远程 GPU 需求，还可以通过 `nvidia.com/remote-gpu-memory` 指定每张卡的显存配额，单位为 MiB。

下面摘录 Pod 的关键配置，将应用放到 CPU 节点，申请 1 张远程 GPU，并设置每张卡的显存配额为 3000 MiB。

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
          nvidia.com/remote-gpu: 1 # 远程 GPU 数量
          nvidia.com/remote-gpu-memory: 3000 # 每张 GPU 的显存配额，单位 MiB
```

调度时需要确定两个位置。一处是 Pod 实际运行的 Client 节点，另一处是提供 GPU 的 Server。本文通过 `nodeSelector` 将 Pod 放在指定 CPU 节点上，再由 HAMi 为它分配远端 Server。

> 如果需要选择特定资源池，Pod 可以设置 `hami.io/remote-server` 注解。

:::warning 当前版本限制

一个工作负载独占整个 GPU 服务端。GPU 数量应设为该服务端的物理卡数，因为端点会暴露其全部 GPU。设置较小显存限额不会让其他工作负载共享剩余服务端容量。本文后续测试 Pod 应依次运行，或分别使用不同 GPU 服务端。

:::

### 2.3 为应用准备客户端环境

应用被分配到远程 GPU 后，还需要能加载客户端库，并知道连接哪台 Server。

HAMi 通过 init 容器下发 Lupine 客户端库和兼容的 `nvidia-smi`，再将库挂载到应用容器中，同时通过 `LUPINE_SERVER` 环境变量注入所选 Server 的连接地址。启用显存限制时，还会下发 HAMi-core，并通过 `LD_PRELOAD` 将其加入调用链，执行显存配额限制。

下面以启用显存配额的工作负载为例，摘录 HAMi 注入后的 init 容器以及关键信息：

> 这些字段由 HAMi 注入，创建工作负载时不需要额外填写。

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

| init 容器             | 作用                                                         | 退出码 |
| --------------------- | ------------------------------------------------------------ | ------ |
| `hami-remote-gpu-lib` | 将 HAMi-core 的 `libvgpu.so` 复制到共享卷                    | 0      |
| `hami-lupine-client`  | 将 Lupine 客户端库、依赖库和兼容的 `nvidia-smi` 复制到共享卷 | 0      |

两个共享卷均为 `emptyDir`。init 容器先写入文件，应用容器随后挂载使用。

### 2.4 启动应用并执行远程 CUDA 调用

客户端环境准备完成后，应用在 CPU Client 上启动。应用发起 CUDA 调用，经客户端库转发到已分配的 GPU Server，由服务端访问 GPU 完成计算，并返回调用结果。

## 3. 环境准备与部署

### 3.1 准备 Kubernetes 集群

准备一个包含 GPU 节点和纯 CPU 节点的 Kubernetes 集群。

文中清单和输出的节点名统一使用示例名称，复现时请替换为实际节点名。

| 项目                    | 本次环境                                                 |
| ----------------------- | -------------------------------------------------------- |
| GPU Server              | `gpu-server-01`，8 vCPU、16 GiB 内存、Tesla T4 15360 MiB |
| CPU Client              | `cpu-client-01`，4 vCPU、约 8 GiB 内存，纯 CPU 节点      |
| Kubernetes / containerd | v1.37.0 / 2.2.4                                          |
| HAMi                    | v2.11.0                                                  |

CPU Client 上的 Pod 需要能够访问 GPU Server 的 InternalIP，默认服务端口为 TCP 14833。

查看集群节点，后续命令和 YAML 中的节点名需要替换为自己集群中的实际名称。

```bash
kubectl get nodes
```

本次两个节点均为 Ready。

```text
NAME            STATUS   ROLES           VERSION
cpu-client-01   Ready    <none>          v1.37.0
gpu-server-01   Ready    control-plane   v1.37.0
```

本例的 GPU Server 同时是 master（控制平面）节点。如该节点存在控制平面的 `NoSchedule` 污点，部署前需先去除，以免 HAMi Device Plugin 和 Lupine Server 无法调度到该节点。

### 3.2 部署 GPU Operator

由 GPU Operator 安装 NVIDIA Driver、Container Toolkit 和监控组件，关闭原生 NVIDIA Device Plugin，后续由 HAMi 管理 GPU。

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

> 如果节点已经预装 NVIDIA Driver，可以把 `driver.enabled` 改为 `false`。

### 3.3 安装 HAMi 并启用 Remote GPU

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update hami-charts
```

先安装 HAMi，并开启 Remote GPU：

```bash
kubectl get runtimeclass

helm upgrade --install hami hami-charts/hami \
  --version 2.11.0 -n hami-system --create-namespace \
  --set devices.remotegpu.enabled=true \
  --set devices.nvidia.runtimeClassName=nvidia \
  --set devices.remotegpu.server.runtimeClassName=nvidia \
  --wait
```

安装完成后，修改 Device Plugin 的节点配置，将 GPU Server 切换为 `remote` 模式：

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

Device Plugin 会为 GPU Server 添加发现标签，远程服务端随之调度到该节点。

最后给节点打上 `gpu=on` 标签，未标记的节点不会被 HAMi 接管。

```bash
# kubectl label nodes {nodeid} gpu=on
kubectl label nodes gpu-server-01 gpu=on --overwrite
```

### 3.4 检查部署结果

检查 GPU Server 是否获得 `hami.io/lupine-server` 标签，以及 HAMi 各组件是否就绪。

```bash
kubectl get nodes -l hami.io/lupine-server -o wide
kubectl -n hami-system get pods -o wide
```

本次组件状态如下。

```text
NAME                             READY   STATUS    NODE
hami-device-plugin-cphp2         2/2     Running   gpu-server-01
hami-lupine-server-4xjb8         1/1     Running   gpu-server-01
hami-scheduler-c9c5cf696-lgvgn   2/2     Running   cpu-client-01
```

在远程服务容器内查询 GPU，确认服务端能够访问设备。

```bash
kubectl -n hami-system exec daemonset/hami-lupine-server -- \
  nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
```

本次输出如下。

```text
Tesla T4, 15360 MiB
```

到这里，GPU Server 已准备好。接下来在 CPU Client 上运行 CUDA Samples 和 vLLM，验证远程 GPU 的分配与实际计算。

## 4. 实战验证

### 4.1 先查看远程 GPU

先创建一个在 CPU 节点保持运行的 Pod，再通过 `kubectl exec` 执行 `nvidia-smi`，确认容器能看到远端 GPU。创建 `remote-gpu-smi.yaml`，将 `nodeSelector` 改为实际 CPU 节点名称。

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

创建 Pod，等待容器就绪后查看调度位置。

```bash
kubectl apply -f remote-gpu-smi.yaml
```

Pod 运行在 CPU 节点 `cpu-client-01`。

```text
NAME             READY   STATUS    RESTARTS   AGE   IP              NODE         NOMINATED NODE   READINESS GATES
remote-gpu-smi   1/1     Running   0          13s   172.25.58.225   cpu-client-01   <none>           <none>
```

通过 `kubectl exec` 在容器内执行查询。

```bash
kubectl exec remote-gpu-smi -c smi -- nvidia-smi
```

`nvidia-smi` 完整输出如下。

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

可以看到远端 Tesla T4 和 15360 MiB 显存，设备名称中带有 `via lupine`。

Pod 通过 `sleep` 保持运行，仍保留远程 GPU 分配。查看完成后删除测试 Pod，再继续运行 CUDA 示例。

```bash
kubectl delete pod remote-gpu-smi
```

### 4.2 运行 NVIDIA 官方 CUDA Samples

在加载模型前，先独立验证 CUDA。这里选择 NVIDIA CUDA Samples 中的两个基础程序，分别检查设备发现和实际计算。

| 示例 | 验证内容 | 本次验收结果 |
| --- | --- | --- |
| `deviceQuery` | 通过 CUDA Runtime 查询设备数量、名称、计算能力和显存 | 发现 1 张 Tesla T4，计算能力 7.5，可见显存 3000 MiB，`Result = PASS` |
| `vectorAdd` | 分配显存、上传输入、执行向量加法 Kernel、回传结果并由 CPU 逐元素校验 | 50,000 个元素计算正确，`Test PASSED` |

`deviceQuery` 的无设备分支也可能输出 PASS，因此要同时核对设备数和卡名。清单增加了设备数量检查，随后由 `vectorAdd` 验证数据传输和 Kernel 的计算结果。

先在 CPU Client 上准备源码。固定到与镜像内 CUDA 13.0 对应的 `v13.0`。

```bash
git clone --depth 1 --branch v13.0 --filter=blob:none --sparse \
  https://github.com/NVIDIA/cuda-samples.git /opt/cuda-samples-hami-v13.0
git -C /opt/cuda-samples-hami-v13.0 sparse-checkout set \
  Common Samples/1_Utilities/deviceQuery Samples/0_Introduction/vectorAdd
```

创建 `cuda-samples-pod.yaml`，将 `nodeSelector` 改为实际 CPU 节点名称。

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

在能访问集群的终端创建并等待执行完成。

```bash
kubectl apply -f cuda-samples-pod.yaml
kubectl logs cuda-samples-remote -c cuda-samples
```

Pod 实际运行在纯 CPU 节点，输出如下：

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

完成后删除 Pod，释放 Server 预留，再运行 vLLM。

```bash
kubectl delete pod cuda-samples-remote
```

### 4.3 在 CPU 节点部署 vLLM

> 先在 CPU Client 上准备好 `Qwen2.5-0.5B-Instruct` 模型，存放到 `/opt/models/Qwen2.5-0.5B-Instruct` 目录。

创建 `vllm-remote.yaml`。

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

Pod 申请 1 张远程 GPU，`gpu-memory-utilization=0.7` 控制 vLLM 的显存使用比例。

`--enforce-eager` 和 `CUDA_LAUNCH_BLOCKING=1` 沿用官方示例。

创建 Pod，等待服务就绪，再查看调度位置和启动日志。

```bash
kubectl apply -f vllm-remote.yaml

kubectl get pod vllm-remote \
  -o jsonpath='{.spec.nodeName}{"\n"}{.metadata.annotations.hami\.io/lupine-endpoint}{"\n"}'
```

本次分配结果如下。

```text
cpu-client-01
172.16.131.132:14833
```

Pod 进入 Running 后，继续等待模型加载完成，以 `/health` 返回 200 作为服务就绪的依据。在 GPU Server 的宿主机执行 `nvidia-smi`，查看 GPU 显存占用和进程信息。

```bash
nvidia-smi
```

本次模型加载完成后的完整输出如下。

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

可以看到，T4 的显存占用已增加到 10765 MiB。进程列表中的 `lupine_driver_server` 是 GPU Server 上的远程服务进程，负责执行 GPU 计算。vLLM 应用进程则运行在 CPU Client 上。

在能访问集群 Pod 网络的机器上，通过 OpenAI 兼容接口发起请求。本次从 GPU 节点请求 CPU 节点上的 vLLM 服务。

```bash
POD_IP=$(kubectl get pod vllm-remote \
  -o jsonpath='{.status.podIP}')
curl --fail --silent --show-error -o /dev/null -w '%{http_code}\n' \
  "http://${POD_IP}:8000/health"

curl --fail-with-body "http://${POD_IP}:8000/v1/chat/completions" \
  -H 'Content-Type: application/json' \
  -d '{"model":"qwen","messages":[{"role":"user","content":"用一句话解释 Kubernetes。"}],"max_tokens":64,"temperature":0}'
```

输出如下：

> Kubernetes（简称K8s）是一种开源的容器编排平台，它允许用户定义和管理应用程序在多个节点上的部署、运行和扩展。通过使用Kubernetes，开发者可以轻松地创建、管理和维护复杂的容器化应用集群，从而提高开发效率和资源利用率。

至此，我们使用 Remote GPU 成功完成了一次推理请求。

完成实验后，删除测试 Pod，释放远程 GPU 资源。

```bash
kubectl delete pod vllm-remote
```

## 5. 使用场景与挑战

### 5.1 应用与 GPU 分开部署，有什么价值

Lupine 将自己定义为 GPU-over-IP bridge，让 CPU-only 机器能够通过网络访问其他机器上的 GPU。HAMi 则进一步明确了 Kubernetes 中的运行方式，工作负载运行在 Client 节点，CUDA 调用在另一台 GPU Server 上执行，由 HAMi 完成 Server 选择和客户端库下发。

从资源部署的角度看，可以将它理解为 CPU 与 GPU 的解耦，将 GPU 作为一种特殊资源统一管理。应用使用哪台机器的 CPU、内存，与使用哪台机器的 GPU，可以分别安排。

Remote GPU 的价值在于提供另一种部署选择，是否有收益还需要结合业务验证。

### 5.2 哪些场景值得尝试

结合这种执行方式，可以考虑以下几类场景。

**应用需要较多 CPU 或内存。** 数据预处理、后处理与 GPU 计算对资源的需求可能不同。将应用部署在 CPU、内存规格合适的节点，让 GPU Server 提供计算设备，可以分别选择两侧的资源配置。不过，数据传输成本也需要一起评估。GPU API Remoting 的[研究论文](https://arxiv.org/html/2401.13354v1#S2.SS2)也将 CPU/GPU 固定配比与应用需求不匹配，列为资源解耦的动机之一。

**GPU 集中部署，应用分散运行。** 将 GPU 和驱动集中维护在 Server 侧，让不同 CPU 节点上的应用按需访问，是远程 GPU 的另一种部署思路。在 HAMi 中，可以先从集群内的 CPU Client 与 GPU Server 分离开始验证；集中部署后的共享、隔离和调度能力，需要按具体实现分别确认。

**开发与功能测试。** 无 GPU 的测试节点可以通过远端 GPU 验证 CUDA 程序、框架和模型的运行流程。本文依次使用 `nvidia-smi`、CUDA Samples 和 vLLM，分别验证设备可见性、实际 CUDA 计算和推理服务响应，这套顺序也适合用来检查环境。例如让 CPU-only Runner 连接远端 GPU，执行需要 GPU 的工作负载。

### 5.3 使用前需要关注什么

**性能取决于网络，也取决于远程调用的实现。** Client 与 Server 之间传输的是 CUDA 调用及相关数据，频繁同步会放大往返时延，大量数据搬运则消耗带宽。此外，参数序列化、反序列化和调用转发也有软件开销。[GPU API Remoting 研究](https://arxiv.org/html/2401.13354v1#S3)专门分析了这些成本，以及异步执行对开销的影响。因此，不能只用网络带宽判断性能，也不能将吞吐下降全部归因于网络。本文验证了功能，业务延迟与吞吐仍需实测。

**客户端无需 NVIDIA 驱动，仍需兼容的运行环境。** HAMi 官方说明，当前自动库下发面向提供的 amd64、Ubuntu 24.04 CUDA 和 vLLM 示例镜像。自定义镜像可能需要适配库搜索路径，通过绝对路径加载的库也需要单独检查。因此，更换 CUDA、框架或镜像版本后，应重新执行基础计算和应用验证。

**故障排查需要覆盖两端。** 应用启动失败或推理中断时，需要同时检查 Client、网络、远程服务和 GPU Server。连接中断、Server 重启后的恢复方式，以及长时间运行的稳定性，都应纳入上线前的验证。

## 6. 小结

本文通过 HAMi v2.11 的 Remote GPU，在没有 GPU 和 NVIDIA 驱动的 CPU 节点上，跑通了 CUDA Samples 和 vLLM 推理。应用进程运行在 CPU Client，由另一节点上的 T4 执行 GPU 计算，完成了从远程设备发现、CUDA 计算到模型推理的完整验证。

Remote GPU 为 GPU 工作负载增加了一种部署选择。应用可以使用 CPU 节点上的计算和内存资源，同时通过网络调用 GPU Server 的算力。HAMi 将远程 GPU 的发现、分配和客户端环境注入接入已有的调度流程，让这套跨节点使用 GPU 的方式可以通过熟悉的 Pod 资源声明来管理。

对于希望解耦 CPU 与 GPU 部署、集中提供 GPU 计算能力的平台而言，HAMi 提供了一个值得尝试的起点，也让 AI 基础设施的资源组合有了更多可能。

## 延伸阅读

- [HAMi v2.11.0 发布介绍](/zh/blog/hami-v2-11-0-release)
- [Remote GPU 用户指南](/zh/docs/userguide/nvidia-device/remote-gpu)
- [HAMi v2.11.0 Remote GPU 官方示例](https://github.com/Project-HAMi/HAMi/tree/v2.11.0/examples/remotegpu)
- [Characterizing Network Requirements for GPU API Remoting in AI Applications](https://arxiv.org/abs/2401.13354)
