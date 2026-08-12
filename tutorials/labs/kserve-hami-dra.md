---
title: "Lab 11: KServe Inference with HAMi DRA GPU Sharing"
description: "Deploy a KServe Standard vLLM service and run two Predictor replicas on one NVIDIA GPU through native HAMi DRA claims."
sidebar_label: "Lab 11: KServe + HAMi DRA"
lab:
  level: Advanced
  duration: about 90 minutes
  environment: Kubernetes 1.36.1 with one NVIDIA Tesla T4 15 GiB
  authors:
    - lixd
  verified: "2026-08-06"
tags:
  - kserve
  - dra
  - hami
  - vllm
  - resource-sharing
toc_max_heading_level: 2
---

This lab combines KServe model serving with HAMi GPU sharing through native Dynamic Resource Allocation (DRA). KServe manages the vLLM inference service, while HAMi allocates GPU memory and compute capacity to each Predictor Pod. You will run two Predictor replicas on one physical Tesla T4, with each replica receiving `3 GiB` and `20` compute units through its own `ResourceClaim`.

The captured run used Kubernetes 1.36.1, KServe 0.18.0, HAMi-DRA 0.2.1, and one Tesla T4 with 15 GiB of memory.

:::warning Version-specific APIs

This lab uses KServe 0.18's native DRA fields and the HAMi-DRA 0.2.1 chart. KServe and HAMi-DRA APIs are evolving; check the release notes before applying these manifests to another version.

:::

## What You'll Learn

- verify that the cluster exposes the GPU and DRA capacity;
- install KServe Standard mode with Gateway API and Envoy Gateway;
- download a public Qwen model with KServe's Storage Initializer;
- express GPU memory and compute requests with a native HAMi `ResourceClaimTemplate`; and
- prove that two KServe Predictor replicas share one physical GPU and both expose a 3 GiB memory ceiling.

## Lab Overview

```mermaid
%% title: KServe and HAMi DRA Lab Flow
flowchart LR
    Step1["Step 1<br/>Install HAMi-DRA"] --> Step2["Step 2<br/>Install Gateway and KServe"]
    Step2 --> Step3["Step 3<br/>Create InferenceService"]
    Step3 --> Step4["Step 4<br/>Verify two replicas share one GPU"]
    Step4 --> Step5["Step 5<br/>Send an inference request"]
```

## Prerequisites

- A Kubernetes 1.34 or newer cluster with one NVIDIA GPU node. The verified node has a 15 GiB Tesla T4.
- Helm 3, `kubectl`, `curl`, and `python3`.
- GPU Operator or an equivalent installation that provides the NVIDIA driver and GPU Feature Discovery labels.
- NVIDIA Device Plugin disabled because HAMi owns the GPU device path in this lab.
- Cluster-admin access. This lab creates CRDs, a GatewayClass, and cluster-scoped DRA resources.
- Outbound access to Hugging Face so KServe can download the public Qwen model.
- Access to the `docker.io` and `ghcr.io` OCI registries, or an equivalent registry mirror, for the Envoy Gateway and KServe charts and their images.
- Sufficient free ephemeral storage on the GPU node for the model artifacts and container images. Check this with node access before starting, for example `df -h /var/lib/containerd /var/lib/kubelet`.
- DRA Consumable Capacity enabled on the control plane and kubelet. Follow [Lab 4](./hami-dra.md#step-1-enable-the-draconsumablecapacity-feature-gate) if it is not enabled.
- CDI and NVIDIA volume-mount support enabled in the container runtime. GPU Operator users can follow [Lab 4](./hami-dra.md#step-2-configure-the-container-runtime).
- The manifests in [`tutorials/labs/examples/11-kserve-hami-dra/`](https://github.com/Project-HAMi/website/tree/master/tutorials/labs/examples/11-kserve-hami-dra).

Check the node before starting:

```bash
kubectl get nodes -o 'custom-columns=NAME:.metadata.name,GPU:.status.allocatable.nvidia\.com/gpu'
kubectl get nodes -l nvidia.com/gpu.product
```

## Step 1: Install cert-manager and HAMi-DRA

Both the HAMi-DRA and KServe webhooks use cert-manager. Install it once:

```bash
helm repo add cert-manager https://charts.jetstack.io
helm repo update

helm upgrade --install cert-manager cert-manager/cert-manager \
  --namespace cert-manager --create-namespace \
  --version v1.21.0 \
  --set crds.enabled=true \
  --wait --timeout=10m
```

Install the verified HAMi-DRA chart and label the GPU node. Use the actual node name in `GPU_NODE`:

```bash
helm repo add hami-dra https://project-hami.github.io/HAMi-DRA/
helm repo update

export GPU_NODE=$(kubectl get nodes -l nvidia.com/gpu.product=Tesla-T4 \
  -o jsonpath='{.items[0].metadata.name}')
if [ -z "${GPU_NODE}" ]; then
  echo "No Tesla-T4 GPU node found. Set GPU_NODE to an eligible GPU node before continuing." >&2
  exit 1
fi
echo "GPU_NODE=${GPU_NODE}"
kubectl label node "${GPU_NODE}" gpu=on --overwrite

helm upgrade --install hami-dra hami-dra/hami-dra \
  --namespace hami-system --create-namespace \
  --version 0.2.1 \
  --wait --timeout=10m
```

When the NVIDIA driver is installed directly on the host, add `--set drivers.nvidia.containerDriver=false`. Verify the driver and published capacity:

```bash
kubectl get pods -n hami-system
kubectl get deviceclass,resourceslice
kubectl get resourceslice -o jsonpath='{.items[0].spec.devices[0]}' | python3 -m json.tool
```

The device must report `allowMultipleAllocations: true`, `memory: 15Gi`, and `cores: 100`. This is the capacity pool from which both Predictor claims will draw.

## Step 2: Install Envoy Gateway and KServe

Install Envoy Gateway. The lab uses a NodePort because the verified cluster has no cloud LoadBalancer:

```bash
helm upgrade --install eg \
  oci://docker.io/envoyproxy/gateway-helm \
  --version v1.8.2 \
  --namespace envoy-gateway-system --create-namespace \
  --wait --timeout=10m

kubectl apply -f tutorials/labs/examples/11-kserve-hami-dra/01-gateway.yaml
kubectl wait --for=condition=Programmed \
  gateway/kserve-ingress-gateway -n kserve --timeout=5m
```

Install the KServe CRDs, controller, and default runtimes in Standard mode:

```bash
helm upgrade --install kserve-crd \
  oci://ghcr.io/kserve/charts/kserve-crd \
  --version v0.18.0 --namespace kserve --create-namespace \
  --wait --timeout=10m

helm upgrade --install kserve \
  oci://ghcr.io/kserve/charts/kserve-resources \
  --version v0.18.0 --namespace kserve \
  --set kserve.controller.deploymentMode=Standard \
  --set kserve.controller.gateway.disableIstioVirtualHost=true \
  --set kserve.controller.gateway.ingressGateway.enableGatewayApi=true \
  --set kserve.controller.gateway.ingressGateway.kserveGateway=kserve/kserve-ingress-gateway \
  --wait --timeout=10m

helm upgrade --install kserve-runtime-configs \
  oci://ghcr.io/kserve/charts/kserve-runtime-configs \
  --version v0.18.0 --namespace kserve \
  --set kserve.servingruntime.enabled=true \
  --set kserve.llmisvcConfigs.enabled=false \
  --wait --timeout=10m
```

Confirm that the Hugging Face runtime exists:

```bash
kubectl get clusterservingruntime kserve-huggingfaceserver
```

Increase the Storage Initializer memory limit for the model download:

```bash
kubectl patch clusterstoragecontainer default --type=merge -p \
  '{"spec":{"container":{"resources":{"limits":{"memory":"4Gi"}}}}}'
```

## Step 3: Create the KServe Service with a Native HAMi Claim

Apply the ResourceClaimTemplate and InferenceService:

```bash
kubectl apply -f tutorials/labs/examples/11-kserve-hami-dra/02-inference-service.yaml
kubectl wait --for=condition=Ready \
  inferenceservice/qwen-llm -n kserve-test --timeout=30m
```

KServe downloads `hf://Qwen/Qwen2.5-0.5B-Instruct` before starting the model container. The important part for GPU sharing is the relationship between the Predictor and the claim template:

```yaml
predictor:
  minReplicas: 2
  resourceClaims:
    - name: gpu
      resourceClaimTemplateName: qwen-hami-gpu
  model:
    resources:
      claims:
        - name: gpu
```

The template requests one HAMi device with `3Gi` memory and `20` cores. KServe copies the claim reference into the generated Deployment, and Kubernetes creates one ResourceClaim per Pod. Do not replace this with one fixed `resourceClaimName`: two replicas need two independently allocated claims.

Check the resources KServe generated:

```bash
kubectl get inferenceservice,deploy,pod,resourceclaim,httproute -n kserve-test
kubectl get resourceclaim -n kserve-test -o jsonpath='{range .items[*]}{.metadata.name}{" device="}{.status.allocation.devices.results[0].device}{" memory="}{.status.allocation.devices.results[0].consumedCapacity.memory}{" cores="}{.status.allocation.devices.results[0].consumedCapacity.cores}{"\n"}{end}'
```

Both claims should point to `hami-gpu-0` and report `3Gi` and `20`.

## Step 4: Verify the Shared GPU Ceiling

List the two Predictor Pods and confirm that they landed on the same node:

```bash
kubectl get pod -n kserve-test \
  -l serving.kserve.io/inferenceservice=qwen-llm -o wide
```

Run `nvidia-smi` in each container:

```bash
for pod in $(kubectl get pod -n kserve-test \
  -l serving.kserve.io/inferenceservice=qwen-llm -o name); do
  kubectl exec -n kserve-test "${pod}" -- \
    nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
done
```

Expected output:

```text
Tesla T4, 3072 MiB
Tesla T4, 3072 MiB
```

The two containers see separate 3 GiB ceilings while the claim status shows that both allocations use the same physical `hami-gpu-0`. HAMi-core applies the in-container memory view after the DRA driver prepares the device.

## Step 5: Send an Inference Request

Read the Envoy NodePort and node address:

```bash
ENVOY_SERVICE=$(kubectl get service -n envoy-gateway-system \
  -l gateway.envoyproxy.io/owning-gateway-name=kserve-ingress-gateway \
  -o jsonpath='{.items[0].metadata.name}')
NODE_PORT=$(kubectl get service -n envoy-gateway-system "${ENVOY_SERVICE}" \
  -o jsonpath='{.spec.ports[?(@.port==80)].nodePort}')
NODE_IP=$(kubectl get node -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
export GATEWAY_ADDR="${NODE_IP}:${NODE_PORT}"
INFERENCE_HOST=$(kubectl get inferenceservice qwen-llm -n kserve-test \
  -o jsonpath='{.status.url}' | sed -E 's#^https?://##')
```

Call the OpenAI-compatible endpoint through the KServe HTTPRoute:

```bash
curl -H "Host: ${INFERENCE_HOST}" \
  -H 'Content-Type: application/json' \
  "http://${GATEWAY_ADDR}/openai/v1/chat/completions" \
  -d '{
    "model": "qwen",
    "messages": [{"role": "user", "content": "Answer only with the number: 2+3"}],
    "max_tokens": 8,
    "temperature": 0
  }'
```

A successful `chat.completion` response proves that the complete path is working:

```text
Client -> Envoy Proxy -> HTTPRoute -> Predictor Service -> HuggingFaceServer -> vLLM -> HAMi GPU slice
```

## Cleanup

Delete the inference service first, then remove the Gateway and controllers if this cluster is dedicated to the lab:

```bash
kubectl delete -f tutorials/labs/examples/11-kserve-hami-dra/02-inference-service.yaml
kubectl delete -f tutorials/labs/examples/11-kserve-hami-dra/01-gateway.yaml
helm uninstall kserve-runtime-configs kserve kserve-crd -n kserve
helm uninstall eg -n envoy-gateway-system
helm uninstall hami-dra -n hami-system
```

## What This Lab Proved

| Claim | Evidence |
| --- | --- |
| KServe can use native DRA claims | The generated Deployment contains both `resourceClaims` and container-level `resources.claims` |
| HAMi can share one physical GPU between KServe replicas | Two independently generated claims resolve to `hami-gpu-0` |
| Capacity is enforced in the container | Both Predictor containers report `3072 MiB` in `nvidia-smi` |
| The inference path remains functional | The OpenAI-compatible chat completion returns successfully through Envoy Gateway |

## Next Steps

- Pin the Hugging Face model URI to a revision when you need reproducible model artifacts.
- Change the claim to `6Gi` and `40` cores, then observe the remaining capacity in `ResourceSlice` and claim status.
- Compare this KServe workflow with [Lab 4](./hami-dra.md), which uses a Pod-level claim without a model-serving controller.
