import type { AIProvider } from './provider.js';
import { OpenAIProvider } from './providers/openai.js';
import { GeminiProvider } from './providers/gemini.js';
import { MockAIProvider } from './providers/mock.js';
import { AIProviderError } from './provider.js';

let defaultProviderInstance: AIProvider | null = null;

export function getAIProvider(overrideProvider?: AIProvider): AIProvider {
  if (overrideProvider) {
    return overrideProvider;
  }

  if (defaultProviderInstance) {
    return defaultProviderInstance;
  }

  const selected = (process.env.AI_PROVIDER || 'MOCK').toUpperCase();

  switch (selected) {
    case 'OPENAI':
      defaultProviderInstance = new OpenAIProvider();
      return defaultProviderInstance;
    case 'GEMINI':
      defaultProviderInstance = new GeminiProvider();
      return defaultProviderInstance;
    case 'MOCK':
      defaultProviderInstance = new MockAIProvider();
      return defaultProviderInstance;
    default:
      throw new AIProviderError(
        `Unsupported AI_PROVIDER: "${process.env.AI_PROVIDER}". Must be 'OPENAI', 'GEMINI', or 'MOCK'.`,
        'provider_unavailable',
        false
      );
  }
}

export function setAIProvider(provider: AIProvider | null): void {
  defaultProviderInstance = provider;
}
