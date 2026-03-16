---
title: 启用 Ascend 共享
translated: true
---

基于虚拟化模板支持显存切片，自动使用可用的租赁模板。有关详细信息，请查看[设备模板](./device-template.md)。

## 先决条件

* Ascend 设备类型：910B, 910A, 310P
* 驱动版本 >= 24.1.rc1
* Ascend docker 运行时

## 启用 Ascend-sharing 支持

* 由于与 HAMi 的依赖关系，您需要在 HAMi 安装期间设置以下参数：

  ```yaml
  devices.ascend.enabled=true
  ```

  有关更多详细信息，请参阅 values.yaml 中的 'devices' 部分：

  ```yaml
  devices:
    ascend:
      enabled: true
      image: "ascend-device-plugin:master"
      imagePullPolicy: IfNotPresent
      extraArgs: []
      nodeSelector:
        ascend: "on"
      tolerations: []
      resources:
        - huawei.com/Ascend910A
        - huawei.com/Ascend910A-memory
        - huawei.com/Ascend910B
        - huawei.com/Ascend910B-memory
        - huawei.com/Ascend310P
        - huawei.com/Ascend310P-memory
  ```

* 使用以下命令标记 Ascend 节点：

  ```bash
  kubectl label node {ascend-node} ascend=on
  ```

* 安装 [Ascend docker 运行时](https://gitee.com/ascend/ascend-docker-runtime)

* 从 HAMi 项目[下载 Ascend-vgpu-device-plugin 的 yaml](https://github.com/Project-HAMi/ascend-device-plugin/blob/master/build/ascendplugin-hami.yaml)，并执行以下命令来部署：

  ```bash
  wge https://raw.githubusercontent.com/Project-HAMi/ascend-device-plugin/refs/heads/main/ascend-device-plugin.yaml
  kubectl apply -f ascend-device-plugin.yaml
  ```

## 运行 Ascend 作业

### Ascend 910B

现在可以通过容器请求 Ascend 910B，
使用 `huawei.com/ascend910B` 和 `huawei.com/ascend910B-memory` 资源类型：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  containers:
    - name: ubuntu-container
      image: ascendhub.huawei.com/public-ascendhub/ascend-mindspore:23.0.RC3-centos7
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          huawei.com/Ascend910B: 1 # 请求 1 个 Ascend
          huawei.com/Ascend910B-memory: 2000 # 请求 2000m 设备显存
```

### Ascend 310P

现在可以通过容器请求 Ascend 310P，
使用 `huawei.com/ascend310P` 和 `huawei.com/ascend310P-memory` 资源类型：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  containers:
    - name: ubuntu-container
      image: ascendhub.huawei.com/public-ascendhub/ascend-mindspore:23.0.RC3-centos7
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          huawei.com/Ascend310P: 1 # 请求 1 个 Ascend
          huawei.com/Ascend310P-memory: 1024 # 请求 1024m 设备显存
```

### 注意事项

1. 目前，Ascend 910b 仅支持两种分片策略，分别是 1/4 和 1/2。Ascend 310p 支持 3 种分片策略：1/7、2/7、4/7。作业的显存请求将自动与最接近的分片策略对齐。在此示例中，任务将分配 16384M 设备显存。

2. 不支持在初始化容器中使用 Ascend-sharing。

3. `huawei.com/Ascend910B-memory` 仅在 `huawei.com/Ascend91B0=1` 时有效。
   `huawe.com/Ascend310P-memory` 仅在 `huawei.com/Ascend310P=1` 时有效。
