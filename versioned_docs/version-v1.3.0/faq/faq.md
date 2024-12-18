---
title: FAQ(Frequently Asked Questions)
---

## What is the difference between PropagationPolicy and ClusterPropagationPolicy?

The `PropagationPolicy` is a namespace-scoped resource type which means the objects with this type must reside in a namespace.
And the `ClusterPropagationPolicy` is the cluster-scoped resource type which means the objects with this type don't have a namespace.

Both of them are used to hold the propagation declaration, but they have different capacities:
- PropagationPolicy: can only represent the propagation policy for the resources in the same namespace.
- ClusterPropagationPolicy: can represent the propagation policy for all resources including namespace-scoped and cluster-scoped resources.

## What is the difference between 'Push' and 'Pull' mode of a cluster?


## Why HAMi requires `kube-controller-manager`?

`kube-controller-manager` is composed of a bunch of controllers, HAMi inherits some controllers from it
to keep a consistent user experience and behavior.

It's worth noting that not all controllers are needed by HAMi, for the recommended controllers please


## Can I install HAMi in a Kubernetes cluster and reuse the kube-apiserver as HAMi apiserver?

The quick answer is `yes`. In that case, you can save the effort to deploy
[hami-apiserver](https://github.com/hami-io/hami/blob/master/artifacts/deploy/hami-apiserver.yaml) and just
share the APIServer between Kubernetes and HAMi. In addition, the high availability capabilities in the origin clusters
can be inherited seamlessly. We do have some users using HAMi in this way.

There are some things you should consider before doing so:

- This approach hasn't been fully tested by the HAMi community and no plan for it yet.
- This approach will increase computation costs for the HAMi system. E.g.
  After you apply a `resource template`, take `Deployment` as an example, the `kube-controller` will create `Pods` for the
  Deployment and update the status persistently, HAMi system will reconcile these changes too, so there might be
  conflicts.

TODO: Link to adoption use case once it gets on board.
