import React, { useState } from 'react';

/**
 * SmartImage — drop-in <img> that fades in from a subtle tint placeholder
 * and falls back to a grey-5 block if the src fails. Lazy-loaded by default.
 */
export default function SmartImage({
  src,
  alt,
  style,
  className,
  ...rest
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-block',
        background: 'var(--grey-5)',
        overflow: 'hidden',
      }}
    >
      {!failed && (
        <img
          {...rest}
          src={src}
          alt={alt ?? ''}
          loading={rest.loading ?? 'lazy'}
          decoding={rest.decoding ?? 'async'}
          onLoad={(e) => { setLoaded(true); rest.onLoad?.(e); }}
          onError={(e) => { setFailed(true); rest.onError?.(e); }}
          className={className}
          style={{
            transition: 'opacity var(--duration-slow) var(--ease-default)',
            opacity: loaded ? 1 : 0,
            ...style,
          }}
        />
      )}
      {failed && (
        <span
          aria-hidden
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            fontFamily: 'var(--font-sans)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--grey-40)',
          }}
        >
          image unavailable
        </span>
      )}
    </span>
  );
}
