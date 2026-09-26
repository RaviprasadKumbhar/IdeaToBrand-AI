/**
 * CriticFindingCard — displays a single Critic finding (design.md § 21).
 * Shows: id, issue_type, target_field, evidence, explanation, sharper_alternative.
 * Actions: Accept Finding, Edit, Reject.
 */
import { useState } from 'react';
import type { CriticFinding } from '../../../shared/types';

interface CriticFindingCardProps {
  finding: CriticFinding;
  onAction: (action: CriticFinding['user_action']) => void;
}

const ISSUE_TYPE_LABELS: Record<CriticFinding['issue_type'], { label: string; color: string }> = {
  cliche:            { label: 'Cliché',             color: 'text-orange-700 bg-orange-50 border-orange-200' },
  audience_mismatch: { label: 'Audience Mismatch',  color: 'text-red-700 bg-red-50 border-red-200' },
  contradiction:     { label: 'Contradiction',       color: 'text-red-800 bg-red-50 border-red-200' },
  vague:             { label: 'Vague',               color: 'text-amber-700 bg-amber-50 border-amber-200' },
  bias:              { label: 'Bias',                color: 'text-purple-700 bg-purple-50 border-purple-200' },
};

export function CriticFindingCard({ finding, onAction }: CriticFindingCardProps) {
  const [expanded, setExpanded] = useState(true);
  const issueConfig = ISSUE_TYPE_LABELS[finding.issue_type];
  const isResolved = finding.user_action !== null;

  return (
    <article
      className={[
        'border rounded-md overflow-hidden transition-all duration-200',
        isResolved ? 'opacity-60 border-border' : 'border-amber-200 shadow-card',
      ].join(' ')}
      aria-label={`Critic finding: ${issueConfig.label} on ${finding.target_field}`}
    >
      {/* Header */}
      <button
        className="w-full flex items-center justify-between p-4 bg-white hover:bg-surface-100 transition-colors text-left"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls={`finding-body-${finding.id}`}
      >
        <div className="flex items-center gap-3">
          <span className={`badge border ${issueConfig.color}`}>
            {issueConfig.label}
          </span>
          <span className="text-sm font-medium text-ink-700">
            {finding.target_field}
          </span>
          {isResolved && (
            <span className="badge-approved text-[10px]">
              {finding.user_action === 'accept' ? 'Accepted' : finding.user_action === 'reject' ? 'Rejected' : 'Edited'}
            </span>
          )}
        </div>
        <span className="text-ink-500 text-sm" aria-hidden="true">
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {/* Body */}
      {expanded && (
        <div id={`finding-body-${finding.id}`} className="p-4 bg-white border-t border-border space-y-4">
          {/* Evidence */}
          <div>
            <p className="section-label mb-1">Evidence</p>
            <blockquote className="text-sm text-ink-700 border-l-2 border-amber-300 pl-3 italic">
              {finding.evidence}
            </blockquote>
          </div>

          {/* Explanation */}
          <div>
            <p className="section-label mb-1">Why it matters</p>
            <p className="text-sm text-ink-700">{finding.explanation}</p>
          </div>

          {/* Sharper alternative — always present (schema-enforced) */}
          <div className="p-3 bg-accent-100 border border-accent-600/20 rounded-sm">
            <p className="section-label text-accent-600 mb-1">Sharper Alternative</p>
            <p className="text-sm text-ink-950 font-medium">{finding.sharper_alternative}</p>
          </div>

          {/* Actions — only shown if not yet resolved */}
          {!isResolved && (
            <div className="flex flex-wrap gap-2 pt-1" role="group" aria-label="Finding actions">
              <button
                id={`btn-accept-finding-${finding.id}`}
                onClick={() => onAction('accept')}
                className="btn-primary text-xs px-3 py-2"
                aria-label={`Accept finding: use sharper alternative for ${finding.target_field}`}
              >
                Accept Finding
              </button>
              <button
                id={`btn-edit-finding-${finding.id}`}
                onClick={() => onAction('edit')}
                className="btn-secondary text-xs px-3 py-2"
                aria-label={`Edit finding response for ${finding.target_field}`}
              >
                Edit
              </button>
              <button
                id={`btn-reject-finding-${finding.id}`}
                onClick={() => onAction('reject')}
                className="btn-danger text-xs px-3 py-2"
                aria-label={`Reject this finding for ${finding.target_field}`}
              >
                Reject Finding
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
