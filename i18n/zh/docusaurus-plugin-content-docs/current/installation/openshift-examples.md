---
title: OpenShift 示例工作负载
sidebar_label: 示例工作负载
---

用于在 Red Hat OpenShift 上测试和验证 HAMi 的示例 GPU 工作负载。

## 基本 CUDA 测试

测试 GPU 是否可访问以及 vGPU 共享是否工作。

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
          echo "=== NVIDIA GPU 信息 ==="
          nvidia-smi
          echo "\n=== CUDA Vector Add 测试 ==="
          /usr/local/cuda/samples/bin/x86_64/linux/release/vectorAdd || echo "vectorAdd 不可用，如果 nvidia-smi 工作则测试通过"
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 1024  # 1GB GPU 内存
          nvidia.com/gpucores: 30  # GPU 核心的 30%
```

**运行测试：**

```bash
oc apply -f cuda-vectoradd.yaml
oc logs cuda-vectoradd

# 预期输出显示 nvidia-smi 信息
```

## 多 Pod GPU 共享

验证多个 Pod 可以共享同一物理 GPU。

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
          echo "分配: 2GB GPU 内存, 30% 核心"
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
          echo "分配: 2GB GPU 内存, 30% 核心"
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
          echo "分配: 2GB GPU 内存, 30% 核心"
          nvidia-smi
          sleep 60
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 2048  # 2GB
          nvidia.com/gpucores: 30  # 30%
```

**运行测试：**

```bash
oc apply -f gpu-sharing-test.yaml

# 等待所有 Pod 运行
oc get pods -l app=gpu-test -w

# 验证它们在同一个 GPU 上
for pod in gpu-shared-1 gpu-shared-2 gpu-shared-3; do
  echo "=== $pod ==="
  oc exec $pod -- nvidia-smi -L
done

# 所有 Pod 应显示相同的 GPU UUID
```

**预期行为：**
- 所有 3 个 Pod 调度到**同一物理 GPU**
- 总分配：6GB 内存，90% 核心
- 所有 Pod 并发运行且无错误

## TensorFlow 训练

使用 vGPU 的示例 ML 训练工作负载。

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
          print("TensorFlow 版本:", tf.__version__)
          print("GPU 可用:", tf.config.list_physical_devices('GPU'))
          
          # 加载 MNIST 数据集
          mnist = tf.keras.datasets.mnist
          (x_train, y_train), (x_test, y_test) = mnist.load_data()
          x_train, x_test = x_train / 255.0, x_test / 255.0
          
          # 构建模型
          model = tf.keras.models.Sequential([
            tf.keras.layers.Flatten(input_shape=(28, 28)),
            tf.keras.layers.Dense(128, activation='relu'),
            tf.keras.layers.Dropout(0.2),
            tf.keras.layers.Dense(10)
          ])
          
          # 编译
          model.compile(optimizer='adam',
                       loss=tf.keras.losses.SparseCategoricalCrossentropy(from_logits=True),
                       metrics=['accuracy'])
          
          # 训练（用于测试的小 epoch 数）
          model.fit(x_train, y_train, epochs=3, batch_size=32)
          
          # 评估
          test_loss, test_acc = model.evaluate(x_test, y_test, verbose=2)
          print(f"测试准确率: {test_acc}")
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 4096  # ML 工作负载需要 4GB
          nvidia.com/gpucores: 50  # GPU 的 50%
```

**运行测试：**

```bash
oc apply -f tensorflow-mnist.yaml
oc logs tensorflow-mnist -f

# 预期输出：
# TensorFlow 版本: 2.x.x
# GPU 可用: [PhysicalDevice(name='/physical_device:GPU:0', device_type='GPU')]
# Epoch 1/3
# ...
# 测试准确率: ~0.97
```

## 长期运行的推理服务

具有水平扩展的示例推理服务。

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
              echo "启动推理服务器..."
              echo "GPU: $(nvidia-smi -L)"
              
              # 模拟推理服务器
              while true; do
                echo "$(date): 处理推理请求..."
                nvidia-smi --query-gpu=memory.used --format=csv,noheader
                sleep 30
              done
          resources:
            limits:
              nvidia.com/gpu: 1
              nvidia.com/gpumem: 3072  # 每个副本 3GB
              nvidia.com/gpucores: 25  # 每个副本 25%
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

**部署：**

```bash
oc apply -f gpu-inference.yaml

# 检查 Pod 分布在各个 GPU 上
oc get pods -l app=gpu-inference -o wide

# 扩容
oc scale deployment gpu-inference --replicas=6

# 监视 GPU 分配
watch "oc describe nodes -l nvidia.com/gpu.present=true | grep -A 5 'Allocated resources'"
```

## ResourceQuota 示例

限制每个命名空间的 GPU 资源。

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
    requests.nvidia.com/gpu: "4"           # 最多 4 个 GPU
    requests.nvidia.com/gpumem: "32768"    # 最多 32GB 总计
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

**测试配额：**

```bash
oc apply -f gpu-quota.yaml

# 检查配额
oc describe quota gpu-quota -n team-ml

# 尝试超出配额
for i in {1..5}; do
  oc run quota-test-$i \
    --image=nvidia/cuda:11.8.0-base-ubi8 \
    --restart=OnFailure \
    --namespace=team-ml \
    -- nvidia-smi \
    --limits="nvidia.com/gpu=1,nvidia.com/gpumem=8192"
done

# 第 5 个 Pod 应因配额而失败
```

## 清理

删除所有测试工作负载：

```bash
# 单个 Pod
oc delete pod cuda-vectoradd gpu-shared-1 gpu-shared-2 gpu-shared-3 \
  tensorflow-mnist -n default

# Deployment
oc delete deployment gpu-inference -n default

# Service
oc delete svc gpu-inference -n default

# 带配额的命名空间
oc delete namespace team-ml
```

## 下一步

- [监控 GPU 使用](../userguide/monitoring/grafana-dashboard.md)使用 Grafana
- [配置资源限制](../userguide/configure.md)用于您的工作负载
- [故障排查](openshift-troubleshooting.md)如果 Pod 失败

## 其他示例

有关更多特定供应商的示例，请参见：
- [NVIDIA GPU 示例](../userguide/nvidia-device/examples/default-use.md)
- [多 GPU 示例](../userguide/nvidia-device/examples/use-exclusive-gpu.md)
