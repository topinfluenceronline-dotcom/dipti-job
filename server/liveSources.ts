import crypto from 'node:crypto';
import type {
  CandidateProfile,
  JobListing,
  PlatformSource,
  RoleCategory,
} from '../src/types/jobs.ts';
import {
  computeTimeDifferenceMinutes,
  parsePostedTimeInput,
} from '../src/utils/timeMetrics.ts';

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(input: string): string {
  return decodeHtmlEntities(input.replace(/<[^>]+>/g, ' '));
}

export function extractContactsFromText(text: string): {
  email?: string;
  phone?: string;
  whatsapp?: string;
} {
  const emailMatches =
    text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [];
  const filteredEmails = emailMatches.filter((e) => {
    const low = e.toLowerCase();
    return (
      !low.includes('talent.com') &&
      !low.includes('jobrapido.com') &&
      !low.includes('example.com') &&
      !low.includes('noreply') &&
      !low.includes('no-reply') &&
      !low.endsWith('.png') &&
      !low.endsWith('.jpg')
    );
  });

  const phoneMatches =
    text.match(/(?:\+971|00971|971)[\s-]?(?:5\d|4)\s?\d{3}\s?\d{4}|\b05\d[\s-]?\d{3}[\s-]?\d{4}\b/g) ??
    [];

  const cleanedPhone = phoneMatches[0]?.replace(/\s+/g, ' ').trim();
  const isWhatsapp = /whatsapp|wa\.me/i.test(text);

  return {
    email: filteredEmails[0],
    phone: cleanedPhone,
    whatsapp: isWhatsapp ? cleanedPhone : cleanedPhone,
  };
}

export function inferRoleCategory(title: string, summary = ''): RoleCategory {
  const combined = `${title} ${summary}`.toLowerCase();
  if (
    /qsr|multi-outlet|multi outlet|multi-unit|multi unit|multi-brand|cloud kitchen|area manager|franchise|fast casual|food retail|regional hospitality|counters operations|kitopi|alshaya|americana|cravia|costa|starbucks|tim hortons|kfc|organic pizza/i.test(
      combined
    )
  ) {
    return 'QSR & Multi-Outlet Ops';
  }
  if (/floor manager|dining room manager|front of house|maitre|service manager/i.test(combined)) {
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
    combined.includes('food and beverage') ||
    combined.includes('head of operations') ||
    combined.includes('operations head')
  ) {
    return 'Luxury Hotel F&B';
  }
  return 'Restaurant Operations';
}

export function scoreJobAgainstDiptiProfile(
  title: string,
  company: string,
  location: string,
  summary: string,
  profile: CandidateProfile
): { matchScore: number; matchReasons: string[] } {
  const hay = `${title} ${company} ${location} ${summary}`.toLowerCase();
  const titleLow = title.toLowerCase();
  const reasons: string[] = [];
  let score = 58;

  if (/dubai|uae|united arab emirates|jumeirah|marina|palm|difc|downtown|deira|bur dubai/i.test(hay)) {
    score += 10;
  }

  if (
    /head of operations|operations head|f&b operations manager|director of f&b|executive director food/i.test(
      titleLow
    )
  ) {
    score += 24;
    reasons.push(
      'Senior Operations leadership role matching Dipti’s 12 years overseeing multi-outlet F&B P&L, SOPs, and 35+ colleagues.'
    );
  } else if (
    /restaurant manager|senior restaurant|outlet manager|assistant restaurant|banquet manager|operations manager|operations leader|operations lead|area manager|multi-outlet|multi outlet|qsr manager|floor manager/i.test(
      titleLow
    )
  ) {
    score += 22;
    reasons.push(
      'Directly aligns with Senior Restaurant Manager & Operations tenure at Taj Lands End (3 outlets, 35 colleagues) and Taj Wellington Mews.'
    );
  } else if (/f&b manager|food & beverage manager|food and beverage manager|catering manager|lounge manager/i.test(hay)) {
    score += 20;
    reasons.push('Matches 12 years of multi-outlet Luxury Hotel F&B Operations leadership across Taj, St. Regis, and Westin.');
  } else if (/assistant.*manager|asst\.?\s*manager/i.test(hay)) {
    score += 16;
    reasons.push('Aligns with multi-outlet dining, Club Lounge, and banquet management experience.');
  } else if (/supervisor|team leader|captain|maitre/i.test(hay)) {
    score += 8;
    reasons.push('Senior hospitality leadership background including The St. Regis Doha (>90% guest satisfaction) and Westin Mina Seyahi Dubai.');
  }

  if (/\b(hostess|waiter|waitress|server|runner|attendant|steward|dishwasher|cleaner|barista|commis|chef|sous chef|cook|baker|butcher|cashier|intern|internship|trainee|in-training)\b/i.test(title)) {
    score -= 28;
  }

  if (/qsr|multi-outlet|multi outlet|multi-unit|area manager|cloud kitchen|kitopi|alshaya|americana/i.test(hay)) {
    score += 6;
    reasons.push(
      'Multi-outlet & high-volume operational leadership matches managing 3 concurrent concepts at Taj Lands End and 250+ cover service at Westin Dubai.'
    );
  }

  if (/floor manager|dining room|front of house|service excellence/i.test(hay)) {
    score += 6;
    reasons.push(
      'Proven floor leadership maintaining >90% guest satisfaction at The St. Regis Doha and boosting workflow efficiency by 25%.'
    );
  }

  if (/banquet|event|catering|conference/i.test(hay)) {
    score += 10;
    reasons.push('Matches Banquet Manager track record (35+ staff, +20% event efficiency, +30% monthly bookings, 40% repeat corporate bookings).');
  }

  if (/buffet|all-day|all day|dining/i.test(hay)) {
    score += 8;
    reasons.push('Direct experience managing All-Day Dining and high-volume 250+ cover outlets (Taj Lands End & Westin Mina Seyahi Bussola).');
  }

  if (/lounge|club|wine|beverage/i.test(hay)) {
    score += 6;
    reasons.push('Backed by Club Lounge management at Taj Wellington Mews and WSET Level 2 Award in Wines (Merit, 84%).');
  }

  if (/marriott|westin|st\.?\s?regis|taj|jumeirah|accor|fairmont|raffles|ritz|four seasons|kempinski|atlantis|hilton|versace|movenpick|rotana|emaar|address|hyatt|sofitel|beefbar/i.test(hay)) {
    score += 6;
    reasons.push('Luxury 5-star hotel or fine-dining environment matching Taj, St. Regis, Westin Mina Seyahi Dubai, and Leela Kempinski standards.');
  }

  if (/dubai/i.test(hay)) {
    reasons.push(`Located in Dubai where ${profile.name} is already based (${profile.visaStatus}, immediate start).`);
  }

  if (reasons.length === 0) {
    reasons.push('Hospitality and food & beverage operations role suited to Dipti’s 12-year luxury hotel experience and MICROS/BirchStreet skills.');
  }

  return {
    matchScore: Math.min(98, Math.max(48, score)),
    matchReasons: reasons.slice(0, 4),
  };
}

function inferPlatformFromWebsite(website: string, fallback: PlatformSource): PlatformSource {
  const w = website.toLowerCase();
  if (w.includes('linkedin')) return 'LinkedIn';
  if (w.includes('catererglobal')) return 'CatererGlobal';
  if (w.includes('naukrigulf') || w.includes('naukri')) return 'NaukriGulf';
  if (w.includes('monster') || w.includes('foundit')) return 'FounditGulf';
  if (w.includes('gulftalent')) return 'GulfTalent';
  if (w.includes('bayt')) return 'Bayt';
  if (w.includes('indeed')) return 'Indeed UAE';
  if (w.includes('hosco')) return 'Hosco';
  if (w.includes('dubizzle')) return 'Dubizzle';
  return fallback;
}

function makeJobId(title: string, company: string, platform: string): string {
  const key = `${title.toLowerCase().trim()}::${company.toLowerCase().trim()}::${platform.toLowerCase().trim()}`;
  return crypto.createHash('sha1').update(key).digest('hex').slice(0, 14);
}

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

function isRelevantFnbTitle(title: string, summary = '', company = ''): boolean {
  const roleText = `${title} ${summary}`.toLowerCase();
  const fullText = `${title} ${summary} ${company}`.toLowerCase();
  const isFnbRoleKeyword =
    /restaurant|food\s*(?:&|and)?\s*beverage|f&b|qsr|quick\s*service|fast\s*food|fast\s*casual|cloud\s*kitchen|dark\s*kitchen|banquet|buffet|dining|lounge|catering|hospitality|hotel|resort|outlet|bistro|cafe|coffee|bakery|pastry|bar\s?manager|maitre|sommelier|guest\s?relations|kitchen\s*operations/i.test(
      roleText
    );
  const isGenericManagementTitle =
    /\b(operations\s*manager|head\s*of\s*operations|operations\s*head|floor\s*manager|area\s*manager|outlet\s*manager|operations\s*leader|operations\s*lead|general\s*manager|assistant\s*manager)\b/i.test(
      title
    );
  const isFnbEmployer =
    /alshaya|americana|kitopi|azadea|addmind|sunset\s*hospitality|jumeirah|accor|marriott|hilton|rotana|kempinski|emaar|four\s*seasons|kerzner|atlantis|taj|minor\s*hotels|alfuttaim|al-futtaim/i.test(
      fullText
    );
  const isUnrelated =
    /\b(intern|internship|trainee|in-training|graphic\s*designer|designer|photographer|videographer|social\s*media|content\s*creator|marketing|copywriter|recruiter|talent\s*acquisition|payroll|legal|housekeeping|laundry|spa|therapist|lifeguard|valet|technician|engineering|painter|fx|forex|brokerage|trading|crypto|nursery|preschool|kindergarten|warehouse|logistics|freight|shipping|supply\s*chain|construction|factory|manufacturing|industrial|hospital|clinic|nurse|medical|pharma|dental|school|teacher|real\s*estate|property\s*manager|banking|insurance|software|developer|it\s*operations|devops|accountant|civil\s?engineer|security\s?guard|mechanic|electrician|plumber|carpenter|driver|aviation|airline|e-commerce|saas|telecom|oil\s*and\s*gas)\b/i.test(
      roleText
    );
  return (isFnbRoleKeyword || (isGenericManagementTitle && isFnbEmployer)) && !isUnrelated;
}

function isStalePosting(postedAt?: string, maxAgeDays = 90): boolean {
  if (!postedAt) return false;
  const ms = new Date(postedAt).getTime();
  if (!Number.isFinite(ms)) return false;
  return Date.now() - ms > maxAgeDays * 86400000;
}

async function fetchTalentComDubai(
  queries: string[],
  profile: CandidateProfile
): Promise<JobListing[]> {
  const results: JobListing[] = [];

  await Promise.all(
    queries.map(async (q) => {
      try {
        const url = `https://ae.talent.com/jobs?k=${encodeURIComponent(q)}&l=Dubai`;
        const res = await fetch(url, {
          headers: FETCH_HEADERS,
          signal: AbortSignal.timeout(7000),
        });
        if (!res.ok) return;
        const html = await res.text();

        const chunks = html.split(/data-job-id="/).slice(1);
        for (const chunk of chunks.slice(0, 8)) {
          const jobId = chunk.split('"')[0];
          const titleRaw = chunk.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1];
          const companyRaw = chunk.match(/JobCard_company__[^"]*"[^>]*>([\s\S]*?)<\/span>/i)?.[1];
          const locationRaw = chunk.match(/JobCard_location__[^"]*"[^>]*>([\s\S]*?)<\/span>/i)?.[1];
          const snippetRaw = chunk.match(/JobCard_snippet__[^"]*"[^>]*>([\s\S]*?)<\/p>/i)?.[1];

          const title = titleRaw ? stripTags(titleRaw) : '';
          const company = companyRaw ? stripTags(companyRaw) : 'Dubai Hospitality Employer';
          const location = locationRaw ? stripTags(locationRaw) : 'Dubai, UAE';
          const summary = snippetRaw
            ? stripTags(snippetRaw).replace(/\s*(?:أظهر المزيد|Show more|Read more).*$/i, '').trim()
            : `${title} role at ${company} in Dubai.`;

          if (!title || !isRelevantFnbTitle(title, summary, company)) continue;

          const timeIsoMatch = chunk.match(/<time[^>]*\bdateTime=["']([^"']+)["']/i)?.[1];
          const timeTextRaw = chunk.match(/<time[^>]*>([\s\S]*?)<\/time>/i)?.[1];
          const parsedTime = parsePostedTimeInput(
            timeIsoMatch || (timeTextRaw ? stripTags(timeTextRaw) : '')
          );
          if (isStalePosting(parsedTime.postedAt, 90)) continue;
          const nowIso = new Date().toISOString();
          const delayMinutes =
            computeTimeDifferenceMinutes(parsedTime.postedAt, nowIso) ?? undefined;

          const contacts = extractContactsFromText(`${title} ${summary}`);
          const { matchScore, matchReasons } = scoreJobAgainstDiptiProfile(
            title,
            company,
            location,
            summary,
            profile
          );

          results.push({
            id: makeJobId(title, company, 'Talent.com UAE'),
            title,
            company,
            location,
            platform: 'Talent.com UAE',
            category: inferRoleCategory(title, summary),
            postedAtText: parsedTime.postedAtText,
            postedAt: parsedTime.postedAt,
            postedTimePrecision: parsedTime.postedTimePrecision,
            discoveredAt: nowIso,
            alertSentAt: nowIso,
            delayMinutes,
            sourceUrl: `https://ae.talent.com/view?id=${encodeURIComponent(jobId)}`,
            groundingLinks: [{ title: `${title} on Talent.com UAE`, url: `https://ae.talent.com/view?id=${encodeURIComponent(jobId)}` }],
            summary,
            requirements: [
              'Dubai food & beverage or hotel dining experience',
              'Team leadership, service excellence, and guest satisfaction focus',
            ],
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
          });
        }
      } catch {
        // Ignore individual query timeout
      }
    })
  );

  return results;
}

async function fetchJobrapidoDubai(
  slugs: string[],
  profile: CandidateProfile
): Promise<JobListing[]> {
  const results: JobListing[] = [];

  await Promise.all(
    slugs.map(async (slug) => {
      try {
        const url = `https://ae.jobrapido.com/${slug}`;
        const res = await fetch(url, {
          headers: FETCH_HEADERS,
          signal: AbortSignal.timeout(7000),
        });
        if (!res.ok) return;
        const html = await res.text();

        const adverts = [...html.matchAll(/data-advert='([^']+)'/g)];
        for (const match of adverts.slice(0, 8)) {
          try {
            const obj = JSON.parse(decodeHtmlEntities(match[1])) as {
              title?: string;
              company?: string;
              location?: string;
              date?: string;
              website?: string;
              openAdvertUrl?: string;
              bodyHighlighted?: string;
              salary?: string;
            };

            const title = stripTags(obj.title ?? '');
            const company = stripTags(obj.company ?? 'Dubai Hospitality Employer');
            const location = stripTags(obj.location ?? 'Dubai, UAE');
            const bodyText = stripTags(obj.bodyHighlighted ?? '');
            if (!title || !isRelevantFnbTitle(title, bodyText, company)) continue;

            const platform = inferPlatformFromWebsite(obj.website ?? '', 'Jobrapido UAE');
            const summary =
              bodyText ||
              `${title} position with ${company} in ${location} (sourced via ${obj.website ?? 'Jobrapido UAE'}).`;

            // Try to extract direct destination URL if wrapped in redirectTo=
            let sourceUrl = obj.openAdvertUrl ?? url;
            const redirectMatch = sourceUrl.match(/redirectTo=([^&]+)/);
            if (redirectMatch) {
              try {
                const decodedOnce = decodeURIComponent(redirectMatch[1]);
                const decodedTwice = decodedOnce.includes('%3A%2F%2F')
                  ? decodeURIComponent(decodedOnce)
                  : decodedOnce;
                if (/^https?:\/\//i.test(decodedTwice)) {
                  sourceUrl = decodedTwice;
                }
              } catch {
                // Keep original URL
              }
            }

            const parsedTime = parsePostedTimeInput(obj.date);
            if (isStalePosting(parsedTime.postedAt, 90)) continue;
            const nowIso = new Date().toISOString();
            const delayMinutes =
              computeTimeDifferenceMinutes(parsedTime.postedAt, nowIso) ?? undefined;

            const contacts = extractContactsFromText(`${summary} ${title}`);
            const { matchScore, matchReasons } = scoreJobAgainstDiptiProfile(
              title,
              company,
              location,
              summary,
              profile
            );

            results.push({
              id: makeJobId(title, company, platform),
              title,
              company,
              location: location.includes('Dubai') ? location : `${location}, Dubai`,
              platform,
              category: inferRoleCategory(title, summary),
              postedAtText: parsedTime.postedAtText,
              postedAt: parsedTime.postedAt,
              postedTimePrecision: parsedTime.postedTimePrecision,
              discoveredAt: nowIso,
              alertSentAt: nowIso,
              delayMinutes,
              sourceUrl,
              groundingLinks: [{ title: `${title} (${platform})`, url: sourceUrl }],
              summary,
              requirements: [
                'Hospitality / Restaurant Operations experience in UAE or luxury hotels',
                'P&L awareness, rostering, and luxury guest standards',
              ],
              salaryOrPackage: obj.salary ? stripTags(obj.salary) : undefined,
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
            });
          } catch {
            // Skip malformed advert JSON
          }
        }
      } catch {
        // Ignore timeout
      }
    })
  );

  return results;
}

const DUBAI_HOSPITALITY_SR_SLUGS = [
  { slug: 'Addmind', display: 'Addmind Hospitality' },
  { slug: 'Accor', display: 'Accor Hotels' },
  { slug: 'Jumeirah', display: 'Jumeirah Group' },
  { slug: 'FourSeasons', display: 'Four Seasons' },
  { slug: 'SunsetHospitality', display: 'Sunset Hospitality Group' },
  { slug: 'Kerzner', display: 'Kerzner / Atlantis Dubai' },
  { slug: 'Rotana', display: 'Rotana Hotels' },
  { slug: 'Kempinski', display: 'Kempinski Hotels' },
  { slug: 'Alshaya', display: 'Alshaya Food & Hospitality' },
  { slug: 'MajidAlFuttaim', display: 'Majid Al Futtaim' },
  { slug: 'Emaar', display: 'Emaar Hospitality' },
  { slug: 'Kitopi', display: 'Kitopi' },
];

async function fetchSmartRecruitersDubai(profile: CandidateProfile): Promise<JobListing[]> {
  const results: JobListing[] = [];

  await Promise.all(
    DUBAI_HOSPITALITY_SR_SLUGS.map(async ({ slug, display }) => {
      try {
        const res = await fetch(
          `https://api.smartrecruiters.com/v1/companies/${slug}/postings?country=ae&limit=30`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          content?: Array<{
            id: string;
            name: string;
            releasedDate?: string;
            location?: { city?: string; country?: string; fullLocation?: string };
            department?: { label?: string };
          }>;
        };

        for (const item of data.content ?? []) {
          const city = item.location?.city ?? item.location?.fullLocation ?? '';
          const title = item.name?.trim() ?? '';
          const dept = item.department?.label ?? '';
          if (!title) continue;
          if (city && !/dubai|uae|united arab emirates/i.test(`${city} ${item.location?.country ?? ''}`)) {
            continue;
          }
          if (!isRelevantFnbTitle(title, dept, display)) continue;

          const parsedTime = parsePostedTimeInput(item.releasedDate);
          if (isStalePosting(parsedTime.postedAt, 90)) continue;
          const nowIso = new Date().toISOString();
          const delayMinutes =
            computeTimeDifferenceMinutes(parsedTime.postedAt, nowIso) ?? undefined;
          const sourceUrl = `https://jobs.smartrecruiters.com/${slug}/${item.id}`;
          const summary = `Direct ${display} career portal opening${dept ? ` in ${dept}` : ''} located in ${city || 'Dubai, UAE'}. Apply firsthand before third-party job boards index it.`;

          const { matchScore, matchReasons } = scoreJobAgainstDiptiProfile(
            title,
            display,
            city || 'Dubai, UAE',
            summary,
            profile
          );

          results.push({
            id: makeJobId(title, display, 'Hotel Career Portal'),
            title,
            company: display,
            location: city ? (city.includes('Dubai') ? city : `${city}, Dubai`) : 'Dubai, UAE',
            platform: 'Hotel Career Portal',
            category: inferRoleCategory(title, dept),
            postedAtText: parsedTime.postedAtText,
            postedAt: parsedTime.postedAt,
            postedTimePrecision: parsedTime.postedTimePrecision,
            discoveredAt: nowIso,
            alertSentAt: nowIso,
            delayMinutes,
            sourceUrl,
            groundingLinks: [{ title: `${display} Direct ATS`, url: sourceUrl }],
            summary,
            requirements: [
              'Direct hotel/hospitality group career portal listing',
              'Hospitality leadership, service excellence, and Dubai F&B standards',
            ],
            matchScore,
            matchReasons,
            recruiter: {
              contactConfidence: 'portal-only',
            },
            alertStatus: 'pending',
            applied: false,
            saved: false,
          });
        }
      } catch {
        // Ignore timeout
      }
    })
  );

  return results;
}

export async function fetchDirectDubaiHospitalityJobs(
  profile: CandidateProfile,
  options?: { platformFocus?: PlatformSource | 'All'; customQuery?: string }
): Promise<{ jobs: JobListing[]; sourcesChecked: string[] }> {
  const custom = options?.customQuery?.trim() ?? '';
  const focus = options?.platformFocus ?? 'All';

  const talentQueries = custom
    ? [`${custom}`, 'restaurant operations manager', 'qsr outlet manager']
    : [
        'operations manager restaurant food beverage',
        'head of operations food beverage hospitality',
        'floor manager restaurant hospitality',
        'outlet manager restaurant qsr',
        'qsr operations area manager restaurant',
        'restaurant manager',
        'banquet manager',
        'all day dining buffet lounge manager',
      ];

  const jobrapidoSlugs = custom
    ? [
        `${custom.replace(/\s+/g, '-')}-jobs-in-Dubai`,
        'Operations-Manager-jobs-in-Dubai',
        'Restaurant-Manager-jobs-in-Dubai',
      ]
    : [
        'Operations-Manager-jobs-in-Dubai',
        'Hospitality-Operations-Manager-jobs-in-Dubai',
        'Floor-Manager-jobs-in-Dubai',
        'Outlet-Manager-jobs-in-Dubai',
        'QSR-Manager-jobs-in-Dubai',
        'Restaurant-Manager-jobs-in-Dubai',
        'Banquet-Manager-jobs-in-Dubai',
        'Food-and-Beverage-Manager-jobs-in-Dubai',
        'Catering-Manager-jobs-in-Dubai',
      ];

  const tasks: Promise<JobListing[]>[] = [];
  const sourcesChecked: string[] = [];

  if (focus === 'All' || focus === 'Talent.com UAE' || focus === 'LinkedIn' || focus === 'CatererGlobal') {
    sourcesChecked.push('Talent.com UAE');
    tasks.push(fetchTalentComDubai(talentQueries, profile));
  }

  if (focus === 'All' || focus === 'Jobrapido UAE' || focus === 'FounditGulf' || focus === 'NaukriGulf') {
    sourcesChecked.push('Jobrapido UAE & FounditGulf');
    tasks.push(fetchJobrapidoDubai(jobrapidoSlugs, profile));
  }

  if (focus === 'All' || focus === 'Hotel Career Portal') {
    sourcesChecked.push('Direct Hotel & Hospitality ATS (12 Dubai Groups)');
    tasks.push(fetchSmartRecruitersDubai(profile));
  }

  // Fallback: if user picked Twitter/X, Facebook, Instagram, etc. without Gemini key, still run Talent + Jobrapido so they get immediate output
  if (tasks.length === 0) {
    sourcesChecked.push('Talent.com UAE', 'Jobrapido UAE', 'Direct Hotel ATS');
    tasks.push(
      fetchTalentComDubai(talentQueries.slice(0, 3), profile),
      fetchJobrapidoDubai(jobrapidoSlugs.slice(0, 2), profile),
      fetchSmartRecruitersDubai(profile)
    );
  }

  const settled = await Promise.all(tasks);
  const all = settled.flat();

  // Deduplicate by id
  const byId = new Map<string, JobListing>();
  for (const job of all) {
    if (!byId.has(job.id)) {
      byId.set(job.id, job);
    }
  }

  const sorted = Array.from(byId.values()).sort((a, b) => b.matchScore - a.matchScore);
  return { jobs: sorted, sourcesChecked };
}
