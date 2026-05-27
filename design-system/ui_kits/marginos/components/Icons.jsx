// Icons.jsx — handpicked Lucide icons inlined as a single component.
// Source: lucide.dev (MIT). Stroke-width default = 1.75 (MarginOS house value).

const ICON_PATHS = {
  'bar-chart-3': [['path', { d: 'M3 3v18h18' }], ['rect', { x: 7, y: 11, width: 3, height: 7 }], ['rect', { x: 13, y: 6, width: 3, height: 12 }]],
  'calculator':  [['rect', { x: 4, y: 2, width: 16, height: 20, rx: 2 }], ['line', { x1: 8, x2: 16, y1: 6, y2: 6 }], ['line', { x1: 16, x2: 16, y1: 14, y2: 18 }], ['path', { d: 'M16 10h.01' }], ['path', { d: 'M12 10h.01' }], ['path', { d: 'M8 10h.01' }], ['path', { d: 'M12 14h.01' }], ['path', { d: 'M8 14h.01' }], ['path', { d: 'M12 18h.01' }], ['path', { d: 'M8 18h.01' }]],
  'pie-chart':   [['path', { d: 'M21.21 15.89A10 10 0 1 1 8 2.83' }], ['path', { d: 'M22 12A10 10 0 0 0 12 2v10z' }]],
  'users':       [['path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }], ['circle', { cx: 9, cy: 7, r: 4 }], ['path', { d: 'M22 21v-2a4 4 0 0 0-3-3.87' }], ['path', { d: 'M16 3.13a4 4 0 0 1 0 7.75' }]],
  'file-spreadsheet': [['path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }], ['polyline', { points: '14 2 14 8 20 8' }], ['path', { d: 'M8 13h2' }], ['path', { d: 'M14 13h2' }], ['path', { d: 'M8 17h2' }], ['path', { d: 'M14 17h2' }]],
  'settings':    [['path', { d: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z' }], ['circle', { cx: 12, cy: 12, r: 3 }]],
  'package':     [['path', { d: 'm7.5 4.27 9 5.15' }], ['path', { d: 'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z' }], ['path', { d: 'm3.3 7 8.7 5 8.7-5' }], ['path', { d: 'M12 22V12' }]],
  'badge-dollar-sign': [['path', { d: 'M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z' }], ['path', { d: 'M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8' }], ['path', { d: 'M12 18V6' }]],
  'tag':         [['path', { d: 'M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z' }], ['circle', { cx: 7.5, cy: 7.5, r: 0.5, fill: 'currentColor' }]],
  'store':       [['path', { d: 'm2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7' }], ['path', { d: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8' }], ['path', { d: 'M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4' }], ['path', { d: 'M2 7h20' }], ['path', { d: 'M22 7v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7' }]],
  'search':      [['circle', { cx: 11, cy: 11, r: 8 }], ['path', { d: 'm21 21-4.3-4.3' }]],
  'chevron-left':[['path', { d: 'm15 18-6-6 6-6' }]],
  'chevron-right':[['path', { d: 'm9 18 6-6-6-6' }]],
  'chevron-down':[['path', { d: 'm6 9 6 6 6-6' }]],
  'x':           [['path', { d: 'M18 6 6 18' }], ['path', { d: 'm6 6 12 12' }]],
  'plus':        [['path', { d: 'M5 12h14' }], ['path', { d: 'M12 5v14' }]],
  'check':       [['path', { d: 'M20 6 9 17l-5-5' }]],
  'check-circle-2':[['circle', { cx: 12, cy: 12, r: 10 }], ['path', { d: 'm9 12 2 2 4-4' }]],
  'alert-triangle':[['path', { d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z' }], ['line', { x1: 12, x2: 12, y1: 9, y2: 13 }], ['line', { x1: 12, x2: 12.01, y1: 17, y2: 17 }]],
  'alert-circle':[['circle', { cx: 12, cy: 12, r: 10 }], ['line', { x1: 12, x2: 12, y1: 8, y2: 12 }], ['line', { x1: 12, x2: 12.01, y1: 16, y2: 16 }]],
  'x-circle':    [['circle', { cx: 12, cy: 12, r: 10 }], ['path', { d: 'm15 9-6 6' }], ['path', { d: 'm9 9 6 6' }]],
  'log-out':     [['path', { d: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' }], ['polyline', { points: '16 17 21 12 16 7' }], ['line', { x1: 21, x2: 9, y1: 12, y2: 12 }]],
  'sun':         [['circle', { cx: 12, cy: 12, r: 4 }], ['path', { d: 'M12 2v2' }], ['path', { d: 'M12 20v2' }], ['path', { d: 'm4.93 4.93 1.41 1.41' }], ['path', { d: 'm17.66 17.66 1.41 1.41' }], ['path', { d: 'M2 12h2' }], ['path', { d: 'M20 12h2' }], ['path', { d: 'm6.34 17.66-1.41 1.41' }], ['path', { d: 'm19.07 4.93-1.41 1.41' }]],
  'moon':        [['path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' }]],
  'trending-up': [['polyline', { points: '22 7 13.5 15.5 8.5 10.5 2 17' }], ['polyline', { points: '16 7 22 7 22 13' }]],
  'trending-down':[['polyline', { points: '22 17 13.5 8.5 8.5 13.5 2 7' }], ['polyline', { points: '16 17 22 17 22 11' }]],
  'arrow-right': [['line', { x1: 5, y1: 12, x2: 19, y2: 12 }], ['polyline', { points: '12 5 19 12 12 19' }]],
  'arrow-up-right': [['line', { x1: 7, y1: 17, x2: 17, y2: 7 }], ['polyline', { points: '7 7 17 7 17 17' }]],
  'download':    [['path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }], ['polyline', { points: '7 10 12 15 17 10' }], ['line', { x1: 12, x2: 12, y1: 15, y2: 3 }]],
  'printer':     [['polyline', { points: '6 9 6 2 18 2 18 9' }], ['path', { d: 'M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2' }], ['rect', { width: 12, height: 8, x: 6, y: 14 }]],
  'filter':      [['polygon', { points: '22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3' }]],
  'target':      [['circle', { cx: 12, cy: 12, r: 10 }], ['circle', { cx: 12, cy: 12, r: 6 }], ['circle', { cx: 12, cy: 12, r: 2 }]],
  'layers':      [['path', { d: 'm12.83 2.18 8.4 4.2a1 1 0 0 1 0 1.79l-8.4 4.2a1 1 0 0 1-.9 0L3.5 8.17a1 1 0 0 1 0-1.79l8.43-4.2a1 1 0 0 1 .9 0Z' }], ['path', { d: 'M2 12.3 11.93 17a1 1 0 0 0 .14 0L22 12.3' }], ['path', { d: 'M2 17.3 11.93 22a1 1 0 0 0 .14 0L22 17.3' }]],
  'building-2': [['path', { d: 'M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z' }], ['path', { d: 'M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2' }], ['path', { d: 'M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2' }], ['path', { d: 'M10 6h4' }], ['path', { d: 'M10 10h4' }], ['path', { d: 'M10 14h4' }], ['path', { d: 'M10 18h4' }]],
  'factory':     [['path', { d: 'M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z' }], ['path', { d: 'M17 18h1' }], ['path', { d: 'M12 18h1' }], ['path', { d: 'M7 18h1' }]],
  'sparkles':    [['path', { d: 'M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8M12 6.5L14 12l-2 5.5L10 12Z' }]],
  'clock':       [['circle', { cx: 12, cy: 12, r: 10 }], ['polyline', { points: '12 6 12 12 16 14' }]],
  'menu':        [['line', { x1: 4, x2: 20, y1: 12, y2: 12 }], ['line', { x1: 4, x2: 20, y1: 6, y2: 6 }], ['line', { x1: 4, x2: 20, y1: 18, y2: 18 }]],
  'command':     [['path', { d: 'M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z' }]],
  'circle-dot':  [['circle', { cx: 12, cy: 12, r: 10 }], ['circle', { cx: 12, cy: 12, r: 1, fill: 'currentColor' }]],
};

function Icon({ name, size = 16, strokeWidth, className = '', style = {} }) {
  const paths = ICON_PATHS[name];
  if (!paths) {
    return <span style={{ display: 'inline-block', width: size, height: size, ...style }} />;
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? 1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`lucide-icon ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      {paths.map(([tag, attrs], i) => React.createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}

Object.assign(window, { Icon });
