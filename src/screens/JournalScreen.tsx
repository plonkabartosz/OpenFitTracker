import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { t } from '../i18n';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import Map, { Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { formatDuration, formatDistance } from '../utils/format';
import { useDeviceType } from '../hooks/useDeviceType';
import { applyMapStyle } from '../utils/mapStyle';

export default function JournalScreen() {
  const navigate = useNavigate();
  const { isMobile } = useDeviceType();
  const sessions = useLiveQuery(
    () => db.sessions.where('isFinished').equals(1).reverse().sortBy('startTime')
  );

  if (!sessions) return <div className="p-4">Loading...</div>;

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
            <div 
              key={session.id} 
              onClick={() => navigate(`/activity/${session.id}`)}
              className="bg-bg-nav rounded-2xl p-4 flex cursor-pointer transition-colors"
            >
              <div className="flex-1">
                <div className="text-sm text-inactive mb-1">
                  {format(session.startTime, 'd MMMM yyyy, HH:mm', { locale: pl })}
                </div>
                <div className="text-lg font-bold text-text-main mb-2">
                  {session.type.charAt(0).toUpperCase() + session.type.slice(1).toLowerCase()}
                </div>
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-inactive">{t.distance}: </span>
                    <span className="font-medium">{formatDistance(session.distanceMeters)}</span>
                  </div>
                  <div>
                    <span className="text-inactive">{t.time}: </span>
                    <span className="font-medium">
                      {formatDuration(session.durationMs)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="w-16 h-16 bg-bg-main rounded-full flex items-center justify-center overflow-hidden relative pointer-events-none z-0">
                {session.path && session.path.length > 0 ? (
                  <Map
                    initialViewState={{
                      longitude: session.path[0].lng,
                      latitude: session.path[0].lat,
                      zoom: 13
                    }}
                    style={{ width: '100%', height: '100%' }}
                    mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
                    onLoad={(e) => applyMapStyle(e.target)}
                    interactive={false}
                    attributionControl={false}
                  >
                    <Source id={`route-${session.id}`} type="geojson" data={{
                      type: 'Feature',
                      geometry: {
                        type: 'LineString',
                        coordinates: session.path.map(p => [p.lng, p.lat])
                      }
                    }}>
                      <Layer
                        id={`route-layer-${session.id}`}
                        type="line"
                        paint={{
                          'line-color': '#8ab4f8',
                          'line-width': 3
                        }}
                      />
                    </Source>
                  </Map>
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
