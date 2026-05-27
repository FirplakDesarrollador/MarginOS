// Topbar.jsx — sticky glass top bar w/ theme switcher, search, user chip.
function Topbar({ title, subtitle, theme, onThemeChange, onSearch }) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        height: 64,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '0 24px',
        background: 'var(--glass-tint)',
        WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturation))',
        backdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturation))',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 style={{ margin: 0, font: '600 18px/1.2 var(--font-display)', letterSpacing: '-0.018em' }}>{title}</h1>
          {subtitle && <span style={{ font: '500 12px/1 var(--font-mono)', color: 'var(--fg-muted)' }}>{subtitle}</span>}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Command-K search */}
      <button
        onClick={onSearch}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          height: 36, padding: '0 12px 0 12px',
          minWidth: 280,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: 10,
          color: 'var(--fg-muted)',
          font: '500 12px/1 var(--font-sans)',
          boxShadow: 'var(--shadow-xs)',
          cursor: 'pointer',
        }}
      >
        <Icon name="search" size={14} strokeWidth={2} />
        <span style={{ flex: 1, textAlign: 'left' }}>Buscar simulación, cliente, SAP…</span>
        <span style={{ display: 'inline-flex', gap: 3 }}>
          <span className="kbd">⌘</span><span className="kbd">K</span>
        </span>
      </button>

      <div style={{ width: 1, height: 24, background: 'var(--border-subtle)' }} />

      {/* Theme toggle */}
      <button
        onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
        title={`Tema: ${theme}`}
        style={{
          width: 36, height: 36, borderRadius: 999,
          background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
          color: 'var(--fg-muted)', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={14} strokeWidth={2} />
      </button>

      {/* User chip */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '4px 14px 4px 4px',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        borderRadius: 999,
        boxShadow: 'var(--shadow-xs)',
      }}>
        <span style={{
          width: 28, height: 28, borderRadius: 999,
          background: 'var(--brand-navy)',
          color: 'var(--brand-bone)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          font: '600 11px/1 var(--font-sans)',
        }}>MR</span>
        <span style={{ font: '600 12px/1.2 var(--font-sans)', color: 'var(--fg-primary)' }}>María Restrepo</span>
      </div>
    </header>
  );
}

Object.assign(window, { Topbar });
