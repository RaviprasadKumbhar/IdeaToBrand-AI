import { useFOILStore } from '../../store/foilStore';
import { StageScreen } from '../../components/StageScreen';
import { generateStage } from '../../lib/api-client';
import type { CriticFinding } from '../../../../shared/types';
import { v4 as uuid } from 'uuid';

export interface VisualBriefContent {
  logo_direction: string;
  color_mood: string;
  hex_palette: string[];
  type_roles: string[];
  shape_language: string;
  symbol_language: string;
  composition_layout: string;
  imagery_direction: string;
  concepts_to_avoid: string[];
  rationale_linking_to_audience_and_positioning: string;
}

function ConceptDisclaimer() {
  return (
    <div
      role="note"
      aria-label="AI-generated concept disclaimer"
      className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800 font-medium"
    >
      <span aria-hidden="true" className="text-amber-600 mt-0.5">⚠</span>
      <span>
        <strong>AI-generated visual concept / design direction</strong> — not production-ready artwork.
        Use these as creative briefs for a professional designer, not as final deliverables.
      </span>
    </div>
  );
}

function ColorSwatch({ hex }: { hex: string }) {
  const isValidHex = /^#[0-9A-Fa-f]{3,8}$/.test(hex);
  return (
    <div className="flex items-center gap-2.5" aria-label={`Color: ${hex}`}>
      <div
        className="w-10 h-10 rounded border border-border flex-shrink-0 shadow-sm"
        style={{ backgroundColor: isValidHex ? hex : 'transparent' }}
        aria-hidden="true"
      />
      <div>
        <code className="text-xs font-mono text-ink-700 block">{hex}</code>
        {!isValidHex && <span className="text-xs text-red-500">Invalid HEX</span>}
      </div>
    </div>
  );
}

interface FieldRowProps { label: string; value: string }
function FieldRow({ label, value }: FieldRowProps) {
  return (
    <div className="pb-3 border-b border-border last:border-0 last:pb-0">
      <p className="section-label mb-1">{label}</p>
      <p className="text-sm text-ink-950">{value}</p>
    </div>
  );
}

export function VisualBriefStage() {
  const store = useFOILStore();
  const ui = store.uiStates['visual_brief'];
  const draft = store.ctx.stage_drafts['visual_brief'];
  const approved = store.ctx.approved_decisions['visual_brief'];
  const findings = store.ctx.critic_findings.filter(f => f.stage === 'visual_brief');
  const content = (approved?.content ?? draft?.content) as unknown as VisualBriefContent | undefined;

  async function handleGenerate() {
    store.setLoading('visual_brief', true);
    store.setError('visual_brief', null);
    try {
      const result = await generateStage('visual_brief', {
        approved_decisions: store.ctx.approved_decisions,
        context: store.ctx,
      });
      store.setDraft('visual_brief', result.content);
      store.transitionStage('visual_brief', 'generate');
      const newFindings: CriticFinding[] = result.findings.map(f => ({
        ...f, id: f.id ?? uuid(), stage: 'visual_brief' as const,
      }));
      store.addCriticFindings(newFindings);
      store.transitionStage('visual_brief', newFindings.length > 0 ? 'critic_flag' : 'critic_pass');
    } catch (err: unknown) {
      store.setError('visual_brief', {
        stage: 'visual_brief',
        error_type: 'provider_unavailable',
        message: err instanceof Error ? err.message : 'Generation failed.',
        retryable: true,
      });
    } finally {
      store.setLoading('visual_brief', false);
    }
  }

  function handleApprove() {
    const c = draft?.content;
    if (!c) return;
    store.writeApprovedDecision('visual_brief', c, 'user_edit', uuid());
  }

  return (
    <StageScreen
      stage="visual_brief"
      stageNumber={5}
      title="Visual Brief"
      description="AI-generated visual direction — palette, typography, shape language, and imagery guidance for a professional designer."
      approvalState={ui.approval_state}
      isLoading={ui.is_loading}
      error={ui.error}
      findings={findings}
      onApprove={handleApprove}
      onReject={() => store.rejectStage('visual_brief')}
      onRegenerate={handleGenerate}
      onFindingAction={(id, action) => store.actOnCriticFinding(id, action)}
      onEdit={() => store.transitionStage('visual_brief', 'user_edit')}
      needsReviewCause="Tagline + Pitch"
    >
      {content && (
        <div className="space-y-5">
          <ConceptDisclaimer />

          <div className="space-y-3">
            {content.logo_direction && <FieldRow label="Logo Direction" value={content.logo_direction} />}
            {content.color_mood && <FieldRow label="Color Mood" value={content.color_mood} />}
            {content.shape_language && <FieldRow label="Shape Language" value={content.shape_language} />}
            {content.symbol_language && <FieldRow label="Symbol Language" value={content.symbol_language} />}
            {content.composition_layout && <FieldRow label="Composition / Layout" value={content.composition_layout} />}
            {content.imagery_direction && <FieldRow label="Imagery Direction" value={content.imagery_direction} />}
            {content.rationale_linking_to_audience_and_positioning && (
              <FieldRow
                label="Rationale (Audience + Positioning)"
                value={content.rationale_linking_to_audience_and_positioning}
              />
            )}
          </div>

          {content.hex_palette?.length > 0 && (
            <section aria-labelledby="hex-palette-heading">
              <h2 id="hex-palette-heading" className="section-label mb-3">HEX Palette</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {content.hex_palette.map(hex => (
                  <ColorSwatch key={hex} hex={hex} />
                ))}
              </div>
            </section>
          )}

          {content.type_roles?.length > 0 && (
            <section aria-labelledby="type-roles-heading">
              <h2 id="type-roles-heading" className="section-label mb-2">Typography / Type Roles</h2>
              <ul className="space-y-1.5" aria-label="Typography roles">
                {content.type_roles.map((role, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-ink-950">
                    <span className="text-accent-600 mt-0.5" aria-hidden="true">·</span>
                    {role}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {content.concepts_to_avoid?.length > 0 && (
            <section aria-labelledby="concepts-avoid-heading">
              <h2 id="concepts-avoid-heading" className="section-label mb-2">Concepts to Avoid</h2>
              <div className="flex flex-wrap gap-2" role="list" aria-label="Concepts to avoid">
                {content.concepts_to_avoid.map((c, i) => (
                  <span key={i} className="badge-rejected" role="listitem">{c}</span>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </StageScreen>
  );
}
