---
title: Allocate BI-V150 slice
---

To allocate core and memory resources for the container, you only need to configure a certain size of GPU core `iluvatar.ai/BI-V150.vCore` and GPU memory resource `iluvatar.ai/BI-V150.vMem`.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: BI-V150-poddemo
spec:
  restartPolicy: Never
  containers:
  - name: BI-V150-poddemo
    image: registry.iluvatar.com.cn:10443/saas/mr-bi150-4.3.0-x86-ubuntu22.04-py3.10-base-base:v1.0
    command:
    - bash
    args:
    - -c
    - |
      set -ex
      echo "export LD_LIBRARY_PATH=/usr/local/corex/lib64:$LD_LIBRARY_PATH">> /root/.bashrc
      cp -f /usr/local/iluvatar/lib64/libcuda.* /usr/local/corex/lib64/
      cp -f /usr/local/iluvatar/lib64/libixml.* /usr/local/corex/lib64/
      source /root/.bashrc
      sleep 360000
    resources:
      requests:
        iluvatar.ai/BI-V150-vgpu: 1
        iluvatar.ai/BI-V150.vCore: 50
        iluvatar.ai/BI-V150.vMem: 64
      limits:
        iluvatar.ai/BI-V150-vgpu: 1
        iluvatar.ai/BI-V150.vCore: 50
        iluvatar.ai/BI-V150.vMem: 64
```

> **NOTE:** *Each `iluvatar.ai/<card-type>.vCore` unit represents 1% of an available compute core, and each `iluvatar.ai/<card-type>.vMem` unit represents 256MB of device memory*