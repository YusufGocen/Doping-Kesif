import {
  Pi,
  BookOpen,
  FlaskConical,
  Flag,
  ALargeSmall,
  Moon,
  Palette,
  Monitor,
  Globe,
} from 'lucide-react';

/** Presentation only; catalog IDs and availability remain server-owned. */
export function SubjectIcon({ name }: { name: string }) {
  const label = name.toLocaleLowerCase('tr-TR');
  const visual = label.includes('matematik')
    ? { Icon: Pi, tone: 'math' }
    : label.includes('türkçe')
      ? { Icon: BookOpen, tone: 'turkish' }
      : label.includes('fen')
        ? { Icon: FlaskConical, tone: 'science' }
        : label.includes('inkılap') || label.includes('tarih')
          ? { Icon: Flag, tone: 'history' }
          : label.includes('ingilizce')
            ? { Icon: ALargeSmall, tone: 'english' }
            : label.includes('din')
              ? { Icon: Moon, tone: 'religion' }
              : label.includes('görsel')
                ? { Icon: Palette, tone: 'art' }
                : label.includes('bilişim')
                  ? { Icon: Monitor, tone: 'technology' }
                  : label.includes('sosyal')
                    ? { Icon: Globe, tone: 'social' }
                    : { Icon: BookOpen, tone: 'general' };
  return (
    <span className={'subject-symbol ' + visual.tone} aria-hidden="true">
      <visual.Icon size={28} strokeWidth={2.3} />
    </span>
  );
}
