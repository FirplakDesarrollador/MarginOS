// Sidebar.jsx — collapsible nav, MarginOS branding.
const NAV_GROUPS = [
  {
    title: 'Operación Comercial',
    items: [
      { icon: 'bar-chart-3', title: 'Executive Dashboard', href: 'dashboard' },
      { icon: 'calculator',  title: 'Simular Negocio',     href: 'simulator' },
      { icon: 'pie-chart',   title: 'Escenarios',          href: 'scenarios' },
      { icon: 'users',       title: 'Clientes',            href: 'customers' },
    ],
  },
  {
    title: 'Maestros',
    items: [
      { icon: 'file-spreadsheet', title: 'Importar BOM',       href: 'import' },
      { icon: 'settings',         title: 'Costos Reales',      href: 'costs' },
      { icon: 'package',          title: 'Productos',          href: 'products' },
      { icon: 'badge-dollar-sign', title: 'Pricing Manager',   href: 'pricing-manager' },
      { icon: 'tag',              title: 'Listas de Precios',  href: 'price-lists' },
      { icon: 'store',            title: 'Canales de Venta',   href: 'channels' },
    ],
  },
];

function Sidebar({ active, onNavigate, collapsed, onToggleCollapse, theme = 'light' }) {
  const markSrc = theme === 'dark'
    ? '../../assets/firplak-mark-navy.png'
    : '../../assets/firplak-mark-white.png';
  const width = collapsed ? 64 : 240;
  return (
    <aside
      style={{
        width,
        minWidth: width,
        height: '100vh',
        position: 'sticky',
        top: 0,
        background: 'var(--bg-elevated)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width var(--duration-base) var(--ease-out), min-width var(--duration-base) var(--ease-out)',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Brand */}
      <div style={{
        height: 64,
        padding: collapsed ? '0' : '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: 10,
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30,
            background: 'var(--brand-navy)',
            borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <img src={markSrc} alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
          </div>
          {!collapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span style={{ font: '700 14px/1.1 var(--font-display)', letterSpacing: '-0.018em', color: 'var(--fg-primary)' }}>MarginOS</span>
              <span style={{ font: '500 10px/1 var(--font-mono)', color: 'var(--fg-muted)', marginTop: 2 }}>FIRPLAK · v1.1</span>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={onToggleCollapse}
            style={{
              width: 28, height: 28, borderRadius: 8,
              border: '1px solid transparent',
              background: 'transparent', color: 'var(--fg-muted)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--fg-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg-muted)'; }}
            aria-label="Colapsar"
          >
            <Icon name="chevron-left" size={14} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="scroll-thin" style={{ flex: 1, overflowY: 'auto', padding: collapsed ? '12px 8px' : '14px 12px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {!collapsed && (
              <div style={{
                padding: '4px 10px 6px',
                font: '600 10px/1 var(--font-sans)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--fg-muted)',
                opacity: 0.7,
              }}>{group.title}</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {group.items.map((item, ii) => {
                const isActive = active === item.href;
                return (
                  <button
                    key={ii}
                    onClick={() => onNavigate(item.href)}
                    title={collapsed ? item.title : undefined}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: collapsed ? '10px 0' : '8px 10px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      borderRadius: 11,
                      cursor: 'pointer',
                      border: '1px solid transparent',
                      background: isActive ? 'rgba(37, 65, 83, 0.08)' : 'transparent',
                      color: isActive ? 'var(--brand-navy)' : 'var(--fg-muted)',
                      font: `${isActive ? '600' : '500'} 13px/1.2 var(--font-sans)`,
                      letterSpacing: '-0.004em',
                      transition: 'background var(--duration-base) var(--ease-out), color var(--duration-base) var(--ease-out)',
                      textAlign: 'left',
                      width: '100%',
                    }}
                    onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--fg-primary)'; } }}
                    onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg-muted)'; } }}
                  >
                    <Icon name={item.icon} size={collapsed ? 18 : 16} strokeWidth={isActive ? 2 : 1.75} />
                    {!collapsed && <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{item.title}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse-toggle when collapsed */}
      {collapsed && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: 8, display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={onToggleCollapse}
            style={{
              width: 32, height: 32, borderRadius: 9, border: '1px solid var(--border-default)',
              background: 'var(--bg-elevated)', color: 'var(--fg-muted)',
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="Expandir"
          >
            <Icon name="chevron-right" size={14} strokeWidth={2} />
          </button>
        </div>
      )}
    </aside>
  );
}

Object.assign(window, { Sidebar });
