// Dashboard pieces — KpiCard, FilterBar, ChartCard, DataTable, AlertPanel, CoverageCard.

function KpiCard({ label, value, valueColor = 'var(--fg-primary)', trend, footer, accent = false }) {
  return (
    <div
      style={{
        background: accent ? 'var(--brand-navy)' : 'var(--bg-elevated)',
        color: accent ? 'var(--brand-bone, #F5F1EA)' : 'var(--fg-primary)',
        border: '1px solid ' + (accent ? 'transparent' : 'var(--border-default)'),
        borderRadius: 'var(--radius-xl)',
        boxShadow: accent ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        position: 'relative',
        overflow: 'hidden',
        minHeight: 116,
      }}
    >
      <span
        style={{
          font: '600 10px/1 var(--font-sans)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: accent ? 'var(--brand-bone-muted)' : 'var(--fg-muted)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          font: '700 36px/1 var(--font-display)',
          letterSpacing: '-0.028em',
          fontVariantNumeric: 'tabular-nums',
          color: accent ? 'var(--brand-bone, #F5F1EA)' : valueColor,
        }}
      >
        {value}
      </span>
      {(trend || footer) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          {trend && (
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                font: '600 12px/1 var(--font-mono)',
                color: trend.startsWith('-') || trend.startsWith('↓') ? 'var(--danger-500)' : 'var(--success-500)',
              }}
            >
              <Icon name={trend.startsWith('-') || trend.startsWith('↓') ? 'trending-down' : 'trending-up'} size={12} strokeWidth={2} />
              {trend}
            </span>
          )}
          {footer && (
            <span style={{ font: '500 12px/1.2 var(--font-sans)', color: accent ? 'var(--brand-bone-muted)' : 'var(--fg-muted)' }}>{footer}</span>
          )}
        </div>
      )}
    </div>
  );
}

function FilterBar({ datePreset, onDatePreset, channel, onChannel, status, onStatus }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 10,
        padding: 8,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <Segmented
        value={datePreset}
        onChange={onDatePreset}
        options={[
          { value: 'HOY', label: 'HOY' },
          { value: 'SEMANA', label: 'SEMANA' },
          { value: 'MES', label: 'MES' },
          { value: 'AÑO', label: 'AÑO' },
          { value: 'YTD', label: 'YTD' },
        ]}
      />
      <div style={{ width: 1, height: 22, background: 'var(--border-subtle)' }} />

      <DropSelect
        value={channel}
        onChange={onChannel}
        options={[
          { value: 'ALL', label: 'Canal: Todos' },
          { value: 'retail', label: 'Retail' },
          { value: 'distribuidor', label: 'Distribuidor' },
          { value: 'constructora', label: 'Constructora' },
        ]}
      />
      <DropSelect
        value={status}
        onChange={onStatus}
        options={[
          { value: 'ALL', label: 'Estado: Todos' },
          { value: 'VIGENTE', label: 'Vigentes' },
          { value: 'DRAFT', label: 'Drafts' },
          { value: 'RECHAZADA', label: 'Rechazadas' },
        ]}
      />
      <div style={{ flex: 1 }} />
      <Button variant="ghost" size="sm" icon="filter">Más filtros</Button>
    </div>
  );
}

function DropSelect({ value, onChange, options }) {
  const current = options.find(o => o.value === value) || options[0];
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          height: 32, padding: '0 12px',
          background: 'var(--bg-sunken)',
          border: '1px solid var(--border-default)',
          borderRadius: 9,
          color: 'var(--fg-primary)',
          font: '600 12px/1 var(--font-sans)',
          letterSpacing: '-0.005em',
          display: 'inline-flex', alignItems: 'center', gap: 8,
          cursor: 'pointer',
        }}
      >
        {current.label}
        <Icon name="chevron-down" size={12} strokeWidth={2} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 50,
            background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
            borderRadius: 12, boxShadow: 'var(--shadow-pop)',
            padding: 4, minWidth: 180,
          }}>
            {options.map(o => (
              <button
                key={o.value}
                onClick={() => { onChange(o.value); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', textAlign: 'left',
                  padding: '8px 10px', border: 'none',
                  background: o.value === value ? 'var(--bg-hover)' : 'transparent',
                  color: 'var(--fg-primary)',
                  font: '500 12px/1.3 var(--font-sans)',
                  borderRadius: 8, cursor: 'pointer',
                }}
                onMouseEnter={(e) => { if (o.value !== value) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { if (o.value !== value) e.currentTarget.style.background = 'transparent'; }}
              >
                {o.label}
                {o.value === value && <Icon name="check" size={12} strokeWidth={2.2} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ChartCard({ title, icon, action, children, style = {} }) {
  return (
    <Card style={style}>
      <CardHeader action={action}>
        {icon && <Icon name={icon} size={14} strokeWidth={2} style={{ color: 'var(--brand-accent)' }} />}
        <span>{title}</span>
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

function CoverageCard({ percent, configured, pending, exceptions }) {
  return (
    <Card>
      <CardHeader>
        <Icon name="badge-dollar-sign" size={14} strokeWidth={2} style={{ color: 'var(--brand-accent)' }} />
        <span>Cobertura Comercial</span>
      </CardHeader>
      <CardBody style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{
            width: '100%', height: 8, background: 'var(--bg-sunken)',
            borderRadius: 999, overflow: 'hidden',
          }}>
            <div
              style={{
                width: `${percent}%`, height: '100%',
                background: 'linear-gradient(90deg, var(--success-500), #34D399)',
                borderRadius: 999,
                transition: 'width 800ms var(--ease-out)',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <span style={{ font: '600 10px/1 var(--font-sans)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>Completitud del pricing</span>
            <span style={{ font: '700 14px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums', color: 'var(--fg-primary)' }}>{percent.toFixed(1)}%</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <CoverageTile icon="check-circle-2" tone="success" value={configured} label="Configurados" />
          <CoverageTile icon="alert-circle"   tone="warning" value={pending} label="Pendientes" />
          <CoverageTile icon="x-circle"       tone="neutral" value={exceptions} label="No aplica" />
        </div>
        <a href="#" style={{ font: '600 12px/1 var(--font-sans)', color: 'var(--brand-accent)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Gestionar listas de precios <Icon name="arrow-right" size={12} strokeWidth={2} />
        </a>
      </CardBody>
    </Card>
  );
}

function CoverageTile({ icon, tone, value, label }) {
  const toneFg = { success: 'var(--success-500)', warning: 'var(--warning-500)', neutral: 'var(--fg-muted)' }[tone];
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      padding: '12px 8px',
      background: 'var(--bg-sunken)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 12,
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: toneFg }}>
        <Icon name={icon} size={14} strokeWidth={2} />
        <span style={{ font: '700 18px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums', color: 'var(--fg-primary)' }}>{value}</span>
      </span>
      <span style={{ font: '500 10px/1 var(--font-sans)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>{label}</span>
    </div>
  );
}

function AlertPanel({ alerts }) {
  return (
    <div
      style={{
        background: 'linear-gradient(180deg, rgba(248,113,113,0.06), rgba(248,113,113,0.02))',
        border: '1px solid rgba(248,113,113,0.18)',
        borderRadius: 'var(--radius-lg)',
        padding: 18,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        font: '600 10px/1 var(--font-sans)', letterSpacing: '0.14em', textTransform: 'uppercase',
        color: 'var(--danger-500)',
      }}>
        <Icon name="alert-triangle" size={14} strokeWidth={2} />
        Alertas críticas
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {alerts.map((a, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '12px 14px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-xs)',
          }}>
            <span style={{
              font: '700 18px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums',
              color: a.tone === 'warning' ? 'var(--warning-500)' : 'var(--danger-500)',
              minWidth: 32,
            }}>{a.value}</span>
            <span style={{ font: '500 13px/1.45 var(--font-sans)', color: 'var(--fg-secondary)' }}>{a.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { KpiCard, FilterBar, ChartCard, CoverageCard, AlertPanel, DropSelect });
