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
import {
  saveProjectToDb,
  fetchUserProjects,
  type DbProjectRecord,
} from '../lib/supabase';

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

function createInitialUIStates(ctx?: SharedContext | null): Record<StageName, StageUIState> {
  return Object.fromEntries(
    ALL_STAGES.map((s) => {
      const decision = ctx?.approved_decisions?.[s];
      let state: ApprovalState = 'draft';
      if (decision) {
        state = decision.state === 'needs_review' ? 'needs_review' : 'approved';
      }
      return [s, { approval_state: state, is_loading: false, error: null }];
    })
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

  // Supabase Cloud Persistence
  cloudSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  cloudSaveError: string | null;
  lastSavedAt: string | null;
  activeUserId: string | null;

  setActiveUser: (userId: string | null) => void;
  loadProjectFromCloud: (userId: string) => Promise<boolean>;
  saveToCloud: (overrideUserId?: string) => Promise<boolean>;
  retrySave: () => Promise<boolean>;

  // Session reset / creation (new project)
  startNewProject: (input: IdeaInput) => Promise<boolean>;
  resetProject: () => void;

  // Project persistence loader (Phase 6)
  loadProjectIntoStore: (project: WorkspaceProjectData) => void;
}

// ─── Autosave helpers ─────────────────────────────────────────────────────────

let autosaveTimeout: ReturnType<typeof setTimeout> | null = null;

function triggerAutosave(get: () => FOILStore) {
  if (autosaveTimeout) {
    clearTimeout(autosaveTimeout);
  }
  autosaveTimeout = setTimeout(() => {
    get().saveToCloud();
  }, 1000);
}

// ─── Store implementation ─────────────────────────────────────────────────────

export const useFOILStore = create<FOILStore>((set, get) => {
  const savedCtx = loadFromSession();

  return {
    ctx: savedCtx ?? createInitialContext(),
    uiStates: createInitialUIStates(savedCtx),
    ideaInput: null,
    currentStage: 'idea-input',

    // Cloud Persistence Initial State
    cloudSaveStatus: 'idle',
    cloudSaveError: null,
    lastSavedAt: null,
    activeUserId: null,

    setIdeaInput: (input) => {
      const prevDesc = get().ctx.user_facts?.business_description;
      const isNewConcept = Boolean(
        prevDesc &&
        input.business_description &&
        String(prevDesc).trim() !== String(input.business_description).trim()
      );

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
          // Invalidate stale approved decisions and drafts if the fundamental business concept changed
          ...(isNewConcept
            ? {
                approved_decisions: {},
                stage_drafts: {},
                critic_findings: [],
                consistency_findings: [],
                scenario_overrides: [],
              }
            : {}),
        };
        persistToSession(updatedCtx);
        return {
          ctx: updatedCtx,
          uiStates: isNewConcept ? createInitialUIStates() : state.uiStates,
        };
      });
      triggerAutosave(get);
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
      triggerAutosave(get);
    },

    clearDraft: (stage) => {
      set((state) => {
        const drafts = { ...state.ctx.stage_drafts };
        delete drafts[stage];
        const updatedCtx: SharedContext = { ...state.ctx, stage_drafts: drafts };
        persistToSession(updatedCtx);
        return { ctx: updatedCtx };
      });
      triggerAutosave(get);
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
      triggerAutosave(get);
    },

    rejectStage: (stage) => {
      set((state) => ({
        uiStates: {
          ...state.uiStates,
          [stage]: { ...state.uiStates[stage], approval_state: 'rejected' },
        },
      }));
      triggerAutosave(get);
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
      triggerAutosave(get);
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
      triggerAutosave(get);
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
      triggerAutosave(get);
    },

    setConsistencyFindings: (findings) => {
      set((state) => {
        const updatedCtx: SharedContext = { ...state.ctx, consistency_findings: findings };
        persistToSession(updatedCtx);
        return { ctx: updatedCtx };
      });
      triggerAutosave(get);
    },

    actOnConsistencyFinding: (id, action) => {
      const finding = get().ctx.consistency_findings.find((f) => f.id === id);
      if (finding && action === 'accept') {
        const targetStage = finding.fields_in_conflict[0]?.split('.')[0] as StageName;
        const currentApproved = get().ctx.approved_decisions[targetStage];
        if (targetStage && currentApproved?.content) {
          const fieldName = finding.fields_in_conflict[0]?.split('.')[1] || 'resolution';
          const existingFieldValue = (currentApproved.content as Record<string, unknown>)[fieldName];
          const newFieldValue = Array.isArray(existingFieldValue)
            ? [finding.sharper_alternative, ...existingFieldValue.slice(1)]
            : finding.sharper_alternative;

          const updatedStageContent = {
            ...currentApproved.content,
            [fieldName]: newFieldValue,
            audit_resolved_alternative: finding.sharper_alternative,
          };

          get().writeApprovedDecision(
            targetStage,
            updatedStageContent,
            'consistency_finding_accept',
            id
          );
        }
      }

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
      triggerAutosave(get);
    },

    loadProjectIntoStore: (project) => {
      const initialUI = project.ui_states || createInitialUIStates(project.context);
      for (const s of ALL_STAGES) {
        if (project.context?.approved_decisions?.[s] && (!initialUI[s] || initialUI[s].approval_state === 'draft')) {
          initialUI[s] = {
            approval_state: (project.context.approved_decisions[s].state === 'needs_review' ? 'needs_review' : 'approved') as ApprovalState,
            is_loading: false,
            error: null,
          };
        }
      }
      set({
        ctx: project.context,
        uiStates: initialUI,
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
      triggerAutosave(get);
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
      triggerAutosave(get);
    },

    // ─── Cloud Persistence Implementation ──────────────────────────────────────

    setActiveUser: (userId: string | null) => {
      const prevUserId = get().activeUserId;
      set({ activeUserId: userId });
      if (userId && userId !== prevUserId) {
        get().loadProjectFromCloud(userId);
      }
    },

    saveToCloud: async (overrideUserId?: string) => {
      const state = get();
      const userId = overrideUserId || state.activeUserId;
      if (!userId) {
        return false;
      }

      set({ cloudSaveStatus: 'saving', cloudSaveError: null });

      const brandName =
        (state.ctx.approved_decisions.naming_personality?.content as Record<string, unknown> | undefined)?.selected_name as string ||
        (state.ctx.user_facts.business_description ? String(state.ctx.user_facts.business_description).slice(0, 40) : 'Untitled Brand');

      const brandDesc = state.ctx.user_facts.business_description ? String(state.ctx.user_facts.business_description) : null;

      const record: DbProjectRecord = {
        id: state.ctx.project_id,
        user_id: userId,
        name: brandName,
        description: brandDesc,
        current_stage: state.currentStage,
        context: state.ctx,
        ui_states: state.uiStates as Record<string, unknown>,
      };

      const { error } = await saveProjectToDb(record);
      if (error) {
        set({ cloudSaveStatus: 'error', cloudSaveError: error.message });
        return false;
      } else {
        set({ cloudSaveStatus: 'saved', lastSavedAt: new Date().toISOString(), cloudSaveError: null });
        return true;
      }
    },

    retrySave: async () => {
      return get().saveToCloud();
    },

    startNewProject: async (input: IdeaInput) => {
      if (autosaveTimeout) {
        clearTimeout(autosaveTimeout);
        autosaveTimeout = null;
      }
      const newProjectId = uuid();
      const newCtx: SharedContext = {
        project_id: newProjectId,
        user_facts: {
          business_description: input.business_description,
          ...(input.target_audience ? { target_audience: input.target_audience } : {}),
          ...(input.category ? { category: input.category } : {}),
          ...(input.constraints ? { constraints: input.constraints } : {}),
        },
        ai_assumptions: {},
        approved_decisions: {},
        stage_drafts: {},
        critic_findings: [],
        consistency_findings: [],
        scenario_overrides: [],
        revision_log: [],
      };
      const newUIStates = createInitialUIStates();
      persistToSession(newCtx);
      set({
        ctx: newCtx,
        uiStates: newUIStates,
        ideaInput: input,
        currentStage: 'discovery',
        cloudSaveStatus: 'saving',
        cloudSaveError: null,
      });

      const userId = get().activeUserId;
      if (userId) {
        const brandName = input.business_description.slice(0, 40);
        const record: DbProjectRecord = {
          id: newProjectId,
          user_id: userId,
          name: brandName,
          description: input.business_description,
          current_stage: 'discovery',
          context: newCtx,
          ui_states: newUIStates as Record<string, unknown>,
        };
        const { error } = await saveProjectToDb(record);
        if (error) {
          set({ cloudSaveStatus: 'error', cloudSaveError: error.message });
          return false;
        } else {
          set({ cloudSaveStatus: 'saved', lastSavedAt: new Date().toISOString(), cloudSaveError: null });
          return true;
        }
      }
      return true;
    },

    loadProjectFromCloud: async (userId: string) => {
      set({ activeUserId: userId, cloudSaveError: null });
      const { data, error } = await fetchUserProjects(userId);
      if (error) {
        set({ cloudSaveStatus: 'error', cloudSaveError: error.message });
        return false;
      }

      if (data && data.length > 0) {
        const currentCtx = get().ctx;
        const matchingProject = data.find((p) => p.id === currentCtx.project_id);
        const hasActiveFreshIdea =
          Boolean(currentCtx.user_facts?.business_description) && !matchingProject;

        if (hasActiveFreshIdea) {
          // Current session has an active freshly initiated project that hasn't been synced to cloud yet;
          // Persist it immediately rather than clobbering it with an old stale project!
          await get().saveToCloud(userId);
          return true;
        }

        const projectToLoad = matchingProject || data[0];
        const loadedCtx: SharedContext = {
          ...createInitialContext(),
          ...projectToLoad.context,
          project_id: projectToLoad.id || projectToLoad.context?.project_id,
        };
        const loadedUIStates = {
          ...createInitialUIStates(),
          ...(projectToLoad.ui_states as Record<StageName, StageUIState>),
        };
        persistToSession(loadedCtx);
        set({
          ctx: loadedCtx,
          uiStates: loadedUIStates,
          currentStage: (projectToLoad.current_stage as StageName | 'idea-input') || 'idea-input',
          cloudSaveStatus: 'saved',
          lastSavedAt: projectToLoad.updated_at || new Date().toISOString(),
          cloudSaveError: null,
        });
        return true;
      } else {
        // No project found in database yet, initialize and save clean project row
        const initialCtx = get().ctx;
        const brandName = initialCtx.user_facts.business_description
          ? String(initialCtx.user_facts.business_description).slice(0, 40)
          : 'New Brand Project';
        const record: DbProjectRecord = {
          id: initialCtx.project_id,
          user_id: userId,
          name: brandName,
          description: initialCtx.user_facts.business_description ? String(initialCtx.user_facts.business_description) : null,
          current_stage: get().currentStage,
          context: initialCtx,
          ui_states: get().uiStates as Record<string, unknown>,
        };
        const { error: saveErr } = await saveProjectToDb(record);
        if (saveErr) {
          set({ cloudSaveStatus: 'error', cloudSaveError: saveErr.message });
        } else {
          set({ cloudSaveStatus: 'saved', lastSavedAt: new Date().toISOString(), cloudSaveError: null });
        }
        return true;
      }
    },

    resetProject: () => {
      if (autosaveTimeout) {
        clearTimeout(autosaveTimeout);
        autosaveTimeout = null;
      }
      sessionStorage.removeItem(SESSION_KEY);
      const newCtx = createInitialContext();
      const newUI = createInitialUIStates();
      set({
        ctx: newCtx,
        uiStates: newUI,
        ideaInput: null,
        currentStage: 'idea-input',
        cloudSaveStatus: 'idle',
        cloudSaveError: null,
      });
      const userId = get().activeUserId;
      if (userId) {
        const record: DbProjectRecord = {
          id: newCtx.project_id,
          user_id: userId,
          name: 'New Brand Project',
          description: null,
          current_stage: 'idea-input',
          context: newCtx,
          ui_states: newUI as Record<string, unknown>,
        };
        saveProjectToDb(record).then(({ error }) => {
          if (!error) {
            set({ cloudSaveStatus: 'saved', lastSavedAt: new Date().toISOString() });
          }
        });
      }
    },
  };
});

// Type alias to satisfy architecture.md reference
type ApprovedDecision = import('../../../shared/types').ApprovedDecision;
