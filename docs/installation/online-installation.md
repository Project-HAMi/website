---
title: Online Installation from Helm (Recommended)
---

The recommended way to deploy HAMi is via Helm.

## Add HAMi repo

You can add HAMi chart repository using the following command:

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
```

## Get your Kubernetes version

A Kubernetes version is required for proper installation. You can retrieve your Kubernetes server version with:

```bash
kubectl version --short
```

## Installation

Ensure the `scheduler.kubeScheduler.imageTag` matches your Kubernetes server version.
For instance, if your cluster server is v1.16.8, use the following command to deploy:

```bash
helm install hami hami-charts/hami --set scheduler.kubeScheduler.imageTag=v1.16.8 -n kube-system
```

Customize your installation by editing the [configurations](../userguide/configure.md).

## Verify your installation

You can verify your installation using the following command:

```bash
kubectl get pods -n kube-system
```

If both hami-device-plugin and hami-scheduler pods are in the Running state, your installation is successful.
