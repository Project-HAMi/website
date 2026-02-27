---
title: HAMi on AWS
translated: true
---

HAMi is now available on the AWS Marketplace, and you can quickly install it via Helm or AWS add-on.

## Prerequisites

Before installation, please ensure you have:

- Subscribed to HAMi on the AWS Marketplace
- Created a Kubernetes cluster

## Install with Helm

You can use the following commands to pull HAMi’s Helm chart and install it:

```shell
export HELM_EXPERIMENTAL_OCI=1
# The `username` and `password-stdin` correspond to your AWS login credentials.
aws ecr get-login-password --region us-east-1 | helm registry login --username AWS --password-stdin 709825985650.dkr.ecr.us-east-1.amazonaws.com
mkdir awsmp-chart && cd awsmp-chart
helm pull oci://709825985650.dkr.ecr.us-east-1.amazonaws.com/dynamia-ai/hami --version 2.6.1-community
tar xf $(pwd)/* && find $(pwd) -maxdepth 1 -type f -delete
helm install --generate-name --namespace <ENTER_NAMESPACE_HERE> ./*
```

You can customize the installation by adjusting the [configuration](../userguide/configure.md).

## Install with AWS Add-on

Before installing HAMi using the AWS add-on, you need to install **cert-manager**.  
You can find it in the AWS Marketplace add-ons section and install it through the AWS Console.  
You may also refer to the [AWS User Guide](https://docs.aws.amazon.com/eks/latest/userguide/lbc-manifest.html#lbc-cert) for installation instructions.

Once cert-manager is installed, you can install the HAMi add-on from the AWS Marketplace.

## Verify Your Installation

You can verify your installation with the following command:

```
kubectl get pods -n kube-system
```

If both the **hami-device-plugin** and **hami-scheduler** pods are in the `Running` state, your installation was successful.

## Usage Examples

### NVIDIA Devices

[Use Exclusive GPU](https://project-hami.io/docs/userguide/NVIDIA-device/examples/use-exclusive-card)  
[Allocate Specific Device Memory to a Container](https://project-hami.io/docs/userguide/NVIDIA-device/examples/allocate-device-memory)  
[Allocate Device Core Resources to a Container](https://project-hami.io/docs/userguide/NVIDIA-device/examples/allocate-device-core)  
[Assign Tasks to MIG Instances](https://project-hami.io/docs/userguide/NVIDIA-device/examples/dynamic-mig-example)
