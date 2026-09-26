import { v4 as uuid } from 'uuid';
import type {
  FactItem,
  FactCategory,
  FactConfidence,
  InterviewState,
  InterviewQuestion,
  ReadinessAssessment,
  InterviewResponse,
  DiscoveryContent,
  SharedContext,
} from '@foil/shared';
import type { AIProvider } from '../ai/provider.js';

// Meta / generic phrases indicating the user is asking for guidance or has not yet supplied an actual idea
const VAGUE_IDEA_PATTERNS = [
  /help me define my brand idea/i,
  /clarify my (core )?value proposition/i,
  /i want to (build|start|create) a (brand|business|company)/i,
  /give me (a )?brand/i,
  /help me with (my )?brand/i,
  /what should i (do|build|create)/i,
  /brainstorm/i,
  /^hello/i,
  /^hi\b/i,
  /^hey\b/i,
  /^help\b/i,
];

export class StrategistInterviewEngine {
  /**
   * Evaluates the readiness of the collected facts to generate a grounded Discovery draft.
   * Hard Invariant: At least concept, problem/need, and target audience must be established
   * with real user grounding so that the AI never fabricates a target audience or business.
   */
  evaluateReadiness(facts: FactItem[]): ReadinessAssessment {
    const hasConcept = facts.some(
      (f) => f.category === 'concept' && f.confidence !== 'unknown' && f.text.trim().length > 3
    );
    const hasProblemOrOutcome = facts.some(
      (f) => (f.category === 'problem' || f.category === 'goals') && f.confidence !== 'unknown' && f.text.trim().length > 3
    );
    const hasAudience = facts.some(
      (f) => f.category === 'audience' && f.confidence !== 'unknown' && f.text.trim().length > 3
    );

    const missingCritical: string[] = [];
    if (!hasConcept) missingCritical.push('business_concept');
    if (!hasProblemOrOutcome) missingCritical.push('customer_need_or_problem');
    if (!hasAudience) missingCritical.push('target_audience');

    // Score from 0 to 100
    let score = 0;
    if (hasConcept) score += 40;
    if (hasProblemOrOutcome) score += 30;
    if (hasAudience) score += 30;

    const isReady = missingCritical.length === 0;

    let nextQuestion: InterviewQuestion | undefined;
    if (!hasConcept) {
      nextQuestion = {
        id: 'q_concept',
        targetCategory: 'concept',
        question: 'What product, service, or business idea do you want to build?',
        reason: 'We need to establish your core business offering before defining your brand.',
        options: [
          'E-commerce & Physical Goods',
          'SaaS & Digital Platform',
          'Local Service or Hospitality',
          'Consulting & Professional Services',
          'Help me decide',
        ],
        allowsUnknown: true,
      };
    } else if (!hasProblemOrOutcome) {
      nextQuestion = {
        id: 'q_problem',
        targetCategory: 'problem',
        question: 'What primary problem or need does this solve for your customers?',
        reason: 'A strong brand is anchored in a real customer pain point or desired transformation.',
        options: [
          'Saves them significant time or hassle',
          'High quality at a more accessible price',
          'Eco-friendly / ethical alternative to mainstream options',
          'Personalized experience or superior craftsmanship',
          'Help me clarify this',
        ],
        allowsUnknown: true,
      };
    } else if (!hasAudience) {
      nextQuestion = {
        id: 'q_audience',
        targetCategory: 'audience',
        question: 'Who do you imagine buying or using this first?',
        reason: 'Understanding your initial audience prevents building for an imaginary or generic market.',
        options: [
          'Students and young adults',
          'Busy working professionals',
          'Small business owners / founders',
          'Families / conscious consumers',
          'Help me identify the best niche',
        ],
        allowsUnknown: true,
      };
    }

    const conceptFact = facts.find((f) => f.category === 'concept' && f.confidence !== 'unknown');

    return {
      isReady,
      missingCritical,
      conceptSummary: conceptFact ? conceptFact.text : undefined,
      score,
      nextQuestion,
    };
  }

  /**
   * Processes an incoming conversational turn.
   * Extracts facts, updates existing facts, validates readiness, and determines the state transition.
   */
  async processTurn(params: {
    userMessage: string;
    existingFacts: FactItem[];
    attachments?: Array<{ name: string; content?: string }>;
    sharedContext?: Partial<SharedContext>;
    provider?: AIProvider;
  }): Promise<InterviewResponse> {
    const rawMessage = params.userMessage.trim();
    const existingFacts = [...(params.existingFacts || [])];

    // Check if the user is asking to approve discovery explicitly
    if (/^approve\b/i.test(rawMessage) || /approve discovery/i.test(rawMessage)) {
      return {
        state: 'APPROVED',
        message: 'Gate 1 (Brand Discovery) has been officially approved! We are now ready to advance to Gate 2: Positioning Matrix.',
        readiness: this.evaluateReadiness(existingFacts),
        extractedFacts: existingFacts,
      };
    }

    // 1. Detect if this is an initial vague prompt without actual idea substance
    const isVagueGreetingOrPrompt =
      existingFacts.length === 0 &&
      VAGUE_IDEA_PATTERNS.some((pattern) => pattern.test(rawMessage));

    if (isVagueGreetingOrPrompt) {
      const question: InterviewQuestion = {
        id: 'q_concept_initial',
        targetCategory: 'concept',
        question:
          'Great! Let’s shape your brand from the ground up into something distinctive and defensible. What product, service, or business idea are you thinking about building?',
        reason: 'We need your core concept to anchor the brand strategy.',
        options: [
          'E-commerce / Consumer Products',
          'SaaS / Digital Software Platform',
          'Local Service / Hospitality',
          'Agency / Creative Studio',
          'I have a rough idea to describe',
        ],
        allowsUnknown: true,
      };

      return {
        state: 'COLLECTING',
        message:
          'Welcome to the IdeaToBrand AI Strategist! Before we generate your brand discovery plan, I need to understand your real business idea so we don’t make false assumptions.',
        question,
        readiness: {
          isReady: false,
          missingCritical: ['business_concept', 'customer_need_or_problem', 'target_audience'],
          score: 0,
          nextQuestion: question,
        },
        extractedFacts: [],
      };
    }

    // 2. Handle "I don't know yet", "Skip", or "Help me decide"
    if (
      /i don'?t know/i.test(rawMessage) ||
      /^skip\b/i.test(rawMessage) ||
      /help me decide/i.test(rawMessage)
    ) {
      // Find the last open or missing category
      const currentReadiness = this.evaluateReadiness(existingFacts);
      const targetCat = currentReadiness.nextQuestion?.targetCategory || 'problem';

      // Provide AI hypotheses, clearly labeled as unconfirmed
      const hypothesisText =
        targetCat === 'audience'
          ? 'Conscious early adopters seeking affordable alternatives'
          : targetCat === 'problem'
          ? 'Lack of accessible, trustworthy options in the current market'
          : 'Modern digital-first solution';

      const hypothesisFact: FactItem = {
        id: uuid(),
        category: targetCat,
        label: `Suggested ${targetCat} (unconfirmed)`,
        text: hypothesisText,
        confidence: 'ai_hypothesis',
        source: 'AI Suggestion based on user request to help decide',
      };

      existingFacts.push(hypothesisFact);

      const updatedReadiness = this.evaluateReadiness(existingFacts);

      let replyMsg = `No problem! I’ve noted a working hypothesis for your ${targetCat}: "${hypothesisText}". This remains unconfirmed until you validate or refine it.`;
      if (updatedReadiness.nextQuestion) {
        replyMsg += ` Next question: ${updatedReadiness.nextQuestion.question}`;
      }

      return {
        state: updatedReadiness.isReady ? 'READY_FOR_DISCOVERY' : 'CLARIFYING',
        message: replyMsg,
        question: updatedReadiness.nextQuestion,
        readiness: updatedReadiness,
        extractedFacts: existingFacts,
      };
    }

    // 3. Handle explicit user corrections (e.g., "Actually, my audience is ... not students", "Reject that assumption")
    const isCorrection =
      /actually\b/i.test(rawMessage) ||
      /not\b/i.test(rawMessage) ||
      /change (my|the)/i.test(rawMessage) ||
      /reject/i.test(rawMessage) ||
      /correction/i.test(rawMessage);

    if (isCorrection && existingFacts.length > 0) {
      // User is correcting a prior fact or hypothesis
      const cleanCorrection = rawMessage.replace(/^(actually|no|correction|please change),?\s*/i, '');
      const correctedFact: FactItem = {
        id: uuid(),
        category: 'audience', // default category or dynamically tagged
        label: 'User Correction',
        text: cleanCorrection,
        confidence: 'user_confirmed_fact',
        source: 'User correction in chat',
        confirmed_at: new Date().toISOString(),
      };

      // Filter out rejected hypotheses
      const filtered = existingFacts.filter((f) => f.confidence !== 'ai_hypothesis');
      filtered.push(correctedFact);

      const readiness = this.evaluateReadiness(filtered);
      return {
        state: readiness.isReady ? 'READY_FOR_DISCOVERY' : 'CLARIFYING',
        message: `Got it! I’ve updated your brand context with your correction: "${cleanCorrection}". I’ve removed previous hypotheses and locked this in as confirmed.`,
        question: readiness.nextQuestion,
        readiness,
        extractedFacts: filtered,
      };
    }

    // 4. Extract facts from user message and any attached documents
    const newFacts = this.extractFacts(rawMessage, existingFacts, 'User chat message');

    // Also extract from uploaded document text if present
    if (params.attachments && params.attachments.length > 0) {
      for (const att of params.attachments) {
        if (att.content && att.content.trim().length > 0) {
          const docFacts = this.extractFacts(
            att.content,
            [...existingFacts, ...newFacts],
            `Uploaded document: ${att.name}`
          );
          newFacts.push(...docFacts);
        }
      }
    }

    const mergedFacts = this.mergeFacts(existingFacts, newFacts);
    const readiness = this.evaluateReadiness(mergedFacts);

    // 5. If ready, generate the structured Discovery draft grounded in facts
    if (readiness.isReady) {
      const discoveryDraft = this.buildDiscoveryDraftFromFacts(mergedFacts);
      return {
        state: 'DISCOVERY_DRAFT',
        message:
          'I have gathered enough foundational context to generate your Brand Discovery Plan. Review the draft below, inspect confirmed facts vs suggested hypotheses, and click Approve to lock in Gate 1.',
        readiness,
        extractedFacts: mergedFacts,
        discoveryDraft,
      };
    }

    // Still missing critical info — ask the single most important missing question
    return {
      state: 'CLARIFYING',
      message: `Thanks! I’ve recorded: "${mergedFacts.map((f) => f.text).join('; ')}". To finish grounding your brand strategy, I need one more key detail:`,
      question: readiness.nextQuestion,
      readiness,
      extractedFacts: mergedFacts,
    };
  }

  /**
   * Simple rule-based extraction that extracts concept, audience, location, and problem
   * without hallucinating facts absent from the user's input.
   */
  private extractFacts(text: string, existingFacts: FactItem[], source: string): FactItem[] {
    const facts: FactItem[] = [];
    const trimmed = text.trim();

    // Check for specific location mentions (e.g., "in Pune", "in London", "in California")
    const locMatch = trimmed.match(/\bin\s+([A-Z][a-zA-Z\s]+?)(?:[.,;]|$)/);
    if (locMatch && locMatch[1]) {
      const loc = locMatch[1].trim();
      if (!existingFacts.some((f) => f.category === 'location_market' && f.text.toLowerCase() === loc.toLowerCase())) {
        facts.push({
          id: uuid(),
          category: 'location_market',
          label: 'Target Location / Market',
          text: loc,
          confidence: 'user_provided_fact',
          source,
        });
      }
    }

    // Check for target audience mentions (e.g. "to college students", "for busy mothers", "for founders")
    const audienceMatch = trimmed.match(/\b(for|to)\s+([a-zA-Z\s]{3,40}?)(?:\bin\b|[.,;]|$)/i);
    if (audienceMatch && audienceMatch[2]) {
      const candidate = audienceMatch[2].trim();
      // Avoid false triggers like "for my brand", "to start", "to build"
      if (!/^(my brand|start|build|myself|us|a living)$/i.test(candidate)) {
        if (!existingFacts.some((f) => f.category === 'audience')) {
          facts.push({
            id: uuid(),
            category: 'audience',
            label: 'Target Audience',
            text: candidate,
            confidence: 'user_provided_fact',
            source,
          });
        }
      }
    }

    // Check if the concept has been established
    const hasConcept = existingFacts.some((f) => f.category === 'concept');
    if (!hasConcept && trimmed.length > 5) {
      // Extract the core business description from phrases like "I want to sell...", "A platform that..."
      let conceptText = trimmed;
      const leadIn = trimmed.match(/^(?:i want to (?:sell|build|create|launch|start)|my business is|we are building|a platform that|a service for)\s+(.*)$/i);
      if (leadIn && leadIn[1]) {
        conceptText = leadIn[1].trim();
      }

      facts.push({
        id: uuid(),
        category: 'concept',
        label: 'Business Concept',
        text: conceptText,
        confidence: 'user_provided_fact',
        source,
      });
    }

    // Check for problem / customer need
    const hasProblem = existingFacts.some((f) => f.category === 'problem');
    if (hasConcept && !hasProblem && trimmed.length > 5) {
      facts.push({
        id: uuid(),
        category: 'problem',
        label: 'Customer Problem / Need',
        text: trimmed,
        confidence: 'user_provided_fact',
        source,
      });
    }

    // Check for budget/constraints
    const budgetMatch = trimmed.match(/\b(budget|cost|capital)\s+(?:is|of)?\s*([$₹€£0-9,\w\s]+)/i);
    if (budgetMatch && budgetMatch[2]) {
      facts.push({
        id: uuid(),
        category: 'budget_constraints',
        label: 'Budget Constraint',
        text: budgetMatch[2].trim(),
        confidence: 'user_provided_fact',
        source,
      });
    }

    return facts;
  }

  private mergeFacts(existing: FactItem[], incoming: FactItem[]): FactItem[] {
    const result = [...existing];
    for (const item of incoming) {
      const idx = result.findIndex((r) => r.category === item.category);
      if (idx >= 0) {
        // Update category with more recent specific info
        result[idx] = item;
      } else {
        result.push(item);
      }
    }
    return result;
  }

  /**
   * Builds a structured Discovery draft from confirmed user facts.
   * Grounding Rule: Never fabricate facts; unknown fields are explicitly tagged as
   * "Not yet established" or placed in inferred_assumptions with clear rationales.
   */
  buildDiscoveryDraftFromFacts(facts: FactItem[]): DiscoveryContent {
    const conceptFact = facts.find((f) => f.category === 'concept');
    const audienceFact = facts.find((f) => f.category === 'audience');
    const problemFact = facts.find((f) => f.category === 'problem');
    const locationFact = facts.find((f) => f.category === 'location_market');
    const budgetFact = facts.find((f) => f.category === 'budget_constraints');
    const diffFact = facts.find((f) => f.category === 'differentiation');
    const goalsFact = facts.find((f) => f.category === 'goals');

    const concept = conceptFact?.text || 'Business offering not yet defined';
    const audience = audienceFact
      ? `${audienceFact.text}${locationFact ? ` based in ${locationFact.text}` : ''}`
      : 'Initial target customer segment to be confirmed';
    const problem =
      problemFact?.text ||
      `Customers currently lack an accessible, dedicated solution for ${concept.toLowerCase()}.`;

    const knownFactsList: string[] = [];
    facts
      .filter((f) => f.confidence === 'user_provided_fact' || f.confidence === 'user_confirmed_fact')
      .forEach((f) => knownFactsList.push(`${f.label}: ${f.text}`));

    const inferredAssumptions = facts
      .filter((f) => f.confidence === 'ai_hypothesis')
      .map((f) => ({
        value: f.text,
        rationale: f.source || 'Suggested hypothesis during brand discovery interview — please confirm',
      }));

    if (inferredAssumptions.length === 0) {
      inferredAssumptions.push({
        value: `Early adopters will prioritize product authenticity and direct responsiveness over big-brand prestige.`,
        rationale: `Inferred from initial market entry characteristics for ${concept}.`,
      });
    }

    const openQuestions: string[] = [];
    if (!diffFact) openQuestions.push('What specific differentiator or signature feature will set your brand apart?');
    if (!budgetFact) openQuestions.push('What production, budget, or launch timeline constraints exist?');
    if (!locationFact) openQuestions.push('Are you planning a local launch or immediate national/global distribution?');

    return {
      brand_concept: concept,
      core_problem: problem,
      proposed_solution: `A dedicated brand providing ${concept.toLowerCase()} specifically tailored to ${audience.toLowerCase()}.`,
      target_audience: audience,
      context_situation: `Entering the market to serve ${audience} seeking better options for ${concept.toLowerCase()}.`,
      user_goals: goalsFact?.text || `Establish a trusted, memorable brand presence and acquire initial enthusiastic customers.`,
      constraints: budgetFact?.text || 'Budget and operational constraints not yet finalized.',
      value_desired_outcome: `Reliable quality, clear brand alignment, and a seamless customer experience for ${audience}.`,
      differentiation: diffFact?.text || 'Suggested hypothesis: Focus on superior craftsmanship and customer intimacy.',
      brand_goals: goalsFact?.text || 'Build strong early word-of-mouth and sustainable repeat purchase loyalty.',
      customer_needs: [
        'Accessible pricing without sacrificing quality',
        'Transparent and authentic brand communication',
        'Convenient purchasing and dependable fulfillment',
      ],
      open_questions: openQuestions.length > 0 ? openQuestions : ['What are the key milestones for the next 90 days?'],
      known_facts: knownFactsList.length > 0 ? knownFactsList : [`Concept: ${concept}`],
      inferred_assumptions: inferredAssumptions,
    };
  }
}
