---
title: HAMi 支持的设备
translated: true
---

HAMi 支持的设备如下表所示：

支持状态：

- **稳定（Stable）** — 已在最新发布版本中提供，并已验证可正常工作。
- **实验性（Experimental）** — 已在 HAMi 中实现，但尚未包含在正式发布版本中。
- **验证中（Under Validation）** — 支持仍在实现中，尚不可用。

<!-- prettier-ignore -->
| 设备类型   | 制造商                    | 支持型号                    | 状态         | 显存隔离 | 核心隔离 | 多卡支持 |
| ---------- | ------------------------- | --------------------------- | ------------ | -------- | -------- | -------- |
| GPU        | 英伟达（NVIDIA）          | 全系列                      | 稳定         | 是       | 是       | 是       |
| MLU        | 寒武纪（Cambricon）       | 370、590                    | 稳定         | 是       | 是       | 否       |
| DCU        | 海光（Hygon）             | 全系列                      | 稳定         | 是       | 是       | 否       |
| NPU        | 华为昇腾（Huawei Ascend） | 910B、910B3、910C、310P     | 稳定         | 是       | 是       | 否       |
| GPU        | 天数智芯（Iluvatar）      | 全部                        | 稳定         | 是       | 是       | 否       |
| GPU        | 摩尔线程（Mthreads）      | MTT S4000                   | 稳定         | 是       | 是       | 否       |
| GPU        | 沐曦（MetaX）             | MXC500                      | 稳定         | 是       | 是       | 否       |
| GCU        | 燧原科技（Enflame）       | S60                         | 稳定         | 是       | 是       | 否       |
| XPU        | 昆仑芯（Kunlunxin）       | P800                        | 稳定         | 是       | 是       | 否       |
| GPU        | 瀚博（Vastai）            | VA16                        | 稳定         | 是       | 是       | 否       |
| Neuron     | AWS Neuron                | Inf、Trn                    | 稳定         | 是       | 是       | 否       |
| GPU        | 壁仞（Biren）             | Biren166M                   | 实验性       | 是       | 是       | 否       |
| DPU        | 太初元碁（Teco）          | 检查中                      | 验证中       | 进行中   | 进行中   | 否       |
