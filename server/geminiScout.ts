import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import crypto from 'node:crypto';
import type {
  AlertSettings,
  CandidateProfile,
  GroundingLink,
  JobListing,
  PlatformSource,
  RoleCategory,
} from '../src/types/jobs.ts';
import {
  extractContactsFromText,
  fetchDirectDubaiHospitalityJobs,
  inferRoleCategory,
  scoreJobAgainstDiptiProfile,
} from './liveSources.ts';
import {
  computeTimeDifferenceMinutes,
  parsePostedTimeInput,
} from '../src/utils/timeMetrics.ts';

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const VALID_PLATFORMS: PlatformSource[] = [
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

const VALID_CATEGORIES: RoleCategory[] = [
  'Restaurant Operations',
  'QSR & Multi-Outlet Ops',
  'Floor & Service Management',
  'Banquets & Events',
  'Buffet & All-Day Dining',
  'Luxury Hotel F&B',
  'Club Lounge & Bar',
];

function normalizePlatform(raw?: string): PlatformSource {
  const val = (raw ?? '').toLowerCase();
  if (val.includes('linkedin')) return 'LinkedIn';
  if (val.includes('caterer')) return 'CatererGlobal';
  if (val.includes('naukri')) return 'NaukriGulf';
  if (val.includes('talent')) return 'Talent.com UAE';
  if (val.includes('jobrapido')) return 'Jobrapido UAE';
  if (val.includes('foundit') || val.includes('monster')) return 'FounditGulf';
  if (val.includes('hosco')) return 'Hosco';
  if (val.includes('gulftalent')) return 'GulfTalent';
  if (val.includes('bayt')) return 'Bayt';
  if (val.includes('indeed')) return 'Indeed UAE';
  if (val.includes('twitter') || val === 'x' || val.includes('x.com')) return 'Twitter / X';
  if (val.includes('facebook') || val.includes('fb.com')) return 'Facebook';
  if (val.includes('instagram') || val.includes('ig')) return 'Instagram';
  if (val.includes('dubizzle')) return 'Dubizzle';
  return 'Hotel Career Portal';
}

function normalizeCategory(raw?: string, title = ''): RoleCategory {
  const combined = `${raw ?? ''} ${title}`.toLowerCase();
  if (/qsr|multi-outlet|multi outlet|area manager|cloud kitchen|fast casual/.test(combined)) {
    return 'QSR & Multi-Outlet Ops';
  }
  if (/floor manager|dining room|service management|service manager/.test(combined)) {
    return 'Floor & Service Management';
  }
  if (combined.includes('banquet') || combined.includes('event') || combined.includes('catering')) {
    return 'Banquets & Events';
  }
  if (combined.includes('buffet') || combined.includes('all-day') || combined.includes('all day')) {
    return 'Buffet & All-Day Dining';
  }
  if (combined.includes('lounge') || combined.includes('club') || combined.includes('bar')) {
    return 'Club Lounge & Bar';
  }
  if (
    combined.includes('hotel') ||
    combined.includes('f&b') ||
    combined.includes('food & beverage') ||
    combined.includes('head of operations')
  ) {
    return 'Luxury Hotel F&B';
  }
  return 'Restaurant Operations';
}

export function isSafePublicHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host === '[::1]' ||
      host.endsWith('.local') ||
      host.endsWith('.internal')
    ) {
      return false;
    }
    const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const a = Number(ipv4Match[1]);
      const b = Number(ipv4Match[2]);
      if (
        a === 10 ||
        a === 127 ||
        a === 0 ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168)
      ) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

function sanitizeOptionalUrl(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  return isSafePublicHttpUrl(rawUrl) ? rawUrl.trim() : '';
}

function extractJsonArrayFromText(text: string): unknown[] {
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { jobs?: unknown[] }).jobs)) {
      return (parsed as { jobs: unknown[] }).jobs;
    }
  } catch {
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start !== -1 && end > start) {
      try {
        const sliced = JSON.parse(cleaned.slice(start, end + 1));
        if (Array.isArray(sliced)) return sliced;
      } catch {
        // Ignore parse failure
      }
    }
  }
  return [];
}

function extractJsonObjectFromText(text: string): Record<string, unknown> | null {
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        const sliced = JSON.parse(cleaned.slice(start, end + 1));
        if (sliced && typeof sliced === 'object' && !Array.isArray(sliced)) {
          return sliced as Record<string, unknown>;
        }
      } catch {
        return null;
      }
    }
  }
  return null;
}

function extractGroundingLinks(response: unknown): GroundingLink[] {
  const res = response as {
    candidates?: Array<{
      groundingMetadata?: {
        groundingChunks?: Array<{
          web?: { uri?: string; title?: string };
        }>;
      };
    }>;
  };

  const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const links: GroundingLink[] = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    const uri = chunk.web?.uri;
    const title = chunk.web?.title;
    if (uri && isSafePublicHttpUrl(uri) && !seen.has(uri)) {
      seen.add(uri);
      links.push({
        title: title?.trim() || 'Source Listing',
        url: uri,
      });
    }
  }
  return links;
}

function buildProfileBrief(profile: CandidateProfile): string {
  return `
Candidate: ${profile.name}
Current Headline: ${profile.headline}
Current Location & Availability: ${profile.location} | ${profile.visaStatus} | ${profile.availability}
Experience: ${profile.yearsExperience} years in Luxury Hotel Food & Beverage (Taj, St. Regis, Westin, Leela)
Recent & Key Roles:
- Senior Restaurant Manager at Taj Lands End (3 dining concepts: All-Day Dining, Japanese Pool Bar, Health Concept; 35 staff)
- Restaurant Manager at Taj Wellington Mews (Restaurant, Club Lounge & Events; 25 staff; built corporate hamper business; +20% event efficiency; +30% monthly bookings; 40% repeat corporate bookings)
- Banquet Manager at The Hotel Bassera (35+ staff, daily restaurant & banquet service)
- Restaurant Supervisor at The St. Regis Doha (>90% guest satisfaction)
- F&B Senior Attendant at Westin Mina Seyahi Dubai (Bussola Italian restaurant 250+ covers; +25% workflow efficiency)
Education & Credentials:
- WSET Level 2 Award in Wines (Merit, 84%)
- SHL Switzerland Leadership Excellence Program (2025)
- MBA in Human Resources & Bachelor of Hospitality Management
Systems: MICROS POS, BirchStreet Purchasing, Transcendent Work-Order, Hotel Management Systems
Languages: English, Hindi, Bengali
  `.trim();
}

function mapRawToJobListing(
  raw: Record<string, unknown>,
  groundingLinks: GroundingLink[],
  fallbackPlatform?: PlatformSource
): JobListing | null {
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const company = typeof raw.company === 'string' ? raw.company.trim() : '';
  if (!title || !company) return null;

  const platform = VALID_PLATFORMS.includes(raw.platform as PlatformSource)
    ? (raw.platform as PlatformSource)
    : fallbackPlatform ?? normalizePlatform(String(raw.platform ?? raw.sourceUrl ?? ''));

  const category = VALID_CATEGORIES.includes(raw.category as RoleCategory)
    ? (raw.category as RoleCategory)
    : normalizeCategory(String(raw.category ?? ''), title);

  const rawSourceUrl = sanitizeOptionalUrl(typeof raw.sourceUrl === 'string' ? raw.sourceUrl : '');
  const matchingGrounding = groundingLinks.filter(
    (g) =>
      g.url === rawSourceUrl ||
      g.title.toLowerCase().includes(company.toLowerCase()) ||
      g.title.toLowerCase().includes(title.toLowerCase().split(' ')[0] ?? '')
  );

  const fallbackApplyUrl = `https://www.google.com/search?q=${encodeURIComponent(`${title} ${company} Dubai apply`)}`;
  const effectiveSourceUrl = rawSourceUrl || matchingGrounding[0]?.url || groundingLinks[0]?.url || fallbackApplyUrl;

  const recObj =
    raw.recruiter && typeof raw.recruiter === 'object'
      ? (raw.recruiter as Record<string, unknown>)
      : {};

  const recEmail = typeof recObj.email === 'string' && recObj.email.includes('@') ? recObj.email.trim() : undefined;
  const recPhone = typeof recObj.phone === 'string' && recObj.phone.trim().length >= 7 ? recObj.phone.trim() : undefined;
  const recWhatsapp =
    typeof recObj.whatsapp === 'string' && recObj.whatsapp.trim().length >= 7
      ? recObj.whatsapp.trim()
      : recPhone;
  const recName = typeof recObj.name === 'string' && recObj.name.trim() ? recObj.name.trim() : undefined;
  const recTitle = typeof recObj.title === 'string' && recObj.title.trim() ? recObj.title.trim() : undefined;

  const contactConfidence: 'verified' | 'extracted' | 'portal-only' =
    recEmail || recPhone ? (recEmail && recPhone ? 'verified' : 'extracted') : 'portal-only';

  const rawScore = Number(raw.matchScore);
  const matchScore = Number.isFinite(rawScore) ? Math.max(40, Math.min(99, Math.round(rawScore))) : 82;

  const matchReasons = Array.isArray(raw.matchReasons)
    ? raw.matchReasons.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).slice(0, 5)
    : ['Aligns with 12 years of luxury hotel F&B and multi-outlet management experience.'];

  const requirements = Array.isArray(raw.requirements)
    ? raw.requirements.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).slice(0, 6)
    : [];

  const stableKey = `${title.toLowerCase()}::${company.toLowerCase()}::${platform.toLowerCase()}`;
  const id = crypto.createHash('sha1').update(stableKey).digest('hex').slice(0, 14);

  const nowIso = new Date().toISOString();
  const rawPostedInput =
    typeof raw.postedAt === 'string' && raw.postedAt.trim()
      ? raw.postedAt.trim()
      : typeof raw.postedAtText === 'string'
      ? raw.postedAtText.trim()
      : '';
  const parsedTime = parsePostedTimeInput(rawPostedInput);
  const delayMinutes = computeTimeDifferenceMinutes(parsedTime.postedAt, nowIso) ?? undefined;

  return {
    id,
    title,
    company,
    location: typeof raw.location === 'string' && raw.location.trim() ? raw.location.trim() : 'Dubai, UAE',
    platform,
    category,
    postedAtText: parsedTime.postedAtText,
    postedAt: parsedTime.postedAt,
    postedTimePrecision: parsedTime.postedTimePrecision,
    discoveredAt: nowIso,
    alertSentAt: nowIso,
    delayMinutes,
    sourceUrl: effectiveSourceUrl,
    groundingLinks: matchingGrounding.length > 0 ? matchingGrounding.slice(0, 3) : groundingLinks.slice(0, 3),
    summary:
      typeof raw.summary === 'string' && raw.summary.trim()
        ? raw.summary.trim()
        : `${title} opportunity at ${company} in Dubai food & beverage operations.`,
    requirements,
    salaryOrPackage:
      typeof raw.salaryOrPackage === 'string' && raw.salaryOrPackage.trim()
        ? raw.salaryOrPackage.trim()
        : undefined,
    matchScore,
    matchReasons,
    recruiter: {
      name: recName,
      title: recTitle,
      email: recEmail,
      phone: recPhone,
      whatsapp: recWhatsapp,
      contactConfidence,
    },
    alertStatus: 'pending',
    applied: false,
    saved: false,
  };
}

async function runGeminiSearchScan(
  ai: GoogleGenAI,
  profile: CandidateProfile,
  settings: AlertSettings,
  options?: { platformFocus?: PlatformSource | 'All'; customQuery?: string }
): Promise<JobListing[]> {
  const profileBrief = buildProfileBrief(profile);
  const platformFocus = options?.platformFocus && options.platformFocus !== 'All' ? options.platformFocus : null;
  const platformsToQuery = platformFocus ? [platformFocus] : settings.enabledPlatforms;
  const customQuery = options?.customQuery?.trim() ?? '';

  const prompt = `
You are a real-time executive hospitality job scout searching the live web via Google Search for current job openings in DUBAI, UAE.

TARGET CANDIDATE PROFILE:
${profileBrief}

SEARCH MISSION:
Find 6 to 10 REAL, CURRENT job listings in Dubai, UAE matching this candidate's seniority and domain:
- Operations Manager (F&B / Hospitality / Multi-Joint Restaurants), Head of Operations, Area Manager (Restaurants & QSR), Multi-Outlet / QSR Operations Manager, Floor Manager, Outlet Manager, Restaurant Manager, Senior Restaurant Manager, Banquet Manager, Catering & Events Manager, All-Day Dining / Buffet Manager, Club Lounge Manager.
${customQuery ? `- Specific user search focus: "${customQuery}"` : ''}
- Platforms to search across: ${platformsToQuery.join(', ')}.
- Look specifically for postings on LinkedIn, CatererGlobal, NaukriGulf, GulfTalent, Bayt, Hosco, Indeed UAE, X (Twitter), Facebook hospitality groups, Instagram hiring posts, Dubai QSR/multi-outlet operators (Alshaya, Americana, Azadea, Kitopi, Cravia, Emirates Leisure Retail, Apparel Group, Gourmet Gulf, Sunset Hospitality, Addmind), and Dubai hotel career portals (Jumeirah, Marriott, Hilton, Accor, Taj Dubai, Emaar Hospitality, Atlantis, Four Seasons).
- IMPORTANT: Whenever a public job post, social post, or hotel recruitment page mentions a recruiter's email address, phone number, or WhatsApp number (+971...), extract it accurately! Never invent or guess an email or phone number.
- Never fabricate job listings. Only return real openings grounded in the Google Search results.

OUTPUT FORMAT:
Return ONLY a valid JSON array where each item has this exact structure:
[
  {
    "title": "Exact Job Title",
    "company": "Hotel, Resort, QSR Group, or Hospitality Brand in Dubai",
    "location": "District in Dubai",
    "platform": "One of: LinkedIn | CatererGlobal | NaukriGulf | Talent.com UAE | Jobrapido UAE | FounditGulf | Hosco | GulfTalent | Bayt | Indeed UAE | Twitter / X | Facebook | Instagram | Dubizzle | Hotel Career Portal",
    "category": "One of: Restaurant Operations | QSR & Multi-Outlet Ops | Floor & Service Management | Banquets & Events | Buffet & All-Day Dining | Luxury Hotel F&B | Club Lounge & Bar",
    "postedAt": "Exact ISO-8601 timestamp if published (e.g. 2026-11-23T11:30:00Z), else null",
    "postedAtText": "Recency shown in search result (e.g. '35 mins ago', '2 hours ago', 'Today')",
    "sourceUrl": "Direct https:// URL to the job posting found in search",
    "summary": "Concise 2-3 sentence summary of the role scope and property.",
    "requirements": ["Key requirement 1", "Key requirement 2"],
    "salaryOrPackage": "Mentioned salary/benefits if stated, or null",
    "matchScore": 88,
    "matchReasons": ["Specific tie to Dipti's CV"],
    "recruiter": {
      "name": "Recruiter name if found, else null",
      "title": "Recruiter title if found, else null",
      "email": "Extracted email if explicitly found, else null",
      "phone": "Extracted phone/WhatsApp if explicitly found, else null",
      "whatsapp": "Extracted WhatsApp number if found, else null"
    }
  }
]
  `.trim();

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });

  const groundingLinks = extractGroundingLinks(response);
  const rawList = extractJsonArrayFromText(response.text ?? '[]');

  const mapped: JobListing[] = [];
  for (const item of rawList) {
    if (item && typeof item === 'object') {
      const job = mapRawToJobListing(
        item as Record<string, unknown>,
        groundingLinks,
        platformFocus ?? undefined
      );
      if (job) mapped.push(job);
    }
  }
  return mapped;
}

export async function scanDubaiHospitalityJobs(
  profile: CandidateProfile,
  settings: AlertSettings,
  options?: { platformFocus?: PlatformSource | 'All'; customQuery?: string }
): Promise<{ jobs: JobListing[]; searchNote: string; geminiUsed: boolean; geminiWarning?: string }> {
  const ai = getAiClient();

  const directPromise = fetchDirectDubaiHospitalityJobs(profile, options);
  const geminiPromise = ai
    ? runGeminiSearchScan(ai, profile, settings, options).catch((err) => {
        console.warn('Gemini search scan fallback warning:', err);
        return { error: err instanceof Error ? err.message : 'Gemini search unavailable', jobs: [] as JobListing[] };
      })
    : Promise.resolve({ error: undefined, jobs: [] as JobListing[] });

  const [directRes, geminiRes] = await Promise.all([
    directPromise,
    geminiPromise.then((res) => (Array.isArray(res) ? { jobs: res, error: undefined } : res)),
  ]);

  const byId = new Map<string, JobListing>();
  for (const job of geminiRes.jobs) {
    byId.set(job.id, job);
  }
  for (const job of directRes.jobs) {
    if (!byId.has(job.id)) {
      byId.set(job.id, job);
    }
  }

  const combined = Array.from(byId.values()).sort((a, b) => b.matchScore - a.matchScore);
  const geminiUsed = Boolean(ai && !geminiRes.error);

  const sourcesList = [
    ...directRes.sourcesChecked,
    ...(geminiUsed ? ['Google Search Grounding (LinkedIn, Social, GCC Boards)'] : []),
  ];

  const geminiWarning = !ai
    ? 'Live direct job feeds active. Add GEMINI_API_KEY in Settings > Secrets to also enable AI web search across LinkedIn posts, Facebook, Instagram, and X.'
    : geminiRes.error
    ? `Direct job feeds returned results; Gemini search noted: ${geminiRes.error}`
    : undefined;

  return {
    jobs: combined,
    searchNote: `Scanned ${sourcesList.join(', ')} (${combined.length} Dubai F&B matches found).`,
    geminiUsed,
    geminiWarning,
  };
}

export async function inspectJobPosting(
  inputTextOrUrl: string,
  profile: CandidateProfile
): Promise<JobListing> {
  const trimmed = inputTextOrUrl.trim();
  const isUrl = /^https?:\/\//i.test(trimmed);

  if (isUrl && !isSafePublicHttpUrl(trimmed)) {
    throw new Error('Please provide a valid public http:// or https:// job listing URL.');
  }

  const ai = getAiClient();
  if (ai) {
    const profileBrief = buildProfileBrief(profile);
    const prompt = `
Analyze the following Dubai hospitality / F&B job posting ${isUrl ? `at URL: ${trimmed}` : 'text'} and extract structured job details, recruiter contact info (email, phone, WhatsApp), and match evaluation for this candidate:

CANDIDATE PROFILE:
${profileBrief}

${isUrl ? `TARGET URL: ${trimmed}` : `JOB POSTING CONTENT:\n"""\n${trimmed.slice(0, 8000)}\n"""`}

Extract any recruiter email address, phone number, or WhatsApp number explicitly present. Do NOT fabricate contact details if absent.
Return ONLY a single valid JSON object matching:
{
  "title": "Job Title",
  "company": "Company or Hotel Name",
  "location": "Dubai location",
  "platform": "LinkedIn | CatererGlobal | NaukriGulf | Talent.com UAE | Jobrapido UAE | FounditGulf | Hosco | GulfTalent | Bayt | Indeed UAE | Twitter / X | Facebook | Instagram | Dubizzle | Hotel Career Portal",
  "category": "Restaurant Operations | QSR & Multi-Outlet Ops | Floor & Service Management | Banquets & Events | Buffet & All-Day Dining | Luxury Hotel F&B | Club Lounge & Bar",
  "postedAt": "Exact ISO-8601 timestamp if visible in posting, else null",
  "postedAtText": "Recency or 'Inspected now'",
  "sourceUrl": "${isUrl ? trimmed : ''}",
  "summary": "2-3 sentence summary of the opportunity",
  "requirements": ["req 1", "req 2", "req 3"],
  "salaryOrPackage": "package if stated or null",
  "matchScore": 85,
  "matchReasons": ["Specific match tie to Dipti's resume 1", "Specific match tie 2"],
  "recruiter": {
    "name": "Recruiter name or null",
    "title": "Title or null",
    "email": "Email or null",
    "phone": "Phone or null",
    "whatsapp": "WhatsApp or null"
  }
}
    `.trim();

    const tools = isUrl ? [{ urlContext: {} }, { googleSearch: {} }] : undefined;
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        ...(tools ? { tools } : {}),
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

    const groundingLinks = extractGroundingLinks(response);
    const parsed = extractJsonObjectFromText(response.text ?? '{}');
    if (parsed) {
      if (isUrl && !parsed.sourceUrl) parsed.sourceUrl = trimmed;
      const listing = mapRawToJobListing(parsed, groundingLinks);
      if (listing) return listing;
    }
  }

  // Deterministic direct extraction fallback when GEMINI_API_KEY is not set
  let contentToParse = trimmed;
  let extractedTitle = '';
  if (isUrl) {
    try {
      const res = await fetch(trimmed, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const html = await res.text();
        extractedTitle =
          html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() ?? '';
        contentToParse = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 8000);
      }
    } catch {
      // Proceed with URL string metadata
    }
  }

  const lines = contentToParse
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const title = extractedTitle || lines[0]?.slice(0, 90) || 'Dubai Hospitality Opportunity';
  const company = lines[1]?.slice(0, 60) || 'Dubai Hospitality Employer';
  const contacts = extractContactsFromText(contentToParse);
  const { matchScore, matchReasons } = scoreJobAgainstDiptiProfile(
    title,
    company,
    'Dubai, UAE',
    contentToParse.slice(0, 800),
    profile
  );

  const platform = normalizePlatform(isUrl ? trimmed : contentToParse);
  const id = crypto.createHash('sha1').update(`${title}::${trimmed.slice(0, 80)}`).digest('hex').slice(0, 14);
  const nowIso = new Date().toISOString();
  const rawTimeMatch = contentToParse.match(/\b(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}[^\s"']*|\d+\s*(?:mins?|minutes?|hours?|hrs?|days?)\s*ago)\b/i)?.[1];
  const parsedTime = parsePostedTimeInput(rawTimeMatch);
  const delayMinutes = computeTimeDifferenceMinutes(parsedTime.postedAt, nowIso) ?? undefined;

  return {
    id,
    title,
    company,
    location: 'Dubai, UAE',
    platform,
    category: inferRoleCategory(title, contentToParse),
    postedAtText: parsedTime.postedAtText,
    postedAt: parsedTime.postedAt,
    postedTimePrecision: parsedTime.postedTimePrecision,
    discoveredAt: nowIso,
    alertSentAt: nowIso,
    delayMinutes,
    sourceUrl: isUrl ? trimmed : '',
    summary: contentToParse.slice(0, 320),
    requirements: ['Dubai hospitality & food and beverage leadership experience'],
    matchScore,
    matchReasons,
    recruiter: {
      ...contacts,
      contactConfidence:
        contacts.email && contacts.phone
          ? 'verified'
          : contacts.email || contacts.phone
          ? 'extracted'
          : 'portal-only',
    },
    alertStatus: 'pending',
    applied: false,
    saved: false,
  };
}

export async function draftOutreachEmail(
  job: JobListing,
  profile: CandidateProfile
): Promise<{ subject: string; body: string; whatsappMessage: string }> {
  const ai = getAiClient();

  if (ai) {
    try {
      const profileBrief = buildProfileBrief(profile);
      const prompt = `
Write a concise, high-impact first-applicant job application email and a short WhatsApp message for Dipti Basu Mondal applying to:
Role: ${job.title}
Company: ${job.company}
Location: ${job.location}
Platform Found: ${job.platform}
Role Summary: ${job.summary}
Recruiter Name: ${job.recruiter.name ?? 'Hiring Team'}

CANDIDATE DETAILS:
${profileBrief}

GUIDELINES:
- Keep the email crisp (130-170 words), executive luxury hospitality tone, zero fluff.
- Immediately mention she is currently in Dubai on a UAE visit visa and available to join immediately.
- Highlight the 2-3 most relevant achievements from her resume (Westin Mina Seyahi Dubai Bussola 250+ covers, Taj Lands End 3 outlets / 35 team members, Taj Wellington Mews banquets & Club Lounge, WSET Level 2 Merit 84%, MICROS POS & BirchStreet).
- Include her contact signature: Dipti Basu Mondal | +971 54 2715 609 | diptimondal18@gmail.com | linkedin.com/in/dipti-mondal.
- Also write a 3-sentence WhatsApp intro message ready to send to the recruiter's mobile/WhatsApp.
      `.trim();

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING },
              body: { type: Type.STRING },
              whatsappMessage: { type: Type.STRING },
            },
            required: ['subject', 'body', 'whatsappMessage'],
          },
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const parsed = extractJsonObjectFromText(response.text ?? '{}');
      if (parsed && typeof parsed.subject === 'string' && typeof parsed.body === 'string') {
        return {
          subject: parsed.subject.trim(),
          body: parsed.body.trim(),
          whatsappMessage:
            typeof parsed.whatsappMessage === 'string' && parsed.whatsappMessage.trim()
              ? parsed.whatsappMessage.trim()
              : `Hello${job.recruiter.name ? ` ${job.recruiter.name}` : ''}, I am Dipti Basu Mondal, Luxury Hotel Restaurant & Banquet Manager (12 yrs exp — Taj, St. Regis, Westin Mina Seyahi Dubai). I am based in Dubai and immediately available for the ${job.title} role at ${job.company}.`,
        };
      }
    } catch {
      // Fall through to tailored CV template below
    }
  }

  const greeting = job.recruiter.name ? `Dear ${job.recruiter.name},` : 'Dear Hiring Team,';
  const subject = `Application: ${job.title} at ${job.company} — Dipti Basu Mondal (Immediate Availability in Dubai)`;
  const body = `${greeting}

I am writing to apply for the ${job.title} position at ${job.company} in ${job.location}. I am currently in Dubai on a UAE visit visa and available to join immediately.

With 12 years of luxury hotel Food & Beverage leadership across Taj, The St. Regis, Westin Mina Seyahi Dubai, and Leela properties, I bring hands-on mastery of multi-outlet restaurant operations, banquets, buffets, and Club Lounge service:
• Senior Restaurant Manager, Taj Lands End: Led 35 colleagues across All-Day Dining, Japanese Pool Bar, and Health Concept outlets.
• Restaurant & Banquet Manager, Taj Wellington Mews: Managed 25+ team members, improved event planning efficiency by 20%, grew monthly bookings by 30%, and drove 40% repeat corporate event bookings.
• Westin Mina Seyahi Dubai (Bussola, 250+ covers) & St. Regis Doha (>90% guest satisfaction).
• WSET Level 2 Award in Wines (Merit, 84%), SHL Switzerland Leadership Excellence (2025), MBA in HR, MICROS POS & BirchStreet.

I would welcome the opportunity to discuss how I can contribute immediately to ${job.company}.

Warm regards,
Dipti Basu Mondal
+971 54 2715 609 | diptimondal18@gmail.com
linkedin.com/in/dipti-mondal`;

  const whatsappMessage = `Hello${job.recruiter.name ? ` ${job.recruiter.name}` : ''}, I am Dipti Basu Mondal (12 yrs luxury hotel F&B & Restaurant Manager — Taj, St. Regis, Westin Mina Seyahi Dubai). I am currently in Dubai, immediately available, and have just applied for the ${job.title} role at ${job.company}.`;

  return { subject, body, whatsappMessage };
}
