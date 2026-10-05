/**
 * Whether a partner's explanation is enough to cancel a deal they had
 * already confirmed. A short note still records the cancellation and flags
 * it, but it is not enough to keep the account approved.
 */
export const MIN_WITHDRAWAL_EVIDENCE_CHARS = 80;
export const MIN_WITHDRAWAL_EVIDENCE_WORDS = 8;

export const INSUFFICIENT_WITHDRAWAL_HOLD = 'insufficient_withdrawal_evidence';

export const WITHDRAWAL_WARNING_SUFFICIENT =
  'This confirmed deal was cancelled after it was already approved. The explanation is on file. Cancelling another approved deal without a full explanation will put this account back on pending approval.';

export const WITHDRAWAL_WARNING_INSUFFICIENT =
  'There is not enough evidence for cancelling a deal that was already approved. This account is now pending approval and stays that way until a fuller explanation is provided.';

export interface WithdrawalEvidenceAssessment {
  sufficient: boolean;
  warning: string;
}

export function assessWithdrawalEvidence(text: string | null | undefined): WithdrawalEvidenceAssessment {
  const trimmed = (text ?? '').trim().replace(/\s+/g, ' ');
  const words = trimmed.length === 0 ? [] : trimmed.split(' ');
  const sufficient = trimmed.length >= MIN_WITHDRAWAL_EVIDENCE_CHARS && words.length >= MIN_WITHDRAWAL_EVIDENCE_WORDS;
  return {
    sufficient,
    warning: sufficient ? WITHDRAWAL_WARNING_SUFFICIENT : WITHDRAWAL_WARNING_INSUFFICIENT,
  };
}
