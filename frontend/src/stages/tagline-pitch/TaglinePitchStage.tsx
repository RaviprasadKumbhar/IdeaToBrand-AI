import { useState } from 'react';
import { useFOILStore } from '../../store/foilStore';
import { StageScreen } from '../../components/StageScreen';
import { EditableField } from '../../components/EditableField';
import { generateStage } from '../../lib/api-client';
import type { CriticFinding } from '../../../../shared/types';
import { v4 as uuid } from 'uuid';

export interface TaglineOption {
  tagline: string;
  rationale: string;
}

export interface TaglinePitchContent {
  tagline_options: TaglineOption[];
  one_line_pitch: string;
  competitor_interchangeability_check?: string;
}

function TaglineCard({
  option,
  index,
  onEditTagline,
  onEditRationale,
}: {
  option: TaglineOption;
  index: number;
  onEditTagline: (v: string) => void;
  onEditRationale: (v: string) => void;
}) {
  return (
    <article
      className="border border-border rounded-md p-4 space-y-3"
      aria-label={`Tagline option ${index + 1}`}
    >
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-100 text-accent-600 text-xs font-bold flex items-center justify-center mt-0.5">
          {index + 1}
        </span>
        <div className="flex-1 space-y-3">
          <EditableField
            label="Tagline"
            value={option.tagline}
            onSave={onEditTagline}
          />
          <EditableField
            label="Rationale"
            value={option.rationale}
            multiline
            onSave={onEditRationale}
          />
        </div>
      </div>
    </article>
  );
}

export function TaglinePitchStage() {
  const store = useFOILStore();
  const ui = store.uiStates['tagline_pitch'];
  const draft = store.ctx.stage_drafts['tagline_pitch'];
  const approved = store.ctx.approved_decisions['tagline_pitch'];
  const findings = store.ctx.critic_findings.filter(f => f.stage === 'tagline_pitch');
  const rawContent = (approved?.content ?? draft?.content) as unknown as TaglinePitchContent | undefined;
  const [localContent, setLocalContent] = useState<TaglinePitchContent | null>(null);
  const content = localContent ?? rawContent;

  function patchContent(patch: Partial<TaglinePitchContent>) {
    const updated = { ...(content ?? { tagline_options: [], one_line_pitch: '' }), ...patch };
    setLocalContent(updated);
    store.setDraft('tagline_pitch', updated as unknown as Record<string, unknown>);
  }

  function handleEditTagline(i: number, field: 'tagline' | 'rationale', value: string) {
    if (!content?.tagline_options) return;
    const updated = content.tagline_options.map((o, idx) =>
      idx === i ? { ...o, [field]: value } : o
    );
    patchContent({ tagline_options: updated });
  }

  async function handleGenerate() {
    setLocalContent(null);
    store.setLoading('tagline_pitch', true);
    store.setError('tagline_pitch', null);
    try {
      const result = await generateStage('tagline_pitch', {
        approved_decisions: store.ctx.approved_decisions,
        context: store.ctx,
      });
      store.setDraft('tagline_pitch', result.content);
      // Reset to draft then submit to critic (safe from any state)
      store.transitionStage('tagline_pitch', { type: 'RESET_STAGE' });
      store.transitionStage('tagline_pitch', { type: 'SUBMIT_CRITIC' });
      const newFindings: CriticFinding[] = result.findings.map(f => ({
        ...f, id: f.id ?? uuid(), stage: 'tagline_pitch' as const,
      }));
      store.addCriticFindings(newFindings);
      if (newFindings.length > 0) {
        store.transitionStage('tagline_pitch', { type: 'CRITIC_FINDINGS_DETECTED' });
      }
    } catch (err: unknown) {
      store.setError('tagline_pitch', {
        stage: 'tagline_pitch',
        error_type: 'provider_unavailable',
        message: err instanceof Error ? err.message : 'Generation failed.',
        retryable: true,
      });
    } finally {
      store.setLoading('tagline_pitch', false);
    }
  }

  function handleApprove() {
    const c = localContent ?? draft?.content;
    if (!c) return;
    store.writeApprovedDecision('tagline_pitch', c as unknown as Record<string, unknown>, 'user_edit', uuid());
    setLocalContent(null);
  }

  return (
    <StageScreen
      stage="tagline_pitch"
      stageNumber={4}
      title="Tagline + Pitch"
      description="Compare tagline options and the one-line pitch. Each option includes a rationale and a competitor interchangeability check."
      approvalState={ui.approval_state}
      isLoading={ui.is_loading}
      error={ui.error}
      findings={findings}
      onApprove={handleApprove}
      onReject={() => store.rejectStage('tagline_pitch')}
      onRegenerate={handleGenerate}
      onFindingAction={(id, action) => store.actOnCriticFinding(id, action)}
      onEdit={() => store.transitionStage('tagline_pitch', { type: 'USER_EDIT' })}
      needsReviewCause="Naming + Personality"
    >
      {content && (
        <div className="space-y-6">
          <section aria-labelledby="tagline-options-heading">
            <h2 id="tagline-options-heading" className="text-h3 font-semibold text-ink-950 mb-3">
              Tagline Options
            </h2>
            {content.tagline_options?.length > 0 ? (
              <div className="space-y-3">
                {content.tagline_options.map((opt, i) => (
                  <TaglineCard
                    key={i}
                    option={opt}
                    index={i}
                    onEditTagline={v => handleEditTagline(i, 'tagline', v)}
                    onEditRationale={v => handleEditTagline(i, 'rationale', v)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-500">No tagline options available.</p>
            )}
          </section>

          <section className="border-t border-border pt-5" aria-labelledby="pitch-heading">
            <h2 id="pitch-heading" className="text-h3 font-semibold text-ink-950 mb-3">One-Line Pitch</h2>
            <EditableField
              label="Pitch"
              value={content.one_line_pitch ?? ''}
              multiline
              onSave={v => patchContent({ one_line_pitch: v })}
            />
          </section>

          {content.competitor_interchangeability_check && (
            <section className="border-t border-border pt-5" aria-labelledby="interchangeability-heading">
              <h2 id="interchangeability-heading" className="text-h3 font-semibold text-ink-950 mb-2">
                Competitor Interchangeability Check
              </h2>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-900">
                {content.competitor_interchangeability_check}
              </div>
            </section>
          )}
        </div>
      )}
    </StageScreen>
  );
}
