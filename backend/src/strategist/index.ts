import type {
  StageName,
  StageInput,
  StageDraft,
  ApprovedDecision,
} from '@foil/shared';
import {
  DiscoverySchema,
  PositioningSchema,
  NamingPersonalitySchema,
  TaglinePitchSchema,
  VisualBriefSchema,
  VoiceMessagingSchema,
  LaunchPrepSchema,
} from '@foil/shared';
import type { ZodSchema } from 'zod';
import type { AIProvider } from '../ai/provider.js';
import { RetryManager, checkNoTrademarkDomainClaims } from '../validation/retryManager.js';
import { STRATEGIST_PROMPT_BUILDERS } from './prompts.js';

const STAGE_SCHEMAS: Record<string, ZodSchema<unknown>> = {
  discovery: DiscoverySchema,
  positioning: PositioningSchema,
  naming_personality: NamingPersonalitySchema,
  tagline_pitch: TaglinePitchSchema,
  visual_brief: VisualBriefSchema,
  voice_messaging: VoiceMessagingSchema,
  launch_prep: LaunchPrepSchema,
};

export class StrategistEngine {
  private retryManager: RetryManager;

  constructor(retryManager = new RetryManager()) {
    this.retryManager = retryManager;
  }

  /**
   * Generates a stage draft.
   *
   * Invariants enforced:
   * 1. Returns a transient StageDraft only — NEVER writes to or mutates approved_decisions.
   * 2. Filters approved_decisions strictly to requiredApprovedStages.
   * 3. Schema-validates and performs post-processing checks (e.g. no trademark claims).
   */
  async generateDraft(
    stage: StageName,
    input: StageInput,
    provider: AIProvider
  ): Promise<StageDraft> {
    const builder = STRATEGIST_PROMPT_BUILDERS[stage];
    if (!builder) {
      throw new Error(`No strategist prompt builder configured for stage "${stage}"`);
    }

    const schema = STAGE_SCHEMAS[stage];
    if (!schema) {
      throw new Error(`No schema configured for stage "${stage}"`);
    }

    // Context filtering: only pass required upstream decisions
    const filteredDecisions: Partial<Record<StageName, ApprovedDecision>> = {};
    for (const reqStage of builder.requiredApprovedStages) {
      if (input.approved_decisions[reqStage]) {
        filteredDecisions[reqStage] = input.approved_decisions[reqStage];
      }
    }

    const filteredInput: StageInput = {
      ...input,
      approved_decisions: filteredDecisions,
    };

    const prompt = builder.buildPrompt(filteredInput);

    // Optional postValidator for stage-specific hard rules
    let postValidator: ((data: unknown, rawText: string) => { valid: boolean; reason?: string }) | undefined;
    if (stage === 'naming_personality') {
      postValidator = (data: unknown, rawText: string) => {
        const fullContent = `${JSON.stringify(data)} ${rawText}`;
        return checkNoTrademarkDomainClaims(fullContent);
      };
    }

    const execution = await this.retryManager.executeWithRetry(
      stage,
      prompt,
      schema,
      provider,
      postValidator
    );

    return {
      stage,
      content: execution.data as Record<string, unknown>,
      generated_at: new Date().toISOString(),
      attempt: execution.attemptCount,
    };
  }
}
