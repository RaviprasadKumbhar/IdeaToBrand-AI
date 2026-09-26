import { useState } from 'react';
import { useFOILStore } from '../../store/foilStore';
import { StageScreen } from '../../components/StageScreen';
import { generateStage } from '../../lib/api-client';
import { EditableField } from '../../components/EditableField';
import type { CriticFinding } from '../../../../shared/types';
import { v4 as uuid } from 'uuid';

export interface PositioningDirection {
  title: string;
  category: string;
  target_audience: string;
  core_problem: string;
  differentiator: string;
  value_proposition: string;
  competitive_angle: string;
  strategic_rationale: string;
  potential_weakness: string;
}

export interface PositioningContent {
  directions: PositioningDirection[];
}

const DIRECTION_FIELDS: { key: keyof PositioningDirection; label: string }[] = [
  { key: 'category',          label: 'Category' },
  { key: 'target_audience',   label: 'Target Audience' },
  { key: 'core_problem',      label: 'Core Problem' },
  { key: 'differentiator',    label: 'Differentiator' },
  { key: 'value_proposition', label: 'Value Proposition' },
  { key: 'competitive_angle', label: 'Competitive Angle' },
  { key: 'strategic_rationale', label: 'Strategic Rationale' },
  { key: 'potential_weakness', label: 'Potential Weakness' },
];

interface DirectionCardProps {
  dir: PositioningDirection;
  index: number;
  isApproved: boolean;
  isSelected: boolean;
  onApprove: () => void;
  onEdit: (field: keyof PositioningDirection, value: string) => void;
}

function DirectionCard({ dir, index, isApproved, isSelected, onApprove, onEdit }: DirectionCardProps) {
  const label = `Direction ${String.fromCharCode(65 + index)}`;
  return (
    <article
      className={[
        'card flex flex-col gap-0 overflow-hidden transition-all duration-200',
        isSelected ? 'ring-2 ring-accent-600 border-accent-600' : '',
        isApproved && !isSelected ? 'opacity-50' : '',
      ].join(' ')}
      aria-label={`${label}: ${dir.title}`}
    >
      <div className={`p-4 ${isSelected ? 'bg-accent-100' : 'bg-surface-100'} border-b border-border`}>
        <p className="section-label mb-1">{label}</p>
        <h3 className="text-h3 font-bold text-ink-950">{dir.title}</h3>
        {isSelected && (
          <span className="badge-approved mt-2 inline-block">Selected</span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-4 flex-1">
        {DIRECTION_FIELDS.map(({ key, label: fieldLabel }) => (
          <EditableField
            key={key}
            label={fieldLabel}
            value={dir[key]}
            disabled={isApproved && !isSelected}
            onSave={(v) => onEdit(key, v)}
          />
        ))}
      </div>

      <div className="p-4 border-t border-border">
        <button
          id={`btn-approve-direction-${index}`}
          onClick={onApprove}
          disabled={isApproved && isSelected}
          className={[
            'w-full justify-center',
            isSelected ? 'btn-secondary' : 'btn-primary',
          ].join(' ')}
          aria-label={`Approve Direction ${String.fromCharCode(65 + index)}: ${dir.title}`}
          aria-pressed={isSelected}
        >
          {isSelected ? '✓ Approved' : `Select & Approve Direction ${String.fromCharCode(65 + index)}`}
        </button>
      </div>
    </article>
  );
}

export function PositioningStage() {
  const store = useFOILStore();
  const ui = store.uiStates['positioning'];
  const draft = store.ctx.stage_drafts['positioning'];
  const approved = store.ctx.approved_decisions['positioning'];
  const findings = store.ctx.critic_findings.filter(f => f.stage === 'positioning');

  const rawContent = (approved?.content ?? draft?.content) as unknown as PositioningContent | undefined;
  const [localDirections, setLocalDirections] = useState<PositioningDirection[] | null>(null);

  const directions = localDirections ?? rawContent?.directions ?? [];
  const selectedTitle = (approved?.content as unknown as PositioningContent | undefined)?.directions?.[0]?.title;
  const selectedIndex = directions.findIndex(d => d.title === selectedTitle);

  async function handleGenerate() {
    setLocalDirections(null);
    store.setLoading('positioning', true);
    store.setError('positioning', null);
    try {
      const result = await generateStage('positioning', {
        approved_decisions: store.ctx.approved_decisions,
        context: store.ctx,
      });
      store.setDraft('positioning', result.content);
      // Reset to draft then submit to critic (safe from any state)
      store.transitionStage('positioning', { type: 'RESET_STAGE' });
      store.transitionStage('positioning', { type: 'SUBMIT_CRITIC' });
      const newFindings: CriticFinding[] = result.findings.map(f => ({
        ...f, id: f.id ?? uuid(), stage: 'positioning' as const,
      }));
      store.addCriticFindings(newFindings);
      if (newFindings.length > 0) {
        store.transitionStage('positioning', { type: 'CRITIC_FINDINGS_DETECTED' });
      }
    } catch (err: unknown) {
      store.setError('positioning', {
        stage: 'positioning',
        error_type: 'provider_unavailable',
        message: err instanceof Error ? err.message : 'Generation failed.',
        retryable: true,
      });
    } finally {
      store.setLoading('positioning', false);
    }
  }

  function handleApproveDirection(index: number) {
    const dir = directions[index];
    if (!dir) return;
    const causeId = uuid();
    store.writeApprovedDecision(
      'positioning',
      { directions: [dir], all_directions: directions },
      'user_edit',
      causeId
    );
  }

  function handleEditField(dirIndex: number, field: keyof PositioningDirection, value: string) {
    const updated = directions.map((d, i) =>
      i === dirIndex ? { ...d, [field]: value } : d
    );
    setLocalDirections(updated);
    if (draft?.content) {
      store.setDraft('positioning', { ...draft.content, directions: updated });
    }
  }

  const approvalState = ui.approval_state;
  const isApproved = approvalState === 'approved';

  return (
    <StageScreen
      stage="positioning"
      stageNumber={2}
      title="Positioning"
      description="Compare strategic directions and approve the one that best represents the brand. Both directions show their full strategic reasoning."
      approvalState={approvalState}
      isLoading={ui.is_loading}
      error={ui.error}
      findings={findings}
      onApprove={() => directions[0] && handleApproveDirection(0)}
      onReject={() => store.rejectStage('positioning')}
      onRegenerate={handleGenerate}
      onFindingAction={(id, action) => store.actOnCriticFinding(id, action)}
      onEdit={() => store.transitionStage('positioning', { type: 'USER_EDIT' })}
      needsReviewCause="Discovery"
    >
      {directions.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-5" role="list" aria-label="Positioning directions">
          {directions.map((dir, i) => (
            <DirectionCard
              key={`${dir.title}-${i}`}
              dir={dir}
              index={i}
              isApproved={isApproved}
              isSelected={isApproved && i === selectedIndex}
              onApprove={() => handleApproveDirection(i)}
              onEdit={(field, val) => handleEditField(i, field, val)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink-500 text-center py-4">No directions loaded yet.</p>
      )}
    </StageScreen>
  );
}
