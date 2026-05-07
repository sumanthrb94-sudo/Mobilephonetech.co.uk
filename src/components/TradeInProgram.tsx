import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Smartphone, Banknote, PackageCheck, Lightbulb, CheckCircle2, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const STEPS = [
  {
    num: '01',
    icon: Smartphone,
    title: 'Tell us about your device',
    body: 'Choose your phone model and condition. Get an instant estimate — no forms, no waiting.',
  },
  {
    num: '02',
    icon: Banknote,
    title: 'Accept our offer',
    body: "Happy with the price? Lock it in. We'll email a free prepaid return label immediately.",
  },
  {
    num: '03',
    icon: PackageCheck,
    title: 'Get paid within 24 hours',
    body: 'We inspect your device and transfer the full agreed amount to your bank. No surprises.',
  },
];

type Condition = 'Pristine' | 'Excellent' | 'Good' | 'Fair';
type Brand = 'Apple' | 'Samsung' | 'Google' | 'Sony' | 'Other';

interface ModelEntry {
  name: string;
  prices: Record<Condition, number>;
}

const TRADE_IN_DATA: Record<Brand, ModelEntry[]> = {
  Apple: [
    { name: 'iPhone 17 Pro Max', prices: { Pristine: 800, Excellent: 700, Good: 600, Fair: 450 } },
    { name: 'iPhone 17 Pro',     prices: { Pristine: 700, Excellent: 600, Good: 500, Fair: 380 } },
    { name: 'iPhone 17',         prices: { Pristine: 600, Excellent: 500, Good: 420, Fair: 320 } },
    { name: 'iPhone 16 Pro Max', prices: { Pristine: 650, Excellent: 560, Good: 480, Fair: 380 } },
    { name: 'iPhone 16 Pro',     prices: { Pristine: 580, Excellent: 500, Good: 420, Fair: 320 } },
    { name: 'iPhone 16 Plus',    prices: { Pristine: 520, Excellent: 440, Good: 360, Fair: 280 } },
    { name: 'iPhone 16',         prices: { Pristine: 480, Excellent: 400, Good: 340, Fair: 260 } },
    { name: 'iPhone 15 Pro Max', prices: { Pristine: 550, Excellent: 470, Good: 390, Fair: 300 } },
    { name: 'iPhone 15 Pro',     prices: { Pristine: 500, Excellent: 420, Good: 350, Fair: 270 } },
    { name: 'iPhone 15 Plus',    prices: { Pristine: 420, Excellent: 350, Good: 280, Fair: 215 } },
    { name: 'iPhone 15',         prices: { Pristine: 380, Excellent: 320, Good: 260, Fair: 200 } },
    { name: 'iPhone 14 Pro Max', prices: { Pristine: 450, Excellent: 380, Good: 320, Fair: 250 } },
    { name: 'iPhone 14 Pro',     prices: { Pristine: 400, Excellent: 340, Good: 280, Fair: 220 } },
    { name: 'iPhone 14',         prices: { Pristine: 320, Excellent: 270, Good: 220, Fair: 170 } },
    { name: 'iPhone 13 Pro Max', prices: { Pristine: 350, Excellent: 295, Good: 240, Fair: 185 } },
    { name: 'iPhone 13 Pro',     prices: { Pristine: 310, Excellent: 260, Good: 210, Fair: 165 } },
    { name: 'iPhone 13',         prices: { Pristine: 280, Excellent: 235, Good: 190, Fair: 150 } },
    { name: 'iPhone 12 Pro Max', prices: { Pristine: 260, Excellent: 215, Good: 175, Fair: 135 } },
    { name: 'iPhone 12',         prices: { Pristine: 200, Excellent: 165, Good: 135, Fair: 105 } },
    { name: 'iPhone 11',         prices: { Pristine: 140, Excellent: 115, Good: 90,  Fair: 70  } },
  ],
  Samsung: [
    { name: 'Galaxy S24 Ultra', prices: { Pristine: 700, Excellent: 600, Good: 500, Fair: 380 } },
    { name: 'Galaxy S24+',      prices: { Pristine: 580, Excellent: 490, Good: 410, Fair: 310 } },
    { name: 'Galaxy S24',       prices: { Pristine: 480, Excellent: 400, Good: 330, Fair: 260 } },
    { name: 'Galaxy S23 Ultra', prices: { Pristine: 550, Excellent: 460, Good: 380, Fair: 290 } },
    { name: 'Galaxy S23+',      prices: { Pristine: 430, Excellent: 360, Good: 300, Fair: 230 } },
    { name: 'Galaxy S23',       prices: { Pristine: 380, Excellent: 320, Good: 260, Fair: 200 } },
    { name: 'Galaxy S22 Ultra', prices: { Pristine: 430, Excellent: 360, Good: 300, Fair: 230 } },
    { name: 'Galaxy S22',       prices: { Pristine: 280, Excellent: 235, Good: 190, Fair: 150 } },
    { name: 'Galaxy Z Fold 5',  prices: { Pristine: 750, Excellent: 640, Good: 530, Fair: 400 } },
    { name: 'Galaxy Z Flip 5',  prices: { Pristine: 480, Excellent: 400, Good: 330, Fair: 250 } },
    { name: 'Galaxy A55',       prices: { Pristine: 220, Excellent: 185, Good: 150, Fair: 115 } },
    { name: 'Galaxy A54',       prices: { Pristine: 180, Excellent: 150, Good: 120, Fair: 90  } },
  ],
  Google: [
    { name: 'Pixel 9 Pro XL', prices: { Pristine: 650, Excellent: 550, Good: 460, Fair: 350 } },
    { name: 'Pixel 9 Pro',    prices: { Pristine: 560, Excellent: 470, Good: 390, Fair: 300 } },
    { name: 'Pixel 9',        prices: { Pristine: 450, Excellent: 380, Good: 310, Fair: 240 } },
    { name: 'Pixel 8 Pro',    prices: { Pristine: 480, Excellent: 400, Good: 330, Fair: 250 } },
    { name: 'Pixel 8',        prices: { Pristine: 380, Excellent: 320, Good: 260, Fair: 200 } },
    { name: 'Pixel 7 Pro',    prices: { Pristine: 350, Excellent: 290, Good: 240, Fair: 180 } },
    { name: 'Pixel 7a',       prices: { Pristine: 280, Excellent: 235, Good: 190, Fair: 145 } },
    { name: 'Pixel 7',        prices: { Pristine: 300, Excellent: 250, Good: 200, Fair: 155 } },
    { name: 'Pixel 6 Pro',    prices: { Pristine: 250, Excellent: 210, Good: 170, Fair: 130 } },
    { name: 'Pixel 6',        prices: { Pristine: 200, Excellent: 165, Good: 135, Fair: 105 } },
  ],
  Sony: [
    { name: 'Xperia 1 VI',  prices: { Pristine: 600, Excellent: 500, Good: 410, Fair: 310 } },
    { name: 'Xperia 5 V',   prices: { Pristine: 450, Excellent: 375, Good: 310, Fair: 235 } },
    { name: 'Xperia 1 V',   prices: { Pristine: 500, Excellent: 415, Good: 345, Fair: 260 } },
    { name: 'Xperia 10 V',  prices: { Pristine: 280, Excellent: 235, Good: 190, Fair: 145 } },
  ],
  Other: [
    { name: 'OnePlus 12',    prices: { Pristine: 380, Excellent: 320, Good: 260, Fair: 200 } },
    { name: 'Motorola Edge', prices: { Pristine: 220, Excellent: 180, Good: 145, Fair: 110 } },
    { name: 'Xiaomi 14',     prices: { Pristine: 300, Excellent: 250, Good: 200, Fair: 155 } },
  ],
};

const CONDITIONS: { value: Condition; label: string; hint: string }[] = [
  { value: 'Pristine',  label: 'Pristine',   hint: 'Like new, no marks' },
  { value: 'Excellent', label: 'Excellent',   hint: 'Minor light scratches' },
  { value: 'Good',      label: 'Good',        hint: 'Visible wear, fully working' },
  { value: 'Fair',      label: 'Fair',        hint: 'Heavy wear or minor fault' },
];

const BRANDS: Brand[] = ['Apple', 'Samsung', 'Google', 'Sony', 'Other'];

type FormStep = 'brand' | 'model' | 'condition' | 'quote' | 'submitted';

export default function TradeInProgram() {
  const { user } = useAuth();
  const [formStep, setFormStep] = useState<FormStep>('brand');
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelEntry | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<Condition | null>(null);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const quoteValue = selectedModel && selectedCondition
    ? selectedModel.prices[selectedCondition]
    : null;

  const handleBrandSelect = (brand: Brand) => {
    setSelectedBrand(brand);
    setSelectedModel(null);
    setSelectedCondition(null);
    setFormStep('model');
  };

  const handleModelSelect = (model: ModelEntry) => {
    setSelectedModel(model);
    setSelectedCondition(null);
    setFormStep('condition');
  };

  const handleConditionSelect = (c: Condition) => {
    setSelectedCondition(c);
    setFormStep('quote');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBrand || !selectedModel || !selectedCondition) return;
    const contactEmail = user?.email ?? email;
    if (!contactEmail) { setError('Please enter your email.'); return; }
    setIsSubmitting(true);
    setError('');
    try {
      await (supabase.from('trade_in_quotes') as any).insert({
        user_id: user?.id ?? null,
        email: contactEmail,
        device_brand: selectedBrand,
        device_model: selectedModel.name,
        device_condition: selectedCondition,
        estimated_value: quoteValue,
        status: 'quoted',
      });
      setFormStep('submitted');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormStep('brand');
    setSelectedBrand(null);
    setSelectedModel(null);
    setSelectedCondition(null);
    setEmail('');
    setError('');
  };

  return (
    <section
      className="section-y"
      style={{ background: 'var(--color-surface-inverse)' }}
      id="trade-in"
    >
      <div className="container-bm" style={{ maxWidth: 'var(--container-max)' }}>
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* ── Left: Copy + Steps ──────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease: [0.2, 0, 0, 1] }}
          >
            <div
              style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '4px 12px', borderRadius: 'var(--radius-full)',
                background: 'rgba(0, 186, 219, 0.15)', border: '1px solid rgba(0, 186, 219, 0.35)',
                fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand-cyan)',
                marginBottom: 'var(--spacing-20)',
              }}
            >
              Trade-In Programme
            </div>

            <h2
              style={{
                fontFamily: 'var(--font-serif)', fontSize: 'clamp(34px, 4.5vw, 56px)',
                fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.05,
                color: 'white', marginBottom: 'var(--spacing-16)',
              }}
            >
              Turn your old phone<br />
              into <span style={{ color: 'var(--brand-cyan)' }}>cash today.</span>
            </h2>

            <p style={{ fontFamily: 'var(--font-body)', fontSize: '17px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, maxWidth: '420px', marginBottom: 'var(--spacing-40)' }}>
              Ready for an upgrade? We give you a fair, instant valuation and
              fast bank transfer. No haggling, no hidden deductions.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-24)', marginBottom: 'var(--spacing-40)' }}>
              {STEPS.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  style={{ display: 'flex', gap: 'var(--spacing-16)', alignItems: 'flex-start' }}
                >
                  <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'rgba(0, 186, 219, 0.15)', border: '1px solid rgba(0, 186, 219, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <step.icon size={18} style={{ color: 'var(--brand-cyan)' }} />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand-cyan)', marginBottom: '4px' }}>
                      Step {step.num}
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '4px', letterSpacing: '-0.015em' }}>
                      {step.title}
                    </h3>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                      {step.body}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ── Right: Interactive Quote Card ───── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.15 }}
          >
            <div style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
              {/* Card header */}
              <div style={{ padding: 'var(--spacing-16) var(--spacing-24)', background: 'rgba(0, 186, 219, 0.12)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '14px', color: 'white' }}>
                  Get an instant quote
                </span>
                {formStep !== 'brand' && formStep !== 'submitted' && (
                  <button
                    onClick={resetForm}
                    style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--brand-cyan)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Start over
                  </button>
                )}
              </div>

              {/* Progress bar */}
              {formStep !== 'submitted' && (
                <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)' }}>
                  <div
                    style={{
                      height: '100%',
                      background: 'var(--brand-cyan)',
                      transition: 'width 0.4s ease',
                      width: formStep === 'brand' ? '0%' : formStep === 'model' ? '33%' : formStep === 'condition' ? '66%' : '100%',
                    }}
                  />
                </div>
              )}

              {/* Card body */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: 'var(--spacing-24)', minHeight: '340px' }}>
                <AnimatePresence mode="wait">

                  {/* Step 1: Brand */}
                  {formStep === 'brand' && (
                    <motion.div key="brand" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.22 }}>
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--spacing-16)' }}>
                        Select your brand
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {BRANDS.map((b) => (
                          <button
                            key={b}
                            onClick={() => handleBrandSelect(b)}
                            style={{
                              padding: '14px 16px', borderRadius: '10px',
                              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                              color: 'white', fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600,
                              cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,186,219,0.15)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,186,219,0.4)'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
                          >
                            {b}
                            <ChevronDown size={14} style={{ transform: 'rotate(-90deg)', color: 'rgba(255,255,255,0.4)' }} />
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Model */}
                  {formStep === 'model' && selectedBrand && (
                    <motion.div key="model" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.22 }}>
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--spacing-16)' }}>
                        Select your {selectedBrand} model
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                        {TRADE_IN_DATA[selectedBrand].map((m) => (
                          <button
                            key={m.name}
                            onClick={() => handleModelSelect(m)}
                            style={{
                              padding: '12px 16px', borderRadius: '10px',
                              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                              color: 'white', fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 500,
                              cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,186,219,0.15)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,186,219,0.4)'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
                          >
                            <span>{m.name}</span>
                            <span style={{ fontSize: '13px', color: 'var(--brand-cyan)', fontWeight: 700 }}>
                              up to £{m.prices.Pristine}
                            </span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Condition */}
                  {formStep === 'condition' && (
                    <motion.div key="condition" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.22 }}>
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--spacing-16)' }}>
                        What condition is your {selectedModel?.name}?
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {CONDITIONS.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => handleConditionSelect(c.value)}
                            style={{
                              padding: '14px 16px', borderRadius: '10px',
                              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                              color: 'white', fontFamily: 'var(--font-sans)', cursor: 'pointer',
                              textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,186,219,0.15)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,186,219,0.4)'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
                          >
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '2px' }}>{c.label}</div>
                              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontWeight: 400 }}>{c.hint}</div>
                            </div>
                            <span style={{ fontSize: '15px', color: 'var(--brand-cyan)', fontWeight: 700 }}>
                              £{selectedModel?.prices[c.value]}
                            </span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 4: Quote + email */}
                  {formStep === 'quote' && (
                    <motion.div key="quote" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.22 }}>
                      {/* Quote display */}
                      <div style={{ textAlign: 'center', padding: 'var(--spacing-20) 0', marginBottom: 'var(--spacing-20)', background: 'rgba(0,186,219,0.08)', borderRadius: '12px', border: '1px solid rgba(0,186,219,0.2)' }}>
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                          Your instant offer
                        </div>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '48px', fontWeight: 700, color: 'var(--brand-cyan)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                          £{quoteValue}
                        </div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
                          {selectedModel?.name} · {selectedCondition}
                        </div>
                      </div>

                      <form onSubmit={handleSubmit}>
                        {!user && (
                          <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>
                              Email address
                            </label>
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="you@example.com"
                              required
                              style={{
                                width: '100%', padding: '10px 14px', borderRadius: '8px',
                                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                                color: 'white', fontFamily: 'var(--font-body)', fontSize: '14px',
                                boxSizing: 'border-box', outline: 'none',
                              }}
                            />
                          </div>
                        )}
                        {error && (
                          <p style={{ color: '#f87171', fontSize: '13px', fontFamily: 'var(--font-body)', marginBottom: '10px' }}>{error}</p>
                        )}
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="btn btn-primary btn-md btn-full"
                          style={{ marginBottom: '10px' }}
                        >
                          {isSubmitting ? 'Locking in your quote…' : 'Accept offer & get prepaid label'}
                          {!isSubmitting && <ArrowRight size={16} />}
                        </button>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 1.5 }}>
                          No obligation — your quote is valid for 14 days.
                        </p>
                      </form>
                    </motion.div>
                  )}

                  {/* Step 5: Submitted */}
                  {formStep === 'submitted' && (
                    <motion.div
                      key="submitted"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      style={{ textAlign: 'center', padding: 'var(--spacing-32) 0' }}
                    >
                      <CheckCircle2 size={48} style={{ color: 'var(--brand-cyan)', margin: '0 auto var(--spacing-16)' }} />
                      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 700, color: 'white', marginBottom: '10px' }}>
                        Quote confirmed!
                      </h3>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, maxWidth: '280px', margin: '0 auto var(--spacing-24)' }}>
                        We've emailed your prepaid label. Drop off your {selectedModel?.name} and we'll transfer <span style={{ color: 'var(--brand-cyan)', fontWeight: 700 }}>£{quoteValue}</span> within 24 hours of inspection.
                      </p>
                      <button
                        onClick={resetForm}
                        className="btn btn-md"
                        style={{ background: 'transparent', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.2)', fontFamily: 'var(--font-sans)', fontWeight: 600 }}
                      >
                        Trade in another device
                      </button>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

              {/* Footer tip */}
              {formStep === 'brand' && (
                <div style={{ padding: 'var(--spacing-16) var(--spacing-24)', background: 'rgba(0, 186, 219, 0.06)', borderTop: '1px solid rgba(0, 186, 219, 0.18)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <Lightbulb size={16} style={{ color: 'var(--brand-cyan)', flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: 0 }}>
                    <span style={{ fontWeight: 700, color: 'var(--brand-cyan)' }}>Tip: </span>
                    Trade in when buying refurbished and combine the savings. Your upgrade can cost surprisingly little.
                  </p>
                </div>
              )}
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
