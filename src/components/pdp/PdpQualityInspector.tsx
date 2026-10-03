import { useState } from 'react';
import Modal from '../ui/Modal';
import {
  ShieldCheck, BatteryCharging, Smartphone, Camera,
  Wifi, Lock, CheckCircle2, ChevronRight, Award
} from 'lucide-react';

interface PdpQualityInspectorProps {
  brand: string;
  model: string;
  batteryHealth?: number;
  onWatchLabVideo?: () => void;
}

const CHECK_CATEGORIES = [
  {
    id: 'battery',
    title: 'Battery & Power',
    icon: BatteryCharging,
    count: 12,
    highlights: ['85%+ minimum capacity guaranteed', 'Thermal discharge test passed', 'Peak performance capacity verified', 'Fast charging circuit validated'],
  },
  {
    id: 'display',
    title: 'Display & Touch',
    icon: Smartphone,
    count: 14,
    highlights: ['Multi-touch responsiveness 100%', 'TrueTone / ProMotion calibrated', 'Zero dead or stuck pixels', 'Oleophobic coating inspection'],
  },
  {
    id: 'cameras',
    title: 'Cameras & Sensors',
    icon: Camera,
    count: 16,
    highlights: ['Optical Image Stabilization active', 'Ultra-Wide & Telephoto focus aligned', 'Face ID / Fingerprint sensor pass', '4K/60fps video & mic sync checked'],
  },
  {
    id: 'network',
    title: 'Connectivity & SIM',
    icon: Wifi,
    count: 10,
    highlights: ['100% Unlocked for all UK & global networks', '5G / 4G LTE cellular band verification', 'Wi-Fi 6E & Bluetooth 5.3 range test', 'NFC & contactless payment verified'],
  },
  {
    id: 'security',
    title: 'Data & Sanitization',
    icon: Lock,
    count: 18,
    highlights: ['Cryptographic military-grade data wipe', 'iCloud / Google FRP account locks removed', 'IMEI clean status checked on CheckMEND', 'Ultrasonic chassis acoustic cleaning'],
  },
];

export default function PdpQualityInspector({ brand, model, batteryHealth = 85, onWatchLabVideo }: PdpQualityInspectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const isApple = brand.trim().toLowerCase() === 'apple';

  return (
    <>
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.06) 0%, rgba(59, 130, 246, 0.04) 100%)',
          border: '1px solid rgba(6, 182, 212, 0.22)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginTop: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={20} style={{ color: 'var(--brand-cyan)', flexShrink: 0 }} />
            <div>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 800, color: 'var(--black)', letterSpacing: '-0.01em' }}>
                LeHart 70-Point Certified Inspection
              </span>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-60)' }}>
                Every component verified by specialist UK technicians
              </div>
            </div>
          </div>
          <span
            style={{
              padding: '4px 8px',
              borderRadius: '999px',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#065f46',
              fontWeight: 700,
              fontSize: '11px',
              whiteSpace: 'nowrap',
            }}
          >
            ✓ 100% Passed
          </span>
        </div>

        {/* Quick inspection pills */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          <div style={{ background: 'white', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--grey-15)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--grey-50)', fontWeight: 600 }}>Battery Health</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--color-trust-text)', fontWeight: 800 }}>
              {isApple ? `${batteryHealth}%+ guaranteed` : `${batteryHealth}% recorded`}
            </div>
          </div>
          <div style={{ background: 'white', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--grey-15)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--grey-50)', fontWeight: 600 }}>Network Lock</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--color-trust-text)', fontWeight: 800 }}>100% Unlocked</div>
          </div>
          <div style={{ background: 'white', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--grey-15)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--grey-50)', fontWeight: 600 }}>Warranty</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--color-trust-text)', fontWeight: 800 }}>12-Mo Included</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontFamily: 'var(--font-sans)',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--brand-cyan)',
              cursor: 'pointer',
            }}
          >
            View all 70 technical checks <ChevronRight size={14} />
          </button>

          {onWatchLabVideo && (
            <button
              type="button"
              onClick={onWatchLabVideo}
              style={{
                background: 'rgba(6, 182, 212, 0.08)',
                border: '1px solid rgba(6, 182, 212, 0.25)',
                borderRadius: '999px',
                padding: '3px 8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontFamily: 'var(--font-sans)',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--brand-header)',
                cursor: 'pointer',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--brand-cyan)' }} />
              Watch 6s lab video
            </button>
          )}
        </div>
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={`70-Point Inspection — ${brand} ${model}`} width={680}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-70)', margin: 0, lineHeight: 1.6 }}>
            Unlike peer-to-peer marketplaces, every LeHart phone undergoes an automated 70-point software and hardware diagnostics run by certified technicians before being cleaned, packaged, and graded.
          </p>

          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
            {CHECK_CATEGORIES.map((cat, idx) => {
              const Icon = cat.icon;
              const isActive = activeTab === idx;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: isActive ? '1.5px solid var(--brand-cyan)' : '1px solid var(--grey-20)',
                    background: isActive ? 'rgba(6, 182, 212, 0.08)' : 'var(--grey-5)',
                    color: isActive ? 'var(--brand-header)' : 'var(--grey-70)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={14} style={{ color: isActive ? 'var(--brand-cyan)' : 'inherit' }} />
                  {cat.title} ({cat.count})
                </button>
              );
            })}
          </div>

          {/* Active checklist details */}
          <div style={{ background: 'var(--grey-5)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--grey-15)' }}>
            <h4 style={{ margin: '0 0 12px 0', fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 800, color: 'var(--black)' }}>
              {CHECK_CATEGORIES[activeTab].title} ({CHECK_CATEGORIES[activeTab].count} Tests Verified)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
              {CHECK_CATEGORIES[activeTab].highlights.map((item) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--grey-80)' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--color-trust-text)', flexShrink: 0 }} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <ShieldCheck size={20} style={{ color: 'var(--color-trust-text)', flexShrink: 0 }} />
            <div style={{ fontSize: '12px', color: '#065f46', lineHeight: 1.5 }}>
              <strong>12-Month LeHart Warranty Backed:</strong> Should any verified component fail within 365 days of purchase, we repair or replace it with priority shipping at zero charge.
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
