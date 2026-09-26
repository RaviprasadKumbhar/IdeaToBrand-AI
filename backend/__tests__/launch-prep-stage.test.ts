import { describe, it, expect } from 'vitest';
import {
  LaunchPrepStageService,
  type LaunchPrepStageInput,
} from '../src/stages/launchPrep.js';
import { MockAIProvider } from '../src/ai/providers/mock.js';
import type { SharedContext } from '@foil/shared';

describe('T-026: Launch Prep Stage Service & Ordering Invariant', () => {
  const initialContext: SharedContext = {
    project_id: 'proj-launch',
    user_facts: {},
    ai_assumptions: {},
    approved_decisions: {},
    stage_drafts: {},
    critic_findings: [],
    scenario_overrides: [],
    revision_log: [],
  };

  const approvedPositioning = {
    stage: 'positioning' as const,
    content: { differentiator: 'Verified skill matchmaking' },
    approved_at: new Date().toISOString(),
    state: 'approved' as const,
    source: 'strategist_approved' as const,
  };

  const approvedNaming = {
    stage: 'naming_personality' as const,
    content: { name: 'Guildmate' },
    approved_at: new Date().toISOString(),
    state: 'approved' as const,
    source: 'strategist_approved' as const,
  };

  const approvedVoice = {
    stage: 'voice_messaging' as const,
    content: { voice_description: 'Pragmatic builder tone' },
    approved_at: new Date().toISOString(),
    state: 'approved' as const,
    source: 'strategist_approved' as const,
  };

  const validLaunchPayload = {
    landing_headline: 'Find hackathon teammates who actually finish what they start.',
    social_launch_post: 'Tired of carrying group projects alone? Guildmate indexes verified GitHub commits to match you with builders who ship. Live now.',
  };

  it('throws error when any of Positioning, Naming, or Voice is missing from approved_decisions', async () => {
    const service = new LaunchPrepStageService();
    const provider = new MockAIProvider();

    // Missing Voice
    const inputMissingVoice: LaunchPrepStageInput = {
      approved_decisions: {
        positioning: approvedPositioning,
        naming_personality: approvedNaming,
      },
    };

    await expect(service.generateLaunchPrepDraft(inputMissingVoice, provider)).rejects.toMatchObject({
      stage: 'launch_prep',
      error_type: 'schema_validation_failed',
      message: expect.stringContaining('requires an approved "voice_messaging" decision'),
    });
  });

  it('generates landing headline and social launch post with Critic evaluation', async () => {
    const provider = new MockAIProvider({
      mockResponseGenerator: (prompt) => {
        if (prompt.includes('Critic AI')) {
          return JSON.stringify([
            {
              id: 'crit-launch-1',
              stage: 'launch_prep',
              target_field: 'landing_headline',
              issue_type: 'cliche',
              evidence: 'Headline uses common format',
              explanation: 'Could be bolder regarding student pain point',
              sharper_alternative: 'Never get ghosted on a hackathon project again.',
              user_action: null,
            },
          ]);
        }
        return JSON.stringify(validLaunchPayload);
      },
    });

    const service = new LaunchPrepStageService();
    const input: LaunchPrepStageInput = {
      approved_decisions: {
        positioning: approvedPositioning,
        naming_personality: approvedNaming,
        voice_messaging: approvedVoice,
      },
    };

    const result = await service.generateLaunchPrepDraft(input, provider);

    expect(result.draft.stage).toBe('launch_prep');
    expect(result.content.landing_headline).toBe(validLaunchPayload.landing_headline);
    expect(result.content.social_launch_post).toBe(validLaunchPayload.social_launch_post);
    expect(result.findings.length).toBe(1);
    expect(result.findings[0].target_field).toBe('landing_headline');
  });

  it('CRITICAL ORDERING INVARIANT: assertLaunchPrepApprovedBeforeAudit blocks Consistency Audit if Launch Prep is not approved', () => {
    // Audit attempt with no launch_prep
    expect(() => {
      LaunchPrepStageService.assertLaunchPrepApprovedBeforeAudit({});
    }).toThrowError(/Holistic Consistency Audit MUST run after Launch Prep is approved/);

    // Audit attempt with launch_prep in draft state
    expect(() => {
      LaunchPrepStageService.assertLaunchPrepApprovedBeforeAudit({
        launch_prep: {
          stage: 'launch_prep',
          content: validLaunchPayload,
          approved_at: new Date().toISOString(),
          state: 'draft' as any,
          source: 'strategist_approved',
        },
      });
    }).toThrowError(/Holistic Consistency Audit MUST run after Launch Prep is approved/);

    // Audit succeeds when launch_prep is approved
    expect(() => {
      LaunchPrepStageService.assertLaunchPrepApprovedBeforeAudit({
        launch_prep: {
          stage: 'launch_prep',
          content: validLaunchPayload,
          approved_at: new Date().toISOString(),
          state: 'approved',
          source: 'strategist_approved',
        },
      });
    }).not.toThrow();
  });

  it('explicit approval writes decision to approved_decisions with revision log', () => {
    const service = new LaunchPrepStageService();

    const approvedCtx = service.approveLaunchPrep(
      initialContext,
      validLaunchPayload,
      'user-approve-launch-1'
    );

    expect(approvedCtx.approved_decisions.launch_prep).toBeDefined();
    expect(approvedCtx.approved_decisions.launch_prep?.state).toBe('approved');
    expect(approvedCtx.revision_log.length).toBe(1);
    expect(approvedCtx.revision_log[0].changed_field).toBe('launch_prep');
  });
});
