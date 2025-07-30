以下是您提供内容的专业中文翻译，严格遵循了术语保留和格式要求：

---  
title: 使用helm部署HAMi  
---  

## 目录 {#toc}  

- [先决条件](#prerequisites)  
- [安装步骤](#installation)  
- [演示](#demo)  

本指南将涵盖：  

- 为每个GPU节点配置nvidia容器运行时  
- 使用helm安装HAMi  
- 启动vGPU任务  
- 验证容器内设备资源是否受限  

## 先决条件 {#prerequisites}  

- [Helm](https://helm.sh/zh/docs/) v3+版本  
- [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl/) v1.16+版本  
- [CUDA](https://developer.nvidia.com/cuda-toolkit) v10.2+版本  
- [NVIDIA驱动](https://www.nvidia.cn/drivers/unix/) v440+版本  

## 安装步骤 {#installation}  

### 1. 配置nvidia-container-toolkit {#configure-nvidia-container-toolkit}  

<summary> 配置nvidia-container-toolkit </summary>  

在所有GPU节点执行以下操作。  

本文档假设已预装NVIDIA驱动和`nvidia-container-toolkit`，并已将`nvidia-container-runtime`配置为默认底层运行时。  

参考：[nvidia-container-toolkit安装指南](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)  

#### 基于Debian系统（使用`Docker`和`containerd`）示例 {#example-for-debian-based-systems-with-docker-and-containerd}  

##### 安装`nvidia-container-toolkit` {#install-the-nvidia-container-toolkit}  

```bash  
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)  
curl -s -L https://nvidia.github.io/libnvidia-container/gpgkey | sudo apt-key add -  
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \  
  sudo tee /etc/apt/sources.list.d/libnvidia-container.list  

sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit  
```  

##### 配置`Docker` {#configure-docker}  

当使用`Docker`运行`Kubernetes`时，编辑配置文件（通常位于`/etc/docker/daemon.json`），将`nvidia-container-runtime`设为默认底层运行时：  

```json  
{  
  "default-runtime": "nvidia",  
  "runtimes": {  
    "nvidia": {  
      "path": "/usr/bin/nvidia-container-runtime",  
      "runtimeArgs": []  
    }  
  }  
}  
```  

然后重启`Docker`：  

```bash  
sudo systemctl daemon-reload && systemctl restart docker  
```  

##### 配置`containerd` {#configure-containerd}  

当使用`containerd`运行`Kubernetes`时，修改配置文件（通常位于`/etc/containerd/config.toml`），将`nvidia-container-runtime`设为默认底层运行时：  

```toml  
version = 2  
[plugins]  
  [plugins."io.containerd.grpc.v1.cri"]  
    [plugins."io.containerd.grpc.v1.cri".containerd]  
      default_runtime_name = "nvidia"  

      [plugins."io.containerd.grpc.v1.cri".containerd.runtimes]  
        [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.nvidia]  
          privileged_without_host_devices = false  
          runtime_engine = ""  
          runtime_root = ""  
          runtime_type = "io.containerd.runc.v2"  
          [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.nvidia.options]  
            BinaryName = "/usr/bin/nvidia-container-runtime"  
```  

然后重启`containerd`：  

```bash  
sudo systemctl daemon-reload && systemctl restart containerd  
```  

#### 2. 标记节点 {#label-your-nodes}  

通过添加"gpu=on"标签将GPU节点标记为可调度HAMi任务。未标记的节点将无法被调度器管理。  

```bash  
kubectl label nodes {节点ID} gpu=on  
```  

#### 3. 使用helm部署HAMi {#deploy-hami-using-helm}  

首先通过以下命令确认Kubernetes版本：  

```bash  
kubectl version  
```  

然后添加helm仓库：  

```bash  
helm repo add hami-charts https://project-hami.github.io/HAMi/  
```  

安装时需设置Kubernetes调度器镜像版本与集群版本匹配。例如集群版本为1.16.8时，使用以下命令部署：  

```bash  
helm install hami hami-charts/hami \  
  --set scheduler.kubeScheduler.imageTag=v1.16.8 \  
  -n kube-system  
```  

若一切正常，可见vgpu-device-plugin和vgpu-scheduler的Pod均处于Running状态  

### 演示 {#demo}  

#### 1. 提交演示任务 {#submit-demo-task}  

容器现在可通过`nvidia.com/gpu`资源类型申请NVIDIA vGPU：  

```yaml  
apiVersion: v1  
kind: Pod  
metadata:  
  name: gpu-pod  
spec:  
  containers:  
    - name: ubuntu-container  
      image: ubuntu:18.04  
      command: ["bash", "-c", "sleep 86400"]  
      resources:  
        limits:  
          nvidia.com/gpu: 1 # 申请1个vGPU  
          nvidia.com/gpumem: 10240 # 每个vGPU包含10240m设备内存（可选，整型）  
```  

#### 验证容器内资源限制 {#verify-in-container-resouce-control}  

执行查询命令：  

```bash  
kubectl exec -it gpu-pod nvidia-smi  
```  

预期输出：  

```text  
[HAMI-core Msg(28:140561996502848:libvgpu.c:836)]: 初始化中.....  
2024年4月10日 星期三 09:28:58  
+-----------------------------------------------------------------------------------------+  
| NVIDIA-SMI 550.54.15              驱动版本: 550.54.15     CUDA版本: 12.4     |  
|-----------------------------------------+------------------------+----------------------+  
| GPU  名称                 持久化-M | 总线ID         显存.A | 易失性ECC错误 |  
| 风扇  温度  性能          功耗:使用/上限 |           显存使用率 | GPU利用率  计算模式 |  
|                                         |                        |              MIG模式 |  
|=========================================+========================+======================|  
|   0  Tesla V100-PCIE-32GB           启用 |   00000000:3E:00.0 关闭 |                   0 |  
| N/A   29C    P0             24W/250W |      0MiB/10240MiB |     0%      默认模式 |  
|                                         |                        |                 N/A |  
+-----------------------------------------+------------------------+----------------------+  

+-----------------------------------------------------------------------------------------+  
| 进程:                                                                               |  
|  GPU  GI  CI        进程ID   类型   进程名称                              显存使用量 |  
|        ID  ID                                                               |  
|=========================================================================================|  
|  未找到运行中的进程                                                             |  
+-----------------------------------------------------------------------------------------+  
[HAMI-core Msg(28:140561996502848:multiprocess_memory_limit.c:434)]: 调用退出处理程序28  
```
 This content is powered by i18n-agent-action with LLM service https://api.deepseek.com with model deepseek-chat