import { describe, it, expect } from 'vitest';
import {
  DEPENDENCY_MAP,
  affectedFields,
  getAffectedDownstreamStages,
  markAffectedFieldsNeedsReview,
} from '@foil/shared';
import type { SharedContext, StageName, ApprovedDecision } from '@foil/shared';

describe('T-028: Dependency Engine & Map', () => {
  describe('Canonical Dependency Mapping (Section 16)', () => {
    it('accurately identifies immediate downstream affected fields for all stages', () => {
      expect(affectedFields('discovery')).toEqual([
        'positioning',
        'naming_personality',
        'visual_brief',
        'voice_messaging',
        'launch_prep',
      ]);

      expect(affectedFields('positioning')).toEqual([
        'naming_personality',
        'tagline_pitch',
        'visual_brief',
        'voice_messaging',
        'launch_prep',
        'consistency_audit',
      ]);

      expect(affectedFields('naming_personality')).toEqual([
        'tagline_pitch',
        'visual_brief',
        'voice_messaging',
        'launch_prep',
        'consistency_audit',
      ]);

      expect(affectedFields('tagline_pitch')).toEqual([
        'launch_prep',
        'consistency_audit',
      ]);

      expect(affectedFields('visual_brief')).toEqual(['consistency_audit']);

      expect(affectedFields('voice_messaging')).toEqual([
        'launch_prep',
        'consistency_audit',
      ]);

      expect(affectedFields('launch_prep')).toEqual(['consistency_audit']);

      expect(affectedFields('consistency_audit')).toEqual(['kit_export']);

      expect(affectedFields('kit_export')).toEqual([]);
    });

    it('returns empty array for unknown or leaf stages', () => {
      expect(affectedFields('kit_export')).toEqual([]);
      expect(affectedFields('non_existent' as StageName)).toEqual([]);
    });

    it('correctly calculates transitive downstream stages', () => {
      const discoveryDownstream = getAffectedDownstreamStages('discovery');
      expect(discoveryDownstream).toContain('positioning');
      expect(discoveryDownstream).toContain('naming_personality');
      expect(discoveryDownstream).toContain('tagline_pitch');
      expect(discoveryDownstream).toContain('visual_brief');
      expect(discoveryDownstream).toContain('voice_messaging');
      expect(discoveryDownstream).toContain('launch_prep');
      expect(discoveryDownstream).toContain('consistency_audit');
      expect(discoveryDownstream).toContain('kit_export');

      const visualDownstream = getAffectedDownstreamStages('visual_brief');
      expect(visualDownstream).toEqual(['consistency_audit', 'kit_export']);
    });
  });

  describe('Downstream Review Marking & Content Preservation (T-028 Invariants)', () => {
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
        project_id: 'test-project-t028',
        user_facts: { company_name: 'FoilApp' },
        ai_assumptions: {},
        approved_decisions: {
          discovery: makeApproved('discovery', { core_problem: 'Original problem statement' }),
          positioning: makeApproved('positioning', { title: 'Original positioning' }),
          naming_personality: makeApproved('naming_personality', { proposed_name: 'OriginalName' }),
          tagline_pitch: makeApproved('tagline_pitch', { tagline_options: ['Original Tagline'] }),
          visual_brief: makeApproved('visual_brief', { color_mood: 'Original Mood' }),
          voice_messaging: makeApproved('voice_messaging', { voice_description: 'Original Voice' }),
          launch_prep: makeApproved('launch_prep', { landing_headline: 'Original Headline' }),
        },
        stage_drafts: {},
        critic_findings: [],
        scenario_overrides: [],
        revision_log: [],
      };
    };

    it('marks only downstream affected fields needs_review when an upstream stage changes', () => {
      const initialCtx = createFullContext();

      // Positioning changes
      const updatedCtx = markAffectedFieldsNeedsReview(initialCtx, 'positioning');

      // Immediate affected fields of positioning:
      // naming_personality, tagline_pitch, visual_brief, voice_messaging, launch_prep, consistency_audit
      expect(updatedCtx.approved_decisions.naming_personality?.state).toBe('needs_review');
      expect(updatedCtx.approved_decisions.tagline_pitch?.state).toBe('needs_review');
      expect(updatedCtx.approved_decisions.visual_brief?.state).toBe('needs_review');
      expect(updatedCtx.approved_decisions.voice_messaging?.state).toBe('needs_review');
      expect(updatedCtx.approved_decisions.launch_prep?.state).toBe('needs_review');

      // Crucial: Upstream and unrelated decisions MUST remain approved
      expect(updatedCtx.approved_decisions.discovery?.state).toBe('approved');
      expect(updatedCtx.approved_decisions.positioning?.state).toBe('approved');
    });

    it('100% preserves existing content of affected fields (no blind wiping or regeneration)', () => {
      const initialCtx = createFullContext();
      const updatedCtx = markAffectedFieldsNeedsReview(initialCtx, 'positioning');

      // All existing contents must remain intact
      expect(updatedCtx.approved_decisions.naming_personality?.content).toEqual({
        proposed_name: 'OriginalName',
      });
      expect(updatedCtx.approved_decisions.tagline_pitch?.content).toEqual({
        tagline_options: ['Original Tagline'],
      });
      expect(updatedCtx.approved_decisions.visual_brief?.content).toEqual({
        color_mood: 'Original Mood',
      });
      expect(updatedCtx.approved_decisions.voice_messaging?.content).toEqual({
        voice_description: 'Original Voice',
      });
      expect(updatedCtx.approved_decisions.launch_prep?.content).toEqual({
        landing_headline: 'Original Headline',
      });
    });

    it('preserves unrelated approved decisions untouched when a downstream stage changes', () => {
      const initialCtx = createFullContext();

      // Visual Brief changes (only affects consistency_audit)
      const updatedCtx = markAffectedFieldsNeedsReview(initialCtx, 'visual_brief');

      // Discovery, Positioning, Naming, Tagline, Voice, Launch Prep must all remain approved!
      expect(updatedCtx.approved_decisions.discovery?.state).toBe('approved');
      expect(updatedCtx.approved_decisions.positioning?.state).toBe('approved');
      expect(updatedCtx.approved_decisions.naming_personality?.state).toBe('approved');
      expect(updatedCtx.approved_decisions.tagline_pitch?.state).toBe('approved');
      expect(updatedCtx.approved_decisions.visual_brief?.state).toBe('approved');
      expect(updatedCtx.approved_decisions.voice_messaging?.state).toBe('approved');
      expect(updatedCtx.approved_decisions.launch_prep?.state).toBe('approved');
    });

    it('does not touch stages that are not currently in approved state', () => {
      const initialCtx = createFullContext();
      // Set visual_brief to draft state
      initialCtx.approved_decisions.visual_brief = {
        stage: 'visual_brief',
        content: {},
        approved_at: new Date().toISOString(),
        state: 'draft',
        source: 'strategist_approved',
      };

      const updatedCtx = markAffectedFieldsNeedsReview(initialCtx, 'positioning');

      // visual_brief was not 'approved', so its state should remain 'draft'
      expect(updatedCtx.approved_decisions.visual_brief?.state).toBe('draft');
    });

    it('supports transitive review marking when requested via options', () => {
      const initialCtx = createFullContext();
      // When visual_brief changes with transitive: true, it should mark consistency_audit and kit_export if approved
      initialCtx.approved_decisions.consistency_audit = {
        stage: 'consistency_audit',
        content: {},
        approved_at: new Date().toISOString(),
        state: 'approved',
        source: 'strategist_approved',
      };

      const updatedCtx = markAffectedFieldsNeedsReview(initialCtx, 'visual_brief', { transitive: true });
      expect(updatedCtx.approved_decisions.consistency_audit?.state).toBe('needs_review');
    });

    it('guarantees immutability: returns a new context object and does not mutate the input', () => {
      const initialCtx = createFullContext();
      const updatedCtx = markAffectedFieldsNeedsReview(initialCtx, 'discovery');

      expect(updatedCtx).not.toBe(initialCtx);
      expect(updatedCtx.approved_decisions).not.toBe(initialCtx.approved_decisions);
      expect(initialCtx.approved_decisions.positioning?.state).toBe('approved');
      expect(updatedCtx.approved_decisions.positioning?.state).toBe('needs_review');
    });
  });
});
