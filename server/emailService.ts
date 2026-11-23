import nodemailer from 'nodemailer';
import type { EmailAlertRecord, JobListing } from '../src/types/jobs.ts';
import crypto from 'node:crypto';
import {
  computeTimeDifferenceMinutes,
  formatDelayMinutes,
  formatDubaiTimestamp,
} from '../src/utils/timeMetrics.ts';

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function stripHeaderControls(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function buildJobAlertEmailContent(job: JobListing): {
  subject: string;
  bodyText: string;
  bodyHtml: string;
} {
  const recruiterLines = [
    job.recruiter.name ? `Recruiter: ${job.recruiter.name}${job.recruiter.title ? ` (${job.recruiter.title})` : ''}` : null,
    job.recruiter.email ? `Email: ${job.recruiter.email}` : null,
    job.recruiter.phone ? `Phone: ${job.recruiter.phone}` : null,
    job.recruiter.whatsapp && job.recruiter.whatsapp !== job.recruiter.phone
      ? `WhatsApp: ${job.recruiter.whatsapp}`
      : null,
  ].filter(Boolean);

  const sentIso = job.alertSentAt || job.discoveredAt || new Date().toISOString();
  const postedLabel = job.postedAt
    ? formatDubaiTimestamp(job.postedAt, job.postedTimePrecision ?? 'exact')
    : job.postedAtText || 'Not disclosed by source';
  const sentLabel = formatDubaiTimestamp(sentIso, 'exact');
  const diffMins =
    typeof job.delayMinutes === 'number'
      ? job.delayMinutes
      : computeTimeDifferenceMinutes(job.postedAt, sentIso);
  const delayLabel = formatDelayMinutes(diffMins, job.postedTimePrecision ?? 'exact');

  const subject = `[Dubai F&B Alert · ${job.matchScore}% Match] ${job.title} — ${job.company} (${job.platform})`;

  const bodyText = [
    `NEW DUBAI HOSPITALITY MATCH FOR DIPTI BASU MONDAL`,
    `====================================================`,
    `Role: ${job.title}`,
    `Property / Company: ${job.company}`,
    `Location: ${job.location}`,
    `Source Platform: ${job.platform}`,
    `CV Match Score: ${job.matchScore}%`,
    job.salaryOrPackage ? `Package: ${job.salaryOrPackage}` : null,
    ``,
    `POST & ALERT TIMING LOG:`,
    `- Job Posted Time: ${postedLabel}`,
    `- Sent / Received Time: ${sentLabel}`,
    `- Time Difference (Minutes): ${delayLabel}`,
    ``,
    `WHY THIS FITS YOUR PROFILE:`,
    ...job.matchReasons.map((r) => `- ${r}`),
    ``,
    `ROLE BRIEF:`,
    job.summary,
    ``,
    `RECRUITER CONTACT CAPTURED:`,
    ...(recruiterLines.length > 0 ? recruiterLines : ['Direct application via source link below (no public email/phone listed).']),
    ``,
    job.sourceUrl ? `APPLY NOW (FIRST-APPLICANT LINK): ${job.sourceUrl}` : '',
  ]
    .filter((line) => line !== null)
    .join('\n');

  const safeTitle = escapeHtml(job.title);
  const safeCompany = escapeHtml(job.company);
  const safeLocation = escapeHtml(job.location);
  const safePlatform = escapeHtml(job.platform);
  const safePostedLabel = escapeHtml(postedLabel);
  const safeSentLabel = escapeHtml(sentLabel);
  const safeDelayLabel = escapeHtml(delayLabel);
  const safeSummary = escapeHtml(job.summary);
  const safeUrl = job.sourceUrl && /^https?:\/\//i.test(job.sourceUrl) ? escapeHtml(job.sourceUrl) : '';

  const bodyHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; color: #18181B; background: #FAF9F6; padding: 24px; border: 1px solid #E7E5E4;">
      <div style="border-bottom: 1px solid #E7E5E4; padding-bottom: 16px; margin-bottom: 20px;">
        <div style="font-size: 12px; color: #B45309; font-weight: 600; letter-spacing: 0.04em;">FIRST-APPLICANT DUBAI F&amp;B ALERT · ${job.matchScore}% CV MATCH</div>
        <h1 style="font-size: 22px; margin: 8px 0 4px 0; color: #18181B;">${safeTitle}</h1>
        <div style="font-size: 14px; color: #57534E;">${safeCompany} · ${safeLocation} · ${safePlatform}</div>
      </div>

      <div style="background: #FFFBEB; border: 1px solid #FDE68A; padding: 12px 14px; margin-bottom: 16px; font-size: 12px; line-height: 1.6; color: #78350F;">
        <div><strong>Job Posted Time:</strong> ${safePostedLabel}</div>
        <div><strong>Sent / Received Time:</strong> ${safeSentLabel}</div>
        <div><strong>Time Difference (Minutes):</strong> ${safeDelayLabel}</div>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #27272A; margin: 0 0 16px 0;">${safeSummary}</p>

      <div style="background: #FFFFFF; border: 1px solid #E7E5E4; padding: 14px 16px; margin-bottom: 16px;">
        <div style="font-size: 12px; font-weight: 600; color: #18181B; margin-bottom: 8px;">Alignment With Dipti Basu Mondal’s Profile</div>
        <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #3F3F46; line-height: 1.55;">
          ${job.matchReasons.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}
        </ul>
      </div>

      <div style="background: #FFFFFF; border: 1px solid #E7E5E4; padding: 14px 16px; margin-bottom: 20px;">
        <div style="font-size: 12px; font-weight: 600; color: #18181B; margin-bottom: 6px;">Recruiter Contact Captured</div>
        ${
          recruiterLines.length > 0
            ? `<div style="font-size: 13px; color: #27272A; line-height: 1.6;">${recruiterLines
                .map((l) => escapeHtml(String(l)))
                .join('<br />')}</div>`
            : `<div style="font-size: 13px; color: #71717A;">No direct email or phone listed publicly — apply immediately via the listing link below.</div>`
        }
      </div>

      ${
        safeUrl
          ? `<a href="${safeUrl}" style="display: inline-block; background: #B45309; color: #FFFFFF; text-decoration: none; font-size: 14px; font-weight: 600; padding: 11px 20px; border-radius: 6px;">Open Job Listing &amp; Apply Now</a>`
          : ''
      }
    </div>
  `.trim();

  return { subject, bodyText, bodyHtml };
}

function buildPlainOrHtmlEmailHtml(bodyText: string): string {
  const escaped = escapeHtml(bodyText).replace(/\n/g, '<br />');
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.6; color: #18181B;">${escaped}</div>`;
}

async function sendViaGmailApi(
  accessToken: string,
  to: string,
  subject: string,
  bodyText: string,
  bodyHtml: string
): Promise<void> {
  const safeTo = stripHeaderControls(to);
  const safeSubject = stripHeaderControls(subject);
  const boundary = `radar_${crypto.randomBytes(8).toString('hex')}`;

  const mimeMessage = [
    `To: ${safeTo}`,
    `Subject: =?UTF-8?B?${Buffer.from(safeSubject, 'utf-8').toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(bodyText, 'utf-8').toString('base64'),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(bodyHtml, 'utf-8').toString('base64'),
    '',
    `--${boundary}--`,
  ].join('\r\n');

  const rawEncoded = Buffer.from(mimeMessage, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: rawEncoded }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gmail API returned ${res.status}: ${errText}`);
  }
}

async function sendViaSmtp(
  to: string,
  subject: string,
  bodyText: string,
  bodyHtml: string
): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.ALERT_FROM_EMAIL || user;

  if (!host || !user || !pass) {
    throw new Error('SMTP credentials not configured.');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to: stripHeaderControls(to),
    subject: stripHeaderControls(subject),
    text: bodyText,
    html: bodyHtml,
  });
}

export async function dispatchEmailRecord(params: {
  job: JobListing;
  toEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  kind: 'job-alert' | 'recruiter-outreach';
  gmailAccessToken?: string;
}): Promise<EmailAlertRecord> {
  const { job, toEmail, subject, bodyText, kind, gmailAccessToken } = params;
  const bodyHtml = params.bodyHtml ?? buildPlainOrHtmlEmailHtml(bodyText);
  const id = `email_${crypto.randomBytes(6).toString('hex')}`;
  const timestamp = new Date().toISOString();

  if (!isValidEmail(toEmail)) {
    return {
      id,
      jobId: job.id,
      jobTitle: job.title,
      company: job.company,
      toEmail,
      subject,
      bodyText,
      bodyHtml,
      kind,
      sentVia: 'dispatch-log',
      status: 'failed',
      timestamp,
      error: 'Invalid recipient email address.',
    };
  }

  if (gmailAccessToken) {
    try {
      await sendViaGmailApi(gmailAccessToken, toEmail, subject, bodyText, bodyHtml);
      return {
        id,
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        toEmail,
        subject,
        bodyText,
        bodyHtml,
        kind,
        sentVia: 'gmail-oauth',
        status: 'delivered',
        timestamp,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gmail dispatch failed';
      // Fall through to SMTP if configured, otherwise report error cleanly
      if (!isSmtpConfigured()) {
        return {
          id,
          jobId: job.id,
          jobTitle: job.title,
          company: job.company,
          toEmail,
          subject,
          bodyText,
          bodyHtml,
          kind,
          sentVia: 'gmail-oauth',
          status: 'failed',
          timestamp,
          error: msg,
        };
      }
    }
  }

  if (isSmtpConfigured()) {
    try {
      await sendViaSmtp(toEmail, subject, bodyText, bodyHtml);
      return {
        id,
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        toEmail,
        subject,
        bodyText,
        bodyHtml,
        kind,
        sentVia: 'smtp',
        status: 'delivered',
        timestamp,
      };
    } catch (err) {
      return {
        id,
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        toEmail,
        subject,
        bodyText,
        bodyHtml,
        kind,
        sentVia: 'smtp',
        status: 'failed',
        timestamp,
        error: err instanceof Error ? err.message : 'SMTP delivery failed',
      };
    }
  }

  // Neither Gmail OAuth session nor SMTP is active yet — record as queued/ready in dispatch ledger
  return {
    id,
    jobId: job.id,
    jobTitle: job.title,
    company: job.company,
    toEmail,
    subject,
    bodyText,
    bodyHtml,
    kind,
    sentVia: 'dispatch-log',
    status: 'ready',
    timestamp,
  };
}
