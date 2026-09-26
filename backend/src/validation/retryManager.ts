import type { ZodType } from 'zod';
import type { StageName, StageErrorResponse } from '@foil/shared';
import { AIProvider, AIProviderError, extractJSONFromText } from '../ai/provider.js';

export interface RetryManagerOptions {
  maxAutoRetries?: number; // Default 2 retries (3 total attempts)
  timeoutMs?: number;
}

export class RetryManager {
  private maxAutoRetries: number;
  private timeoutMs?: number;

  constructor(options: RetryManagerOptions = {}) {
    this.maxAutoRetries = options.maxAutoRetries ?? 2;
    this.timeoutMs = options.timeoutMs;
  }

  /**
   * Executes an AI completion with bounded retries on Zod validation failure.
   * If validation fails, appends the specific Zod error to the prompt and retries.
   * If retries are exhausted, throws a structured StageErrorResponse.
   */
  async executeWithRetry<T>(
    stage: StageName,
    initialPrompt: string,
    schema: ZodType<T, any, any>,
    provider: AIProvider,
    postValidator?: (data: T, rawText: string) => { valid: boolean; reason?: string }
  ): Promise<{ data: T; attemptCount: number; raw: string }> {
    let currentPrompt = initialPrompt;
    let lastError = 'Unknown schema validation failure';
    let lastRaw = '';

    const maxAttempts = 1 + this.maxAutoRetries; // e.g. 1 initial + 2 retries = 3 attempts

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await provider.generateStructured(currentPrompt, schema, {
          timeoutMs: this.timeoutMs,
        });

        lastRaw = result.raw;

        if (result.parsed) {
          // If a postValidator is provided (e.g. checking trademark claims or divergence), run it
          if (postValidator) {
            const check = postValidator(result.parsed, result.raw);
            if (!check.valid) {
              lastError = check.reason || 'Failed post-generation validation check';
              if (attempt < maxAttempts) {
                currentPrompt = `${initialPrompt}\n\n[RETRY ATTEMPT ${attempt} of ${this.maxAutoRetries}]: Your previous output failed this requirement: "${lastError}". Please correct this immediately and return strictly valid JSON matching the schema.`;
                continue;
              } else {
                break;
              }
            }
          }

          return {
            data: result.parsed,
            attemptCount: attempt,
            raw: result.raw,
          };
        }

        // Schema validation failed
        lastError = result.validationError || 'Schema validation failed';

        if (attempt < maxAttempts) {
          currentPrompt = `${initialPrompt}\n\n[RETRY ATTEMPT ${attempt} of ${this.maxAutoRetries}]: Your previous JSON response did not match the required schema. Specific validation error:\n${lastError}\n\nPlease regenerate the JSON response correcting these specific fields.`;
        }
      } catch (err: unknown) {
        if (err instanceof AIProviderError && err.errorType === 'rate_limited') {
          const errorResponse: StageErrorResponse = {
            stage,
            error_type: 'rate_limited',
            message: err.message,
            retryable: true,
          };
          throw errorResponse;
        }

        if (err instanceof AIProviderError && err.errorType === 'provider_unavailable') {
          const errorResponse: StageErrorResponse = {
            stage,
            error_type: 'provider_unavailable',
            message: err.message,
            retryable: true,
          };
          throw errorResponse;
        }

        const msg = err instanceof Error ? err.message : String(err);
        lastError = msg;
      }
    }

    // Bounded retries exhausted — return visible structured error, NEVER fake success
    const finalError: StageErrorResponse = {
      stage,
      error_type: 'schema_validation_failed',
      message: `Schema validation failed after ${maxAttempts} attempts for stage "${stage}". Last error: ${lastError}`,
      retryable: true,
    };

    throw finalError;
  }
}

/**
 * Trademark and domain availability guard for Naming stage.
 * Checks for prohibited claims like "is available", "not taken", ".com is free".
 */
export function checkNoTrademarkDomainClaims(text: string): { valid: boolean; reason?: string } {
  const forbiddenPatterns = [
    /\b(domain|trademark|handle|username|tld|\.com|\.io|\.ai)\s+(is\s+)?(available|free|unregistered|taken|unclaimed|open)\b/i,
    /\b(not\s+taken|available\s+on\s+all|unregistered\s+trademark)\b/i,
    /\b(available\s+for\s+registration|guaranteed\s+available)\b/i,
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(text)) {
      return {
        valid: false,
        reason:
          'Output contains unsupported trademark or domain availability claims. FOIL strictly prohibits claiming trademark or domain availability without verified real-time registry checks.',
      };
    }
  }

  return { valid: true };
}
