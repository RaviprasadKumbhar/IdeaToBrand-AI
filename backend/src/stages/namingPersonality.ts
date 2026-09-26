import type {
  StageDraft,
  CriticFinding,
  SharedContext,
  NamingPersonalityContent,
  StageErrorResponse,
  ApprovedDecision,
} from '@foil/shared';
import { NamingPersonalitySchema, writeApprovedDecision } from '@foil/shared';
import type { AIProvider } from '../ai/provider.js';
import { RetryManager, checkNoTrademarkDomainClaims } from '../validation/retryManager.js';
import { CriticEngine } from '../critic/index.js';

export interface NamingPersonalityStageInput {
  approved_decisions: Partial<Record<string, ApprovedDecision>>;
  raw_input?: string;
}

export class NamingPersonalityStageService {
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
   * T-018 Naming + Personality Generation.
   *
   * Invariants enforced:
   * 1. Requires approved Positioning decision.
   * 2. NEVER claims trademark or domain availability without verified real-time registry checks.
   * 3. Enforces 3-5 personality traits with audience justifications.
   * 4. Evaluated by Critic for cliché naming suffixes and generic traits.
   * 5. Draft and approved state are strictly separated.
   */
  async generateNamingPersonalityDraft(
    input: NamingPersonalityStageInput,
    provider: AIProvider
  ): Promise<{
    draft: StageDraft;
    content: NamingPersonalityContent;
    findings: CriticFinding[];
  }> {
    // Invariant: Dependency check. Positioning must be approved.
    const positioningDecision = input.approved_decisions.positioning;
    if (!positioningDecision || positioningDecision.state !== 'approved') {
      const err: StageErrorResponse = {
        stage: 'naming_personality',
        error_type: 'schema_validation_failed',
        message:
          'Naming + Personality stage requires an approved Positioning decision before it can run. Upstream dependency missing.',
        retryable: false,
      };
      throw err;
    }

    const positioningContent = positioningDecision.content;

    const prompt = `You are the Strategist AI for FOIL.
Generate naming directions, brand personality traits, traits to avoid, and brand principles grounded in approved Positioning.

HARD INVARIANTS:
1. TRADEMARK & DOMAIN CLAIMS STRICTLY PROHIBITED: NEVER state or imply that any name, domain (.com, .io), or handle "is available", "not taken", or "unregistered". You do not have real-time legal registry access.
2. Provide at least one naming direction with full strategic rationale and potential concern.
3. Provide between 3 and 5 personality traits (personality_traits), each with an audience_justification.
4. Provide traits_to_avoid and brand_principles with rationale.
5. Output valid JSON strictly conforming to NamingPersonalitySchema.

Approved Positioning Context:
${JSON.stringify(positioningContent, null, 2)}

Respond with valid JSON:
{
  "naming_directions": [
    {
      "territory": "<conceptual territory>",
      "proposed_name": "<name>",
      "rationale": "<strategic rationale>",
      "relationship_to_audience": "<why target audience responds>",
      "relationship_to_positioning": "<connection to positioning angle>",
      "potential_concern": "<honest concern or pitfall>",
      "critic_analysis": "<preemptive critique>",
      "sharper_alternative": "<alternative or variation>"
    }
  ],
  "personality_traits": [
    { "trait": "<trait name>", "audience_justification": "<why audience needs this>" }
  ],
  "traits_to_avoid": ["<anti-pattern trait>"],
  "brand_principles": [
    { "principle": "<rule>", "rationale": "<reasoning>" }
  ]
}`;

    const execution = await this.retryManager.executeWithRetry<NamingPersonalityContent>(
      'naming_personality',
      prompt,
      NamingPersonalitySchema,
      provider,
      (data, rawText) => {
        // Enforce trademark/domain ban on both structured output and raw LLM text
        const combined = `${JSON.stringify(data)} ${rawText}`;
        return checkNoTrademarkDomainClaims(combined);
      }
    );

    const draft: StageDraft = {
      stage: 'naming_personality',
      content: execution.data as unknown as Record<string, unknown>,
      generated_at: new Date().toISOString(),
      attempt: execution.attemptCount,
    };

    // Run Critic on naming draft
    const findings = await this.criticEngine.critiqueStage(
      'naming_personality',
      execution.data as unknown as Record<string, unknown>,
      { approved_decisions: input.approved_decisions as any },
      provider
    );

    const finalContent: NamingPersonalityContent = {
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
   * User approval action for Naming + Personality.
   * Explicit user action writes to approved_decisions.naming_personality and records revision log.
   */
  approveNamingPersonality(
    ctx: SharedContext,
    content: NamingPersonalityContent,
    causeId: string,
    userEdits?: Partial<NamingPersonalityContent>
  ): SharedContext {
    const finalApproved = userEdits ? { ...content, ...userEdits } : content;
    const cause = userEdits ? 'user_edit' : 'strategist_approved';

    return writeApprovedDecision(
      ctx,
      'naming_personality',
      finalApproved as unknown as Record<string, unknown>,
      cause,
      causeId
    );
  }
}
