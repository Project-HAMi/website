#!/usr/bin/env bash
set -euo pipefail

: "${NODE:?Set NODE to the Kubernetes node name}"
: "${GPU_UUID:?Set GPU_UUID to the physical GPU UUID used for the mixed-profile test}"

NAMESPACE=${NAMESPACE:-hami-mig-retest}

create_mig_pod() {
  local name=$1
  local memory=$2

  kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: ${name}
  namespace: ${NAMESPACE}
  annotations:
    nvidia.com/vgpu-mode: "mig"
    hami.io/gpu-scheduler-policy: "binpack"
    nvidia.com/use-gpuuuid: "${GPU_UUID}"
spec:
  schedulerName: hami-scheduler
  nodeSelector:
    kubernetes.io/hostname: ${NODE}
  containers:
    - name: cuda
      image: nvcr.io/nvidia/k8s/cuda-sample:vectoradd-cuda12.5.0-ubuntu22.04
      imagePullPolicy: IfNotPresent
      command:
        - bash
        - -lc
        - |
          set -euo pipefail
          n=0
          echo 0 > /tmp/gpu-progress
          while true; do
            /cuda-samples/vectorAdd > /tmp/vectoradd.last 2>&1
            n=\$((n + 1))
            echo "\$n" > /tmp/gpu-progress.next
            mv /tmp/gpu-progress.next /tmp/gpu-progress
          done
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: ${memory}
EOF
}

create_mig_pod mixed-small 8000
create_mig_pod mixed-large 30000

kubectl wait -n "${NAMESPACE}" --for=condition=Ready \
  pod/mixed-small pod/mixed-large --timeout=180s
