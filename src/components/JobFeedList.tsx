import { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Mail,
  Phone,
  Search,
  Trash2,
} from 'lucide-react';
import type { JobListing, PlatformSource, RoleCategory } from '../types/jobs.ts';
import {
  computeTimeDifferenceMinutes,
  formatDelayMinutes,
  formatDubaiTimestamp,
} from '../utils/timeMetrics.ts';

export type JobSortOption =
  | 'newest-posted'
  | 'oldest-posted'
  | 'newest-received'
  | 'oldest-received'
  | 'fastest-alert'
  | 'highest-match';

export type TimeRangeFilter = 'all' | '24h' | '3d' | '7d' | '30d';

const DUBAI_YMD = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' });

interface JobFeedListProps {
  jobs: JobListing[];
  selectedJobId: string | null;
  onSelectJob: (id: string) => void;
  onDeleteJob: (id: string) => void;
  selectedPlatform: PlatformSource | 'All';
  isScanning: boolean;
  onTriggerScan: () => void;
}

const CATEGORIES: Array<RoleCategory | 'All'> = [
  'All',
  'Restaurant Operations',
  'QSR & Multi-Outlet Ops',
  'Floor & Service Management',
  'Banquets & Events',
  'Buffet & All-Day Dining',
  'Luxury Hotel F&B',
  'Club Lounge & Bar',
];

export function JobFeedList({
  jobs,
  selectedJobId,
  onSelectJob,
  onDeleteJob,
  selectedPlatform,
  isScanning,
  onTriggerScan,
}: JobFeedListProps) {
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<RoleCategory | 'All'>('All');
  const [contactsOnly, setContactsOnly] = useState(false);
  const [sortBy, setSortBy] = useState<JobSortOption>('newest-posted');
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('all');
  const [specificDate, setSpecificDate] = useState('');

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const nowMs = Date.now();
    const maxAgeMs =
      timeRange === '24h'
        ? 24 * 3600000
        : timeRange === '3d'
        ? 3 * 86400000
        : timeRange === '7d'
        ? 7 * 86400000
        : timeRange === '30d'
        ? 30 * 86400000
        : null;

    const matching = jobs.filter((job) => {
      if (selectedPlatform !== 'All' && job.platform !== selectedPlatform) return false;
      if (categoryFilter !== 'All' && job.category !== categoryFilter) return false;
      if (contactsOnly && !job.recruiter.email && !job.recruiter.phone) return false;

      if (maxAgeMs !== null) {
        const refIso = job.postedAt || job.alertSentAt || job.discoveredAt;
        const refMs = refIso ? new Date(refIso).getTime() : NaN;
        if (!Number.isFinite(refMs) || nowMs - refMs > maxAgeMs) return false;
      }

      if (specificDate) {
        const refIso = job.postedAt || job.alertSentAt || job.discoveredAt;
        if (!refIso) return false;
        const d = new Date(refIso);
        if (Number.isNaN(d.getTime()) || DUBAI_YMD.format(d) !== specificDate) {
          return false;
        }
      }

      if (!q) return true;
      return (
        job.title.toLowerCase().includes(q) ||
        job.company.toLowerCase().includes(q) ||
        job.location.toLowerCase().includes(q) ||
        job.summary.toLowerCase().includes(q)
      );
    });

    const getPostedMs = (j: JobListing): number | null => {
      if (!j.postedAt) return null;
      const ms = new Date(j.postedAt).getTime();
      return Number.isFinite(ms) ? ms : null;
    };

    const getReceivedMs = (j: JobListing): number => {
      const ms = new Date(j.alertSentAt || j.discoveredAt).getTime();
      return Number.isFinite(ms) ? ms : 0;
    };

    const getDiff = (j: JobListing): number | null => {
      if (typeof j.delayMinutes === 'number') return j.delayMinutes;
      return computeTimeDifferenceMinutes(j.postedAt, j.alertSentAt || j.discoveredAt);
    };

    return [...matching].sort((a, b) => {
      if (sortBy === 'newest-posted') {
        const pa = getPostedMs(a);
        const pb = getPostedMs(b);
        if (pa !== null && pb !== null && pb !== pa) return pb - pa;
        if (pa !== null && pb === null) return -1;
        if (pa === null && pb !== null) return 1;
        return b.matchScore - a.matchScore;
      }
      if (sortBy === 'oldest-posted') {
        const pa = getPostedMs(a);
        const pb = getPostedMs(b);
        if (pa !== null && pb !== null && pa !== pb) return pa - pb;
        if (pa !== null && pb === null) return -1;
        if (pa === null && pb !== null) return 1;
        return b.matchScore - a.matchScore;
      }
      if (sortBy === 'newest-received') {
        const ra = getReceivedMs(a);
        const rb = getReceivedMs(b);
        if (rb !== ra) return rb - ra;
        return b.matchScore - a.matchScore;
      }
      if (sortBy === 'oldest-received') {
        const ra = getReceivedMs(a);
        const rb = getReceivedMs(b);
        if (ra !== rb) return ra - rb;
        return b.matchScore - a.matchScore;
      }
      if (sortBy === 'fastest-alert') {
        const da = getDiff(a);
        const db = getDiff(b);
        if (da !== null && db !== null && da !== db) return da - db;
        if (da !== null && db === null) return -1;
        if (da === null && db !== null) return 1;
        return b.matchScore - a.matchScore;
      }
      // highest-match
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      const pb = getPostedMs(b) ?? 0;
      const pa = getPostedMs(a) ?? 0;
      return pb - pa;
    });
  }, [jobs, selectedPlatform, categoryFilter, contactsOnly, searchText, sortBy, timeRange, specificDate]);

  const hasActiveFilters =
    Boolean(searchText.trim()) ||
    categoryFilter !== 'All' ||
    contactsOnly ||
    timeRange !== 'all' ||
    Boolean(specificDate);

  return (
    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
      {/* Compact filter & sort toolbar */}
      <div className="p-4 border-b border-stone-200 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Filter feed by hotel, role, or Dubai district..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-md text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-amber-700 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setContactsOnly((prev) => !prev)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              contactsOnly
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-white text-stone-600 border-stone-200 hover:text-stone-900'
            }`}
          >
            Direct Recruiter Contact Only
          </button>
        </div>

        {/* Sort Order & Date / Time Window Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <label className="flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-md text-xs text-stone-700">
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span className="text-stone-500 shrink-0">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as JobSortOption)}
              aria-label="Sort jobs"
              className="w-full bg-transparent text-xs font-medium text-stone-900 focus:outline-none cursor-pointer"
            >
              <option value="newest-posted">Posted: Newest to Oldest</option>
              <option value="oldest-posted">Posted: Oldest to Newest</option>
              <option value="newest-received">Sent / Received: Newest First</option>
              <option value="oldest-received">Sent / Received: Oldest First</option>
              <option value="fastest-alert">Time Diff: Fastest Alert First</option>
              <option value="highest-match">Best CV Match %</option>
            </select>
          </label>

          <label className="flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-md text-xs text-stone-700">
            <Clock className="w-3.5 h-3.5 text-stone-500 shrink-0" />
            <span className="text-stone-500 shrink-0">Window:</span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRangeFilter)}
              aria-label="Filter by posting window"
              className="w-full bg-transparent text-xs font-medium text-stone-900 focus:outline-none cursor-pointer"
            >
              <option value="all">All Dates</option>
              <option value="24h">Last 24 Hours</option>
              <option value="3d">Last 3 Days</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </label>

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-md text-xs text-stone-700">
            <Calendar className="w-3.5 h-3.5 text-stone-500 shrink-0" />
            <input
              type="date"
              value={specificDate}
              onChange={(e) => setSpecificDate(e.target.value)}
              aria-label="Filter by exact Dubai date"
              title="Filter by exact date (Dubai GST)"
              className="w-full bg-transparent text-xs font-mono text-stone-900 focus:outline-none cursor-pointer"
            />
            {specificDate && (
              <button
                type="button"
                onClick={() => setSpecificDate('')}
                className="text-[11px] text-amber-800 hover:underline shrink-0 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 flex-1">
            {CATEGORIES.map((cat) => {
              const active = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-amber-50 text-amber-900 font-semibold'
                      : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
                  }`}
                >
                  {cat === 'All' ? 'All Specialties' : cat}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-stone-500 font-mono tabular-nums pt-0.5">
          <span>
            Showing {filtered.length} of {jobs.length} jobs
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchText('');
                setCategoryFilter('All');
                setContactsOnly(false);
                setTimeRange('all');
                setSpecificDate('');
              }}
              className="font-sans font-medium text-amber-800 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Loading skeleton when initial scan runs */}
      {isScanning && jobs.length === 0 ? (
        <div className="divide-y divide-stone-100">
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} className="p-5 space-y-2.5 animate-pulse">
              <div className="h-4 w-2/3 bg-stone-200 rounded" />
              <div className="h-3 w-1/2 bg-stone-100 rounded" />
              <div className="h-3 w-5/6 bg-stone-100 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center space-y-3">
          <p className="text-sm font-medium text-stone-800">
            {jobs.length === 0
              ? 'No Dubai hospitality jobs fetched yet.'
              : 'No listings match the current filter.'}
          </p>
          <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
            {jobs.length === 0
              ? 'Run a live scan across LinkedIn, CatererGlobal, NaukriGulf, Twitter/X, Facebook, and Instagram to pull matching Dubai F&B openings.'
              : 'Clear your keyword or category filter, or run a fresh scan for more Dubai openings.'}
          </p>
          {jobs.length === 0 && (
            <button
              type="button"
              onClick={onTriggerScan}
              disabled={isScanning}
              className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Scan Dubai Hospitality Jobs Now
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-stone-200 max-h-[760px] overflow-y-auto">
          {filtered.map((job) => {
            const isSelected = job.id === selectedJobId;
            const hasEmail = Boolean(job.recruiter.email);
            const hasPhone = Boolean(job.recruiter.phone || job.recruiter.whatsapp);

            return (
              <li
                key={job.id}
                className={`group transition-colors ${
                  isSelected ? 'bg-amber-50/50' : 'hover:bg-stone-50/80'
                }`}
              >
                <div className="p-5 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onSelectJob(job.id)}
                      className="flex-1 text-left space-y-1.5 min-w-0 cursor-pointer"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="text-sm font-semibold text-stone-900 truncate">
                          {job.title}
                        </h3>
                        <span
                          className={`font-mono text-xs font-medium tabular-nums shrink-0 ${
                            job.matchScore >= 85
                              ? 'text-emerald-700'
                              : job.matchScore >= 70
                              ? 'text-amber-800'
                              : 'text-stone-500'
                          }`}
                        >
                          {job.matchScore}% match
                        </span>
                      </div>

                      <div className="text-xs font-medium text-stone-800">
                        {job.company}
                      </div>

                      {/* Clean unboxed metadata with typographic separators */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-stone-500">
                        <span className="text-stone-700 font-medium">{job.platform}</span>
                        <span aria-hidden="true">·</span>
                        <span>{job.location}</span>
                        <span aria-hidden="true">·</span>
                        <span>{job.postedAtText}</span>
                        {job.applied && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                              <CheckCircle2 className="w-3 h-3" />
                              Applied
                            </span>
                          </>
                        )}
                      </div>

                      {(hasEmail || hasPhone) && (
                        <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-emerald-800 font-mono">
                          {hasEmail && (
                            <span className="inline-flex items-center gap-1.5 truncate max-w-full">
                              <Mail className="w-3 h-3 shrink-0" />
                              <span className="truncate">{job.recruiter.email}</span>
                            </span>
                          )}
                          {hasPhone && (
                            <span className="inline-flex items-center gap-1.5 tabular-nums">
                              <Phone className="w-3 h-3 shrink-0" />
                              <span>{job.recruiter.phone || job.recruiter.whatsapp}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteJob(job.id)}
                      aria-label={`Dismiss ${job.title}`}
                      title="Dismiss listing"
                      className="p-1.5 text-stone-300 hover:text-red-700 rounded transition-colors shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Direct clickable Apply Link + Post/Sent/Delay Timing on every card */}
                  {(() => {
                    const sentIso = job.alertSentAt || job.discoveredAt;
                    const postedLabel = job.postedAt
                      ? formatDubaiTimestamp(job.postedAt, job.postedTimePrecision ?? 'exact')
                      : job.postedAtText;
                    const sentLabel = formatDubaiTimestamp(sentIso, 'exact');
                    const diffMins =
                      typeof job.delayMinutes === 'number'
                        ? job.delayMinutes
                        : computeTimeDifferenceMinutes(job.postedAt, sentIso);
                    const diffLabel = formatDelayMinutes(
                      diffMins,
                      job.postedTimePrecision ?? 'exact'
                    );

                    return (
                      <div className="pt-2 space-y-1.5 border-t border-stone-100">
                        <div className="grid grid-cols-1 gap-0.5 text-[11px] font-mono tabular-nums text-stone-600 bg-stone-50/80 px-2.5 py-1.5 rounded-md border border-stone-100">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-stone-500">Posted:</span>
                            <span className="text-stone-800 truncate">{postedLabel}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-stone-500">Sent / Received:</span>
                            <span className="text-stone-800 truncate">{sentLabel}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-stone-500 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-700" />
                              Diff (mins):
                            </span>
                            <span
                              className={`font-semibold truncate ${
                                diffMins !== null && diffMins <= 60
                                  ? 'text-emerald-700'
                                  : 'text-amber-800'
                              }`}
                            >
                              {diffLabel}
                            </span>
                          </div>
                        </div>

                        {job.sourceUrl && (
                          <div className="flex items-center justify-between gap-3 pt-0.5">
                            <a
                              href={job.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 hover:text-amber-900 hover:underline truncate"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="truncate">Apply Now on {job.platform}</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => onSelectJob(job.id)}
                              className="text-xs font-medium text-stone-500 hover:text-stone-900 whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              View Details
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
