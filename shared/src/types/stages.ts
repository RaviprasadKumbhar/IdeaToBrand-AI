/**
 * FOIL Stage Output Domain Contracts
 * Defined in docs/architecture.md Section 9 and PRD Section 9.x.
 */

export interface DiscoveryContent {
  core_problem: string;
  target_audience: string;
  context_situation: string;
  user_goals: string;
  constraints: string;
  value_desired_outcome: string;
  open_questions: string[];
  known_facts: string[];
  inferred_assumptions: { value: string; rationale: string }[];
}

export interface PositioningDirection {
  title: string;
  category: string;
  target_audience: string;
  core_problem: string;
  differentiator: string;
  value_proposition: string;
  competitive_angle: string;
  strategic_rationale: string;
  potential_weakness: string;
}

export interface PositioningContent {
  directions?: PositioningDirection[];
  selected_direction?: PositioningDirection;
  rejected_directions?: PositioningDirection[];
  // Direct fields when flattened or selected
  title?: string;
  category?: string;
  target_audience?: string;
  core_problem?: string;
  differentiator?: string;
  value_proposition?: string;
  competitive_angle?: string;
  strategic_rationale?: string;
  potential_weakness?: string;
}

export interface NamingDirection {
  territory: string;
  proposed_name: string;
  rationale: string;
  relationship_to_audience: string;
  relationship_to_positioning: string;
  potential_concern: string;
  critic_analysis?: string;
  sharper_alternative?: string;
}

export interface PersonalityTrait {
  trait: string;
  audience_justification: string;
}

export interface BrandPrinciple {
  principle: string;
  rationale: string;
}

export interface NamingPersonalityContent {
  selected_name?: NamingDirection | string;
  proposed_name?: string;
  naming_directions?: NamingDirection[];
  personality_traits: PersonalityTrait[];
  traits_to_avoid: string[];
  brand_principles: BrandPrinciple[];
}

export interface TaglinePitchContent {
  selected_tagline?: string;
  tagline_options: string[];
  one_line_pitch: string;
  rationale_per_tagline: string[];
}

export interface VisualBriefContent {
  logo_direction: string;
  color_mood: string;
  hex_palette: string[];
  type_roles: string[];
  shape_language: string;
  symbol_language: string;
  composition_layout: string;
  imagery_direction: string;
  concepts_to_avoid: string[];
  rationale_linking_to_audience_and_positioning: string;
}

export interface SampleMessage {
  message: string;
  explanation: string;
}

export interface VoiceMessagingContent {
  voice_description: string;
  tone_characteristics: string[];
  do_list: string[];
  dont_list: string[];
  sample_messages: SampleMessage[];
}

export interface LaunchPrepContent {
  landing_headline: string;
  social_launch_post: string;
}
