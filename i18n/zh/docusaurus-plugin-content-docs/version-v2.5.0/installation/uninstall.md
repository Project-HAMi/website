---
title: 卸载 HAMi
translated: true
---

卸载 hami 的步骤很简单：

```
helm uninstall hami -n kube-system
```

> **注意：** *卸载不会终止正在运行的任务。*