import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFOILStore } from '../../store/foilStore';
import { runConsistencyAudit } from '../../lib/api-client';
import { LoadingState } from '../../components/LoadingState';
import type { ConsistencyFinding } from '../../../../shared/types';
import { v4 as uuid } from 'uuid';

const ISSUE_LABELS: Record<ConsistencyFinding['issue_type'], string> = {
  cliche: 'Cliché',
  audience_mismatch: 'Audience Mismatch',
  contradiction: 'Contradiction',
  vague: 'Vague',
  bias: 'Bias',
};

const ISSUE_COLORS: Record<ConsistencyFinding['issue_type'], string> = {
  cliche:           'bg-yellow-100 text-yellow-800 border-yellow-200',
  audience_mismatch: 'bg-orange-100 text-orange-800 border-orange-200',
  contradiction:    'bg-red-100 text-red-800 border-red-200',
  vague:            'bg-purple-100 text-purple-800 border-purple-200',
  bias:             'bg-pink-100 text-pink-800 border-pink-200',
};

function ConsistencyFindingCard({
  finding,
  onAction,
}: {
  finding: ConsistencyFinding;
  onAction: (action: ConsistencyFinding['user_action']) => void;
}) {
  const resolved = finding.user_action !== null;

  return (
    <article
      className={[
        'border rounded-md overflow-hidden transition-all duration-200',
        resolved ? 'border-border opacity-70' : 'border-red-200',
      ].join(' ')}
      aria-label={`Consistency finding: ${finding.issue_type} — ${finding.fields_in_conflict.join(' vs ')}`}
    >
      <div className={`px-4 py-2 flex items-center gap-2 flex-wrap ${resolved ? 'bg-surface-100' : 'bg-red-50'}`}>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${ISSUE_COLORS[finding.issue_type]}`}>
          {ISSUE_LABELS[finding.issue_type]}
        </span>
        <span className="text-xs text-ink-600">
          Conflicting:{' '}
          <strong className="text-ink-950">
            {finding.fields_in_conflict.map(f => f.replace(/_/g, ' ')).join(' ↔ ')}
          </strong>
        </span>
        {resolved && (
          <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded ${finding.user_action === 'accept' ? 'bg-green-100 text-green-700' : finding.user_action === 'reject' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
            {finding.user_action === 'accept' ? '✓ Accepted' : finding.user_action === 'reject' ? '✕ Rejected' : '✎ Edit requested'}
          </span>
        )}
      </div>

      <div className="p-4 space-y-4">
        <div>
          <p className="section-label mb-1">Evidence</p>
          <blockquote className="text-sm text-ink-700 border-l-2 border-red-300 pl-3 italic leading-relaxed">
            {finding.evidence}
          </blockquote>
        </div>

        <div>
          <p className="section-label mb-1">Why it matters</p>
          <p className="text-sm text-ink-700 leading-relaxed">{finding.why_it_matters}</p>
        </div>

        <div className="p-3 bg-accent-100 border border-accent-600/20 rounded-sm">
          <p className="section-label text-accent-600 mb-1">Sharper Alternative</p>
          <p className="text-sm text-ink-950 font-medium leading-relaxed">{finding.sharper_alternative}</p>
        </div>

        {!resolved && (
          <div
            className="flex gap-2 flex-wrap pt-1"
            role="group"
            aria-label={`Actions for consistency finding`}
          >
            <button
              id={`btn-accept-cf-${finding.id}`}
              onClick={() => onAction('accept')}
              className="btn-primary text-xs px-3 py-2"
              aria-label="Accept this finding — acknowledge the conflict and apply the alternative"
            >
              ✓ Accept
            </button>
            <button
              id={`btn-edit-cf-${finding.id}`}
              onClick={() => onAction('edit')}
              className="btn-secondary text-xs px-3 py-2"
              aria-label="Mark for editing"
            >
              ✎ Edit
            </button>
            <button
              id={`btn-reject-cf-${finding.id}`}
              onClick={() => onAction('reject')}
              className="btn-danger text-xs px-3 py-2"
              aria-label="Reject this finding — mark as not applicable"
            >
              ✕ Reject
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export function ConsistencyAuditStage() {
  const store = useFOILStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(store.ctx.consistency_findings.length > 0);

  const navigate = useNavigate();
  const findings = store.ctx.consistency_findings;
  const launchApproved = !!store.ctx.approved_decisions['launch_prep'];
  const unresolvedFindings = findings.filter(f => f.user_action === null);
  const unresolvedCount = unresolvedFindings.length;
  const allResolved = hasRun && unresolvedCount === 0;
  const exportBlocked = hasRun && unresolvedCount > 0;

  async function handleRunAudit() {
    if (!launchApproved) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await runConsistencyAudit({
        approved_decisions: store.ctx.approved_decisions,
        context: store.ctx,
      });
      const withIds: ConsistencyFinding[] = result.findings.map(f => ({ ...f, id: f.id ?? uuid() }));
      store.setConsistencyFindings(withIds);
      setHasRun(true);
    } catch {
      setError('Audit failed. Your approved decisions are safe — the audit has not been applied. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <article aria-labelledby="audit-heading" className="space-y-6">
      <header>
        <p className="section-label mb-1">Stage 8</p>
        <h1 id="audit-heading" className="text-h1 font-bold text-ink-950">Holistic Consistency Audit</h1>
        <p className="text-body text-ink-500 mt-1.5">
          IdeaToBrand AI checks the complete approved brand system as one connected whole — not field by field.
          All findings must be resolved before you can export the brand kit.
        </p>
      </header>

      {!launchApproved && (
        <div
          className="p-4 bg-amber-50 border border-amber-200 rounded-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start gap-2">
            <span className="text-amber-600 mt-0.5" aria-hidden="true">⚠</span>
            <p className="text-sm text-amber-800">
              <strong>Launch Prep must be approved</strong> before the Consistency Audit can run.
              Complete and approve Stage 7 first.
            </p>
          </div>
          <button
            id="btn-goto-launch-prep"
            onClick={() => {
              store.setCurrentStage('launch_prep');
              navigate('/launch-prep');
            }}
            className="btn-primary text-xs shrink-0 whitespace-nowrap"
          >
            Go to Launch Prep →
          </button>
        </div>
      )}

      {launchApproved && !hasRun && !isLoading && (
        <div className="card p-10 flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-accent-100 flex items-center justify-center text-accent-600 text-xl">⟳</div>
          <div>
            <h2 className="text-h3 font-semibold text-ink-950 mb-1">Ready to audit</h2>
            <p className="text-sm text-ink-500 max-w-sm">
              IdeaToBrand AI will check your entire approved brand system for contradictions, vague claims,
              audience mismatches, and consistency gaps.
            </p>
          </div>
          <button
            id="btn-run-audit"
            onClick={handleRunAudit}
            className="btn-primary"
            aria-label="Run Holistic Consistency Audit"
          >
            Run Consistency Audit
          </button>
        </div>
      )}

      {isLoading && <LoadingState stage="consistency_audit" />}

      {error && !isLoading && (
        <div className="card border-red-200 p-6 space-y-3 text-center" role="alert" aria-live="assertive">
          <p className="text-red-700 font-semibold">Audit Failed</p>
          <p className="text-sm text-ink-700">{error}</p>
          <button id="btn-retry-audit" onClick={handleRunAudit} className="btn-primary">Try Again</button>
        </div>
      )}

      {hasRun && !isLoading && (
        <div className="space-y-5">
          {/* Summary banner */}
          <div
            className={`p-4 rounded-md border flex items-start gap-3 ${allResolved ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}
            role="status"
            aria-live="polite"
          >
            <span
              className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mt-0.5 ${allResolved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}
              aria-hidden="true"
            >
              {allResolved ? '\u2713' : '!'}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm ${allResolved ? 'text-green-800' : 'text-amber-800'}`}>
                {findings.length === 0
                  ? 'Brand system is fully consistent \u2014 no issues found.'
                  : allResolved
                  ? `All ${findings.length} finding${findings.length > 1 ? 's' : ''} resolved \u2014 ready for Kit Assembly.`
                  : `${unresolvedCount} of ${findings.length} finding${findings.length > 1 ? 's' : ''} unresolved`}
              </p>
              {!allResolved && findings.length > 0 && (
                <p className="text-xs text-amber-700 mt-0.5">
                  Resolve all findings before export. Export is blocked while required findings remain open.
                </p>
              )}
            </div>
          </div>

          {allResolved && (
            <div className="card p-5 bg-green-50 border border-green-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-bold text-green-900 text-sm">Audit Complete &amp; Brand System Consistent</p>
                <p className="text-xs text-green-700 mt-0.5">All conflicts have been addressed. You can now finalize your Brand Kit and Export.</p>
              </div>
              <button
                id="btn-approve-audit-proceed"
                onClick={() => {
                  if (!store.ctx.approved_decisions['consistency_audit']) {
                    store.writeApprovedDecision(
                      'consistency_audit',
                      {
                        resolved: true,
                        findings_count: findings.length,
                        timestamp: new Date().toISOString(),
                      },
                      'user_edit',
                      uuid()
                    );
                  }
                  store.setCurrentStage('kit_export');
                  navigate('/export');
                }}
                className="btn-primary text-xs sm:text-sm py-2.5 px-5 font-semibold shrink-0 shadow-sm"
              >
                Approve Audit &amp; Proceed to Export →
              </button>
            </div>
          )}

          {/* ── Export block ─────────────────────────────────────────────────── */}
          {exportBlocked && (
            <div
              className="p-4 bg-red-50 border border-red-300 rounded-md flex items-start gap-3"
              role="alert"
              aria-label="Export blocked"
            >
              <span className="text-red-500 text-lg mt-0.5" aria-hidden="true">⛔</span>
              <div>
                <p className="font-semibold text-red-800 text-sm">Export is blocked</p>
                <p className="text-xs text-red-700 mt-0.5">
                  {unresolvedCount} consistency finding{unresolvedCount > 1 ? 's' : ''} must be resolved before you can export the Brand Kit.
                  Accept, edit, or reject each finding below.
                </p>
              </div>
            </div>
          )}

          {/* ── Findings list ─────────────────────────────────────────────────── */}
          {findings.length > 0 && (
            <section aria-labelledby="findings-list-heading">
              <h2 id="findings-list-heading" className="text-h3 font-semibold text-ink-950 mb-3">
                Findings
                {unresolvedCount > 0 && (
                  <span className="ml-2 text-xs font-normal text-amber-700">
                    {unresolvedCount} unresolved
                  </span>
                )}
              </h2>
              <div className="space-y-4">
                {findings.map(f => (
                  <ConsistencyFindingCard
                    key={f.id}
                    finding={f}
                    onAction={action => store.actOnConsistencyFinding(f.id, action)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Re-run option */}
          <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
            <p className="text-xs text-ink-500">
              Re-running replaces current findings with a fresh audit pass.
            </p>
            <button
              id="btn-rerun-audit"
              onClick={handleRunAudit}
              className="btn-secondary text-xs flex-shrink-0"
              aria-label="Re-run the Consistency Audit"
            >
              ⟳ Re-run Audit
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
