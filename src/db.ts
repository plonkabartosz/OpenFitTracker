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

// Dummy db export to avoid breaking file structures. We no longer use dexie.
export const db = {
  sessions: {
    add: async () => {},
    put: async () => {},
    clear: async () => {},
    where: () => ({
      reverse: () => ({
        sortBy: async () => [],
      }),
      delete: async () => {}
    }),
    toArray: async () => []
  },
  profile: {
    toArray: async () => [],
    add: async () => {},
    put: async () => {}
  }
};

