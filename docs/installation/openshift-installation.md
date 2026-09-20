---
title: Install HAMi on Red Hat OpenShift
sidebar_label: HAMi on OpenShift
---

This guide covers installing HAMi on OpenShift clusters that use NVIDIA GPU Operator to manage GPU drivers and NVIDIA Container Toolkit.

## Prerequisites

For general environment requirements, see [Prerequisites](./prerequisites.md). OpenShift also requires:

- `oc` connected to the cluster, with permission to create projects, SecurityContextConstraints (SCCs), and cluster-scoped RBAC resources.
- GPU Operator and Node Feature Discovery installed according to NVIDIA's [OpenShift installation guide](https://docs.nvidia.com/datacenter/cloud-native/openshift/latest/install-gpu-ocp.html), with CDI enabled in CRI-O.

Check the cluster status and set the variables to the actual ClusterPolicy name, GPU Operator namespace, and GPU node name:

```bash
oc whoami
oc version
oc get nodes -o wide
oc get clusterpolicy
oc get nodes -L nvidia.com/gpu.present

export GPU_CLUSTER_POLICY='gpu-cluster-policy'
export GPU_OPERATOR_NAMESPACE='nvidia-gpu-operator'
export GPU_NODE='REPLACE_WITH_GPU_NODE_NAME'

oc describe node "$GPU_NODE"
oc get pods -n "$GPU_OPERATOR_NAMESPACE" -o wide
```

## Disable the NVIDIA device plugin

HAMi must be the only device plugin registering `nvidia.com/gpu` on the nodes it manages. Before replacing the existing plugin, finish or migrate its GPU workloads during a maintenance window.

If HAMi will manage all NVIDIA GPU nodes, disable GPU Operator's device plugin across the cluster through its `ClusterPolicy`. If some nodes still need the NVIDIA device plugin, first deploy the two plugins to separate sets of nodes.

```bash
oc patch clusterpolicy "$GPU_CLUSTER_POLICY" --type=merge \
  -p '{"spec":{"devicePlugin":{"enabled":false}}}'

oc get clusterpolicy "$GPU_CLUSTER_POLICY" \
  -o jsonpath='state={.status.state}{"\n"}devicePlugin.enabled={.spec.devicePlugin.enabled}{"\n"}cdi.enabled={.spec.cdi.enabled}{"\n"}'
oc get daemonsets,pods -n "$GPU_OPERATOR_NAMESPACE"
```

Wait for the ClusterPolicy to report `state=ready`. Confirm `devicePlugin.enabled=false` and that the old device-plugin Pods have stopped. Keep the driver and Toolkit components enabled.

## Add the Helm repository

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update
```

## Configure HAMi

:::warning Unreleased Chart values

The published Helm repository currently provides HAMi Chart v2.10.0. It does not include the `platform.openshift` and `selinux.enabled` values used in this guide. HAMi Chart v2.11.0, which includes these values, has not been released yet.

Until v2.11.0 is released, install HAMi from the source repository rather than `hami-charts/hami`:

```bash
git clone https://github.com/Project-HAMi/HAMi.git
cd HAMi
helm dependency build charts/hami
```

Use the local `./charts/hami` path in the installation command below. Do not use the published v2.10.0 Chart for this OpenShift configuration.

:::

Create a dedicated project:

```bash
oc new-project hami-system
```

Save the following as `values-openshift.yaml` and adjust the node labels, driver root, and Toolkit executable path for the cluster.

Set `scheduler.kubeScheduler.image.tag` to match the Kubernetes server version from `oc version`. Use a published upstream Kubernetes image tag, without the OpenShift release number or an OpenShift-specific suffix.

```yaml
platform:
  openshift: true

selinux:
  enabled: true

scheduler:
  kubeScheduler:
    image:
      tag: "REPLACE_WITH_KUBERNETES_IMAGE_TAG"

devicePlugin:
  deviceListStrategy: cdi-annotations
  nvidiaDriverRoot: /run/nvidia/driver
  nvidiaHookPath: /usr/local/nvidia/toolkit/nvidia-ctk
  nvidiaNodeSelector:
    gpu: null
    nvidia.com/gpu.present: "true"
  service:
    type: ClusterIP
```

- `gpu: null` removes the Chart's default `gpu=on` selector. Without it, Helm merges both selectors and the device plugin requires both labels. Add a dedicated node label to the selector if HAMi should manage only some GPU nodes.
- The Chart already tolerates `nvidia.com/gpu:NoSchedule`. Override `devicePlugin.tolerations` only if the GPU nodes have other taints.
- If the device plugin relies on the NVIDIA runtime to process `NVIDIA_VISIBLE_DEVICES`, check that the `nvidia` RuntimeClass exists, then set `devicePlugin.runtimeClassName: nvidia`. HAMi also adds this RuntimeClass to NVIDIA workloads.

  With CDI enabled in GPU Operator v25.10.0 or later, NVIDIA requires this RuntimeClass for these GPU management containers unless the NRI plugin handles device injection. See [CDI and GPU management containers](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/cdi.html#cdi-and-gpu-management-containers).

- `nvidiaDriverRoot` must point to the host driver installation root, not the directory of an individual library. For host-installed drivers, use `/`. `nvidiaHookPath` must point to the host `nvidia-ctk` executable. See [CDI configuration](./configure-cdi.md).
- If the existing environment uses HAMi's `envvar` injection, set `deviceListStrategy: envvar` and omit `nvidiaHookPath`. Verify the NVIDIA runtime handles `NVIDIA_VISIBLE_DEVICES` for both the device plugin and workloads. Follow the [GPU Operator runtime troubleshooting guide](../troubleshooting/troubleshooting.md#nvidia-toolkit-gpu-operator-25-10) for that path.

  To disable CDI in an existing GPU Operator installation on CRI-O, follow NVIDIA's [Disabling CDI procedure](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/26.3/cdi.html#disabling-cdi): set the GPU nodes' `nvidia.com/gpu.deploy.operator-validator` label to `false`, set `cdi.enabled=false` in the ClusterPolicy, then restore the label to `true`. This sequence applies to an existing CDI-to-legacy transition; it is not needed when CDI remains enabled or is disabled from the initial GPU Operator installation.

Enable `devicePlugin.gpuOperatorToolkitReady.enabled` only if GPU Operator creates the `toolkit-ready` file. Check that the file exists under `devicePlugin.gpuOperatorToolkitReady.hostPath`, normally `/run/nvidia/validations`. If the file is missing, the init container waits indefinitely.

## Install HAMi

OpenShift support requires HAMi Helm Chart v2.11.0 or later. Until that version is released, run this command from the source checkout prepared above.

```bash
helm upgrade --install hami ./charts/hami \
  --namespace hami-system \
  -f values-openshift.yaml \
  --wait --timeout 10m
```

## Verify the deployment

```bash
oc get pods -n hami-system
oc get node "$GPU_NODE" \
  -o 'custom-columns=NAME:.metadata.name,GPU:.status.allocatable.nvidia\.com/gpu'
```

Check that the scheduler and device-plugin Pods are ready and the GPU node reports a non-zero `nvidia.com/gpu` allocatable value.

### Run a GPU sharing workload

Create a separate application project and ServiceAccount. Do not grant the ServiceAccount permission to use the device-plugin SCC.

Run NVIDIA's [CUDA VectorAdd sample](https://docs.nvidia.com/datacenter/cloud-native/openshift/24.6.2/install-gpu-ocp.html#running-a-sample-gpu-application) as a Job. The Job requests one vGPU, 1024 MiB of device memory, and a 25% GPU core limit. The image requires a driver compatible with CUDA 12.5. If the installed driver is incompatible, use an equivalent sample image that supports it.

```bash
oc new-project hami-test
oc create serviceaccount hami-smoke -n hami-test
```

Save as `hami-smoke.yaml`:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: hami-smoke
  namespace: hami-test
spec:
  backoffLimit: 0
  template:
    spec:
      serviceAccountName: hami-smoke
      restartPolicy: Never
      tolerations:
        - key: nvidia.com/gpu
          operator: Exists
          effect: NoSchedule
      containers:
        - name: vectoradd
          image: nvcr.io/nvidia/k8s/cuda-sample:vectoradd-cuda12.5.0-ubi8
          securityContext:
            runAsNonRoot: true
            allowPrivilegeEscalation: false
            capabilities:
              drop: ["ALL"]
            seccompProfile:
              type: RuntimeDefault
          resources:
            limits:
              nvidia.com/gpu: 1
              nvidia.com/gpumem: 1024
              nvidia.com/gpucores: 25
```

If you changed the tolerations when installing HAMi, update the Job's `tolerations` to match the GPU nodes. Submit the Job and inspect its logs and Pod:

```bash
oc apply -f hami-smoke.yaml
oc wait -n hami-test --for=condition=complete job/hami-smoke --timeout=300s
oc logs -n hami-test job/hami-smoke
oc get pods -n hami-test -l job-name=hami-smoke \
  -o 'custom-columns=NAME:.metadata.name,NODE:.spec.nodeName,SCHEDULER:.spec.schedulerName,RUNTIMECLASS:.spec.runtimeClassName,SCC:.metadata.annotations.openshift\.io/scc'
oc get pods -n hami-test -l job-name=hami-smoke -o yaml
```

Confirm the following:

- The logs contain `Test PASSED`.
- The Pod uses scheduler `hami-scheduler`. If `devicePlugin.runtimeClassName` is set, the Pod uses that RuntimeClass.
- The Pod runs on a GPU node that HAMi manages.
- The Pod annotations contain HAMi allocation information.
- The application uses an appropriate restricted SCC.

The Job controller creates the Pod with the application's ServiceAccount. Creating a Pod directly as an administrator could use the administrator's SCC permissions and hide application permission errors.

This Job verifies Pod admission, scheduling, device allocation, and CUDA execution. To verify memory and core limits under load, also run the [memory allocation](../userguide/nvidia-device/examples/allocate-device-memory.md) and [core allocation](../userguide/nvidia-device/examples/allocate-device-core.md) examples.

## Troubleshooting and cleanup

| Symptom | Checks and action |
| --- | --- |
| SCC or SELinux init container missing after installation | Check that `platform.openshift` and `selinux.enabled` are enabled. |
| Device-plugin Pods rejected by SCC admission | Inspect DaemonSet events, the SCC, the ClusterRole granting permission to use it, and the RoleBinding subject. When reusing an SCC, check that its matching ClusterRole exists. |
| Device-plugin Pods remain `Pending` | Check node labels, merged selectors, taints, and tolerations. Remove the default `gpu=on` selector with `gpu: null` when using the NVIDIA label. |
| Device-plugin Pod remains in `Init` | Inspect init-container logs. If the Toolkit readiness check is enabled, confirm the `toolkit-ready` file exists. If `selinux-relabel` fails, check `chcon` errors and host paths. |
| NVIDIA hook, missing-library, or unresolved CDI errors | Check GPU Operator readiness, RuntimeClass handler, driver root, hook executable, and the generated CDI specification. Follow [GPU Operator runtime troubleshooting](../troubleshooting/troubleshooting.md#nvidia-toolkit-gpu-operator-25-10). |
| Workload cannot access HAMi shared files | Check the selected SCC, workload UID, directory modes, SELinux labels, and `selinux-relabel` logs. Do not disable SELinux to bypass the error. |
| GPU sharing workload does not complete | Run `oc describe job hami-smoke -n hami-test` and inspect Pod events and container logs. Confirm the webhook selected `hami-scheduler`, sufficient vGPU resources exist, and the image matches the driver. |

After verification, delete the sample Job and ServiceAccount:

```bash
oc delete job hami-smoke -n hami-test
oc delete serviceaccount hami-smoke -n hami-test
```
