import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFOILStore } from '../../store/foilStore';
import { StageScreen } from '../../components/StageScreen';
import { generateStage } from '../../lib/api-client';
import { EditableField } from '../../components/EditableField';
import type { CriticFinding } from '../../../../shared/types';
import { v4 as uuid } from 'uuid';

export interface PositioningDirection {
  title: string;
  category?: string;
  target_audience: string;
  core_problem: string;
  differentiator: string;
  value_proposition: string;
  competitive_angle?: string;
  strategic_rationale: string;
  potential_weakness: string;
  critic_findings?: Array<{
    issue_type?: string;
    explanation?: string;
    sharper_alternative?: string;
    evidence?: string;
  }>;
}

export interface PositioningContent {
  directions: PositioningDirection[];
  selected_direction?: PositioningDirection;
}

interface DirectionCardProps {
  dir: PositioningDirection;
  index: number;
  isApproved: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onApprove: () => void;
  onEdit: (field: keyof PositioningDirection, value: string) => void;
}

function DirectionCard({
  dir,
  index,
  isApproved,
  isSelected,
  onSelect,
  onApprove,
  onEdit,
}: DirectionCardProps) {
  const directionLetter = String.fromCharCode(65 + index);
  const label = `Direction ${directionLetter}`;

  return (
    <article
      tabIndex={0}
      aria-label={`${label}: ${dir.title}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={[
        'card flex flex-col justify-between overflow-hidden cursor-pointer transition-all duration-200 text-left',
        isSelected
          ? 'border-accent-600 ring-2 ring-accent-500/30 shadow-md bg-accent-50/15'
          : 'border-border hover:border-ink-500/40 hover:shadow-sm bg-white',
        isApproved && !isSelected ? 'opacity-50 cursor-default' : '',
      ].join(' ')}
    >
      <div>
        {/* Card Header with Direction Label and Selected Badge / Select Button */}
        <div
          className={[
            'p-4 border-b border-border flex items-center justify-between transition-colors',
            isSelected ? 'bg-accent-100/70' : 'bg-surface-100',
          ].join(' ')}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-accent-700 bg-white px-2 py-0.5 rounded border border-accent-200 shadow-2xs">
              {label}
            </span>
            {dir.category && (
              <span className="text-xs text-ink-500 font-medium">
                {dir.category}
              </span>
            )}
          </div>
          {isSelected ? (
            <span className="badge-approved" aria-label="Selected">
              ✓ Selected
            </span>
          ) : (
            <button
              type="button"
              id={`btn-select-direction-${index}`}
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              className="text-xs text-accent-700 bg-accent-100/80 hover:bg-accent-200 px-2.5 py-1 rounded-full font-medium transition-colors border border-accent-300"
              aria-label={`Select Direction ${directionLetter}: ${dir.title}`}
            >
              Select this direction
            </button>
          )}
        </div>

        {/* Card Body */}
        <div className="p-5 space-y-4">
          {/* 1. Direction Title */}
          <div>
            <h3 className="text-lg font-bold text-ink-950 tracking-tight uppercase">
              {dir.title}
            </h3>
          </div>

          {/* 2. One-line Value Proposition */}
          {dir.value_proposition && (
            <div className="p-3 bg-accent-50/60 border border-accent-100 rounded-lg">
              <EditableField
                label="Value Proposition"
                value={dir.value_proposition}
                disabled={isApproved}
                onSave={(v) => onEdit('value_proposition', v)}
              />
            </div>
          )}

          {/* 3. FOR (Target Audience) */}
          <div className="space-y-1">
            <EditableField
              label="FOR"
              value={dir.target_audience}
              disabled={isApproved}
              onSave={(v) => onEdit('target_audience', v)}
            />
          </div>

          {/* 4. THE PROBLEM (Core Problem) */}
          <div className="space-y-1">
            <EditableField
              label="THE PROBLEM"
              value={dir.core_problem}
              multiline
              disabled={isApproved}
              onSave={(v) => onEdit('core_problem', v)}
            />
          </div>

          {/* 5. WHAT MAKES IT DIFFERENT (Differentiator) */}
          <div className="space-y-1">
            <EditableField
              label="WHAT MAKES IT DIFFERENT"
              value={dir.differentiator}
              multiline
              disabled={isApproved}
              onSave={(v) => onEdit('differentiator', v)}
            />
          </div>

          {/* 6. WHY THIS DIRECTION (Strategic Rationale) */}
          <div className="space-y-1">
            <EditableField
              label="WHY THIS DIRECTION"
              value={dir.strategic_rationale}
              multiline
              disabled={isApproved}
              onSave={(v) => onEdit('strategic_rationale', v)}
            />
          </div>

          {/* 7. WATCH-OUT (Potential Weakness) */}
          <div className="space-y-1">
            <EditableField
              label="WATCH-OUT"
              value={dir.potential_weakness}
              multiline
              disabled={isApproved}
              onSave={(v) => onEdit('potential_weakness', v)}
            />
          </div>

          {/* Optional Competitive Angle */}
          {dir.competitive_angle && (
            <div className="space-y-1">
              <EditableField
                label="COMPETITIVE ANGLE"
                value={dir.competitive_angle}
                multiline
                disabled={isApproved}
                onSave={(v) => onEdit('competitive_angle', v)}
              />
            </div>
          )}

          {/* Human-readable Considerations (Critic findings on this direction) */}
          {dir.critic_findings && Array.isArray(dir.critic_findings) && dir.critic_findings.length > 0 && (
            <div className="pt-3 border-t border-border mt-3" aria-label="Considerations">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span aria-hidden="true">⚠</span> Considerations
              </p>
              <ul className="space-y-2 text-xs">
                {dir.critic_findings.map((f, fIdx) => (
                  <li key={fIdx} className="bg-amber-50/70 p-2.5 rounded border border-amber-200/70 text-ink-800">
                    <p className="font-semibold text-amber-900">{f.explanation || f.issue_type}</p>
                    {f.sharper_alternative && (
                      <p className="text-ink-700 mt-1">
                        <span className="font-medium text-amber-800">Sharper alternative:</span> {f.sharper_alternative}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer Button */}
      <div className="p-4 border-t border-border bg-surface-50/50 mt-auto">
        <button
          id={`btn-approve-direction-${index}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
            onApprove();
          }}
          disabled={isApproved && isSelected}
          className={[
            'w-full justify-center text-xs font-semibold py-2.5',
            isSelected ? 'btn-primary' : 'btn-secondary',
          ].join(' ')}
          aria-label={`Approve Direction ${directionLetter}: ${dir.title}`}
          aria-pressed={isSelected}
        >
          {isApproved && isSelected
            ? '✓ Approved Direction'
            : isSelected
            ? `✓ Approve Direction ${directionLetter}`
            : `Select & Approve Direction ${directionLetter}`}
        </button>
      </div>
    </article>
  );
}

export function PositioningStage() {
  const store = useFOILStore();
  const navigate = useNavigate();
  const ui = store.uiStates['positioning'];
  const draft = store.ctx.stage_drafts['positioning'];
  const approved = store.ctx.approved_decisions['positioning'];
  const findings = store.ctx.critic_findings.filter(f => f.stage === 'positioning');

  const rawContent = (approved?.content ?? draft?.content) as unknown as PositioningContent | undefined;
  const [localDirections, setLocalDirections] = useState<PositioningDirection[] | null>(null);

  const directions = localDirections ?? rawContent?.directions ?? [];
  const selectedTitle =
    (approved?.content as any)?.title ||
    (approved?.content as unknown as PositioningContent | undefined)?.directions?.[0]?.title ||
    (approved?.content as unknown as PositioningContent | undefined)?.selected_direction?.title;

  const initialApprovedIndex = directions.findIndex(d => d.title === selectedTitle);

  const [selectedIdx, setSelectedIdx] = useState<number | null>(() => {
    if (initialApprovedIndex >= 0) return initialApprovedIndex;
    return null;
  });

  const activeSelectedIdx = selectedIdx ?? (initialApprovedIndex >= 0 ? initialApprovedIndex : null);
  const selectedDir = activeSelectedIdx !== null ? directions[activeSelectedIdx] : null;

  async function handleGenerate() {
    if (!store.ctx.approved_decisions.discovery || store.ctx.approved_decisions.discovery.state !== 'approved') {
      store.setError('positioning', {
        stage: 'positioning',
        error_type: 'schema_validation_failed',
        message: 'Positioning requires an approved Discovery foundation before it can run. Please complete and approve Stage 1 (Discovery) first.',
        retryable: false,
      });
      return;
    }

    setLocalDirections(null);
    setSelectedIdx(null);
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
      {
        ...dir,
        selected_direction: dir,
        directions: [dir],
        all_directions: directions,
      },
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
  const isDiscoveryApproved = store.ctx.approved_decisions.discovery?.state === 'approved';

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
      approveDisabled={activeSelectedIdx === null}
      onApprove={() => {
        if (activeSelectedIdx !== null) {
          handleApproveDirection(activeSelectedIdx);
        } else if (directions.length > 0) {
          handleApproveDirection(0);
        }
      }}
      onReject={() => store.rejectStage('positioning')}
      onRegenerate={handleGenerate}
      onFindingAction={(id, action) => store.actOnCriticFinding(id, action)}
      onEdit={() => store.transitionStage('positioning', { type: 'USER_EDIT' })}
      needsReviewCause="Discovery"
    >
      {directions.length > 0 ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-surface-50 border border-border p-5 rounded-xl">
            <h2 className="text-lg font-bold text-ink-950 mb-1">
              Choose your brand direction
            </h2>
            <p className="text-sm text-ink-600 leading-relaxed">
              We found two ways to position your product based on your audience, problem, and competitive opportunity. Review both options and choose the direction that best represents the brand you want to build.
            </p>
          </div>

          {/* Approved confirmation banner */}
          {isApproved && selectedDir && (
            <div
              className="p-5 bg-green-50/90 border border-green-200 rounded-xl transition-all"
              role="status"
              aria-live="polite"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span
                    className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-base flex-shrink-0"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-green-950">✓ Positioning approved</h3>
                    <p className="text-sm font-bold text-green-800 mt-0.5">{selectedDir.title}</p>
                    <p className="text-xs text-green-700 mt-1">
                      Your positioning is now part of the approved brand foundation.
                    </p>
                    <p className="text-xs font-semibold text-green-800 mt-2 bg-green-100/70 px-2.5 py-1 rounded inline-block">
                      Next: Naming → Tagline → Visual Identity → Voice → Launch
                    </p>
                  </div>
                </div>
                <button
                  id="btn-continue-to-naming"
                  onClick={() => navigate('/naming-personality')}
                  className="btn-primary text-xs whitespace-nowrap self-start sm:self-auto"
                >
                  Continue to Naming & Personality →
                </button>
              </div>
            </div>
          )}

          {/* Direction Cards Grid */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-5"
            role="region"
            aria-label="Positioning directions"
          >
            {directions.map((dir, i) => (
              <DirectionCard
                key={`${dir.title}-${i}`}
                dir={dir}
                index={i}
                isApproved={isApproved}
                isSelected={activeSelectedIdx === i}
                onSelect={() => !isApproved && setSelectedIdx(i)}
                onApprove={() => handleApproveDirection(i)}
                onEdit={(field, val) => handleEditField(i, field, val)}
              />
            ))}
          </div>

          {/* Approval Section */}
          {!isApproved && (
            <div className="p-6 bg-surface-50 border border-border rounded-xl mt-6">
              <div className="mb-4">
                <h4 className="text-sm font-bold text-ink-950 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <span aria-hidden="true">💡</span> Why does this matter?
                </h4>
                <p className="text-xs text-ink-600 leading-relaxed max-w-2xl">
                  Your positioning is the strategic foundation for the rest of your brand. FOIL will use this decision to keep your name, tagline, messaging, visuals, and launch plan aligned.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white border border-border rounded-lg shadow-2xs">
                <div>
                  <p className="text-xs text-ink-500 font-medium">Selected direction:</p>
                  <p className="text-sm font-bold text-ink-950">
                    {selectedDir ? (
                      <span className="text-accent-700 flex items-center gap-1.5">
                        <span className="text-green-600 font-bold">✓</span> Selected: {selectedDir.title}
                      </span>
                    ) : (
                      <span className="text-ink-400 italic font-normal">None selected — choose a direction above</span>
                    )}
                  </p>
                </div>

                <button
                  id="btn-approve-direction"
                  onClick={() => activeSelectedIdx !== null && handleApproveDirection(activeSelectedIdx)}
                  disabled={activeSelectedIdx === null || isApproved}
                  className="btn-primary whitespace-nowrap text-sm px-5 py-2.5"
                  aria-label="Approve this direction"
                >
                  Approve this direction →
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-4 space-y-3 text-center">
          {!isDiscoveryApproved && (
            <div className="p-3.5 border border-amber-200 bg-amber-50/50 rounded-lg max-w-md mx-auto text-left space-y-2">
              <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <span>⚠</span> Stage 1 Discovery Required
              </p>
              <p className="text-xs text-ink-600 leading-relaxed">
                Positioning directions are grounded in your approved Discovery foundation. Please complete and approve Stage 1 first.
              </p>
              <button
                id="btn-goto-discovery"
                onClick={() => navigate('/discovery')}
                className="btn-primary text-xs py-1 px-3"
              >
                Go to Discovery →
              </button>
            </div>
          )}
          <p className="text-sm text-ink-500">No directions loaded yet.</p>
        </div>
      )}
    </StageScreen>
  );
}
