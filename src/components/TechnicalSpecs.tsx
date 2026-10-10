import React from 'react';
import { ProductSpecs } from '../types';
import { SPEC_GROUPS } from '../lib/specFields';

interface TechnicalSpecsProps {
  specs: ProductSpecs;
}

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

  // No heading or top margin of its own: its only caller is the product
  // page, which wraps it in a titled "Specifications" section. Rendering
  // "Technical specifications" underneath that said the same thing twice.
  return (
    <div>

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