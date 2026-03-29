import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { t } from '../i18n';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';

export default function JournalScreen() {
  const navigate = useNavigate();
  const sessions = useLiveQuery(
    () => db.sessions.where('isFinished').equals(1).reverse().sortBy('startTime')
  );

  if (!sessions) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-primary mb-6">{t.nav_journal}</h1>
      
      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-inactive">
          <p className="text-xl font-medium">{t.no_sessions}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map(session => (
            <div 
              key={session.id} 
              onClick={() => navigate(`/activity/${session.id}`)}
              className="bg-bg-nav rounded-2xl p-4 flex cursor-pointer transition-colors"
            >
              <div className="flex-1">
                <div className="text-sm text-inactive mb-1">
                  {format(session.startTime, 'd MMMM yyyy, HH:mm', { locale: pl })}
                </div>
                <div className="text-lg font-bold text-text-main capitalize mb-2">
                  {session.type}
                </div>
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-inactive">{t.distance}: </span>
                    <span className="font-medium">{(session.distanceMeters / 1000).toFixed(2)} km</span>
                  </div>
                  <div>
                    <span className="text-inactive">{t.time}: </span>
                    <span className="font-medium">
                      {Math.floor(session.durationMs / 60000)} min
                    </span>
                  </div>
                </div>
              </div>
              <div className="w-16 h-16 bg-bg-main rounded-full flex items-center justify-center overflow-hidden relative pointer-events-none">
                {session.path && session.path.length > 0 ? (
                  <MapContainer 
                    center={[session.path[0].lat, session.path[0].lng]} 
                    zoom={13} 
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                    dragging={false}
                    scrollWheelZoom={false}
                    doubleClickZoom={false}
                    touchZoom={false}
                    attributionControl={false}
                  >
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                    <Polyline positions={session.path.map(p => [p.lat, p.lng])} color="#8ab4f8" weight={3} />
                  </MapContainer>
                ) : (
                  <span className="material-symbols-outlined text-inactive">map</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
