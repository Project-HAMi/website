import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import { ICONS, ring } from "./RuntimeComparisonIcons";
import styles from "./RuntimeComparison.module.css";

const t = (isZh, text) => (typeof text === "string" ? text : isZh ? text.zh : text.en);

const LANES = [
  { key: "dp", name: "Device Plugin", sub: { en: "classic HAMi", zh: "经典 HAMi" } },
  { key: "dra", name: "DRA", sub: "HAMi-DRA" },
];

const OWNERS = {
  hami: "HAMi",
  k8s: "Kubernetes",
};

// Who does each step of handing a GPU slice to a Pod, in each mode. A detour is a side trip
// HAMi has to make in Device Plugin mode.
const STEPS = [
  {
    key: "advertise",
    title: { en: "Advertise", zh: "上报设备" },
    dp: {
      owner: "hami",
      name: "device plugin",
      via: { en: "node annotations", zh: "节点 annotation" },
      icon: "plug",
      detour: { icon: "tag", label: { en: "node annotation", zh: "节点 annotation" } },
    },
    dra: { owner: "hami", name: "DRA driver", via: "ResourceSlice", icon: "cpu" },
    note: {
      en: "With a device plugin, the scheduler only sees an integer count of extended resources, so HAMi writes each GPU's memory and cores into node annotations. A DRA driver publishes them in a ResourceSlice that the scheduler reads directly.",
      zh: "Device Plugin 模式下，调度器只能看到整数个扩展资源，HAMi 把每张卡的显存和算力另写进节点 annotation。DRA driver 把它们发布到 ResourceSlice，调度器可以直接读取。",
    },
  },
  {
    key: "admit",
    title: { en: "Admit", zh: "准入" },
    dp: {
      owner: "hami",
      name: "HAMi webhook",
      via: { en: "sets schedulerName", zh: "设置 schedulerName" },
      icon: "webhook",
    },
    dra: {
      owner: "hami",
      name: "HAMi-DRA webhook",
      via: { en: "converts to ResourceClaim", zh: "转换为 ResourceClaim" },
      icon: "webhook",
    },
    note: {
      en: "Both modes start with a webhook, and the Pod spec stays the same. In Device Plugin mode the webhook assigns the Pod to hami-scheduler; in DRA mode it converts the request into a ResourceClaim.",
      zh: "两种模式都由 webhook 接入，Pod 写法不变。Device Plugin 模式下，webhook 把 Pod 指定给 hami-scheduler；DRA 模式下，webhook 把资源请求转换为 ResourceClaim。",
    },
  },
  {
    key: "schedule",
    title: { en: "Schedule", zh: "调度" },
    dp: {
      owner: "hami",
      name: "hami-scheduler",
      via: "kube-scheduler + extender",
      icon: "grid",
      detour: { icon: "puzzle", label: "extender" },
    },
    dra: {
      owner: "k8s",
      name: "kube-scheduler",
      via: { en: "cluster default", zh: "集群默认调度器" },
      icon: "grid",
    },
    note: {
      en: "To pick a GPU by memory and cores, Device Plugin mode deploys hami-scheduler (kube-scheduler plus an extender). In DRA mode the cluster's default kube-scheduler does the allocation.",
      zh: "按显存和算力选卡时，Device Plugin 模式需要部署 hami-scheduler（kube-scheduler 加 extender）；DRA 模式由集群默认的 kube-scheduler 完成分配。",
    },
  },
  {
    key: "handoff",
    title: { en: "Hand off", zh: "交接结果" },
    dp: {
      owner: "hami",
      name: { en: "Pod annotations", zh: "Pod annotation" },
      via: { en: "plus a node lock", zh: "加节点锁" },
      icon: "tag",
      detour: { icon: "lock", label: { en: "node lock", zh: "节点锁" } },
    },
    dra: { owner: "k8s", name: "ResourceClaim", via: "status.allocation", icon: "ticket" },
    note: {
      en: "The scheduling result has to reach the node. Device Plugin mode writes it to Pod annotations and uses a node lock to avoid races; DRA mode records it in the ResourceClaim status.",
      zh: "调度结果需要传到节点。Device Plugin 模式写在 Pod annotation 中，并用节点锁避免并发冲突；DRA 模式记录在 ResourceClaim 的 status 中。",
    },
  },
  {
    key: "prepare",
    title: { en: "Prepare", zh: "注入设备" },
    dp: {
      owner: "hami",
      name: "device plugin",
      via: { en: "Allocate, then find the Pod", zh: "Allocate 后反查 Pod" },
      icon: "plug",
      detour: { icon: "scan", label: { en: "find the Pod", zh: "反查 Pod" } },
    },
    dra: {
      owner: "hami",
      name: "DRA driver",
      via: { en: "through CDI", zh: "通过 CDI" },
      icon: "cpu",
    },
    note: {
      en: "kubelet's Allocate call only passes device IDs, so the device plugin has to look up the Pod. A DRA driver gets the full ResourceClaim and injects the device and HAMi-core through CDI.",
      zh: "kubelet 调用 Allocate 时只传设备 ID，device plugin 需要反查对应的 Pod。DRA driver 能拿到完整的 ResourceClaim，通过 CDI 注入设备和 HAMi-core。",
    },
  },
  {
    key: "isolate",
    title: { en: "Isolate", zh: "隔离" },
    dp: {
      owner: "hami",
      name: "HAMi-core",
      via: { en: "in the container", zh: "容器内生效" },
      icon: "gpu",
    },
    dra: {
      owner: "hami",
      name: "HAMi-core",
      via: { en: "in the container", zh: "容器内生效" },
      icon: "gpu",
    },
    note: {
      en: "The same in both modes: HAMi-core enforces memory and core limits inside the container.",
      zh: "两种模式相同，都由 HAMi-core 在容器内限制显存和算力。",
    },
  },
];

const SUMMARY = {
  en: "Shown for NVIDIA GPUs. DRA mode requires Kubernetes 1.34 or later with the DRA Consumable Capacity feature gate enabled, and CDI enabled in the container runtime.",
  zh: "图示以 NVIDIA GPU 为例。DRA 模式要求 Kubernetes 1.34 及以上并开启 DRA Consumable Capacity 特性门控，容器运行时需启用 CDI。",
};

const MAIN_Y = 106;
// A lane without detours drops the band above its stations; the cell CSS mirrors this offset.
const DETOUR_BAND = 62;
const TILE = 52;
const TILE_R = 15;
const DETOUR_Y = 34;
const DETOUR_R = 15;
const PAUSE = 0.34;
const TRAVEL_SECONDS = 7.5;
const CYCLE_SECONDS = 12;
// Play a few rounds, then rest on the finished drawing.
const PLAY_CYCLES = 3;

const tilePath = (x, y, size, r) => {
  const h = size / 2;
  return (
    `M${x - h + r} ${y - h}H${x + h - r}a${r} ${r} 0 0 1 ${r} ${r}V${y + h - r}` +
    `a${r} ${r} 0 0 1 ${-r} ${r}H${x - h + r}a${r} ${r} 0 0 1 ${-r} ${-r}V${y - h + r}` +
    `a${r} ${r} 0 0 1 ${r} ${-r}z`
  );
};

const hasDetours = (lane) => STEPS.some((step) => step[lane].detour);

function buildTrack(lane, width) {
  const y = hasDetours(lane) ? MAIN_Y : MAIN_Y - DETOUR_BAND;
  const step = width / STEPS.length;
  const xs = STEPS.map((_, index) => (index + 0.5) * step);
  const parts = [];
  const stops = [];
  xs.forEach((x, index) => {
    parts.push(index === 0 ? `M${x} ${y}` : `L${x} ${y}`);
    stops.push({ prefix: parts.join(" "), x, y, main: true, index });
    if (STEPS[index][lane].detour) {
      parts.push(`V${DETOUR_Y}`);
      stops.push({ prefix: parts.join(" "), x, y: DETOUR_Y, main: false, index });
      parts.push(`V${y}`);
    }
  });
  return { d: parts.join(" "), xs, y, stops };
}

// Maps elapsed seconds to distance along the path, pausing at every stop.
function buildTimeline(stops, full, speed) {
  const segments = [];
  let time = 0;
  let at = 0;
  stops.forEach((stop) => {
    const travel = (stop.length - at) / speed;
    segments.push({ t0: time, t1: time + travel, d0: at, d1: stop.length });
    time += travel;
    segments.push({ t0: time, t1: time + PAUSE, d0: stop.length, d1: stop.length });
    time += PAUSE;
    at = stop.length;
  });
  return { segments, full };
}

function distanceAt(timeline, elapsed) {
  const hit = timeline.segments.find((segment) => elapsed < segment.t1);
  if (!hit) return timeline.full;
  const span = hit.t1 - hit.t0 || 1;
  return hit.d0 + ((elapsed - hit.t0) / span) * (hit.d1 - hit.d0);
}

function Station({ icon, x, y, owner, detour }) {
  const scale = detour ? 0.7 : 1;
  const frame = detour ? ring(x, y, DETOUR_R) : tilePath(x, y, TILE, TILE_R);
  return (
    <g className={clsx(styles.station, styles[`station_${owner}`], detour && styles.stationDetour)}>
      <path d={frame} className={styles.frameBase} />
      <path d={frame} pathLength="1" className={styles.frameInk} />
      <g transform={`translate(${x - 12 * scale} ${y - 12 * scale}) scale(${scale})`}>
        {ICONS[icon].map((d, index) => (
          <React.Fragment key={d}>
            <path d={d} className={styles.iconBase} />
            <path
              d={d}
              pathLength="1"
              className={styles.iconInk}
              style={{ transitionDelay: `${0.18 + index * 0.09}s` }}
            />
          </React.Fragment>
        ))}
      </g>
    </g>
  );
}

function LaneTrack({ lane, laneIndex, isZh, dimmed, register }) {
  const maskId = `rc-mask-${lane}-${useId().replace(/[^\w-]/g, "")}`;
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const inkPathRef = useRef(null);
  const tokenRef = useRef(null);
  const stationRefs = useRef({});
  const [track, setTrack] = useState(null);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      if (width > 0) setTrack(buildTrack(lane, width));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [lane]);

  useEffect(() => {
    const ink = inkPathRef.current;
    if (!track || !ink) return undefined;
    // Measure prefixes on a hidden path; detached paths are not measurable everywhere.
    const svgNS = "http://www.w3.org/2000/svg";
    const scratch = document.createElementNS(svgNS, "svg");
    scratch.style.cssText = "position:absolute;width:0;height:0;visibility:hidden";
    const probe = document.createElementNS(svgNS, "path");
    scratch.appendChild(probe);
    document.body.appendChild(scratch);
    const lengthOf = (d) => {
      probe.setAttribute("d", d);
      return probe.getTotalLength();
    };
    const stops = track.stops.map((stop) => ({ ...stop, length: lengthOf(stop.prefix) }));
    const full = lengthOf(track.d);
    probe.setAttribute("d", track.d);
    ink.style.strokeDasharray = `${full} ${full}`;
    ink.style.strokeDashoffset = `${full}`;

    let timeline = null;
    let previous = 0;
    let reached = 0;

    const reset = () => {
      const svg = svgRef.current;
      // Snap back without playing the undraw transition.
      svg?.classList.add(styles.resetting);
      Object.values(stationRefs.current).forEach((el) => el?.classList.remove(styles.inked));
      svg?.getBoundingClientRect();
      svg?.classList.remove(styles.fading, styles.resetting);
      reached = 0;
    };

    const rest = () => {
      Object.values(stationRefs.current).forEach((el) => el?.classList.add(styles.inked));
      svgRef.current?.classList.remove(styles.fading);
      ink.style.strokeDashoffset = "0";
      if (tokenRef.current) tokenRef.current.style.opacity = 0;
      previous = Infinity;
    };

    const update = (elapsed, speed, last) => {
      const token = tokenRef.current;
      if (!token) return;
      if (!timeline || timeline.speed !== speed) {
        timeline = { ...buildTimeline(stops, full, speed), speed };
      }
      if (elapsed < previous) reset();
      previous = elapsed;

      const travelled = distanceAt(timeline, elapsed);
      ink.style.strokeDashoffset = `${full - travelled}`;
      while (reached < stops.length && travelled >= stops[reached].length - 0.5) {
        const stop = stops[reached];
        stationRefs.current[`${stop.main ? "m" : "d"}${stop.index}`]?.classList.add(styles.inked);
        token.dataset.owner = stop.main ? STEPS[stop.index][lane].owner : "hami";
        reached += 1;
      }
      if (!last && elapsed > CYCLE_SECONDS - 0.9) svgRef.current?.classList.add(styles.fading);

      const point = probe.getPointAtLength(travelled);
      token.setAttribute("transform", `translate(${point.x} ${point.y})`);
      const inside = stops.some((stop) =>
        stop.main
          ? Math.abs(point.x - stop.x) < TILE / 2 && Math.abs(point.y - stop.y) < TILE / 2
          : Math.hypot(point.x - stop.x, point.y - stop.y) < DETOUR_R,
      );
      const done = travelled >= full - 0.5;
      token.style.opacity = elapsed < 0.2 || inside || done ? 0 : 1;
    };

    const unregister = register(lane, { length: full, update, rest });
    return () => {
      unregister();
      scratch.remove();
    };
  }, [track, lane, register]);

  const setStation = (key) => (el) => {
    stationRefs.current[key] = el;
  };

  return (
    <div ref={wrapRef} className={styles.track} style={{ "--lane": laneIndex }} aria-hidden="true">
      {track && (
        <svg ref={svgRef} className={styles.trackSvg}>
          <defs>
            <mask id={maskId} maskUnits="userSpaceOnUse">
              <rect x="-50" y="-50" width="10000" height="1000" fill="#fff" />
              {track.stops.map((stop) =>
                stop.main ? (
                  <path
                    key={`m${stop.index}`}
                    d={tilePath(stop.x, stop.y, TILE + 6, TILE_R + 3)}
                    fill="#000"
                  />
                ) : (
                  <circle
                    key={`d${stop.index}`}
                    cx={stop.x}
                    cy={stop.y}
                    r={DETOUR_R + 3}
                    fill="#000"
                  />
                ),
              )}
            </mask>
          </defs>

          <g mask={`url(#${maskId})`}>
            <path d={track.d} className={styles.wireBase} />
            <path ref={inkPathRef} d={track.d} className={styles.wireInk} />
          </g>

          {track.xs.map((x, index) => {
            const step = STEPS[index];
            const { owner, icon, detour } = step[lane];
            return (
              <g
                key={step.key}
                className={clsx(styles.stationGroup, dimmed(step.key) && styles.dim)}
              >
                <g ref={setStation(`m${index}`)}>
                  <Station icon={icon} x={x} y={track.y} owner={owner} />
                </g>
                {detour && (
                  <g ref={setStation(`d${index}`)}>
                    <Station icon={detour.icon} x={x} y={DETOUR_Y} owner="hami" detour />
                    <text x={x + DETOUR_R + 8} y={DETOUR_Y + 4} className={styles.detourLabel}>
                      {t(isZh, detour.label)}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          <g ref={tokenRef} className={styles.token} style={{ opacity: 0 }}>
            <circle r="8" className={styles.tokenHalo} />
            <circle r="3.2" className={styles.tokenCore} />
          </g>
        </svg>
      )}
    </div>
  );
}

// Lets long identifiers such as ResourceClaim or status.allocation wrap on narrow screens.
function breakable(text) {
  return text
    .replace(/([a-z])([A-Z])|\./g, (match, lower, upper) => (upper ? `${lower}\n${upper}` : ".\n"))
    .split("\n")
    .flatMap((part, index) => (index ? [<wbr key={index} />, part] : [part]));
}

function runOf(lane, index) {
  const owner = STEPS[index][lane].owner;
  return {
    start: index === 0 || STEPS[index - 1][lane].owner !== owner,
    end: index === STEPS.length - 1 || STEPS[index + 1][lane].owner !== owner,
  };
}

export default function RuntimeComparison({ isZh }) {
  const rootRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [pinned, setPinned] = useState(null);
  const active = hovered || pinned;
  const activeStep = STEPS.find((step) => step.key === active);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const lanesRef = useRef({});
  // Set once the drawing is left finished, so a lane rebuilt by a resize comes back finished too.
  const restedRef = useRef(false);
  const register = useCallback((lane, api) => {
    lanesRef.current[lane] = api;
    if (restedRef.current) api.rest();
    return () => {
      delete lanesRef.current[lane];
    };
  }, []);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined" || !window.matchMedia) {
      return undefined;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const wide = window.matchMedia("(min-width: 768px)");
    const lanes = () => Object.values(lanesRef.current);
    let frame = 0;
    let start = 0;
    let inView = false;

    const tick = (now) => {
      if (!start) start = now;
      const total = (now - start) / 1000;
      const cycle = Math.floor(total / CYCLE_SECONDS);
      const elapsed = total - cycle * CYCLE_SECONDS;
      const last = cycle >= PLAY_CYCLES - 1;
      const dp = lanesRef.current.dp;
      if (dp) {
        const speed = dp.length / TRAVEL_SECONDS;
        lanes().forEach((api) => api.update(elapsed, speed, last));
      }
      if (last && elapsed > CYCLE_SECONDS - 1) {
        restedRef.current = true;
        lanes().forEach((api) => api.rest());
        frame = 0;
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    // Runs only on screen, on wide layouts and without reduced motion; re-checked on every change.
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      if (reduce.matches) {
        restedRef.current = true;
        lanes().forEach((api) => api.rest());
      } else if (inView && wide.matches) {
        // Once finished, keep the finished drawing instead of replaying it.
        if (restedRef.current) return;
        start = 0;
        frame = requestAnimationFrame(tick);
      }
    };

    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });
    observer.observe(node);
    reduce.addEventListener("change", sync);
    wide.addEventListener("change", sync);
    return () => {
      observer.disconnect();
      reduce.removeEventListener("change", sync);
      wide.removeEventListener("change", sync);
      cancelAnimationFrame(frame);
    };
  }, []);

  const hover = (key) => ({
    onMouseEnter: () => setHovered(key),
    onMouseLeave: () => setHovered(null),
  });
  const dim = (key) => Boolean(active) && active !== key;

  return (
    <figure ref={rootRef} className={clsx(styles.root, visible && styles.visible)}>
      <div className={styles.grid}>
        {LANES.map((lane, laneIndex) => (
          <div key={lane.key} className={styles.laneHead} style={{ "--lane": laneIndex }}>
            <span className={styles.laneName}>{lane.name}</span>
            <span className={styles.laneSub}>{t(isZh, lane.sub)}</span>
          </div>
        ))}

        {LANES.map((lane, laneIndex) => (
          <LaneTrack
            key={`track-${lane.key}`}
            lane={lane.key}
            laneIndex={laneIndex}
            isZh={isZh}
            dimmed={dim}
            register={register}
          />
        ))}

        {STEPS.map((step, index) => (
          <React.Fragment key={step.key}>
            <button
              type="button"
              className={clsx(styles.stepHead, dim(step.key) && styles.dim)}
              aria-pressed={pinned === step.key}
              style={{ "--step": index }}
              onClick={() => setPinned(pinned === step.key ? null : step.key)}
              {...hover(step.key)}
            >
              <span className={styles.stepIndex}>{String(index + 1).padStart(2, "0")}</span>
              {t(isZh, step.title)}
            </button>

            {LANES.map((lane, laneIndex) => {
              const cell = step[lane.key];
              const run = runOf(lane.key, index);
              return (
                <div
                  key={lane.key}
                  className={clsx(
                    styles.cell,
                    styles[cell.owner],
                    run.start && styles.runStart,
                    run.end && styles.runEnd,
                    !hasDetours(lane.key) && styles.compact,
                    dim(step.key) && styles.dim,
                  )}
                  style={{ "--step": index, "--lane": laneIndex }}
                  {...hover(step.key)}
                >
                  <span className={styles.bg} aria-hidden="true" />
                  {run.start && <span className={styles.owner}>{OWNERS[cell.owner]}</span>}
                  {index < STEPS.length - 1 && <span className={styles.seg} aria-hidden="true" />}
                  <span className={styles.dot} aria-hidden="true" />
                  <span className={styles.name}>{breakable(t(isZh, cell.name))}</span>
                  <span className={styles.via}>{breakable(t(isZh, cell.via))}</span>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      <figcaption className={styles.caption} aria-live="polite">
        {activeStep ? (
          <span key={activeStep.key} className={styles.note}>
            {t(isZh, activeStep.note)}
          </span>
        ) : (
          <span className={styles.note}>
            {t(isZh, SUMMARY)}{" "}
            <Link to="/docs/get-started/choose-your-setup">
              {isZh ? "如何选择" : "How to choose"}
              <span aria-hidden="true"> →</span>
            </Link>
          </span>
        )}
      </figcaption>
    </figure>
  );
}
