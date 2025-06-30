---
title: Troubleshooting
---

- If you don’t explicitly request vGPUs when using the device plugin with NVIDIA images, all GPUs on the host may be exposed to your container.
- Currently, A100 MIG can be supported in only "none" and "mixed" modes.
- Tasks with the "nodeName" field cannot be scheduled at the moment; please use "nodeSelector" instead.
- Only computing tasks are currently supported; video codec processing is not supported.
- Since v2.3.10, HAMi has changed the `device-plugin` environment variable name from `NodeName` to `NODE_NAME`.  
  If you're using an image version earlier than v2.3.10, the `device-plugin` may fail to start.

  To resolve this issue, you have two options:

  - Manually edit the DaemonSet using `kubectl edit daemonset` and update the environment variable from `NodeName` to `NODE_NAME`.
  - Upgrade the `device-plugin` image to the latest version using Helm:  
    
    ```bash
    helm upgrade hami hami/hami -n kube-system
    ```  

    This will apply the fix automatically.
