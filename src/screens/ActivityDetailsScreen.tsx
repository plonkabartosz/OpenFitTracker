import { useNavigate, useParams } from 'react-router-dom';
import React, { useState, useEffect, useRef } from 'react';
import { useDeviceType } from '../hooks/useDeviceType';
import { ActivitySession } from '../db';
import { formatDistance, formatDuration } from '../utils/format';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function ActivityDetailsScreen() {
  const navigate = useNavigate();
  const { id } = useParams<{id: string}>();
  const { isMobile } = useDeviceType();
  const [session, setSession] = useState<ActivitySession | null>(null);

  useEffect(() => {
    window.onSessionLoaded = (sessionStr: string) => {
        try {
            if (sessionStr) {
                const data: ActivitySession = JSON.parse(sessionStr);
                setSession(data);
            } else {
                setSession(null);
            }
        } catch(e) {
            console.error("error parsing session", e);
        }
    };
    if (id && window.Android && window.Android.requestSession) {
        window.Android.requestSession(parseInt(id));
    }
  }, [id]);

  if (!session) {
      return (
        <div className={`flex flex-col h-full bg-bg-main overflow-y-auto ${!isMobile ? 'max-w-[100dvh] mx-auto' : ''}`}>
          <div className="sticky top-0 z-50 bg-bg-main border-b border-gray-800">
            <div className="p-4 flex items-center w-full">
              <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-primary rounded-full transition-colors flex items-center justify-center">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <h1 className="text-xl font-bold ml-2">Szczegóły aktywności</h1>
            </div>
          </div>
          <div className="p-4 text-inactive text-center mt-10">
            Ładowanie...
          </div>
        </div>
      );
  }

  const mapCenter = session.path && session.path.length > 0 
    ? [session.path[0].lat, session.path[0].lng] 
    : [52.0693, 19.4803];
    
  return (
    <div className={`flex flex-col h-full bg-bg-main overflow-y-auto ${!isMobile ? 'max-w-[100dvh] mx-auto w-full' : ''}`}>
      <div className="sticky top-0 z-50 bg-bg-main border-b border-gray-800">
        <div className="p-4 flex items-center w-full">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-primary rounded-full transition-colors flex items-center justify-center">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold ml-2">Szczegóły aktywności</h1>
        </div>
      </div>
      
      <div className="h-64 w-full bg-gray-900 border-b border-gray-800 relative z-0">
        {session.path && session.path.length > 0 ? (
          <MapContainer 
            center={mapCenter as L.LatLngExpression} 
            zoom={14} 
            style={{ height: '100%', width: '100%', zIndex: 1 }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              className="map-tiles"
            />
            <Polyline 
              positions={session.path.map(p => [p.lat, p.lng])} 
              color="#8ab4f8" 
              weight={5} 
            />
          </MapContainer>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-inactive">
             <span className="material-symbols-outlined text-4xl mb-2">location_off</span>
             <p>Brak danych o trasie</p>
          </div>
        )}
      </div>
      
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-primary/20 text-primary rounded-full flex items-center justify-center text-2xl">
            {session.type === 'Bieganie' ? '🏃' : session.type === 'Chodzenie' ? '🚶' : '🚴'}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{session.type}</h2>
            <p className="text-inactive">{new Date(session.startTime).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="bg-bg-nav rounded-2xl p-4 shadow-sm flex flex-col justify-center items-center">
               <span className="material-symbols-outlined text-inactive mb-2">distance</span>
               <p className="text-xs text-inactive uppercase tracking-wider mb-1">Dystans</p>
               <p className="font-mono text-xl font-bold">{formatDistance(session.distanceMeters)}</p>
            </div>
            <div className="bg-bg-nav rounded-2xl p-4 shadow-sm flex flex-col justify-center items-center">
               <span className="material-symbols-outlined text-inactive mb-2">timer</span>
               <p className="text-xs text-inactive uppercase tracking-wider mb-1">Czas</p>
               <p className="font-mono text-xl font-bold">{formatDuration(session.durationMs)}</p>
            </div>
             <div className="bg-bg-nav rounded-2xl p-4 shadow-sm flex flex-col justify-center items-center">
               <span className="material-symbols-outlined text-inactive mb-2">speed</span>
               <p className="text-xs text-inactive uppercase tracking-wider mb-1">Średnia prędkość</p>
               <p className="font-mono text-xl font-bold">
                 {session.durationMs > 0 ? ((session.distanceMeters / (session.durationMs / 1000)) * 3.6).toFixed(1) : '0.0'} km/h
               </p>
            </div>
             <div className="bg-bg-nav rounded-2xl p-4 shadow-sm flex flex-col justify-center items-center">
               <span className="material-symbols-outlined text-inactive mb-2">schedule</span>
               <p className="text-xs text-inactive uppercase tracking-wider mb-1">Zakończenie</p>
               <p className="font-mono text-xl font-bold">
                 {session.endTime ? new Date(session.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}
               </p>
            </div>
        </div>
      </div>
    </div>
  );
}
