import { useState, type FormEvent } from 'react';
import { Link2, Search, Sparkles } from 'lucide-react';
import type { PlatformSource } from '../types/jobs.ts';

interface QuickFetchBarProps {
  isScanning: boolean;
  isInspecting: boolean;
  selectedPlatform: PlatformSource | 'All';
  onSelectPlatform: (platform: PlatformSource | 'All') => void;
  onScan: (platform: PlatformSource | 'All', customQuery: string) => void;
  onInspect: (input: string) => Promise<void>;
  onOpenAlerts: () => void;
  stats: {
    totalJobs: number;
    withContacts: number;
    unreadAlerts: number;
    lastScanAt: string | null;
  };
  streamConnected: boolean;
}

const PLATFORM_TABS: Array<PlatformSource | 'All'> = [
  'All',
  'Talent.com UAE',
  'Jobrapido UAE',
  'FounditGulf',
  'Hotel Career Portal',
  'LinkedIn',
  'CatererGlobal',
  'NaukriGulf',
  'Hosco',
  'GulfTalent',
  'Bayt',
  'Indeed UAE',
  'Twitter / X',
  'Facebook',
  'Instagram',
  'Dubizzle',
];

function formatRelativeTime(iso: string | null): string {
  if (!iso) return 'Not scanned yet';
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}

export function QuickFetchBar({
  isScanning,
  isInspecting,
  selectedPlatform,
  onSelectPlatform,
  onScan,
  onInspect,
  onOpenAlerts,
  stats,
  streamConnected,
}: QuickFetchBarProps) {
  const [mode, setMode] = useState<'scan' | 'inspect'>('scan');
  const [queryInput, setQueryInput] = useState('');
  const [inspectInput, setInspectInput] = useState('');
  const [inspectError, setInspectError] = useState<string | null>(null);

  const handleScanSubmit = (e: FormEvent) => {
    e.preventDefault();
    onScan(selectedPlatform, queryInput.trim());
  };

  const handleInspectSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setInspectError(null);
    if (!inspectInput.trim()) {
      setInspectError('Paste a LinkedIn, Facebook, Instagram, Twitter, CatererGlobal, or Naukri URL or post text.');
      return;
    }
    try {
      await onInspect(inspectInput.trim());
      setInspectInput('');
    } catch (err) {
      setInspectError(err instanceof Error ? err.message : 'Unable to extract job details.');
    }
  };

  return (
    <section className="border-b border-stone-200 bg-white">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-7 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <p className="text-xs font-medium text-amber-800 tracking-wide">
              Dubai, UAE · Operations &amp; Head of Ops · Floor &amp; Outlet · QSR Multi-Unit · Banquets &amp; Luxury F&amp;B
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 leading-tight [text-wrap:balance]">
              First-Applicant Radar for Dipti Basu Mondal
            </h1>
            <p className="text-sm text-stone-600 leading-relaxed">
              Pulls live Dubai F&amp;B openings across 15 job boards, social feeds, and direct luxury
              hotel ATS portals, captures recruiter contacts, and triggers instant in-app and email alerts.
            </p>
          </div>

          {/* 4-column tabular metrics strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-2 lg:pt-0 border-t lg:border-t-0 border-stone-200 shrink-0">
            <div>
              <div className="text-xs text-stone-500">Matched Roles</div>
              <div className="font-mono text-2xl font-medium text-stone-900 tabular-nums mt-0.5">
                {stats.totalJobs}
              </div>
            </div>
            <div>
              <div className="text-xs text-stone-500">Direct Contacts</div>
              <div className="font-mono text-2xl font-medium text-emerald-700 tabular-nums mt-0.5">
                {stats.withContacts}
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenAlerts}
              className="text-left group cursor-pointer"
            >
              <div className="text-xs text-stone-500 group-hover:text-amber-800 transition-colors">
                In-App Alerts
              </div>
              <div className="font-mono text-2xl font-medium text-amber-800 tabular-nums mt-0.5">
                {stats.unreadAlerts}
              </div>
            </button>
            <div>
              <div className="text-xs text-stone-500 flex items-center gap-1.5">
                <span>Last Scan</span>
                {streamConnected && (
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-600"
                    title="Live alert stream connected"
                  />
                )}
              </div>
              <div className="font-mono text-sm font-medium text-stone-800 tabular-nums mt-2 whitespace-nowrap">
                {formatRelativeTime(stats.lastScanAt)}
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Mode Switch & Fetch Command Bar */}
        <div className="space-y-3 pt-2 border-t border-stone-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center p-1 bg-stone-100 rounded-lg border border-stone-200">
              <button
                type="button"
                onClick={() => setMode('scan')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mode === 'scan'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Live Platform Scan</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('inspect')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mode === 'inspect'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Paste Social Post or URL</span>
              </button>
            </div>

            {mode === 'scan' && (
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
                {PLATFORM_TABS.map((platform) => {
                  const active = selectedPlatform === platform;
                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => onSelectPlatform(platform)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300 hover:text-stone-900'
                      }`}
                    >
                      {platform}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {mode === 'scan' ? (
            <form onSubmit={handleScanSubmit} className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  placeholder="Optional focus: e.g. Operations Manager, Floor Manager, QSR Area Manager, Outlet Manager..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-amber-700 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isScanning}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-stone-900 hover:bg-stone-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>
                  {isScanning
                    ? 'Fetching Live Listings...'
                    : selectedPlatform === 'All'
                    ? 'Fetch Across All 15 Platforms'
                    : `Fetch ${selectedPlatform} Jobs`}
                </span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleInspectSubmit} className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Link2 className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={inspectInput}
                    onChange={(e) => setInspectInput(e.target.value)}
                    placeholder="Paste a LinkedIn, Facebook, Instagram, X, CatererGlobal, or Naukri URL or raw recruiter post text..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-amber-700 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isInspecting}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>{isInspecting ? 'Extracting...' : 'Extract Contacts & Score'}</span>
                </button>
              </div>
              {inspectError && <p className="text-xs text-red-700">{inspectError}</p>}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
