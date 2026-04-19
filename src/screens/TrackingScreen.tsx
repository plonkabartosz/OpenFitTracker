import Map, { Source, Layer, Marker, MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useNavigate } from 'react-router-dom';
import { t } from '../i18n';
import { useTracking } from '../contexts/TrackingContext';
import { useEffect, useState, useRef } from 'react';
import { formatDuration, formatDistance } from '../utils/format';
import { useDeviceType } from '../hooks/useDeviceType';
import customMapStyle from '../openstreetmap.json';
import { MdMyLocation, MdCompassCalibration } from 'react-icons/md';
import { CustomAttribution } from '../components/CustomAttribution';

export default function TrackingScreen() {
  const navigate = useNavigate();
  const { isMobile } = useDeviceType();
  const {
    isRecording, isPaused, activityType, setActivityType,
    path, currentPos, distance, duration, currentSpeed, currentAltitude,
    startTracking, pauseTracking, resumeTracking, stopTracking
  } = useTracking();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [customActivityName, setCustomActivityName] = useState('');
  const [customActivityError, setCustomActivityError] = useState(false);

  const mapRef = useRef<MapRef>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [hasInitialGpsLock, setHasInitialGpsLock] = useState(false);
  const [bearing, setBearing] = useState(0);

  useEffect(() => {
    // Disabled map updates for missing properties
  }, [currentPos, isLocked, hasInitialGpsLock]);

  const handleResetView = () => {
    setIsLocked(true);
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: currentPos ? [currentPos[1], currentPos[0]] : [19.4803, 52.0693],
        zoom: mapZoom,
        animate: true,
        duration: 1000
      });
    }
  };

  const handleBack = () => {
    if (isRecording) {
      navigate('/');
    } else {
      navigate('/');
    }
  };

  const handleStartWithCountdown = () => {
    if (activityType === 'Inne') {
      if (customActivityName.trim() === '') {
        setCustomActivityError(true);
        return;
      }
      setActivityType(customActivityName.trim());
    }
    setCustomActivityError(false);

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

  const mapZoom = 15;

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

  const geojson: any = {
    type: 'FeatureCollection',
    features: segments.map(segment => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: segment.map(p => [p.lng, p.lat])
      }
    }))
  };

  useEffect(() => {
    if (isLocked && currentPos && mapRef.current) {
        mapRef.current.flyTo({
            center: [currentPos[1], currentPos[0]],
            duration: 500,
        });
    }
  }, [currentPos, isLocked]);

  return (
    <div className="flex flex-col h-full bg-bg-nav">
      <div className="flex-1 relative z-0 w-[100vw] left-1/2 -translate-x-1/2">
        <div className="absolute top-0 left-0 right-0 w-full z-[1000] pointer-events-none">
          <button 
            onClick={handleBack}
            className="absolute top-4 left-4 bg-bg-nav p-2 rounded-full text-text-main flex items-center justify-center transition-colors pointer-events-auto"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        </div>
        <Map
          ref={mapRef}
          initialViewState={{
            longitude: currentPos ? currentPos[1] : 19.4803,
            latitude: currentPos ? currentPos[0] : 52.0693,
            zoom: mapZoom
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle={customMapStyle as any}
          interactive={true}
          attributionControl={false}
          onMove={(e) => {
            setBearing(e.viewState.bearing);
          }}
          onMoveStart={(e) => {
            if (e.originalEvent) {
              setIsLocked(false);
            }
          }}
        >
          <Source id="route" type="geojson" data={geojson}>
            <Layer
              id="route-layer"
              type="line"
              paint={{
                'line-color': '#8ab4f8',
                'line-width': 4
              }}
            />
          </Source>
        </Map>
        <div className="absolute bottom-4 left-4 z-[1000] pointer-events-auto flex flex-col gap-2">
          <button 
            onClick={() => {
              if (mapRef.current) {
                mapRef.current.flyTo({
                  bearing: 0,
                  animate: true,
                  duration: 1000
                });
              }
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center bg-bg-nav ${bearing === 0 ? 'text-primary' : 'text-text-main'}`}
            title="Resetuj orientację"
          >
            <div style={{ transform: `rotate(${-bearing}deg)` }}>
              <MdCompassCalibration size={24} />
            </div>
          </button>
          <button 
            onClick={handleResetView}
            className={`w-10 h-10 rounded-full flex items-center justify-center ${isLocked ? 'bg-bg-nav text-primary' : 'bg-bg-nav text-text-main'}`}
            title="Resetuj widok"
          >
            <MdMyLocation size={24} />
          </button>
        </div>
        <CustomAttribution />
      </div>

      <div className="shrink-0 bg-bg-nav z-10 w-full">
        <div className={`${!isMobile ? 'max-w-[100dvh]' : ''} mx-auto p-6 flex flex-col justify-between w-full`}>
          {!isRecording ? (
          <div className="flex flex-col items-center justify-center gap-6">
            <div className="w-full relative">
              <label className="block text-sm text-inactive mb-2 text-center">{t.select_activity}</label>
              <div className="relative">
                <select 
                  value={t.activity_types.includes(activityType) ? activityType : 'Inne'}
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
              {(activityType === 'Inne' || !t.activity_types.includes(activityType)) && (
                <div className="w-full mt-2">
                  <input
                    type="text"
                    value={customActivityName}
                    onChange={(e) => {
                      setCustomActivityName(e.target.value);
                      if (e.target.value.trim() !== '') setCustomActivityError(false);
                    }}
                    placeholder="Wpisz nazwę aktywności..."
                    className={`w-full bg-[#1a1b1e] text-text-main rounded-xl p-4 focus:outline-none focus:ring-2 ${customActivityError ? 'ring-2 ring-[#f28b82] border-[#f28b82]' : 'focus:ring-primary'} disabled:opacity-50`}
                    disabled={countdown !== null}
                  />
                </div>
              )}
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
