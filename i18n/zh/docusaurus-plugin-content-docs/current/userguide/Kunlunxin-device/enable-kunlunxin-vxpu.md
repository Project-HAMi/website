---
title: 启用昆仑芯 VXPU
---

## 介绍

该组件支持复用昆仑芯 XPU 设备（P800-OAM），并提供以下类似 vGPU 的复用功能：

***XPU 共享***：每个任务只能占用设备的一部分，允许多个任务共享单个 XPU

***内存分配限制***：您现在可以使用内存值（例如 24576M）来分配 XPU，组件确保任务不会超过分配的内存限制

***设备 UUID 选择***：您可以通过注解指定使用或排除特定的 XPU 设备


## 前置条件
* driver version >= 5.0.21.16
* xpu-container-toolkit >= xpu_container_1.0.2-1
* XPU device type: P800-OAM

## 启用 XPU 共享支持

* 部署 [vxpu-device-plugin]
```
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: vxpu-device-plugin
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "update", "watch", "patch"]
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["get", "list", "watch", "update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: vxpu-device-plugin
subjects:
  - kind: ServiceAccount
    name: vxpu-device-plugin
    namespace: kube-system
roleRef:
  kind: ClusterRole
  name: vxpu-device-plugin
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: vxpu-device-plugin
  namespace: kube-system
  labels:
    app.kubernetes.io/component: vxpu-device-plugin
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: vxpu-device-plugin
  namespace: kube-system
  labels:
    app.kubernetes.io/component: vxpu-device-plugin
spec:
  selector:
    matchLabels:
      app.kubernetes.io/component: vxpu-device-plugin
  template:
    metadata:
      labels:
        app.kubernetes.io/component: vxpu-device-plugin
        hami.io/webhook: ignore
    spec:
      priorityClassName: "system-node-critical"
      serviceAccountName: vxpu-device-plugin
      containers:
        - image: projecthami/vxpu-device-plugin:v1.0.0
          name: device-plugin
          resources:
            requests:
              memory: 500Mi
              cpu: 500m
            limits:
              memory: 500Mi
              cpu: 500m
          args:
            - xpu-device-plugin
            - --memory-unit=MiB
            - --resource-name=kunlunxin.com/vxpu
            - -logtostderr
          securityContext:
            privileged: true
            capabilities:
              add: [ "ALL" ]
          volumeMounts:
            - name: device-plugin
              mountPath: /var/lib/kubelet/device-plugins
            - name: xre
              mountPath: /usr/local/xpu
            - name: dev
              mountPath: /dev
          env:
            - name: NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
            - name: KUBECONFIG
              value: /etc/kubernetes/kubelet.conf
      volumes:
        - name: device-plugin
          hostPath:
            path: /var/lib/kubelet/device-plugins
        - name: xre
          hostPath:
            path: /usr/local/xpu
        - name: dev
          hostPath:
            path: /dev
      nodeSelector:
        xpu: "on"
```


> **注意：** 默认资源名称如下：
> - `kunlunxin.com/vxpu` 用于 VXPU 计数
> - `kunlunxin.com/vxpu-memory` 用于内存分配
>
> 您可以使用上述参数自定义这些名称。

## 设备粒度分区

XPU P800-OAM 支持 2 个级别的分区粒度：1/4 卡和 1/2 卡，内存分配会自动对齐。规则如下：
> - 请求内存 ≤ 24576M (24G) 将自动对齐到 24576M (24G)
> - 请求内存 > 24576M (24G) 且 ≤ 49152M (48G) 将自动对齐到 49152M (48G)
> - 请求内存 > 49152M (48G) 将分配为完整卡

## 运行 XPU 任务

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: vxpu-pod-demo
spec:
  containers:
    - name: vxpu-pod-demo
      image: pytorch:resnet50
      workingDir: /root
      command: ["sleep","infinity"]
      resources:
        limits:
          kunlunxin.com/vxpu: 1 # 请求一个 VXPU
          kunlunxin.com/vxpu-memory: 24576 # 请求一个需要 24576 MiB 设备内存的虚拟 XPU
```

## 设备 UUID 选择

您可以通过 Pod 注解指定使用或排除特定的 XPU 设备：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: poddemo
  annotations:
    # 使用特定的 XPU 设备（逗号分隔列表）
    hami.io/use-xpu-uuid: ""
    # 或排除特定的 XPU 设备（逗号分隔列表）
    hami.io/no-use-xpu-uuid: ""
spec:
  # ... rest of Pod configuration
```

> **注意：** 设备 ID 格式为 `{BusID}`。您可以在节点状态中找到可用的设备 ID。

### 查找设备 UUID

您可以使用以下命令在节点上查找昆仑芯 P800-OAM XPU 设备 UUID：

```bash
kubectl get pod <pod-name> -o yaml | grep -A 10 "hami.io/xpu-devices-allocated"
```

或通过检查节点注解：

```bash
kubectl get node <node-name> -o yaml | grep -A 10 "hami.io/node-register-xpu"
```

在节点注解中查找包含设备信息的注解。


## 重要说明

当前的昆仑芯片驱动程序最多支持 32 个句柄。8 个 XPU 设备占用 8 个句柄，因此不可能将所有 8 个设备都拆分为 4 个。
```yaml
# 有效
kunlunxin.com/vxpu: 8

# 有效
kunlunxin.com/vxpu: 6
kunlunxin.com/vxpu-memory: 24576

# 有效
kunlunxin.com/vxpu: 8
kunlunxin.com/vxpu-memory: 49152

# 无效
kunlunxin.com/vxpu: 8 # 不支持
kunlunxin.com/vxpu-memory: 24576
```
