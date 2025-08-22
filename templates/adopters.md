---
title: HAMi Adopters
type: adopters
description: >
  On this page you can see a selection of organisations who self-identified as using Kepler.
---

## HAMi Adopters

Organizations below all are using HAMi.

To join this list, please follow these instructions.

{{- range (datasource "adopters").adopters.companies }}
{{ if has . "logo" }}
![{{.name}}](../fig/{{ .logo }})
{{ else }}
![{{.name}}](../fig/logos/default.svg)
{{ end }}
[{{.name}}]({{.url}})
{{ end }}
