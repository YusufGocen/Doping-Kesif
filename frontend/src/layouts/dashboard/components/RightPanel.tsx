import { useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import Landscape from '@/shared/illustrations/Landscape';
import { startOfDay, weekOf, weekdays } from '@/shared/lib/date';
import { useDashboard } from '../DashboardContext';

export function RightPanel() {
  const { rightOpen, setPanel } = useDashboard();
  const today = startOfDay();
  const [selectedDate, setSelectedDate] = useState(startOfDay);
  const week = weekOf(selectedDate);
  const month = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(
    selectedDate,
  );
  const shiftWeek = (amount: number) =>
    setSelectedDate((previous) => {
      const date = new Date(previous);
      date.setDate(date.getDate() + amount * 7);
      return date;
    });
  return (
    <aside className={`right-panel ${rightOpen ? 'is-open' : ''}`} aria-label="Takvim ve yolculuk">
      <section className="calendar">
        <div className="calendar-heading">
          <h2 id="calendar-title" tabIndex={-1}>
            {month}
          </h2>
          <div>
            <button className="icon-button" aria-label="Önceki hafta" onClick={() => shiftWeek(-1)}>
              <ChevronLeft size={19} />
            </button>
            <button className="today-button" onClick={() => setSelectedDate(new Date(today))}>
              Bugün
            </button>
            <button className="icon-button" aria-label="Sonraki hafta" onClick={() => shiftWeek(1)}>
              <ChevronRight size={19} />
            </button>
          </div>
        </div>
        <div className="calendar-week">
          {week.map((date, i) => (
            <div key={date.toISOString()}>
              <span>{weekdays[i]}</span>
              <button
                aria-label={new Intl.DateTimeFormat('tr-TR', { dateStyle: 'full' }).format(date)}
                aria-pressed={date.getTime() === selectedDate.getTime()}
                className={`${date.getTime() === selectedDate.getTime() ? 'selected' : ''} ${date.getTime() === today.getTime() ? 'is-today' : ''}`}
                onClick={() => setSelectedDate(date)}
              >
                {date.getDate()}
              </button>
            </div>
          ))}
        </div>
      </section>
      <section className="journey-card">
        <div className="journey-copy">
          <span className="journey-eyebrow">HER GÜN BİR ADIM</span>
          <h2>
            YKS Yolculuğunu
            <br />
            Başlat!
          </h2>
          <p>Günlük çalışma temponu belirle, Dopi senin için en doğru programı hazırlasın.</p>
          <button className="primary small" onClick={() => setPanel('journey')}>
            Yolculuğu Başlat <ArrowRight size={15} />
          </button>
        </div>
        <Landscape className="journey-landscape" />
      </section>
      <button className="appearance-button" onClick={() => setPanel('settings')}>
        <Settings size={16} />
        Görünüm ayarları
        <ChevronRight size={15} />
      </button>
    </aside>
  );
}
