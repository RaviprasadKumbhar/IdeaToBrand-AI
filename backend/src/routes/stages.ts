import { Request, Response, Router } from "express";
import type { StageName, SharedContext } from "@foil/shared";
import { getAIProvider } from "../ai/factory.js";
import { DiscoveryStageService } from "../stages/discovery.js";
import { PositioningStageService } from "../stages/positioning.js";
import { NamingPersonalityStageService } from "../stages/namingPersonality.js";
import { TaglinePitchStageService } from "../stages/taglinePitch.js";
import { VisualBriefStageService } from "../stages/visualBrief.js";
import { VoiceMessagingStageService } from "../stages/voiceMessaging.js";
import { LaunchPrepStageService } from "../stages/launchPrep.js";
import { CriticEngine } from "../critic/index.js";

export const stagesRouter = Router();

const discoveryService = new DiscoveryStageService();
const positioningService = new PositioningStageService();
const namingService = new NamingPersonalityStageService();
const taglineService = new TaglinePitchStageService();
const visualService = new VisualBriefStageService();
const voiceService = new VoiceMessagingStageService();
const launchService = new LaunchPrepStageService();
const criticEngine = new CriticEngine();

/**
 * POST /api/stages/:stage/generate
 * Unified generation endpoint for all 7 generative brand stages.
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
        const rawIdea =
          payload.idea_text ||
          payload.business_description ||
          payload.idea_input?.business_description ||
          (userFacts && typeof userFacts === "object"
            ? (userFacts.business_description || Object.values(userFacts).filter(Boolean).join(" "))
            : "");

        const ideaText = typeof rawIdea === "string" ? rawIdea.trim() : "";
        if (!ideaText) {
          return res.status(400).json({
            stage: "discovery",
            error_type: "invalid_input",
            message: "Missing required startup idea or business description. Please provide a clear concept to generate your brand discovery plan.",
            retryable: false,
          });
        }

        const rawFacts = Array.isArray(payload.known_facts)
          ? payload.known_facts
          : Object.values(userFacts).map(String).filter((s) => s.trim().length > 0);

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

