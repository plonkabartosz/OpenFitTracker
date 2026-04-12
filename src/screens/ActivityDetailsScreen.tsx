import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { t } from '../i18n';
import { calculateDistance } from '../utils/geo';
import Map, { Source, Layer, Marker, useMap } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import React, { useState, useEffect } from 'react';
import { formatDuration, formatDistance } from '../utils/format';
import { useDeviceType } from '../hooks/useDeviceType';
import customMapStyle from '../openstreetmap.json';
import { MdMyLocation } from 'react-icons/md';
import { CustomAttribution } from '../components/CustomAttribution';

function MapController({ bounds, resetCounter }: { bounds: any, resetCounter: number }) {
  const { current: map } = useMap();
  const [hasInitialFit, setHasInitialFit] = useState(false);

  useEffect(() => {
    if (bounds && map && !hasInitialFit) {
      map.fitBounds(bounds, { padding: 20 });
      setHasInitialFit(true);
    }
  }, [map, bounds, hasInitialFit]);

  useEffect(() => {
    if (bounds && map && resetCounter > 0) {
      map.fitBounds(bounds, { padding: 20 });
    }
  }, [map, bounds, resetCounter]);

  return null;
}

const SEPARATOR_COLOR = '#3c4043';

export default function ActivityDetailsScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isMobile } = useDeviceType();
  const [resetCounter, setResetCounter] = useState(0);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  
  const session = useLiveQuery(() => db.sessions.get(Number(id)), [id]);

  const path = session?.path || [];
  const hasPath = path.length > 0;
  
  const bounds = React.useMemo(() => {
    if (!hasPath) return null;
    const lngs = path.map(p => p.lng);
    const lats = path.map(p => p.lat);
    return [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)]
    ];
  }, [path, hasPath]);

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

  if (!session) return <div className="p-4">Loading...</div>;

  const handleDelete = async () => {
    await db.sessions.delete(Number(id));
    navigate('/journal');
  };

  // Calculate chart data
  const chartData = path.map((p, index) => {
    let speed = 0;
    if (p.speed !== null) {
      speed = p.speed * 3.6;
    } else if (index > 0) {
      const prev = path[index - 1];
      const dist = calculateDistance(prev.lat, prev.lng, p.lat, p.lng);
      const timeDiff = (p.timestamp - prev.timestamp) / 1000;
      if (timeDiff > 0) {
        speed = (dist / timeDiff) * 3.6;
      }
    }
    return {
      time: format(new Date(p.timestamp), 'HH:mm:ss'),
      speed: Math.round(speed * 10) / 10,
      altitude: p.altitude ? Math.round(p.altitude) : null
    };
  }).filter((_, i) => i % Math.ceil(path.length / 50) === 0); // Downsample for chart

  const avgSpeed = session.durationMs > 0 ? (session.distanceMeters / (session.durationMs / 1000)) * 3.6 : 0;

  const speeds = chartData.map(d => d.speed);
  const altitudes = chartData.map(d => d.altitude).filter((a): a is number => a !== null);

  const speedDomain = [
    Math.max(0, Math.min(...speeds) - 5),
    Math.max(...speeds) + 5
  ];

  const altitudeDomain = altitudes.length > 0 ? [
    Math.min(...altitudes) - 100,
    Math.max(...altitudes) + 100
  ] : [0, 100];

  return (
    <div className="flex flex-col h-full bg-bg-main overflow-y-auto">
      {showDeletePopup && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-bg-nav p-6 rounded-2xl max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-danger/20 text-danger rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl">delete</span>
            </div>
            <h2 className="text-xl font-bold mb-2">Usuń aktywność</h2>
            <p className="text-inactive text-sm mb-6">
              Czy na pewno chcesz usunąć tę aktywność? Tej operacji nie można cofnąć.
            </p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setShowDeletePopup(false)}
                className="flex-1 py-3 rounded-xl font-semibold bg-gray-800 text-white"
              >
                Anuluj
              </button>
              <button 
                onClick={handleDelete}
                className="flex-1 py-3 rounded-xl font-semibold bg-danger text-white"
              >
                Usuń
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="sticky top-0 z-50 bg-bg-main border-b border-gray-800">
        <div className={`${!isMobile ? 'max-w-[100dvh]' : ''} mx-auto p-4 flex items-center w-full`}>
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-primary rounded-full transition-colors flex items-center justify-center">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold ml-2">{t.session_details}</h1>
        </div>
      </div>

      <div className="h-[320px] w-full relative">
        {hasPath ? (
          <>
            <Map
              initialViewState={{
                bounds: bounds as any,
                fitBoundsOptions: { padding: 20 }
              }}
              style={{ height: '320px', width: '100%' }}
              mapStyle={customMapStyle as any}
              interactive={true}
              attributionControl={false}
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
              <Marker longitude={path[0].lng} latitude={path[0].lat}>
                <div style={{ backgroundColor: '#4ade80', width: '12px', height: '12px', borderRadius: '50%', border: '2px solid white' }}></div>
              </Marker>
              <Marker longitude={path[path.length - 1].lng} latitude={path[path.length - 1].lat}>
                <div style={{ backgroundColor: '#f28b82', width: '12px', height: '12px', borderRadius: '50%', border: '2px solid white' }}></div>
              </Marker>
              <MapController bounds={bounds} resetCounter={resetCounter} />
            </Map>
            
            <div className="absolute bottom-4 left-4 z-[1000]">
              <button 
                onClick={() => setResetCounter(prev => prev + 1)}
                className="w-10 h-10 bg-bg-nav text-primary rounded-full shadow-lg flex items-center justify-center"
                title="Resetuj widok"
              >
                <MdMyLocation size={24} />
              </button>
            </div>
            <CustomAttribution />
          </>
        ) : (
          <div className="w-full h-[320px] flex items-center justify-center bg-gray-800 text-inactive">
            Brak danych GPS
          </div>
        )}
      </div>

      <div className={`p-6 ${!isMobile ? 'max-w-[100dvh]' : ''} mx-auto w-full`}>
        <div className="mb-6">
          <div className="text-sm text-inactive mb-1">
            {format(session.startTime, 'd MMMM yyyy, HH:mm', { locale: pl })}
          </div>
          <div className="text-2xl font-bold text-text-main">
            {session.type.charAt(0).toUpperCase() + session.type.slice(1).toLowerCase()}
          </div>
        </div>

        <div className="bg-bg-nav p-6 rounded-2xl mb-8 flex flex-col gap-6">
          <div className="flex flex-col">
            <span className="text-inactive text-sm mb-1">Czas aktywności</span>
            <span className="text-2xl font-bold text-text-main">
              {formatDuration(session.durationMs)}
            </span>
          </div>
          
          <div className="w-full h-px" style={{ backgroundColor: SEPARATOR_COLOR }}></div>

          <div className="flex flex-col">
            <span className="text-inactive text-sm mb-1">{t.distance}</span>
            <span className="text-2xl font-bold text-text-main">
              {formatDistance(session.distanceMeters).split(' ')[0]} <span className="text-sm text-inactive font-normal">{formatDistance(session.distanceMeters).split(' ')[1]}</span>
            </span>
          </div>

          <div className="w-full h-px" style={{ backgroundColor: SEPARATOR_COLOR }}></div>

          <div className="flex flex-col">
            <span className="text-inactive text-sm mb-1">{t.avg_speed}</span>
            <span className="text-2xl font-bold text-text-main">
              {avgSpeed.toFixed(1)} <span className="text-sm text-inactive font-normal">km/h</span>
            </span>
          </div>
        </div>

        {chartData.length > 0 && (
          <div className="space-y-6 mb-6">
            <div className="bg-bg-nav p-4 rounded-2xl">
              <h3 className="text-sm text-inactive mb-4">{t.speed_chart_title}</h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="time" hide />
                    <YAxis 
                      domain={speedDomain} 
                      width={35} 
                      tick={{ fill: '#9aa0a6', fontSize: 10 }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#2f3033', border: 'none', borderRadius: '8px', color: '#e8eaed' }}
                      itemStyle={{ color: '#8ab4f8' }}
                    />
                    <Line type="monotone" dataKey="speed" stroke="#8ab4f8" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {chartData.some(d => d.altitude !== null) && (
              <div className="bg-bg-nav p-4 rounded-2xl">
                <h3 className="text-sm text-inactive mb-4">Wysokość (m n.p.m.)</h3>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorAlt" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" hide />
                      <YAxis 
                        domain={altitudeDomain} 
                        width={35} 
                        tick={{ fill: '#9aa0a6', fontSize: 10 }} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#2f3033', border: 'none', borderRadius: '8px', color: '#e8eaed' }}
                        itemStyle={{ color: '#4ade80' }}
                      />
                      <Area type="monotone" dataKey="altitude" stroke="#4ade80" strokeWidth={2} fillOpacity={1} fill="url(#colorAlt)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-bg-nav rounded-2xl p-6 mb-8 mt-4">
          <button 
            onClick={() => setShowDeletePopup(true)}
            className="w-full bg-transparent text-danger border-2 border-danger font-bold py-3 rounded-xl transition-colors"
          >
            Usuń aktywność
          </button>
        </div>
      </div>
    </div>
  );
}
