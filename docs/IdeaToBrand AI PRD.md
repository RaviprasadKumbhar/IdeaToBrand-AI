## FOIL

## The brand engine that argues back

Product Requirements Document · Final v4.0 · Handbook-Complete & Implementation-Ready

Built against the official Inkloom / WCC problem statement and participant handbook: “Build a brand that can think.” This document supersedes v3.0.

## Revision note (v3.0 to v4.0)

- Workflow order corrected. The Holistic Consistency Audit now runs AFTER Launch Prep, not before it. The handbook requires checking consistency across name, tagline, voice, visuals, and launch message together — running the audit before Launch Prep existed meant the launch message was never actually included in the check. This was a real ordering bug in v3.0, not a style choice, and it is fixed below.

- Every stage now has a complete implementation spec (purpose, inputs, AI role, output schema, Critic checks, approval states, downstream dependencies, failure handling) so this document can be handed to a developer or coding agent without re-reading the handbook.

- Critic finding schema gains an explicit bias issue type, alongside cliche, audience mismatch, contradiction, and vague reasoning — the handbook lists bias explicitly as something to detect.

- Dependency map, approval-state model, and full Instagram/LinkedIn/Inkloom compliance checklists are now written out in full rather than referenced.

- A full Handbook Requirement Traceability Matrix is added at the end so every official requirement can be checked off against a specific FOIL feature.

- Core architecture is unchanged: Strategist + Critic pair, shared append-only context object, human approval at every gate, Scenario Probe with dependency-aware re-runs, schema validation with capped retries, and no fabricated trademark/domain claims. Nothing strong from v3.0 was removed.


## 1. Executive summary

FOIL takes a founder's one-sentence idea and runs it through a chain of paired Strategist / Critic AI calls — one stage generates a grounded draft, the other attacks it for genericness, audience mismatch, contradiction, vague reasoning, or bias, and must propose something sharper before the user ever sees a “clean” answer. Every stage output is gated behind explicit human approval and stored in a single authoritative context object that later stages read from and never silently overwrite.

Two features make this more than a linear brand-kit generator: a Holistic Consistency Audit that checks the entire approved brand system together (not field-by-field) — including the launch message — exists after Launch Prep; and a Scenario Probe that lets the founder reopen any approved stage with a new what-if and see only the genuinely affected fields re-run, side-by-side with the original.

This PRD is written to be handed directly to a development team or a coding agent (Claude Code, Cursor, or equivalent) as the master specification. Every stage below defines its inputs, output schema, Critic checks, approval states, downstream dependencies, and failure handling.

## 2. Problem statement

A founder arrives with a single rough sentence — the handbook's own example is an app that helps students find teammates. That sentence has no audience clarity, no defensible position, no personality, no credible name, no visual language, no consistent voice, and no launch plan. Generic single-prompt AI tools fill this gap with polished but shallow, interchangeable output that does not survive scrutiny across a full brand system. FOIL's job is to force better decisions at every stage and to visibly check its own work, rather than generate once and stop.

## 3. Target user

Primary: the first-time founder / hackathon participant with one sentence of an idea and no branding background — this matches the handbook's own worked example and requires the fullest guided workflow. Solving well for this user also serves the handbook's other implied users (a student building for a class project, a small business owner professionalizing an existing offering, a creator sharpening a personal brand) without needing a separate mode for each.

## 4. Product vision

Build a staged, context-preserving AI product in which every deliverable is produced by a Strategist, attacked by a Critic, and only advances downstream after the founder explicitly approves it — with a final holistic pass confirming the whole system (name, tagline, voice, visuals, and launch message together) actually reads as one brand, and a standing ability for the founder to reopen any decision with a new scenario at any time.

## 5. Product positioning — why this is not another generic brand-kit tool

The handbook's reference sequence (Discover, Position, Shape, Visualize, Challenge, Deliver) is explicitly non-mandatory, but most teams will still build it literally, with one critique screen bolted near the end. That is structurally still a one-prompt tool with a lint pass attached.

FOIL's differentiation is architectural, not cosmetic: the Critic runs adversarially at every stage, not only at the end, and a separate holistic audit checks the whole assembled system — including the launch message — for internal contradictions before export. A Scenario Probe then lets the founder keep challenging the system after it is built. All of this reuses one Strategist/Critic mechanism, so it adds real originality and workflow depth without adding new


infrastructure.


## 6. MVP scope

Mapped to the handbook's own “Expected output system” list (Section 02) so nothing required is missing:

| Stage | Ships in MVP | Handbook output covered |
| --- | --- | --- |
| Intake | Single free-text field, 1-500 words. No forced form before | - |
|   | reasoning begins. |   |
| Discovery | Strategist + Critic; facts vs. assumptions labeled; user | Idea and audience analysis |
|   | approves. |   |
| Positioning | 2+ divergent directions; user selects one; rejected kept for | Positioning and value proposition |
|   | audit. |   |
| Naming + Personality Naming directions + 3-5 traits + traits-to-avoid + brand |   | Brand personality/principles; naming |
|   | principles. | with rationale |
| Tagline & Pitch | Grounded in approved name/personality; | Tagline and one-line pitch |
|   | competitor-interchangeability check. |   |
| Visual Brief | Palette, type, shape/symbol language, composition, imagery, | Visual design brief |
|   | avoid-list. |   |
| Voice & Messaging | Voice description, do/don't list, 3-4 sample messages. | Brand voice and sample messages |
| Launch Prep | Landing headline + one social launch post, checked against | Launch-ready content |
|   | brand. |   |
| Consistency Audit | Holistic pass over the full approved system, run after Launch | Consistency or quality checks |
|   | Prep. |   |
| Scenario Probe | What-if input after any approved stage; re-runs only affected | (strengthens all of the above) |
|   | fields. |   |
| Kit Export | Bundle of every approved field; fails loudly if a stage is | Exportable or shareable final kit |
|   | unapproved. |   |

## 7. Out of scope for MVP

- Production-ready vector logo files - the Visual Brief is a design direction, not finished art.

- Image-generation logos, unless separately implemented as a stretch item with a defined fallback (typographic/palette preview cards).

- Trademark or domain availability claims of any kind, ever, unless a real verification API is integrated and actually checked (see Section 15, Guardrails).

- Authentication, multi-project dashboards, and persistence beyond one working session  none are required by the handbook.

- A third agent role beyond Strategist and Critic - adds cost/latency risk during a live judged demo without adding judged value.

- Enterprise-grade infrastructure (multi-tenant architecture, complex databases)  unnecessary for a hackathon-scope, single-session MVP.

None of the items above are handbook-required capabilities — all required outputs are covered in Section 6.


## 8. Complete workflow (corrected order)

Critical correction from v3.0: the Holistic Consistency Audit now runs after Launch Prep, not before it, because the handbook requires checking name, tagline, voice, visuals, and launch message together — the audit cannot honestly claim to do that if the launch message doesn't exist yet when it runs.

```
Idea Input
|
v
[1. Discovery] Strategist + Critic -> user approves
|
v
[2. Positioning] Strategist (x2 directions) + Critic -> user selects one
|
v
[3. Naming + Personality] Strategist + Critic -> user selects
|
v
[4. Tagline + Pitch] Strategist + Critic -> user selects
|
v
[5. Visual Brief] Strategist + Critic -> user approves
|
v
[6. Voice + Messaging] Strategist + Critic -> user approves
|
v
[7. Launch Prep] Strategist + Critic -> user approves
|
v
[8. HOLISTIC CONSISTENCY AUDIT] -- inspects ALL approved fields together,
| including the launch message
v
[User accepts / rejects / edits each finding]
|
v
[9. Kit Assembly] -> [Export]
```

[Scenario Probe] can re-enter this pipeline after ANY approved stage (1-8), re-running only the fields the dependency map marks as affected.


## 9. Detailed requirements per stage

Each stage below is specified completely enough to implement without re-reading the handbook.

## 9.1 Discovery

| Attribute | Specification |
| --- | --- |
| Purpose | Extract and structure the founder's idea before any branding decision is made. |
| Inputs / required context | Raw idea text (1-500 words); optional fields (industry, audience, goals, constraints, |
|   | competitors). |
| AI role | Strategist produces a structured discovery record; Critic checks for vague or unjustified |
|   | assumptions. |
| Structured output fields | core_problem, target_audience, context_situation, user_goals, constraints, |
|   | value_desired_outcome, open_questions, known_facts[], inferred_assumptions[] (each with |
|   | a one-line rationale). |
| Critic checks | Flags any assumption without a rationale; flags vague or generic problem statements; issue |
|   | types: vague, audience_mismatch. |
| User interaction | User reviews the known_facts vs. inferred_assumptions split, edits any field, and must |
|   | explicitly approve before Positioning can run. |
| Approval states | draft -> critic_review -> needs_revision (if Critic flags issues) -> approved. |
| Downstream dependents | Positioning, Naming, Visual Brief, Voice, Launch Prep (all downstream stages read from |
|   | Discovery). |
| Failure handling | Empty or under-length idea text is blocked client-side with inline guidance; no AI call is |
|   | made. |

## 9.2 Positioning

| Attribute | Specification |
| --- | --- |
| Purpose | Produce at least two genuinely divergent strategic directions, not two phrasings of one |
|   | direction. |
| Inputs / required context | Approved Discovery record. |
| AI role | Strategist produces 2+ positioning options; Critic checks each for genericness and verifies |
|   | the two options differ in audience, competitive angle, or strategic position, not just wording. |
| Structured output fields | Per direction: title, category, target_audience, core_problem, differentiator, |
|   | value_proposition, competitive_angle, strategic_rationale, potential_weakness, |
|   | critic_findings[]. |
| Critic checks | Rejects a pair of directions that differ only in phrasing; issue types: cliche, |
|   | audience_mismatch, vague. |
| User interaction | User reviews both directions with their Critic findings, selects one. The rejected direction is |
|   | retained (not deleted) for audit/demo purposes. |
| Approval states | draft -> critic_review -> needs_revision -> approved (one direction) / rejected (the other, kept |
|   | in history). |
| Downstream dependents | Naming, Personality, Tagline, Visual Brief, Voice, Launch Prep, Consistency Audit. |
| Failure handling | If the Strategist returns two options that the Critic judges non-divergent, 2 automatic |
|   | regenerations are attempted before surfacing a manual-retry prompt to the user. |


## 9.3 Naming + Personality

| Attribute | Specification |
| --- | --- |
| Purpose | Produce naming directions and a personality/principles system grounded in the approved |
|   | positioning. |
| Inputs / required context | Approved Positioning. |
| AI role | Strategist produces naming options and a personality profile; Critic flags cliche/filler naming |
|   | patterns and checks trait-audience justification. |
| Structured output fields | naming_directions[] (territory, proposed_name, rationale, relationship_to_audience, |
|   | relationship_to_positioning, potential_concern, critic_analysis, sharper_alternative), |
|   | personality_traits[3-5] (each with audience justification), traits_to_avoid[], brand_principles[] |
|   | (with rationale). |
| Critic checks | Flags filler-word / generic naming patterns (e.g. generic suffixing); flags traits with no |
|   | audience justification; issue types: cliche, vague, audience_mismatch. |
| User interaction | User reviews naming options and personality/principles, selects a name, may edit traits. |
| Approval states | draft -> critic_review -> needs_revision -> approved. |
| Downstream dependents | Tagline, Visual Brief, Voice, Launch Prep, Consistency Audit. |
| Failure handling | Never states or implies trademark/domain availability (hard constraint, Section 15) |
|   | regardless of Critic or Strategist output. |

## 9.4 Tagline & One-line Pitch

| Attribute | Specification |
| --- | --- |
| Purpose | Produce a tagline and one-line pitch grounded only in the approved name and personality. |
| Inputs / required context | Approved Naming + Personality. |
| AI role | Strategist proposes tagline options and a one-line pitch; Critic explicitly tests whether each |
|   | tagline could apply unchanged to a competitor. |
| Structured output fields | tagline_options[], one_line_pitch, rationale_per_tagline, critic_findings[]. |
| Critic checks | Rejects any tagline that passes the “could this apply to a competitor unchanged” test; issue |
|   | types: cliche, vague. |
| User interaction | User selects final tagline and pitch; interchangeable options must be revised before |
|   | approval. |
| Approval states | draft -> critic_review -> needs_revision -> approved. |
| Downstream dependents | Launch Prep, Consistency Audit. |
| Failure handling | 2 automatic regenerations if every option fails the Critic's interchangeability test; then a |
|   | manual-retry prompt. |

## 9.5 Visual Brief

| Attribute | Specification |
| --- | --- |
| Purpose | Translate approved strategy into a visual design direction, not production art. |
| Inputs / required context | Approved Positioning + Personality. |
| AI role | Strategist produces the brief; Critic checks for predictable/stock visual tropes. |


| Attribute | Specification |
| --- | --- |
| Structured output fields | logo_direction, color_mood, hex_palette[], type_roles[], shape_language, symbol_language, |
|   | composition_layout, imagery_direction, concepts_to_avoid[], |
|   | rationale_linking_to_audience_and_positioning. |
| Critic checks | Flags generic/stock imagery direction (e.g. default stock-photo tropes); issue types: cliche, |
|   | audience_mismatch. |
| User interaction | User reviews and approves; UI copy always labels this “AI-generated visual concept / design |
|   | direction,” never a production-ready asset. |
| Approval states | draft -> critic_review -> needs_revision -> approved. |
| Downstream dependents | Voice & Messaging (loosely), Consistency Audit. |
| Failure handling | Image-generation calls (if implemented) poll a job-status endpoint rather than blocking the |
|   | request; on failure, falls back to the typographic/palette brief with a visible notice. |

## 9.6 Voice & Messaging

| Attribute | Specification |
| --- | --- |
| Purpose | Define how the brand sounds and demonstrate it with sample messages. |
| Inputs / required context | Approved Personality + Principles. |
| AI role | Strategist produces voice description and sample messages; Critic checks each sample |
|   | against the approved personality traits. |
| Structured output fields | voice_description, tone_characteristics[], do_list[], dont_list[], sample_messages[3-4] (each |
|   | with an explanation of how it reflects the approved personality). |
| Critic checks | Flags any sample message that contradicts an approved trait or principle; issue types: |
|   | contradiction, audience_mismatch. |
| User interaction | User reviews and approves; may edit individual sample messages. |
| Approval states | draft -> critic_review -> needs_revision -> approved. |
| Downstream dependents | Launch Prep, Consistency Audit. |
| Failure handling | If a sample message fails Critic review twice, it is dropped and flagged rather than silently |
|   | kept. |

## 9.7 Launch Prep

| Attribute | Specification |
| --- | --- |
| Purpose | Produce launch-ready content without breaking the approved personality. |
| Inputs / required context | Approved Personality, Voice, Positioning, Audience. |
| AI role | Strategist produces a landing headline and one social launch post; Critic checks both against |
|   | personality, principles, voice, positioning, and audience. |
| Structured output fields | landing_headline, social_launch_post, critic_findings[]. |
| Critic checks | Flags off-brand tone or claims inconsistent with positioning; issue types: contradiction, |
|   | audience_mismatch, vague. |
| User interaction | User reviews and approves; content is not marked approved until it passes its Critic check. |
| Approval states | draft -> critic_review -> needs_revision -> approved. |


| Attribute | Specification |
| --- | --- |
| Downstream dependents | Consistency Audit (this stage's output is a required input to the audit, per the corrected |
|   | workflow order). |
| Failure handling | 2 automatic regenerations if the Critic repeatedly flags off-brand drift; then manual-retry |
|   | prompt. |

## 9.8 Holistic Consistency Audit

| Attribute | Specification |
| --- | --- |
| Purpose | Check whether the ENTIRE approved brand system, including the launch message, reads as |
|   | one brand. This is explicitly not another per-field Critic call: it takes every approved field at |
|   | once as a single input, not one field at a time. |
| Inputs / required context | Approved: name, positioning, personality/principles, tagline, one-line pitch, visual brief, voice, |
|   | sample messages, launch headline, launch social post. |
| AI role | A single Critic call receives the full approved_decisions object and returns cross-field findings |
|   | only. |
| Structured output fields | See consistency finding schema in Section 16. |
| Critic checks | Checks at minimum: positioning-personality, name-positioning, name-personality, |
|   | tagline-positioning, tagline-personality, visuals-audience, visuals-personality, |
|   | voice-personality, sample_messages-voice, launch_headline-brand, |
|   | launch_social_post-brand, and the system as a whole. |
| User interaction | User reviews each finding individually and accepts, rejects, or edits it. Accepted findings |
|   | update the relevant approved field(s) via explicit user action only, logged to revision_log. |
| Approval states | pending -> findings_ready -> user_reviewing -> resolved (accepted findings applied, rejected |
|   | findings logged and discarded). |
| Downstream dependents | Kit Assembly (cannot run until every finding is resolved, i.e. accepted or explicitly rejected, |
|   | none left pending). |
| Failure handling | If the audit call itself fails schema validation, it is retried 2 times, then surfaces a visible error |
|   | rather than skipping the audit silently. |

## 9.9 Kit Assembly & Export

| Attribute | Specification |
| --- | --- |
| Purpose | Bundle every approved field into a single exportable brand kit. |
| Inputs / required context | Full approved_decisions object, including all resolved Consistency Audit outcomes. |
| AI role | No new AI generation, pure assembly of already-approved content into the export format. |
| Structured output fields | brand_name, one_line_pitch, positioning_statement, value_proposition, personality + |
|   | principles, tagline, naming_rationale, hex_palette, type_roles, voice_summary, |
|   | sample_messages, landing_headline, social_launch_post, |
|   | remaining_assumptions_and_risks. |
| Critic checks | N/A, assembly stage, not a generation stage. |
| User interaction | User does a final review before export is triggered. |
| Approval states | assembling -> exported / failed. |
| Downstream dependents | None (terminal stage). |


| Attribute | Specification |
| --- | --- |
| Failure handling | If ANY required upstream stage was never approved, or a Consistency finding is still |
|   | unresolved, export fails loudly with a visible message naming the specific missing stage. It |
|   | never silently substitutes a default or produces a partial success. |


## 10. Strategist / Critic architecture

Every generative stage (1-7 in Section 8) uses exactly two AI roles, no more:

- Strategist: produces a draft grounded only in approved upstream context; never invents facts the user hasn't confirmed (unconfirmed items are surfaced as inferred_assumptions instead).

- Critic: attacks the Strategist's draft for cliche, audience mismatch, contradiction, vague reasoning, or bias, and must produce a sharper alternative; a finding without one is not valid output.

The Holistic Consistency Audit (stage 8) reuses the Critic role but with a different input shape: the whole approved system at once, rather than one field. It is architecturally the same mechanism, applied wider, not a third agent.

## 11. Shared context model

```
{
"project_id": "uuid",
"user_facts": {}, // fields the user directly provided
"ai_assumptions": {}, // inferred_assumptions with rationale, not yet confirmed
"approved_decisions": {}, // authoritative; only changed via explicit user action
"stage_drafts": {}, // current in-progress Strategist output per stage
"critic_findings": [], // per-stage Critic findings, resolved or pending
"scenario_overrides": [], // Scenario Probe inputs, stored separately from approved_decisions
"revision_log": [] // every explicit user action that changed approved_decisions
}
```

- approved_decisions is the single source of truth every downstream stage reads from.

- ai_assumptions and stage_drafts are working memory, never treated as approved.

- scenario_overrides never overwrite approved_decisions automatically; only an explicit accept action (logged in revision_log) does.

- No stage, and no scenario branch, may write to approved_decisions without a corresponding revision_log entry.

## 12. Approval model

Every stage output moves through the same state machine:

```
draft -> critic_review -> needs_revision -> approved
\-> approved (if Critic finds nothing to flag)
approved -> needs_review (triggered by an upstream edit or an accepted Scenario Probe branch)
needs_review -> critic_review -> approved / needs_revision
any state -> failed (schema validation failure after 2 retries; surfaced to user, never hidden)
```

needs_review is distinct from needs_revision: needs_revision means the Critic itself flagged the current draft; needs_review means an upstream change (an edit, or an accepted Scenario Probe branch) may have made an already-approved field stale, and it must be re-confirmed by the user, not silently regenerated without consent.


## 13. Critic finding schema (per-stage)

```
{
"id": "string",
"target_field": "string",
"issue_type": "cliche | audience_mismatch | contradiction | vague | bias",
"evidence": "quoted/derived from actual project data, not generic advice",
"explanation": "why this is an issue",
"sharper_alternative": "string",
"user_action": "accept | reject | edit"
}
```

bias is added explicitly in v4.0 as its own issue type, alongside cliche, audience mismatch, contradiction, and vague reasoning; the handbook names bias explicitly as something the system must be able to detect. A finding with no sharper_alternative is not valid Critic output and must be regenerated.

## 14. Dependency map

Used by both the “edit an approved field” flow and the Scenario Probe to determine which fields need to be flagged needs_review, never a blind full regeneration.

| If this changes... | ...these are flagged needs_review |
| --- | --- |
| Discovery | Positioning, Personality, Naming, Visual Brief, Voice, Launch Prep |
| Positioning | Naming, Personality, Tagline, Visual Brief, Voice, Launch Prep, Consistency Audit |
| Personality / Principles | Naming, Tagline, Voice, Visual Brief, Launch Prep, Consistency Audit |
| Name | Tagline, One-line Pitch, Launch Prep, Consistency Audit |
| Visual Brief | Consistency Audit |
| Voice & Messaging | Sample Messages (self), Launch Prep, Consistency Audit |
| Launch Prep | Consistency Audit |

Fields not listed as dependents of a given change are left untouched; approved content is never regenerated without a reason traceable to this map.

## 15. Guardrails (non-negotiable)

- User-supplied idea text is passed as user-role content only, never concatenated into the system prompt.

- All model output is schema-validated before being trusted.

- Malformed structured output gets at most 2 retries.

- After retry failure, a real visible error is shown, never a silently fabricated fallback.

- Regeneration is capped at 2 automatic attempts per field, including Scenario Probe re-runs, before requiring an explicit user request.

- A failed AI call always shows a retry option.

- No fake success states, anywhere, at any stage.

- No unverified trademark or domain availability claims, ever, unless a real verification API is integrated and actually checked.

- UI copy always distinguishes 
AI-generated concept
 from 
production-ready asset.


## 16. Holistic Consistency Audit — detailed specification

This is the direct, literal implementation of the handbook's requirement: check whether name, tagline, voice, visuals and launch message feel like one brand, flag conflicts, and revise. It runs exactly once, after Launch Prep, over the complete approved_decisions object.

## Minimum checks performed:

- Positioning to Personality

- Name to Positioning

- Name to Personality

- Tagline to Positioning

- Tagline to Personality

- Visuals to Audience

- Visuals to Personality

- Voice to Personality

- Sample Messages to Voice

- Launch Headline to Brand (name + personality + voice + positioning)

- Launch Social Post to Brand

- Name + Tagline + Voice + Visuals + Launch Message as one coherent system

## Consistency finding schema:

```
{
"id": "string",
"fields_in_conflict": ["tagline", "voice"],
"issue_type": "contradiction",
"evidence": "...",
"why_it_matters": "...",
"sharper_alternative": "...",
"user_action": "accept | reject | edit"
}
```

Worked example (illustrative, not a template to fill blindly):

| Field A | Field B | Issue |
| --- | --- | --- |
| Tagline | Brand Voice | The tagline reads playful while the approved voice is formal and technical; a founder |
|   |   | or judge reading both together would not recognize them as the same brand. |

The user accepts, rejects, or edits each finding individually. Only accepted findings update approved_decisions, and each such update is written to revision_log with the finding ID that caused it.

## 17. Kit export

The export contains only approved decisions, assembled after every Consistency Audit finding is resolved:

- Idea / problem, audience, known facts and remaining assumptions

- Positioning statement, value proposition

- Personality traits, traits-to-avoid, brand principles

- Name, naming rationale

- Tagline, one-line pitch

- Visual brief (palette, type roles, imagery direction, avoid-list)

- Voice summary, sample messages

- Landing headline, social launch post


- Resolved consistency findings (what was flagged and how it was fixed)

- Remaining assumptions / risks section (so the kit never overstates certainty)

If any required upstream stage was never approved, or a Consistency Audit finding is still unresolved, export fails loudly with a message naming the specific missing stage, never a partial or fabricated success. Markdown export is the required MVP format; PDF export is optional if time is limited.


## 18. Error handling & edge cases

| Case | Behavior | User sees |
| --- | --- | --- |
| Empty / very short idea | Blocked client-side; no AI call made. | Inline prompt to add more detail. |
| Malformed AI JSON | 2 retries, then stop. | "That step didn't complete, try again" + |
|   |   | manual retry button. |
| AI provider unavailable / | Caught; no fabricated output. | "AI service is temporarily unavailable" + |
| rate-limited |   | retry with backoff. |
| Edit to an approved field with | Dependents flagged needs_review via | "This may affect [X]; review before |
| dependents | the dependency map. | continuing." |
| Export requested with an | Export blocked. | "Complete and approve [stage] first." |
| unapproved upstream stage |   |   |
| Repeated regeneration requests | Auto-retries capped; further attempts | "You've regenerated this several times, |
|   | require explicit action. | try a different direction instead?" |
| Consistency Audit finding left | Kit Assembly blocked. | "Resolve all consistency findings |
| unresolved |   | before exporting." |

## 19. Build & hackathon compliance

- Project must be built during the official build window and submitted before the stated deadline. Exact dates are not printed in the supplied handbook; see Open Questions, Section 27; not invented here.

- A substantially completed pre-existing project may be disqualified; any major pre-existing work must be clearly disclosed.

- AI coding tools, LLMs, public APIs, frameworks, open-source libraries, UI libraries, templates, and boilerplate are all permitted.

- Licenses, API terms, privacy rules, and platform rules must be respected; third-party work must never be presented as the team's own.

- Inkloom integration into FOIL itself is not required and is not a judging criterion; this is separate from the mandatory Inkloom mentions inside the individual submission posts (Sections 22-23).

- Late, inaccessible, misleading, or incomplete submissions may not be evaluated.


## 20. Demo requirements

Recommended length 2-4 minutes, structured around the handbook's six beats, showing the real product, never only slides:

| Beat | What it shows |
| --- | --- |
| 1. Problem | The user and the need. |
| 2. Product | The actual working interface. |
| 3. Input | A realistic, unrehearsed-looking user idea entered live. |
| 4. AI workflow | Strategist/Critic pairing visibly firing at more than one stage; the shared context surviving across |
|   | stages. |
| 5. Output | The generated brand system, including a live Consistency Audit finding being resolved. |
| 6. Difference | The strongest original feature: the draft-vs-critiqued diff, and ideally a live Scenario Probe branch. |

A mock screen may support explanation but never replaces the live, working core flow.

## 21. Individual submission compliance

The final submission is individual, not team-level. The team leader's submission does not cover other participants; every participant, without exception, must submit all of the following themselves:

- Full name and email

- Team name and project name (same across the team)

- Specific role (not "team member")

- Specific personal contribution, written concretely (e.g. "designed the multi-stage prompt pipeline, implemented the API endpoints, integrated the language model and validated the structured outputs"), never a generic phrase like "helped with the project"

- Own GitHub link

- Own live product link

- Own demo link

- Own Instagram project-post/reel link (cannot reuse another member's post)

- Own LinkedIn project-post + video link (cannot reuse another member's post)

- Inkloom signup, inkloom.art, and code INKLOOM-WCC referenced per the checklists in Sections 22-23

A missing, private, copied, or inaccessible individual post link makes only that participant's submission incomplete, not the team's.


## 22. Instagram compliance checklist

Creative format is fully flexible (demo, screen recording, build journey, behind-the-scenes, etc.); the caption content below is not. Every item must appear in the caption, and the collaboration request must be sent to @wecodecoderss:

- Hackathon name (see Open Questions; not specified in the supplied handbook, do not invent it)

- "x inkloom.art"

- Project name

- Clear one-line description

- Target user

- Specific problem

- How the solution works

- Key/strongest feature

- Participant's own role

- Participant's own specific contribution

- Tech and AI used

- A short Inkloom sponsor statement

- inkloom.art

- Early-access code INKLOOM-WCC

- Collaboration request sent to @wecodecoderss

- Demo / project link

- Official Inkloom account tagged

## 23. LinkedIn compliance checklist

- Hackathon name (not specified in the supplied handbook; confirm, do not invent)

- "x inkloom.art"

- Project name, product type, target users

- Problem and one-sentence solution

- How it works: input -> processing/AI workflow -> output

- Three numbered "what we actually built" features

- Technology stack used

- Participant's own specific contribution

- What makes the project different

- Inkloom's own description (see Section 24)

- inkloom.art and signup call-to-action

- Credit code INKLOOM-WCC

- GitHub link and live-product link

- Official Inkloom and We Code Coders accounts tagged

Critical, non-negotiable per the handbook: the demo video must be uploaded directly to the LinkedIn post. A video link alone does not satisfy this requirement, even if GitHub and live-product links are present.


## 24. Inkloom requirements

Two separate things, not to be conflated:

- A. Product integration: integrating Inkloom into FOIL itself is not required and is not a judging criterion, because Inkloom is still under development.

- B. Submission / publication requirements: the Inkloom information below is mandatory inside each participant's Instagram and LinkedIn posts (Sections 22-23), regardless of whether FOIL integrates Inkloom.

## Official facts to use in the required posts:

- Inkloom is the title / presenting sponsor.

- Official description: an AI-native generative design intelligence platform that transforms a company name, business context, and creative direction into distinctive logo concepts and brand-ready visual identities.

- Website: inkloom.art

- Participant code: INKLOOM-WCC

## 25. Judging alignment

| Criterion | Wt. | What FOIL visibly demonstrates |
| --- | --- | --- |
| Prompt engineering & AI workflow | 25% | Strategist/Critic firing at every stage (not just the end); shared |
|   |   | context surviving across stages; a live Holistic Consistency Audit |
|   |   | correctly running after Launch Prep. |
| Originality | 20% | The draft-vs-critiqued diff at every stage, the cross-field |
|   |   | Consistency Audit, and a live Scenario Probe branch, none |
|   |   | producible by a single-prompt tool. |
| Working implementation | 20% | Full live vertical slice, no recording, no slide standing in for a |
|   |   | crash. |
| Problem-solving & usefulness | 15% | Exported kit has real HEX values, real copy, no fabricated |
|   |   | trademark/domain claims, and an honest remaining-assumptions |
|   |   | section. |
| UI/UX | 10% | Clear draft-vs-critique and original-vs-scenario views; no dead |
|   |   | ends; every generated field has accept/reject/edit. |
| Demo & explanation | 10% | 2-4 min video following the six-beat structure (Section 20). |


## 26. Implementation / build plan (relative days, pending Section 27's date question)

| Day | Deliverable |
| --- | --- |
| 1 | Repo scaffold, shared context object, approval-state machine, .env template. |
| 2 | Discovery stage end-to-end (Strategist + Critic + approval gate). |
| 3 | Positioning + Naming/Personality stages, user-selection UI, rejected-direction history. |
| 4 | Tagline/Pitch + Visual Brief stages, draft-vs-critique diff UI. |
| 5 | Voice & Messaging + Launch Prep stages. |
| 6 | Holistic Consistency Audit (correct order: after Launch Prep) + resolution UI. |
| 7 | Scenario Probe: dependency map + side-by-side comparison view. |
| 8 | Kit Assembly + export (Markdown required, PDF optional); full end-to-end test on a deliberately-flawed |
|   | fixture idea. |
| 9 | Deploy, record demo (six-beat structure), draft every participant's individual Instagram/LinkedIn posts. |

Cut-scope order if time runs short: drop persistence, then drop image generation, then drop PDF export (keep Markdown), then drop Scenario Probe. Never drop the Holistic Consistency Audit or the per-stage Critic loop; together they are the literal, direct answer to the handbook's consistency requirement and the two heaviest-weighted judging criteria (45% combined).

## 27. Open questions (genuinely unanswered by the supplied handbook)

- Exact official build-window dates and submission deadline.

- Official hackathon name (only the handle @wecodecoderss is given).

- Final AI provider choice (OpenAI vs. Gemini): team decision, abstracted behind one interface either way.

None of these are invented anywhere in this document; every reference to them above points back here.


## 28. Handbook requirement traceability matrix

| Requirement | Handbook | FOIL feature / module | PRD ref. | Status |
| --- | --- | --- | --- | --- |
|   | section |   |   |   |
| Problem statement | Sec. 01 | Discovery stage grounds every | Stage 1 (9.1) | Covered |
|   |   | downstream stage in the founder's actual |   |   |
|   |   | problem |   |   |
| Discover | Sec. 02, p.3 | Discovery stage | Stage 1 | Covered |
| Position | Sec. 02, p.3 | Positioning stage | Stage 2 | Covered |
| Shape | Sec. 02, p.3 | Naming + Personality, Tagline + Pitch | Stages 3-4 | Covered |
| Visualize | Sec. 02, p.3 | Visual Brief | Stage 5 | Covered |
| Challenge | Sec. 02, p.3 | Per-stage Critic + Holistic Consistency | Every stage | Covered |
|   |   | Audit | + Stage 8 |   |
| Deliver | Sec. 02, p.3 | Kit Assembly & Export | Stage 9 | Covered |
| Idea and audience analysis | Sec. 02 output | Discovery | Stage 1 | Covered |
|   | list |   |   |   |
| Positioning and value | Sec. 02 output | Positioning | Stage 2 | Covered |
| proposition | list |   |   |   |
| Brand personality and principles Sec. 02 output |   | Naming + Personality | Stage 3 | Covered |
|   | list |   |   |   |
| Naming directions with rationale Sec. 02 output |   | Naming + Personality | Stage 3 | Covered |
|   | list |   |   |   |
| Tagline and one-line pitch | Sec. 02 output | Tagline & Pitch | Stage 4 | Covered |
|   | list |   |   |   |
| Visual design brief | Sec. 02 output | Visual Brief | Stage 5 | Covered |
|   | list |   |   |   |
| Brand voice and sample | Sec. 02 output | Voice & Messaging | Stage 6 | Covered |
| messages | list |   |   |   |
| Consistency or quality checks | Sec. 02 output | Holistic Consistency Audit, run after | Stage 8 | Covered |
|   | list; Sec. 03 pt.5 | Launch Prep |   |   |
| Launch-ready content or assets Sec. 02 output |   | Launch Prep | Stage 7 | Covered |
|   | list; Sec. 03 pt.6 |   |   |   |
| Exportable or shareable final kit Sec. 02 output |   | Kit Assembly & Export | Stage 9 | Covered |
|   | list |   |   |   |
| Multi-stage AI workflow (not one | Sec. 01 | 9-stage Strategist/Critic pipeline | Sec. 8-9 | Covered |
| prompt) |   |   |   |   |
| Structured context preserved | Sec. 01, Sec. 03 Shared context object, |   | Sec. 11 | Covered |
| across stages |   | approved_decisions authoritative |   |   |
| Human review / selection / | Sec. 03 | Approval gate at every stage; | Sec. 12 | Covered |
| revision | techniques list | accept/reject/edit on every finding |   |   |
| Genericity / cliche challenge | Sec. 01, Sec. 03 | Critic issue_type: cliche, at every stage | Sec. 13 | Covered |
|   | pt.3 |   |   |   |
| Bias checking | Sec. 03 | Critic issue_type: bias (added in v4.0) | Sec. 13 | Covered |
|   | techniques list |   |   |   |
| Working, demonstrable product | Sec. 02, | MVP vertical slice, Section 6 | Sec. 6, 20 | Covered |
| (not a slide deck) | minimum |   |   |   |
|   | product |   |   |   |
|   | expectation |   |   |   |


| Requirement | Handbook | FOIL feature / module | PRD ref. | Status |
| --- | --- | --- | --- | --- |
|   | section |   |   |   |
| Build rules (window, disclosure, | Sec. 04 | Build & Hackathon Compliance | Sec. 19 | Covered |
| permitted tools) |   |   |   |   |
| Individual submission (every | Sec. 05-06 | Individual Submission Compliance | Sec. 21 | Covered |
| participant) |   |   |   |   |
| GitHub repository accessible | Sec. 05 | Submission checklist | Sec. 19, 21 | Covered |
| Live product link | Sec. 05 | Submission checklist | Sec. 19, 21 | Covered |
| Demo video (2-4 min, six beats) Sec. 06 |   | Demo Requirements | Sec. 20 | Covered |
| Instagram caption requirements Sec. 07A |   | Instagram Compliance Checklist | Sec. 22 | Covered |
| LinkedIn post requirements | Sec. 07B | LinkedIn Compliance Checklist | Sec. 23 | Covered |
| LinkedIn video uploaded | Sec. 07B | Called out as critical, non-negotiable | Sec. 23 | Covered |
| directly (link alone insufficient) |   |   |   |   |
| Inkloom description text | Sec. 07B | Inkloom Requirements (facts to use) | Sec. 24 | Covered |
| inkloom.art | Cover, Sec. | Instagram + LinkedIn checklists, Inkloom | Sec. 22-24 | Covered |
|   | 07A-07B | Requirements |   |   |
| Code INKLOOM-WCC | Cover, Sec. | Instagram + LinkedIn checklists, Inkloom | Sec. 22-24 | Covered |
|   | 07A-07B | Requirements |   |   |
| Collaboration request to | Sec. 07A | Instagram Compliance Checklist | Sec. 22 | Covered |
| @wecodecoderss |   |   |   |   |
| Official accounts tagged | Sec. 07A-07B | Instagram + LinkedIn checklists | Sec. 22-23 | Covered |
| Judging criteria and weights | Sec. 09 | Judging Alignment (weights reproduced | Sec. 25 | Covered |
|   |   | exactly) |   |   |
| Exact build/deadline dates | Not present in | Not invented | Sec. 27 | Open |
|   | handbook |   |   | question |
| Official hackathon name | Not present in | Not invented | Sec. 27 | Open |
|   | handbook |   |   | question |


## 29. Final compliance checklist

- [ ] Built within the official window (dates pending organizer confirmation, Sec. 27)

- [ ] Working, live, end-to-end product, not a slide deck or a recording

- [ ] GitHub repository accessible in a signed-out browser session

- [ ] Live product link accessible

- [ ] Demo video accessible, 2-4 min, six-beat structure followed

- [ ] AI workflow explained: stages, context handling, structured outputs, evaluation methods

- [ ] Every participant's role and specific contribution documented

- [ ] Every participant's own Instagram project post published and accessible

- [ ] Every participant's own LinkedIn post published, with demo video uploaded directly (not just linked)

- [ ] Inkloom description, inkloom.art, and code INKLOOM-WCC present in every required post

- [ ] Collaboration request sent to @wecodecoderss from every Instagram post

- [ ] Official Inkloom (and We Code Coders, on LinkedIn) accounts tagged

- [ ] No unverified trademark/domain claims anywhere in the product or the kit

- [ ] Export fails loudly, never silently, on any unapproved or unresolved upstream stage

## 30. Final audit note

This PRD was checked against the supplied handbook a second time after the Section 8 workflow-order correction, specifically re-verifying: workflow order, expected outputs, AI workflow, Critic behavior, consistency checking, human approval, scenario branching, export behavior, build rules, demo requirements, Instagram/LinkedIn compliance, Inkloom requirements, and judging criteria. No handbook requirement identified in this pass was left as a note only; each is reflected in a specific section above, and any item the handbook itself does not answer is listed in Section 27 rather than invented.

End of document, FOIL PRD, Final v4.0.
