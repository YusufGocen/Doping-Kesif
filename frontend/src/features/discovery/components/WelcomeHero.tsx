import { DiscoveryCompass as Compass } from '@/shared/brand/DiscoveryCompass';
import { Puzzle, Sparkles, Users, ListChecks } from 'lucide-react';
export function WelcomeHero() {
  return (
    <section className="discovery-hero" aria-labelledby="welcome-title">
      <img
        className="discovery-hero-art"
        src="/images/discovery/students-banner.png"
        alt="Tabletleriyle birlikte öğrenen iki öğrenci ve renkli puzzle parçaları"
        width="2172"
        height="724"
        fetchPriority="high"
      />
      <div className="discovery-hero-copy">
        <span className="hero-kicker">
          <Compass size={15} /> MERAK ET. BİRLİKTE KEŞFET.
        </span>
        <h1 id="welcome-title">
          Doping <span>Keşif</span>
        </h1>
        <p>
          Bir arkadaş, on soru,
          <br />
          keşfedilecek yepyeni bir dünya.
        </p>
        <div className="hero-facts">
          <span>
            <ListChecks size={15} />
            10 soru
          </span>
          <span>
            <Users size={15} />
            Birlikte oyna
          </span>
          <span>
            <Puzzle size={15} />
            20 parça
          </span>
          <span>
            <Sparkles size={15} />
            XP kazan
          </span>
        </div>
      </div>
    </section>
  );
}
