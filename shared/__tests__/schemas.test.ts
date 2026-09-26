import { describe, it, expect } from 'vitest';
import {
  CriticFindingSchema,
  ConsistencyFindingSchema,
  DiscoverySchema,
  PositioningSchema,
  NamingPersonalitySchema,
  TaglinePitchSchema,
  VisualBriefSchema,
  VoiceMessagingSchema,
  LaunchPrepSchema,
} from '../src/schemas/index.js';

describe('T-003 / T-007: Zod Schemas Validation and Invariants', () => {
  describe('CriticFindingSchema', () => {
    it('accepts valid finding across all 5 issue types', () => {
      const issueTypes = ['cliche', 'audience_mismatch', 'contradiction', 'vague', 'bias'] as const;

      for (const issue_type of issueTypes) {
        const finding = {
          id: `crit-${issue_type}`,
          stage: 'positioning',
          target_field: 'differentiator',
          issue_type,
          evidence: 'Uses generic buzzwords like revolutionary',
          explanation: 'Does not explain how the product differentiates',
          sharper_alternative: 'Focus specifically on verified peer-review matchmaking',
          user_action: null,
        };
        const parsed = CriticFindingSchema.safeParse(finding);
        expect(parsed.success).toBe(true);
      }
    });

    it('rejects finding if sharper_alternative is missing or empty', () => {
      const invalidFinding = {
        id: 'crit-empty-alt',
        stage: 'discovery',
        target_field: 'core_problem',
        issue_type: 'vague',
        evidence: 'Problem is too broad',
        explanation: 'Needs tightening',
        sharper_alternative: '', // Empty string is prohibited!
        user_action: null,
      };
      const parsed = CriticFindingSchema.safeParse(invalidFinding);
      expect(parsed.success).toBe(false);
    });

    it('rejects invalid issue type', () => {
      const invalidType = {
        id: 'crit-unknown',
        stage: 'discovery',
        target_field: 'core_problem',
        issue_type: 'generic_criticism', // not in allowed enum
        evidence: 'Something',
        explanation: 'Something',
        sharper_alternative: 'Alternative',
        user_action: null,
      };
      const parsed = CriticFindingSchema.safeParse(invalidType);
      expect(parsed.success).toBe(false);
    });
  });

  describe('ConsistencyFindingSchema', () => {
    it('accepts valid holistic consistency finding', () => {
      const finding = {
        id: 'cons-1',
        fields_in_conflict: ['naming_personality', 'voice_messaging'],
        issue_type: 'contradiction',
        evidence: 'Name is playful but voice is strictly corporate academic',
        why_it_matters: 'Confuses target audience and weakens brand identity',
        sharper_alternative: 'Infuse voice with accessible, student-friendly tone',
        user_action: null,
      };
      const parsed = ConsistencyFindingSchema.safeParse(finding);
      expect(parsed.success).toBe(true);
    });

    it('rejects if fields_in_conflict is empty', () => {
      const finding = {
        id: 'cons-empty-fields',
        fields_in_conflict: [],
        issue_type: 'contradiction',
        evidence: 'Conflict exists',
        why_it_matters: 'Matters',
        sharper_alternative: 'Fix it',
        user_action: null,
      };
      const parsed = ConsistencyFindingSchema.safeParse(finding);
      expect(parsed.success).toBe(false);
    });
  });

  describe('DiscoverySchema', () => {
    it('validates correct Discovery content', () => {
      const content = {
        core_problem: 'Students lack trusted networks to form project teams',
        target_audience: 'Undergraduate engineering students',
        context_situation: 'Beginning of hackathon or semester capstone project',
        user_goals: 'Quickly find reliable teammates with complementary skills',
        constraints: 'Zero budget, tight deadlines',
        value_desired_outcome: 'High quality team formed in under 24 hours',
        open_questions: ['How will skill verification work?'],
        known_facts: ['Students attend same campus'],
        inferred_assumptions: [
          { value: 'Students prefer chat over email', rationale: 'Target demographic behavior' },
        ],
      };
      const parsed = DiscoverySchema.safeParse(content);
      expect(parsed.success).toBe(true);
    });
  });

  describe('PositioningSchema', () => {
    it('enforces at least 2 divergent directions', () => {
      const direction1 = {
        title: 'Peer Guild',
        category: 'Collaborative Learning Network',
        target_audience: 'Engineering Students',
        core_problem: 'Finding competent teammates',
        differentiator: 'Skill-indexed project matchmaking',
        value_proposition: 'Find teammates you can rely on in minutes',
        competitive_angle: 'Focuses on project outcome over social networking',
        strategic_rationale: 'Addresses student risk aversion',
        potential_weakness: 'Requires critical mass of registered skills',
      };

      const direction2 = {
        title: 'Sprint Crew',
        category: 'High-Velocity Hackathon Platform',
        target_audience: 'Competitive Hackers',
        core_problem: 'Late team formation at events',
        differentiator: 'Live event matching with portfolio verification',
        value_proposition: 'Win hackathons with ready-to-code teams',
        competitive_angle: 'Time-boxed matching during check-in',
        strategic_rationale: 'Direct tie-in with event organizers',
        potential_weakness: 'Seasonal engagement spike around major hackathons',
      };

      // 1 direction fails
      const oneDirection = PositioningSchema.safeParse({ directions: [direction1] });
      expect(oneDirection.success).toBe(false);

      // 2 directions succeeds
      const twoDirections = PositioningSchema.safeParse({ directions: [direction1, direction2] });
      expect(twoDirections.success).toBe(true);
    });
  });

  describe('NamingPersonalitySchema', () => {
    it('enforces 3 to 5 personality traits', () => {
      const baseNaming = {
        naming_directions: [
          {
            territory: 'Craft / Mastery',
            proposed_name: 'Guildmate',
            rationale: 'Invokes craftsmanship and camaraderie',
            relationship_to_audience: 'Resonates with student builders',
            relationship_to_positioning: 'Matches peer guild angle',
            potential_concern: 'Slightly medieval ring',
            critic_analysis: 'Could feel like a gaming clan',
            sharper_alternative: 'Anchor in modern engineering context',
          },
        ],
        traits_to_avoid: ['Arrogant', 'Bureaucratic'],
        brand_principles: [{ principle: 'Builders first', rationale: 'Focus on shipping' }],
      };

      // 2 traits fails
      const twoTraits = NamingPersonalitySchema.safeParse({
        ...baseNaming,
        personality_traits: [
          { trait: 'Pragmatic', audience_justification: 'Values getting work done' },
          { trait: 'Resourceful', audience_justification: 'Solves constraints' },
        ],
      });
      expect(twoTraits.success).toBe(false);

      // 4 traits succeeds
      const fourTraits = NamingPersonalitySchema.safeParse({
        ...baseNaming,
        personality_traits: [
          { trait: 'Pragmatic', audience_justification: 'Values getting work done' },
          { trait: 'Resourceful', audience_justification: 'Solves constraints' },
          { trait: 'Sharp', audience_justification: 'High intellectual rigor' },
          { trait: 'Collaborative', audience_justification: 'Peer camaraderie' },
        ],
      });
      expect(fourTraits.success).toBe(true);

      // 6 traits fails
      const sixTraits = NamingPersonalitySchema.safeParse({
        ...baseNaming,
        personality_traits: [
          { trait: '1', audience_justification: 'j' },
          { trait: '2', audience_justification: 'j' },
          { trait: '3', audience_justification: 'j' },
          { trait: '4', audience_justification: 'j' },
          { trait: '5', audience_justification: 'j' },
          { trait: '6', audience_justification: 'j' },
        ],
      });
      expect(sixTraits.success).toBe(false);
    });
  });

  describe('VisualBriefSchema', () => {
    it('validates valid hex color codes and rejects invalid hex codes', () => {
      const validBrief = {
        logo_direction: 'Monogram emblem featuring stylized intersecting nodes',
        color_mood: 'Electric intellect and grounded execution',
        hex_palette: ['#0A0A0A', '#3B82F6', '#10B981'],
        type_roles: ['Display: Space Grotesk Bold', 'Body: Inter Regular'],
        shape_language: 'Geometric angled cuts and crisp lines',
        symbol_language: 'Nodes and bridges indicating connection',
        composition_layout: 'High contrast asymmetrical grids',
        imagery_direction: 'Macro photography of collaborative hardware/software work',
        concepts_to_avoid: ['Stock photos of people shaking hands', 'Cartoon lightbulbs'],
        rationale_linking_to_audience_and_positioning: 'Matches technical caliber of student engineers',
      };
      expect(VisualBriefSchema.safeParse(validBrief).success).toBe(true);

      const invalidHexBrief = {
        ...validBrief,
        hex_palette: ['not-a-hex', '#ZZZZZZ'],
      };
      expect(VisualBriefSchema.safeParse(invalidHexBrief).success).toBe(false);
    });
  });

  describe('VoiceMessagingSchema', () => {
    it('enforces 3 to 4 sample messages', () => {
      const baseVoice = {
        voice_description: 'Direct, thoughtful, slightly wry, builder-to-builder tone',
        tone_characteristics: ['Clear', 'Direct', 'Unpretentious'],
        do_list: ['State facts directly', 'Use engineering terms accurately'],
        dont_list: ['Use hollow marketing fluff', 'Overpromise'],
      };

      const twoMessages = VoiceMessagingSchema.safeParse({
        ...baseVoice,
        sample_messages: [
          { message: 'M1', explanation: 'E1' },
          { message: 'M2', explanation: 'E2' },
        ],
      });
      expect(twoMessages.success).toBe(false);

      const threeMessages = VoiceMessagingSchema.safeParse({
        ...baseVoice,
        sample_messages: [
          { message: 'Stop hacking solo.', explanation: 'Direct call to action' },
          { message: 'Find teammates who actually ship.', explanation: 'Speaks to reliability pain' },
          { message: 'Your capstone project deserves a real team.', explanation: 'Contextual relevance' },
        ],
      });
      expect(threeMessages.success).toBe(true);
    });
  });

  describe('LaunchPrepSchema', () => {
    it('validates landing headline and launch post', () => {
      const valid = {
        landing_headline: 'Find project teammates who actually finish what they start.',
        social_launch_post: 'Tired of carrying group projects alone? FOIL is live.',
      };
      expect(LaunchPrepSchema.safeParse(valid).success).toBe(true);
    });
  });
});
