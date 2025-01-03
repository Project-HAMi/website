---
title: Assign to certain device type
---

## Assign to certain device type

Sometimes a task may wish to run on a certain type of GPU, it can fill the `nvidia.com/use-gputype` field in pod annotation. HAMi scheduler will check if the device type returned from `nvidia-smi -L` contains the content of annotation.

For example, a task with the following annotation will be assigned to A100 or V100 GPU

```
metadata:
  annotations:
    nvidia.com/use-gputype: "A100,V100" # Specify the card type for this job, use comma to seperate, will not launch job on non-specified card
```

A task may use `nvidia.com/nouse-gputype` to evade certain type of GPU. In this following example, that job won't be assigned to 1080(include 1080Ti) or 2080(include 2080Ti) type of card. 

```
metadata:
  annotations:
    nvidia.com/nouse-gputype: "1080,2080" # Specify the blacklist card type for this job, use comma to seperate, will not launch job on specified card
```
