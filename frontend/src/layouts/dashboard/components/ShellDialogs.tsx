import { DiscoveryCompass as Compass } from '@/shared/brand/DiscoveryCompass';
import { UserAvatar } from '@/shared/ui/avatar/UserAvatar';
import { Check, Puzzle } from 'lucide-react';
import { Dialog } from '@/shared/ui/Dialog';
import { useDashboard } from '../DashboardContext';
import type { Panel } from '../types';
import { useSession } from '@/shared/session/SessionProvider';
export function ShellDialogs() {
  const { session, store } = useSession();
  const { panel, setPanel, compact, setCompact } = useDashboard();
  const titles: Record<NonNullable<Panel>, string> = {
    profile: 'Profilim',
    notifications: 'Bildirimler',
    messages: 'Mesajlar',
    help: 'Birlikte nasıl keşfederiz?',
    journey: 'Kendi yolculuğunu çiz',
    discovery: 'Yeni bir keşfe doğru',
    settings: 'Görünüm ayarları',
  };

  if (!panel) return null;
  const close = () => setPanel(null);
  return (
    <Dialog
      title={titles[panel]}
      onClose={close}
      icon={<Compass size={24} />}
      footer={
        <button className="primary modal-done" onClick={close}>
          Anladım <Check size={17} />
        </button>
      }
    >
      {panel === 'help' ? (
        <>
          <p>
            Bir arkadaşınla aynı soruları çöz, doğru cevaplarınla ortak görselin parçalarını aç.
          </p>
          <ol className="help-steps">
            <li>Bir keşif ve ders seç.</li>
            <li>Arkadaşını davet et veya oda kodunu paylaş.</li>
            <li>10 soruyu birlikte tamamla; 20 parçayı keşfet!</li>
          </ol>
        </>
      ) : panel === 'settings' ? (
        <>
          <p>Sol menüde sana uygun görünümü seç.</p>
          <label className="setting-option">
            <span>Sıkışık menü görünümü</span>
            <input
              type="checkbox"
              checked={compact}
              onChange={(e) => setCompact(e.target.checked)}
            />
          </label>
        </>
      ) : panel === 'profile' ? (
        <>
          <div className="profile-summary">
            <span className="avatar large">
              <UserAvatar identity={session?.user.externalUserId} />
            </span>
            <div>
              <strong>{session?.user.displayName ?? 'Öğrenci profili'}</strong>
              <span>Birlikte öğrenmeye hazır!</span>
            </div>
          </div>
          <button
            className="text-button"
            onClick={() => {
              close();
              store.clear();
            }}
          >
            Çıkış yap
          </button>
          <p className="muted">
            {session
              ? 'Doğrulanmış yerel öğrenci oturumu.'
              : 'Bu yerel önizlemede bir öğrenci hesabı henüz seçilmedi.'}
          </p>
        </>
      ) : panel === 'discovery' ? (
        <>
          <p>
            Keşif haritan hazırlanıyor. Bir sonraki adımda dersini seçip arkadaşınla yolculuğa
            çıkabileceksin.
          </p>
          <div className="modal-note">
            <Puzzle size={20} /> 10 soru · 20 parça · Birlikte keşif
          </div>
        </>
      ) : panel === 'journey' ? (
        <>
          <p>Her gün attığın küçük bir adım, büyük bir keşfin başlangıcıdır.</p>
          <div className="modal-note">Gününü planlamak için takvimden bir tarih seçebilirsin.</div>
        </>
      ) : (
        <>
          <p>
            {panel === 'messages'
              ? 'Henüz görüntülenecek bir mesajın yok.'
              : 'Şu an görüntülenecek yeni bir bildirim yok.'}
          </p>
          <p className="muted">Bu önizleme Doping Hafıza hesabına bağlı değildir.</p>
        </>
      )}
    </Dialog>
  );
}
