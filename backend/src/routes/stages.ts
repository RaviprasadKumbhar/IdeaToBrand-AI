import { Request, Response, Router } from "express";
import type { StageName, SharedContext } from "@foil/shared";
import { assembleBrandKit, validateExportEligibility } from "@foil/shared";
import { getAIProvider } from "../ai/factory.js";
import { DiscoveryStageService } from "../stages/discovery.js";
import { PositioningStageService } from "../stages/positioning.js";
import { NamingPersonalityStageService } from "../stages/namingPersonality.js";
import { TaglinePitchStageService } from "../stages/taglinePitch.js";
import { VisualBriefStageService } from "../stages/visualBrief.js";
import { VoiceMessagingStageService } from "../stages/voiceMessaging.js";
import { LaunchPrepStageService } from "../stages/launchPrep.js";
import { ConsistencyAuditService } from "../stages/consistencyAudit.js";
import { CriticEngine } from "../critic/index.js";

export const stagesRouter = Router();

const discoveryService = new DiscoveryStageService();
const positioningService = new PositioningStageService();
const namingService = new NamingPersonalityStageService();
const taglineService = new TaglinePitchStageService();
const visualService = new VisualBriefStageService();
const voiceService = new VoiceMessagingStageService();
const launchService = new LaunchPrepStageService();
const auditService = new ConsistencyAuditService();
const criticEngine = new CriticEngine();

// ─── Fact and Idea Normalization Helpers ─────────────────────────────────────
function normalizeFactValue(fact: unknown): string | null {
  if (typeof fact === 'string') {
    const trimmed = fact.trim();
    if (!trimmed || trimmed === '[object Object]') return null;
    return trimmed;
  }
  if (!fact || typeof fact !== 'object') return null;
  const obj = fact as Record<string, unknown>;
  const textVal = obj.text || obj.value || obj.description || obj.fact || obj.name;
  if (typeof textVal === 'string' && textVal.trim() && textVal.trim() !== '[object Object]') {
    const label = typeof obj.label === 'string' && obj.label.trim() ? `${obj.label.trim()}: ` : '';
    return `${label}${textVal.trim()}`;
  }
  return null;
}

function extractCleanFacts(source: unknown): string[] {
  if (!source) return [];
  if (Array.isArray(source)) {
    return source.map(normalizeFactValue).filter((s): s is string => Boolean(s));
  }
  if (typeof source === 'object') {
    const values = Object.values(source as Record<string, unknown>);
    return values
      .flatMap((v) => (Array.isArray(v) ? v.map(normalizeFactValue) : [normalizeFactValue(v)]))
      .filter((s): s is string => Boolean(s));
  }
  return [];
}

function extractCleanIdeaText(payload: Record<string, any>, userFacts: Record<string, any>): string {
  const candidates = [
    payload.idea_text,
    payload.business_description,
    payload.idea,
    payload.concept,
    payload.idea_input?.business_description,
    userFacts?.business_description,
    userFacts?.idea_text,
    userFacts?.concept,
  ];

  for (const c of candidates) {
    if (typeof c === 'string') {
      const trimmed = c.trim();
      if (trimmed && trimmed !== '[object Object]') {
        return trimmed;
      }
    }
  }

  // Fallback: search for first non-object, descriptive string value in userFacts
  if (userFacts && typeof userFacts === 'object') {
    for (const val of Object.values(userFacts)) {
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed && trimmed.length > 5 && trimmed !== '[object Object]') {
          return trimmed;
        }
      }
    }
  }

  return '';
}

/**
 * POST /api/stages/:stage/generate
 * Unified dynamic stage generator for all FOIL pipeline stages.
 */
stagesRouter.post("/stages/:stage/generate", async (req: Request, res: Response) => {
  const stage = req.params.stage as StageName;
  const payload = req.body || {};
  const provider = getAIProvider();

  // Extract shared context or assemble an ephemeral context wrapper
  const approvedDecisions = payload.approved_decisions || payload.context?.approved_decisions || {};
  const userFacts = payload.user_facts || payload.context?.user_facts || {};

  const context: SharedContext = payload.context || {
    project_id: payload.project_id || `proj_${Date.now()}`,
    user_facts: userFacts,
    ai_assumptions: {},
    approved_decisions: approvedDecisions,
    stage_drafts: {},
    critic_findings: [],
    scenario_overrides: [],
    revision_log: [],
  };

  try {
    switch (stage) {
      case "discovery": {
        const ideaText = extractCleanIdeaText(payload, userFacts);
        if (!ideaText) {
          return res.status(400).json({
            stage: "discovery",
            error_type: "invalid_input",
            message: "Missing required startup idea or business description. Please provide a clear concept to generate your brand discovery plan.",
            retryable: false,
          });
        }

        const rawFacts = payload.known_facts
          ? extractCleanFacts(payload.known_facts)
          : extractCleanFacts(userFacts);

        const result = await discoveryService.generateDiscoveryDraft(
          {
            idea_text: ideaText,
            business_description: ideaText,
            user_facts: rawFacts,
            constraints: Array.isArray(payload.constraints) ? payload.constraints : [],
            context: payload.context_situation || "Brand initiation",
          },
          provider
        );
        return res.status(200).json({
          content: result.content,
          findings: result.findings,
        });
      }

      case "positioning": {
        const result = await positioningService.generatePositioningDirections(
          {
            approved_decisions: approvedDecisions,
            raw_input: payload.raw_input,
          },
          provider
        );
        const allFindings = result.directions.flatMap((d) => d.critic_findings || []);
        return res.status(200).json({
          content: { directions: result.directions },
          findings: allFindings,
        });
      }

      case "naming_personality": {
        const result = await namingService.generateNamingPersonalityDraft(
          {
            approved_decisions: approvedDecisions,
          },
          provider
        );
        return res.status(200).json({
          content: result.content,
          findings: result.findings,
        });
      }

      case "tagline_pitch": {
        const result = await taglineService.generateTaglinePitchDraft(
          {
            approved_decisions: approvedDecisions,
          },
          provider
        );
        return res.status(200).json({
          content: result.content,
          findings: result.findings,
        });
      }

      case "visual_brief": {
        const result = await visualService.generateVisualBriefDraft(
          {
            approved_decisions: approvedDecisions,
          },
          provider
        );
        return res.status(200).json({
          content: result.content,
          findings: result.findings,
        });
      }

      case "voice_messaging": {
        const result = await voiceService.generateVoiceMessagingDraft(
          {
            approved_decisions: approvedDecisions,
          },
          provider
        );
        return res.status(200).json({
          content: result.content,
          findings: result.findings,
        });
      }

      case "launch_prep": {
        const result = await launchService.generateLaunchPrepDraft(
          {
            approved_decisions: approvedDecisions,
          },
          provider
        );
        return res.status(200).json({
          content: result.content,
          findings: result.findings,
        });
      }

      case "consistency_audit": {
        const findings = await auditService.runAudit(approvedDecisions, provider);
        return res.status(200).json({
          content: { findings },
          findings,
        });
      }

      case "kit_export": {
        const gateResult = validateExportEligibility(context, payload.consistency_findings || context.consistency_findings || []);
        if (!gateResult.eligible) {
          return res.status(422).json({
            error_type: "export_gated",
            message: gateResult.failure_reason,
            missing_stage: gateResult.missing_stage,
          });
        }
        const bundle = assembleBrandKit(context, payload.consistency_findings || context.consistency_findings || []);
        return res.status(200).json({
          content: bundle,
          findings: [],
        });
      }

      default:
        return res.status(400).json({
          stage,
          error_type: "unknown_stage",
          message: `Unknown or non-generative stage: "${stage}".`,
          retryable: false,
        });
    }
  } catch (err: any) {
    const errorType = err.error_type || err.errorType || "provider_unavailable";
    const status = errorType === "schema_validation_failed" ? 422 : 500;
    return res.status(status).json({
      stage,
      error_type: errorType,
      message: err.message || "Stage generation failed",
      retryable: err.retryable ?? false,
    });
  }
});

