import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useDrawerFocus } from '@/shared/hooks/useDrawerFocus';
import type { Panel } from './types';

interface DashboardState {
  menuOpen: boolean;
  rightOpen: boolean;
  compact: boolean;
  panel: Panel | null;
  notice: string;
  setMenuOpen: (value: boolean) => void;
  setRightOpen: (value: boolean) => void;
  setCompact: (value: boolean) => void;
  setPanel: (value: Panel | null) => void;
  dismissNotice: () => void;
  platformNotice: () => void;
}
const DashboardContext = createContext<DashboardState | null>(null);
export function DashboardProvider({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [notice, setNotice] = useState('');
  const dismissNotice = useCallback(() => setNotice(''), []);
  const platformNotice = useCallback(() => {
    setNotice(
      'Bu bölüm Doping Hafıza platformuna aittir. Yerel önizlemede Doping Keşif’i inceleyebilirsin.',
    );
    setMenuOpen(false);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(dismissNotice, 5000);
    return () => window.clearTimeout(timer);
  }, [notice, dismissNotice]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setRightOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  useDrawerFocus(menuOpen ? '.sidebar' : rightOpen ? '.right-panel' : null);
  const value = useMemo(
    () => ({
      menuOpen,
      rightOpen,
      compact,
      panel,
      notice,
      setMenuOpen,
      setRightOpen,
      setCompact,
      setPanel,
      dismissNotice,
      platformNotice,
    }),
    [menuOpen, rightOpen, compact, panel, notice, dismissNotice, platformNotice],
  );
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}
export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) throw new Error('Dashboard components require DashboardProvider');
  return context;
}
