import { useState, useEffect } from 'react';
import { t } from '../i18n';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import Map, { Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { formatDuration, formatDistance } from '../utils/format';
import { useDeviceType } from '../hooks/useDeviceType';
import customMapStyle from '../openstreetmap.json';
import { ActivitySession } from '../contexts/TrackingContext';

export default function JournalScreen() {
  const navigate = useNavigate();
  const { isMobile } = useDeviceType();
  const [sessions, setSessions] = useState<ActivitySession[]>([]);

  useEffect(() => {
    if (window.Android && window.Android.getJournalSessions) {
      try {
        const dataStr = window.Android.getJournalSessions();
        if (dataStr) {
          setSessions(JSON.parse(dataStr));
        }
      } catch(e) {
        console.error("Failed to parse journal sessions", e);
      }
    } else {
      // Mock for development without Android app wrapper
      setSessions([{
        id: 1,
        type: 'Bieganie',
        startTime: Date.now() - 3600000,
        endTime: Date.now(),
        distanceMeters: 5500,
        durationMs: 1800000,
        isFinished: 1,
        path: [
          { lat: 52.2297, lng: 21.0122, timestamp: 0, speed: 0, accuracy: 0 },
          { lat: 52.2300, lng: 21.0150, timestamp: 0, speed: 0, accuracy: 0 }
        ]
      }]);
    }
  }, []);

  return (
    <div className={`p-6 ${!isMobile ? 'max-w-[100dvh]' : ''} mx-auto w-full`}>
      <h1 className="text-2xl font-bold text-primary mb-6">{t.nav_journal}</h1>
      
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
                  mapStyle={customMapStyle as any}
                  interactive={false}
                  attributionControl={false}
                >
                  <Source id={`route-${session.id}`} type="geojson" data={{
                    type: 'Feature',
                    properties: {},
                    geometry: {
                      type: 'LineString',
                      coordinates: session.path.map((p: any) => [p.lng, p.lat])
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
    </div>
  );
}
