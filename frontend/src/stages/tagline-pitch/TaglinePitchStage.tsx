import { GenericStage } from '../../components/GenericStage';

export function TaglinePitchStage() {
  return (
    <GenericStage stage="tagline_pitch" stageNumber={4} title="Tagline + Pitch"
      description="Tagline options and one-line pitch — each checked for competitor interchangeability.">
      {(content) => {
        const options = (content.tagline_options ?? []) as string[];
        const rationales = (content.rationale_per_tagline ?? []) as string[];
        const pitch = content.one_line_pitch as string;
        return (
          <div className="space-y-4">
            <section>
              <p className="section-label mb-3">Tagline Options</p>
              <div className="space-y-3">
                {options.map((t, i) => (
                  <div key={i} className="border border-border rounded-md p-4">
                    <p className="text-base font-semibold text-ink-950 mb-1">"{t}"</p>
                    <p className="text-xs text-ink-500">{rationales[i]}</p>
                  </div>
                ))}
              </div>
            </section>
            <section className="border-t border-border pt-4">
              <p className="section-label mb-2">One-Line Pitch</p>
              <p className="text-base text-ink-950 font-medium">{pitch}</p>
            </section>
          </div>
        );
      }}
    </GenericStage>
  );
}
