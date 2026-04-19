import { t } from '../i18n';
import { useState } from 'react';
import { useDeviceType } from '../hooks/useDeviceType';

export default function HomeScreen() {
  const { isMobile } = useDeviceType();
  const [range, setRange] = useState<'today' | 'month' | 'year' | 'all'>('month');

  return (
    <div className={`p-6 ${!isMobile ? 'max-w-[100dvh]' : ''} mx-auto w-full`}>
      <h1 className="text-2xl font-bold text-primary mb-6">{t.app_name}</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-bold text-text-main mb-6">Podsumowanie aktywności</h2>
        <div className="relative">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as any)}
            className="w-full bg-[#1a1b1e] text-text-main rounded-xl p-4 appearance-none focus:outline-none focus:ring-2 focus:ring-primary text-left"
          >
            <option value="today">Dzisiaj</option>
            <option value="month">Ten miesiąc</option>
            <option value="year">Ten rok</option>
            <option value="all">Wszystkie</option>
          </select>
          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-inactive">arrow_drop_down</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-bg-nav p-4 rounded-2xl flex flex-col items-center justify-center text-center min-h-[120px]">
          <span className="text-inactive text-sm mb-1">{t.total_distance}</span>
          <span className="text-3xl font-bold text-text-main">0.00</span>
          <span className="text-xs text-inactive mt-1">km</span>
        </div>
        
        <div className="bg-bg-nav p-4 rounded-2xl flex flex-col items-center justify-center text-center min-h-[120px]">
          <span className="text-inactive text-sm mb-1">{t.avg_speed}</span>
          <span className="text-3xl font-bold text-text-main">0.0</span>
          <span className="text-xs text-inactive mt-1">km/h</span>
        </div>

        <div className="bg-bg-nav p-4 rounded-2xl flex flex-col items-center justify-center text-center min-h-[120px]">
          <span className="text-inactive text-sm mb-1">Ulubiona aktywność</span>
          <span className="text-xl font-bold text-text-main capitalize">--</span>
        </div>

        <div className="bg-bg-nav p-4 rounded-2xl flex flex-col items-center justify-center text-center min-h-[120px]">
          <span className="text-inactive text-sm mb-1">Liczba aktywności</span>
          <span className="text-3xl font-bold text-text-main">0</span>
        </div>
      </div>
    </div>
  );
}
