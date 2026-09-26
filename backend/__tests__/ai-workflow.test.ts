import { describe, it, expect } from 'vitest';
import { StrategistEngine } from '../src/strategist/index.js';
import { CriticEngine } from '../src/critic/index.js';
import { RetryManager } from '../src/validation/retryManager.js';
import { MockAIProvider } from '../src/ai/providers/mock.js';
import { DiscoveryStageService } from '../src/stages/discovery.js';
import { PositioningStageService } from '../src/stages/positioning.js';
import { ConsistencyAuditService, ConsistencyAuditError } from '../src/stages/consistencyAudit.js';
import { ScenarioProbeService } from '../src/stages/scenarioProbe.js';
import {
  writeApprovedDecision,
  validateExportEligibility,
  affectedFields,
  markAffectedFieldsNeedsReview,
} from '@foil/shared';
import type {
  SharedContext,
  StageName,
  ApprovedDecision,
  ConsistencyFinding,
} from '@foil/shared';

describe('T-039: AI Workflow End-to-End Pipeline & Invariants', () => {
  const createBaseSharedContext = (): SharedContext => ({
    project_id: 'ai-workflow-test',
    user_facts: {
      business_name: 'CodeSync',
      industry: 'Developer Tools',
      target_user: 'Open source maintainers',
    },
    ai_assumptions: {
      pricing_model: { value: 'freemium', rationale: 'Standard open source adoption flywheel' },
    },
    approved_decisions: {},
    stage_drafts: {},
    critic_findings: [],
    scenario_overrides: [],
    revision_log: [],
  });

  describe('1. Facts vs. Assumptions Strict Separation (PRD Sec. 5, Architecture Sec. 7)', () => {
    it('Discovery stage separates user facts from AI assumptions with required rationales', async () => {
      const mockDiscoveryJSON = JSON.stringify({
        core_problem: 'Maintainers burn out reviewing pull requests',
        target_audience: 'Open source library authors',
        context_situation: 'High inbound PR volume on popular repos',
        user_goals: 'Filter out low-quality contributions quickly',
        constraints: 'Zero budget for commercial tooling',
        value_desired_outcome: 'Halve review turnaround time',
        open_questions: ['What languages are most impacted?'],
        known_facts: ['Maintainers work as unpaid volunteers'],
        inferred_assumptions: [
          {
            value: 'Maintainers prefer automated CI bot feedback over manual reviews',
            rationale: 'Reduces interpersonal friction with contributors',
          },
        ],
      });

      const provider = new MockAIProvider({
        mockResponseGenerator: (prompt) => {
          if (prompt.includes('You are the Critic AI')) {
            return JSON.stringify([]);
          }
          return mockDiscoveryJSON;
        },
      });
      const service = new DiscoveryStageService();

      const result = await service.generateDiscoveryDraft(
        {
          idea_text: 'A review triage tool for open source maintainers.',
          user_facts: ['Maintainers work as unpaid volunteers'],
          constraints: ['Open source only'],
        },
        provider
      );

      // Invariant: Inferred assumptions MUST have both value and rationale
      expect(result.content.inferred_assumptions.length).toBeGreaterThan(0);
      for (const item of result.content.inferred_assumptions) {
        expect(item.value).toBeDefined();
        expect(item.rationale).toBeDefined();
        expect(item.rationale.trim().length).toBeGreaterThan(0);
      }

      // Invariant: Known facts must not be converted to inferences
      expect(result.content.known_facts).toContain('Maintainers work as unpaid volunteers');
    });
  });

  describe('2. Approved-Decision Protection & Single Write Choke Point', () => {
    it('Strategist and Critic output cannot directly mutate approved_decisions', async () => {
      const ctx = createBaseSharedContext();
      const strategist = new StrategistEngine();
      const provider = new MockAIProvider({
        mockResponseGenerator: () =>
          JSON.stringify({
            core_problem: 'Problem',
            target_audience: 'Audience',
            context_situation: 'Context',
            user_goals: 'Goals',
            constraints: 'None',
            value_desired_outcome: 'Value',
            open_questions: [],
            known_facts: [],
            inferred_assumptions: [{ value: 'Assumed need', rationale: 'Common in space' }],
          }),
      });

      const draft = await strategist.generateDraft(
        'discovery',
        { approved_decisions: ctx.approved_decisions, raw_input: 'Idea' },
        provider
      );

      // Draft is returned, but approved_decisions in ctx is completely empty
      expect(draft.stage).toBe('discovery');
      expect(ctx.approved_decisions.discovery).toBeUndefined();

      // Only an explicit call to writeApprovedDecision can update approved_decisions
      const updatedCtx = writeApprovedDecision(
        ctx,
        'discovery',
        draft.content,
        'strategist_approved',
        'user-approval-action'
      );

      expect(updatedCtx.approved_decisions.discovery).toBeDefined();
      expect(updatedCtx.approved_decisions.discovery?.state).toBe('approved');
      expect(updatedCtx.revision_log.length).toBe(1);
      expect(updatedCtx.revision_log[0].cause).toBe('strategist_approved');
    });
  });

  describe('3. Malformed AI Output & Bounded Retry Limits', () => {
    it('retries malformed JSON up to 2 times (3 attempts max) before honest error reporting', async () => {
      let callCount = 0;
      const provider = new MockAIProvider({
        mockResponseGenerator: () => {
          callCount++;
          return 'THIS IS INVALID NON-JSON OUTPUT { broken';
        },
      });

      const retryManager = new RetryManager();
      const strategist = new StrategistEngine(retryManager);

      await expect(
        strategist.generateDraft(
          'discovery',
          { approved_decisions: {}, raw_input: 'Idea' },
          provider
        )
      ).rejects.toThrow(/Schema validation failed after 3 attempts/);

      // Exactly 3 attempts made: initial attempt + 2 retries
      expect(callCount).toBe(3);
    });

    it('recovers successfully when second attempt yields valid schema conforming output', async () => {
      let callCount = 0;
      const validDiscovery = {
        core_problem: 'Slow review times',
        target_audience: 'Maintainers',
        context_situation: 'PR backlogs',
        user_goals: 'Clear backlogs',
        constraints: 'None',
        value_desired_outcome: 'Efficiency',
        open_questions: [],
        known_facts: [],
        inferred_assumptions: [{ value: 'Need triage', rationale: 'High load' }],
      };

      const provider = new MockAIProvider({
        mockResponseGenerator: () => {
          callCount++;
          if (callCount === 1) {
            return '{ broken JSON';
          }
          return JSON.stringify(validDiscovery);
        },
      });

      const retryManager = new RetryManager();
      const strategist = new StrategistEngine(retryManager);

      const draft = await strategist.generateDraft(
        'discovery',
        { approved_decisions: {}, raw_input: 'Idea' },
        provider
      );

      expect(callCount).toBe(2);
      expect(draft.attempt).toBe(2);
      expect(draft.content.core_problem).toBe('Slow review times');
    });
  });

  describe('4. Stage Context Isolation & Upstream Requirements', () => {
    it('fails when required upstream decisions are missing from input', async () => {
      const positioningService = new PositioningStageService();
      const provider = new MockAIProvider();

      // Positioning requires approved discovery!
      await expect(
        positioningService.generatePositioningDirections(
          { approved_decisions: {} }, // discovery missing!
          provider
        )
      ).rejects.toThrow(/requires an approved Discovery decision/);
    });
  });

  describe('5. Strategist vs Critic Decoupled Roles & Sharper Alternative Invariant', () => {
    it('Critic strictly rejects findings with missing or whitespace sharper_alternative', async () => {
      const critic = new CriticEngine();
      const provider = new MockAIProvider({
        mockResponseGenerator: () =>
          JSON.stringify([
            {
              id: 'crit-no-alt',
              stage: 'discovery',
              target_field: 'core_problem',
              issue_type: 'vague',
              evidence: 'Too vague',
              explanation: 'Lacks specifics',
              sharper_alternative: '   ', // Invalid: empty whitespace
              user_action: null,
            },
          ]),
      });

      await expect(
        critic.critiqueStage(
          'discovery',
          { core_problem: 'Something is broken' },
          { approved_decisions: {} },
          provider
        )
      ).rejects.toThrow(/missing a required non-empty sharper_alternative/);
    });
  });

  describe('6. Scenario Probe Workflow & Invariants', () => {
    const createFullContext = (): SharedContext => {
      const now = new Date().toISOString();
      const makeApproved = (stage: StageName, content: Record<string, unknown>): ApprovedDecision => ({
        stage,
        content,
        approved_at: now,
        state: 'approved',
        source: 'strategist_approved',
      });

      return {
        project_id: 'scenario-wf-test',
        user_facts: { company: 'FoilApp' },
        ai_assumptions: {},
        approved_decisions: {
          discovery: makeApproved('discovery', { core_problem: 'Original problem' }),
          positioning: makeApproved('positioning', { title: 'Enterprise B2B' }),
          naming_personality: makeApproved('naming_personality', { proposed_name: 'CorpSync' }),
          tagline_pitch: makeApproved('tagline_pitch', { tagline_options: ['Original'] }),
          visual_brief: makeApproved('visual_brief', { color_mood: 'Navy' }),
          voice_messaging: makeApproved('voice_messaging', { voice_description: 'Formal' }),
          launch_prep: makeApproved('launch_prep', { landing_headline: 'Original' }),
        },
        stage_drafts: {},
        critic_findings: [],
        scenario_overrides: [],
        revision_log: [],
      };
    };

    it('reruns only affected fields and leaves original approved_decisions completely intact', async () => {
      const service = new ScenarioProbeService();
      const ctx = createFullContext();

      // Probing from positioning
      const affected = service.calculateAffectedStages('positioning');
      expect(affected).toEqual([
        'naming_personality',
        'tagline_pitch',
        'visual_brief',
        'voice_messaging',
        'launch_prep',
      ]);
      expect(affected).not.toContain('discovery');
      expect(affected).not.toContain('positioning');
    });

    it('dependency map marks affected fields needs_review while preserving content', () => {
      const ctx = createFullContext();
      const updated = markAffectedFieldsNeedsReview(ctx, 'positioning');

      // Affected fields marked needs_review
      expect(updated.approved_decisions.naming_personality?.state).toBe('needs_review');
      expect(updated.approved_decisions.tagline_pitch?.state).toBe('needs_review');

      // Content preserved
      expect(updated.approved_decisions.naming_personality?.content).toEqual({
        proposed_name: 'CorpSync',
      });

      // Unrelated fields remain approved
      expect(updated.approved_decisions.discovery?.state).toBe('approved');
      expect(updated.approved_decisions.positioning?.state).toBe('approved');
    });
  });

  describe('7. Holistic Consistency Audit Ordering & Export Gating End-to-End', () => {
    const makeApproved = (stage: StageName, content: Record<string, unknown>): ApprovedDecision => ({
      stage,
      content,
      approved_at: new Date().toISOString(),
      state: 'approved',
      source: 'strategist_approved',
    });

    const createFullContext = (): SharedContext => ({
      project_id: 'audit-gating-wf',
      user_facts: { company: 'BrandApp' },
      ai_assumptions: {},
      approved_decisions: {
        discovery: makeApproved('discovery', {
          core_problem: 'Students cannot find teams',
          target_audience: 'Senior engineering students',
        }),
        positioning: makeApproved('positioning', {
          title: 'Verified Capstones',
          category: 'Cohort Network',
          target_audience: 'Senior engineering students',
          value_proposition: 'Zero-dropout capstone teams through verified technical skill matching',
          differentiator: 'Verified GitHub commit history indexing',
        }),
        naming_personality: makeApproved('naming_personality', {
          proposed_name: 'PeerSync',
          naming_directions: [{ territory: 'Peer', proposed_name: 'PeerSync', rationale: 'Strategic' }],
          personality_traits: [{ trait: 'Rigorous' }],
          traits_to_avoid: ['Casual'],
          brand_principles: [{ principle: 'Verify code', rationale: 'Accountability' }],
        }),
        tagline_pitch: makeApproved('tagline_pitch', {
          tagline_options: ['Ship together.'],
          one_line_pitch: 'Verified capstone teams.',
          rationale_per_tagline: ['Direct'],
        }),
        visual_brief: makeApproved('visual_brief', {
          logo_direction: 'Modern geometric mark',
          color_mood: 'Cobalt and Slate',
          hex_palette: ['#1E40AF', '#64748B'],
          type_roles: ['Inter'],
          shape_language: 'Rectangles',
          symbol_language: 'Nodes',
          composition_layout: 'Grid',
          imagery_direction: 'Student labs',
          concepts_to_avoid: ['Stock photos'],
          rationale_linking_to_audience_and_positioning: 'Technical rigor',
        }),
        voice_messaging: makeApproved('voice_messaging', {
          voice_description: 'Pragmatic and direct',
          tone_characteristics: ['Direct'],
          do_list: ['Be concise'],
          dont_list: ['No fluff'],
          sample_messages: [{ message: 'Ship today.', explanation: 'Action' }],
        }),
        launch_prep: makeApproved('launch_prep', {
          landing_headline: 'Form Your Capstone Team Today',
          social_launch_post: 'Join PeerSync for verified senior design projects.',
        }),
      },
      stage_drafts: {},
      critic_findings: [],
      scenario_overrides: [],
      revision_log: [],
    });

    it('enforces audit gate: fails with 409 if Launch Prep has not been approved', async () => {
      const service = new ConsistencyAuditService();
      const ctx = createFullContext();
      delete ctx.approved_decisions.launch_prep; // Launch prep missing

      const provider = new MockAIProvider();

      await expect(service.runAudit(ctx.approved_decisions, provider)).rejects.toThrow(
        ConsistencyAuditError
      );
    });

    it('runs audit after Launch Prep, flags contradictions, and blocks export until resolved', async () => {
      const conflictFinding: ConsistencyFinding = {
        id: 'cons-conflict-1',
        fields_in_conflict: ['tagline_pitch.tagline_options', 'positioning.title'],
        issue_type: 'contradiction',
        evidence: 'Tagline implies casual fun while positioning targets strict engineering rigor',
        why_it_matters: 'Confuses customer expectation at first touchpoint',
        sharper_alternative: 'Change tagline to "Disciplined engineering teams."',
        user_action: null,
      };

      const provider = new MockAIProvider({
        mockResponseGenerator: () => JSON.stringify([conflictFinding]),
      });

      const auditService = new ConsistencyAuditService();
      const ctx = createFullContext();

      // 1. Run audit
      const findings = await auditService.runAudit(ctx.approved_decisions, provider);
      expect(findings).toHaveLength(1);

      // 2. Export MUST be gated/blocked because finding is unresolved
      const preResolutionGate = validateExportEligibility(ctx, findings);
      expect(preResolutionGate.eligible).toBe(false);
      expect(preResolutionGate.failure_reason).toContain('is unresolved');

      // 3. User accepts the finding
      const { updatedContext, updatedFindings } = auditService.resolveFinding(
        ctx,
        findings,
        'cons-conflict-1',
        'accept',
        { targetStage: 'tagline_pitch' }
      );

      // Finding is now resolved
      expect(updatedFindings[0].user_action).toBe('accept');

      // Approved decision updated and logged
      expect(updatedContext.approved_decisions.tagline_pitch?.source).toBe('consistency_finding');
      expect(updatedContext.revision_log.length).toBe(1);

      // 4. Export is now completely unblocked!
      const postResolutionGate = validateExportEligibility(updatedContext, updatedFindings);
      expect(postResolutionGate.eligible).toBe(true);
    });
  });
});
