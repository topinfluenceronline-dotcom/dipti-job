import { useEffect, useState, type FormEvent } from 'react';
import { Bell, Check, LogOut, Mail, Volume2 } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { AlertSettings, PlatformSource } from '../types/jobs.ts';
import { playConciergeChime, triggerDesktopNotification } from '../lib/soundAlert.ts';

interface AlertRulesViewProps {
  settings: AlertSettings;
  smtpConfigured: boolean;
  googleUser: User | null;
  gmailTokenActive: boolean;
  isLoggingIn: boolean;
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
  onSaveSettings: (next: AlertSettings) => Promise<void>;
}

const ALL_PLATFORMS: PlatformSource[] = [
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

const POLL_OPTIONS = [
  { label: 'Manual scans only', value: 0 },
  { label: 'Every 2 minutes (Rapid)', value: 120 },
  { label: 'Every 5 minutes (Balanced)', value: 300 },
  { label: 'Every 15 minutes (Standard)', value: 900 },
];

export function AlertRulesView({
  settings,
  smtpConfigured,
  googleUser,
  gmailTokenActive,
  isLoggingIn,
  onGoogleLogin,
  onGoogleLogout,
  onSaveSettings,
}: AlertRulesViewProps) {
  const [draft, setDraft] = useState<AlertSettings>(settings);
  const [keywordsText, setKeywordsText] = useState(settings.targetKeywords.join(', '));
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );

  useEffect(() => {
    setDraft(settings);
    setKeywordsText(settings.targetKeywords.join(', '));
  }, [settings]);

  const togglePlatform = (platform: PlatformSource) => {
    setDraft((prev) => {
      const exists = prev.enabledPlatforms.includes(platform);
      const nextPlatforms = exists
        ? prev.enabledPlatforms.filter((p) => p !== platform)
        : [...prev.enabledPlatforms, platform];
      return { ...prev, enabledPlatforms: nextPlatforms };
    });
  };

  const requestDesktopAlerts = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === 'granted') {
        triggerDesktopNotification(
          'Dipti Job Radar Alerts Enabled',
          'You will be notified immediately whenever a matching Dubai F&B role appears.'
        );
      }
    } catch {
      // Ignore permission prompt errors
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedNotice(false);

    const parsedKeywords = keywordsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      await onSaveSettings({
        ...draft,
        targetKeywords: parsedKeywords,
      });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save alert settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Gmail & Email Delivery Connection Card */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-stone-900">
              Email Delivery Channel
            </h2>
            <p className="text-xs text-stone-600 leading-relaxed max-w-xl">
              Connect Google / Gmail to automatically dispatch instant match alerts to{' '}
              <span className="font-mono text-stone-900">{draft.recipientEmail}</span> and send
              one-click applications directly to recruiters.
            </p>
          </div>

          <div className="shrink-0">
            {googleUser && gmailTokenActive ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-medium text-emerald-700">Gmail Connected</div>
                  <div className="text-xs font-mono text-stone-600">{googleUser.email}</div>
                </div>
                <button
                  type="button"
                  onClick={onGoogleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onGoogleLogin}
                disabled={isLoggingIn}
                className="gsi-material-button"
              >
                <div className="gsi-material-button-state" />
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
                      style={{ display: 'block' }}
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                      <path fill="none" d="M0 0h48v48H0z" />
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">
                    {isLoggingIn ? 'Connecting Google...' : 'Sign in with Google'}
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600">
          <span>
            Server SMTP Transport:{' '}
            <strong className="text-stone-900">
              {smtpConfigured ? 'Configured for background alerts' : 'Not configured (using Gmail session & dispatch ledger)'}
            </strong>
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => playConciergeChime()}
              className="inline-flex items-center gap-1.5 text-amber-800 hover:underline cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Test Alert Sound</span>
            </button>
            {notifPermission !== 'unsupported' && (
              <button
                type="button"
                onClick={requestDesktopAlerts}
                className="inline-flex items-center gap-1.5 text-amber-800 hover:underline cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>
                  {notifPermission === 'granted'
                    ? 'Desktop Alerts Active'
                    : 'Enable Desktop Alerts'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alert Rules Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-200"
      >
        <div className="p-6 space-y-5">
          <h2 className="text-base font-semibold text-stone-900">
            Alert Speed, Match Threshold &amp; Platforms
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Alert Recipient Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={draft.recipientEmail}
                  onChange={(e) => setDraft({ ...draft, recipientEmail: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:bg-white focus:border-amber-700 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Automatic Background Watchdog Frequency
              </label>
              <select
                value={draft.pollIntervalSeconds}
                onChange={(e) =>
                  setDraft({ ...draft, pollIntervalSeconds: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:bg-white focus:border-amber-700 focus:outline-none"
              >
                {POLL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-stone-700">
                Minimum CV Match Score to Trigger Email Alert
              </label>
              <span className="font-mono text-xs font-semibold text-amber-800 tabular-nums">
                {draft.minMatchScore}%+
              </span>
            </div>
            <input
              type="range"
              min={50}
              max={95}
              step={5}
              value={draft.minMatchScore}
              onChange={(e) => setDraft({ ...draft, minMatchScore: Number(e.target.value) })}
              className="w-full accent-amber-700"
            />
            <div className="flex justify-between text-[11px] text-stone-400 mt-1">
              <span>50% (Broader F&amp;B roles)</span>
              <span>75% (Strong match)</span>
              <span>95% (Exact luxury match)</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-2">
              Platforms Monitored for Dubai Listings
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {ALL_PLATFORMS.map((platform) => {
                const enabled = draft.enabledPlatforms.includes(platform);
                return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => togglePlatform(platform)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-colors cursor-pointer ${
                      enabled
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    {platform}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5">
              Target Dubai Role Keywords (comma-separated)
            </label>
            <input
              type="text"
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:bg-white focus:border-amber-700 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-6 pt-1">
            <label className="inline-flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.autoEmailEnabled}
                onChange={(e) => setDraft({ ...draft, autoEmailEnabled: e.target.checked })}
                className="rounded border-stone-300 text-amber-700 focus:ring-amber-700"
              />
              <span>Auto-send email alerts on matching discoveries</span>
            </label>

            <label className="inline-flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.browserAlertsEnabled}
                onChange={(e) => setDraft({ ...draft, browserAlertsEnabled: e.target.checked })}
                className="rounded border-stone-300 text-amber-700 focus:ring-amber-700"
              />
              <span>Browser desktop notification on new match</span>
            </label>

            <label className="inline-flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.soundEnabled}
                onChange={(e) => setDraft({ ...draft, soundEnabled: e.target.checked })}
                className="rounded border-stone-300 text-amber-700 focus:ring-amber-700"
              />
              <span>Audible chime on instant alert</span>
            </label>
          </div>
        </div>

        <div className="px-6 py-4 bg-stone-50 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs">
            {error && <span className="text-red-700">{error}</span>}
            {savedNotice && (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                <Check className="w-3.5 h-3.5" />
                Alert rules &amp; watchdog schedule saved
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Alert Rules'}
          </button>
        </div>
      </form>
    </div>
  );
}
