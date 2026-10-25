import type { LucideIcon } from 'lucide-react';
import {
  Home,
  BookOpen,
  FileCheck2,
  Waves,
  Video,
  ChartNoAxesCombined,
  MonitorCheck,
  LifeBuoy,
  MessageCircle,
} from 'lucide-react';
export const mainItems: { label: string; icon: LucideIcon; color: string }[] = [
  { label: 'Ana Sayfa', icon: Home, color: 'purple' },
  { label: 'Dersler', icon: BookOpen, color: 'orange' },
  { label: 'Testler ve Denemeler', icon: FileCheck2, color: 'green' },
  { label: 'WAY Evreni', icon: Waves, color: 'violet' },
  { label: 'Rehberlik Videoları', icon: Video, color: 'cyan' },
  { label: 'İstatistikler', icon: ChartNoAxesCombined, color: 'yellow' },
  { label: 'Akıllı Değerlendirme Paneli', icon: MonitorCheck, color: 'indigo' },
];
export const bottomItems = [
  { label: 'Yardım Merkezi', icon: LifeBuoy, color: 'teal' },
  { label: 'Canlı Etkinlikler', icon: Video, color: 'red' },
  { label: 'Öğrencilerimizden Dinleyin', icon: MessageCircle, color: 'sky' },
];
