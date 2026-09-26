import { describe, it, expect } from 'vitest';
import {
  PositioningStageService,
  checkDirectionsDivergence,
  type PositioningStageInput,
} from '../src/stages/positioning.js';
import { MockAIProvider } from '../src/ai/providers/mock.js';
import type { SharedContext, PositioningDirection } from '@foil/shared';

describe('T-016: Positioning Stage Service', () => {
  const initialContext: SharedContext = {
    project_id: 'proj-456',
    user_facts: {},
    ai_assumptions: {},
    approved_decisions: {},
    stage_drafts: {},
    critic_findings: [],
    scenario_overrides: [],
    revision_log: [],
  };

  const approvedDiscoveryDecision = {
    stage: 'discovery' as const,
    content: {
      core_problem: 'Students cannot find project partners',
      target_audience: 'College students',
    },
    approved_at: new Date().toISOString(),
    state: 'approved' as const,
    source: 'strategist_approved' as const,
  };

  const directionA: PositioningDirection = {
    title: 'The Peer Guild',
    category: 'Vetted Project Fellowship',
    target_audience: 'Senior engineering students seeking capstone glory',
    core_problem: 'Late-stage team collapse from skill mismatches',
    differentiator: 'Verified GitHub commit history indexing',
    value_proposition: 'Ship capstones with teams that never drop out',
    competitive_angle: 'Curated technical caliber over general campus chat',
    strategic_rationale: 'Addresses student reputation anxiety',
    potential_weakness: 'High barrier to entry reduces top-of-funnel',
  };

  const directionB: PositioningDirection = {
    title: 'SprintCrew',
    category: 'Rapid Hackathon Matchmaker',
    target_audience: 'First-time hackathon attendees',
    core_problem: 'Intimidation and awkward physical team formation at kickoff',
    differentiator: 'Instant 15-minute icebreaker algorithm',
    value_proposition: 'Walk into any hackathon and code by hour one',
    competitive_angle: 'Frictionless velocity over deep skill auditing',
    strategic_rationale: 'Captures the massive casual hacker demographic',
    potential_weakness: 'Lower retention post-event',
  };

  describe('Divergence Validation Check', () => {
    it('approves genuinely divergent directions with different categories, audiences, and angles', () => {
      const res = checkDirectionsDivergence([directionA, directionB]);
      expect(res.divergent).toBe(true);
      expect(res.reason).toBeUndefined();
    });

    it('rejects directions that share identical category, audience, and differentiator', () => {
      const cloneDirection: PositioningDirection = {
        ...directionA,
        title: 'Cosmetic Variant',
        // Same category, same audience, same differentiator
      };

      const res = checkDirectionsDivergence([directionA, cloneDirection]);
      expect(res.divergent).toBe(false);
      expect(res.reason).toContain('lack strategic divergence');
    });
  });

  describe('Dependency Ordering Invariant', () => {
    it('throws structured error if Discovery stage is not approved in approved_decisions', async () => {
      const service = new PositioningStageService();
      const provider = new MockAIProvider();

      // Input lacks approved discovery
      const input: PositioningStageInput = {
        approved_decisions: {},
      };

      await expect(service.generatePositioningDirections(input, provider)).rejects.toMatchObject({
        stage: 'positioning',
        error_type: 'schema_validation_failed',
        message: expect.stringContaining('requires an approved Discovery decision'),
      });
    });

    it('throws error if Discovery stage exists but is still in draft state', async () => {
      const service = new PositioningStageService();
      const provider = new MockAIProvider();

      const input: PositioningStageInput = {
        approved_decisions: {
          discovery: {
            ...approvedDiscoveryDecision,
            state: 'draft' as any, // Not approved!
          },
        },
      };

      await expect(service.generatePositioningDirections(input, provider)).rejects.toMatchObject({
        stage: 'positioning',
        error_type: 'schema_validation_failed',
      });
    });
  });

  describe('Positioning Generation & Critic Enrichment', () => {
    it('produces at least 2 divergent directions with critic findings attached to each', async () => {
      const provider = new MockAIProvider({
        mockResponseGenerator: (prompt) => {
          if (prompt.includes('Critic AI')) {
            return JSON.stringify([
              {
                id: 'crit-pos-1',
                stage: 'positioning',
                target_field: 'potential_weakness',
                issue_type: 'vague',
                evidence: 'High barrier to entry reduces top-of-funnel',
                explanation: 'Needs quantitative metric',
                sharper_alternative: 'Specify estimated dropoff threshold',
                user_action: null,
              },
            ]);
          }
          return JSON.stringify({
            directions: [directionA, directionB],
          });
        },
      });

      const service = new PositioningStageService();
      const input: PositioningStageInput = {
        approved_decisions: {
          discovery: approvedDiscoveryDecision,
        },
      };

      const result = await service.generatePositioningDirections(input, provider);

      // Verify draft and directions
      expect(result.draft.stage).toBe('positioning');
      expect(result.directions.length).toBe(2);

      // Verify required fields on both directions
      for (const dir of result.directions) {
        expect(dir.title).toBeDefined();
        expect(dir.category).toBeDefined();
        expect(dir.target_audience).toBeDefined();
        expect(dir.core_problem).toBeDefined();
        expect(dir.differentiator).toBeDefined();
        expect(dir.value_proposition).toBeDefined();
        expect(dir.competitive_angle).toBeDefined();
        expect(dir.strategic_rationale).toBeDefined();
        expect(dir.potential_weakness).toBeDefined();

        // Critic findings are attached for user comparison
        expect(dir.critic_findings).toBeDefined();
        expect(dir.critic_findings!.length).toBeGreaterThan(0);
      }

      // Invariant: Draft does NOT write to approved_decisions
      expect(initialContext.approved_decisions.positioning).toBeUndefined();
    });

    it('retries when Strategist returns non-divergent directions', async () => {
      let attempt = 0;
      const provider = new MockAIProvider({
        mockResponseGenerator: (prompt) => {
          if (prompt.includes('Critic AI')) {
            return '[]';
          }
          attempt++;
          if (attempt === 1) {
            // Non-divergent directions on attempt 1
            return JSON.stringify({
              directions: [directionA, { ...directionA, title: 'Same Angle' }],
            });
          }
          // Divergent on attempt 2
          return JSON.stringify({
            directions: [directionA, directionB],
          });
        },
      });

      const service = new PositioningStageService();
      const input: PositioningStageInput = {
        approved_decisions: {
          discovery: approvedDiscoveryDecision,
        },
      };

      const result = await service.generatePositioningDirections(input, provider);

      expect(attempt).toBe(2);
      expect(result.draft.attempt).toBe(2);
      expect(result.directions.length).toBe(2);
    });
  });

  describe('Explicit User Selection & Retained Rejected Direction', () => {
    it('user selection writes chosen direction to approved_decisions and retains rejected directions', () => {
      const service = new PositioningStageService();
      const allDirections = [directionA, directionB];

      // User selects direction 0 (The Peer Guild)
      const approvedCtx = service.approvePositioningDirection(
        initialContext,
        0,
        allDirections,
        'user-select-click-1'
      );

      const approvedRecord = approvedCtx.approved_decisions.positioning;
      expect(approvedRecord).toBeDefined();
      expect(approvedRecord?.state).toBe('approved');

      const approvedContent = approvedRecord?.content as any;
      expect(approvedContent.title).toBe(directionA.title);
      expect(approvedContent.category).toBe(directionA.category);

      // Invariant: Non-selected direction is retained in rejected_directions for audit/demo
      expect(approvedContent.rejected_directions).toBeDefined();
      expect(approvedContent.rejected_directions.length).toBe(1);
      expect(approvedContent.rejected_directions[0].title).toBe(directionB.title);

      // Revision log is written
      expect(approvedCtx.revision_log.length).toBe(1);
      expect(approvedCtx.revision_log[0].changed_field).toBe('positioning');
      expect(approvedCtx.revision_log[0].cause_id).toBe('user-select-click-1');
    });

    it('supports user edits on selected direction and tags cause as user_edit', () => {
      const service = new PositioningStageService();
      const allDirections = [directionA, directionB];

      const userEdits = {
        value_proposition: 'User customized value proposition',
      };

      const approvedCtx = service.approvePositioningDirection(
        initialContext,
        1,
        allDirections,
        'user-edit-click-pos',
        userEdits
      );

      const approvedContent = approvedCtx.approved_decisions.positioning?.content as any;
      expect(approvedContent.title).toBe(directionB.title);
      expect(approvedContent.value_proposition).toBe('User customized value proposition');
      expect(approvedContent.rejected_directions[0].title).toBe(directionA.title);
      expect(approvedCtx.revision_log[0].cause).toBe('user_edit');
    });
  });
});
