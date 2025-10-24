# Changelog

## v2.5.1 (2025-05-06)

#### :rocket: Major features

- No major features in this release.

#### :bug: Major bug fixes:

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

**Full Changelog**: https://github.com/Project-HAMi/HAMi/compare/v2.5.0...v2.5.1

## v2.5.0 (2025-02-06)

#### :rocket: Major features

- Support dynamic mig feature, please refer to this [document](https://github.com/Project-HAMi/HAMi/blob/master/docs/dynamic-mig-support.md)
- Reinstall Hami will NOT crash GPU tasks
- Put all configurations into a configMap, you can customize hami installation by modify its content: see [details](https://github.com/Project-HAMi/HAMi/blob/master/docs/config.md)

#### :bug: Major bug fixes:

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

**Full Changelog**: https://github.com/Project-HAMi/HAMi/compare/v2.4.1...v2.5.0
