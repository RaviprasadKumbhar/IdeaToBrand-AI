import type {
  StageName,
  StageInput,
  ApprovedDecision,
} from '@foil/shared';

export function buildStageCriticPrompt(
  stage: StageName,
  draftContent: Record<string, unknown>,
  input: StageInput
): string {
  const upstreamContext = JSON.stringify(input.approved_decisions, null, 2);
  const draftStr = JSON.stringify(draftContent, null, 2);

  let stageSpecificInstructions = '';

  switch (stage) {
    case 'discovery':
      stageSpecificInstructions = `
CRITIC FOCUS FOR DISCOVERY:
- Check for "vague" problem definitions or "audience_mismatch".
- Attack generic statements like "for everyone" or "easy to use".
- Check whether assumptions are grounded or purely wishful thinking.`;
      break;

    case 'positioning':
      stageSpecificInstructions = `
CRITIC FOCUS FOR POSITIONING:
- DIVERGENCE TEST: Compare the 2+ directions. Are they genuinely divergent in business model and strategic stance, or merely cosmetic variations?
- If they are not truly divergent, issue a "contradiction" or "cliche" finding.
- Check for competitor defensibility and credibility.`;
      break;

    case 'naming_personality':
      stageSpecificInstructions = `
CRITIC FOCUS FOR NAMING + PERSONALITY:
- Attack generic tech-suffix clichés (e.g. -ly, -ify, -io, Hub, Lab, Forge) unless powerfully justified.
- Check for audience mismatch and tone contradiction.
- Check personality traits: are they distinct, or are they table stakes like "innovative", "friendly", "reliable"?`;
      break;

    case 'tagline_pitch':
      stageSpecificInstructions = `
CRITIC FOCUS FOR TAGLINE + PITCH:
- INTERCHANGEABILITY TEST: For each tagline, ask: "Could this tagline apply unchanged to a generic competitor?"
- If yes, flag it immediately with issue_type "cliche" or "vague".
- Does the pitch clearly declare the differentiator approved in positioning?`;
      break;

    case 'visual_brief':
      stageSpecificInstructions = `
CRITIC FOCUS FOR VISUAL BRIEF:
- Check whether color mood and symbol language genuinely reflect the approved personality traits.
- Attack visual clichés (e.g. blue for trust, lightbulbs for ideas, interlocking gears).`;
      break;

    case 'voice_messaging':
      stageSpecificInstructions = `
CRITIC FOCUS FOR VOICE + MESSAGING:
- Check sample messages against approved personality traits.
- If a message sounds like generic corporate jargon or marketing fluff, flag it as "cliche" or "audience_mismatch".`;
      break;

    case 'launch_prep':
      stageSpecificInstructions = `
CRITIC FOCUS FOR LAUNCH PREP:
- Check landing headline and social launch post against the approved brand voice, personality, and positioning.
- Does the headline make a bold, testable promise or a vague marketing platitude?`;
      break;
  }

  return `You are the Critic AI for FOIL, an adversarial brand intelligence engine.
Your sole job is to attack the draft output for flaws, weakness, genericness, or inconsistency.

VALID ISSUE TYPES (MUST USE ONE OF THESE EXACT ENUMS):
1. "cliche" — generic, overused buzzwords, template expressions
2. "audience_mismatch" — tone, language, or posture inappropriate for the intended users
3. "contradiction" — conflicts with approved upstream decisions
4. "vague" — hand-waving assertions without concrete defensible substance
5. "bias" — ungrounded assumptions, cultural or demographic blindspots

CRITICAL RULES:
1. Every finding MUST contain an ID, target_field, issue_type, evidence, explanation, sharper_alternative, and user_action (set to null).
2. "sharper_alternative" CANNOT BE EMPTY. A critique without a sharper alternative is INVALID.
3. If the draft is strong and has no significant flaws, return an empty array [].
4. Output valid JSON array matching the CriticFindingsArraySchema.

${stageSpecificInstructions}

Approved Upstream Context:
${upstreamContext}

Draft to Evaluate (${stage}):
${draftStr}

Respond with a JSON array of findings:
[
  {
    "id": "crit-<unique-string>",
    "stage": "${stage}",
    "target_field": "<field_name>",
    "issue_type": "cliche" | "audience_mismatch" | "contradiction" | "vague" | "bias",
    "evidence": "<exact quote or specific element flagged>",
    "explanation": "<why this weakens the brand>",
    "sharper_alternative": "<concrete, improved, bolder replacement>",
    "user_action": null
  }
]`;
}

export function buildHolisticAuditPrompt(
  approvedDecisions: Partial<Record<StageName, ApprovedDecision>>
): string {
  const fullSystem = JSON.stringify(approvedDecisions, null, 2);

  return `You are the Critic AI for FOIL, performing the Holistic Consistency Audit over the COMPLETE approved brand system.

Your job is to examine cross-field alignment and cross-stage coherence across:
- Name vs. Positioning
- Name vs. Personality
- Tagline vs. Positioning
- Tagline vs. Personality
- Visual Direction vs. Audience & Personality
- Voice & Tone vs. Personality
- Sample Messages vs. Voice
- Launch Headline & Social Post vs. Positioning & Voice

VALID ISSUE TYPES (MUST BE ONE OF):
"cliche" | "audience_mismatch" | "contradiction" | "vague" | "bias"

CRITICAL RULES:
1. Every finding MUST include "id", "fields_in_conflict" (array of stage/field names), "issue_type", "evidence", "why_it_matters", "sharper_alternative", and "user_action" (set to null).
2. "sharper_alternative" CANNOT BE EMPTY.
3. If the brand system is thoroughly coherent and free of major contradictions, return an empty array [].
4. Output valid JSON array matching ConsistencyFindingsArraySchema.

Complete Approved Brand System:
${fullSystem}

Respond with a JSON array:
[
  {
    "id": "cons-<unique-string>",
    "fields_in_conflict": ["stage1.field", "stage2.field"],
    "issue_type": "contradiction" | "cliche" | "audience_mismatch" | "vague" | "bias",
    "evidence": "<specific quote or conflicting values>",
    "why_it_matters": "<how this undermines the whole brand>",
    "sharper_alternative": "<unified resolution that reconciles the conflict>",
    "user_action": null
  }
]`;
}
