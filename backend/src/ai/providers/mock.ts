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

function extractIdeaFromPrompt(prompt: string): string | null {
  const match =
    prompt.match(/User's Raw Idea:\s*\n?"([^"]+)"/i) ||
    prompt.match(/Business Description:\s*([^\n]+)/i) ||
    prompt.match(/business_description["':\s]+([^"'\n,}]+)/i) ||
    prompt.match(/idea_text["':\s]+([^"'\n,}]+)/i);
  if (!match) return null;
  const idea = match[1].trim();
  return idea.length > 0 ? idea : null;
}

function getDefaultMockResponse(prompt: string, schema?: ZodSchema<any>): string {
  const userIdea = extractIdeaFromPrompt(prompt);
  const isIndianSnack = userIdea ? /snack|namkeen|indian|chaat|millet|food/i.test(userIdea) : false;
  const isCustomIdea = userIdea ? !/hackathon|capstone|teammate|matchmak/i.test(userIdea) : false;

  if (schema) {
    const shape = (schema as any).shape || (typeof (schema as any)._def?.shape === 'function' ? (schema as any)._def.shape() : (schema as any)._def?.shape);
    if (shape) {
      if ('directions' in shape) {
        if (isIndianSnack) {
          return JSON.stringify({
            directions: [
              {
                title: 'The Pure Prana Pantry',
                category: 'Healthy Food / CPG',
                target_audience: 'College students and young professionals seeking convenient, healthy Indian snacks',
                core_problem: 'Traditional Indian snacks are heavily fried, while modern healthy snacks lack authentic Indian flavor',
                differentiator: 'Slow-roasted indigenous grains and lentils seasoned with authentic regional Indian spices',
                value_proposition: 'Guilt-free Indian crunch engineered for active student and work days',
                competitive_angle: 'Unlike imported snack bars, culturally authentic and affordable for everyday snacking',
                strategic_rationale: 'Combines nostalgic comfort flavors with modern functional nutrition',
                potential_weakness: 'Requires educating consumers on roasted vs fried texture',
                critic_findings: [],
              },
              {
                title: 'Desi Fuel Co.',
                category: 'Performance Nutrition',
                target_audience: 'Active urban youth and young professionals',
                core_problem: 'Lack of quick high-protein snack options with familiar Indian taste profiles',
                differentiator: 'High-protein roasted makhana and seed mixes in single-serve portable packs',
                value_proposition: 'High-energy Indian superfood bites on the go',
                competitive_angle: 'Bridges the gap between traditional namkeen and gym nutrition',
                strategic_rationale: 'Taps into rising fitness and protein awareness among younger consumers',
                potential_weakness: 'Higher ingredient costs for single-origin superfoods',
                critic_findings: [],
              },
            ],
          });
        }
        if (isCustomIdea && userIdea) {
          return JSON.stringify({
            directions: [
              {
                title: 'The Focused Specialist',
                category: 'Purpose-Built Brand',
                target_audience: `Consumers and stakeholders seeking ${userIdea.slice(0, 60)}`,
                core_problem: `Existing solutions fail to solve core pain points in ${userIdea.slice(0, 50)}`,
                differentiator: `Purpose-built features and streamlined execution tailored to ${userIdea.slice(0, 40)}`,
                value_proposition: `The dedicated standard for ${userIdea.slice(0, 50)}`,
                competitive_angle: 'Unlike legacy generic tools, engineered from first principles for this specific use case',
                strategic_rationale: 'Deep vertical focus enables superior customer retention and loyalty',
                potential_weakness: 'Requires disciplined niche focus before horizontal expansion',
                critic_findings: [],
              },
              {
                title: 'The High-Velocity Alternative',
                category: 'Modern Platform',
                target_audience: `Modern teams and individuals requiring accessible ${userIdea.slice(0, 50)}`,
                core_problem: `High complexity, friction, and cost in current offerings`,
                differentiator: 'Frictionless onboarding and rapid time-to-value',
                value_proposition: 'Faster, simpler, and more transparent',
                competitive_angle: 'Lower barrier to adoption compared to established incumbents',
                strategic_rationale: 'Broad appeal with fast organic growth flywheel',
                potential_weakness: 'Lower switching costs require constant innovation',
                critic_findings: [],
              },
            ],
          });
        }
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
      if ('core_problem' in shape) {
        if (isIndianSnack) {
          return JSON.stringify({
            core_problem: 'College students and young professionals struggle to find convenient Indian snacks that are genuinely nutritious and affordable',
            target_audience: 'College students and young professionals seeking nutritious Indian snack options',
            context_situation: 'Long study sessions, fast-paced workdays, and on-the-go daily snacking',
            user_goals: 'Enjoy authentic Indian flavors without greasy ingredients, sugar crashes, or artificial preservatives',
            constraints: 'Accessible price point for student budgets, portable packaging, clean ingredients',
            value_desired_outcome: 'Convenient, delicious, high-nutrition Indian snacks that sustain all-day energy',
            open_questions: ['What regional flavor profiles have the highest cross-market appeal?'],
            known_facts: [userIdea],
            inferred_assumptions: [
              {
                value: 'Target consumers will substitute fried namkeen with roasted alternatives if flavor is uncompromised',
                rationale: 'Health awareness is rising rapidly among urban youth without diminishing preference for authentic spices',
              },
            ],
          });
        }
        if (isCustomIdea && userIdea) {
          return JSON.stringify({
            core_problem: `Current market offerings fail to adequately address ${userIdea.slice(0, 100)}`,
            target_audience: `Primary stakeholders and target customers seeking ${userIdea.slice(0, 80)}`,
            context_situation: `Real-world operational environments requiring ${userIdea.slice(0, 60)}`,
            user_goals: `Achieve reliable, high-quality outcomes with less friction and cost`,
            constraints: 'Budget efficiency and seamless integration into daily workflow',
            value_desired_outcome: `A dependable, high-satisfaction solution for ${userIdea.slice(0, 60)}`,
            open_questions: ['What are the key adoption bottlenecks in the initial rollout?'],
            known_facts: [userIdea],
            inferred_assumptions: [
              {
                value: 'Target customers have strong unmet demand for a modern, purpose-built solution',
                rationale: 'Inferred from user-provided business description and lack of direct substitutes',
              },
            ],
          });
        }
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
      if ('naming_directions' in shape) {
        if (isIndianSnack) {
          return JSON.stringify({
            naming_directions: [
              {
                territory: 'Vitality & Heritage',
                proposed_name: 'PranaBites',
                rationale: 'Connects traditional life-force concept with modern bite-sized snacking',
                relationship_to_audience: 'Evokes wholesome nourishment for busy students and young professionals',
                relationship_to_positioning: 'Directly reinforces the clean, nutrient-dense positioning',
                potential_concern: 'May sound like a supplement if packaging does not highlight crunch',
                critic_analysis: 'Memorable and evocative without being overly clinical',
                sharper_alternative: 'ChaatFit as a punchier alternative',
              },
            ],
            personality_traits: [
              { trait: 'Vibrant', audience_justification: 'Celebrates rich Indian culinary traditions' },
              { trait: 'Honest', audience_justification: 'Transparent nutrition without hidden additives' },
              { trait: 'Energetic', audience_justification: 'Fuels active study and workday routines' },
            ],
            traits_to_avoid: ['Preachy', 'Artificial', 'Clinical'],
            brand_principles: [
              { principle: 'Flavor-first wellness', rationale: 'Nutrition should never feel like a compromise' },
            ],
            critic_findings: [],
          });
        }
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
      if ('tagline_options' in shape) {
        if (isIndianSnack) {
          return JSON.stringify({
            tagline_options: [
              'Real Indian Flavors. Honest Nutrition.',
              'Crunch with Purpose. Fuel Your Day.',
            ],
            one_line_pitch: 'PranaBites crafts slow-roasted, nutrient-dense Indian snack bites to fuel busy students and professionals.',
            rationale_per_tagline: [
              'Clear functional and cultural promise',
              'Active benefit-focused proposition',
            ],
            critic_findings: [],
          });
        }
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
      if ('hex_palette' in shape) {
        if (isIndianSnack) {
          return JSON.stringify({
            logo_direction: 'Stylized spice leaf and grain motif forming an upward energy burst',
            color_mood: 'Warm turmeric gold, deep terracotta, and fresh coriander green',
            hex_palette: ['#D97706', '#B45309', '#047857', '#FFFBEB'],
            type_roles: ['Headings: Space Grotesk', 'Body: Inter'],
            shape_language: 'Soft organic contours with crisp modern accents',
            symbol_language: 'Spices, roasted grains, and dynamic sunburst elements',
            composition_layout: 'Warm, vibrant packaging layout with transparent ingredient windows',
            imagery_direction: 'Authentic whole spices, slow roasting, and lively snacking moments',
            concepts_to_avoid: ['Overly medical diet graphics', 'Cluttered generic grocery tropes'],
            rationale_linking_to_audience_and_positioning: 'Balances cultural pride with contemporary health-first minimalism',
            concept_disclaimer: 'AI-generated visual concept / design direction — not production-ready artwork.',
          });
        }
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
      if ('sample_messages' in shape) {
        if (isIndianSnack) {
          return JSON.stringify({
            voice_description: 'Warm, witty, and culturally proud with zero wellness snobbery',
            tone_characteristics: ['Approachable', 'Zesty', 'Honest'],
            do_list: ['Celebrate bold spices', 'Keep snack talk relatable and fun'],
            dont_list: ['Do not shame snacking habits', 'Do not sound clinical'],
            sample_messages: [
              { message: 'Satisfy your 4 PM chai craving without the sugar crash.', explanation: 'Homepage hero' },
              { message: 'Roasted, not fried. Spiced, not artificial.', explanation: 'Product packaging' },
              { message: 'Brain food that actually tastes like home.', explanation: 'Campus launch' },
            ],
            critic_findings: [],
          });
        }
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
      if ('landing_headline' in shape) {
        if (isIndianSnack) {
          return JSON.stringify({
            landing_headline: 'Authentic Indian crunch. Zero guilt. 100% wholesome energy.',
            social_launch_post: 'Say goodbye to greasy late-night snacks. Fuel your work and study sessions with PranaBites.',
            critic_findings: [],
          });
        }
        return JSON.stringify({
          landing_headline: 'Form your capstone team without the group chat drama.',
          social_launch_post: 'Tired of random team assignments? Koru matches you with verified teammates for your semester project.',
          critic_findings: [],
        });
      }
    }

    if ((schema as any)._def?.typeName === 'ZodArray') {
      return '[]';
    }
  }

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
      : getDefaultMockResponse(prompt, schema);

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
