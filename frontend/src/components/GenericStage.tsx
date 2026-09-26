/**
 * Generic stage screen used for all stages that share the same
 * generate → draft → approve pattern (stages 3-7).
 * Each stage passes its own content renderer.
 */
import { type ReactNode } from 'react';
import { useFOILStore } from '../store/foilStore';
import { StageScreen } from './StageScreen';
import { generateStage } from '../lib/api-client';
import type { CriticFinding, StageName } from '../../../shared/types';
import { v4 as uuid } from 'uuid';

interface GenericStageProps {
  stage: StageName;
  stageNumber: number;
  title: string;
  description: string;
  children: (content: Record<string, unknown>) => ReactNode;
}

export function GenericStage({ stage, stageNumber, title, description, children }: GenericStageProps) {
  const store = useFOILStore();
  const ui = store.uiStates[stage];
  const draft = store.ctx.stage_drafts[stage];
  const approved = store.ctx.approved_decisions[stage];
  const findings = store.ctx.critic_findings.filter(f => f.stage === stage);
  const content = approved?.content ?? draft?.content;

  async function handleGenerate() {
    store.setLoading(stage, true);
    store.setError(stage, null);
    try {
      const result = await generateStage(stage, { approved_decisions: store.ctx.approved_decisions });
      store.setDraft(stage, result.content);
      store.transitionStage(stage, 'generate');
      const newFindings: CriticFinding[] = result.findings.map(f => ({
        ...f, id: f.id ?? uuid(), stage,
      }));
      store.addCriticFindings(newFindings);
      store.transitionStage(stage, newFindings.length > 0 ? 'critic_flag' : 'critic_pass');
    } catch (err: unknown) {
      store.setError(stage, {
        stage, error_type: 'provider_unavailable',
        message: err instanceof Error ? err.message : 'Generation failed.',
        retryable: true,
      });
    } finally {
      store.setLoading(stage, false);
    }
  }

  function handleApprove() {
    const c = draft?.content;
    if (!c) return;
    store.writeApprovedDecision(stage, c, 'user_edit', uuid());
  }

  return (
    <StageScreen
      stage={stage} stageNumber={stageNumber} title={title} description={description}
      approvalState={ui.approval_state} isLoading={ui.is_loading} error={ui.error} findings={findings}
      onApprove={handleApprove}
      onReject={() => store.rejectStage(stage)}
      onRegenerate={handleGenerate}
      onFindingAction={(id, action) => store.actOnCriticFinding(id, action)}
      onEdit={() => store.transitionStage(stage, 'user_edit')}
    >
      {content ? children(content) : null}
    </StageScreen>
  );
}
