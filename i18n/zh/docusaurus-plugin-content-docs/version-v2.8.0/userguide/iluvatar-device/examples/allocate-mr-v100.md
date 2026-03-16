---
title: 为容器分配 BI-V100 切片
translated: true
---

为容器分配核心和显存资源，只需配置一定大小的 GPU 核心 `iluvatar.ai/BI-V100.vCore`和 GPU 显存资源 `iluvatar.ai/BI-V100.vMem`。

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

> **注意：** *每个 `iluvatar.ai/<card-type>.vCore` 单位代表 1% 的可用计算核心，每个 `iluvatar.ai/<card-type>.vMem` 单位代表 256MB 的设备显存*
