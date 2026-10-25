import { DiscoveryCompass as Compass } from '@/shared/brand/DiscoveryCompass';
import { ArrowRight, ListChecks, Puzzle, Trophy, Users } from 'lucide-react';
export function DiscoveryGuide({ onOpenHelp }: { onOpenHelp?: () => void }) {
  const steps = [
    {
      icon: Compass,
      title: 'Görevini seç',
      text: 'Merak ettiğin dünyayı, sınıfını ve dersini seç.',
      tone: 'blue',
    },
    {
      icon: Users,
      title: 'Arkadaşını davet et',
      text: 'Davet gönder veya oda kodunu paylaş.',
      tone: 'mint',
    },
    {
      icon: ListChecks,
      title: 'Soruları çöz',
      text: 'Aynı 10 soruyu birlikte cevaplayın.',
      tone: 'violet',
    },
    {
      icon: Puzzle,
      title: 'Dünyayı tamamla',
      text: 'Doğru cevaplarla parçaları aç, XP kazan.',
      tone: 'amber',
    },
  ];
  return (
    <section className="home-guide" aria-labelledby="guide-title">
      <div className="home-section-heading">
        <div className="home-section-title">
          <span className="section-emblem amber">
            <Trophy size={23} />
          </span>
          <div>
            <h2 id="guide-title">Nasıl Oynanır?</h2>
            <p>Dört küçük adım, birlikte büyük bir keşif.</p>
          </div>
        </div>
        {onOpenHelp && (
          <button className="home-guide-help" onClick={onOpenHelp}>
            Nasıl keşfederim?
            <ArrowRight size={15} />
          </button>
        )}
      </div>
      <ol className="discovery-instructions">
        {steps.map((step, index) => (
          <li key={step.title} className="instruction-step" data-tone={step.tone}>
            <span className="instruction-number">{index + 1}</span>
            <span className="instruction-icon">
              <step.icon size={28} aria-hidden="true" />
            </span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
