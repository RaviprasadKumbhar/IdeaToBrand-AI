/**
 * FOIL Zustand store — owns the canonical SharedContext for the active session.
 * Architecture.md § 7: approved_decisions can ONLY be written via writeApprovedDecision().
 * SessionStorage is used for same-tab refresh recovery only (not durable persistence).
 */
import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type {
  SharedContext,
  StageName,
  ApprovalState,
  StageUIState,
  StageErrorResponse,
  StageDraft,
  CriticFinding,
  ConsistencyFinding,
  RevisionLogEntry,
  IdeaInput,
} from '../../../shared/types';
import { affectedFields } from '../../../shared/dependency-map';
import { transition } from '../../../shared/src/store/approvalStateMachine';
import type { ApprovalEvent } from '../../../shared/src/types/index';
import type { WorkspaceProjectData } from '../lib/supabase-workspace';

// ─── Initial state ──────────────────────────────────────────────────────────

function createInitialContext(): SharedContext {
  return {
    project_id: uuid(),
    user_facts: {},
    ai_assumptions: {},
    approved_decisions: {},
    stage_drafts: {},
    critic_findings: [],
    consistency_findings: [],
    scenario_overrides: [],
    revision_log: [],
  };
}

const ALL_STAGES: StageName[] = [
  'discovery',
  'positioning',
  'naming_personality',
  'tagline_pitch',
  'visual_brief',
  'voice_messaging',
  'launch_prep',
  'consistency_audit',
  'kit_export',
];

function createInitialUIStates(): Record<StageName, StageUIState> {
  return Object.fromEntries(
    ALL_STAGES.map((s) => [s, { approval_state: 'draft' as ApprovalState, is_loading: false, error: null }])
  ) as Record<StageName, StageUIState>;
}

// ─── Persistence helpers ─────────────────────────────────────────────────────

const SESSION_KEY = 'foil_shared_context';

function persistToSession(ctx: SharedContext): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(ctx));
  } catch {
    // sessionStorage unavailable — continue without persistence
  }
}

function loadFromSession(): SharedContext | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SharedContext) : null;
  } catch {
    return null;
  }
}

// ─── Store interface ─────────────────────────────────────────────────────────

export interface FOILStore {
  // State
  ctx: SharedContext;
  uiStates: Record<StageName, StageUIState>;
  ideaInput: IdeaInput | null;
  currentStage: StageName | 'idea-input';

  // Idea input
  setIdeaInput: (input: IdeaInput) => void;

  // Navigation
  setCurrentStage: (stage: StageName | 'idea-input') => void;

  // Draft management
  setDraft: (stage: StageName, content: Record<string, unknown>) => void;
  clearDraft: (stage: StageName) => void;

  // Loading / error
  setLoading: (stage: StageName, loading: boolean) => void;
  setError: (stage: StageName, error: StageErrorResponse | null) => void;

  /**
   * THE ONLY function permitted to write to ctx.approved_decisions.
   * Every write also appends exactly one revision_log entry.
   * (architecture.md § 7 choke-point enforcement)
   */
  writeApprovedDecision: (
    stage: StageName,
    content: Record<string, unknown>,
    cause: RevisionLogEntry['cause'],
    causeId: string
  ) => void;

  /** Mark a stage as rejected (does NOT write to approved_decisions). */
  rejectStage: (stage: StageName) => void;

  /** Transition approval state for a stage. */
  transitionStage: (stage: StageName, event: ApprovalEvent) => void;

  // Critic findings
  addCriticFindings: (findings: CriticFinding[]) => void;
  actOnCriticFinding: (id: string, action: CriticFinding['user_action'], editedContent?: string) => void;

  // Consistency findings
  setConsistencyFindings: (findings: ConsistencyFinding[]) => void;
  actOnConsistencyFinding: (id: string, action: ConsistencyFinding['user_action']) => void;

  // Scenario overrides (T-030)
  addScenarioOverride: (override: import('../../../shared/types').ScenarioOverride) => void;
  resolveScenarioOverride: (overrideId: string, decision: NonNullable<import('../../../shared/types').ScenarioOverride['decision']>) => void;

  // Session reset (new project)
  resetProject: () => void;

  // Project persistence loader (Phase 6)
  loadProjectIntoStore: (project: WorkspaceProjectData) => void;
}

// ─── Store implementation ─────────────────────────────────────────────────────

export const useFOILStore = create<FOILStore>((set) => {
  const savedCtx = loadFromSession();

  return {
    ctx: savedCtx ?? createInitialContext(),
    uiStates: createInitialUIStates(),
    ideaInput: null,
    currentStage: 'idea-input',

    setIdeaInput: (input) => {
      set({ ideaInput: input });
      // Store user-provided facts explicitly in user_facts — never mixed with ai_assumptions
      set((state) => {
        const updatedCtx: SharedContext = {
          ...state.ctx,
          user_facts: {
            business_description: input.business_description,
            ...(input.target_audience ? { target_audience: input.target_audience } : {}),
            ...(input.category ? { category: input.category } : {}),
            ...(input.constraints ? { constraints: input.constraints } : {}),
          },
        };
        persistToSession(updatedCtx);
        return { ctx: updatedCtx };
      });
    },

    setCurrentStage: (stage) => set({ currentStage: stage }),

    setDraft: (stage, content) => {
      set((state) => {
        const draft: StageDraft = {
          stage,
          content,
          generated_at: new Date().toISOString(),
          attempt: (state.ctx.stage_drafts[stage]?.attempt ?? 0) + 1,
        };
        const updatedCtx: SharedContext = {
          ...state.ctx,
          stage_drafts: { ...state.ctx.stage_drafts, [stage]: draft },
        };
        persistToSession(updatedCtx);
        return { ctx: updatedCtx };
      });
    },

    clearDraft: (stage) => {
      set((state) => {
        const drafts = { ...state.ctx.stage_drafts };
        delete drafts[stage];
        const updatedCtx: SharedContext = { ...state.ctx, stage_drafts: drafts };
        persistToSession(updatedCtx);
        return { ctx: updatedCtx };
      });
    },

    setLoading: (stage, loading) => {
      set((state) => ({
        uiStates: {
          ...state.uiStates,
          [stage]: { ...state.uiStates[stage], is_loading: loading },
        },
      }));
    },

    setError: (stage, error) => {
      set((state) => ({
        uiStates: {
          ...state.uiStates,
          [stage]: { ...state.uiStates[stage], error, is_loading: false },
        },
      }));
    },

    // ─── THE CHOKE POINT ───────────────────────────────────────────────────
    writeApprovedDecision: (stage, content, cause, causeId) => {
      set((state) => {
        const previous = state.ctx.approved_decisions[stage]?.content ?? null;
        const timestamp = new Date().toISOString();
        const revEntry: RevisionLogEntry = {
          id: uuid(),
          changed_field: stage,
          previous_value: previous,
          new_value: content,
          cause,
          cause_id: causeId,
          timestamp,
        };
        const sourceMap: Record<RevisionLogEntry['cause'], ApprovedDecision['source']> = {
          user_edit: 'user_edit',
          consistency_finding_accept: 'consistency_finding',
          scenario_accept: 'scenario_accept',
        };

        const updatedCtx: SharedContext = {
          ...state.ctx,
          approved_decisions: {
            ...state.ctx.approved_decisions,
            [stage]: {
              stage,
              content,
              approved_at: timestamp,
              state: 'approved',
              source: sourceMap[cause],
            },
          },
          revision_log: [...state.ctx.revision_log, revEntry],
        };

        // Mark downstream stages as needs_review (never auto-regenerate)
        const affected = affectedFields(stage);
        const newUIStates = { ...state.uiStates };
        for (const dep of affected) {
          if (state.ctx.approved_decisions[dep]) {
            newUIStates[dep] = {
              ...newUIStates[dep],
              approval_state: 'needs_review',
            };
          }
        }

        persistToSession(updatedCtx);
        return {
          ctx: updatedCtx,
          uiStates: {
            ...newUIStates,
            [stage]: { ...state.uiStates[stage], approval_state: 'approved', error: null },
          },
        };
      });
    },

    rejectStage: (stage) => {
      set((state) => ({
        uiStates: {
          ...state.uiStates,
          [stage]: { ...state.uiStates[stage], approval_state: 'rejected' },
        },
      }));
    },

    transitionStage: (stage, event) => {
      set((state) => {
        const current = state.uiStates[stage].approval_state;
        const next = transition(current, event);
        return {
          uiStates: {
            ...state.uiStates,
            [stage]: { ...state.uiStates[stage], approval_state: next },
          },
        };
      });
    },

    addCriticFindings: (findings) => {
      set((state) => {
        const updatedCtx: SharedContext = {
          ...state.ctx,
          critic_findings: [...state.ctx.critic_findings, ...findings],
        };
        persistToSession(updatedCtx);
        return { ctx: updatedCtx };
      });
    },

    actOnCriticFinding: (id, action) => {
      set((state) => {
        const updatedCtx: SharedContext = {
          ...state.ctx,
          critic_findings: state.ctx.critic_findings.map((f) =>
            f.id === id ? { ...f, user_action: action } : f
          ),
        };
        persistToSession(updatedCtx);
        return { ctx: updatedCtx };
      });
    },

    setConsistencyFindings: (findings) => {
      set((state) => {
        const updatedCtx: SharedContext = { ...state.ctx, consistency_findings: findings };
        persistToSession(updatedCtx);
        return { ctx: updatedCtx };
      });
    },

    actOnConsistencyFinding: (id, action) => {
      set((state) => {
        const updatedCtx: SharedContext = {
          ...state.ctx,
          consistency_findings: state.ctx.consistency_findings.map((f) =>
            f.id === id ? { ...f, user_action: action } : f
          ),
        };
        persistToSession(updatedCtx);
        return { ctx: updatedCtx };
      });
    },

    resetProject: () => {
      sessionStorage.removeItem(SESSION_KEY);
      set({ ctx: createInitialContext(), uiStates: createInitialUIStates(), ideaInput: null, currentStage: 'idea-input' });
    },

    loadProjectIntoStore: (project) => {
      set({
        ctx: project.context,
        uiStates: project.ui_states || createInitialUIStates(),
        currentStage: project.current_stage || 'discovery',
      });
      persistToSession(project.context);
    },

    addScenarioOverride: (override) => {
      set((state) => {
        const updatedCtx: SharedContext = {
          ...state.ctx,
          scenario_overrides: [...state.ctx.scenario_overrides, override],
        };
        persistToSession(updatedCtx);
        return { ctx: updatedCtx };
      });
    },

    resolveScenarioOverride: (overrideId, decision) => {
      set((state) => {
        const updatedCtx: SharedContext = {
          ...state.ctx,
          scenario_overrides: state.ctx.scenario_overrides.map((o) =>
            o.id === overrideId ? { ...o, decision } : o
          ),
        };
        persistToSession(updatedCtx);
        return { ctx: updatedCtx };
      });
    },
  };
});

// Type alias to satisfy architecture.md reference
type ApprovedDecision = import('../../../shared/types').ApprovedDecision;
