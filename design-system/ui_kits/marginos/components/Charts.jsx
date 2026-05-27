// SimpleCharts.jsx — lightweight SVG charts for the demo (no recharts dependency).

function LineChart({ data, height = 220, color = 'var(--brand-accent)', formatY = (v) => v.toFixed(0) }) {
  const w = 600, pad = { l: 50, r: 16, t: 10, b: 26 };
  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));
  const range = max - min || 1;
  const innerW = w - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const x = (i) => pad.l + (i / (data.length - 1)) * innerW;
  const y = (v) => pad.t + innerH - ((v - min) / range) * innerH;
  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.value)}`).join(' ');
  const area = path + ` L ${x(data.length - 1)} ${pad.t + innerH} L ${x(0)} ${pad.t + innerH} Z`;
  const yTicks = 4;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[...Array(yTicks + 1)].map((_, i) => {
        const v = min + (range * (yTicks - i)) / yTicks;
        const yy = pad.t + (innerH * i) / yTicks;
        return (
          <g key={i}>
            <line x1={pad.l} x2={w - pad.r} y1={yy} y2={yy} stroke="var(--border-subtle)" strokeDasharray="3 4" />
            <text x={pad.l - 8} y={yy + 3} fontSize="10" textAnchor="end" fill="var(--fg-muted)" fontFamily="var(--font-mono)">{formatY(v)}</text>
          </g>
        );
      })}
      <path d={area} fill="url(#lc-fill)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <circle key={i} cx={x(i)} cy={y(d.value)} r="3" fill="var(--bg-elevated)" stroke={color} strokeWidth="2" />
      ))}
      {data.map((d, i) => (
        <text key={'l' + i} x={x(i)} y={height - 8} fontSize="10" textAnchor="middle" fill="var(--fg-muted)" fontFamily="var(--font-sans)">{d.label}</text>
      ))}
    </svg>
  );
}

function DonutChart({ data, height = 200 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = 100, cy = 100, r = 70, inner = 48;
  let acc = 0;
  const arcs = data.map((d, i) => {
    const a0 = (acc / total) * Math.PI * 2 - Math.PI / 2;
    acc += d.value;
    const a1 = (acc / total) * Math.PI * 2 - Math.PI / 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p0 = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)];
    const p1 = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
    const p2 = [cx + inner * Math.cos(a1), cy + inner * Math.sin(a1)];
    const p3 = [cx + inner * Math.cos(a0), cy + inner * Math.sin(a0)];
    return { d: `M${p0} A${r} ${r} 0 ${large} 1 ${p1} L${p2} A${inner} ${inner} 0 ${large} 0 ${p3} Z`, color: d.color, label: d.label, value: d.value };
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <svg viewBox="0 0 200 200" width={height} height={height}>
        {arcs.map((a, i) => <path key={i} d={a.d} fill={a.color} stroke="var(--bg-elevated)" strokeWidth="2" />)}
        <text x="100" y="96" textAnchor="middle" fontSize="11" fontFamily="var(--font-sans)" fontWeight="600" letterSpacing="0.12em" fill="var(--fg-muted)">TOTAL</text>
        <text x="100" y="118" textAnchor="middle" fontSize="22" fontFamily="var(--font-display)" fontWeight="700" letterSpacing="-0.02em" fill="var(--fg-primary)">{total}</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, font: '500 12px/1 var(--font-sans)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 3, background: d.color }} />
            <span style={{ color: 'var(--fg-secondary)', minWidth: 86 }}>{d.label}</span>
            <span style={{ color: 'var(--fg-primary)', fontFamily: 'var(--font-mono)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HBarChart({ data, height = 200, format = (v) => v.toFixed(1) + '%' }) {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ minWidth: 96, font: '500 12px/1.2 var(--font-sans)', color: 'var(--fg-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
          <div style={{ flex: 1, height: 10, background: 'var(--bg-sunken)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              width: `${(d.value / max) * 100}%`,
              height: '100%',
              background: d.color || 'linear-gradient(90deg, var(--brand-navy), var(--brand-accent))',
              borderRadius: 999,
              transition: 'width 700ms var(--ease-out)',
            }} />
          </div>
          <span style={{ font: '600 12px/1 var(--font-mono)', color: 'var(--fg-primary)', fontVariantNumeric: 'tabular-nums', minWidth: 56, textAlign: 'right' }}>{format(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { LineChart, DonutChart, HBarChart });
