import {
  ApprovedDecision,
  ApprovedDecisionSource,
  RevisionLogCause,
  RevisionLogEntry,
  SharedContext,
  StageName,
} from "../types/index.js";

/**
 * Generates a unique identifier for revision entries.
 */
export function generateId(prefix: string = "rev"): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Maps revision cause to ApprovedDecision source.
 */
function mapCauseToSource(cause: RevisionLogCause): ApprovedDecisionSource {
  switch (cause) {
    case "user_edit":
      return "user_edit";
    case "scenario_accept":
      return "scenario_accept";
    case "consistency_finding_accept":
      return "consistency_finding";
    case "strategist_approved":
    default:
      return "strategist_approved";
  }
}

/**
 * Single choke point for all writes to approved_decisions.
 * Task T-010: Meaningful revision history for approved changes.
 *
 * Invariant: Every write to approved_decisions MUST append exactly one
 * RevisionLogEntry to ctx.revision_log.
 */
export function writeApprovedDecision(
  ctx: SharedContext,
  stage: StageName,
  content: Record<string, unknown>,
  cause: RevisionLogCause,
  causeId: string
): SharedContext {
  const previousValue = ctx.approved_decisions[stage]?.content ?? null;
  const timestamp = new Date().toISOString();
  const revisionId = generateId("rev");

  const revisionEntry: RevisionLogEntry = {
    id: revisionId,
    changed_field: stage,
    previous_value: previousValue,
    new_value: content,
    cause,
    cause_id: causeId,
    timestamp,
  };

  const newApprovedDecision: ApprovedDecision = {
    stage,
    content,
    approved_at: timestamp,
    state: "approved",
    source: mapCauseToSource(cause),
  };

  return {
    ...ctx,
    approved_decisions: {
      ...ctx.approved_decisions,
      [stage]: newApprovedDecision,
    },
    // Working draft for this stage is cleared/superseded once approved
    stage_drafts: {
      ...ctx.stage_drafts,
      [stage]: undefined,
    },
    revision_log: [...ctx.revision_log, revisionEntry],
  };
}

/**
 * Accepts a Scenario Probe branch and applies all affected field drafts to approved_decisions.
 * Each applied branch draft generates a traceable RevisionLogEntry.
 */
export function acceptScenarioBranch(
  ctx: SharedContext,
  scenarioId: string
): SharedContext {
  const scenarioIndex = ctx.scenario_overrides.findIndex((s) => s.id === scenarioId);
  if (scenarioIndex === -1) {
    throw new Error(`ScenarioOverride with id "${scenarioId}" not found in SharedContext.`);
  }

  const scenario = ctx.scenario_overrides[scenarioIndex];
  if (!scenario.branch_drafts || scenario.branch_drafts.length === 0) {
    throw new Error(`ScenarioOverride "${scenarioId}" has no branch drafts to accept.`);
  }

  let updatedContext: SharedContext = { ...ctx };

  // Sequentially apply each branch draft through the single writeApprovedDecision choke point
  for (const draft of scenario.branch_drafts) {
    updatedContext = writeApprovedDecision(
      updatedContext,
      draft.stage,
      draft.content,
      "scenario_accept",
      scenarioId
    );
  }

  // Update scenario decision status to 'accept_branch'
  const updatedScenarios = [...updatedContext.scenario_overrides];
  updatedScenarios[scenarioIndex] = {
    ...scenario,
    decision: "accept_branch",
  };

  return {
    ...updatedContext,
    scenario_overrides: updatedScenarios,
  };
}
