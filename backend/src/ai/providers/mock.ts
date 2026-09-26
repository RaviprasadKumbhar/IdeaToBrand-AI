import type { ZodSchema } from 'zod';
import type { CriticFinding } from '@foil/shared';
import {
  AIProvider,
  AIProviderResult,
  TimeoutError,
  RateLimitError,
  AIProviderError,
  extractJSONFromText,
} from '../provider.js';

export interface MockAIProviderOptions {
  mockResponseGenerator?: (prompt: string) => string;
  simulateTimeout?: boolean;
  simulateRateLimit?: boolean;
  simulateError?: boolean;
  delayMs?: number;
}

function getDefaultMockResponse(prompt: string): string {
  if (
    prompt.includes('Critic AI') ||
    prompt.includes('critic_findings') ||
    prompt.includes('Audit') ||
    prompt.includes('audit') ||
    prompt.includes('Holistic') ||
    prompt.includes('Consistency')
  ) {
    return '[]';
  }

  if (prompt.includes('Discovery') || prompt.includes('discovery')) {
    return JSON.stringify({
      core_problem: 'Students struggle to find compatible teammates for class projects',
      target_audience: 'University students in collaborative coursework',
      context_situation: 'Project-based academic semesters',
      user_goals: 'Form qualified, aligned project teams quickly',
      constraints: 'Academic honor codes and scheduling constraints',
      value_desired_outcome: 'Reliable collaboration and stronger project outcomes',
      open_questions: ['How will peer accountability be measured?'],
      known_facts: ['Students attend classes together'],
      inferred_assumptions: [
        {
          value: 'Students value responsiveness over credentials',
          rationale: 'Inferred from common capstone team frictions',
        },
      ],
    });
  }

  if (prompt.includes('Positioning') || prompt.includes('positioning')) {
    return JSON.stringify({
      directions: [
        {
          title: 'The Academic Matchmaker',
          category: 'EdTech / Collaboration',
          target_audience: 'Students who want skill-matched teams',
          core_problem: 'Random team assignment wastes potential',
          differentiator: 'Skill graph + project-type matching',
          value_proposition: 'Form better teams in minutes',
          competitive_angle: 'Unlike LinkedIn, purpose-built for students',
          strategic_rationale: 'Addresses universal friction point',
          potential_weakness: 'Requires critical mass',
          critic_findings: [],
        },
        {
          title: 'The Project Compass',
          category: 'Productivity / EdTech',
          target_audience: 'Project-driven students seeking structure',
          core_problem: 'Students lack shared coordination layer',
          differentiator: 'Combines team formation with lightweight project management',
          value_proposition: 'How you work together from day one',
          competitive_angle: 'Bridges team-finding and project execution',
          strategic_rationale: 'Retention through ongoing project value',
          potential_weakness: 'Higher product complexity',
          critic_findings: [],
        },
      ],
    });
  }

  if (prompt.includes('Naming') || prompt.includes('naming')) {
    return JSON.stringify({
      naming_directions: [
        {
          territory: 'Collaborative Growth',
          proposed_name: 'Koru',
          rationale: 'Symbolizes unfolding potential and collaborative beginnings',
          relationship_to_audience: 'Resonates with students entering teamwork',
          relationship_to_positioning: 'Directly supports academic matchmaking',
          potential_concern: 'May need pronunciation guide in international markets',
          critic_analysis: 'Distinctive and memorable without generic tech suffixes',
          sharper_alternative: 'Consider Nexus as an alternative',
        },
      ],
      personality_traits: [
        { trait: 'Pragmatic', audience_justification: 'Students need immediate utility' },
        { trait: 'Supportive', audience_justification: 'Reduces team stress' },
        { trait: 'Direct', audience_justification: 'Cuts through group chat noise' },
      ],
      traits_to_avoid: ['Bureaucratic', 'Condescending'],
      brand_principles: [
        { principle: 'Peer-first accountability', rationale: 'Teams thrive on trust' },
      ],
      critic_findings: [],
    });
  }

  if (prompt.includes('Tagline') || prompt.includes('tagline')) {
    return JSON.stringify({
      tagline_options: [
        'Find your team. Ship your project.',
        'Better matches, better capstones.',
      ],
      one_line_pitch: 'Koru pairs university students with reliable project teammates based on verified skills and schedules.',
      rationale_per_tagline: [
        'Action-oriented benefit',
        'Direct academic relevance',
      ],
      critic_findings: [],
    });
  }

  if (prompt.includes('Visual') || prompt.includes('visual')) {
    return JSON.stringify({
      logo_direction: 'Intersecting geometric loops suggesting peer collaboration',
      color_mood: 'Focused indigo and energetic amber',
      hex_palette: ['#1E293B', '#4F46E5', '#F59E0B', '#F8FAFC'],
      type_roles: ['Headings: Space Grotesk', 'Body: Inter'],
      shape_language: 'Clean rectilinear cards with rounded corners',
      symbol_language: 'Interconnected nodes and paths',
      composition_layout: 'Generous whitespace with structured grid',
      imagery_direction: 'Authentic student project teamwork moments',
      concepts_to_avoid: ['Stock handshakes', 'Graduation cap icons'],
      rationale_linking_to_audience_and_positioning: 'Technical credibility for engineering and student projects',
      concept_disclaimer: 'AI-generated visual concept / design direction — not production-ready artwork.',
    });
  }

  if (prompt.includes('Voice') || prompt.includes('voice')) {
    return JSON.stringify({
      voice_description: 'Direct, encouraging, and student-native',
      tone_characteristics: ['Pragmatic', 'Approachable', 'Honest'],
      do_list: ['Be direct', 'Speak to the student friction'],
      dont_list: ['Do not use corporate jargon', 'Do not overpromise'],
      sample_messages: [
        { message: 'Find your project team in minutes.', explanation: 'Homepage hero' },
        { message: 'Matched with 2 peers for your CS capstone.', explanation: 'Notification' },
        { message: 'Lock in your team charter.', explanation: 'Onboarding step' },
      ],
      critic_findings: [],
    });
  }

  if (prompt.includes('Launch') || prompt.includes('launch')) {
    return JSON.stringify({
      landing_headline: 'Form your capstone team without the group chat drama.',
      social_launch_post: 'Tired of random team assignments? Koru matches you with verified teammates for your semester project.',
      critic_findings: [],
    });
  }

  return '{}';
}

export class MockAIProvider implements AIProvider {
  private options: MockAIProviderOptions;

  constructor(options: MockAIProviderOptions = {}) {
    this.options = options;
  }

  setOptions(options: Partial<MockAIProviderOptions>) {
    this.options = { ...this.options, ...options };
  }

  async generateStructured<T>(
    prompt: string,
    schema: ZodSchema<T>,
    callOptions?: { timeoutMs?: number; signal?: AbortSignal }
  ): Promise<AIProviderResult<T>> {
    return this.executeCall(prompt, schema, callOptions);
  }

  async generateCritique(
    prompt: string,
    schema: ZodSchema<CriticFinding[]>,
    callOptions?: { timeoutMs?: number; signal?: AbortSignal }
  ): Promise<AIProviderResult<CriticFinding[]>> {
    return this.executeCall(prompt, schema, callOptions);
  }

  private async executeCall<T>(
    prompt: string,
    schema: ZodSchema<T>,
    callOptions?: { timeoutMs?: number; signal?: AbortSignal }
  ): Promise<AIProviderResult<T>> {
    if (callOptions?.signal?.aborted) {
      throw new TimeoutError('Mock AI request was aborted');
    }

    if (this.options.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, this.options.delayMs));
    }

    if (this.options.simulateTimeout) {
      throw new TimeoutError('Simulated mock timeout');
    }

    if (this.options.simulateRateLimit) {
      throw new RateLimitError('Simulated mock rate limit', 10);
    }

    if (this.options.simulateError) {
      throw new AIProviderError('Simulated provider failure', 'provider_unavailable', true);
    }

    const raw = this.options.mockResponseGenerator
      ? this.options.mockResponseGenerator(prompt)
      : getDefaultMockResponse(prompt);

    try {
      const jsonStr = extractJSONFromText(raw);
      const parsedJSON = JSON.parse(jsonStr);
      const validation = schema.safeParse(parsedJSON);

      if (validation.success) {
        return { raw, parsed: validation.data };
      } else {
        return {
          raw,
          parsed: null,
          validationError: validation.error.message,
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        raw,
        parsed: null,
        validationError: `JSON parse error: ${msg}`,
      };
    }
  }
}
