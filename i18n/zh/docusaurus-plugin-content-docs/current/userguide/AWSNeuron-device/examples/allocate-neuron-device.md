---
title: 分配AWS Neuron核心
---

如需独占分配一个或多个aws neuron设备，可通过`aws.amazon.com/neuron`进行资源分配：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: npod
spec:
  restartPolicy: Never
  containers:
    - name: npod
      command: ["sleep","infinity"]
      image: public.ecr.aws/neuron/pytorch-inference-neuron:1.13.1-neuron-py310-sdk2.20.2-ubuntu20.04
      resources:
        limits:
          cpu: "4"
          memory: 4Gi
          aws.amazon.com/neuron: 2
        requests:
          cpu: "1"
          memory: 1Gi
```

（说明：保持所有技术术语原文不变，包括aws neuron设备标识符`aws.amazon.com/neuron`和镜像路径中的技术版本号。将操作说明部分"exclusively"译为"独占"，"allocate using"译为"通过...进行资源分配"以符合中文技术文档表述习惯。YAML代码块完全保留原格式不作翻译）
 This content is powered by i18n-agent-action with LLM service https://api.deepseek.com with model deepseek-chat