import React, { useState, useMemo } from 'react';
import CodeBlock from '@theme/CodeBlock';
import Translate, { translate } from '@docusaurus/Translate';
import clsx from 'clsx';
import styles from './styles.module.css';

const VENDORS = {
  NVIDIA: {
    name: 'NVIDIA (GPU)',
    resourceKey: 'nvidia.com/gpu',
    memKey: 'nvidia.com/gpumem',
    memPctKey: 'nvidia.com/gpumem-percentage',
    coreKey: 'nvidia.com/gpucores',
    corePctKey: 'nvidia.com/gpucores-percentage',
    typeKey: 'hami.io/vgpu-type',
    uuidKey: 'hami.io/vgpu-uuid',
    memUnit: 'MiB',
  },
  CAMBRICON: {
    name: 'Cambricon (MLU)',
    resourceKey: 'cambricon.com/vmlu',
    memKey: 'cambricon.com/mlu.smlu.vmemory',
    memPctKey: 'cambricon.com/mlu.smlu.vmemory',
    coreKey: 'cambricon.com/mlu.smlu.smlu',
    corePctKey: 'cambricon.com/mlu.smlu.smlu',
    typeKey: 'hami.io/mlu-type',
    uuidKey: 'hami.io/mlu-uuid',
    memUnit: '%',
  },
  HYGON: {
    name: 'Hygon (DCU)',
    resourceKey: 'hygon.com/dcunum',
    memKey: 'hygon.com/dcumem',
    memPctKey: null,
    coreKey: 'hygon.com/dcucores',
    corePctKey: null,
    typeKey: 'hami.io/dcu-type',
    uuidKey: 'hami.io/dcu-uuid',
    memUnit: 'MiB',
  },
  ILUVATAR: {
    name: 'Iluvatar (GPU)',
    resourceKey: 'iluvatar.ai/vgpu',
    memKey: 'iluvatar.ai/vcuda-memory',
    memPctKey: null,
    coreKey: 'iluvatar.ai/vcuda-core',
    corePctKey: null,
    typeKey: 'hami.io/iluvatar-type',
    uuidKey: 'hami.io/iluvatar-uuid',
    memUnit: 'MiB',
  },
  ASCEND: {
    name: 'Huawei Ascend (NPU)',
    resourceKey: 'huawei.com/Ascend910',
    memKey: 'huawei.com/Ascend910-memory',
    memPctKey: null,
    coreKey: null,
    corePctKey: null,
    typeKey: null,
    uuidKey: null,
    memUnit: 'MiB',
  },
};

export default function ManifestGenerator() {
  const [vendor, setVendor] = useState('NVIDIA');
  const [deviceCount, setDeviceCount] = useState(1);
  const [memMode, setMemMode] = useState('value');
  const [memValue, setMemValue] = useState(3000);
  const [coreMode, setCoreMode] = useState('none');
  const [coreValue, setCoreValue] = useState(50);
  
  const [advanced, setAdvanced] = useState(false);
  const [deviceType, setDeviceType] = useState('');
  const [deviceUuid, setDeviceUuid] = useState('');

  // Compute yamlCode synchronously for bulletproof SSR
  const yamlCode = useMemo(() => {
    const v = VENDORS[vendor];
    let annotations = [];
    let limits = [];

    limits.push(`      ${v.resourceKey}: ${deviceCount}`);
    
    if (v.memKey) {
      if (memMode === 'value' && v.memUnit !== '%') {
        limits.push(`      ${v.memKey}: ${memValue}`);
      } else if (memMode === 'percentage' && v.memPctKey) {
        limits.push(`      ${v.memPctKey}: ${memValue}`);
      } else if (v.memUnit === '%') {
         // Fallback if forced percentage logic
         limits.push(`      ${v.memPctKey || v.memKey}: ${memValue}`);
      }
    }

    if (v.coreKey && coreMode !== 'none') {
      if (coreMode === 'value') {
        limits.push(`      ${v.coreKey}: ${coreValue}`);
      } else if (coreMode === 'percentage' && v.corePctKey) {
        limits.push(`      ${v.corePctKey}: ${coreValue}`);
      }
    }

    if (advanced) {
      if (deviceType && v.typeKey) {
        annotations.push(`    ${v.typeKey}: ${JSON.stringify(deviceType)}`);
      }
      if (deviceUuid && v.uuidKey) {
        annotations.push(`    ${v.uuidKey}: ${JSON.stringify(deviceUuid)}`);
      }
    }

    let code = `apiVersion: v1
kind: Pod
metadata:
  name: hami-${vendor.toLowerCase()}-pod
`;

    if (annotations.length > 0) {
      code += `  annotations:\n${annotations.join('\n')}\n`;
    }

    code += `spec:
  containers:
    - name: hami-container
      image: ubuntu:22.04
      command: ["sleep", "infinity"]
      resources:
        limits:
${limits.join('\n')}`;

    return code;
  }, [vendor, deviceCount, memMode, memValue, coreMode, coreValue, advanced, deviceType, deviceUuid]);

  const vInfo = VENDORS[vendor];

  return (
    <div className={styles.generatorContainer}>
      <div className={styles.controlsPanel}>
        <h3>
          <Translate id="manifest.generator.title">Resource Request Configuration</Translate>
        </h3>
        
        <div className={styles.inputGroup}>
          <label htmlFor="deviceVendor">
            <Translate id="manifest.generator.vendor">Device Vendor</Translate>
          </label>
          <select id="deviceVendor" value={vendor} onChange={(e) => {
            setVendor(e.target.value);
            setMemMode(VENDORS[e.target.value].memUnit === '%' ? 'percentage' : 'value');
          }} className={styles.select}>
            {Object.entries(VENDORS).map(([key, val]) => (
              <option key={key} value={key}>{val.name}</option>
            ))}
          </select>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="deviceCount">
            <Translate id="manifest.generator.deviceCount">Number of Devices Requested</Translate>
          </label>
          <input id="deviceCount" type="number" min="1" value={deviceCount} onChange={e => setDeviceCount(Math.max(1, parseInt(e.target.value) || 1))} className={styles.input} />
        </div>

        {vInfo.memKey && (
          <div className={styles.flexRow}>
            <div className={styles.inputGroup}>
              <label htmlFor="memMode">
                <Translate id="manifest.generator.memMode">Memory Allocation Type</Translate>
              </label>
              <select id="memMode" value={memMode} onChange={e => setMemMode(e.target.value)} className={styles.select} disabled={vInfo.memUnit === '%'}>
                {vInfo.memUnit !== '%' && (
                  <option value="value">
                    {translate({ id: 'manifest.generator.memMode.absolute', message: 'Absolute (MiB)' })}
                  </option>
                )}
                {(vInfo.memPctKey || vInfo.memUnit === '%') && (
                  <option value="percentage">
                    {translate({ id: 'manifest.generator.memMode.percentage', message: 'Percentage (%)' })}
                  </option>
                )}
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="memValue">
                <Translate id="manifest.generator.memValue">Memory Value</Translate>
              </label>
              <input id="memValue" type="number" min="0" value={memValue} onChange={e => setMemValue(Math.max(0, parseInt(e.target.value) || 0))} className={styles.input} />
            </div>
          </div>
        )}

        {vInfo.coreKey && (
          <div className={styles.flexRow}>
            <div className={styles.inputGroup}>
              <label htmlFor="coreMode">
                <Translate id="manifest.generator.coreMode">Core Allocation</Translate>
              </label>
              <select id="coreMode" value={coreMode} onChange={e => setCoreMode(e.target.value)} className={styles.select}>
                <option value="none">
                  {translate({ id: 'manifest.generator.coreMode.none', message: 'None (Default)' })}
                </option>
                <option value="value">
                  {translate({ id: 'manifest.generator.coreMode.absolute', message: 'Absolute Cores' })}
                </option>
                {vInfo.corePctKey && (
                  <option value="percentage">
                    {translate({ id: 'manifest.generator.coreMode.percentage', message: 'Percentage (%)' })}
                  </option>
                )}
              </select>
            </div>
            {coreMode !== 'none' && (
              <div className={styles.inputGroup}>
                <label htmlFor="coreValue">
                  <Translate id="manifest.generator.coreValue">Core Value</Translate>
                </label>
                <input id="coreValue" type="number" min="0" value={coreValue} onChange={e => setCoreValue(Math.max(0, parseInt(e.target.value) || 0))} className={styles.input} />
              </div>
            )}
          </div>
        )}

        <button type="button" aria-expanded={advanced} className={clsx(styles.advancedToggle, styles.interactiveText)} onClick={() => setAdvanced(!advanced)} style={{ background: 'none', border: 'none', padding: 0 }}>
          <span>
            {advanced ? '▼ ' : '▶ '}
            <Translate id="manifest.generator.advanced">Advanced Configurations (Device Type / UUID)</Translate>
          </span>
        </button>

        {advanced && vInfo.typeKey && (
          <div className={styles.inputGroup}>
            <label htmlFor="deviceType">
              <Translate id="manifest.generator.deviceType">Specific Device Type Constraints (e.g. NVIDIA-A100)</Translate>
            </label>
            <input id="deviceType" type="text" value={deviceType} onChange={e => setDeviceType(e.target.value)} placeholder={translate({ id: 'manifest.generator.emptyPlaceholder', message: 'Leave empty for any' })} className={styles.input} />
          </div>
        )}

        {advanced && vInfo.uuidKey && (
          <div className={styles.inputGroup}>
            <label htmlFor="deviceUuid">
              <Translate id="manifest.generator.deviceUuid">Specific Device UUID (e.g. GPU-fef808...)</Translate>
            </label>
            <input id="deviceUuid" type="text" value={deviceUuid} onChange={e => setDeviceUuid(e.target.value)} placeholder={translate({ id: 'manifest.generator.emptyPlaceholder', message: 'Leave empty for any' })} className={styles.input} />
          </div>
        )}

      </div>

      <div className={styles.previewPanel}>
        <h3>
          <Translate id="manifest.generator.previewTitle">Generated YAML Manifest</Translate>
        </h3>
        <p>
          <Translate id="manifest.generator.previewDesc">Integrate this into your Kubernetes Pod or Deployment spec.</Translate>
        </p>
        <CodeBlock language="yaml" title="pod.yaml">
          {yamlCode}
        </CodeBlock>
      </div>
    </div>
  );
}
