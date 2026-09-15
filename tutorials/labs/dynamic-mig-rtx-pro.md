---
title: "Lab 16: Dynamic MIG Lifecycle on RTX PRO 6000"
description: "Install HAMi v2.10.0 and verify per-Pod MIG placement, mixed profiles, selective reclamation, restart recovery, and multi-GPU spillover."
sidebar_label: "Lab 16: Dynamic MIG Lifecycle"
lab:
  level: Advanced
  duration: about 90 minutes
  environment: single-node Kubernetes server with 7 NVIDIA RTX PRO 6000 Blackwell GPUs
  cost: requires access to billable multi-GPU hardware
  authors:
    - shkatara
    - saiyam1814
  verified: "2026-09-15"
tags:
  - gpu-partitioning
  - nvidia
  - hami
toc_max_heading_level: 2
---

This lab installs the official HAMi v2.10.0 chart, then follows one MIG allocation through creation, saturation, mixed-profile placement, selective reclamation, device-plugin adoption, and spillover to a second GPU. A Pod asks for memory through HAMi's usual resource API; HAMi chooses the smallest allowed NVIDIA MIG profile with enough memory and a legal free placement, then creates and later reclaims that Pod's GPU Instance (GI) and Compute Instance (CI).

The procedure originated in the [first verified test](https://blog.kubesimplify.com/dynamic-mig-in-kubernetes-with-hami), which [Shubham Katara](https://github.com/shkatara) and [Saiyam Pathak](https://github.com/saiyam1814) wrote together on the kubesimplify blog. The complete Dynamic MIG lifecycle and the outputs below were re-verified on 2026-09-15 with the official v2.10.0 chart and `projecthami/hami:v2.10.0` release image. The documented fresh-install path was repeated after the lifecycle run and reached the same healthy one-GPU baseline. HAMi v2.10.0 includes [HAMi PR #2378](https://github.com/Project-HAMi/HAMi/pull/2378), which introduced this per-Pod Dynamic MIG implementation.

## What You'll Learn

- Pin the official HAMi chart and all three HAMi runtime containers to v2.10.0.
- Distinguish HAMi's per-node `operatingmode: "mig"` from NVIDIA's static `migStrategy`.
- Verify one 8,000 MiB request, four-placement saturation, and mixed `1g.24gb` plus `2g.48gb` placement.
- Prove that deleting one Pod reclaims only its GI/CI while a neighboring CUDA loop progresses.
- Prove that a complete live allocation survives a device-plugin restart with the same MIG UUID.
- Expose a second GPU and verify that a fifth small Pod spills over instead of overcommitting the first GPU.

## Lab Overview

```mermaid
%% title: Dynamic MIG Lifecycle Lab Flow
flowchart TB
    subgraph P1["Phase 1: Prepare the node"]
        direction LR
        S1["Step 1<br/>Inventory and handover"] --> S2["Step 2<br/>Render and install v2.10.0"]
    end
    subgraph P2["Phase 2: Allocate MIG per Pod"]
        direction LR
        S3["Step 3<br/>Create one 1g instance"] --> S4["Step 4<br/>Saturate four placements"] --> S5["Step 5<br/>Mix profiles and reclaim one"]
    end
    subgraph P3["Phase 3: Prove recovery and spillover"]
        direction LR
        S6["Step 6<br/>Restart plugin, adopt live instance"] --> S7["Step 7<br/>Register GPU 5, spill fifth Pod"]
    end
    P1 --> P2 --> P3
```

## Prerequisites

The verified environment was:

| Component         | Tested value                                     |
| ----------------- | ------------------------------------------------ |
| GPUs              | 7 × NVIDIA RTX PRO 6000 Blackwell Server Edition |
| GPU memory        | 97,887 MiB per physical GPU                      |
| NVIDIA driver     | `610.43.02`                                      |
| Kubernetes        | `v1.35.6`                                        |
| Operating system  | Ubuntu 24.04.4 LTS, kernel `6.8.0-138-generic`   |
| Container runtime | containerd `2.2.1`                               |
| HAMi chart/image  | `2.10.0` / `projecthami/hami:v2.10.0`            |

You also need:

- root access to the GPU node, working `nvidia-smi`, MIG-capable GPUs, and no unmanaged CUDA processes;
- Helm, `kubectl`, and `jq`;
- cluster-admin access and permission to replace the existing HAMi installation;
- a local checkout of this website repository for the files under [`tutorials/labs/examples/16-dynamic-mig-rtx-pro/`](https://github.com/Project-HAMi/website/tree/master/tutorials/labs/examples/16-dynamic-mig-rtx-pro); and
- an explicit maintenance window for the **whole GPU node**, not only the GPUs that HAMi will register.

The supplied values target the verified seven-GPU node and initially register only GPU index 4. If your topology differs, choose your own primary and spillover GPU indices in Step 1; Steps 2 and 7 derive the `filterdevices.index` exclusion lists from those choices and the node's GPU inventory. You need at least two compatible GPUs to reproduce Step 7.

Pod names, physical and MIG UUIDs, GI/CI IDs, placement order, and progress counters in the output blocks are captured evidence from the verified server. Your values will differ; verify the same relationships and invariants rather than matching those identifiers literally.

:::danger[Assign one MIG hardware owner]

NVIDIA GPU Operator MIG Manager and HAMi Dynamic MIG both create and destroy GI/CI state. They **must not control the same physical GPU at the same time**. GPU Operator may continue providing the driver, Container Toolkit, and monitoring, but stop MIG Manager reconciliation on the target node before this handover. Deleting one MIG Manager Pod is insufficient if its controller recreates it. HAMi must also be the only device plugin registering the parent `nvidia.com/gpu` resource on the target node.

Existing MIG Manager or legacy `knownMigGeometries` users must follow the pinned [Dynamic MIG migration guide](https://github.com/Project-HAMi/HAMi/blob/v2.10.0/docs/develop/dynamic-mig-migration.md): inventory, cordon, drain legacy GPU Pods, transfer mutation ownership, then validate one node at a time.

:::

Host-level `nvidia-smi` commands run on the GPU node. `kubectl` and Helm may run anywhere with the intended kubeconfig; the verified single-node run executed everything on that node.

## Step 1: Back Up and Establish an Idle Handover

Select the single Kubernetes node, choose the two GPU indices this lab uses, and set a durable working directory. If your cluster has other nodes, set `NODE` explicitly to the multi-GPU node instead.

```bash
export NODE=$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}')
export PRIMARY_GPU=4   # the only GPU registered with HAMi until Step 7
export SECONDARY_GPU=5 # the spillover GPU added in Step 7
export LAB=/root/hami-dynamic-mig-v2.10.0
export EXAMPLES=tutorials/labs/examples/16-dynamic-mig-rtx-pro

mkdir -p "$LAB"
```

The verified run used GPU 4 and GPU 5. Every later command that touches those GPUs reads these two variables, and Steps 2 and 7 derive the `filterdevices.index` exclusion lists from them.

Steps 6 and 7 restart the `hami-device-plugin` DaemonSet. The chart schedules it on every node labeled `gpu=on`, so confirm that `$NODE` is the only such node before continuing:

```bash
kubectl get nodes -l gpu=on -o name
```

If a release named `hami` already exists in `hami-system`, save both Helm's stored state and the live objects; they can differ.

```bash
if helm status hami -n hami-system >/dev/null 2>&1; then
  helm get values hami -n hami-system --all -o yaml \
    > "$LAB/helm-values-before.yaml"
  helm get manifest hami -n hami-system \
    > "$LAB/helm-manifest-before.yaml"
  kubectl get configmaps -n hami-system -o yaml \
    > "$LAB/live-configmaps-before.yaml"
fi
kubectl get node "$NODE" -o yaml > "$LAB/node-before.yaml"
kubectl get pods -A --field-selector spec.nodeName="$NODE" -o wide
nvidia-smi -L > "$LAB/nvidia-smi-L-before.txt"
```

Inventory MIG mode and active compute processes:

```bash
nvidia-smi \
  --query-gpu=index,name,uuid,driver_version,memory.total,mig.mode.current \
  --format=csv

nvidia-smi \
  --query-compute-apps=gpu_uuid,pid,process_name,used_gpu_memory \
  --format=csv
```

The seven cards reported MIG mode disabled before the handover. These are the two rows used later; HAMi enabled MIG mode during the controlled plugin startup:

```plaintext
4, NVIDIA RTX PRO 6000 Blackwell Server Edition, GPU-4c395b7a-a7e6-d90f-1ced-d96e8dd68288, 610.43.02, 97887 MiB, Disabled
5, NVIDIA RTX PRO 6000 Blackwell Server Edition, GPU-f4f5db98-143f-0a8d-47ce-956fab39a736, 610.43.02, 97887 MiB, Disabled
```

The process query returned only its header:

```plaintext
gpu_uuid, pid, process_name, used_gpu_memory [MiB]
```

Stop or migrate every GPU workload that the handover must not disrupt, disable MIG Manager reconciliation, and repeat the process query. Do not continue until the node has an explicitly empty baseline. Enabling MIG mode, clearing old layouts, and the initial plugin startup can reset GPUs.

## Step 2: Render and Perform the Controlled Install

Create node-specific copies of the supplied values and workload manifest. The exclusion list is every GPU index that `nvidia-smi` reports except `$PRIMARY_GPU`, so run this on the GPU node:

```bash
ONE_GPU_EXCLUDES=$(nvidia-smi --query-gpu=index --format=csv,noheader | tr -d ' ' |
  grep -vx "$PRIMARY_GPU" | paste -sd ',' - | sed 's/,/, /g')

sed -e "s/__NODE_NAME__/${NODE}/g" \
  -e "s/__EXCLUDED_GPU_INDICES__/${ONE_GPU_EXCLUDES}/" \
  "$EXAMPLES/hami-values.yaml" > "$LAB/hami-values-one-gpu.yaml"
sed "s/__NODE_NAME__/${NODE}/g" "$EXAMPLES/mig-small-pack.yaml" \
  > "$LAB/mig-small-pack.yaml"

grep -n '"index"' "$LAB/hami-values-one-gpu.yaml"
```

In the verified run the `grep` output showed `[0, 1, 2, 3, 5, 6]`, which registers only GPU 4.

Two similarly named settings have separate responsibilities:

- `devicePlugin.nodeConfiguration.config` sets `operatingmode: "mig"`, activating HAMi Dynamic MIG for this node.
- Top-level `devicePlugin.migStrategy: none` prevents the NVIDIA device-plugin path from publishing pre-created MIG resources such as `nvidia.com/mig-1g.24gb`. Workloads still request `nvidia.com/gpu`; HAMi creates their MIG instances dynamically.

The `filterdevices.index` field is an **exclusion** list; the rendered `[0, 1, 2, 3, 5, 6]` registers only GPU 4. It is not a startup safety boundary; Step 6 demonstrates that the plugin still reconciles filtered GPUs.

Add the official chart repository and render v2.10.0 before changing the cluster:

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update hami-charts

helm template hami hami-charts/hami \
  --version 2.10.0 \
  --namespace hami-system \
  --kube-version 1.35.6 \
  -f "$LAB/hami-values-one-gpu.yaml" \
  > "$LAB/rendered-hami-v2.10.0.yaml"

grep -n -A 25 'migProfileAllowlist' \
  "$LAB/rendered-hami-v2.10.0.yaml"
grep -n -E 'image:|imagePullPolicy:' \
  "$LAB/rendered-hami-v2.10.0.yaml"
! grep -q 'projecthami/hami:v2.9.0' \
  "$LAB/rendered-hami-v2.10.0.yaml"
```

Confirm the rendered allowlist includes `1g.24gb`, `2g.48gb`, and `4g.96gb` for `RTX PRO 6000 Blackwell Server Edition`, and that the scheduler extender, device plugin, and monitor all use `projecthami/hami:v2.10.0`.

:::warning[Destructive handover]

The verified run used a fresh reinstall only after all GPU Pods and processes were gone. This is not a general in-place upgrade procedure. Migrate an existing deployment with the pinned migration guide linked above.

:::

```bash
if helm status hami -n hami-system >/dev/null 2>&1; then
  helm uninstall hami -n hami-system --wait --timeout 5m
fi

helm upgrade --install hami hami-charts/hami \
  --version 2.10.0 \
  -n hami-system \
  --create-namespace \
  --reset-values \
  -f "$LAB/hami-values-one-gpu.yaml" \
  --wait \
  --timeout 10m

kubectl get pods -n hami-system \
  -o custom-columns='POD:.metadata.name,CONTAINERS:.spec.containers[*].name,IMAGES:.spec.containers[*].image'
```

The device plugin, monitor, and scheduler extender must all use the v2.10.0 release image. The separate `kube-scheduler` sidecar keeps its Kubernetes-matching image:

```plaintext
POD                               CONTAINERS                               IMAGES
hami-device-plugin-fpw2j          device-plugin,vgpu-monitor               docker.io/projecthami/hami:v2.10.0,docker.io/projecthami/hami:v2.10.0
hami-scheduler-7f4f4d866c-tmjss   kube-scheduler,vgpu-scheduler-extender   registry.cn-hangzhou.aliyuncs.com/google_containers/kube-scheduler:v1.35.6,docker.io/projecthami/hami:v2.10.0
```

Both plugin containers became ready without a restart in the v2.10.0 verification. If you see a restart, inspect the previous state before continuing:

```bash
kubectl get pods -n hami-system
kubectl logs -n hami-system \
  -l app.kubernetes.io/component=hami-device-plugin \
  --all-containers=true --previous --tail=100
```

## Step 3: Discover Placements and Create One `1g.24gb`

Inspect what the plugin learned from NVML:

```bash
kubectl get node "$NODE" -o json |
jq '
  .metadata.annotations["hami.io/node-nvidia-register"]
  | fromjson
  | .[]
  | {id, index, type, mode, count, migProfiles}
'
```

GPU 4 registered these capabilities:

| Profile   | `memoryMB` | Core | `sliceCount` | Legal NVML placements (`start`, `size`) |
| --------- | ---------: | ---: | -----------: | --------------------------------------- |
| `1g.24gb` |     24,192 |   25 |            1 | `(0,3)`, `(3,3)`, `(6,3)`, `(9,3)`      |
| `2g.48gb` |     48,512 |   50 |            2 | `(0,6)`, `(6,6)`                        |
| `4g.96gb` |     97,408 |  100 |            4 | `(0,12)`                                |

`start` and `size` describe a half-open slice interval `[start, start + size)`; they are not GiB. The registered `count: 4` is only a coarse maximum. Actual capacity depends on non-overlapping legal placements.

Create the namespace and one repeatable CUDA workload. It runs NVIDIA's `vectorAdd` sample continuously as non-root UID/GID 65532 with privilege escalation and Linux capabilities disabled, and increments `/tmp/gpu-progress` after every successful iteration.

```bash
kubectl create namespace hami-mig-retest
kubectl apply -f "$LAB/mig-small-pack.yaml"
kubectl rollout status deployment/mig-small-pack \
  -n hami-mig-retest --timeout=180s

POD=$(kubectl get pods -n hami-mig-retest \
  -l app=mig-small-pack \
  -o jsonpath='{.items[0].metadata.name}')
```

Inspect HAMi's controller-owned allocation identity. Users may read this annotation but must never create or edit it.

```bash
kubectl get pod "$POD" -n hami-mig-retest -o json |
jq '.metadata.annotations["hami.io/vgpu-mig-allocations"] | fromjson'
```

The 8,000 MiB request selected the smallest fitting allowed profile:

```json
[
  {
    "containerIndex": 0,
    "deviceIndex": 0,
    "gpuUUID": "GPU-4c395b7a-a7e6-d90f-1ced-d96e8dd68288",
    "profile": "1g.24gb",
    "placement": { "start": 9, "size": 3 },
    "migUUID": "MIG-a5fa6120-f6fa-51b6-9820-a42112640629",
    "gpuInstanceID": 6,
    "computeInstanceID": 0
  }
]
```

On a Dynamic MIG node, `nvidia.com/gpumem: 8000` is a **minimum profile requirement**, not an 8,000 MiB software cap. This GPU has no 8 GiB profile, so the container receives the complete 24,192 MiB instance. `nvidia.com/gpucores` does not choose a MIG profile; the hardware profile fixes the compute fraction.

Confirm that the host and container expose the same MIG UUID, then prove the workload advances:

```bash
nvidia-smi -L
kubectl exec -n hami-mig-retest "$POD" -- nvidia-smi -L

before=$(kubectl exec -n hami-mig-retest "$POD" -- cat /tmp/gpu-progress)
sleep 3
after=$(kubectl exec -n hami-mig-retest "$POD" -- cat /tmp/gpu-progress)
printf 'before=%s after=%s\n' "$before" "$after"
test "$after" -gt "$before"
```

```plaintext
before=2 after=13
```

The first placement need not start at 0; the verified first allocation legally started at 9.

## Step 4: Fill All Four Legal Placements

Scale the same Deployment to four Pods:

```bash
kubectl scale deployment/mig-small-pack \
  -n hami-mig-retest --replicas=4
kubectl rollout status deployment/mig-small-pack \
  -n hami-mig-retest --timeout=180s
nvidia-smi -L

kubectl get pods -n hami-mig-retest -l app=mig-small-pack -o json |
jq -r '
  ["PARENT_GPU", "PROFILE", "START", "SIZE"],
  (
    .items[]
    | (.metadata.annotations["hami.io/vgpu-mig-allocations"] | fromjson | .[0]) as $a
    | [$a.gpuUUID, $a.profile, ($a.placement.start | tostring), ($a.placement.size | tostring)]
  )
  | @tsv
'
```

All four legal `1g.24gb` starts were occupied:

```plaintext
PARENT_GPU                                   PROFILE    START  SIZE
GPU-4c395b7a-a7e6-d90f-1ced-d96e8dd68288   1g.24gb   0      3
GPU-4c395b7a-a7e6-d90f-1ced-d96e8dd68288   1g.24gb   3      3
GPU-4c395b7a-a7e6-d90f-1ced-d96e8dd68288   1g.24gb   6      3
GPU-4c395b7a-a7e6-d90f-1ced-d96e8dd68288   1g.24gb   9      3
```

With only GPU 4 registered, a fifth replica remained unbound instead of overcommitting the card:

```bash
kubectl scale deployment/mig-small-pack \
  -n hami-mig-retest --replicas=5
sleep 15
kubectl get pods -n hami-mig-retest -o wide

PENDING_POD=$(kubectl get pods -n hami-mig-retest \
  -l app=mig-small-pack --field-selector=status.phase=Pending \
  -o jsonpath='{.items[0].metadata.name}')
kubectl describe pod "$PENDING_POD" -n hami-mig-retest | \
  grep 'CardTimeSlicingExhausted'
```

Its scheduling event included:

```plaintext
0/1 nodes are available: 1 1/1 CardTimeSlicingExhausted.
```

The inherited event name is misleading here: this test did not use time slicing. It means no legal Dynamic MIG placement remained on a registered GPU. Return to four replicas before continuing:

```bash
kubectl scale deployment/mig-small-pack \
  -n hami-mig-retest --replicas=4
```

## Step 5: Mix Profiles and Reclaim Only One Instance

Remove the packing Pods, derive the primary GPU's UUID on this host, and run the supplied script. It creates an 8,000 MiB Pod and a 30,000 MiB Pod with the same CUDA progress loop and pins both to the same physical card.

```bash
kubectl scale deployment/mig-small-pack \
  -n hami-mig-retest --replicas=0
kubectl wait -n hami-mig-retest \
  --for=delete pod -l app=mig-small-pack --timeout=180s

export GPU_UUID=$(nvidia-smi -i "$PRIMARY_GPU" --query-gpu=uuid --format=csv,noheader)
"$EXAMPLES/create-mixed-pods.sh"
```

Inspect both allocation records:

```bash
kubectl get pods mixed-small mixed-large -n hami-mig-retest -o json |
jq -r '
  ["POD", "PROFILE", "START", "SIZE", "MIG_UUID", "GI", "CI"],
  (
    .items
    | sort_by(.metadata.name)[]
    | . as $pod
    | ($pod.metadata.annotations["hami.io/vgpu-mig-allocations"] | fromjson | .[0]) as $a
    | [
        $pod.metadata.name,
        $a.profile,
        ($a.placement.start | tostring),
        ($a.placement.size | tostring),
        $a.migUUID,
        ($a.gpuInstanceID | tostring),
        ($a.computeInstanceID | tostring)
      ]
  )
  | @tsv
'
```

The live allocation table was:

```plaintext
POD          PROFILE    START  SIZE  MIG_UUID                                      GI  CI
mixed-large  2g.48gb    0      6     MIG-b23491d8-d784-58d9-bcfa-3c171ead22da      1   0
mixed-small  1g.24gb    9      3     MIG-a5fa6120-f6fa-51b6-9820-a42112640629      6   0
```

Intervals `[0,6)` and `[9,12)` do not overlap, so both profiles fit. During the same three-second window both loops progressed:

```bash
small_before=$(kubectl exec -n hami-mig-retest mixed-small -- cat /tmp/gpu-progress)
large_before=$(kubectl exec -n hami-mig-retest mixed-large -- cat /tmp/gpu-progress)
sleep 3
small_after=$(kubectl exec -n hami-mig-retest mixed-small -- cat /tmp/gpu-progress)
large_after=$(kubectl exec -n hami-mig-retest mixed-large -- cat /tmp/gpu-progress)
printf 'small: %s -> %s\nlarge: %s -> %s\n' \
  "$small_before" "$small_after" "$large_before" "$large_after"
test "$small_after" -gt "$small_before"
test "$large_after" -gt "$large_before"
```

```plaintext
small: 23 -> 30
large: 14 -> 21
```

Now capture the small instance identity, delete only its Pod, and poll the host because reclamation is asynchronous:

```bash
small_mig_uuid=$(kubectl get pod mixed-small -n hami-mig-retest -o json |
  jq -r '.metadata.annotations["hami.io/vgpu-mig-allocations"] | fromjson | .[0].migUUID')
large_before=$(kubectl exec -n hami-mig-retest mixed-large -- \
  cat /tmp/gpu-progress)

kubectl delete pod mixed-small -n hami-mig-retest

until ! nvidia-smi -L | grep -Fq "$small_mig_uuid"; do
  sleep 1
done
nvidia-smi -L | grep '^  MIG '
```

Only the large instance remained:

```plaintext
MIG 2g.48gb Device 0: (UUID: MIG-b23491d8-d784-58d9-bcfa-3c171ead22da)
```

Verify the neighbor continued computing throughout the reclaim:

```bash
large_after=$(kubectl exec -n hami-mig-retest mixed-large -- \
  cat /tmp/gpu-progress)
printf 'large: %s -> %s\n' "$large_before" "$large_after"
test "$large_after" -gt "$large_before" \
  && echo 'PASS: 2g workload survived 1g reclamation'
```

```plaintext
large: 37 -> 101
PASS: 2g workload survived 1g reclamation
```

On this GPU and driver, recreating the freed placement later produced the same `MIG-a5fa...` UUID. A MIG UUID is not a generation counter: observed disappearance proves reclamation, while a different UUID is not required for recreation.

## Step 6: Restart the Device Plugin and Verify UUID Stability

This is a disruptive controller test. Keep only the valid, HAMi-managed `mixed-large` allocation active. Every other GPU on the node must remain free of unmanaged work, because plugin startup has node-wide hardware scope in v2.10.0.

Record the allocation's UUID and progress, replace the device-plugin Pod running on `$NODE`, and wait for the DaemonSet:

```bash
LARGE_MIG_UUID=$(kubectl get pod mixed-large -n hami-mig-retest -o json |
  jq -r '.metadata.annotations["hami.io/vgpu-mig-allocations"] | fromjson | .[0].migUUID')
OLD_DP_POD=$(kubectl get pods -n hami-system \
  -l app.kubernetes.io/component=hami-device-plugin \
  --field-selector spec.nodeName="$NODE" \
  -o jsonpath='{.items[0].metadata.name}')
progress_before=$(kubectl exec -n hami-mig-retest mixed-large -- \
  cat /tmp/gpu-progress)

kubectl delete pod "$OLD_DP_POD" -n hami-system
kubectl rollout status daemonset/hami-device-plugin \
  -n hami-system --timeout=180s

NEW_DP_POD=$(kubectl get pods -n hami-system \
  -l app.kubernetes.io/component=hami-device-plugin \
  --field-selector spec.nodeName="$NODE" \
  -o jsonpath='{.items[0].metadata.name}')
kubectl logs "$NEW_DP_POD" -n hami-system --all-containers=true |
  grep 'mig init: resolved startup layout'
```

The replacement plugin classified GPU 4 as in use and all other GPUs as reset candidates:

```plaintext
mig init: resolved startup layout inUseGPUs=[4] resetGPUs=[0,1,2,3,5,6]
```

It verified the complete Pod annotation against NVML and adopted the live allocation. Confirm the exact UUID still exists and the CUDA loop advanced:

```bash
nvidia-smi -L | grep -F "$LARGE_MIG_UUID"

progress_after=$(kubectl exec -n hami-mig-retest mixed-large -- \
  cat /tmp/gpu-progress)
printf 'progress: %s -> %s\n' "$progress_before" "$progress_after"
test "$progress_after" -gt "$progress_before" \
  && echo 'PASS: MIG UUID and CUDA workload survived device-plugin restart'
```

```plaintext
progress: 133 -> 151
PASS: MIG UUID and CUDA workload survived device-plugin restart
```

:::danger[Filtering does not constrain startup mutation]

The log proves that `filterdevices` limits registration and scheduling but not Dynamic MIG startup cleanup in v2.10.0. The plugin reconciled all seven physical GPUs, including filtered ones. Treat the first install and every plugin restart as whole-node maintenance. This happy-path recovery also assumes a complete, valid allocation annotation; it does not promise adoption of malformed state.

:::

## Step 7: Expose GPU 5 and Verify Fifth-Pod Spillover

Delete the mixed-profile workload and wait until no test MIG instance remains:

```bash
kubectl delete pod mixed-large -n hami-mig-retest

until ! nvidia-smi -L | grep -q '^  MIG '; do
  sleep 2
done
```

Render a second values file whose exclusion list omits both `$PRIMARY_GPU` and `$SECONDARY_GPU`. In the verified run this changed the list from `[0, 1, 2, 3, 5, 6]` to `[0, 1, 2, 3, 6]`, registering GPUs 4 and 5.

```bash
TWO_GPU_EXCLUDES=$(nvidia-smi --query-gpu=index --format=csv,noheader | tr -d ' ' |
  grep -vx -e "$PRIMARY_GPU" -e "$SECONDARY_GPU" | paste -sd ',' - | sed 's/,/, /g')

sed -e "s/__NODE_NAME__/${NODE}/g" \
  -e "s/__EXCLUDED_GPU_INDICES__/${TWO_GPU_EXCLUDES}/" \
  "$EXAMPLES/hami-values.yaml" > "$LAB/hami-values-two-gpus.yaml"
grep -n '"index"' "$LAB/hami-values-two-gpus.yaml"

helm upgrade hami hami-charts/hami \
  --version 2.10.0 \
  -n hami-system \
  --reset-values \
  -f "$LAB/hami-values-two-gpus.yaml" \
  --wait \
  --timeout 10m

# This ConfigMap change did not trigger a plugin rollout in the verified chart.
kubectl rollout restart daemonset/hami-device-plugin -n hami-system
kubectl rollout status daemonset/hami-device-plugin \
  -n hami-system --timeout=180s
```

Do not trust Helm success alone. Verify the live node registration:

```bash
kubectl get node "$NODE" -o json |
jq -r '
  .metadata.annotations["hami.io/node-nvidia-register"]
  | fromjson
  | map(.index)
  | sort
  | join(",")
'
```

```plaintext
4,5
```

Scale the existing Deployment from zero to five and inspect each parent GPU:

```bash
kubectl scale deployment/mig-small-pack \
  -n hami-mig-retest --replicas=5
kubectl rollout status deployment/mig-small-pack \
  -n hami-mig-retest --timeout=180s

kubectl get pods -n hami-mig-retest -l app=mig-small-pack -o json |
jq -r '
  ["POD", "PARENT_GPU", "PROFILE", "START"],
  (
    .items
    | sort_by(.metadata.name)[]
    | . as $pod
    | ($pod.metadata.annotations["hami.io/vgpu-mig-allocations"] | fromjson | .[0]) as $a
    | [
        $pod.metadata.name,
        $a.gpuUUID,
        $a.profile,
        ($a.placement.start | tostring)
      ]
  )
  | @tsv
'
```

The verified bin-packing result filled all four placements on GPU 4, then placed the fifth Pod on GPU 5:

```plaintext
POD                               PARENT_GPU                                   PROFILE    START
mig-small-pack-6784898ddb-5pwjh    GPU-4c395b7a-a7e6-d90f-1ced-d96e8dd68288   1g.24gb   6
mig-small-pack-6784898ddb-65tvf    GPU-4c395b7a-a7e6-d90f-1ced-d96e8dd68288   1g.24gb   0
mig-small-pack-6784898ddb-jgq6k    GPU-4c395b7a-a7e6-d90f-1ced-d96e8dd68288   1g.24gb   9
mig-small-pack-6784898ddb-vhw7l    GPU-f4f5db98-143f-0a8d-47ce-956fab39a736   1g.24gb   9
mig-small-pack-6784898ddb-zjldp    GPU-4c395b7a-a7e6-d90f-1ced-d96e8dd68288   1g.24gb   3
```

Placement starts are legal choices, not an allocation sequence; GPU 5's first allocation may start at 9.

## Cleanup

Delete the test namespace and verify that all per-Pod instances are gone before another plugin restart:

```bash
kubectl delete namespace hami-mig-retest \
  --wait=true --timeout=180s

if nvidia-smi -L | grep -q '^  MIG '; then
  echo 'FAIL: MIG instances remain'
  nvidia-smi -L
else
  echo 'PASS: no MIG instances remain'
fi
```

```plaintext
PASS: no MIG instances remain
```

Restore the original exclusion list, then deliberately restart the plugin while the whole node is idle:

```bash
helm upgrade hami hami-charts/hami \
  --version 2.10.0 \
  -n hami-system \
  --reset-values \
  -f "$LAB/hami-values-one-gpu.yaml" \
  --wait \
  --timeout 10m
kubectl rollout restart daemonset/hami-device-plugin -n hami-system
kubectl rollout status daemonset/hami-device-plugin \
  -n hami-system --timeout=180s

printf 'Registered GPU indices: '
kubectl get node "$NODE" -o json |
jq -r '
  .metadata.annotations["hami.io/node-nvidia-register"]
  | fromjson
  | map(.index)
  | join(",")
'

if nvidia-smi -L | grep -q '^  MIG '; then
  echo 'MIG state: FAIL - instances remain'
else
  echo 'MIG state: PASS - no instances remain'
fi
kubectl get pods -n hami-system
```

The verified final state was:

```plaintext
Registered GPU indices: 4
MIG state: PASS - no instances remain
NAME                              READY   STATUS    RESTARTS
hami-device-plugin-fpw2j          2/2     Running   0
hami-scheduler-7f4f4d866c-tmjss   2/2     Running   0
```

This leaves HAMi v2.10.0 running with only GPU 4 registered. Preserve the Step 1 backups until you have either accepted this installation or restored the previous deployment through its documented migration or rollback procedure. Do not directly roll binaries back to a legacy Dynamic MIG implementation while new-format allocations are active.

## Operational Traps

- **Pin both chart and runtime version.** Use `--version 2.10.0` and inspect the extender, plugin, and monitor images; do not use an unversioned chart or `latest` image.
- **`operatingmode` is not `migStrategy`.** The node JSON selects HAMi Dynamic MIG; the top-level Helm value controls NVIDIA's static resource exposure path.
- **MIG Manager and HAMi cannot share mutation ownership.** Stop reconciliation, not just one Pod, before HAMi starts managing GI/CI state.
- **`filterdevices` is not a hardware protection boundary.** It excludes registration, while startup reconciliation can still touch every GPU on the node.
- **A Helm upgrade may not restart the plugin.** The tested DaemonSet had no checksum for the node-configuration ConfigMap. Restart only in a safe window, then inspect the live registration annotation.
- **Scheduler reasons can use inherited language.** `CardTimeSlicingExhausted` represented exhausted MIG placements here, not a switch to time slicing.
- **Reclamation is eventual and UUIDs may be reused.** Poll host state after deletion. Disappearance and later reappearance is stronger evidence than expecting a new UUID.
- **Dynamic placement is still constrained.** Profiles coexist only when NVML reports non-overlapping legal intervals; HAMi does not move or destroy a live neighbor to satisfy a new request.
- **A homogeneous test is not a heterogeneous-node guarantee.** The verified node had seven identical supported GPUs. Validate mixed-model nodes separately.

## What This Lab Proved

| Claim | Evidence |
| --- | --- |
| 8,000 MiB selects real hardware isolation | The Pod received one `1g.24gb` GI/CI and the same MIG UUID appeared on host and in container |
| One RTX PRO 6000 has four small-profile placements | Starts 0, 3, 6, and 9 were occupied; a fifth Pod stayed `Pending` while only GPU 4 was registered |
| Different profiles can coexist | `2g.48gb` at `[0,6)` and `1g.24gb` at `[9,12)` ran CUDA together |
| Reclamation is selective | Deleting `mixed-small` removed only its GI/CI while `mixed-large` advanced from 37 to 101 |
| Valid allocation state is recoverable | Plugin restart retained the `2g.48gb` UUID and CUDA progress advanced from 133 to 151 |
| Capacity spills across GPUs | With GPUs 4 and 5 registered, four Pods packed onto GPU 4 and the fifth used GPU 5 |

## Next Steps

- Read the pinned [migration guide](https://github.com/Project-HAMi/HAMi/blob/v2.10.0/docs/develop/dynamic-mig-migration.md) before moving a production node from fixed geometries or MIG Manager.
- Compare this hardware-isolated path with [Lab 7: GPU Isolation on k3s Without the GPU Operator](./hami-isolation-k3s.md), which verifies HAMi-core software isolation.
- Validate the [NVIDIA supported MIG profiles](https://docs.nvidia.com/datacenter/tesla/mig-user-guide/latest/supported-mig-profiles.html) for every GPU model and driver in your fleet.
