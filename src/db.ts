import Dexie, { Table } from 'dexie';

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

export class OpenFitDatabase extends Dexie {
  sessions!: Table<ActivitySession, number>;
  profile!: Table<UserProfile, number>;

  constructor() {
    super('OpenFitDatabase');
    this.version(1).stores({
      sessions: '++id, type, startTime, endTime, isFinished',
      profile: '++id'
    });
  }
}

export const db = new OpenFitDatabase();
