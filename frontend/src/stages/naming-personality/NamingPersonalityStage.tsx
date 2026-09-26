import { GenericStage } from '../../components/GenericStage';

interface Trait { trait: string; justification: string; }
interface NamingDirection { territory: string; proposed_name: string; rationale: string; relationship_to_audience: string; relationship_to_positioning: string; potential_concern: string; critic_analysis: string; sharper_alternative: string; }
interface BrandPrinciple { principle: string; rationale: string; }

export function NamingPersonalityStage() {
  return (
    <GenericStage stage="naming_personality" stageNumber={3} title="Naming + Personality"
      description="Brand name directions, personality traits, and principles — grounded in approved positioning.">
      {(content) => {
        const naming = (content.naming_directions ?? []) as NamingDirection[];
        const traits = (content.personality_traits ?? []) as Trait[];
        const avoid = (content.traits_to_avoid ?? []) as string[];
        const principles = (content.brand_principles ?? []) as BrandPrinciple[];
        return (
          <div className="space-y-6">
            {/* Naming directions */}
            <section>
              <p className="section-label mb-3">Naming Directions</p>
              <div className="space-y-4">
                {naming.map((dir, i) => (
                  <div key={i} className="border border-border rounded-md p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="badge-draft">{dir.territory}</span>
                      <h3 className="text-h3 font-bold text-ink-950">{dir.proposed_name}</h3>
                    </div>
                    {[['Rationale', dir.rationale], ['Audience Relationship', dir.relationship_to_audience],
                      ['Positioning Relationship', dir.relationship_to_positioning], ['Concern', dir.potential_concern],
                      ['Critic Analysis', dir.critic_analysis], ['Sharper Alternative', dir.sharper_alternative]
                    ].map(([l, v]) => v && (
                      <div key={l}>
                        <p className="section-label mb-0.5">{l}</p>
                        <p className="text-sm text-ink-950">{v}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>

            {/* Personality */}
            <section>
              <p className="section-label mb-3">Personality Traits</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {traits.map((t, i) => (
                  <span key={i} className="badge-approved px-3 py-1.5 text-sm" title={t.justification}>{t.trait}</span>
                ))}
              </div>
              <p className="section-label mb-2">Traits to Avoid</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {avoid.map((t, i) => <span key={i} className="badge-rejected px-3 py-1.5 text-sm">{t}</span>)}
              </div>
              <p className="section-label mb-2">Brand Principles</p>
              <div className="space-y-2">
                {principles.map((p, i) => (
                  <div key={i} className="p-3 bg-surface-100 rounded-sm border border-border">
                    <p className="text-sm font-semibold text-ink-950">{i + 1}. {p.principle}</p>
                    <p className="text-xs text-ink-500 mt-0.5">{p.rationale}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        );
      }}
    </GenericStage>
  );
}
