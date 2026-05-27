// App.jsx — root composition: shell, theme, active route.

function App() {
  const [theme, setTheme] = React.useState(() => localStorage.getItem('mos-theme') || 'light');
  const [active, setActive] = React.useState('dashboard');
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.body.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('mos-theme', theme);
  }, [theme]);

  const pages = {
    dashboard:        { title: 'Executive Dashboard',  subtitle: 'AÑO · 2025', node: <ExecutiveDashboard /> },
    simulator:        { title: 'Simular Negocio',      subtitle: 'Nuevo escenario', node: <Simulator /> },
    customers:        { title: 'Clientes',             subtitle: '7 cuentas',       node: <CustomersPage /> },
    'pricing-manager':{ title: 'Pricing Manager',      subtitle: '5 productos × 4 canales', node: <PricingManager /> },
    scenarios:        { title: 'Escenarios',           subtitle: '', node: <Placeholder icon="pie-chart" title="Versiones de escenarios" blurb="Lista de simulaciones guardadas con vigencia, márgenes y trazabilidad. Vista de detalle disponible en el simulador." /> },
    products:         { title: 'Productos',            subtitle: '', node: <Placeholder icon="package" title="Catálogo SAP" blurb="Productos activos sincronizados con SAP. Edición no disponible en la demo." /> },
    'price-lists':    { title: 'Listas de Precios',    subtitle: '', node: <Placeholder icon="tag" title="Bases tarifarias por canal" blurb="Genera listas multimoneda con vigencia anual o personalizada." /> },
    channels:         { title: 'Canales de Venta',     subtitle: '', node: <Placeholder icon="store" title="Taxonomía de canales" blurb="Retail, Distribuidor, Constructora, E-commerce, Exportación." /> },
    import:           { title: 'Importar BOM',         subtitle: '', node: <Placeholder icon="file-spreadsheet" title="Carga de costos BOM" blurb="Sube el archivo BOM en formato Excel para refrescar costos." /> },
    costs:            { title: 'Costos Reales',        subtitle: '', node: <Placeholder icon="settings" title="Administración de costos" blurb="Costos maestros consolidados desde el último cierre contable." /> },
  };
  const page = pages[active] || pages.dashboard;

  return (
    <div className="shell">
      <Sidebar
        active={active}
        onNavigate={setActive}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(c => !c)}
        theme={theme}
      />
      <div className="shell-main">
        <Topbar
          title={page.title}
          subtitle={page.subtitle}
          theme={theme}
          onThemeChange={setTheme}
          onSearch={() => {}}
        />
        <div className="shell-content">
          {page.node}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
