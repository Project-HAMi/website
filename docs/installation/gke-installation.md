---
sidebar_label: GKE Installation
title: HAMi on GKE
---

This guide covers installing HAMi on Google Kubernetes Engine (GKE) with **Container-Optimized OS (COS)** nodes. GKE COS needs a few extra steps beyond the standard [prerequisites](/docs/installation/prerequisites) and [online installation](/docs/installation/online-installation) guides, driven by two GKE-specific quirks:

1. Opting a node pool out of GKE's bundled NVIDIA device plugin (required so HAMi's device plugin can be the sole `nvidia.com/gpu` advertiser) also opts it out of GKE's automatic driver install on this GKE version — there's no way to keep one without the other.
2. `nvidia-container-cli` (the runtime component the standard NVIDIA Container Toolkit path uses to inject GPUs) has an internal RPC-sandbox bug on GKE COS nodes: its forked child process gets `ENOENT` on `/proc`, `/dev/nvidiactl`, and similar paths that are proven to exist and be correctly mounted. This reproduces regardless of driver/toolkit configuration correctness — confirmed via `strace -f`, no namespace/mount/chroot syscalls even fire before the failure. **CDI (Container Device Interface) bypasses this entirely**, since it injects GPU devices from a static spec file without ever invoking `nvidia-container-cli`'s sandbox.

Validated on: GKE COS, NVIDIA T4, driver 580.126.20, HAMi 2.10.0.

## 1. Create the GPU node pool

```bash
gcloud container node-pools create <POOL_NAME> \
  --project=<PROJECT_ID> \
  --cluster=<CLUSTER_NAME> \
  --location=<LOCATION> \
  --image-type=cos_containerd \
  --machine-type=n1-standard-8 \
  --accelerator=type=nvidia-tesla-t4,count=1,gpu-driver-version=disabled \
  --node-labels=gke-no-default-nvidia-gpu-device-plugin=true,nvidia.com/gpu.present=true,gpu=on \
  --node-taints=nvidia.com/gpu=present:NoSchedule \
  --num-nodes=1 \
  --enable-autorepair \
  --enable-autoupgrade
```

Why each flag matters:

| Flag | Reason |
| --- | --- |
| `--location` | Accepts either a zone (zonal pool) or a region (regional pool, one node per zone in that region) — use whichever matches your cluster. |
| `--image-type=cos_containerd` | This guide is COS-specific; it doesn't cover Ubuntu-based node images. |
| `gpu-driver-version=disabled` | Stops GKE from auto-installing its own driver via the bundled driver-installer + device-plugin DaemonSet. |
| `node-labels=gke-no-default-nvidia-gpu-device-plugin=true` | Opts the node out of GKE's bundled GPU device-plugin DaemonSet so HAMi's device plugin can be the sole `nvidia.com/gpu` advertiser. On GKE versions where the driver-installer and device-plugin are bundled together, this label disables _both_ — which is why the driver has to be installed manually (step 2). |
| `node-labels=nvidia.com/gpu.present=true` | Used as a `nodeSelector` for HAMi's scheduler pod and the setup jobs below. |
| `node-labels=gpu=on` | The label HAMi's scheduler uses to manage a node (see [prerequisites](/docs/installation/prerequisites#label-your-nodes)). Setting it as a node-pool label, rather than with a one-off `kubectl label node`, means it's applied to every node in the pool, including ones added later by autoscaling or node replacement. |
| `node-taints=nvidia.com/gpu=present:NoSchedule` | Keeps non-GPU workloads off this pool; every GPU pod (and every setup job below) needs to tolerate it. |

> **Node lifecycle:** steps 2 and 3 below install the driver and CDI tooling directly on each node's disk. Because they're set up as one-shot Jobs, not DaemonSets, they only run once per node — a replaced, upgraded, or newly autoscaled node won't have the driver or CDI spec until these steps are run against it again. For a pool that only ever autorepairs/autoupgrades in place this is a minor gap; for a pool that scales up-and-down or replaces nodes often, convert steps 2 and 3 into DaemonSets using the same `nodeAffinity`/tolerations shown in step 2, so they self-heal on every new node.

## 2. Install the NVIDIA driver

Because `gpu-driver-version=disabled` was set, GKE's own driver-installer DaemonSet (`nvidia-driver-installer`, namespace `kube-system`) never runs on this pool by default. Google's stock COS GPU-installer DaemonSet manifest can still be used — widen its `nodeAffinity` to include your new pool name (`cloud.google.com/gke-nodepool In [...]`) so it schedules there despite the label opt-out in step 1. It installs the driver into `/home/kubernetes/bin/nvidia` on the host — note this path, it's needed in step 4.

## 3. NVIDIA Container Toolkit + CDI setup

Run the following as privileged one-shot Jobs on the GPU node pool (tolerating the `nvidia.com/gpu=present:NoSchedule` taint and using `hostPID`/host mounts for `/`, matching the driver path from step 2):

1. **Install the toolkit** — run the toolkit installer against containerd, e.g.:

   ```bash
   nvidia-toolkit \
     --runtime=containerd \
     --runtime-class=nvidia \
     --config=/etc/containerd/config.toml \
     --socket=/run/containerd/containerd.sock \
     --root=/home/kubernetes/bin/nvidia-toolkit \
     --driver-root=/home/kubernetes/bin/nvidia \
     --restart-mode=systemd \
     --host-root=/host \
     --no-daemon
   ```

   This installs `nvidia-ctk`/`nvidia-cdi-hook` under `--root` and registers containerd runtime handlers — as of toolkit v1.17.x this includes both the legacy `nvidia` handler and an `nvidia-cdi` handler, as a side effect of this one command. You do not need `nvidia-container-cli` to work for this step to succeed; only the toolkit's CDI-generation tooling is used afterward. Every hostPath mount for this Job must land at the identical path inside and outside the container — the flags above are written into containerd's generated config verbatim, with no path translation, so a mismatch breaks pod-sandbox creation node-wide.

2. **Generate the CDI spec** — copy `nvidia-ctk`/`nvidia-cdi-hook` from the toolkit's `--root` onto the real host, then run:

   ```bash
   nvidia-ctk cdi generate \
     --driver-root=/home/kubernetes/bin/nvidia \
     --dev-root=/ \
     --nvidia-cdi-hook-path=<real-host-path-to-nvidia-cdi-hook> \
     --output=/var/run/cdi/nvidia.yaml
   ```

   `--dev-root=/` is required — omitting it silently defaults to the same value as `--driver-root`, so the spec generator only ever searches `<driver-root>/dev` for `/dev/nvidia0` and never finds it.

3. **Register the RuntimeClass** — expose the CDI-capable containerd runtime handler to Kubernetes:

   ```yaml
   apiVersion: node.k8s.io/v1
   kind: RuntimeClass
   metadata:
     name: nvidia-cdi
   handler: nvidia-cdi
   ```

   Confirm containerd already has the handler registered:

   ```bash
   grep -A2 'runtimes.nvidia-cdi' /etc/containerd/config.toml
   grep -E 'enable_cdi|cdi_spec_dirs' /etc/containerd/config.toml
   ```

   Step 1's toolkit install normally registers the `nvidia-cdi` runtime and sets `enable_cdi = true` / `cdi_spec_dirs` as a side effect. If either is missing on your toolkit version, register it explicitly and restart containerd:

   ```bash
   nvidia-ctk runtime configure --runtime=containerd --config=/etc/containerd/config.toml --cdi.enabled
   systemctl restart containerd
   ```

You do not need to make `nvidia-cdi` containerd's node-wide default runtime for HAMi itself (see step 4), but if any other GPU-image workload on the node needs GPU access outside HAMi's management, be aware that NVIDIA/CUDA-base images can crash-loop under the legacy default `nvidia` runtime even with no GPU fields in their pod spec, since these images often bake `NVIDIA_VISIBLE_DEVICES=all` into the image itself.

## 4. Install HAMi

```yaml
# values-gke.yaml
devicePlugin:
  runtimeClassName: nvidia-cdi
  nvidiaDriverRoot: /home/kubernetes/bin/nvidia
  nvidiaNodeSelector:
    gpu: "on"
    nvidia.com/gpu.present: "true"
  libPath: /var/lib/hami-vgpu
global:
  gpuHookPath: /var/lib/hami-vgpu
monitor:
  ctrPath: /var/lib/hami-vgpu
```

Notes specific to GKE COS:

- `devicePlugin.runtimeClassName: nvidia-cdi` routes **both** the device-plugin DaemonSet's own `runtimeClassName` and the scheduler webhook's injected `runtimeClassName` (for any pod requesting `nvidia.com/gpu`) onto the CDI runtime registered in step 3.
- `devicePlugin.nvidiaDriverRoot` defaults to unset in the chart, which silently skips mounting the host driver directory — always set this explicitly to the path from step 2, or NVML discovery fails with `Incompatible strategy detected auto` and no clearer error.
- `global.gpuHookPath`'s default (`/usr/local/vgpu`) fails on GKE COS because `/usr` is read-only on these nodes. Note that setting `global.gpuHookPath` alone is **not** enough — `devicePlugin.libPath` and `monitor.ctrPath` don't inherit it and must be set to the same path explicitly, or those components fall back to the broken default independently.
- If installing HAMi outside `kube-system` (e.g. a dedicated namespace), see the note on `priorityClassName` and GKE's `gcp-critical-pods` quota below.

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update
helm install hami hami-charts/hami \
  --version 2.10.0 \
  --namespace hami-system --create-namespace \
  --set scheduler.kubeScheduler.image.tag=<YOUR_K8S_VERSION> \
  -f values-gke.yaml
```

Pin `--version` to the chart release matching the HAMi version you've validated against — this guide was tested against chart/app version 2.10.0. Omitting `--version` installs whatever is currently latest, which may behave differently from what's documented here.

### If installing outside `kube-system`

HAMi's device-plugin and scheduler pods currently run with `priorityClassName: system-node-critical`, which GKE only auto-grants pod quota for inside `kube-system`/`gke-managed-*` namespaces. Installing into any other namespace needs a matching `ResourceQuota` created first:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: gcp-critical-pods
  namespace: hami-system
spec:
  hard:
    pods: "1000000000"
  scopeSelector:
    matchExpressions:
      - operator: In
        scopeName: PriorityClass
        values: [system-node-critical, system-cluster-critical]
```

## 5. Verify your installation

```bash
kubectl get pods -n hami-system
```

Both `hami-device-plugin` and `hami-scheduler` should be `Running` with no restarts. Confirm the device plugin picked up the CDI runtime:

```bash
kubectl get pods -n hami-system \
  -l app.kubernetes.io/name=hami-device-plugin \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.runtimeClassName}{"\n"}{end}' \
  | awk '{print} END {if (NR==0) {print "no hami-device-plugin pods found" > "/dev/stderr"; exit 1}}'
# expect one line per node, each with runtimeClassName: nvidia-cdi
```

Then run a GPU pod requesting a fractional slice (no `runtimeClassName` needed — HAMi's webhook injects it):

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hami-gke-test
spec:
  restartPolicy: Never
  tolerations:
    - key: nvidia.com/gpu
      operator: Equal
      value: present
      effect: NoSchedule
  containers:
    - name: test
      image: nvidia/cuda:12.4.1-base-ubuntu22.04
      command: ["nvidia-smi"]
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 4000
          nvidia.com/gpucores: 30
```

```bash
kubectl apply -f hami-gke-test.yaml
kubectl logs hami-gke-test   # expect nvidia-smi output, memory ceiling matching the requested gpumem
```

## Usage examples

- [Use Exclusive GPU](/docs/userguide/nvidia-device/examples/use-exclusive-card)
- [Allocate Specific Device Memory to a Container](/docs/userguide/nvidia-device/examples/allocate-device-memory)
- [Allocate Device Core Resources to a Container](/docs/userguide/nvidia-device/examples/allocate-device-core)
