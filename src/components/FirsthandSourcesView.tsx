import { useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import { FIRSTHAND_DUBAI_SOURCES, type FirsthandSourceLink } from '../data/firsthandSources.ts';

interface FirsthandSourcesViewProps {
  onScanNow: () => void;
  isScanning: boolean;
}

const GROUPS: Array<FirsthandSourceLink['group']> = [
  'Dubai Multi-Joint, QSR & Restaurant Groups',
  'Direct Dubai Luxury Hotel & Resort Portals',
  'Social & Recruiter Hiring Feeds',
  'Hospitality Specialist Job Boards',
  'UAE & Dubai Job Portals & Aggregators',
];

export function FirsthandSourcesView({ onScanNow, isScanning }: FirsthandSourcesViewProps) {
  const [filterText, setFilterText] = useState('');

  const q = filterText.trim().toLowerCase();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white border border-stone-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <h2 className="font-serif text-2xl font-bold text-stone-900">
            {FIRSTHAND_DUBAI_SOURCES.length} Firsthand Dubai Hospitality, QSR &amp; Operations Channels
          </h2>
          <p className="text-xs text-stone-600 leading-relaxed">
            Covers multi-joint restaurant &amp; QSR operators (Alshaya, Americana, Kitopi, Azadea,
            Sunset Hospitality), luxury 5-star hotels (Taj, Marriott, Jumeirah, Atlantis), social
            recruiter feeds, and UAE portals — pre-filtered for Operations Manager, Operations Head,
            Floor Manager, Outlet Manager, Area Manager, Restaurant &amp; Banquet roles in Dubai.
          </p>
        </div>

        <button
          type="button"
          onClick={onScanNow}
          disabled={isScanning}
          className="px-4 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {isScanning ? 'Scanning Live Feeds...' : 'Sync Integrated Live Feeds'}
        </button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Search portals (e.g. Alshaya, Americana, Kitopi, Taj, Jumeirah, CatererGlobal, NaukriGulf, Dubizzle)..."
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:border-amber-700 focus:outline-none"
        />
      </div>

      <div className="space-y-6">
        {GROUPS.map((group) => {
          const items = FIRSTHAND_DUBAI_SOURCES.filter(
            (s) =>
              s.group === group &&
              (!q ||
                s.name.toLowerCase().includes(q) ||
                s.description.toLowerCase().includes(q))
          );
          if (items.length === 0) return null;

          return (
            <section
              key={group}
              className="bg-white border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-200"
            >
              <div className="px-6 py-3.5 bg-stone-50/70 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-stone-900 uppercase tracking-wider">
                  {group}
                </h3>
                <span className="font-mono text-xs text-stone-500 tabular-nums">
                  {items.length} sources
                </span>
              </div>

              <div className="divide-y divide-stone-100">
                {items.map((src) => (
                  <div
                    key={src.name}
                    className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/60 transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-stone-900">{src.name}</span>
                        {src.liveIntegrated && (
                          <span className="text-[11px] font-medium text-emerald-700">
                            · Auto-synced in Live Feed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-600 leading-relaxed">{src.description}</p>
                    </div>

                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-stone-800 bg-white border border-stone-300 hover:border-amber-700 hover:text-amber-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <span>Open Latest</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
