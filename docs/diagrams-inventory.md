---
title: Diagram Inventory
---

This page catalogs every diagram across the repository: `docs/`, `blog/`, `i18n/`, `versioned_docs/`, and `static/`. It serves as the input for the diagram redraw work tracked in [#421](https://github.com/Project-HAMi/website/issues/421).

**Scope note:** Blog event-photo images (KubeCon booth shots, keynote photos, speaker photos) are excluded - they are photographs, not technical diagrams. Only images that communicate architecture, flow, or system behavior are listed here.

---

## Legend

| Field | Values |
| --- | --- |
| Format | SVG, PNG, JPG, JPEG, PlantUML |
| Status | `current` - accurate and up to date; `outdated` - terminology or structure stale; `unknown` - content not verifiable without visual inspection; `screenshot` - UI capture, not a diagram |
| Source file | Path to editable source (`.plantuml`, `.drawio`, `.graffle`), or `none` |
| Control/data plane | `separated` - clearly distinct; `partial` - mixed; `n/a` - not applicable to this diagram type |

---

## 1. Core Concepts - Architecture and Flow Diagrams

| Image path | Format | Referenced in | Source file | Status | Control/data plane |
| --- | --- | --- | --- | --- | --- |
| `static/img/docs/common/core-concepts/architect.jpg` | JPG | `docs/core-concepts/architecture.md`, `i18n/zh/.../core-concepts/architecture.md`, all versioned versions | none | outdated (JPG, not SVG; no source) | not separated |
| `static/img/docs/common/core-concepts/device-plugin-flow-en.svg` | SVG | `docs/core-concepts/gpu-virtualization.md` | `docs/core-concepts/device-plugin-flow.plantuml` | current | n/a (sequence diagram) |
| `static/img/docs/common/core-concepts/device-plugin-flow.svg` | SVG | `i18n/zh/.../core-concepts/gpu-virtualization.md` | `i18n/zh/.../core-concepts/device-plugin-flow.plantuml` | current | n/a (sequence diagram) |
| `static/img/docs/common/core-concepts/hami-architecture-en.svg` | SVG | `docs/core-concepts/gpu-virtualization.md` | `docs/core-concepts/hami-architecture.plantuml` | current | partial |
| `static/img/docs/common/core-concepts/hami-architecture.svg` | SVG | `i18n/zh/.../core-concepts/gpu-virtualization.md` | `i18n/zh/.../core-concepts/hami-architecture.plantuml` | current | partial |

**Notes:**

- `architect.jpg` is the primary architecture overview diagram used on `docs/core-concepts/architecture.md`. It is in JPG format with no editable source. It must be redrawn as SVG with a source file.
- The two PlantUML-based SVGs (`device-plugin-flow-*.svg`, `hami-architecture-*.svg`) have source files and are in good shape. They should be checked for control/data plane separation when redrawn.

---

## 2. Developer Docs - HAMi Core Design

| Image path | Format | Referenced in | Source file | Status | Control/data plane |
| --- | --- | --- | --- | --- | --- |
| `static/img/docs/common/developers/hami-core-design/hami-arch.png` | PNG | `docs/developers/hami-core-design.md`, zh equivalent | none | unknown | not separated |
| `static/img/docs/common/developers/hami-core-design/hami-core-position.png` | PNG | `docs/developers/hami-core-design.md`, zh equivalent | none | unknown | not separated |
| `static/img/docs/common/developers/hami-core-design/sample-nvidia-smi.png` | PNG | `docs/developers/hami-core-design.md`, zh equivalent | none | screenshot | n/a |

**Notes:**

- `hami-arch.png` and `hami-core-position.png` have no source files. Both must be recreated as SVG with editable source.
- `sample-nvidia-smi.png` is a terminal screenshot illustrating virtualized GPU memory output. It is not an architectural diagram and does not require redrawing, but may need refreshing if command output changes.

---

## 3. Developer Docs - Scheduling

| Image path | Format | Referenced in | Source file | Status | Control/data plane |
| --- | --- | --- | --- | --- | --- |
| `static/img/docs/common/developers/scheduling/scheduler-policy-story.png` | PNG | `docs/developers/scheduling.md`, zh equivalent | none | unknown | not separated |
| `static/img/docs/common/developers/scheduling/node-scheduler-policy-demo.png` | PNG | `docs/developers/scheduling.md`, zh equivalent | none | unknown | not separated |
| `static/img/docs/common/developers/scheduling/gpu-scheduler-policy-demo.png` | PNG | `docs/developers/scheduling.md`, zh equivalent | none | unknown | not separated |

**Notes:**

- All three scheduling diagrams are PNG with no source files. They must be redrawn as SVG.
- These diagrams describe the Binpack and Spread scheduling policy logic. They are visible in the latest `docs/developers/scheduling.md` and its zh counterpart.

---

## 4. Developer Docs - Protocol

| Image path | Format | Referenced in | Source file | Status | Control/data plane |
| --- | --- | --- | --- | --- | --- |
| `static/img/docs/common/developers/protocol/protocol-register.png` | PNG | `docs/developers/protocol.md` (EN only) | none | unknown | not separated |
| `static/img/docs/common/developers/protocol/device-registration.png` | PNG | `i18n/zh/.../developers/protocol.md` (ZH only) | none | unknown | not separated |
| `static/img/docs/common/developers/protocol/task-dispatch.png` | PNG | `i18n/zh/.../developers/protocol.md` (ZH only) | none | unknown | not separated |

**Inconsistency found:** The EN `docs/developers/protocol.md` references only `protocol-register.png`. The ZH version references `device-registration.png` and `task-dispatch.png` - two different files that do not appear in the EN doc. The EN doc appears to be missing the task dispatch diagram. This inconsistency must be resolved before redrawing.

---

## 5. Developer Docs - WebUI Architecture

| Image path | Format | Referenced in | Source file | Status | Control/data plane |
| --- | --- | --- | --- | --- | --- |
| `static/img/docs/common/developers/hami-webui-architecture-diagram.svg` | SVG | `docs/developers/hami-webui-development-guide.md`, zh equivalent, `blog/hami-webui-v1-1-0-release/index.md` | none | current | not separated |

**Notes:**

- This diagram is already SVG, which is correct. However, it has no editable source file (no `.drawio` or `.graffle`). A source file must be added to `static/img/src/` when it is next updated.

---

## 6. Developer Docs - Dynamic MIG

| Image path | Format | Referenced in | Source file | Status | Control/data plane |
| --- | --- | --- | --- | --- | --- |
| `static/img/docs/en/dynamic-mig/hami-dynamic-mig-structure.png` | PNG | `docs/developers/dynamic-mig.md`, zh equivalent, all versioned versions | none | unknown | not separated |
| `static/img/docs/en/dynamic-mig/hami-dynamic-mig-procedure.png` | PNG | `docs/developers/dynamic-mig.md`, zh equivalent, all versioned versions | none | unknown | not separated |

**Notes:**

- Both images are PNG, no source files. Referenced from both EN and ZH current docs and all versioned docs.
- These were added recently (master update includes them as new files). Their accuracy relative to the current codebase is unknown.

---

## 7. Developer Docs - Kunlunxin Topology

| Image path | Format | Referenced in | Source file | Status | Control/data plane |
| --- | --- | --- | --- | --- | --- |
| `static/img/docs/common/developers/kunlunxin-topology/kunlunxin-filter.png` | PNG | `docs/developers/kunlunxin-topology.md`, zh equivalent | none | unknown | not separated |

---

## 8. Key Features Diagrams

| Image path | Format | Referenced in | Source file | Status | Control/data plane |
| --- | --- | --- | --- | --- | --- |
| `static/img/docs/common/key-features/example.png` | PNG | `docs/key-features/device-sharing.md`, zh equivalent | none | unknown | n/a |
| `static/img/docs/common/key-features/hard-limit.jpg` | JPG | `docs/key-features/device-resource-isolation.md`, zh equivalent | none | unknown | n/a |

**Versioned-only key features diagrams (not referenced in current `docs/`):**

| Image path | Format | Referenced in | Source file | Status |
| --- | --- | --- | --- | --- |
| `static/img/docs/common/key-features/features/overall-relationship.png` | PNG | `versioned_docs/version-v2.4.1`, `version-v2.5.0` only | none | orphaned in current docs |
| `static/img/docs/common/key-features/features/overall-scheduling.png` | PNG | versioned only | none | orphaned in current docs |
| `static/img/docs/common/key-features/features/overall-rescheduling.png` | PNG | versioned only | none | orphaned in current docs |
| `static/img/docs/common/key-features/features/cluster-failover.png` | PNG | versioned only | none | orphaned in current docs |
| `static/img/docs/common/key-features/features/unified-operation.png` | PNG | versioned only | none | orphaned in current docs |
| `static/img/docs/common/key-features/features/unified-search.png` | PNG | versioned only | none | orphaned in current docs |
| `static/img/docs/common/key-features/features/unified-access.png` | PNG | versioned only | none | orphaned in current docs |
| `static/img/docs/common/key-features/features/unified-resourcequota.png` | PNG | versioned only | none | orphaned in current docs |
| `static/img/docs/common/key-features/features/service-governance.png` | PNG | versioned only | none | orphaned in current docs |

**Notes:**

- The 9 `features/` images are referenced only from `versioned_docs/version-v2.4.1/key-features/features.md` and `version-v2.5.0/key-features/features.md`. They are not present in any current `docs/` page. They must be kept for versioned doc rendering but are not candidates for redrawing in the current doc set.
- `hard-limit.jpg` is JPG. Should be converted to PNG or SVG.

---

## 9. Mindmaps

| Image path | Format | Referenced in | Source file | Status | Control/data plane |
| --- | --- | --- | --- | --- | --- |
| `static/img/docs/en/mindmap/hami-vgpu-mind-map-en.png` | PNG | `docs/developers/mindmap.md`, all versioned versions | none | unknown | n/a |
| `static/img/docs/zh/mindmap/hami-vgpu-mind-map-zh.png` | PNG | `i18n/zh/.../developers/mindmap.md`, all versioned versions | none | unknown | n/a |

**Notes:**

- Both mindmaps carry the title "HAMi VGPU mind map". The "VGPU" scope is narrower than HAMi's current support surface, which now covers Cambricon MLU, Hygon DCU, Kunlunxin XPU, Metax GPU, Iluvatar Corex, and Ascend NPU in addition to NVIDIA VGPU.
- Neither mindmap has an editable source file. Updating them requires a full redraw.
- Full content accuracy cannot be assessed from this inventory without visual inspection of the PNG files. A maintainer familiar with current HAMi architecture must review before any decision to update or remove.
- Tracked for redesign in issue [#414](https://github.com/Project-HAMi/website/issues/414).

---

## 10. Device Userguide Diagrams

| Image path | Format | Referenced in | Source file | Status | Control/data plane |
| --- | --- | --- | --- | --- | --- |
| `static/img/docs/common/userguide/metax-device/metax-gpu/metax-topology.jpg` | JPG | `docs/userguide/metax-device/metax-gpu/enable-metax-gpu-schedule.md`, zh equivalent | none | unknown | not separated |
| `static/img/docs/common/userguide/metax-device/metax-gpu/metax-spread.jpg` | JPG | `docs/userguide/metax-device/metax-gpu/enable-metax-gpu-schedule.md`, zh equivalent | none | unknown | not separated |
| `static/img/docs/common/userguide/metax-device/metax-gpu/metax-binpack.jpg` | JPG | `docs/userguide/metax-device/metax-gpu/enable-metax-gpu-schedule.md`, zh equivalent | none | unknown | not separated |
| `static/img/docs/common/userguide/kunlunxin-device/kunlunxin-topology.jpg` | JPG | `docs/userguide/kunlunxin-device/enable-kunlunxin-schedule.md`, `docs/developers/kunlunxin-topology.md`, zh equivalents | none | unknown | not separated |

**Notes:**

- All device userguide diagrams are JPG. They must be redrawn as SVG per WS4 requirements.
- Metax GPU diagrams cover PCIe topology, Spread scheduling policy, and Binpack scheduling policy.
- Kunlunxin topology diagram shows NUMA node connections on the P800 server.

---

## 11. WebUI Screenshots

These are UI captures, not architecture or flow diagrams. They do not require redrawing but may need refreshing when the WebUI is updated.

| Image path | Format | Referenced in |
| --- | --- | --- |
| `static/img/docs/en/userguide/webui-overview.png` | PNG | `docs/userguide/hami-webui-user-guide.md`, `blog/hami-webui-v1-1-0-release/index.md` |
| `static/img/docs/en/userguide/webui-node-list.png` | PNG | same |
| `static/img/docs/en/userguide/webui-node-detail.png` | PNG | same |
| `static/img/docs/en/userguide/webui-accelerator-list.png` | PNG | same |
| `static/img/docs/en/userguide/webui-accelerator-detail.png` | PNG | same |
| `static/img/docs/en/userguide/webui-workload-list.png` | PNG | same |
| `static/img/docs/en/userguide/webui-workload-detail.png` | PNG | same |
| `static/img/docs/zh/userguide/webui-*.png` (7 files) | PNG | zh userguide |

---

## 12. Contributor Guide Diagram

| Image path | Format | Referenced in | Source file | Status | Control/data plane |
| --- | --- | --- | --- | --- | --- |
| `static/img/docs/common/contributor/github-workflow/git-workflow.png` | PNG | `docs/contributor/github-workflow.md`, zh equivalent | none | unknown | n/a |

---

## 13. Homepage Component Diagrams

| Image path | Format | Referenced in | Source file | Status | Control/data plane |
| --- | --- | --- | --- | --- | --- |
| `static/img/gpu-sharing-diagram.svg` | SVG | `src/components/BeforeAfterComparison.js` | none | unknown | not separated |
| `static/img/gpu-sharing-diagram-zh.svg` | SVG | `src/components/BeforeAfterComparison.js` | none | unknown | not separated |

**Notes:**

- These SVGs are rendered in the homepage comparison component. They are already in SVG format. Source files (`.drawio` or similar) are missing.

---

## 14. Blog - Technical Diagram

| Image path | Format | Referenced in | Source file | Status |
| --- | --- | --- | --- | --- |
| `static/img/blog/flowchart.jpeg` | JPEG | `blog/2024-12-31-post/index.md` | none | unknown |

**Notes:**

- `blog/2024-12-31-post/index.md` also references an external image hosted on GitHub (`raw.githubusercontent.com`). External image hosting is fragile and should be migrated to `static/img/`.

---

## Known Issues Found During Inventory

### Broken image reference

`docs/contributor/contribute-docs.md` (line 153) references:

```text
/img/docs/common/architecture/hami-arch.png
```

The directory `static/img/docs/common/architecture/` does not exist. The file at that path does not exist. The correct path for the HAMi core architecture image is:

```text
/img/docs/common/developers/hami-core-design/hami-arch.png
```

This is a broken link that will cause a missing image in the rendered page.

### Protocol diagram inconsistency (EN vs. ZH)

The EN `docs/developers/protocol.md` references only `protocol-register.png` (device registration).

The ZH `i18n/zh/.../developers/protocol.md` references both `device-registration.png` and `task-dispatch.png`.

The EN page is missing the task dispatch diagram. This must be reconciled before either page is considered complete.

---

## Summary: Diagrams Requiring Redraw as SVG

Priority list for the redraw work in [#421](https://github.com/Project-HAMi/website/issues/421):

| Priority | Image | Current format | Reason |
| --- | --- | --- | --- |
| High | `static/img/docs/common/core-concepts/architect.jpg` | JPG | Primary architecture overview; main entry point for new users |
| High | `static/img/docs/common/developers/hami-core-design/hami-arch.png` | PNG | Core internal design diagram, no source |
| High | `static/img/docs/common/developers/hami-core-design/hami-core-position.png` | PNG | Core internal design diagram, no source |
| High | `static/img/docs/en/mindmap/hami-vgpu-mind-map-en.png` | PNG | Outdated scope ("VGPU" only), no source - see [#414](https://github.com/Project-HAMi/website/issues/414) |
| High | `static/img/docs/zh/mindmap/hami-vgpu-mind-map-zh.png` | PNG | Same as above |
| Medium | `static/img/docs/common/developers/scheduling/scheduler-policy-story.png` | PNG | No source |
| Medium | `static/img/docs/common/developers/scheduling/node-scheduler-policy-demo.png` | PNG | No source |
| Medium | `static/img/docs/common/developers/scheduling/gpu-scheduler-policy-demo.png` | PNG | No source |
| Medium | `static/img/docs/common/developers/protocol/protocol-register.png` | PNG | No source; EN/ZH inconsistency must be resolved first |
| Medium | `static/img/docs/common/developers/protocol/device-registration.png` | PNG | No source; ZH-only |
| Medium | `static/img/docs/common/developers/protocol/task-dispatch.png` | PNG | No source; ZH-only, missing from EN |
| Medium | `static/img/docs/en/dynamic-mig/hami-dynamic-mig-structure.png` | PNG | No source |
| Medium | `static/img/docs/en/dynamic-mig/hami-dynamic-mig-procedure.png` | PNG | No source |
| Low | `static/img/docs/common/userguide/metax-device/metax-gpu/metax-topology.jpg` | JPG | Device-specific, no source |
| Low | `static/img/docs/common/userguide/metax-device/metax-gpu/metax-spread.jpg` | JPG | Device-specific, no source |
| Low | `static/img/docs/common/userguide/metax-device/metax-gpu/metax-binpack.jpg` | JPG | Device-specific, no source |
| Low | `static/img/docs/common/userguide/kunlunxin-device/kunlunxin-topology.jpg` | JPG | Device-specific, no source |
| Low | `static/img/docs/common/key-features/hard-limit.jpg` | JPG | Should be PNG or SVG |
| Low | `static/img/docs/common/developers/kunlunxin-topology/kunlunxin-filter.png` | PNG | No source |
| Low | `static/img/docs/common/contributor/github-workflow/git-workflow.png` | PNG | No source |
| Low | `static/img/gpu-sharing-diagram.svg` | SVG | Already SVG; missing source file only |
| Low | `static/img/gpu-sharing-diagram-zh.svg` | SVG | Already SVG; missing source file only |
