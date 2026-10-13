---
id: openshift-examples
title: OpenShift Example Workloads
sidebar_label: Example Workloads
---

Example GPU workloads for testing and validating HAMi on Red Hat OpenShift.

## Basic CUDA Test

Test that GPUs are accessible and vGPU sharing works.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: cuda-vectoradd
  namespace: default
spec:
  restartPolicy: OnFailure
  containers:
    - name: cuda
      image: nvidia/cuda:11.8.0-base-ubi8
      command:
        - sh
        - -c
        - |
          echo "=== NVIDIA GPU Info ==="
          nvidia-smi
          echo "\n=== CUDA Vector Add Test ==="
          /usr/local/cuda/samples/bin/x86_64/linux/release/vectorAdd || echo "vectorAdd not available, test passed if nvidia-smi worked"
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 1024  # 1GB GPU memory
          nvidia.com/gpucores: 30  # 30% of GPU cores
```

**Run the test:**

```bash
oc apply -f cuda-vectoradd.yaml
oc logs cuda-vectoradd

# Expected output:
# === NVIDIA GPU Info ===
# +-----------------------------------------------------------------------------+
# | NVIDIA-SMI 525.85.12    Driver Version: 525.85.12    CUDA Version: 12.0   |
# |-------------------------------+----------------------+----------------------+
# | GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
# | Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
# |===============================+======================+======================|
# |   0  Tesla T4            On   | 00000000:00:1E.0 Off |                    0 |
# | N/A   42C    P0    26W /  70W |   1024MiB / 15360MiB |      0%      Default |
# +-------------------------------+----------------------+----------------------+
```

## Multi-Pod GPU Sharing

Validate that multiple pods can share the same physical GPU.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-shared-1
  namespace: default
  labels:
    app: gpu-test
spec:
  restartPolicy: OnFailure
  containers:
    - name: cuda
      image: nvidia/cuda:11.8.0-base-ubi8
      command:
        - sh
        - -c
        - |
          echo "Pod: gpu-shared-1"
          echo "Allocated: 2GB GPU memory, 30% cores"
          nvidia-smi
          sleep 60
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 2048  # 2GB
          nvidia.com/gpucores: 30  # 30%
---
apiVersion: v1
kind: Pod
metadata:
  name: gpu-shared-2
  namespace: default
  labels:
    app: gpu-test
spec:
  restartPolicy: OnFailure
  containers:
    - name: cuda
      image: nvidia/cuda:11.8.0-base-ubi8
      command:
        - sh
        - -c
        - |
          echo "Pod: gpu-shared-2"
          echo "Allocated: 2GB GPU memory, 30% cores"
          nvidia-smi
          sleep 60
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 2048  # 2GB
          nvidia.com/gpucores: 30  # 30%
---
apiVersion: v1
kind: Pod
metadata:
  name: gpu-shared-3
  namespace: default
  labels:
    app: gpu-test
spec:
  restartPolicy: OnFailure
  containers:
    - name: cuda
      image: nvidia/cuda:11.8.0-base-ubi8
      command:
        - sh
        - -c
        - |
          echo "Pod: gpu-shared-3"
          echo "Allocated: 2GB GPU memory, 30% cores"
          nvidia-smi
          sleep 60
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 2048  # 2GB
          nvidia.com/gpucores: 30  # 30%
```

**Run the test:**

```bash
oc apply -f gpu-sharing-test.yaml

# Wait for all pods to be Running
oc get pods -l app=gpu-test -w

# Verify they're on the same GPU
for pod in gpu-shared-1 gpu-shared-2 gpu-shared-3; do
  echo "=== $pod ==="
  oc exec $pod -- nvidia-smi -L
done

# All should show the same GPU UUID
```

**Expected behavior:**
- All 3 pods schedule to the **same physical GPU**
- Total allocated: 6GB memory, 90% cores
- All pods run concurrently without errors

## TensorFlow Training

Example ML training workload using vGPU.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: tensorflow-mnist
  namespace: default
spec:
  restartPolicy: OnFailure
  containers:
    - name: tensorflow
      image: tensorflow/tensorflow:latest-gpu
      command:
        - python
        - -c
        - |
          import tensorflow as tf
          print("TensorFlow version:", tf.__version__)
          print("GPU Available:", tf.config.list_physical_devices('GPU'))
          
          # Load MNIST dataset
          mnist = tf.keras.datasets.mnist
          (x_train, y_train), (x_test, y_test) = mnist.load_data()
          x_train, x_test = x_train / 255.0, x_test / 255.0
          
          # Build model
          model = tf.keras.models.Sequential([
            tf.keras.layers.Flatten(input_shape=(28, 28)),
            tf.keras.layers.Dense(128, activation='relu'),
            tf.keras.layers.Dropout(0.2),
            tf.keras.layers.Dense(10)
          ])
          
          # Compile
          model.compile(optimizer='adam',
                       loss=tf.keras.losses.SparseCategoricalCrossentropy(from_logits=True),
                       metrics=['accuracy'])
          
          # Train (small epochs for testing)
          model.fit(x_train, y_train, epochs=3, batch_size=32)
          
          # Evaluate
          test_loss, test_acc = model.evaluate(x_test, y_test, verbose=2)
          print(f"Test accuracy: {test_acc}")
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 4096  # 4GB for ML workload
          nvidia.com/gpucores: 50  # 50% of GPU
```

**Run the test:**

```bash
oc apply -f tensorflow-mnist.yaml
oc logs tensorflow-mnist -f

# Expected output:
# TensorFlow version: 2.x.x
# GPU Available: [PhysicalDevice(name='/physical_device:GPU:0', device_type='GPU')]
# Epoch 1/3
# ...
# Test accuracy: ~0.97
```

## PyTorch Distributed Training

Example distributed training across multiple pods sharing GPUs.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: pytorch-master
  namespace: default
spec:
  selector:
    app: pytorch-distributed
    role: master
  ports:
    - port: 29500
      targetPort: 29500
  clusterIP: None  # Headless service for distributed training
---
apiVersion: v1
kind: Pod
metadata:
  name: pytorch-master
  namespace: default
  labels:
    app: pytorch-distributed
    role: master
spec:
  hostname: pytorch-master
  subdomain: pytorch-master
  restartPolicy: OnFailure
  containers:
    - name: pytorch
      image: pytorch/pytorch:latest
      command:
        - python
        - -c
        - |
          import torch
          import torch.distributed as dist
          import torch.nn as nn
          import os
          
          print("PyTorch version:", torch.__version__)
          print("CUDA available:", torch.cuda.is_available())
          print("GPU count:", torch.cuda.device_count())
          
          # Distributed training setup
          os.environ['MASTER_ADDR'] = 'pytorch-master.default.svc.cluster.local'
          os.environ['MASTER_PORT'] = '29500'
          os.environ['RANK'] = '0'
          os.environ['WORLD_SIZE'] = '2'
          
          dist.init_process_group(backend='nccl')
          
          # Simple model
          model = nn.Linear(10, 1).cuda()
          model = nn.parallel.DistributedDataParallel(model)
          
          print("Master: Distributed training initialized")
          print(f"Rank: {dist.get_rank()}, World size: {dist.get_world_size()}")
          
          dist.destroy_process_group()
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 4096  # 4GB
          nvidia.com/gpucores: 40
---
apiVersion: v1
kind: Pod
metadata:
  name: pytorch-worker
  namespace: default
  labels:
    app: pytorch-distributed
    role: worker
spec:
  restartPolicy: OnFailure
  containers:
    - name: pytorch
      image: pytorch/pytorch:latest
      command:
        - python
        - -c
        - |
          import torch
          import torch.distributed as dist
          import torch.nn as nn
          import os
          import time
          
          # Wait for master
          time.sleep(10)
          
          print("PyTorch version:", torch.__version__)
          print("CUDA available:", torch.cuda.is_available())
          
          # Distributed training setup
          os.environ['MASTER_ADDR'] = 'pytorch-master.default.svc.cluster.local'
          os.environ['MASTER_PORT'] = '29500'
          os.environ['RANK'] = '1'
          os.environ['WORLD_SIZE'] = '2'
          
          dist.init_process_group(backend='nccl')
          
          # Simple model
          model = nn.Linear(10, 1).cuda()
          model = nn.parallel.DistributedDataParallel(model)
          
          print("Worker: Distributed training initialized")
          print(f"Rank: {dist.get_rank()}, World size: {dist.get_world_size()}")
          
          dist.destroy_process_group()
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 4096  # 4GB
          nvidia.com/gpucores: 40
```

**Run the test:**

```bash
oc apply -f pytorch-distributed.yaml

# Check master logs
oc logs pytorch-master

# Check worker logs
oc logs pytorch-worker

# Both should show successful distributed initialization
```

## Long-Running Inference Service

Example inference service with horizontal scaling.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gpu-inference
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gpu-inference
  template:
    metadata:
      labels:
        app: gpu-inference
    spec:
      containers:
        - name: inference
          image: nvidia/cuda:11.8.0-base-ubi8
          command:
            - sh
            - -c
            - |
              echo "Starting inference server..."
              echo "GPU: $(nvidia-smi -L)"
              echo "Allocated memory: $NVIDIA_VISIBLE_DEVICES_MEM_LIMIT"
              
              # Simulate inference server
              while true; do
                echo "$(date): Processing inference request..."
                nvidia-smi --query-gpu=memory.used --format=csv,noheader
                sleep 30
              done
          resources:
            limits:
              nvidia.com/gpu: 1
              nvidia.com/gpumem: 3072  # 3GB per replica
              nvidia.com/gpucores: 25  # 25% per replica
---
apiVersion: v1
kind: Service
metadata:
  name: gpu-inference
  namespace: default
spec:
  selector:
    app: gpu-inference
  ports:
    - port: 8080
      targetPort: 8080
  type: ClusterIP
```

**Deploy:**

```bash
oc apply -f gpu-inference.yaml

# Check pods are distributed across GPUs
oc get pods -l app=gpu-inference -o wide

# Scale up
oc scale deployment gpu-inference --replicas=6

# Watch GPU allocation
watch "oc describe nodes -l nvidia.com/gpu.present=true | grep -A 5 'Allocated resources'"
```

## Resource Quota Example

Limit GPU resources per namespace.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-ml
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: gpu-quota
  namespace: team-ml
spec:
  hard:
    requests.nvidia.com/gpu: "4"           # Max 4 GPUs
    requests.nvidia.com/gpumem: "32768"    # Max 32GB total
    limits.nvidia.com/gpu: "4"
    limits.nvidia.com/gpumem: "32768"
---
apiVersion: v1
kind: Pod
metadata:
  name: quota-test
  namespace: team-ml
spec:
  restartPolicy: OnFailure
  containers:
    - name: cuda
      image: nvidia/cuda:11.8.0-base-ubi8
      command: ["nvidia-smi"]
      resources:
        requests:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 2048
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 2048
```

**Test quota:**

```bash
oc apply -f gpu-quota.yaml

# Check quota
oc describe quota gpu-quota -n team-ml

# Try to exceed quota
for i in {1..5}; do
  oc run quota-test-$i \
    --image=nvidia/cuda:11.8.0-base-ubi8 \
    --restart=OnFailure \
    --namespace=team-ml \
    -- nvidia-smi \
    --limits="nvidia.com/gpu=1,nvidia.com/gpumem=8192"
done

# The 5th pod should fail due to quota
```

## Cleanup

Remove all test workloads:

```bash
# Single pods
oc delete pod cuda-vectoradd gpu-shared-1 gpu-shared-2 gpu-shared-3 \
  tensorflow-mnist pytorch-master pytorch-worker -n default

# Deployments
oc delete deployment gpu-inference -n default

# Services
oc delete svc pytorch-master gpu-inference -n default

# Namespaces with quota
oc delete namespace team-ml
```

## Next Steps

- [Monitor GPU usage](../userguide/monitoring/grafana-dashboard.md) with Grafana
- [Configure resource limits](../userguide/configure.md) for your workloads
- [Troubleshoot issues](openshift-troubleshooting.md) if pods fail

## Additional Examples

For more vendor-specific examples, see:
- [NVIDIA GPU Examples](../userguide/nvidia-device/examples/default-use.md)
- [Multi-GPU Examples](../userguide/nvidia-device/examples/use-exclusive-gpu.md)
