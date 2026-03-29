import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { t } from '../i18n';
import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet';
import L from 'leaflet';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const startIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #4ade80; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const endIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #f28b82; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

export default function ActivityDetailsScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const session = useLiveQuery(() => db.sessions.get(Number(id)), [id]);

  if (!session) return <div className="p-4">Loading...</div>;

  const path = session.path;
  const hasPath = path.length > 0;
  
  let center: [number, number] = [52.2297, 21.0122];
  if (hasPath) {
    center = [path[0].lat, path[0].lng];
  }

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

  return (
    <div className="flex flex-col h-full bg-bg-main overflow-y-auto">
      <div className="sticky top-0 z-50 bg-bg-main p-4 flex items-center gap-4 border-b border-gray-800">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-primary rounded-full transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold">{t.session_details}</h1>
      </div>

      <div className="h-64 w-full relative">
        {hasPath ? (
          <MapContainer 
            center={center} 
            zoom={14} 
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            dragging={true}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            <Polyline positions={path.map(p => [p.lat, p.lng])} color="#8ab4f8" weight={4} />
            <Marker position={[path[0].lat, path[0].lng]} icon={startIcon} />
            <Marker position={[path[path.length - 1].lat, path[path.length - 1].lng]} icon={endIcon} />
          </MapContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800 text-inactive">
            Brak danych GPS
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="mb-6">
          <div className="text-sm text-inactive mb-1">
            {format(session.startTime, 'd MMMM yyyy, HH:mm', { locale: pl })}
          </div>
          <div className="text-2xl font-bold text-text-main">
            {session.type.charAt(0).toUpperCase() + session.type.slice(1).toLowerCase()}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-bg-nav p-4 rounded-2xl flex flex-col">
            <span className="text-inactive text-sm mb-1">{t.distance}</span>
            <span className="text-2xl font-bold text-text-main">{(session.distanceMeters / 1000).toFixed(2)} <span className="text-sm text-inactive font-normal">km</span></span>
          </div>
          <div className="bg-bg-nav p-4 rounded-2xl flex flex-col">
            <span className="text-inactive text-sm mb-1">{t.time}</span>
            <span className="text-2xl font-bold text-text-main">{Math.floor(session.durationMs / 60000)} <span className="text-sm text-inactive font-normal">min</span></span>
          </div>
          <div className="bg-bg-nav p-4 rounded-2xl flex flex-col col-span-2">
            <span className="text-inactive text-sm mb-1">{t.avg_speed}</span>
            <span className="text-2xl font-bold text-text-main">{avgSpeed.toFixed(1)} <span className="text-sm text-inactive font-normal">km/h</span></span>
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
                    <YAxis domain={['auto', 'auto']} hide />
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
                <h3 className="text-sm text-inactive mb-4">Wysokość</h3>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <XAxis dataKey="time" hide />
                      <YAxis domain={['auto', 'auto']} hide />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#2f3033', border: 'none', borderRadius: '8px', color: '#e8eaed' }}
                        itemStyle={{ color: '#4ade80' }}
                      />
                      <Line type="monotone" dataKey="altitude" stroke="#4ade80" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const \u03c61 = lat1 * Math.PI/180; // \u03c6, \u03bb in radians
  const \u03c62 = lat2 * Math.PI/180;
  const \u0394\u03c6 = (lat2-lat1) * Math.PI/180;
  const \u0394\u03bb = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(\u0394\u03c6/2) * Math.sin(\u0394\u03c6/2) +
            Math.cos(\u03c61) * Math.cos(\u03c62) *
            Math.sin(\u0394\u03bb/2) * Math.sin(\u0394\u03bb/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  const d = R * c; // in metres
  return d;
}
