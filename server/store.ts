import fs from 'node:fs';
import path from 'node:path';
import type {
  AlertSettings,
  EmailAlertRecord,
  InAppNotification,
  JobListing,
  PlatformSource,
} from '../src/types/jobs.ts';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const STATE_FILE = path.resolve(DATA_DIR, 'radar-state.json');

export const ALL_PLATFORMS: PlatformSource[] = [
  'LinkedIn',
  'CatererGlobal',
  'NaukriGulf',
  'Talent.com UAE',
  'Jobrapido UAE',
  'FounditGulf',
  'Hosco',
  'GulfTalent',
  'Bayt',
  'Indeed UAE',
  'Twitter / X',
  'Facebook',
  'Instagram',
  'Dubizzle',
  'Hotel Career Portal',
];

export const DEFAULT_SETTINGS: AlertSettings = {
  recipientEmail: 'diptimondal18@gmail.com',
  autoEmailEnabled: true,
  browserAlertsEnabled: true,
  soundEnabled: true,
  minMatchScore: 65,
  pollIntervalSeconds: 300,
  enabledPlatforms: ALL_PLATFORMS,
  targetKeywords: [
    'F&B Operations Manager',
    'Head of Operations',
    'Floor Manager',
    'QSR Operations Manager',
    'Area Manager',
    'Outlet Manager',
    'Restaurant Manager',
    'Senior Restaurant Manager',
    'Banquet Manager',
    'All-Day Dining Manager',
    'Buffet Operations',
    'Club Lounge Manager',
  ],
};

export interface PersistedState {
  jobs: JobListing[];
  settings: AlertSettings;
  emailLog: EmailAlertRecord[];
  notifications: InAppNotification[];
  lastScanAt: string | null;
  lastScanSummary: string | null;
  scanCount: number;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadState(): PersistedState {
  try {
    ensureDataDir();
    if (!fs.existsSync(STATE_FILE)) {
      return {
        jobs: [],
        settings: DEFAULT_SETTINGS,
        emailLog: [],
        notifications: [],
        lastScanAt: null,
        lastScanSummary: null,
        scanCount: 0,
      };
    }
    const raw = fs.readFileSync(STATE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const savedPlatforms = Array.isArray(parsed.settings?.enabledPlatforms)
      ? parsed.settings.enabledPlatforms.filter((p): p is PlatformSource => ALL_PLATFORMS.includes(p))
      : [];

    return {
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
      settings: {
        ...DEFAULT_SETTINGS,
        ...(parsed.settings ?? {}),
        enabledPlatforms: savedPlatforms.length > 0 ? savedPlatforms : ALL_PLATFORMS,
        targetKeywords: Array.isArray(parsed.settings?.targetKeywords)
          ? parsed.settings.targetKeywords
          : DEFAULT_SETTINGS.targetKeywords,
      },
      emailLog: Array.isArray(parsed.emailLog) ? parsed.emailLog : [],
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
      lastScanAt: typeof parsed.lastScanAt === 'string' ? parsed.lastScanAt : null,
      lastScanSummary: typeof parsed.lastScanSummary === 'string' ? parsed.lastScanSummary : null,
      scanCount: typeof parsed.scanCount === 'number' ? parsed.scanCount : 0,
    };
  } catch (err) {
    console.error('Failed to load radar state, initializing clean state:', err);
    return {
      jobs: [],
      settings: DEFAULT_SETTINGS,
      emailLog: [],
      notifications: [],
      lastScanAt: null,
      lastScanSummary: null,
      scanCount: 0,
    };
  }
}

export function saveState(state: PersistedState): void {
  try {
    ensureDataDir();
    const resolved = path.resolve(STATE_FILE);
    if (!resolved.startsWith(DATA_DIR + path.sep)) {
      throw new Error('Invalid state file path');
    }
    fs.writeFileSync(resolved, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist radar state:', err);
  }
}
