/**
 * Mock API client — used for UI development while Member 1's backend is not yet available.
 * MOCK ADAPTER — replace with real fetch calls once backend endpoints exist.
 * Every function is clearly marked [MOCK] and must be replaced before production.
 */
import type { StageName, CriticFinding, ConsistencyFinding, StageErrorResponse } from '../../../shared/types';
import { v4 as uuid } from 'uuid';

// Base URL — set VITE_API_BASE_URL in .env for real backend
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

export interface GenerateResult {
  content: Record<string, unknown>;
  findings: CriticFinding[];
}

export interface MockFlag {
  isMock: true;
  note: string;
}

/** [MOCK] Simulate a backend generate + critique call with artificial delay. */
export async function generateStage(
  stage: StageName,
  _context: Record<string, unknown>
): Promise<GenerateResult & MockFlag> {
  // Simulate network delay
  await delay(1500 + Math.random() * 1000);

  // Return mock draft content and findings per stage
  const mockContent = getMockDraftContent(stage);
  const mockFindings = getMockFindings(stage);

  return {
    isMock: true,
    note: '[MOCK ADAPTER] — Replace with real POST /api/stages/:stage/generate call when backend is available.',
    content: mockContent,
    findings: mockFindings,
  };
}

/** [MOCK] Simulate holistic consistency audit. */
export async function runConsistencyAudit(
  _approvedDecisions: Record<string, unknown>
): Promise<{ findings: ConsistencyFinding[] } & MockFlag> {
  await delay(2000);
  return {
    isMock: true,
    note: '[MOCK ADAPTER] — Replace with real POST /api/audit/holistic when backend is available.',
    findings: getMockConsistencyFindings(),
  };
}

/** [MOCK] Simulate export assembly. */
export async function assembleExport(
  _approvedDecisions: Record<string, unknown>
): Promise<{ content: string; status: 'exported' | 'failed' } & MockFlag> {
  await delay(1000);
  return {
    isMock: true,
    note: '[MOCK ADAPTER] — Replace with real POST /api/export when backend is available.',
    content: '# IdeaToBrand AI — Brand Kit\n\n[Export assembled from approved decisions]\n',
    status: 'exported',
  };
}

export interface ScenarioBranchField {
  stage: StageName;
  field_name: string;
  original_value: string;
  branch_value: string;
}

export interface ScenarioProbeResult {
  scenario_id: string;
  what_if_input: string;
  triggered_from_stage: StageName;
  affected_stages: StageName[];
  changed_fields: ScenarioBranchField[];
  branch_critic_findings: import('../../../shared/types').CriticFinding[];
}

/**
 * [MOCK] Simulate Scenario Probe — returns an isolated branch with original-vs-branch
 * values and Critic findings. Does NOT overwrite the original.
 * Replace with POST /api/scenario-probe when T-029 backend is available.
 */
export async function runScenarioProbe(
  triggeredFrom: StageName,
  whatIfInput: string,
  _approvedDecisions: Record<string, unknown>
): Promise<ScenarioProbeResult & MockFlag> {
  await delay(2000 + Math.random() * 1000);
  return {
    isMock: true,
    note: '[MOCK ADAPTER] — Replace with real POST /api/scenario-probe when T-029 backend is available.',
    scenario_id: uuid(),
    what_if_input: whatIfInput,
    triggered_from_stage: triggeredFrom,
    affected_stages: ['positioning', 'naming_personality', 'tagline_pitch'] as StageName[],
    changed_fields: [
      {
        stage: 'positioning',
        field_name: 'target_audience',
        original_value: 'University students (18–26) in project-based coursework',
        branch_value: 'Graduate students (22–28) in research-oriented programmes',
      },
      {
        stage: 'naming_personality',
        field_name: 'proposed_name',
        original_value: 'Koru',
        branch_value: 'ResearchNest',
      },
      {
        stage: 'tagline_pitch',
        field_name: 'one_line_pitch',
        original_value: 'Koru matches university students with the right collaborators for every project.',
        branch_value: 'ResearchNest connects graduate researchers with the collaborators their work demands.',
      },
    ],
    branch_critic_findings: [
      {
        id: uuid(),
        stage: 'naming_personality',
        target_field: 'proposed_name',
        issue_type: 'vague',
        evidence: '"ResearchNest" may limit the brand to academic research rather than collaborative projects broadly.',
        explanation: 'The name shifts target audience but narrows market scope more aggressively than the original.',
        sharper_alternative: 'Consider "Nexis" — connection-focused, not field-specific, preserves graduate audience without over-narrowing.',
        user_action: null,
      },
    ],
  };
}

// ─── Real API client (for when backend is available) ─────────────────────────

export async function realGenerateStage(
  stage: StageName,
  context: Record<string, unknown>
): Promise<GenerateResult> {
  const res = await fetch(`${BASE_URL}/api/stages/${stage}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(context),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const err: StageErrorResponse = await res.json().catch(() => ({
      stage,
      error_type: 'provider_unavailable',
      message: `HTTP ${res.status}`,
      retryable: true,
    }));
    throw err;
  }
  return res.json();
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeFinding(stage: StageName, field: string, issueType: CriticFinding['issue_type'], evidence: string, explanation: string, alternative: string): CriticFinding {
  return {
    id: uuid(),
    stage,
    target_field: field,
    issue_type: issueType,
    evidence,
    explanation,
    sharper_alternative: alternative,
    user_action: null,
  };
}

function getMockDraftContent(stage: StageName): Record<string, unknown> {
  const mocks: Record<StageName, Record<string, unknown>> = {
    discovery: {
      core_problem: 'Students struggle to find compatible teammates for class projects due to fragmented communication channels and lack of skill matching.',
      target_audience: 'University students (18–26) engaged in collaborative coursework.',
      context_situation: 'During semester start and mid-project crunch periods when team formation is critical.',
      user_goals: 'Find the right collaborators quickly without wasting time on mismatched partners.',
      constraints: 'Must integrate with existing academic calendars and institutional email systems.',
      value_desired_outcome: 'Faster, better-matched teams that produce stronger academic work.',
      open_questions: ['How do students currently discover teammates?', 'What defines "compatible" across disciplines?'],
      known_facts: ['Target market: university students', 'Core feature: teammate matching'],
      inferred_assumptions: [
        { value: 'Students prefer mobile-first interfaces', rationale: 'Majority of Gen Z students use smartphones as primary devices' },
        { value: 'Team compatibility matters more than speed alone', rationale: 'Academic outcomes depend on sustained collaboration quality' },
      ],
    },
    positioning: {
      directions: [
        {
          title: 'The Academic Matchmaker',
          category: 'EdTech / Collaboration',
          target_audience: 'Students who want skill-matched teams',
          core_problem: 'Random team assignment wastes potential',
          differentiator: 'Skill graph + project-type matching, not just availability',
          value_proposition: 'Form better teams in minutes, not weeks of awkward cold messages',
          competitive_angle: 'Unlike LinkedIn (professional) or GroupMe (social), purpose-built for academic collaboration',
          strategic_rationale: 'Addresses a universal friction point in higher education',
          potential_weakness: 'Requires critical mass of users per institution to deliver value',
        },
        {
          title: 'The Project Compass',
          category: 'Productivity / EdTech',
          target_audience: 'Project-driven students seeking structure',
          core_problem: 'Students lack a shared coordination layer for collaborative work',
          differentiator: 'Combines team formation with lightweight project management',
          value_proposition: 'Not just who you work with, but how you work together from day one',
          competitive_angle: 'Bridges the gap between team-finding and project execution',
          strategic_rationale: 'Retention through ongoing project value, not just a one-time match',
          potential_weakness: 'Higher product complexity may slow early adoption',
        },
      ],
    },
    naming_personality: {
      naming_directions: [
        {
          territory: 'Collaborative motion',
          proposed_name: 'Koru',
          rationale: 'Koru (Māori: unfurling fern) symbolizes new beginnings and collaborative growth',
          relationship_to_audience: 'Resonates with students starting new academic chapters',
          relationship_to_positioning: 'Reinforces the "Academic Matchmaker" growth-oriented direction',
          potential_concern: 'May be unfamiliar to non-Māori audiences; requires context',
          critic_analysis: 'Strong symbolic resonance but cultural specificity needs consideration',
          sharper_alternative: 'Consider "Nexus" — neutral, universally understood as a connection point',
        },
      ],
      personality_traits: [
        { trait: 'Collaborative', justification: 'Core product promise is team formation' },
        { trait: 'Approachable', justification: 'Students need zero friction to adopt a new tool' },
        { trait: 'Focused', justification: 'Cuts through the noise of general social platforms' },
      ],
      traits_to_avoid: ['Corporate', 'Authoritative', 'Exclusive'],
      brand_principles: [
        { principle: 'Connections over convenience', rationale: 'Quality matches matter more than speed' },
        { principle: 'Students first, institution second', rationale: 'Trust comes from serving the user, not the administration' },
      ],
    },
    tagline_pitch: {
      tagline_options: [
        'Find your team. Build something real.',
        'Better teams. Better work.',
        'The teammate you were looking for.',
      ],
      one_line_pitch: 'Koru matches university students with the right collaborators for every project — by skills, not just availability.',
      rationale_per_tagline: [
        'Action-oriented; emphasizes outcome and authenticity',
        'Benefit-first; clean and memorable but risks generic feel',
        'Empathetic; positions the app as the solution to a felt need',
      ],
    },
    visual_brief: {
      logo_direction: 'An abstract mark suggesting two elements meeting or intertwining — avoid literal team/people icons',
      color_mood: 'Calm confidence: deep teal as primary with warm amber accent for energy',
      hex_palette: ['#0D5C63', '#F4A261', '#E9C46A', '#F8F9FA', '#2B2D42'],
      type_roles: ['Headlines: Inter 700', 'Body: Inter 400', 'Labels: Inter 500 uppercase tracked'],
      shape_language: 'Rounded rectangles and organic curves — approachable without being playful',
      symbol_language: 'Intersection, connection, growth spiral',
      composition_layout: 'Generous whitespace; content-first layout; cards and structured sections',
      imagery_direction: 'Real students in authentic collaborative moments — no stock-photo poses',
      concepts_to_avoid: ['Generic handshakes', 'Graduation cap iconography', 'Corporate blue/grey'],
      rationale_linking_to_audience_and_positioning: 'Teal communicates trust and calm focus; amber adds student energy without feeling like a consumer app',
    },
    voice_messaging: {
      voice_description: 'Direct, warm, and student-native — like advice from a smart upperclassman, not a recruiter',
      tone_characteristics: ['Honest', 'Encouraging', 'Precise', 'Non-patronizing'],
      do_list: ['Use active voice', 'Be specific about outcomes', 'Speak to the moment of need'],
      dont_list: ['Use corporate buzzwords ("synergy", "leverage")', 'Make promises about guaranteed outcomes', 'Sound like an institution'],
      sample_messages: [
        { message: 'Your next project team is here. Skip the group chat chaos.', explanation: 'Homepage hero — addresses the specific pain point immediately' },
        { message: 'Tell us what you\'re building. We\'ll find the people who make it happen.', explanation: 'Onboarding CTA — frames Koru as active partner, not passive tool' },
        { message: 'Found 3 students who match your CS + Design project. Ready to connect?', explanation: 'Match notification — specific and action-ready' },
      ],
    },
    launch_prep: {
      landing_headline: 'Find the team that makes your project actually work.',
      social_launch_post: '🎓 Tired of random team assignments ruining your semester? Koru matches you with the right collaborators — by skills, goals, and working style. No awkward cold messages. No mismatched teams. Just better work, from day one. Try Koru → [link] #StudentLife #EdTech #TeamBuilding',
    },
    consistency_audit: {},
    kit_export: {},
  };
  return mocks[stage] ?? {};
}

function getMockFindings(stage: StageName): CriticFinding[] {
  if (stage === 'discovery') {
    return [
      makeFinding('discovery', 'target_audience', 'vague', '"University students" is very broad.', 'Without narrowing to specific academic contexts (e.g., project-based courses vs. general study), the positioning will lack precision.', 'Narrow to students in project-based courses (engineering, design, business programs) where team formation is a repeated structured need.'),
    ];
  }
  if (stage === 'tagline_pitch') {
    return [
      makeFinding('tagline_pitch', 'tagline_options', 'audience_mismatch', '"Better teams. Better work." could apply to any B2B HR tool.', 'This line fails the competitor interchangeability test — it describes the generic outcome, not the student-specific experience.', '"The teammate your professor can\'t assign." — specific to the academic context and positions against institutional randomness.'),
    ];
  }
  return [];
}

function getMockConsistencyFindings(): ConsistencyFinding[] {
  return [
    {
      id: uuid(),
      fields_in_conflict: ['voice_messaging', 'launch_prep'],
      issue_type: 'contradiction',
      evidence: 'Voice guidelines specify "non-patronizing" tone, but the launch post uses "🎓 Tired of..." which may read as condescending to some audiences.',
      why_it_matters: 'Brand voice consistency is foundational to trust — contradiction in launch copy undermines the carefully approved voice direction.',
      sharper_alternative: 'Revise launch post opening to a peer-level statement: "The semester\'s best teams don\'t happen by accident." — same energy, less assumption about frustration.',
      user_action: null,
    },
  ];
}
