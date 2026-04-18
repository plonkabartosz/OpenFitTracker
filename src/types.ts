export interface LocationPoint {
  lat: number;
  lng: number;
  timestamp: number;
  speed: number | null; // m/s
  accuracy: number; // meters
  altitude?: number | null; // meters
  isSegmentStart?: boolean;
}

export interface ActivitySession {
  id?: number;
  type: string;
  startTime: number;
  endTime: number | null;
  durationMs: number;
  distanceMeters: number;
  path: LocationPoint[];
  isFinished: number; // 1 for true, 0 for false
}

export interface UserProfile {
  id?: number;
  username: string;
}

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
    onAndroidSessionsLoaded: (jsonStr: string) => void;
  }
}
