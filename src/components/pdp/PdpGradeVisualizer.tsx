import { useState } from 'react';
import { Sparkles, Check, Info } from 'lucide-react';
import { ProductGrade } from '../../types';

interface PdpGradeVisualizerProps {
  currentGrade?: ProductGrade;
  onSelectGrade?: (grade: ProductGrade) => void;
}

const GRADE_DATA: Record<string, {
  label: string;
  badge: string;
  screen: string;
  body: string;
  battery: string;
  savings: string;
  badgeClass: string;
  description: string;
}> = {
  Pristine: {
    label: 'Pristine',
    badge: 'Flawless condition',
    screen: '100% scratch-free under direct studio light',
    body: 'Indistinguishable from brand new; zero cosmetic wear',
    battery: '95%+ maximum capacity guarantee',
    savings: 'Save up to 40% vs retail brand new',
    badgeClass: 'badge-pristine',
    description: 'Looks and feels like you just unboxed a brand new device from the manufacturer store.',
  },
  Excellent: {
    label: 'Excellent',
    badge: 'Our most popular choice',
    screen: 'Pristine screen with no scratches',
    body: 'Micro-scuffs invisible from 20cm away; exceptional finish',
    battery: '90%+ maximum capacity guarantee',
    savings: 'Save up to 55% vs retail brand new',
    badgeClass: 'badge-excellent',
    description: 'The sweet spot for value: pristine display, almost imperceptible casing marks, huge savings.',
  },
  Good: {
    label: 'Good',
    badge: 'Best budget value',
    screen: 'May have minor surface hairline marks (invisible when screen is on)',
    body: 'Light cosmetic edge scuffs or scratches from normal daily case use',
    battery: '85%+ minimum capacity guarantee',
    savings: 'Save up to 70% vs retail brand new',
    badgeClass: 'badge-good',
    description: 'Fully tested internal hardware with normal cosmetic wear. Put a case on it and it looks great.',
  },
};

export default function PdpGradeVisualizer({ currentGrade = 'Pristine', onSelectGrade }: PdpGradeVisualizerProps) {
  const [activeGrade, setActiveGrade] = useState<string>(
    ['Pristine', 'Excellent', 'Good'].includes(currentGrade) ? currentGrade : 'Pristine'
  );

  const selected = GRADE_DATA[activeGrade] || GRADE_DATA.Pristine;

  return (
    <div
      style={{
        background: 'var(--grey-5)',
        border: '1px solid var(--grey-15)',
        borderRadius: 'var(--radius-xl)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginTop: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} style={{ color: 'var(--brand-cyan)' }} />
          <h3 style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 800, color: 'var(--black)' }}>
            Compare Cosmetic Grades
          </h3>
        </div>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-50)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Info size={13} /> 100% functional on every grade
        </span>
      </div>

      {/* Grade Selector Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {(['Pristine', 'Excellent', 'Good'] as const).map((grade) => {
          const isActive = activeGrade === grade;
          return (
            <button
              key={grade}
              type="button"
              onClick={() => {
                setActiveGrade(grade);
                if (onSelectGrade) onSelectGrade(grade as ProductGrade);
              }}
              style={{
                padding: '12px 8px',
                borderRadius: 'var(--radius-md)',
                border: isActive ? '2px solid var(--brand-cyan)' : '1px solid var(--grey-20)',
                background: isActive ? 'white' : 'var(--grey-10)',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
              }}
            >
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 800, color: isActive ? 'var(--black)' : 'var(--grey-70)' }}>
                {grade}
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 700, color: isActive ? 'var(--brand-cyan)' : 'var(--grey-50)', marginTop: '2px' }}>
                {GRADE_DATA[grade].badge}
              </div>
            </button>
          );
        })}
      </div>

      {/* Grade Details Table */}
      <div style={{ background: 'white', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--grey-15)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-70)', lineHeight: 1.6 }}>
          {selected.description}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', paddingTop: '8px', borderTop: '1px solid var(--grey-10)' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, color: 'var(--grey-50)', textTransform: 'uppercase' }}>Screen Condition</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--black)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={14} style={{ color: 'var(--color-trust-text)', flexShrink: 0 }} /> {selected.screen}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, color: 'var(--grey-50)', textTransform: 'uppercase' }}>Body & Chassis</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--black)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={14} style={{ color: 'var(--color-trust-text)', flexShrink: 0 }} /> {selected.body}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, color: 'var(--grey-50)', textTransform: 'uppercase' }}>Battery Minimum</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--black)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={14} style={{ color: 'var(--color-trust-text)', flexShrink: 0 }} /> {selected.battery}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, color: 'var(--grey-50)', textTransform: 'uppercase' }}>Value Advantage</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--color-trust-text)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={14} style={{ color: 'var(--color-trust-text)', flexShrink: 0 }} /> {selected.savings}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
