export type PostedTimePrecision = 'exact' | 'date-only' | 'unknown';

export interface ParsedPostedTime {
  postedAt?: string;
  postedTimePrecision: PostedTimePrecision;
  postedAtText: string;
}

const MONTH_MAP: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

export function formatDubaiTimestamp(
  iso?: string,
  precision: PostedTimePrecision = 'exact'
): string {
  if (!iso) return 'Not disclosed by source';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Not disclosed by source';

  if (precision === 'date-only') {
    const datePart = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Dubai',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
    return `${datePart} (date only from portal)`;
  }

  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dubai',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);

  return `${formatted} GST`;
}

export function computeTimeDifferenceMinutes(
  postedAt?: string,
  sentAt?: string
): number | null {
  if (!postedAt || !sentAt) return null;
  const postedMs = new Date(postedAt).getTime();
  const sentMs = new Date(sentAt).getTime();
  if (!Number.isFinite(postedMs) || !Number.isFinite(sentMs)) return null;
  return Math.max(0, Math.round((sentMs - postedMs) / 60000));
}

export function formatDelayMinutes(
  diffMinutes: number | null | undefined,
  precision: PostedTimePrecision = 'exact'
): string {
  if (diffMinutes === null || diffMinutes === undefined || !Number.isFinite(diffMinutes)) {
    return 'Unavailable (post time not published)';
  }

  const mins = Math.max(0, Math.round(diffMinutes));
  let base: string;

  if (mins === 0) {
    base = '0 mins (<1 min)';
  } else if (mins < 60) {
    base = `${mins} min${mins === 1 ? '' : 's'}`;
  } else {
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    base = `${mins.toLocaleString()} mins (${hours}h ${rem}m)`;
  }

  return precision === 'date-only' ? `${base} (approx. from date)` : base;
}

export function parsePostedTimeInput(
  rawInput?: string | null,
  referenceNow: Date = new Date()
): ParsedPostedTime {
  const raw = (rawInput ?? '').trim();
  if (!raw) {
    return {
      postedTimePrecision: 'unknown',
      postedAtText: 'Recently posted',
    };
  }

  // 1. Direct ISO-8601 or RFC date string with explicit time
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      const iso = parsed.toISOString();
      return {
        postedAt: iso,
        postedTimePrecision: 'exact',
        postedAtText: `Posted ${formatDubaiTimestamp(iso, 'exact')}`,
      };
    }
  }

  const low = raw.toLowerCase();

  // 2. Just now / moments ago
  if (/\b(just\s*now|just\s*posted|moments?\s*ago|seconds?\s*ago)\b/i.test(low)) {
    const iso = referenceNow.toISOString();
    return {
      postedAt: iso,
      postedTimePrecision: 'exact',
      postedAtText: `Posted ${formatDubaiTimestamp(iso, 'exact')}`,
    };
  }

  // 3. Relative minutes / hours
  const minMatch = low.match(/(\d+)\s*(?:m|min|mins|minute|minutes)\s*ago/);
  if (minMatch) {
    const mins = Number(minMatch[1]);
    const dt = new Date(referenceNow.getTime() - mins * 60000);
    const iso = dt.toISOString();
    return {
      postedAt: iso,
      postedTimePrecision: 'exact',
      postedAtText: `Posted ${formatDubaiTimestamp(iso, 'exact')}`,
    };
  }

  const hourMatch = low.match(/(\d+)\s*(?:h|hr|hrs|hour|hours)\s*ago/);
  if (hourMatch) {
    const hrs = Number(hourMatch[1]);
    const dt = new Date(referenceNow.getTime() - hrs * 3600000);
    const iso = dt.toISOString();
    return {
      postedAt: iso,
      postedTimePrecision: 'exact',
      postedAtText: `Posted ${formatDubaiTimestamp(iso, 'exact')}`,
    };
  }

  // 4. Relative days ("Today", "Yesterday", "2 days ago")
  if (/\btoday\b/i.test(low)) {
    // Anchor at 09:00 Dubai (UTC+4 = 05:00 UTC), or midnight GST if earlier than 09:00 Dubai
    const dubaiStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(referenceNow);
    let candidate = new Date(`${dubaiStr}T09:00:00+04:00`);
    if (candidate.getTime() > referenceNow.getTime()) {
      candidate = new Date(`${dubaiStr}T00:00:00+04:00`);
    }
    const iso = candidate.toISOString();
    return {
      postedAt: iso,
      postedTimePrecision: 'date-only',
      postedAtText: `Posted ${formatDubaiTimestamp(iso, 'date-only')}`,
    };
  }

  if (/\byesterday\b/i.test(low)) {
    const yest = new Date(referenceNow.getTime() - 86400000);
    const dubaiStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(yest);
    const iso = new Date(`${dubaiStr}T12:00:00+04:00`).toISOString();
    return {
      postedAt: iso,
      postedTimePrecision: 'date-only',
      postedAtText: `Posted ${formatDubaiTimestamp(iso, 'date-only')}`,
    };
  }

  const dayMatch = low.match(/(\d+)\s*(?:d|day|days)\s*ago/);
  if (dayMatch) {
    const days = Number(dayMatch[1]);
    const dt = new Date(referenceNow.getTime() - days * 86400000);
    const iso = dt.toISOString();
    return {
      postedAt: iso,
      postedTimePrecision: 'date-only',
      postedAtText: `Posted ${formatDubaiTimestamp(iso, 'date-only')}`,
    };
  }

  // 5. Day + Month pattern like "21 Nov" or "21 Nov 2026" (Jobrapido)
  const dmMatch = low.match(/\b(\d{1,2})\s+([a-z]{3,9})(?:\s+(\d{4}))?\b/);
  if (dmMatch && MONTH_MAP[dmMatch[2]] !== undefined) {
    const day = Number(dmMatch[1]);
    const month = MONTH_MAP[dmMatch[2]];
    let year = dmMatch[3] ? Number(dmMatch[3]) : referenceNow.getUTCFullYear();
    let candidate = new Date(Date.UTC(year, month, day, 8, 0, 0)); // 12:00 PM Dubai (UTC+4)
    if (!dmMatch[3] && candidate.getTime() - referenceNow.getTime() > 7 * 86400000) {
      year -= 1;
      candidate = new Date(Date.UTC(year, month, day, 8, 0, 0));
    }
    if (!Number.isNaN(candidate.getTime())) {
      const iso = candidate.toISOString();
      return {
        postedAt: iso,
        postedTimePrecision: 'date-only',
        postedAtText: `Posted ${formatDubaiTimestamp(iso, 'date-only')}`,
      };
    }
  }

  // 6. Date-only YYYY-MM-DD
  const ymdMatch = raw.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (ymdMatch) {
    const candidate = new Date(`${ymdMatch[1]}T12:00:00+04:00`);
    if (!Number.isNaN(candidate.getTime())) {
      const iso = candidate.toISOString();
      return {
        postedAt: iso,
        postedTimePrecision: 'date-only',
        postedAtText: `Posted ${formatDubaiTimestamp(iso, 'date-only')}`,
      };
    }
  }

  return {
    postedTimePrecision: 'unknown',
    postedAtText: raw,
  };
}
