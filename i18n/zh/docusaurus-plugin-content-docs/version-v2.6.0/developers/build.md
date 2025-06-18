---
title: 构建 HAMi
translated: true
---

## 制作二进制文件

### 前提条件

需要以下工具：

- go v1.20+
- make

### 构建

```bash
make
```

如果一切成功构建，将打印以下输出

```
go build -ldflags '-s -w -X github.com/Project-HAMi/HAMi/pkg/version.version=v0.0.1' -o bin/scheduler ./cmd/scheduler
go build -ldflags '-s -w -X github.com/Project-HAMi/HAMi/pkg/version.version=v0.0.1' -o bin/vGPUmonitor ./cmd/vGPUmonitor
go build -ldflags '-s -w -X github.com/Project-HAMi/HAMi/pkg/version.version=v0.0.1' -o bin/nvidia-device-plugin ./cmd/device-plugin/nvidia
```

## 制作镜像

### 前提条件

需要以下工具：

- docker
- make

### 构建

```bash
make docker
```

如果一切成功构建，将打印以下输出

```
go build -ldflags '-s -w -X github.com/Project-HAMi/HAMi/pkg/version.version=v0.0.1' -o bin/scheduler ./cmd/scheduler
go build -ldflags '-s -w -X github.com/Project-HAMi/HAMi/pkg/version.version=v0.0.1' -o bin/vGPUmonitor ./cmd/vGPUmonitor
go build -ldflags '-s -w -X github.com/Project-HAMi/HAMi/pkg/version.version=v0.0.1' -o bin/nvidia-device-plugin ./cmd/device-plugin/nvidia
[+] Building 146.4s (28/28)
FINISHED                                                                                                                                                                                                                                                                     docker:default
 => [internal] load build definition from Dockerfile                                                                                                                                                                                                                                                                     0.0s
 => => transferring dockerfile: 1.30kB                                                                                                                                                                                                                                                                                   0.0s
 => [internal] load metadata for docker.io/nvidia/cuda:12.2.0-base-ubuntu22.04                                                                                                                                                                                                                                           5.5s
 => [internal] load metadata for docker.io/library/golang:1.21-bullseye                                                                                                                                                                                                                                                  4.5s
 => [internal] load metadata for docker.io/nvidia/cuda:12.2.0-devel-ubuntu20.04                                                                                                                                                                                                                                          0.0s
 => [auth] nvidia/cuda:pull token for registry-1.docker.io                                                                                                                                                                                                                                                               0.0s
 => [auth] library/golang:pull token for registry-1.docker.io                                                                                                                                                                                                                                                            0.0s
 => [internal] load .dockerignore                                                                                                                                                                                                                                                                                        0.0s
 => => transferring context: 2B                                                                                                                                                                                                                                                                                          0.0s
 => [internal] load build context                                                                                                                                                                                                                                                                                        1.3s
 => => transferring context: 119.90MB                                                                                                                                                                                                                                                                                    1.3s
 => [stage-3 1/6] FROM docker.io/nvidia/cuda:12.2.0-base-ubuntu22.04@sha256:ecdf8549dd5f12609e365217a64dedde26ecda26da8f3ff3f82def6749f53051                                                                                                                                                                             0.0s
 => CACHED [gobuild 1/4] FROM docker.io/library/golang:1.21-bullseye@sha256:311468bffa9fa4747a334b94e6ce3681b564126d653675a6adc46698b2b88d35                                                                                                                                                                             0.0s
 => [nvbuild 1/9] FROM docker.io/nvidia/cuda:12.2.0-devel-ubuntu20.04                                                                                                                                                                                                                                                    0.0s
 => [gobuild 2/4] ADD . /k8s-vgpu                                                                                                                                                                                                                                                                                        0.8s
 => [nvbuild 2/9] COPY ./libvgpu /libvgpu                                                                                                                                                                                                                                                                                0.3s
 => [nvbuild 3/9] WORKDIR /libvgpu                                                                                                                                                                                                                                                                                       0.2s
 => [nvbuild 4/9] RUN apt-get -y update && apt-get -y install wget                                                                                                                                                                                                                                                      21.9s
 => [gobuild 3/4] RUN apt-get update && apt-get -y install libhwloc-dev libdrm-dev                                                                                                                                                                                                                                      18.8s
 => [gobuild 4/4] RUN cd /k8s-vgpu && make all                                                                                                                                                                                                                                                                          83.5s
 => [nvbuild 5/9] RUN wget https://cmake.org/files/v3.19/cmake-3.19.8-Linux-x86_64.tar.gz                                                                                                                                                                                                                               99.8s
 => CACHED [stage-3 2/6] COPY ./LICENSE /k8s-vgpu/LICENSE                                                                                                                                                                                                                                                                0.0s
 => [stage-3 3/6] COPY --from=GOBUILD /k8s-vgpu/bin /k8s-vgpu/bin                                                                                                                                                                                                                                                        0.5s
 => [stage-3 4/6] COPY ./docker/entrypoint.sh /k8s-vgpu/bin/entrypoint.sh                                                                                                                                                                                                                                                0.2s
 => [stage-3 5/6] COPY ./lib /k8s-vgpu/lib                                                                                                                                                                                                                                                                               0.2s
 => [nvbuild 6/9] RUN tar -xf cmake-3.19.8-Linux-x86_64.tar.gz                                                                                                                                                                                                                                                           2.1s 
 => [nvbuild 7/9] RUN cp /libvgpu/cmake-3.19.8-Linux-x86_64/bin/cmake /libvgpu/cmake-3.19.8-Linux-x86_64/bin/cmake3                                                                                                                                                                                                      1.3s 
 => [nvbuild 8/9] RUN apt-get -y install openssl libssl-dev                                                                                                                                                                                                                                                              7.7s 
 => [nvbuild 9/9] RUN bash ./build.sh                                                                                                                                                                                                                                                                                    4.0s 
 => [stage-3 6/6] COPY --from=NVBUILD /libvgpu/build/libvgpu.so /k8s-vgpu/lib/nvidia/                                                                                                                                                                                                                                    0.3s 
 => exporting to image                                                                                                                                                                                                                                                                                                   1.8s 
 => => exporting layers                                                                                                                                                                                                                                                                                                  1.8s 
 => => writing image sha256:fc0ce42b41f9a177921c9bfd239babfa06fc77cf9e4087e8f2d959d749e8039f                                                                                                                                                                                                                             0.0s 
 => => naming to docker.io/projecthami/hami:master-103b2b677e018a40af6322a56c2e9d5d5c62cccf                                                                                                                                                                                                                              0.0s 
The push refers to repository [docker.io/projecthami/hami]    
```

## 制作HAMi-Core

建议在nvidia/cuda镜像中构建HAMi-Core：

```bash
git clone https://github.com/Project-HAMi/HAMi-core.git
docker build . -f dockerfiles/Dockerfile.{arch}