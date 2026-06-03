---
title: 申请壁仞设备
---

下面的示例展示了如何在一个普通的 Kubernetes Pod 中申请一个翰博半导体的设备。
该 Pod 以长时间运行的方式启动容器，并通过 `resources.limits` 中声明一个 `birentech.com/gpu` 设备。
你可以在此基础上替换镜像、命令或资源配额，以适配自己的业务场景。

```yaml
apiVersion: v1
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