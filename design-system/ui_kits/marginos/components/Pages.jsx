// Pages.jsx — high-fidelity screens for the Executive Dashboard demo.
// Each "page" is rendered by App.jsx based on the active nav item.

const fmtCOP = (val) => '$' + new Intl.NumberFormat('es-CO').format(Math.round(val));
const fmtShortCOP = (val) => {
  if (val >= 1e9) return '$' + (val / 1e9).toFixed(2) + 'B';
  if (val >= 1e6) return '$' + (val / 1e6).toFixed(1) + 'M';
  if (val >= 1e3) return '$' + (val / 1e3).toFixed(1) + 'k';
  return '$' + val.toFixed(0);
};
const fmtPct = (val) => val.toFixed(1) + '%';

const marginColor = (pct) =>
  pct >= 60 ? 'var(--margin-strong)' : pct >= 40 ? 'var(--margin-ok)' : 'var(--margin-weak)';

// ── Executive Dashboard ────────────────────────────────────────────
function ExecutiveDashboard() {
  const [datePreset, setDatePreset] = React.useState('AÑO');
  const [channel, setChannel] = React.useState('ALL');
  const [status, setStatus] = React.useState('ALL');

  const monthly = [
    { label: 'Ene', value: 142 }, { label: 'Feb', value: 187 }, { label: 'Mar', value: 215 },
    { label: 'Abr', value: 198 }, { label: 'May', value: 246 }, { label: 'Jun', value: 312 },
    { label: 'Jul', value: 289 }, { label: 'Ago', value: 358 }, { label: 'Sep', value: 422 },
    { label: 'Oct', value: 478 }, { label: 'Nov', value: 540 }, { label: 'Dic', value: 612 },
  ].map(d => ({ ...d, value: d.value * 2.4e6 }));

  const pipeline = [
    { label: 'Vigentes',   value: 87, color: '#16A34A' },
    { label: 'Drafts',     value: 23, color: '#D97706' },
    { label: 'Rechazadas', value: 12, color: '#DC2626' },
    { label: 'Renovadas',  value: 14, color: '#749094' },
    { label: 'Vencidas',   value:  6, color: '#9AA3B2' },
  ];

  const marginByChannel = [
    { label: 'Constructora', value: 68.4 },
    { label: 'Distribuidor', value: 54.2 },
    { label: 'Retail',       value: 47.1 },
    { label: 'E-commerce',   value: 38.5 },
    { label: 'Exportación',  value: 31.7 },
  ].map(d => ({ ...d, color: marginColor(d.value) }));

  const topCustomers = [
    { name: 'Constructora Bolívar S.A.',  sims: 24, value: 412e6, rejected: 2 },
    { name: 'Amoblar Distribuciones',     sims: 18, value: 312e6, rejected: 0 },
    { name: 'Grupo Argos · Cementos',     sims: 14, value: 268e6, rejected: 1 },
    { name: 'Homecenter Sodimac S.A.',    sims: 22, value: 245e6, rejected: 3 },
    { name: 'Easy Colombia S.A.S.',       sims: 11, value: 187e6, rejected: 0 },
  ];

  return (
    <>
      <div className="page-head" style={{ marginBottom: 22 }}>
        <div>
          <h1>
            <Icon name="bar-chart-3" size={22} strokeWidth={1.75} />
            Executive Dashboard
          </h1>
          <p>Visibilidad consolidada de la operación comercial y rentabilidad.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" icon="printer" size="md">PDF Report</Button>
          <Button variant="primary" icon="download" size="md">Export Data</Button>
        </div>
      </div>

      <div style={{ marginBottom: 22 }}>
        <FilterBar
          datePreset={datePreset} onDatePreset={setDatePreset}
          channel={channel} onChannel={setChannel}
          status={status} onStatus={setStatus}
        />
      </div>

      {/* KPI strip */}
      <div className="section" style={{ marginBottom: 22 }}>
        <div className="section-title"><Icon name="target" size={14} strokeWidth={2} />Resumen ejecutivo</div>
        <div className="grid grid-4">
          <KpiCard label="Total simulaciones" value="142" footer={<span><span style={{ color: 'var(--success-500)' }}>87 vigentes</span> · <span style={{ color: 'var(--danger-500)' }}>12 rechazadas</span></span>} />
          <KpiCard label="Valor neto simulado" value="$3.84B" trend="+18.4% vs AÑO" />
          <KpiCard label="Contribución total" value="$2.21B" trend="+12.1%" accent />
          <KpiCard label="Margen ponderado" value="57.6%" valueColor="var(--margin-ok)" footer="objetivo 60%" />
        </div>
      </div>

      {/* Charts + side rail */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 22, marginBottom: 22 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ChartCard title="Valor simulado por mes (COP)" icon="trending-up"
                     action={<Badge tone="accent" mono>AÑO · 2025</Badge>}>
            <LineChart data={monthly} formatY={fmtShortCOP} color="var(--brand-accent)" />
          </ChartCard>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <ChartCard title="Estado del pipeline" icon="pie-chart">
              <DonutChart data={pipeline} />
            </ChartCard>
            <ChartCard title="Margen promedio por canal" icon="layers">
              <HBarChart data={marginByChannel} />
            </ChartCard>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <AlertPanel alerts={[
            { value: 8,  text: 'Simulaciones activas por debajo del margen objetivo del negocio.', tone: 'danger' },
            { value: 4,  text: 'Simulaciones con descuentos comerciales mayores al 40%.', tone: 'danger' },
            { value: 17, text: 'Productos activos en SAP sin base tarifaria configurada.', tone: 'warning' },
          ]} />
          <CoverageCard percent={78.4} configured={184} pending={17} exceptions={9} />
          <BomFreshness date="Vie, 24 Oct 2025 · 09:42" />
        </div>
      </div>

      {/* Customer table */}
      <Card>
        <CardHeader
          action={<a href="#" style={{ font: '600 12px/1 var(--font-sans)', color: 'var(--brand-accent)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>Ver todos <Icon name="arrow-right" size={12} strokeWidth={2} /></a>}
        >
          <Icon name="users" size={14} strokeWidth={2} style={{ color: 'var(--brand-accent)' }} />
          <span>Top clientes por valor simulado</span>
        </CardHeader>
        <DataTable
          columns={[
            { key: 'name',     label: 'Cliente',   width: '2fr',  render: (v) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg-sunken)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-secondary)', fontWeight: 600, fontSize: 11 }}>{v.split(' ').map(s => s[0]).slice(0, 2).join('')}</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            )},
            { key: 'sims',     label: 'Simulaciones', align: 'center', width: '1fr', mono: true },
            { key: 'value',    label: 'Valor neto (COP)', align: 'right', width: '1.2fr', mono: true, bold: true,
              render: (v) => fmtCOP(v),
              color: () => 'var(--brand-navy)' },
            { key: 'rejected', label: 'Rechazos', align: 'center', width: '0.8fr',
              render: (v) => v > 0
                ? <Badge tone="danger" mono>{v}</Badge>
                : <span style={{ color: 'var(--fg-subtle)' }}>—</span> },
          ]}
          rows={topCustomers}
          density="normal"
        />
      </Card>
    </>
  );
}

function BomFreshness({ date }) {
  return (
    <Card>
      <CardBody style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 18 }}>
        <span style={{
          width: 40, height: 40, borderRadius: 12,
          background: 'rgba(116,144,148,0.12)',
          color: 'var(--brand-accent)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid rgba(116,144,148,0.22)',
        }}>
          <Icon name="factory" size={18} strokeWidth={1.75} />
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ font: '600 10px/1 var(--font-sans)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>Última carga BOM</span>
          <span style={{ font: '600 13px/1.3 var(--font-sans)', color: 'var(--fg-primary)', marginTop: 4 }}>{date}</span>
        </div>
      </CardBody>
    </Card>
  );
}

// ── Simulator (read-only mock) ─────────────────────────────────────
function Simulator() {
  const rows = [
    { code: 'SAP-04812', desc: 'Tablero Melamina Roble',  cost: 284500, price: 764200, qty: 120, disc: 8, margin: 62.8 },
    { code: 'SAP-09120', desc: 'Encimera Quartz Negro',   cost: 612000, price: 1105000, qty: 38, disc: 12, margin: 44.6 },
    { code: 'SAP-11407', desc: 'Lavamanos Cerámico Slim', cost: 198300, price: 272100, qty: 88, disc: 22, margin: 27.1 },
    { code: 'SAP-02214', desc: 'Grifería Mate Cromo',     cost: 142000, price: 318000, qty: 210, disc: 4, margin: 55.4 },
  ];
  const totalRev = rows.reduce((s, r) => s + r.price * r.qty * (1 - r.disc / 100), 0);
  const totalCost = rows.reduce((s, r) => s + r.cost * r.qty, 0);
  const totalMargin = ((totalRev - totalCost) / totalRev) * 100;
  return (
    <>
      <div className="page-head" style={{ marginBottom: 22 }}>
        <div>
          <h1><Icon name="calculator" size={22} strokeWidth={1.75} />Simular negocio</h1>
          <p>Escenario en construcción · cliente, productos y márgenes vivos.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Badge tone="warning" dot>DRAFT</Badge>
          <Button variant="secondary" icon="clock">Autoguardado · hace 12s</Button>
          <Button variant="primary" icon="check">Guardar</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 22 }}>
        <Card><CardBody><Field label="Cliente"><div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-sunken)', borderRadius: 10, border: '1px solid var(--border-default)' }}><Icon name="building-2" size={14} strokeWidth={2} style={{ color: 'var(--fg-muted)' }} /><span style={{ font: '600 13px/1 var(--font-sans)' }}>Constructora Bolívar S.A.</span></div></Field></CardBody></Card>
        <Card><CardBody><Field label="Proyecto"><Input defaultValue="Torres del Norte – Bloque B" /></Field></CardBody></Card>
        <Card><CardBody><Field label="Moneda / TRM"><div style={{ display: 'flex', gap: 8 }}><Input defaultValue="COP" style={{ flex: '0 0 70px' }} /><Input defaultValue="4 213.50" mono style={{ flex: 1 }} /></div></Field></CardBody></Card>
        <Card><CardBody><Field label="Margen objetivo"><Input defaultValue="60.0%" mono /></Field></CardBody></Card>
      </div>

      <Card style={{ marginBottom: 22 }}>
        <CardHeader action={<Button variant="ghost" size="sm" icon="plus">Añadir producto</Button>}>
          <Icon name="package" size={14} strokeWidth={2} style={{ color: 'var(--brand-accent)' }} />
          Líneas del escenario
        </CardHeader>
        <DataTable
          columns={[
            { key: 'desc', label: 'Producto', width: '2fr', render: (v, r) => (<div><div style={{ fontWeight: 600 }}>{v}</div><div style={{ font: '500 11px/1.2 var(--font-mono)', color: 'var(--fg-muted)' }}>{r.code}</div></div>) },
            { key: 'qty', label: 'Cantidad', align: 'right', width: '0.8fr', mono: true },
            { key: 'cost', label: 'Costo MP', align: 'right', width: '1fr', mono: true, render: (v) => fmtCOP(v), color: () => 'var(--fg-secondary)' },
            { key: 'price', label: 'Precio lista', align: 'right', width: '1fr', mono: true, render: (v) => fmtCOP(v) },
            { key: 'disc', label: '% Desc.', align: 'right', width: '0.7fr', mono: true, render: (v) => v + '%', color: (v) => v > 20 ? 'var(--warning-500)' : 'var(--fg-secondary)' },
            { key: 'margin', label: 'Margen', align: 'right', width: '0.8fr', mono: true, bold: true, render: (v) => fmtPct(v), color: marginColor },
          ]}
          rows={rows}
        />
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <KpiCard label="Valor bruto escenario" value={fmtShortCOP(totalRev)} footer={`${rows.length} líneas`} />
        <KpiCard label="Costo MP consolidado" value={fmtShortCOP(totalCost)} />
        <KpiCard label="Margen ponderado" value={fmtPct(totalMargin)} valueColor={marginColor(totalMargin)} footer="objetivo 60%" />
      </div>
    </>
  );
}

// ── Customers list ────────────────────────────────────────────────
function CustomersPage() {
  const rows = [
    { name: 'Constructora Bolívar S.A.', nit: '900.123.456-1', channel: 'Constructora', sims: 24, last: 'Hace 2 días',  status: 'VIGENTE' },
    { name: 'Amoblar Distribuciones',    nit: '900.341.728-5', channel: 'Distribuidor', sims: 18, last: 'Hace 4 días',  status: 'VIGENTE' },
    { name: 'Grupo Argos · Cementos',    nit: '890.901.876-3', channel: 'Constructora', sims: 14, last: 'Hace 1 semana', status: 'RENOVADA' },
    { name: 'Homecenter Sodimac S.A.',   nit: '800.224.115-9', channel: 'Retail',       sims: 22, last: 'Ayer',         status: 'DRAFT' },
    { name: 'Easy Colombia S.A.S.',      nit: '900.444.221-0', channel: 'Retail',       sims: 11, last: 'Hace 3 días',  status: 'VIGENTE' },
    { name: 'Distribuidora El Roble',    nit: '900.882.412-7', channel: 'Distribuidor', sims:  7, last: 'Hace 2 semanas', status: 'VENCIDO' },
    { name: 'Cerámicas del Caribe Ltda.', nit: '901.014.992-2', channel: 'Distribuidor', sims:  4, last: 'Hace 1 mes',   status: 'RECHAZADA' },
  ];
  const tones = { VIGENTE: 'success', DRAFT: 'warning', RENOVADA: 'info', VENCIDO: 'neutral', RECHAZADA: 'danger' };
  return (
    <>
      <div className="page-head" style={{ marginBottom: 22 }}>
        <div>
          <h1><Icon name="users" size={22} strokeWidth={1.75} />Clientes</h1>
          <p>{rows.length} cuentas activas · ordenadas por última actividad comercial.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" icon="download">Exportar</Button>
          <Button variant="primary" icon="plus">Nuevo cliente</Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 22, alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <Input icon="search" placeholder="Buscar por nombre o NIT…" />
        </div>
        <DropSelect value="ALL" onChange={() => {}} options={[
          { value: 'ALL', label: 'Canal: Todos' },
          { value: 'retail', label: 'Retail' },
          { value: 'distribuidor', label: 'Distribuidor' },
          { value: 'constructora', label: 'Constructora' },
        ]} />
        <DropSelect value="ALL" onChange={() => {}} options={[
          { value: 'ALL', label: 'Estado: Todos' },
          { value: 'VIGENTE', label: 'Vigentes' },
        ]} />
      </div>

      <Card>
        <DataTable
          columns={[
            { key: 'name', label: 'Cliente', width: '2fr', render: (v, r) => (<div><div style={{ fontWeight: 600 }}>{v}</div><div style={{ font: '500 11px/1.2 var(--font-mono)', color: 'var(--fg-muted)' }}>{r.nit}</div></div>) },
            { key: 'channel', label: 'Canal', width: '1fr', render: (v) => <Badge tone="accent">{v}</Badge> },
            { key: 'sims', label: 'Simulaciones', align: 'center', width: '0.9fr', mono: true, bold: true },
            { key: 'last', label: 'Última actividad', width: '1.1fr', color: () => 'var(--fg-secondary)' },
            { key: 'status', label: 'Estado', width: '0.9fr', render: (v) => <Badge tone={tones[v]} dot>{v}</Badge> },
          ]}
          rows={rows}
          density="comodo"
          onRowClick={() => {}}
        />
      </Card>
    </>
  );
}

// ── Pricing Manager (matrix) ──────────────────────────────────────
function PricingManager() {
  const products = [
    { sap: 'SAP-04812', desc: 'Tablero Melamina Roble' },
    { sap: 'SAP-09120', desc: 'Encimera Quartz Negro' },
    { sap: 'SAP-11407', desc: 'Lavamanos Cerámico Slim' },
    { sap: 'SAP-02214', desc: 'Grifería Mate Cromo' },
    { sap: 'SAP-08801', desc: 'Mueble Vanity 90cm' },
  ];
  const channels = ['Retail', 'Distribuidor', 'Constructora', 'E-commerce'];
  // pseudo-deterministic prices
  const cell = (i, j) => {
    const seed = (i + 1) * (j + 3);
    const v = 200000 + (seed * 47213) % 800000;
    const m = 30 + (seed * 13) % 50;
    const noPrice = (i + j) % 7 === 3;
    const noApply  = (i + j) % 9 === 5;
    return { v, m, noPrice, noApply };
  };
  return (
    <>
      <div className="page-head" style={{ marginBottom: 22 }}>
        <div>
          <h1><Icon name="badge-dollar-sign" size={22} strokeWidth={1.75} />Pricing Manager</h1>
          <p>Matriz producto × canal · margen efectivo después de descuentos.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Badge tone="success" dot>78.4% cobertura</Badge>
          <Button variant="primary" icon="plus">Nueva lista</Button>
        </div>
      </div>

      <Card>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `2fr repeat(${channels.length}, 1.1fr)`,
          padding: '0 20px',
          background: 'var(--bg-sunken)',
          height: 44,
          alignItems: 'center',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div style={{ font: '600 10px/1 var(--font-sans)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>Producto</div>
          {channels.map(c => <div key={c} style={{ font: '600 11px/1 var(--font-sans)', textAlign: 'right', color: 'var(--fg-secondary)' }}>{c}</div>)}
        </div>
        {products.map((p, i) => (
          <div key={p.sap} style={{
            display: 'grid',
            gridTemplateColumns: `2fr repeat(${channels.length}, 1.1fr)`,
            padding: '14px 20px',
            borderBottom: i === products.length - 1 ? 'none' : '1px solid var(--border-subtle)',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ font: '600 13px/1.3 var(--font-sans)' }}>{p.desc}</div>
              <div style={{ font: '500 11px/1.2 var(--font-mono)', color: 'var(--fg-muted)' }}>{p.sap}</div>
            </div>
            {channels.map((c, j) => {
              const cl = cell(i, j);
              if (cl.noApply) return <div key={c} style={{ textAlign: 'right' }}><Badge tone="neutral" mono>NO APLICA</Badge></div>;
              if (cl.noPrice) return <div key={c} style={{ textAlign: 'right' }}><Badge tone="warning" dot mono>PENDIENTE</Badge></div>;
              return (
                <div key={c} style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <span style={{ font: '600 13px/1 var(--font-mono)', color: 'var(--fg-primary)', fontVariantNumeric: 'tabular-nums' }}>{fmtCOP(cl.v)}</span>
                  <span style={{ font: '500 11px/1 var(--font-mono)', color: marginColor(cl.m), fontVariantNumeric: 'tabular-nums' }}>{fmtPct(cl.m)}</span>
                </div>
              );
            })}
          </div>
        ))}
      </Card>
    </>
  );
}

// ── Generic placeholder for other nav items ────────────────────────
function Placeholder({ icon, title, blurb }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 24px', textAlign: 'center', minHeight: '60vh' }}>
      <div style={{
        width: 56, height: 56, borderRadius: 18,
        background: 'rgba(116,144,148,0.10)',
        border: '1px solid rgba(116,144,148,0.18)',
        color: 'var(--brand-accent)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 18,
      }}>
        <Icon name={icon} size={24} strokeWidth={1.5} />
      </div>
      <h2 style={{ margin: '0 0 8px' }}>{title}</h2>
      <p style={{ margin: 0, color: 'var(--fg-muted)', maxWidth: 420 }}>{blurb}</p>
    </div>
  );
}

Object.assign(window, { ExecutiveDashboard, Simulator, CustomersPage, PricingManager, Placeholder });
