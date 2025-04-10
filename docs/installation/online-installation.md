---
title: Online Installation from Helm (Recommended)
---

The best practice to deploy HAMi is using helm.

## Add HAMi repo

You can add HAMi chart repository using the following command:

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
```

## Get your Kubernetes version

A Kubernetes version is required for proper installation. You can retrieve it using the following command:

```bash
kubectl version
```

## Installation

Ensure the Kubernetes scheduler image version matches your Kubernetes server version.
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
