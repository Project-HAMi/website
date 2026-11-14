---
title: Keep GPU limits in SSH and login sessions
sidebar_label: GPU limits file
---

HAMi passes each container's GPU limits to HAMi-core through environment variables. A process started from SSH, `su -`, `sudo` or cron gets a new, empty environment, so it used to run without any GPU limit.

To fix this, the HAMi device plugin also writes the limits to a file and mounts it read-only at `/overrideEnv` in the container. HAMi-core reads this file first, so every process in the container gets the same limits, however it was started.

This is on by default, so you don't need to change anything. Requires HAMi v2.11.0 or newer.

## How it works

- When a container starts, the device plugin writes the container's limits to a file on the node.
- The file is mounted read-only at `/overrideEnv`. Processes in the container can read it, but they can't change it.
- HAMi-core reads `/overrideEnv` when a process starts. If a value is in both the file and the environment, the file wins.
- The environment variables are still set, so processes that already got the limits work as before.

There are two modes:

- `file` (default): sets the environment variables and mounts the file.
- `env`: sets the environment variables only, like HAMi v2.10.0 and earlier.

## Check that it works

Create a test Pod:

```bash
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:22.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 3000
          nvidia.com/gpucores: 30
EOF
```

Look at the file:

```bash
kubectl exec gpu-pod -- cat /overrideEnv
```

You see lines like these. The file can have more lines, depending on your settings.

```
CUDA_DEVICE_MEMORY_LIMIT_0=3000m
CUDA_DEVICE_MEMORY_SHARED_CACHE=/usr/local/vgpu/usage.cache
CUDA_DEVICE_SM_LIMIT=30
HAMI_LIMITS_FORMAT=1
```

Now run `nvidia-smi` with an empty environment, the same way an SSH login starts a process:

```bash
kubectl exec gpu-pod -- env -i /usr/bin/nvidia-smi --query-gpu=memory.total --format=csv,noheader
```

Expected: `3000 MiB`, the Pod's limit, not the full GPU memory. You may also see `[HAMI-core Msg ...]` lines. They are normal.

## Switch to environment variables

Keep `file` unless a workload can't use it, for example because its image already uses the `/overrideEnv` path.

:::note

In `env` mode, a process started from SSH, `su -`, `sudo` or cron runs without a GPU limit again.

:::

You can set the mode for the whole cluster, for one node or for one Pod. HAMi uses the first one that is set, in this order: the Pod annotation, the node setting, the cluster setting. If none is set, it uses `file`. An unknown value is ignored, and the device plugin logs a warning.

### For the whole cluster

Set this in your Helm values and run `helm upgrade`. The device plugin restarts by itself.

```yaml
devices:
  nvidia:
    limitDelivery: env
```

### For one node

Add `limitdelivery` to the node's entry in the device plugin configuration. If the node already has an entry, add the key to it.

```yaml
devicePlugin:
  nodeConfiguration:
    config: |
      {
        "nodeconfig": [
          {
            "name": "<your-gpu-node>",
            "limitdelivery": "env"
          }
        ]
      }
```

After `helm upgrade`, restart the device plugin so it reads the new configuration:

```bash
kubectl -n <namespace> rollout restart daemonset/hami-device-plugin
```

### For one Pod

Add this annotation to the Pod. For a Deployment, add it to the Pod template.

```yaml
metadata:
  annotations:
    hami.io/limit-delivery: "env"
```

Use `"file"` to turn the file back on for one Pod when its node or the cluster uses `env`.

:::note

A new mode only applies to Pods created after the change. Recreate running Pods to use it.

:::

## Notes

- In the `mig` operating mode, HAMi doesn't use HAMi-core, so it writes no file.
- HAMi-core reads `LIBCUDA_LOG_LEVEL` before the file. A process started without the environment logs at HAMi-core's default level, so it can print a few extra `[HAMI-core ...]` messages. They are harmless.
- Tested with containerd. Sandboxed runtimes such as gVisor and Kata, and CRI-O, are not tested yet.
- To learn how the feature is built, see [GPU limits file design](../../developers/gpu-limit-delivery-design.md).
