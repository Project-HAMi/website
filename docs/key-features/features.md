---
title: Key Features
---

## Cross-cloud multi-cluster multi-mode management
HAMi supports:
* Safe isolation:
  * Create a namespace for each cluster, prefixed with `hami-es-`.
* [Multi-mode](https://hami.io/docs/userguide/clustermanager/cluster-registration) connection:
  * Push: HAMi is directly connected to the cluster kube-apiserver.
  * Pull: Deploy one agent component in the cluster, HAMi delegates tasks to the agent component.
* Multi-cloud support(Only if compliant with Kubernetes specifications):
  * Support various public cloud vendors.
  * Support for private cloud.
  * Support self-built clusters.

The overall relationship between the member cluster and the control plane is shown in the following figure:  

![overall-relationship.png](../resources/key-features/overall-relationship.png)


## Multi-policy multi-cluster scheduling
HAMi supports:
* Cluster distribution capability under [different scheduling strategies](https://hami.io/docs/userguide/scheduling/resource-propagating):
  * ClusterAffinity: Oriented scheduling based on ClusterName, Label, Field.
  * Toleration: Scheduling based on Taint and Toleration.
  * SpreadConstraint: Scheduling based on cluster topology.
  * ReplicasScheduling: Replication mode and split mode for instanced workloads.
* Differential configuration([OverridePolicy](https://hami.io/docs/userguide/scheduling/override-policy)):
  * ImageOverrider: Differentiated configuration of mirrors.
  * ArgsOverrider: Differentiated configuration of execution parameters.
  * CommandOverrider: Differentiated configuration for execution commands.
  * PlainText: Customized Differentiation Configuration.
* [Support reschedule](https://hami.io/docs/userguide/scheduling/descheduler) with following components:
  * Descheduler(hami-descheduler): Trigger rescheduling based on instance state changes in member clusters.
  * Scheduler-estimator(hami-scheduler-estimator): Provides the scheduler with a more precise desired state of the running instances of the member cluster.

Much like k8s scheduling, HAMi support different scheduling policy. The overall scheduling process is shown in the figure below:  

![overall-relationship.png](../resources/key-features/overall-scheduling.png)

If one cluster does not have enough resource to accommodate their pods, Karamda will reschedule the pods. The overall rescheduling process is shown in the following figure:  

![overall-relationship.png](../resources/key-features/overall-rescheduling.png)


## Cross-cluster failover of applications
HAMi supports:
* [Cluster failover](https://hami.io/docs/userguide/failover/):
  * HAMi supports users to set distribution policies, and automatically migrates the faulty cluster replicas in a centralized or decentralized manner after a cluster failure.
* Cluster taint settings:
  * When the user sets a taint for the cluster and the resource distribution strategy cannot tolerate the taint, HAMi will also automatically trigger the migration of the cluster replicas.
* Uninterrupted service:
  * During the replicas migration process, HAMi can ensure that the service replicas does not drop to zero, thereby ensuring that the service will not be interrupted.

HAMi supports failover for clusters, one cluster failure will cause failover of replicas as follows:  

![overall-relationship.png](../resources/key-features/cluster-failover.png)

## Global Uniform Resource View
HAMi supports:
* [Resource status collection and aggregation](https://hami.io/docs/userguide/globalview/customizing-resource-interpreter): Collect and aggregate state into resource templates with the help of the Resource Interpreter.
  * User-defined resource, triggering webhook remote calls.
  * Fixed encoding in HAMi for some common resource types.
* [Unified resource management](https://hami.io/docs/userguide/globalview/aggregated-api-endpoint): Unified management for `create`, `update`, `delete`, `query`.
* [Unified operations](https://hami.io/docs/userguide/globalview/proxy-global-resource): Exec operations command(`describe`, `exec`, `logs`) in one k8s context.
* [Global search for resources and events](https://hami.io/docs/tutorials/hami-search/):
  * Cache query: global fuzzy search and global precise search are supported.
  * Third-party storage: Search engine (Elasticsearch or OpenSearch), relational database, graph database are supported.

Users can access and operate all member clusters via hami-apiserver:  

![overall-relationship.png](../resources/key-features/unified-operation.png)

Users also can check and search all member clusters resources via hami-apiserver:  

![overall-relationship.png](../resources/key-features/unified-search.png)

## Separating the concerns of different roles
hami supports:
* [Unified authentication](https://hami.io/docs/userguide/roleseparation/unifiedAuth):
  * Aggregate API unified access entry.
  * Access control is consistent with member clusters.
* Unified resource quota(`FederatedResourceQuota`):
  * Globally configures the ResourceQuota of each member cluster.
  * Configure ResourceQuota at the federation level.
  * Collects the resource usage of each member cluster in real time.
* Reusable scheduling strategy:
  * Resource templates are decoupled from scheduling policies, plug and play.

Users can access all member clusters with unified authentication:

![overall-relationship.png](../resources/key-features/unified-access.png)

Users also can defined global resource quota via `FederatedResourceQuota`:  

![overall-relationship.png](../resources/key-features/unified-resourcequota.png)

## Cross-cluster service governance
hami supports:
* [Multi-cluster service discovery](https://hami.io/docs/userguide/service/multi-cluster-service):
  * With ServiceExport and ServiceImport, achieving cross-cluster service discovery.
* [Multi-cluster network support](https://hami.io/docs/userguide/network/working-with-submariner):
  * Use `Submariner` to open up the container network between clusters.

Users can enable service governance for cross-cluster with HAMi:  

![overall-relationship.png](../resources/key-features/service-governance.png)

