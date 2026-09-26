import { z } from 'zod';

export const CriticIssueTypeSchema = z.enum([
  'cliche',
  'audience_mismatch',
  'contradiction',
  'vague',
  'bias',
]);

export const StageNameSchema = z.enum([
  'discovery',
  'positioning',
  'naming_personality',
  'tagline_pitch',
  'visual_brief',
  'voice_messaging',
  'launch_prep',
  'consistency_audit',
  'kit_export',
]);

export const CriticFindingSchema = z.object({
  id: z.string().min(1, 'Critic finding ID is required'),
  stage: StageNameSchema,
  target_field: z.string().min(1, 'Target field is required'),
  issue_type: CriticIssueTypeSchema,
  evidence: z.string().min(1, 'Evidence is required'),
  explanation: z.string().min(1, 'Explanation is required'),
  sharper_alternative: z.string().min(1, 'Sharper alternative is required and cannot be empty'),
  user_action: z.enum(['accept', 'reject', 'edit']).nullable(),
});

export const CriticFindingsArraySchema = z.array(CriticFindingSchema);

export const ConsistencyFindingSchema = z.object({
  id: z.string().min(1, 'Consistency finding ID is required'),
  fields_in_conflict: z.array(z.string().min(1)).min(1, 'Must list at least one field in conflict'),
  issue_type: CriticIssueTypeSchema,
  evidence: z.string().min(1, 'Evidence is required'),
  why_it_matters: z.string().min(1, 'Impact explanation is required'),
  sharper_alternative: z.string().min(1, 'Sharper alternative is required and cannot be empty'),
  user_action: z.enum(['accept', 'reject', 'edit']).nullable(),
});

export const ConsistencyFindingsArraySchema = z.array(ConsistencyFindingSchema);

export const DiscoverySchema = z.object({
  brand_concept: z.string().optional(),
  core_problem: z.string().min(1, 'Core problem is required'),
  proposed_solution: z.string().optional(),
  target_audience: z.string().min(1, 'Target audience is required'),
  context_situation: z.string().min(1, 'Context/situation is required'),
  user_goals: z.string().min(1, 'User goals are required'),
  constraints: z.string().min(1, 'Constraints are required'),
  value_desired_outcome: z.string().min(1, 'Value / desired outcome is required'),
  differentiation: z.string().optional(),
  brand_goals: z.string().optional(),
  customer_needs: z.array(z.string()).optional(),
  open_questions: z.array(z.string().min(1)).default([]),
  known_facts: z.array(z.string().min(1)).default([]),
  inferred_assumptions: z.array(
    z.object({
      value: z.string().min(1, 'Assumption value is required'),
      rationale: z.string().min(1, 'Assumption rationale is required'),
    })
  ).default([]),
});

export const PositioningDirectionSchema = z.object({
  title: z.string().min(1, 'Direction title is required'),
  category: z.string().min(1, 'Category is required'),
  target_audience: z.string().min(1, 'Target audience is required'),
  core_problem: z.string().min(1, 'Core problem is required'),
  differentiator: z.string().min(1, 'Differentiator is required'),
  value_proposition: z.string().min(1, 'Value proposition is required'),
  competitive_angle: z.string().min(1, 'Competitive angle is required'),
  strategic_rationale: z.string().min(1, 'Strategic rationale is required'),
  potential_weakness: z.string().min(1, 'Potential weakness is required'),
  critic_findings: z.array(CriticFindingSchema).optional().default([]),
});

export const PositioningSchema = z.object({
  directions: z.array(PositioningDirectionSchema).min(2, 'At least 2 divergent positioning directions are required'),
});

export const NamingDirectionSchema = z.object({
  territory: z.string().min(1, 'Territory is required'),
  proposed_name: z.string().min(1, 'Proposed name is required'),
  rationale: z.string().min(1, 'Rationale is required'),
  relationship_to_audience: z.string().min(1, 'Relationship to audience is required'),
  relationship_to_positioning: z.string().min(1, 'Relationship to positioning is required'),
  potential_concern: z.string().min(1, 'Potential concern is required'),
  critic_analysis: z.string().min(1, 'Critic analysis is required'),
  sharper_alternative: z.string().min(1, 'Sharper alternative is required'),
});

export const PersonalityTraitSchema = z.object({
  trait: z.string().min(1, 'Trait is required'),
  audience_justification: z.string().min(1, 'Audience justification is required'),
});

export const BrandPrincipleSchema = z.object({
  principle: z.string().min(1, 'Principle is required'),
  rationale: z.string().min(1, 'Principle rationale is required'),
});

export const NamingPersonalitySchema = z.object({
  naming_directions: z.array(NamingDirectionSchema).min(1, 'At least one naming direction is required'),
  personality_traits: z.array(PersonalityTraitSchema).min(3, 'At least 3 personality traits required').max(5, 'Maximum 5 personality traits allowed'),
  traits_to_avoid: z.array(z.string().min(1)).min(1, 'At least one trait to avoid is required'),
  brand_principles: z.array(BrandPrincipleSchema).min(1, 'At least one brand principle is required'),
  critic_findings: z.array(CriticFindingSchema).optional().default([]),
});

export const TaglinePitchSchema = z.object({
  tagline_options: z.array(z.string().min(1)).min(1, 'At least one tagline option is required'),
  one_line_pitch: z.string().min(1, 'One-line pitch is required'),
  rationale_per_tagline: z.array(z.string().min(1)).min(1, 'Rationale per tagline is required'),
  critic_findings: z.array(CriticFindingSchema).optional().default([]),
});

export const VisualBriefSchema = z.object({
  logo_direction: z.string().min(1, 'Logo direction is required'),
  color_mood: z.string().min(1, 'Color mood is required'),
  hex_palette: z.array(
    z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'Must be a valid hex color code, e.g. #FF5500')
  ).min(1, 'At least one hex color is required'),
  type_roles: z.array(z.string().min(1)).min(1, 'Type roles are required'),
  shape_language: z.string().min(1, 'Shape language is required'),
  symbol_language: z.string().min(1, 'Symbol language is required'),
  composition_layout: z.string().min(1, 'Composition/layout is required'),
  imagery_direction: z.string().min(1, 'Imagery direction is required'),
  concepts_to_avoid: z.array(z.string().min(1)).min(1, 'At least one concept to avoid is required'),
  rationale_linking_to_audience_and_positioning: z.string().min(1, 'Rationale linking to audience and positioning is required'),
  concept_disclaimer: z
    .string()
    .default('AI-generated visual concept / design direction — not production-ready artwork.'),
});

export const SampleMessageSchema = z.object({
  message: z.string().min(1, 'Sample message text is required'),
  explanation: z.string().min(1, 'Message explanation is required'),
});

export const VoiceMessagingSchema = z.object({
  voice_description: z.string().min(1, 'Voice description is required'),
  tone_characteristics: z.array(z.string().min(1)).min(1, 'Tone characteristics are required'),
  do_list: z.array(z.string().min(1)).min(1, 'Do list is required'),
  dont_list: z.array(z.string().min(1)).min(1, 'Dont list is required'),
  sample_messages: z.array(SampleMessageSchema).min(3, 'At least 3 sample messages required').max(4, 'Maximum 4 sample messages allowed'),
  critic_findings: z.array(CriticFindingSchema).optional().default([]),
});

export const LaunchPrepSchema = z.object({
  landing_headline: z.string().min(1, 'Landing headline is required'),
  social_launch_post: z.string().min(1, 'Social launch post is required'),
  critic_findings: z.array(CriticFindingSchema).optional().default([]),
});

export const ExportBundleSchema = z.object({
  generated_at: z.string().min(1, 'Generation timestamp is required'),
  format: z.enum(['markdown', 'pdf']),
  content: z.string().min(1, 'Export content is required'),
  status: z.enum(['exported', 'failed']),
  failure_reason: z.string().optional(),
});
