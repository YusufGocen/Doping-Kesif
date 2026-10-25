export type Panel =
  'profile' | 'notifications' | 'messages' | 'help' | 'journey' | 'discovery' | 'settings';
export interface DashboardOutletContext {
  openHelp: () => void;
}
