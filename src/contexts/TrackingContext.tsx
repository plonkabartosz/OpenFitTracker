import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { LocationPoint } from '../db';
import { t } from '../i18n';

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
  const [isLocationEnabled, setIsLocationEnabled] = useState(true); // Default true since Android handles permissions
  const [activityType, setActivityType] = useState(t.activity_types[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [path, setPath] = useState<LocationPoint[]>([]);
  const [currentPos, setCurrentPos] = useState<[number, number] | null>([52.0693, 19.4803]);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [currentAltitude, setCurrentAltitude] = useState<number | null>(null);

  useEffect(() => {
    window.updateTrackingData = (dataStr: string) => {
      try {
        const data = JSON.parse(dataStr);
        if (data.newPoint) {
            setPath(prev => [...prev, data.newPoint]);
        }
        if (data.currentPos) setCurrentPos(data.currentPos);
        if (data.distance !== undefined) setDistance(data.distance);
        if (data.duration !== undefined) setDuration(data.duration);
        if (data.currentSpeed !== undefined) setCurrentSpeed(data.currentSpeed);
        if (data.currentAltitude !== undefined) setCurrentAltitude(data.currentAltitude);
      } catch (e) {
        console.error("Failed to parse tracking data", e);
      }
    };

    window.onActivityStateChanged = (stateStr: string) => {
        try {
            const state = JSON.parse(stateStr);
            if (state.isRecording !== undefined) setIsRecording(state.isRecording);
            if (state.isPaused !== undefined) setIsPaused(state.isPaused);
            if (state.activityType !== undefined) setActivityType(state.activityType);
        } catch(e) {
            console.error("Failed to parse state", e);
        }
    }

    // Request initial state from Android if available
    setTimeout(() => {
        if (window.Android && window.Android.requestState) {
            window.Android.requestState();
        }
    }, 500);

    return () => {
      delete (window as any).updateTrackingData;
      delete (window as any).onActivityStateChanged;
    };
  }, []);

  const enableLocationTracking = () => {
    setIsLocationEnabled(true);
  };

  const startTracking = async () => {
    setIsRecording(true);
    setIsPaused(false);
    if (window.Android) {
        window.Android.startTracking(activityType);
    }
  };

  const pauseTracking = () => {
    setIsPaused(true);
    if (window.Android) {
        window.Android.pauseTracking();
    }
  };

  const resumeTracking = () => {
    setIsPaused(false);
    if (window.Android) {
        window.Android.resumeTracking();
    }
  };

  const stopTracking = async () => {
    setIsRecording(false);
    setIsPaused(false);
    setActivityType(t.activity_types[0]);
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

