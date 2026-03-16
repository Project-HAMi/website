---
title: Troubleshooting
---

- If you don't request vGPUs when using the device plugin with NVIDIA images all the GPUs on the machine may be exposed inside your container
- Currently, A100 MIG can be supported in only "none" and "mixed" modes.
- Tasks with the "nodeName" field cannot be scheduled at the moment; please use "nodeSelector" instead.
- Only computing tasks are currently supported; video codec processing is not supported.
- We change `device-plugin` env var name from `NodeName` to `NODE_NAME`, if you use the image version `v2.3.9`, you may encounter the situation that `device-plugin` cannot start, there are two ways to fix it:
  - Manually execute `kubectl edit daemonset` to modify the `device-plugin` env var from `NodeName` to `NODE_NAME`.
  - Upgrade to the latest version using helm, the latest version of `device-plugin` image version is `v2.3.10`, execute `helm upgrade hami hami/hami -n kube-system`, it will be fixed automatically.
