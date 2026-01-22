---
title: 升级 HAMi
translated: true
---

将HAMi升级到最新版本是一个简单的过程，更新仓库并重新启动图表：

```
helm uninstall hami -n kube-system
helm repo update
helm install hami hami-charts/hami -n kube-system
```

> **警告：** *如果在不清除已提交任务的情况下升级HAMi，可能会导致分段错误。*