import type {
  StageName,
  StageInput,
  ApprovedDecision,
  CriticFinding,
  ConsistencyFinding,
} from '@foil/shared';
import {
  CriticFindingsArraySchema,
  ConsistencyFindingsArraySchema,
} from '@foil/shared';
import type { AIProvider } from '../ai/provider.js';
import { RetryManager } from '../validation/retryManager.js';
import { buildStageCriticPrompt, buildHolisticAuditPrompt } from './prompts.js';

export class CriticEngine {
  private retryManager: RetryManager;

  constructor(retryManager = new RetryManager()) {
    this.retryManager = retryManager;
  }

  /**
   * Critiques a single stage's draft against upstream context.
   *
   * Invariants enforced:
   * 1. Evaluates for: cliche, audience_mismatch, contradiction, vague, bias.
   * 2. Enforces non-empty sharper_alternative for every single finding.
   * 3. Advisory only — NEVER directly approves or mutates state.
   */
  async critiqueStage(
    stage: StageName,
    draftContent: Record<string, unknown>,
    input: StageInput,
    provider: AIProvider
  ): Promise<CriticFinding[]> {
    const prompt = buildStageCriticPrompt(stage, draftContent, input);

    const execution = await this.retryManager.executeWithRetry<CriticFinding[]>(
      stage,
      prompt,
      CriticFindingsArraySchema,
      provider,
      (findings) => {
        for (const f of findings) {
          if (!f.sharper_alternative || f.sharper_alternative.trim().length === 0) {
            return {
              valid: false,
              reason: `Critic finding "${f.id}" is missing a required non-empty sharper_alternative`,
            };
          }
        }
        return { valid: true };
      }
    );

    return execution.data;
  }

  /**
   * Evaluates the complete approved brand system for cross-field consistency.
   * Architecturally the same Critic engine applied whole-system wide (no 3rd agent).
   */
  async auditWholeSystem(
    approvedDecisions: Partial<Record<StageName, ApprovedDecision>>,
    provider: AIProvider
  ): Promise<ConsistencyFinding[]> {
    const prompt = buildHolisticAuditPrompt(approvedDecisions);

    const execution = await this.retryManager.executeWithRetry<ConsistencyFinding[]>(
      'consistency_audit',
      prompt,
      ConsistencyFindingsArraySchema,
      provider,
      (findings) => {
        for (const f of findings) {
          if (!f.sharper_alternative || f.sharper_alternative.trim().length === 0) {
            return {
              valid: false,
              reason: `Consistency finding "${f.id}" is missing a required non-empty sharper_alternative`,
            };
          }
          if (!f.fields_in_conflict || f.fields_in_conflict.length === 0) {
            return {
              valid: false,
              reason: `Consistency finding "${f.id}" must list at least one field in fields_in_conflict`,
            };
          }
        }
        return { valid: true };
      }
    );

    return execution.data;
  }
}
