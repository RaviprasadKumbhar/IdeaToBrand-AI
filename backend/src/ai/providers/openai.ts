import type { ZodSchema } from 'zod';
import type { CriticFinding } from '@foil/shared';
import {
  AIProvider,
  AIProviderResult,
  AIProviderError,
  RateLimitError,
  TimeoutError,
  extractJSONFromText,
} from '../provider.js';

export interface OpenAIProviderConfig {
  apiKey?: string;
  model?: string;
  defaultTimeoutMs?: number;
}

export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private model: string;
  private defaultTimeoutMs: number;

  constructor(config: OpenAIProviderConfig = {}) {
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
    this.model = config.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.defaultTimeoutMs =
      config.defaultTimeoutMs ||
      Number(process.env.AI_REQUEST_TIMEOUT_MS) ||
      30000;

    if (!this.apiKey) {
      throw new AIProviderError(
        'OPENAI_API_KEY is not configured on the server',
        'provider_unavailable',
        false
      );
    }
  }

  async generateStructured<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options?: { timeoutMs?: number; signal?: AbortSignal }
  ): Promise<AIProviderResult<T>> {
    return this.callOpenAI(prompt, schema, options);
  }

  async generateCritique(
    prompt: string,
    schema: ZodSchema<CriticFinding[]>,
    options?: { timeoutMs?: number; signal?: AbortSignal }
  ): Promise<AIProviderResult<CriticFinding[]>> {
    return this.callOpenAI(prompt, schema, options);
  }

  private async callOpenAI<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options?: { timeoutMs?: number; signal?: AbortSignal }
  ): Promise<AIProviderResult<T>> {
    const timeoutMs = options?.timeoutMs || this.defaultTimeoutMs;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // If an external signal aborts, forward it
    if (options?.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'You are a core component of FOIL, the staged brand strategy engine. Return valid JSON only, strictly matching the required schema.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = Number(response.headers.get('retry-after')) || 10;
          throw new RateLimitError(`OpenAI rate limit reached (HTTP 429)`, retryAfter);
        }

        const errorBody = await response.text().catch(() => '');
        throw new AIProviderError(
          `OpenAI API error (HTTP ${response.status}): ${errorBody.slice(0, 200)}`,
          'provider_unavailable',
          response.status >= 500
        );
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const raw = data.choices?.[0]?.message?.content || '{}';
      const cleanJSON = extractJSONFromText(raw);

      try {
        const parsedJSON = JSON.parse(cleanJSON);
        const validated = schema.safeParse(parsedJSON);

        if (validated.success) {
          return { raw, parsed: validated.data };
        } else {
          return {
            raw,
            parsed: null,
            validationError: validated.error.message,
          };
        }
      } catch (parseErr: unknown) {
        const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
        return {
          raw,
          parsed: null,
          validationError: `JSON parse error: ${msg}`,
        };
      }
    } catch (err: unknown) {
      if (err instanceof AIProviderError) {
        throw err;
      }
      if (err instanceof Error && err.name === 'AbortError') {
        throw new TimeoutError(`OpenAI request timed out after ${timeoutMs}ms`);
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new AIProviderError(`OpenAI connection failed: ${msg}`, 'provider_unavailable', true);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
