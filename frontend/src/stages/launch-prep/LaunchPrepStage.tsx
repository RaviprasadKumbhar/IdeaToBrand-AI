import { useFOILStore } from '../../store/foilStore';
import { StageScreen } from '../../components/StageScreen';
import { EditableField } from '../../components/EditableField';
import { generateStage } from '../../lib/api-client';
import type { CriticFinding } from '../../../../shared/types';
import { v4 as uuid } from 'uuid';

export interface LaunchPrepContent {
  landing_headline: string;
  social_launch_post: string;
}

export function LaunchPrepStage() {
  const store = useFOILStore();
  const ui = store.uiStates['launch_prep'];
  const draft = store.ctx.stage_drafts['launch_prep'];
  const approved = store.ctx.approved_decisions['launch_prep'];
  const findings = store.ctx.critic_findings.filter(f => f.stage === 'launch_prep');
  const content = (approved?.content ?? draft?.content) as unknown as LaunchPrepContent | undefined;

  async function handleGenerate() {
    store.setLoading('launch_prep', true);
    store.setError('launch_prep', null);
    try {
      const result = await generateStage('launch_prep', { approved_decisions: store.ctx.approved_decisions });
      store.setDraft('launch_prep', result.content);
      store.transitionStage('launch_prep', 'generate');
      const newFindings: CriticFinding[] = result.findings.map(f => ({
        ...f, id: f.id ?? uuid(), stage: 'launch_prep' as const,
      }));
      store.addCriticFindings(newFindings);
      store.transitionStage('launch_prep', newFindings.length > 0 ? 'critic_flag' : 'critic_pass');
    } catch (err: unknown) {
      store.setError('launch_prep', {
        stage: 'launch_prep',
        error_type: 'provider_unavailable',
        message: err instanceof Error ? err.message : 'Generation failed.',
        retryable: true,
      });
    } finally {
      store.setLoading('launch_prep', false);
    }
  }

  function handleApprove() {
    const c = draft?.content;
    if (!c) return;
    store.writeApprovedDecision('launch_prep', c, 'user_edit', uuid());
  }

  function patchDraft(patch: Partial<LaunchPrepContent>) {
    const current = (draft?.content ?? {}) as unknown as LaunchPrepContent;
    store.setDraft('launch_prep', { ...current, ...patch } as unknown as Record<string, unknown>);
  }

  return (
    <StageScreen
      stage="launch_prep"
      stageNumber={7}
      title="Launch Prep"
      description="Landing headline and social launch post — checked against your approved brand system. Approving this stage unlocks the Holistic Consistency Audit."
      approvalState={ui.approval_state}
      isLoading={ui.is_loading}
      error={ui.error}
      findings={findings}
      onApprove={handleApprove}
      onReject={() => store.rejectStage('launch_prep')}
      onRegenerate={handleGenerate}
      onFindingAction={(id, action) => store.actOnCriticFinding(id, action)}
      onEdit={() => store.transitionStage('launch_prep', 'user_edit')}
      needsReviewCause="Voice + Messaging"
    >
      {content && (
        <div className="space-y-6">
          <section aria-labelledby="headline-heading">
            <h2 id="headline-heading" className="text-h3 font-semibold text-ink-950 mb-3">Landing Headline</h2>
            <div
              className="p-5 bg-ink-950 rounded-md text-center"
              aria-label="Landing headline preview"
            >
              <p className="text-xl sm:text-2xl font-bold text-white leading-snug">
                {content.landing_headline}
              </p>
            </div>
            <div className="mt-3">
              <EditableField
                label="Edit Headline"
                value={content.landing_headline ?? ''}
                onSave={v => patchDraft({ landing_headline: v })}
              />
            </div>
          </section>

          <section className="border-t border-border pt-5" aria-labelledby="social-post-heading">
            <h2 id="social-post-heading" className="text-h3 font-semibold text-ink-950 mb-3">Social Launch Post</h2>
            <div className="border border-border rounded-md p-4 bg-surface-100 whitespace-pre-wrap text-sm text-ink-950 font-mono leading-relaxed">
              {content.social_launch_post}
            </div>
            <div className="mt-3">
              <EditableField
                label="Edit Post"
                value={content.social_launch_post ?? ''}
                multiline
                onSave={v => patchDraft({ social_launch_post: v })}
              />
            </div>
          </section>

          <div
            role="note"
            className="flex items-start gap-2 p-3 bg-accent-100 border border-accent-600/20 rounded-sm text-xs text-accent-600"
          >
            <span aria-hidden="true">ℹ</span>
            <span>Approving Launch Prep unlocks the Holistic Consistency Audit (Stage 8).</span>
          </div>
        </div>
      )}
    </StageScreen>
  );
}
