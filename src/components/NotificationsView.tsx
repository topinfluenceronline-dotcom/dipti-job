import { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Bell,
  Calendar,
  CheckCheck,
  Clock,
  ExternalLink,
  Mail,
  Phone,
  Search,
  Send,
  Trash2,
} from 'lucide-react';
import type { EmailAlertRecord, InAppNotification } from '../types/jobs.ts';
import {
  computeTimeDifferenceMinutes,
  formatDelayMinutes,
  formatDubaiTimestamp,
} from '../utils/timeMetrics.ts';

type AlertSortOption =
  | 'newest-received'
  | 'oldest-received'
  | 'newest-posted'
  | 'oldest-posted'
  | 'fastest-alert'
  | 'highest-match';

type AlertTimeRange = 'all' | '24h' | '3d' | '7d' | '30d';

const DUBAI_YMD = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' });

interface NotificationsViewProps {
  notifications: InAppNotification[];
  emailLog: EmailAlertRecord[];
  onOpenJob: (jobId: string) => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearNotifications: () => void;
  onResendEmail: (record: EmailAlertRecord) => void;
}

export function NotificationsView({
  notifications,
  emailLog,
  onOpenJob,
  onMarkRead,
  onMarkAllRead,
  onClearNotifications,
  onResendEmail,
}: NotificationsViewProps) {
  const [subTab, setSubTab] = useState<'inapp' | 'emails'>('inapp');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(emailLog[0]?.id ?? null);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<AlertSortOption>('newest-posted');
  const [timeRange, setTimeRange] = useState<AlertTimeRange>('all');
  const [specificDate, setSpecificDate] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);

  const selectedEmail = emailLog.find((r) => r.id === selectedEmailId) ?? emailLog[0] ?? null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = useMemo(() => {
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

    const matching = notifications.filter((n) => {
      if (unreadOnly && n.read) return false;

      if (maxAgeMs !== null) {
        const refIso = n.postedAt || n.createdAt;
        const refMs = new Date(refIso).getTime();
        if (!Number.isFinite(refMs) || nowMs - refMs > maxAgeMs) return false;
      }

      if (specificDate) {
        const refIso = n.postedAt || n.createdAt;
        const d = new Date(refIso);
        if (Number.isNaN(d.getTime()) || DUBAI_YMD.format(d) !== specificDate) {
          return false;
        }
      }

      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.company.toLowerCase().includes(q) ||
        n.location.toLowerCase().includes(q) ||
        n.platform.toLowerCase().includes(q)
      );
    });

    const getPostedMs = (n: InAppNotification): number | null => {
      if (!n.postedAt) return null;
      const ms = new Date(n.postedAt).getTime();
      return Number.isFinite(ms) ? ms : null;
    };

    const getReceivedMs = (n: InAppNotification): number => {
      const ms = new Date(n.createdAt).getTime();
      return Number.isFinite(ms) ? ms : 0;
    };

    const getDiff = (n: InAppNotification): number | null => {
      if (typeof n.delayMinutes === 'number') return n.delayMinutes;
      return computeTimeDifferenceMinutes(n.postedAt, n.createdAt);
    };

    return [...matching].sort((a, b) => {
      if (sortBy === 'newest-posted') {
        const pa = getPostedMs(a);
        const pb = getPostedMs(b);
        if (pa !== null && pb !== null && pb !== pa) return pb - pa;
        if (pa !== null && pb === null) return -1;
        if (pa === null && pb !== null) return 1;
        return getReceivedMs(b) - getReceivedMs(a);
      }
      if (sortBy === 'oldest-posted') {
        const pa = getPostedMs(a);
        const pb = getPostedMs(b);
        if (pa !== null && pb !== null && pa !== pb) return pa - pb;
        if (pa !== null && pb === null) return -1;
        if (pa === null && pb !== null) return 1;
        return getReceivedMs(a) - getReceivedMs(b);
      }
      if (sortBy === 'newest-received') {
        return getReceivedMs(b) - getReceivedMs(a);
      }
      if (sortBy === 'oldest-received') {
        return getReceivedMs(a) - getReceivedMs(b);
      }
      if (sortBy === 'fastest-alert') {
        const da = getDiff(a);
        const db = getDiff(b);
        if (da !== null && db !== null && da !== db) return da - db;
        if (da !== null && db === null) return -1;
        if (da === null && db !== null) return 1;
        return b.matchScore - a.matchScore;
      }
      return b.matchScore - a.matchScore;
    });
  }, [notifications, searchText, sortBy, timeRange, specificDate, unreadOnly]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center p-1 bg-stone-100 rounded-lg border border-stone-200">
            <button
              type="button"
              onClick={() => setSubTab('inapp')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                subTab === 'inapp'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              In-App Notifications ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('emails')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                subTab === 'emails'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Email Dispatch Log ({emailLog.length})
            </button>
          </div>

          {subTab === 'inapp' && notifications.length > 0 && (
            <div className="flex items-center gap-2.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Mark All Read</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClearNotifications}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-600 bg-white border border-stone-200 hover:text-red-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>
          )}
        </div>

        {subTab === 'inapp' && notifications.length > 0 && (
          <div className="pt-3 border-t border-stone-100 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Filter alerts by role, brand, platform..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-md text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-amber-700 focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-md text-xs text-stone-700">
                <ArrowUpDown className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span className="text-stone-500 shrink-0">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as AlertSortOption)}
                  aria-label="Sort alerts"
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
                  onChange={(e) => setTimeRange(e.target.value as AlertTimeRange)}
                  aria-label="Filter alerts by date window"
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
                  aria-label="Filter alerts by exact date"
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

            <div className="flex items-center justify-between text-[11px] text-stone-500">
              <span className="font-mono tabular-nums">
                Showing {filteredNotifications.length} of {notifications.length} alerts
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setUnreadOnly((prev) => !prev)}
                  className={`font-medium cursor-pointer ${
                    unreadOnly ? 'text-amber-800 underline' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {unreadOnly ? 'Showing Unread Only' : 'Unread Only'}
                </button>
                {(searchText || timeRange !== 'all' || specificDate || unreadOnly) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchText('');
                      setTimeRange('all');
                      setSpecificDate('');
                      setUnreadOnly(false);
                    }}
                    className="font-medium text-amber-800 hover:underline cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {subTab === 'inapp' ? (
        notifications.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-xl p-10 text-center space-y-2">
            <Bell className="w-6 h-6 text-stone-400 mx-auto" />
            <h2 className="text-sm font-semibold text-stone-900">
              No In-App Alerts Yet
            </h2>
            <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
              Every matching Dubai hospitality &amp; F&amp;B opening automatically creates an instant
              notification here—even if email delivery is not connected.
            </p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-xl p-10 text-center space-y-2">
            <Bell className="w-6 h-6 text-stone-400 mx-auto" />
            <h2 className="text-sm font-semibold text-stone-900">No Alerts Match Your Filter</h2>
            <p className="text-xs text-stone-500">
              Try clearing the date filter or search query to view all {notifications.length} alerts.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-200">
            {filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                  notif.read ? 'bg-white' : 'bg-amber-50/40'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                    {!notif.read && (
                      <span className="font-semibold text-amber-800">NEW ALERT</span>
                    )}
                    {!notif.read && <span aria-hidden="true">·</span>}
                    <span className="font-medium text-stone-700">{notif.platform}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-emerald-700 font-medium">
                      {notif.matchScore}% match
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {new Date(notif.createdAt).toLocaleString()}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {notif.emailDispatched ? 'Emailed + In-App' : 'In-App Alert'}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-stone-900">
                    {notif.title} — {notif.company}
                  </h3>
                  <div className="text-xs text-stone-600">{notif.location}</div>

                  {(() => {
                    const postedLabel = notif.postedAt
                      ? formatDubaiTimestamp(notif.postedAt, notif.postedTimePrecision ?? 'exact')
                      : notif.postedAtText || 'Not disclosed by source';
                    const sentLabel = formatDubaiTimestamp(notif.createdAt, 'exact');
                    const diffMins =
                      typeof notif.delayMinutes === 'number'
                        ? notif.delayMinutes
                        : computeTimeDifferenceMinutes(notif.postedAt, notif.createdAt);
                    const diffLabel = formatDelayMinutes(
                      diffMins,
                      notif.postedTimePrecision ?? 'exact'
                    );

                    return (
                      <div className="pt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono tabular-nums text-stone-600">
                        <span>
                          <strong className="font-medium text-stone-500">Posted:</strong>{' '}
                          <span className="text-stone-800">{postedLabel}</span>
                        </span>
                        <span>
                          <strong className="font-medium text-stone-500">Sent / Received:</strong>{' '}
                          <span className="text-stone-800">{sentLabel}</span>
                        </span>
                        <span>
                          <strong className="font-medium text-stone-500">Diff:</strong>{' '}
                          <span
                            className={`font-semibold ${
                              diffMins !== null && diffMins <= 60
                                ? 'text-emerald-700'
                                : 'text-amber-800'
                            }`}
                          >
                            {diffLabel}
                          </span>
                        </span>
                      </div>
                    );
                  })()}

                  {(notif.recruiterEmail || notif.recruiterPhone) && (
                    <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-emerald-800">
                      {notif.recruiterEmail && (
                        <span className="inline-flex items-center gap-1.5">
                          <Mail className="w-3 h-3" />
                          {notif.recruiterEmail}
                        </span>
                      )}
                      {notif.recruiterPhone && (
                        <span className="inline-flex items-center gap-1.5 tabular-nums">
                          <Phone className="w-3 h-3" />
                          {notif.recruiterPhone}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {!notif.read && (
                    <button
                      type="button"
                      onClick={() => onMarkRead(notif.id)}
                      className="px-3 py-1.5 text-xs font-medium text-stone-600 bg-white border border-stone-200 hover:text-stone-900 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Mark Read
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onMarkRead(notif.id);
                      onOpenJob(notif.jobId);
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Inspect &amp; Apply
                  </button>
                  {notif.sourceUrl && (
                    <a
                      href={notif.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <span>Source</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : emailLog.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-10 text-center space-y-2">
          <Mail className="w-6 h-6 text-stone-400 mx-auto" />
          <h2 className="text-sm font-semibold text-stone-900">No Email Dispatches Logged Yet</h2>
          <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
            Whenever a matching role triggers an email alert or you send a recruiter outreach email,
            it is logged here with full preview.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-white border border-stone-200 rounded-xl overflow-hidden">
            <ul className="divide-y divide-stone-200 max-h-[640px] overflow-y-auto">
              {emailLog.map((rec) => {
                const isSelected = selectedEmail?.id === rec.id;
                const statusText =
                  rec.status === 'delivered'
                    ? rec.sentVia === 'gmail-oauth'
                      ? 'Delivered via Gmail'
                      : 'Delivered via SMTP'
                    : rec.status === 'ready'
                    ? 'Queued (In-App Alert Active)'
                    : 'Delivery Failed';

                return (
                  <li key={rec.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedEmailId(rec.id)}
                      className={`w-full text-left p-4 space-y-1 transition-colors cursor-pointer ${
                        isSelected ? 'bg-amber-50/50' : 'hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-semibold text-stone-900 truncate">
                          {rec.jobTitle}
                        </span>
                        <span
                          className={`text-[11px] font-medium shrink-0 ${
                            rec.status === 'delivered'
                              ? 'text-emerald-700'
                              : rec.status === 'failed'
                              ? 'text-red-700'
                              : 'text-amber-800'
                          }`}
                        >
                          {statusText}
                        </span>
                      </div>
                      <div className="text-xs text-stone-600 truncate">{rec.company}</div>
                      <div className="text-[11px] text-stone-500 font-mono truncate">
                        To: {rec.toEmail} · {new Date(rec.timestamp).toLocaleString()}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {selectedEmail && (
            <div className="lg:col-span-7 bg-white border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-200">
              <div className="p-5 flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="text-xs text-stone-500">
                    {selectedEmail.kind === 'recruiter-outreach'
                      ? 'Recruiter Outreach'
                      : 'Job Match Alert'}{' '}
                    · {new Date(selectedEmail.timestamp).toLocaleString()}
                  </div>
                  <h3 className="text-sm font-semibold text-stone-900">{selectedEmail.subject}</h3>
                  <div className="text-xs font-mono text-stone-600">To: {selectedEmail.toEmail}</div>
                  {selectedEmail.error && (
                    <div className="text-xs text-red-700 pt-1">Error: {selectedEmail.error}</div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onResendEmail(selectedEmail)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send / Resend Email</span>
                </button>
              </div>

              <div className="bg-stone-50 p-4">
                <iframe
                  title={`Email preview: ${selectedEmail.subject}`}
                  sandbox=""
                  srcDoc={selectedEmail.bodyHtml}
                  className="w-full h-[460px] bg-white border border-stone-200 rounded-lg"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
