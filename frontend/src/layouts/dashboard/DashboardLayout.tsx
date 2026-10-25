import type { ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Toast } from '@/shared/ui/Toast';
import { DashboardProvider, useDashboard } from './DashboardContext';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { RightPanel } from './components/RightPanel';
import { Footer } from './components/Footer';
import { ShellDialogs } from './components/ShellDialogs';
import type { DashboardOutletContext } from './types';
import './dashboard.css';

function DashboardFrame({ activity }: { activity?: ReactNode }) {
  const {
    menuOpen,
    rightOpen,
    compact,
    setMenuOpen,
    setRightOpen,
    setPanel,
    notice,
    dismissNotice,
  } = useDashboard();
  const location = useLocation();
  useEffect(() => {
    setMenuOpen(false);
    setRightOpen(false);
    document.getElementById('main-content')?.focus();
  }, [location.pathname, setMenuOpen, setRightOpen]);
  const context: DashboardOutletContext = { openHelp: () => setPanel('help') };
  return (
    <div className={'app ' + (compact ? 'compact' : '')}>
      <a className="skip-link" href="#main-content">
        İçeriğe geç
      </a>
      {(menuOpen || rightOpen) && (
        <button
          className="drawer-shade"
          aria-label="Açık paneli kapat"
          onClick={() => {
            setMenuOpen(false);
            setRightOpen(false);
          }}
        />
      )}
      <Sidebar />
      <div className="workspace">
        <Topbar />
        <div className="content-layout">
          <main id="main-content" tabIndex={-1} className="main-content">
            {activity}
            <Outlet context={context} />
          </main>
          <RightPanel />
        </div>
        <Footer />
      </div>
      <Toast message={notice} onClose={dismissNotice} />
      <ShellDialogs />
    </div>
  );
}
export default function DashboardLayout({ activity }: { activity?: ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardFrame activity={activity} />
    </DashboardProvider>
  );
}
