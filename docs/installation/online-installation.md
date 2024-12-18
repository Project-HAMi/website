---
title: Online Installation from Helm (Recommended)
---

You can install `kubectl-hami` plug-in in any of the following ways:

- Download from the release.
- Install using Krew.
- Build from source code.

## Prerequisites

### kubectl
`kubectl` is the Kubernetes command line tool lets you control Kubernetes clusters.
For installation instructions see [installing kubectl](https://kubernetes.io/docs/tasks/tools/#kubectl).

## Download from the release

HAMi provides `kubectl-hami` plug-in download service since v0.9.0. You can choose proper plug-in version which fits your operator system form [hami release](https://github.com/hami-io/hami/releases).

Take v1.2.1 that working with linux-amd64 os as an example:

```bash
wget https://github.com/hami-io/hami/releases/download/v1.2.1/kubectl-hami-linux-amd64.tgz

tar -zxf kubectl-hami-linux-amd64.tgz
```

Next, move `kubectl-hami` executable file to `PATH` path, reference from [Installing kubectl plugins](https://kubernetes.io/docs/tasks/extend-kubectl/kubectl-plugins/#installing-kubectl-plugins).

## Install using Krew

Krew is the plugin manager for `kubectl` command-line tool.

[Install and set up](https://krew.sigs.k8s.io/docs/user-guide/setup/install/) Krew on your machine.

Then install `kubectl-hami` plug-in:

```bash
kubectl krew install hami
```

You can refer to [Quickstart of Krew](https://krew.sigs.k8s.io/docs/user-guide/quickstart/) for more information.

## Build from source code

Clone hami repo and run `make` cmd from the repository:

```bash
make kubectl-hami
```

Next, move the `kubectl-hami` executable file under the `_output` folder in the project root directory to the `PATH` path.
