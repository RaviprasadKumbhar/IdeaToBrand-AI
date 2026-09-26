import { describe, it, expect } from 'vitest';
import {
  NamingPersonalityStageService,
  type NamingPersonalityStageInput,
} from '../src/stages/namingPersonality.js';
import { MockAIProvider } from '../src/ai/providers/mock.js';
import type { SharedContext } from '@foil/shared';

describe('T-018: Naming + Personality Stage Service', () => {
  const initialContext: SharedContext = {
    project_id: 'proj-naming',
    user_facts: {},
    ai_assumptions: {},
    approved_decisions: {},
    stage_drafts: {},
    critic_findings: [],
    scenario_overrides: [],
    revision_log: [],
  };

  const approvedPositioningDecision = {
    stage: 'positioning' as const,
    content: {
      title: 'PeerGuild',
      category: 'Vetted Project Fellowship',
      target_audience: 'Senior engineering students',
      differentiator: 'Skill-indexed matchmaking',
    },
    approved_at: new Date().toISOString(),
    state: 'approved' as const,
    source: 'strategist_approved' as const,
  };

  const validNamingPayload = {
    naming_directions: [
      {
        territory: 'Guild / Craft',
        proposed_name: 'Guildmate',
        rationale: 'Signals engineering camaraderie and mastery',
        relationship_to_audience: 'Directly appeals to student builders',
        relationship_to_positioning: 'Reinforces the fellowship and peer validation model',
        potential_concern: 'May evoke a gaming clan if not framed professionally',
        critic_analysis: 'Slightly informal for academic capstone presentations',
        sharper_alternative: 'GuildLink or PeerGuild',
      },
    ],
    personality_traits: [
      { trait: 'Pragmatic', audience_justification: 'Engineers respect shipping over hype' },
      { trait: 'Resourceful', audience_justification: 'Students work within zero-budget constraints' },
      { trait: 'Accountable', audience_justification: 'Directly addresses project abandonment fear' },
    ],
    traits_to_avoid: ['Pretentious', 'Bureaucratic'],
    brand_principles: [
      { principle: 'Code speaks louder than bios', rationale: 'Verified work matters most' },
    ],
  };

  it('throws error when upstream Positioning is missing or unapproved', async () => {
    const service = new NamingPersonalityStageService();
    const provider = new MockAIProvider();

    const input: NamingPersonalityStageInput = {
      approved_decisions: {},
    };

    await expect(service.generateNamingPersonalityDraft(input, provider)).rejects.toMatchObject({
      stage: 'naming_personality',
      error_type: 'schema_validation_failed',
      message: expect.stringContaining('requires an approved Positioning decision'),
    });
  });

  it('generates naming directions, 3-5 traits with justification, and attaches Critic findings', async () => {
    const provider = new MockAIProvider({
      mockResponseGenerator: (prompt) => {
        if (prompt.includes('Critic AI')) {
          return JSON.stringify([
            {
              id: 'crit-name-1',
              stage: 'naming_personality',
              target_field: 'proposed_name',
              issue_type: 'cliche',
              evidence: 'Use of "-mate" suffix',
              explanation: 'Common suffix in casual web apps',
              sharper_alternative: 'Consider GuildNode or GuildMesh',
              user_action: null,
            },
          ]);
        }
        return JSON.stringify(validNamingPayload);
      },
    });

    const service = new NamingPersonalityStageService();
    const input: NamingPersonalityStageInput = {
      approved_decisions: {
        positioning: approvedPositioningDecision,
      },
    };

    const result = await service.generateNamingPersonalityDraft(input, provider);

    expect(result.draft.stage).toBe('naming_personality');
    expect(result.content.naming_directions.length).toBeGreaterThan(0);
    expect(result.content.personality_traits.length).toBe(3);
    expect(result.content.personality_traits[0].audience_justification).toBeDefined();
    expect(result.content.traits_to_avoid.length).toBeGreaterThan(0);
    expect(result.content.brand_principles.length).toBeGreaterThan(0);

    // Critic findings attached
    expect(result.findings.length).toBe(1);
    expect(result.findings[0].issue_type).toBe('cliche');
  });

  it('strictly rejects drafts with unverified trademark or domain availability claims', async () => {
    const invalidPayload = {
      ...validNamingPayload,
      naming_directions: [
        {
          ...validNamingPayload.naming_directions[0],
          rationale: 'Great name and the .com domain is free and available',
        },
      ],
    };

    const provider = new MockAIProvider({
      mockResponseGenerator: () => JSON.stringify(invalidPayload),
    });

    const service = new NamingPersonalityStageService();
    const input: NamingPersonalityStageInput = {
      approved_decisions: {
        positioning: approvedPositioningDecision,
      },
    };

    await expect(service.generateNamingPersonalityDraft(input, provider)).rejects.toMatchObject({
      stage: 'naming_personality',
      error_type: 'schema_validation_failed',
    });
  });

  it('promotes draft to approved_decisions ONLY upon explicit approval and writes revision log', () => {
    const service = new NamingPersonalityStageService();

    const approvedCtx = service.approveNamingPersonality(
      initialContext,
      validNamingPayload,
      'user-approve-naming-1'
    );

    expect(approvedCtx.approved_decisions.naming_personality).toBeDefined();
    expect(approvedCtx.approved_decisions.naming_personality?.state).toBe('approved');
    expect(approvedCtx.revision_log.length).toBe(1);
    expect(approvedCtx.revision_log[0].changed_field).toBe('naming_personality');

    // Initial context unmodified
    expect(initialContext.approved_decisions.naming_personality).toBeUndefined();
  });
});
