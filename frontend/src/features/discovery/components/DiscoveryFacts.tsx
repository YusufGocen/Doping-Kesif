import { FileCheck2, Puzzle, Users, Star } from 'lucide-react';
export function DiscoveryFacts() {
  return (
    <section className="discovery-facts" aria-label="Keşif bilgileri">
      {[
        { icon: FileCheck2, title: '10 Soru', color: 'blue' },
        { icon: Puzzle, title: '20 Parça Puzzle', color: 'amber' },
        { icon: Users, title: 'Aynı Butik Grubu', color: 'mint' },
        { icon: Star, title: 'XP Kazan', color: 'violet' },
      ].map((item) => (
        <div className={`discovery-fact ${item.color}`} key={item.title}>
          <item.icon size={20} />
          <strong>{item.title}</strong>
        </div>
      ))}
    </section>
  );
}
