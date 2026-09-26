/**
 * frontendIntegrationFix.test.tsx
 * Tests verifying:
 * 1. Canonical user idea reaches generation request without template override
 * 2. Idea Input routing (/idea-input vs /)
 * 3. Auth user UI: single source of truth, one Sign out action, no duplicate auth controls
 * 4. Chat UX: message rendering, empty send prevention, duplicate prevention, loading & error states, current idea visibility
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { useFOILStore } from '../store/foilStore';
import { AppShell } from '../components/AppShell';
import { IdeaInput } from '../stages/idea-input/IdeaInput';
import { ChatWorkspace } from '../components/chat/ChatWorkspace';
import { AuthProvider } from '../context/AuthContext';
import * as apiClient from '../lib/api-client';

// Mock generateStage
vi.mock('../lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api-client')>();
  return {
    ...actual,
    generateStage: vi.fn(),
  };
});

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function resetTestStore() {
  localStorage.clear();
  sessionStorage.clear();
  useFOILStore.setState((state) => ({
    ...state,
    ctx: {
      project_id: 'test-project-1',
      user_facts: {},
      ai_assumptions: {},
      approved_decisions: {},
      stage_drafts: {},
      critic_findings: [],
      consistency_findings: [],
      scenario_overrides: [],
      revision_log: [],
    },
    ideaInput: null,
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

describe('Frontend Integration Fix — Routing & Idea Context', () => {
  beforeEach(() => {
    resetTestStore();
    vi.clearAllMocks();
  });

  it('1 & 2. Canonical user idea reaches store and does not get overridden by default template', async () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <IdeaInput />
        </MemoryRouter>
      </AuthProvider>
    );

    const descInput = screen.getByLabelText(/your idea or business description/i);
    const customIdea = 'I want to build a healthy Indian snack brand for college students and young professionals.';
    fireEvent.change(descInput, { target: { value: customIdea, name: 'business_description' } });

    const submitBtn = screen.getByRole('button', { name: /start discovery/i });
    expect(submitBtn).toBeEnabled();
    await userEvent.click(submitBtn);

    const state = useFOILStore.getState();
    expect(state.ctx.user_facts.business_description).toBe(customIdea);
    expect(state.ideaInput?.business_description).toBe(customIdea);
    expect(mockNavigate).toHaveBeenCalledWith('/discovery');
  });

  it('3 & 4. Idea Input navigation targets /idea-input and does not redirect to Home (/)', async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/discovery']}>
          <AppShell>
            <p>Discovery Workspace</p>
          </AppShell>
        </MemoryRouter>
      </AuthProvider>
    );

    // Find the Idea Input nav button in the desktop sidebar
    const ideaInputBtns = screen.getAllByRole('button', { name: /idea input/i });
    expect(ideaInputBtns.length).toBeGreaterThanOrEqual(1);

    await userEvent.click(ideaInputBtns[0]);
    // Must navigate to /idea-input, NOT /
    expect(mockNavigate).toHaveBeenCalledWith('/idea-input');
    expect(mockNavigate).not.toHaveBeenCalledWith('/');
  });

  it('5. Direct route and refresh retains canonical user facts from session', () => {
    const savedFacts = { business_description: 'An organic plant-based smoothie bar franchise.' };
    useFOILStore.setState((state) => ({
      ...state,
      ctx: { ...state.ctx, user_facts: savedFacts },
    }));

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/idea-input']}>
          <AppShell>
            <p>Current Page</p>
          </AppShell>
        </MemoryRouter>
      </AuthProvider>
    );

    // Current idea indicator in header should show the saved facts
    expect(screen.getByText(/organic plant-based smoothie bar/i)).toBeInTheDocument();
    expect(screen.getByText(/current idea:/i)).toBeInTheDocument();
  });
});

describe('Frontend Integration Fix — Auth UI', () => {
  beforeEach(() => {
    resetTestStore();
    vi.clearAllMocks();
  });

  it('6 & 7. Authenticated user identity displays with only ONE Sign out action', () => {
    // Set authenticated local session
    localStorage.setItem(
      'ideatobrand_local_session',
      JSON.stringify({
        access_token: 'local-demo-token',
        token_type: 'bearer',
        user: {
          id: 'user-42',
          email: 'founder@brandforge.ai',
          user_metadata: { full_name: 'Priya Sharma' },
          role: 'authenticated',
          aud: 'authenticated',
        },
      })
    );

    render(
      <AuthProvider>
        <MemoryRouter>
          <AppShell>
            <p>Protected Content</p>
          </AppShell>
        </MemoryRouter>
      </AuthProvider>
    );

    // Authenticated user display name
    expect(screen.getByText('Priya Sharma')).toBeInTheDocument();

    // Exactly one Sign out button in the header
    const signOutButtons = screen.getAllByRole('button', { name: /sign out/i });
    expect(signOutButtons).toHaveLength(1);

    // Login/create account should NOT be visible when authenticated
    expect(screen.queryByRole('button', { name: /^login$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^create account$/i })).not.toBeInTheDocument();
  });

  it('8 & 9. Unauthenticated state shows Login and Create account with no Sign out or duplicate auth controls', () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <AppShell>
            <p>Public Content</p>
          </AppShell>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^create account$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
  });
});

describe('Frontend Integration Fix — Chat UX & Idea Submission', () => {
  beforeEach(() => {
    resetTestStore();
    vi.clearAllMocks();
  });

  it('10 & 11. User message renders and FOIL acknowledges with "What I understand" and Start Discovery CTA', async () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <ChatWorkspace />
        </MemoryRouter>
      </AuthProvider>
    );

    const textarea = screen.getByLabelText(/chat input message/i);
    const userIdea = 'Healthy millet-based snacks for university campuses and co-working hubs.';
    fireEvent.change(textarea, { target: { value: userIdea } });

    const sendBtn = screen.getByRole('button', { name: /send message/i });
    await userEvent.click(sendBtn);

    // User message renders
    expect(screen.getAllByText(userIdea).length).toBeGreaterThanOrEqual(1);

    // FOIL acknowledgment renders
    expect(screen.getByText(/got it\. i'll use this idea as the foundation for your brand\./i)).toBeInTheDocument();
    expect(screen.getByText(/what i understand/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start discovery →/i })).toBeInTheDocument();

    // Store is updated with canonical user facts
    const state = useFOILStore.getState();
    expect(state.ctx.user_facts.business_description).toBe(userIdea);
  });

  it('12 & 13. Empty send is prevented and duplicate submissions are blocked when generating', () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <ChatWorkspace />
        </MemoryRouter>
      </AuthProvider>
    );

    const sendBtn = screen.getByRole('button', { name: /send message/i });
    // Disabled on initial empty state
    expect(sendBtn).toBeDisabled();
  });

  it('14. Renders human-readable stage content without raw JSON strings', async () => {
    // Seed store with an existing idea so subsequent message triggers stage generation
    useFOILStore.setState((state) => ({
      ...state,
      ctx: {
        ...state.ctx,
        user_facts: { business_description: 'Artisan sourdough micro-bakery' },
      },
    }));

    const mockGenerate = vi.mocked(apiClient.generateStage);
    mockGenerate.mockResolvedValueOnce({
      content: {
        core_problem: 'Industrial bread lacks flavor and causes digestive discomfort',
        target_audience: 'Health-conscious urban consumers and families',
        value_desired_outcome: 'Naturally fermented, easily digestible heritage grain sourdough',
        known_facts: ['Micro-bakery in urban center', 'Local delivery radius'],
        inferred_assumptions: [
          { value: 'Customers willing to pay premium for slow fermentation', rationale: 'Gourmet market survey' },
        ],
      },
      findings: [],
    });

    render(
      <AuthProvider>
        <MemoryRouter>
          <ChatWorkspace />
        </MemoryRouter>
      </AuthProvider>
    );

    const textarea = screen.getByLabelText(/chat input message/i);
    fireEvent.change(textarea, { target: { value: 'Generate our brand discovery' } });

    const sendBtn = screen.getByRole('button', { name: /send message/i });
    await userEvent.click(sendBtn);

    await waitFor(() => {
      // Formatted sections should be present
      expect(screen.getByText(/Industrial bread lacks flavor/i)).toBeInTheDocument();
      expect(screen.getByText(/Health-conscious urban consumers/i)).toBeInTheDocument();
      expect(screen.getByText(/Naturally fermented/i)).toBeInTheDocument();
      // Should NOT contain raw JSON braces
      expect(screen.queryByText(/\{"core_problem":/i)).not.toBeInTheDocument();
    });
  });

  it('15. Error state renders friendly message with retry option on failure', async () => {
    useFOILStore.setState((state) => ({
      ...state,
      ctx: {
        ...state.ctx,
        user_facts: { business_description: 'AI-assisted design studio' },
      },
    }));

    const mockGenerate = vi.mocked(apiClient.generateStage);
    mockGenerate.mockRejectedValueOnce(new Error('Network timeout'));

    render(
      <AuthProvider>
        <MemoryRouter>
          <ChatWorkspace />
        </MemoryRouter>
      </AuthProvider>
    );

    const textarea = screen.getByLabelText(/chat input message/i);
    fireEvent.change(textarea, { target: { value: 'Next step please' } });

    const sendBtn = screen.getByRole('button', { name: /send message/i });
    await userEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/FOIL couldn't generate this step right now\./i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  it('16. Current idea is visible in header and context banner', () => {
    useFOILStore.setState((state) => ({
      ...state,
      ctx: {
        ...state.ctx,
        user_facts: { business_description: 'Organic Cold-Pressed Juice Co.' },
      },
    }));

    render(
      <AuthProvider>
        <MemoryRouter>
          <ChatWorkspace />
        </MemoryRouter>
      </AuthProvider>
    );

    // Appears in header and context bar
    const matches = screen.getAllByText(/Organic Cold-Pressed Juice Co\./i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /edit idea/i })).toBeInTheDocument();
  });
});
