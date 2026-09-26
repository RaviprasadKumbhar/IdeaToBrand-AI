# FOIL — Project Memory

**Document:** `memory.md`  
**Purpose:** Persistent project context for maintaining continuity across development sessions  
**Status:** Final working memory specification  
**Project:** FOIL — AI Brand Strategy & Consistency Engine

---

# 1. How to Use This File

This file stores stable project context that should remain available across implementation sessions.

It is not a replacement for:

- `PRD.md` — what FOIL must do
- `architecture.md` — how FOIL is technically structured
- `rules.md` — non-negotiable development and governance rules
- `tasks.md` — implementation work and ownership
- `design.md` — UI/UX and interaction design

When documents disagree, follow the project's source-of-truth hierarchy defined in `rules.md`.

Do not use this file to silently change product requirements.

---

# 2. Project Identity

## Product Name

**FOIL**

## Product Category

AI-powered staged brand strategy and brand consistency workspace.

## Core Idea

FOIL helps users turn an initial business/product idea into a structured brand system through a sequence of AI-assisted strategy stages.

FOIL is intentionally not designed as a one-prompt brand generator.

The user remains the decision maker throughout the process.

---

# 3. Core Product Model

FOIL uses two AI roles:

## Strategist

The Strategist generates structured brand strategy proposals based on the available approved context and stage requirements.

## Critic

The Critic evaluates generated proposals and identifies issues such as:

- cliché
- audience mismatch
- contradiction
- vague language
- bias

Every valid Critic finding must include a sharper alternative.

There is no third AI agent in the core architecture.

---

# 4. Core Workflow

The canonical FOIL workflow is:

```text
Idea Input
    ↓
Discovery
    ↓
Positioning
    ↓
Naming + Personality
    ↓
Tagline + Pitch
    ↓
Visual Brief
    ↓
Voice + Messaging
    ↓
Launch Prep
    ↓
Holistic Consistency Audit
    ↓
Kit Assembly
    ↓
Export
```

## Critical workflow invariant

The Holistic Consistency Audit occurs **after Launch Prep**.

This allows the audit to evaluate the complete brand system, including:

- name
- positioning
- personality
- tagline
- visual direction
- voice
- launch messaging

Do not move the audit earlier in the workflow.

---

# 5. User-Controlled Decision Model

FOIL follows:

```text
AI proposes
     ↓
Critic evaluates
     ↓
User reviews
     ↓
User approves/edits/rejects
     ↓
Approved decision becomes authoritative
```

AI-generated content is not automatically an approved decision.

The interface and backend must preserve this distinction.

---

# 6. Shared Context Object

The shared project context contains:

```text
project_id
user_facts
ai_assumptions
approved_decisions
stage_drafts
critic_findings
scenario_overrides
revision_log
```

## Important meaning

### `user_facts`

Information supplied or explicitly confirmed by the user.

### `ai_assumptions`

Information inferred by AI and not yet established as user-provided fact.

### `approved_decisions`

The authoritative brand decisions explicitly approved by the user.

### `stage_drafts`

Current generated stage outputs that are not necessarily approved.

### `critic_findings`

Structured issues raised by the Critic.

### `scenario_overrides`

Temporary scenario changes used by Scenario Probe.

### `revision_log`

History of meaningful project changes and user decisions.

---

# 7. Approved Decisions Rule

`approved_decisions` is authoritative.

AI must never silently mutate it.

A change to an approved decision requires an explicit user action.

Examples:

- Approve
- Edit
- Accept Branch
- Keep Original
- Reject

Meaningful changes must be represented in the revision history.

---

# 8. Discovery Memory

Discovery establishes the strategic foundation.

Expected information includes:

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

## Important distinction

Known facts and AI assumptions must remain distinguishable.

An AI assumption must never be presented as if the user explicitly stated it.

---

# 9. Positioning Memory

Positioning must contain at least two genuinely divergent strategic directions.

Each direction should contain:

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

The purpose is to let the user compare strategic alternatives rather than receive one automatic answer.

---

# 10. Naming + Personality Memory

Naming work should contain:

- naming directions
- naming territory
- proposed name
- rationale
- relationship to audience
- relationship to positioning
- concern
- Critic analysis
- sharper alternative

Personality work should contain:

- 3–5 personality traits
- traits to avoid
- brand principles
- rationale for the principles

---

# 11. Tagline + Pitch Memory

The Tagline + Pitch stage contains:

- tagline options
- rationale
- one-line pitch
- Critic analysis

The Critic should specifically consider whether a tagline is interchangeable with competitors.

A tagline that could describe many competitors should be treated as a differentiation problem.

---

# 12. Visual Brief Memory

The Visual Brief is a structured creative direction.

It includes:

- logo direction
- color mood
- HEX palette
- typography
- type roles
- shape language
- symbol language
- composition/layout
- imagery direction
- concepts to avoid
- rationale

The Visual Brief is explicitly:

> AI-generated visual concept/design direction — not production-ready artwork.

FOIL should not present the Visual Brief as a finished production logo or legally cleared visual identity.

---

# 13. Voice + Messaging Memory

Voice + Messaging contains:

- voice description
- tone characteristics
- do/don't list
- 3–4 sample messages
- explanation for each message

The voice should remain connected to the approved positioning, personality, and audience.

---

# 14. Launch Prep Memory

Launch Prep includes:

- landing headline
- social launch post
- Critic findings

Launch Prep must occur before the Holistic Consistency Audit.

The audit needs launch messaging as part of the complete brand system.

---

# 15. Critic Memory

## Supported issue types

The Critic can identify:

```text
cliché
audience mismatch
contradiction
vague
bias
```

## Required Critic finding structure

Every finding must contain:

```text
id
target field / affected field(s)
issue type
evidence
explanation / why it matters
sharper alternative
user action
```

A Critic finding without a sharper alternative is incomplete.

---

# 16. Holistic Consistency Audit Memory

The Holistic Consistency Audit evaluates the complete approved brand system together.

It should check cross-field coherence rather than evaluating one isolated field.

The audit receives the complete approved system after Launch Prep.

Finding structure:

```text
id
fields_in_conflict
issue_type
evidence
why_it_matters
sharper_alternative
user_action
```

User actions include:

- accept
- reject
- edit

There must be no unresolved consistency finding before final export.

---

# 17. Dependency Memory

FOIL uses dependency-aware updates.

When an upstream approved decision changes:

- only affected downstream fields are marked `needs_review`
- unaffected fields remain unchanged
- approved downstream content is not silently overwritten

Example:

```text
Positioning changes
       ↓
Tagline may be affected
       ↓
Tagline → Needs Review
```

Do not blindly regenerate the complete brand system after every change.

---

# 18. Needs Review State

`Needs Review` means:

> An existing decision may be affected by an upstream change and requires user review.

It does not mean:

> The existing decision has automatically become invalid.

The existing value should remain visible until the user decides what to do.

Possible user actions:

- review impact
- keep current
- edit
- regenerate where appropriate

---

# 19. Scenario Probe Memory

Scenario Probe allows the user to test a changed assumption or context without immediately replacing the original approved system.

Basic model:

```text
Original Approved System
          │
          ├───────────────┐
          │               │
          ↓               ↓
     Original         Scenario Branch
                         ↓
                  affected fields
                         ↓
                  Strategist + Critic
```

The user can compare:

- original
- scenario branch

The user can then:

- Keep Original
- Accept Branch
- Edit

The branch must not silently overwrite the original system.

---

# 20. Export Memory

Export contains approved decisions only.

The final exported brand system should contain the complete approved brand system, including relevant:

- Discovery
- Positioning
- Naming + Personality
- Tagline + Pitch
- Visual Brief
- Voice + Messaging
- Launch Prep
- Consistency Audit result

## Export must fail/block when:

- a required stage is not approved
- unresolved consistency findings remain
- required data is missing
- the exported content does not represent approved project state

Markdown export is required.

PDF export is optional.

---

# 21. Brand Claim Memory

FOIL must not fabricate or imply verification of external claims.

Do not present the following as verified unless the application actually verifies them:

- trademark availability
- domain availability
- legal clearance
- competitor ownership
- market facts
- external statistics

If a claim has not been verified, clearly communicate that limitation.

---

# 22. AI Output Validation Memory

AI responses must be validated against the expected structured schema.

If malformed:

1. validate
2. retry within the allowed retry limit
3. if still invalid, show a visible failure
4. do not fabricate fallback data
5. do not claim success

The system must not silently convert malformed AI output into a successful stage.

---

# 23. Reliability Memory

The product must tolerate AI failures without corrupting approved state.

Important principles:

- preserve previous approved decisions
- do not overwrite with malformed output
- make failures visible
- allow retry
- keep revision history meaningful
- avoid duplicate or accidental approvals

---

# 24. User Content Memory

User-provided text must remain user-role content.

Do not allow user text to silently become:

- system instructions
- developer instructions
- hidden application commands
- authoritative project configuration

Treat user input as data/content unless explicitly handled through an application control.

---

# 25. Product State Model

The project conceptually contains three important content categories:

```text
DRAFT
    ↓
CRITIC REVIEW
    ↓
USER DECISION
    ↓
APPROVED
```

Additionally:

```text
APPROVED
    ↓
UPSTREAM CHANGE
    ↓
NEEDS REVIEW
```

And:

```text
APPROVED
    ↓
SCENARIO PROBE
    ↓
BRANCH
```

This state distinction must remain visible to both users and developers.

---

# 26. Revision Memory

Important changes should be traceable.

A revision record should make it possible to understand:

- what changed
- which field changed
- previous state
- new state
- why the change occurred where applicable
- user action that caused the change

The revision system is for continuity and traceability, not for exposing hidden model reasoning.

---

# 27. Frontend Memory

The frontend is responsible for:

- application shell
- stage navigation
- stage screens
- AI draft presentation
- Critic finding presentation
- approval UX
- edit UX
- Needs Review UX
- Scenario Probe UI
- Consistency Audit UI
- Kit Assembly UI
- Export UI
- responsive behavior
- accessibility

The frontend must not invent backend behavior that does not exist.

---

# 28. Backend / AI Memory

The backend/AI layer is responsible for:

- stage orchestration
- Strategist generation
- Critic evaluation
- schema validation
- shared context
- dependency behavior
- Scenario Probe
- Holistic Consistency Audit
- revision tracking
- export data assembly

Exact technical boundaries should follow `architecture.md`.

---

# 29. Persistence Memory

The persisted project state should preserve enough information to restore the project without losing:

- approved decisions
- drafts
- Critic findings
- assumptions
- scenario branches/overrides
- revision history
- stage state

Persistence must not treat temporary AI output as automatically approved.

---

# 30. UI Memory

The design language is:

- editorial
- modern
- structured
- focused
- creative
- trustworthy

Preferred UI patterns:

- cards
- comparison panels
- chips
- status badges
- structured sections
- evidence blocks
- approval panels
- audit findings
- clear stage navigation

Avoid making FOIL look like:

- a generic chatbot
- a one-click generator
- a noisy AI dashboard
- a wall of text
- an automatic brand decision maker

---

# 31. Design State Labels

The interface should consistently use these concepts:

```text
Not Started
In Progress
AI Draft
Ready for Approval
Approved
Needs Review
Blocked
Error
```

AI-generated content should be clearly identifiable.

User-edited content should be distinguishable from AI-generated content.

Approved content should be visually distinct.

---

# 32. Demo Memory

FOIL's demo should communicate six beats:

1. Problem
2. Product
3. Input
4. AI workflow
5. Output
6. Difference

The demo should show the staged nature of FOIL rather than only the final generated brand.

Strong demo moments include:

- Discovery organization
- divergent Positioning directions
- Critic finding
- explicit user approval
- dependency-aware review
- Holistic Consistency Audit
- final approved kit/export

---

# 33. Hackathon Submission Memory

The submission must remain truthful about:

- implemented features
- team contributions
- AI usage
- technologies used
- external services
- demo behavior

Do not claim a feature is implemented if it is only planned.

Do not present third-party work as original work.

Major pre-existing work should be disclosed where required.

Inkloom integration is not required for the product and should not be falsely implied.

---

# 34. Three-Member Team Memory

The project is organized around three major ownership areas.

## Member 1 — AI / Backend Lead

Primary responsibility:

- AI engine
- Strategist
- Critic
- schemas
- shared context
- stage logic
- dependency engine
- Scenario Probe
- Consistency Audit

Secondary:

- integration
- debugging
- demo support

---

## Member 2 — Frontend / UX Lead

Primary responsibility:

- application UI
- stage screens
- approval UX
- Critic UI
- Scenario Probe UI
- Consistency Audit UI
- export UI

Secondary:

- integration
- responsive behavior
- accessibility

---

## Member 3 — Data / Integration / QA Lead

Primary responsibility:

- persistence
- APIs/integration
- project state
- revision history
- export assembly
- testing
- deployment
- QA

Secondary:

- backend/integration
- demo support
- submission support

---

# 35. Project Documents Memory

The project uses the following document system:

```text
PRD.md
    ↓
architecture.md
    ↓
rules.md
    ↓
tasks.md
    ↓
design.md
    ↓
memory.md
```

### PRD.md

Defines what FOIL must do.

### architecture.md

Defines how the system is technically structured.

### rules.md

Defines non-negotiable implementation and governance rules.

### tasks.md

Defines exact implementation tasks and ownership.

### design.md

Defines UI/UX, visual language, interaction patterns, and design states.

### memory.md

Preserves stable project context and continuity.

---

# 36. Development Workflow Memory

Recommended development order:

```text
1. Confirm PRD
2. Confirm architecture
3. Confirm rules
4. Confirm tasks
5. Confirm design
6. Establish shared context/state model
7. Implement AI/validation foundations
8. Implement sessionStorage recovery (no database)
9. Implement frontend shell
10. Implement stages
11. Implement dependencies
12. Implement Scenario Probe
13. Implement Consistency Audit
14. Implement Kit + Export
15. Integrate
16. QA
17. Demo preparation
18. Submission preparation
```

Do not start by building isolated UI screens without understanding the shared state model.

---

# 37. Critical Invariants

These are the project facts that must remain true.

## Invariant 1

FOIL is staged, not one-shot.

## Invariant 2

The Strategist and Critic are the two AI roles.

## Invariant 3

The user controls approval.

## Invariant 4

`approved_decisions` is authoritative.

## Invariant 5

AI cannot silently mutate approved decisions.

## Invariant 6

Holistic Consistency Audit happens after Launch Prep.

## Invariant 7

Critic findings require sharper alternatives.

## Invariant 8

Scenario Probe does not silently overwrite the original.

## Invariant 9

Upstream changes cause affected downstream fields to become `Needs Review`, not automatic blind regeneration.

## Invariant 10

Unresolved consistency findings block final export.

## Invariant 11

Export contains approved decisions only.

## Invariant 12

AI failures must be visible and must not create fake success.

## Invariant 13

The Visual Brief is creative direction, not production-ready artwork.

## Invariant 14

External claims are not presented as verified without verification.

---

# 38. Things Not to Forget

Before changing or adding functionality, check:

- Does it fit the staged workflow?
- Does it preserve user approval?
- Does it use approved context correctly?
- Does it distinguish facts from assumptions?
- Does it preserve revision history?
- Does it trigger dependency review where necessary?
- Does it require Critic review where required?
- Does it preserve the order of Launch Prep → Consistency Audit?
- Does it keep Scenario Probe isolated from the original until accepted?
- Does it affect export readiness?
- Does it contradict `rules.md`?
- Does it introduce a feature not required by the PRD?

If the answer to any of these is unclear, inspect the relevant project document before implementing.

---

# 39. Open Implementation Decisions

This file should not invent technical decisions that belong in `architecture.md`.

If an implementation question is not resolved by:

- PRD
- architecture
- rules
- tasks
- design

then record it as an explicit implementation decision rather than silently choosing a behavior that changes the product.

Examples:

- exact database technology
- exact API framework
- exact model/provider configuration
- exact folder structure
- exact deployment platform

Those decisions belong in the appropriate technical documentation.

---

# 40. Memory Update Rules

Update this file only when stable project context changes.

Good memory entries include:

- confirmed product behavior
- confirmed ownership
- confirmed workflow decisions
- confirmed design principles
- confirmed architecture decisions
- confirmed submission constraints
- resolved implementation conventions

Do not store:

- temporary debugging details
- random generated outputs
- every individual AI response
- unconfirmed assumptions
- secrets
- API keys
- passwords
- tokens
- private credentials

---

# 41. Final Project Mental Model

When continuing FOIL development, remember:

```text
FOIL is a controlled AI brand strategy system.

The user provides the idea.

FOIL organizes the strategy.

Strategist proposes.

Critic challenges.

User decides.

Approved decisions become the source of truth.

Dependencies identify what may need review.

Scenario Probe tests alternatives safely.

Holistic Audit checks the complete system.

Kit Assembly organizes the approved brand.

Export packages the approved result.
```

---

# 42. Final Memory Rule

When in doubt:

> **Preserve the user's approved decisions, preserve project context, make AI uncertainty visible, and never silently change the brand system.**

**End of memory.md**


## 40. State Retention Clarification (Canonical)
FOIL MVP has no server database and no durable persistence beyond one working session. The frontend owns active SharedContext in memory and mirrors it to sessionStorage solely for same-tab refresh recovery. Closing the tab/session ends the working session. `revision_log` is part of the active SharedContext and is retained only for that session. Do not interpret references to “persistence” elsewhere in this memory as a requirement for database or cross-session storage.
