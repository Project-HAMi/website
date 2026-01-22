---
title: 分配多个独占设备
translated: true
---

要分配多个 MR-V100 设备，您只需分配 `iluvatar.ai/MR-V100-vgpu` ，无需其他字段。

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
> **注意：** *当申请独占一张GPU时，`iluvatar.ai/<card-type>-vgpu=1`时，需要同时设置`iluvatar.ai/<card-type>.vCore`和`iluvatar.ai/<card-type>.vMem`的值为GPU的最大资源数量，`iluvatar.ai/<card-type>-vgpu>1`时不再支持vGPU功能可不必在填写核心和显存的数值*