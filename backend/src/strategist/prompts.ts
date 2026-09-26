import type { StageName, StageInput, ApprovedDecision } from '@foil/shared';

export interface StagePromptBuilder {
  stage: StageName;
  requiredApprovedStages: StageName[];
  buildPrompt: (input: StageInput) => string;
}

function formatScenarioContext(scenarioOverride?: StageInput['scenario_override']): string {
  if (!scenarioOverride) return '';
  return `\n\nSCENARIO PROBE OVERRIDE ("WHAT-IF" REOPENING):
Triggered from stage: ${scenarioOverride.triggered_from_stage}
What-If Condition: "${scenarioOverride.what_if_input}"
Instruction: Adapt this stage's recommendations to specifically address this what-if scenario override while keeping un-overridden upstream context intact.\n`;
}

export const STRATEGIST_PROMPT_BUILDERS: Record<StageName, StagePromptBuilder> = {
  discovery: {
    stage: 'discovery',
    requiredApprovedStages: [],
    buildPrompt: (input: StageInput) => {
      const rawIdea = input.raw_input || 'No idea provided';
      return `You are the Strategist AI for FOIL, a structured brand strategy engine.
Your role is to analyze the founder's initial idea and produce a structured Discovery output.

HARD RULES:
1. Distinguish between KNOWN FACTS and INFERRED ASSUMPTIONS.
2. Every item in inferred_assumptions MUST include both the assumption "value" and the "rationale".
3. NEVER present an AI inference as a confirmed user fact.
4. Output valid JSON strictly adhering to the DiscoverySchema.

User's Raw Idea:
"${rawIdea}"${formatScenarioContext(input.scenario_override)}

Respond with a JSON object containing:
- core_problem (string)
- target_audience (string)
- context_situation (string)
- user_goals (string)
- constraints (string)
- value_desired_outcome (string)
- open_questions (string[])
- known_facts (string[])
- inferred_assumptions (array of { value: string, rationale: string })`;
    },
  },

  positioning: {
    stage: 'positioning',
    requiredApprovedStages: ['discovery'],
    buildPrompt: (input: StageInput) => {
      const discovery = input.approved_decisions.discovery?.content;
      return `You are the Strategist AI for FOIL.
Your role is to generate at least TWO genuinely divergent positioning directions based on approved Discovery.

HARD RULES:
1. Generate AT LEAST 2 distinct directions in the "directions" array.
2. The directions must NOT be cosmetic variations; they must represent strategically divergent competitive stances and categories.
3. Ground your strategic choices in the approved discovery context.
4. Output valid JSON matching the PositioningSchema.

Approved Discovery Context:
${JSON.stringify(discovery, null, 2)}${formatScenarioContext(input.scenario_override)}

Respond with a JSON object containing:
- directions: array of at least 2 objects, each containing:
  - title (string)
  - category (string)
  - target_audience (string)
  - core_problem (string)
  - differentiator (string)
  - value_proposition (string)
  - competitive_angle (string)
  - strategic_rationale (string)
  - potential_weakness (string)`;
    },
  },

  naming_personality: {
    stage: 'naming_personality',
    requiredApprovedStages: ['positioning'],
    buildPrompt: (input: StageInput) => {
      const positioning = input.approved_decisions.positioning?.content;
      return `You are the Strategist AI for FOIL.
Your role is to generate naming directions, personality traits, traits to avoid, and core brand principles.

HARD RULES:
1. NEVER make any trademark, domain (.com / .io), or social handle availability claims (e.g. do NOT say "is available", "unregistered", or ".com is free"). Real verification requires legal registries which you cannot access.
2. Provide between 3 and 5 personality traits (personality_traits), each with an audience_justification.
3. Provide at least one trait to avoid and at least one brand principle.
4. Output valid JSON matching the NamingPersonalitySchema.

Approved Positioning Context:
${JSON.stringify(positioning, null, 2)}${formatScenarioContext(input.scenario_override)}

Respond with a JSON object containing:
- naming_directions: array of objects with territory, proposed_name, rationale, relationship_to_audience, relationship_to_positioning, potential_concern, critic_analysis, sharper_alternative
- personality_traits: array of 3 to 5 objects with trait and audience_justification
- traits_to_avoid: array of strings
- brand_principles: array of objects with principle and rationale`;
    },
  },

  tagline_pitch: {
    stage: 'tagline_pitch',
    requiredApprovedStages: ['naming_personality'],
    buildPrompt: (input: StageInput) => {
      const naming = input.approved_decisions.naming_personality?.content;
      return `You are the Strategist AI for FOIL.
Your role is to craft tagline options and a single punchy one-line pitch grounded in approved naming and personality.

HARD RULES:
1. Avoid generic, interchangeable slogans that could apply unchanged to competitors.
2. Provide rationale_per_tagline aligned by index with tagline_options.
3. Provide one_line_pitch.
4. Output valid JSON matching the TaglinePitchSchema.

Approved Naming & Personality Context:
${JSON.stringify(naming, null, 2)}${formatScenarioContext(input.scenario_override)}

Respond with a JSON object containing:
- tagline_options: string[]
- one_line_pitch: string
- rationale_per_tagline: string[]`;
    },
  },

  visual_brief: {
    stage: 'visual_brief',
    requiredApprovedStages: ['positioning', 'naming_personality'],
    buildPrompt: (input: StageInput) => {
      const positioning = input.approved_decisions.positioning?.content;
      const naming = input.approved_decisions.naming_personality?.content;
      return `You are the Strategist AI for FOIL.
Your role is to generate an AI visual concept and design direction brief (NOT finished artwork).

HARD RULES:
1. Provide a hex_palette with valid hex codes (e.g. #1E293B, #38BDF8).
2. Detail typography roles, shape language, symbol language, composition, and concepts to avoid.
3. Output valid JSON matching the VisualBriefSchema.

Approved Upstream Context:
Positioning: ${JSON.stringify(positioning, null, 2)}
Naming & Personality: ${JSON.stringify(naming, null, 2)}${formatScenarioContext(input.scenario_override)}

Respond with a JSON object containing:
- logo_direction (string)
- color_mood (string)
- hex_palette (string[])
- type_roles (string[])
- shape_language (string)
- symbol_language (string)
- composition_layout (string)
- imagery_direction (string)
- concepts_to_avoid (string[])
- rationale_linking_to_audience_and_positioning (string)`;
    },
  },

  voice_messaging: {
    stage: 'voice_messaging',
    requiredApprovedStages: ['naming_personality'],
    buildPrompt: (input: StageInput) => {
      const naming = input.approved_decisions.naming_personality?.content;
      return `You are the Strategist AI for FOIL.
Your role is to define brand voice, tone characteristics, do/don't guidelines, and 3 to 4 sample messages.

HARD RULES:
1. Provide between 3 and 4 sample messages in sample_messages.
2. Each sample message must have both "message" and "explanation".
3. Ground the voice in the approved personality traits.
4. Output valid JSON matching the VoiceMessagingSchema.

Approved Naming & Personality Context:
${JSON.stringify(naming, null, 2)}${formatScenarioContext(input.scenario_override)}

Respond with a JSON object containing:
- voice_description (string)
- tone_characteristics (string[])
- do_list (string[])
- dont_list (string[])
- sample_messages (array of 3 to 4 objects with message and explanation)`;
    },
  },

  launch_prep: {
    stage: 'launch_prep',
    requiredApprovedStages: ['naming_personality', 'voice_messaging', 'positioning'],
    buildPrompt: (input: StageInput) => {
      const naming = input.approved_decisions.naming_personality?.content;
      const voice = input.approved_decisions.voice_messaging?.content;
      const positioning = input.approved_decisions.positioning?.content;
      return `You are the Strategist AI for FOIL.
Your role is to create launch-ready copy: a high-converting landing page headline and a social launch post.

HARD RULES:
1. Match the voice, personality, and positioning approved upstream.
2. Output valid JSON matching the LaunchPrepSchema.

Approved Context:
Positioning: ${JSON.stringify(positioning, null, 2)}
Naming: ${JSON.stringify(naming, null, 2)}
Voice: ${JSON.stringify(voice, null, 2)}${formatScenarioContext(input.scenario_override)}

Respond with a JSON object containing:
- landing_headline (string)
- social_launch_post (string)`;
    },
  },

  consistency_audit: {
    stage: 'consistency_audit',
    requiredApprovedStages: [
      'discovery',
      'positioning',
      'naming_personality',
      'tagline_pitch',
      'visual_brief',
      'voice_messaging',
      'launch_prep',
    ],
    buildPrompt: () => {
      throw new Error('consistency_audit is evaluated by the Critic via auditWholeSystem, not the Strategist.');
    },
  },

  kit_export: {
    stage: 'kit_export',
    requiredApprovedStages: [],
    buildPrompt: () => {
      throw new Error('kit_export is an assembly stage with no AI call.');
    },
  },
};
