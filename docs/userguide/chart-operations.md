---
title: Chart operations
sidebar_label: Chart operations
---

Operational settings for an installed HAMi release. Set these values in the configuration file maintained for the release. See [Configuration](./configure.md) for value precedence and [Upgrade](../installation/upgrade.md) for release upgrades.

## Scheduler profiling {#scheduler-profiling}

Profiling is disabled by default. To enable it, include `--profiling` in the scheduler's extra arguments while retaining any other arguments you need:

```yaml
scheduler:
  profilingBindAddress: "127.0.0.1:6060"
  extender:
    extraArgs:
      - --debug
      - -v=4
      - --profiling
```

The dedicated profiling listener serves plain HTTP and defaults to loopback. The scheduler Service does not expose its port. Access it using port-forwarding:

```bash
kubectl -n kube-system port-forward pod/<scheduler-pod> 6060:6060
```

Then open `http://127.0.0.1:6060/debug/pprof/` locally.

Previously, enabling profiling exposed pprof on the scheduler's cluster-facing HTTP server. Those routes are now available only on the dedicated profiling listener. Operators using the old endpoint must switch to port-forwarding or explicitly set `scheduler.profilingBindAddress` to a non-loopback address. Changing this address does not expose pprof through the scheduler Service; the old Service endpoint still returns 404 for pprof routes. For non-loopback access, reach the Pod IP and profiling port through an appropriately restricted network path, or use the Pod port-forward shown above. Non-loopback binding logs a security warning: pprof has no authentication and can expose process diagnostics. Restrict network access if you choose to expose it. With profiling disabled, the bind address is ignored and no profiling listener is started.

## vGPU cache garbage collection {#vgpu-cache-garbage-collection}

The chart passes `devicePlugin.vgpuCache.gracePeriod` to the Device Plugin as `HAMI_VGPU_CACHE_GRACE_PERIOD`. Use a Go duration string such as `"30s"`, `"5m"`, or `"1h"`. An omitted or empty value uses `"5m"`. An invalid duration string logs a warning and uses `"5m"`; negative durations prevent Device Plugin startup. `"0s"` removes the grace period, **not** garbage collection: deletion still requires live Pod confirmation and the existing safety checks.

```yaml
devicePlugin:
  monitor:
    resyncInterval: "30s"
  vgpuCache:
    gracePeriod: "5m"
```

**Migration:** `devicePlugin.monitor.resyncInterval` / `HAMI_RESYNC_INTERVAL` no longer controls Device Plugin directory GC. If you previously used a custom monitor resync value to tune cleanup, set `devicePlugin.vgpuCache.gracePeriod` explicitly to retain that GC grace period. For deployments without Helm, set `HAMI_VGPU_CACHE_GRACE_PERIOD` on the Device Plugin container. Without the new setting, GC uses `5m`, regardless of monitor resync. The monitor retains its existing resync and mmap-release behavior and does not delete directories.

This setting does not change the GC scan interval, confirmation retry backoff, or the five-failure limit for directory deletion.

## Reload configuration {#configuration-reload}

A Helm change to the generated device configuration triggers rollouts of the scheduler and chart-managed NVIDIA device plugin. Plugins deployed separately follow their own procedures.

Changing only `devicePlugin.nodeConfiguration.config` or an external node ConfigMap does not trigger a rollout. Restart the NVIDIA device plugin to load those changes:

```bash
kubectl rollout restart daemonset/hami-device-plugin -n kube-system
kubectl rollout status daemonset/hami-device-plugin -n kube-system --timeout=5m
```

These commands use the default resource name and namespace. Substitute the names used by the installation. Back up separately managed ConfigMaps before changing them. Keep persistent settings in Helm values or an external ConfigMap; a later Helm operation can overwrite manual edits to a chart-managed ConfigMap.
