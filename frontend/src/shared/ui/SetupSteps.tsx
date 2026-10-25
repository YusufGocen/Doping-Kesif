import { ArrowRight } from 'lucide-react';
export function SetupSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="settings-stepper" aria-label="Oyun hazırlığı">
      {['Ayarlar', 'Arkadaş', 'Başlat'].map((label, index) => (
        <li key={label} aria-current={current === index + 1 ? 'step' : undefined}>
          <span className="settings-step-number">{index + 1}</span>
          {label}
          {index < 2 && <ArrowRight className="setup-step-arrow" size={18} aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}
