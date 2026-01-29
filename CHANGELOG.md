# Changelog

## v2.8.0 (2026-01-20)

#### :rocket: Major features

- HAMi DRA is now supported, for details, please visit: <https://github.com/Project-HAMi/HAMi-DRA>
- Enable leader select among multiple schedulers (#1553)
- Support CDI mode on NVIDIA devices (#1552)
- Optimize HAMi webUI, please visit <https://github.com/Project-HAMi/HAMi-WebUI>
- Sync with k8s-device-plugin from nvidia v0.18.0 (#1541)
- Add hami_build_info metrics and version print (#1581)
- Watch and hot reload the updated certificate (#1573)

#### :bug: Major bug fixes

- Update HAMi-core to fix vllm-related issues: #1381 #1461 by ([@archlitchi](https://github.com/archlitchi)) in [#1478](https://github.com/Project-HAMi/HAMi/pull/1478)
- Fix: Calculation error for quotas by ([@luohua13](https://github.com/luohua13)) in [#1400](https://github.com/Project-HAMi/HAMi/pull/1400)
- Fix: vXPU feature may not working properly on P800 node (#1569)
- Fix scheduler allocate incorrect mig instance (#1518)

#### :memo: What's Changed

### 🔨 Other Changes

- Mock-device-plugin is now ready to use, please visit: <https://github.com/Project-HAMi/mock-device-plugin>
- Ascend device plugin is now supporting vNPU feature for both HAMi and volcano, please visit: <https://github.com/Project-HAMi/ascend-device-plugin>
- Refine Node Register logic (#1499)
- Update go version to v1.25.5
- Fix release CI by ([@archlitchi](https://github.com/archlitchi)) in [#1373](https://github.com/Project-HAMi/HAMi/pull/1373)
- Fix: failed clusterrolebinding when change release name or chart name by ([@FouoF](https://github.com/FouoF)) in [#1380](https://github.com/Project-HAMi/HAMi/pull/1380)
- fix: e2e ginkgo version mismatch by ([@FouoF](https://github.com/FouoF)) in [#1391](https://github.com/Project-HAMi/HAMi/pull/1391)
- fix: check pod nil in `ReleaseNodeLock` by ([@DSFans2014](https://github.com/DSFans2014)) in [#1372](https://github.com/Project-HAMi/HAMi/pull/1372)
- fix: upgrade nvidia-mig-parted to v0.12.2 to solve security issues by ([@Shouren](https://github.com/Shouren)) in [#1388](https://github.com/Project-HAMi/HAMi/pull/1388)
- fix: scheduler flaky test by ([@FouoF](https://github.com/FouoF)) in [#1402](https://github.com/Project-HAMi/HAMi/pull/1402)
- Fix: After removing the device plugin from the gpu node, it can still… by ([@luohua13](https://github.com/luohua13)) in [#1456](https://github.com/Project-HAMi/HAMi/pull/1456)
- Fix concurrent map iteration and map write fatal error. by ([@litaixun](https://github.com/litaixun)) in [#1452](https://github.com/Project-HAMi/HAMi/pull/1452)
- fix: fix typos by ([@DSFans2014](https://github.com/DSFans2014)) in [#1434](https://github.com/Project-HAMi/HAMi/pull/1434)
- Fix CI error of the PR #1470, #1326, #1033 by ([@archlitchi](https://github.com/archlitchi)) in [#1473](https://github.com/Project-HAMi/HAMi/pull/1473)
- Fix concurrent map read write fatal error. by ([@litaixun](https://github.com/litaixun)) in [#1476](https://github.com/Project-HAMi/HAMi/pull/1476)
- add podInfos in DeviceUsage to enhance scheduling decision by ([@Kyrie336](https://github.com/Kyrie336)) in [#1362](https://github.com/Project-HAMi/HAMi/pull/1362)
- Update device-numa acquisition logic by ([@archlitchi](https://github.com/archlitchi)) in [#1403](https://github.com/Project-HAMi/HAMi/pull/1403)
- Improved support for iluvatar GPUs by ([@qiangwei1983](https://github.com/qiangwei1983)) in [#1399](https://github.com/Project-HAMi/HAMi/pull/1399)
- Improve: Replace `StrategicMergePatchType` by `MergePatchType` by ([@luohua13](https://github.com/luohua13)) in [#1431](https://github.com/Project-HAMi/HAMi/pull/1431)
- optimize schedule failure event by ([@Kyrie336](https://github.com/Kyrie336)) in [#1444](https://github.com/Project-HAMi/HAMi/pull/1444)

#### Committers: Contributors

- archlitchi ([@archlitchi](https://github.com/archlitchi))
- FouoF ([@FouoF](https://github.com/FouoF))
- DSFans2014 ([@DSFans2014](https://github.com/DSFans2014))
- Shouren ([@Shouren](https://github.com/Shouren))
- luohua13 ([@luohua13](https://github.com/luohua13))
- litaixun ([@litaixun](https://github.com/litaixun))
- Kyrie336 ([@Kyrie336](https://github.com/Kyrie336))
- qiangwei1983 ([@qiangwei1983](https://github.com/qiangwei1983))

**Full Changelog**: <https://github.com/Project-HAMi/HAMi/compare/v2.7.1...v2.8.0>

## v2.7.1 (2025-11-07)

#### :rocket: Major features

- No major features in this release.

#### :bug: Major bug fixes

- Update HAMi-core to fix vllm-related issues: #1381 #1461 by ([@archlitchi](https://github.com/archlitchi)) in [#1478](https://github.com/Project-HAMi/HAMi/pull/1478)
- Fix: Calculation error for quotas by ([@luohua13](https://github.com/luohua13)) in [#1400](https://github.com/Project-HAMi/HAMi/pull/1400)
- Fix release CI by ([@archlitchi](https://github.com/archlitchi)) in [#1373](https://github.com/Project-HAMi/HAMi/pull/1373)
- Fix: failed clusterrolebinding when change release name or chart name by ([@FouoF](https://github.com/FouoF)) in [#1380](https://github.com/Project-HAMi/HAMi/pull/1380)
- fix: e2e ginkgo version mismatch by ([@FouoF](https://github.com/FouoF)) in [#1391](https://github.com/Project-HAMi/HAMi/pull/1391)
- fix: check pod nil in `ReleaseNodeLock` by ([@DSFans2014](https://github.com/DSFans2014)) in [#1372](https://github.com/Project-HAMi/HAMi/pull/1372)
- fix: upgrade nvidia-mig-parted to v0.12.2 to solve security issues by ([@Shouren](https://github.com/Shouren)) in [#1388](https://github.com/Project-HAMi/HAMi/pull/1388)
- fix: scheduler flaky test by ([@FouoF](https://github.com/FouoF)) in [#1402](https://github.com/Project-HAMi/HAMi/pull/1402)
- Fix: After removing the device plugin from the gpu node, it can still… by ([@luohua13](https://github.com/luohua13)) in [#1456](https://github.com/Project-HAMi/HAMi/pull/1456)
- Fix concurrent map iteration and map write fatal error. by ([@litaixun](https://github.com/litaixun)) in [#1452](https://github.com/Project-HAMi/HAMi/pull/1452)
- fix: fix typos by ([@DSFans2014](https://github.com/DSFans2014)) in [#1434](https://github.com/Project-HAMi/HAMi/pull/1434)
- Fix CI error of the PR #1470, #1326, #1033 by ([@archlitchi](https://github.com/archlitchi)) in [#1473](https://github.com/Project-HAMi/HAMi/pull/1473)
- Fix concurrent map read write fatal error. by ([@litaixun](https://github.com/litaixun)) in [#1476](https://github.com/Project-HAMi/HAMi/pull/1476)
- add podInfos in DeviceUsage to enhance scheduling decision by ([@Kyrie336](https://github.com/Kyrie336)) in [#1362](https://github.com/Project-HAMi/HAMi/pull/1362)
- Update device-numa acquisition logic by ([@archlitchi](https://github.com/archlitchi)) in [#1403](https://github.com/Project-HAMi/HAMi/pull/1403)
- Improved support for iluvatar GPUs by ([@qiangwei1983](https://github.com/qiangwei1983)) in [#1399](https://github.com/Project-HAMi/HAMi/pull/1399)
- Improve: Replace `StrategicMergePatchType` by `MergePatchType` by ([@luohua13](https://github.com/luohua13)) in [#1431](https://github.com/Project-HAMi/HAMi/pull/1431)
- optimize schedule failure event by ([@Kyrie336](https://github.com/Kyrie336)) in [#1444](https://github.com/Project-HAMi/HAMi/pull/1444)

#### :memo: What's Changed

### 🔨 Other Changes

- Release v2.7.1 by ([@archlitchi](https://github.com/archlitchi)) in [#1480](https://github.com/Project-HAMi/HAMi/pull/1480)

#### Committers: 🆕 New Contributors

- luohua13 ([@luohua13](https://github.com/luohua13))
- qiangwei1983 ([@qiangwei1983](https://github.com/qiangwei1983))
- eltociear ([@eltociear](https://github.com/eltociear))
- daixiang0 ([@daixiang0](https://github.com/daixiang0))
- zhegemingzimeibanquan ([@zhegemingzimeibanquan](https://github.com/zhegemingzimeibanquan))

**Full Changelog**: <https://github.com/Project-HAMi/HAMi/compare/v2.7.0...v2.7.1>

## v2.7.0 (2025-09-26)

#### :rocket: Major features

- Metax sGPU topology aware by ([@Kyrie336](https://github.com/Kyrie336)) in [#1193](https://github.com/Project-HAMi/HAMi/pull/1193)
- NVIDIA Resourcequota by ([@FouoF](https://github.com/FouoF)) in [#1359](https://github.com/Project-HAMi/HAMi/pull/1359)
- Kunlunxin topology-aware scheduling by ([@FouoF](https://github.com/FouoF)) in [#1141](https://github.com/Project-HAMi/HAMi/pull/1141)
- Kunlunxin vxpu sopport #1016 by ([@ouyangluwei163](https://github.com/ouyangluwei163)) ([@archlitchi](https://github.com/archlitchi)) in [#1337](https://github.com/Project-HAMi/HAMi/pull/1337)
- Enflame GCU topology-awareness (#1040) by ([@zhaikangqi331](https://github.com/zhaikangqi331)) in [#1334](https://github.com/Project-HAMi/HAMi/pull/1334)
- AWS-neuron device and device-core allocation by ([@archlitchi](https://github.com/archlitchi)) in [#1238](https://github.com/Project-HAMi/HAMi/pull/1238)
- Aggregated Scheduling Failure Events by ([@Wangmin362](https://github.com/Wangmin362)) in [#1333](https://github.com/Project-HAMi/HAMi/pull/1333)

#### :bug: Major bug fixes

- fix: Before executing MIG partitioning, suppress NVML usage in o… by ([@Goend](https://github.com/Goend)) in [#1095](https://github.com/Project-HAMi/HAMi/pull/1095)
- Fix golint-CI by ([@archlitchi](https://github.com/archlitchi)) in [#1127](https://github.com/Project-HAMi/HAMi/pull/1127)
- fix: override node socre failure for kunlun #1137 by ([@ouyangluwei163](https://github.com/ouyangluwei163)) in [#1138](https://github.com/Project-HAMi/HAMi/pull/1138)
- fix: Multi-node scoring nodes are inaccurate by ([@ouyangluwei163](https://github.com/ouyangluwei163)) in [#1147](https://github.com/Project-HAMi/HAMi/pull/1147)
- fix: An error occurred while create Iluvatar pod by ([@ouyangluwei163](https://github.com/ouyangluwei163)) in [#1149](https://github.com/Project-HAMi/HAMi/pull/1149)
- Fix e2e CI by ([@archlitchi](https://github.com/archlitchi)) in [#1165](https://github.com/Project-HAMi/HAMi/pull/1165)
- fix: Add option for overwrite schedulerName by ([@Shouren](https://github.com/Shouren)) in [#1163](https://github.com/Project-HAMi/HAMi/pull/1163)
- fix: using go-safecast to fix incorrect conversion of numbers by ([@Shouren](https://github.com/Shouren)) in [#1183](https://github.com/Project-HAMi/HAMi/pull/1183)
- fix: deal with security issues reported by Trivy in image by ([@Shouren](https://github.com/Shouren)) in [#1189](https://github.com/Project-HAMi/HAMi/pull/1189)
- fix: wrong Pod's UID and emtpy Pod's name in log of webhook.go by ([@Shouren](https://github.com/Shouren)) in [#1092](https://github.com/Project-HAMi/HAMi/pull/1092)
- fix: concurrent map writes error in scheduler.calcScore #1269 by ([@Shouren](https://github.com/Shouren)) in [#1270](https://github.com/Project-HAMi/HAMi/pull/1270)
- fix: release dangling node lock by ([@peachest](https://github.com/peachest)) in [#1271](https://github.com/Project-HAMi/HAMi/pull/1271)
- fix: fix err which retrieved incorrect NUMA node information issue #1275 by ([@abstractmj](https://github.com/abstractmj)) in [#1276](https://github.com/Project-HAMi/HAMi/pull/1276)
- fix(security): resolve issues reported by Code scanning in Security by ([@Shouren](https://github.com/Shouren)) in [#1280](https://github.com/Project-HAMi/HAMi/pull/1280)
- fix: fix golangci-lint error by ([@DSFans2014](https://github.com/DSFans2014)) in [#1319](https://github.com/Project-HAMi/HAMi/pull/1319)
- Fix: device allocation missing containers with no device request by ([@FouoF](https://github.com/FouoF)) in [#1299](https://github.com/Project-HAMi/HAMi/pull/1299)
- fix: update int8Slice to uint8Slice for better type clarity and consistency by ([@yxxhero](https://github.com/yxxhero)) in [#1357](https://github.com/Project-HAMi/HAMi/pull/1357)

#### :memo: What's Changed

### 📚 Documentation

- documentation: add Known Issues for dynamic mig support by ([@Goend](https://github.com/Goend)) in [#1122](https://github.com/Project-HAMi/HAMi/pull/1122)
- docs: fix broken link by ([@lixd](https://github.com/lixd)) in [#1125](https://github.com/Project-HAMi/HAMi/pull/1125)
- clearly list supported devices doc references at README by ([@FouoF](https://github.com/FouoF)) in [#1155](https://github.com/Project-HAMi/HAMi/pull/1155)
- docs: update ascend910b-support docs by ([@DSFans2014](https://github.com/DSFans2014)) in [#1321](https://github.com/Project-HAMi/HAMi/pull/1321)

### 🔨 Other Changes

- Optimize Fit-in-device logic to make it device-specific by ([@archlitchi](https://github.com/archlitchi)) in [#1097](https://github.com/Project-HAMi/HAMi/pull/1097)
- feat(scheduler): make node lock timeout configurable by ([@Kevinz857](https://github.com/Kevinz857)) in [#1117](https://github.com/Project-HAMi/HAMi/pull/1117)
- featue: mig mode-change #1116 by ([@ouyangluwei163](https://github.com/ouyangluwei163)) in [#1124](https://github.com/Project-HAMi/HAMi/pull/1124)
- feat: Add new labels in .github/release.yml by ([@Shouren](https://github.com/Shouren)) in [#1066](https://github.com/Project-HAMi/HAMi/pull/1066)
- feat(scheduler-role): use a scoped-down role for scheduler by ([@Antvirf](https://github.com/Antvirf)) in [#1152](https://github.com/Project-HAMi/HAMi/pull/1152)
- feat(helm): optionally disable admission webhook by ([@Antvirf](https://github.com/Antvirf)) in [#1145](https://github.com/Project-HAMi/HAMi/pull/1145)
- remove redundant metrics for vgpu allocation by ([@FouoF](https://github.com/FouoF)) in [#1169](https://github.com/Project-HAMi/HAMi/pull/1169)
- refactor: clean up code and improve maintainability by ([@Wangmin362](https://github.com/Wangmin362)) in [#1195](https://github.com/Project-HAMi/HAMi/pull/1195)
- refactor: Ranging over SplitSeq is more efficient by ([@Shouren](https://github.com/Shouren)) in [#1239](https://github.com/Project-HAMi/HAMi/pull/1239)
- feat:NodeLockTimeout set from env by ([@miaobyte](https://github.com/miaobyte)) in [#1244](https://github.com/Project-HAMi/HAMi/pull/1244)
- refactor: move watchAndFeedback function to feedback.go by ([@miaobyte](https://github.com/miaobyte)) in [#1248](https://github.com/Project-HAMi/HAMi/pull/1248)
- feat: add informer-based pod cache to reduce API server load by ([@miaobyte](https://github.com/miaobyte)) in [#1250](https://github.com/Project-HAMi/HAMi/pull/1250)
- feat: Add option to disable device plugin at values.yaml. by ([@FouoF](https://github.com/FouoF)) in [#1274](https://github.com/Project-HAMi/HAMi/pull/1274)
- refactor(util/nodelock): replace manual polling with k8s.io/client-go/util/retry by ([@mayooot](https://github.com/mayooot)) in [#1252](https://github.com/Project-HAMi/HAMi/pull/1252)
- refactor: Remove annotation in Devices interfaces by ([@Shouren](https://github.com/Shouren)) in [#1343](https://github.com/Project-HAMi/HAMi/pull/1343)
- feat: update the `Ascend910` scheduling policy by ([@DSFans2014](https://github.com/DSFans2014)) in [#1344](https://github.com/Project-HAMi/HAMi/pull/1344)
- feat(nvidia): default gpucores=100 when memory is exclusive and cores… by ([@xrwang8](https://github.com/xrwang8)) in [#1354](https://github.com/Project-HAMi/HAMi/pull/1354)
- Prerelease-v2.6 by ([@archlitchi](https://github.com/archlitchi)) in [#1108](https://github.com/Project-HAMi/HAMi/pull/1108)
- add new reviewers Shouren and ouyangluwei163 by ([@wawa0210](https://github.com/wawa0210)) in [#1131](https://github.com/Project-HAMi/HAMi/pull/1131)
- Support topology-awareness for Kunlunxin device by ([@archlitchi](https://github.com/archlitchi)) in [#1121](https://github.com/Project-HAMi/HAMi/pull/1121)
- Support Metax sGPU Qos Policy by ([@Kyrie336](https://github.com/Kyrie336)) in [#1123](https://github.com/Project-HAMi/HAMi/pull/1123)
- add global image for chart by ([@calvin0327](https://github.com/calvin0327)) in [#1133](https://github.com/Project-HAMi/HAMi/pull/1133)
- fix: Skip admission webhook when Pod's scheduler is already assigned. by ([@ghostloda](https://github.com/ghostloda)) in [#1041](https://github.com/Project-HAMi/HAMi/pull/1041)
- Add node configs to docs by ([@wylswz](https://github.com/wylswz)) in [#1159](https://github.com/Project-HAMi/HAMi/pull/1159)
- build(deps): upgrade golang to 1.24.4 by ([@Shouren](https://github.com/Shouren)) in [#1172](https://github.com/Project-HAMi/HAMi/pull/1172)
- build(deps): Upgrade golang image in ci to 1.24.4 by ([@Shouren](https://github.com/Shouren)) in [#1176](https://github.com/Project-HAMi/HAMi/pull/1176)
- build(deps): Upgrade controller-runtime to 0.21.0 by ([@Shouren](https://github.com/Shouren)) in [#1171](https://github.com/Project-HAMi/HAMi/pull/1171)
- build(deps): Dump github.com/NVIDIA/nvidia-container-toolkit by ([@Shouren](https://github.com/Shouren)) in [#1170](https://github.com/Project-HAMi/HAMi/pull/1170)
- Add unit tests for Fit Function for enflame,hygon, metax, mthreads, nvidia by ([@Wangmin362](https://github.com/Wangmin362)) in [#1199](https://github.com/Project-HAMi/HAMi/pull/1199)
- [Misc] update hami-core version by ([@chaunceyjiang](https://github.com/chaunceyjiang)) in [#1201](https://github.com/Project-HAMi/HAMi/pull/1201)
- Improve the impl of DevicePluginConfigs.Nodeconfig overwriting NvidiaConfig by ([@FouoF](https://github.com/FouoF)) in [#1158](https://github.com/Project-HAMi/HAMi/pull/1158)
- Add unit tests for cambricon's Fit Function by ([@Wangmin362](https://github.com/Wangmin362)) in [#1198](https://github.com/Project-HAMi/HAMi/pull/1198)
- Add unit tests for Ascend's Fit Function by ([@Wangmin362](https://github.com/Wangmin362)) in [#1197](https://github.com/Project-HAMi/HAMi/pull/1197)
- 修复生成 pod 请求资源时不必要的重复计算 by ([@litaixun](https://github.com/litaixun)) in [#1215](https://github.com/Project-HAMi/HAMi/pull/1215)
- 修复更新节点注解时的日志提示词 by ([@litaixun](https://github.com/litaixun)) in [#1214](https://github.com/Project-HAMi/HAMi/pull/1214)
- If the mem applied for the Mig device is the same as the template value,>will result in CardNotFoundCustom Filter Rule. by ([@zgqqiang](https://github.com/zgqqiang)) in [#1179](https://github.com/Project-HAMi/HAMi/pull/1179)
- updated dri section to combine text for better readability by ([@mpetason](https://github.com/mpetason)) in [#1216](https://github.com/Project-HAMi/HAMi/pull/1216)
- feat: Add nvidia gpu topoloy scheduler by ([@fyp711](https://github.com/fyp711)) in [#1028](https://github.com/Project-HAMi/HAMi/pull/1028)
- add issue translate robot by ([@wawa0210](https://github.com/wawa0210)) in [#1232](https://github.com/Project-HAMi/HAMi/pull/1232)
- add issue translate robot by ([@wawa0210](https://github.com/wawa0210)) in [#1234](https://github.com/Project-HAMi/HAMi/pull/1234)
- perf(util/nodelock): Use clientset Patch instead of Update. by ([@mayooot](https://github.com/mayooot)) in [#1192](https://github.com/Project-HAMi/HAMi/pull/1192)
- Update hami-core and fix readme documents by ([@archlitchi](https://github.com/archlitchi)) in [#1240](https://github.com/Project-HAMi/HAMi/pull/1240)
- Update hami-core version to fix by ([@archlitchi](https://github.com/archlitchi)) in [#1256](https://github.com/Project-HAMi/HAMi/pull/1256)
- [Snyk] Security upgrade tensorflow/tensorflow from latest-gpu to 2.20.0rc0-gpu by ([@wawa0210](https://github.com/wawa0210)) in [#1243](https://github.com/Project-HAMi/HAMi/pull/1243)
- feat: Add an action of 'Close stale issue and PRs' in github worklfow by ([@Shouren](https://github.com/Shouren)) in [#1083](https://github.com/Project-HAMi/HAMi/pull/1083)
- Welcome fyp711 to become a HAMi member by ([@wawa0210](https://github.com/wawa0210)) in [#1288](https://github.com/Project-HAMi/HAMi/pull/1288)
- Add values readme by ([@clcc2019](https://github.com/clcc2019)) in [#1267](https://github.com/Project-HAMi/HAMi/pull/1267)
- Support Metax sGPU device health check by ([@Kyrie336](https://github.com/Kyrie336)) in [#1295](https://github.com/Project-HAMi/HAMi/pull/1295)
- Optimize pkg/util.go and distribute logics to corresponding logics by ([@archlitchi](https://github.com/archlitchi)) in [#1296](https://github.com/Project-HAMi/HAMi/pull/1296)
- cleanup: Clear and correct ascend device name by ([@FouoF](https://github.com/FouoF)) in [#1315](https://github.com/Project-HAMi/HAMi/pull/1315)
- bugfix: Nvidia card abnormal pod will still continue to schedule by ([@zgqqiang](https://github.com/zgqqiang)) in [#1336](https://github.com/Project-HAMi/HAMi/pull/1336)
- FIx CI, add 910B4-1 template and fix vGPUmonitor metrics error by ([@archlitchi](https://github.com/archlitchi)) in [#1345](https://github.com/Project-HAMi/HAMi/pull/1345)
- add httpTargetPort to values.yaml by ([@flpanbin](https://github.com/flpanbin)) in [#1356](https://github.com/Project-HAMi/HAMi/pull/1356)
- Update kunlunxin documents by ([@archlitchi](https://github.com/archlitchi)) in [#1366](https://github.com/Project-HAMi/HAMi/pull/1366)
- update chart version and hami-core by ([@archlitchi](https://github.com/archlitchi)) in [#1369](https://github.com/Project-HAMi/HAMi/pull/1369)

#### Committers: 🆕 New Contributors

- Kevinz857 ([@Kevinz857](https://github.com/Kevinz857))
- FouoF ([@FouoF](https://github.com/FouoF))
- Antvirf ([@Antvirf](https://github.com/Antvirf))
- wylswz ([@wylswz](https://github.com/wylswz))
- litaixun ([@litaixun](https://github.com/litaixun))
- zgqqiang ([@zgqqiang](https://github.com/zgqqiang))
- mpetason ([@mpetason](https://github.com/mpetason))
- fyp711 ([@fyp711](https://github.com/fyp711))
- mayooot ([@mayooot](https://github.com/mayooot))
- miaobyte ([@miaobyte](https://github.com/miaobyte))
- peachest ([@peachest](https://github.com/peachest))
- abstractmj ([@abstractmj](https://github.com/abstractmj))
- clcc2019 ([@clcc2019](https://github.com/clcc2019))
- DSFans2014 ([@DSFans2014](https://github.com/DSFans2014))
- xrwang8 ([@xrwang8](https://github.com/xrwang8))

**Full Changelog**: <https://github.com/Project-HAMi/HAMi/compare/v2.6.1...v2.7.0>

## v2.6.0 (2025-06-07)

#### :rocket: Major features

- Optimize scheduler log
- Support enflame gcu-share
- Support metax GPU and metax sGPU
- Helm chart add checksum annotation for restarting hami component after ConfigMap modification
- Support for using RuntimeClass with nvidia devices
- Add support for profiling via net/http/pprof package
- Add nvidia gpu topoloy score registry to node
- Feat: vGPUmonitor support MigInfo metrics

#### :bug: Major bug fixes

- Fix stuck in driver 570+
- Fix device memory not counted properly in comfyUI task
- Fix cambricon devices not allocated properly
- Fix wrong log and container request device count error
- Fix vgpu-devices-allocated annotations are inconsistent
- Fix removing node devices from node manager
- Fix: Dynamic GPU partitioning lacks single-GPU-level granularity
- Fix device memory count error on cuMallocAsync
- Fix scheduler crash if a 'mig' task running accidentally on a 'hami-core' GPU
- Fix multi-process device memory count

#### :memo: What's Changed

### ⬆️ Dependencies

- Bump docker/build-push-action from 6.11.0 to 6.13.0 by ([@dependabot](https://github.com/dependabot)) in [#837](https://github.com/Project-HAMi/HAMi/pull/837)
- Bump golang.org/x/net from 0.26.0 to 0.35.0 by ([@dependabot](https://github.com/dependabot)) in [#859](https://github.com/Project-HAMi/HAMi/pull/859)
- Bump aquasecurity/trivy-action from 0.29.0 to 0.30.0 by ([@dependabot](https://github.com/dependabot)) in [#941](https://github.com/Project-HAMi/HAMi/pull/941)
- Bump docker/login-action from 3.3.0 to 3.4.0 by ([@dependabot](https://github.com/dependabot)) in [#942](https://github.com/Project-HAMi/HAMi/pull/942)
- Bump docker/build-push-action from 6.13.0 to 6.15.0 by ([@dependabot](https://github.com/dependabot)) in [#899](https://github.com/Project-HAMi/HAMi/pull/899)
- build(deps): bump docker/build-push-action from 6.15.0 to 6.16.0 by ([@dependabot](https://github.com/dependabot)) in [#1024](https://github.com/Project-HAMi/HAMi/pull/1024)
- build(deps): bump docker/build-push-action from 6.16.0 to 6.17.0 by ([@dependabot](https://github.com/dependabot)) in [#1052](https://github.com/Project-HAMi/HAMi/pull/1052)
- build(deps): bump docker/build-push-action from 6.17.0 to 6.18.0 by ([@dependabot](https://github.com/dependabot)) in [#1091](https://github.com/Project-HAMi/HAMi/pull/1091)

### 🔨 Other Changes

- fix: Enhance GPU metrics collection and error handling in vGPU monitor by ([@haitwang-cloud](https://github.com/haitwang-cloud)) in [#827](https://github.com/Project-HAMi/HAMi/pull/827)
- refactor: update service configurations for device plugin and scheduler by ([@haitwang-cloud](https://github.com/haitwang-cloud)) in [#799](https://github.com/Project-HAMi/HAMi/pull/799)
- add ut for scheduler/score by ([@shijinye](https://github.com/shijinye)) in [#853](https://github.com/Project-HAMi/HAMi/pull/853)
- add ut for device/metax by ([@shijinye](https://github.com/shijinye)) in [#850](https://github.com/Project-HAMi/HAMi/pull/850)
- Remove duplicate log fields by ([@learner0810](https://github.com/learner0810)) in [#860](https://github.com/Project-HAMi/HAMi/pull/860)
- [docs] Fix default nvidia.resourceCoreName value in config.md by ([@chinaran](https://github.com/chinaran)) in [#842](https://github.com/Project-HAMi/HAMi/pull/842)
- Update libvgpu.so by ([@archlitchi](https://github.com/archlitchi)) in [#876](https://github.com/Project-HAMi/HAMi/pull/876)
- update example.png by ([@rockpanda](https://github.com/rockpanda)) in [#874](https://github.com/Project-HAMi/HAMi/pull/874)
- support ascend 910B2 by ([@ouyangluwei163](https://github.com/ouyangluwei163)) in [#885](https://github.com/Project-HAMi/HAMi/pull/885)
- fix docs typos by ([@JinVei](https://github.com/JinVei)) in [#869](https://github.com/Project-HAMi/HAMi/pull/869)
- Accelerate node score calculations using multiple goroutines by ([@learner0810](https://github.com/learner0810)) in [#824](https://github.com/Project-HAMi/HAMi/pull/824)
- Support Metax SGPU to sharing GPU by ([@Kyrie336](https://github.com/Kyrie336)) in [#895](https://github.com/Project-HAMi/HAMi/pull/895)
- docs: fix broken commmunity links by ([@agilgur5](https://github.com/agilgur5)) in [#907](https://github.com/Project-HAMi/HAMi/pull/907)
- add config gpu core isolation policy for webhook by ([@lengrongfu](https://github.com/lengrongfu)) in [#901](https://github.com/Project-HAMi/HAMi/pull/901)
- feat: support scheduler replicas > 1 by ([@Azusa-Yuan](https://github.com/Azusa-Yuan)) in [#898](https://github.com/Project-HAMi/HAMi/pull/898)
- docs: add syntax highlighting to various code blocks by ([@agilgur5](https://github.com/agilgur5)) in [#906](https://github.com/Project-HAMi/HAMi/pull/906)
- Fix UT not be properly executed during CI phase by ([@archlitchi](https://github.com/archlitchi)) in [#911](https://github.com/Project-HAMi/HAMi/pull/911)
- typo: fix typos in log and comment by ([@popsiclexu](https://github.com/popsiclexu)) in [#917](https://github.com/Project-HAMi/HAMi/pull/917)
- feat: Add kube-qps and kube-burst parameters. by ([@chaunceyjiang](https://github.com/chaunceyjiang)) in [#769](https://github.com/Project-HAMi/HAMi/pull/769)
- docs: Update MAINTAINERS file with current contributor information by ([@Nimbus318](https://github.com/Nimbus318)) in [#918](https://github.com/Project-HAMi/HAMi/pull/918)
- Nominate chaunceyjiang to reviewer by ([@chaunceyjiang](https://github.com/chaunceyjiang)) in [#926](https://github.com/Project-HAMi/HAMi/pull/926)
- build: update dependencies and remove unused cdiapi by ([@yxxhero](https://github.com/yxxhero)) in [#903](https://github.com/Project-HAMi/HAMi/pull/903)
- add lengrongfu to reviewers by ([@lengrongfu](https://github.com/lengrongfu)) in [#937](https://github.com/Project-HAMi/HAMi/pull/937)
- chore: add namespace override for multi-namespace deployments by ([@chinaran](https://github.com/chinaran)) in [#924](https://github.com/Project-HAMi/HAMi/pull/924)
- fix: hygon dcu concurrent creation conflict by ([@joy717](https://github.com/joy717)) in [#921](https://github.com/Project-HAMi/HAMi/pull/921)
- Fix the wrong describe of device registry in protocol.md by ([@hurricane1988](https://github.com/hurricane1988)) in [#910](https://github.com/Project-HAMi/HAMi/pull/910)
- chore: helm chart support scheduler webhook cert-manager by ([@chinaran](https://github.com/chinaran)) in [#951](https://github.com/Project-HAMi/HAMi/pull/951)
- refactor(scheduler): replace init methods with constructor functions by ([@yxxhero](https://github.com/yxxhero)) in [#905](https://github.com/Project-HAMi/HAMi/pull/905)
- add Dependencies policy and Security policy by ([@yangshiqi](https://github.com/yangshiqi)) in [#934](https://github.com/Project-HAMi/HAMi/pull/934)
- scheduler: fix blocked the nodeNotify channel when node changes by ([@Iceber](https://github.com/Iceber)) in [#964](https://github.com/Project-HAMi/HAMi/pull/964)
- docs: Update Ascend910 support documentation by ([@zhaikangqi331](https://github.com/zhaikangqi331)) in [#988](https://github.com/Project-HAMi/HAMi/pull/988)
- update iluvatar's docs by ([@yangshiqi](https://github.com/yangshiqi)) in [#995](https://github.com/Project-HAMi/HAMi/pull/995)
- refactor: replace interface{} with any in various files by ([@yxxhero](https://github.com/yxxhero)) in [#1000](https://github.com/Project-HAMi/HAMi/pull/1000)
- scheduler: fix duplicate handling of the node label selector by ([@Iceber](https://github.com/Iceber)) in [#965](https://github.com/Project-HAMi/HAMi/pull/965)
- refactor(.github/workflows/ci.yaml): Update golangci-lint to v2.0 and modify .golangci.yaml by ([@yxxhero](https://github.com/yxxhero)) in [#1002](https://github.com/Project-HAMi/HAMi/pull/1002)
- update hami arch by ([@wawa0210](https://github.com/wawa0210)) in [#1007](https://github.com/Project-HAMi/HAMi/pull/1007)
- Update README.md by ([@yowenter](https://github.com/yowenter)) in [#1005](https://github.com/Project-HAMi/HAMi/pull/1005)
- refactor: simplify code by using modern constructs by ([@Shouren](https://github.com/Shouren)) in [#978](https://github.com/Project-HAMi/HAMi/pull/978)
- scheduler: fix removing node devices from node manager by ([@Iceber](https://github.com/Iceber)) in [#966](https://github.com/Project-HAMi/HAMi/pull/966)
- feat: Add support for profiling via net/http/pprof package by ([@Shouren](https://github.com/Shouren)) in [#963](https://github.com/Project-HAMi/HAMi/pull/963)
- Support Enflame gcushare for enflame devices by ([@archlitchi](https://github.com/archlitchi)) in [#1013](https://github.com/Project-HAMi/HAMi/pull/1013)
- docs: Remove ACTIVE_OOM_KILLER environment variable description by ([@chinaran](https://github.com/chinaran)) in [#1015](https://github.com/Project-HAMi/HAMi/pull/1015)
- refactor(vGPUmonitor): change Run to RunE and return errors by ([@yxxhero](https://github.com/yxxhero)) in [#999](https://github.com/Project-HAMi/HAMi/pull/999)
- refactored the filter logs and event messages to enhance their clarity, by ([@Wangmin362](https://github.com/Wangmin362)) in [#1023](https://github.com/Project-HAMi/HAMi/pull/1023)
- feat: Support for using RuntimeClass with nvidia devices by ([@chinaran](https://github.com/chinaran)) in [#1021](https://github.com/Project-HAMi/HAMi/pull/1021)
- fix wrong log and container request device count error by ([@Wangmin362](https://github.com/Wangmin362)) in [#1020](https://github.com/Project-HAMi/HAMi/pull/1020)
- feat: helm chart add checksum annotation for restarting hami component after ConfigMap modification by ([@chinaran](https://github.com/chinaran)) in [#1022](https://github.com/Project-HAMi/HAMi/pull/1022)
- fix vgpu-devices-allocated annotations are inconsistent #991 by ([@ouyangluwei163](https://github.com/ouyangluwei163)) in [#1012](https://github.com/Project-HAMi/HAMi/pull/1012)
- add Enflame GCU S60 into roadmap. by ([@winston-zhang-orz](https://github.com/winston-zhang-orz)) in [#1030](https://github.com/Project-HAMi/HAMi/pull/1030)
- add nvidia-smi command show cuda version info by ([@lengrongfu](https://github.com/lengrongfu)) in [#953](https://github.com/Project-HAMi/HAMi/pull/953)
- Separate options from client to make the responsibility more clear. by ([@yangshiqi](https://github.com/yangshiqi)) in [#938](https://github.com/Project-HAMi/HAMi/pull/938)
- Add nvidia gpu topoloy score registry to node by ([@lengrongfu](https://github.com/lengrongfu)) in [#1018](https://github.com/Project-HAMi/HAMi/pull/1018)
- fix(cicd): update ci.yaml to upload coverage to Codecov by ([@Shouren](https://github.com/Shouren)) in [#1056](https://github.com/Project-HAMi/HAMi/pull/1056)
- feat(Actions): Add an action to label pr automatically by ([@Shouren](https://github.com/Shouren)) in [#1053](https://github.com/Project-HAMi/HAMi/pull/1053)
- fix: Improve Metax GPU usability and fix related issues by ([@Kyrie336](https://github.com/Kyrie336)) in [#1063](https://github.com/Project-HAMi/HAMi/pull/1063)
- fix(chart): support GKE pre-release versions via kubeVersion '-0' by ([@Nimbus318](https://github.com/Nimbus318)) in [#1072](https://github.com/Project-HAMi/HAMi/pull/1072)
- fix: Dynamic GPU partitioning lacks single-GPU-level granularity. (#1… by ([@Goend](https://github.com/Goend)) in [#1061](https://github.com/Project-HAMi/HAMi/pull/1061)
- update maintainer information by ([@wawa0210](https://github.com/wawa0210)) in [#1079](https://github.com/Project-HAMi/HAMi/pull/1079)
- add LIBCUDA_LOG_LEVEL env to device-plugin by ([@lengrongfu](https://github.com/lengrongfu)) in [#1087](https://github.com/Project-HAMi/HAMi/pull/1087)
- fix: missing apiVersion in serviceMonitor dashboard docs by ([@ntheanh201](https://github.com/ntheanh201)) in [#1077](https://github.com/Project-HAMi/HAMi/pull/1077)
- test(pkg/util): Add some unit tests for pkg/util by ([@Shouren](https://github.com/Shouren)) in [#1067](https://github.com/Project-HAMi/HAMi/pull/1067)
- feat: vGPUmonitor support MigInfo metrics by ([@ouyangluwei163](https://github.com/ouyangluwei163)) in [#1048](https://github.com/Project-HAMi/HAMi/pull/1048)
- update hami-core version by ([@lengrongfu](https://github.com/lengrongfu)) in [#1082](https://github.com/Project-HAMi/HAMi/pull/1082)

#### Committers: 🆕 New Contributors

- rockpanda ([@rockpanda](https://github.com/rockpanda))
- ouyangluwei163 ([@ouyangluwei163](https://github.com/ouyangluwei163))
- JinVei ([@JinVei](https://github.com/JinVei))
- Shouren ([@Shouren](https://github.com/Shouren))
- Kyrie336 ([@Kyrie336](https://github.com/Kyrie336))
- agilgur5 ([@agilgur5](https://github.com/agilgur5))
- Azusa-Yuan ([@Azusa-Yuan](https://github.com/Azusa-Yuan))
- popsiclexu ([@popsiclexu](https://github.com/popsiclexu))
- hurricane1988 ([@hurricane1988](https://github.com/hurricane1988))
- Iceber ([@Iceber](https://github.com/Iceber))
- zhaikangqi331 ([@zhaikangqi331](https://github.com/zhaikangqi331))
- yowenter ([@yowenter](https://github.com/yowenter))
- Wangmin362 ([@Wangmin362](https://github.com/Wangmin362))
- winston-zhang-orz ([@winston-zhang-orz](https://github.com/winston-zhang-orz))
- Goend ([@Goend](https://github.com/Goend))
- ntheanh201 ([@ntheanh201](https://github.com/ntheanh201))

**Full Changelog**: <https://github.com/Project-HAMi/HAMi/compare/v2.5.3...v2.6.0>

## v2.5.3 (2025-08-05)

#### :rocket: Major features

- No major features in this release.

#### :bug: Major bug fixes

- Bug fixes related to issues #1181, #1055, #1219, #1230, #1191

#### :memo: What's Changed

### 🔨 Other Changes

- Release v2.5.1 - fix e2e workflow by ([@archlitchi](https://github.com/archlitchi)) in [#1037](https://github.com/Project-HAMi/HAMi/pull/1037)
- Release v2.5.2 by ([@archlitchi](https://github.com/archlitchi)) in [#1080](https://github.com/Project-HAMi/HAMi/pull/1080)

**Full Changelog**: <https://github.com/Project-HAMi/HAMi/compare/v2.5.2...v2.5.3>

## v2.5.2 (2025-05-26)

#### :rocket: Major features

- No major features in this release.

#### :bug: Major bug fixes

- Fix device usage metrics(31992) can't be accessed

#### :memo: What's Changed

### 🔨 Other Changes

- No other changes in this release.

**Full Changelog**: <https://github.com/Project-HAMi/HAMi/compare/v2.5.1...v2.5.2>

## v2.5.1 (2025-05-06)

#### :rocket: Major features

- No major features in this release.

#### :bug: Major bug fixes

- Fix: Update handling of version strings in Helm template and helpers.tpl by ([@HJJ256](https://github.com/HJJ256)) in [#845](https://github.com/Project-HAMi/HAMi/pull/845)
- fix: Set passDeviceSpecsEnabled to false by default in device plugin by ([@Nimbus318](https://github.com/Nimbus318)) in [#872](https://github.com/Project-HAMi/HAMi/pull/872)
- fix: scheduler ignore KUBECONFIG env even if this environment variable is set [@Shouren](https://github.com/Shouren) in [#681](https://github.com/Project-HAMi/HAMi/pull/681)
- fix: correct device filter initialization order by ([@Nimbus318](https://github.com/Nimbus318)) in [#857](https://github.com/Project-HAMi/HAMi/pull/857)
- fix parseNvidiaNumaInfo index out of range by ([@flpanbin](https://github.com/flpanbin)) in [#889](https://github.com/Project-HAMi/HAMi/pull/889)
- Fix cambricon pods not been recognized by HAMi scheduler by ([@archlitchi](https://github.com/archlitchi)) in [#947](https://github.com/Project-HAMi/HAMi/pull/947)
- fix ubuntu base image in Dockerfile.withlib by ([@flpanbin](https://github.com/flpanbin)) in [#944](https://github.com/Project-HAMi/HAMi/pull/944)
- fix: Add error handling for nvml.Init in NvidiaDevicePlugin by ([@yxxhero](https://github.com/yxxhero)) in [#982](https://github.com/Project-HAMi/HAMi/pull/982)
- Fix device memory count error on cuMallocAsync by ([@archlitchi](https://github.com/archlitchi)) in [#1029](https://github.com/Project-HAMi/HAMi/pull/1029)

#### :memo: What's Changed

### 🔨 Other Changes

- Release v2.5 by ([@archlitchi](https://github.com/archlitchi)) in [#1034](https://github.com/Project-HAMi/HAMi/pull/1034)
- Update tag to v2.5.1 by ([@archlitchi](https://github.com/archlitchi)) in [#1035](https://github.com/Project-HAMi/HAMi/pull/1035)
- Fix: Update handling of version strings in Helm template and helpers.tpl by ([@HJJ256](https://github.com/HJJ256)) in [#845](https://github.com/Project-HAMi/HAMi/pull/845)
- Update libvgpu.so by ([@archlitchi](https://github.com/archlitchi)) in [#876](https://github.com/Project-HAMi/HAMi/pull/876)
- fix: Set passDeviceSpecsEnabled to false by default in device plugin by ([@Nimbus318](https://github.com/Nimbus318)) in [#872](https://github.com/Project-HAMi/HAMi/pull/872)
- fix: scheduler ignore KUBECONFIG env even if this environment variable is set [@Shouren](https://github.com/Shouren) in [#681](https://github.com/Project-HAMi/HAMi/pull/681)
- fix: correct device filter initialization order by ([@Nimbus318](https://github.com/Nimbus318)) in [#857](https://github.com/Project-HAMi/HAMi/pull/857)
- fix parseNvidiaNumaInfo index out of range by ([@flpanbin](https://github.com/flpanbin)) in [#889](https://github.com/Project-HAMi/HAMi/pull/889)
- Fix cambricon pods not been recognized by HAMi scheduler by ([@archlitchi](https://github.com/archlitchi)) in [#947](https://github.com/Project-HAMi/HAMi/pull/947)
- fix ubuntu base image in Dockerfile.withlib by ([@flpanbin](https://github.com/flpanbin)) in [#944](https://github.com/Project-HAMi/HAMi/pull/944)
- fix: Add error handling for nvml.Init in NvidiaDevicePlugin by ([@yxxhero](https://github.com/yxxhero)) in [#982](https://github.com/Project-HAMi/HAMi/pull/982)
- Fix device memory count error on cuMallocAsync by ([@archlitchi](https://github.com/archlitchi)) in [#1029](https://github.com/Project-HAMi/HAMi/pull/1029)
- Bump golang.org/x/net from 0.26.0 to 0.33.0 by ([@dependabot](https://github.com/dependabot)) in [#839](https://github.com/Project-HAMi/HAMi/pull/839)

#### Committers: Contributors

- archlitchi ([@archlitchi](https://github.com/archlitchi))
- HJJ256 ([@HJJ256](https://github.com/HJJ256))
- Nimbus318 ([@Nimbus318](https://github.com/Nimbus318))
- Shouren ([@Shouren](https://github.com/Shouren))
- flpanbin ([@flpanbin](https://github.com/flpanbin))
- yxxhero ([@yxxhero](https://github.com/yxxhero))
- dependabot ([@dependabot](https://github.com/dependabot))

**Full Changelog**: <https://github.com/Project-HAMi/HAMi/compare/v2.5.0...v2.5.1>

## v2.5.0 (2025-02-06)

#### :rocket: Major features

- Support dynamic mig feature, please refer to this [document](https://github.com/Project-HAMi/HAMi/blob/master/docs/dynamic-mig-support.md)
- Reinstall Hami will NOT crash GPU tasks
- Put all configurations into a configMap, you can customize hami installation by modify its content: see [details](https://github.com/Project-HAMi/HAMi/blob/master/docs/config.md)

#### :bug: Major bug fixes

- Fix an issue where hami-core will stuck on tasks using 'cuMallocAsync'
- Fix hami-core stuck on high glib images, like 'tf-serving:latest'

#### :memo: What's Changed

##### ⬆️ Dependencies

- Bump aquasecurity/trivy-action from 0.28.0 to 0.29.0 by ([@dependabot](https://github.com/dependabot)) in [#631](https://github.com/Project-HAMi/HAMi/pull/631)
- Bump nvidia/cuda from 12.4.1-base-ubuntu22.04 to 12.6.3-base-ubuntu22.04 in /docker by ([@dependabot](https://github.com/dependabot)) in [#676](https://github.com/Project-HAMi/HAMi/pull/676)
- Bump actions/upload-artifact from 4.4.3 to 4.5.0 by ([@dependabot](https://github.com/dependabot)) in [#717](https://github.com/Project-HAMi/HAMi/pull/717)
- Bump docker/build-push-action from 6.9.0 to 6.10.0 by ([@dependabot](https://github.com/dependabot)) in [#644](https://github.com/Project-HAMi/HAMi/pull/644)
- Bump docker/build-push-action from 6.10.0 to 6.11.0 by ([@dependabot](https://github.com/dependabot)) in [#792](https://github.com/Project-HAMi/HAMi/pull/792)

##### 🔨 Other Changes

- Fix Kubernetes version string handling by stripping metadata by ([@Nimbus318](https://github.com/Nimbus318)) in [#623](https://github.com/Project-HAMi/HAMi/pull/623)
- Update vGPUmonitor to add dynamic adjustment on core and memory limit by ([@archlitchi](https://github.com/archlitchi)) in [#624](https://github.com/Project-HAMi/HAMi/pull/624)
- feat: support device plugin daemonset update strategy by ([@devenami](https://github.com/devenami)) in [#628](https://github.com/Project-HAMi/HAMi/pull/628)
- add ut about schedule policy by ([@yt-huang](https://github.com/yt-huang)) in [#638](https://github.com/Project-HAMi/HAMi/pull/638)
- Fix: Refactor the license based on the approaches used in OpenSearch and ElasticSearch. by ([@haitwang-cloud](https://github.com/haitwang-cloud)) in [#626](https://github.com/Project-HAMi/HAMi/pull/626)
- add ut for the scheduler by ([@shijinye](https://github.com/shijinye)) in [#645](https://github.com/Project-HAMi/HAMi/pull/645)
- docs(issue-tmpl): add FAQ link to issue templates by ([@Nimbus318](https://github.com/Nimbus318)) in [#647](https://github.com/Project-HAMi/HAMi/pull/647)
- fix: filter device registry to node by ([@lengrongfu](https://github.com/lengrongfu)) in [#639](https://github.com/Project-HAMi/HAMi/pull/639)
- Add self-hosted runner by ([@archlitchi](https://github.com/archlitchi)) in [#659](https://github.com/Project-HAMi/HAMi/pull/659)
- fix-example-yaml by ([@WQL782795](https://github.com/WQL782795)) in [#667](https://github.com/Project-HAMi/HAMi/pull/667)
- update docs by ([@yangshiqi](https://github.com/yangshiqi)) in [#668](https://github.com/Project-HAMi/HAMi/pull/668)
- add ut for ascend by ([@shijinye](https://github.com/shijinye)) in [#664](https://github.com/Project-HAMi/HAMi/pull/664)
- optimization map init in test by ([@lengrongfu](https://github.com/lengrongfu)) in [#678](https://github.com/Project-HAMi/HAMi/pull/678)
- Optimize monitor by ([@for800000](https://github.com/for800000)) in [#683](https://github.com/Project-HAMi/HAMi/pull/683)
- fix code lint failed by ([@lengrongfu](https://github.com/lengrongfu)) in [#685](https://github.com/Project-HAMi/HAMi/pull/685)
- fix(helm): Add NODE_NAME env var to the vgpu-monitor container from spec.nodeName by ([@Nimbus318](https://github.com/Nimbus318)) in [#687](https://github.com/Project-HAMi/HAMi/pull/687)
- fix vGPUmonitor deviceidx is always 0 by ([@lengrongfu](https://github.com/lengrongfu)) in [#684](https://github.com/Project-HAMi/HAMi/pull/684)
- add ut for pkg/scheduler/event.go by ([@Penguin-zlh](https://github.com/Penguin-zlh)) in [#688](https://github.com/Project-HAMi/HAMi/pull/688)
- add ut for nodes by ([@shijinye](https://github.com/shijinye)) in [#695](https://github.com/Project-HAMi/HAMi/pull/695)
- add license for pkg/scheduler/event_test.go by ([@Penguin-zlh](https://github.com/Penguin-zlh)) in [#706](https://github.com/Project-HAMi/HAMi/pull/706)
- fix: exception happen when creating multiple ascend-gpu pods concurrently by ([@lijm87](https://github.com/lijm87)) in [#575](https://github.com/Project-HAMi/HAMi/pull/575)
- add ut for device/nvidia by ([@shijinye](https://github.com/shijinye)) in [#657](https://github.com/Project-HAMi/HAMi/pull/657)
- add ut for pkg/monitor/nvidia/v0/spec.go by ([@yt-huang](https://github.com/yt-huang)) in [#670](https://github.com/Project-HAMi/HAMi/pull/670)
- Enable Dynamic-mig feature for HAMi by ([@archlitchi](https://github.com/archlitchi)) in [#708](https://github.com/Project-HAMi/HAMi/pull/708)
- Fix chart can not be deployed properly by ([@archlitchi](https://github.com/archlitchi)) in [#711](https://github.com/Project-HAMi/HAMi/pull/711)
- Fix NodeLock issue by ([@archlitchi](https://github.com/archlitchi)) in [#714](https://github.com/Project-HAMi/HAMi/pull/714)
- fix example yaml by ([@lixd](https://github.com/lixd)) in [#709](https://github.com/Project-HAMi/HAMi/pull/709)
- add ut for device/cambricon by ([@shijinye](https://github.com/shijinye)) in [#712](https://github.com/Project-HAMi/HAMi/pull/712)
- Update dynamic mig documents and examples by ([@archlitchi](https://github.com/archlitchi)) in [#718](https://github.com/Project-HAMi/HAMi/pull/718)
- random time may be zero by ([@shijinye](https://github.com/shijinye)) in [#697](https://github.com/Project-HAMi/HAMi/pull/697)
- fix grafana dashboard and clarify dashboard usage more clearly. by ([@jiangsanyin](https://github.com/jiangsanyin)) in [#543](https://github.com/Project-HAMi/HAMi/pull/543)
- doc(README): add examples for GPU sharing and update-examples by ([@xiaoyao](https://github.com/xiaoyao)) in [#665](https://github.com/Project-HAMi/HAMi/pull/665)
- add ut for github.com/Project-HAMi/HAMi/pkg/scheduler/pod.go by ([@yt-huang](https://github.com/yt-huang)) in [#673](https://github.com/Project-HAMi/HAMi/pull/673)
- Add design document to 'dynamic-mig' feature by ([@archlitchi](https://github.com/archlitchi)) in [#725](https://github.com/Project-HAMi/HAMi/pull/725)
- fix(doc): fix a typo and resolve markdown warnings in the tasklist by ([@elrondwong](https://github.com/elrondwong)) in [#724](https://github.com/Project-HAMi/HAMi/pull/724)
- add ut for pkg/util/nodelock/nodelock.go by ([@learner0810](https://github.com/learner0810)) in [#719](https://github.com/Project-HAMi/HAMi/pull/719)
- test: add ut for pkg/version/version.go by ([@Penguin-zlh](https://github.com/Penguin-zlh)) in [#677](https://github.com/Project-HAMi/HAMi/pull/677)
- Update on mig mode by ([@archlitchi](https://github.com/archlitchi)) in [#726](https://github.com/Project-HAMi/HAMi/pull/726)
- Update documents for config & config_cn by ([@archlitchi](https://github.com/archlitchi)) in [#729](https://github.com/Project-HAMi/HAMi/pull/729)
- set PASS_DEVICE_SPECS ENV to device-plugin by ([@jingzhe6414](https://github.com/jingzhe6414)) in [#690](https://github.com/Project-HAMi/HAMi/pull/690)
- fix device-plugin-version by ([@learner0810](https://github.com/learner0810)) in [#743](https://github.com/Project-HAMi/HAMi/pull/743)
- feat: Return the nodes that failed to be scheduled back to the scheduler by ([@chaunceyjiang](https://github.com/chaunceyjiang)) in [#746](https://github.com/Project-HAMi/HAMi/pull/746)
- fix(log): fix missing log output in nvidiadeviceplugin server by ([@elrondwong](https://github.com/elrondwong)) in [#735](https://github.com/Project-HAMi/HAMi/pull/735)
- support configuration resources limits and requests by ([@flpanbin](https://github.com/flpanbin)) in [#739](https://github.com/Project-HAMi/HAMi/pull/739)
- feat(test): add TestMarshalNodeDevices scenarios by ([@elrondwong](https://github.com/elrondwong)) in [#747](https://github.com/Project-HAMi/HAMi/pull/747)
- print flags for device-plugin and scheduler by ([@flpanbin](https://github.com/flpanbin)) in [#756](https://github.com/Project-HAMi/HAMi/pull/756)
- Fix typos, add more contributors and maintainers. by ([@yangshiqi](https://github.com/yangshiqi)) in [#765](https://github.com/Project-HAMi/HAMi/pull/765)
- Add a mind map(Chinese and English) to help understand this project by ([@oceanweave](https://github.com/oceanweave)) in [#764](https://github.com/Project-HAMi/HAMi/pull/764)
- [Docs] update config pages by ([@windsonsea](https://github.com/windsonsea)) in [#760](https://github.com/Project-HAMi/HAMi/pull/760)
- add ut for device-map by ([@KubeKyrie](https://github.com/KubeKyrie)) in [#762](https://github.com/Project-HAMi/HAMi/pull/762)
- refactor(ci): use go.mod file for Go version in workflows by ([@yxxhero](https://github.com/yxxhero)) in [#766](https://github.com/Project-HAMi/HAMi/pull/766)
- support set log level for device plugin by ([@flpanbin](https://github.com/flpanbin)) in [#771](https://github.com/Project-HAMi/HAMi/pull/771)
- feat: Restart/Upgrade device-plugin will not affect services. by ([@chaunceyjiang](https://github.com/chaunceyjiang)) in [#767](https://github.com/Project-HAMi/HAMi/pull/767)
- add ut nvml devices by ([@KubeKyrie](https://github.com/KubeKyrie)) in [#773](https://github.com/Project-HAMi/HAMi/pull/773)
- add ut for device-map by ([@KubeKyrie](https://github.com/KubeKyrie)) in [#772](https://github.com/Project-HAMi/HAMi/pull/772)
- Optimize the time format layout by ([@learner0810](https://github.com/learner0810)) in [#741](https://github.com/Project-HAMi/HAMi/pull/741)
- fix: nvidia-device-plugin no version info by ([@chaunceyjiang](https://github.com/chaunceyjiang)) in [#779](https://github.com/Project-HAMi/HAMi/pull/779)
- HAMi supports e2e by ([@Rei1010](https://github.com/Rei1010)) in [#775](https://github.com/Project-HAMi/HAMi/pull/775)
- Proposal: enable E2E test by ([@Rei1010](https://github.com/Rei1010)) in [#633](https://github.com/Project-HAMi/HAMi/pull/633)
- add ut for device/iluvatar by ([@shijinye](https://github.com/shijinye)) in [#795](https://github.com/Project-HAMi/HAMi/pull/795)
- add ut for device/hygon by ([@shijinye](https://github.com/shijinye)) in [#787](https://github.com/Project-HAMi/HAMi/pull/787)
- add ut for pkg/monitor/nvidia/v1 by ([@shijinye](https://github.com/shijinye)) in [#780](https://github.com/Project-HAMi/HAMi/pull/780)
- refactor(logging): enhance log messages for device resource counting by ([@haitwang-cloud](https://github.com/haitwang-cloud)) in [#778](https://github.com/Project-HAMi/HAMi/pull/778)
- Enrich pod health check by ([@Rei1010](https://github.com/Rei1010)) in [#801](https://github.com/Project-HAMi/HAMi/pull/801)
- docs: fix broken link by ([@lixd](https://github.com/lixd)) in [#802](https://github.com/Project-HAMi/HAMi/pull/802)
- Optimize the E2E execution logic by ([@Rei1010](https://github.com/Rei1010)) in [#803](https://github.com/Project-HAMi/HAMi/pull/803)
- optimize MetricsBindAddress to MetricsBindPort by ([@phoenixwu0229](https://github.com/phoenixwu0229)) in [#796](https://github.com/Project-HAMi/HAMi/pull/796)
- fix: handle the node nil issue & E2E test failure by ([@haitwang-cloud](https://github.com/haitwang-cloud)) in [#804](https://github.com/Project-HAMi/HAMi/pull/804)
- add ut for device/mthreads by ([@shijinye](https://github.com/shijinye)) in [#808](https://github.com/Project-HAMi/HAMi/pull/808)
- fix: Resolve formatting issue in ConfigMap causing display anomalies by ([@lixd](https://github.com/lixd)) in [#814](https://github.com/Project-HAMi/HAMi/pull/814)
- [docs] Update ascend910b-support.md by ([@windsonsea](https://github.com/windsonsea)) in [#816](https://github.com/Project-HAMi/HAMi/pull/816)
- Refine metrics logs by ([@haitwang-cloud](https://github.com/haitwang-cloud)) in [#817](https://github.com/Project-HAMi/HAMi/pull/817)
- Update mig-related logics and refine logs by ([@archlitchi](https://github.com/archlitchi)) in [#833](https://github.com/Project-HAMi/HAMi/pull/833)
- Add 910B4 config to device-configmap for ascend by ([@lijm87](https://github.com/lijm87)) in [#828](https://github.com/Project-HAMi/HAMi/pull/828)
- [docs] fix: glibc version requirement in README by ([@chinaran](https://github.com/chinaran)) in [#826](https://github.com/Project-HAMi/HAMi/pull/826)
- Update HAMi-core for v2.5.0 by ([@archlitchi](https://github.com/archlitchi)) in [#834](https://github.com/Project-HAMi/HAMi/pull/834)
- FIx multi-process device memory count issue by ([@archlitchi](https://github.com/archlitchi)) in [#835](https://github.com/Project-HAMi/HAMi/pull/835)
- bump version to v2.5.0 by ([@wawa0210](https://github.com/wawa0210)) in [#836](https://github.com/Project-HAMi/HAMi/pull/836)
- Fix CI by ([@archlitchi](https://github.com/archlitchi)) in [#838](https://github.com/Project-HAMi/HAMi/pull/838)
- Fix CI release by ([@archlitchi](https://github.com/archlitchi)) in [#840](https://github.com/Project-HAMi/HAMi/pull/840)
- Fix release ci by ([@archlitchi](https://github.com/archlitchi)) in [#841](https://github.com/Project-HAMi/HAMi/pull/841)
- Fix Dockerfile to make CI pass by ([@archlitchi](https://github.com/archlitchi)) in [#846](https://github.com/Project-HAMi/HAMi/pull/846)
- Fix E2E failure with pod status check by ([@Rei1010](https://github.com/Rei1010)) in [#847](https://github.com/Project-HAMi/HAMi/pull/847)
- Fix scheduler crash if a 'mig' task running accidentally on a 'hami-core' GPU by ([@archlitchi](https://github.com/archlitchi)) in [#848](https://github.com/Project-HAMi/HAMi/pull/848)

#### Committers: 🆕 New Contributors

- yt-huang ([@yt-huang](https://github.com/yt-huang))
- shijinye ([@shijinye](https://github.com/shijinye))
- WQL782795 ([@WQL782795](https://github.com/WQL782795))
- yangshiqi ([@yangshiqi](https://github.com/yangshiqi))
- for800000 ([@for800000](https://github.com/for800000))
- Penguin-zlh ([@Penguin-zlh](https://github.com/Penguin-zlh))
- lixd ([@lixd](https://github.com/lixd))
- jiangsanyin ([@jiangsanyin](https://github.com/jiangsanyin))
- xiaoyao ([@xiaoyao](https://github.com/xiaoyao))
- elrondwong ([@elrondwong](https://github.com/elrondwong))
- learner0810 ([@learner0810](https://github.com/learner0810))
- jingzhe6414 ([@jingzhe6414](https://github.com/jingzhe6414))
- flpanbin ([@flpanbin](https://github.com/flpanbin))
- oceanweave ([@oceanweave](https://github.com/oceanweave))
- windsonsea ([@windsonsea](https://github.com/windsonsea))
- KubeKyrie ([@KubeKyrie](https://github.com/KubeKyrie))
- yxxhero ([@yxxhero](https://github.com/yxxhero))
- Rei1010 ([@Rei1010](https://github.com/Rei1010))
- phoenixwu0229 ([@phoenixwu0229](https://github.com/phoenixwu0229))
- chinaran ([@chinaran](https://github.com/chinaran))

**Full Changelog**: <https://github.com/Project-HAMi/HAMi/compare/v2.4.1...v2.5.0>
