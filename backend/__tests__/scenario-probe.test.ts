import { describe, it, expect, vi } from 'vitest';
import { ScenarioProbeService } from '../src/stages/scenarioProbe.js';
import { MockAIProvider } from '../src/ai/providers/mock.js';
import type { SharedContext, StageName, ApprovedDecision } from '@foil/shared';

describe('T-029: Scenario Probe Backend & Branch Isolation', () => {
  const createMockGenerator = () => (prompt: string): string => {
    if (prompt.includes('You are the Critic AI')) {
      const stageMatch = prompt.match(/Draft to Evaluate \(([^)]+)\)/);
      const stage = stageMatch ? stageMatch[1] : 'naming_personality';
      return JSON.stringify([
        {
          id: 'crit-scen-1',
          stage,
          issue_type: 'cliche',
          target_field: 'tagline',
          evidence: 'Simulated evidence',
          explanation: 'Simulated explanation',
          sharper_alternative: 'Simulated sharper alternative',
          user_action: null,
        },
      ]);
    }

    if (prompt.includes('DiscoverySchema') || prompt.includes('Discovery output')) {
      return JSON.stringify({
        core_problem: 'Students cannot find capstone teammates',
        target_audience: 'University engineering students',
        context_situation: 'Senior project season',
        user_goals: 'Form reliable teams',
        constraints: 'Short deadline',
        value_desired_outcome: 'Zero dropout teams',
        open_questions: ['Are faculty involved?'],
        known_facts: ['Capstone is mandatory'],
        inferred_assumptions: [{ value: 'Students feel anxious', rationale: 'High stakes' }],
      });
    }

    if (prompt.includes('PositioningSchema') || prompt.includes('positioning directions')) {
      return JSON.stringify({
        directions: [
          {
            title: 'Direction A',
            category: 'Category A',
            target_audience: 'Audience A',
            core_problem: 'Problem A',
            differentiator: 'Diff A',
            value_proposition: 'Value A',
            competitive_angle: 'Angle A',
            strategic_rationale: 'Rationale A',
            potential_weakness: 'Weakness A',
          },
          {
            title: 'Direction B',
            category: 'Category B',
            target_audience: 'Audience B',
            core_problem: 'Problem B',
            differentiator: 'Diff B',
            value_proposition: 'Value B',
            competitive_angle: 'Angle B',
            strategic_rationale: 'Rationale B',
            potential_weakness: 'Weakness B',
          },
        ],
      });
    }

    if (prompt.includes('NamingPersonalitySchema') || prompt.includes('naming directions')) {
      return JSON.stringify({
        naming_directions: [
          {
            territory: 'Peer Cohort',
            proposed_name: 'BranchedName',
            rationale: 'Strategic name for scenario branch',
            relationship_to_audience: 'Audience resonation',
            relationship_to_positioning: 'Positioning alignment',
            potential_concern: 'Slightly technical',
            critic_analysis: 'Solid name direction',
            sharper_alternative: 'BranchedName Pro',
          },
        ],
        personality_traits: [
          { trait: 'Decisive', audience_justification: 'Helps students commit' },
          { trait: 'Supportive', audience_justification: 'Reduces team friction' },
          { trait: 'Honest', audience_justification: 'Clear expectation setting' },
        ],
        traits_to_avoid: ['Arrogant'],
        brand_principles: [{ principle: 'Transparency first', rationale: 'Builds trust' }],
      });
    }

    if (prompt.includes('TaglinePitchSchema') || prompt.includes('tagline options')) {
      return JSON.stringify({
        tagline_options: ['Branch Tagline 1', 'Branch Tagline 2'],
        one_line_pitch: 'The branched brand platform for high-velocity teams.',
        rationale_per_tagline: ['Rationale for option 1', 'Rationale for option 2'],
      });
    }

    if (prompt.includes('VisualBriefSchema') || prompt.includes('visual concept')) {
      return JSON.stringify({
        logo_direction: 'Geometric modern mark',
        color_mood: 'Electric cobalt and vivid mint',
        hex_palette: ['#1E40AF', '#10B981', '#F3F4F6'],
        type_roles: ['Header: Inter Bold', 'Body: Inter Regular'],
        shape_language: 'Sharp angled geometric forms',
        symbol_language: 'Intersecting nodes',
        composition_layout: 'High-contrast asymmetric grid',
        imagery_direction: 'Documentary style candid photos',
        concepts_to_avoid: ['Cartoon illustrations'],
        rationale_linking_to_audience_and_positioning: 'Communicates technical precision',
      });
    }

    if (prompt.includes('VoiceMessagingSchema') || prompt.includes('brand voice')) {
      return JSON.stringify({
        voice_description: 'Pragmatic, sharp, and founder-aligned',
        tone_characteristics: ['Clear', 'Direct', 'Unflinching'],
        do_list: ['State facts directly', 'Use action verbs'],
        dont_list: ['Corporate buzzwords', 'Empty flattery'],
        sample_messages: [
          { message: 'Ship today.', explanation: 'Action oriented' },
          { message: 'Your team is ready.', explanation: 'Reassuring' },
          { message: 'No more stalled projects.', explanation: 'Solves problem' },
        ],
      });
    }

    if (prompt.includes('LaunchPrepSchema') || prompt.includes('launch-ready copy')) {
      return JSON.stringify({
        landing_headline: 'Branched Landing Headline For Hackers',
        social_launch_post: 'Excited to announce our branched brand scenario!',
      });
    }

    return '{}';
  };

  const createInitialFullContext = (): SharedContext => {
    const now = '2026-09-26T12:00:00.000Z';
    const makeApproved = (stage: StageName, content: Record<string, unknown>): ApprovedDecision => ({
      stage,
      content,
      approved_at: now,
      state: 'approved',
      source: 'strategist_approved',
    });

    return {
      project_id: 'proj-scenario-test',
      user_facts: { company_name: 'FoilOrg' },
      ai_assumptions: {},
      approved_decisions: {
        discovery: makeApproved('discovery', { core_problem: 'Original Problem' }),
        positioning: makeApproved('positioning', { title: 'Original Enterprise Positioning' }),
        naming_personality: makeApproved('naming_personality', { proposed_name: 'OriginalCorp' }),
        tagline_pitch: makeApproved('tagline_pitch', { tagline_options: ['Original Tagline'] }),
        visual_brief: makeApproved('visual_brief', { color_mood: 'Corporate Navy' }),
        voice_messaging: makeApproved('voice_messaging', { voice_description: 'Formal' }),
        launch_prep: makeApproved('launch_prep', { landing_headline: 'Original Headline' }),
      },
      stage_drafts: {},
      critic_findings: [],
      scenario_overrides: [],
      revision_log: [],
    };
  };

  describe('Branch Creation & Isolation (T-029 Invariants)', () => {
    it('creates an isolated branch with drafts only for affected fields', async () => {
      const provider = new MockAIProvider({ mockResponseGenerator: createMockGenerator() });
      const service = new ScenarioProbeService();
      const ctx = createInitialFullContext();

      // Trigger scenario probe from positioning: "What if we target bootstrapped solo founders?"
      const result = await service.createScenarioBranch(
        ctx,
        'positioning',
        'What if we target bootstrapped solo founders instead of enterprise?',
        provider
      );

      // Verify affected fields according to Section 16 dependency map
      expect(result.scenario_override.affected_fields).toEqual([
        'naming_personality',
        'tagline_pitch',
        'visual_brief',
        'voice_messaging',
        'launch_prep',
      ]);

      // Discovery and positioning themselves should NOT be in affected fields
      expect(result.scenario_override.affected_fields).not.toContain('discovery');
      expect(result.scenario_override.affected_fields).not.toContain('positioning');

      // Verify branch drafts populated for each affected field
      expect(result.scenario_override.branch_drafts.length).toBe(5);
      const draftedStages = result.scenario_override.branch_drafts.map((d) => d.stage);
      expect(draftedStages).toEqual([
        'naming_personality',
        'tagline_pitch',
        'visual_brief',
        'voice_messaging',
        'launch_prep',
      ]);

      // Verify comparisons structure
      expect(result.comparisons.length).toBe(5);
      const namingComp = result.comparisons.find((c) => c.stage === 'naming_personality');
      expect(namingComp).toBeDefined();
      expect(namingComp?.original_content).toEqual({ proposed_name: 'OriginalCorp' });
      expect(namingComp?.original_state).toBe('approved');
      expect(namingComp?.branch_draft.stage).toBe('naming_personality');
      expect(namingComp?.critic_findings.length).toBeGreaterThan(0);
      expect(namingComp?.has_changes).toBe(true);

      // Hard Invariant: ctx.approved_decisions MUST BE 100% UNCHANGED
      expect(ctx.approved_decisions.positioning?.content).toEqual({
        title: 'Original Enterprise Positioning',
      });
      expect(ctx.approved_decisions.naming_personality?.content).toEqual({
        proposed_name: 'OriginalCorp',
      });
      expect(result.updated_context.approved_decisions.naming_personality?.content).toEqual({
        proposed_name: 'OriginalCorp',
      });
      expect(result.updated_context.approved_decisions.naming_personality?.state).toBe('approved');
    });

    it('ensures branch cannot overwrite original state by object reference or shared mutable data', async () => {
      const provider = new MockAIProvider({ mockResponseGenerator: createMockGenerator() });
      const service = new ScenarioProbeService();
      const ctx = createInitialFullContext();

      const result = await service.createScenarioBranch(
        ctx,
        'positioning',
        'What if we target high school students?',
        provider
      );

      const branchDraft = result.scenario_override.branch_drafts[0];
      // Intentionally mutate branch draft content in place
      (branchDraft.content as any).proposed_name = 'MUTATED_BRANCH_NAME';
      (branchDraft.content as any).new_injected_field = 'INJECTED';

      // Original context MUST NOT reflect any mutation
      expect((ctx.approved_decisions.naming_personality?.content as any).proposed_name).toBe(
        'OriginalCorp'
      );
      expect(
        (ctx.approved_decisions.naming_personality?.content as any).new_injected_field
      ).toBeUndefined();

      // Mutating original context MUST NOT reflect in branch draft
      (ctx.approved_decisions.naming_personality?.content as any).proposed_name = 'MUTATED_ORIGINAL';
      expect((branchDraft.content as any).proposed_name).toBe('MUTATED_BRANCH_NAME');
    });

    it('rejects with descriptive error if triggered from an unapproved stage', async () => {
      const provider = new MockAIProvider({ mockResponseGenerator: createMockGenerator() });
      const service = new ScenarioProbeService();
      const ctx = createInitialFullContext();
      delete ctx.approved_decisions.positioning;

      await expect(
        service.createScenarioBranch(ctx, 'positioning', 'What if?', provider)
      ).rejects.toThrow(/stage is not approved/);
    });

    it('rejects with error if whatIfInput is empty or whitespace', async () => {
      const provider = new MockAIProvider({ mockResponseGenerator: createMockGenerator() });
      const service = new ScenarioProbeService();
      const ctx = createInitialFullContext();

      await expect(
        service.createScenarioBranch(ctx, 'positioning', '   ', provider)
      ).rejects.toThrow(/non-empty what-if/);
    });

    it('handles failed reruns gracefully and leaves original state intact', async () => {
      const failingProvider = new MockAIProvider({ simulateError: true });
      const service = new ScenarioProbeService();
      const ctx = createInitialFullContext();

      await expect(
        service.createScenarioBranch(ctx, 'positioning', 'What if something fails?', failingProvider)
      ).rejects.toThrow(/Simulated provider failure/);

      // Verify original context was not mutated or partially populated
      expect(ctx.scenario_overrides).toHaveLength(0);
      expect(ctx.revision_log).toHaveLength(0);
      expect(ctx.approved_decisions.naming_personality?.content).toEqual({
        proposed_name: 'OriginalCorp',
      });
    });
  });

  describe('User Decision Actions: Keep Original | Accept Branch | Edit Branch', () => {
    it('keepOriginal records decision and leaves approved_decisions and revision_log untouched', async () => {
      const provider = new MockAIProvider({ mockResponseGenerator: createMockGenerator() });
      const service = new ScenarioProbeService();
      const ctx = createInitialFullContext();

      const probeResult = await service.createScenarioBranch(
        ctx,
        'positioning',
        'What if we target non-profits?',
        provider
      );

      const scenarioId = probeResult.scenario_override.id;
      const finalCtx = service.keepOriginal(probeResult.updated_context, scenarioId);

      const scenario = finalCtx.scenario_overrides.find((s) => s.id === scenarioId);
      expect(scenario?.decision).toBe('keep_original');

      // approved_decisions remains untouched
      expect(finalCtx.approved_decisions.naming_personality?.content).toEqual({
        proposed_name: 'OriginalCorp',
      });
      // No revision log entries created for keeping original
      expect(finalCtx.revision_log).toHaveLength(0);
    });

    it('acceptBranch writes all branch drafts to approved_decisions and generates revision records', async () => {
      const provider = new MockAIProvider({ mockResponseGenerator: createMockGenerator() });
      const service = new ScenarioProbeService();
      const ctx = createInitialFullContext();

      const probeResult = await service.createScenarioBranch(
        ctx,
        'positioning',
        'What if we pivot to open-source developers?',
        provider
      );

      const scenarioId = probeResult.scenario_override.id;
      const acceptedCtx = service.acceptBranch(probeResult.updated_context, scenarioId);

      // Verify scenario decision
      const scenario = acceptedCtx.scenario_overrides.find((s) => s.id === scenarioId);
      expect(scenario?.decision).toBe('accept_branch');

      // All 5 affected fields should be written to approved_decisions
      expect(acceptedCtx.approved_decisions.naming_personality?.state).toBe('approved');
      expect(acceptedCtx.approved_decisions.naming_personality?.source).toBe('scenario_accept');
      expect(
        (acceptedCtx.approved_decisions.naming_personality?.content as any).naming_directions[0]
          .proposed_name
      ).toBe('BranchedName');

      // Exactly 5 revision log entries created, one per accepted stage
      expect(acceptedCtx.revision_log.length).toBe(5);
      for (const rev of acceptedCtx.revision_log) {
        expect(rev.cause).toBe('scenario_accept');
        expect(rev.cause_id).toBe(scenarioId);
        expect(rev.previous_value).toBeDefined();
        expect(rev.new_value).toBeDefined();
        expect(rev.timestamp).toBeDefined();
      }

      // Unaffected stages remain in approved state with original values
      expect(acceptedCtx.approved_decisions.discovery?.content).toEqual({
        core_problem: 'Original Problem',
      });
      expect(acceptedCtx.approved_decisions.positioning?.content).toEqual({
        title: 'Original Enterprise Positioning',
      });
    });

    it('acceptBranch supports stageFilter to selectively accept specific stages from the branch', async () => {
      const provider = new MockAIProvider({ mockResponseGenerator: createMockGenerator() });
      const service = new ScenarioProbeService();
      const ctx = createInitialFullContext();

      const probeResult = await service.createScenarioBranch(
        ctx,
        'positioning',
        'What if we pivot?',
        provider
      );

      const scenarioId = probeResult.scenario_override.id;
      // Accept only naming_personality and tagline_pitch
      const acceptedCtx = service.acceptBranch(probeResult.updated_context, scenarioId, [
        'naming_personality',
        'tagline_pitch',
      ]);

      // Exactly 2 revision log entries created
      expect(acceptedCtx.revision_log.length).toBe(2);
      expect(acceptedCtx.revision_log.map((r) => r.changed_field)).toEqual([
        'naming_personality',
        'tagline_pitch',
      ]);

      // Naming personality is updated from branch
      expect(
        (acceptedCtx.approved_decisions.naming_personality?.content as any).naming_directions[0]
          .proposed_name
      ).toBe('BranchedName');

      // visual_brief was not in filter, so it should retain original content
      expect(acceptedCtx.approved_decisions.visual_brief?.content).toEqual({
        color_mood: 'Corporate Navy',
      });
    });

    it('editBranch writes user-edited content for a branch stage and logs revision with scenario cause', async () => {
      const provider = new MockAIProvider({ mockResponseGenerator: createMockGenerator() });
      const service = new ScenarioProbeService();
      const ctx = createInitialFullContext();

      const probeResult = await service.createScenarioBranch(
        ctx,
        'positioning',
        'What if we target high-growth startups?',
        provider
      );

      const scenarioId = probeResult.scenario_override.id;
      const userEditedNaming = {
        naming_directions: [
          {
            territory: 'User Territory',
            proposed_name: 'CustomEditedName',
            rationale: 'Founder edited',
            relationship_to_audience: 'Fit',
            relationship_to_positioning: 'Aligned',
            potential_concern: 'None',
            critic_analysis: 'Great',
            sharper_alternative: 'CustomEditedName Pro',
          },
        ],
        personality_traits: [
          { trait: 'Rapid', audience_justification: 'Speed' },
          { trait: 'Solid', audience_justification: 'Reliability' },
          { trait: 'Bold', audience_justification: 'Presence' },
        ],
        traits_to_avoid: ['Slow'],
        brand_principles: [{ principle: 'Speed wins', rationale: 'First to market' }],
      };

      const editedCtx = service.editBranch(
        probeResult.updated_context,
        scenarioId,
        'naming_personality',
        userEditedNaming
      );

      // Decision updated to 'edit'
      const scenario = editedCtx.scenario_overrides.find((s) => s.id === scenarioId);
      expect(scenario?.decision).toBe('edit');

      // Branch draft updated
      const branchDraft = scenario?.branch_drafts.find((d) => d.stage === 'naming_personality');
      expect((branchDraft?.content as any).naming_directions[0].proposed_name).toBe(
        'CustomEditedName'
      );

      // Approved decision updated through choke point
      expect(editedCtx.approved_decisions.naming_personality?.content).toEqual(userEditedNaming);
      expect(editedCtx.approved_decisions.naming_personality?.source).toBe('scenario_accept');

      // Revision record logged
      expect(editedCtx.revision_log.length).toBe(1);
      const rev = editedCtx.revision_log[0];
      expect(rev.changed_field).toBe('naming_personality');
      expect(rev.cause).toBe('scenario_accept');
      expect(rev.cause_id).toBe(scenarioId);
      expect(rev.new_value).toEqual(userEditedNaming);
      expect(rev.previous_value).toEqual({ proposed_name: 'OriginalCorp' });
    });
  });
});
