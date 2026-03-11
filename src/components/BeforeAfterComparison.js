import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import styles from './BeforeAfterComparison.module.css';

const GPU_CAPACITY = 16;
const GPU_KEYS = ['gpu0', 'gpu1', 'gpu2'];
const STEP_TIMINGS = [0, 360, 1150, 1940, 2860];
const REPLAY_HOVER_COOLDOWN_MS = 1400;

const requests = [
  {
    key: 'a',
    tone: 'alpha',
    name: 'Pod A',
    cells: 5,
    utilization: 31,
    request: { en: '0.3 GPU slice', zh: '0.3 GPU 切片' },
    usage: { en: 'mem 30% · core 25%', zh: '显存 30% · 算力 25%' },
  },
  {
    key: 'b',
    tone: 'beta',
    name: 'Pod B',
    cells: 4,
    utilization: 25,
    request: { en: '0.25 GPU slice', zh: '0.25 GPU 切片' },
    usage: { en: 'mem 24% · core 20%', zh: '显存 24% · 算力 20%' },
  },
  {
    key: 'c',
    tone: 'gamma',
    name: 'Pod C',
    cells: 3,
    utilization: 19,
    request: { en: '0.2 GPU slice', zh: '0.2 GPU 切片' },
    usage: { en: 'mem 18% · core 15%', zh: '显存 18% · 算力 15%' },
  },
];

const hamiPolicies = [
  {
    key: 'binpack',
    label: { en: 'Binpack', zh: 'Binpack' },
    shortLabel: { en: 'Pack hottest GPU', zh: '优先装满单卡' },
    description: {
      en: 'Slices land on the most loaded compatible GPU to reduce stranded whole-card capacity.',
      zh: '切片优先落到已有负载的兼容 GPU 上，减少整卡级别的碎片浪费。',
    },
    flow: {
      en: 'Slice and pack onto the most loaded compatible GPU.',
      zh: '切片后优先装入已有负载的兼容 GPU。',
    },
    mapping: { a: 'gpu0', b: 'gpu0', c: 'gpu0' },
    topologyGroups: { gpu0: 'A', gpu1: 'B', gpu2: 'C' },
  },
  {
    key: 'spread',
    label: { en: 'Spread', zh: 'Spread' },
    shortLabel: { en: 'Balance across GPUs', zh: '跨 GPU 分散' },
    description: {
      en: 'Slices stay fine-grained, but placement intentionally leaves room across multiple GPUs.',
      zh: '切片仍保持细粒度，但调度会主动把空间分散到多张 GPU 上。',
    },
    flow: {
      en: 'Slice and spread across different GPUs for headroom.',
      zh: '切片后分散到不同 GPU，保留更多后续余量。',
    },
    mapping: { a: 'gpu0', b: 'gpu1', c: 'gpu2' },
    topologyGroups: { gpu0: 'A', gpu1: 'B', gpu2: 'C' },
  },
  {
    key: 'topology',
    label: { en: 'Topology-aware', zh: '拓扑感知' },
    shortLabel: { en: 'Respect locality', zh: '优先局部拓扑' },
    description: {
      en: 'Slices stay inside the best locality group when possible, then pack within that zone.',
      zh: '尽量先落在最佳局部拓扑组内，再在该区域内继续装箱。',
    },
    flow: {
      en: 'Slice, prefer the best locality group, then pack inside it.',
      zh: '切片后先选择最佳局部拓扑组，再在组内装箱。',
    },
    mapping: { a: 'gpu0', b: 'gpu0', c: 'gpu1' },
    topologyGroups: { gpu0: 'A', gpu1: 'A', gpu2: 'B' },
  },
];

const beforeMapping = { a: 'gpu0', b: 'gpu1', c: 'gpu2' };

function localize(isZh, text) {
  return isZh ? text.zh : text.en;
}

function buildCells({ allocations, semantics }) {
  const cells = [];
  let order = 0;

  if (semantics === 'exclusive' && allocations.length > 0) {
    const request = allocations[0];
    for (let index = 0; index < request.cells; index += 1) {
      cells.push({
        key: `${request.key}-${index}`,
        tone: request.tone,
        state: 'allocated',
        activationStep: requests.indexOf(request) + 1,
        enterOrder: order,
      });
      order += 1;
    }
    while (cells.length < GPU_CAPACITY) {
      cells.push({
        key: `fragmented-${cells.length}`,
        tone: 'fragmented',
        state: 'fragmented',
        activationStep: requests.indexOf(request) + 1,
        enterOrder: order,
      });
      order += 1;
    }
    return cells;
  }

  allocations.forEach((request) => {
    const activationStep = requests.indexOf(request) + 1;
    for (let index = 0; index < request.cells; index += 1) {
      cells.push({
        key: `${request.key}-${index}`,
        tone: request.tone,
        state: 'allocated',
        activationStep,
        enterOrder: order,
      });
      order += 1;
    }
  });

  while (cells.length < GPU_CAPACITY) {
    cells.push({
      key: `free-${cells.length}`,
      tone: 'free',
      state: 'free',
      activationStep: 0,
      enterOrder: order,
    });
    order += 1;
  }

  return cells;
}

function buildScenario({ visibleCount, mapping, semantics, topologyGroups }) {
  const visibleRequests = requests.slice(0, visibleCount);

  return GPU_KEYS.map((gpuKey, index) => {
    const allocations = visibleRequests.filter((request) => mapping[request.key] === gpuKey);
    const usedCells = allocations.reduce((total, request) => total + request.cells, 0);

    return {
      key: gpuKey,
      name: `GPU ${index}`,
      allocations,
      cells: buildCells({ allocations, semantics }),
      utilization: allocations.reduce((total, request) => total + request.utilization, 0),
      usedCells,
      freeCells: GPU_CAPACITY - usedCells,
      strandedCells: semantics === 'exclusive' && allocations.length > 0 ? GPU_CAPACITY - allocations[0].cells : 0,
      topologyGroup: topologyGroups[gpuKey],
    };
  });
}

function formatPercent(value) {
  return `${Math.round(value)}%`;
}

function getStepLabel({ isZh, animationStep }) {
  if (animationStep === 0) {
    return isZh ? '等待调度器开始放置' : 'Scheduler evaluating the same Pod requests';
  }

  if (animationStep <= requests.length) {
    const request = requests[animationStep - 1];
    return isZh ? `步骤 ${animationStep}: 放置 ${request.name}` : `Step ${animationStep}: place ${request.name}`;
  }

  return isZh ? '放置完成，可重播对比' : 'Placement complete, replay to compare again';
}

function getBeforeFlowText({ isZh, activeRequest, isComplete }) {
  if (activeRequest) {
    return isZh
      ? `${activeRequest.name} 触发整卡独占，剩余容量会被锁在该 GPU 上。`
      : `${activeRequest.name} claims an entire GPU, so the remaining capacity on that card becomes stranded.`;
  }

  if (isComplete) {
    return isZh ? '每个 Pod 都消耗一整张 GPU，即使只使用其中一部分。' : 'Each Pod consumes a whole GPU even though it only uses part of it.';
  }

  return isZh ? '同一批 Pod 请求进入默认的整卡分配语义。' : 'The same Pod requests enter whole-GPU scheduling semantics.';
}

function getAfterFlowText({ isZh, activeRequest, isComplete, policy }) {
  if (activeRequest) {
    return `${activeRequest.name} ${localize(isZh, policy.flow).toLowerCase()}`;
  }

  if (isComplete) {
    return localize(isZh, policy.description);
  }

  return isZh ? '同一批 Pod 请求进入 HAMi 的切片调度语义。' : 'The same Pod requests enter HAMi slicing semantics.';
}

function getSummaryText({ isZh, semantics, policy, strandedCells, schedulableCells }) {
  if (semantics === 'exclusive') {
    return isZh ? `${strandedCells} 个单元被碎片化锁定` : `${strandedCells} cells stranded by exclusive GPU claims`;
  }

  if (policy.key === 'spread') {
    return isZh ? `${schedulableCells} 个单元仍可继续调度` : `${schedulableCells} cells still schedulable after spreading`;
  }

  if (policy.key === 'topology') {
    return isZh ? `${schedulableCells} 个单元仍可用，且保留局部拓扑` : `${schedulableCells} cells still schedulable with locality preserved`;
  }

  return isZh ? `${schedulableCells} 个单元仍可调度，且更易继续装箱` : `${schedulableCells} cells still schedulable for later packing`;
}

function ComparisonPanel({
  isZh,
  side,
  title,
  eyebrow,
  badge,
  description,
  flowText,
  stats,
  gpus,
  activeRequest,
  displayedUtilization,
  policySwitch,
}) {
  return (
    <section className={clsx(styles.panel, side === 'before' ? styles.panelBefore : styles.panelAfter)}>
      <header className={styles.panelHeader}>
        <div className={styles.panelHeaderText}>
          <span className={styles.panelEyebrow}>{eyebrow}</span>
          <div className={styles.panelTitleRow}>
            <h4>{title}</h4>
            <span className={styles.panelBadge}>{badge}</span>
          </div>
          <p>{description}</p>
        </div>
        {policySwitch}
      </header>

      <div className={styles.flowBox}>
        <div className={clsx(styles.flowRequest, activeRequest && styles.flowRequestActive, activeRequest && styles[`flowRequest_${activeRequest.tone}`])}>
          {activeRequest ? activeRequest.name : isZh ? 'Placement complete' : 'Placement complete'}
        </div>
        <p className={styles.flowText}>{flowText}</p>
        <div className={clsx(styles.flowLine, activeRequest && styles.flowLineActive)} aria-hidden="true">
          <span />
        </div>
      </div>

      <div className={styles.statGrid}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.statCard}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>

      <div className={styles.gpuRack}>
        {gpus.map((gpu) => {
          const isTargeted = activeRequest && gpu.allocations.some((allocation) => allocation.key === activeRequest.key);
          return (
            <article
              key={`${side}-${gpu.key}`}
              className={clsx(styles.gpuCard, isTargeted && styles.gpuCardTargeted, side === 'before' && gpu.allocations.length > 0 && styles.gpuCardFragmented)}
            >
              <header className={styles.gpuHeader}>
                <div>
                  <div className={styles.gpuTitleRow}>
                    <h5>{gpu.name}</h5>
                    {side === 'after' && gpu.topologyGroup ? (
                      <span className={styles.topologyBadge}>{isZh ? `拓扑组 ${gpu.topologyGroup}` : `Topo ${gpu.topologyGroup}`}</span>
                    ) : null}
                  </div>
                  <span className={styles.gpuMode}>
                    {side === 'before'
                      ? gpu.allocations.length > 0
                        ? isZh ? '整卡独占' : 'exclusive allocation'
                        : isZh ? '空闲' : 'idle'
                      : gpu.allocations.length > 0
                        ? isZh ? '共享切片' : 'shared slices'
                        : isZh ? '可继续分配' : 'open capacity'}
                  </span>
                </div>
                <strong className={styles.gpuUtilization}>
                  {formatPercent(displayedUtilization[`${side}-${gpu.key}`] ?? 0)}
                </strong>
              </header>

              <div className={styles.gpuGrid}>
                {gpu.cells.map((cell) => {
                  return (
                    <span
                      key={`${side}-${gpu.key}-${cell.key}`}
                      className={clsx(
                        styles.gpuCell,
                        styles[`gpuCell_${cell.tone}`],
                        cell.state === 'free' ? styles.gpuCellFree : styles.gpuCellVisible,
                        cell.state === 'fragmented' && styles.gpuCellFragmented,
                        isTargeted && cell.state === 'allocated' && activeRequest && activeRequest.tone === cell.tone && styles.gpuCellTargeted,
                      )}
                      style={{
                        '--cell-delay': `${cell.enterOrder * 32}ms`,
                      }}
                      aria-hidden="true"
                    />
                  );
                })}
              </div>

              <div className={styles.gpuTags}>
                {gpu.allocations.length > 0 ? (
                  gpu.allocations.map((allocation) => (
                    <span key={`${gpu.key}-${allocation.key}`} className={clsx(styles.gpuTag, styles[`gpuTag_${allocation.tone}`])}>
                      {allocation.name}
                    </span>
                  ))
                ) : (
                  <span className={styles.gpuTagIdle}>{isZh ? '可用容量' : 'Available'}</span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function BeforeAfterComparison({ isZh }) {
  const [selectedPolicy, setSelectedPolicy] = useState('binpack');
  const [runNonce, setRunNonce] = useState(0);
  const [animationStep, setAnimationStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const [displayedUtilization, setDisplayedUtilization] = useState(() => {
    const initial = {};
    GPU_KEYS.forEach((gpuKey) => {
      initial[`before-${gpuKey}`] = 0;
      initial[`after-${gpuKey}`] = 0;
    });
    return initial;
  });

  const timeoutsRef = useRef([]);
  const lastReplayRef = useRef(0);
  const displayedUtilizationRef = useRef(displayedUtilization);

  useEffect(() => {
    displayedUtilizationRef.current = displayedUtilization;
  }, [displayedUtilization]);

  const activePolicy = hamiPolicies.find((policy) => policy.key === selectedPolicy) ?? hamiPolicies[0];
  const visibleCount = Math.min(animationStep, requests.length);
  const activeRequest = animationStep >= 1 && animationStep <= requests.length ? requests[animationStep - 1] : null;
  const isComplete = animationStep > requests.length;
  const beforeGpus = buildScenario({
    visibleCount,
    mapping: beforeMapping,
    semantics: 'exclusive',
    topologyGroups: { gpu0: 'A', gpu1: 'B', gpu2: 'C' },
  });
  const afterGpus = buildScenario({
    visibleCount,
    mapping: activePolicy.mapping,
    semantics: 'shared',
    topologyGroups: activePolicy.topologyGroups,
  });

  useEffect(() => {
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    timeoutsRef.current = [];

    if (reduceMotion) {
      setAnimationStep(requests.length + 1);
      setIsAnimating(false);
      return undefined;
    }

    setIsAnimating(true);
    STEP_TIMINGS.forEach((timing, index) => {
      const timeout = window.setTimeout(() => {
        setAnimationStep(index);
        if (index === STEP_TIMINGS.length - 1) {
          setIsAnimating(false);
        }
      }, timing);
      timeoutsRef.current.push(timeout);
    });

    return () => {
      timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      timeoutsRef.current = [];
    };
  }, [runNonce, selectedPolicy]);

  useEffect(() => {
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targets = {};
    const beforeTargets = buildScenario({
      visibleCount,
      mapping: beforeMapping,
      semantics: 'exclusive',
      topologyGroups: { gpu0: 'A', gpu1: 'B', gpu2: 'C' },
    });
    const afterTargets = buildScenario({
      visibleCount,
      mapping: activePolicy.mapping,
      semantics: 'shared',
      topologyGroups: activePolicy.topologyGroups,
    });

    beforeTargets.forEach((gpu) => {
      targets[`before-${gpu.key}`] = gpu.utilization;
    });
    afterTargets.forEach((gpu) => {
      targets[`after-${gpu.key}`] = gpu.utilization;
    });

    if (reduceMotion) {
      setDisplayedUtilization(targets);
      displayedUtilizationRef.current = targets;
      return undefined;
    }

    const startValues = displayedUtilizationRef.current;
    const duration = 620;
    let frameId = 0;
    let startTime = 0;

    const tick = (timestamp) => {
      if (!startTime) {
        startTime = timestamp;
      }
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      const nextValues = {};

      Object.keys(targets).forEach((key) => {
        const start = startValues[key] ?? 0;
        nextValues[key] = start + (targets[key] - start) * eased;
      });

      displayedUtilizationRef.current = nextValues;
      setDisplayedUtilization(nextValues);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [animationStep, visibleCount, activePolicy]);

  function replay(force = false) {
    const now = Date.now();
    if (!force && (isAnimating || now - lastReplayRef.current < REPLAY_HOVER_COOLDOWN_MS)) {
      return;
    }
    lastReplayRef.current = now;
    setRunNonce((value) => value + 1);
  }

  function handlePolicyChange(nextPolicy) {
    if (nextPolicy === selectedPolicy) {
      replay(true);
      return;
    }
    lastReplayRef.current = Date.now();
    setSelectedPolicy(nextPolicy);
    setRunNonce((value) => value + 1);
  }

  const beforeStrandedCells = beforeGpus.reduce((total, gpu) => total + gpu.strandedCells, 0);
  const afterSchedulableCells = afterGpus.reduce((total, gpu) => total + gpu.freeCells, 0);
  const beforeGpuCount = beforeGpus.filter((gpu) => gpu.allocations.length > 0).length;
  const afterGpuCount = afterGpus.filter((gpu) => gpu.allocations.length > 0).length;

  return (
    <article
      className={styles.shell}
      aria-label={isZh ? '使用 HAMi 前后交互式对比' : 'Interactive before and after HAMi comparison'}
      onMouseEnter={() => replay(false)}
      onFocus={() => replay(false)}
    >
      <header className={styles.header}>
        <div>
          <h3>{isZh ? '使用 HAMi 前后对比' : 'Before vs After HAMi'}</h3>
          <p>
            {isZh
              ? '同一批 Pod 请求，分别进入整卡独占和 HAMi 切片调度流程，直接展示资源语义如何改变放置结果。'
              : 'The same Pod requests enter whole-GPU allocation on the left and HAMi slicing on the right, showing how scheduling semantics change placement.'}
          </p>
        </div>
        <button type="button" className={styles.replayButton} onClick={() => replay(true)}>
          {isZh ? '重播对比' : 'Replay comparison'}
        </button>
      </header>

      <div className={styles.sharedInput}>
        <div className={styles.sharedMeta}>
          <span className={styles.sharedLabel}>{isZh ? '同一输入工作负载' : 'Same workload input'}</span>
          <span className={styles.stepLabel}>{getStepLabel({ isZh, animationStep })}</span>
        </div>

        <div className={styles.requestRail}>
          {requests.map((request, index) => {
            const isActive = activeRequest?.key === request.key;
            const isPlaced = visibleCount > index;
            return (
              <div
                key={request.key}
                className={clsx(
                  styles.requestCard,
                  styles[`requestCard_${request.tone}`],
                  isActive && styles.requestCardActive,
                  isPlaced && styles.requestCardPlaced,
                )}
              >
                <span className={styles.requestName}>{request.name}</span>
                <span className={styles.requestSemantics}>{localize(isZh, request.request)}</span>
                <span className={styles.requestUsage}>{localize(isZh, request.usage)}</span>
              </div>
            );
          })}
        </div>

        <div className={styles.branchRail} aria-hidden="true">
          <span className={clsx(styles.branchStem, animationStep > 0 && styles.branchStemActive)} />
          <div className={styles.branchArms}>
            <span className={clsx(styles.branchArm, styles.branchArmLeft, animationStep > 0 && styles.branchArmActive)} />
            <span className={clsx(styles.branchArm, styles.branchArmRight, animationStep > 0 && styles.branchArmActive)} />
          </div>
        </div>
      </div>

      <div className={styles.panelGrid}>
        <ComparisonPanel
          isZh={isZh}
          side="before"
          title={isZh ? 'Without HAMi' : 'Without HAMi'}
          eyebrow={isZh ? 'Whole-GPU allocation' : 'Whole-GPU allocation'}
          badge={isZh ? '独占语义' : 'Exclusive semantics'}
          description={isZh ? '每个 Pod 都以整卡资源语义完成调度，未使用部分也无法再被切给别的 Pod。' : 'Each Pod is scheduled with whole-GPU semantics, so the unused portion of that card cannot be shared with another Pod.'}
          flowText={getBeforeFlowText({ isZh, activeRequest, isComplete })}
          stats={[
            { label: isZh ? '已占用 GPU' : 'GPUs consumed', value: `${beforeGpuCount}/3` },
            { label: isZh ? '碎片化结果' : 'Fragmentation', value: getSummaryText({ isZh, semantics: 'exclusive', policy: activePolicy, strandedCells: beforeStrandedCells }) },
          ]}
          gpus={beforeGpus}
          activeRequest={activeRequest}
          displayedUtilization={displayedUtilization}
        />

        <ComparisonPanel
          isZh={isZh}
          side="after"
          title={isZh ? 'With HAMi' : 'With HAMi'}
          eyebrow={isZh ? 'Fine-grained slicing & policy scheduling' : 'Fine-grained slicing & policy scheduling'}
          badge={isZh ? '共享语义' : 'Shared slices'}
          description={isZh ? '同样的 Pod 请求先被切分为可调度切片，再由策略决定是装箱、分散还是遵循拓扑局部性。' : 'The same Pod requests are sliced first, then placed by policy to pack, spread, or respect topology locality.'}
          flowText={getAfterFlowText({ isZh, activeRequest, isComplete, policy: activePolicy })}
          stats={[
            { label: isZh ? '活跃 GPU' : 'Active GPUs', value: `${afterGpuCount}/3` },
            { label: isZh ? '策略结果' : 'Policy result', value: getSummaryText({ isZh, semantics: 'shared', policy: activePolicy, schedulableCells: afterSchedulableCells }) },
          ]}
          gpus={afterGpus}
          activeRequest={activeRequest}
          displayedUtilization={displayedUtilization}
          policySwitch={
            <div className={styles.policySwitch} role="tablist" aria-label={isZh ? 'HAMi 调度策略' : 'HAMi scheduling policy'}>
              {hamiPolicies.map((policy) => (
                <button
                  key={policy.key}
                  type="button"
                  role="tab"
                  aria-selected={policy.key === selectedPolicy}
                  className={clsx(styles.policyButton, policy.key === selectedPolicy && styles.policyButtonActive)}
                  onClick={() => handlePolicyChange(policy.key)}
                >
                  <span>{localize(isZh, policy.label)}</span>
                  <small>{localize(isZh, policy.shortLabel)}</small>
                </button>
              ))}
            </div>
          }
        />
      </div>
    </article>
  );
}
