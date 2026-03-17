---
title: 申请 Vastai 设备
---

下面的示例展示了如何在一个普通的 Kubernetes Pod 中申请一个 Vastai 设备。
该 Pod 使用 Vastaitech 提供的镜像，以长时间运行的方式启动容器，并通过 `resources.limits` 中声明一个 `vastaitech.com/va` 设备。
你可以在此基础上替换镜像、命令或资源配额，以适配自己的业务场景。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: vastai-pod
spec:
  containers:
    - name: test
      image: harbor.vastaitech.com/ai_deliver/vllm_vacc:VVI-25.12.SP2
      command: ["sleep", "infinity"]
      resources:
        limits:
          vastaitech.com/va: 1
```

