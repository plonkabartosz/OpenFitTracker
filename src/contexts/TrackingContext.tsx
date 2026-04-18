import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { LocationPoint, ActivitySession } from '../types';
import { calculateDistance } from '../utils/geo';
import { t } from '../i18n';

declare global {
  interface Window {
    AndroidInterface?: {
      startTracking: (type: string) => void;
      pauseTracking: () => void;
      resumeTracking: () => void;
      stopTracking: () => void;
      getSessionsAsync: () => void;
      deleteSession: (id: number) => void;
      clearSessions: () => void;
    };
    onAndroidLocationUpdate: (lat: number, lng: number, alt: number, acc: number, speed: number, ts: number) => void;
    onAndroidStatsUpdate: (distance: number, duration: number) => void;
    onAndroidStateUpdate: (isRecording: boolean, isPaused: boolean) => void;
  }
}

interface TrackingContextType {
  isRecording: boolean;
  isPaused: boolean;
  activityType: string;
  setActivityType: (type: string) => void;
  path: LocationPoint[];
  currentPos: [number, number] | null;
  distance: number;
  duration: number;
  currentSpeed: number;
  currentAltitude: number | null;
  startTracking: () => void;
  pauseTracking: () => void;
  resumeTracking: () => void;
  stopTracking: () => Promise<void>;
  isLocationEnabled: boolean;
  enableLocationTracking: () => void;
}

const TrackingContext = createContext<TrackingContextType | null>(null);

export function TrackingProvider({ children }: { children: ReactNode }) {
  const [isLocationEnabled, setIsLocationEnabled] = useState(() => {
    return localStorage.getItem('locationPromptHandled') === 'true';
  });
  const [activityType, setActivityType] = useState(t.activity_types[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const [path, setPath] = useState<LocationPoint[]>([]);
  const pathRef = useRef<LocationPoint[]>([]);
  const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);
  const [distance, setDistance] = useState(0); // in meters
  const [duration, setDuration] = useState(0); // in seconds
  const [currentSpeed, setCurrentSpeed] = useState(0); // km/h
  const [currentAltitude, setCurrentAltitude] = useState<number | null>(null);
  
  const watchIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPosRef = useRef<LocationPoint | null>(null);
  const lastUIPosRef = useRef<LocationPoint | null>(null);
  const lastElevationPosRef = useRef<{lat: number, lng: number} | null>(null);
  const lastFetchedAltitudeRef = useRef<number | null>(null);
  const shouldStartNewSegmentRef = useRef<boolean>(false);

  const enableLocationTracking = () => {
    localStorage.setItem('locationPromptHandled', 'true');
    setIsLocationEnabled(true);
  };

  useEffect(() => {
    if (window.AndroidInterface) {
      window.onAndroidLocationUpdate = (lat, lng, alt, acc, speed, ts) => {
        const altFixed = alt !== 0 ? alt : null;
        setCurrentAltitude(altFixed);
        setCurrentPos([lat, lng]);
        setCurrentSpeed(speed * 3.6);
        
        lastUIPosRef.current = {
          lat, lng, timestamp: ts, speed, accuracy: acc, altitude: altFixed
        };

        if (isRecording && !isPausedRef.current) {
          const newPoint: LocationPoint = {
            lat, lng, timestamp: ts, speed, accuracy: acc, altitude: altFixed,
            isSegmentStart: shouldStartNewSegmentRef.current
          };
          if (shouldStartNewSegmentRef.current) {
            shouldStartNewSegmentRef.current = false;
          }
          setPath(prev => {
            lastPosRef.current = newPoint;
            const newPath = [...prev, newPoint];
            pathRef.current = newPath;
            return newPath;
          });
        }
      };

      window.onAndroidStatsUpdate = (dist, dur) => {
        setDistance(dist);
        setDuration(dur);
      };

      window.onAndroidStateUpdate = (recording, paused) => {
        setIsRecording(recording);
        setIsPaused(paused);
        isPausedRef.current = paused;
        if (!recording) {
          setPath([]);
          pathRef.current = [];
          setDistance(0);
          setDuration(0);
          setCurrentSpeed(0);
        }
      };

      setIsLocationEnabled(true);
    }
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTracking = async () => {
    if (window.AndroidInterface) {
      setIsRecording(true);
      setIsPaused(false);
      isPausedRef.current = false;
      shouldStartNewSegmentRef.current = false;
      setPath([]);
      pathRef.current = [];
      setDistance(0);
      setDuration(0);
      lastPosRef.current = null;
      lastUIPosRef.current = null;
      window.AndroidInterface.startTracking(activityType);
    } else {
      alert("Aplikacja działa jedynie jako interfejs dla systemu Android. Brak możliwości nagrywania sesji z wewnątrz przeglądarki.");
    }
  };

  const pauseTracking = () => {
    if (window.AndroidInterface) {
      setIsPaused(true);
      isPausedRef.current = true;
      setCurrentSpeed(0);
      window.AndroidInterface.pauseTracking();
    }
  };

  const resumeTracking = () => {
    if (window.AndroidInterface) {
      setIsPaused(false);
      isPausedRef.current = false;
      shouldStartNewSegmentRef.current = true;
      window.AndroidInterface.resumeTracking();
    }
  };

  const stopTracking = async () => {
    if (window.AndroidInterface) {
      setIsRecording(false);
      isPausedRef.current = false;
      setPath([]);
      pathRef.current = [];
      setDistance(0);
      setDuration(0);
      setCurrentSpeed(0);
      shouldStartNewSegmentRef.current = false;
      window.AndroidInterface.stopTracking();
      setActivityType(t.activity_types[0]);
    } else {
      setIsRecording(false);
      setPath([]);
      pathRef.current = [];
      setDistance(0);
      setDuration(0);
      setCurrentSpeed(0);
      shouldStartNewSegmentRef.current = false;
      setActivityType(t.activity_types[0]);
    }
  };

  return (
    <TrackingContext.Provider value={{
      isRecording, isPaused, activityType, setActivityType,
      path, currentPos, distance, duration, currentSpeed, currentAltitude,
      startTracking, pauseTracking, resumeTracking, stopTracking,
      isLocationEnabled, enableLocationTracking
    }}>
      {children}
    </TrackingContext.Provider>
  );
}

export function useTracking() {
  const context = useContext(TrackingContext);
  if (!context) {
    throw new Error('useTracking must be used within a TrackingProvider');
  }
  return context;
}
