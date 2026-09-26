import { describe, it, expect } from 'vitest';
import {
  VoiceMessagingStageService,
  type VoiceMessagingStageInput,
} from '../src/stages/voiceMessaging.js';
import { MockAIProvider } from '../src/ai/providers/mock.js';
import type { SharedContext } from '@foil/shared';

describe('T-024: Voice + Messaging Stage Service', () => {
  const initialContext: SharedContext = {
    project_id: 'proj-voice',
    user_facts: {},
    ai_assumptions: {},
    approved_decisions: {},
    stage_drafts: {},
    critic_findings: [],
    scenario_overrides: [],
    revision_log: [],
  };

  const approvedNaming = {
    stage: 'naming_personality' as const,
    content: {
      name: 'Guildmate',
      personality_traits: [
        { trait: 'Pragmatic', audience_justification: 'J1' },
        { trait: 'Direct', audience_justification: 'J2' },
        { trait: 'Resourceful', audience_justification: 'J3' },
      ],
    },
    approved_at: new Date().toISOString(),
    state: 'approved' as const,
    source: 'strategist_approved' as const,
  };

  const validVoicePayload = {
    voice_description: 'Direct, candid, builder-to-builder tone with dry humor and high technical respect.',
    tone_characteristics: ['Unflinching', 'Constructive', 'Pragmatic', 'No-nonsense'],
    do_list: ['State facts directly', 'Use engineering terms accurately', 'Highlight completed projects'],
    dont_list: ['Use empty hype words', 'Sugarcoat project commitments', 'Talk down to builders'],
    sample_messages: [
      {
        message: 'Stop carrying group projects alone. Find teammates who commit code on day one.',
        explanation: 'Addresses chronic solo-burden pain in a direct peer tone.',
      },
      {
        message: 'Your hackathon idea is good. A team of four strangers who drop out at hour 12 is not.',
        explanation: 'Dry, realistic warning highlighting the value of peer validation.',
      },
      {
        message: 'Verified GitHub history beats a polished bio every single time.',
        explanation: 'Reinforces the core brand belief in demonstrable skill.',
      },
    ],
  };

  it('throws error when upstream Naming + Personality is missing from approved_decisions', async () => {
    const service = new VoiceMessagingStageService();
    const provider = new MockAIProvider();

    const input: VoiceMessagingStageInput = {
      approved_decisions: {},
    };

    await expect(service.generateVoiceMessagingDraft(input, provider)).rejects.toMatchObject({
      stage: 'voice_messaging',
      error_type: 'schema_validation_failed',
      message: expect.stringContaining('requires an approved Naming + Personality decision'),
    });
  });

  it('generates voice system with exactly 3 to 4 sample messages and explanations', async () => {
    const provider = new MockAIProvider({
      mockResponseGenerator: (prompt) => {
        if (prompt.includes('Critic AI')) {
          return '[]';
        }
        return JSON.stringify(validVoicePayload);
      },
    });

    const service = new VoiceMessagingStageService();
    const input: VoiceMessagingStageInput = {
      approved_decisions: {
        naming_personality: approvedNaming,
      },
    };

    const result = await service.generateVoiceMessagingDraft(input, provider);

    expect(result.draft.stage).toBe('voice_messaging');
    expect(result.content.voice_description).toBeDefined();
    expect(result.content.sample_messages.length).toBe(3);
    for (const msg of result.content.sample_messages) {
      expect(msg.message).toBeDefined();
      expect(msg.explanation).toBeDefined();
    }
  });

  it('enforces 3 to 4 sample messages constraint and retries if out of bounds', async () => {
    let attempt = 0;
    const provider = new MockAIProvider({
      mockResponseGenerator: (prompt) => {
        if (prompt.includes('Critic AI')) return '[]';
        attempt++;
        if (attempt === 1) {
          // Attempt 1: only 2 messages (too few)
          return JSON.stringify({
            ...validVoicePayload,
            sample_messages: [
              validVoicePayload.sample_messages[0],
              validVoicePayload.sample_messages[1],
            ],
          });
        }
        // Attempt 2: 3 messages (valid)
        return JSON.stringify(validVoicePayload);
      },
    });

    const service = new VoiceMessagingStageService();
    const input: VoiceMessagingStageInput = {
      approved_decisions: {
        naming_personality: approvedNaming,
      },
    };

    const result = await service.generateVoiceMessagingDraft(input, provider);
    expect(attempt).toBe(2);
    expect(result.draft.attempt).toBe(2);
    expect(result.content.sample_messages.length).toBe(3);
  });

  it('explicit approval writes decision to approved_decisions with revision log', () => {
    const service = new VoiceMessagingStageService();

    const approvedCtx = service.approveVoiceMessaging(
      initialContext,
      validVoicePayload,
      'user-approve-voice-1'
    );

    expect(approvedCtx.approved_decisions.voice_messaging).toBeDefined();
    expect(approvedCtx.approved_decisions.voice_messaging?.state).toBe('approved');
    expect(approvedCtx.revision_log.length).toBe(1);
    expect(approvedCtx.revision_log[0].changed_field).toBe('voice_messaging');
  });
});
