import { describe, it, expect } from 'vitest';
import { CriticEngine } from '../src/critic/index.js';
import { MockAIProvider } from '../src/ai/providers/mock.js';
import type { StageInput, CriticFinding, ConsistencyFinding } from '@foil/shared';

describe('T-006: Critic Engine', () => {
  const mockValidFindings: CriticFinding[] = [
    {
      id: 'crit-1',
      stage: 'positioning',
      target_field: 'differentiator',
      issue_type: 'cliche',
      evidence: 'Uses generic "all-in-one platform" phrase',
      explanation: 'Fails to communicate concrete technical advantage',
      sharper_alternative: 'Focus on automated skill verification and commit analysis',
      user_action: null,
    },
    {
      id: 'crit-2',
      stage: 'positioning',
      target_field: 'target_audience',
      issue_type: 'bias',
      evidence: 'Assumes all student hackers have high-end laptops',
      explanation: 'Alienates students working on shared lab hardware',
      sharper_alternative: 'Explicitly support browser-based dev environments',
      user_action: null,
    },
  ];

  it('generates structured findings supporting cliche, audience_mismatch, contradiction, vague, and bias', async () => {
    const provider = new MockAIProvider({
      mockResponseGenerator: () => JSON.stringify(mockValidFindings),
    });

    const engine = new CriticEngine();
    const input: StageInput = { approved_decisions: {} };
    const draftContent = { differentiator: 'All in one platform' };

    const findings = await engine.critiqueStage('positioning', draftContent, input, provider);

    expect(findings.length).toBe(2);
    expect(findings[0].issue_type).toBe('cliche');
    expect(findings[0].sharper_alternative).toBeDefined();
    expect(findings[0].user_action).toBeNull();
    expect(findings[1].issue_type).toBe('bias');
  });

  it('rejects findings missing a sharper_alternative and retries', async () => {
    const invalidFindings = [
      {
        id: 'crit-invalid',
        stage: 'discovery',
        target_field: 'core_problem',
        issue_type: 'vague',
        evidence: 'Too generic',
        explanation: 'Needs work',
        sharper_alternative: '', // Prohibited!
        user_action: null,
      },
    ];

    const provider = new MockAIProvider({
      mockResponseGenerator: () => JSON.stringify(invalidFindings),
    });

    const engine = new CriticEngine();
    const input: StageInput = { approved_decisions: {} };

    await expect(
      engine.critiqueStage('discovery', { core_problem: 'Some issue' }, input, provider)
    ).rejects.toMatchObject({
      error_type: 'schema_validation_failed',
    });
  });

  it('auditWholeSystem executes holistic consistency audit across the full brand system', async () => {
    const mockConsistencyFindings: ConsistencyFinding[] = [
      {
        id: 'cons-1',
        fields_in_conflict: ['naming_personality', 'voice_messaging'],
        issue_type: 'contradiction',
        evidence: 'Name is irreverent ("HackChaos") but voice is formal academic corporate',
        why_it_matters: 'Brand messaging feels discordant and untrustworthy',
        sharper_alternative: 'Adopt an irreverent, sharp builder voice aligned with HackChaos',
        user_action: null,
      },
    ];

    const provider = new MockAIProvider({
      mockResponseGenerator: () => JSON.stringify(mockConsistencyFindings),
    });

    const engine = new CriticEngine();
    const approvedDecisions = {
      naming_personality: {
        stage: 'naming_personality' as const,
        content: { name: 'HackChaos' },
        approved_at: new Date().toISOString(),
        state: 'approved' as const,
        source: 'strategist_approved' as const,
      },
      voice_messaging: {
        stage: 'voice_messaging' as const,
        content: { voice_description: 'Formal corporate academic prose' },
        approved_at: new Date().toISOString(),
        state: 'approved' as const,
        source: 'strategist_approved' as const,
      },
    };

    const findings = await engine.auditWholeSystem(approvedDecisions, provider);

    expect(findings.length).toBe(1);
    expect(findings[0].fields_in_conflict).toEqual(['naming_personality', 'voice_messaging']);
    expect(findings[0].issue_type).toBe('contradiction');
    expect(findings[0].sharper_alternative).toBeDefined();
  });
});
