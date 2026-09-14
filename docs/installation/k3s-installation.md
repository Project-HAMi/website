---
title: Install HAMi on K3s
sidebar_label: HAMi on K3s
translated: true
---

[K3s](https://k3s-io.github.io/) helps you build MVPs and run PoCs faster. This guide covers considerations for using HAMi on K3s.

## Prerequisites

- A K3s cluster using embedded containerd, with GPU nodes in the `Ready` state. For a new cluster, follow the [K3s installation guide](https://docs.k3s.io/installation) first.
- Access to the cluster through `kubectl` and Helm, with permission to install HAMi and label nodes. On GPU nodes, `sudo` access to inspect configuration and manage systemd services.
- A decision on whether the host or GPU Operator manages the NVIDIA driver and Container Toolkit. Follow the [generic prerequisites](./prerequisites.md) for package installation and the [NVIDIA CDI guide](./configure-cdi.md) for CDI settings.
- Only HAMi's NVIDIA Device Plugin registers GPUs on nodes managed by HAMi. With GPU Operator, set `devicePlugin.enabled=false` in the Operator values. Disable other existing Device Plugins through their original deployment mechanism to avoid duplicate registration.

The commands assume systemd and the [default K3s data directory](https://docs.k3s.io/cli/agent#data), `/var/lib/rancher/k3s`. For custom data directories, containerd templates, or external runtimes, check the actual paths and configuration first.

## Configure the K3s container runtime

Complete these steps on each GPU node. Choose the configuration steps for either a host-managed or GPU Operator-managed Toolkit, then persist the configuration and restart the K3s service.

### Check the containerd paths

K3s [generates its containerd configuration](https://docs.k3s.io/advanced#configuring-containerd) for each node. Configuration tools must use the configuration file and socket for K3s's embedded containerd. The default paths are:

| Purpose | Path |
| --- | --- |
| Main containerd configuration | `/var/lib/rancher/k3s/agent/etc/containerd/config.toml` |
| containerd socket | `/run/k3s/containerd/containerd.sock` |
| v3 configuration import directory (check the actual `imports`) | `/var/lib/rancher/k3s/agent/etc/containerd/config-v3.toml.d/` |

Run on a GPU node:

```bash
k3s --version
sudo test -S /run/k3s/containerd/containerd.sock
sudo grep -E 'version|imports' \
  /var/lib/rancher/k3s/agent/etc/containerd/config.toml
```

`test -S` should succeed. Check the configuration version and import path in the `grep` output. A v3 configuration that imports this directory contains:

```toml
version = 3
imports = ["/var/lib/rancher/k3s/agent/etc/containerd/config-v3.toml.d/*.toml"]
```

A **drop-in configuration file** is a separate TOML file loaded by the main configuration through `imports`. The example above loads all `.toml` files in `config-v3.toml.d`. When adding a drop-in file, confirm that the actual `imports` setting includes its path.

### Host-managed Toolkit

At startup, K3s looks for runtime executables in the service process's `PATH`. If K3s is already running when the runtime is installed, restart K3s so it can detect it. See [K3s alternative container runtime support](https://docs.k3s.io/advanced#alternative-container-runtime-support).

Find the runtime executable on the GPU node:

```bash
command -v nvidia-container-runtime
```

For a host package installation, the expected path is `/usr/bin/nvidia-container-runtime`. Check that the executable is also visible in the K3s service's `PATH`, especially when using a custom installation directory.

Restart the appropriate service as described under [Restart K3s and check the configuration](#restart-k3s-and-check-the-configuration), then inspect the generated configuration:

```bash
sudo grep -n -A 8 -B 2 'nvidia' \
  /var/lib/rancher/k3s/agent/etc/containerd/config.toml
```

Confirm that `BinaryName` for the `nvidia` runtime points to the installed executable, such as `/usr/bin/nvidia-container-runtime`. Automatic detection does not require a custom containerd template.

### GPU Operator-managed Toolkit

When GPU Operator's Toolkit component configures containerd, add or adjust these paths in the existing Operator values:

```yaml
toolkit:
  env:
    - name: CONTAINERD_CONFIG
      value: /var/lib/rancher/k3s/agent/etc/containerd/config.toml
    - name: CONTAINERD_SOCKET
      value: /run/k3s/containerd/containerd.sock
    - name: RUNTIME_CONFIG_SOURCE
      value: file=/var/lib/rancher/k3s/agent/etc/containerd/config.toml
    - name: RUNTIME_DROP_IN_CONFIG
      value: /var/lib/rancher/k3s/agent/etc/containerd/config-v3.toml.d/99-nvidia.toml
```

With these settings, Toolkit reads the K3s main configuration, connects to the K3s containerd socket, and writes the runtime configuration into a directory imported by the main configuration. See [GPU Operator containerd configuration options](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/25.10/getting-started.html#specifying-configuration-options-for-containerd) for the parameters.

Merge these settings into the full Operator values file. Preserve other required entries in `toolkit.env` when updating the list.

After deployment, inspect the imports and the generated file:

```bash
sudo grep -n '^imports' \
  /var/lib/rancher/k3s/agent/etc/containerd/config.toml
sudo cat \
  /var/lib/rancher/k3s/agent/etc/containerd/config-v3.toml.d/99-nvidia.toml
```

Confirm that the import rule includes `99-nvidia.toml` and that the runtime executable referenced by that file exists. This drop-in path applies to the v3 configuration used here; check the actual import rules for other versions or custom templates.

### Persist the configuration

K3s generates `config.toml`, so direct edits to this file may not survive a restart.

Prefer K3s configuration options, automatic runtime detection, or imported drop-ins. If a template extension is necessary, use `config-v3.toml.tmpl` for v3 or `config.toml.tmpl` for v2 in the same directory. Extend the [K3s base template](https://docs.k3s.io/advanced#base-template) instead of copying the entire generated configuration into a template.

If your deployment uses `nvidia` as the node's default runtime, merge this setting into the node's [K3s configuration file](https://docs.k3s.io/installation/configuration#configuration-file), `/etc/rancher/k3s/config.yaml`:

```yaml
default-runtime: nvidia
```

Preserve the other settings and restart the appropriate K3s service. This option is not mandatory for every HAMi deployment on K3s. Deployments that explicitly select a runtime should retain their RuntimeClass configuration. See [K3s NVIDIA runtime support](https://docs.k3s.io/advanced#nvidia-container-runtime).

### Restart K3s and check the configuration

Check runtime configuration on every node that runs GPU workloads. Restarting K3s affects node services. In a single-node cluster, the Kubernetes API will be briefly unavailable while the server node restarts.

Follow the [K3s service restart instructions](https://docs.k3s.io/upgrades/manual#upgrade-k3s-using-the-binary) and run one of the following on the GPU node, according to its role:

```bash
# Server node
sudo systemctl restart k3s
```

```bash
# Agent node
sudo systemctl restart k3s-agent
```

From a terminal with cluster access, check recovery:

```bash
kubectl get nodes
kubectl get runtimeclass nvidia -o yaml
```

K3s [provides RuntimeClass definitions](https://docs.k3s.io/advanced#nvidia-container-runtime) for supported runtimes. The existence of `RuntimeClass/nvidia` alone does not prove that the NVIDIA runtime is configured on a node. After the restart, check the main configuration and imported files to confirm that the runtime is still registered and its executable exists.

Once the node is `Ready` and the runtime configuration is present, continue with HAMi installation.

## Install HAMi

Label GPU nodes with `gpu=on` as described in the [prerequisites](./prerequisites.md), then follow [online installation](./online-installation.md). Retain the Helm values for your chosen NVIDIA deployment.

K3s reports a Kubernetes version with a distribution suffix, such as `v1.35.8+k3s1`; the corresponding upstream kube-scheduler image tag is `v1.35.8`. Do not include `+k3s1` in the image tag.

If following the generic Helm guide's default NVIDIA runtime approach, first configure and verify `default-runtime: nvidia` as described above. For explicit RuntimeClass selection, set `devicePlugin.runtimeClassName=nvidia` in HAMi values and use `runtimeClassName: nvidia` for GPU workloads. When K3s already provides `RuntimeClass/nvidia`, keep `devicePlugin.createRuntimeClass=false` to reuse it.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| RuntimeClass exists, but a new Pod reports that its runtime is not configured | Inspect the K3s main configuration and drop-ins on the Pod's node. For host-installed runtimes, also check the service `PATH` and whether K3s was restarted after installation. |
| Configuration works initially but disappears after a restart | Check whether only the generated `config.toml` was edited and whether the regenerated `imports` still includes the drop-in. |
| The K3s API briefly becomes unavailable while Toolkit updates runtime configuration | Compare the timestamps in the Toolkit and K3s service logs to check whether containerd exited, K3s restarted, and the services subsequently recovered. |

Inspect the [K3s systemd logs](https://docs.k3s.io/faq#where-are-the-k3s-logs) and service state on a server node:

```bash
sudo journalctl -u k3s -n 100 --no-pager
sudo systemctl show k3s -p ActiveState -p NRestarts
```

For an agent node, replace the service name with `k3s-agent`.

If Toolkit updates are followed by a containerd exit or K3s restart, check the logs for recovery before creating new GPU Pods. Resolve persistent restarts or failed recovery before continuing installation.
