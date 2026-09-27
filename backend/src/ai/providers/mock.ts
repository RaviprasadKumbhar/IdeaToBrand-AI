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
  const facts: string[] = [];

  // Match multiline or single line raw startup idea
  const rawStartupMatch = prompt.match(/Raw Startup Idea:\s*\n?"?([\s\S]*?)"?\s*(?:\n\n|\n[A-Z=]|$)/i);
  if (rawStartupMatch && rawStartupMatch[1] && rawStartupMatch[1].trim() && !rawStartupMatch[1].includes('<string')) {
    concept = rawStartupMatch[1].trim().replace(/^"|"$/g, '').trim();
  }

  // Match legacy User's Raw Idea between quotes or section break
  if (!concept) {
    const rawMatch = prompt.match(/User's Raw Idea:\s*\n?"?([\s\S]*?)"?\s*(?:\n\n|\n[A-Z=]|$)/i);
    if (rawMatch && rawMatch[1] && rawMatch[1].trim() && !rawMatch[1].includes('<string')) {
      concept = rawMatch[1].trim().replace(/^"|"$/g, '').trim();
    }
  }

  const descMatch = prompt.match(/Business Description:\s*\n?"?([^\n"]+)"?/i);
  if (!concept && descMatch && descMatch[1] && !descMatch[1].includes('<string')) {
    concept = descMatch[1].trim();
  }

  const jsonDescMatch = prompt.match(/["']?business_description["']?\s*:\s*["']([^"'\n]+)["']/i);
  if (!concept && jsonDescMatch && jsonDescMatch[1] && !jsonDescMatch[1].includes('<string')) {
    concept = jsonDescMatch[1].trim();
  }

  const ideaTextMatch = prompt.match(/["']?idea_text["']?\s*:\s*["']([^"'\n]+)["']/i);
  if (!concept && ideaTextMatch && ideaTextMatch[1] && !ideaTextMatch[1].includes('<string')) {
    concept = ideaTextMatch[1].trim();
  }

  // Downstream stage fallback: inspect approved discovery decisions embedded in prompt
  if (!concept) {
    const approvedProblemMatch = prompt.match(/"core_problem"\s*:\s*"([^"]+)"/i);
    if (approvedProblemMatch && approvedProblemMatch[1] && !approvedProblemMatch[1].startsWith('<string')) {
      concept = approvedProblemMatch[1].trim();
    }
  }

  const factsMatch = prompt.match(/Confirmed User Facts:\s*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i);
  if (factsMatch && factsMatch[1]) {
    const lines = factsMatch[1].split('\n').map((l) => l.replace(/^-\s*/, '').trim()).filter(Boolean);
    facts.push(...lines);
  }

  // Check for audience in concept or prompt
  const audMatch = concept.match(/\b(?:for|to)\s+([a-zA-Z\s]{3,45}?)(?:\b(?:in|who|that|seeking|to)\b|[.,;]|$)/i);
  if (audMatch && audMatch[1]) {
    const candidate = audMatch[1].trim();
    if (!/^(?:my brand|myself|us|start|build)$/i.test(candidate)) {
      audience = candidate;
    }
  }

  return { concept, audience, facts };
}

function deriveDynamicBrandName(concept: string): string {
  if (!concept || concept.trim().length === 0) return 'VenturePulse';
  const clean = concept.replace(/[^a-zA-Z\s]/g, '').trim();
  const words = clean.split(/\s+/).filter(w => !/^(a|an|the|to|for|in|on|with|and|of|that|helps|build|create|platform)$/i.test(w));
  if (words.length >= 2) {
    const w1 = words[0][0].toUpperCase() + words[0].slice(1).toLowerCase();
    const w2 = words[1][0].toUpperCase() + words[1].slice(1).toLowerCase();
    return `${w1}${w2}`;
  } else if (words.length === 1) {
    const w = words[0][0].toUpperCase() + words[0].slice(1).toLowerCase();
    return `${w}Flow`;
  }
  return 'NovaBridge';
}

function getDefaultMockResponse(prompt: string, schema?: ZodSchema<any>): string {
  const { concept, audience, facts } = extractContextFromPrompt(prompt);
  const userIdea = concept || 'Innovative startup service';

  // Domain detection
  const isFarmersDirect = /farmer|agriculture|produce|farm|crop|harvest|grower/i.test(prompt);
  const isTeammateMatching = (/teammate|peer match|capstone partner|class project partner/i.test(prompt)) &&
    !/assistant|ai study/i.test(prompt);
  const isStudyAssistant = /study assistant|ai study|study helper|engineering student.*study|exam prep|tutor/i.test(prompt) ||
    (/assistant/i.test(prompt) && /student/i.test(prompt));
  const isAppointmentBooking = /appointment|booking|schedul|calendar|reservation/i.test(prompt);
  const isIndianSnack = /snack|namkeen|chaat|millet|indian food/i.test(userIdea);

  const dynamicName = isFarmersDirect
    ? 'HarvestDirect'
    : isStudyAssistant
    ? 'StudyEngine'
    : isAppointmentBooking
    ? 'BookLocal'
    : isTeammateMatching
    ? 'StudyNest'
    : isIndianSnack
    ? 'PranaBites'
    : deriveDynamicBrandName(userIdea);

  if (schema) {
    const shape = (schema as any).shape || (typeof (schema as any)._def?.shape === 'function' ? (schema as any)._def.shape() : (schema as any)._def?.shape);
    if (shape) {
      // ─── 1. POSITIONING STAGE ──────────────────────────────────────────────
      if ('directions' in shape) {
        if (isFarmersDirect) {
          return JSON.stringify({
            directions: [
              {
                title: 'Hyper-Local Farm Gate',
                category: 'Farm-to-Door Logistics & Commerce',
                target_audience: audience || 'Local households and culinary enthusiasts seeking fresh, ethical produce',
                core_problem: 'Small farmers lose 30–50% margins to wholesale intermediaries while local buyers lack direct access to fresh, traceable produce',
                differentiator: 'Guaranteed 24-hour harvest-to-doorstep delivery network directly empowering independent family growers',
                value_proposition: 'Farm-fresh produce delivered straight from the soil to your table within 24 hours',
                competitive_angle: 'Unlike supermarket aggregators, connects you directly to the specific grower with zero warehouse storage decay',
                strategic_rationale: 'Capitalizes on rising consumer demand for transparent local food systems and fair farmer compensation',
                potential_weakness: 'Requires tight cold-chain logistics during peak summer harvest periods',
                critic_findings: [],
              },
              {
                title: 'The Regional Growers Collective',
                category: 'Cooperative Producer Marketplace',
                target_audience: audience || 'Neighborhood restaurants, boutique grocers, and community food clubs',
                core_problem: 'Independent growers lack consolidated digital marketing and scheduled bulk ordering infrastructure',
                differentiator: 'Transparent cooperative marketplace with scheduled bulk harvests and fair producer-set pricing',
                value_proposition: 'Empowering regional farmers with predictable demand and fair producer-set pricing',
                competitive_angle: 'Bypasses predatory broker commissions with a collective grower-owned pricing model',
                strategic_rationale: 'Builds defensibility through high grower retention and recurring wholesale order volume',
                potential_weakness: 'Requires minimum order density to optimize regional delivery routes',
                critic_findings: [],
              },
            ],
          });
        }

        if (isStudyAssistant) {
          return JSON.stringify({
            directions: [
              {
                title: 'The Socratic Problem Solver',
                category: 'AI STEM Learning / Problem Solver',
                target_audience: audience || 'Undergraduate and graduate engineering students tackling technical coursework',
                core_problem: 'Engineering students encounter complex problem sets and coursework bottlenecks without accessible 24/7 technical guidance',
                differentiator: 'Context-aware Socratic tutoring with step-by-step mathematical reasoning that builds fundamental mastery',
                value_proposition: 'Master complex engineering problem sets with instant Socratic guidance 24/7',
                competitive_angle: 'Unlike generic search or chat LLMs, does not hallucinate equations and forces true conceptual comprehension',
                strategic_rationale: 'Addresses intense academic stress during late-night technical problem set deadlines',
                potential_weakness: 'Must continuously calibrate difficulty levels across different university engineering curricula',
                critic_findings: [],
              },
              {
                title: 'The Curriculum Mastery Accelerator',
                category: 'Adaptive Engineering Study Platform',
                target_audience: audience || 'Engineering study cohorts and exam prep groups',
                core_problem: 'Engineering coursework requires collaborative problem-solving that is hard to coordinate across busy student schedules',
                differentiator: 'Syncs AI problem walkthroughs with university engineering syllabi and collaborative study cohorts',
                value_proposition: 'Turn dense engineering lectures and problem sets into shared mastery and higher grades',
                competitive_angle: 'Directly maps to specific course modules rather than generic homework assistance',
                strategic_rationale: 'Creates powerful viral campus growth through cohort problem-solving groups',
                potential_weakness: 'Requires initial syllabus ingestion per engineering department',
                critic_findings: [],
              },
            ],
          });
        }

        if (isAppointmentBooking) {
          return JSON.stringify({
            directions: [
              {
                title: 'The Frictionless Booking Gateway',
                category: 'SaaS / Local Commerce Scheduling',
                target_audience: audience || 'Independent service professionals and local clinic/salon owners',
                core_problem: 'Local businesses waste hours on phone tags and lose significant revenue to client no-shows',
                differentiator: 'Self-service client booking with automated smart SMS reminders and no-show deposit protection',
                value_proposition: 'Fill your calendar and eliminate no-shows without endless phone tag',
                competitive_angle: 'Unlike bloated legacy scheduling tools, sets up in 5 minutes with zero client app download required',
                strategic_rationale: 'High immediate ROI for local merchants through reclaimed billable hours and reduced no-shows',
                potential_weakness: 'Requires educating less tech-savvy local business owners on automated deposits',
                critic_findings: [],
              },
              {
                title: 'The Local Client Relationship Hub',
                category: 'Local Business Operating System',
                target_audience: audience || 'Boutique salons, private practices, and wellness studios',
                core_problem: 'Disconnected tools for scheduling, client notes, and recurring service appointments',
                differentiator: 'Unified client profile with integrated booking history, preferences, and automated rebooking prompts',
                value_proposition: 'Turn one-time appointments into lifelong loyal clients',
                competitive_angle: 'Bridges appointment booking with intelligent automated client retention',
                strategic_rationale: 'Increases customer lifetime value for service providers',
                potential_weakness: 'Higher initial data entry for businesses with existing paper records',
                critic_findings: [],
              },
            ],
          });
        }

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

        if (isTeammateMatching) {
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

        // Generic / Custom Idea
        return JSON.stringify({
          directions: [
            {
              title: `The Modern ${dynamicName} Standard`,
              category: 'Direct-to-Market Platform',
              target_audience: audience || `Target users seeking dedicated solutions for ${userIdea.slice(0, 60)}`,
              core_problem: `Current solutions for ${userIdea.slice(0, 60)} are fragmented, overpriced, or lack customer-first transparency`,
              differentiator: `Purpose-built platform engineered specifically for seamless ${userIdea.slice(0, 50)} execution`,
              value_proposition: `Dependable, beautifully designed ${userIdea.slice(0, 50)} built for modern customer needs`,
              competitive_angle: 'Provides direct specialized focus rather than generic mass-market compromises',
              strategic_rationale: 'Taps into unsatisfied demand from users seeking tailored quality and speed',
              potential_weakness: 'Requires educating early adopters on specialized vs generic alternatives',
              critic_findings: [],
            },
            {
              title: `The Agile ${dynamicName} Pioneer`,
              category: 'Next-Gen Workflow Platform',
              target_audience: audience || `Forward-thinking adopters and organizations in this domain`,
              core_problem: `Legacy alternatives lack automation, speed, and modern user experience`,
              differentiator: `Frictionless automated workflow tailored to everyday customer needs`,
              value_proposition: `Smarter, faster ${userIdea.slice(0, 50)} with measurable daily convenience`,
              competitive_angle: 'Radical simplicity and direct value delivery compared to legacy vendors',
              strategic_rationale: 'Capitalizes on market shift toward agile, intuitive specialized tools',
              potential_weakness: 'Must rapidly establish trust through early customer proof points',
              critic_findings: [],
            },
          ],
        });
      }

      // ─── 2. DISCOVERY STAGE ────────────────────────────────────────────────
      if ('core_problem' in shape) {
        if (isFarmersDirect) {
          return JSON.stringify({
            core_problem: 'Small regional farmers lose 30–50% of revenue to distribution middlemen while local buyers lack reliable direct access to fresh, sustainably harvested local produce.',
            target_audience: audience || 'Small independent farmers and local households seeking farm-fresh produce',
            context_situation: 'Entering the market to bridge regional agricultural growers directly with local community buyers',
            user_goals: 'Sell produce directly to customers at fair prices, expand local buyer reach, and guarantee harvest freshness',
            constraints: 'Guaranteed 24-hour harvest-to-table delivery within local geographic radius; transparent grower-first pricing',
            value_desired_outcome: 'Fair sustainable revenue for independent growers and guaranteed farm-fresh food for local families',
            open_questions: ['What regional delivery model minimizes packaging waste while preserving produce crispness?'],
            known_facts: facts.length > 0 ? facts : [userIdea],
            inferred_assumptions: [
              {
                value: 'Local consumers will pay a fair direct price when provenance and same-day harvest freshness are verified',
                rationale: 'Growing consumer flight from supermarket supply chains toward transparent local food systems',
              },
            ],
          });
        }

        if (isStudyAssistant) {
          return JSON.stringify({
            core_problem: 'Engineering students encounter complex problem sets and coursework bottlenecks without accessible, 24/7 step-by-step guidance outside of office hours.',
            target_audience: audience || 'Undergraduate and graduate engineering and STEM students tackling technical coursework',
            context_situation: 'Rigorous academic semesters with high-volume technical assignments, labs, and exam preparations',
            user_goals: 'Understand difficult concepts faster, get 24/7 Socratic problem-solving guidance, and achieve academic mastery',
            constraints: 'Must teach principles through step-by-step Socratic walkthroughs rather than generating blind homework answers',
            value_desired_outcome: 'Deep mastery of engineering fundamentals, reduced late-night study friction, and higher grades',
            open_questions: ['Which engineering disciplines (electrical, mechanical, computer science) benefit most from specialized notation parsing?'],
            known_facts: facts.length > 0 ? facts : [userIdea],
            inferred_assumptions: [
              {
                value: 'Students prioritize conceptual comprehension and step verification over simple answer generation',
                rationale: 'Engineering exams test fundamental problem-solving that shortcuts cannot replace',
              },
            ],
          });
        }

        if (isAppointmentBooking) {
          return JSON.stringify({
            core_problem: 'Local service businesses lose significant revenue to last-minute cancellations, client no-shows, and manual phone scheduling overhead.',
            target_audience: audience || 'Local service businesses, independent professionals, and their clients',
            context_situation: 'Fast-paced daily operations where business owners juggle service delivery and constant front-desk phone interruptions',
            user_goals: 'Automate customer appointment bookings, eliminate client no-shows, and streamline daily calendar management',
            constraints: 'Zero-friction self-service mobile booking for clients with automated SMS reminders and deposit protection',
            value_desired_outcome: 'Fully booked schedules, predictable client attendance, and reclaimed business hours without phone tag',
            open_questions: ['What automated deposit or confirmation window achieves the lowest cancellation rate across service categories?'],
            known_facts: facts.length > 0 ? facts : [userIdea],
            inferred_assumptions: [
              {
                value: 'Service clients prefer direct mobile self-scheduling over calling during limited business hours',
                rationale: 'Over 60% of appointment bookings occur outside standard business operating hours',
              },
            ],
          });
        }

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

        if (isTeammateMatching) {
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

        // Generic / Custom Idea
        return JSON.stringify({
          core_problem: `Customers seeking ${userIdea.slice(0, 70)} encounter fragmentation, high costs, or lack of tailored, reliable service in the current market.`,
          target_audience: audience || `Target customers and early adopters seeking dedicated solutions for ${userIdea.slice(0, 60)}`,
          context_situation: `Entering the market to deliver specialized, modern ${userIdea.slice(0, 60)}`,
          user_goals: `Establish a reputable, recognized brand and solve key user pain points in ${userIdea.slice(0, 60)}`,
          constraints: 'Initial operational focus on core customer satisfaction and verified value delivery',
          value_desired_outcome: 'Authentic, dependable service delivery and long-term customer trust',
          open_questions: ['What initial customer acquisition channel provides the strongest retention and referral loops?'],
          known_facts: facts.length > 0 ? facts : [userIdea],
          inferred_assumptions: [
            {
              value: 'Early adopters value specialized expertise and responsive support over generic mass-market providers',
              rationale: 'Niche focus consistently builds higher early customer loyalty and word of mouth',
            },
          ],
        });
      }

      // ─── 3. NAMING & PERSONALITY STAGE ─────────────────────────────────────
      if ('naming_directions' in shape) {
        let proposedName = dynamicName;
        let territory = 'Authentic Utility & Purpose';
        let rationale = `Directly reflects customer empowerment in ${userIdea.slice(0, 50)}`;

        if (isFarmersDirect) {
          proposedName = 'HarvestDirect';
          territory = 'Freshness & Direct Connection';
          rationale = 'Bridges fresh regional farm harvests directly with local neighborhood households with honest transparency';
        } else if (isStudyAssistant) {
          proposedName = 'StudyEngine';
          territory = 'Technical Mastery & Precision';
          rationale = 'Evokes computational power, structured engineering logic, and academic momentum';
        } else if (isAppointmentBooking) {
          proposedName = 'BookLocal';
          territory = 'Effortless Access & Reliability';
          rationale = 'Communicates simple, dependable appointment scheduling designed specifically for local service providers';
        } else if (isTeammateMatching) {
          proposedName = 'StudyNest';
          territory = 'Collaborative Growth';
          rationale = 'Symbolizes a supportive collaborative habitat for student academic teams';
        } else if (isIndianSnack) {
          proposedName = 'PranaBites';
          territory = 'Vitality & Heritage';
          rationale = 'Connects traditional life-force concept with modern bite-sized snacking';
        }

        return JSON.stringify({
          naming_directions: [
            {
              territory,
              proposed_name: proposedName,
              rationale,
              relationship_to_audience: `Directly resonates with ${audience || 'target users'} seeking dependable solutions`,
              relationship_to_positioning: `Reinforces the primary strategic differentiator for ${userIdea.slice(0, 50)}`,
              potential_concern: 'Requires consistent brand storytelling to highlight unique market value',
              critic_analysis: 'Distinctive, evocative, and easily pronounced without generic tech clichés',
              sharper_alternative: `Consider ${proposedName}Hub as an alternative`,
            },
          ],
          personality_traits: [
            { trait: 'Pragmatic', audience_justification: 'Users need clear, dependable utility from day one' },
            { trait: 'Honest', audience_justification: 'Transparent communication builds lasting customer trust' },
            { trait: 'Empowering', audience_justification: 'Directly helps users overcome their core friction points' },
          ],
          traits_to_avoid: ['Pretentious', 'Bureaucratic', 'Generic'],
          brand_principles: [
            { principle: 'Customer-first integrity', rationale: 'Long-term brand equity relies on dependable value delivery' },
          ],
          critic_findings: [],
        });
      }

      // ─── 4. TAGLINE & PITCH STAGE ──────────────────────────────────────────
      if ('tagline_options' in shape) {
        if (isFarmersDirect) {
          return JSON.stringify({
            tagline_options: [
              'Straight from the soil. Fresh to your door.',
              'Know your farmer. Taste the harvest.',
            ],
            one_line_pitch: 'HarvestDirect connects independent local farmers directly with neighborhood consumers for same-day fresh produce without predatory middlemen.',
            rationale_per_tagline: [
              'Clear functional delivery and freshness promise',
              'Emotional connection to local agriculture',
            ],
            critic_findings: [],
          });
        }

        if (isStudyAssistant) {
          return JSON.stringify({
            tagline_options: [
              'Master complex engineering problem sets faster.',
              'Socratic guidance for tomorrow’s engineers.',
            ],
            one_line_pitch: 'StudyEngine is an AI study assistant for engineering students providing 24/7 step-by-step problem-solving and conceptual clarity.',
            rationale_per_tagline: [
              'Direct benefit for academic performance',
              'Aspirational appeal to engineering students',
            ],
            critic_findings: [],
          });
        }

        if (isAppointmentBooking) {
          return JSON.stringify({
            tagline_options: [
              'Fewer no-shows. Seamless bookings.',
              'Your calendar filled on autopilot.',
            ],
            one_line_pitch: 'BookLocal helps local service businesses automate customer appointments and eliminate no-shows effortlessly.',
            rationale_per_tagline: [
              'Clear operational benefit solving client no-shows',
              'Time-saving automation promise',
            ],
            critic_findings: [],
          });
        }

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

        if (isTeammateMatching) {
          return JSON.stringify({
            tagline_options: [
              'Find your team. Ship your project.',
              'Better matches, better capstones.',
            ],
            one_line_pitch: 'StudyNest pairs university students with reliable project teammates based on verified skills and schedules.',
            rationale_per_tagline: [
              'Action-oriented collaboration benefit',
              'Direct audience relevance',
            ],
            critic_findings: [],
          });
        }

        // Generic
        return JSON.stringify({
          tagline_options: [
            `Built for ${userIdea.slice(0, 30)}. Designed for you.`,
            `The smarter way to experience ${userIdea.slice(0, 30)}.`,
          ],
          one_line_pitch: `${dynamicName} delivers dedicated, reliable solutions for ${userIdea.slice(0, 50)}, combining quality with transparent customer care.`,
          rationale_per_tagline: [
            'Direct relevance to target user needs',
            'Modern utility-first messaging',
          ],
          critic_findings: [],
        });
      }

      // ─── 5. VISUAL BRIEF STAGE ─────────────────────────────────────────────
      if ('hex_palette' in shape) {
        if (isFarmersDirect) {
          return JSON.stringify({
            logo_direction: 'Stylized leaf and furrow motif forming a clean modern harvest seal',
            color_mood: 'Lush meadow green, deep forest, and warm sunrise amber',
            hex_palette: ['#15803D', '#166534', '#F59E0B', '#F0FDF4'],
            type_roles: ['Headings: Space Grotesk', 'Body: Inter'],
            shape_language: 'Soft organic contours with clean agricultural geometric curves',
            symbol_language: 'Harvest crates, sunbursts, soil furrows, and fresh green sprouts',
            composition_layout: 'Open editorial layout with transparent grower photography and produce grids',
            imagery_direction: 'Authentic local farmers in fields, morning dew on fresh vegetables, and bustling farm gates',
            concepts_to_avoid: ['Industrial tractor clipart', 'Generic mass-supermarket barcode graphics'],
            rationale_linking_to_audience_and_positioning: 'Balances agricultural warmth and honesty with crisp modern logistics efficiency',
            concept_disclaimer: 'AI-generated visual concept / design direction — not production-ready artwork.',
          });
        }

        if (isStudyAssistant) {
          return JSON.stringify({
            logo_direction: 'Precision geometric compass and neural circuit node icon',
            color_mood: 'Technical slate, deep cobalt, and electric cyan',
            hex_palette: ['#0F172A', '#2563EB', '#38BDF8', '#F8FAFC'],
            type_roles: ['Headings: Space Grotesk', 'Body: JetBrains Mono / Inter'],
            shape_language: 'Crisp rectilinear cards with technical grid alignments and code block syntax',
            symbol_language: 'Mathematical vectors, circuit nodes, and step-by-step logic pathways',
            composition_layout: 'High-density structured canvas with split problem walkthrough and reasoning pane',
            imagery_direction: 'Focused engineering study desks, circuit diagrams, and collaborative whiteboard sessions',
            concepts_to_avoid: ['Cheesy graduation caps', 'Generic cartoon robots'],
            rationale_linking_to_audience_and_positioning: 'Technical rigor and contemporary STEM aesthetic credibility',
            concept_disclaimer: 'AI-generated visual concept / design direction — not production-ready artwork.',
          });
        }

        if (isAppointmentBooking) {
          return JSON.stringify({
            logo_direction: 'Interlocking calendar block and confirmation checkmark mark',
            color_mood: 'Deep pine teal, clean mint, and warm coral',
            hex_palette: ['#0F766E', '#14B8A6', '#F43F5E', '#F0FDFA'],
            type_roles: ['Headings: Space Grotesk', 'Body: Inter'],
            shape_language: 'Rounded timeline cards, time-slot chips, and calendar grids',
            symbol_language: 'Checkmarks, calendar dates, time slots, and smart notification pings',
            composition_layout: 'Spacious mobile-first booking interface with prominent call-to-actions',
            imagery_direction: 'Independent salon owners, local doctors, and busy clients walking into appointments on time',
            concepts_to_avoid: ['Overly complex corporate dashboards', 'Outdated clip-art phones'],
            rationale_linking_to_audience_and_positioning: 'Communicates calmness, punctuality, and seamless modern efficiency',
            concept_disclaimer: 'AI-generated visual concept / design direction — not production-ready artwork.',
          });
        }

        // Generic
        return JSON.stringify({
          logo_direction: 'Clean modern wordmark with subtle distinctive geometric accent',
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

      // ─── 6. VOICE & MESSAGING STAGE ────────────────────────────────────────
      if ('sample_messages' in shape) {
        if (isFarmersDirect) {
          return JSON.stringify({
            voice_description: 'Grounded, transparent, and community-proud with deep respect for agriculture',
            tone_characteristics: ['Authentic', 'Warm', 'Direct'],
            do_list: ['Highlight the grower and harvest date', 'Keep food language fresh and honest'],
            dont_list: ['Do not use artificial marketing hype', 'Do not demean traditional farming'],
            sample_messages: [
              { message: 'Harvested at 6 AM in the valley. On your dinner table by 6 PM.', explanation: 'Homepage hero headline' },
              { message: 'Meet Farmer David: 3rd-generation heirloom tomato grower in your county.', explanation: 'Producer profile card' },
              { message: 'Your seasonal farm basket has been packed fresh from the morning pick.', explanation: 'Delivery notification' },
            ],
            critic_findings: [],
          });
        }

        if (isStudyAssistant) {
          return JSON.stringify({
            voice_description: 'Intellectually rigorous, encouraging, and precise without condescension',
            tone_characteristics: ['Analytical', 'Encouraging', 'Clear'],
            do_list: ['Break down complex engineering equations step-by-step', 'Celebrate conceptual breakthroughs'],
            dont_list: ['Do not just give raw answers without Socratic explanation', 'Do not use patronizing academic jargon'],
            sample_messages: [
              { message: 'Stuck on tonight’s circuit analysis problem? Let’s trace the current loops step by step.', explanation: 'Homepage hero headline' },
              { message: 'You correctly applied Kirchhoff’s voltage law. Now let’s verify node B.', explanation: 'Study feedback card' },
              { message: 'Socratic guidance is ready whenever office hours are closed.', explanation: 'Onboarding welcome' },
            ],
            critic_findings: [],
          });
        }

        if (isAppointmentBooking) {
          return JSON.stringify({
            voice_description: 'Efficient, friendly, and dependable with zero administrative friction',
            tone_characteristics: ['Punctual', 'Friendly', 'Concise'],
            do_list: ['Make appointment confirmation instant', 'Keep reminders clear and actionable'],
            dont_list: ['Do not send spammy promotional messages', 'Do not make rescheduling difficult'],
            sample_messages: [
              { message: 'Book your appointment in 30 seconds. Zero phone tag required.', explanation: 'Homepage hero headline' },
              { message: 'Your appointment is confirmed for tomorrow at 2:00 PM. Tap here if you need to reschedule.', explanation: 'SMS confirmation' },
              { message: 'Your calendar is filled for Friday. Reclaimed 3 hours of front-desk calls.', explanation: 'Merchant dashboard report' },
            ],
            critic_findings: [],
          });
        }

        // Generic
        return JSON.stringify({
          voice_description: 'Direct, encouraging, and authentic',
          tone_characteristics: ['Pragmatic', 'Approachable', 'Honest'],
          do_list: ['Be direct', 'Focus on real customer value'],
          dont_list: ['Do not use corporate jargon', 'Do not overpromise'],
          sample_messages: [
            { message: `Crafted with intention. Designed for your ${userIdea.slice(0, 30)}.`, explanation: 'Homepage hero' },
            { message: 'Your request has been processed with dedicated care.', explanation: 'Notification' },
            { message: `Join our community of forward-thinking users.`, explanation: 'Onboarding step' },
          ],
          critic_findings: [],
        });
      }

      // ─── 7. LAUNCH PREP STAGE ──────────────────────────────────────────────
      if ('landing_headline' in shape) {
        if (isFarmersDirect) {
          return JSON.stringify({
            landing_headline: 'Farm-fresh produce delivered within 24 hours of harvest. Support local growers directly.',
            social_launch_post: 'We are officially live! Skip grocery warehouse storage and enjoy produce harvested this morning directly from local family farms with HarvestDirect.',
            critic_findings: [],
          });
        }

        if (isStudyAssistant) {
          return JSON.stringify({
            landing_headline: 'Stuck on tonight’s engineering problem set? Get step-by-step Socratic walkthroughs in seconds.',
            social_launch_post: 'Announcing StudyEngine: the 24/7 AI study assistant built specifically for engineering students to master technical problem sets without hallucinated math.',
            critic_findings: [],
          });
        }

        if (isAppointmentBooking) {
          return JSON.stringify({
            landing_headline: 'Fill your calendar and eliminate no-shows without endless phone tag.',
            social_launch_post: 'Local businesses can now automate customer appointments in under 5 minutes with BookLocal. Zero phone tag, automated reminders, and dependable attendance.',
            critic_findings: [],
          });
        }

        // Generic
        return JSON.stringify({
          landing_headline: `The new standard in ${userIdea.slice(0, 50)}.`,
          social_launch_post: `We are officially live! Discover authentic, dependable solutions designed for ${userIdea.slice(0, 50)} with ${dynamicName}.`,
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
