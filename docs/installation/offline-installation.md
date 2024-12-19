---
title: Offline Installation
---

This document describes how you can use the `hack/remote-up-hami.sh` script to install HAMi on
your clusters based on the codebase.

## Select a way to expose hami-apiserver

The `hack/remote-up-hami.sh` will install `hami-apiserver` and provide two ways to expose the server:

### 1. expose by `HostNetwork` type

By default, the `hack/remote-up-hami.sh` will expose `hami-apiserver` by `HostNetwork`.

No extra operations needed with this type.

### 2. expose by service with `LoadBalancer` type

If you don't want to use the `HostNetwork`, you can ask `hack/remote-up-hami.sh` to expose `hami-apiserver`
by a service with `LoadBalancer` type that *requires your cluster have deployed the `Load Balancer`*.
All you need to do is set an environment:
```bash
export LOAD_BALANCER=true
```

## Install
From the `root` directory the `hami` repo, install HAMi by command:
```bash
hack/remote-up-hami.sh <kubeconfig> <context_name>
```
- `kubeconfig` is your cluster's kubeconfig that you want to install to
- `context_name` is the name of context in 'kubeconfig'

For example:
```bash
hack/remote-up-hami.sh $HOME/.kube/config mycluster
```

If everything goes well, at the end of the script output, you will see similar messages as follows:
```
------------------------------------------------------------------------------------------------------
█████   ████   █████████   ███████████   ██████   ██████   █████████   ██████████     █████████
░░███   ███░   ███░░░░░███ ░░███░░░░░███ ░░██████ ██████   ███░░░░░███ ░░███░░░░███   ███░░░░░███
░███  ███    ░███    ░███  ░███    ░███  ░███░█████░███  ░███    ░███  ░███   ░░███ ░███    ░███
░███████     ░███████████  ░██████████   ░███░░███ ░███  ░███████████  ░███    ░███ ░███████████
░███░░███    ░███░░░░░███  ░███░░░░░███  ░███ ░░░  ░███  ░███░░░░░███  ░███    ░███ ░███░░░░░███
░███ ░░███   ░███    ░███  ░███    ░███  ░███      ░███  ░███    ░███  ░███    ███  ░███    ░███
█████ ░░████ █████   █████ █████   █████ █████     █████ █████   █████ ██████████   █████   █████
░░░░░   ░░░░ ░░░░░   ░░░░░ ░░░░░   ░░░░░ ░░░░░     ░░░░░ ░░░░░   ░░░░░ ░░░░░░░░░░   ░░░░░   ░░░░░
------------------------------------------------------------------------------------------------------
HAMi is installed successfully.

Kubeconfig for hami in file: /root/.kube/hami.config, so you can run:
  export KUBECONFIG="/root/.kube/hami.config"
Or use kubectl with --kubeconfig=/root/.kube/hami.config
Please use 'kubectl config use-context hami-apiserver' to switch the cluster of hami control plane
And use 'kubectl config use-context your-host' for debugging hami installation
```
