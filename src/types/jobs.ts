export type PlatformSource =
  | 'LinkedIn'
  | 'CatererGlobal'
  | 'NaukriGulf'
  | 'Talent.com UAE'
  | 'Jobrapido UAE'
  | 'FounditGulf'
  | 'Hosco'
  | 'GulfTalent'
  | 'Bayt'
  | 'Indeed UAE'
  | 'Twitter / X'
  | 'Facebook'
  | 'Instagram'
  | 'Dubizzle'
  | 'Hotel Career Portal';

export type RoleCategory =
  | 'Restaurant Operations'
  | 'QSR & Multi-Outlet Ops'
  | 'Floor & Service Management'
  | 'Banquets & Events'
  | 'Buffet & All-Day Dining'
  | 'Luxury Hotel F&B'
  | 'Club Lounge & Bar';

export interface RecruiterContact {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  contactConfidence: 'verified' | 'extracted' | 'portal-only';
}

export interface GroundingLink {
  title: string;
  url: string;
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  platform: PlatformSource;
  category: RoleCategory;
  postedAtText: string;
  postedAt?: string;
  postedTimePrecision?: 'exact' | 'date-only' | 'unknown';
  discoveredAt: string;
  alertSentAt?: string;
  delayMinutes?: number;
  sourceUrl: string;
  groundingLinks?: GroundingLink[];
  summary: string;
  requirements: string[];
  salaryOrPackage?: string;
  matchScore: number;
  matchReasons: string[];
  recruiter: RecruiterContact;
  alertStatus: 'sent' | 'queued' | 'pending' | 'skipped';
  applied: boolean;
  saved: boolean;
  notes?: string;
  outreachDraft?: {
    subject: string;
    body: string;
    whatsappMessage: string;
  };
}

export interface ExperienceItem {
  role: string;
  property: string;
  location: string;
  period: string;
  highlights: string[];
}

export interface CandidateProfile {
  name: string;
  headline: string;
  location: string;
  phone: string;
  email: string;
  linkedinUrl: string;
  visaStatus: string;
  availability: string;
  yearsExperience: number;
  resumePdfUrl: string;
  summary: string;
  targetRoles: string[];
  coreSkills: {
    operations: string[];
    guestExperience: string[];
    leadership: string[];
    commercial: string[];
  };
  experience: ExperienceItem[];
  education: string[];
  systems: string[];
  languages: string[];
}

export interface AlertSettings {
  recipientEmail: string;
  autoEmailEnabled: boolean;
  browserAlertsEnabled: boolean;
  soundEnabled: boolean;
  minMatchScore: number;
  pollIntervalSeconds: number;
  enabledPlatforms: PlatformSource[];
  targetKeywords: string[];
}

export interface EmailAlertRecord {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  toEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  kind: 'job-alert' | 'recruiter-outreach';
  sentVia: 'gmail-oauth' | 'smtp' | 'dispatch-log';
  status: 'delivered' | 'ready' | 'failed';
  timestamp: string;
  error?: string;
}

export interface InAppNotification {
  id: string;
  jobId: string;
  title: string;
  company: string;
  location: string;
  platform: PlatformSource;
  matchScore: number;
  recruiterEmail?: string;
  recruiterPhone?: string;
  sourceUrl: string;
  postedAt?: string;
  postedAtText?: string;
  postedTimePrecision?: 'exact' | 'date-only' | 'unknown';
  createdAt: string;
  delayMinutes?: number;
  read: boolean;
  emailDispatched: boolean;
}

export interface RadarState {
  jobs: JobListing[];
  settings: AlertSettings;
  emailLog: EmailAlertRecord[];
  notifications: InAppNotification[];
  lastScanAt: string | null;
  lastScanSummary: string | null;
  scanCount: number;
  smtpConfigured: boolean;
  geminiConfigured: boolean;
}
