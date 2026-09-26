import { describe, it, expect } from 'vitest';
import {
  TaglinePitchStageService,
  type TaglinePitchStageInput,
} from '../src/stages/taglinePitch.js';
import { MockAIProvider } from '../src/ai/providers/mock.js';
import type { SharedContext } from '@foil/shared';

describe('T-020: Tagline + Pitch Stage Service', () => {
  const initialContext: SharedContext = {
    project_id: 'proj-tagline',
    user_facts: {},
    ai_assumptions: {},
    approved_decisions: {},
    stage_drafts: {},
    critic_findings: [],
    scenario_overrides: [],
    revision_log: [],
  };

  const approvedNamingDecision = {
    stage: 'naming_personality' as const,
    content: {
      naming_directions: [{ proposed_name: 'Guildmate' }],
      personality_traits: [{ trait: 'Pragmatic', audience_justification: 'J1' }],
    },
    approved_at: new Date().toISOString(),
    state: 'approved' as const,
    source: 'strategist_approved' as const,
  };

  const validTaglinePayload = {
    tagline_options: [
      'Stop hacking alone.',
      'Teams that actually finish.',
      'Verified peers. Zero dropouts.',
    ],
    one_line_pitch: 'Guildmate matches student engineers into verified, high-accountability hackathon teams in minutes.',
    rationale_per_tagline: [
      'Direct, emotional imperative speaking to solo builder frustration.',
      'Focuses squarely on reliability pain point.',
      'Technical proof-point posture.',
    ],
  };

  it('throws error when upstream Naming + Personality is missing or unapproved', async () => {
    const service = new TaglinePitchStageService();
    const provider = new MockAIProvider();

    const input: TaglinePitchStageInput = {
      approved_decisions: {},
    };

    await expect(service.generateTaglinePitchDraft(input, provider)).rejects.toMatchObject({
      stage: 'tagline_pitch',
      error_type: 'schema_validation_failed',
      message: expect.stringContaining('requires an approved Naming + Personality decision'),
    });
  });

  it('generates tagline options and pitch with Critic evaluating competitor interchangeability', async () => {
    const provider = new MockAIProvider({
      mockResponseGenerator: (prompt) => {
        if (prompt.includes('Critic AI')) {
          return JSON.stringify([
            {
              id: 'crit-tag-1',
              stage: 'tagline_pitch',
              target_field: 'tagline_options',
              issue_type: 'cliche',
              evidence: 'Option "Teams that actually finish."',
              explanation: 'Could be claimed by any generic project management tool.',
              sharper_alternative: 'Lock in teammates with verified GitHub commits.',
              user_action: null,
            },
          ]);
        }
        return JSON.stringify(validTaglinePayload);
      },
    });

    const service = new TaglinePitchStageService();
    const input: TaglinePitchStageInput = {
      approved_decisions: {
        naming_personality: approvedNamingDecision,
      },
    };

    const result = await service.generateTaglinePitchDraft(input, provider);

    expect(result.draft.stage).toBe('tagline_pitch');
    expect(result.content.tagline_options.length).toBe(3);
    expect(result.content.one_line_pitch).toBeDefined();
    expect(result.findings.length).toBe(1);
    expect(result.findings[0].issue_type).toBe('cliche');
  });

  it('explicit approval writes decision to approved_decisions with revision log', () => {
    const service = new TaglinePitchStageService();

    const approvedCtx = service.approveTaglinePitch(
      initialContext,
      validTaglinePayload,
      'user-approve-tagline-1'
    );

    expect(approvedCtx.approved_decisions.tagline_pitch).toBeDefined();
    expect(approvedCtx.approved_decisions.tagline_pitch?.state).toBe('approved');
    expect(approvedCtx.revision_log.length).toBe(1);
    expect(approvedCtx.revision_log[0].changed_field).toBe('tagline_pitch');
  });
});
