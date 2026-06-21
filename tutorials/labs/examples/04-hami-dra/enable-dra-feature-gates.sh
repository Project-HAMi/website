#!/bin/bash
set -e
for f in kube-apiserver kube-scheduler kube-controller-manager; do
  grep -q 'DRAConsumableCapacity' /etc/kubernetes/manifests/$f.yaml || \
  sed -i "/    - $f/a\\    - --feature-gates=DRAConsumableCapacity=true" /etc/kubernetes/manifests/$f.yaml
done
grep -q DRAConsumableCapacity /var/lib/kubelet/config.yaml || cat >> /var/lib/kubelet/config.yaml <<KEOF
featureGates:
  DRAConsumableCapacity: true
KEOF
systemctl restart kubelet
echo "waiting for apiserver..."
sleep 20
until kubectl get nodes >/dev/null 2>&1; do sleep 5; done
kubectl get nodes
kubectl api-resources --api-group=resource.k8s.io | head -6
