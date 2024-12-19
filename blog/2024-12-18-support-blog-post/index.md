---
title: Introducing HAMi
---

## What is HAMi?

HAMi (Heterogeneous AI Computing Virtualization Middleware), formerly known as k8s-vGPU-scheduler, is an innovative solution designed to manage heterogeneous AI computing devices within Kubernetes clusters. This all-in-one middleware enables the sharing of various AI devices while ensuring resource isolation among different tasks. By improving the utilization rates of heterogeneous computing devices, HAMi provides a unified multiplexing interface that caters to diverse device types.

<!-- truncate -->

## Why Choose HAMi?

### Kubernetes Native API Compatibility

One of the standout features of HAMi is its compatibility with Kubernetes' native API. This means that users can upgrade to HAMi without making any changes to their existing configurations, allowing for a seamless transition while maintaining the default behavior of Kubernetes.

### Open and Neutral

HAMi is a collaborative initiative involving stakeholders from various sectors, including internet services, finance, manufacturing, and cloud providers. The goal is to establish open governance under the Cloud Native Computing Foundation (CNCF), ensuring that HAMi remains neutral and accessible to all users.

### Avoid Vendor Lock-in

With HAMi, users can integrate with mainstream cloud providers without being tied to proprietary vendor orchestration. This flexibility allows organizations to choose their preferred cloud solutions while leveraging the capabilities of HAMi.

### Resource Isolation

HAMi provides robust resource isolation within containers. Each task running in a container is restricted to its allocated resources, preventing any task from exceeding its quota. This hard isolation enhances security and stability within the computing environment.

### Support for a Variety of Heterogeneous Computing Devices

HAMi excels in supporting a wide range of heterogeneous computing devices. Whether it's GPUs, MLUs, or NPUs from various manufacturers, HAMi facilitates device sharing and maximizes resource efficiency across different hardware platforms.

### Unified Management

To streamline operations, HAMi offers a unified monitoring system along with configurable scheduling policies such as bin packing and spreading. This comprehensive management approach simplifies the oversight of resources and enhances overall system performance.

## Conclusion

In conclusion, HAMi represents a significant advancement in the management of heterogeneous AI computing resources within Kubernetes environments. Its compatibility with existing systems, commitment to open governance, and robust resource management capabilities make it an essential tool for organizations looking to optimize their AI computing infrastructure. Join us on this journey towards more efficient and flexible AI computing with HAMi!

Citations:
[1] https://project-hami.io
