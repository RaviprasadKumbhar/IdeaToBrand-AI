import type {
  StageDraft,
  CriticFinding,
  SharedContext,
  PositioningDirection,
  PositioningContent,
  ApprovedPositioningContent,
  StageErrorResponse,
  ApprovedDecision,
} from '@foil/shared';
import { PositioningSchema, writeApprovedDecision } from '@foil/shared';
import type { AIProvider } from '../ai/provider.js';
import { RetryManager } from '../validation/retryManager.js';
import { CriticEngine } from '../critic/index.js';

export interface PositioningStageInput {
  approved_decisions: Partial<Record<string, ApprovedDecision>>;
  raw_input?: string;
}

/**
 * Checks whether two positioning directions are genuinely divergent.
 * Directions that share essentially the same category, target audience, and differentiator are rejected.
 */
export function checkDirectionsDivergence(directions: PositioningDirection[]): {
  divergent: boolean;
  reason?: string;
} {
  if (directions.length < 2) {
    return {
      divergent: false,
      reason: 'At least 2 positioning directions are required.',
    };
  }

  for (let i = 0; i < directions.length; i++) {
    for (let j = i + 1; j < directions.length; j++) {
      const d1 = directions[i];
      const d2 = directions[j];

      const sameCategory =
        d1.category.trim().toLowerCase() === d2.category.trim().toLowerCase();
      const sameAudience =
        d1.target_audience.trim().toLowerCase() === d2.target_audience.trim().toLowerCase();
      const sameDifferentiator =
        d1.differentiator.trim().toLowerCase() === d2.differentiator.trim().toLowerCase();
      const sameAngle =
        d1.competitive_angle.trim().toLowerCase() === d2.competitive_angle.trim().toLowerCase();

      if (sameCategory && sameAudience && (sameDifferentiator || sameAngle)) {
        return {
          divergent: false,
          reason: `Directions "${d1.title}" and "${d2.title}" lack strategic divergence: they share the same category ("${d1.category}"), audience ("${d1.target_audience}"), and angle/differentiator. Positioning options must represent genuinely divergent business and brand stances.`,
        };
      }
    }
  }

  return { divergent: true };
}

export class PositioningStageService {
  private retryManager: RetryManager;
  private criticEngine: CriticEngine;

  constructor(
    retryManager = new RetryManager(),
    criticEngine = new CriticEngine(retryManager)
  ) {
    this.retryManager = retryManager;
    this.criticEngine = criticEngine;
  }

  /**
   * T-016 Positioning Generation.
   * Produces at least two genuinely divergent directions, runs Critic on each,
   * and returns both for user comparison.
   *
   * Invariants enforced:
   * 1. Requires approved Discovery stage before execution (dependency enforcement).
   * 2. Produces at least 2 divergent directions.
   * 3. Divergence check triggers up to 2 retries if directions are cosmetically identical.
   * 4. Each direction is evaluated by the Critic and includes critic_findings.
   * 5. Draft and approved state are strictly separated — does NOT write to approved_decisions.
   */
  async generatePositioningDirections(
    input: PositioningStageInput,
    provider: AIProvider
  ): Promise<{
    draft: StageDraft;
    directions: PositioningDirection[];
  }> {
    // Invariant: Dependency check. Discovery must be approved.
    const discoveryDecision = input.approved_decisions.discovery;
    if (!discoveryDecision || discoveryDecision.state !== 'approved') {
      const err: StageErrorResponse = {
        stage: 'positioning',
        error_type: 'schema_validation_failed',
        message:
          'Positioning stage requires an approved Discovery decision before it can run. Upstream dependency missing.',
        retryable: false,
      };
      throw err;
    }

    const discoveryContent = discoveryDecision.content;

    const prompt = `You are the Strategist AI for FOIL.
Generate at least TWO genuinely divergent positioning directions grounded in the approved Discovery record.

HARD INVARIANTS:
1. DIVERGENT STRATEGIES: The directions must NOT be cosmetic rewordings. They must represent strategically distinct market categories, target user segments, value propositions, and competitive angles.
2. Provide at least 2 directions in the "directions" array.
3. Output valid JSON strictly matching PositioningSchema.

Approved Discovery Context:
${JSON.stringify(discoveryContent, null, 2)}

Respond with valid JSON:
{
  "directions": [
    {
      "title": "<name of direction>",
      "category": "<market category>",
      "target_audience": "<specific audience slice>",
      "core_problem": "<core pain point addressed>",
      "differentiator": "<unique defensible capability>",
      "value_proposition": "<clear customer promise>",
      "competitive_angle": "<how this defeats alternatives>",
      "strategic_rationale": "<why this strategy succeeds>",
      "potential_weakness": "<acknowledged tradeoff or risk>"
    }
  ]
}`;

    const execution = await this.retryManager.executeWithRetry<PositioningContent>(
      'positioning',
      prompt,
      PositioningSchema,
      provider,
      (data) => {
        // Enforce strategic divergence between directions
        const divergenceCheck = checkDirectionsDivergence(data.directions);
        if (!divergenceCheck.divergent) {
          return {
            valid: false,
            reason: divergenceCheck.reason,
          };
        }
        return { valid: true };
      }
    );

    // Run Critic on each direction to populate its critic_findings
    const enrichedDirections: PositioningDirection[] = [];

    for (const dir of execution.data.directions) {
      const findings = await this.criticEngine.critiqueStage(
        'positioning',
        dir as unknown as Record<string, unknown>,
        { approved_decisions: input.approved_decisions as any },
        provider
      );

      enrichedDirections.push({
        ...dir,
        critic_findings: findings,
      });
    }

    const finalContent: PositioningContent = {
      directions: enrichedDirections,
    };

    const draft: StageDraft = {
      stage: 'positioning',
      content: finalContent as unknown as Record<string, unknown>,
      generated_at: new Date().toISOString(),
      attempt: execution.attemptCount,
    };

    return {
      draft,
      directions: enrichedDirections,
    };
  }

  /**
   * User selection and approval action for Positioning.
   * Explicit user action selects one direction, retains rejected directions for audit/demo,
   * updates approved_decisions.positioning, and records revision log.
   */
  approvePositioningDirection(
    ctx: SharedContext,
    selectedIndex: number,
    allDirections: PositioningDirection[],
    causeId: string,
    userEdits?: Partial<PositioningDirection>
  ): SharedContext {
    if (selectedIndex < 0 || selectedIndex >= allDirections.length) {
      throw new Error(
        `Invalid direction index ${selectedIndex}. Must be between 0 and ${allDirections.length - 1}.`
      );
    }

    const selectedBase = allDirections[selectedIndex];
    const selectedDirection = userEdits ? { ...selectedBase, ...userEdits } : selectedBase;

    // Retain all non-selected directions in rejected_directions for audit & demo transparency
    const rejectedDirections = allDirections.filter((_, idx) => idx !== selectedIndex);

    const approvedContent: ApprovedPositioningContent = {
      ...selectedDirection,
      rejected_directions: rejectedDirections,
    };

    const cause = userEdits ? 'user_edit' : 'strategist_approved';

    return writeApprovedDecision(
      ctx,
      'positioning',
      approvedContent as unknown as Record<string, unknown>,
      cause,
      causeId
    );
  }
}
