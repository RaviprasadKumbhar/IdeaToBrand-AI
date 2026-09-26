/**
 * ApprovalBar — explicit Approve / Edit / Reject / Regenerate / Review Required controls (T-013).
 * design.md § 22 — "Approval UX"
 * INVARIANT: Approve button is only enabled after findings are resolved or user explicitly overrides.
 * SUCCESS must NEVER be shown before the operation succeeds.
 */
import type { ApprovalState } from '../../../shared/types';

interface ApprovalBarProps {
  approvalState: ApprovalState;
  hasBlockingFindings: boolean;
  approveDisabled: boolean;
  onApprove: () => void;
  onReject: () => void;
  onRegenerate: () => void;
  onEdit?: () => void;
}

export function ApprovalBar({
  approvalState,
  hasBlockingFindings,
  approveDisabled,
  onApprove,
  onReject,
  onRegenerate,
  onEdit,
}: ApprovalBarProps) {
  const canApprove = !approveDisabled && !hasBlockingFindings;
  const showFindingsWarning = hasBlockingFindings;

  return (
    <section
      className="border border-border rounded-md p-4 bg-surface-100"
      aria-label="Decision panel"
      role="region"
    >
      <p className="section-label mb-3">Decision</p>

      {/* Findings warning — never hide this */}
      {showFindingsWarning && (
        <div
          className="mb-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-sm text-sm text-amber-800"
          role="alert"
          aria-live="polite"
        >
          <span aria-hidden="true">⚠</span>
          <span>
            Resolve all Critic findings before approving, or approve despite them (findings will be retained for audit).
          </span>
        </div>
      )}

      <p className="text-sm text-ink-700 mb-4">
        {approvalState === 'needs_revision'
          ? 'The Critic flagged issues with this draft. Review findings before approving.'
          : approvalState === 'needs_review'
          ? 'An upstream change may affect this stage. Review before re-approving.'
          : 'Current draft is ready for your review.'}
      </p>

      <div className="flex flex-wrap gap-3">
        {/* APPROVE — primary, explicit action required */}
        <button
          id="btn-approve"
          onClick={onApprove}
          disabled={!canApprove}
          className={[
            'btn-primary',
            !canApprove ? 'opacity-50 cursor-not-allowed' : '',
          ].join(' ')}
          aria-label={canApprove ? 'Approve this draft' : 'Resolve findings before approving'}
          aria-disabled={!canApprove}
          title={!canApprove && showFindingsWarning ? 'Resolve Critic findings first' : undefined}
        >
          ✓ Approve
        </button>

        {/* Approve despite findings — only shown when there are findings */}
        {showFindingsWarning && (
          <button
            id="btn-approve-override"
            onClick={onApprove}
            className="btn-secondary text-sm"
            aria-label="Approve despite unresolved findings (findings will be retained)"
          >
            Approve Anyway
          </button>
        )}

        {/* EDIT */}
        {onEdit && (
          <button
            id="btn-edit"
            onClick={onEdit}
            className="btn-secondary"
            aria-label="Edit the current draft"
          >
            Edit
          </button>
        )}

        {/* REGENERATE */}
        <button
          id="btn-regenerate"
          onClick={onRegenerate}
          className="btn-secondary"
          aria-label="Regenerate this stage"
        >
          ⟳ Regenerate
        </button>

        {/* REJECT */}
        <button
          id="btn-reject"
          onClick={onReject}
          className="btn-danger"
          aria-label="Reject this draft"
        >
          ✕ Reject
        </button>
      </div>
    </section>
  );
}
