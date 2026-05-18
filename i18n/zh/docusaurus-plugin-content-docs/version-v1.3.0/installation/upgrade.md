---
title: Upgrade
---

Upgrading HAMi to the latest version is a simple process, update the repository and restart the chart:

```bash
helm uninstall hami -n kube-system
helm repo update
helm install hami hami-charts/hami -n kube-system
```

> **WARNING:** *If you upgrade HAMi without clearing your submitted tasks, it may result in segmentation fault.*
