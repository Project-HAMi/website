---
title: Validate scheduler configuration offline
sidebar_label: Validate scheduler configuration
---

Use the HAMi `scheduler` binary to check configuration before deploying it or as a step in CI. Use a build that includes the `validate` subcommands, ideally the same build you plan to deploy. Both commands run without Kubernetes credentials, a running cluster, or a GPU.

## Validate a device configuration file

Pass the same device YAML you would provide to the scheduler's `--device-config-file` flag. For a minimal example, save the following as `device-config.yaml`:

```yaml
nvidia:
  resourceCountName: nvidia.com/gpu
```

```bash
scheduler validate device-config ./device-config.yaml
```

The command parses the file and applies the scheduler's device configuration checks, including backend defaults. A missing file, malformed YAML, or an invalid device setting can cause validation to fail.

## Validate scheduler startup options

Pass the flags you intend to use for the HAMi scheduler. For a Helm deployment, use the flags from the rendered `vgpu-scheduler-extender` container. This subcommand takes flags directly, so run the device YAML check separately.

```bash
scheduler validate scheduler-config \
  --device-plugin-namespace=kube-system \
  --device-plugin-service-account=hami-device-plugin \
  --node-affinity-score-weight=0
```

Replace the namespace and ServiceAccount name with the values from your deployment. Both values must be non-empty. The node affinity score weight must be finite and non-negative. Verify that the ServiceAccount exists in your cluster and that the configured ports are available as separate deployment checks.

## Read the result

A successful check prints a confirmation and returns exit status `0`. Warnings can appear alongside success. For example, a non-loopback extender address or a non-loopback profiling address when profiling is enabled produces a warning. Validation errors return a nonzero status, so a CI step can fail on the command's exit status.
