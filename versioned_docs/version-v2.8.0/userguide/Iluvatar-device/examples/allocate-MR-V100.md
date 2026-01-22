---
title: Allocate MR-V100 slice
translated: true
---

To allocate core and memory resources for the container, you only need to configure a certain size of GPU core `iluvatar.ai/MR-V100.vCore` and GPU memory resource `iluvatar.ai/MR-V100.vMem`.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: MR-V100-poddemo
spec:
  restartPolicy: Never
  containers:
  - name: MR-V100-poddemo
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
        iluvatar.ai/MR-V100-vgpu: 1
        iluvatar.ai/MR-V100.vCore: 50
        iluvatar.ai/MR-V100.vMem: 64
      limits:
        iluvatar.ai/MR-V100-vgpu: 1
        iluvatar.ai/MR-V100.vCore: 50
        iluvatar.ai/MR-V100.vMem: 64
```

> **NOTE:** *Each `iluvatar.ai/<card-type>.vCore` unit represents 1% of an available compute core, and each `iluvatar.ai/<card-type>.vMem` unit represents 256MB of device memory*