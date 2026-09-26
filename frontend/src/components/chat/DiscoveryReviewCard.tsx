import { useState } from 'react';
import type { DiscoveryContent, CriticFinding } from '../../../../shared/types';

interface DiscoveryReviewCardProps {
  content: DiscoveryContent;
  findings?: CriticFinding[];
  isApproved: boolean;
  onApprove: () => void;
  onEditSection?: (field: string, newValue: string) => void;
}

export function DiscoveryReviewCard({
  content,
  findings = [],
  isApproved,
  onApprove,
  onEditSection,
}: DiscoveryReviewCardProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  function startEditing(field: string, currentValue: string) {
    setEditingField(field);
    setEditValue(currentValue);
  }

  function saveEdit() {
    if (editingField && onEditSection) {
      onEditSection(editingField, editValue);
    }
    setEditingField(null);
  }

  return (
    <div className="card p-5 bg-white border border-border shadow-xs text-xs space-y-4 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <span className="font-bold text-accent-700 uppercase tracking-wider text-[11px] block">
            Gate 1: Brand Discovery Plan
          </span>
          <span className="text-[12px] text-ink-500">
            Grounded in your confirmed inputs and validated against strategic traps.
          </span>
        </div>
        {isApproved ? (
          <span className="text-[11px] font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
            ✓ Gate 1 Approved
          </span>
        ) : (
          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            Draft — Requires Review & Approval
          </span>
        )}
      </div>

      {/* 1. Brand Concept & Solution */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-ink-900 text-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent-600" />
            Brand Concept & Solution
          </span>
          {!isApproved && (
            <button
              type="button"
              onClick={() => startEditing('brand_concept', content.brand_concept || content.core_problem)}
              className="text-[11px] text-accent-600 hover:text-accent-800 font-medium"
            >
              Edit
            </button>
          )}
        </div>
        <div className="p-3 bg-surface-100 rounded-lg text-ink-800 text-xs leading-relaxed">
          <p className="font-medium text-ink-950 mb-1">{content.brand_concept || 'Brand Concept'}</p>
          <p>{content.proposed_solution || content.value_desired_outcome}</p>
        </div>
      </div>

      {/* 2. Problem Statement */}
      <div className="space-y-1.5">
        <span className="font-semibold text-ink-900 text-xs flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Customer Problem & Friction
        </span>
        <p className="p-3 bg-surface-100 rounded-lg text-ink-800 leading-relaxed">
          {content.core_problem}
        </p>
      </div>

      {/* 3. Target Audience */}
      <div className="space-y-1.5">
        <span className="font-semibold text-ink-900 text-xs flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          Target Audience (Grounded)
        </span>
        <div className="p-3 bg-surface-100 rounded-lg text-ink-800 leading-relaxed flex items-center justify-between">
          <span>{content.target_audience}</span>
          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
            User Context
          </span>
        </div>
      </div>

      {/* 4. Confirmed Facts vs Inferred Hypotheses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* Confirmed Information */}
        <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200/80 space-y-2">
          <span className="font-bold text-emerald-800 text-[11px] flex items-center gap-1">
            <span>✓</span> Confirmed Facts ({content.known_facts?.length || 0})
          </span>
          <ul className="space-y-1 text-emerald-950 text-[11px]">
            {content.known_facts && content.known_facts.length > 0 ? (
              content.known_facts.map((fact, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>{fact}</span>
                </li>
              ))
            ) : (
              <li className="text-ink-400 italic">No explicit facts recorded</li>
            )}
          </ul>
        </div>

        {/* Working Hypotheses */}
        <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200/80 space-y-2">
          <span className="font-bold text-amber-800 text-[11px] flex items-center gap-1">
            <span>💡</span> Working Hypotheses ({content.inferred_assumptions?.length || 0})
          </span>
          <ul className="space-y-1.5 text-amber-950 text-[11px]">
            {content.inferred_assumptions && content.inferred_assumptions.length > 0 ? (
              content.inferred_assumptions.map((assump, i) => (
                <li key={i} className="flex flex-col">
                  <span className="font-medium">• {assump.value}</span>
                  <span className="text-[10px] text-amber-700/90 pl-3">Rationale: {assump.rationale}</span>
                </li>
              ))
            ) : (
              <li className="text-ink-400 italic">No assumptions inferred</li>
            )}
          </ul>
        </div>
      </div>

      {/* 5. Open Questions */}
      {content.open_questions && content.open_questions.length > 0 && (
        <div className="p-3 bg-surface-100 rounded-lg space-y-1.5">
          <span className="font-semibold text-ink-800 text-[11px] block">
            Open Questions for Strategy Exploration:
          </span>
          <ul className="space-y-1 text-ink-600 text-[11px]">
            {content.open_questions.map((q, i) => (
              <li key={i}>• {q}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Critic Findings */}
      {findings && findings.length > 0 && (
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200/80 space-y-1.5">
          <span className="font-bold text-amber-800 text-[11px] block">
            Critic Strategic Review ({findings.length})
          </span>
          {findings.map((f, i) => (
            <div key={i} className="text-[11px] text-amber-900">
              <span className="font-bold capitalize">[{f.issue_type}]:</span> {f.explanation}
              {f.sharper_alternative && (
                <div className="mt-0.5 text-emerald-800 text-[10px] font-medium pl-2">
                  Recommendation: {f.sharper_alternative}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Inline Edit Modal / Drawer if active */}
      {editingField && (
        <div className="p-3 bg-surface-200 rounded-lg space-y-2 border border-border">
          <label className="text-[11px] font-bold text-ink-700 block">Edit {editingField}</label>
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            rows={2}
            className="w-full text-xs p-2 rounded border border-border bg-white"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingField(null)}
              className="px-2.5 py-1 rounded text-ink-600 hover:bg-surface-300 text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveEdit}
              className="px-3 py-1 rounded bg-accent-600 text-white font-medium text-xs"
            >
              Save Change
            </button>
          </div>
        </div>
      )}

      {/* Approval CTA */}
      {!isApproved && (
        <div className="pt-2 flex items-center justify-between gap-3 border-t border-border">
          <span className="text-[11px] text-ink-500">
            Locking in Gate 1 establishes the grounded foundation for Gate 2: Positioning Matrix.
          </span>
          <button
            type="button"
            onClick={onApprove}
            className="px-4 py-2 rounded-xl bg-accent-600 hover:bg-accent-700 text-white font-semibold text-xs transition-colors shadow-xs flex-shrink-0"
          >
            Approve Brand Discovery →
          </button>
        </div>
      )}
    </div>
  );
}
