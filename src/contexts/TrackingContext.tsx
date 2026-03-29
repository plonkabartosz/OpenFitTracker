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
  const [currentPos, setCurrentPos] = useState<[number, number] | null>([52.2297, 21.0122]);
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
    // Only get location if permission is already granted to avoid prompting on load
    if (navigator.permissions && navigator.geolocation) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        if (result.state === 'granted') {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setCurrentPos([pos.coords.latitude, pos.coords.longitude]);
              setCurrentAltitude(pos.coords.altitude);
            },
            () => {},
            { enableHighAccuracy: true }
          );
        }
      });
    }
    
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTracking = async () => {
    if (!navigator.geolocation) {
      alert('GPS is disabled');
      return;
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      if (permission.state === 'denied') {
        alert('Brak uprawnień do lokalizacji. Nie można rozpocząć aktywności.');
        return;
      }
    } catch (e) {
      // Ignore if permissions API is not supported
    }

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

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (!isMovingRef.current) return; // Ignore updates if device is not moving

        const newPoint: LocationPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: pos.timestamp,
          speed: pos.coords.speed,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude
        };

        setCurrentPos([newPoint.lat, newPoint.lng]);
        setCurrentAltitude(newPoint.altitude);

        if (newPoint.accuracy > 20) return;

        setPath(prev => {
          let newPath = prev;
          if (lastPosRef.current) {
            const dist = calculateDistance(
              lastPosRef.current.lat, lastPosRef.current.lng,
              newPoint.lat, newPoint.lng
            );
            
            if (dist > 1) {
              setDistance(d => d + dist);
              
              if (newPoint.speed === null) {
                const timeDiff = (newPoint.timestamp - lastPosRef.current!.timestamp) / 1000;
                if (timeDiff > 0) {
                  setCurrentSpeed((dist / timeDiff) * 3.6);
                }
              } else {
                setCurrentSpeed(newPoint.speed * 3.6);
              }
              lastPosRef.current = newPoint;
            }
            newPath = [...prev, newPoint];
          } else {
            lastPosRef.current = newPoint;
            newPath = [...prev, newPoint];
          }
          pathRef.current = newPath;
          return newPath;
        });
      },
      (err) => {
        console.error("Tracking error", err);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
  };

  const pauseTracking = () => {
    setIsPaused(true);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
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

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (!isMovingRef.current) return;

        const newPoint: LocationPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: pos.timestamp,
          speed: pos.coords.speed,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude
        };
        setCurrentPos([newPoint.lat, newPoint.lng]);
        setCurrentAltitude(newPoint.altitude);
        
        if (newPoint.accuracy > 20) return;
        
        setPath(prev => {
          let newPath = prev;
          if (lastPosRef.current) {
            const dist = calculateDistance(
              lastPosRef.current.lat, lastPosRef.current.lng,
              newPoint.lat, newPoint.lng
            );
            if (dist > 1) {
              setDistance(d => d + dist);
              if (newPoint.speed === null) {
                const timeDiff = (newPoint.timestamp - lastPosRef.current!.timestamp) / 1000;
                if (timeDiff > 0) {
                  setCurrentSpeed((dist / timeDiff) * 3.6);
                }
              } else {
                setCurrentSpeed(newPoint.speed * 3.6);
              }
              lastPosRef.current = newPoint;
            }
            newPath = [...prev, newPoint];
          } else {
            lastPosRef.current = newPoint;
            newPath = [...prev, newPoint];
          }
          pathRef.current = newPath;
          return newPath;
        });
      },
      (err) => console.error(err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
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
