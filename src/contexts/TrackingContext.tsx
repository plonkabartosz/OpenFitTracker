import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { db, LocationPoint } from '../db';
import { calculateDistance } from '../utils/geo';
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
}

const TrackingContext = createContext<TrackingContextType | null>(null);

export function TrackingProvider({ children }: { children: ReactNode }) {
  const [activityType, setActivityType] = useState(t.activity_types[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
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

  // Accelerometer logic
  const lastMotionTimeRef = useRef<number>(Date.now());
  const isMovingRef = useRef<boolean>(true);

  useEffect(() => {
    const handleMotion = (event: DeviceMotionEvent) => {
      if (!event.accelerationIncludingGravity) return;
      const { x, y, z } = event.accelerationIncludingGravity;
      if (x === null || y === null || z === null) return;
      
      const magnitude = Math.sqrt(x*x + y*y + z*z);
      // Gravity is ~9.8. If magnitude is significantly different from 9.8, we are moving
      const diff = Math.abs(magnitude - 9.81);
      
      if (diff > 1.0) { // Threshold for movement
        lastMotionTimeRef.current = Date.now();
        isMovingRef.current = true;
      } else {
        if (Date.now() - lastMotionTimeRef.current > 10000) { // 10 seconds of no significant movement
          isMovingRef.current = false;
        }
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        const newAlt = pos.coords.altitude;
        const newAcc = pos.coords.accuracy;
        const newSpeed = pos.coords.speed;
        const newTs = pos.timestamp;

        // Always update currentPos if NOT recording
        if (!isRecording) {
          setCurrentPos([newLat, newLng]);
          setCurrentAltitude(newAlt);
          return;
        }

        // If recording, use sensor data to eliminate drift
        if (!isMovingRef.current || isPaused) return;

        setCurrentPos([newLat, newLng]);
        setCurrentAltitude(newAlt);

        if (newAcc > 20) return;

        setPath(prev => {
          const newPoint: LocationPoint = {
            lat: newLat,
            lng: newLng,
            timestamp: newTs,
            speed: newSpeed,
            accuracy: newAcc,
            altitude: newAlt
          };

          if (lastPosRef.current) {
            const dist = calculateDistance(
              lastPosRef.current.lat, lastPosRef.current.lng,
              newLat, newLng
            );
            
            if (dist > 1) {
              setDistance(d => d + dist);
              
              if (newSpeed === null) {
                const timeDiff = (newTs - lastPosRef.current.timestamp) / 1000;
                if (timeDiff > 0) {
                  setCurrentSpeed((dist / timeDiff) * 3.6);
                }
              } else {
                setCurrentSpeed(newSpeed * 3.6);
              }
              lastPosRef.current = newPoint;
              const newPath = [...prev, newPoint];
              pathRef.current = newPath;
              return newPath;
            }
            return prev;
          } else {
            lastPosRef.current = newPoint;
            const newPath = [...prev, newPoint];
            pathRef.current = newPath;
            return newPath;
          }
        });
      },
      (err) => console.error("Location error", err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTracking = async () => {
    setIsRecording(true);
    setIsPaused(false);
    startTimeRef.current = Date.now();
    setPath([]);
    pathRef.current = [];
    setDistance(0);
    setDuration(0);
    lastPosRef.current = null;

    timerRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  };

  const pauseTracking = () => {
    setIsPaused(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCurrentSpeed(0);
  };

  const resumeTracking = () => {
    setIsPaused(false);
    
    timerRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  };

  const stopTracking = async () => {
    pauseTracking();
    
    if (duration > 0 || pathRef.current.length > 0) {
      await db.sessions.add({
        type: activityType,
        startTime: startTimeRef.current || Date.now(),
        endTime: Date.now(),
        durationMs: duration * 1000,
        distanceMeters: distance,
        path: pathRef.current,
        isFinished: 1
      });
    }
    
    setIsRecording(false);
    setPath([]);
    pathRef.current = [];
    setDistance(0);
    setDuration(0);
    setCurrentSpeed(0);
  };

  return (
    <TrackingContext.Provider value={{
      isRecording, isPaused, activityType, setActivityType,
      path, currentPos, distance, duration, currentSpeed, currentAltitude,
      startTracking, pauseTracking, resumeTracking, stopTracking
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
