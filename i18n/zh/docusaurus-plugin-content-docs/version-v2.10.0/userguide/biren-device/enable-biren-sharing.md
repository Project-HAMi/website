---
title: 启用壁仞设备共享
---

## Introduction

HAMi 现在支持共享 `birentech.com/gpu` (壁仞科技) 设备，并提供以下能力：

**支持整卡和 SVI 切分**: 可以在 HAMi 中使用整卡和SVI切分出来的卡。

**设备 UUID 选择**: 可以通过注解指定或排除某些特定设备。

## 使用壁仞设备

### 启用壁仞设备共享

#### 给节点打标签

```bash
kubectl label node {biren-node} biren=on
```

#### 部署 `biren-device-plugin`

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: biren-gpu
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: device-plugin-sa
  namespace: biren-gpu
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: birentech-device-plugin
rules:
  - apiGroups: [""]
    resources:
      - nodes
      - pods
    verbs: ["get", "list", "watch", "update", "patch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: birentech-device-plugin
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: birentech-device-plugin
subjects:
  - kind: ServiceAccount
    name: device-plugin-sa
    namespace: biren-gpu

---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: biren-device-plugin-daemonset
  namespace: biren-gpu
spec:
  selector:
    matchLabels:
      name: biren-device-plugin
  template:
    metadata:
      annotations:
        scheduler.alpha.kubernetes.io/critical-pod: ""
      labels:
        name: biren-device-plugin
        app.kubernetes.io/component: exporter
        app.kubernetes.io/name: gpu-exporter
    spec:
      nodeSelector:
        biren: "on"
      tolerations:
        - key: CriticalAddonsOnly
          operator: Exists
        - key: birentech.com/gpu
          operator: Exists
          effect: NoSchedule
      priorityClassName: "system-node-critical"
      containers:
        - name: k8s-device-plugin
          image: projecthami/biren-device-plugin:latest
          imagePullPolicy: Always
          env:
            - name: LD_LIBRARY_PATH
              value: /usr/lib
            - name: NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
          command: ["/root/k8s-device-plugin"]
          args: ["--pulse", "300", "--container-runtime", "runc"]
          securityContext:
            privileged: true
          volumeMounts:
            - name: dp
              mountPath: /var/lib/kubelet/device-plugins
            - name: sys
              mountPath: /sys
            - name: brml
              mountPath: /usr/lib
            - name: brml-lib
              mountPath: /usr/local/birensupa/driver/biren-smi/lib
              readOnly: true
            - name: brsmi
              mountPath: /opt/birentech/bin
            - mountPath: /dev
              name: device
            - name: cdi-config
              mountPath: /etc/cdi
      serviceAccountName: device-plugin-sa
      volumes:
        - name: dp
          hostPath:
            path: /var/lib/kubelet/device-plugins
        - name: sys
          hostPath:
            path: /sys
        - name: brml
          hostPath:
            path: /usr/lib
        - name: brsmi
          hostPath:
            path: /usr/bin
        - name: device
          hostPath:
            path: /dev
        - name: cdi-config
          hostPath:
            path: /etc/cdi
        - name: brml-lib
          hostPath:
            path: /usr/local/birensupa/driver/biren-smi/lib
```

### 运行壁仞任务

```yaml
kind: Pod
metadata:
  name: pod1
spec:
  containers:
    - image: ubuntu
      name: pod1-ctr
      command: ["sleep"]
      args: ["infinity"]
      resources:
        limits:
          birentech.com/gpu: 1
```

## 注意事项

1. 在申请壁仞资源时，**不能**指定显存大小。
2. 使用 SVI 切分时，一张卡只能切成两份或者四份。
