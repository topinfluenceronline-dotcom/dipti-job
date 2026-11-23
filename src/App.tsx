import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { AlertCircle, Bell, CheckCircle2, X } from 'lucide-react';
import type {
  AlertSettings,
  EmailAlertRecord,
  InAppNotification,
  JobListing,
  PlatformSource,
  RadarState,
} from './types/jobs.ts';
import { getAccessToken, googleSignIn, initAuth, logout } from './lib/firebaseAuth.ts';
import { ApiRequestError, fetchApiJson } from './lib/api.ts';
import { playConciergeChime, triggerDesktopNotification } from './lib/soundAlert.ts';
import { TopBar, type ActiveTab } from './components/TopBar.tsx';
import { QuickFetchBar } from './components/QuickFetchBar.tsx';
import { JobFeedList } from './components/JobFeedList.tsx';
import { JobDetailPanel } from './components/JobDetailPanel.tsx';
import { NotificationsView } from './components/NotificationsView.tsx';
import { FirsthandSourcesView } from './components/FirsthandSourcesView.tsx';
import { AlertRulesView } from './components/AlertRulesView.tsx';
import { CandidateProfileView } from './components/CandidateProfileView.tsx';
import {
  ConfirmEmailModal,
  type PendingEmailConfirmation,
} from './components/ConfirmEmailModal.tsx';
import {
  computeTimeDifferenceMinutes,
  formatDelayMinutes,
  formatDubaiTimestamp,
} from './utils/timeMetrics.ts';

interface BannerNotice {
  type: 'success' | 'error' | 'info';
  message: string;
}

const DEFAULT_RADAR_STATE: RadarState = {
  jobs: [],
  settings: {
    recipientEmail: 'diptimondal18@gmail.com',
    autoEmailEnabled: true,
    browserAlertsEnabled: true,
    soundEnabled: true,
    minMatchScore: 65,
    pollIntervalSeconds: 300,
    enabledPlatforms: [
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
    ],
    targetKeywords: [
      'Restaurant Manager',
      'Senior Restaurant Manager',
      'F&B Operations Manager',
      'Banquet Manager',
      'All-Day Dining Manager',
    ],
  },
  emailLog: [],
  notifications: [],
  lastScanAt: null,
  lastScanSummary: null,
  scanCount: 0,
  smtpConfigured: false,
  geminiConfigured: false,
};

export default function App() {
  const [radar, setRadar] = useState<RadarState>(DEFAULT_RADAR_STATE);
  const [activeTab, setActiveTab] = useState<ActiveTab>('feed');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformSource | 'All'>('All');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);
  const [streamConnected, setStreamConnected] = useState(false);
  const [notice, setNotice] = useState<BannerNotice | null>(null);

  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [gmailToken, setGmailToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [pendingEmail, setPendingEmail] = useState<PendingEmailConfirmation | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  const settingsRef = useRef(radar.settings);
  settingsRef.current = radar.settings;

  const showNotice = useCallback((type: BannerNotice['type'], message: string) => {
    setNotice({ type, message });
  }, []);

  const authHeaders = useCallback((): Record<string, string> => {
    const token = getAccessToken() || gmailToken;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }, [gmailToken]);

  useEffect(() => {
    const unsub = initAuth(
      (user, token) => {
        setGoogleUser(user);
        if (token) setGmailToken(token);
      },
      () => {
        setGoogleUser(null);
        setGmailToken(null);
      }
    );
    return () => unsub();
  }, []);

  const syncStateFromServer = useCallback(async (retries = 5) => {
    const data = await fetchApiJson<RadarState & { isScanning?: boolean }>('/api/state', {
      retries,
      retryDelayMs: 900,
    });
    setRadar({
      jobs: data.jobs ?? [],
      settings: data.settings ?? DEFAULT_RADAR_STATE.settings,
      emailLog: data.emailLog ?? [],
      notifications: data.notifications ?? [],
      lastScanAt: data.lastScanAt ?? null,
      lastScanSummary: data.lastScanSummary ?? null,
      scanCount: data.scanCount ?? 0,
      smtpConfigured: Boolean(data.smtpConfigured),
      geminiConfigured: Boolean(data.geminiConfigured),
    });
    setIsScanning(Boolean(data.isScanning));
    if (data.jobs?.length > 0) {
      setSelectedJobId((prev) => prev ?? data.jobs[0].id);
    }
    setNotice((prev) => (prev?.type === 'error' ? null : prev));
  }, []);

  // Load initial radar state with automatic cold-start retry
  useEffect(() => {
    let mounted = true;
    syncStateFromServer(5).catch((err) => {
      if (mounted) {
        showNotice(
          'error',
          err instanceof Error
            ? err.message
            : 'Job Radar server is still starting up. Click Scan Dubai Jobs in a few seconds.'
        );
      }
    });
    return () => {
      mounted = false;
    };
  }, [showNotice, syncStateFromServer]);

  // Connect to SSE real-time push stream
  useEffect(() => {
    const source = new EventSource('/api/stream');

    source.addEventListener('connected', (evt) => {
      setStreamConnected(true);
      try {
        const data = JSON.parse((evt as MessageEvent).data) as { scanning?: boolean };
        if (typeof data.scanning === 'boolean') {
          setIsScanning(data.scanning);
        }
      } catch {
        // ignore
      }
      // Refresh state automatically when stream reconnects
      syncStateFromServer(2).catch(() => {});
    });

    source.addEventListener('scan-started', () => {
      setIsScanning(true);
    });

    source.addEventListener('new-matches', (evt) => {
      try {
        const data = JSON.parse((evt as MessageEvent).data) as { jobs?: JobListing[] };
        const incoming = data.jobs ?? [];
        if (incoming.length === 0) return;

        setRadar((prev) => {
          const existingIds = new Set(prev.jobs.map((j) => j.id));
          const fresh = incoming.filter((j) => !existingIds.has(j.id));
          if (fresh.length === 0) return prev;
          return { ...prev, jobs: [...fresh, ...prev.jobs] };
        });

        setSelectedJobId((prevId) => prevId ?? incoming[0].id);

        if (settingsRef.current.soundEnabled) {
          playConciergeChime();
        }
        if (settingsRef.current.browserAlertsEnabled) {
          const top = incoming[0];
          triggerDesktopNotification(
            `${incoming.length} New Dubai F&B Match${incoming.length > 1 ? 'es' : ''}`,
            `${top.title} at ${top.company} (${top.platform} · ${top.matchScore}% match)`
          );
        }
      } catch {
        // ignore
      }
    });

    source.addEventListener('in-app-notifications', (evt) => {
      try {
        const data = JSON.parse((evt as MessageEvent).data) as {
          notifications?: InAppNotification[];
        };
        const incoming = data.notifications ?? [];
        if (incoming.length === 0) return;
        setRadar((prev) => {
          const existing = new Set(prev.notifications.map((n) => n.id));
          const fresh = incoming.filter((n) => !existing.has(n.id));
          return fresh.length > 0
            ? { ...prev, notifications: [...fresh, ...prev.notifications] }
            : prev;
        });
      } catch {
        // ignore
      }
    });

    source.addEventListener('scan-completed', (evt) => {
      setIsScanning(false);
      try {
        const data = JSON.parse((evt as MessageEvent).data) as {
          state?: RadarState;
        };
        if (data.state) {
          setRadar(data.state);
          if (data.state.jobs.length > 0) {
            setSelectedJobId((prev) => prev ?? data.state!.jobs[0].id);
          }
        }
      } catch {
        // ignore
      }
    });

    source.addEventListener('scan-error', (evt) => {
      setIsScanning(false);
      try {
        const data = JSON.parse((evt as MessageEvent).data) as { message?: string };
        if (data.message) showNotice('error', data.message);
      } catch {
        // ignore
      }
    });

    source.onerror = () => {
      setStreamConnected(false);
    };

    return () => {
      source.close();
      setStreamConnected(false);
    };
  }, [showNotice, syncStateFromServer]);

  const handleScan = useCallback(
    async (platformFocus: PlatformSource | 'All' = selectedPlatform, customQuery = '') => {
      setIsScanning(true);
      setNotice(null);
      try {
        const data = await fetchApiJson<{
          discoveredCount?: number;
          addedCount?: number;
          notificationsCreated?: number;
          state?: RadarState;
        }>('/api/jobs/scan', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ platformFocus, customQuery }),
          retries: 2,
          retryDelayMs: 1000,
        });
        if (data.state) {
          setRadar(data.state);
          if (data.state.jobs.length > 0) {
            setSelectedJobId((prev) => prev ?? data.state!.jobs[0].id);
          }
        }
        const added = data.addedCount ?? 0;
        const notifs = data.notificationsCreated ?? 0;
        if (added > 0) {
          showNotice(
            'success',
            `Found ${added} new Dubai F&B match${added === 1 ? '' : 'es'} and created ${notifs} in-app alert${notifs === 1 ? '' : 's'}.`
          );
        } else {
          showNotice(
            'info',
            `Live scan checked ${data.discoveredCount ?? 0} openings across Dubai feeds — all current matches are already in your Live Feed.`
          );
        }
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 409) {
          showNotice('info', 'A live scan is already running — results will appear automatically.');
          return;
        }
        showNotice('error', err instanceof Error ? err.message : 'Unable to scan Dubai jobs.');
      } finally {
        setIsScanning(false);
      }
    },
    [authHeaders, selectedPlatform, showNotice]
  );

  const handleInspect = useCallback(
    async (input: string) => {
      setIsInspecting(true);
      try {
        const data = await fetchApiJson<{
          job: JobListing;
          state?: RadarState;
        }>('/api/jobs/inspect', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ input }),
          retries: 1,
        });
        if (data.state) {
          setRadar(data.state);
        }
        if (data.job?.id) {
          setSelectedJobId(data.job.id);
        }
        showNotice('success', `Extracted ${data.job.title} at ${data.job.company}.`);
      } finally {
        setIsInspecting(false);
      }
    },
    [authHeaders, showNotice]
  );

  const handleToggleApplied = async (id: string, applied: boolean) => {
    try {
      const { job } = await fetchApiJson<{ job: JobListing }>(
        `/api/jobs/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ applied }),
        }
      );
      setRadar((prev) => ({
        ...prev,
        jobs: prev.jobs.map((j) => (j.id === id ? job : j)),
      }));
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Failed to update job status.');
    }
  };

  const handleDeleteJob = async (id: string) => {
    try {
      await fetchApiJson<{ ok: boolean }>(`/api/jobs/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      setRadar((prev) => {
        const remaining = prev.jobs.filter((j) => j.id !== id);
        if (selectedJobId === id) {
          setSelectedJobId(remaining[0]?.id ?? null);
        }
        return { ...prev, jobs: remaining };
      });
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Failed to dismiss listing.');
    }
  };

  const handleGenerateDraft = async (id: string) => {
    const data = await fetchApiJson<{
      draft: { subject: string; body: string; whatsappMessage: string };
      job: JobListing;
    }>(`/api/jobs/${encodeURIComponent(id)}/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    setRadar((prev) => ({
      ...prev,
      jobs: prev.jobs.map((j) => (j.id === id ? data.job : j)),
    }));
    return data.draft;
  };

  const handleSaveSettings = async (next: AlertSettings) => {
    const data = await fetchApiJson<{ settings: AlertSettings }>('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    setRadar((prev) => ({ ...prev, settings: data.settings }));
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGmailToken(result.accessToken);
        showNotice('success', `Connected Gmail (${result.user.email}) for instant email alerts.`);
      }
    } catch (err) {
      showNotice(
        'error',
        err instanceof Error
          ? err.message
          : 'Google sign-in was cancelled or unavailable.'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setGoogleUser(null);
    setGmailToken(null);
    showNotice('info', 'Disconnected Google account.');
  };

  const handleMarkNotificationRead = async (id: string) => {
    setRadar((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
    await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
  };

  const handleMarkAllNotificationsRead = async () => {
    setRadar((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
    await fetch('/api/notifications/read-all', { method: 'PATCH' });
  };

  const handleClearNotifications = async () => {
    setRadar((prev) => ({ ...prev, notifications: [] }));
    await fetch('/api/notifications', { method: 'DELETE' });
  };

  const handleOpenJobFromNotification = (jobId: string) => {
    setSelectedJobId(jobId);
    setActiveTab('feed');
  };

  const handleSendInstantAlert = (job: JobListing) => {
    const sentIso = job.alertSentAt || job.discoveredAt || new Date().toISOString();
    const postedLabel = job.postedAt
      ? formatDubaiTimestamp(job.postedAt, job.postedTimePrecision ?? 'exact')
      : job.postedAtText;
    const sentLabel = formatDubaiTimestamp(sentIso, 'exact');
    const diffMins =
      typeof job.delayMinutes === 'number'
        ? job.delayMinutes
        : computeTimeDifferenceMinutes(job.postedAt, sentIso);
    const diffLabel = formatDelayMinutes(diffMins, job.postedTimePrecision ?? 'exact');

    setPendingEmail({
      jobId: job.id,
      toEmail: radar.settings.recipientEmail,
      subject: `[Dubai F&B Alert · ${job.matchScore}% Match] ${job.title} — ${job.company}`,
      body: [
        `Role: ${job.title} at ${job.company} (${job.location})`,
        `Platform: ${job.platform}`,
        `Job Posted Time: ${postedLabel}`,
        `Sent / Received Time: ${sentLabel}`,
        `Time Difference (Minutes): ${diffLabel}`,
        job.recruiter.email ? `Recruiter Email: ${job.recruiter.email}` : null,
        job.recruiter.phone ? `Recruiter Phone: ${job.recruiter.phone}` : null,
        job.sourceUrl ? `Apply Link: ${job.sourceUrl}` : null,
        '',
        job.summary,
      ]
        .filter(Boolean)
        .join('\n'),
      kind: 'job-alert',
      jobTitle: job.title,
      company: job.company,
    });
  };

  const handleResendRecord = (record: EmailAlertRecord) => {
    setPendingEmail({
      jobId: record.jobId,
      toEmail: record.toEmail,
      subject: record.subject,
      body: record.bodyText,
      kind: record.kind,
      jobTitle: record.jobTitle,
      company: record.company,
    });
  };

  const handleConfirmSendEmail = async () => {
    if (!pendingEmail) return;
    setSendingEmail(true);
    try {
      const data = await fetchApiJson<{
        record?: EmailAlertRecord;
        state?: RadarState;
      }>('/api/alerts/send', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          jobId: pendingEmail.jobId,
          toEmail: pendingEmail.toEmail,
          subject: pendingEmail.subject,
          body: pendingEmail.body,
          kind: pendingEmail.kind,
        }),
        retries: 1,
      });
      if (data.state) {
        setRadar(data.state);
      }
      const status = data.record?.status;
      if (status === 'delivered') {
        showNotice('success', `Email delivered to ${pendingEmail.toEmail}.`);
      } else if (status === 'ready') {
        showNotice(
          'info',
          `Logged to Email Dispatch Log for ${pendingEmail.toEmail}. Connect Gmail in Alert Rules to send directly from your inbox.`
        );
      } else {
        showNotice('error', data.record?.error || 'Email delivery failed.');
      }
      setPendingEmail(null);
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Email send error.');
    } finally {
      setSendingEmail(false);
    }
  };

  const selectedJob = useMemo(
    () => radar.jobs.find((j) => j.id === selectedJobId) ?? radar.jobs[0] ?? null,
    [radar.jobs, selectedJobId]
  );

  const unreadNotifications = useMemo(
    () => radar.notifications.filter((n) => !n.read),
    [radar.notifications]
  );

  const stats = useMemo(
    () => ({
      totalJobs: radar.jobs.length,
      withContacts: radar.jobs.filter((j) => Boolean(j.recruiter.email || j.recruiter.phone)).length,
      unreadAlerts: unreadNotifications.length,
      lastScanAt: radar.lastScanAt,
    }),
    [radar.jobs, unreadNotifications.length, radar.lastScanAt]
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-stone-900">
      <TopBar
        activeTab={activeTab}
        unreadNotifications={unreadNotifications.length}
        onSelectTab={setActiveTab}
        onScanNow={() => handleScan(selectedPlatform, '')}
        isScanning={isScanning}
      />

      {activeTab === 'feed' && (
        <QuickFetchBar
          isScanning={isScanning}
          isInspecting={isInspecting}
          selectedPlatform={selectedPlatform}
          onSelectPlatform={setSelectedPlatform}
          onScan={handleScan}
          onInspect={handleInspect}
          onOpenAlerts={() => setActiveTab('alerts')}
          stats={stats}
          streamConnected={streamConnected}
        />
      )}

      {/* Live Unread In-App Alert Bar (always visible when new alerts wait) */}
      {unreadNotifications.length > 0 && activeTab !== 'alerts' && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-950">
              <Bell className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>
                <strong>{unreadNotifications.length} new in-app job alert{unreadNotifications.length === 1 ? '' : 's'}</strong>
                {' — '}
                Latest: {unreadNotifications[0].title} at {unreadNotifications[0].company} (
                {unreadNotifications[0].matchScore}% match · {unreadNotifications[0].platform})
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => handleOpenJobFromNotification(unreadNotifications[0].jobId)}
                className="font-semibold text-amber-900 hover:underline cursor-pointer"
              >
                Open Match
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('alerts')}
                className="font-medium text-stone-700 hover:text-stone-900 cursor-pointer"
              >
                View All Alerts
              </button>
              <button
                type="button"
                onClick={handleMarkAllNotificationsRead}
                className="text-stone-500 hover:text-stone-900 cursor-pointer"
              >
                Mark Read
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Non-intrusive status banner */}
      {notice && (
        <div className="max-w-[1360px] w-full mx-auto px-4 sm:px-8 pt-4">
          <div
            role="status"
            className={`flex items-center justify-between gap-3 px-4 py-2.5 text-xs rounded-lg border ${
              notice.type === 'error'
                ? 'bg-red-50 text-red-900 border-red-200'
                : notice.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-amber-50 text-amber-900 border-amber-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {notice.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              )}
              <span>{notice.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Dismiss notification"
              className="p-1 opacity-70 hover:opacity-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-8 py-6">
        {activeTab === 'feed' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5">
              <JobFeedList
                jobs={radar.jobs}
                selectedJobId={selectedJob?.id ?? null}
                onSelectJob={setSelectedJobId}
                onDeleteJob={handleDeleteJob}
                selectedPlatform={selectedPlatform}
                isScanning={isScanning}
                onTriggerScan={() => handleScan(selectedPlatform, '')}
              />
            </div>
            <div className="lg:col-span-7">
              <JobDetailPanel
                job={selectedJob}
                recipientEmail={radar.settings.recipientEmail}
                gmailConnected={Boolean(gmailToken)}
                onToggleApplied={handleToggleApplied}
                onGenerateDraft={handleGenerateDraft}
                onRequestSendEmail={setPendingEmail}
                onSendInstantAlert={handleSendInstantAlert}
              />
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <NotificationsView
            notifications={radar.notifications}
            emailLog={radar.emailLog}
            onOpenJob={handleOpenJobFromNotification}
            onMarkRead={handleMarkNotificationRead}
            onMarkAllRead={handleMarkAllNotificationsRead}
            onClearNotifications={handleClearNotifications}
            onResendEmail={handleResendRecord}
          />
        )}

        {activeTab === 'sources' && (
          <FirsthandSourcesView
            onScanNow={() => {
              setActiveTab('feed');
              handleScan('All', '');
            }}
            isScanning={isScanning}
          />
        )}

        {activeTab === 'rules' && (
          <AlertRulesView
            settings={radar.settings}
            smtpConfigured={radar.smtpConfigured}
            googleUser={googleUser}
            gmailTokenActive={Boolean(gmailToken)}
            isLoggingIn={isLoggingIn}
            onGoogleLogin={handleGoogleLogin}
            onGoogleLogout={handleGoogleLogout}
            onSaveSettings={handleSaveSettings}
          />
        )}

        {activeTab === 'profile' && <CandidateProfileView />}
      </main>

      <footer className="border-t border-stone-200 bg-white mt-12">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          <div>
            Dipti Basu Mondal · Restaurant Manager &amp; Luxury Hotel F&amp;B · Dubai, UAE
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('alerts')}
              className="hover:text-stone-900 transition-colors cursor-pointer"
            >
              In-App Alerts ({unreadNotifications.length} unread)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rules')}
              className="hover:text-stone-900 transition-colors cursor-pointer"
            >
              Email: {radar.settings.recipientEmail}
            </button>
            <a
              href="/assets/aistudio/Dipti_Basu_Mondal_Resume_94f25842.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-stone-900 transition-colors"
            >
              Resume PDF
            </a>
          </div>
        </div>
      </footer>

      <ConfirmEmailModal
        pending={pendingEmail}
        sending={sendingEmail}
        onConfirm={handleConfirmSendEmail}
        onCancel={() => setPendingEmail(null)}
      />
    </div>
  );
}
