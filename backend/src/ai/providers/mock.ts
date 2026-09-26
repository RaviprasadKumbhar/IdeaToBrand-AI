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

function extractContextFromPrompt(prompt: string) {
  let concept = '';
  let audience = '';
  let facts: string[] = [];

  const rawMatch = prompt.match(/User's Raw Idea:\s*\n?"?([^"\n]+)"?/i);
  if (rawMatch && rawMatch[1]) {
    concept = rawMatch[1].trim();
  }

  const descMatch = prompt.match(/Business Description:\s*([^\n]+)/i);
  if (descMatch && descMatch[1]) {
    concept = descMatch[1].trim();
  }

  const factsMatch = prompt.match(/Confirmed User Facts:\s*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i);
  if (factsMatch && factsMatch[1]) {
    const lines = factsMatch[1].split('\n').map((l) => l.replace(/^-\s*/, '').trim()).filter(Boolean);
    facts.push(...lines);
  }

  // Check for audience in concept
  const audMatch = concept.match(/\b(for|to)\s+([a-zA-Z\s]{3,40}?)(?:\bin\b|[.,;]|$)/i);
  if (audMatch && audMatch[2]) {
    audience = audMatch[2].trim();
  }

  return { concept, audience, facts };
}

function getDefaultMockResponse(prompt: string, schema?: ZodSchema<any>): string {
  const { concept, audience, facts } = extractContextFromPrompt(prompt);
  const isStudentApp = /student|academic|class project|teammate|coursework/i.test(prompt);

  if (schema) {
    const shape = (schema as any).shape || (typeof (schema as any)._def?.shape === 'function' ? (schema as any)._def.shape() : (schema as any)._def?.shape);
    if (shape) {
      if ('directions' in shape) {
        if (!isStudentApp && concept) {
          return JSON.stringify({
            directions: [
              {
                title: 'The Artisanal Standard',
                category: 'Direct-to-Consumer / Lifestyle',
                target_audience: audience || 'Conscious consumers seeking quality',
                core_problem: `Generic mass-market alternatives lack soul and quality for ${concept}`,
                differentiator: 'Direct artisan sourcing with radical quality transparency',
                value_proposition: `Elevated, honest ${concept} designed to last`,
                competitive_angle: 'Unlike mass-market retailers, focuses on craftsmanship and authentic materials',
                strategic_rationale: 'Capitalizes on consumer flight to authentic, enduring products',
                potential_weakness: 'Higher unit economics may limit initial high-volume velocity',
                critic_findings: [],
              },
              {
                title: 'The Modern Everyday Companion',
                category: 'Accessible Utility / Everyday Essentials',
                target_audience: audience || 'Everyday practical buyers',
                core_problem: `High durability ${concept} is usually overpriced or inaccessible`,
                differentiator: 'Engineered for seamless daily use at an accessible direct price point',
                value_proposition: `Dependable, beautifully designed ${concept} for everyday life`,
                competitive_angle: 'Bridges the gap between cheap disposability and luxury exclusivity',
                strategic_rationale: 'Broad addressable market with high repeat referral potential',
                potential_weakness: 'Requires tight operational supply-chain execution',
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
        if (!isStudentApp && concept) {
          const knownFacts = facts.length > 0 ? facts : [`Business concept: ${concept}`];
          return JSON.stringify({
            core_problem: `Customers seeking ${concept} encounter overpriced or low-quality alternatives without reliable craftsmanship`,
            target_audience: audience || 'Conscious buyers prioritizing value and authenticity',
            context_situation: `Entering the market to deliver dedicated ${concept}`,
            user_goals: `Establish a reputable, recognized brand in the market for ${concept}`,
            constraints: 'Initial production scale and distribution channels to be established',
            value_desired_outcome: `Authentic, reliable customer satisfaction and long-term brand loyalty`,
            open_questions: ['What initial marketing channel will drive the most cost-effective customer acquisition?'],
            known_facts: knownFacts,
            inferred_assumptions: [
              {
                value: 'Target customers prioritize direct transparency over generic corporate claims',
                rationale: 'Inferred from early adopter dynamics for authentic products',
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
          known_facts: facts.length > 0 ? facts : ['Students attend classes together'],
          inferred_assumptions: [
            {
              value: 'Students value responsiveness over credentials',
              rationale: 'Inferred from common capstone team frictions',
            },
          ],
        });
      }
      if ('naming_directions' in shape) {
        const proposedName = isStudentApp ? 'Koru' : 'AuraCraft';
        return JSON.stringify({
          naming_directions: [
            {
              territory: isStudentApp ? 'Collaborative Growth' : 'Authentic Expression',
              proposed_name: proposedName,
              rationale: isStudentApp
                ? 'Symbolizes unfolding potential and collaborative beginnings'
                : 'Evokes natural craftsmanship, honesty, and enduring design',
              relationship_to_audience: isStudentApp
                ? 'Resonates with students entering teamwork'
                : 'Appeals to customers who value thoughtful, authentic creation',
              relationship_to_positioning: isStudentApp
                ? 'Directly supports academic matchmaking'
                : 'Anchors premium craftsmanship and reliable utility',
              potential_concern: 'May need pronunciation guide in international markets',
              critic_analysis: 'Distinctive and memorable without generic tech suffixes',
              sharper_alternative: isStudentApp ? 'Consider Nexus as an alternative' : 'Consider Verve or Kora as alternatives',
            },
          ],
          personality_traits: [
            { trait: 'Pragmatic', audience_justification: 'Customers need clear, immediate utility' },
            { trait: 'Supportive', audience_justification: 'Builds lasting user trust and confidence' },
            { trait: 'Direct', audience_justification: 'Communicates with transparency and focus' },
          ],
          traits_to_avoid: ['Bureaucratic', 'Pretentious'],
          brand_principles: [
            { principle: 'Customer-first integrity', rationale: 'Long-term brand equity relies on trust' },
          ],
          critic_findings: [],
        });
      }
      if ('tagline_options' in shape) {
        return JSON.stringify({
          tagline_options: isStudentApp
            ? ['Find your team. Ship your project.', 'Better matches, better capstones.']
            : ['Thoughtfully crafted. Built to last.', 'Authentic design for everyday life.'],
          one_line_pitch: isStudentApp
            ? 'Koru pairs university students with reliable project teammates based on verified skills and schedules.'
            : `Delivering thoughtfully designed ${concept || 'lifestyle products'} combining authentic quality with accessible pricing.`,
          rationale_per_tagline: [
            'Action-oriented benefit',
            'Direct audience relevance',
          ],
          critic_findings: [],
        });
      }
      if ('hex_palette' in shape) {
        return JSON.stringify({
          logo_direction: 'Clean modern wordmark with subtle geometric accent',
          color_mood: 'Deep indigo and warm amber',
          hex_palette: ['#1E293B', '#4F46E5', '#F59E0B', '#F8FAFC'],
          type_roles: ['Headings: Space Grotesk', 'Body: Inter'],
          shape_language: 'Clean rectilinear cards with rounded corners',
          symbol_language: 'Interconnected nodes and paths',
          composition_layout: 'Generous whitespace with structured grid',
          imagery_direction: 'Authentic lifestyle and product context moments',
          concepts_to_avoid: ['Stock handshakes', 'Generic clipart icons'],
          rationale_linking_to_audience_and_positioning: 'Technical credibility and contemporary aesthetic alignment',
          concept_disclaimer: 'AI-generated visual concept / design direction — not production-ready artwork.',
        });
      }
      if ('sample_messages' in shape) {
        return JSON.stringify({
          voice_description: 'Direct, encouraging, and authentic',
          tone_characteristics: ['Pragmatic', 'Approachable', 'Honest'],
          do_list: ['Be direct', 'Focus on real customer value'],
          dont_list: ['Do not use corporate jargon', 'Do not overpromise'],
          sample_messages: [
            { message: isStudentApp ? 'Find your project team in minutes.' : 'Crafted with intention. Designed for your everyday.', explanation: 'Homepage hero' },
            { message: isStudentApp ? 'Matched with 2 peers for your CS capstone.' : 'Your order has shipped with care.', explanation: 'Notification' },
            { message: isStudentApp ? 'Lock in your team charter.' : 'Join our community of conscious creators.', explanation: 'Onboarding step' },
          ],
          critic_findings: [],
        });
      }
      if ('landing_headline' in shape) {
        return JSON.stringify({
          landing_headline: isStudentApp
            ? 'Form your capstone team without the group chat drama.'
            : `The new standard in ${concept || 'everyday essentials'}.`,
          social_launch_post: isStudentApp
            ? 'Tired of random team assignments? Koru matches you with verified teammates for your semester project.'
            : `We are officially live! Discover authentic, dependable ${concept || 'craftsmanship'} crafted for you.`,
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
