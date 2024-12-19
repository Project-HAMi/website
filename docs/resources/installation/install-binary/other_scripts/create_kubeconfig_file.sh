#!/bin/bash

set -u
set -e
set -o pipefail

# By not embedding certificate, we don't need to regenerate kubeconfig file when certificates is replaced.

function parse_parameter() {
  if [ $# -ne 1 ]
  then
    echo "Usage: $0 <URL of HAMi API Server >"
    echo "Example: $0 \"https://127.0.0.1:6443\""
    exit 1
  fi

  HAMI_APISERVER="$1"
}

function check_pki_dir_exist() {
  if [ ! -e "/etc/hami/pki/hami.crt" ]
  then
    echo 'You need to replace all certificates and private keys under "/etc/hami/pki/", then execute this command'
    exit 1
  fi
}

# for kubectl
function create_admin_kubeconfig() {
  kubectl config set-cluster hami \
    --certificate-authority=/etc/hami/pki/server-ca.crt \
    --embed-certs=false \
    --server "${HAMI_APISERVER}" \
    --kubeconfig=admin.kubeconfig

  kubectl config set-credentials admin \
    --client-certificate=/etc/hami/pki/admin.crt \
    --client-key=/etc/hami/pki/admin.key \
    --embed-certs=false \
    --kubeconfig=admin.kubeconfig

  kubectl config set-context hami \
    --cluster=hami \
    --user=admin \
    --kubeconfig=admin.kubeconfig

  kubectl config use-context hami --kubeconfig=admin.kubeconfig
}

# for kube-controller-manager
function create_kube_controller_manager_kubeconfig() {
  kubectl config set-cluster hami \
    --certificate-authority=/etc/hami/pki/server-ca.crt \
    --embed-certs=false \
    --server "${HAMI_APISERVER}" \
    --kubeconfig=kube-controller-manager.kubeconfig

  kubectl config set-credentials system:kube-controller-manager \
    --client-certificate=/etc/hami/pki/kube-controller-manager.crt \
    --client-key=/etc/hami/pki/kube-controller-manager.key \
    --embed-certs=false \
    --kubeconfig=kube-controller-manager.kubeconfig

  kubectl config set-context system:kube-controller-manager \
    --cluster=hami \
    --user=system:kube-controller-manager \
    --kubeconfig=kube-controller-manager.kubeconfig

  kubectl config use-context system:kube-controller-manager --kubeconfig=kube-controller-manager.kubeconfig
}

# for a lot of different hami components 
function create_hami_kubeconfig() {
  kubectl config set-cluster hami \
    --certificate-authority=/etc/hami/pki/server-ca.crt \
    --embed-certs=false \
    --server "${HAMI_APISERVER}" \
    --kubeconfig=hami.kubeconfig

  kubectl config set-credentials system:hami \
    --client-certificate=/etc/hami/pki/hami.crt \
    --client-key=/etc/hami/pki/hami.key \
    --embed-certs=false \
    --kubeconfig=hami.kubeconfig

  kubectl config set-context system:hami\
    --cluster=hami \
    --user=system:hami \
    --kubeconfig=hami.kubeconfig

  kubectl config use-context system:hami --kubeconfig=hami.kubeconfig
}

parse_parameter "$@"
check_pki_dir_exist
cd /etc/hami/
create_admin_kubeconfig
create_kube_controller_manager_kubeconfig
create_hami_kubeconfig