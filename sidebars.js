module.exports = {
  "docs": [
    {
      "type": "category",
      "label": "Core Concepts",
      "collapsed": false,
      "items": [
        "core-concepts/introduction",
        "core-concepts/architecture"
      ]
    },
    {
      "type": "category",
      "label": "Key Features",
      "items": [
        "key-features/device-sharing",
        "key-features/device-resource-isolation"
      ]
    },
    {
      "type": "category",
      "label": "Get Started",
      "items": [
        "get-started/deploy-with-helm"
      ]
    },
    {
      "type": "category",
      "label": "Installation",
      "items": [
        "installation/prequisities",
        "installation/online-installation",
        "installation/offline-installation",
        "installation/upgrade",
        "installation/uninstall",
        "installation/webui-installation",
        "installation/how-to-use-volcano-vgpu",
        "installation/aws-installation"
      ]
    },
    {
      "type": "category",
      "label": "User Guide",
      "items": [
        "userguide/configure",
        "userguide/Device-supported",
        {
          "type": "category",
          "label": "Monitoring",
          "items": [
            "userguide/monitoring/device-allocation",
            "userguide/monitoring/real-time-device-usage"
          ]
        },
        {
          "type": "category",
          "label": "Share NVIDIA GPU devices",
          "items": [
            "userguide/NVIDIA-device/dynamic-mig-support",
            "userguide/NVIDIA-device/specify-device-memory-usage",
            "userguide/NVIDIA-device/specify-device-core-usage",
            "userguide/NVIDIA-device/specify-device-type-to-use",
            "userguide/NVIDIA-device/specify-device-uuid-to-use",
            {
              "type": "category",
              "label": "Examples",
              "items": [
                "userguide/NVIDIA-device/examples/use-exclusive-card",
                "userguide/NVIDIA-device/examples/allocate-device-memory",
                "userguide/NVIDIA-device/examples/allocate-device-memory2",
		            "userguide/NVIDIA-device/examples/allocate-device-core",
                "userguide/NVIDIA-device/examples/specify-card-type-to-use",
                "userguide/NVIDIA-device/examples/specify-certain-card",
                "userguide/NVIDIA-device/examples/dynamic-mig-example"
              ]
            } 
          ]
        },
        {
          "type": "category",
          "label": "Share Cambricon MLU devices",
          "items": [
            "userguide/Cambricon-device/enable-cambricon-mlu-sharing",
            "userguide/Cambricon-device/specify-device-memory-usage",
            "userguide/Cambricon-device/specify-device-core-usage",
            "userguide/Cambricon-device/specify-device-type-to-use",
            {
              "type": "category",
              "label": "Examples",
              "items": [
                "userguide/Cambricon-device/examples/allocate-core-and-memory",
                "userguide/Cambricon-device/examples/allocate-exclusive"
              ]
            }
          ]
        },
        {
          "type": "category",
          "label": "Share Hygon DCU devices",
          "items": [
            "userguide/Hygon-device/enable-hygon-dcu-sharing",
            "userguide/Hygon-device/specify-device-memory-usage",
            "userguide/Hygon-device/specify-device-core-usage",
            "userguide/Hygon-device/specify-device-uuid-to-use",
            {
              "type": "category",
              "label": "Examples",
              "items": [
                "userguide/Hygon-device/examples/allocate-core-and-memory",
                "userguide/Hygon-device/examples/allocate-exclusive",
                "userguide/Hygon-device/examples/specify-certain-cards",
              ]
            }
          ]
        },
        {
          "type": "category",
          "label": "Share Mthreads GPU devices",
          "items": [
            "userguide/Mthreads-device/enable-mthreads-gpu-sharing",
            "userguide/Mthreads-device/specify-device-memory-usage",
            "userguide/Mthreads-device/specify-device-core-usage",
            {
              "type": "category",
              "label": "Examples",
              "items": [
                "userguide/Mthreads-device/examples/allocate-core-and-memory",
                "userguide/Mthreads-device/examples/allocate-exclusive"
              ]
            }
          ]
        },
        {
          "type": "category",
          "label": "Share Illuvatar GPU devices",
          "items": [
            "userguide/Iluvatar-device/enable-illuvatar-gpu-sharing",
            {
              "type": "category",
              "label": "Examples",
              "items": [
                "userguide/Iluvatar-device/examples/allocate-device-core-and-memory-to-container",
                "userguide/Iluvatar-device/examples/allocate-exclusive"
              ]
            }
          ]
        },
        {
          "type": "category",
          "label": "Share Enflame GCU devices",
          "items": [
            "userguide/Enflame-device/enable-enflame-gcu-sharing"
          ]
        },
        {
          "type": "category",
          "label": "Managing AWS Neuron devices",
          "items": [
            "userguide/AWSNeuron-device/enable-awsneuron-managing",
            {
              "type": "category",
              "label": "Examples",
              "items": [
                "userguide/AWSNeuron-device/examples/allocate-neuron-core",
                "userguide/AWSNeuron-device/examples/allocate-neuron-device"
              ]
            }
          ]
        },
        {
          "type": "category",
          "label": "Optimize Kunlunxin devices scheduling",
          "items": [
            "userguide/Kunlunxin-device/enable-kunlunxin-schedule",
            "userguide/Kunlunxin-device/enable-kunlunxin-vxpu",
            {
              "type": "category",
              "label": "Examples",
              "items": [
                "userguide/Kunlunxin-device/enable-kunlunxin-vxpu/allocate_whole_xpu",
                "userguide/Kunlunxin-device/enable-kunlunxin-vxpu/allocate_vxpu"
              ]
            }
          ] 
        },
        {
          "type": "category",
          "label": "Optimize Metax GPU scheduling",
          "items": [
            {
              "type": "category",
              "label": "Share Metax GPU devices",
              "items": [
                "userguide/Metax-device/Metax-sGPU/enable-metax-gpu-sharing",
                {
                  "type": "category",
                  "label": "Examples",
                  "items": [
                    "userguide/Metax-device/Metax-sGPU/examples/default-use",
                    "userguide/Metax-device/Metax-sGPU/examples/allocate-exclusive",
                    "userguide/Metax-device/Metax-sGPU/examples/allocate-qos-policy"
                  ]
                }
              ]
            },
            {
              "type": "category",
              "label": "Metax GPU topology-aware scheduling",
              "items": [
                "userguide/Metax-device/Metax-GPU/enable-metax-gpu-schedule",
                "userguide/Metax-device/Metax-GPU/specify-binpack-task",
                "userguide/Metax-device/Metax-GPU/specify-spread-task",
                {
                  "type": "category",
                  "label": "Examples",
                  "items": [
                    "userguide/Metax-device/Metax-GPU/examples/default-use",
                    "userguide/Metax-device/Metax-GPU/examples/allocate-binpack",
                    "userguide/Metax-device/Metax-GPU/examples/allocate-spread"
                  ]
                }
              ]
            }
          ]
        },
        {
          "type": "category",
          "label": "Share Ascend devices",
          "items": [
            "userguide/Ascend-device/enable-ascend-sharing",
            "userguide/Ascend-device/device-template",
            {
              "type": "category",
              "label": "Examples",
              "items": [
                "userguide/Ascend-device/examples/allocate-310p",
                "userguide/Ascend-device/examples/allocate-910b",
                "userguide/Ascend-device/examples/allocate-exclusive"
              ]
            }
          ] 
        },
        {
          "type": "category",
          "label": "Volcano vGPU",
          "items": [
            {
              "type": "category",
              "label": "NVIDIA GPU",
              "items": [
                "userguide/volcano-vgpu/NVIDIA-GPU/how-to-use-volcano-vgpu",
                "userguide/volcano-vgpu/NVIDIA-GPU/monitor",
                {
                  "type": "category",
                  "label": "Examples",
                  "items": [
                    "userguide/volcano-vgpu/NVIDIA-GPU/examples/default_use",
                    "userguide/volcano-vgpu/NVIDIA-GPU/examples/use_exclusive_gpu"
                  ] 
                }
              ]
            }
          ] 
        } 
      ]
    },
    {
      "type": "category",
      "label": "Developer Guide",
      "items": [
        "developers/build",
        "developers/protocol",
        "developers/scheduling",
        "developers/HAMi-core-design",
        "developers/Dynamic-mig",
        "developers/kunlunxin-topology",
        "developers/mindmap"
      ]
    },
    {
      "type": "category",
      "label": "Contributor Guide",
      "items": [
        "contributor/contributing",
        "contributor/goverance",
        "contributor/ladder"
      ]
    },
    {
      "type": "doc",
      "id": "troubleshooting/troubleshooting"
    },
    {
      "type": "doc",
      "id": "FAQ/FAQ"
    }
  ]
}
