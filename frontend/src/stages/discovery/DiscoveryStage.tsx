/**
 * DiscoveryStage — Stage 1: Discovery (design.md § 14).
 * Facts vs. assumptions are visually distinct.
 * Uses StageScreen for consistent structure.
 */
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
      <p className="section-label text-amber-700 mb-1">Assumption · Inferred by FOIL</p>
      <p className="text-sm text-ink-950 mb-1.5">{value}</p>
      <p className="text-xs text-ink-500"><span className="font-medium">Rationale:</span> {rationale}</p>
    </div>
  );
}

export function DiscoveryStage() {
  const store = useFOILStore();
  const ui = store.uiStates['discovery'];
  const draft = store.ctx.stage_drafts['discovery'];
  const approved = store.ctx.approved_decisions['discovery'];
  const findings = store.ctx.critic_findings.filter((f) => f.stage === 'discovery');

  const content = (approved?.content ?? draft?.content) as DiscoveryContent | undefined;

  async function handleGenerate() {
    store.setLoading('discovery', true);
    store.setError('discovery', null);
    try {
      const result = await generateStage('discovery', {
        user_facts: store.ctx.user_facts,
      });
      store.setDraft('discovery', result.content);
      store.transitionStage('discovery', 'generate');

      // Add critic findings
      const findings: CriticFinding[] = result.findings.map((f) => ({
        ...f,
        id: f.id ?? uuid(),
        stage: 'discovery',
      }));
      store.addCriticFindings(findings);

      if (findings.length > 0) {
        store.transitionStage('discovery', 'critic_flag');
      } else {
        store.transitionStage('discovery', 'critic_pass');
      }
    } catch (err: unknown) {
      store.setError('discovery', {
        stage: 'discovery',
        error_type: 'provider_unavailable',
        message: err instanceof Error ? err.message : 'Generation failed. Please try again.',
        retryable: true,
      });
    } finally {
      store.setLoading('discovery', false);
    }
  }

  function handleApprove() {
    if (!draft?.content) return;
    store.writeApprovedDecision('discovery', draft.content, 'user_edit', uuid());
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
      description="FOIL organizes your idea into a strategic foundation — separating what you told it from what it inferred."
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
        </div>
      )}
    </StageScreen>
  );
}
