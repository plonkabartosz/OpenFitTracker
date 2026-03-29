import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { t } from '../i18n';
import { useState } from 'react';

export default function HomeScreen() {
  const [range, setRange] = useState<'today' | 'month' | 'year' | 'all'>('month');

  const sessions = useLiveQuery(
    () => db.sessions.where('isFinished').equals(1).toArray()
  );

  if (!sessions) return <div className="p-4">Loading...</div>;

  const now = new Date();
  const filteredSessions = sessions.filter(s => {
    const d = new Date(s.startTime);
    if (range === 'today') {
      return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (range === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (range === 'year') {
      return d.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const totalDistance = filteredSessions.reduce((acc, s) => acc + s.distanceMeters, 0) / 1000;
  const totalDurationMs = filteredSessions.reduce((acc, s) => acc + s.durationMs, 0);
  const totalDurationHours = totalDurationMs / (1000 * 60 * 60);
  const avgSpeed = totalDurationHours > 0 ? totalDistance / totalDurationHours : 0;

  // Calculate favorite activity
  const activityCounts = filteredSessions.reduce((acc, s) => {
    acc[s.type] = (acc[s.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  let favoriteActivity = '--';
  let maxCount = 0;
  for (const [type, count] of Object.entries(activityCounts)) {
    if (count > maxCount) {
      maxCount = count;
      favoriteActivity = type;
    }
  }

  return (
    <div className="p-6">
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
          <span className="text-3xl font-bold text-text-main">{totalDistance.toFixed(2)}</span>
          <span className="text-xs text-inactive mt-1">km</span>
        </div>
        
        <div className="bg-bg-nav p-4 rounded-2xl flex flex-col items-center justify-center text-center min-h-[120px]">
          <span className="text-inactive text-sm mb-1">{t.avg_speed}</span>
          <span className="text-3xl font-bold text-text-main">{avgSpeed.toFixed(1)}</span>
          <span className="text-xs text-inactive mt-1">km/h</span>
        </div>

        <div className="bg-bg-nav p-4 rounded-2xl flex flex-col items-center justify-center text-center min-h-[120px]">
          <span className="text-inactive text-sm mb-1">Ulubiona aktywność</span>
          <span className="text-xl font-bold text-text-main capitalize">{favoriteActivity}</span>
        </div>

        <div className="bg-bg-nav p-4 rounded-2xl flex flex-col items-center justify-center text-center min-h-[120px]">
          <span className="text-inactive text-sm mb-1">Liczba aktywności</span>
          <span className="text-3xl font-bold text-text-main">{filteredSessions.length}</span>
        </div>
      </div>
    </div>
  );
}
