import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createServer as createViteServer } from 'vite';
import { DIPTI_PROFILE } from './src/data/diptiProfile.ts';
import type {
  AlertSettings,
  InAppNotification,
  JobListing,
  PlatformSource,
  RadarState,
} from './src/types/jobs.ts';
import { ALL_PLATFORMS, loadState, saveState } from './server/store.ts';
import {
  draftOutreachEmail,
  inspectJobPosting,
  isGeminiConfigured,
  scanDubaiHospitalityJobs,
} from './server/geminiScout.ts';
import {
  buildJobAlertEmailContent,
  dispatchEmailRecord,
  isSmtpConfigured,
  isValidEmail,
} from './server/emailService.ts';
import { computeTimeDifferenceMinutes } from './src/utils/timeMetrics.ts';

const PORT = Number(process.env.PORT || 3000);
const app = express();
app.use(express.json({ limit: '1mb' }));

let state = loadState();
let isScanning = false;
let watchdogTimer: NodeJS.Timeout | null = null;

const sseClients = new Set<express.Response>();

function broadcastSse(event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch {
      sseClients.delete(res);
    }
  }
}

function getClientState(): RadarState {
  return {
    jobs: state.jobs,
    settings: state.settings,
    emailLog: state.emailLog,
    notifications: state.notifications,
    lastScanAt: state.lastScanAt,
    lastScanSummary: state.lastScanSummary,
    scanCount: state.scanCount,
    smtpConfigured: isSmtpConfigured(),
    geminiConfigured: isGeminiConfigured(),
  };
}

async function processDiscoveredJobs(
  discovered: JobListing[],
  searchNote: string,
  gmailAccessToken?: string
): Promise<{ addedJobs: JobListing[]; alertsTriggered: number; newNotifications: InAppNotification[] }> {
  const existingIds = new Set(state.jobs.map((j) => j.id));
  const addedJobs: JobListing[] = [];
  const newNotifications: InAppNotification[] = [];
  let alertsTriggered = 0;

  for (const job of discovered) {
    if (!existingIds.has(job.id)) {
      existingIds.add(job.id);

      const dispatchedIso = new Date().toISOString();
      job.alertSentAt = dispatchedIso;
      const diffMins = computeTimeDifferenceMinutes(job.postedAt, dispatchedIso);
      if (diffMins !== null) {
        job.delayMinutes = diffMins;
      }

      const meetsThreshold = job.matchScore >= state.settings.minMatchScore;
      let emailDelivered = false;

      if (meetsThreshold && state.settings.autoEmailEnabled && isValidEmail(state.settings.recipientEmail)) {
        const { subject, bodyText, bodyHtml } = buildJobAlertEmailContent(job);
        const record = await dispatchEmailRecord({
          job,
          toEmail: state.settings.recipientEmail,
          subject,
          bodyText,
          bodyHtml,
          kind: 'job-alert',
          gmailAccessToken,
        });

        emailDelivered = record.status === 'delivered';
        job.alertStatus = emailDelivered ? 'sent' : record.status === 'ready' ? 'queued' : 'pending';
        state.emailLog = [record, ...state.emailLog].slice(0, 50);
        alertsTriggered += 1;

        broadcastSse('alert-dispatched', { record, jobId: job.id });
      } else {
        job.alertStatus = 'skipped';
      }

      // Always create a persistent In-App Notification for every qualifying match
      // so Dipti never misses an opening even if email is not delivered
      if (meetsThreshold) {
        const notification: InAppNotification = {
          id: `notif_${crypto.randomBytes(6).toString('hex')}`,
          jobId: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          platform: job.platform,
          matchScore: job.matchScore,
          recruiterEmail: job.recruiter.email,
          recruiterPhone: job.recruiter.phone || job.recruiter.whatsapp,
          sourceUrl: job.sourceUrl,
          postedAt: job.postedAt,
          postedAtText: job.postedAtText,
          postedTimePrecision: job.postedTimePrecision,
          createdAt: dispatchedIso,
          delayMinutes: diffMins ?? job.delayMinutes,
          read: false,
          emailDispatched: emailDelivered,
        };
        newNotifications.push(notification);
      }

      addedJobs.push(job);
    }
  }

  if (newNotifications.length > 0) {
    state.notifications = [...newNotifications, ...state.notifications].slice(0, 150);
    broadcastSse('in-app-notifications', { notifications: newNotifications });
  }

  if (addedJobs.length > 0) {
    state.jobs = [...addedJobs, ...state.jobs]
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 150);
    broadcastSse('new-matches', { jobs: addedJobs });
  }

  state.lastScanAt = new Date().toISOString();
  state.lastScanSummary = searchNote;
  state.scanCount += 1;
  saveState(state);

  return { addedJobs, alertsTriggered, newNotifications };
}

async function runScan(options?: {
  platformFocus?: PlatformSource | 'All';
  customQuery?: string;
  gmailAccessToken?: string;
}) {
  if (isScanning) {
    throw new Error('A scan is already in progress. Please wait a few seconds.');
  }
  isScanning = true;
  broadcastSse('scan-started', {
    platformFocus: options?.platformFocus ?? 'All',
    startedAt: new Date().toISOString(),
  });

  try {
    const { jobs, searchNote, geminiUsed, geminiWarning } = await scanDubaiHospitalityJobs(
      DIPTI_PROFILE,
      state.settings,
      {
        platformFocus: options?.platformFocus,
        customQuery: options?.customQuery,
      }
    );
    const result = await processDiscoveredJobs(jobs, searchNote, options?.gmailAccessToken);
    broadcastSse('scan-completed', {
      addedCount: result.addedJobs.length,
      totalMatched: jobs.length,
      alertsTriggered: result.alertsTriggered,
      notificationsCreated: result.newNotifications.length,
      geminiUsed,
      geminiWarning,
      state: getClientState(),
    });
    return {
      discoveredCount: jobs.length,
      addedCount: result.addedJobs.length,
      alertsTriggered: result.alertsTriggered,
      notificationsCreated: result.newNotifications.length,
      geminiUsed,
      geminiWarning,
      state: getClientState(),
    };
  } finally {
    isScanning = false;
  }
}

function resetWatchdog(): void {
  if (watchdogTimer) {
    clearInterval(watchdogTimer);
    watchdogTimer = null;
  }
  const intervalSec = state.settings.pollIntervalSeconds;
  if (intervalSec > 0) {
    const clampedMs = Math.max(60, intervalSec) * 1000;
    watchdogTimer = setInterval(() => {
      if (!isScanning) {
        runScan().catch((err) => {
          console.error('Background watchdog scan failed:', err);
        });
      }
    }, clampedMs);
  }
}

// SSE Live Stream
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write(`event: connected\ndata: ${JSON.stringify({ scanning: isScanning })}\n\n`);
  sseClients.add(res);

  const heartbeat = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, isScanning, jobsCount: state.jobs.length });
});

// Get full radar state
app.get('/api/state', (_req, res) => {
  res.json({
    ...getClientState(),
    isScanning,
  });
});

// Trigger instant live multi-platform scan
app.post('/api/jobs/scan', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const gmailAccessToken =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : undefined;

    const platformFocus =
      typeof req.body?.platformFocus === 'string' ? (req.body.platformFocus as PlatformSource | 'All') : 'All';
    const customQuery = typeof req.body?.customQuery === 'string' ? req.body.customQuery.slice(0, 160) : '';

    const result = await runScan({ platformFocus, customQuery, gmailAccessToken });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to scan Dubai hospitality jobs.';
    broadcastSse('scan-error', { message });
    res.status(isScanning ? 409 : 500).json({ error: message });
  }
});

// Inspect pasted URL or social post text
app.post('/api/jobs/inspect', async (req, res) => {
  try {
    const input = typeof req.body?.input === 'string' ? req.body.input.trim() : '';
    if (!input || input.length < 10) {
      res.status(400).json({ error: 'Please paste a job URL or full social post text to inspect.' });
      return;
    }

    const authHeader = req.headers.authorization;
    const gmailAccessToken =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : undefined;

    const listing = await inspectJobPosting(input, DIPTI_PROFILE);
    const { addedJobs, alertsTriggered, newNotifications } = await processDiscoveredJobs(
      [listing],
      `Inspected posting for ${listing.title} at ${listing.company}`,
      gmailAccessToken
    );

    res.json({
      job: addedJobs[0] ?? listing,
      alertsTriggered,
      notificationsCreated: newNotifications.length,
      state: getClientState(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to inspect posting.';
    res.status(400).json({ error: message });
  }
});

// Notification endpoints
app.patch('/api/notifications/read-all', (_req, res) => {
  state.notifications = state.notifications.map((n) => ({ ...n, read: true }));
  saveState(state);
  res.json({ notifications: state.notifications });
});

app.patch('/api/notifications/:id/read', (req, res) => {
  const { id } = req.params;
  state.notifications = state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
  saveState(state);
  res.json({ notifications: state.notifications });
});

app.delete('/api/notifications', (_req, res) => {
  state.notifications = [];
  saveState(state);
  res.json({ notifications: [] });
});

// Update job flags
app.patch('/api/jobs/:id', (req, res) => {
  const { id } = req.params;
  const idx = state.jobs.findIndex((j) => j.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Job listing not found.' });
    return;
  }

  const current = state.jobs[idx];
  const updated: JobListing = {
    ...current,
    applied: typeof req.body?.applied === 'boolean' ? req.body.applied : current.applied,
    saved: typeof req.body?.saved === 'boolean' ? req.body.saved : current.saved,
    notes: typeof req.body?.notes === 'string' ? req.body.notes.slice(0, 1000) : current.notes,
  };
  state.jobs[idx] = updated;
  saveState(state);
  res.json({ job: updated });
});

// Dismiss a job
app.delete('/api/jobs/:id', (req, res) => {
  const { id } = req.params;
  state.jobs = state.jobs.filter((j) => j.id !== id);
  saveState(state);
  res.json({ ok: true });
});

// Generate tailored first-applicant email + WhatsApp draft
app.post('/api/jobs/:id/draft', async (req, res) => {
  try {
    const { id } = req.params;
    const idx = state.jobs.findIndex((j) => j.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Job listing not found.' });
      return;
    }

    const draft = await draftOutreachEmail(state.jobs[idx], DIPTI_PROFILE);
    state.jobs[idx] = { ...state.jobs[idx], outreachDraft: draft };
    saveState(state);
    res.json({ draft, job: state.jobs[idx] });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to draft outreach.' });
  }
});

// Update alert settings & watchdog interval
app.put('/api/settings', (req, res) => {
  const body = req.body as Partial<AlertSettings>;
  const recipientEmail =
    typeof body.recipientEmail === 'string' ? body.recipientEmail.trim() : state.settings.recipientEmail;

  if (!isValidEmail(recipientEmail)) {
    res.status(400).json({ error: 'Please enter a valid alert email address.' });
    return;
  }

  const enabledPlatforms = Array.isArray(body.enabledPlatforms)
    ? body.enabledPlatforms.filter((p): p is PlatformSource => ALL_PLATFORMS.includes(p))
    : state.settings.enabledPlatforms;

  if (enabledPlatforms.length === 0) {
    res.status(400).json({ error: 'Select at least one platform to monitor.' });
    return;
  }

  const minMatchScore =
    typeof body.minMatchScore === 'number'
      ? Math.max(40, Math.min(95, Math.round(body.minMatchScore)))
      : state.settings.minMatchScore;

  const pollIntervalSeconds =
    typeof body.pollIntervalSeconds === 'number'
      ? [0, 120, 300, 900].includes(body.pollIntervalSeconds)
        ? body.pollIntervalSeconds
        : 300
      : state.settings.pollIntervalSeconds;

  const targetKeywords = Array.isArray(body.targetKeywords)
    ? body.targetKeywords
        .filter((k): k is string => typeof k === 'string' && k.trim().length > 0)
        .map((k) => k.trim())
        .slice(0, 15)
    : state.settings.targetKeywords;

  state.settings = {
    recipientEmail,
    autoEmailEnabled:
      typeof body.autoEmailEnabled === 'boolean' ? body.autoEmailEnabled : state.settings.autoEmailEnabled,
    browserAlertsEnabled:
      typeof body.browserAlertsEnabled === 'boolean'
        ? body.browserAlertsEnabled
        : state.settings.browserAlertsEnabled,
    soundEnabled: typeof body.soundEnabled === 'boolean' ? body.soundEnabled : state.settings.soundEnabled,
    minMatchScore,
    pollIntervalSeconds,
    enabledPlatforms,
    targetKeywords,
  };

  saveState(state);
  resetWatchdog();
  res.json({ settings: state.settings });
});

// Send email alert or direct recruiter application email
app.post('/api/alerts/send', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const gmailAccessToken =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : undefined;

    const jobId = typeof req.body?.jobId === 'string' ? req.body.jobId : '';
    const kind = req.body?.kind === 'recruiter-outreach' ? 'recruiter-outreach' : 'job-alert';
    const toEmail =
      typeof req.body?.toEmail === 'string' && req.body.toEmail.trim()
        ? req.body.toEmail.trim()
        : state.settings.recipientEmail;

    const job = state.jobs.find((j) => j.id === jobId);
    if (!job) {
      res.status(404).json({ error: 'Job listing not found.' });
      return;
    }

    if (!isValidEmail(toEmail)) {
      res.status(400).json({ error: 'Please provide a valid recipient email address.' });
      return;
    }

    let subject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : '';
    let bodyText = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
    let bodyHtml: string | undefined;

    if (kind === 'job-alert' && (!subject || !bodyText)) {
      const built = buildJobAlertEmailContent(job);
      subject = built.subject;
      bodyText = built.bodyText;
      bodyHtml = built.bodyHtml;
    }

    if (!subject || !bodyText) {
      res.status(400).json({ error: 'Email subject and message body are required.' });
      return;
    }

    const record = await dispatchEmailRecord({
      job,
      toEmail,
      subject,
      bodyText,
      bodyHtml,
      kind,
      gmailAccessToken,
    });

    state.emailLog = [record, ...state.emailLog].slice(0, 50);
    if (kind === 'job-alert' && record.status === 'delivered') {
      job.alertStatus = 'sent';
    } else if (kind === 'recruiter-outreach' && record.status === 'delivered') {
      job.applied = true;
    }
    saveState(state);

    broadcastSse('alert-dispatched', { record, jobId: job.id });
    res.json({ record, state: getClientState() });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to send email.' });
  }
});

// Never allow unknown /api/* requests to fall through to HTML/text
app.all('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

async function startServer(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    const vitePromise = createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(async (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      try {
        const vite = await vitePromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distDir, 'index.html'));
      });
    }
  }

  resetWatchdog();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dubai F&B Job Radar server running on http://0.0.0.0:${PORT}`);

    // Populate initial live Dubai openings automatically on startup if feed is empty
    if (state.jobs.length === 0) {
      runScan().catch((err) => {
        console.warn('Initial background live scan skipped:', err);
      });
    }
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
