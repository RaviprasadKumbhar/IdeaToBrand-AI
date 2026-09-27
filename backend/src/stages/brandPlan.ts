import { z } from 'zod';
import type { AIProvider } from '../ai/provider.js';
import type { StageDraft, CriticFinding, SharedContext } from '@foil/shared';
import { validateIdeaWordCount } from './discovery.js';
import { generateContextualBrandPlan } from '../ai/contextualEngine.js';

export const BrandPlanSchema = z.object({
  brand_concept: z.string().min(5),
  target_audience: z.string().min(5),
  problem: z.string().min(5),
  value_proposition: z.string().min(5),
  brand_personality: z.object({
    archetype: z.string(),
    traits: z.array(z.string()).min(2),
    tone: z.string(),
  }),
  name_suggestions: z.array(
    z.object({
      name: z.string(),
      rationale: z.string(),
    })
  ).min(2),
  tagline: z.string().min(3),
  visual_direction: z.object({
    primary_color: z.string(),
    palette: z.array(z.string()).min(3),
    typography: z.string(),
    aesthetic_keywords: z.array(z.string()).min(2),
  }),
  brand_voice: z.object({
    style: z.string(),
    key_pillars: z.array(z.string()).min(2),
    dos: z.array(z.string()).min(2),
    donts: z.array(z.string()).min(2),
  }),
  launch_content: z.object({
    headline: z.string(),
    announcement_pitch: z.string(),
    key_channels: z.array(z.string()).min(2),
    first_week_plan: z.array(z.string()).min(2),
  }),
  consistency_audit: z.object({
    alignment_score: z.number().min(0).max(100),
    verdict: z.string(),
    risks_checked: z.array(z.string()).min(1),
  }),
});

export type BrandPlan = z.infer<typeof BrandPlanSchema>;

export interface GenerateBrandPlanInput {
  idea: string;
  business_description?: string;
  user_facts?: string[];
  constraints?: string[];
  project_name?: string;
}

export interface BrandPlanResult {
  project_id: string;
  brand_plan: BrandPlan;
  approved_decisions: Record<string, unknown>;
  markdown_plan: string;
  supabase_saved?: boolean;
}

export class BrandPlanPipelineService {
  async generateCompleteBrandPlan(
    input: GenerateBrandPlanInput,
    provider: AIProvider
  ): Promise<BrandPlanResult> {
    const rawIdea = input.idea || input.business_description || '';
    const validation = validateIdeaWordCount(rawIdea);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid business idea provided.');
    }

    const prompt = `=== SYSTEM INSTRUCTIONS ===
You are the Lead Brand Strategist for INKLOOM (FOIL), the AI brand engine.
Transform the founder's raw startup idea into an authoritative, launch-ready, structured BRAND PLAN.
Output MUST be strict JSON matching the required schema.

=== USER IDEA ===
Raw Startup Idea: "${rawIdea.trim()}"
Idea: "${rawIdea.trim()}"
${input.constraints?.length ? `Constraints: ${input.constraints.join(', ')}` : ''}
${input.user_facts?.length ? `Known Facts: ${input.user_facts.join('; ')}` : ''}

=== SCHEMA REQUIREMENTS ===
Return a single JSON object with these 11 exact fields:
1. "brand_concept": Concise, compelling definition of the core business concept.
2. "target_audience": Primary target market, demographics, and behavioral profile.
3. "problem": Core customer pain point and market friction.
4. "value_proposition": Unfair advantage and specific customer transformation.
5. "brand_personality": { "archetype": string, "traits": string[], "tone": string }
6. "name_suggestions": array of at least 3 { "name": string, "rationale": string }
7. "tagline": Powerful 3-8 word brand hook.
8. "visual_direction": { "primary_color": string, "palette": string[], "typography": string, "aesthetic_keywords": string[] }
9. "brand_voice": { "style": string, "key_pillars": string[], "dos": string[], "donts": string[] }
10. "launch_content": { "headline": string, "announcement_pitch": string, "key_channels": string[], "first_week_plan": string[] }
11. "consistency_audit": { "alignment_score": number (0-100), "verdict": string, "risks_checked": string[] }
`;

    const res = await provider.generateStructured(prompt, BrandPlanSchema);
    let plan = res.parsed;

    if (!plan) {
      // Robust deterministic contextual synthesis if LLM returns non-conforming JSON
      plan = generateContextualBrandPlan(rawIdea, input.user_facts, input.constraints);
    }

    const projectId = `proj_${Date.now()}`;
    const approvedDecisions = this.assembleStageDecisions(plan, rawIdea);
    const markdownPlan = this.renderMarkdown(plan);

    return {
      project_id: projectId,
      brand_plan: plan,
      approved_decisions: approvedDecisions,
      markdown_plan: markdownPlan,
    };
  }

  private synthesizeContextualBrandPlan(idea: string, userFacts?: string[]): BrandPlan {
    return generateContextualBrandPlan(idea, userFacts);
  }

  private assembleStageDecisions(plan: BrandPlan, idea: string): Record<string, unknown> {
    return {
      discovery: {
        brand_concept: plan.brand_concept,
        target_audience: plan.target_audience,
        core_problem: plan.problem,
        value_desired_outcome: plan.value_proposition,
        known_facts: [idea],
        inferred_assumptions: [
          {
            value: plan.value_proposition,
            rationale: 'Synthesized from core founder concept requirements',
          },
        ],
      },
      positioning: {
        directions: [
          {
            title: 'Value Leader',
            statement: `For ${plan.target_audience}, ${plan.brand_concept} delivers ${plan.value_proposition} unlike conventional legacy alternatives.`,
            competitor_comparison: 'More accessible and tailored than legacy incumbents.',
          },
        ],
      },
      naming_personality: {
        selected_name: plan.name_suggestions[0]?.name || 'Inkloom Brand',
        personality: plan.brand_personality,
        name_options: plan.name_suggestions,
      },
      tagline_pitch: {
        tagline: plan.tagline,
        elevator_pitch: plan.launch_content.announcement_pitch,
      },
      visual_brief: {
        primary_color: plan.visual_direction.primary_color,
        palette: plan.visual_direction.palette,
        typography: plan.visual_direction.typography,
        aesthetic: plan.visual_direction.aesthetic_keywords.join(', '),
      },
      voice_messaging: {
        voice: plan.brand_voice.style,
        pillars: plan.brand_voice.key_pillars,
        guidelines: {
          dos: plan.brand_voice.dos,
          donts: plan.brand_voice.donts,
        },
      },
      launch_prep: {
        headline: plan.launch_content.headline,
        channels: plan.launch_content.key_channels,
        roadmap: plan.launch_content.first_week_plan,
      },
    };
  }

  private renderMarkdown(plan: BrandPlan): string {
    return `# Brand Plan: ${plan.brand_concept}

> **Tagline:** "${plan.tagline}"

---

## 1. Executive Summary & Brand Concept
- **Concept:** ${plan.brand_concept}
- **Target Audience:** ${plan.target_audience}
- **Core Problem:** ${plan.problem}
- **Value Proposition:** ${plan.value_proposition}

---

## 2. Brand Identity & Personality
- **Archetype:** ${plan.brand_personality.archetype}
- **Traits:** ${plan.brand_personality.traits.join(', ')}
- **Tone:** ${plan.brand_personality.tone}

### Name Suggestions
${plan.name_suggestions.map((n) => `- **${n.name}**: ${n.rationale}`).join('\n')}

---

## 3. Visual & Creative Direction
- **Primary Color:** \`${plan.visual_direction.primary_color}\`
- **Palette:** ${plan.visual_direction.palette.map((c) => `\`${c}\``).join(' ')}
- **Typography:** ${plan.visual_direction.typography}
- **Aesthetic:** ${plan.visual_direction.aesthetic_keywords.join(', ')}

---

## 4. Brand Voice & Messaging
- **Voice Style:** ${plan.brand_voice.style}
- **Pillars:** ${plan.brand_voice.key_pillars.join(' | ')}

### Guidelines
- **DO:**
${plan.brand_voice.dos.map((d) => `  - ${d}`).join('\n')}
- **DON'T:**
${plan.brand_voice.donts.map((d) => `  - ${d}`).join('\n')}

---

## 5. Launch & Go-To-Market Plan
- **Headline Announcement:** "${plan.launch_content.headline}"
- **Announcement Pitch:** ${plan.launch_content.announcement_pitch}
- **Key Channels:** ${plan.launch_content.key_channels.join(', ')}

### First Week Roadmap
${plan.launch_content.first_week_plan.map((s) => `- ${s}`).join('\n')}

---

## 6. Strategic Consistency Self-Check
- **Alignment Score:** ${plan.consistency_audit.alignment_score}/100
- **Verdict:** ${plan.consistency_audit.verdict}
- **Risks Validated:**
${plan.consistency_audit.risks_checked.map((r) => `  - ✓ ${r}`).join('\n')}
`;
  }
}
