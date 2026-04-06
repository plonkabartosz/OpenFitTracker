/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { t } from './i18n';
import HomeScreen from './screens/HomeScreen';
import JournalScreen from './screens/JournalScreen';
import ProfileScreen from './screens/ProfileScreen';
import TrackingScreen from './screens/TrackingScreen';
import ActivityDetailsScreen from './screens/ActivityDetailsScreen';
import { TrackingProvider, useTracking } from './contexts/TrackingContext';

function PersistentTrackingNotification() {
  const { isRecording, isPaused, activityType, distance, duration, pauseTracking, resumeTracking, stopTracking } = useTracking();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isRecording || location.pathname === '/tracking') return null;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
      <div 
        className="fixed top-0 left-0 right-0 w-full bg-primary text-bg-main z-[9999] shadow-lg cursor-pointer"
        onClick={() => navigate('/tracking')}
      >
        <div className="max-w-[100dvh] mx-auto p-4 flex items-center justify-between w-full">
          <div className="flex flex-col">
            <span className="font-bold text-sm uppercase">{activityType}</span>
            <div className="flex gap-4 text-xs font-mono">
              <span>{(distance / 1000).toFixed(2)} km</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            {isPaused ? (
              <button onClick={resumeTracking} className="w-10 h-10 bg-bg-main text-primary rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined">play_arrow</span>
              </button>
            ) : (
              <button onClick={pauseTracking} className="w-10 h-10 bg-bg-main text-primary rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined">pause</span>
              </button>
            )}
            <button onClick={stopTracking} className="w-10 h-10 bg-danger text-bg-main rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined">stop</span>
            </button>
          </div>
        </div>
    </div>
  );
}

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isRecording } = useTracking();
  const [showPermissionPopup, setShowPermissionPopup] = useState(false);
  
  // Hide bottom nav on tracking screen
  const isTrackingScreen = location.pathname === '/tracking';

  useEffect(() => {
    const checkPerms = async () => {
      try {
        const perm = await navigator.permissions.query({ name: 'geolocation' });
        if (perm.state === 'prompt') {
          setShowPermissionPopup(true);
        }
      } catch (e) {
        // Fallback if permissions API is not fully supported
      }
    };
    checkPerms();
  }, []);

  const handleStartTrackingClick = () => {
    navigate('/tracking');
  };

  const requestPermissions = () => {
    setShowPermissionPopup(false);

    // Request location permission by doing a dummy fetch
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {},
        () => {}
      );
    }
  };

  const cancelPermissions = () => {
    setShowPermissionPopup(false);
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-bg-main text-text-main relative w-full">
      <PersistentTrackingNotification />
      
      {showPermissionPopup && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-bg-nav p-6 rounded-2xl max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl">location_on</span>
            </div>
            <h2 className="text-xl font-bold mb-2">Wymagane uprawnienia</h2>
            <p className="text-inactive text-sm mb-6">
              Aby poprawnie śledzić Twoją aktywność, aplikacja potrzebuje dostępu do lokalizacji.
            </p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={cancelPermissions}
                className="flex-1 py-3 rounded-xl font-semibold bg-gray-800 text-white"
              >
                Anuluj
              </button>
              <button 
                onClick={requestPermissions}
                className="flex-1 py-3 rounded-xl font-semibold bg-primary text-bg-main"
              >
                Zezwól
              </button>
            </div>
          </div>
        </div>
      )}

      <main className={`flex-1 overflow-y-auto relative ${isTrackingScreen ? '' : 'pb-20'} ${isRecording && !isTrackingScreen ? 'pt-16' : ''}`}>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/journal" element={<JournalScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="/tracking" element={<TrackingScreen />} />
          <Route path="/activity/:id" element={<ActivityDetailsScreen />} />
        </Routes>
      </main>

      {!isTrackingScreen && (
        <>
          {!isRecording && (
            <div className="fixed bottom-24 left-0 right-0 w-full max-w-[100dvh] mx-auto z-50 pointer-events-none flex justify-end px-6">
              <button 
                onClick={handleStartTrackingClick}
                className="w-14 h-14 bg-primary text-bg-main rounded-full flex items-center justify-center shadow-lg transition-colors pointer-events-auto"
                aria-label={t.start_tracking}
              >
                <span className="material-symbols-outlined text-5xl">add</span>
              </button>
            </div>
          )}

          <nav className="fixed bottom-0 w-full bg-bg-nav border-t border-gray-800 h-16 z-40">
            <div className="max-w-[100dvh] mx-auto flex justify-around items-center h-full w-full">
              <NavLink 
                to="/" 
                className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-primary' : 'text-inactive'}`}
              >
                <span className="material-symbols-outlined">home</span>
                <span className="text-xs mt-1">{t.nav_home}</span>
              </NavLink>
              <NavLink 
                to="/journal" 
                className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-primary' : 'text-inactive'}`}
              >
                <span className="material-symbols-outlined">book</span>
                <span className="text-xs mt-1">{t.nav_journal}</span>
              </NavLink>
              <NavLink 
                to="/profile" 
                className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-primary' : 'text-inactive'}`}
              >
                <span className="material-symbols-outlined">person</span>
                <span className="text-xs mt-1">{t.nav_profile}</span>
              </NavLink>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <TrackingProvider>
      <Router basename="/OpenFitTracker">
        <Layout />
      </Router>
    </TrackingProvider>
  );
}

