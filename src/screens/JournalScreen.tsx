import { useState, useEffect } from 'react';
import { t } from '../i18n';
import { useDeviceType } from '../hooks/useDeviceType';
import { useNavigate } from 'react-router-dom';
import { ActivitySession } from '../db';
import { formatDistance, formatDuration } from '../utils/format';

export default function JournalScreen() {
  const { isMobile } = useDeviceType();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ActivitySession[]>([]);

  useEffect(() => {
    window.onSessionsLoaded = (sessionsStr: string) => {
        try {
            const data: ActivitySession[] = JSON.parse(sessionsStr);
            setSessions(data);
        } catch(e) {
            console.error("Failed to parse sessions", e);
        }
    };

    if (window.Android && window.Android.requestSessions) {
        window.Android.requestSessions();
    }

    return () => {
        delete (window as any).onSessionsLoaded;
    };
  }, []);

  const handleDelete = (id?: number) => {
      if (!id) return;
      if (window.Android && window.Android.deleteSession) {
          window.Android.deleteSession(id);
          // Optimistically remove
          setSessions(prev => prev.filter(s => s.id !== id));
      }
  };

  return (
    <div className={`p-6 ${!isMobile ? 'max-w-[100dvh]' : ''} mx-auto w-full`}>
      <h1 className="text-2xl font-bold text-primary mb-6">{t.nav_journal}</h1>
      
      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-inactive">
          <p className="text-xl font-medium">{t.no_sessions}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map(session => (
            <div key={session.id} className="bg-bg-nav rounded-2xl p-4 shadow-sm" onClick={() => navigate(`/activity/${session.id}`)}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xl">
                    {session.type === t.activity_types[0] ? '🏃' : session.type === t.activity_types[1] ? '🚶' : '🚴'}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{session.type}</h3>
                    <p className="text-sm text-inactive">{new Date(session.startTime).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(session.id); }}
                  className="w-10 h-10 bg-black/20 text-inactive hover:bg-danger/20 hover:text-danger rounded-full flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>
              
              <div className="flex justify-between mt-4 p-3 bg-black/20 rounded-xl">
                <div className="text-center flex-1">
                  <p className="text-xs text-inactive uppercase tracking-wider mb-1">{t.distance}</p>
                  <p className="font-mono font-medium">{formatDistance(session.distanceMeters)}</p>
                </div>
                <div className="w-px bg-gray-800"></div>
                <div className="text-center flex-1">
                  <p className="text-xs text-inactive uppercase tracking-wider mb-1">{t.time}</p>
                  <p className="font-mono font-medium">{formatDuration(session.durationMs)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
