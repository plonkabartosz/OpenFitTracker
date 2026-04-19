import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { t } from '../i18n';

export interface LocationPoint {
  lat: number;
  lng: number;
  timestamp: number;
  speed: number | null;
  accuracy: number;
  altitude?: number | null;
  isSegmentStart?: boolean;
}

export interface ActivitySession {
  id: number;
  type: string;
  startTime: number;
  endTime: number | null;
  durationMs: number;
  distanceMeters: number;
  path: LocationPoint[];
  isFinished: number;
}

declare global {
  interface Window {
    Android?: {
      startTracking: (activityType: string) => void;
      pauseTracking: () => void;
      resumeTracking: () => void;
      stopTracking: () => void;
      requestPermissions: () => void;
      getJournalSessions: () => string;
      getActivityDetails: (id: number) => string;
    };
    updateTrackingData: (dataStr: string) => void;
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
  const [isLocationEnabled, setIsLocationEnabled] = useState(true);
  const [activityType, setActivityType] = useState(t.activity_types[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const [path, setPath] = useState<LocationPoint[]>([]);
  const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [currentAltitude, setCurrentAltitude] = useState<number | null>(null);

  useEffect(() => {
    window.updateTrackingData = (dataStr: string) => {
      try {
        const data = JSON.parse(dataStr);
        if (data.isRecording !== undefined) setIsRecording(data.isRecording);
        if (data.isPaused !== undefined) setIsPaused(data.isPaused);
        if (data.activityType) setActivityType(data.activityType);
        if (data.path) setPath(data.path);
        if (data.currentPos) setCurrentPos(data.currentPos);
        if (data.distance !== undefined) setDistance(data.distance);
        if (data.duration !== undefined) setDuration(data.duration);
        if (data.currentSpeed !== undefined) setCurrentSpeed(data.currentSpeed);
        if (data.currentAltitude !== undefined) setCurrentAltitude(data.currentAltitude);
      } catch (e) {
        console.error("Failed to parse tracking data", e);
      }
    };
    return () => {
      delete window.updateTrackingData;
    };
  }, []);

  const enableLocationTracking = () => {
    setIsLocationEnabled(true);
    if (window.Android && window.Android.requestPermissions) {
      window.Android.requestPermissions();
    }
  };

  const startTracking = () => {
    if (window.Android) {
      window.Android.startTracking(activityType);
    }
  };

  const pauseTracking = () => {
    if (window.Android) {
      window.Android.pauseTracking();
    }
  };

  const resumeTracking = () => {
    if (window.Android) {
      window.Android.resumeTracking();
    }
  };

  const stopTracking = async () => {
    if (window.Android) {
      window.Android.stopTracking();
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
