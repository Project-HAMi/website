---
title: Dynamic Resource Allocation
translated: true
---

<div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
  <strong style={{ fontSize: '0.9rem' }}>Supported Components:</strong>
  <a href="/docs/installation/how-to-use-hami-dra" style={{ display: 'inline-block', padding: '3px 12px', borderRadius: '12px', background: '#8b5cf6', color: '#fff', fontWeight: 600, fontSize: '0.82rem', textDecoration: 'none' }}>HAMi-DRA</a>
  <a href="/docs/get-started/deploy-with-helm" style={{ display: 'inline-block', padding: '3px 12px', borderRadius: '12px', background: '#10b981', color: '#fff', fontWeight: 600, fontSize: '0.82rem', textDecoration: 'none' }}>HAMi</a>
  <a href="/docs/installation/configure-cdi" style={{ display: 'inline-block', padding: '3px 12px', borderRadius: '12px', background: '#0ea5e9', color: '#fff', fontWeight: 600, fontSize: '0.82rem', textDecoration: 'none' }}>CDI Support</a>
</div>

## Introduction

HAMi has supported K8s [DRA](https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/) (Dynamic Resource Allocation) on NVIDIA devices. By installing hami-k8s-dra-driver, your cluster scheduler can discover NVIDIA GPU devices on nodes.

## Prerequisites

- The underlying container runtime (e.g., containerd or CRI-O) has [CDI](https://github.com/cncf-tags/container-device-interface?tab=readme-ov-file#how-to-configure-cdi) enabled

## Installation

The NVIDIA DRA driver is built into HAMi and does not need to be installed separately. You only need to specify the `--set hami-dra-webhook.drivers.nvidia.enabled=true` parameter when [installing HAMi DRA](../../installation/how-to-use-hami-dra). For more information, please refer to [Installing NVIDIA DRA driver](https://github.com/Project-HAMi/HAMi-DRA?tab=readme-ov-file#installation)

## Verify Installation

To verify the installation is successful, use the following command to view GPU devices:

```bash
kubectl get resourceslices.resource.k8s.io -A
```
