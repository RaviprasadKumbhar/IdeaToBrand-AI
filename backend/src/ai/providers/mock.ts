import type { ZodSchema } from 'zod';
import type { CriticFinding, StageName } from '@foil/shared';
import {
  AIProvider,
  AIProviderResult,
  TimeoutError,
  RateLimitError,
  AIProviderError,
  extractJSONFromText,
} from '../provider.js';
import { generateContextualBrandPlan } from '../contextualEngine.js';

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

  // Match INKLOOM Unified Brand Plan prompt pattern
  const inkloomIdeaMatch = prompt.match(/(?:=== USER IDEA ===\s*\n)?(?:Raw Startup )?Idea:\s*"([^"\n]+)"/i);
  if (inkloomIdeaMatch && inkloomIdeaMatch[1] && inkloomIdeaMatch[1].trim() && !inkloomIdeaMatch[1].includes('<string')) {
    concept = inkloomIdeaMatch[1].trim();
  }

  // Match multiline or single line raw startup idea
  if (!concept) {
    const rawStartupMatch = prompt.match(/Raw Startup Idea:\s*\n?"?([\s\S]*?)"?\s*(?:\n\n|\n[A-Z=]|$)/i);
    if (rawStartupMatch && rawStartupMatch[1] && rawStartupMatch[1].trim() && !rawStartupMatch[1].includes('<string')) {
      concept = rawStartupMatch[1].trim().replace(/^"|"$/g, '').trim();
    }
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

  if (!concept) {
    const brandPlanIdeaMatch = prompt.match(/(?:=== USER IDEA ===\s*\n*)?(?:Idea|Founder Idea|Startup Idea):\s*["']([^"'\n]+)["']/i);
    if (brandPlanIdeaMatch && brandPlanIdeaMatch[1] && !brandPlanIdeaMatch[1].includes('<string')) {
      concept = brandPlanIdeaMatch[1].trim();
    }
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
    const lines = factsMatch[1]
      .split('\n')
      .map((l) => l.replace(/^-\s*/, '').trim())
      .filter((l) => l && !l.includes('[object Object]'));
    facts.push(...lines);
  }

  if (concept.includes('[object Object]')) {
    concept = '';
  }

  // Clean founder intent lead-in phrases so the core business offering is isolated
  const cleanedIdea = concept
    .replace(/^(?:i want to|we want to|my idea is to|we are building|i am building|i\'d like to|looking to|our goal is to)\s+(?:build|create|launch|start|develop|make|offer|sell|provide|design)?\s*/i, '')
    .trim();

  // Beneficiary-first audience matching against the founder's raw concept (never the system prompt)
  const toBeneficiaryMatch = cleanedIdea.match(/\b(?:to|serving|for|helping|empowering|targeted at)\s+([a-zA-Z\s]{3,45}?(?:clinics?|hospitals?|patients?|doctors?|nurses?|practitioners?|students?|teachers?|users?|consumers?|families?|communities?|shops?|stores?|businesses?|teams?|organizations?|drivers?|workers?|riders?|clients?|customers?|patrons?|professionals?|women|men|parents?|seniors?|children|kids|youth|operators?|developers?|engineers?|chefs?))\b/i);
  if (toBeneficiaryMatch && toBeneficiaryMatch[1]) {
    const candidate = toBeneficiaryMatch[1].trim();
    if (!/^(?:my brand|myself|us|start|build|them|everyone|people)$/i.test(candidate)) {
      audience = candidate;
    }
  }

  // Extract human audience from cleaned concept using precise preposition and verb boundaries
  if (!audience) {
    const forMatch = cleanedIdea.match(/\b(?:for|serving|targeted at|helping|connecting|enabling|empowering|assisting)\s+([a-zA-Z\s]{3,40}?)(?:\s+(?:to\s+[a-z]+|manage|sell|prepare|find|build|scale|grow|automate|book|order|with|for|in|who|that|monetize)\b|[.,;]|$)/i);
    if (forMatch && forMatch[1]) {
      const candidate = forMatch[1].trim();
      if (!/^(?:my brand|myself|us|start|build|them|everyone|people|exams?|university exams?|tests?|interviews?|urgent|medical supplies|supplies|products?|items?|goods|parts)$/i.test(candidate)) {
        audience = candidate;
      }
    }
  }

  if (!audience) {
    const helpingAudMatch = concept.match(/\b(?:helping|enabling|empowering|connecting|targeted at|assisting)\s+([a-zA-Z\s]{3,45}?)(?:\s+(?:to\s+[a-z]+|sell|prepare|manage|find|build|with|for|in|who|that|monetize)\b|[.,;]|$)/i);
    if (helpingAudMatch && helpingAudMatch[1]) {
      const candidate = helpingAudMatch[1].trim();
      if (!/^(?:my brand|myself|us|start|build|them|everyone|people)$/i.test(candidate)) {
        audience = candidate;
      }
    }
  }

  return { concept: cleanedIdea || concept, audience, facts };
}

export function extractScenarioFromPrompt(prompt: string): string | null {
  const m1 = prompt.match(/What-If Condition:\s*"([^"]+)"/i);
  if (m1 && m1[1] && m1[1].trim()) return m1[1].trim();

  const m2 = prompt.match(/SCENARIO PROBE OVERRIDE[^:]*:\s*\n?[^\n]*\nWhat-If Condition:\s*"([^"]+)"/i);
  if (m2 && m2[1] && m2[1].trim()) return m2[1].trim();

  const m3 = prompt.match(/what_if_input["']?\s*:\s*["']([^"'\n]+)["']/i);
  if (m3 && m3[1] && m3[1].trim()) return m3[1].trim();

  const m4 = prompt.match(/under premise:\s*"([^"]+)"/i);
  if (m4 && m4[1] && m4[1].trim()) return m4[1].trim();

  return null;
}

function deriveDynamicBrandName(concept: string): string {
  if (!concept || concept.trim().length === 0 || concept.includes('[object Object]')) return 'VenturePulse';
  const clean = concept.replace(/[^a-zA-Z\s]/g, '').trim();
  const words = clean.split(/\s+/).filter(w => !/^(a|an|the|to|for|in|on|with|and|of|that|helps|build|create|platform|service|brand|app|tool|system|using|fleet|autonomous|automated|automatic|intelligent|smart|digital|online|virtual|urgent|quick|fast|direct|custom|modern|new|clean|green|first|next|daily|reliable|seamless|effective|innovative|best|good|great)$/i.test(w));
  if (words.length >= 2) {
    const w1 = words[0][0].toUpperCase() + words[0].slice(1).toLowerCase();
    const w2 = words[1][0].toUpperCase() + words[1].slice(1).toLowerCase();
    return `${w1}${w2}`;
  } else if (words.length === 1) {
    const w = words[0][0].toUpperCase() + words[0].slice(1).toLowerCase();
    return `${w}Pulse`;
  }
  return 'NovaBridge';
}

export function generateMockCriticFindings(prompt: string): string {
  if (
    prompt.includes('Holistic Consistency Audit') ||
    prompt.includes('ConsistencyFindingSchema') ||
    prompt.includes('fields_in_conflict')
  ) {
    return JSON.stringify([
      {
        id: `cons-${Date.now()}-1`,
        fields_in_conflict: ['tagline_pitch', 'positioning'],
        issue_type: 'cliche',
        evidence: 'Tagline phrasing relies on generic category terminology without distinctive proprietary framing.',
        why_it_matters: 'Weakens market defensibility and causes the brand to sound interchangeable with legacy market incumbents.',
        sharper_alternative: 'Anchor tagline directly to the proprietary operational differentiator defined in approved positioning.',
        user_action: null,
      },
    ]);
  }

  const stageMatch = prompt.match(/Draft to Evaluate \(([^)]+)\)/i) || prompt.match(/Evaluation Stage:\s*([a-z_]+)/i);
  const stage = (stageMatch ? stageMatch[1].trim() : 'positioning') as StageName;

  switch (stage) {
    case 'discovery':
      return JSON.stringify([
        {
          id: `crit-disc-${Date.now()}`,
          stage: 'discovery',
          target_field: 'constraints',
          issue_type: 'vague',
          evidence: 'Broad assumption around user adoption speed and operational availability',
          explanation: 'Initial constraints lack concrete latency thresholds or hardware fallback requirements.',
          sharper_alternative: 'Specify sub-second response limits and offline-first mobile sync constraints for intermittent connectivity.',
          user_action: null,
        },
      ]);

    case 'positioning':
      return JSON.stringify([
        {
          id: `crit-pos-${Date.now()}`,
          stage: 'positioning',
          target_field: 'value_proposition',
          issue_type: 'cliche',
          evidence: 'All-in-one or seamless workflow phrasing',
          explanation: 'Generalized convenience claims are claimed by every SaaS competitor and fail to establish category leadership.',
          sharper_alternative: 'Quantify the direct economic payoff: guaranteed 24-hour turnaround or 80% administrative overhead reduction.',
          user_action: null,
        },
      ]);

    case 'naming_personality':
      return JSON.stringify([
        {
          id: `crit-name-${Date.now()}`,
          stage: 'naming_personality',
          target_field: 'naming_directions',
          issue_type: 'cliche',
          evidence: 'Predictable category compounding in proposed naming directions',
          explanation: 'Literal functional compound names risk blending into utility search results rather than commanding brand premium.',
          sharper_alternative: 'Introduce an evocative metaphoric name that anchors deep visceral customer outcomes.',
          user_action: null,
        },
      ]);

    case 'tagline_pitch':
      return JSON.stringify([
        {
          id: `crit-tag-${Date.now()}`,
          stage: 'tagline_pitch',
          target_field: 'tagline_options',
          issue_type: 'cliche',
          evidence: 'Interchangeable slogan structure ("The smarter way to...")',
          explanation: 'Could be adopted by a direct competitor with zero brand friction; lacks defensible strategic polarity.',
          sharper_alternative: 'Lead directly with the verified operational differentiator and zero-compromise customer guarantee.',
          user_action: null,
        },
      ]);

    case 'visual_brief':
      return JSON.stringify([
        {
          id: `crit-vis-${Date.now()}`,
          stage: 'visual_brief',
          target_field: 'concepts_to_avoid',
          issue_type: 'audience_mismatch',
          evidence: 'Generic stock photography metaphors',
          explanation: 'Impersonal stock art immediately signals generic corporate veneer and destroys authentic founder credibility.',
          sharper_alternative: 'Enforce documentary-style, authentic workspace and field photography showcasing real practitioners.',
          user_action: null,
        },
      ]);

    case 'voice_messaging':
      return JSON.stringify([
        {
          id: `crit-voice-${Date.now()}`,
          stage: 'voice_messaging',
          target_field: 'dont_list',
          issue_type: 'vague',
          evidence: 'General instruction to avoid corporate jargon',
          explanation: 'Vague prohibition fails to guide copywriters without an explicit list of prohibited corporate phrases.',
          sharper_alternative: 'Formally blacklist specific buzzwords: "synergy", "paradigm", "frictionless", and "empower".',
          user_action: null,
        },
      ]);

    case 'launch_prep':
      return JSON.stringify([
        {
          id: `crit-launch-${Date.now()}`,
          stage: 'launch_prep',
          target_field: 'landing_headline',
          issue_type: 'vague',
          evidence: 'Passive descriptive claims in headline copy',
          explanation: 'Visitors bounce in seconds if the headline describes product existence instead of urgent customer transformation.',
          sharper_alternative: 'Rewrite headline as an immediate, quantifiable promise delivering measurable value on day one.',
          user_action: null,
        },
      ]);

    default:
      return JSON.stringify([
        {
          id: `crit-gen-${Date.now()}`,
          stage: 'positioning',
          target_field: 'differentiator',
          issue_type: 'cliche',
          evidence: 'General efficiency claim without empirical backing',
          explanation: 'Target audience requires verified performance metrics before switching away from incumbent tooling.',
          sharper_alternative: 'Replace general claim with documented benchmarks and verified latency improvements.',
          user_action: null,
        },
      ]);
  }
}

function getDefaultMockResponse(prompt: string, schema?: ZodSchema<any>): string {
  // Check if Critic evaluation requested
  const isCriticPrompt =
    prompt.includes('You are the Critic AI for FOIL') ||
    prompt.includes('CriticFindingsArraySchema') ||
    prompt.includes('ConsistencyFindingsArraySchema') ||
    (schema && (schema as any)._def?.typeName === 'ZodArray');

  if (isCriticPrompt) {
    return generateMockCriticFindings(prompt);
  }

  const { concept, audience, facts } = extractContextFromPrompt(prompt);
  let userIdea = concept || 'Innovative startup service';
  if (userIdea.includes('[object Object]')) {
    userIdea = 'Innovative startup service';
  }
  const cleanConcept = userIdea.replace(/^(?:a|an|the|our|my)\s+/i, '').trim();

  // Scenario Override Detection
  const scenarioOverride = extractScenarioFromPrompt(prompt);
  const hasScenario = Boolean(scenarioOverride);

  const isWorkingEngineersScenario = hasScenario &&
    /working (?:software )?engineers|senior developers|tech leads|professional developers|enterprise engineering|working professionals/i.test(scenarioOverride!);
  const isEnterpriseB2BScenario = hasScenario &&
    /enterprise|b2b|corporate|commercial|logistics|wholesale/i.test(scenarioOverride!);
  const isYouthRoboticsScenario = hasScenario &&
    /high school|robotics|k-12|teen/i.test(scenarioOverride!);

  // Domain detection
  const isJewellery = /\b(?:jewel(?:ry|ler|lery)?|gems?|gemstones?|rings?|necklaces?|bracelets?|earrings?|artisan jewelry|handcrafted jewelry|handmade jewellery)\b/i.test(prompt);
  const isFoodWaste = !isJewellery && (
    /\b(?:food waste|waste reduction|reduce food waste|spoilage|kitchen inventory|surplus food|waste management)\b/i.test(prompt) ||
    (/\b(?:restaurant|kitchen|dining|bistro|eatery)\b/i.test(prompt) && /\b(?:waste|spoilage|inventory)\b/i.test(prompt))
  );
  const isFarmersDirect = !isFoodWaste && !isJewellery && /\b(?:farmers?|agriculture|produce|crops?|harvest|growers?|farm-fresh|farm to)\b/i.test(prompt);
  const isRestaurantReservation = !isFarmersDirect && !isFoodWaste && !isJewellery && (
    (/\b(?:reservations?|bookings?|seated diners?|table turnovers?|no-shows?|covers?|waitlists?|guest dining)\b/i.test(prompt) && /\b(?:restaurants?|dining|bistros?|cafes?|eater(?:y|ies))\b/i.test(prompt)) ||
    /\b(?:table reservations?|dinner reservations?)\b/i.test(prompt)
  );
  const isTeammateMatching = (/\b(?:teammate|peer match|capstone partner|class project partner)\b/i.test(prompt)) &&
    !/assistant|ai study/i.test(prompt);
  const isStudyAssistant = /\b(?:study assistant|ai study|study helper|exam prep|tutor)\b/i.test(prompt) ||
    ((/assistant/i.test(prompt) || /tutor/i.test(prompt)) && /\bstudent\b/i.test(prompt));
  const isAppointmentBooking = !isRestaurantReservation && !isFoodWaste && !isJewellery && (/\b(?:appointment|schedul|calendar)\b/i.test(prompt) || (/\bbooking\b/i.test(prompt) && !/\brestaurant\b/i.test(prompt)));
  const isIndianSnack = !isFoodWaste && !isJewellery && /\b(?:snacks?|namkeen|chaat|millets?|indian food|protein)\b/i.test(userIdea);

  let dynamicName = isJewellery
    ? 'AuraCraft'
    : isFoodWaste
    ? 'KitchenSavor'
    : isFarmersDirect
    ? 'HarvestDirect'
    : isRestaurantReservation
    ? 'TableFlow'
    : isStudyAssistant
    ? 'StudyEngine'
    : isAppointmentBooking
    ? 'BookLocal'
    : isTeammateMatching
    ? 'StudyNest'
    : isIndianSnack
    ? 'PulseBite'
    : deriveDynamicBrandName(userIdea);

  if (hasScenario) {
    if (isWorkingEngineersScenario) {
      dynamicName = 'DevEngine';
    } else if (isEnterpriseB2BScenario) {
      dynamicName = 'OmniSupply';
    } else if (isYouthRoboticsScenario) {
      dynamicName = 'BotForge';
    } else {
      dynamicName = `${dynamicName}Pivot`;
    }
  }

  if (schema) {
    const shape = (schema as any).shape || (typeof (schema as any)._def?.shape === 'function' ? (schema as any)._def.shape() : (schema as any)._def?.shape);
    if (shape) {
      // ─── 0. COMPLETE BRAND PLAN (INKLOOM UNIFIED PIPELINE) ───────────
      if ('brand_concept' in shape && 'visual_direction' in shape) {
        const plan = generateContextualBrandPlan(userIdea, facts);
        return JSON.stringify(plan);
      }

      // ─── 1. POSITIONING STAGE ──────────────────────────────────────────────
      if ('directions' in shape) {
        // SCENARIO OVERRIDE BRANCH
        if (hasScenario) {
          if (isWorkingEngineersScenario) {
            return JSON.stringify({
              directions: [
                {
                  title: 'Enterprise Architectural Intelligence',
                  category: 'Developer Productivity & Code Intelligence',
                  target_audience: 'Senior software engineers, staff architects, and enterprise engineering teams',
                  core_problem: 'Working software engineers waste hours deciphering legacy codebases, undocumented microservices, and architectural dependencies',
                  differentiator: 'Deep codebase semantic graph analysis with interactive architectural reasoning and automated refactoring proofs',
                  value_proposition: 'Navigate, refactor, and master complex legacy codebases at 3x velocity',
                  competitive_angle: 'Unlike student code-assistants, models holistic system architectures and verifies type invariants',
                  strategic_rationale: 'Enterprise engineering teams pay premium seat licenses to shorten technical debt ramp-up time',
                  potential_weakness: 'Requires enterprise security compliance (SOC2) and on-premise code indexing capabilities',
                  critic_findings: [],
                },
                {
                  title: 'The Production SRE Copilot',
                  category: 'Autonomous Systems & Reliability Engineering',
                  target_audience: 'DevOps engineers, SREs, and on-call engineering squads',
                  core_problem: 'Production incidents require high-stress cognitive synthesis across logs, metrics, and distributed traces under tight SLA clocks',
                  differentiator: 'Real-time root cause inference that simulates multi-service failure cascades and synthesizes verified remediation scripts',
                  value_proposition: 'Slash mean time to resolution (MTTR) during high-severity production outages',
                  competitive_angle: 'Active automated diagnosis rather than static alert dashboards',
                  strategic_rationale: 'High immediate enterprise ROI through averted downtime penalties',
                  potential_weakness: 'Requires tight integrations across heterogeneous monitoring tools (Datadog, AWS, Kubernetes)',
                  critic_findings: [],
                },
              ],
            });
          }

          if (isEnterpriseB2BScenario) {
            return JSON.stringify({
              directions: [
                {
                  title: 'The Enterprise Supply Nexus',
                  category: 'Enterprise B2B Procurement & Distribution',
                  target_audience: 'Enterprise procurement heads, supply chain directors, and commercial accounts',
                  core_problem: 'Fragmented supplier networks and high operational overhead in B2B supply contracts',
                  differentiator: 'Automated bulk ordering with volume pricing and enterprise SLA tracking',
                  value_proposition: 'Streamline B2B procurement with guaranteed volume delivery',
                  competitive_angle: 'Consolidates multi-vendor logistics into a single automated ledger',
                  strategic_rationale: 'High enterprise contract value and recurring quarterly reorders',
                  potential_weakness: 'Long enterprise procurement sales cycles',
                  critic_findings: [],
                },
                {
                  title: 'Direct Institutional Contracts',
                  category: 'Commercial Volume Marketplace',
                  target_audience: 'Regional commercial distributors and institutional buyers',
                  core_problem: 'Lack of verified supplier compliance and spot-market price volatility',
                  differentiator: 'Transparent contract pricing with bonded fulfillment guarantees',
                  value_proposition: 'De-risk volume supply chains with certified regional producers',
                  competitive_angle: 'Replaces opaque spot brokerages with a verified producer network',
                  strategic_rationale: 'Builds defensible institutional liquidity',
                  potential_weakness: 'Requires bonded supplier working capital',
                  critic_findings: [],
                },
              ],
            });
          }

          if (isYouthRoboticsScenario) {
            return JSON.stringify({
              directions: [
                {
                  title: 'The Robotics Sprint Lab',
                  category: 'K-12 STEM & Robotics Collaboration',
                  target_audience: 'High school robotics teams, mentors, and STEM clubs',
                  core_problem: 'Student robotics teams struggle with parts tracking, CAD synchronization, and competition build timelines',
                  differentiator: 'Integrated robot BOM tracking, task sprints, and rules compliance checks',
                  value_proposition: 'Build championship-ready robots on schedule without chaos',
                  competitive_angle: 'Tailored for FIRST/VEX competition seasons rather than generic project management',
                  strategic_rationale: 'High student engagement and school robotics club sponsorship',
                  potential_weakness: 'Seasonal competition activity peaks',
                  critic_findings: [],
                },
                {
                  title: 'Mentored Engineering Pathways',
                  category: 'Youth Technical Apprenticeship',
                  target_audience: 'High school STEM students and volunteer engineering mentors',
                  core_problem: 'High school students lack direct access to practicing engineering mentors for design reviews',
                  differentiator: 'Structured peer-and-mentor engineering review workflows for competitive robotics',
                  value_proposition: 'Learn real engineering design from industry professionals while building your robot',
                  competitive_angle: 'Connects competitive builds directly to professional engineering mentorship',
                  strategic_rationale: 'Attracts corporate engineering foundation grants',
                  potential_weakness: 'Requires ongoing volunteer mentor recruitment',
                  critic_findings: [],
                },
              ],
            });
          }

          // General Scenario Adaptation
          return JSON.stringify({
            directions: [
              {
                title: `The Adapted ${dynamicName} Framework`,
                category: 'Adaptive Category Leader',
                target_audience: `Pioneers and teams operating under premise: "${scenarioOverride}"`,
                core_problem: `Current solutions fail to account for the strategic premise shift: "${scenarioOverride}"`,
                differentiator: `Specifically architected to solve core bottlenecks under "${scenarioOverride}"`,
                value_proposition: `Dependable, tailored outcomes purpose-built for "${scenarioOverride}"`,
                competitive_angle: 'First-principles adaptation rather than forced legacy retrofits',
                strategic_rationale: 'Captures first-mover advantage in the pivoted market space',
                potential_weakness: 'Requires educating users on adapted vs standard market approaches',
                critic_findings: [],
              },
              {
                title: `The Specialized ${dynamicName} Network`,
                category: 'Targeted High-Velocity Platform',
                target_audience: `Organizations and users seeking dedicated support for "${scenarioOverride}"`,
                core_problem: `Operational friction and lack of tooling tailored to "${scenarioOverride}"`,
                differentiator: `Frictionless specialized workflow engineered around "${scenarioOverride}"`,
                value_proposition: `Superior efficiency and speed built directly for "${scenarioOverride}"`,
                competitive_angle: 'Dedicated focus without generic legacy overhead',
                strategic_rationale: 'High initial customer retention in focused niche',
                potential_weakness: 'Smaller initial addressable market requiring rapid expansion',
                critic_findings: [],
              },
            ],
          });
        }

        // STANDARD DOMAIN BRANCHES
        if (isJewellery) {
          return JSON.stringify({
            directions: [
              {
                title: 'The Everyday Fine Jewellery Standard',
                category: 'Accessible Fine Jewellery & Professional Lifestyle',
                target_audience: audience || 'Professional working women (24-45) looking for understated everyday elegance',
                core_problem: 'Traditional fine jewelry is priced for rare occasions, while fashion jewelry tarnishes and causes skin reactions',
                differentiator: 'Hypoallergenic recycled precious metals and ethical gemstones crafted for non-stop daily office wear',
                value_proposition: 'Solid everyday luxury that never tarnishes, irritates, or demands 10x luxury markups',
                competitive_angle: 'Unlike fast-fashion jewelry, built to last a lifetime; unlike Cartier or Tiffany, direct-to-consumer honest pricing',
                strategic_rationale: 'Captures the booming self-gifting professional women segment',
                potential_weakness: 'Requires continuous customer education on metal purity and vermeil standards',
                critic_findings: [],
              },
              {
                title: 'The Conscious Artisan Studio',
                category: 'Ethical Handcrafted Design Studio',
                target_audience: audience || 'Values-driven professional women and design connoisseurs',
                core_problem: 'Opaque jewelry supply chains and impersonal mass-manufactured designs lack soul and story',
                differentiator: 'Small-batch handmade pieces with verified artisan provenance and zero environmental compromises',
                value_proposition: 'Wear meaningful artisanal craft that elevates your professional presence',
                competitive_angle: 'Personal studio intimacy versus industrial luxury conglomerate branding',
                strategic_rationale: 'Builds fierce brand loyalty through transparent artisan storytelling',
                potential_weakness: 'Scale limitations with handmade small-batch production batches',
                critic_findings: [],
              },
            ],
          });
        }

        if (isFoodWaste) {
          return JSON.stringify({
            directions: [
              {
                title: 'The Predictive Kitchen Ledger',
                category: 'B2B Hospitality / Kitchen Operations SaaS',
                target_audience: audience || 'Independent restaurant operators, head chefs, and hospitality groups',
                core_problem: 'Independent kitchens lose up to 10% of revenue to inventory spoilage caused by inaccurate prep forecasting',
                differentiator: 'Predictive prep sheets driven by historical covers, weather, and automated 2-tap spoilage tracking',
                value_proposition: 'Cut kitchen food waste by 35% and protect restaurant profit margins on day one',
                competitive_angle: 'Unlike complex enterprise ERPs, requires zero training and runs on any kitchen tablet in under 15 seconds',
                strategic_rationale: 'Immediate, quantifiable payback directly recovered from discarded inventory costs',
                potential_weakness: 'Requires onboarding buy-in from busy morning kitchen prep cooks',
                critic_findings: [],
              },
              {
                title: 'The Zero-Waste Hospitality Copilot',
                category: 'Sustainable Restaurant Intelligence Platform',
                target_audience: audience || 'Eco-conscious restaurants, farm-to-table eateries, and culinary directors',
                core_problem: 'Restaurants want to operate sustainably but lack real-time visibility into ingredient loss and cost impact',
                differentiator: 'Automated surplus redistribution alerts, culinary scrap recipe suggestions, and real-time sustainability badges',
                value_proposition: 'Turn food waste reduction into a marketable customer differentiator and bottom-line profit',
                competitive_angle: 'Combines operational cost reduction with public-facing verified sustainability metrics',
                strategic_rationale: 'Attracts eco-conscious diners while slashing procurement costs',
                potential_weakness: 'Must keep daily logging frictionless so culinary teams stay compliant',
                critic_findings: [],
              },
            ],
          });
        }

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

        if (isRestaurantReservation) {
          return JSON.stringify({
            directions: [
              {
                title: 'The Direct-to-Table Platform',
                category: 'Zero-Commission Restaurant Operating System',
                target_audience: audience || 'Independent bistro owners and chef-driven dining venues',
                core_problem: 'Aggregator platforms charge $1–$3 per seated diner and withhold valuable guest dining data',
                differentiator: 'Flat-fee direct table reservation widget with automated SMS no-show protection and private guest CRM',
                value_proposition: 'Full tables, zero cover commissions, and direct customer ownership',
                competitive_angle: 'Unlike OpenTable or Resy, takes zero commission per diner and gives 100% of guest data back to the restaurant',
                strategic_rationale: 'Independent restauranteurs actively seek escape from aggregator commission extortion',
                potential_weakness: 'Requires restaurant to drive its own local brand traffic rather than relying on discovery aggregator apps',
                critic_findings: [],
              },
              {
                title: 'The Neighborhood Dining Pass',
                category: 'Local Culinary Membership & Booking Network',
                target_audience: audience || 'Local foodies, regular dining patrons, and neighborhood supper clubs',
                core_problem: 'Frequent diners struggle to secure peak-hour tables at beloved local spots while restaurants experience unpredictable midweek lulls',
                differentiator: 'Community-driven membership that unlocks priority booking and off-peak table perks at curated independent eateries',
                value_proposition: 'Guaranteed access to your favorite neighborhood tables while supporting independent hospitality',
                competitive_angle: 'Aligns diner loyalty with restaurant yield optimization rather than transactional booking fees',
                strategic_rationale: 'Turns sporadic diners into recurring community advocates who fill empty midweek seats',
                potential_weakness: 'Requires maintaining strict balance between diner member perks and regular walk-in availability',
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
              target_audience: audience || `Target users seeking dedicated solutions for ${cleanConcept.slice(0, 60)}`,
              core_problem: `Current solutions for ${cleanConcept.slice(0, 60)} are fragmented, overpriced, or lack customer-first transparency`,
              differentiator: `Purpose-built platform engineered specifically for seamless ${cleanConcept.slice(0, 50)} execution`,
              value_proposition: `Dependable, beautifully designed ${cleanConcept.slice(0, 50)} built for modern customer needs`,
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
              value_proposition: `Smarter, faster ${cleanConcept.slice(0, 50)} with measurable daily convenience`,
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
        if (hasScenario) {
          if (isWorkingEngineersScenario) {
            return JSON.stringify({
              core_problem: 'Senior software engineers and engineering teams waste hours deciphering legacy codebases, undocumented microservices, and architectural technical debt.',
              target_audience: 'Senior software engineers, staff architects, and enterprise engineering teams',
              context_situation: 'Complex multi-repo production environments with high technical debt and continuous deployment pipelines',
              user_goals: 'Accelerate codebase comprehension, automate architectural refactoring, and reduce regression bugs',
              constraints: 'Zero code leakage, strict enterprise SOC2 compliance, and offline semantic code graph analysis',
              value_desired_outcome: 'High developer velocity, verified architecture refactorings, and confident production deployments',
              open_questions: ['Which programming languages and frameworks should receive prioritized abstract syntax tree indexing?'],
              known_facts: facts.length > 0 ? facts : [userIdea, scenarioOverride!],
              inferred_assumptions: [
                {
                  value: 'Senior engineers prioritize mathematically sound refactoring proofs over superficial autocomplete suggestions',
                  rationale: 'Enterprise production systems cannot afford hallucinated syntax or broken invariants',
                },
              ],
            });
          }
        }

        if (isJewellery) {
          return JSON.stringify({
            core_problem: 'Professional working women struggle to find fine jewellery that is hypoallergenic, durable enough for daily office wear, and free from 10x luxury retail markups.',
            target_audience: audience || 'Professional working women (24-45) looking for understated, durable luxury and everyday wearability',
            context_situation: 'Daily professional workplace and desk-to-dinner transitions where fast-fashion jewelry tarnishes and luxury items feel too precious or overpriced',
            user_goals: 'Wear understated, sophisticated jewelry that never irritates sensitive skin or turns green, at honest direct-to-consumer prices',
            constraints: 'Hypoallergenic certified metals (recycled solid silver/gold vermeil), water-resistant coatings, and transparent ethical sourcing',
            value_desired_outcome: 'Effortless daily elegance and long-lasting personal pieces that celebrate career milestones',
            open_questions: ['Which staple jewelry pieces (stud earrings, subtle pendants, stackable bands) have the highest daily repeat wear?'],
            known_facts: facts.length > 0 ? facts : [userIdea],
            inferred_assumptions: [
              {
                value: 'Working women prefer versatile minimalist aesthetics that transition seamlessly from corporate boardrooms to casual evenings',
                rationale: 'Time-poor professionals avoid items that require frequent changing or delicate maintenance',
              },
            ],
          });
        }

        if (isFoodWaste) {
          return JSON.stringify({
            core_problem: 'Independent restaurants lose 4–10% of total revenue directly to inventory spoilage and inaccurate prep forecasts while operating on razor-thin profit margins.',
            target_audience: audience || 'Independent restaurant owners, head chefs, and kitchen general managers managing tight margins',
            context_situation: 'Fast-paced commercial kitchens with fluctuating daily covers, volatile perishable ingredient lifespans, and manual clipboards',
            user_goals: 'Predict prep quantities accurately, track real-time perishable inventory, and cut food waste to boost restaurant net margins',
            constraints: 'Ultra-fast tablet UI usable by kitchen staff during prep shifts; seamless integration with existing POS systems',
            value_desired_outcome: 'Up to 35% reduction in kitchen food waste and immediate bottom-line margin recovery within 30 days',
            open_questions: ['What simple logging interaction takes under 15 seconds for line cooks to record daily prep leftovers?'],
            known_facts: facts.length > 0 ? facts : [userIdea],
            inferred_assumptions: [
              {
                value: 'Chefs will adopt digital prep sheets if they save 20 minutes of daily morning prep calculations',
                rationale: 'Kitchen staff reject software that adds administrative friction during service rush hours',
              },
            ],
          });
        }

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

        if (isRestaurantReservation) {
          return JSON.stringify({
            core_problem: 'Independent restaurants lose 15–20% of seating capacity to customer no-shows and pay predatory per-cover commission fees to monopolistic reservation platforms.',
            target_audience: audience || 'Independent local restaurant owners, general managers, head chefs, and neighborhood dining guests',
            context_situation: 'High-margin evening dinner shifts and busy weekend services where unfilled tables directly erode thin restaurant margins',
            user_goals: 'Fill dining tables, eliminate no-shows with smart confirmations, and retain customer data without paying third-party cover fees',
            constraints: 'Zero per-cover commission fees, direct mobile guest booking without app downloads, and real-time floor plan table management',
            value_desired_outcome: 'Maximized dining capacity, protected profit margins, and loyal direct guest relationships',
            open_questions: ['What automated SMS confirmation interval achieves the highest guest attendance rate on weekend dinner shifts?'],
            known_facts: facts.length > 0 ? facts : [userIdea],
            inferred_assumptions: [
              {
                value: 'Diners prefer booking directly through the restaurant website if confirmation and table selection are instant',
                rationale: 'Over 70% of restaurant guests visit a venue website directly before looking up third-party aggregator listings',
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
          core_problem: `Customers seeking ${cleanConcept.slice(0, 70)} encounter fragmentation, high costs, or lack of tailored, reliable service in the current market.`,
          target_audience: audience || `Target customers and early adopters seeking dedicated solutions for ${cleanConcept.slice(0, 60)}`,
          context_situation: `Entering the market to deliver specialized, modern ${cleanConcept.slice(0, 60)}`,
          user_goals: `Establish a reputable, recognized brand and solve key user pain points in ${cleanConcept.slice(0, 60)}`,
          constraints: 'Initial operational focus on core customer satisfaction and verified value delivery',
          value_desired_outcome: 'Authentic, dependable service delivery and long-term customer trust',
          open_questions: ['What initial customer acquisition channel provides the strongest retention and referral loops?'],
          known_facts: facts.length > 0 ? facts.filter(f => !f.includes('[object Object]')) : [cleanConcept],
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

        let personalityTraits = [
          { trait: 'Pragmatic', audience_justification: 'Users need clear, dependable utility from day one' },
          { trait: 'Honest', audience_justification: 'Transparent communication builds lasting customer trust' },
          { trait: 'Empowering', audience_justification: 'Directly helps users overcome their core friction points' },
        ];

        if (hasScenario) {
          if (isWorkingEngineersScenario) {
            proposedName = 'DevEngine';
            territory = 'Architectural Rigor & Engineering Velocity';
            rationale = 'Directly conveys computational mastery, enterprise reliability, and deep software craft';
            personalityTraits = [
              { trait: 'Authoritative', audience_justification: 'Senior engineers demand high-conviction, mathematically verified solutions' },
              { trait: 'Efficient', audience_justification: 'Time is the single scarcest resource for engineering leads' },
              { trait: 'Robust', audience_justification: 'Enterprise software must never break production builds' },
            ];
          } else if (isEnterpriseB2BScenario) {
            proposedName = 'OmniSupply';
            territory = 'Institutional Reliability & Compliance';
            rationale = 'Conveys large-scale enterprise execution, high contractual compliance, and end-to-end reliability';
            personalityTraits = [
              { trait: 'Scalable', audience_justification: 'Enterprise procurement heads require massive scale with zero downtime' },
              { trait: 'Compliant', audience_justification: 'Institutional buyers must meet strict regulatory and legal audits' },
              { trait: 'Dependable', audience_justification: 'Supply chain contracts demand guaranteed fulfillment SLAs' },
            ];
          } else if (isYouthRoboticsScenario) {
            proposedName = 'BotForge';
            territory = 'Hands-On Technical Creation';
            rationale = 'Inspires high-school builders to design, iterate, and compete with passion';
            personalityTraits = [
              { trait: 'Hands-on', audience_justification: 'Robotics teams learn by fabricating and testing physical hardware' },
              { trait: 'Encouraging', audience_justification: 'Young engineers need positive reinforcement through build failures' },
              { trait: 'Collaborative', audience_justification: 'Championship teams thrive on seamless peer coordination' },
            ];
          } else {
            proposedName = `${dynamicName}Pivot`;
            territory = 'Strategic Adaptability';
            rationale = `Crafted to adapt specifically to the new strategic premise: "${scenarioOverride}"`;
            personalityTraits = [
              { trait: 'Adaptable', audience_justification: 'Essential for navigating the pivoted market conditions' },
              { trait: 'Decisive', audience_justification: 'Early adopters need high conviction and clear direction' },
              { trait: 'Resilient', audience_justification: 'Navigating strategic shifts requires unwavering operational grit' },
            ];
          }
        } else if (isJewellery) {
          proposedName = 'AuraCraft';
          territory = 'Timeless Craft & Professional Ambition';
          rationale = 'Evokes luminous handcrafted beauty, skin-safe durability, and personal presence for working women';
          personalityTraits = [
            { trait: 'Sophisticated', audience_justification: 'Understated elegance suits professional corporate environments' },
            { trait: 'Handcrafted', audience_justification: 'Celebrates authentic artisan care and transparent provenance' },
            { trait: 'Empowering', audience_justification: 'Fine jewelry worn as a personal celebration of daily achievement' },
          ];
        } else if (isFoodWaste) {
          proposedName = 'KitchenSavor';
          territory = 'Culinary Precision & Profit Recovery';
          rationale = 'Directly conveys kitchen efficiency, ingredient preservation, and margin recovery for independent restaurants';
          personalityTraits = [
            { trait: 'Pragmatic', audience_justification: 'Chefs demand actionable prep sheets without theoretical fluff' },
            { trait: 'Resourceful', audience_justification: 'Maximizes ingredient yield and minimizes commercial kitchen spoilage' },
            { trait: 'Data-Driven', audience_justification: 'Provides transparent food cost metrics that prove immediate ROI' },
          ];
        } else if (isFarmersDirect) {
          proposedName = 'HarvestDirect';
          territory = 'Freshness & Direct Connection';
          rationale = 'Bridges fresh regional farm harvests directly with local neighborhood households with honest transparency';
          personalityTraits = [
            { trait: 'Grounded', audience_justification: 'Honors agricultural roots and direct producer relationships' },
            { trait: 'Transparent', audience_justification: 'Local buyers demand full visibility into farm origins and harvest times' },
            { trait: 'Nourishing', audience_justification: 'Reflects the vitality and health of fresh seasonal produce' },
          ];
        } else if (isRestaurantReservation) {
          proposedName = 'TableFlow';
          territory = 'Hospitality Mastery & Precision';
          rationale = 'Evokes seamless dining room cadence, effortless table turnover, and culinary elegance';
          personalityTraits = [
            { trait: 'Hospitable', audience_justification: 'Hospitality professionals value warmth and empathy in their operational tools' },
            { trait: 'Uncompromising', audience_justification: 'Restaurant margins require precision and zero tolerance for wasted covers' },
            { trait: 'Discreet', audience_justification: 'The booking software should never distract from the chef’s culinary experience' },
          ];
        } else if (isStudyAssistant) {
          proposedName = 'StudyEngine';
          territory = 'Technical Mastery & Precision';
          rationale = 'Evokes computational power, structured engineering logic, and academic momentum';
          personalityTraits = [
            { trait: 'Analytical', audience_justification: 'Engineering students require structured mathematical logic' },
            { trait: 'Encouraging', audience_justification: 'Technical coursework can be overwhelming; encouragement prevents burnout' },
            { trait: 'Precise', audience_justification: 'Engineering concepts leave no room for hand-waving or ambiguity' },
          ];
        } else if (isAppointmentBooking) {
          proposedName = 'BookLocal';
          territory = 'Effortless Access & Reliability';
          rationale = 'Communicates simple, dependable appointment scheduling designed specifically for local service providers';
          personalityTraits = [
            { trait: 'Punctual', audience_justification: 'Scheduling tools must embody time-honored dependability' },
            { trait: 'Friendly', audience_justification: 'Local clients appreciate a warm, neighborly touch' },
            { trait: 'Concise', audience_justification: 'Fast booking removes administrative friction for busy service providers' },
          ];
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
              sharper_alternative: `Consider ${proposedName}Pro as an alternative`,
            },
          ],
          personality_traits: personalityTraits,
          traits_to_avoid: ['Pretentious', 'Bureaucratic', 'Generic'],
          brand_principles: [
            { principle: 'Customer-first integrity', rationale: 'Long-term brand equity relies on dependable value delivery' },
          ],
          critic_findings: [],
        });
      }

      // ─── 4. TAGLINE & PITCH STAGE ──────────────────────────────────────────
      if ('tagline_options' in shape) {
        if (hasScenario) {
          if (isWorkingEngineersScenario) {
            return JSON.stringify({
              tagline_options: [
                'Architectural clarity for complex codebases.',
                'Accelerate engineering velocity from commit to production.',
              ],
              one_line_pitch: 'DevEngine empowers senior software engineers to unravel legacy codebases and execute complex architectural migrations with verified AI reasoning.',
              rationale_per_tagline: [
                'Direct appeal to senior engineering technical pain point',
                'Velocity and reliability promise for enterprise engineering organizations',
              ],
              critic_findings: [],
            });
          }
          if (isEnterpriseB2BScenario) {
            return JSON.stringify({
              tagline_options: [
                'Enterprise procurement, automated and compliant.',
                'Volume contracts with guaranteed fulfillment SLAs.',
              ],
              one_line_pitch: 'OmniSupply connects institutional buyers with certified regional producers for transparent bulk contract fulfillment.',
              rationale_per_tagline: [
                'Clear regulatory and automation value for enterprise procurement',
                'Operational peace of mind with bonded delivery SLAs',
              ],
              critic_findings: [],
            });
          }
          return JSON.stringify({
            tagline_options: [
              `Engineered for ${scenarioOverride?.slice(0, 35)}.`,
              `The new benchmark for ${scenarioOverride?.slice(0, 35)}.`,
            ],
            one_line_pitch: `${dynamicName} delivers dedicated, adapted solutions addressing ${scenarioOverride?.slice(0, 50)}.`,
            rationale_per_tagline: [
              'Explicitly targets the pivoted market condition',
              'Establishes bold category leadership under the new premise',
            ],
            critic_findings: [],
          });
        }

        if (isJewellery) {
          return JSON.stringify({
            tagline_options: [
              'Everyday Elegance for Modern Ambition.',
              'Fine Artisan Jewelry That Keeps Pace With You.',
            ],
            one_line_pitch: 'AuraCraft crafts hypoallergenic, artisanal fine jewellery designed for professional working women to wear every single day without luxury markups.',
            rationale_per_tagline: [
              'Direct connection between timeless fine craft and workplace lifestyle',
              'Durability and skin-safety promise for active professionals',
            ],
            critic_findings: [],
          });
        }

        if (isFoodWaste) {
          return JSON.stringify({
            tagline_options: [
              'Turn Kitchen Spoilage into Pure Profit.',
              'Predictive Prep. Zero Waste.',
            ],
            one_line_pitch: 'KitchenSavor gives independent restaurants predictive prep forecasting that cuts food waste by 35% and boosts profit margins.',
            rationale_per_tagline: [
              'Direct bottom-line financial promise speaking to thin restaurant margins',
              'Crisp operational focus targeting zero wasted ingredients',
            ],
            critic_findings: [],
          });
        }

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

        if (isRestaurantReservation) {
          return JSON.stringify({
            tagline_options: [
              'Fill every table. Keep every dollar.',
              'Direct table reservations for independent dining.',
            ],
            one_line_pitch: 'TableFlow provides zero-commission reservation software helping local restaurants eliminate no-shows and own their guest relationships.',
            rationale_per_tagline: [
              'Bold financial promise speaking to thin restaurant margins',
              'Clear functional category definition',
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
        if (hasScenario) {
          if (isWorkingEngineersScenario) {
            return JSON.stringify({
              logo_direction: 'Monolithic terminal prompt symbol fused with modular architectural node',
              color_mood: 'Dark terminal charcoal, electric cyan, and clean emerald status accent',
              hex_palette: ['#090D16', '#06B6D4', '#10B981', '#1E293B'],
              type_roles: ['Headings: JetBrains Mono Bold', 'Body: Inter / Fira Code'],
              shape_language: 'High-density terminal cards with modular code block geometry and syntax borders',
              symbol_language: 'Terminal prompts, binary trees, microservice mesh nodes, and pull request diffs',
              composition_layout: 'IDE-inspired split editor canvas with code inspection and architectural telemetry panels',
              imagery_direction: 'Dark-mode multi-monitor workstations, clean terminal sessions, and architecture whiteboards',
              concepts_to_avoid: ['Colorful student doodle art', 'Stock business handshakes'],
              rationale_linking_to_audience_and_positioning: 'Anchors brand in authentic developer aesthetics and technical credibility',
              concept_disclaimer: 'AI-generated visual concept / design direction — not production-ready artwork.',
            });
          }
          if (isEnterpriseB2BScenario) {
            return JSON.stringify({
              logo_direction: 'Intersecting structural pillars forming an institutional vault seal',
              color_mood: 'Corporate steel, deep navy, and platinum',
              hex_palette: ['#1E293B', '#1E40AF', '#64748B', '#F1F5F9'],
              type_roles: ['Headings: Space Grotesk Bold', 'Body: Inter'],
              shape_language: 'Solid architectural rectangles with high-contrast borders',
              symbol_language: 'Vaults, ledger grids, verified contract badges, and supply nodes',
              composition_layout: 'High-density corporate dashboard with SLA telemetry',
              imagery_direction: 'Modern commercial distribution hubs, automated freight docks, and executive boardrooms',
              concepts_to_avoid: ['Casual consumer emojis', 'Playful pastels'],
              rationale_linking_to_audience_and_positioning: 'Reflects institutional balance sheet stability and enterprise trust',
              concept_disclaimer: 'AI-generated visual concept / design direction — not production-ready artwork.',
            });
          }
          return JSON.stringify({
            logo_direction: 'Dynamic chevron vector indicating forward strategic pivot',
            color_mood: 'Midnight obsidian, electric violet, and vivid rose',
            hex_palette: ['#111827', '#6366F1', '#EC4899', '#F9FAFB'],
            type_roles: ['Headings: Space Grotesk', 'Body: Inter'],
            shape_language: 'Sharp angled geometric cards with dynamic forward slants',
            symbol_language: 'Pivot vectors, adaptive nodes, and velocity markers',
            composition_layout: 'Asymmetric editorial grid with bold contrast highlights',
            imagery_direction: 'High-energy agile teams executing rapid strategic pivots',
            concepts_to_avoid: ['Static legacy corporate clip-art', 'Passive stock photography'],
            rationale_linking_to_audience_and_positioning: 'Visually encodes momentum, strategic adaptation, and category disruption',
            concept_disclaimer: 'AI-generated visual concept / design direction — not production-ready artwork.',
          });
        }

        if (isJewellery) {
          return JSON.stringify({
            logo_direction: 'Delicate geometric gemstone facet intersecting with an elegant artisan monoline letterform',
            color_mood: 'Warm amber gold, soft rose quartz, deep slate, and warm alabaster',
            hex_palette: ['#92400E', '#D97706', '#FDE68A', '#1E293B', '#FAFAF9'],
            type_roles: ['Headings: Playfair Display / Space Grotesk', 'Body: Plus Jakarta Sans / Inter'],
            shape_language: 'Soft organic curves, delicate hairline borders, and polished stone silhouettes',
            symbol_language: 'Gem facets, goldsmith hammer marks, delicate chain links, and radiant stars',
            composition_layout: 'Warm, airy editorial layout with macro jewelry photography and tactile studio textures',
            imagery_direction: 'Natural lighting on skin, hands crafting fine metals at jeweler benches, and versatile workwear styling',
            concepts_to_avoid: ['Gaudy rhinestone glitter', 'Generic shopping mall jewelry graphics'],
            rationale_linking_to_audience_and_positioning: 'Balances high-fashion editorial prestige with accessible, everyday warmth',
            concept_disclaimer: 'AI-generated visual concept / design direction — not production-ready artwork.',
          });
        }

        if (isFoodWaste) {
          return JSON.stringify({
            logo_direction: 'Streamlined kitchen prep leaf and digital pulse vector forming a precision efficiency emblem',
            color_mood: 'Fresh emerald forest, culinary sage, modern amber alert, and crisp high-contrast slate',
            hex_palette: ['#047857', '#059669', '#10B981', '#0F172A', '#F8FAFC'],
            type_roles: ['Headings: Space Grotesk Bold', 'Body: Inter'],
            shape_language: 'High-contrast kitchen prep cards with clean metric bars and rounded corners',
            symbol_language: 'Prep clipboards, yield gauges, ingredient leaves, and zero-waste cycle arrows',
            composition_layout: 'High-visibility dashboard optimized for busy kitchen tablet stations in landscape mode',
            imagery_direction: 'Active commercial kitchens, fresh whole produce, chef prep stations, and clean digital tablets',
            concepts_to_avoid: ['Dirty trash cans and rotting garbage imagery', 'Overly complex corporate enterprise charts'],
            rationale_linking_to_audience_and_positioning: 'Dignifies kitchen work and emphasizes profit recovery rather than waste shame',
            concept_disclaimer: 'AI-generated visual concept / design direction — not production-ready artwork.',
          });
        }

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

        if (isRestaurantReservation) {
          return JSON.stringify({
            logo_direction: 'Elegant minimalist place setting and architectural table silhouette',
            color_mood: 'Deep bistro burgundy, warm brass, and soft linen cream',
            hex_palette: ['#4A0E17', '#B45309', '#D97706', '#FFFBEB'],
            type_roles: ['Headings: Playfair Display / Space Grotesk', 'Body: Inter'],
            shape_language: 'Warm architectural curves, linen texture borders, and refined table card outlines',
            symbol_language: 'Stemware, table silhouettes, brass reservation markers, and subtle candlelight glows',
            composition_layout: 'Warm, editorial dining room photography paired with a clean reservation calendar grid',
            imagery_direction: 'Candlelit dining tables, chef plating in open kitchen, and welcoming front-of-house staff',
            concepts_to_avoid: ['Cheesy cartoon chef hats', 'Cold corporate SaaS screenshots'],
            rationale_linking_to_audience_and_positioning: 'Evokes dining intimacy and culinary craft while delivering contemporary operational reliability',
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
        if (hasScenario) {
          if (isWorkingEngineersScenario) {
            return JSON.stringify({
              voice_description: 'Concise, technically precise, and pragmatic with zero marketing puffery',
              tone_characteristics: ['Technical', 'Direct', 'Unflinching'],
              do_list: ['Speak directly in terms of latency, throughput, and system architecture', 'Cite verified stack traces and benchmarks'],
              dont_list: ['Do not use empty marketing buzzwords like "magic" or "supercharge"', 'Do not treat engineers like beginners'],
              sample_messages: [
                { message: 'Identified circular dependency in auth-service module. Refactoring plan generated.', explanation: 'IDE diagnostic alert' },
                { message: 'Legacy migration complete across 142 microservices with zero schema regressions.', explanation: 'Deployment notification' },
                { message: 'Architectural reasoning engineered for systems where failure is not an option.', explanation: 'Enterprise homepage hero' },
              ],
              critic_findings: [],
            });
          }
          if (isEnterpriseB2BScenario) {
            return JSON.stringify({
              voice_description: 'Institutional, reliable, and compliant',
              tone_characteristics: ['Authoritative', 'Structured', 'Transparent'],
              do_list: ['Quote bonded SLAs and regulatory certifications', 'Provide audit-ready volume records'],
              dont_list: ['Do not use casual consumer slang', 'Do not make unbonded fulfillment promises'],
              sample_messages: [
                { message: 'Enterprise purchase order #9021 confirmed with guaranteed 48-hour bonded dock delivery.', explanation: 'Procurement confirmation' },
                { message: 'Quarterly supply contract executed under ISO-certified compliance standards.', explanation: 'Institutional dashboard notice' },
                { message: 'Consolidated B2B distribution ledger reconciled across all regional facilities.', explanation: 'Executive report summary' },
              ],
              critic_findings: [],
            });
          }
          return JSON.stringify({
            voice_description: `Adaptive, decisive, and aligned with premise: "${scenarioOverride?.slice(0, 30)}"`,
            tone_characteristics: ['Decisive', 'Adaptive', 'Direct'],
            do_list: ['Address the pivoted scenario needs directly', 'Provide concrete next steps'],
            dont_list: ['Do not revert to old assumptions', 'Do not hedge on strategic stance'],
            sample_messages: [
              { message: `Engineered specifically to solve core friction under ${scenarioOverride?.slice(0, 30)}.`, explanation: 'Homepage value statement' },
              { message: 'Your adapted workflow has been calibrated for optimal velocity.', explanation: 'System notification' },
              { message: 'Join the vanguard operating on next-generation principles.', explanation: 'Onboarding welcome' },
            ],
            critic_findings: [],
          });
        }

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

        if (isRestaurantReservation) {
          return JSON.stringify({
            voice_description: 'Warm, gracious, and operationally sharp with deep respect for the hospitality trade',
            tone_characteristics: ['Gracious', 'Decisive', 'Culinary-fluent'],
            do_list: ['Treat every cover as a sacred guest experience', 'Speak the language of professional kitchen service'],
            dont_list: ['Do not treat dining guests as mere conversion numbers', 'Do not use sterile corporate tech jargon'],
            sample_messages: [
              { message: 'Tonight’s 7:30 PM service is fully booked across all 18 tables.', explanation: 'Service summary report' },
              { message: 'Your table for four at Bistro Laurent is confirmed. We look forward to welcoming you.', explanation: 'Guest confirmation SMS' },
              { message: 'Zero per-cover commissions. 100% of guest revenue stays in your kitchen.', explanation: 'Marketing hero headline' },
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
        if (hasScenario) {
          if (isWorkingEngineersScenario) {
            return JSON.stringify({
              landing_headline: 'Unravel legacy complexity in minutes. The architectural code intelligence engine for senior engineering teams.',
              social_launch_post: 'We are thrilled to launch DevEngine: the AI code intelligence engine built specifically for working software engineers to master legacy systems and refactor with verified confidence.',
              critic_findings: [],
            });
          }
          if (isEnterpriseB2BScenario) {
            return JSON.stringify({
              landing_headline: 'Enterprise procurement made predictable. Direct bulk volume contracts with guaranteed fulfillment SLAs.',
              social_launch_post: 'Announcing OmniSupply: institutional volume procurement connecting verified regional producers directly with commercial buyers under bonded fulfillment guarantees.',
              critic_findings: [],
            });
          }
          return JSON.stringify({
            landing_headline: `The new benchmark in ${scenarioOverride?.slice(0, 40)}.`,
            social_launch_post: `We are live! Discover dedicated, high-velocity solutions purpose-built for ${scenarioOverride?.slice(0, 45)} with ${dynamicName}.`,
            critic_findings: [],
          });
        }

        if (isFarmersDirect) {
          return JSON.stringify({
            landing_headline: 'Farm-fresh produce delivered within 24 hours of harvest. Support local growers directly.',
            social_launch_post: 'We are officially live! Skip grocery warehouse storage and enjoy produce harvested this morning directly from local family farms with HarvestDirect.',
            critic_findings: [],
          });
        }

        if (isRestaurantReservation) {
          return JSON.stringify({
            landing_headline: 'Fill every table tonight with zero commission fees. The direct reservation platform for independent dining.',
            social_launch_post: 'We are officially live! TableFlow is giving independent restaurants their margins and guest relationships back. Zero per-cover fees, automated SMS no-show protection, and direct booking in seconds.',
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
  }

  return generateMockCriticFindings(prompt);
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
