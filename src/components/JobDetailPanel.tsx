import { useEffect, useState } from 'react';
import {
  BellRing,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Mail,
  MessageSquare,
  Phone,
  Sparkles,
} from 'lucide-react';
import type { JobListing } from '../types/jobs.ts';
import type { PendingEmailConfirmation } from './ConfirmEmailModal.tsx';
import {
  computeTimeDifferenceMinutes,
  formatDelayMinutes,
  formatDubaiTimestamp,
} from '../utils/timeMetrics.ts';

interface JobDetailPanelProps {
  job: JobListing | null;
  recipientEmail: string;
  gmailConnected: boolean;
  onToggleApplied: (id: string, applied: boolean) => void;
  onGenerateDraft: (id: string) => Promise<{ subject: string; body: string; whatsappMessage: string }>;
  onRequestSendEmail: (pending: PendingEmailConfirmation) => void;
  onSendInstantAlert: (job: JobListing) => void;
}

export function JobDetailPanel({
  job,
  recipientEmail,
  gmailConnected,
  onToggleApplied,
  onGenerateDraft,
  onRequestSendEmail,
  onSendInstantAlert,
}: JobDetailPanelProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');

  useEffect(() => {
    setDraftError(null);
    if (job?.outreachDraft) {
      setSubject(job.outreachDraft.subject);
      setBody(job.outreachDraft.body);
      setWhatsappMessage(job.outreachDraft.whatsappMessage);
    } else {
      setSubject('');
      setBody('');
      setWhatsappMessage('');
    }
  }, [job?.id, job?.outreachDraft]);

  const copyText = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // Clipboard fallback ignored
    }
  };

  if (!job) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-8 text-center space-y-2">
        <p className="text-sm font-medium text-stone-800">Select a Dubai Hospitality Listing</p>
        <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
          Click any job on the left to inspect recruiter email &amp; phone contacts, review CV alignment
          against Dipti’s 12-year luxury hotel experience, and send a first-applicant application.
        </p>
      </div>
    );
  }

  const handleDraft = async () => {
    setDrafting(true);
    setDraftError(null);
    try {
      const draft = await onGenerateDraft(job.id);
      setSubject(draft.subject);
      setBody(draft.body);
      setWhatsappMessage(draft.whatsappMessage);
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Unable to draft outreach.');
    } finally {
      setDrafting(false);
    }
  };

  const whatsappNumber = (job.recruiter.whatsapp || job.recruiter.phone || '').replace(/[^\d]/g, '');
  const mailtoUrl = job.recruiter.email
    ? `mailto:${encodeURIComponent(job.recruiter.email)}?subject=${encodeURIComponent(
        subject || `Application: ${job.title} — Dipti Basu Mondal`
      )}&body=${encodeURIComponent(body || '')}`
    : null;

  return (
    <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-200">
      {/* Header & Direct Actions */}
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="text-xs font-medium text-amber-800">
              {job.category} · {job.platform}
            </div>
            <h2 className="font-serif text-2xl font-bold text-stone-900 leading-snug">
              {job.title}
            </h2>
            <div className="text-sm font-medium text-stone-700">
              {job.company} · {job.location}
            </div>
            <div className="text-xs text-stone-500 font-mono tabular-nums">
              {job.postedAtText} · {job.matchScore}% CV match
              {job.salaryOrPackage ? ` · ${job.salaryOrPackage}` : ''}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onToggleApplied(job.id, !job.applied)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                job.applied
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{job.applied ? 'Applied' : 'Mark Applied'}</span>
            </button>

            <button
              type="button"
              onClick={() => onSendInstantAlert(job)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title={`Send alert email to ${recipientEmail}`}
            >
              <BellRing className="w-3.5 h-3.5 text-amber-700" />
              <span>Alert My Email</span>
            </button>

            {job.sourceUrl && (
              <a
                href={job.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <span>Open Listing</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        <p className="text-sm text-stone-700 leading-relaxed">{job.summary}</p>

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
          const diffLabel = formatDelayMinutes(diffMins, job.postedTimePrecision ?? 'exact');

          return (
            <div className="bg-stone-50 border border-stone-200 rounded-lg divide-y divide-stone-200">
              {job.sourceUrl && (
                <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium text-stone-500">
                      Direct Job Application Link
                    </div>
                    <a
                      href={job.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-amber-800 hover:underline truncate block"
                    >
                      {job.sourceUrl}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText('applyUrl', job.sourceUrl)}
                    className="p-1.5 text-stone-500 hover:text-stone-900 rounded transition-colors shrink-0 cursor-pointer"
                    aria-label="Copy job application link"
                  >
                    {copiedKey === 'applyUrl' ? (
                      <Check className="w-4 h-4 text-emerald-700" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-3.5 py-2.5 text-xs">
                <div>
                  <div className="text-[11px] text-stone-500">Job Posted Time</div>
                  <div className="font-mono text-stone-900 tabular-nums mt-0.5">{postedLabel}</div>
                </div>
                <div>
                  <div className="text-[11px] text-stone-500">Sent / Received Time</div>
                  <div className="font-mono text-stone-900 tabular-nums mt-0.5">{sentLabel}</div>
                </div>
                <div>
                  <div className="text-[11px] text-stone-500">Time Difference (Minutes)</div>
                  <div
                    className={`font-mono font-semibold tabular-nums mt-0.5 ${
                      diffMins !== null && diffMins <= 60 ? 'text-emerald-700' : 'text-amber-800'
                    }`}
                  >
                    {diffLabel}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Captured Recruiter Contact Intelligence */}
      <div className="p-6 space-y-3 bg-stone-50/50">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold text-stone-900 uppercase tracking-wider">
            Recruiter Contact Captured
          </h3>
          <span className="text-xs text-stone-500">
            {job.recruiter.contactConfidence === 'verified'
              ? 'Email & Phone Extracted'
              : job.recruiter.contactConfidence === 'extracted'
              ? 'Direct Contact Extracted'
              : 'Apply via Listing Portal'}
          </span>
        </div>

        {job.recruiter.email || job.recruiter.phone || job.recruiter.name ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {job.recruiter.name && (
              <div className="p-3 bg-white border border-stone-200 rounded-lg">
                <div className="text-[11px] text-stone-500">Hiring Contact</div>
                <div className="text-sm font-medium text-stone-900 mt-0.5">
                  {job.recruiter.name}
                </div>
                {job.recruiter.title && (
                  <div className="text-xs text-stone-500">{job.recruiter.title}</div>
                )}
              </div>
            )}

            {job.recruiter.email && (
              <div className="p-3 bg-white border border-stone-200 rounded-lg flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] text-stone-500">Recruiter Email</div>
                  <div className="font-mono text-xs font-medium text-stone-900 truncate mt-0.5">
                    {job.recruiter.email}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyText('email', job.recruiter.email!)}
                  className="p-1.5 text-stone-500 hover:text-stone-900 rounded transition-colors shrink-0 cursor-pointer"
                  aria-label="Copy recruiter email"
                >
                  {copiedKey === 'email' ? (
                    <Check className="w-4 h-4 text-emerald-700" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            )}

            {(job.recruiter.phone || job.recruiter.whatsapp) && (
              <div className="p-3 bg-white border border-stone-200 rounded-lg flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] text-stone-500">Phone / WhatsApp</div>
                  <div className="font-mono text-xs font-medium text-stone-900 tabular-nums mt-0.5">
                    {job.recruiter.phone || job.recruiter.whatsapp}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      copyText('phone', (job.recruiter.phone || job.recruiter.whatsapp)!)
                    }
                    className="p-1.5 text-stone-500 hover:text-stone-900 rounded transition-colors cursor-pointer"
                    aria-label="Copy recruiter phone"
                  >
                    {copiedKey === 'phone' ? (
                      <Check className="w-4 h-4 text-emerald-700" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  {whatsappNumber.length >= 8 && (
                    <a
                      href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                        whatsappMessage ||
                          `Hello${
                            job.recruiter.name ? ` ${job.recruiter.name}` : ''
                          }, I am Dipti Basu Mondal, a Luxury Hotel Restaurant & Banquet Manager (12 yrs exp, currently in Dubai). Applying for ${
                            job.title
                          } at ${job.company}.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors whitespace-nowrap"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-stone-600 leading-relaxed">
            No public email or phone number was included in this post’s snippet. Use the direct listing
            link above to submit first-applicant details, or paste the full post text in the inspector
            if more contact details appear behind login.
          </p>
        )}
      </div>

      {/* CV Alignment & Requirements */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold text-stone-900 uppercase tracking-wider">
            Alignment With Dipti’s CV
          </h3>
          <ul className="space-y-1.5 text-xs text-stone-700 leading-relaxed list-disc pl-4">
            {job.matchReasons.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold text-stone-900 uppercase tracking-wider">
            Key Role Requirements
          </h3>
          {job.requirements.length > 0 ? (
            <ul className="space-y-1.5 text-xs text-stone-600 leading-relaxed list-disc pl-4">
              {job.requirements.map((req, idx) => (
                <li key={idx}>{req}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-stone-500">
              View full requirements directly on {job.platform}.
            </p>
          )}
        </div>
      </div>

      {/* First-Applicant Outreach Studio */}
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-stone-900">
              First-Applicant Outreach Draft
            </h3>
            <p className="text-xs text-stone-500">
              Tailors Dipti’s Taj, St. Regis, Westin Mina Seyahi &amp; WSET Level 2 profile to this exact role.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDraft}
            disabled={drafting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-900 bg-stone-100 hover:bg-stone-200 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>{drafting ? 'Writing Tailored Pitch...' : body ? 'Regenerate Pitch' : 'Generate Tailored Pitch'}</span>
          </button>
        </div>

        {draftError && <p className="text-xs text-red-700">{draftError}</p>}

        {(subject || body) && (
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Email Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:bg-white focus:border-amber-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Application Message
              </label>
              <textarea
                rows={7}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg text-stone-900 leading-relaxed focus:bg-white focus:border-amber-700 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {job.recruiter.email && (
                <button
                  type="button"
                  onClick={() =>
                    onRequestSendEmail({
                      jobId: job.id,
                      toEmail: job.recruiter.email!,
                      subject,
                      body,
                      kind: 'recruiter-outreach',
                      jobTitle: job.title,
                      company: job.company,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>
                    {gmailConnected
                      ? `Send via Gmail to ${job.recruiter.email}`
                      : `Queue & Send to ${job.recruiter.email}`}
                  </span>
                </button>
              )}

              {mailtoUrl && (
                <a
                  href={mailtoUrl}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Open in Mail App</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => copyText('pitch', `${subject}\n\n${body}`)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copiedKey === 'pitch' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Copied Pitch</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Email</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Grounding Verification Links */}
        {job.groundingLinks && job.groundingLinks.length > 0 && (
          <div className="pt-3 border-t border-stone-100">
            <div className="text-[11px] font-medium text-stone-500 mb-1.5">
              Verified Web Grounding Sources
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {job.groundingLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-amber-800 hover:underline"
                >
                  <span className="truncate max-w-[260px]">{link.title}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
