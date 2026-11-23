import { Mail, X } from 'lucide-react';

export interface PendingEmailConfirmation {
  jobId: string;
  toEmail: string;
  subject: string;
  body: string;
  kind: 'job-alert' | 'recruiter-outreach';
  jobTitle: string;
  company: string;
}

interface ConfirmEmailModalProps {
  pending: PendingEmailConfirmation | null;
  sending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmEmailModal({
  pending,
  sending,
  onConfirm,
  onCancel,
}: ConfirmEmailModalProps) {
  if (!pending) return null;

  const isOutreach = pending.kind === 'recruiter-outreach';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-email-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4"
    >
      <div className="w-full max-w-lg bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <div className="flex items-center gap-2.5">
            <Mail className="w-4 h-4 text-amber-700" />
            <h2 id="confirm-email-title" className="text-base font-semibold text-stone-900">
              {isOutreach ? 'Confirm Application Email Dispatch' : 'Confirm Job Alert Email'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={sending}
            aria-label="Close dialog"
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-sm text-stone-700">
          <p className="leading-relaxed">
            {isOutreach
              ? `You are about to send a direct first-applicant email for ${pending.jobTitle} at ${pending.company} through your connected Google account.`
              : `You are about to send an instant job match alert for ${pending.jobTitle} at ${pending.company}.`}
          </p>

          <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 space-y-2">
            <div className="flex items-baseline gap-2 text-xs">
              <span className="font-semibold text-stone-500 w-16 shrink-0">Recipient</span>
              <span className="font-mono text-stone-900 break-all">{pending.toEmail}</span>
            </div>
            <div className="flex items-baseline gap-2 text-xs">
              <span className="font-semibold text-stone-500 w-16 shrink-0">Subject</span>
              <span className="text-stone-900 font-medium">{pending.subject}</span>
            </div>
            <div className="pt-2 border-t border-stone-200">
              <pre className="whitespace-pre-wrap font-sans text-xs text-stone-600 max-h-44 overflow-y-auto leading-relaxed">
                {pending.body}
              </pre>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-stone-50 border-t border-stone-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={sending}
            className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={sending}
            className="px-4 py-2 text-sm font-semibold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {sending ? 'Sending Email...' : 'Send Email Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
