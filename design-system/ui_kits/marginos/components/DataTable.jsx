// DataTable.jsx — premium enterprise table with status pills, tabular numerics.

function DataTable({ columns, rows, density = 'normal', onRowClick }) {
  const heights = { compact: 36, normal: 48, comodo: 60 };
  const rowH = heights[density];
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: columns.map(c => c.width || '1fr').join(' '),
        padding: '0 20px',
        background: 'var(--bg-sunken)',
        borderBottom: '1px solid var(--border-subtle)',
        height: 40,
        alignItems: 'center',
      }}>
        {columns.map((c, i) => (
          <div
            key={i}
            style={{
              font: '600 10px/1 var(--font-sans)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--fg-muted)',
              textAlign: c.align || 'left',
              paddingRight: 12,
            }}
          >{c.label}</div>
        ))}
      </div>
      <div>
        {rows.map((row, ri) => (
          <div
            key={ri}
            onClick={() => onRowClick && onRowClick(row)}
            style={{
              display: 'grid',
              gridTemplateColumns: columns.map(c => c.width || '1fr').join(' '),
              padding: '0 20px',
              borderBottom: ri === rows.length - 1 ? 'none' : '1px solid var(--border-subtle)',
              height: rowH,
              alignItems: 'center',
              cursor: onRowClick ? 'pointer' : 'default',
              transition: 'background var(--duration-fast) var(--ease-out)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {columns.map((c, ci) => (
              <div
                key={ci}
                style={{
                  textAlign: c.align || 'left',
                  paddingRight: 12,
                  font: c.mono ? '500 13px/1.3 var(--font-mono)' : '500 13px/1.3 var(--font-sans)',
                  color: c.color ? c.color(row[c.key]) : 'var(--fg-primary)',
                  fontVariantNumeric: c.mono ? 'tabular-nums' : 'normal',
                  fontWeight: c.bold ? 600 : (c.mono ? 500 : 500),
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}
              >
                {c.render ? c.render(row[c.key], row) : row[c.key]}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { DataTable });
