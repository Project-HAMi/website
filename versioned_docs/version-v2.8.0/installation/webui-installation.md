---
linktitle: WebUI
title: Deploy HAMi WebUI using Helm Charts
---

This section describes how to deploy and run HAMi WebUI on a Kubernetes cluster using Helm charts.

HAMi WebUI is exposed via localhost only. After deployment, you need to configure your local `~/.kube/config` file to connect to the target cluster and access the WebUI.

The official repository provides the Helm chart for deploying HAMi WebUI:
https://github.com/Project-HAMi/HAMi-WebUI/tree/main/charts/hami-webui

If you encounter any issues, please open an issue in the [HAMi-WebUI](https://github.com/Project-HAMi/HAMi-WebUI) repository.

## Prerequisites

Before you install HAMi WebUI with Helm, ensure the following:

1. kubectl on your local machine

2. [HAMi](https://github.com/Project-HAMi/HAMi?tab=readme-ov-file#quick-start) >= 2.4.0

3. Prometheus > 2.8.0

4. Helm > 3.0

## Install HAMi WebUI using Helm

### Deploy the HAMi WebUI Helm chart

To add the HAMi WebUI Helm repository and install the chart on your machine, follow these steps:

1. Add the HAMi WebUI repository:

   ```bash
   helm repo add hami-webui https://project-hami.github.io/HAMi-WebUI
   ```

2. Install HAMi WebUI:

   ```bash
   helm install my-hami-webui hami-webui/hami-webui --set externalPrometheus.enabled=true --set externalPrometheus.address="http://prometheus-kube-prometheus-prometheus.monitoring.svc.cluster.local:9090" -n kube-system
   ```

   > _**Important**_: Replace `externalPrometheus.address` with the in-cluster Prometheus URL that your environment uses.

   You can set other values from [values.yaml](https://github.com/Project-HAMi/HAMi-WebUI/blob/main/charts/hami-webui/values.yaml) during installation; see the configuration [documentation](https://github.com/Project-HAMi/HAMi-WebUI/blob/main/charts/hami-webui/README.md#values).

3. Verify the installation:

   ```bash
   kubectl get pods -n kube-system | grep webui
   ```

   If the installation succeeded, you should see `hami-webui` and `hami-webui-dcgm-exporter` (and related pods) in a Running state.

### Access HAMi WebUI

1. Configure `~/.kube/config` on your local machine so kubectl can reach your cluster.

2. Port-forward the HAMi WebUI Service to port `3000` on your workstation:

   ```bash
   kubectl port-forward service/my-hami-webui 3000:3000 --namespace=kube-system
   ```

   For more information, see [Use port forwarding to access applications in a cluster](https://kubernetes.io/docs/tasks/access-application-cluster/port-forward-access-application-cluster/).

3. Open `http://localhost:3000` in your browser.

   The HAMi WebUI resource overview page should appear.

## Troubleshooting

This section lists tips that may help when you deploy HAMi WebUI on Kubernetes with Helm.

### Collect logs

When troubleshooting, check the HAMi WebUI component logs.

Run:

```bash
kubectl logs --namespace=hami deploy/my-hami-webui -c hami-webui-fe-oss
kubectl logs --namespace=hami deploy/my-hami-webui -c hami-webui-be-oss
```

For more information, see [Pods](https://kubernetes.io/docs/reference/kubectl/cheatsheet/#interacting-with-running-pods) and [Deployments](https://kubernetes.io/docs/reference/kubectl/cheatsheet/#interacting-with-deployments-and-services).

## Uninstall the HAMi WebUI deployment

To remove the Helm release, use:

`helm uninstall <RELEASE-NAME> <NAMESPACE-NAME>`

```bash
helm uninstall my-hami-webui -n hami
```

This removes the resources associated with that release in the `hami` namespace.

To delete the `hami` namespace (if you no longer need it):

```bash
kubectl delete namespace hami
```

## Related documentation

After you can reach the WebUI, use these docs to learn the UI or contribute to development:

- [HAMi WebUI User Guide](../userguide/hami-webui-user-guide.md): cluster overview, nodes, accelerators, workloads
- [HAMi WebUI Developer Guide](../developers/hami-webui-development-guide.md): architecture, repository layout, local development, and conventions
