import type {
  StageName,
  StageDraft,
  CriticFinding,
  SharedContext,
  ScenarioOverride,
  ScenarioComparisonItem,
  ScenarioProbeResult,
  StageInput,
  ApprovedDecision,
} from '@foil/shared';
import {
  affectedFields,
  writeApprovedDecision,
  acceptScenarioBranch,
} from '@foil/shared';
import type { AIProvider } from '../ai/provider.js';
import { StrategistEngine } from '../strategist/index.js';
import { CriticEngine } from '../critic/index.js';

export const GENERATIVE_PIPELINE_ORDER: StageName[] = [
  'discovery',
  'positioning',
  'naming_personality',
  'tagline_pitch',
  'visual_brief',
  'voice_messaging',
  'launch_prep',
];

export class ScenarioProbeService {
  private strategistEngine: StrategistEngine;
  private criticEngine: CriticEngine;

  constructor(
    strategistEngine = new StrategistEngine(),
    criticEngine = new CriticEngine()
  ) {
    this.strategistEngine = strategistEngine;
    this.criticEngine = criticEngine;
  }

  /**
   * Calculates which downstream stages must be rerun for a scenario probe triggered
   * from the given stage. Reruns ONLY affected fields (PRD Sec. 6, Architecture Sec. 17).
   * Excludes non-generative stages like consistency_audit and kit_export.
   */
  calculateAffectedStages(triggeredFromStage: StageName): StageName[] {
    const rawAffected = affectedFields(triggeredFromStage);
    return GENERATIVE_PIPELINE_ORDER.filter(
      (stage) =>
        rawAffected.includes(stage) &&
        stage !== 'consistency_audit' &&
        stage !== 'kit_export'
    );
  }

  /**
   * T-029: Creates an isolated scenario branch from original state, generates branch drafts
   * only for affected fields via Strategist + Critic, and computes side-by-side comparison data.
   *
   * Hard Invariants:
   * 1. Deep isolation: Branch drafts cannot mutate original state by reference or shared mutable data.
   * 2. Original state (ctx.approved_decisions) remains 100% UNCHANGED until explicit user acceptance.
   * 3. Reruns ONLY affected downstream fields — never blindly regenerates the entire system.
   * 4. Reruns flow through both Strategist and Critic.
   * 5. Honest failure reporting: on provider or validation error, original state remains intact.
   */
  async createScenarioBranch(
    ctx: SharedContext,
    triggeredFromStage: StageName,
    whatIfInput: string,
    provider: AIProvider
  ): Promise<ScenarioProbeResult> {
    if (!whatIfInput || whatIfInput.trim().length === 0) {
      throw new Error('Scenario probe requires a non-empty what-if input description.');
    }

    // Invariant: Trigger stage must already be approved
    const triggerDecision = ctx.approved_decisions[triggeredFromStage];
    const isApproved =
      triggerDecision &&
      (triggerDecision.state === 'approved' ||
        (triggerDecision.content && triggerDecision.state !== 'needs_review'));

    if (!isApproved) {
      throw new Error(
        `Cannot run Scenario Probe from stage "${triggeredFromStage}": stage is not approved in approved_decisions.`
      );
    }

    const affectedStages = this.calculateAffectedStages(triggeredFromStage);
    const scenarioId = `scen_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const scenarioOverride: ScenarioOverride = {
      id: scenarioId,
      triggered_from_stage: triggeredFromStage,
      what_if_input: whatIfInput.trim(),
      affected_fields: affectedStages,
      branch_drafts: [],
      decision: null,
      created_at: new Date().toISOString(),
    };

    // Deep-clone approved_decisions to create an isolated working context for the branch
    const branchDecisions: Partial<Record<StageName, ApprovedDecision>> = JSON.parse(
      JSON.stringify(ctx.approved_decisions)
    );

    const comparisons: ScenarioComparisonItem[] = [];

    // Run Strategist and Critic ONLY for affected fields in dependency order
    for (const stage of affectedStages) {
      const stageInput: StageInput = {
        approved_decisions: branchDecisions,
        scenario_override: scenarioOverride,
        raw_input: whatIfInput,
      };

      // 1. Run Strategist with scenario_override
      const branchDraft = await this.strategistEngine.generateDraft(
        stage,
        stageInput,
        provider
      );

      // Deep clone branch draft content to ensure isolation
      const isolatedDraft: StageDraft = {
        stage: branchDraft.stage,
        content: JSON.parse(JSON.stringify(branchDraft.content)),
        generated_at: branchDraft.generated_at,
        attempt: branchDraft.attempt,
      };

      // 2. Run Critic on the branch draft
      const findings = await this.criticEngine.critiqueStage(
        stage,
        isolatedDraft.content,
        stageInput,
        provider
      );

      scenarioOverride.branch_drafts.push(isolatedDraft);

      // Feed this branch draft to subsequent dependent stages in the branch pipeline
      branchDecisions[stage] = {
        stage,
        content: JSON.parse(JSON.stringify(isolatedDraft.content)),
        approved_at: isolatedDraft.generated_at,
        state: 'approved',
        source: 'scenario_accept',
      };

      const originalDecision = ctx.approved_decisions[stage];
      const originalContent = originalDecision?.content
        ? JSON.parse(JSON.stringify(originalDecision.content))
        : null;
      const originalState = originalDecision?.state ?? null;
      const hasChanges =
        JSON.stringify(originalContent) !== JSON.stringify(isolatedDraft.content);

      comparisons.push({
        stage,
        original_content: originalContent,
        original_state: originalState,
        branch_draft: JSON.parse(JSON.stringify(isolatedDraft)),
        critic_findings: JSON.parse(JSON.stringify(findings)),
        has_changes: hasChanges,
      });
    }

    // Invariant: original ctx.approved_decisions remains 100% untouched.
    // The scenario override is stored in scenario_overrides.
    const updatedContext: SharedContext = {
      ...ctx,
      scenario_overrides: [
        ...ctx.scenario_overrides,
        JSON.parse(JSON.stringify(scenarioOverride)),
      ],
    };

    return {
      scenario_override: JSON.parse(JSON.stringify(scenarioOverride)),
      comparisons,
      updated_context: updatedContext,
    };
  }

  /**
   * Keep Original decision:
   * Leaves approved_decisions completely untouched. Records decision: 'keep_original'.
   */
  keepOriginal(ctx: SharedContext, scenarioId: string): SharedContext {
    const scenarioIndex = ctx.scenario_overrides.findIndex((s) => s.id === scenarioId);
    if (scenarioIndex === -1) {
      throw new Error(`ScenarioOverride with id "${scenarioId}" not found in SharedContext.`);
    }

    const updatedScenarios = [...ctx.scenario_overrides];
    updatedScenarios[scenarioIndex] = {
      ...updatedScenarios[scenarioIndex],
      decision: 'keep_original',
    };

    return {
      ...ctx,
      scenario_overrides: updatedScenarios,
    };
  }

  /**
   * Accept Branch decision:
   * Sequentially writes branch drafts into approved_decisions via writeApprovedDecision choke point.
   * Every accepted change writes a revision_log entry.
   */
  acceptBranch(
    ctx: SharedContext,
    scenarioId: string,
    stageFilter?: StageName[]
  ): SharedContext {
    // If no filter, delegate directly to Member 3's authoritative acceptScenarioBranch
    if (!stageFilter || stageFilter.length === 0) {
      return acceptScenarioBranch(ctx, scenarioId);
    }

    const scenarioIndex = ctx.scenario_overrides.findIndex((s) => s.id === scenarioId);
    if (scenarioIndex === -1) {
      throw new Error(`ScenarioOverride with id "${scenarioId}" not found in SharedContext.`);
    }

    const scenario = ctx.scenario_overrides[scenarioIndex];
    if (!scenario.branch_drafts || scenario.branch_drafts.length === 0) {
      throw new Error(`ScenarioOverride "${scenarioId}" has no branch drafts to accept.`);
    }

    let updatedContext: SharedContext = { ...ctx };
    const filteredDrafts = scenario.branch_drafts.filter((d) =>
      stageFilter.includes(d.stage)
    );

    if (filteredDrafts.length === 0) {
      throw new Error('No branch drafts matched the provided stageFilter.');
    }

    for (const draft of filteredDrafts) {
      updatedContext = writeApprovedDecision(
        updatedContext,
        draft.stage,
        draft.content,
        'scenario_accept',
        scenarioId
      );
    }

    const updatedScenarios = [...updatedContext.scenario_overrides];
    updatedScenarios[scenarioIndex] = {
      ...scenario,
      decision: 'accept_branch',
    };

    return {
      ...updatedContext,
      scenario_overrides: updatedScenarios,
    };
  }

  /**
   * Edit Branch decision:
   * Applies user-edited content for a specific branch stage through writeApprovedDecision.
   * Creates a revision log entry with cause: 'scenario_accept' and records decision: 'edit'.
   */
  editBranch(
    ctx: SharedContext,
    scenarioId: string,
    stage: StageName,
    editedContent: Record<string, unknown>
  ): SharedContext {
    const scenarioIndex = ctx.scenario_overrides.findIndex((s) => s.id === scenarioId);
    if (scenarioIndex === -1) {
      throw new Error(`ScenarioOverride with id "${scenarioId}" not found in SharedContext.`);
    }

    const scenario = ctx.scenario_overrides[scenarioIndex];
    const draftIndex = scenario.branch_drafts.findIndex((d) => d.stage === stage);
    if (draftIndex === -1) {
      throw new Error(
        `Stage "${stage}" is not part of branch_drafts in scenario "${scenarioId}".`
      );
    }

    // Write through single choke point with cause: 'scenario_accept'
    let updatedContext = writeApprovedDecision(
      ctx,
      stage,
      editedContent,
      'scenario_accept',
      scenarioId
    );

    // Update branch draft with user's edited content
    const updatedDrafts = [...scenario.branch_drafts];
    updatedDrafts[draftIndex] = {
      ...updatedDrafts[draftIndex],
      content: JSON.parse(JSON.stringify(editedContent)),
    };

    const updatedScenarios = [...updatedContext.scenario_overrides];
    updatedScenarios[scenarioIndex] = {
      ...scenario,
      branch_drafts: updatedDrafts,
      decision: 'edit',
    };

    return {
      ...updatedContext,
      scenario_overrides: updatedScenarios,
    };
  }
}
