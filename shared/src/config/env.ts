/**
 * Environment configuration and security validator for FOIL.
 * Task T-002: Configure required environment variables and ensure secrets
 * never enter source control or frontend bundles.
 */

export interface EnvironmentConfig {
  NODE_ENV: "development" | "production" | "test";
  PORT: number;
  AI_PROVIDER: "OPENAI" | "GEMINI";
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  AI_MODEL_NAME?: string;
  AI_REQUEST_TIMEOUT_MS: number;
  SUPABASE_URL?: string;
  VITE_API_BASE_URL: string;
  VITE_SUPABASE_URL?: string;
}

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  config?: EnvironmentConfig;
}

/**
 * Validates environment variables according to architecture.md.
 * Ensures backend secrets are not leaked to frontend bundles.
 */
export function validateEnvironment(env: Record<string, string | undefined>): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const NODE_ENV = (env.NODE_ENV || "development") as EnvironmentConfig["NODE_ENV"];
  if (!["development", "production", "test"].includes(NODE_ENV)) {
    errors.push(`Invalid NODE_ENV "${env.NODE_ENV}". Must be 'development', 'production', or 'test'.`);
  }

  const portStr = env.PORT || "5000";
  const PORT = parseInt(portStr, 10);
  if (isNaN(PORT) || PORT <= 0 || PORT > 65535) {
    errors.push(`Invalid PORT "${portStr}". Must be a valid TCP port (1-65535).`);
  }

  const AI_PROVIDER = (env.AI_PROVIDER?.toUpperCase() || "OPENAI") as EnvironmentConfig["AI_PROVIDER"];
  if (!["OPENAI", "GEMINI"].includes(AI_PROVIDER)) {
    errors.push(`Invalid AI_PROVIDER "${env.AI_PROVIDER}". Must be 'OPENAI' or 'GEMINI'.`);
  }

  const openAiKey = env.OPENAI_API_KEY?.trim();
  const geminiKey = env.GEMINI_API_KEY?.trim();

  if (AI_PROVIDER === "OPENAI") {
    if (!openAiKey || openAiKey === "your_openai_api_key_here") {
      errors.push("Missing or placeholder OPENAI_API_KEY when AI_PROVIDER is 'OPENAI'.");
    }
  } else if (AI_PROVIDER === "GEMINI") {
    if (!geminiKey || geminiKey === "your_gemini_api_key_here") {
      errors.push("Missing or placeholder GEMINI_API_KEY when AI_PROVIDER is 'GEMINI'.");
    }
  }

  // Security check: Secrets must NOT be prefixed with VITE_
  const leakedViteSecrets = Object.keys(env).filter((key) => {
    if (!key.startsWith("VITE_")) return false;
    const lower = key.toLowerCase();
    return (
      lower.includes("secret") ||
      lower.includes("service_role") ||
      lower.includes("openai_api_key") ||
      lower.includes("private")
    );
  });

  if (leakedViteSecrets.length > 0) {
    errors.push(
      `SECURITY ALERT: Secret variables prefixed with 'VITE_' will be exposed in client bundles: ${leakedViteSecrets.join(", ")}`
    );
  }

  const timeoutMsStr = env.AI_REQUEST_TIMEOUT_MS || "30000";
  const AI_REQUEST_TIMEOUT_MS = parseInt(timeoutMsStr, 10);
  if (isNaN(AI_REQUEST_TIMEOUT_MS) || AI_REQUEST_TIMEOUT_MS < 1000) {
    errors.push(`Invalid AI_REQUEST_TIMEOUT_MS "${timeoutMsStr}". Must be >= 1000 ms.`);
  }

  const VITE_API_BASE_URL = env.VITE_API_BASE_URL || `http://localhost:${PORT}`;

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  return {
    valid: true,
    errors: [],
    warnings,
    config: {
      NODE_ENV,
      PORT,
      AI_PROVIDER,
      OPENAI_API_KEY: openAiKey,
      GEMINI_API_KEY: geminiKey,
      AI_MODEL_NAME: env.AI_MODEL_NAME,
      AI_REQUEST_TIMEOUT_MS,
      SUPABASE_URL: env.SUPABASE_URL,
      VITE_API_BASE_URL,
      VITE_SUPABASE_URL: env.VITE_SUPABASE_URL,
    },
  };
}
