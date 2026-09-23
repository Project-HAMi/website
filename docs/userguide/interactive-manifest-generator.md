---
title: Interactive Manifest Generator
sidebar_label: Manifest Generator
---

Project HAMi supports GPU virtualization across a variety of hardware manufacturers, including NVIDIA, Cambricon, Hygon, Iluvatar, and Huawei. Use vendor-specific keys in `resources.limits` to request supported device resources. For vendors that support device type or UUID constraints, the generator adds those values to `metadata.annotations` when configured.

Use the interactive tool below to generate the exact YAML configuration needed for your use case. You can integrate the generated configuration directly into your deployment specifications (such as adding the resources to your `spec.template.spec.containers` section).

import ManifestGenerator from '@site/src/components/ManifestGenerator';

<ManifestGenerator />

## Advanced Options

- **Specific Device Type**: If you have a heterogeneous cluster (e.g. A100s and V100s), you can specify which device model your pod should be scheduled on.
- **Specific Device UUID**: If you need to bind a pod to a specific physical device for performance profiling or debugging, you can provide its UUID.

> **Note**: Not all vendors support core percentage or memory percentage scaling. The generator automatically adapts its options based on the selected device vendor's supported capabilities.
