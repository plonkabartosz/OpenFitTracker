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
  isLocationEnabled: boolean;
  enableLocationTracking: () => void;
}

const TrackingContext = createContext<TrackingContextType | null>(null);

async function fetchElevation(lat: number, lng: number): Promise<number | null> {
  try {
    const response = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`);
    const data = await response.json();
    if (data && data.results && data.results[0]) {
      return data.results[0].elevation;
    }
  } catch (err) {
    console.error("Elevation fetch error", err);
  }
  return null;
}

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
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(() => {}, () => {});
    }
  };

  const updateElevation = async (lat: number, lng: number) => {
    if (lastElevationPosRef.current) {
      const dist = calculateDistance(lastElevationPosRef.current.lat, lastElevationPosRef.current.lng, lat, lng);
      if (dist < 5) return lastFetchedAltitudeRef.current; // Only fetch if moved > 5m
    }
    const alt = await fetchElevation(lat, lng);
    if (alt !== null) {
      setCurrentAltitude(alt);
      lastElevationPosRef.current = { lat, lng };
      lastFetchedAltitudeRef.current = alt;
      return alt;
    }
    return lastFetchedAltitudeRef.current;
  };

  useEffect(() => {
    if (!navigator.geolocation || !isLocationEnabled) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        const newAlt = pos.coords.altitude;
        const newAcc = pos.coords.accuracy;
        const newSpeed = pos.coords.speed;
        const newTs = pos.timestamp;

        const handleLocationUpdate = async () => {
          const alt = await updateElevation(newLat, newLng);
          const finalAlt = alt !== null ? alt : newAlt;
          
          // Keep updating UI even if paused
          setCurrentAltitude(finalAlt);
          setCurrentPos([newLat, newLng]);
          
          // Calculate speed for UI
          if (newSpeed !== null) {
            setCurrentSpeed(newSpeed * 3.6);
          } else if (lastUIPosRef.current) {
            const dist = calculateDistance(
              lastUIPosRef.current.lat, lastUIPosRef.current.lng,
              newLat, newLng
            );
            const timeDiff = (newTs - lastUIPosRef.current.timestamp) / 1000;
            if (timeDiff > 0) {
              setCurrentSpeed((dist / timeDiff) * 3.6);
            }
          }

          // Update lastUIPosRef for next UI update
          lastUIPosRef.current = {
            lat: newLat,
            lng: newLng,
            timestamp: newTs,
            speed: newSpeed,
            accuracy: newAcc,
            altitude: finalAlt
          };

          // If not recording, we are done
          if (!isRecording) return;

          // If paused, we don't save data or update distance
          if (isPausedRef.current) return;

          if (newAcc > 20) return;

          const isSegmentStart = shouldStartNewSegmentRef.current;
          if (isSegmentStart) {
            shouldStartNewSegmentRef.current = false;
          }

          const newPoint: LocationPoint = {
            lat: newLat,
            lng: newLng,
            timestamp: newTs,
            speed: newSpeed,
            accuracy: newAcc,
            altitude: finalAlt,
            isSegmentStart: isSegmentStart
          };

          setPath(prev => {
            // Only calculate distance if NOT a segment start and we have a previous point
            if (lastPosRef.current && !isSegmentStart) {
              const dist = calculateDistance(
                lastPosRef.current.lat, lastPosRef.current.lng,
                newLat, newLng
              );
              
              if (dist > 1) {
                setDistance(d => d + dist);
                // Speed is already updated above for UI
                lastPosRef.current = newPoint;
                const newPath = [...prev, newPoint];
                pathRef.current = newPath;
                return newPath;
              }
              return prev;
            } else {
              // First point of session or first point of new segment
              lastPosRef.current = newPoint;
              const newPath = [...prev, newPoint];
              pathRef.current = newPath;
              return newPath;
            }
          });
        };

        handleLocationUpdate();
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
    isPausedRef.current = false;
    shouldStartNewSegmentRef.current = false;
    startTimeRef.current = Date.now();
    setPath([]);
    pathRef.current = [];
    setDistance(0);
    setDuration(0);
    lastPosRef.current = null;
    lastUIPosRef.current = null;

    timerRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  };

  const pauseTracking = () => {
    setIsPaused(true);
    isPausedRef.current = true;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCurrentSpeed(0);
  };

  const resumeTracking = () => {
    setIsPaused(false);
    isPausedRef.current = false;
    shouldStartNewSegmentRef.current = true;
    
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
    shouldStartNewSegmentRef.current = false;
    setActivityType(t.activity_types[0]);
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
