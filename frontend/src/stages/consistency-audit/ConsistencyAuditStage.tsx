/**
 * ConsistencyAuditStage — Stage 8 (design.md § 26).
 * Holistic audit runs over the complete approved brand system.
 * All findings must be resolved before export.
 * Sub-state-machine: pending → findings_ready → user_reviewing → resolved.
 */
import { useState } from 'react';
import { useFOILStore } from '../../store/foilStore';
import { runConsistencyAudit } from '../../lib/api-client';
import { LoadingState } from '../../components/LoadingState';
import type { ConsistencyFinding } from '../../../../shared/types';
import { v4 as uuid } from 'uuid';

const ISSUE_LABELS: Record<ConsistencyFinding['issue_type'], string> = {
  cliche: 'Cliché', audience_mismatch: 'Audience Mismatch',
  contradiction: 'Contradiction', vague: 'Vague', bias: 'Bias',
};

function ConsistencyFindingCard({ finding, onAction }: { finding: ConsistencyFinding; onAction: (action: ConsistencyFinding['user_action']) => void }) {
  const resolved = finding.user_action !== null;
  return (
    <article className={`border rounded-md p-4 space-y-3 ${resolved ? 'opacity-60 border-border' : 'border-red-200 bg-red-50/30'}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="badge bg-red-100 text-red-700 border border-red-200">{ISSUE_LABELS[finding.issue_type]}</span>
        <span className="text-sm text-ink-700">
          Fields in conflict: <strong>{finding.fields_in_conflict.join(' ↔ ')}</strong>
        </span>
        {resolved && <span className="badge-approved text-[10px] ml-auto">{finding.user_action}</span>}
      </div>
      <div>
        <p className="section-label mb-1">Evidence</p>
        <blockquote className="text-sm text-ink-700 border-l-2 border-red-300 pl-3 italic">{finding.evidence}</blockquote>
      </div>
      <div>
        <p className="section-label mb-1">Why it matters</p>
        <p className="text-sm text-ink-700">{finding.why_it_matters}</p>
      </div>
      <div className="p-3 bg-accent-100 border border-accent-600/20 rounded-sm">
        <p className="section-label text-accent-600 mb-1">Sharper Alternative</p>
        <p className="text-sm text-ink-950 font-medium">{finding.sharper_alternative}</p>
      </div>
      {!resolved && (
        <div className="flex gap-2 flex-wrap" role="group" aria-label="Consistency finding actions">
          <button id={`btn-accept-cf-${finding.id}`} onClick={() => onAction('accept')} className="btn-primary text-xs px-3 py-2">Accept</button>
          <button id={`btn-edit-cf-${finding.id}`} onClick={() => onAction('edit')} className="btn-secondary text-xs px-3 py-2">Edit</button>
          <button id={`btn-reject-cf-${finding.id}`} onClick={() => onAction('reject')} className="btn-danger text-xs px-3 py-2">Reject</button>
        </div>
      )}
    </article>
  );
}

export function ConsistencyAuditStage() {
  const store = useFOILStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(store.ctx.consistency_findings.length > 0);

  const findings = store.ctx.consistency_findings;
  const launchApproved = !!store.ctx.approved_decisions['launch_prep'];
  const unresolvedCount = findings.filter(f => f.user_action === null).length;
  const allResolved = hasRun && unresolvedCount === 0;

  async function handleRunAudit() {
    if (!launchApproved) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await runConsistencyAudit(store.ctx.approved_decisions as Record<string, unknown>);
      const withIds: ConsistencyFinding[] = result.findings.map(f => ({ ...f, id: f.id ?? uuid() }));
      store.setConsistencyFindings(withIds);
      setHasRun(true);
    } catch {
      setError('Audit failed. Your approved decisions are safe. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <article aria-labelledby="audit-heading" className="space-y-6">
      <header>
        <p className="section-label mb-1">Stage 8</p>
        <h1 id="audit-heading" className="text-h1 font-bold text-ink-950">Holistic Consistency Audit</h1>
        <p className="text-body text-ink-500 mt-1">FOIL checks the complete approved brand system as one connected system — not field by field.</p>
      </header>

      {!launchApproved && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2" role="alert">
          <span className="text-amber-600">⚠</span>
          <p className="text-sm text-amber-800">Launch Prep must be approved before the Consistency Audit can run.</p>
        </div>
      )}

      {launchApproved && !hasRun && !isLoading && (
        <div className="card p-10 flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-accent-100 flex items-center justify-center text-accent-600 text-xl">⟳</div>
          <div>
            <h2 className="text-h3 font-semibold text-ink-950 mb-1">Ready to audit</h2>
            <p className="text-sm text-ink-500 max-w-sm">FOIL will check your entire approved brand system for contradictions, vague claims, audience mismatches, and consistency issues.</p>
          </div>
          <button id="btn-run-audit" onClick={handleRunAudit} className="btn-primary">Run Consistency Audit</button>
        </div>
      )}

      {isLoading && <LoadingState stage="consistency_audit" />}

      {error && (
        <div className="card border-red-200 p-6 text-center space-y-3" role="alert">
          <p className="text-red-700 font-semibold">{error}</p>
          <button onClick={handleRunAudit} className="btn-primary">Try Again</button>
        </div>
      )}

      {hasRun && !isLoading && (
        <div className="space-y-4">
          {/* Summary */}
          <div className={`p-4 rounded-md border flex items-center gap-3 ${allResolved ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <span className={allResolved ? 'text-green-600 text-lg' : 'text-amber-600 text-lg'}>{allResolved ? '✓' : '⚠'}</span>
            <div>
              <p className={`font-semibold text-sm ${allResolved ? 'text-green-800' : 'text-amber-800'}`}>
                {findings.length === 0 ? 'Brand system is fully consistent — no issues found.' : allResolved ? 'All findings resolved — ready for Kit Assembly.' : `${unresolvedCount} of ${findings.length} finding${findings.length > 1 ? 's' : ''} unresolved`}
              </p>
              {!allResolved && findings.length > 0 && <p className="text-xs text-amber-700 mt-0.5">Resolve all findings before export.</p>}
            </div>
          </div>

          {findings.map(f => (
            <ConsistencyFindingCard key={f.id} finding={f}
              onAction={(action) => store.actOnConsistencyFinding(f.id, action)} />
          ))}
        </div>
      )}
    </article>
  );
}
