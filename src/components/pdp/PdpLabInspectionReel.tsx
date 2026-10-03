import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play, Pause, RotateCcw, Volume2, VolumeX, ShieldCheck,
  BatteryCharging, Smartphone, X, Sparkles, Award
} from 'lucide-react';
import { RefreshCw } from 'lucide-react';

interface PdpLabInspectionReelProps {
  isOpen: boolean;
  onClose: () => void;
  brand?: string;
  model?: string;
  batteryHealth?: number;
}

const PHASES = [
  {
    start: 0,
    end: 1.4,
    title: 'Precision Tech Lab Intake',
    subtitle: 'Diagnostic Station #04 · London Technical Center',
    icon: RefreshCw,
    tag: 'Phase 1 / 4',
    badge: 'Ultrasonic Decontamination',
  },
  {
    start: 1.4,
    end: 2.8,
    title: 'Power & Battery Calibration',
    subtitle: 'Thermal discharge, peak load & cycle endurance audit',
    icon: BatteryCharging,
    tag: 'Phase 2 / 4',
    badge: '85%+ Battery Guaranteed',
  },
  {
    start: 2.8,
    end: 4.2,
    title: '70-Point Hardware & Display Audit',
    subtitle: 'TrueTone / OLED response, 4K multi-lens cameras & 5G bands',
    icon: Smartphone,
    tag: 'Phase 3 / 4',
    badge: '100% OEM Tested',
  },
  {
    start: 4.2,
    end: 5.8,
    title: 'LeHart Certified Seal & Boxed',
    subtitle: 'Cryptographic data wipe · 12-Month Warranty locked in',
    icon: ShieldCheck,
    tag: 'Phase 4 / 4',
    badge: 'Passed & Dispatched',
  },
];

export default function PdpLabInspectionReel({
  isOpen,
  onClose,
  brand = 'Apple',
  model = 'iPhone 15 Pro',
  batteryHealth = 85,
}: PdpLabInspectionReelProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0); // in seconds: 0 to 5.8
  const [isMuted, setIsMuted] = useState(true);
  const totalDuration = 5.8;
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play synthetic diagnostic beep using Web Audio API
  const playBeep = (freq: number, type: OscillatorType = 'sine', duration: number = 0.08) => {
    if (isMuted || typeof window === 'undefined') return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // AudioContext not allowed without gesture
    }
  };

  // Timer loop
  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setIsPlaying(true);
      return;
    }

    let lastTime = performance.now();
    let animId: number;

    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (isPlaying) {
        setProgress((prev) => {
          const next = prev + dt;
          if (next >= totalDuration) {
            setIsPlaying(false);
            playBeep(880, 'sine', 0.2); // completion chime
            return totalDuration;
          }
          return next;
        });
      }
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, isPlaying]);

  // Current active phase
  const currentPhaseIndex = PHASES.findIndex(
    (p) => progress >= p.start && progress <= p.end
  );
  const currentPhase = PHASES[currentPhaseIndex === -1 ? PHASES.length - 1 : currentPhaseIndex];

  // Sound triggers at phase transitions
  useEffect(() => {
    if (!isPlaying) return;
    if (progress > 1.35 && progress < 1.45) playBeep(520);
    if (progress > 2.75 && progress < 2.85) playBeep(660);
    if (progress > 4.15 && progress < 4.25) playBeep(780);
  }, [progress, isPlaying]);

  const handleRestart = () => {
    setProgress(0);
    setIsPlaying(true);
    playBeep(440);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="6-Second Certified Lab Inspection Reel"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(10, 10, 15, 0.88)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '720px',
          aspectRatio: '16/9',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          background: '#090d14',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Lab Background Image with animated HUD overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url(/assets/lehart-lab-inspection.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.65,
            filter: 'brightness(0.9)',
          }}
        />

        {/* Cinematic Gradient Scrim */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(6,10,18,0.7) 0%, rgba(6,10,18,0.2) 40%, rgba(6,10,18,0.92) 100%)',
          }}
        />

        {/* Laser Grid Scanner Animation */}
        <motion.div
          animate={{ y: ['0%', '100%', '0%'] }}
          transition={{ duration: 2.2, ease: 'easeInOut', repeat: Infinity }}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.8), transparent)',
            boxShadow: '0 0 16px rgba(6,182,212,0.9)',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />

        {/* ── Top Header Bar ── */}
        <div
          style={{
            position: 'relative',
            zIndex: 3,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo & Lab Watermark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--brand-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 0 12px rgba(6,182,212,0.5)',
              }}
            >
              <RefreshCw size={17} strokeWidth={2.6} />
            </span>
            <div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 800, color: 'white', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                LeHart Technical Lab
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                Certified Refurbishment · Live Inspection Feed
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setIsMuted(!isMuted)}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>

            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Center Stage Cinematic Showcase ── */}
        <div
          style={{
            position: 'relative',
            zIndex: 3,
            padding: '0 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPhase.tag}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ duration: 0.28 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
            >
              {/* Badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  background: 'rgba(6, 182, 212, 0.22)',
                  border: '1px solid rgba(6, 182, 212, 0.45)',
                  color: '#67e8f9',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <Sparkles size={12} /> {currentPhase.badge}
              </div>

              {/* Title */}
              <h2
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'clamp(20px, 4vw, 28px)',
                  fontWeight: 900,
                  color: 'white',
                  letterSpacing: '-0.02em',
                  textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                }}
              >
                {currentPhase.title}
              </h2>

              {/* Subtitle */}
              <p
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-body)',
                  fontSize: 'clamp(13px, 2vw, 15px)',
                  color: 'rgba(255, 255, 255, 0.85)',
                  maxWidth: '520px',
                  lineHeight: 1.5,
                }}
              >
                {currentPhase.subtitle}
              </p>

              {/* Real-time Telemetry Cues */}
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  marginTop: '8px',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: '11px', color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(16,185,129,0.3)', fontWeight: 600 }}>
                  ✓ Battery Health: {batteryHealth}% Peak
                </span>
                <span style={{ fontSize: '11px', color: '#38bdf8', background: 'rgba(56,189,248,0.15)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(56,189,248,0.3)', fontWeight: 600 }}>
                  ✓ Display: TrueTone Calibrated
                </span>
                <span style={{ fontSize: '11px', color: '#a855f7', background: 'rgba(168,85,247,0.15)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(168,85,247,0.3)', fontWeight: 600 }}>
                  ✓ 12-Month LeHart Warranty
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Bottom Controls & Progress Timeline ── */}
        <div
          style={{
            position: 'relative',
            zIndex: 3,
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {/* Progress Bar with 4 Phase Markers */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '4px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.2)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(progress / totalDuration) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--brand-cyan), #38bdf8)',
                boxShadow: '0 0 10px rgba(6,182,212,0.8)',
                transition: 'width 0.1s linear',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => {
                  if (progress >= totalDuration) {
                    handleRestart();
                  } else {
                    setIsPlaying(!isPlaying);
                  }
                }}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                style={{
                  background: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--black)',
                  cursor: 'pointer',
                  fontWeight: 800,
                }}
              >
                {progress >= totalDuration ? <RotateCcw size={15} /> : isPlaying ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: '2px' }} />}
              </button>

              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                {progress.toFixed(1)}s / {totalDuration.toFixed(1)}s
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
              <Award size={13} style={{ color: 'var(--brand-cyan)' }} /> Tested for {brand} {model}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
