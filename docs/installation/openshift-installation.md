---
title: Deploy HAMi on OpenShift
sidebar_label: HAMi on OpenShift
translated: true
---

This guide describes the recommended way to deploy HAMi on OpenShift, covering SCC, random UIDs, non-privileged ports, and SELinux.

## Prerequisites

- An OpenShift cluster with the NVIDIA GPU Operator installed
- NVIDIA drivers and Container Toolkit ready
- An NVIDIA RuntimeClass configured by the GPU Operator
- Permission to create cluster-scoped `SecurityContextConstraints` (SCC)

Confirm the cluster setup:

```bash
oc get runtimeclass
oc get nodes -L nvidia.com/gpu.present
oc describe node <gpu-node> | grep -A5 Taints
```

The examples below use a common GPU Operator configuration:

```text
RuntimeClass: nvidia
node label: nvidia.com/gpu.present=true
taint: nvidia.com/gpu=true:NoSchedule
driver root: /run/nvidia/driver
toolkit validation: /run/nvidia/validations
```

If your cluster uses different names or paths, adjust the values accordingly.

## Recommended configuration

Install HAMi into a dedicated project:

```bash
oc new-project hami
```

Create `values-openshift.yaml`:

```yaml
platform:
  openshift: true

openshift:
  securityContextConstraints:
    create: true
    name: hami-device-plugin

selinux:
  enabled: true
  type: container_file_t
  level: s0

scheduler:
  patch:
    runAsUser: null
  service:
    httpPort: 443
    httpTargetPort: 9443

devicePlugin:
  runtimeClassName: nvidia
  nvidiaDriverRoot: /run/nvidia/driver

  gpuOperatorToolkitReady:
    enabled: true
    hostPath: /run/nvidia/validations

  nvidiaNodeSelector:
    nvidia.com/gpu.present: "true"

  tolerations:
    - key: nvidia.com/gpu
      operator: Exists
      effect: NoSchedule
```

Install HAMi:

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update

helm upgrade --install hami hami-charts/hami \
  --namespace hami \
  --create-namespace \
  -f values-openshift.yaml
```

## Security model

### Scheduler and admission

The scheduler and admission components should use OpenShift `restricted-v2` or an equivalent restricted SCC.

Recommended security context:

```yaml
securityContext:
  runAsNonRoot: true
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
  seccompProfile:
    type: RuntimeDefault
```

Leave `runAsUser` unset so OpenShift assigns a UID from the project UID range.

The scheduler extender listens on non-privileged port `9443` inside the container, while the Service continues to expose `443`:

```text
Service port 443 -> targetPort 9443 -> containerPort 9443
```

The Deployment, Service, and kube-scheduler extender ConfigMap must use the same target port.

### Device plugin

The device plugin uses the Chart-created `hami-device-plugin` SCC. This SCC is granted only to the device-plugin ServiceAccount and allows the permissions required by the node component:

- privileged container
- host PID
- hostPath
- `SYS_ADMIN` capability
- `RunAsAny` UID and SELinux context

The SCC disables host IPC, host network, and host ports, and restricts allowed volume types.

Scheduler, admission, and regular workload ServiceAccounts are not bound to this SCC.

## SELinux

Enable SELinux relabeling:

```yaml
selinux:
  enabled: true
  type: container_file_t
  level: s0
```

The relabel initContainer only processes shared directories managed by HAMi that containers need to access:

```text
/usr/local/vgpu
/usr/local/vgpu/containers
/tmp/vgpulock
```

These paths use `container_file_t` so restricted workload containers can access HAMi shared data under the normal SELinux container domain.

The NVIDIA driver root is managed by the GPU Operator and mounted read-only into the device plugin and monitor:

```text
/run/nvidia/driver
```

HAMi does not change the SELinux label of that path.

## Verification

Check the rendered manifests:

```bash
helm template hami hami-charts/hami \
  --namespace hami \
  -f values-openshift.yaml > /tmp/hami-openshift.yaml

grep -nE 'SecurityContextConstraints|system:openshift:scc|http_bind|targetPort|urlPrefix|runtimeClassName' \
  /tmp/hami-openshift.yaml
```

Check component status:

```bash
oc rollout status deployment/hami-scheduler -n hami
oc rollout status daemonset/hami-device-plugin -n hami
```

Check which SCC each Pod uses:

```bash
oc get pods -n hami \
  -o 'custom-columns=NAME:.metadata.name,SCC:.metadata.annotations.openshift\.io/scc'
```

Expected results:

- scheduler and admission use a restricted SCC
- device-plugin uses the `hami-device-plugin` SCC
- scheduler extender listens on `9443`
- scheduler Service forwards `443` to `9443`
- device-plugin uses the configured NVIDIA RuntimeClass
- SELinux relabel covers only HAMi shared directories

Check SELinux labels on the node:

```bash
oc debug node/<gpu-node> -- chroot /host \
  ls -Zd /usr/local/vgpu /usr/local/vgpu/containers
```

HAMi shared directories should use the configured `container_file_t`.
