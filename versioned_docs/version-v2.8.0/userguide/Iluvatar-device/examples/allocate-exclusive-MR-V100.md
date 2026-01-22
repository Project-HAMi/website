---
title: Allocate exclusive BI-V100 device
---

To allocate multiple BI-V100 devices, you only need to assign `iluvatar.ai/BI-V150-vgpu` with no other fields required.

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
        iluvatar.ai/MR-V100-vgpu: 2
      limits:
        iluvatar.ai/MR-V100-vgpu: 2
```
> **Note:** *When applying for exclusive use of a GPU, `iluvatar.ai/<card-type>-vgpu=1`, you need to set the values ​​of `iluvatar.ai/<card-type>.vCore` and `iluvatar.ai/<card-type>.vMem` to the maximum number of GPU resources. `iluvatar.ai/<card-type>-vgpu>1` no longer supports the vGPU function, so you don't need to fill in the core and memory values*