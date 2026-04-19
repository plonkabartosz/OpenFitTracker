declare global {
  interface Window {
    Android?: {
      startTracking: (activityType: string) => void;
      pauseTracking: () => void;
      resumeTracking: () => void;
      stopTracking: () => void;
      requestState: () => void;
      requestSessions: () => void;
      requestSession: (id: number) => void;
      deleteSession: (id: number) => void;
    };
    updateTrackingData: (dataStr: string) => void;
    onActivityStateChanged: (stateStr: string) => void;
    onSessionsLoaded: (sessionsStr: string) => void;
    onSessionLoaded: (sessionStr: string) => void;
  }
}

export {};
