import { DiscoveryCompass as Compass } from '@/shared/brand/DiscoveryCompass';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronDown, Smartphone, Search, Sparkles, GraduationCap } from 'lucide-react';
import { Brand } from '@/shared/brand/Brand';
import { useDashboard } from '../DashboardContext';
import { mainItems, bottomItems } from '../config/navigation';

export function Sidebar() {
  const { menuOpen, setMenuOpen, platformNotice, setPanel } = useDashboard();
  const [individualOpen, setIndividualOpen] = useState(true);
  return (
    <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`} aria-label="Ana menü">
      <div className="brand-row">
        <Brand />
      </div>
      <nav className="navigation" aria-label="Doping Hafıza bölümleri">
        <div className="nav-group">
          {mainItems.map((item) => (
            <button className="nav-item" key={item.label} onClick={platformNotice}>
              <span className={`nav-icon ${item.color}`}>
                <item.icon size={17} strokeWidth={1.8} />
              </span>
              <span>{item.label}</span>
            </button>
          ))}
          <button
            className="nav-item"
            aria-expanded={individualOpen}
            aria-controls="individual-menu"
            onClick={() => setIndividualOpen(!individualOpen)}
          >
            <span className="nav-icon magenta">
              <Smartphone size={17} />
            </span>
            <span>Bire Bir Uygulamalar</span>
            <ChevronDown className={individualOpen ? 'rotated' : ''} size={15} />
          </button>
          {individualOpen && (
            <div id="individual-menu" className="sub-navigation">
              {[
                { label: 'Çözücü', icon: Search },
                { label: 'Şimdi Anladım', icon: Sparkles },
                { label: 'Koçum Yanımda', icon: GraduationCap },
              ].map((item) => (
                <button className="nav-item" key={item.label} onClick={platformNotice}>
                  <span className="sub-icon">
                    <item.icon size={16} />
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="nav-group bottom-group">
          {bottomItems.map((item) => (
            <button
              className="nav-item"
              key={item.label}
              onClick={item.label === 'Yardım Merkezi' ? () => setPanel('help') : platformNotice}
            >
              <span className={`nav-icon ${item.color}`}>
                <item.icon size={17} />
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        <NavLink
          to="/kesif"
          className="nav-item discovery-nav"
          onClick={() => {
            setMenuOpen(false);
            document.getElementById('main-content')?.focus();
          }}
        >
          <span className="discovery-nav-icon">
            <Compass size={21} />
          </span>
          <span>
            Doping Keşif<small>Birlikte öğren, birlikte keşfet</small>
          </span>
          <span className="active-dot" />
        </NavLink>
      </nav>
      <div className="sidebar-foot">
        <span>Birlikte daha fazlası.</span>
        <span className="mini-spark">✧</span>
      </div>
    </aside>
  );
}
