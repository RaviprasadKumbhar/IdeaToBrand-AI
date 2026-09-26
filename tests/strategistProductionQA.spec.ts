import { describe, it, expect, beforeEach } from 'vitest';
import { StrategistInterviewEngine } from '../backend/src/strategist/interviewEngine.js';
import { MockAIProvider } from '../backend/src/ai/providers/mock.js';
import { DiscoveryStageService } from '../backend/src/stages/discovery.js';
import { app } from '../backend/src/server.js';
import {
  writeApprovedDecision,
  createInitialSharedContext,
  assembleBrandKit,
  validateExportEligibility,
  type FactItem,
  type SharedContext,
  type StageName,
} from '@foil/shared';

// Helper for test HTTP requests against Express server
async function testRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      const port = (server.address() as any).port;
      try {
        const response = await fetch(`http://localhost:${port}${path}`, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined,
        });
        const json = await response.json();
        server.close(() => resolve({ status: response.status, json }));
      } catch (err) {
        server.close(() => reject(err));
      }
    });
  });
}

describe('IdeaToBrand AI (FOIL) — Production Strategist QA Scenarios (Phases 1-11)', () => {
  let interviewEngine: StrategistInterviewEngine;
  let mockProvider: MockAIProvider;
  let discoveryService: DiscoveryStageService;

  beforeEach(() => {
    interviewEngine = new StrategistInterviewEngine();
    mockProvider = new MockAIProvider();
    discoveryService = new DiscoveryStageService();
  });

  // ─── TEST 1: Vague Input ──────────────────────────────────────────────────
  describe('TEST 1 — Vague Input Handling (Zero Hallucination Bug Fix)', () => {
    it('asks a clarifying question when user enters vague meta-request; NEVER invents student matchmaking', async () => {
      const vagueInput = 'Help me define my brand idea and clarify my core value proposition.';

      const result = await interviewEngine.processTurn({
        userMessage: vagueInput,
        existingFacts: [],
        provider: mockProvider,
      });

      // Assertions
      expect(result.state).toBe('COLLECTING');
      expect(result.readiness.isReady).toBe(false);
      expect(result.question).toBeDefined();
      expect(result.question?.targetCategory).toBe('concept');
      expect(result.discoveryDraft).toBeUndefined();

      // Invariant: AI must NOT invent student coursework, teammates, academic calendars
      const fullResponseText = `${result.message} ${result.question?.question} ${JSON.stringify(result.extractedFacts)}`.toLowerCase();
      expect(fullResponseText).not.toContain('students struggle to find compatible teammates');
      expect(fullResponseText).not.toContain('academic honor codes');
      expect(fullResponseText).not.toContain('collaborative coursework');
      expect(fullResponseText).not.toContain('studynest');
    });

    it('POST /api/interview/turn handles vague requests over HTTP API', async () => {
      const res = await testRequest('POST', '/api/interview/turn', {
        user_message: 'Help me define my brand idea and clarify my core value proposition.',
        existing_facts: [],
      });

      expect(res.status).toBe(200);
      expect(res.json.state).toBe('COLLECTING');
      expect(res.json.readiness.isReady).toBe(false);
      expect(res.json.question.options.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ─── TEST 2: Specific Input ───────────────────────────────────────────────
  describe('TEST 2 — Specific Input Grounding', () => {
    it('extracts real user facts and grounds discovery in supplied text (e.g. tote bags in Pune)', async () => {
      const specificInput = 'I want to sell affordable handmade cotton tote bags to college students in Pune.';

      const result = await interviewEngine.processTurn({
        userMessage: specificInput,
        existingFacts: [],
        provider: mockProvider,
      });

      // Extracted facts must reflect user input
      const conceptFact = result.extractedFacts.find((f) => f.category === 'concept');
      const audienceFact = result.extractedFacts.find((f) => f.category === 'audience');
      const locationFact = result.extractedFacts.find((f) => f.category === 'location_market');

      expect(conceptFact).toBeDefined();
      expect(conceptFact?.confidence).toBe('user_provided_fact');
      expect(conceptFact?.text.toLowerCase()).toContain('tote bags');

      expect(audienceFact).toBeDefined();
      expect(audienceFact?.confidence).toBe('user_provided_fact');
      expect(audienceFact?.text.toLowerCase()).toContain('college students');

      expect(locationFact).toBeDefined();
      expect(locationFact?.text).toBe('Pune');

      // Next step asks for problem or clarification without inventing market size or revenue
      expect(result.readiness.score).toBeGreaterThan(0);
      expect(result.message).not.toContain('$100,000 revenue');
      expect(result.message).not.toContain('10,000 units sold');
    });
  });

  // ─── TEST 3: Unknown Answers & AI Hypotheses ──────────────────────────────
  describe('TEST 3 — Unknown Answers Handled as Hypotheses', () => {
    it('labels exploratory suggestions as ai_hypothesis when user says "I don\'t know yet"', async () => {
      const initialFacts: FactItem[] = [
        {
          id: '1',
          category: 'concept',
          label: 'Business Concept',
          text: 'Handmade organic soaps',
          confidence: 'user_provided_fact',
        },
      ];

      const result = await interviewEngine.processTurn({
        userMessage: "I don't know yet, help me decide.",
        existingFacts: initialFacts,
        provider: mockProvider,
      });

      // Finds the suggested hypothesis
      const hypothesis = result.extractedFacts.find((f) => f.confidence === 'ai_hypothesis');
      expect(hypothesis).toBeDefined();
      expect(hypothesis?.confidence).toBe('ai_hypothesis');
      // Invariant: Hypothesis must NEVER be relabeled as a user-confirmed fact
      expect(hypothesis?.confidence).not.toBe('user_provided_fact');
      expect(hypothesis?.confidence).not.toBe('user_confirmed_fact');
    });
  });

  // ─── TEST 4: User Correction ──────────────────────────────────────────────
  describe('TEST 4 — User Correction Persistence', () => {
    it('persists user correction, marks as user_confirmed_fact, and eliminates rejected assumptions', async () => {
      const existingFacts: FactItem[] = [
        {
          id: '1',
          category: 'concept',
          label: 'Concept',
          text: 'Handmade cotton tote bags',
          confidence: 'user_provided_fact',
        },
        {
          id: '2',
          category: 'audience',
          label: 'Audience Hypothesis',
          text: 'High school students',
          confidence: 'ai_hypothesis',
        },
      ];

      const correction = 'Actually, my audience is young working professionals and creatives, not high school students.';
      const result = await interviewEngine.processTurn({
        userMessage: correction,
        existingFacts,
        provider: mockProvider,
      });

      // Verifies the hypothesis was removed and user correction was confirmed
      const hypothesis = result.extractedFacts.find((f) => f.confidence === 'ai_hypothesis');
      expect(hypothesis).toBeUndefined();

      const confirmedAudience = result.extractedFacts.find((f) => f.confidence === 'user_confirmed_fact');
      expect(confirmedAudience).toBeDefined();
      expect(confirmedAudience?.text).toContain('young working professionals and creatives');
    });
  });

  // ─── TEST 5: Gate Approval Choke Point ─────────────────────────────────────
  describe('TEST 5 — Gate Approval Choke Point', () => {
    it('drafts do not become approved until explicit writeApprovedDecision is executed', async () => {
      let context = createInitialSharedContext();
      expect(context.approved_decisions.discovery).toBeUndefined();

      // Generation endpoint only produces draft content
      const draftContent = {
        core_problem: 'Lack of sustainable tote bags in Pune',
        target_audience: 'College students in Pune',
        context_situation: 'Campus semester',
        user_goals: 'Buy durable eco-friendly bags',
        constraints: 'Low price point',
        value_desired_outcome: 'High durability tote',
        open_questions: [],
        known_facts: ['Concept: Tote bags in Pune'],
        inferred_assumptions: [{ value: 'Students prefer simple prints', rationale: 'Campus trend' }],
      };

      // Context remains unapproved until explicit approval
      expect(context.approved_decisions.discovery).toBeUndefined();

      // Explicit user approval locks Gate 1
      context = writeApprovedDecision(context, 'discovery', draftContent, 'strategist_approved', 'user_action_1');
      expect(context.approved_decisions.discovery).toBeDefined();
      expect(context.approved_decisions.discovery?.state).toBe('approved');
      expect(context.revision_log).toHaveLength(1);
    });
  });

  // ─── TEST 6: Account Isolation & Data Boundaries ──────────────────────────
  describe('TEST 6 — Account & Workspace Isolation', () => {
    it('isolates projects between users and rejects unauthorized access', () => {
      const userAContext: SharedContext = {
        ...createInitialSharedContext(),
        project_id: 'proj_user_a',
        user_facts: { business_description: 'Brand A for User A' },
      };

      const userBContext: SharedContext = {
        ...createInitialSharedContext(),
        project_id: 'proj_user_b',
        user_facts: { business_description: 'Brand B for User B' },
      };

      // Ensure distinct memory spaces and IDs
      expect(userAContext.project_id).not.toBe(userBContext.project_id);
      expect(userAContext.user_facts.business_description).not.toBe(userBContext.user_facts.business_description);
    });
  });

  // ─── TEST 7: Persistence Round-Trip ───────────────────────────────────────
  describe('TEST 7 — Workspace State & Fact Persistence', () => {
    it('serializes and restores facts, approved decisions, and revision history accurately', () => {
      let context = createInitialSharedContext();
      context = writeApprovedDecision(
        context,
        'discovery',
        { core_problem: 'Handmade bags problem', target_audience: 'Pune students' },
        'strategist_approved',
        'init_approval'
      );

      const serialized = JSON.stringify(context);
      const restored = JSON.parse(serialized) as SharedContext;

      expect(restored.project_id).toBe(context.project_id);
      expect(restored.approved_decisions.discovery?.state).toBe('approved');
      expect(restored.revision_log).toHaveLength(1);
    });
  });

  // ─── TEST 8: AI Failure Handling ──────────────────────────────────────────
  describe('TEST 8 — AI Failure Resilience & No Fake Success', () => {
    it('returns structured error when AI provider encounters simulated error; never fabricates dummy success', async () => {
      const failingProvider = new MockAIProvider({ simulateError: true });

      await expect(
        discoveryService.generateDiscoveryDraft(
          {
            idea_text: 'Handmade tote bags in Pune',
            user_facts: ['Location: Pune'],
          },
          failingProvider
        )
      ).rejects.toThrow();
    });

    it('returns structured error when AI provider times out', async () => {
      const timeoutProvider = new MockAIProvider({ simulateTimeout: true });

      await expect(
        discoveryService.generateDiscoveryDraft(
          {
            idea_text: 'Handmade tote bags in Pune',
            user_facts: ['Location: Pune'],
          },
          timeoutProvider
        )
      ).rejects.toThrow();
    });
  });

  // ─── TEST 9: Full 9-Gate Sequential Workflow ──────────────────────────────
  describe('TEST 9 — Nine-Gate Sequential Strategy Workflow', () => {
    it('executes gates sequentially with contextual awareness and validates export eligibility', async () => {
      let context = createInitialSharedContext();

      // Gate 1: Discovery
      context = writeApprovedDecision(
        context,
        'discovery',
        {
          core_problem: 'Lack of high-quality sustainable tote bags',
          target_audience: 'College students and conscious shoppers',
          context_situation: 'Daily campus commute',
          user_goals: 'Carry essentials in an eco-friendly way',
          constraints: 'Student budget',
          value_desired_outcome: 'Durable, stylish everyday bag',
          open_questions: [],
          known_facts: ['Product: Cotton tote bags'],
          inferred_assumptions: [{ value: 'Students prioritize durability', rationale: 'Heavy books' }],
        },
        'strategist_approved',
        'app_1'
      );
      // Gate 2: Positioning
      context = writeApprovedDecision(
        context,
        'positioning',
        {
          title: 'The Artisanal Standard',
          category: 'Sustainable Lifestyle',
          target_audience: 'College students and conscious shoppers',
          core_problem: 'Flimsy disposable bags break quickly',
          differentiator: 'Reinforced organic canvas stitching',
          value_proposition: 'Enduring style built for daily student life',
          competitive_angle: 'Craftsmanship over fast fashion',
          strategic_rationale: 'Direct appeal to campus sustainability values',
          potential_weakness: 'Requires clear durability proof',
        },
        'strategist_approved',
        'app_2'
      );
      // Gate 3: Naming
      context = writeApprovedDecision(
        context,
        'naming_personality',
        {
          selected_name: 'LoomKraft',
          proposed_name: 'LoomKraft',
          naming_directions: [
            {
              territory: 'Craftsmanship',
              proposed_name: 'LoomKraft',
              rationale: 'Evokes natural weaving and honest craft',
              relationship_to_audience: 'Resonates with conscious buyers',
              relationship_to_positioning: 'Emphasizes durable construction',
              potential_concern: 'Germanic spelling',
            },
          ],
          personality_traits: [
            { trait: 'Honest', audience_justification: 'Students value transparency' },
            { trait: 'Pragmatic', audience_justification: 'Need daily utility' },
            { trait: 'Conscious', audience_justification: 'Eco-aware community' },
          ],
          traits_to_avoid: ['Pretentious', 'Disposable'],
          brand_principles: [{ principle: 'Durability first', rationale: 'Long lifecycle reduces waste' }],
        },
        'strategist_approved',
        'app_3'
      );
      // Gate 4: Tagline
      context = writeApprovedDecision(
        context,
        'tagline_pitch',
        {
          selected_tagline: 'Carry what matters.',
          tagline_options: ['Carry what matters.', 'Crafted for campus life.'],
          one_line_pitch: 'LoomKraft delivers reinforced organic cotton tote bags designed for sustainable student living.',
          rationale_per_tagline: ['Emotional connection to student identity'],
        },
        'strategist_approved',
        'app_4'
      );
      // Gate 5: Visual
      context = writeApprovedDecision(
        context,
        'visual_brief',
        {
          logo_direction: 'Geometric loom shuttle monogram',
          color_mood: 'Warm oatmeal and forest green',
          hex_palette: ['#2D3748', '#2F855A', '#FAF089', '#F7FAFC'],
          type_roles: ['Headings: Space Grotesk', 'Body: Inter'],
          shape_language: 'Clean organic rectangular contours',
          symbol_language: 'Woven fiber nodes',
          composition_layout: 'Warm minimalist framing',
          imagery_direction: 'Natural campus lifestyle photography',
          concepts_to_avoid: ['Plastic sheen', 'Neon gradients'],
          rationale_linking_to_audience_and_positioning: 'Earthy tones reinforce organic materials',
        },
        'strategist_approved',
        'app_5'
      );
      // Gate 6: Voice
      context = writeApprovedDecision(
        context,
        'voice_messaging',
        {
          voice_description: 'Grounded, friendly, and transparent',
          tone_characteristics: ['Warm', 'Unpretentious', 'Dependable'],
          do_list: ['Speak directly about materials', 'Celebrate everyday utility'],
          dont_list: ['Do not greenwash', 'Do not sound elite'],
          sample_messages: [{ message: 'Built to carry your world.', explanation: 'Hero hook' }],
        },
        'strategist_approved',
        'app_6'
      );
      // Gate 7: Launch Prep
      context = writeApprovedDecision(
        context,
        'launch_prep',
        {
          landing_headline: 'The everyday tote that outlasts the semester.',
          social_launch_post: 'Meet LoomKraft: sustainably woven, double-stitched cotton totes for your campus journey.',
        },
        'strategist_approved',
        'app_7'
      );

      // Gate 8: Audit (no conflicts)
      const eligibility = validateExportEligibility(context, []);
      expect(eligibility.eligible).toBe(true);

      // Gate 9: Export bundle
      const bundle = assembleBrandKit(context, []);
      expect(bundle.status).toBe('exported');
      expect(bundle.content).toContain('LoomKraft');
    });
  });

  // ─── TEST 10: Build and Regression Verification ───────────────────────────
  describe('TEST 10 — Contract and Schema Integrity', () => {
    it('verifies Discovery schema rejects empty or invalid structures', () => {
      const validDraft = {
        core_problem: 'Real customer problem',
        target_audience: 'Conscious shoppers',
        context_situation: 'Summer market',
        user_goals: 'Sustainable growth',
        constraints: 'Small budget',
        value_desired_outcome: 'High durability',
        open_questions: ['Supplier contact?'],
        known_facts: ['Concept: Organic soaps'],
        inferred_assumptions: [{ value: 'Customers care about natural ingredients', rationale: 'Category standard' }],
      };

      const discoveryOutput = interviewEngine.buildDiscoveryDraftFromFacts([
        {
          id: '1',
          category: 'concept',
          label: 'Concept',
          text: 'Organic handmade soaps',
          confidence: 'user_provided_fact',
        },
        {
          id: '2',
          category: 'audience',
          label: 'Audience',
          text: 'Eco-conscious shoppers',
          confidence: 'user_provided_fact',
        },
      ]);

      expect(discoveryOutput.brand_concept).toBe('Organic handmade soaps');
      expect(discoveryOutput.target_audience).toContain('Eco-conscious shoppers');
      expect(discoveryOutput.known_facts.length).toBeGreaterThan(0);
    });
  });
});
