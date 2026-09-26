import type { ZodType } from 'zod';
import type { CriticFinding } from '@foil/shared';

export class AIProviderError extends Error {
  public readonly retryable: boolean;
  public readonly errorType: 'provider_unavailable' | 'rate_limited' | 'schema_validation_failed';

  constructor(
    message: string,
    errorType: 'provider_unavailable' | 'rate_limited' | 'schema_validation_failed' = 'provider_unavailable',
    retryable = true
  ) {
    super(message);
    this.name = 'AIProviderError';
    this.errorType = errorType;
    this.retryable = retryable;
  }
}

export class RateLimitError extends AIProviderError {
  public readonly retryAfterSeconds?: number;

  constructor(message = 'Rate limit exceeded for AI provider', retryAfterSeconds?: number) {
    super(message, 'rate_limited', true);
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class TimeoutError extends AIProviderError {
  constructor(message = 'AI request timed out') {
    super(message, 'provider_unavailable', true);
    this.name = 'TimeoutError';
  }
}

export interface AIProviderResult<T> {
  raw: string;
  parsed: T | null;
  validationError?: string;
}

export interface AIProvider {
  generateStructured<T>(
    prompt: string,
    schema: ZodType<T, any, any>,
    options?: { timeoutMs?: number; signal?: AbortSignal }
  ): Promise<AIProviderResult<T>>;

  generateCritique(
    prompt: string,
    schema: ZodType<CriticFinding[], any, any>,
    options?: { timeoutMs?: number; signal?: AbortSignal }
  ): Promise<AIProviderResult<CriticFinding[]>>;
}

/**
 * Robust JSON extraction from raw LLM text.
 * Handles ```json code blocks, markdown text, or raw JSON.
 */
export function extractJSONFromText(text: string): string {
  const trimmed = text.trim();

  // Pattern 1: Look for ```json ... ``` or ``` ... ```
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim();
  }

  // Pattern 2: Look for the outermost { ... } or [ ... ]
  const firstBrace = trimmed.indexOf('{');
  const firstBracket = trimmed.indexOf('[');

  let startIndex = -1;
  let isObject = false;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIndex = firstBrace;
    isObject = true;
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
    isObject = false;
  }

  if (startIndex !== -1) {
    const endChar = isObject ? '}' : ']';
    const lastIndex = trimmed.lastIndexOf(endChar);
    if (lastIndex > startIndex) {
      return trimmed.slice(startIndex, lastIndex + 1).trim();
    }
  }

  return trimmed;
}
