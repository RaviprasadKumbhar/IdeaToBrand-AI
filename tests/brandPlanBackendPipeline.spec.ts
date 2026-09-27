import { describe, expect, it } from 'vitest';
import { app } from '../backend/src/server.js';
import { BrandPlanSchema } from '../backend/src/stages/brandPlan.js';

async function testRequest(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {}
): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      const port = (server.address() as any).port;
      try {
        const response = await fetch(`http://localhost:${port}${path}`, {
          method,
          headers: { 'Content-Type': 'application/json', ...headers },
          body: body ? JSON.stringify(body) : undefined,
        });
        const json = await response.json();
        server.close(() => resolve({ status: response.status, json }));
      } catch (err) {
        server.close(() => reject(err));
      }
    });
  });
}

describe('INKLOOM — Brand Plan Generation API & Pipeline (Phases 1-9)', () => {
  const collegeSnackIdea =
    'A healthy vegetarian snack brand for college students that wants affordable high-protein snacks.';

  it('POST /api/brand-plan returns 200 and structured brand plan with all 11 required sections', async () => {
    const res = await testRequest('POST', '/api/brand-plan', {
      idea: collegeSnackIdea,
    });

    expect(res.status).toBe(200);
    expect(res.json.status).toBe('success');
    expect(res.json.project_id).toBeDefined();

    const plan = res.json.brand_plan;
    expect(plan).toBeDefined();

    // 1. Brand/business concept
    expect(plan.brand_concept).toBeTruthy();
    expect(typeof plan.brand_concept).toBe('string');

    // 2. Target audience
    expect(plan.target_audience).toBeTruthy();
    expect(plan.target_audience.toLowerCase()).toContain('student');

    // 3. Problem
    expect(plan.problem).toBeTruthy();

    // 4. Value proposition
    expect(plan.value_proposition).toBeTruthy();

    // 5. Brand personality
    expect(plan.brand_personality).toBeDefined();
    expect(plan.brand_personality.archetype).toBeTruthy();
    expect(Array.isArray(plan.brand_personality.traits)).toBe(true);
    expect(plan.brand_personality.traits.length).toBeGreaterThanOrEqual(2);

    // 6. Brand/name suggestions
    expect(Array.isArray(plan.name_suggestions)).toBe(true);
    expect(plan.name_suggestions.length).toBeGreaterThanOrEqual(2);
    expect(plan.name_suggestions[0].name).toBeTruthy();
    expect(plan.name_suggestions[0].rationale).toBeTruthy();

    // 7. Tagline
    expect(plan.tagline).toBeTruthy();

    // 8. Visual direction
    expect(plan.visual_direction).toBeDefined();
    expect(plan.visual_direction.primary_color).toMatch(/^#/);
    expect(Array.isArray(plan.visual_direction.palette)).toBe(true);
    expect(plan.visual_direction.typography).toBeTruthy();

    // 9. Brand voice
    expect(plan.brand_voice).toBeDefined();
    expect(plan.brand_voice.style).toBeTruthy();
    expect(Array.isArray(plan.brand_voice.dos)).toBe(true);
    expect(Array.isArray(plan.brand_voice.donts)).toBe(true);

    // 10. Launch content
    expect(plan.launch_content).toBeDefined();
    expect(plan.launch_content.headline).toBeTruthy();
    expect(plan.launch_content.announcement_pitch).toBeTruthy();
    expect(Array.isArray(plan.launch_content.key_channels)).toBe(true);
    expect(Array.isArray(plan.launch_content.first_week_plan)).toBe(true);

    // 11. Consistency/self-check
    expect(plan.consistency_audit).toBeDefined();
    expect(plan.consistency_audit.alignment_score).toBeGreaterThanOrEqual(0);
    expect(plan.consistency_audit.verdict).toBeTruthy();
    expect(Array.isArray(plan.consistency_audit.risks_checked)).toBe(true);

    // Conformance to Zod schema
    const parseResult = BrandPlanSchema.safeParse(plan);
    expect(parseResult.success).toBe(true);

    // Formatted markdown document
    expect(res.json.markdown_plan).toContain('# Brand Plan');
    expect(res.json.markdown_plan).toContain(plan.tagline);
  });

  it('POST /api/brand-plan/generate alias works identically', async () => {
    const res = await testRequest('POST', '/api/brand-plan/generate', {
      idea: collegeSnackIdea,
    });
    expect(res.status).toBe(200);
    expect(res.json.brand_plan.brand_concept).toBeTruthy();
  });

  it('POST /api/brand-plan rejects empty idea with 400 invalid_input', async () => {
    const res = await testRequest('POST', '/api/brand-plan', {
      idea: '   ',
    });
    expect(res.status).toBe(400);
    expect(res.json.error_type).toBe('invalid_input');
  });

  it('POST /api/brand-plan rejects input exceeding 500 words with 400', async () => {
    const longIdea = Array(505).fill('protein').join(' ');
    const res = await testRequest('POST', '/api/brand-plan', {
      idea: longIdea,
    });
    expect(res.status).toBe(400);
    expect(res.json.message).toContain('exceeds 500 words');
  });

  it('GET /api/projects returns 401 when unauthenticated in non-test mode or with invalid token', async () => {
    const res = await testRequest(
      'GET',
      '/api/projects',
      undefined,
      { Authorization: 'Bearer invalid_forged_token' }
    );
    expect(res.status).toBe(401);
    expect(res.json.error_type).toBe('unauthorized');
  });
});
