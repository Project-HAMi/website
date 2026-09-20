---
title: Align GPU and CPU NUMA placement
---

On large multi-socket servers, CPUs communicate faster with GPUs attached to the same NUMA node. Kubelet's Topology Manager can align the CPUs and the vGPU replica it hands to a container, but until the NUMA refit landed, that could diverge from the GPU the HAMi scheduler had selected: the container ran on one GPU while HAMi's annotations and accounting recorded another.

NUMA alignment closes that gap in two parts:

- The device plugin advertises each vGPU replica's NUMA node (`enableNumaTopology`), so the Topology Manager can restrict an allocation to NUMA-local replicas.
- When that restriction excludes the scheduler's original pick, the device plugin asks the scheduler to **refit** the allocation onto one of kubelet's allowed GPUs. The scheduler re-runs its normal policy fit, updates both allocation annotations, and moves the reservation, so runtime, annotations, and accounting agree.

Requires a HAMi release newer than v2.10.0 (the NUMA refit, [Project-HAMi/HAMi#2731](https://github.com/Project-HAMi/HAMi/pull/2731)). hami-core mode only; MIG-mode nodes are excluded.

## Node prerequisites

The Topology Manager only restricts allocations when kubelet is configured for it:

```yaml
# /var/lib/kubelet/config.yaml
cpuManagerPolicy: static
reservedSystemCPUs: <your reserved set>
topologyManagerPolicy: single-numa-node
topologyManagerScope: container
```

On servers with more than 8 NUMA nodes, also set:

```yaml
topologyManagerPolicyOptions:
  max-allowable-numa-nodes: "16"
```

## Enable the feature

All pieces are off by default. In the Helm values:

```yaml
devicePlugin:
  # Advertise each replica's NUMA node to kubelet.
  enableNumaTopology: true
  # Let the device plugin call the scheduler's refit endpoint.
  numaRefit:
    enabled: true
  nodeConfiguration:
    config: |
      {
        "nodeconfig": [
          {
            "name": "<your-gpu-node>",
            "operatingmode": "hami-core",
            "enablenumatopology": true,
            "enablegetpreferredallocation": true
          }
        ]
      }
```

The refit client verifies the scheduler's TLS certificate. Because the scheduler serves the admission webhook's self-signed certificate by default, the chart sets `numaRefit.tlsInsecure: true` unless you provide a CA: either `numaRefit.caSecret` (a Secret with key `ca.crt`, mounted automatically) or `numaRefit.caFile` (a path already present in the device-plugin container).

## Opt in per Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: numa-aligned
  annotations:
    hami.io/numa-alignment: "best-effort"
spec:
  containers:
    - name: main
      image: ubuntu:22.04
      command: ["sleep", "infinity"]
      resources:
        limits:
          cpu: "8"
          memory: 8Gi
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 20000
```

- `best-effort`: if the refit cannot move the allocation, kubelet's own selection stands and the mismatch is only logged. Behavior without the refit deployed is unchanged.
- `strict`: if the refit is enabled and cannot reconcile the mismatch, the allocation fails instead of running misaligned. With the refit disabled, strict only logs at error severity.

A successful refit emits a `NumaRefitSucceed` event on the Pod:

```
Normal  NumaRefitSucceed  NUMA refit moved container 0 from [GPU-f4c61521...] to [GPU-ba09367f...]
```

`hami.io/numa-alignment` is independent of `nvidia.com/numa-bind`: numa-bind asks for all of a container's GPUs to share one NUMA node, while numa-alignment reconciles the scheduler's GPU choice with kubelet's CPU placement. They can be combined.

## Notes

- A Pod that pins devices with `nvidia.com/use-gpuuuid` is never refitted onto other GPUs; if the pinned GPU is outside kubelet's allowed set, the refit refuses and the mode decides the outcome.
- Reservations whose devices carry differing memory or core amounts per device are not refitted.
- Validated end to end on 8x NVIDIA RTX PRO 6000 Blackwell Server Edition (driver 610.43.02, Kubernetes v1.35.6, Topology Manager `single-numa-node`).
