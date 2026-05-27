// Primitives.jsx — Button, Badge, Card, Field, FilterChip — used everywhere.
// Every component reads its color from CSS tokens in colors_and_type.css.

function Button({ variant = 'primary', size = 'md', icon, iconRight, children, className = '', style = {}, ...rest }) {
  const sizes = {
    sm: { height: 30, padding: '0 12px', font: '600 12px/1 var(--font-sans)' },
    md: { height: 38, padding: '0 18px', font: '600 13px/1 var(--font-sans)' },
    lg: { height: 46, padding: '0 22px', font: '600 14px/1 var(--font-sans)' },
  };
  const variants = {
    primary: {
      background: 'var(--brand-navy)',
      color: 'var(--brand-bone, #F5F1EA)',
      border: '1px solid transparent',
    },
    accent: {
      background: 'var(--brand-accent)',
      color: '#1D1D1B',
      border: '1px solid transparent',
    },
    secondary: {
      background: 'var(--btn-secondary-bg)',
      color: 'var(--btn-secondary-fg)',
      border: '1px solid var(--btn-secondary-border)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--fg-secondary)',
      border: '1px solid transparent',
    },
    danger: {
      background: 'var(--danger-500)',
      color: '#fff',
      border: '1px solid transparent',
    },
  };
  return (
    <button
      data-variant={variant}
      data-size={size}
      className={`mos-btn ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        borderRadius: 999,
        cursor: 'pointer',
        letterSpacing: '-0.005em',
        transition: 'background var(--duration-base) var(--ease-out), border-color var(--duration-base) var(--ease-out), transform var(--duration-fast) var(--ease-out), box-shadow var(--duration-base) var(--ease-out)',
        ...sizes[size],
        ...variants[variant],
        ...style,
      }}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 12 : 14} strokeWidth={2} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 12 : 14} strokeWidth={2} />}
    </button>
  );
}

function Badge({ tone = 'neutral', dot = false, mono = false, children, style = {} }) {
  const tones = {
    success: { bg: 'rgba(22,163,74,.10)', fg: '#15803D', bd: 'rgba(22,163,74,.22)', dot: '#16A34A' },
    warning: { bg: 'rgba(217,119,6,.10)', fg: '#B45309', bd: 'rgba(217,119,6,.22)', dot: '#D97706' },
    danger:  { bg: 'rgba(220,38,38,.10)', fg: '#B91C1C', bd: 'rgba(220,38,38,.22)', dot: '#DC2626' },
    info:    { bg: 'rgba(2,132,199,.10)', fg: '#0369A1', bd: 'rgba(2,132,199,.22)', dot: '#0284C7' },
    accent:  { bg: 'rgba(116,144,148,.08)', fg: 'var(--brand-accent)', bd: 'rgba(116,144,148,.18)', dot: 'var(--brand-accent)' },
    brand:   { bg: 'var(--brand-navy)', fg: 'var(--brand-bone, #F5F1EA)', bd: 'transparent', dot: '#F5F1EA' },
    neutral: { bg: 'var(--bg-sunken)', fg: 'var(--fg-secondary)', bd: 'var(--border-default)', dot: 'var(--fg-subtle)' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: dot ? 6 : 0,
        padding: '3px 9px',
        borderRadius: 999,
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.bd}`,
        font: mono ? '600 11px/1 var(--font-mono)' : '600 11px/1 var(--font-sans)',
        letterSpacing: mono ? 0 : '0.02em',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: t.dot }} />}
      {children}
    </span>
  );
}

function Card({ children, className = '', style = {}, hoverable = false }) {
  return (
    <div
      className={`mos-card ${hoverable ? 'mos-card-hoverable' : ''} ${className}`}
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
function CardHeader({ children, action, style = {} }) {
  return (
    <div
      style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: '600 13px/1.3 var(--font-display)', letterSpacing: '-0.01em' }}>
        {children}
      </div>
      {action}
    </div>
  );
}
function CardBody({ children, style = {} }) {
  return <div style={{ padding: 20, ...style }}>{children}</div>;
}

function Field({ label, hint, error, children, style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && <label style={{ font: '500 12px/1.2 var(--font-sans)', color: 'var(--fg-secondary)' }}>{label}</label>}
      {children}
      {error && <span style={{ font: '500 11px/1.3 var(--font-sans)', color: 'var(--danger-500)' }}>{error}</span>}
      {!error && hint && <span style={{ font: '500 11px/1.3 var(--font-sans)', color: 'var(--fg-muted)' }}>{hint}</span>}
    </div>
  );
}

function Input({ icon, mono = false, style = {}, ...rest }) {
  const input = (
    <input
      {...rest}
      style={{
        height: 40,
        width: '100%',
        border: '1px solid var(--border-default)',
        background: 'var(--bg-elevated)',
        borderRadius: 'var(--radius-sm)',
        padding: icon ? '0 14px 0 36px' : '0 14px',
        color: 'var(--fg-primary)',
        font: `${mono ? '500' : '500'} 13px/1 ${mono ? 'var(--font-mono)' : 'var(--font-sans)'}`,
        outline: 'none',
        boxShadow: 'var(--shadow-xs)',
        transition: 'border-color 160ms var(--ease-out), box-shadow 160ms var(--ease-out)',
        ...style,
      }}
      onFocus={(e) => { e.target.style.borderColor = 'var(--border-focus)'; e.target.style.boxShadow = 'var(--shadow-focus)'; rest.onFocus && rest.onFocus(e); }}
      onBlur={(e) => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = 'var(--shadow-xs)'; rest.onBlur && rest.onBlur(e); }}
    />
  );
  if (!icon) return input;
  return (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)', display: 'inline-flex' }}>
        <Icon name={icon} size={14} strokeWidth={2} />
      </span>
      {input}
    </div>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        background: 'var(--bg-sunken)',
        borderRadius: 12,
        padding: 3,
        border: '1px solid var(--border-default)',
        gap: 2,
      }}
    >
      {options.map((o) => {
        const isActive = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              border: 'none',
              padding: '6px 12px',
              borderRadius: 9,
              cursor: 'pointer',
              font: '600 11px/1 var(--font-sans)',
              letterSpacing: '0.02em',
              color: isActive ? 'var(--fg-primary)' : 'var(--fg-muted)',
              background: isActive ? 'var(--bg-elevated)' : 'transparent',
              boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
              transition: 'all var(--duration-base) var(--ease-out)',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

Object.assign(window, { Button, Badge, Card, CardHeader, CardBody, Field, Input, Segmented });
