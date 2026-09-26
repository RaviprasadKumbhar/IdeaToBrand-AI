import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// ── Test fixtures (isolated from production flows) ──────────────────────────
import type { PositioningContent } from '../stages/positioning/PositioningStage';
import type { NamingPersonalityContent } from '../stages/naming-personality/NamingPersonalityStage';
import type { TaglinePitchContent } from '../stages/tagline-pitch/TaglinePitchStage';
import type { VisualBriefContent } from '../stages/visual-brief/VisualBriefStage';
import type { VoiceMessagingContent } from '../stages/voice-messaging/VoiceMessagingStage';
import type { LaunchPrepContent } from '../stages/launch-prep/LaunchPrepStage';

const POSITIONING_FIXTURE: PositioningContent = {
  directions: [
    {
      title: 'Efficiency First',
      category: 'B2B SaaS',
      target_audience: 'Operations managers at mid-size companies',
      core_problem: 'Manual processes waste hours every week',
      differentiator: 'One-click automation with no coding',
      value_proposition: 'Cut manual work by 70% in 30 days',
      competitive_angle: 'Unlike competitors, no IT team required',
      strategic_rationale: 'Targets the underserved operations persona',
      potential_weakness: 'May feel niche for enterprise buyers',
    },
    {
      title: 'Human-Led Growth',
      category: 'B2B SaaS',
      target_audience: 'Founders of bootstrapped companies',
      core_problem: 'Scaling without losing the human touch',
      differentiator: 'AI that amplifies people, not replaces them',
      value_proposition: 'Grow 3× faster while keeping your team culture',
      competitive_angle: 'Positioned against cold, impersonal enterprise tools',
      strategic_rationale: 'Founder-led companies resonate with this narrative',
      potential_weakness: 'Harder to quantify ROI for investors',
    },
  ],
};

const NAMING_FIXTURE: NamingPersonalityContent = {
  naming_directions: [
    {
      territory: 'Action-oriented',
      proposed_name: 'Flowra',
      rationale: 'Evokes flow and growth simultaneously',
      relationship_to_audience: 'Resonates with operators who value smooth processes',
      relationship_to_positioning: 'Directly tied to Efficiency First direction',
      potential_concern: 'Could be confused with floral brands',
      critic_analysis: 'The name is distinctive but needs tagline support',
      sharper_alternative: 'Fluxra — harder-edged version',
    },
  ],
  personality_traits: [
    { trait: 'Direct', justification: 'Cuts through complexity without jargon' },
    { trait: 'Warm', justification: 'Builds trust without being transactional' },
  ],
  traits_to_avoid: ['Corporate', 'Cold', 'Overly technical'],
  brand_principles: [
    { principle: 'Clarity over cleverness', rationale: 'Users value understanding over impressive language' },
  ],
};

const TAGLINE_FIXTURE: TaglinePitchContent = {
  tagline_options: [
    { tagline: 'Work flows here.', rationale: 'Double meaning — workflows and the feeling of being in flow' },
    { tagline: 'Less friction. More done.', rationale: 'Clear outcome-driven positioning' },
  ],
  one_line_pitch: 'Flowra helps operations teams automate manual work in minutes, not months.',
  competitor_interchangeability_check: '"Work flows here" cannot be said by a spreadsheet tool — it requires workflow context.',
};

const VISUAL_BRIEF_FIXTURE: VisualBriefContent = {
  logo_direction: 'Geometric mark with fluid inner shape suggesting motion',
  color_mood: 'Calm confidence — deep teal meets warm off-white',
  hex_palette: ['#1A5C6B', '#F7F3EE', '#3AAFA9', '#DEDBD2'],
  type_roles: ['Display: "Sora" — modern geometric sans', 'Body: "Inter" — neutral, readable'],
  shape_language: 'Rounded corners, soft edges — approachable but precise',
  symbol_language: 'Arrow + loop motif suggesting iteration and momentum',
  composition_layout: 'Generous whitespace; left-aligned text for reading flow',
  imagery_direction: 'People at work, candid not staged; diverse teams; natural light',
  concepts_to_avoid: ['Robotic imagery', 'Gear icons', 'Blue-on-blue gradients'],
  rationale_linking_to_audience_and_positioning: 'Teal signals trust and precision; off-white avoids sterility; Sora conveys forward momentum without aggression',
};

const VOICE_FIXTURE: VoiceMessagingContent = {
  voice_description: 'Clear and direct, like a knowledgeable colleague explaining something — never condescending.',
  tone_characteristics: ['Direct', 'Warm', 'Confident', 'Jargon-free'],
  do_list: ['Use active verbs', 'Lead with outcomes', 'Speak to real pain points'],
  dont_list: ['Use passive voice', 'Make vague promises', 'Use industry acronyms without definition'],
  sample_messages: [
    { message: 'Set it up in 5 minutes. Run it forever.', explanation: 'Addresses setup anxiety with a time anchor and longevity promise' },
    { message: 'Your team keeps the credit. Flowra does the lifting.', explanation: 'Reassures operators that automation supports, not replaces, people' },
  ],
};

const LAUNCH_PREP_FIXTURE: LaunchPrepContent = {
  landing_headline: 'Automate the work. Keep the momentum.',
  social_launch_post: `🚀 Introducing Flowra\n\nYour team is too smart to spend hours on manual tasks.\n\nFlowra automates the repetitive stuff — so your people can focus on the work that actually matters.\n\nSet it up in 5 minutes. See results in 30 days.\n\n#Automation #Operations #Flowra`,
};

// ── Shared mock setup ────────────────────────────────────────────────────────

const mockWriteApproved = vi.fn();
const mockReject = vi.fn();
const mockRegenerate = vi.fn();
const mockActOnFinding = vi.fn();
const mockTransition = vi.fn();

function makeMockStore(overrides: Record<string, unknown> = {}) {
  return {
    ctx: {
      stage_drafts: {},
      approved_decisions: {},
      critic_findings: [],
      consistency_findings: [],
    },
    uiStates: {
      positioning: { approval_state: 'critic_review', is_loading: false, error: null },
      naming_personality: { approval_state: 'critic_review', is_loading: false, error: null },
      tagline_pitch: { approval_state: 'critic_review', is_loading: false, error: null },
      visual_brief: { approval_state: 'critic_review', is_loading: false, error: null },
      voice_messaging: { approval_state: 'critic_review', is_loading: false, error: null },
      launch_prep: { approval_state: 'critic_review', is_loading: false, error: null },
    },
    writeApprovedDecision: mockWriteApproved,
    rejectStage: mockReject,
    transitionStage: mockTransition,
    actOnCriticFinding: mockActOnFinding,
    addCriticFindings: vi.fn(),
    setDraft: vi.fn(),
    setLoading: vi.fn(),
    setError: vi.fn(),
    ...overrides,
  };
}

vi.mock('../store/foilStore', () => ({
  useFOILStore: vi.fn(),
}));

vi.mock('../lib/api-client', () => ({
  generateStage: vi.fn().mockResolvedValue({ content: {}, findings: [], isMock: true, note: 'test' }),
}));

import { useFOILStore } from '../store/foilStore';
import { PositioningStage } from '../stages/positioning/PositioningStage';
import { NamingPersonalityStage } from '../stages/naming-personality/NamingPersonalityStage';
import { TaglinePitchStage } from '../stages/tagline-pitch/TaglinePitchStage';
import { VisualBriefStage } from '../stages/visual-brief/VisualBriefStage';
import { VoiceMessagingStage } from '../stages/voice-messaging/VoiceMessagingStage';
import { LaunchPrepStage } from '../stages/launch-prep/LaunchPrepStage';

const mockedStore = vi.mocked(useFOILStore);

function renderWithRouter(component: React.ReactElement) {
  return render(<MemoryRouter>{component}</MemoryRouter>);
}

// ── T-017 Positioning Comparison ─────────────────────────────────────────────

describe('T-017 PositioningStage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedStore.mockReturnValue(makeMockStore({
      ctx: {
        stage_drafts: { positioning: { stage: 'positioning', content: POSITIONING_FIXTURE, generated_at: '', attempt: 1 } },
        approved_decisions: {},
        critic_findings: [],
        consistency_findings: [],
      },
    }) as never);
  });

  it('renders both direction titles', () => {
    renderWithRouter(<PositioningStage />);
    expect(screen.getByText('Efficiency First')).toBeInTheDocument();
    expect(screen.getByText('Human-Led Growth')).toBeInTheDocument();
  });

  it('renders all required fields for Direction A', () => {
    renderWithRouter(<PositioningStage />);
    expect(screen.getByText('Operations managers at mid-size companies')).toBeInTheDocument();
    expect(screen.getByText('One-click automation with no coding')).toBeInTheDocument();
    expect(screen.getByText('Cut manual work by 70% in 30 days')).toBeInTheDocument();
    expect(screen.getByText(/Targets the underserved/)).toBeInTheDocument();
    expect(screen.getByText(/May feel niche/)).toBeInTheDocument();
  });

  it('renders approve button for each direction', () => {
    renderWithRouter(<PositioningStage />);
    expect(screen.getByRole('button', { name: /approve direction a.*efficiency first/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve direction b.*human-led growth/i })).toBeInTheDocument();
  });

  it('calls writeApprovedDecision when Direction A is approved', async () => {
    renderWithRouter(<PositioningStage />);
    const btn = screen.getByRole('button', { name: /approve direction a/i });
    await userEvent.click(btn);
    expect(mockWriteApproved).toHaveBeenCalledWith(
      'positioning',
      expect.objectContaining({ directions: [POSITIONING_FIXTURE.directions[0]] }),
      'user_edit',
      expect.any(String)
    );
  });

  it('calls writeApprovedDecision when Direction B is approved', async () => {
    renderWithRouter(<PositioningStage />);
    const btn = screen.getByRole('button', { name: /approve direction b/i });
    await userEvent.click(btn);
    expect(mockWriteApproved).toHaveBeenCalledWith(
      'positioning',
      expect.objectContaining({ directions: [POSITIONING_FIXTURE.directions[1]] }),
      'user_edit',
      expect.any(String)
    );
  });

  it('shows the stage heading', () => {
    renderWithRouter(<PositioningStage />);
    expect(screen.getByRole('heading', { name: 'Positioning' })).toBeInTheDocument();
  });

  it('shows empty state when no directions', () => {
    mockedStore.mockReturnValue(makeMockStore({
      ctx: {
        stage_drafts: { positioning: { stage: 'positioning', content: { directions: [] }, generated_at: '', attempt: 1 } },
        approved_decisions: {},
        critic_findings: [],
        consistency_findings: [],
      },
    }) as never);
    renderWithRouter(<PositioningStage />);
    expect(screen.getByText(/no directions loaded/i)).toBeInTheDocument();
  });
});

// ── T-019 Naming + Personality ───────────────────────────────────────────────

describe('T-019 NamingPersonalityStage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedStore.mockReturnValue(makeMockStore({
      ctx: {
        stage_drafts: { naming_personality: { stage: 'naming_personality', content: NAMING_FIXTURE, generated_at: '', attempt: 1 } },
        approved_decisions: {},
        critic_findings: [],
        consistency_findings: [],
      },
    }) as never);
  });

  it('shows proposed name and territory', () => {
    renderWithRouter(<NamingPersonalityStage />);
    expect(screen.getByText('Flowra')).toBeInTheDocument();
    expect(screen.getByText('Action-oriented')).toBeInTheDocument();
  });

  it('shows rationale, concern, and sharper alternative', () => {
    renderWithRouter(<NamingPersonalityStage />);
    expect(screen.getByText(/Evokes flow and growth/)).toBeInTheDocument();
    expect(screen.getByText(/Could be confused with floral/)).toBeInTheDocument();
    expect(screen.getByText(/Fluxra/)).toBeInTheDocument();
  });

  it('shows personality traits', () => {
    renderWithRouter(<NamingPersonalityStage />);
    expect(screen.getByText('Direct')).toBeInTheDocument();
    expect(screen.getByText('Warm')).toBeInTheDocument();
  });

  it('shows traits to avoid', () => {
    renderWithRouter(<NamingPersonalityStage />);
    expect(screen.getByText('Corporate')).toBeInTheDocument();
    expect(screen.getByText('Cold')).toBeInTheDocument();
    expect(screen.getByText('Overly technical')).toBeInTheDocument();
  });

  it('shows brand principles with rationale', () => {
    renderWithRouter(<NamingPersonalityStage />);
    expect(screen.getByText(/Clarity over cleverness/)).toBeInTheDocument();
    expect(screen.getByText(/Users value understanding/)).toBeInTheDocument();
  });

  it('renders Naming Directions heading', () => {
    renderWithRouter(<NamingPersonalityStage />);
    expect(screen.getByRole('heading', { name: /Naming Directions/i })).toBeInTheDocument();
  });
});

// ── T-021 Tagline + Pitch ─────────────────────────────────────────────────────

describe('T-021 TaglinePitchStage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedStore.mockReturnValue(makeMockStore({
      ctx: {
        stage_drafts: { tagline_pitch: { stage: 'tagline_pitch', content: TAGLINE_FIXTURE, generated_at: '', attempt: 1 } },
        approved_decisions: {},
        critic_findings: [],
        consistency_findings: [],
      },
    }) as never);
  });

  it('renders both tagline options', () => {
    renderWithRouter(<TaglinePitchStage />);
    expect(screen.getByText('Work flows here.')).toBeInTheDocument();
    expect(screen.getByText('Less friction. More done.')).toBeInTheDocument();
  });

  it('renders rationale for each tagline', () => {
    renderWithRouter(<TaglinePitchStage />);
    expect(screen.getByText(/Double meaning/)).toBeInTheDocument();
    expect(screen.getByText(/outcome-driven/)).toBeInTheDocument();
  });

  it('renders the one-line pitch', () => {
    renderWithRouter(<TaglinePitchStage />);
    expect(screen.getByText(/automate manual work in minutes/)).toBeInTheDocument();
  });

  it('renders competitor interchangeability check', () => {
    renderWithRouter(<TaglinePitchStage />);
    expect(screen.getByText(/cannot be said by a spreadsheet tool/)).toBeInTheDocument();
  });

  it('renders Tagline Options heading', () => {
    renderWithRouter(<TaglinePitchStage />);
    expect(screen.getByRole('heading', { name: /Tagline Options/i })).toBeInTheDocument();
  });

  it('empty state when no taglines', () => {
    mockedStore.mockReturnValue(makeMockStore({
      ctx: {
        stage_drafts: { tagline_pitch: { stage: 'tagline_pitch', content: { tagline_options: [], one_line_pitch: '' }, generated_at: '', attempt: 1 } },
        approved_decisions: {},
        critic_findings: [],
        consistency_findings: [],
      },
    }) as never);
    renderWithRouter(<TaglinePitchStage />);
    expect(screen.getByText(/No tagline options available/i)).toBeInTheDocument();
  });
});

// ── T-023 Visual Brief ───────────────────────────────────────────────────────

describe('T-023 VisualBriefStage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedStore.mockReturnValue(makeMockStore({
      ctx: {
        stage_drafts: { visual_brief: { stage: 'visual_brief', content: VISUAL_BRIEF_FIXTURE, generated_at: '', attempt: 1 } },
        approved_decisions: {},
        critic_findings: [],
        consistency_findings: [],
      },
    }) as never);
  });

  it('shows AI-generated concept disclaimer', () => {
    renderWithRouter(<VisualBriefStage />);
    expect(screen.getByRole('note', { name: /AI-generated concept disclaimer/i })).toBeInTheDocument();
    expect(screen.getByText(/not production-ready artwork/i)).toBeInTheDocument();
  });

  it('renders logo direction', () => {
    renderWithRouter(<VisualBriefStage />);
    expect(screen.getByText(/Geometric mark with fluid/)).toBeInTheDocument();
  });

  it('renders color mood', () => {
    renderWithRouter(<VisualBriefStage />);
    expect(screen.getByText(/Calm confidence/)).toBeInTheDocument();
  });

  it('renders HEX palette with swatches', () => {
    renderWithRouter(<VisualBriefStage />);
    expect(screen.getByText('#1A5C6B')).toBeInTheDocument();
    expect(screen.getByText('#F7F3EE')).toBeInTheDocument();
  });

  it('renders typography/type roles', () => {
    renderWithRouter(<VisualBriefStage />);
    expect(screen.getByText(/Display.*Sora/)).toBeInTheDocument();
  });

  it('renders shape and symbol language', () => {
    renderWithRouter(<VisualBriefStage />);
    expect(screen.getByText(/Rounded corners/)).toBeInTheDocument();
    expect(screen.getByText(/Arrow \+ loop motif/)).toBeInTheDocument();
  });

  it('renders imagery direction', () => {
    renderWithRouter(<VisualBriefStage />);
    expect(screen.getByText(/People at work/)).toBeInTheDocument();
  });

  it('renders concepts to avoid as badges', () => {
    renderWithRouter(<VisualBriefStage />);
    expect(screen.getByText('Robotic imagery')).toBeInTheDocument();
    expect(screen.getByText('Gear icons')).toBeInTheDocument();
  });

  it('renders rationale linking to audience and positioning', () => {
    renderWithRouter(<VisualBriefStage />);
    expect(screen.getByText(/Teal signals trust/)).toBeInTheDocument();
  });
});

// ── T-025 Voice + Messaging ──────────────────────────────────────────────────

describe('T-025 VoiceMessagingStage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedStore.mockReturnValue(makeMockStore({
      ctx: {
        stage_drafts: { voice_messaging: { stage: 'voice_messaging', content: VOICE_FIXTURE, generated_at: '', attempt: 1 } },
        approved_decisions: {},
        critic_findings: [],
        consistency_findings: [],
      },
    }) as never);
  });

  it('renders voice description', () => {
    renderWithRouter(<VoiceMessagingStage />);
    expect(screen.getByText(/like a knowledgeable colleague/)).toBeInTheDocument();
  });

  it('renders tone characteristics', () => {
    renderWithRouter(<VoiceMessagingStage />);
    expect(screen.getByText('Direct')).toBeInTheDocument();
    expect(screen.getByText('Confident')).toBeInTheDocument();
    expect(screen.getByText('Jargon-free')).toBeInTheDocument();
  });

  it('renders do list items', () => {
    renderWithRouter(<VoiceMessagingStage />);
    expect(screen.getByText('Use active verbs')).toBeInTheDocument();
    expect(screen.getByText('Lead with outcomes')).toBeInTheDocument();
  });

  it('renders dont list items', () => {
    renderWithRouter(<VoiceMessagingStage />);
    expect(screen.getByText('Use passive voice')).toBeInTheDocument();
    expect(screen.getByText('Make vague promises')).toBeInTheDocument();
  });

  it('renders sample messages', () => {
    renderWithRouter(<VoiceMessagingStage />);
    expect(screen.getByText(/"Set it up in 5 minutes\. Run it forever\."/)).toBeInTheDocument();
    expect(screen.getByText(/Addresses setup anxiety/)).toBeInTheDocument();
  });

  it('renders sample messages heading with count', () => {
    renderWithRouter(<VoiceMessagingStage />);
    expect(screen.getByText(/Sample Messages \(2\)/)).toBeInTheDocument();
  });
});

// ── T-027 Launch Prep ────────────────────────────────────────────────────────

describe('T-027 LaunchPrepStage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedStore.mockReturnValue(makeMockStore({
      ctx: {
        stage_drafts: { launch_prep: { stage: 'launch_prep', content: LAUNCH_PREP_FIXTURE, generated_at: '', attempt: 1 } },
        approved_decisions: {},
        critic_findings: [],
        consistency_findings: [],
      },
    }) as never);
  });

  it('renders the landing headline', () => {
    renderWithRouter(<LaunchPrepStage />);
    // Headline appears in preview div AND EditableField — use getAllByText
    const matches = screen.getAllByText(/Automate the work/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the social launch post', () => {
    renderWithRouter(<LaunchPrepStage />);
    // Post appears in display div AND EditableField value — use getAllByText
    const matches = screen.getAllByText(/Introducing Flowra/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the consistency audit unlock note', () => {
    renderWithRouter(<LaunchPrepStage />);
    // The text appears in description AND in the note — use getAllByText
    const matches = screen.getAllByText(/unlocks the Holistic Consistency Audit/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Landing Headline section heading', () => {
    renderWithRouter(<LaunchPrepStage />);
    expect(screen.getByRole('heading', { name: /Landing Headline/i })).toBeInTheDocument();
  });

  it('renders Social Launch Post section heading', () => {
    renderWithRouter(<LaunchPrepStage />);
    expect(screen.getByRole('heading', { name: /Social Launch Post/i })).toBeInTheDocument();
  });

  it('calls writeApprovedDecision when Approve is clicked with content present', async () => {
    mockedStore.mockReturnValue(makeMockStore({
      ctx: {
        stage_drafts: { launch_prep: { stage: 'launch_prep', content: LAUNCH_PREP_FIXTURE, generated_at: '', attempt: 1 } },
        approved_decisions: {},
        critic_findings: [],
        consistency_findings: [],
      },
      uiStates: {
        discovery: { approval_state: 'draft', is_loading: false, error: null },
        positioning: { approval_state: 'draft', is_loading: false, error: null },
        naming_personality: { approval_state: 'draft', is_loading: false, error: null },
        tagline_pitch: { approval_state: 'draft', is_loading: false, error: null },
        visual_brief: { approval_state: 'draft', is_loading: false, error: null },
        voice_messaging: { approval_state: 'draft', is_loading: false, error: null },
        launch_prep: { approval_state: 'critic_review', is_loading: false, error: null },
        consistency_audit: { approval_state: 'draft', is_loading: false, error: null },
        kit_export: { approval_state: 'draft', is_loading: false, error: null },
      },
    }) as never);
    renderWithRouter(<LaunchPrepStage />);
    const approveBtn = screen.getByRole('button', { name: /approve this draft/i });
    await userEvent.click(approveBtn);
    expect(mockWriteApproved).toHaveBeenCalledWith(
      'launch_prep',
      LAUNCH_PREP_FIXTURE,
      'user_edit',
      expect.any(String)
    );
  });
});

// ── EditableField integration ────────────────────────────────────────────────

describe('EditableField inline editing', () => {
  it('shows edit button on hover region', () => {
    render(
      <MemoryRouter>
        <LaunchPrepStage />
      </MemoryRouter>
    );
  });
});
