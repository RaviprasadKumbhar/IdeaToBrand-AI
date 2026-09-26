import { describe, it, expect } from 'vitest';
import {
  ConsistencyAuditService,
  ConsistencyAuditError,
} from '../src/stages/consistencyAudit.js';
import { MockAIProvider } from '../src/ai/providers/mock.js';
import {
  validateExportEligibility,
  writeApprovedDecision,
} from '@foil/shared';
import type {
  SharedContext,
  StageName,
  ApprovedDecision,
  ConsistencyFinding,
} from '@foil/shared';

describe('T-031: Holistic Consistency Audit Engine', () => {
  const createFullApprovedBrandSystem = (): Partial<Record<StageName, ApprovedDecision>> => {
    const now = '2026-09-26T12:00:00.000Z';
    const makeApproved = (stage: StageName, content: Record<string, unknown>): ApprovedDecision => ({
      stage,
      content,
      approved_at: now,
      state: 'approved',
      source: 'strategist_approved',
    });

    return {
      discovery: makeApproved('discovery', {
        core_problem: 'University engineering students struggle to assemble reliable capstone teams.',
        target_audience: 'Senior undergraduate engineering students',
      }),
      positioning: makeApproved('positioning', {
        title: 'CapstoneForge',
        category: 'Technical Cohort Network',
        target_audience: 'Senior engineering students',
        value_proposition: 'Zero-dropout capstone teams through verified technical skill matching',
      }),
      naming_personality: makeApproved('naming_personality', {
        proposed_name: 'CapstoneForge',
        personality_traits: [
          { trait: 'Rigorous', audience_justification: 'Engineers demand technical accuracy' },
          { trait: 'Pragmatic', audience_justification: 'Focuses on shipping code over talk' },
          { trait: 'Collaborative', audience_justification: 'Fosters mutual accountability' },
        ],
        traits_to_avoid: ['Flippant', 'Vague'],
        brand_principles: [{ principle: 'Verify before commitment', rationale: 'Prevents team collapse' }],
      }),
      tagline_pitch: makeApproved('tagline_pitch', {
        tagline_options: ['Built to ship.', 'No dropped commits.'],
        one_line_pitch: 'CapstoneForge pairs vetted engineers into durable capstone squads.',
        rationale_per_tagline: ['Assertive', 'Developer vernacular'],
      }),
      visual_brief: makeApproved('visual_brief', {
        logo_direction: 'Sharp architectural glyph',
        color_mood: 'Industrial steel and cobalt blue',
        hex_palette: ['#0F172A', '#2563EB', '#64748B'],
        type_roles: ['Display: Space Grotesk', 'Body: Inter'],
        shape_language: 'Modular rectangles and structural grid lines',
        symbol_language: 'Connected interlocking nodes',
        composition_layout: 'Precise technical drawing grid',
        imagery_direction: 'Real hardware engineering workshops and whiteboard architecture',
        concepts_to_avoid: ['Playful cartoon avatars'],
        rationale_linking_to_audience_and_positioning: 'Embodies engineering precision',
      }),
      voice_messaging: makeApproved('voice_messaging', {
        voice_description: 'Pragmatic, direct, and unsparingly honest',
        tone_characteristics: ['Direct', 'Technical', 'Reliable'],
        do_list: ['State facts with metrics', 'Use developer vocabulary'],
        dont_list: ['Marketing hyperbole', 'Juvenile slang'],
        sample_messages: [
          { message: 'Lock in your roster before kickoff.', explanation: 'Actionable deadline' },
          { message: 'Verified commits. No guesswork.', explanation: 'Technical differentiator' },
          { message: 'Ship your senior design project.', explanation: 'Goal focused' },
        ],
      }),
      launch_prep: makeApproved('launch_prep', {
        landing_headline: 'Form Your Senior Engineering Capstone Squad Today',
        social_launch_post: 'Senior design season is here. Form verified, reliable teams on CapstoneForge.',
      }),
    };
  };

  const createInitialSharedContext = (): SharedContext => ({
    project_id: 'proj-audit-test',
    user_facts: { company: 'CapstoneForge' },
    ai_assumptions: {},
    approved_decisions: createFullApprovedBrandSystem(),
    stage_drafts: {},
    critic_findings: [],
    scenario_overrides: [],
    revision_log: [],
  });

  describe('Audit Ordering & Launch Prep Gate (Section 18)', () => {
    it('throws 409 ConsistencyAuditError if Launch Prep is missing from approved decisions', async () => {
      const service = new ConsistencyAuditService();
      const approvedDecisions = createFullApprovedBrandSystem();
      delete approvedDecisions.launch_prep; // Launch prep missing

      const provider = new MockAIProvider();

      await expect(service.runAudit(approvedDecisions, provider)).rejects.toThrow(
        ConsistencyAuditError
      );

      try {
        await service.runAudit(approvedDecisions, provider);
      } catch (err: any) {
        expect(err.statusCode).toBe(409);
        expect(err.missingStage).toBe('launch_prep');
        expect(err.message).toContain('Launch Prep');
      }
    });

    it('throws 409 ConsistencyAuditError if Launch Prep is in draft state (not approved)', async () => {
      const service = new ConsistencyAuditService();
      const approvedDecisions = createFullApprovedBrandSystem();
      approvedDecisions.launch_prep = {
        ...approvedDecisions.launch_prep!,
        state: 'draft',
      };

      const provider = new MockAIProvider();

      await expect(service.runAudit(approvedDecisions, provider)).rejects.toThrow(
        ConsistencyAuditError
      );
    });

    it('throws 409 ConsistencyAuditError if an upstream stage before Launch Prep is missing', async () => {
      const service = new ConsistencyAuditService();
      const approvedDecisions = createFullApprovedBrandSystem();
      delete approvedDecisions.visual_brief; // Missing visual brief

      const provider = new MockAIProvider();

      try {
        await service.runAudit(approvedDecisions, provider);
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ConsistencyAuditError);
        expect(err.statusCode).toBe(409);
        expect(err.missingStage).toBe('visual_brief');
      }
    });
  });

  describe('Audit Execution & Finding Structure (T-031 Invariants)', () => {
    it('executes audit over complete approved brand system and returns structured findings', async () => {
      const mockFindings: ConsistencyFinding[] = [
        {
          id: 'cons-101',
          fields_in_conflict: ['naming_personality.personality_traits', 'tagline_pitch.tagline_options'],
          issue_type: 'contradiction',
          evidence: 'Tagline "Play all day" conflicts with Rigorous and Pragmatic traits',
          why_it_matters: 'Destroys technical credibility with serious engineering students',
          sharper_alternative: 'Change tagline to "Build with discipline, ship with pride"',
          user_action: null,
        },
      ];

      const provider = new MockAIProvider({
        mockResponseGenerator: () => JSON.stringify(mockFindings),
      });

      const service = new ConsistencyAuditService();
      const approvedDecisions = createFullApprovedBrandSystem();

      const findings = await service.runAudit(approvedDecisions, provider);

      expect(findings).toHaveLength(1);
      const finding = findings[0];
      expect(finding.id).toBe('cons-101');
      expect(finding.fields_in_conflict).toEqual([
        'naming_personality.personality_traits',
        'tagline_pitch.tagline_options',
      ]);
      expect(finding.issue_type).toBe('contradiction');
      expect(finding.evidence).toBeDefined();
      expect(finding.why_it_matters).toBeDefined();
      expect(finding.sharper_alternative).toBe('Change tagline to "Build with discipline, ship with pride"');
      expect(finding.user_action).toBeNull();
    });

    it('returns empty array when brand system is judged fully consistent', async () => {
      const provider = new MockAIProvider({
        mockResponseGenerator: () => JSON.stringify([]),
      });

      const service = new ConsistencyAuditService();
      const approvedDecisions = createFullApprovedBrandSystem();

      const findings = await service.runAudit(approvedDecisions, provider);
      expect(findings).toEqual([]);
    });

    it('rejects finding if sharper_alternative is empty or missing', async () => {
      const invalidFindings = [
        {
          id: 'cons-invalid',
          fields_in_conflict: ['positioning.title'],
          issue_type: 'cliche',
          evidence: 'Word is generic',
          why_it_matters: 'Weakens stance',
          sharper_alternative: '   ', // Empty whitespace!
          user_action: null,
        },
      ];

      const provider = new MockAIProvider({
        mockResponseGenerator: () => JSON.stringify(invalidFindings),
      });

      const service = new ConsistencyAuditService();
      const approvedDecisions = createFullApprovedBrandSystem();

      await expect(service.runAudit(approvedDecisions, provider)).rejects.toThrow(
        /sharper_alternative/
      );
    });

    it('never silently rewrites approved_decisions or auto-resolves findings', async () => {
      const mockFindings: ConsistencyFinding[] = [
        {
          id: 'cons-202',
          fields_in_conflict: ['launch_prep.landing_headline'],
          issue_type: 'vague',
          evidence: 'Headline lacks a concrete promise',
          why_it_matters: 'Low conversion',
          sharper_alternative: 'Join 500+ student engineers shipping capstones',
          user_action: null,
        },
      ];

      const provider = new MockAIProvider({
        mockResponseGenerator: () => JSON.stringify(mockFindings),
      });

      const service = new ConsistencyAuditService();
      const initialCtx = createInitialSharedContext();
      const originalHeadline = initialCtx.approved_decisions.launch_prep?.content;

      const findings = await service.runAudit(initialCtx.approved_decisions, provider);

      // Invariant: approved_decisions must NOT be touched or auto-resolved!
      expect(initialCtx.approved_decisions.launch_prep?.content).toEqual(originalHeadline);
      expect(findings[0].user_action).toBeNull();
    });
  });

  describe('Finding Resolution & Export Gating Integration (Section 18 & 19)', () => {
    const sampleFinding: ConsistencyFinding = {
      id: 'cons-gate-1',
      fields_in_conflict: ['tagline_pitch.selected_tagline'],
      issue_type: 'cliche',
      evidence: 'Tagline is overly generic',
      why_it_matters: 'Fails to differentiate',
      sharper_alternative: 'Verified squads, zero drama.',
      user_action: null,
    };

    it('unresolved finding blocks export via validateExportEligibility', () => {
      const ctx = createInitialSharedContext();
      const findings = [sampleFinding];

      // Finding is unresolved (user_action === null)
      const gateResult = validateExportEligibility(ctx, findings);
      expect(gateResult.eligible).toBe(false);
      expect(gateResult.failure_reason).toBe(`Consistency finding '${sampleFinding.id}' is unresolved`);
      expect(gateResult.unresolved_finding_id).toBe(sampleFinding.id);
    });

    it('resolveFinding with action "accept" updates approved_decisions and creates revision record', () => {
      const service = new ConsistencyAuditService();
      const ctx = createInitialSharedContext();
      const findings = [{ ...sampleFinding }];

      const { updatedContext, updatedFindings } = service.resolveFinding(
        ctx,
        findings,
        'cons-gate-1',
        'accept',
        { targetStage: 'tagline_pitch' }
      );

      // Finding is now resolved
      expect(updatedFindings[0].user_action).toBe('accept');

      // Approved decision is updated through choke point
      expect(updatedContext.approved_decisions.tagline_pitch?.source).toBe('consistency_finding');
      expect(
        (updatedContext.approved_decisions.tagline_pitch?.content as any).audit_resolved_alternative
      ).toBe('Verified squads, zero drama.');

      // Revision record is appended with cause consistency_finding_accept
      expect(updatedContext.revision_log.length).toBe(1);
      const rev = updatedContext.revision_log[0];
      expect(rev.changed_field).toBe('tagline_pitch');
      expect(rev.cause).toBe('consistency_finding_accept');
      expect(rev.cause_id).toBe('cons-gate-1');

      // Export is now permitted!
      const gateResult = validateExportEligibility(updatedContext, updatedFindings);
      expect(gateResult.eligible).toBe(true);
    });

    it('resolveFinding with action "reject" does not touch approved_decisions and unblocks export', () => {
      const service = new ConsistencyAuditService();
      const ctx = createInitialSharedContext();
      const findings = [{ ...sampleFinding }];

      const { updatedContext, updatedFindings } = service.resolveFinding(
        ctx,
        findings,
        'cons-gate-1',
        'reject'
      );

      // Finding is resolved as rejected
      expect(updatedFindings[0].user_action).toBe('reject');

      // approved_decisions NOT modified
      expect(updatedContext.approved_decisions.tagline_pitch?.source).toBe('strategist_approved');
      expect(updatedContext.revision_log).toHaveLength(0);

      // Export is permitted because rejection is an explicit user resolution
      const gateResult = validateExportEligibility(updatedContext, updatedFindings);
      expect(gateResult.eligible).toBe(true);
    });

    it('resolveFinding with action "edit" applies user-edited content and logs revision record', () => {
      const service = new ConsistencyAuditService();
      const ctx = createInitialSharedContext();
      const findings = [{ ...sampleFinding }];

      const userEditedContent = {
        tagline_options: ['Code together, graduate together.'],
        one_line_pitch: 'Custom founder pitch',
        rationale_per_tagline: ['Direct'],
      };

      const { updatedContext, updatedFindings } = service.resolveFinding(
        ctx,
        findings,
        'cons-gate-1',
        'edit',
        {
          targetStage: 'tagline_pitch',
          editedContent: userEditedContent,
        }
      );

      expect(updatedFindings[0].user_action).toBe('edit');
      expect(updatedContext.approved_decisions.tagline_pitch?.content).toEqual(userEditedContent);
      expect(updatedContext.revision_log[0].cause).toBe('consistency_finding_accept');

      const gateResult = validateExportEligibility(updatedContext, updatedFindings);
      expect(gateResult.eligible).toBe(true);
    });
  });
});
