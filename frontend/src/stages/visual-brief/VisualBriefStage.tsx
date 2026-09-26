import { GenericStage } from '../../components/GenericStage';

/** VisualConceptBanner — required wrapper per architecture.md § 9, Stage 5. Cannot be omitted. */
function VisualConceptBanner() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-sm mb-4 text-xs text-amber-800 font-medium" role="note">
      <span aria-hidden="true">⚠</span>
      AI-generated visual concept / design direction — not production-ready artwork.
    </div>
  );
}

function ColorSwatch({ hex }: { hex: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded border border-border flex-shrink-0" style={{ backgroundColor: hex }} aria-label={`Color swatch ${hex}`} />
      <code className="text-xs font-mono text-ink-700">{hex}</code>
    </div>
  );
}

export function VisualBriefStage() {
  return (
    <GenericStage stage="visual_brief" stageNumber={5} title="Visual Brief"
      description="AI-generated visual direction — palette, typography, shape language, and imagery guidance.">
      {(content) => (
        <div className="space-y-4">
          <VisualConceptBanner />
          {[
            ['Logo Direction', content.logo_direction],
            ['Color Mood', content.color_mood],
            ['Shape Language', content.shape_language],
            ['Symbol Language', content.symbol_language],
            ['Composition / Layout', content.composition_layout],
            ['Imagery Direction', content.imagery_direction],
            ['Rationale', content.rationale_linking_to_audience_and_positioning],
          ].map(([l, v]) => v && (
            <div key={String(l)} className="border-b border-border pb-3">
              <p className="section-label mb-1">{String(l)}</p>
              <p className="text-sm text-ink-950">{String(v)}</p>
            </div>
          ))}

          {/* Colour palette swatches */}
          {Array.isArray(content.hex_palette) && (
            <div>
              <p className="section-label mb-2">HEX Palette</p>
              <div className="flex flex-wrap gap-3">
                {(content.hex_palette as string[]).map((hex) => (
                  <ColorSwatch key={hex} hex={hex} />
                ))}
              </div>
            </div>
          )}

          {/* Type roles */}
          {Array.isArray(content.type_roles) && (
            <div>
              <p className="section-label mb-2">Typography / Type Roles</p>
              {(content.type_roles as string[]).map((r, i) => (
                <p key={i} className="text-sm text-ink-950">{r}</p>
              ))}
            </div>
          )}

          {/* Concepts to avoid */}
          {Array.isArray(content.concepts_to_avoid) && (
            <div>
              <p className="section-label mb-2">Concepts to Avoid</p>
              <div className="flex flex-wrap gap-2">
                {(content.concepts_to_avoid as string[]).map((c, i) => (
                  <span key={i} className="badge-rejected">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </GenericStage>
  );
}
