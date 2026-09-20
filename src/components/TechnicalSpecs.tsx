import React from 'react';
import { ProductSpecs } from '../types';

interface TechnicalSpecsProps {
  specs: ProductSpecs;
}

interface SpecGroup {
  title: string;
  items: { key: keyof ProductSpecs; label: string }[];
}

const SPEC_GROUPS: SpecGroup[] = [
  {
    title: 'Launch',
    items: [
      { key: 'os', label: 'Operating System' },
      { key: 'osVersion', label: 'OS Version' },
      { key: 'body', label: 'Body' },
      { key: 'bodyBuild', label: 'Build' },
      { key: 'bodySIM', label: 'SIM' },
      { key: 'bodyProtection', label: 'Protection' },
    ],
  },
  {
    title: 'Display',
    items: [
      { key: 'displaySize', label: 'Size' },
      { key: 'display', label: 'Type' },
      { key: 'displayResolution', label: 'Resolution' },
      { key: 'displayProtection', label: 'Protection' },
      { key: 'displayFeatures', label: 'Features' },
    ],
  },
  {
    title: 'Performance',
    items: [
      { key: 'chip', label: 'Chipset' },
      { key: 'processor', label: 'Processor' },
      { key: 'cpu', label: 'CPU' },
      { key: 'gpu', label: 'GPU' },
      { key: 'ram', label: 'RAM' },
      { key: 'storage', label: 'Storage' },
      { key: 'storageExpandable', label: 'Expandable' },
    ],
  },
  {
    title: 'Camera',
    items: [
      { key: 'mainCamera', label: 'Main Camera' },
      { key: 'mainCameraFeatures', label: 'Main Features' },
      { key: 'mainCameraVideo', label: 'Main Video' },
      { key: 'selfieCamera', label: 'Selfie Camera' },
      { key: 'selfieCameraFeatures', label: 'Selfie Features' },
      { key: 'selfieCameraVideo', label: 'Selfie Video' },
    ],
  },
  {
    title: 'Battery',
    items: [
      { key: 'battery', label: 'Capacity' },
      { key: 'batteryCharging', label: 'Charging Type' },
      { key: 'batteryChargingSpeed', label: 'Charging Speed' },
      { key: 'batteryLife', label: 'Battery Life' },
    ],
  },
  {
    title: 'Connectivity',
    items: [
      { key: 'network', label: 'Network' },
      { key: 'network2G', label: '2G Bands' },
      { key: 'network3G', label: '3G Bands' },
      { key: 'network4G', label: '4G Bands' },
      { key: 'network5G', label: '5G Bands' },
      { key: 'networkSpeed', label: 'Speed' },
      { key: 'commsWLAN', label: 'WLAN' },
      { key: 'commsBluetooth', label: 'Bluetooth' },
      { key: 'commsNFC', label: 'NFC' },
      { key: 'commsUSB', label: 'USB' },
      { key: 'commsGPS', label: 'GPS' },
    ],
  },
  {
    title: 'Physical',
    items: [
      { key: 'bodyDimensions', label: 'Dimensions' },
      { key: 'bodyWeight', label: 'Weight' },
      { key: 'miscColors', label: 'Colors' },
    ],
  },
  {
    title: 'Audio',
    items: [
      { key: 'soundLoudspeaker', label: 'Loudspeaker' },
      { key: 'soundJack', label: '3.5mm Jack' },
    ],
  },
];

function cleanValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.replace(/undefined/gi, '').trim() || undefined;
}

export default function TechnicalSpecs({ specs }: TechnicalSpecsProps) {
  const [activeTab, setActiveTab] = React.useState(0);

  const hasSpecs = SPEC_GROUPS.some(group =>
    group.items.some(item => cleanValue(specs[item.key]))
  );

  if (!hasSpecs) return null;

  const visibleGroups = SPEC_GROUPS.filter(group =>
    group.items.some(item => cleanValue(specs[item.key]))
  );

  const currentGroup = visibleGroups[activeTab] || visibleGroups[0];

  return (
    <div style={{ marginTop: 'var(--spacing-48)' }}>
      <h2
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'clamp(22px, 2.5vw, 28px)',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          marginBottom: 'var(--spacing-24)',
          color: 'var(--black)',
        }}
      >
        Technical specifications
      </h2>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Specification categories"
        style={{ display: 'flex', gap: '6px', marginBottom: 'var(--spacing-24)', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}
      >
        {visibleGroups.map((group, idx) => {
          const active = activeTab === idx;
          return (
            <button
              key={group.title}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(idx)}
              style={{
                padding: '0 16px',
                height: '36px',
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                fontWeight: active ? 700 : 600,
                border: '1.5px solid',
                borderColor: active ? 'var(--black)' : 'var(--grey-20)',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: active ? 'var(--black)' : 'var(--grey-0)',
                color: active ? 'var(--grey-0)' : 'var(--grey-60)',
                transition: 'all var(--duration-fast) var(--ease-default)',
              }}
            >
              {group.title}
            </button>
          );
        })}
      </div>

      {/* Spec Table */}
      <div style={{ background: 'var(--grey-5)', borderRadius: 'var(--radius-xl)', padding: 'var(--spacing-20)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {currentGroup.items.map((item) => {
              const value = cleanValue(specs[item.key]);
              if (!value) return null;
              return (
                <tr key={item.key} style={{ borderBottom: '1px solid var(--grey-10)' }}>
                  <td style={{ padding: '12px 0', fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 500, color: 'var(--grey-40)', width: '40%' }}>
                    {item.label}
                  </td>
                  <td style={{ padding: '12px 0', fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: 'var(--black)', textAlign: 'right' }}>
                    {value}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}