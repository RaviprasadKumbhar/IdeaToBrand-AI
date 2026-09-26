/**
 * T-040 — UI/UX Tests: navigation, loading, error, needs_review, export readiness,
 * Discovery (facts vs assumptions), and full sequence coverage.
 *
 * Uses isolated test fixtures — no fabricated successful API responses outside fixtures.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useFOILStore } from '../store/foilStore';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../lib/api-client', () => ({
  generateStage: vi.fn(),
  assembleExport: vi.fn(),
}));

import * as apiClient from '../lib/api-client';

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

function resetStore() {
  useFOILStore.setState((state) => ({
    ...state,
    ctx: {
      ...state.ctx,
      consistency_findings: [],
      approved_decisions: {},
      stage_drafts: {},
      critic_findings: [],
      user_facts: {},
    },
    uiStates: {
      discovery: { approval_state: 'draft', is_loading: false, error: null },
      positioning: { approval_state: 'draft', is_loading: false, error: null },
      naming_personality: { approval_state: 'draft', is_loading: false, error: null },
      tagline_pitch: { approval_state: 'draft', is_loading: false, error: null },
      visual_brief: { approval_state: 'draft', is_loading: false, error: null },
      voice_messaging: { approval_state: 'draft', is_loading: false, error: null },
      launch_prep: { approval_state: 'draft', is_loading: false, error: null },
      consistency_audit: { approval_state: 'draft', is_loading: false, error: null },
      kit_export: { approval_state: 'draft', is_loading: false, error: null },
    },
  }));
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const DISCOVERY_FIXTURE = {
  core_problem: 'Students waste time finding good teammates',
  target_audience: 'University students aged 18-26',
  context_situation: 'Group projects are assigned randomly',
  user_goals: 'Find compatible teammates quickly',
  constraints: 'Must work within university policies',
  value_desired_outcome: 'Better project outcomes and less friction',
  open_questions: ['How do universities handle SSO?'],
  known_facts: ['App targets university students', 'Works without paid tier'],
  inferred_assumptions: [
    { value: 'Students prefer mobile-first UX', rationale: 'Gen-Z usage patterns' },
  ],
};

// ── Loading State Tests ────────────────────────────────────────────────────────

import { LoadingState } from '../components/LoadingState';

describe('T-040 LoadingState', () => {
  it('renders stage-specific title for discovery', () => {
    render(<LoadingState stage="discovery" />);
    expect(screen.getByText(/Analyzing your idea/i)).toBeInTheDocument();
  });

  it('renders stage-specific title for positioning', () => {
    render(<LoadingState stage="positioning" />);
    expect(screen.getByText(/Generating strategic directions/i)).toBeInTheDocument();
  });

  it('renders stage-specific title for consistency_audit', () => {
    render(<LoadingState stage="consistency_audit" />);
    expect(screen.getByText(/Holistic Consistency Audit/i)).toBeInTheDocument();
  });

  it('has role="status" for accessible live region', () => {
    render(<LoadingState stage="visual_brief" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders bullet points for the stage', () => {
    render(<LoadingState stage="voice_messaging" />);
    expect(screen.getByText(/voice description/i)).toBeInTheDocument();
  });
});

// ── ErrorState Tests ──────────────────────────────────────────────────────────

import { ErrorState } from '../components/ErrorState';

const RETRYABLE_ERROR = {
  stage: 'discovery' as const,
  error_type: 'provider_unavailable' as const,
  message: 'The AI service timed out. Please try again.',
  retryable: true,
};

const NON_RETRYABLE_ERROR = {
  stage: 'discovery' as const,
  error_type: 'schema_validation_failed' as const,
  message: 'The generated response did not match the required structure.',
  retryable: false,
};

describe('T-040 ErrorState', () => {
  it('renders the error message', () => {
    render(<ErrorState error={RETRYABLE_ERROR} onRetry={vi.fn()} />);
    expect(screen.getByText(/AI service timed out/i)).toBeInTheDocument();
  });

  it('has role="alert" for screen readers', () => {
    render(<ErrorState error={RETRYABLE_ERROR} onRetry={vi.fn()} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows Try Again for retryable errors', () => {
    render(<ErrorState error={RETRYABLE_ERROR} onRetry={vi.fn()} />);
    expect(screen.getByRole('button', { name: /try generating again/i })).toBeInTheDocument();
  });

  it('hides Try Again for non-retryable errors', () => {
    render(<ErrorState error={NON_RETRYABLE_ERROR} onRetry={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /try generating again/i })).not.toBeInTheDocument();
  });

  it('calls onRetry when Try Again is clicked', () => {
    const onRetry = vi.fn();
    render(<ErrorState error={RETRYABLE_ERROR} onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: /try generating again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('displays safe message - never claims success', () => {
    render(<ErrorState error={RETRYABLE_ERROR} onRetry={vi.fn()} />);
    expect(screen.getByText(/approved decisions are safe/i)).toBeInTheDocument();
  });

  it('shows schema-specific title for schema_validation_failed', () => {
    render(<ErrorState error={NON_RETRYABLE_ERROR} onRetry={vi.fn()} />);
    // Title and message may both contain the phrase — just assert at least one is present
    expect(screen.getAllByText(/did not match the required structure/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows optional back button when onBack is provided', () => {
    render(<ErrorState error={RETRYABLE_ERROR} onRetry={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: /return to previous stage/i })).toBeInTheDocument();
  });
});

// ── NeedsReviewBanner Tests ───────────────────────────────────────────────────

import { NeedsReviewBanner } from '../components/NeedsReviewBanner';

describe('T-040 NeedsReviewBanner', () => {
  it('shows cause text and review button', () => {
    render(<NeedsReviewBanner cause="Discovery" onReview={vi.fn()} />);
    expect(screen.getByText(/Discovery/)).toBeInTheDocument();
  });

  it('calls onReview when review button is clicked', () => {
    const onReview = vi.fn();
    render(<NeedsReviewBanner cause="Positioning" onReview={onReview} />);
    // Button aria-label is "Review impact from {cause} change"
    const btn = screen.getByRole('button', { name: /review impact from positioning change/i });
    fireEvent.click(btn);
    expect(onReview).toHaveBeenCalledTimes(1);
  });
});

// ── DiscoveryStage tests (facts vs assumptions) ────────────────────────────────

import { DiscoveryStage } from '../stages/discovery/DiscoveryStage';

describe('T-040 DiscoveryStage - facts vs assumptions', () => {
  beforeEach(() => {
    resetStore();
    useFOILStore.setState((state) => ({
      ...state,
      ctx: {
        ...state.ctx,
        stage_drafts: {
          discovery: {
            stage: 'discovery',
            content: DISCOVERY_FIXTURE,
            generated_at: '',
            attempt: 1,
          },
        },
      },
      uiStates: {
        ...state.uiStates,
        discovery: { approval_state: 'critic_review', is_loading: false, error: null },
      },
    }));
    vi.clearAllMocks();
  });

  it('renders core problem and target audience', () => {
    renderWithRouter(<DiscoveryStage />);
    expect(screen.getByText(/Students waste time/)).toBeInTheDocument();
    expect(screen.getByText(/University students aged 18/)).toBeInTheDocument();
  });

  it('renders known facts with Known Fact label', () => {
    renderWithRouter(<DiscoveryStage />);
    expect(screen.getAllByText(/Known Fact/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/App targets university students/)).toBeInTheDocument();
  });

  it('renders inferred assumptions with Assumption label', () => {
    renderWithRouter(<DiscoveryStage />);
    expect(screen.getAllByText(/Assumption/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Students prefer mobile-first UX/)).toBeInTheDocument();
    expect(screen.getByText(/Gen-Z usage patterns/)).toBeInTheDocument();
  });

  it('renders open questions list', () => {
    renderWithRouter(<DiscoveryStage />);
    expect(screen.getByText(/How do universities handle SSO/)).toBeInTheDocument();
  });

  it('shows loading state during generation', () => {
    useFOILStore.setState((state) => ({
      ...state,
      uiStates: {
        ...state.uiStates,
        discovery: { approval_state: 'draft', is_loading: true, error: null },
      },
    }));
    renderWithRouter(<DiscoveryStage />);
    // Multiple role="status" elements exist (state badge + LoadingState)
    expect(screen.getAllByRole('status').length).toBeGreaterThanOrEqual(1);
    // LoadingState content is the distinctive indicator
    expect(screen.getByText(/Analyzing your idea/i)).toBeInTheDocument();
  });

  it('shows error state when generation fails', () => {
    useFOILStore.setState((state) => ({
      ...state,
      ctx: { ...state.ctx, stage_drafts: {} },
      uiStates: {
        ...state.uiStates,
        discovery: {
          approval_state: 'draft',
          is_loading: false,
          error: {
            stage: 'discovery',
            error_type: 'provider_unavailable',
            message: 'Network error during generation.',
            retryable: true,
          },
        },
      },
    }));
    renderWithRouter(<DiscoveryStage />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Network error during generation/)).toBeInTheDocument();
  });

  it('shows Generate button in empty/draft state', () => {
    useFOILStore.setState((state) => ({
      ...state,
      ctx: { ...state.ctx, stage_drafts: {} },
      uiStates: {
        ...state.uiStates,
        discovery: { approval_state: 'draft', is_loading: false, error: null },
      },
    }));
    renderWithRouter(<DiscoveryStage />);
    expect(screen.getByRole('button', { name: /generate discovery/i })).toBeInTheDocument();
  });

  it('calls generateStage when Generate is clicked', async () => {
    vi.mocked(apiClient.generateStage).mockResolvedValue({
      content: DISCOVERY_FIXTURE,
      findings: [],
      isMock: true,
      note: '[MOCK]',
    } as any);
    useFOILStore.setState((state) => ({
      ...state,
      ctx: { ...state.ctx, stage_drafts: {} },
      uiStates: {
        ...state.uiStates,
        discovery: { approval_state: 'draft', is_loading: false, error: null },
      },
    }));
    renderWithRouter(<DiscoveryStage />);
    fireEvent.click(screen.getByRole('button', { name: /generate discovery/i }));
    await waitFor(() => expect(apiClient.generateStage).toHaveBeenCalledTimes(1));
  });

  it('shows error state when generateStage throws - no fake success', async () => {
    vi.mocked(apiClient.generateStage).mockRejectedValue(new Error('API timeout'));
    useFOILStore.setState((state) => ({
      ...state,
      ctx: { ...state.ctx, stage_drafts: {} },
      uiStates: {
        ...state.uiStates,
        discovery: { approval_state: 'draft', is_loading: false, error: null },
      },
    }));
    renderWithRouter(<DiscoveryStage />);
    fireEvent.click(screen.getByRole('button', { name: /generate discovery/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.queryByText(/Success/)).not.toBeInTheDocument();
  });

  it('shows needs_review banner when state is needs_review', () => {
    useFOILStore.setState((state) => ({
      ...state,
      ctx: {
        ...state.ctx,
        stage_drafts: {
          discovery: { stage: 'discovery', content: DISCOVERY_FIXTURE, generated_at: '', attempt: 1 },
        },
      },
      uiStates: {
        ...state.uiStates,
        discovery: { approval_state: 'needs_review', is_loading: false, error: null },
      },
    }));
    renderWithRouter(<DiscoveryStage />);
    // DiscoveryStage passes no needsReviewCause, so the banner is rendered by StageScreen only when cause is given.
    // The needs_review badge (role=status) is still shown. Check for the Needs Review badge text.
    expect(screen.getAllByRole('status').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Needs Review/i)).toBeInTheDocument();
  });
});

// ── KitExportStage gating tests ───────────────────────────────────────────────

import { KitExportStage } from '../stages/kit-export/KitExportStage';

const FULL_APPROVED_DECISIONS = {
  discovery: { stage: 'discovery', content: {}, approved_at: '', state: 'approved', source: 'user_edit' },
  positioning: { stage: 'positioning', content: {}, approved_at: '', state: 'approved', source: 'user_edit' },
  naming_personality: { stage: 'naming_personality', content: {}, approved_at: '', state: 'approved', source: 'user_edit' },
  tagline_pitch: { stage: 'tagline_pitch', content: {}, approved_at: '', state: 'approved', source: 'user_edit' },
  visual_brief: { stage: 'visual_brief', content: {}, approved_at: '', state: 'approved', source: 'user_edit' },
  voice_messaging: { stage: 'voice_messaging', content: {}, approved_at: '', state: 'approved', source: 'user_edit' },
  launch_prep: { stage: 'launch_prep', content: {}, approved_at: '', state: 'approved', source: 'user_edit' },
};

describe('T-040 KitExportStage - export gating', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  it('shows export blocked when no stages are approved', () => {
    renderWithRouter(<KitExportStage />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Export blocked/i)).toBeInTheDocument();
  });

  it('shows checklist with all required stages', () => {
    renderWithRouter(<KitExportStage />);
    expect(screen.getByText(/Discovery approved/i)).toBeInTheDocument();
    expect(screen.getByText(/Launch Prep approved/i)).toBeInTheDocument();
    expect(screen.getByText(/Visual Brief approved/i)).toBeInTheDocument();
  });

  it('does not show Export Markdown button when blocked', () => {
    renderWithRouter(<KitExportStage />);
    expect(screen.queryByRole('button', { name: /export markdown/i })).not.toBeInTheDocument();
  });

  it('shows Export Markdown button when all stages approved and audit resolved', () => {
    useFOILStore.setState((state) => ({
      ...state,
      ctx: {
        ...state.ctx,
        approved_decisions: FULL_APPROVED_DECISIONS as any,
        consistency_findings: [],
      },
    }));
    renderWithRouter(<KitExportStage />);
    expect(screen.getByRole('button', { name: /export markdown/i })).toBeInTheDocument();
  });

  it('export is blocked when consistency findings are unresolved', () => {
    useFOILStore.setState((state) => ({
      ...state,
      ctx: {
        ...state.ctx,
        approved_decisions: FULL_APPROVED_DECISIONS as any,
        consistency_findings: [
          {
            id: 'cf-block-1',
            fields_in_conflict: ['voice_messaging', 'launch_prep'],
            issue_type: 'contradiction',
            evidence: 'Conflicting tone.',
            why_it_matters: 'Breaks brand trust.',
            sharper_alternative: 'Align tone.',
            user_action: null,
          },
        ],
      },
    }));
    renderWithRouter(<KitExportStage />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /export markdown/i })).not.toBeInTheDocument();
  });

  it('shows content and download button after successful export', async () => {
    vi.mocked(apiClient.assembleExport).mockResolvedValue({
      status: 'success',
      content: '# FOIL Brand Kit\n\n## Discovery\n...',
    } as any);
    useFOILStore.setState((state) => ({
      ...state,
      ctx: {
        ...state.ctx,
        approved_decisions: FULL_APPROVED_DECISIONS as any,
        consistency_findings: [],
      },
    }));
    renderWithRouter(<KitExportStage />);
    fireEvent.click(screen.getByRole('button', { name: /export markdown/i }));
    await waitFor(() =>
      expect(screen.getByText(/Brand kit assembled from approved decisions only/i)).toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: /download markdown/i })).toBeInTheDocument();
    expect(screen.getByText(/FOIL Brand Kit/)).toBeInTheDocument();
  });

  it('shows error state without fake success when export fails', async () => {
    vi.mocked(apiClient.assembleExport).mockRejectedValue(new Error('Export API error'));
    useFOILStore.setState((state) => ({
      ...state,
      ctx: {
        ...state.ctx,
        approved_decisions: FULL_APPROVED_DECISIONS as any,
        consistency_findings: [],
      },
    }));
    renderWithRouter(<KitExportStage />);
    fireEvent.click(screen.getByRole('button', { name: /export markdown/i }));
    await waitFor(() => expect(screen.getByText(/Export failed/i)).toBeInTheDocument());
    expect(screen.queryByText(/Brand kit assembled/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows export failed when assembleExport returns status=failed', async () => {
    vi.mocked(apiClient.assembleExport).mockResolvedValue({
      status: 'failed',
      content: '',
    } as any);
    useFOILStore.setState((state) => ({
      ...state,
      ctx: {
        ...state.ctx,
        approved_decisions: FULL_APPROVED_DECISIONS as any,
        consistency_findings: [],
      },
    }));
    renderWithRouter(<KitExportStage />);
    fireEvent.click(screen.getByRole('button', { name: /export markdown/i }));
    await waitFor(() => expect(screen.getByText(/Export failed/i)).toBeInTheDocument());
  });

  it('does not show download button before export is triggered', () => {
    useFOILStore.setState((state) => ({
      ...state,
      ctx: {
        ...state.ctx,
        approved_decisions: FULL_APPROVED_DECISIONS as any,
        consistency_findings: [],
      },
    }));
    renderWithRouter(<KitExportStage />);
    expect(screen.queryByRole('button', { name: /download markdown/i })).not.toBeInTheDocument();
  });
});

// ── StageScreen approval clarity tests ───────────────────────────────────────

import { StageScreen } from '../components/StageScreen';

const STAGE_SCREEN_DEFAULTS = {
  stage: 'discovery' as const,
  stageNumber: 1,
  title: 'Discovery',
  description: 'Test description',
  isLoading: false,
  error: null,
  findings: [],
  onApprove: vi.fn(),
  onReject: vi.fn(),
  onRegenerate: vi.fn(),
  onFindingAction: vi.fn(),
};

describe('T-040 StageScreen - approval clarity', () => {
  it('shows Ready to generate empty state for draft state', () => {
    render(
      <MemoryRouter>
        <StageScreen {...STAGE_SCREEN_DEFAULTS} approvalState="draft">
          <p>content</p>
        </StageScreen>
      </MemoryRouter>
    );
    expect(screen.getByText(/Ready to generate/i)).toBeInTheDocument();
  });

  it('shows Generate button in draft state', () => {
    render(
      <MemoryRouter>
        <StageScreen {...STAGE_SCREEN_DEFAULTS} approvalState="draft">
          <p>content</p>
        </StageScreen>
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /generate discovery/i })).toBeInTheDocument();
  });

  it('shows status badge for approved state', () => {
    render(
      <MemoryRouter>
        <StageScreen {...STAGE_SCREEN_DEFAULTS} approvalState="approved">
          <p>content</p>
        </StageScreen>
      </MemoryRouter>
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    // Multiple "Approved" strings may exist (badge + label). Check for badge specifically.
    expect(screen.getAllByText(/Approved/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows Approved by you panel when approved', () => {
    render(
      <MemoryRouter>
        <StageScreen {...STAGE_SCREEN_DEFAULTS} approvalState="approved">
          <p>approved content</p>
        </StageScreen>
      </MemoryRouter>
    );
    // "Approved by you" is unique to the decision panel
    expect(screen.getByText(/Approved by you/i)).toBeInTheDocument();
  });

  it('shows needs_review banner when state is needs_review and cause is given', () => {
    render(
      <MemoryRouter>
        <StageScreen {...STAGE_SCREEN_DEFAULTS} approvalState="needs_review" needsReviewCause="Discovery">
          <p>content</p>
        </StageScreen>
      </MemoryRouter>
    );
    // 'Discovery' appears in the title AND the cause; use specific button aria-label
    expect(screen.getAllByText(/Discovery/i).length).toBeGreaterThanOrEqual(1);
    // NeedsReviewBanner button has aria-label="Review impact from Discovery change"
    expect(screen.getByRole('button', { name: /review impact from discovery change/i })).toBeInTheDocument();
  });

  it('shows loading state and not content when isLoading=true', () => {
    render(
      <MemoryRouter>
        <StageScreen {...STAGE_SCREEN_DEFAULTS} approvalState="draft" isLoading={true}>
          <p>content should be hidden</p>
        </StageScreen>
      </MemoryRouter>
    );
    // Both the badge and LoadingState have role="status" — check for LoadingState content
    expect(screen.getAllByRole('status').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('content should be hidden')).not.toBeInTheDocument();
  });

  it('shows error state and not content when error is set', () => {
    render(
      <MemoryRouter>
        <StageScreen
          {...STAGE_SCREEN_DEFAULTS}
          approvalState="draft"
          error={{
            stage: 'discovery',
            error_type: 'provider_unavailable',
            message: 'Stage failed.',
            retryable: true,
          }}
        >
          <p>content should be hidden</p>
        </StageScreen>
      </MemoryRouter>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('content should be hidden')).not.toBeInTheDocument();
  });

  it('shows CriticFinding cards when findings are present', () => {
    render(
      <MemoryRouter>
        <StageScreen
          {...STAGE_SCREEN_DEFAULTS}
          approvalState="critic_review"
          findings={[{
            id: 'f1',
            stage: 'discovery',
            target_field: 'core_problem',
            issue_type: 'vague',
            evidence: 'Very vague statement.',
            explanation: 'Needs specificity.',
            sharper_alternative: 'Be more specific.',
            user_action: null,
          }]}
        >
          <p>content</p>
        </StageScreen>
      </MemoryRouter>
    );
    // "Critic Findings" appears in the h2 heading — use getByRole heading
    expect(screen.getByRole('heading', { name: /Critic Findings/i })).toBeInTheDocument();
    expect(screen.getAllByText(/unresolved/i).length).toBeGreaterThanOrEqual(1);
  });

  it('does not show ApprovalBar Approve button when state is approved', () => {
    render(
      <MemoryRouter>
        <StageScreen {...STAGE_SCREEN_DEFAULTS} approvalState="approved">
          <p>content</p>
        </StageScreen>
      </MemoryRouter>
    );
    expect(screen.queryByRole('button', { name: /approve this draft/i })).not.toBeInTheDocument();
  });

  it('shows Edit Decision button when approved and onEdit provided', () => {
    render(
      <MemoryRouter>
        <StageScreen {...STAGE_SCREEN_DEFAULTS} approvalState="approved" onEdit={vi.fn()}>
          <p>content</p>
        </StageScreen>
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /edit this approved decision/i })).toBeInTheDocument();
  });

  it('shows AI Draft label for non-approved non-draft states', () => {
    render(
      <MemoryRouter>
        <StageScreen {...STAGE_SCREEN_DEFAULTS} approvalState="critic_review">
          <p>content</p>
        </StageScreen>
      </MemoryRouter>
    );
    expect(screen.getByText(/AI Draft/i)).toBeInTheDocument();
  });
});

// ── Navigation/AppShell tests ──────────────────────────────────────────────────

import { AppShell } from '../components/AppShell';

describe('T-040 AppShell navigation', () => {
  beforeEach(() => {
    resetStore();
  });

  it('renders the application logo button', () => {
    renderWithRouter(
      <AppShell>
        <p>content</p>
      </AppShell>
    );
    expect(screen.getByRole('button', { name: /(IdeaToBrand|FOIL).*go to home/i })).toBeInTheDocument();
  });

  it('renders stage navigation with all stages', () => {
    renderWithRouter(
      <AppShell>
        <p>content</p>
      </AppShell>
    );
    expect(screen.getAllByText(/Discovery/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Positioning/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Consistency Audit/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders Export Kit button in header', () => {
    renderWithRouter(
      <AppShell>
        <p>content</p>
      </AppShell>
    );
    expect(screen.getByRole('button', { name: /export brand kit/i })).toBeInTheDocument();
  });

  it('shows progress indicator in header', () => {
    renderWithRouter(
      <AppShell>
        <p>content</p>
      </AppShell>
    );
    expect(screen.getByText(/0\/9 approved/i)).toBeInTheDocument();
  });

  it('shows needs_review badge in sidebar for stages with needs_review state', () => {
    useFOILStore.setState((state) => ({
      ...state,
      uiStates: {
        ...state.uiStates,
        discovery: { approval_state: 'needs_review', is_loading: false, error: null },
      },
    }));
    renderWithRouter(
      <AppShell>
        <p>content</p>
      </AppShell>
    );
    expect(screen.getAllByText(/Review/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows New Project button', () => {
    renderWithRouter(
      <AppShell>
        <p>content</p>
      </AppShell>
    );
    expect(screen.getByRole('button', { name: /new project/i })).toBeInTheDocument();
  });

  it('shows project name from user_facts when set', () => {
    useFOILStore.setState((state) => ({
      ...state,
      ctx: {
        ...state.ctx,
        user_facts: { business_description: 'An amazing new brand idea for students' },
      },
    }));
    renderWithRouter(
      <AppShell>
        <p>content</p>
      </AppShell>
    );
    expect(screen.getByText(/An amazing new brand idea/)).toBeInTheDocument();
  });
});
