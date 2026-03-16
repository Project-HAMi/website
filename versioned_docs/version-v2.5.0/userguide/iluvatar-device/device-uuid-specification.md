---
title: Device specification
---

## Device UUID Selection

You can specify which GPU devices to use or exclude using annotations:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: poddemo
  annotations:
    # Use specific GPU devices (comma-separated list)
    iluvatar.ai/use-gpuuuid: "node1-iluvatar-0,node1-iluvatar-1"
    # Or exclude specific GPU devices (comma-separated list)
    iluvatar.ai/nouse-gpuuuid: "node1-iluvatar-2,node1-iluvatar-3"
spec:
  # ... rest of pod spec
```

> **NOTE:** The device ID format is `{node-name}-iluvatar-{index}`. You can find the available device IDs in the node status.

### Finding Device UUIDs

You can find the UUIDs of Iluvatar GPUs on a node using the following command:

```bash
kubectl get pod <pod-name> -o yaml | grep -A 10 "hami.io/<card-type>-devices-allocated"
```

Or by examining the node annotations:

```bash
kubectl get node <node-name> -o yaml | grep -A 10 "hami.io/node-register-<card-type>"
```

Look for annotations containing device information in the node status.

