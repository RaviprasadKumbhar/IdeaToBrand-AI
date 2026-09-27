import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ScenarioProbePage } from '../stages/scenario-probe/ScenarioProbePage';
import { ConsistencyAuditStage } from '../stages/consistency-audit/ConsistencyAuditStage';
import { useFOILStore } from '../store/foilStore';

vi.mock('../lib/api-client', () => ({
  runScenarioProbe: vi.fn(),
  runConsistencyAudit: vi.fn(),
  resolveConsistencyFinding: vi.fn().mockResolvedValue({ context: {}, findings: [] }),
}));

import * as apiClient from '../lib/api-client';

const mockProbeResult = {
  isMock: true,
  note: '[MOCK]',
  scenario_id: 'scenario-test-1',
  what_if_input: 'What if we target graduate researchers?',
  triggered_from_stage: 'positioning',
  affected_stages: ['positioning', 'naming_personality'],
  changed_fields: [
    {
      stage: 'positioning',
      field_name: 'target_audience',
      original_value: 'University students (18-26)',
      branch_value: 'Graduate researchers (22-28)',
    },
    {
      stage: 'naming_personality',
      field_name: 'proposed_name',
      original_value: 'Koru',
      branch_value: 'ResearchNest',
    },
  ],
  branch_critic_findings: [
    {
      id: 'finding-1',
      stage: 'naming_personality',
      target_field: 'proposed_name',
      issue_type: 'vague',
      evidence: '"ResearchNest" narrows market scope.',
      explanation: 'Name shifts audience too aggressively.',
      sharper_alternative: 'Consider Nexis.',
      user_action: null,
    },
  ],
};

const mockConsistencyResult = {
  isMock: true,
  note: '[MOCK]',
  findings: [
    {
      id: 'cf-1',
      fields_in_conflict: ['voice_messaging', 'launch_prep'],
      issue_type: 'contradiction',
      evidence: 'Voice says non-patronizing; post says "Tired of..."',
      why_it_matters: 'Inconsistent tone undermines brand trust.',
      sharper_alternative: 'Reframe opening to peer-level statement.',
      user_action: null,
    },
  ],
};

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

function resetStore() {
  useFOILStore.setState((state) => ({
    ...state,
    ctx: {
      ...state.ctx,
      consistency_findings: [],
      scenario_overrides: [],
      revision_log: [],
      approved_decisions: {},
    },
  }));
}

describe('T-030 ScenarioProbePage', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  it('renders the input phase by default', () => {
    renderWithRouter(<ScenarioProbePage />);
    expect(screen.getByRole('heading', { name: /What-If Scenario/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /What-if scenario/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Run Scenario Probe/i })).toBeInTheDocument();
  });

  it('shows isolation notice to user', () => {
    renderWithRouter(<ScenarioProbePage />);
    expect(screen.getByText(/branch runs in isolation/i)).toBeInTheDocument();
  });

  it('disables Run button when input is too short', () => {
    renderWithRouter(<ScenarioProbePage />);
    const btn = screen.getByRole('button', { name: /Run Scenario Probe/i });
    expect(btn).toHaveAttribute('aria-disabled', 'true');
  });

  it('enables Run button when input is long enough', () => {
    renderWithRouter(<ScenarioProbePage />);
    const textarea = screen.getByRole('textbox', { name: /What-if scenario/i });
    fireEvent.change(textarea, { target: { value: 'What if we target graduate researchers?' } });
    const btn = screen.getByRole('button', { name: /Run Scenario Probe/i });
    expect(btn).toHaveAttribute('aria-disabled', 'false');
  });

  it('calls runScenarioProbe with correct args on submit', async () => {
    vi.mocked(apiClient.runScenarioProbe).mockResolvedValue(mockProbeResult as any);
    renderWithRouter(<ScenarioProbePage />);
    const textarea = screen.getByRole('textbox', { name: /What-if scenario/i });
    fireEvent.change(textarea, { target: { value: 'What if we target graduate researchers?' } });
    fireEvent.click(screen.getByRole('button', { name: /Run Scenario Probe/i }));
    await waitFor(() => expect(apiClient.runScenarioProbe).toHaveBeenCalledTimes(1));
  });

  it('shows original and branch values side by side after probe runs', async () => {
    vi.mocked(apiClient.runScenarioProbe).mockResolvedValue(mockProbeResult as any);
    renderWithRouter(<ScenarioProbePage />);
    fireEvent.change(screen.getByRole('textbox', { name: /What-if scenario/i }), {
      target: { value: 'What if we target graduate researchers?' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Run Scenario Probe/i }));

    await waitFor(() => expect(screen.getByText(/Changed Fields/i)).toBeInTheDocument());

    expect(screen.getAllByLabelText(/Original value/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByLabelText(/Branch value/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('University students (18-26)')).toBeInTheDocument();
    expect(screen.getByText('Graduate researchers (22-28)')).toBeInTheDocument();
  });

  it('shows branch critic findings after probe runs', async () => {
    vi.mocked(apiClient.runScenarioProbe).mockResolvedValue(mockProbeResult as any);
    renderWithRouter(<ScenarioProbePage />);
    fireEvent.change(screen.getByRole('textbox', { name: /What-if scenario/i }), {
      target: { value: 'What if we target graduate researchers?' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Run Scenario Probe/i }));

    await waitFor(() => expect(screen.getByText(/Critic Findings for Branch/i)).toBeInTheDocument());
    expect(screen.getByText(/"ResearchNest" narrows market scope./)).toBeInTheDocument();
  });

  it('shows affected downstream stages', async () => {
    vi.mocked(apiClient.runScenarioProbe).mockResolvedValue(mockProbeResult as any);
    renderWithRouter(<ScenarioProbePage />);
    fireEvent.change(screen.getByRole('textbox', { name: /What-if scenario/i }), {
      target: { value: 'What if we target graduate researchers?' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Run Scenario Probe/i }));

    await waitFor(() => expect(screen.getByText(/Downstream Stages Affected/i)).toBeInTheDocument());
    const list = screen.getByRole('list', { name: /Affected downstream stages/i });
    expect(within(list).getByText(/Positioning/i)).toBeInTheDocument();
  });

  it('shows Accept Branch, Keep Original, and Edit buttons', async () => {
    vi.mocked(apiClient.runScenarioProbe).mockResolvedValue(mockProbeResult as any);
    renderWithRouter(<ScenarioProbePage />);
    fireEvent.change(screen.getByRole('textbox', { name: /What-if scenario/i }), {
      target: { value: 'What if we target graduate researchers?' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Run Scenario Probe/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /Accept Branch/i })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Keep Original/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit Scenario/i })).toBeInTheDocument();
  });

  it('does NOT modify original before Accept Branch is clicked', async () => {
    vi.mocked(apiClient.runScenarioProbe).mockResolvedValue(mockProbeResult as any);
    renderWithRouter(<ScenarioProbePage />);
    fireEvent.change(screen.getByRole('textbox', { name: /What-if scenario/i }), {
      target: { value: 'What if we target graduate researchers?' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Run Scenario Probe/i }));

    await waitFor(() => screen.getByRole('button', { name: /Accept Branch/i }));

    const store = useFOILStore.getState();
    const revisionLogLength = store.ctx.revision_log.length;
    expect(revisionLogLength).toBe(0);
  });

  it('accepts branch and shows confirmation', async () => {
    vi.mocked(apiClient.runScenarioProbe).mockResolvedValue(mockProbeResult as any);

    useFOILStore.setState((state) => ({
      ...state,
      ctx: {
        ...state.ctx,
        approved_decisions: {
          positioning: {
            stage: 'positioning',
            content: { target_audience: 'University students (18-26)' },
            approved_at: new Date().toISOString(),
            state: 'approved',
            source: 'strategist_approved',
          },
          naming_personality: {
            stage: 'naming_personality',
            content: { proposed_name: 'Koru' },
            approved_at: new Date().toISOString(),
            state: 'approved',
            source: 'strategist_approved',
          },
        },
      },
    }));

    renderWithRouter(<ScenarioProbePage />);
    fireEvent.change(screen.getByRole('textbox', { name: /What-if scenario/i }), {
      target: { value: 'What if we target graduate researchers?' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Run Scenario Probe/i }));

    await waitFor(() => screen.getByRole('button', { name: /Accept Branch/i }));
    fireEvent.click(screen.getByRole('button', { name: /Accept Branch/i }));

    await waitFor(() => expect(screen.getByText(/Branch accepted/i)).toBeInTheDocument());

    const store = useFOILStore.getState();
    expect(store.ctx.revision_log.length).toBeGreaterThan(0);
    expect(store.ctx.scenario_overrides.length).toBeGreaterThan(0);
    expect(store.ctx.scenario_overrides[0].decision).toBe('accept_branch');
  });

  it('keeps original and shows confirmation without modifying approvals', async () => {
    vi.mocked(apiClient.runScenarioProbe).mockResolvedValue(mockProbeResult as any);
    renderWithRouter(<ScenarioProbePage />);
    fireEvent.change(screen.getByRole('textbox', { name: /What-if scenario/i }), {
      target: { value: 'What if we target graduate researchers?' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Run Scenario Probe/i }));

    await waitFor(() => screen.getByRole('button', { name: /Keep Original/i }));
    fireEvent.click(screen.getByRole('button', { name: /Keep Original/i }));

    await waitFor(() => expect(screen.getByText(/Original kept/i)).toBeInTheDocument());

    const store = useFOILStore.getState();
    expect(store.ctx.scenario_overrides[0].decision).toBe('keep_original');
    expect(store.ctx.revision_log.length).toBe(0);
  });

  it('shows API error state without modifying approvals', async () => {
    vi.mocked(apiClient.runScenarioProbe).mockRejectedValue(new Error('Network error'));
    renderWithRouter(<ScenarioProbePage />);
    fireEvent.change(screen.getByRole('textbox', { name: /What-if scenario/i }), {
      target: { value: 'What if we target graduate researchers?' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Run Scenario Probe/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/Scenario Probe failed/i)).toBeInTheDocument();
    expect(screen.getByText(/original approved decisions are unchanged/i)).toBeInTheDocument();
  });
});

describe('T-032 ConsistencyAuditStage', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  it('shows Launch Prep gate when launch_prep is not approved', () => {
    renderWithRouter(<ConsistencyAuditStage />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Launch Prep must be approved/i)).toBeInTheDocument();
  });

  it('shows run button when launch_prep is approved', () => {
    useFOILStore.setState((state) => ({
      ...state,
      ctx: {
        ...state.ctx,
        approved_decisions: {
          launch_prep: {
            stage: 'launch_prep',
            content: { landing_headline: 'Test headline' },
            approved_at: new Date().toISOString(),
            state: 'approved',
            source: 'strategist_approved',
          },
        },
      },
    }));
    renderWithRouter(<ConsistencyAuditStage />);
    expect(screen.getByRole('button', { name: /Run Holistic Consistency Audit/i })).toBeInTheDocument();
  });

  it('calls runConsistencyAudit with approved decisions on click', async () => {
    vi.mocked(apiClient.runConsistencyAudit).mockResolvedValue(mockConsistencyResult as any);
    useFOILStore.setState((state) => ({
      ...state,
      ctx: {
        ...state.ctx,
        approved_decisions: {
          launch_prep: {
            stage: 'launch_prep',
            content: {},
            approved_at: new Date().toISOString(),
            state: 'approved',
            source: 'strategist_approved',
          },
        },
      },
    }));
    renderWithRouter(<ConsistencyAuditStage />);
    fireEvent.click(screen.getByRole('button', { name: /Run Holistic Consistency Audit/i }));
    await waitFor(() => expect(apiClient.runConsistencyAudit).toHaveBeenCalledTimes(1));
  });

  it('renders all required finding fields after audit runs', async () => {
    vi.mocked(apiClient.runConsistencyAudit).mockResolvedValue(mockConsistencyResult as any);
    useFOILStore.setState((state) => ({
      ...state,
      ctx: {
        ...state.ctx,
        approved_decisions: {
          launch_prep: {
            stage: 'launch_prep',
            content: {},
            approved_at: new Date().toISOString(),
            state: 'approved',
            source: 'strategist_approved',
          },
        },
      },
    }));
    renderWithRouter(<ConsistencyAuditStage />);
    fireEvent.click(screen.getByRole('button', { name: /Run Holistic Consistency Audit/i }));

    await waitFor(() => expect(screen.getByText(/Evidence/i)).toBeInTheDocument());
    expect(screen.getByText(/voice messaging/i)).toBeInTheDocument();
    expect(screen.getByText(/Inconsistent tone undermines brand trust/i)).toBeInTheDocument();
    expect(screen.getByText(/Reframe opening/i)).toBeInTheDocument();
  });

  it('shows export-blocked banner when unresolved findings exist', async () => {
    vi.mocked(apiClient.runConsistencyAudit).mockResolvedValue(mockConsistencyResult as any);
    useFOILStore.setState((state) => ({
      ...state,
      ctx: {
        ...state.ctx,
        approved_decisions: {
          launch_prep: {
            stage: 'launch_prep',
            content: {},
            approved_at: new Date().toISOString(),
            state: 'approved',
            source: 'strategist_approved',
          },
        },
      },
    }));
    renderWithRouter(<ConsistencyAuditStage />);
    fireEvent.click(screen.getByRole('button', { name: /Run Holistic Consistency Audit/i }));

    await waitFor(() => expect(screen.getByLabelText(/Export blocked/i)).toBeInTheDocument());
    const exportBlockTexts = screen.getAllByText(/Export is blocked/i);
    expect(exportBlockTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('shows Accept, Edit, Reject buttons for each finding', async () => {
    vi.mocked(apiClient.runConsistencyAudit).mockResolvedValue(mockConsistencyResult as any);
    useFOILStore.setState((state) => ({
      ...state,
      ctx: {
        ...state.ctx,
        approved_decisions: {
          launch_prep: {
            stage: 'launch_prep',
            content: {},
            approved_at: new Date().toISOString(),
            state: 'approved',
            source: 'strategist_approved',
          },
        },
      },
    }));
    renderWithRouter(<ConsistencyAuditStage />);
    fireEvent.click(screen.getByRole('button', { name: /Run Holistic Consistency Audit/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /Accept this finding/i })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Mark for editing/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reject this finding/i })).toBeInTheDocument();
  });

  it('resolves finding when Accept is clicked and removes action buttons', async () => {
    vi.mocked(apiClient.runConsistencyAudit).mockResolvedValue(mockConsistencyResult as any);
    useFOILStore.setState((state) => ({
      ...state,
      ctx: {
        ...state.ctx,
        approved_decisions: {
          launch_prep: {
            stage: 'launch_prep',
            content: {},
            approved_at: new Date().toISOString(),
            state: 'approved',
            source: 'strategist_approved',
          },
        },
      },
    }));
    renderWithRouter(<ConsistencyAuditStage />);
    fireEvent.click(screen.getByRole('button', { name: /Run Holistic Consistency Audit/i }));

    await waitFor(() => screen.getByRole('button', { name: /Accept this finding/i }));
    fireEvent.click(screen.getByRole('button', { name: /Accept this finding/i }));

    await waitFor(() => expect(screen.queryByRole('button', { name: /Accept this finding/i })).not.toBeInTheDocument());
    expect(screen.getByText(/Accepted/i)).toBeInTheDocument();
  });

  it('clears export block once all findings are resolved', async () => {
    vi.mocked(apiClient.runConsistencyAudit).mockResolvedValue(mockConsistencyResult as any);
    useFOILStore.setState((state) => ({
      ...state,
      ctx: {
        ...state.ctx,
        approved_decisions: {
          launch_prep: {
            stage: 'launch_prep',
            content: {},
            approved_at: new Date().toISOString(),
            state: 'approved',
            source: 'strategist_approved',
          },
        },
      },
    }));
    renderWithRouter(<ConsistencyAuditStage />);
    fireEvent.click(screen.getByRole('button', { name: /Run Holistic Consistency Audit/i }));

    await waitFor(() => screen.getByRole('button', { name: /Accept this finding/i }));
    fireEvent.click(screen.getByRole('button', { name: /Accept this finding/i }));

    await waitFor(() => expect(screen.queryByLabelText(/Export blocked/i)).not.toBeInTheDocument());
    expect(screen.getByText(/resolved.*ready for Kit Assembly/i)).toBeInTheDocument();
  });

  it('shows no findings message when audit returns empty', async () => {
    vi.mocked(apiClient.runConsistencyAudit).mockResolvedValue({ isMock: true, note: '[MOCK]', findings: [] } as any);
    useFOILStore.setState((state) => ({
      ...state,
      ctx: {
        ...state.ctx,
        approved_decisions: {
          launch_prep: {
            stage: 'launch_prep',
            content: {},
            approved_at: new Date().toISOString(),
            state: 'approved',
            source: 'strategist_approved',
          },
        },
      },
    }));
    renderWithRouter(<ConsistencyAuditStage />);
    fireEvent.click(screen.getByRole('button', { name: /Run Holistic Consistency Audit/i }));

    await waitFor(() => expect(screen.getByText(/Brand system is fully consistent/i)).toBeInTheDocument());
    expect(screen.queryByLabelText(/Export blocked/i)).not.toBeInTheDocument();
  });

  it('shows API error without modifying approved decisions', async () => {
    vi.mocked(apiClient.runConsistencyAudit).mockRejectedValue(new Error('Audit API down'));
    useFOILStore.setState((state) => ({
      ...state,
      ctx: {
        ...state.ctx,
        approved_decisions: {
          launch_prep: {
            stage: 'launch_prep',
            content: {},
            approved_at: new Date().toISOString(),
            state: 'approved',
            source: 'strategist_approved',
          },
        },
      },
    }));
    renderWithRouter(<ConsistencyAuditStage />);
    fireEvent.click(screen.getByRole('button', { name: /Run Holistic Consistency Audit/i }));

    await waitFor(() => expect(screen.getAllByText(/Audit Failed/i).length).toBeGreaterThanOrEqual(1));
    expect(screen.getByText(/approved decisions are safe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
  });
});
