---
title: 启用瀚博半导体设备共享
---

## 介绍

HAMi 现在支持共享 `vastaitech.com/va`（瀚博半导体）设备，并提供以下能力：

- **支持整卡模式和 Die 模式**：当前仅支持整卡模式（Full-Card mode）和 Die 模式（Die mode）。
- **Die 模式拓扑感知**：在 Die 模式下申请多个资源时，调度器会尽量将它们分配到同一块 AIC 上。
- **设备 UUID 选择**：可以通过注解指定或排除某些特定设备。

## 使用瀚博半导体设备

### 启用瀚博半导体设备共享

#### 给节点打标签

```bash
kubectl label node {vastai-node} vastai=on
```

#### 部署 `vastai-device-plugin`

##### 整卡模式

```yaml
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: hami-vastai
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "update", "watch", "patch"]
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["get", "update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: hami-vastai
subjects:
  - kind: ServiceAccount
    name: hami-vastai
    namespace: kube-system
roleRef:
  kind: ClusterRole
  name: hami-vastai
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: hami-vastai
  namespace: kube-system
  labels:
    app.kubernetes.io/component: "hami-vastai"
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: vastai-device-plugin-daemonset
  namespace: kube-system
  labels:
    app.kubernetes.io/component: hami-vastai-device-plugin
spec:
  selector:
    matchLabels:
      app.kubernetes.io/component: hami-vastai-device-plugin
      hami.io/webhook: ignore
  updateStrategy:
    type: RollingUpdate
  template:
    metadata:
      labels:
        app.kubernetes.io/component: hami-vastai-device-plugin
        hami.io/webhook: ignore
    spec:
      priorityClassName: "system-node-critical"
      serviceAccountName: hami-vastai
      nodeSelector:
        vastai: "on"
      containers:
        - image: projecthami/vastai-device-plugin:latest
          imagePullPolicy: Always
          name: vastai-device-plugin-dp
          env:
          - name: NODE_NAME
            valueFrom:
              fieldRef:
                fieldPath: spec.nodeName
          args: ["--fail-on-init-error=false", "--pass-device-specs=true"]
          securityContext:
            privileged: true
          volumeMounts:
            - name: device-plugin
              mountPath: /var/lib/kubelet/device-plugins
            - name: libvaml-lib
              mountPath: /usr/lib/libvaml.so
            - name: libvaml-lib64
              mountPath: /usr/lib64/libvaml.so
      volumes:
        - name: device-plugin
          hostPath:
            path: /var/lib/kubelet/device-plugins
        - name: libvaml-lib
          hostPath:
            path: /usr/lib/libvaml.so
        - name: libvaml-lib64
          hostPath:
            path: /usr/lib64/libvaml.so
```

##### Die 模式

```yaml
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: hami-vastai
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "update", "watch", "patch"]
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["get", "update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: hami-vastai
subjects:
  - kind: ServiceAccount
    name: hami-vastai
    namespace: kube-system
roleRef:
  kind: ClusterRole
  name: hami-vastai
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: hami-vastai
  namespace: kube-system
  labels:
    app.kubernetes.io/component: "hami-vastai"
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: vastai-device-plugin-daemonset
  namespace: kube-system
  labels:
    app.kubernetes.io/component: hami-vastai-device-plugin
spec:
  selector:
    matchLabels:
      app.kubernetes.io/component: hami-vastai-device-plugin
      hami.io/webhook: ignore
  updateStrategy:
    type: RollingUpdate
  template:
    metadata:
      labels:
        app.kubernetes.io/component: hami-vastai-device-plugin
        hami.io/webhook: ignore
    spec:
      priorityClassName: "system-node-critical"
      serviceAccountName: hami-vastai
      nodeSelector:
        vastai: "on"
      containers:
        - image: projecthami/vastai-device-plugin:latest
          imagePullPolicy: Always
          name: vastai-device-plugin-dp
          env:
          - name: NODE_NAME
            valueFrom:
              fieldRef:
                fieldPath: spec.nodeName
          args: ["--fail-on-init-error=false", "--pass-device-specs=true", "--device-strategy=die", "--rename-on-die=false"]
          securityContext:
            privileged: true
          volumeMounts:
            - name: device-plugin
              mountPath: /var/lib/kubelet/device-plugins
            - name: libvaml-lib
              mountPath: /usr/lib/libvaml.so
            - name: libvaml-lib64
              mountPath: /usr/lib64/libvaml.so
      volumes:
        - name: device-plugin
          hostPath:
            path: /var/lib/kubelet/device-plugins
        - name: libvaml-lib
          hostPath:
            path: /usr/lib/libvaml.so
        - name: libvaml-lib64
          hostPath:
            path: /usr/lib64/libvaml.so
```

### 运行瀚博半导体的作业

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: vastai-pod
spec:
  restartPolicy: Never
  containers:
  - name: vastai-container
    image: harbor.vastaitech.com/ai_deliver/vllm_vacc:VVI-25.12.SP2
    command: ["sleep", "infinity"]
    resources:
      limits:
        vastaitech.com/va: "1"
```

## 注意事项

1. 在申请瀚博半导体资源时，你**不能**指定显存大小。
2. `vastai-device-plugin` **不会**自动把 `vasmi` 挂载到容器内。如果你需要在容器内使用 `vasmi` 命令，请手动将其挂载到容器中。
