# FOIL Development Rules

## 1. Purpose

`rules.md` is the enforceable development and governance layer for FOIL.

It defines the non-negotiable rules that developers and AI coding agents must follow when implementing, modifying, testing, or demonstrating FOIL.

The purpose of these rules is to preserve:

- the staged FOIL workflow;
- the Strategist + Critic AI architecture;
- explicit user control over brand decisions;
- shared project context;
- dependency-aware revisions;
- Scenario Probe isolation;
- Holistic Consistency Audit integrity;
- schema-valid AI output;
- honest failure handling;
- approved-only export; and
- compliance with the approved product architecture.

The PRD defines **what FOIL must do**.  
`architecture.md` defines **how FOIL is technically structured**.  
This file defines **what implementation behavior is allowed and forbidden**.

---

## 2. Source-of-Truth Hierarchy

Use the following authority order:

1. Official Inkloom / WeCodeCoders hackathon requirements captured in `PRD.md`
2. `PRD.md` / approved PRD v4.0
3. `architecture.md`
4. `rules.md`
5. `tasks.md`
6. `design.md`
7. `memory.md`
8. Implementation convenience

### Rules

- Implementation convenience MUST NOT override product requirements.
- Implementation convenience MUST NOT override architectural invariants.
- A lower-level document MUST NOT silently contradict a higher-level requirement.
- If a conflict between the PRD and architecture is discovered, the conflict MUST be surfaced and resolved rather than silently hidden.
- No developer or AI agent may invent a product requirement merely because it is technically convenient.

---

## 3. Core Product Rules

1. FOIL MUST operate as a **staged AI brand engine**.
2. FOIL MUST NOT behave as a single-prompt brand generator.
3. Each stage MUST have a defined purpose and structured output.
4. Downstream stages MUST receive the appropriate upstream approved context.
5. AI-generated suggestions MUST NOT automatically become approved decisions.
6. User decisions are authoritative.
7. AI MUST NOT silently replace a user-approved decision.
8. Every major user-approved change MUST remain traceable.
9. Draft content, Critic findings, and approved decisions MUST remain distinguishable.
10. The application MUST preserve the staged workflow even when internal implementation details change.

---

## 4. Workflow Order Rules

The required workflow is:

**Idea Input → Discovery → Positioning → Naming + Personality → Tagline + Pitch → Visual Brief → Voice + Messaging → Launch Prep → Holistic Consistency Audit → Kit Assembly → Export**

### Mandatory rules

- The workflow MUST preserve this order.
- Required stages MUST NOT be skipped.
- Required stages MUST NOT be silently reordered.
- Holistic Consistency Audit MUST occur **after Launch Prep**.
- Kit Assembly MUST occur after the required approved brand system exists.
- Export MUST occur only after required approvals and consistency checks pass.
- FOIL MUST use the Strategist + Critic architecture.
- A third AI agent MUST NOT be introduced as part of the core architecture.
- A technical shortcut MUST NOT remove a required product stage.

---

## 5. Shared Context Rules

The canonical shared context MUST contain:

- `project_id`
- `user_facts`
- `ai_assumptions`
- `approved_decisions`
- `stage_drafts`
- `critic_findings`
- `scenario_overrides`
- `revision_log`

### Rules

- Shared context is the canonical project state.
- `approved_decisions` is authoritative for the approved brand system.
- AI output MUST NOT silently overwrite `approved_decisions`.
- A draft MUST NOT be treated as an approved decision.
- A Critic finding MUST NOT automatically become a decision.
- `ai_assumptions` MUST remain distinguishable from `user_facts`.
- Scenario Probe changes MUST remain isolated until the user accepts them.
- Changes to approved decisions MUST be traceable through `revision_log`.
- Different modules MUST NOT maintain conflicting authoritative copies of the same decision.

---

## 6. User Approval Rules

FOIL follows this decision model:

**AI proposes → User reviews → User accepts/rejects/edits → Approved state changes**

### Mandatory rules

- Only explicit user action may create or update an approved decision.
- AI MUST NOT simulate user approval.
- AI MUST NOT infer approval from silence.
- Page refresh MUST NOT approve content.
- Navigation MUST NOT approve content.
- Regeneration MUST NOT silently replace an approved decision.
- Rejected suggestions MUST NOT be treated as approved.
- Editing an approved decision MUST create the appropriate revision history entry.
- Frontend approval controls MUST correspond to the authoritative backend state transition.
- If `architecture.md` defines exact state names, those names MUST be used consistently.

---

## 7. Strategist Rules

The Strategist is responsible for generating structured brand recommendations and drafts.

### Strategist MUST

- use available project context;
- use approved upstream decisions;
- generate stage-specific structured output;
- distinguish known facts from assumptions;
- respect user decisions;
- conform to the required stage schema;
- produce drafts rather than silently approving content.

### Strategist MUST NOT

- silently modify approved decisions;
- invent user facts;
- present assumptions as user-provided facts;
- perform the Critic's role;
- bypass schema validation;
- fabricate external verification.

---

## 8. Critic Rules

The Critic evaluates Strategist output and identifies actionable weaknesses.

### Valid issue types

- `cliche`
- `audience_mismatch`
- `contradiction`
- `vague`
- `bias`

The implementation MUST preserve the terminology defined by the approved architecture if the architecture uses exact enum/state values.

### Every Critic finding MUST contain

- ID
- target field
- issue type
- evidence
- explanation
- sharper alternative
- user action

### Mandatory behavior

- A finding without a sharper alternative is invalid.
- Critic findings are advisory until the user acts on them.
- Critic MUST NOT silently rewrite approved decisions.
- Critic MUST evaluate the relevant Strategist output rather than replace the Strategist.
- Critic MUST use available upstream context when evaluating consistency.
- Critic MUST identify actionable issues rather than produce vague criticism.

---

## 9. Stage-Specific Rules

### 9.1 Discovery

Discovery MUST capture:

- core problem
- target audience
- context/situation
- user goals
- constraints
- value/desired outcome
- open questions
- known facts
- inferred assumptions
- rationale for assumptions

Known facts and inferred assumptions MUST remain distinguishable.

The system MUST NOT present an AI inference as a user-provided fact.

---

### 9.2 Positioning

Positioning MUST provide at least **2 genuinely divergent directions**.

Each direction MUST contain:

- title
- category
- target audience
- core problem
- differentiator
- value proposition
- competitive angle
- strategic rationale
- potential weakness
- Critic findings

Two directions MUST NOT be merely cosmetic variations of the same strategy.

---

### 9.3 Naming + Personality

Naming + Personality MUST contain:

- naming directions
- territory
- proposed name
- rationale
- audience/positioning relationship
- concern
- Critic analysis
- sharper alternative
- 3–5 personality traits
- traits to avoid
- brand principles
- principle rationale

FOIL MUST NOT claim trademark, domain, social-handle, or legal availability unless the corresponding verification was actually performed.

---

### 9.4 Tagline + Pitch

Tagline + Pitch MUST contain:

- tagline options
- rationale
- one-line pitch
- Critic analysis

The Critic MUST check whether the tagline/pitch is interchangeable with competitors.

---

### 9.5 Visual Brief

Visual Brief MUST contain:

- logo direction
- color mood
- HEX palette
- typography/type roles
- shape language
- symbol language
- composition/layout
- imagery direction
- concepts to avoid
- rationale

The Visual Brief MUST be clearly labeled as an **AI-generated visual concept/design direction**.

It MUST NOT be presented as production-ready artwork.

---

### 9.6 Voice + Messaging

Voice + Messaging MUST contain:

- voice description
- tone characteristics
- do/don't list
- 3–4 sample messages
- explanation for each

The messaging MUST remain consistent with the approved brand system.

---

### 9.7 Launch Prep

Launch Prep MUST contain:

- landing headline
- social launch post
- Critic evaluation

Launch Prep MUST be completed before the Holistic Consistency Audit.

---

## 10. Holistic Consistency Audit Rules

This is a critical integrity rule.

The Holistic Consistency Audit MUST run **after Launch Prep**.

It MUST receive the complete approved brand system.

It MUST check cross-field coherence across:

- name
- positioning
- personality
- tagline
- pitch
- visual direction
- voice
- messaging
- launch content

### Every audit finding MUST contain

- `id`
- `fields_in_conflict`
- `issue_type`
- `evidence`
- `why_it_matters`
- `sharper_alternative`
- `user_action`

### Mandatory rules

- The audit MUST evaluate cross-field consistency, not only individual fields.
- Findings MUST be actionable.
- Findings MUST include a sharper alternative.
- User actions MUST support the architecture-defined accept/reject/edit behavior.
- Required unresolved findings MUST block export.
- The audit MUST NOT silently modify approved decisions.
- The user MUST remain the decision-maker for findings that require action.

---

## 11. Dependency Rules

FOIL MUST use dependency-aware updates.

### Rules

- An upstream change MUST NOT blindly regenerate the entire project.
- Only affected downstream fields SHOULD be marked `needs_review` according to the dependency model in `architecture.md`.
- Unaffected approved decisions MUST remain intact.
- Affected downstream fields MUST be clearly identified.
- The user MUST be able to review affected downstream changes.
- Dependency behavior MUST follow the architecture-defined dependency map.
- Unrelated decisions MUST NOT be silently overwritten.

---

## 12. Scenario Probe Rules

Scenario Probe creates a controlled branch from a scenario override.

### Rules

- A Scenario Probe MUST create an isolated branch.
- The branch MUST NOT silently overwrite the original.
- Relevant dependencies MUST be identified.
- Affected fields MUST be rerun through Strategist + Critic where required.
- Original and branch results MUST remain comparable.
- The user MUST be able to:
  - accept the branch;
  - keep the original;
  - edit the branch/result.
- Accepting a branch MUST create the appropriate revision history.
- Scenario changes MUST remain isolated until user acceptance.
- Unrelated fields MUST NOT be regenerated without dependency justification.

---

## 13. AI Output Rules

All AI outputs MUST:

- follow the expected stage schema;
- use structured fields;
- respect shared context;
- distinguish facts from assumptions;
- respect approved decisions;
- avoid fabricated claims;
- provide Critic findings where required;
- provide actionable alternatives;
- remain within the requested stage scope.

AI MUST NOT:

- fabricate verification;
- claim a check was performed when it was not;
- claim trademark availability without verification;
- claim domain availability without verification;
- claim social-handle availability without verification;
- silently approve its own output;
- silently modify user decisions;
- invent user facts;
- fabricate competitor facts;
- fabricate legal ownership or availability claims.

---

## 14. Schema Validation Rules

Every structured AI response MUST be validated against the appropriate stage schema before it is treated as valid application data.

### Rules

- Invalid output MUST NOT be treated as successful output.
- Malformed output MAY be retried only within the limits defined by `architecture.md`.
- Maximum automatic retries MUST follow `architecture.md`.
- Maximum regeneration attempts per field MUST follow `architecture.md`.
- Validation failure MUST remain visible.
- Failed validation MUST NOT silently produce fake fallback content.
- Data that has not passed required validation MUST NOT enter approved state.
- Schema changes MUST be coordinated with the shared domain contracts.

---

## 15. Failure and Recovery Rules

The system MUST explicitly handle:

- AI timeout;
- malformed AI output;
- schema validation failure;
- API failure;
- network failure;
- partial stage completion;
- failed regeneration;
- failed export.

### Mandatory behavior

- NEVER display fake success.
- NEVER silently discard approved data.
- Preserve valid previous state where the architecture permits.
- Show the user what failed.
- Allow retry where appropriate.
- Respect retry limits.
- Maintain revision history for meaningful state changes.
- Do not corrupt shared context.
- Do not convert a failed operation into an apparently successful stage.

---

## 16. Revision and Change Rules

Every meaningful approved change MUST be traceable.

### Rules

- Approved decision changes MUST be logged.
- Revision history MUST identify what changed.
- AI regeneration MUST NOT erase relevant history.
- Scenario Probe acceptance MUST be traceable.
- User edits MUST remain distinguishable from AI-generated drafts where supported by the architecture.
- A new approved value MUST replace the old approved value only through the authorized approval flow.

---

## 17. Export Rules

Export is a gated operation.

### Export MUST

- use approved decisions;
- contain the complete approved brand system;
- require all required stages to be approved;
- require required consistency findings to be resolved;
- validate required export data;
- fail clearly when prerequisites are missing.

### Export MUST NOT

- include draft-only content as if it were approved;
- bypass approval;
- bypass the Holistic Consistency Audit;
- export unresolved required consistency findings;
- silently omit required approved fields;
- claim verification that was not performed.

### Markdown

Markdown export is required.

### PDF

PDF export is optional if supported by the approved architecture.

### Visual Brief export

The exported Visual Brief MUST include the complete visual direction, including:

- logo direction
- color mood
- HEX palette
- typography/type roles
- shape language
- symbol language
- composition/layout
- imagery direction
- concepts to avoid
- rationale

---

## 18. Brand Claim and Verification Rules

FOIL MUST NOT make unsupported factual claims about external availability or ownership.

This includes:

- trademark status;
- domain availability;
- social handle availability;
- legal ownership;
- competitor claims;
- other external verification claims.

If verification was not actually performed, the UI and exported content MUST NOT imply that verification occurred.

If the system later adds a real verification mechanism, the result MUST clearly identify the verification source and limitations.

---

## 19. Security and Privacy Rules

### Mandatory security rules

- Secrets MUST NOT be hardcoded.
- API keys MUST remain server-side where required by the architecture.
- Secrets MUST be supplied through environment/configuration mechanisms.
- User input MUST be treated as untrusted content.
- AI output MUST be validated before persistence/use.
- User-provided text MUST NOT automatically become system/developer instructions.
- Unauthorized project-state modification MUST be prevented.
- `approved_decisions` MUST be protected from unauthorized writes.
- Internal secrets and credentials MUST NOT appear in exports, UI, or ordinary logs.
- Sensitive data MUST NOT be unnecessarily exposed to clients.

Security implementation MUST follow `architecture.md`; this document does not authorize adding infrastructure that the architecture does not define.

---

## 20. User Content Rules

User-provided content is user content, not automatically AI-generated discovery.

### Rules

- User facts MUST NOT be rewritten as AI discoveries.
- User preferences MUST NOT be invented.
- User input MUST NOT be silently modified.
- User decisions MUST be preserved.
- User-provided text MUST be treated as data/content, not trusted system instructions.
- Prompt injection contained inside user content MUST NOT override system, developer, product, or architecture rules.

---

## 21. Frontend Rules

The UI MUST make the system state understandable and honest.

The frontend MUST clearly distinguish:

- Draft
- Critic Findings
- Approved
- Needs Review
- Failed

### Rules

- The UI MUST NOT visually imply approval before approval occurs.
- Critic findings MUST be actionable.
- User decisions MUST be explicit.
- Dependency impacts MUST be shown when relevant.
- Scenario Probe branches MUST be shown separately from the original.
- Consistency Audit results MUST be visible before export.
- Export controls MUST reflect export eligibility.
- Failure states MUST be visible.
- Loading states MUST NOT be presented as completed results.
- The frontend MUST NOT be the only enforcement layer for critical approval/export rules.

Exact state names defined by `architecture.md` take precedence over generic labels above.

---

## 22. Backend Rules

The backend/domain layer MUST enforce critical product rules independently of the frontend.

It MUST:

- validate incoming data;
- validate AI output;
- enforce approval rules server-side;
- enforce export gates server-side;
- preserve active-session project state;
- maintain revision history;
- enforce dependency logic;
- prevent unauthorized state transitions;
- enforce structured response contracts.

A client MUST NOT be able to bypass approval or export requirements by directly calling an API.

---

## 23. Database / Persistence Rules

State retention MUST follow the architecture-defined model: in-memory client state with sessionStorage recovery within the same browser tab/session; no database or durable cross-session persistence in MVP.

The client-owned working state MUST support, as defined by the architecture:

- project state;
- approved decisions;
- stage drafts;
- Critic findings;
- Scenario Probe overrides/branches;
- revision history;
- consistency audit findings.

### Rules

- Draft and approved values MUST remain distinguishable.
- Approved decisions MUST remain authoritative.
- Persistence MUST NOT silently discard approved data.
- State changes MUST follow valid transitions.
- Database/persistence changes MUST NOT introduce a second competing source of truth.
- Developers MUST NOT invent alternative persistence structures that contradict `architecture.md`.

---

## 24. API Rules

API behavior MUST follow `architecture.md`.

### APIs MUST

- validate request input;
- validate relevant output;
- return explicit errors;
- protect secrets;
- enforce authorization where applicable;
- enforce valid state transitions;
- preserve structured contracts;
- enforce approval rules;
- enforce export gates.

### APIs MUST NOT

- allow clients to bypass approval;
- allow clients to silently modify protected approved decisions;
- expose secrets;
- accept invalid state transitions as successful;
- return success when the requested operation actually failed.

---

## 25. Coding Rules

Developers and AI coding agents MUST:

- follow `architecture.md`;
- follow this rules file;
- keep domain logic centralized;
- keep schemas explicit;
- use meaningful names;
- keep modules focused;
- avoid hidden side effects;
- avoid silent state mutation;
- avoid unnecessary duplication of business rules;
- avoid unnecessary dependencies;
- keep changes scoped to the requested task;
- verify changes before marking work complete.

Developers MUST NOT:

- rewrite working architecture merely because they prefer another pattern;
- add unnecessary abstractions;
- add dependencies without justification;
- duplicate authoritative business rules across unrelated layers;
- bypass existing validation for convenience;
- remove a required invariant to simplify implementation.

---

## 26. AI Coding Agent Rules

These rules apply to Claude, Copilot, or any other coding agent working on FOIL.

Before changing code, an AI coding agent MUST:

1. Read `PRD.md`.
2. Read `architecture.md`.
3. Read `rules.md`.
4. Read `tasks.md` when available.
5. Inspect the current repository.
6. Identify the requested task and its dependencies.
7. Check whether the change affects shared contracts or architectural invariants.

During implementation, the agent MUST:

- stay within task scope;
- preserve existing working functionality;
- follow approved architecture;
- avoid silent requirement changes;
- report assumptions;
- report blockers;
- run relevant checks/tests;
- verify acceptance criteria.

The agent MUST NOT claim completion without verification.

The agent MUST NOT silently change architecture.

---

## 27. Scope Control Rules

FOIL MUST remain focused on the approved product.

Do NOT add features merely because they sound useful.

The implementation MUST NOT:

- introduce a third AI agent;
- turn FOIL into a generic chatbot;
- add unrelated social features;
- add unnecessary integrations;
- add unrelated product functionality;
- bypass the staged workflow.

Inkloom integration is **not required** unless explicitly specified by the approved product requirements.

P0 requirements MUST be completed before optional enhancements become a priority.

---

## 28. Testing and Verification Rules

Every implementation MUST be verified against its relevant acceptance criteria.

At minimum, testing MUST cover:

- stage transitions;
- approval behavior;
- `approved_decisions` integrity;
- schema validation;
- Critic findings;
- dependency updates;
- Scenario Probe isolation;
- Holistic Consistency Audit ordering;
- export gating;
- failure handling.

### Important

A feature MUST NOT be considered complete merely because its UI renders.

The implementation must demonstrate that the underlying behavior works.

---

## 29. Demo Integrity Rules

The demo MUST represent the actual implemented product.

### Rules

- Do not fake AI output as live functionality.
- Do not claim unimplemented features.
- Do not hide critical failures.
- Do not present mock behavior as completed backend behavior.
- The demo MUST reflect the actual staged workflow.
- The demo should support the six core beats:

1. Problem
2. Product
3. Input
4. AI workflow
5. Output
6. Difference

The demo MUST demonstrate the product honestly.

---

## 30. Non-Negotiable Architectural Invariants

The following invariants MUST remain true:

- [ ] FOIL uses a staged workflow.
- [ ] Strategist and Critic remain separate roles.
- [ ] No third core AI agent is introduced.
- [ ] Shared context remains canonical.
- [ ] `approved_decisions` remains authoritative.
- [ ] Explicit user approval is required.
- [ ] Approved changes are traceable.
- [ ] Dependencies are handled selectively.
- [ ] Scenario Probe remains isolated until accepted.
- [ ] Launch Prep occurs before Holistic Consistency Audit.
- [ ] Holistic Consistency Audit evaluates the complete approved brand system.
- [ ] Required unresolved consistency findings block export.
- [ ] AI output is schema validated.
- [ ] Retry limits are bounded.
- [ ] Failed operations cannot appear as successful.
- [ ] Export contains approved content only.
- [ ] Unsupported external verification claims are not presented as facts.

---

## 31. Rule Violation Handling

When a proposed implementation violates a rule:

1. STOP the violating change.
2. Identify the specific rule being violated.
3. Explain the conflict.
4. Propose a compliant alternative.
5. If the conflict cannot be resolved from the existing documents, request an architecture/product decision.
6. Record the decision when the project documentation requires it.

A developer or AI agent MUST NOT silently bypass a rule.

A technically easier implementation is not sufficient justification for breaking a product or architectural invariant.

---

## 32. Open Rule Decisions

Only unresolved issues that cannot be determined from the approved PRD or `architecture.md` belong here.

At the time this rules document is created:

**No additional open rule decision should be invented without first reviewing the approved `architecture.md`.**

If a genuine conflict is discovered during implementation, record:

- the conflicting documents;
- the exact conflict;
- affected component/stage;
- temporary safe behavior;
- required decision;
- decision owner;
- final resolution.

---

## 33. Final Developer Checklist

Before marking a feature complete, verify:

### Product
- [ ] The feature matches the PRD.
- [ ] The feature matches the approved architecture.
- [ ] The feature stays within task scope.

### AI
- [ ] Strategist/Critic responsibilities are correct.
- [ ] AI output is schema validated.
- [ ] Facts and assumptions are distinguished.
- [ ] AI does not silently approve or overwrite decisions.
- [ ] No unsupported verification claims are made.

### State
- [ ] Draft and approved states are separate.
- [ ] `approved_decisions` remains authoritative.
- [ ] Required changes are recorded in revision history.
- [ ] Dependency behavior is correct.

### UX
- [ ] Approval is explicit.
- [ ] Critic findings are actionable.
- [ ] Needs Review is visible.
- [ ] Failures are visible.
- [ ] Scenario branches are clearly separated.

### Audit / Export
- [ ] Launch Prep happens before the Holistic Consistency Audit.
- [ ] The audit receives the complete approved brand system.
- [ ] Required unresolved audit findings block export.
- [ ] Export contains approved content only.
- [ ] Full Visual Brief data is included.

### Engineering
- [ ] Relevant tests/checks pass.
- [ ] No secrets are committed.
- [ ] No unauthorized API/state bypass exists.
- [ ] No architecture invariant was broken.
- [ ] Documentation is updated if the change affects a project contract.

---

## 34. Final Rule

**When in doubt, preserve user control, approved decisions, architectural invariants, and the staged FOIL workflow.**

A feature is not successful merely because it works technically.

It is successful only when it works **without violating the approved product requirements, architecture, user-approval model, AI workflow, validation rules, or export integrity.**
