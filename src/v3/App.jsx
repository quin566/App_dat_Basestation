import React from 'react'
import { LayoutDashboard, Calculator, ShieldCheck, Mail, Settings, Camera, BarChart2, CalendarDays, MapPin } from 'lucide-react'
import { StateProvider, useAppState } from './contexts/StateContext'
import GuidedTour from './components/GuidedTour'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary caught]', error, info);
    this.setState({ info });
  }
  render() {
    if (this.state.hasError) {
      const msg   = this.state.error?.message || 'Unknown error';
      const stack = this.state.error?.stack    || '';
      const comp  = this.state.info?.componentStack || '';
      return (
        <div style={{ position:'fixed', inset:0, background:'#7f1d1d', color:'#fef2f2',
                      display:'flex', flexDirection:'column', padding:'32px', overflow:'auto',
                      fontFamily:'monospace', zIndex:9999 }}>
          <div style={{ fontSize:'20px', fontWeight:'900', marginBottom:'12px' }}>
            ⚠ RENDER CRASH — read this and copy to Claude
          </div>
          <div style={{ fontSize:'14px', background:'#991b1b', padding:'12px', borderRadius:'8px',
                        marginBottom:'12px', whiteSpace:'pre-wrap', wordBreak:'break-all' }}>
            {msg}
          </div>
          <div style={{ fontSize:'11px', opacity:0.8, whiteSpace:'pre-wrap', wordBreak:'break-all',
                        marginBottom:'12px' }}>
            {stack}
          </div>
          <div style={{ fontSize:'11px', opacity:0.6, whiteSpace:'pre-wrap', wordBreak:'break-all',
                        marginBottom:'20px' }}>
            Component stack:{comp}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null, info: null })}
            style={{ padding:'10px 24px', background:'#fef2f2', color:'#7f1d1d',
                     fontWeight:'900', border:'none', borderRadius:'8px', cursor:'pointer',
                     alignSelf:'flex-start' }}
          >
            Dismiss
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import DashboardView from './components/Dashboard/DashboardView'
import TaxPlannerView from './components/TaxPlanner/TaxPlannerView'
import ComplianceView from './components/Compliance/ComplianceView'
import EmailView from './components/Email/EmailView'
import SettingsView from './components/Settings/SettingsView'
import PackageCalculatorView from './components/PackageCalculator/PackageCalculatorView'
import BusinessHealthView from './components/BusinessHealth/BusinessHealthView'
import SessionsView from './components/Sessions/SessionsView'
import LocationsView from './components/Locations/LocationsView'

const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard',    icon: LayoutDashboard, built: true },
  { id: 'sessions',   label: 'Sessions',     icon: CalendarDays,    built: true },
  { id: 'locations',  label: 'Locations',    icon: MapPin,          built: true },
  { id: 'taxes',      label: 'Tax Planner',  icon: Calculator,      built: true },
  { id: 'packages',   label: 'Packages',     icon: Camera,          built: true },
  { id: 'health',     label: 'Business Health', icon: BarChart2,    built: true },
  { id: 'compliance', label: 'Compliance',   icon: ShieldCheck,     built: true },
  { id: 'email',      label: 'Email Ops',    icon: Mail,            built: true },
  { id: 'settings',   label: 'Settings',     icon: Settings,        built: true },
];

function AppContent() {
  const { isLoaded, activeTab, setActiveTab, runTour } = useAppState()

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FDFCFB]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-[#5F6F65] flex items-center justify-center text-white font-black text-lg">L</div>
          <div className="text-sm font-bold text-[#9C8A7A] animate-pulse">Initializing Core...</div>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':  return <DashboardView />;
      case 'sessions':   return <SessionsView />;
      case 'locations':  return <LocationsView />;
      case 'taxes':      return <TaxPlannerView />;
      case 'packages':   return <PackageCalculatorView />;
      case 'health':     return <BusinessHealthView />;
      case 'compliance': return <ComplianceView />;
      case 'email':      return <EmailView />;
      case 'settings':   return <SettingsView />;
      default:
        return (
          <div className="p-12 flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-3xl bg-[#F2EFE9] border border-[#E8E4E1] flex items-center justify-center mb-6 text-[#5F6F65]">
              {(() => { const nav = NAV_ITEMS.find(n => n.id === activeTab); return nav ? <nav.icon size={28} /> : null; })()}
            </div>
            <h2 className="text-2xl font-black text-[#2C2511] mb-3 capitalize">{activeTab.replace('-', ' ')}</h2>
            <div className="max-w-xs p-6 bg-white border border-[#E8E4E1] rounded-3xl">
              <p className="text-sm text-[#8A7A6A] font-medium leading-relaxed">
                Scheduled for the next phase. The core Tax and Compliance modules are already live!
              </p>
              <div className="mt-5 flex justify-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#5F6F65] animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#5F6F65] animate-pulse [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#5F6F65] animate-pulse [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#FDFCFB] text-[#332F2E]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#E8E4E1] bg-white p-6 hidden md:flex flex-col">
        <h1 className="text-xl font-black tracking-tighter mb-10 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#5F6F65] flex items-center justify-center text-white font-black">L</div>
          COMMAND CENTER
        </h1>
        <nav className="space-y-1 flex-1">
          {NAV_ITEMS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              data-tour-id={tab.id}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5F6F65]/60 focus-visible:ring-offset-1 ${
                activeTab === tab.id
                  ? 'bg-[#F4F1EE] text-[#5F6F65] rounded-r-xl border-l-2 border-[#5F6F65]'
                  : 'text-[#9C8A7A] hover:bg-[#FDFCFB] hover:text-[#5F6F65] rounded-xl border-l-2 border-transparent'
              }`}
            >
              <tab.icon size={18} strokeWidth={activeTab === tab.id ? 2.5 : 1.8} />
              <span className="flex-1 text-left">{tab.label}</span>
              {!tab.built && (
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-[#F2EFE9] text-[#B0A090] rounded-full">Soon</span>
              )}
            </button>
          ))}

        </nav>
        <div className="mt-auto pt-6 border-t border-[#F2EFE9]">
          <div className="px-3 py-2 rounded-xl bg-[#EEF2F0] text-[11px] font-black text-[#5F6F65] tracking-widest uppercase text-center">
            V3 REBUILD ACTIVE
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-white/50">
        {renderContent()}
      </main>
      {runTour && <GuidedTour />}
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <StateProvider>
        <AppContent />
      </StateProvider>
    </ErrorBoundary>
  )
}

export default App
