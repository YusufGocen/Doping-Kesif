import { UserAvatar } from '@/shared/ui/avatar/UserAvatar';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  ChevronDown,
  Mail,
  Menu,
  Search,
  X,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/shared/session/SessionProvider';
import { useDashboard } from '../DashboardContext';
import { mainItems } from '../config/navigation';

export function Topbar() {
  const { session } = useSession();
  const { menuOpen, setMenuOpen, rightOpen, setRightOpen, setPanel, platformNotice } =
    useDashboard();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSearchFocused(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  const results = [
    ...mainItems.map((item) => item.label),
    'Doping Keşif',
    'Koleksiyonum',
    'Yardım Merkezi',
  ].filter((label) => label.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr')));
  return (
    <header className="topbar">
      <button
        className="icon-button mobile-menu"
        aria-label="Menüyü aç"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(true)}
      >
        <Menu size={23} />
      </button>
      <div className="search-wrap">
        <Search size={21} aria-hidden="true" />
        <input
          aria-label="Bölümlerde ara"
          placeholder="Ders, ünite ya da konu ara"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
        {query && (
          <button
            className="search-clear"
            aria-label="Aramayı temizle"
            onClick={() => setQuery('')}
          >
            <X size={16} />
          </button>
        )}
        {searchFocused && query.trim() && (
          <div className="search-results">
            <small>Bölümler</small>
            {results.length ? (
              results.map((label) => (
                <button
                  key={label}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setQuery('');
                    setSearchFocused(false);
                    label === 'Doping Keşif'
                      ? navigate('/kesif')
                      : label === 'Koleksiyonum'
                        ? navigate('/kesif/koleksiyon')
                        : label === 'Yardım Merkezi'
                          ? setPanel('help')
                          : platformNotice();
                  }}
                >
                  {label}
                  <ArrowRight size={15} />
                </button>
              ))
            ) : (
              <p>Eşleşen bölüm bulunamadı.</p>
            )}
          </div>
        )}
      </div>
      <div className="top-actions">
        <button
          className="quick-action"
          aria-label="Keşif hakkında"
          onClick={() => setPanel('help')}
        >
          <Zap size={23} />
        </button>
        <span className="action-separator" />
        <button
          className="icon-button soft optional-action"
          aria-label="Mesajlar"
          onClick={() => setPanel('messages')}
        >
          <Mail size={20} />
        </button>
        <button
          className="icon-button soft"
          aria-label="Takvimi göster"
          aria-expanded={rightOpen}
          onClick={() => {
            if (window.matchMedia('(max-width: 940px)').matches) setRightOpen(!rightOpen);
            else document.getElementById('calendar-title')?.focus();
          }}
        >
          <CalendarCheck size={20} />
        </button>
        <button
          className="icon-button soft"
          aria-label="Bildirimler"
          onClick={() => setPanel('notifications')}
        >
          <Bell size={20} />
        </button>
        <button
          className="profile-button"
          aria-label="Öğrenci profilini aç"
          onClick={() => setPanel('profile')}
        >
          <span className="avatar">
            <UserAvatar identity={session?.user.externalUserId} />
          </span>
          <span className="profile-label">
            {session?.user.displayName ?? 'Öğrenci'}
            <ChevronDown size={14} />
          </span>
        </button>
      </div>
    </header>
  );
}
