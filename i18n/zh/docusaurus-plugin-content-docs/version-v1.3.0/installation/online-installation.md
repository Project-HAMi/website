---
title: Online Installation from Helm (Recommended)
---

The best practice to deploy HAMi is using helm. 

## Add HAMi repo

You can add HAMi chart repository using the following command:

```
helm repo add hami-charts https://project-hami.github.io/HAMi/
```

## Get your kubernetes version

kubenetes version is needed for properly installation. You can get this information by using the following command:

```
kubectl version
```

## Installation

During installation, set the Kubernetes scheduler image version to match your Kubernetes server version. For instance, if your cluster server version is 1.16.8, use the following command for deployment:

```
helm install hami hami-charts/hami --set scheduler.kubeScheduler.imageTag=v1.16.8 -n kube-system
```

You can customize your installation by adjusting the [configs](../userguide/configure.md).

## Verify your installation

You can verify your installation using the following command:

```
kubectl get pods -n kube-system
```

If both hami-device-plugin and hami-scheduler pods are in the Running state, your installation is successful.