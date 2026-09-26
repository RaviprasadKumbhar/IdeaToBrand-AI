import { describe, it, expect } from 'vitest';
import { StrategistEngine } from '../src/strategist/index.js';
import { MockAIProvider } from '../src/ai/providers/mock.js';
import type { StageInput } from '@foil/shared';
import { STRATEGIST_PROMPT_BUILDERS } from '../src/strategist/prompts.js';

describe('T-005: Strategist Engine', () => {
  const mockDiscoveryPayload = {
    core_problem: 'Students cannot find project partners',
    target_audience: 'College students',
    context_situation: 'Hackathon team formation',
    user_goals: 'Build a winning project with trusted peers',
    constraints: 'Limited time and diverse skill levels',
    value_desired_outcome: 'Formed reliable team in under 24 hours',
    open_questions: ['How to verify skills?'],
    known_facts: ['Students attend same campus'],
    inferred_assumptions: [
      { value: 'Students prefer chat apps', rationale: 'Target demographic pattern' },
    ],
  };

  it('generates a draft and does NOT write or approve into shared context', async () => {
    const provider = new MockAIProvider({
      mockResponseGenerator: () => JSON.stringify(mockDiscoveryPayload),
    });

    const engine = new StrategistEngine();
    const input: StageInput = {
      raw_input: 'An app that helps college students find teammates for hackathons',
      approved_decisions: {},
    };

    const draft = await engine.generateDraft('discovery', input, provider);

    expect(draft.stage).toBe('discovery');
    expect(draft.content).toEqual(mockDiscoveryPayload);
    expect(draft.generated_at).toBeDefined();
    expect(draft.attempt).toBe(1);

    // Verify input.approved_decisions remains empty (Strategist has no authority to mutate)
    expect(Object.keys(input.approved_decisions).length).toBe(0);
  });

  it('filters context strictly to requiredApprovedStages', () => {
    const positioningBuilder = STRATEGIST_PROMPT_BUILDERS.positioning;
    expect(positioningBuilder.requiredApprovedStages).toEqual(['discovery']);

    const namingBuilder = STRATEGIST_PROMPT_BUILDERS.naming_personality;
    expect(namingBuilder.requiredApprovedStages).toEqual(['positioning']);

    const taglineBuilder = STRATEGIST_PROMPT_BUILDERS.tagline_pitch;
    expect(taglineBuilder.requiredApprovedStages).toEqual(['naming_personality']);

    const visualBuilder = STRATEGIST_PROMPT_BUILDERS.visual_brief;
    expect(visualBuilder.requiredApprovedStages).toEqual(['positioning', 'naming_personality']);
  });

  it('prompt template instructs model to separate known facts from inferred assumptions', () => {
    const discoveryPrompt = STRATEGIST_PROMPT_BUILDERS.discovery.buildPrompt({
      raw_input: 'Test Idea',
      approved_decisions: {},
    });

    expect(discoveryPrompt).toContain('KNOWN FACTS');
    expect(discoveryPrompt).toContain('INFERRED ASSUMPTIONS');
    expect(discoveryPrompt).toContain('NEVER present an AI inference as a confirmed user fact');
  });

  it('postValidator rejects naming drafts containing forbidden trademark or domain availability claims', async () => {
    const invalidNamingPayload = {
      naming_directions: [
        {
          territory: 'Tech',
          proposed_name: 'TeamMatch',
          rationale: 'Simple name and the domain is available right now',
          relationship_to_audience: 'Clear',
          relationship_to_positioning: 'Matches',
          potential_concern: 'Generic',
          critic_analysis: 'Slightly bland',
          sharper_alternative: 'GuildLink',
        },
      ],
      personality_traits: [
        { trait: 'Resourceful', audience_justification: 'J1' },
        { trait: 'Sharp', audience_justification: 'J2' },
        { trait: 'Collaborative', audience_justification: 'J3' },
      ],
      traits_to_avoid: ['Arrogant'],
      brand_principles: [{ principle: 'Builders first', rationale: 'Shipping focus' }],
    };

    const provider = new MockAIProvider({
      mockResponseGenerator: () => JSON.stringify(invalidNamingPayload),
    });

    const engine = new StrategistEngine();
    const input: StageInput = {
      approved_decisions: {
        positioning: {
          stage: 'positioning',
          content: { directions: [] },
          approved_at: new Date().toISOString(),
          state: 'approved',
          source: 'strategist_approved',
        },
      },
    };

    // Should fail with schema_validation_failed after retries due to forbidden claim
    await expect(engine.generateDraft('naming_personality', input, provider)).rejects.toMatchObject({
      stage: 'naming_personality',
      error_type: 'schema_validation_failed',
    });
  });
});
