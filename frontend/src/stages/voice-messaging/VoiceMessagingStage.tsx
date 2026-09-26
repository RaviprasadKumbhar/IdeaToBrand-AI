import { useFOILStore } from '../../store/foilStore';
import { StageScreen } from '../../components/StageScreen';
import { EditableField } from '../../components/EditableField';
import { generateStage } from '../../lib/api-client';
import type { CriticFinding } from '../../../../shared/types';
import { v4 as uuid } from 'uuid';

export interface SampleMessage {
  message: string;
  explanation: string;
}

export interface VoiceMessagingContent {
  voice_description: string;
  tone_characteristics: string[];
  do_list: string[];
  dont_list: string[];
  sample_messages: SampleMessage[];
}

export function VoiceMessagingStage() {
  const store = useFOILStore();
  const ui = store.uiStates['voice_messaging'];
  const draft = store.ctx.stage_drafts['voice_messaging'];
  const approved = store.ctx.approved_decisions['voice_messaging'];
  const findings = store.ctx.critic_findings.filter(f => f.stage === 'voice_messaging');
  const content = (approved?.content ?? draft?.content) as unknown as VoiceMessagingContent | undefined;

  async function handleGenerate() {
    store.setLoading('voice_messaging', true);
    store.setError('voice_messaging', null);
    try {
      const result = await generateStage('voice_messaging', {
        approved_decisions: store.ctx.approved_decisions,
        context: store.ctx,
      });
      store.setDraft('voice_messaging', result.content);
      // Reset to draft then submit to critic (safe from any state)
      store.transitionStage('voice_messaging', { type: 'RESET_STAGE' });
      store.transitionStage('voice_messaging', { type: 'SUBMIT_CRITIC' });
      const newFindings: CriticFinding[] = result.findings.map(f => ({
        ...f, id: f.id ?? uuid(), stage: 'voice_messaging' as const,
      }));
      store.addCriticFindings(newFindings);
      if (newFindings.length > 0) {
        store.transitionStage('voice_messaging', { type: 'CRITIC_FINDINGS_DETECTED' });
      }
    } catch (err: unknown) {
      store.setError('voice_messaging', {
        stage: 'voice_messaging',
        error_type: 'provider_unavailable',
        message: err instanceof Error ? err.message : 'Generation failed.',
        retryable: true,
      });
    } finally {
      store.setLoading('voice_messaging', false);
    }
  }

  function handleApprove() {
    const c = draft?.content;
    if (!c) return;
    store.writeApprovedDecision('voice_messaging', c, 'user_edit', uuid());
  }

  function patchDraft(patch: Partial<VoiceMessagingContent>) {
    const current = (draft?.content ?? {}) as unknown as VoiceMessagingContent;
    store.setDraft('voice_messaging', { ...current, ...patch } as unknown as Record<string, unknown>);
  }

  return (
    <StageScreen
      stage="voice_messaging"
      stageNumber={6}
      title="Voice + Messaging"
      description="Brand voice, tone characteristics, communication rules, and sample messages."
      approvalState={ui.approval_state}
      isLoading={ui.is_loading}
      error={ui.error}
      findings={findings}
      onApprove={handleApprove}
      onReject={() => store.rejectStage('voice_messaging')}
      onRegenerate={handleGenerate}
      onFindingAction={(id, action) => store.actOnCriticFinding(id, action)}
      onEdit={() => store.transitionStage('voice_messaging', { type: 'USER_EDIT' })}
      needsReviewCause="Visual Brief"
    >
      {content && (
        <div className="space-y-6">
          <section aria-labelledby="voice-description-heading">
            <h2 id="voice-description-heading" className="sr-only">Voice Description</h2>
            <EditableField
              label="Voice Description"
              value={content.voice_description ?? ''}
              multiline
              onSave={v => patchDraft({ voice_description: v })}
            />
          </section>

          {content.tone_characteristics?.length > 0 && (
            <section aria-labelledby="tone-heading">
              <h2 id="tone-heading" className="section-label mb-2">Tone Characteristics</h2>
              <div className="flex flex-wrap gap-2" role="list" aria-label="Tone characteristics">
                {content.tone_characteristics.map((t, i) => (
                  <span key={i} className="badge-approved px-3 py-1.5 text-sm" role="listitem">{t}</span>
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="dodont-heading">
            <h2 id="dodont-heading" className="section-label mb-3">Communication Rules</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2">Do</p>
                {content.do_list?.length > 0 ? (
                  <ul className="space-y-1.5" aria-label="Do list">
                    {content.do_list.map((d, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-ink-950">
                        <span className="text-green-600 font-bold flex-shrink-0" aria-hidden="true">✓</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink-500">No rules defined.</p>
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">Don't</p>
                {content.dont_list?.length > 0 ? (
                  <ul className="space-y-1.5" aria-label="Don't list">
                    {content.dont_list.map((d, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-ink-950">
                        <span className="text-red-500 font-bold flex-shrink-0" aria-hidden="true">✕</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink-500">No rules defined.</p>
                )}
              </div>
            </div>
          </section>

          {content.sample_messages?.length > 0 && (
            <section aria-labelledby="sample-messages-heading">
              <h2 id="sample-messages-heading" className="section-label mb-3">
                Sample Messages ({content.sample_messages.length})
              </h2>
              <div className="space-y-3">
                {content.sample_messages.map((msg, i) => (
                  <article
                    key={i}
                    className="border border-border rounded-md p-4"
                    aria-label={`Sample message ${i + 1}`}
                  >
                    <p className="text-sm font-semibold text-ink-950 mb-1">"{msg.message}"</p>
                    <p className="text-xs text-ink-500">{msg.explanation}</p>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </StageScreen>
  );
}
