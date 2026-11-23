---
title: Share NVIDIA GPUs with MPS v3
description: Configure MPS v3 in HAMi and request GPU memory, compute caps, static SM partitions, or weighted timeslices.
sidebar_label: MPS v3
---

The `mps-v3` backend uses the NVIDIA Container Toolkit CDI hook to apply each container's GPU memory limit to its cgroup. CUDA processes connect to their assigned MPS namespace for compute sharing. This backend uses the existing HAMi GPU, memory, and core resources.

The HAMi implementation is tracked in [HAMi PR #3443](https://github.com/Project-HAMi/HAMi/pull/3443).

## NVIDIA device plugin compatibility

HAMi enables r620 MPS v3 with `operatingmode: mps-v3`. It supports per-container GPU memory limits through CDI and offers namespace caps, static SM partitions with optional borrowing, and weighted server timeslices.

The upstream NVIDIA device plugin's experimental `sharing.mps` uses Legacy MPS to expose equal-sized GPU replicas. That setting is unavailable in HAMi, where the node operating mode for MPS is `mps-v3`. [NVIDIA device plugin MPS documentation](https://github.com/NVIDIA/k8s-device-plugin/blob/v0.20.1/README.md#with-cuda-mps)

## Prepare the node

- Use cgroup v2, NVIDIA driver **r620**, and NVIDIA Container Toolkit **1.20.1 or later** with the `apply-cuda-memory-limits` hook enabled. Use application images with a CUDA runtime compatible with the installed driver.
- Use a CDI-capable container runtime.
- Make the driver-matched `nvidia-cuda-mps-control` and driver libraries available to the device plugin. Set `devicePlugin.mpsV3.binary` to the path visible inside the device plugin container.
- **620.70.06** is the verified CLI baseline for static SM partitions. If the plugin reports an unexpected SM partition inventory format, check the driver and control utility versions.

```bash
stat -fc %T /sys/fs/cgroup
nvidia-smi --query-gpu=uuid,driver_version,mig.mode.current,mig.mode.pending --format=csv
```

## Run the MPS daemon on the host

Start a dedicated daemon on each MPS v3 node before enabling the device plugin. This example systemd unit uses the host binary path. Set the daemon’s `CUDA_MPS_PIPE_DIRECTORY` to exactly `<root>/pipe`, where `<root>` is the value of `devicePlugin.mpsV3.root`.

Save the following as `/etc/nvidia-mps/hami-mps-v3.toml`. This disables automatic UID server creation on the daemon’s main socket. HAMi routes workloads through their dedicated namespace sockets. [NVIDIA v3 configuration file](https://docs.nvidia.com/deploy/mps/620/mpsv3-configuration-file.html)

```toml
schema_version = "1.0"

[features.context-share]
enabled = true
default_socket = "off"
```

```ini
[Unit]
Description=HAMi NVIDIA MPS v3 daemon

[Service]
Type=simple
Environment=CUDA_MPS_PIPE_DIRECTORY=/var/run/hami/mps-v3/pipe
Environment=CUDA_MPS_LOG_DIRECTORY=/var/run/hami/mps-v3/log
ExecStartPre=/usr/bin/test -f /sys/fs/cgroup/cgroup.controllers
ExecStartPre=/usr/bin/mkdir -p /var/run/hami/mps-v3/pipe /var/run/hami/mps-v3/log
ExecStart=/usr/bin/nvidia-cuda-mps-control -p 3 -f -m -a /etc/nvidia-mps/hami-mps-v3.toml

[Install]
WantedBy=multi-user.target
```

Save the unit as `/etc/systemd/system/hami-mps-v3.service` and run the following on the node.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now hami-mps-v3.service
sudo env CUDA_MPS_PIPE_DIRECTORY=/var/run/hami/mps-v3/pipe \
  nvidia-cuda-mps-control -p 3 compute-policy get timeslice
```

The device plugin connects to the running daemon. Drain MPS workloads before stopping or restarting the host service.

## Configure a node

Select the node and choose its compute strategy in the Helm overrides. This example enables `server-timeslice` on one node.

```yaml
devicePlugin:
  deviceListStrategy: cdi-cri
  mpsV3:
    enabled: true
    binary: /usrbin/nvidia-cuda-mps-control
  nodeConfiguration:
    config: |
      {
        "nodeconfig": [
          {
            "name": "gpu-node-01",
            "operatingmode": "mps-v3",
            "devicememoryscaling": 1,
            "devicecorescaling": 1,
            "mpsv3": {
              "computeMode": "server-timeslice",
              "timeslice": "long",
              "timesliceYieldLevel": 1
            }
          }
        ]
      }
```

To select the default `namespace-cap` strategy, omit the `mpsv3` object or use `{"computeMode":"namespace-cap"}`. Each selected `mpsv3` object replaces the previous one. Enable `mpsV3.enabled` to mount the node-local state and pipe directories. Choose `cdi-cri` when the kubelet and CRI support CDI devices, or `cdi-annotations` when the runtime consumes CDI annotations. Use only CDI strategies on these nodes.

## Request compute and memory

Set `nvidia.com/vgpu-mode: mps-v3` on the Pod. The Pod's `hami.io/mps-compute-mode` must match the node's `mpsv3.computeMode`. The Pod defaults to `namespace-cap` when the annotation is omitted. Both strategies reserve core units from a 100-unit budget on each GPU. A resolved `gpucores` value of zero reserves 100 units. Use `nvidia.com/gpumem` or `nvidia.com/gpumem-percentage` according to the [GPU memory request rules](./specify-device-memory-usage.md). The Toolkit receives the final allocation in MiB as both the request and the hard limit. [NVIDIA r620 memory partitioning](https://docs.nvidia.com/deploy/mps/620/mpsv3-memory-partitioning.html)

Leave `CUDA_MPS_*` and `NVIDIA_GPU_MEMORY_*` settings to HAMi. The webhook rejects these variables in the `env` of GPU containers that explicitly select MPS v3.

| Strategy | Meaning of `nvidia.com/gpucores: 25` |
| --- | --- |
| `namespace-cap` | CUDA client contexts attached to the namespace have a 25% active-thread cap. The cap applies per context. |
| `server-timeslice` | The container's server uses 25% of the daemon's base compute timeslice. Actual GPU time and throughput depend on which servers have work ready to run. |

For example, this Pod uses 4 GiB of GPU memory and a timeslice of 25% of the configured base duration.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mps-training
  annotations:
    nvidia.com/vgpu-mode: mps-v3
    hami.io/mps-compute-mode: server-timeslice
spec:
  restartPolicy: Never
  containers:
    - name: training
      image: your-cuda-application:tag
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 4096
          nvidia.com/gpucores: 25
```

Use `nvidia.com/gpu: 2` for two GPUs. Each GPU in a container must receive the same final memory and compute allocation. GPU sets can be identical or disjoint across containers. A request for GPUs A and B conflicts with an existing allocation for A alone.

For `server-timeslice`, `mpsv3.timeslice` accepts `default` (the device's default), `short` (10 ms), `medium` (20 ms), or `long` (50 ms). The optional `mpsv3.timesliceYieldLevel` accepts `1` or `2`. The driver may reject percentages that produce a slice below the device's minimum. [NVIDIA weighted timeslicing](https://docs.nvidia.com/deploy/mps/620/mpsv3-interface.html#weighted-timeslicing)

The node administrator sets GPU compute mode. `server-timeslice` requires `DEFAULT`. For `namespace-cap`, use `EXCLUSIVE_PROCESS` to block independent CUDA contexts from bypassing the MPS compute limit while the server holds the GPU. [NVIDIA GPU Compute Modes](https://docs.nvidia.com/deploy/mps/620/when-to-use-mps.html#gpu-compute-modes)

## Request static SMs and optional borrowing

Static SM partitioning requires an NVIDIA Ampere or newer GPU. For a `namespace-cap` Pod, add the following annotations and omit `gpucores` if the SM count is the only compute request.

```yaml
metadata:
  annotations:
    nvidia.com/vgpu-mode: mps-v3
    hami.io/mps-sm-count: "16"
    hami.io/mps-sm-shareable: "true"
    hami.io/mps-sm-max-chunks: "16"
```

- `hami.io/mps-sm-count` applies to each GPU of every GPU container in the Pod. An Ampere discrete GPU uses 2 SMs per chunk, so the example reserves eight chunks. Hopper and newer discrete GPUs use 8 SMs per chunk. Integrated GPUs use 2 SMs per chunk. A fixed partition can also use the device's remainder if it yields the exact requested count.
- `hami.io/mps-sm-shareable` allows the driver to lend the partition's idle SMs while it has no attached clients. Its default is `false`.
- `hami.io/mps-sm-max-chunks` caps the **total** chunks the partition may use, including its base reservation. The default `0` disables borrowing. A positive integer must be between the base and total chunks on every allocated GPU. Use `unlimited` to let the driver use available capacity without a configured cap.
- Borrowing or lending requires a base reservation made of whole chunks. The scheduler and quota account for the base reservation as `ceil(requested SMs / total SMs × 100)`. An explicit `gpucores` value must cover this charge. The driver controls how many additional SMs can be used at runtime.

HAMi binds each partition to the namespace by GPU UUID. The namespace uses an active-thread percentage of 100 in this case. A physical GPU can serve either static SM partitions or namespace percentage allocations at a given time. The driver's ability to create another partition with clients already attached depends on the environment. HAMi returns the driver's error and rolls back the attempted allocation if creation fails. [NVIDIA partition load balancing](https://docs.nvidia.com/deploy/mps/620/mpsv3-interface.html#sm-partition-load-balancing), [NVIDIA namespace assignments](https://docs.nvidia.com/deploy/mps/620/mpsv3-namespaces.html#sm-partition-assignments)

## Upgrade, switch strategy, or diagnose a failure

1. Prevent new workloads from landing on the node and drain its MPS workloads.
2. Apply the new driver, plugin, or node policy after reclamation. The same drain applies before changing `computeMode`, the base timeslice, the yield level, or the state root.
3. Confirm that the plugin reports healthy devices and run a workload with the intended strategy before reopening the node to GPU workloads.

| Symptom | What to check |
| --- | --- |
| The node rejects MPS v3 during startup | Check driver r620, cgroup v2, non-MIG GPUs, UUID device IDs, scaling, the MPS control binary, and the published CDI hook. |
| The device plugin cannot connect to the host MPS daemon | Check that the host service is running in protocol v3 and uses exactly `<root>/pipe`. From the host, run the `compute-policy get timeslice` command shown above to verify the connection. |
| A Pod cannot find a compatible GPU, for example `CardMPSV3Incompatible` | Check the Pod and node strategies, available core and memory budget, the SM chunk geometry, and existing GPU sets. |
| Timeslice setup or readback fails | Check the target GPU and driver with the selected base timeslice. The driver can reject unsupported settings. Each GPU must use `DEFAULT` compute mode for `server-timeslice`. |
| Compute policy mismatch when creating a server | HAMi reapplies and verifies the policy when the daemon has no servers. If servers exist, drain first. To return an explicit yield level to `unset`, restart the drained daemon with yield omitted from its startup settings. |
| Cleanup is waiting for clients | Let clients exit. HAMi removes the namespace first, then the partition and the last unused server. |
| The daemon restarted with live allocations | If an allocation’s server, namespace, or partition is missing, HAMi marks its GPUs unhealthy. Investigate the daemon and recreate affected workloads through Kubernetes. Preserve the allocation state while the Pods are live. |

Each container receives a read-only mount of its namespace socket directory at `/run/hami-mps`. Compute settings apply to CUDA processes that attach through that socket. The MPS policies do not isolate memory bandwidth or provide MIG-style fault containment. Container restarts retain their allocations. Manager recovery requires the daemon and its resources to be available for live workloads.

See the [MPS v3 backend design](../../developers/mps-v3-design.md) for allocation and recovery details.
