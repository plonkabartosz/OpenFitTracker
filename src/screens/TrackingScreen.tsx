import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { t } from '../i18n';
import { useTracking } from '../contexts/TrackingContext';
import { useEffect, useState } from 'react';
import { formatDuration, formatDistance } from '../utils/format';

// Custom icon for current location
const currentLocIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #4285f4; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(66, 133, 244, 0.8);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

// Component to handle map centering
function MapController({ center, isTracking }: { center: [number, number] | null, isTracking: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      if (isTracking) {
        map.setView(center, map.getZoom(), { animate: true });
      } else if (map.getZoom() < 10) {
        // If we just got the location and we're zoomed out (e.g. showing Poland), zoom in to the user
        map.setView(center, 16, { animate: true });
      } else {
        map.setView(center, map.getZoom(), { animate: true });
      }
    }
  }, [center, isTracking, map]);
  return null;
}

export default function TrackingScreen() {
  const navigate = useNavigate();
  const {
    isRecording, isPaused, activityType, setActivityType,
    path, currentPos, distance, duration, currentSpeed, currentAltitude,
    startTracking, pauseTracking, resumeTracking, stopTracking
  } = useTracking();
  const [countdown, setCountdown] = useState<number | null>(null);

  const handleBack = () => {
    if (isRecording) {
      navigate('/');
    } else {
      navigate('/');
    }
  };

  const handleStartWithCountdown = () => {
    setCountdown(3);
    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(interval);
        setCountdown(null);
        startTracking();
      }
    }, 1000);
  };

  const mapCenter = currentPos || [52.0693, 19.4803];
  const mapZoom = currentPos ? 16 : 6;

  // Split path into segments based on isSegmentStart
  const segments: any[][] = [];
  let currentSegment: any[] = [];
  
  path.forEach(p => {
    if (p.isSegmentStart && currentSegment.length > 0) {
      segments.push(currentSegment);
      currentSegment = [];
    }
    currentSegment.push(p);
  });
  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  return (
    <div className="flex flex-col h-full bg-bg-nav">
      <div className="flex-1 relative z-0 w-[100vw] left-1/2 -translate-x-1/2">
        <div className="absolute top-0 left-0 right-0 w-full max-w-[100dvh] mx-auto z-[1000] pointer-events-none">
          <button 
            onClick={handleBack}
            className="absolute top-4 left-4 bg-bg-nav p-2 rounded-full shadow-lg text-text-main flex items-center justify-center transition-colors pointer-events-auto"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        </div>
        <MapContainer 
          center={mapCenter as [number, number]} 
          zoom={mapZoom} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          dragging={!isRecording || isPaused} // Lock map when recording and not paused
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          {currentPos && <MapController center={currentPos} isTracking={isRecording && !isPaused} />}
          {segments.map((segment, idx) => (
            <Polyline key={idx} positions={segment.map(p => [p.lat, p.lng])} color="#8ab4f8" weight={4} />
          ))}
          {currentPos && (
            <Marker position={currentPos} icon={currentLocIcon} />
          )}
        </MapContainer>
      </div>

      <div className="shrink-0 bg-bg-nav z-10 w-full">
        <div className="max-w-[100dvh] mx-auto p-6 flex flex-col justify-between w-full">
          {!isRecording ? (
          <div className="flex flex-col items-center justify-center gap-6">
            <div className="w-full relative">
              <label className="block text-sm text-inactive mb-2 text-center">{t.select_activity}</label>
              <div className="relative">
                <select 
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  disabled={countdown !== null}
                  className="w-full bg-[#1a1b1e] text-text-main rounded-xl p-4 appearance-none focus:outline-none focus:ring-2 focus:ring-primary text-left disabled:opacity-50"
                >
                  {t.activity_types.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-inactive">arrow_drop_down</span>
              </div>
            </div>
            {countdown !== null ? (
              <div className="w-16 h-16 bg-primary text-bg-main rounded-full flex items-center justify-center shadow-lg">
                <span className="text-3xl font-bold">{countdown}</span>
              </div>
            ) : (
              <button 
                onClick={handleStartWithCountdown}
                className="w-16 h-16 bg-primary text-bg-main rounded-full flex items-center justify-center shadow-lg transition-colors"
                aria-label={t.start_tracking}
              >
                <span className="material-symbols-outlined text-4xl">play_arrow</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col justify-between gap-4">
            <div className="flex justify-between items-center">
              <div className="text-xl font-bold text-primary">{activityType}</div>
              <div className="text-3xl font-mono font-bold">{formatDuration(duration * 1000)}</div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-start overflow-hidden">
                <span className="text-inactive text-xs truncate w-full">{t.distance}</span>
                <span className="text-xl font-bold truncate w-full">
                  {formatDistance(distance).split(' ')[0]} <span className="text-xs text-inactive font-normal">{formatDistance(distance).split(' ')[1]}</span>
                </span>
              </div>
              <div className="flex flex-col items-start overflow-hidden">
                <span className="text-inactive text-xs truncate w-full">Wysokość</span>
                <span className="text-xl font-bold truncate w-full">
                  {currentAltitude ? Math.round(currentAltitude) : '--'} <span className="text-xs text-inactive font-normal">m n.p.m.</span>
                </span>
              </div>
              <div className="flex flex-col items-start overflow-hidden">
                <span className="text-inactive text-xs truncate w-full">{t.speed}</span>
                <span className="text-xl font-bold truncate w-full">
                  {currentSpeed.toFixed(1)} <span className="text-xs text-inactive font-normal">km/h</span>
                </span>
              </div>
            </div>

            <div className="flex gap-4 mt-2">
              <button 
                onClick={async () => {
                  await stopTracking();
                  navigate('/journal');
                }}
                className="flex-1 bg-danger text-bg-main font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <span className="material-symbols-outlined">stop</span>
              </button>
              {isPaused ? (
                <button 
                  onClick={resumeTracking}
                  className="flex-1 bg-primary text-bg-main font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <span className="material-symbols-outlined">play_arrow</span>
                </button>
              ) : (
                <button 
                  onClick={pauseTracking}
                  className="flex-1 bg-bg-main text-primary border-2 border-primary font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <span className="material-symbols-outlined">pause</span>
                </button>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
