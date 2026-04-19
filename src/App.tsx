/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { t } from './i18n';
import HomeScreen from './screens/HomeScreen';
import JournalScreen from './screens/JournalScreen';
import ProfileScreen from './screens/ProfileScreen';
import TrackingScreen from './screens/TrackingScreen';
import ActivityDetailsScreen from './screens/ActivityDetailsScreen';
import { TrackingProvider, useTracking } from './contexts/TrackingContext';
import { useDeviceType } from './hooks/useDeviceType';

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isRecording } = useTracking();
  const { isMobile } = useDeviceType();
  
  // Hide bottom nav on tracking screen
  const isTrackingScreen = location.pathname === '/tracking';

  const handleStartTrackingClick = () => {
    navigate('/tracking');
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-bg-main text-text-main relative w-full">
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
            <div className={`fixed bottom-24 left-0 right-0 w-full ${!isMobile ? 'max-w-[100dvh]' : ''} mx-auto z-50 pointer-events-none flex justify-end px-6`}>
              <button 
                onClick={handleStartTrackingClick}
                className="w-14 h-14 bg-primary text-bg-main rounded-full flex items-center justify-center shadow-lg transition-colors pointer-events-auto"
                aria-label={t.start_tracking}
              >
                <span className="material-symbols-outlined text-[56px]">add</span>
              </button>
            </div>
          )}

          <nav className="fixed bottom-0 w-full bg-bg-nav border-t border-gray-800 h-16 z-40">
            <div className={`${!isMobile ? 'max-w-[100dvh]' : ''} mx-auto flex justify-around items-center h-full w-full`}>
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
      <Router>
        <Layout />
      </Router>
    </TrackingProvider>
  );
}

