/**
 * DiscoveryStage — Stage 1: Discovery (design.md § 14).
 * Facts vs. assumptions are visually distinct.
 * Uses StageScreen for consistent structure.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFOILStore } from '../../store/foilStore';
import { StageScreen } from '../../components/StageScreen';
import { generateStage } from '../../lib/api-client';
import type { CriticFinding } from '../../../../shared/types';
import { v4 as uuid } from 'uuid';

interface DiscoveryContent {
  core_problem: string;
  target_audience: string;
  context_situation: string;
  user_goals: string;
  constraints: string;
  value_desired_outcome: string;
  open_questions: string[];
  known_facts: string[];
  inferred_assumptions: { value: string; rationale: string }[];
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3 border-b border-border last:border-0">
      <p className="section-label mb-1">{label}</p>
      <p className="text-sm text-ink-950">{value}</p>
    </div>
  );
}

function FactCard({ text }: { text: string }) {
  return (
    <div className="border border-green-200 bg-green-50/50 rounded-sm p-3">
      <p className="section-label text-green-700 mb-1">Known Fact · Provided by you</p>
      <p className="text-sm text-ink-950">{text}</p>
    </div>
  );
}

function AssumptionCard({ value, rationale }: { value: string; rationale: string }) {
  return (
    <div className="border border-amber-200 bg-amber-50/50 rounded-sm p-3">
      <p className="section-label text-amber-700 mb-1">Assumption · Inferred by IdeaToBrand AI</p>
      <p className="text-sm text-ink-950 mb-1.5">{value}</p>
      <p className="text-xs text-ink-500"><span className="font-medium">Rationale:</span> {rationale}</p>
    </div>
  );
}

export function DiscoveryStage() {
  const navigate = useNavigate();
  const store = useFOILStore();
  const ui = store.uiStates['discovery'];
  const draft = store.ctx.stage_drafts['discovery'];
  const approved = store.ctx.approved_decisions['discovery'];
  const findings = store.ctx.critic_findings.filter((f) => f.stage === 'discovery');

  const content = (approved?.content ?? draft?.content) as unknown as DiscoveryContent | undefined;
  const isApproved = ui.approval_state === 'approved' || Boolean(approved);
  const ideaText = store.ctx.user_facts?.business_description ? String(store.ctx.user_facts.business_description).trim() : '';

  useEffect(() => {
    if (!content && !isApproved && !ui.is_loading && !ui.error && ideaText) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, isApproved, ui.is_loading, ui.error, ideaText]);

  async function handleGenerate() {
    store.setLoading('discovery', true);
    store.setError('discovery', null);
    try {
      const result = await generateStage('discovery', {
        idea_text: ideaText || 'Brand initiation concept',
        business_description: ideaText || 'Brand initiation concept',
        user_facts: store.ctx.user_facts,
        approved_decisions: store.ctx.approved_decisions,
        context: store.ctx,
      });
      store.setDraft('discovery', result.content);
      // Reset to draft then submit to critic (safe from any state)
      store.transitionStage('discovery', { type: 'RESET_STAGE' });
      store.transitionStage('discovery', { type: 'SUBMIT_CRITIC' });

      // Add critic findings
      const criticFindings: CriticFinding[] = (result.findings || []).map((f) => ({
        ...f,
        id: f.id ?? uuid(),
        stage: 'discovery',
      }));
      store.addCriticFindings(criticFindings);

      if (criticFindings.length > 0) {
        store.transitionStage('discovery', { type: 'CRITIC_FINDINGS_DETECTED' });
      }
    } catch (err: unknown) {
      store.setError('discovery', {
        stage: 'discovery',
        error_type: (err as any)?.error_type || 'provider_unavailable',
        message: err instanceof Error ? err.message : 'Generation failed. Please try again.',
        retryable: true,
      });
    } finally {
      store.setLoading('discovery', false);
    }
  }

  function handleApprove() {
    const toApprove = (draft?.content || content) as Record<string, unknown> | undefined;
    if (!toApprove) return;
    store.writeApprovedDecision('discovery', toApprove, 'user_edit', uuid());
  }

  function handleReject() {
    store.rejectStage('discovery');
  }

  function handleFindingAction(id: string, action: CriticFinding['user_action']) {
    store.actOnCriticFinding(id, action);
  }

  return (
    <StageScreen
      stage="discovery"
      stageNumber={1}
      title="Discovery"
      description="IdeaToBrand AI organizes your idea into a strategic foundation — separating what you told it from what it inferred."
      approvalState={ui.approval_state}
      isLoading={ui.is_loading}
      error={ui.error}
      findings={findings}
      onApprove={handleApprove}
      onReject={handleReject}
      onRegenerate={handleGenerate}
      onFindingAction={handleFindingAction}
    >
      {content && (
        <div className="space-y-4">
          <FieldRow label="Core Problem" value={content.core_problem} />
          <FieldRow label="Target Audience" value={content.target_audience} />
          <FieldRow label="Context / Situation" value={content.context_situation} />
          <FieldRow label="User Goals" value={content.user_goals} />
          <FieldRow label="Constraints" value={content.constraints} />
          <FieldRow label="Value / Desired Outcome" value={content.value_desired_outcome} />

          {content.open_questions?.length > 0 && (
            <div className="py-3 border-b border-border">
              <p className="section-label mb-2">Open Questions</p>
              <ul className="space-y-1">
                {content.open_questions.map((q, i) => (
                  <li key={i} className="text-sm text-ink-700 flex gap-2">
                    <span className="text-ink-500">?</span>{q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Facts vs. Assumptions — design.md § 14.2 */}
          <div className="space-y-3 pt-2">
            <p className="section-label">Known Facts vs. Inferred Assumptions</p>
            {content.known_facts?.map((fact, i) => (
              <FactCard key={i} text={fact} />
            ))}
            {content.inferred_assumptions?.map((assumption, i) => (
              <AssumptionCard key={i} value={String(assumption.value)} rationale={assumption.rationale} />
            ))}
          </div>

          {/* Navigation to Stage 2 once approved */}
          {isApproved && (
            <div className="pt-6 border-t border-border flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-green-700 flex items-center gap-1.5">
                  <span>✓</span> Stage 1 Approved
                </p>
                <p className="text-xs text-ink-500 mt-0.5">Discovery foundation is locked in</p>
              </div>
              <button
                id="btn-continue-to-positioning"
                onClick={() => navigate('/positioning')}
                className="btn-primary text-xs px-4 py-2 flex items-center gap-2"
              >
                <span>Continue to Positioning</span>
                <span>→</span>
              </button>
            </div>
          )}
        </div>
      )}
    </StageScreen>
  );
}
