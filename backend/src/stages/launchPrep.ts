import type {
  StageDraft,
  CriticFinding,
  SharedContext,
  LaunchPrepContent,
  StageErrorResponse,
  ApprovedDecision,
} from '@foil/shared';
import { LaunchPrepSchema, writeApprovedDecision } from '@foil/shared';
import type { AIProvider } from '../ai/provider.js';
import { RetryManager } from '../validation/retryManager.js';
import { CriticEngine } from '../critic/index.js';

export interface LaunchPrepStageInput {
  approved_decisions: Partial<Record<string, ApprovedDecision>>;
  raw_input?: string;
}

export class LaunchPrepStageService {
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
   * T-026 Launch Prep Generation.
   *
   * Invariants enforced:
   * 1. Requires approved Positioning, Naming + Personality, AND Voice + Messaging decisions.
   * 2. Generates landing_headline and social_launch_post.
   * 3. Critic evaluates copy against upstream brand voice and positioning.
   * 4. CRITICAL ORDERING: Launch Prep must be completed and approved before Holistic Consistency Audit.
   * 5. Draft and approved state are strictly separated.
   */
  async generateLaunchPrepDraft(
    input: LaunchPrepStageInput,
    provider: AIProvider
  ): Promise<{
    draft: StageDraft;
    content: LaunchPrepContent;
    findings: CriticFinding[];
  }> {
    const requiredUpstream = ['positioning', 'naming_personality', 'voice_messaging'];
    for (const req of requiredUpstream) {
      const decision = input.approved_decisions[req];
      if (!decision || decision.state !== 'approved') {
        const err: StageErrorResponse = {
          stage: 'launch_prep',
          error_type: 'schema_validation_failed',
          message: `Launch Prep stage requires an approved "${req}" decision before it can run. Upstream dependency missing.`,
          retryable: false,
        };
        throw err;
      }
    }

    const positioning = input.approved_decisions.positioning?.content;
    const naming = input.approved_decisions.naming_personality?.content;
    const voice = input.approved_decisions.voice_messaging?.content;

    const prompt = `You are the Strategist AI for FOIL.
Generate launch-ready marketing copy: a landing page headline and a social launch post grounded in approved Positioning, Naming, and Voice.

HARD INVARIANTS:
1. Ground the landing headline directly in the approved value proposition and differentiator.
2. The social launch post must authentically speak in the approved brand voice without generic marketing clichés.
3. Output valid JSON strictly conforming to LaunchPrepSchema.

Approved Positioning:
${JSON.stringify(positioning, null, 2)}

Approved Naming:
${JSON.stringify(naming, null, 2)}

Approved Voice & Messaging:
${JSON.stringify(voice, null, 2)}

Respond with valid JSON:
{
  "landing_headline": "<bold, high-converting landing page headline>",
  "social_launch_post": "<engaging, authentic launch announcement post>"
}`;

    const execution = await this.retryManager.executeWithRetry<LaunchPrepContent>(
      'launch_prep',
      prompt,
      LaunchPrepSchema,
      provider
    );

    const draft: StageDraft = {
      stage: 'launch_prep',
      content: execution.data as unknown as Record<string, unknown>,
      generated_at: new Date().toISOString(),
      attempt: execution.attemptCount,
    };

    const findings = await this.criticEngine.critiqueStage(
      'launch_prep',
      execution.data as unknown as Record<string, unknown>,
      { approved_decisions: input.approved_decisions as any },
      provider
    );

    const finalContent: LaunchPrepContent = {
      ...execution.data,
      critic_findings: findings,
    };

    return {
      draft,
      content: finalContent,
      findings,
    };
  }

  /**
   * User approval action for Launch Prep.
   */
  approveLaunchPrep(
    ctx: SharedContext,
    content: LaunchPrepContent,
    causeId: string,
    userEdits?: Partial<LaunchPrepContent>
  ): SharedContext {
    const finalApproved = userEdits ? { ...content, ...userEdits } : content;
    const cause = userEdits ? 'user_edit' : 'strategist_approved';

    return writeApprovedDecision(
      ctx,
      'launch_prep',
      finalApproved as unknown as Record<string, unknown>,
      cause,
      causeId
    );
  }

  /**
   * Verification helper for Holistic Consistency Audit ordering.
   * Ensures Launch Prep is approved before the Consistency Audit is permitted to run.
   */
  static assertLaunchPrepApprovedBeforeAudit(
    approvedDecisions: Partial<Record<string, ApprovedDecision>>
  ): void {
    const launchPrep = approvedDecisions.launch_prep;
    if (!launchPrep || launchPrep.state !== 'approved') {
      const err: StageErrorResponse = {
        stage: 'consistency_audit',
        error_type: 'schema_validation_failed',
        message:
          'Holistic Consistency Audit MUST run after Launch Prep is approved. Launch Prep contains the launch copy required for the whole-system audit.',
        retryable: false,
      };
      throw err;
    }
  }
}
