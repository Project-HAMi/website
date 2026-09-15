import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboardPath = new URL("../static/grafana/gpu-dashboard.json", import.meta.url);
const dashboard = JSON.parse(await readFile(dashboardPath, "utf8"));

const panels = dashboard.panels;
const panelByTitle = (title) => {
  const panel = panels.find((candidate) => candidate.title === title);
  assert.ok(panel, `panel ${JSON.stringify(title)} must exist`);
  return panel;
};

const targetExpressions = panels.flatMap((panel) =>
  (panel.targets ?? []).map((target) => target.expr),
);

test("dashboard has stable import metadata and unique panel IDs", () => {
  assert.equal(dashboard.id, null);
  assert.equal(dashboard.uid, "hami-vgpu-metrics");
  assert.ok(dashboard.schemaVersion >= 39);
  assert.ok(dashboard.tags.includes("hami"));

  const ids = panels.map((panel) => panel.id);
  assert.equal(new Set(ids).size, ids.length, "panel IDs must be unique");
});

test("all Prometheus queries use the selectable datasource", () => {
  const datasourceVariable = dashboard.templating.list.find(
    (variable) => variable.name === "datasource",
  );
  assert.equal(datasourceVariable?.type, "datasource");
  assert.equal(datasourceVariable?.query, "prometheus");

  for (const panel of panels) {
    if (panel.datasource?.type === "prometheus") {
      assert.equal(panel.datasource.uid, "${datasource}", panel.title);
    }
    for (const target of panel.targets ?? []) {
      assert.deepEqual(
        target.datasource,
        { type: "prometheus", uid: "${datasource}" },
        panel.title,
      );
    }
  }
});

test("queries only use HAMi v2.10 metrics and selected DCGM metrics", () => {
  const allowedMetrics = new Set([
    "hami_container_device_utilization_ratio",
    "hami_gpu_core_allocated_ratio",
    "hami_gpu_memory_allocated_bytes",
    "hami_gpu_memory_limit_bytes",
    "hami_gpu_shared_count",
    "hami_host_gpu_memory_used_bytes",
    "hami_host_gpu_utilization_ratio",
    "hami_node_gpu_memory_allocated_ratio",
    "hami_node_gpu_overview",
    "hami_vgpu_memory_limit_bytes",
    "hami_vgpu_memory_used_bytes",
    "DCGM_FI_DEV_GPU_TEMP",
    "DCGM_FI_DEV_POWER_USAGE",
    "DCGM_FI_DEV_SM_CLOCK",
    "DCGM_FI_DEV_XID_ERRORS",
  ]);

  const usedMetrics = new Set(
    targetExpressions.flatMap(
      (expression) => expression.match(/\b(?:hami_[a-z0-9_]+|DCGM_FI_[A-Z0-9_]+)\b/g) ?? [],
    ),
  );
  assert.deepEqual(usedMetrics, allowedMetrics);

  const serializedExpressions = targetExpressions.join("\n");
  for (const legacyMetric of [
    "Device_memory_desc_of_container",
    "Device_utilization_desc_of_container",
    "HostCoreUtilization",
    "HostGPUMemoryUsage",
    "nodeGPUOverview",
    "vGPUCorePercentage",
    "vGPUMemoryPercentage",
    "vGPU_device_memory_usage_in_bytes",
  ]) {
    assert.doesNotMatch(serializedExpressions, new RegExp(legacyMetric));
  }
});

test("host metrics use their native node label for filtering", () => {
  const cases = [
    ["Host GPU memory used", "hami_host_gpu_memory_used_bytes"],
    ["Host GPU utilization", "hami_host_gpu_utilization_ratio"],
  ];

  for (const [title, metric] of cases) {
    const panel = panelByTitle(title);
    assert.equal(panel.targets.length, 1);
    assert.equal(panel.targets[0].expr, `${metric}{node=~"$node"}`);
  }
});

test("host section compares scheduler allocation with physical memory use", () => {
  const panel = panelByTitle("GPU memory: allocated vs host used");
  assert.deepEqual(
    panel.targets.map((target) => target.expr),
    [
      'hami_gpu_memory_allocated_bytes{node=~"$node"}',
      'hami_host_gpu_memory_used_bytes{node=~"$node"}',
    ],
  );
});

test("allocation ratio uses the metric's native fraction scale", () => {
  const panel = panelByTitle("Node GPU memory allocated ratio");
  assert.equal(panel.targets[0].expr, 'hami_node_gpu_memory_allocated_ratio{node=~"$node"}');
  assert.equal(panel.fieldConfig.defaults.unit, "percentunit");
  assert.equal(panel.fieldConfig.defaults.min, 0);
  assert.equal(panel.fieldConfig.defaults.max, 1);

  for (const step of panel.fieldConfig.defaults.thresholds.steps) {
    if (step.value != null) {
      assert.ok(step.value >= 0 && step.value <= 1);
    }
  }
});

test("snapshot allocation panels use the website dashboard's bar-gauge layout", () => {
  for (const title of [
    "Node GPU memory allocated ratio",
    "GPU core allocated ratio",
    "GPU shared count per device",
    "vGPU memory used % of limit",
  ]) {
    const panel = panelByTitle(title);
    assert.equal(panel.type, "bargauge", title);
    assert.equal(panel.options.orientation, "horizontal", title);
    assert.equal(panel.targets[0].instant, true, title);
    assert.equal(panel.targets[0].range, false, title);
  }
});

test("calculated percentages guard against zero denominators", () => {
  assert.match(
    panelByTitle("GPU memory allocated %").targets[0].expr,
    /clamp_min\(sum\(hami_gpu_memory_limit_bytes/,
  );
  assert.match(
    panelByTitle("vGPU memory used % of limit").targets[0].expr,
    /clamp_min\(hami_vgpu_memory_limit_bytes/,
  );
});

test("hardware telemetry uses only optional DCGM queries available with HAMi v2.10", () => {
  const rowIndex = panels.findIndex(
    (panel) => panel.title === "NVIDIA hardware telemetry (optional DCGM Exporter)",
  );
  assert.ok(rowIndex >= 0);

  const hardwarePanels = panels.slice(rowIndex + 1);
  const dcgmPanels = hardwarePanels.filter((panel) =>
    panel.targets.some((target) => target.expr.includes("DCGM_FI_")),
  );
  assert.deepEqual(
    dcgmPanels.map((panel) => panel.title),
    [
      "GPUs reporting XID errors",
      "Average GPU temperature",
      "Total GPU power usage",
      "GPU temperature",
      "GPU power usage",
      "GPU SM clock (DCGM)",
    ],
  );

  const dcgmExpressions = dcgmPanels
    .flatMap((panel) => panel.targets.map((target) => target.expr))
    .join("\n");
  assert.match(dcgmExpressions, /and on \(UUID\) label_replace\(/);
  assert.doesNotMatch(dcgmExpressions, /(?:node_name|Hostname)=/);
  assert.doesNotMatch(dcgmExpressions, /DCGM_FI_DEV_(?:FB_USED|GPU_UTIL)/);
  assert.match(panelByTitle("GPUs reporting XID errors").targets[0].expr, /> bool 0/);
  assert.doesNotMatch(panelByTitle("GPUs reporting XID errors").targets[0].expr, /vector\(0\)/);
  assert.doesNotMatch(
    targetExpressions.join("\n"),
    /hami_host_gpu_(?:temperature_celsius|power_usage_watts|ecc_errors_total)/,
  );
});

test("DCGM summary panels retain the useful website dashboard views", () => {
  const averageTemperature = panelByTitle("Average GPU temperature");
  assert.equal(averageTemperature.type, "gauge");
  assert.equal(averageTemperature.targets[0].instant, true);
  assert.match(averageTemperature.targets[0].expr, /^avg\(DCGM_FI_DEV_GPU_TEMP/);

  const totalPower = panelByTitle("Total GPU power usage");
  assert.equal(totalPower.type, "stat");
  assert.equal(totalPower.options.graphMode, "area");
  assert.match(totalPower.targets[0].expr, /^sum\(DCGM_FI_DEV_POWER_USAGE/);
});

test("SM clock query converts DCGM MHz values to Grafana hertz", () => {
  const panel = panelByTitle("GPU SM clock (DCGM)");
  assert.equal(panel.fieldConfig.defaults.unit, "hertz");
  assert.match(panel.targets[0].expr, /\* 1000000$/);
});

test("table identifier columns are not formatted as bytes", () => {
  for (const title of ["GPU inventory and allocation", "Top 10 containers by vGPU memory"]) {
    const panel = panelByTitle(title);
    assert.equal(panel.fieldConfig.defaults.unit, "none");
    const valueOverride = panel.fieldConfig.overrides.find(
      (override) => override.matcher.options === "Value",
    );
    assert.ok(valueOverride, `${title} must override the sample value`);
    assert.ok(
      valueOverride.properties.some(
        (property) => property.id === "unit" && property.value === "bytes",
      ),
      `${title} must format only the sample value as bytes`,
    );
  }
});

test("tables hide the internal zone label", () => {
  for (const title of ["GPU inventory and allocation", "Top 10 containers by vGPU memory"]) {
    const panel = panelByTitle(title);
    const organize = panel.transformations.find(
      (transformation) => transformation.id === "organize",
    );
    assert.equal(organize.options.excludeByName.zone, true, title);
  }
});
