import type { ReactNode } from 'react';
import { WelcomeHero } from '../components/WelcomeHero';
import '../styles/home.css';
import '../styles/dashboard-home.css';
export default function DiscoveryHomePage({ children }: { children: ReactNode }) {
  return (
    <div className="discovery-home">
      <WelcomeHero />
      {children}
    </div>
  );
}
