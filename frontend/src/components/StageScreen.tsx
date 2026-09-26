/**
 * StageScreen — reusable stage screen container (T-012).
 * Supports: title, context, AI draft, loading, error, critic findings,
 * approve/reject/edit, regenerate, needs_review — all states visually distinct.
 *
 * design.md § 12 — "Stage Screen Anatomy"
 */
import { type ReactNode } from 'react';
import type { StageName, ApprovalState, CriticFinding, StageErrorResponse } from '../../../shared/types';
import { CriticFindingCard } from './CriticFindingCard';
import { ApprovalBar } from './ApprovalBar';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { NeedsReviewBanner } from './NeedsReviewBanner';

interface StageScreenProps {
  /** Stage identifier */
  stage: StageName;
  /** Stage number (1-based display) */
  stageNumber: number;
  /** Stage display title */
  title: string;
  /** Short explanation shown below title */
  description: string;
  /** Current approval state */
  approvalState: ApprovalState;
  /** Is the stage currently generating/loading */
  isLoading: boolean;
  /** Error from a failed generation */
  error: StageErrorResponse | null;
  /** Critic findings for this stage */
  findings: CriticFinding[];
  /** Main draft content area */
  children: ReactNode;
  /** Called when user clicks Approve */
  onApprove: () => void;
  /** Called when user clicks Reject */
  onReject: () => void;
  /** Called when user clicks Regenerate or Try Again */
  onRegenerate: () => void;
  /** Called when a finding action is taken */
  onFindingAction: (findingId: string, action: CriticFinding['user_action']) => void;
  /** Called to start editing the current draft */
  onEdit?: () => void;
  /** Optional: label for upstream stage that triggered needs_review */
  needsReviewCause?: string;
  /** Whether approve button should be disabled */
  approveDisabled?: boolean;
}

/** Stage status badge — design.md § 3.1 */
function StateBadge({ state }: { state: ApprovalState }) {
  const configs: Record<ApprovalState, { label: string; className: string; icon: string }> = {
    draft:          { label: 'AI Draft',        className: 'badge-draft',        icon: '✦' },
    critic_review:  { label: 'Critic Review',   className: 'badge-critic',       icon: '⟳' },
    needs_revision: { label: 'Needs Revision',  className: 'badge-needs-review', icon: '⚠' },
    needs_review:   { label: 'Needs Review',    className: 'badge-needs-review', icon: '⚠' },
    approved:       { label: 'Approved',        className: 'badge-approved',     icon: '✓' },
    rejected:       { label: 'Rejected',        className: 'badge-rejected',     icon: '✕' },
    failed:         { label: 'Failed',          className: 'badge-failed',       icon: '✕' },
  };
  const { label, className, icon } = configs[state];
  return (
    <span className={className} role="status" aria-live="polite">
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}

export function StageScreen({
  stage,
  stageNumber,
  title,
  description,
  approvalState,
  isLoading,
  error,
  findings,
  children,
  onApprove,
  onReject,
  onRegenerate,
  onFindingAction,
  onEdit,
  needsReviewCause,
  approveDisabled = false,
}: StageScreenProps) {
  const pendingFindings = findings.filter((f) => f.user_action === null);
  const hasBlockingFindings = pendingFindings.length > 0;

  return (
    <article aria-labelledby={`stage-${stage}-heading`} className="space-y-6">
      {/* ─── Stage header ─────────────────────────────────────────────── */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="section-label mb-1">Stage {stageNumber}</p>
          <h1
            id={`stage-${stage}-heading`}
            className="text-h1 text-ink-950 font-bold"
          >
            {title}
          </h1>
          <p className="mt-1.5 text-body text-ink-500">{description}</p>
        </div>
        <StateBadge state={approvalState} />
      </header>

      {/* ─── Needs review banner ───────────────────────────────────────── */}
      {approvalState === 'needs_review' && needsReviewCause && (
        <NeedsReviewBanner cause={needsReviewCause} onReview={onRegenerate} />
      )}

      {/* ─── Loading state ─────────────────────────────────────────────── */}
      {isLoading && <LoadingState stage={stage} />}

      {/* ─── Error state ──────────────────────────────────────────────── */}
      {!isLoading && error && (
        <ErrorState error={error} onRetry={onRegenerate} />
      )}

      {/* ─── Draft content ─────────────────────────────────────────────── */}
      {!isLoading && !error && approvalState !== 'draft' && (
        <>
          {/* AI draft label */}
          {approvalState !== 'approved' && (
            <div className="flex items-center gap-2 mb-0">
              <span className="text-xs text-accent-600 font-semibold uppercase tracking-wider">✦ AI Draft</span>
              <span className="text-xs text-ink-500">Generated from approved context</span>
            </div>
          )}

          {/* Approved label */}
          {approvalState === 'approved' && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
              <span className="text-green-700 font-semibold text-sm">✓ Approved by you</span>
            </div>
          )}

          {/* Draft content area */}
          <div
            className={[
              'card p-6 transition-all duration-200',
              approvalState === 'approved' ? 'border-green-200 bg-green-50/30' : '',
              approvalState === 'needs_review' ? 'border-amber-200 bg-amber-50/30' : '',
              approvalState === 'rejected' ? 'border-red-200 opacity-60' : '',
            ].join(' ')}
          >
            {children}
          </div>

          {/* ─── Critic findings ──────────────────────────────────────── */}
          {findings.length > 0 && (
            <section aria-label="Critic findings">
              <h2 className="text-h3 text-ink-950 mb-3">
                Critic Findings
                {hasBlockingFindings && (
                  <span className="ml-2 badge-critic text-xs">{pendingFindings.length} unresolved</span>
                )}
              </h2>
              <div className="space-y-3">
                {findings.map((finding) => (
                  <CriticFindingCard
                    key={finding.id}
                    finding={finding}
                    onAction={(action) => onFindingAction(finding.id, action)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ─── Approval bar ─────────────────────────────────────────── */}
          {approvalState !== 'approved' && (
            <ApprovalBar
              approvalState={approvalState}
              hasBlockingFindings={hasBlockingFindings}
              approveDisabled={approveDisabled}
              onApprove={onApprove}
              onReject={onReject}
              onRegenerate={onRegenerate}
              onEdit={onEdit}
            />
          )}

          {/* ─── Edit-approved controls ───────────────────────────────── */}
          {approvalState === 'approved' && (
            <div className="flex items-center gap-3 pt-2">
              {onEdit && (
                <button
                  id={`btn-edit-approved-${stage}`}
                  onClick={onEdit}
                  className="btn-secondary text-xs"
                  aria-label="Edit this approved decision — downstream stages may need review"
                >
                  Edit Decision
                </button>
              )}
              <p className="text-xs text-ink-500">
                Editing will mark dependent stages for review.
              </p>
            </div>
          )}
        </>
      )}

      {/* ─── Empty / not-yet-generated state ──────────────────────────── */}
      {!isLoading && !error && approvalState === 'draft' && (
        <div className="card p-10 flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-accent-100 flex items-center justify-center text-accent-600 text-xl">
            ✦
          </div>
          <div>
            <h2 className="text-h3 text-ink-950 font-semibold mb-1">Ready to generate</h2>
            <p className="text-body text-ink-500 max-w-sm">
              FOIL will generate a strategic draft for this stage and send it through the Critic.
            </p>
          </div>
          <button
            id={`btn-generate-${stage}`}
            onClick={onRegenerate}
            className="btn-primary"
            aria-label={`Generate ${title}`}
          >
            Generate {title}
          </button>
        </div>
      )}
    </article>
  );
}
