import { DiscoveryCompass as Compass } from '@/shared/brand/DiscoveryCompass';
import { ArrowRight, KeyRound, Library } from 'lucide-react';
import { Link } from 'react-router-dom';
export function DiscoveryShortcuts() {
  return (
    <nav className="discovery-shortcuts" aria-label="Keşif kısayolları">
      <Link
        aria-label="Oda Koduyla Katıl"
        className="discovery-shortcut mint"
        to="/kesif/oda?tab=katil"
      >
        <span className="shortcut-icon">
          <KeyRound size={27} />
        </span>
        <div>
          <strong>Oda Koduyla Katıl</strong>
          <p>Kodunu gir, arkadaşının keşfine katıl.</p>
        </div>
        <ArrowRight size={18} />
      </Link>
      <Link aria-label="Koleksiyonum" className="discovery-shortcut violet" to="/kesif/koleksiyon">
        <span className="shortcut-icon">
          <Library size={27} />
        </span>
        <div>
          <strong>Koleksiyonum</strong>
          <p>Açtığın parçalar, biriktirdiğin dünyalar.</p>
        </div>
        <ArrowRight size={18} />
      </Link>
      <a className="discovery-shortcut blue" href="#puzzle-tasks-title">
        <span className="shortcut-icon">
          <Compass size={27} />
        </span>
        <div>
          <strong>Yeni Bir Keşif</strong>
          <p>Rotanı seç, birlikte yola çıkın.</p>
        </div>
        <ArrowRight size={18} />
      </a>
    </nav>
  );
}
