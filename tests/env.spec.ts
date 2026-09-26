import { describe, expect, it } from "vitest";
import { validateEnvironment } from "../shared/src/config/env.js";

describe("T-002: Environment Configuration and Security Validator", () => {
  it("passes validation with valid OpenAI configuration", () => {
    const result = validateEnvironment({
      NODE_ENV: "development",
      PORT: "5000",
      AI_PROVIDER: "OPENAI",
      OPENAI_API_KEY: "sk-proj-valid-test-key",
      AI_REQUEST_TIMEOUT_MS: "30000",
      VITE_API_BASE_URL: "http://localhost:5000",
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.config?.AI_PROVIDER).toBe("OPENAI");
    expect(result.config?.PORT).toBe(5000);
  });

  it("fails with clear error when required API key is missing", () => {
    const result = validateEnvironment({
      NODE_ENV: "development",
      PORT: "5000",
      AI_PROVIDER: "OPENAI",
      OPENAI_API_KEY: "",
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("OPENAI_API_KEY"))).toBe(true);
  });

  it("fails when placeholder API key is used", () => {
    const result = validateEnvironment({
      NODE_ENV: "development",
      PORT: "5000",
      AI_PROVIDER: "OPENAI",
      OPENAI_API_KEY: "your_openai_api_key_here",
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("placeholder OPENAI_API_KEY"))).toBe(true);
  });

  it("SECURITY: detects and blocks backend secrets mistakenly prefixed with VITE_", () => {
    const result = validateEnvironment({
      NODE_ENV: "development",
      PORT: "5000",
      AI_PROVIDER: "OPENAI",
      OPENAI_API_KEY: "sk-proj-valid-test-key",
      VITE_SUPABASE_SERVICE_ROLE_KEY: "secret_admin_bypass_token",
    });

    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) =>
        e.includes("SECURITY ALERT: Secret variables prefixed with 'VITE_'")
      )
    ).toBe(true);
  });

  it("validates port boundary constraints", () => {
    const result = validateEnvironment({
      PORT: "99999",
      AI_PROVIDER: "OPENAI",
      OPENAI_API_KEY: "sk-proj-test",
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Invalid PORT"))).toBe(true);
  });
});
