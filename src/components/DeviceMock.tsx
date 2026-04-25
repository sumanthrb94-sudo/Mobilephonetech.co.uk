import { colourHex, SCREEN, FRAME } from '../utils/deviceColors';
import { resolveFormFactor, type FormFactor } from '../utils/deviceFormFactor';

/**
 * DeviceMock — programmatic SVG product renders. One component,
 * 13 form factors, every variant colour applied to the body fill
 * so the card always shows the device the user picked.
 *
 * Why SVG instead of raster product photography:
 *   - Instant render (zero network requests)
 *   - Per-colour exactness without committing 130 raster files
 *   - Sharp at every zoom / DPR
 *   - The right device shape every time — a Z Fold renders as a Z
 *     Fold, not a Galaxy S20 FE
 */

interface Props {
  brand: string;
  model: string;
  color?: string;
  category?: string;
  alt?: string;
}

export default function DeviceMock({ brand, model, color, category, alt }: Props) {
  const formFactor = resolveFormFactor(brand, model, category);
  const body = colourHex(color, brand);

  return (
    <div
      role="img"
      aria-label={alt ?? `${brand} ${model}${color ? ` in ${color}` : ''}`}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8%',
        background: pageBackground(brand),
        boxSizing: 'border-box',
      }}
    >
      <svg
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={`bodyGrad-${formFactor}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={lighten(body, 0.10)} />
            <stop offset="100%" stopColor={darken(body, 0.10)} />
          </linearGradient>
          <linearGradient id="screenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a1d22" />
            <stop offset="100%" stopColor="#0a0c0e" />
          </linearGradient>
        </defs>
        <FormFactorSvg form={formFactor} bodyId={`bodyGrad-${formFactor}`} body={body} />
      </svg>
    </div>
  );
}

function pageBackground(brand: string): string {
  const b = brand.toLowerCase();
  if (b === 'apple')   return 'linear-gradient(135deg,#f6f6f9 0%,#e8e8ed 100%)';
  if (b === 'samsung') return 'linear-gradient(135deg,#eef3ff 0%,#dbe5ff 100%)';
  if (b === 'google')  return 'linear-gradient(135deg,#f0f6ff 0%,#dce8fb 100%)';
  if (b === 'sony')    return 'linear-gradient(135deg,#f1f3f5 0%,#dee2e6 100%)';
  if (b === 'nintendo')return 'linear-gradient(135deg,#fff0f1 0%,#ffd6d9 100%)';
  if (b === 'microsoft')return 'linear-gradient(135deg,#ecf4fc 0%,#d6e6f7 100%)';
  if (b === 'meta')    return 'linear-gradient(135deg,#eaf2ff 0%,#cfdffc 100%)';
  return 'linear-gradient(135deg,#f5f5f7 0%,#e8e8ed 100%)';
}

function lighten(hex: string, amount: number): string {
  return mix(hex, '#ffffff', amount);
}
function darken(hex: string, amount: number): string {
  return mix(hex, '#000000', amount);
}
function mix(a: string, b: string, t: number): string {
  const pa = parseHex(a), pb = parseHex(b);
  const r = Math.round(pa.r * (1 - t) + pb.r * t);
  const g = Math.round(pa.g * (1 - t) + pb.g * t);
  const bl = Math.round(pa.b * (1 - t) + pb.b * t);
  return `rgb(${r},${g},${bl})`;
}
function parseHex(c: string): { r: number; g: number; b: number } {
  if (c.startsWith('rgb')) {
    const m = c.match(/\d+/g) ?? ['0','0','0'];
    return { r: +m[0], g: +m[1], b: +m[2] };
  }
  const h = c.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

// ────────────────────────────────────────────────────────────────────
// Form-factor SVG bodies — each draws to a 200x200 viewBox.
// ────────────────────────────────────────────────────────────────────
function FormFactorSvg({ form, bodyId, body }: { form: FormFactor; bodyId: string; body: string }) {
  switch (form) {
    case 'iphone-island':   return <IphoneIsland bodyId={bodyId} body={body} />;
    case 'iphone-notch':    return <IphoneNotch  bodyId={bodyId} body={body} />;
    case 'iphone-classic':  return <IphoneClassic bodyId={bodyId} body={body} />;
    case 'ipad':            return <Ipad bodyId={bodyId} body={body} />;
    case 'ipad-pro':        return <IpadPro bodyId={bodyId} body={body} />;
    case 'ipad-mini':       return <IpadMini bodyId={bodyId} body={body} />;
    case 'galaxy-s':        return <GalaxyS bodyId={bodyId} body={body} />;
    case 'galaxy-fold':     return <GalaxyFold bodyId={bodyId} body={body} />;
    case 'galaxy-flip':     return <GalaxyFlip bodyId={bodyId} body={body} />;
    case 'galaxy-tab':      return <GalaxyTab bodyId={bodyId} body={body} />;
    case 'galaxy-classic':  return <GalaxyClassic bodyId={bodyId} body={body} />;
    case 'pixel-bar':       return <PixelBar bodyId={bodyId} body={body} />;
    case 'pixel-classic':   return <PixelClassic bodyId={bodyId} body={body} />;
    case 'console-ps':      return <ConsolePs body={body} />;
    case 'console-xbox':    return <ConsoleXbox body={body} />;
    case 'console-switch':  return <ConsoleSwitch body={body} />;
    case 'console-vr':      return <ConsoleVr body={body} />;
    case 'controller':      return <Controller body={body} />;
    case 'audio-buds':      return <AudioBuds body={body} />;
    case 'audio-headphones':return <AudioHeadphones body={body} />;
    case 'speaker':         return <Speaker body={body} />;
    case 'powerbank':       return <Powerbank body={body} />;
    case 'watch':           return <Watch body={body} bodyId={bodyId} />;
    default:                return <Generic body={body} />;
  }
}

// ── Phone bodies ────────────────────────────────────────────────────
function PhoneShell({ bodyId, body, withNotch, withIsland, withHomeButton }: {
  bodyId: string; body: string;
  withNotch?: boolean; withIsland?: boolean; withHomeButton?: boolean;
}) {
  return (
    <g>
      {/* Outer body */}
      <rect x="60" y="20" width="80" height="160" rx="14" fill={`url(#${bodyId})`} stroke={FRAME} strokeWidth="0.6" />
      {/* Screen glass */}
      <rect x="65" y="26" width="70" height={withHomeButton ? 142 : 148} rx="9" fill="url(#screenGrad)" />
      {withNotch && (
        <rect x="86" y="26" width="28" height="6" rx="3" fill={SCREEN} />
      )}
      {withIsland && (
        <rect x="88" y="32" width="24" height="6" rx="3" fill="#0a0a0a" />
      )}
      {withHomeButton && (
        <circle cx="100" cy="174" r="5" fill="none" stroke={darken(body, 0.3)} strokeWidth="1" />
      )}
      {/* Side buttons */}
      <rect x="58.5" y="55" width="2" height="14" rx="1" fill={darken(body, 0.2)} />
      <rect x="58.5" y="78" width="2" height="20" rx="1" fill={darken(body, 0.2)} />
      <rect x="139.5" y="65" width="2" height="22" rx="1" fill={darken(body, 0.2)} />
    </g>
  );
}

function IphoneIsland({ bodyId, body }: { bodyId: string; body: string }) {
  return (
    <>
      <PhoneShell bodyId={bodyId} body={body} withIsland />
      {/* Pro camera plate (3-lens square on the back, hinted via top corner) */}
      <g opacity="0.15">
        <rect x="64" y="22" width="22" height="22" rx="6" fill={darken(body, 0.4)} />
        <circle cx="71" cy="29" r="3" fill="#1a1a1a" />
        <circle cx="79" cy="29" r="3" fill="#1a1a1a" />
        <circle cx="71" cy="37" r="3" fill="#1a1a1a" />
      </g>
    </>
  );
}

function IphoneNotch({ bodyId, body }: { bodyId: string; body: string }) {
  return <PhoneShell bodyId={bodyId} body={body} withNotch />;
}

function IphoneClassic({ bodyId, body }: { bodyId: string; body: string }) {
  return <PhoneShell bodyId={bodyId} body={body} withHomeButton />;
}

// ── Pixel ───────────────────────────────────────────────────────────
function PixelBar({ bodyId, body }: { bodyId: string; body: string }) {
  return (
    <>
      <PhoneShell bodyId={bodyId} body={body} />
      {/* Punch-hole front camera */}
      <circle cx="100" cy="33" r="2.5" fill="#0a0a0a" />
      {/* Hint of the rear camera bar — Pixel 6+ signature */}
      <rect x="62" y="44" width="76" height="10" rx="3" fill={darken(body, 0.35)} opacity="0.18" />
    </>
  );
}

function PixelClassic({ bodyId, body }: { bodyId: string; body: string }) {
  return (
    <g>
      <rect x="62" y="22" width="76" height="156" rx="10" fill={`url(#${bodyId})`} stroke={FRAME} strokeWidth="0.6" />
      <rect x="68" y="40" width="64" height="120" rx="4" fill="url(#screenGrad)" />
      {/* Top + bottom bezels with speaker grille */}
      <line x1="78" y1="32" x2="122" y2="32" stroke={darken(body, 0.3)} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="78" y1="168" x2="122" y2="168" stroke={darken(body, 0.3)} strokeWidth="1.2" strokeLinecap="round" />
    </g>
  );
}

// ── Galaxy ──────────────────────────────────────────────────────────
function GalaxyS({ bodyId, body }: { bodyId: string; body: string }) {
  return (
    <>
      <PhoneShell bodyId={bodyId} body={body} />
      {/* Punch-hole centred */}
      <circle cx="100" cy="34" r="2.6" fill="#0a0a0a" />
      {/* Three vertical camera lenses on top-left back */}
      <g opacity="0.18">
        <circle cx="70" cy="32" r="3.6" fill="#0a0a0a" />
        <circle cx="70" cy="42" r="3.6" fill="#0a0a0a" />
        <circle cx="70" cy="52" r="3.6" fill="#0a0a0a" />
      </g>
    </>
  );
}

function GalaxyClassic({ bodyId, body }: { bodyId: string; body: string }) {
  return (
    <g>
      <rect x="62" y="22" width="76" height="156" rx="10" fill={`url(#${bodyId})`} stroke={FRAME} strokeWidth="0.6" />
      <rect x="67" y="36" width="66" height="124" rx="5" fill="url(#screenGrad)" />
      <circle cx="100" cy="170" r="4" fill="none" stroke={darken(body, 0.25)} strokeWidth="1" />
    </g>
  );
}

function GalaxyFold({ bodyId, body }: { bodyId: string; body: string }) {
  return (
    <g>
      {/* Tall narrow body */}
      <rect x="74" y="20" width="52" height="160" rx="6" fill={`url(#${bodyId})`} stroke={FRAME} strokeWidth="0.6" />
      {/* Cover screen */}
      <rect x="78" y="26" width="44" height="144" rx="4" fill="url(#screenGrad)" />
      {/* Hinge spine on the right edge */}
      <rect x="124" y="20" width="4" height="160" rx="1" fill={darken(body, 0.35)} />
      {/* Camera bar at top */}
      <rect x="80" y="22" width="40" height="6" rx="2" fill={darken(body, 0.4)} opacity="0.22" />
      <circle cx="86" cy="25" r="1.5" fill="#0a0a0a" />
      <circle cx="100" cy="25" r="1.5" fill="#0a0a0a" />
      <circle cx="114" cy="25" r="1.5" fill="#0a0a0a" />
    </g>
  );
}

function GalaxyFlip({ bodyId, body }: { bodyId: string; body: string }) {
  return (
    <g>
      {/* Top half */}
      <rect x="60" y="32" width="80" height="68" rx="8" fill={`url(#${bodyId})`} stroke={FRAME} strokeWidth="0.6" />
      {/* Cover screen square */}
      <rect x="70" y="42" width="42" height="40" rx="3" fill="url(#screenGrad)" />
      {/* Two camera lenses on cover */}
      <circle cx="123" cy="56" r="4" fill="#0d0d0d" />
      <circle cx="123" cy="76" r="4" fill="#0d0d0d" />
      {/* Hinge */}
      <rect x="60" y="100" width="80" height="4" rx="1" fill={darken(body, 0.4)} />
      {/* Bottom half */}
      <rect x="60" y="104" width="80" height="64" rx="8" fill={`url(#${bodyId})`} stroke={FRAME} strokeWidth="0.6" />
    </g>
  );
}

// ── iPad / Tablet ───────────────────────────────────────────────────
function IpadShell({ bodyId, narrow }: { bodyId: string; narrow?: boolean }) {
  const w = narrow ? 110 : 130;
  const x = (200 - w) / 2;
  return (
    <g>
      <rect x={x} y="22" width={w} height="156" rx="10" fill={`url(#${bodyId})`} stroke={FRAME} strokeWidth="0.6" />
      <rect x={x + 6} y="30" width={w - 12} height="140" rx="5" fill="url(#screenGrad)" />
      {/* Front camera */}
      <circle cx="100" cy="26" r="1.6" fill="#0a0a0a" />
    </g>
  );
}
function Ipad({ bodyId }: { bodyId: string; body: string })       { return <IpadShell bodyId={bodyId} />; }
function IpadPro({ bodyId, body }: { bodyId: string; body: string })    { return (
  <>
    <IpadShell bodyId={bodyId} />
    {/* Pro camera bump in upper left */}
    <rect x="40" y="22" width="14" height="14" rx="3" fill={darken(body, 0.35)} opacity="0.18" />
  </>
); }
function IpadMini({ bodyId }: { bodyId: string; body: string })   { return <IpadShell bodyId={bodyId} narrow />; }
function GalaxyTab({ bodyId }: { bodyId: string; body: string })  { return <IpadShell bodyId={bodyId} />; }

// ── Consoles ────────────────────────────────────────────────────────
function ConsolePs({ body }: { body: string }) {
  return (
    <g>
      {/* PS5 dual fins */}
      <rect x="50" y="60" width="100" height="80" rx="4" fill="#f4f4f5" stroke={FRAME} strokeWidth="0.6" />
      <rect x="42" y="55" width="10" height="90" rx="3" fill={body} />
      <rect x="148" y="55" width="10" height="90" rx="3" fill={body} />
      <line x1="100" y1="62" x2="100" y2="138" stroke="#1f72d6" strokeWidth="1.2" />
      <text x="100" y="118" textAnchor="middle" fill="#bdbec1" fontFamily="sans-serif" fontWeight="700" fontSize="10">PS5</text>
    </g>
  );
}
function ConsoleXbox({ body }: { body: string }) {
  return (
    <g>
      <rect x="60" y="40" width="80" height="120" rx="6" fill={body} stroke={FRAME} strokeWidth="0.6" />
      {/* Top vent */}
      <circle cx="100" cy="58" r="14" fill="#1d1d1d" />
      <circle cx="100" cy="58" r="11" fill="#0a0a0a" />
      {/* Xbox logo position */}
      <circle cx="100" cy="120" r="6" fill="#107c10" />
    </g>
  );
}
function ConsoleSwitch({ body }: { body: string }) {
  return (
    <g>
      {/* Joy-cons + screen */}
      <rect x="40" y="65" width="22" height="70" rx="5" fill="#e63946" />
      <rect x="138" y="65" width="22" height="70" rx="5" fill="#1d4ed8" />
      <rect x="62" y="60" width="76" height="80" rx="3" fill={body} stroke={FRAME} strokeWidth="0.6" />
      <rect x="66" y="64" width="68" height="72" rx="2" fill="url(#screenGrad)" />
    </g>
  );
}
function ConsoleVr({ body }: { body: string }) {
  return (
    <g>
      <path d="M 40 85 Q 40 60 70 60 L 130 60 Q 160 60 160 85 L 160 110 Q 160 135 130 135 L 70 135 Q 40 135 40 110 Z"
            fill={body} stroke={FRAME} strokeWidth="0.6" />
      <rect x="60" y="80" width="32" height="32" rx="2" fill="url(#screenGrad)" />
      <rect x="108" y="80" width="32" height="32" rx="2" fill="url(#screenGrad)" />
    </g>
  );
}
function Controller({ body }: { body: string }) {
  return (
    <g>
      <path d="M 50 90 Q 50 70 70 70 L 130 70 Q 150 70 150 90 L 150 120 Q 150 140 130 140 L 110 140 Q 100 130 90 140 L 70 140 Q 50 140 50 120 Z"
            fill={body} stroke={FRAME} strokeWidth="0.6" />
      <circle cx="80" cy="105" r="6" fill="#1a1a1a" />
      <circle cx="120" cy="105" r="6" fill="#1a1a1a" />
    </g>
  );
}

// ── Audio + accessories + watch ─────────────────────────────────────
function AudioBuds({ body }: { body: string }) {
  return (
    <g>
      {/* Charging case */}
      <rect x="60" y="80" width="80" height="50" rx="20" fill={body} stroke={FRAME} strokeWidth="0.6" />
      <line x1="60" y1="105" x2="140" y2="105" stroke={darken(body, 0.3)} strokeWidth="0.8" />
      {/* Two buds */}
      <ellipse cx="80" cy="60" rx="9" ry="11" fill={body} stroke={FRAME} strokeWidth="0.6" />
      <ellipse cx="120" cy="60" rx="9" ry="11" fill={body} stroke={FRAME} strokeWidth="0.6" />
      <circle cx="80" cy="60" r="3" fill="#1a1a1a" />
      <circle cx="120" cy="60" r="3" fill="#1a1a1a" />
    </g>
  );
}
function AudioHeadphones({ body }: { body: string }) {
  return (
    <g>
      {/* Headband */}
      <path d="M 50 100 Q 100 40 150 100" fill="none" stroke={body} strokeWidth="6" strokeLinecap="round" />
      {/* Cups */}
      <ellipse cx="50" cy="115" rx="18" ry="22" fill={body} stroke={FRAME} strokeWidth="0.6" />
      <ellipse cx="150" cy="115" rx="18" ry="22" fill={body} stroke={FRAME} strokeWidth="0.6" />
      <circle cx="50" cy="115" r="7" fill="#1a1a1a" />
      <circle cx="150" cy="115" r="7" fill="#1a1a1a" />
    </g>
  );
}
function Speaker({ body }: { body: string }) {
  return (
    <g>
      <rect x="65" y="40" width="70" height="120" rx="8" fill={body} stroke={FRAME} strokeWidth="0.6" />
      {/* Speaker mesh */}
      <rect x="72" y="50" width="56" height="80" rx="3" fill={darken(body, 0.4)} opacity="0.45" />
      {[0,1,2,3].map((r) => [0,1,2,3,4,5].map((c) => (
        <circle key={`${r}-${c}`} cx={80 + c * 9} cy={62 + r * 18} r="1.6" fill="#1a1a1a" opacity="0.6" />
      )))}
    </g>
  );
}
function Powerbank({ body }: { body: string }) {
  return (
    <g>
      <rect x="65" y="50" width="70" height="100" rx="6" fill={body} stroke={FRAME} strokeWidth="0.6" />
      {/* USB ports */}
      <rect x="78" y="138" width="10" height="3" fill="#1a1a1a" rx="1" />
      <rect x="98" y="138" width="14" height="3" fill="#1a1a1a" rx="1" />
      {/* LEDs */}
      <circle cx="100" cy="65" r="1.5" fill="#56e87a" />
      <circle cx="108" cy="65" r="1.5" fill="#3a3a3a" />
      <circle cx="116" cy="65" r="1.5" fill="#3a3a3a" />
      <circle cx="124" cy="65" r="1.5" fill="#3a3a3a" />
    </g>
  );
}
function Watch({ body, bodyId }: { body: string; bodyId: string }) {
  return (
    <g>
      {/* Strap */}
      <rect x="92" y="25" width="16" height="40" fill={darken(body, 0.2)} />
      <rect x="92" y="135" width="16" height="40" fill={darken(body, 0.2)} />
      {/* Watch body */}
      <rect x="65" y="65" width="70" height="70" rx="14" fill={`url(#${bodyId})`} stroke={FRAME} strokeWidth="0.6" />
      {/* Display */}
      <rect x="72" y="73" width="56" height="54" rx="9" fill="url(#screenGrad)" />
      {/* Crown */}
      <rect x="135" y="92" width="3" height="12" rx="1" fill={darken(body, 0.2)} />
    </g>
  );
}
function Generic({ body }: { body: string }) {
  return (
    <g>
      <rect x="60" y="60" width="80" height="80" rx="10" fill={body} stroke={FRAME} strokeWidth="0.6" />
    </g>
  );
}
