/**
 * PositioningStage — Stage 2: Positioning (design.md § 15).
 * Side-by-side comparison of 2 divergent directions.
 */
import { useFOILStore } from '../../store/foilStore';
import { StageScreen } from '../../components/StageScreen';
import { generateStage } from '../../lib/api-client';
import type { CriticFinding } from '../../../../shared/types';
import { v4 as uuid } from 'uuid';

interface Direction {
  title: string; category: string; target_audience: string; core_problem: string;
  differentiator: string; value_proposition: string; competitive_angle: string;
  strategic_rationale: string; potential_weakness: string;
}
interface PositioningContent { directions: Direction[]; }

function DirectionCard({ dir, index, onApprove }: { dir: Direction; index: number; onApprove: () => void }) {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="section-label mb-1">Direction {String.fromCharCode(65 + index)}</p>
          <h3 className="text-h3 font-bold text-ink-950">{dir.title}</h3>
          <span className="badge-draft mt-1">{dir.category}</span>
        </div>
      </div>
      {[
        ['Target Audience', dir.target_audience],
        ['Core Problem', dir.core_problem],
        ['Differentiator', dir.differentiator],
        ['Value Proposition', dir.value_proposition],
        ['Competitive Angle', dir.competitive_angle],
        ['Strategic Rationale', dir.strategic_rationale],
        ['Potential Weakness', dir.potential_weakness],
      ].map(([label, value]) => (
        <div key={label} className="border-t border-border pt-3">
          <p className="section-label mb-1">{label}</p>
          <p className="text-sm text-ink-950">{value}</p>
        </div>
      ))}
      <button
        id={`btn-approve-direction-${index}`}
        onClick={onApprove}
        className="btn-primary mt-2 w-full justify-center"
        aria-label={`Select and approve Direction ${String.fromCharCode(65 + index)}: ${dir.title}`}
      >
        ✓ Approve Direction {String.fromCharCode(65 + index)}
      </button>
    </div>
  );
}

export function PositioningStage() {
  const store = useFOILStore();
  const ui = store.uiStates['positioning'];
  const draft = store.ctx.stage_drafts['positioning'];
  const findings = store.ctx.critic_findings.filter(f => f.stage === 'positioning');
  const content = draft?.content as PositioningContent | undefined;

  async function handleGenerate() {
    store.setLoading('positioning', true);
    store.setError('positioning', null);
    try {
      const result = await generateStage('positioning', { approved_decisions: store.ctx.approved_decisions });
      store.setDraft('positioning', result.content);
      store.transitionStage('positioning', 'generate');
      const findings: CriticFinding[] = result.findings.map(f => ({ ...f, id: f.id ?? uuid(), stage: 'positioning' as const }));
      store.addCriticFindings(findings);
      store.transitionStage('positioning', findings.length > 0 ? 'critic_flag' : 'critic_pass');
    } catch (err: unknown) {
      store.setError('positioning', { stage: 'positioning', error_type: 'provider_unavailable', message: err instanceof Error ? err.message : 'Failed', retryable: true });
    } finally {
      store.setLoading('positioning', false);
    }
  }

  function handleApproveDirection(index: number) {
    if (!content?.directions[index]) return;
    store.writeApprovedDecision('positioning', { selected: content.directions[index], all: content.directions }, 'user_edit', uuid());
  }

  return (
    <StageScreen
      stage="positioning" stageNumber={2} title="Positioning"
      description="Choose the strategic direction that best represents the brand. Both directions are shown for comparison."
      approvalState={ui.approval_state} isLoading={ui.is_loading} error={ui.error} findings={findings}
      onApprove={() => content?.directions[0] && handleApproveDirection(0)}
      onReject={() => store.rejectStage('positioning')}
      onRegenerate={handleGenerate}
      onFindingAction={(id, action) => store.actOnCriticFinding(id, action)}
    >
      {content?.directions && (
        <div className="grid md:grid-cols-2 gap-4">
          {content.directions.map((dir, i) => (
            <DirectionCard key={i} dir={dir} index={i} onApprove={() => handleApproveDirection(i)} />
          ))}
        </div>
      )}
    </StageScreen>
  );
}
