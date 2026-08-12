---
title: Deploy HAMi on OpenShift
sidebar_label: HAMi on OpenShift
translated: true
---

This guide covers deploying HAMi on OpenShift, including SCC, random UIDs, non-privileged ports, and SELinux.

## Prerequisites

- OpenShift cluster with the NVIDIA GPU Operator installed
- NVIDIA drivers and Container Toolkit ready
- NVIDIA RuntimeClass configured by the GPU Operator
- Permission to create cluster-scoped `SecurityContextConstraints` (SCC)

Verify the cluster:

```bash
oc get runtimeclass
oc get nodes -L nvidia.com/gpu.present
oc describe node <gpu-node> | grep -A5 Taints
```

Example values in this guide assume the following GPU Operator layout. Adjust names and paths to match your cluster:

```text
RuntimeClass: nvidia
node label: nvidia.com/gpu.present=true
taint: nvidia.com/gpu=true:NoSchedule
driver root: /run/nvidia/driver
toolkit validation: /run/nvidia/validations
```

## Recommended configuration

Create a dedicated project for HAMi:

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
```

To use the built-in OpenShift `privileged` SCC instead of creating a custom SCC:

```yaml
openshift:
  securityContextConstraints:
    create: false
    name: privileged
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

Scheduler and admission run under OpenShift `restricted-v2` or an equivalent restricted SCC.

Security context applied when OpenShift is enabled:

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

OpenShift assigns the container UID from the project UID range. On non-OpenShift clusters, the chart default remains `scheduler.patch.runAsUser: 2000`.

Port mapping:

```text
Service port 443 -> targetPort 9443 -> containerPort 9443
```

The Deployment, Service, and kube-scheduler extender ConfigMap use the same target port.

### Device plugin

The chart creates the `hami-device-plugin` SCC and grants it to the device-plugin ServiceAccount. The SCC allows:

- privileged container
- host PID
- hostPath
- `SYS_ADMIN` capability
- `RunAsAny` for UID and SELinux context

Allowed volume types: `configMap`, `downwardAPI`, `emptyDir`, `hostPath`, `projected`, `secret`. Host IPC, host network, and host ports remain off.

Scheduler, admission, and workload ServiceAccounts continue to use the platform restricted SCC.

## SELinux

Enable SELinux relabeling:

```yaml
selinux:
  enabled: true
  type: container_file_t
  level: s0
```

The relabel initContainer applies `container_file_t` to HAMi shared directories:

```text
/usr/local/vgpu
/usr/local/vgpu/containers
/tmp/vgpulock
```

Restricted workload containers can then access these paths under the standard SELinux container domain.

The NVIDIA driver root is managed by the GPU Operator and mounted read-only into the device plugin and monitor:

```text
/run/nvidia/driver
```

SELinux labels on the driver root remain under GPU Operator ownership. After uninstall, restore host SELinux labels and directory permissions manually if the node requires it.

## Verification

Render manifests:

```bash
helm template hami hami-charts/hami \
  --namespace hami \
  -f values-openshift.yaml > /tmp/hami-openshift.yaml

grep -nE 'SecurityContextConstraints|system:openshift:scc|http_bind|targetPort|urlPrefix|runtimeClassName' \
  /tmp/hami-openshift.yaml
```

Check rollout status:

```bash
oc rollout status deployment/hami-scheduler -n hami
oc rollout status daemonset/hami-device-plugin -n hami
```

Check assigned SCC:

```bash
oc get pods -n hami \
  -o 'custom-columns=NAME:.metadata.name,SCC:.metadata.annotations.openshift\.io/scc'
```

Expected results:

- scheduler and admission: restricted SCC
- device-plugin: `hami-device-plugin` SCC
- scheduler extender listens on `9443`
- scheduler Service maps `443` to `9443`
- device-plugin uses the configured NVIDIA RuntimeClass
- SELinux relabel scope: HAMi shared directories

Check SELinux labels on the node:

```bash
oc debug node/<gpu-node> -- chroot /host \
  ls -Zd /usr/local/vgpu /usr/local/vgpu/containers /tmp/vgpulock
```

HAMi shared directories should show the configured `container_file_t`.
