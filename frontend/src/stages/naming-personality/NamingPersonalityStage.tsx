import { useFOILStore } from '../../store/foilStore';
import { StageScreen } from '../../components/StageScreen';
import { EditableField } from '../../components/EditableField';
import { generateStage } from '../../lib/api-client';
import type { CriticFinding } from '../../../../shared/types';
import { v4 as uuid } from 'uuid';

export interface NamingDirection {
  territory: string;
  proposed_name: string;
  rationale: string;
  relationship_to_audience: string;
  relationship_to_positioning: string;
  potential_concern: string;
  critic_analysis: string;
  sharper_alternative: string;
}

export interface PersonalityTrait {
  trait: string;
  justification: string;
}

export interface BrandPrinciple {
  principle: string;
  rationale: string;
}

export interface NamingPersonalityContent {
  naming_directions: NamingDirection[];
  personality_traits: PersonalityTrait[];
  traits_to_avoid: string[];
  brand_principles: BrandPrinciple[];
}

function NamingDirectionCard({
  dir,
  index,
  onEditField,
}: {
  dir: NamingDirection;
  index: number;
  onEditField: (field: keyof NamingDirection, value: string) => void;
}) {
  const fields: { key: keyof NamingDirection; label: string; multiline?: boolean }[] = [
    { key: 'rationale',                    label: 'Rationale',                    multiline: true },
    { key: 'relationship_to_audience',     label: 'Audience Relationship',        multiline: true },
    { key: 'relationship_to_positioning',  label: 'Positioning Relationship',     multiline: true },
    { key: 'potential_concern',            label: 'Potential Concern',            multiline: true },
    { key: 'critic_analysis',             label: 'Critic Analysis',             multiline: true },
    { key: 'sharper_alternative',          label: 'Sharper Alternative',          multiline: true },
  ];

  return (
    <article className="border border-border rounded-md overflow-hidden" aria-label={`Naming direction: ${dir.proposed_name}`}>
      <div className="p-4 bg-surface-100 border-b border-border flex items-center gap-3">
        <span className="badge-draft">{dir.territory}</span>
        <EditableField
          label={`Direction ${index + 1} Name`}
          value={dir.proposed_name}
          onSave={(v) => onEditField('proposed_name', v)}
        />
      </div>
      <div className="p-4 space-y-4">
        {fields.map(({ key, label, multiline }) => (
          <EditableField
            key={key}
            label={label}
            value={dir[key]}
            multiline={multiline}
            onSave={(v) => onEditField(key, v)}
          />
        ))}
      </div>
    </article>
  );
}

export function NamingPersonalityStage() {
  const store = useFOILStore();
  const ui = store.uiStates['naming_personality'];
  const draft = store.ctx.stage_drafts['naming_personality'];
  const approved = store.ctx.approved_decisions['naming_personality'];
  const findings = store.ctx.critic_findings.filter(f => f.stage === 'naming_personality');
  const content = (approved?.content ?? draft?.content) as unknown as NamingPersonalityContent | undefined;

  async function handleGenerate() {
    store.setLoading('naming_personality', true);
    store.setError('naming_personality', null);
    try {
      const result = await generateStage('naming_personality', { approved_decisions: store.ctx.approved_decisions });
      store.setDraft('naming_personality', result.content);
      store.transitionStage('naming_personality', 'generate');
      const newFindings: CriticFinding[] = result.findings.map(f => ({
        ...f, id: f.id ?? uuid(), stage: 'naming_personality' as const,
      }));
      store.addCriticFindings(newFindings);
      store.transitionStage('naming_personality', newFindings.length > 0 ? 'critic_flag' : 'critic_pass');
    } catch (err: unknown) {
      store.setError('naming_personality', {
        stage: 'naming_personality',
        error_type: 'provider_unavailable',
        message: err instanceof Error ? err.message : 'Generation failed.',
        retryable: true,
      });
    } finally {
      store.setLoading('naming_personality', false);
    }
  }

  function handleApprove() {
    const c = draft?.content;
    if (!c) return;
    store.writeApprovedDecision('naming_personality', c, 'user_edit', uuid());
  }

  function patchDraft(patch: Partial<NamingPersonalityContent>) {
    const current = (draft?.content ?? {}) as unknown as NamingPersonalityContent;
    store.setDraft('naming_personality', { ...current, ...patch } as unknown as Record<string, unknown>);
  }

  function handleEditNamingField(dirIndex: number, field: keyof NamingDirection, value: string) {
    if (!content?.naming_directions) return;
    const updated = content.naming_directions.map((d, i) =>
      i === dirIndex ? { ...d, [field]: value } : d
    );
    patchDraft({ naming_directions: updated });
  }

  return (
    <StageScreen
      stage="naming_personality"
      stageNumber={3}
      title="Naming + Personality"
      description="Proposed brand names with strategic rationale, personality traits, and brand principles — grounded in approved positioning."
      approvalState={ui.approval_state}
      isLoading={ui.is_loading}
      error={ui.error}
      findings={findings}
      onApprove={handleApprove}
      onReject={() => store.rejectStage('naming_personality')}
      onRegenerate={handleGenerate}
      onFindingAction={(id, action) => store.actOnCriticFinding(id, action)}
      onEdit={() => store.transitionStage('naming_personality', 'user_edit')}
      needsReviewCause="Positioning"
    >
      {content && (
        <div className="space-y-8">
          <section aria-labelledby="naming-directions-heading">
            <h2 id="naming-directions-heading" className="text-h3 font-semibold text-ink-950 mb-4">Naming Directions</h2>
            {content.naming_directions?.length > 0 ? (
              <div className="space-y-4">
                {content.naming_directions.map((dir, i) => (
                  <NamingDirectionCard
                    key={i}
                    dir={dir}
                    index={i}
                    onEditField={(field, val) => handleEditNamingField(i, field, val)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-500">No naming directions available.</p>
            )}
          </section>

          <section aria-labelledby="personality-heading">
            <h2 id="personality-heading" className="text-h3 font-semibold text-ink-950 mb-4">Personality</h2>

            <div className="space-y-4">
              <div>
                <p className="section-label mb-2">Personality Traits</p>
                {content.personality_traits?.length > 0 ? (
                  <div className="flex flex-wrap gap-2" role="list" aria-label="Personality traits">
                    {content.personality_traits.map((t, i) => (
                      <span
                        key={i}
                        className="badge-approved px-3 py-1.5 text-sm cursor-help"
                        title={t.justification}
                        role="listitem"
                        aria-label={`${t.trait}: ${t.justification}`}
                      >
                        {t.trait}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-500">No personality traits.</p>
                )}
              </div>

              <div>
                <p className="section-label mb-2">Traits to Avoid</p>
                {content.traits_to_avoid?.length > 0 ? (
                  <div className="flex flex-wrap gap-2" role="list" aria-label="Traits to avoid">
                    {content.traits_to_avoid.map((t, i) => (
                      <span key={i} className="badge-rejected px-3 py-1.5 text-sm" role="listitem">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-500">No traits to avoid specified.</p>
                )}
              </div>

              <div>
                <p className="section-label mb-2">Brand Principles</p>
                {content.brand_principles?.length > 0 ? (
                  <ol className="space-y-2" aria-label="Brand principles">
                    {content.brand_principles.map((p, i) => (
                      <li key={i} className="p-3 bg-surface-100 border border-border rounded-sm">
                        <p className="text-sm font-semibold text-ink-950">{i + 1}. {p.principle}</p>
                        <p className="text-xs text-ink-500 mt-0.5">{p.rationale}</p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-ink-500">No brand principles defined.</p>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </StageScreen>
  );
}
