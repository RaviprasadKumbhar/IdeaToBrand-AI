# FOIL — Final Implementation Tasks

## 1. Purpose

This document is the execution plan for building FOIL, the staged AI brand engine.

**Workflow:** Idea Input → Discovery → Positioning → Naming + Personality → Tagline + Pitch → Visual Brief → Voice + Messaging → Launch Prep → Holistic Consistency Audit → Kit Assembly → Export

The project has **3 members**. Work is divided by ownership while keeping shared architectural rules centralized.

---

## 2. Team Ownership

| Member | Primary Ownership | Secondary / Support |
|---|---|---|
| **Member 1 — AI / Backend Lead** | AI engine, Strategist, Critic, schemas, shared context, stage logic, dependency engine, Scenario Probe, Consistency Audit | Integration, debugging, demo support |
| **Member 2 — Frontend / UX Lead** | Application UI, stage screens, approval UX, Critic UI, Scenario Probe UI, Consistency Audit UI, export UI | Frontend-backend integration, responsive/accessibility |
| **Member 3 — Data / Integration / QA Lead** | Persistence, APIs/integration, project state, revision history, export assembly, testing, deployment, QA | Backend support, integration, demo/submission support |

### Shared responsibility

All three members must:
- Read and follow `PRD.md`, `architecture.md`, and `rules.md`.
- Review changes that affect shared contracts.
- Test the complete end-to-end workflow.
- Report blockers immediately.
- Never silently change requirements or architecture.
- Keep `approved_decisions` authoritative.
- Never claim a feature is complete without verification.

---

## 3. Priority System

### P0 — Required for working submission
A task is P0 if the product cannot satisfy the core FOIL workflow without it.

### P1 — Important quality / completeness
Required where feasible after the complete P0 flow works.

### P2 — Optional polish
Only work on P2 after P0 is stable and P1 critical items are complete.

---

# 4. Phase 0 — Project Foundation

## T-001 — Repository and Branch Setup
**Owner:** Member 3 | **Priority:** P0 | **Dependencies:** None | **Status:** DONE

### Tasks
- Verify repository structure.
- Create/verify development branches.
- Establish a clean main/development workflow.
- Verify project documentation files.
- Confirm environment setup instructions.

### Acceptance Criteria
- All members can run the project locally.
- Repository structure matches `architecture.md`.
- No secrets are committed.

## T-002 — Environment and Configuration
**Owner:** Member 3 | **Priority:** P0 | **Dependencies:** T-001 | **Status:** DONE

### Tasks
- Configure required environment variables.
- Configure AI/API credentials through environment variables.
- Configure client-side sessionStorage recovery as specified in architecture.md; do not add a database.
- Add `.env.example` without real secrets.

### Acceptance Criteria
- Application starts with documented setup.
- Missing configuration produces a clear error.
- Secrets are not exposed in source control or frontend code.

## T-003 — Shared Domain Contracts
**Owner:** Member 1 | **Priority:** P0 | **Dependencies:** T-001

### Tasks
Define canonical contracts for:
- `project_id`
- `user_facts`
- `ai_assumptions`
- `approved_decisions`
- `stage_drafts`
- `critic_findings`
- `scenario_overrides`
- `revision_log`

Also define stage identifiers, approval/status states, errors, critic findings, and export structures according to `architecture.md`.

### Acceptance Criteria
- All members use the same field names and contracts.
- Drafts, approvals, findings, and revisions are clearly separated.
- No module creates a competing version of project state.

---

# 5. Phase 1 — Core AI Engine

## T-004 — AI Provider / Model Service
**Owner:** Member 1 | **Priority:** P0 | **Dependencies:** T-002, T-003

Implement the common AI service, structured input/output handling, timeout/error handling, and secure API-key usage.

**Done when:** AI calls work through one controlled service and errors are structured.

## T-005 — Strategist Engine
**Owner:** Member 1 | **Priority:** P0 | **Dependencies:** T-004

Implement Strategist behavior:
- receives stage-specific context;
- generates structured drafts;
- distinguishes facts from assumptions;
- respects approved decisions;
- follows stage schemas;
- never silently modifies approved decisions.

**Done when:** Strategist output is a draft and can never directly approve content.

## T-006 — Critic Engine
**Owner:** Member 1 | **Priority:** P0 | **Dependencies:** T-005

Implement Critic issue types:
- cliché
- audience mismatch
- contradiction
- vague
- bias

Every finding must contain:
- ID
- target field
- issue type
- evidence
- explanation
- sharper alternative
- user action

**Done when:** Critic produces actionable findings and cannot silently modify decisions.

## T-007 — Schema Validation and Retry Handling
**Owner:** Member 1 | **Priority:** P0 | **Dependencies:** T-005, T-006

Validate every structured AI response. Implement retry/regeneration limits from `architecture.md`. Surface failure after limits. Never use fake fallback success.

**Done when:** malformed AI output cannot enter approved state.

---

# 6. Phase 2 — Persistence and Project State

## T-008 — Project Persistence
**Owner:** Member 3 | **Priority:** P0 | **Dependencies:** T-003, T-002 | **Status:** DONE

Persist:
- project information
- user facts
- AI assumptions
- stage drafts
- approved decisions
- critic findings
- scenario overrides
- revision history
- audit results

**Done when:** state survives refresh and approved/draft data remain separated.

## T-009 — Approval State Management
**Owner:** Member 3 | **Priority:** P0 | **Dependencies:** T-008 | **Status:** DONE

Implement approve/reject/edit/revise/review-required behavior according to architecture.

**Done when:** only explicit user action changes approval and changes are logged.

## T-010 — Revision History
**Owner:** Member 3 | **Priority:** P0 | **Dependencies:** T-009 | **Status:** DONE

Record meaningful approved changes, including changed field, relevant stage/branch, action/source, and timestamp where supported.

**Done when:** approved changes and Scenario Probe acceptance are traceable.

---

# 7. Phase 3 — Frontend Foundation

## T-011 — Application Shell
**Owner:** Member 2 | **Priority:** P0 | **Dependencies:** T-001, T-003

Build:
- main application shell
- navigation
- project area
- stage navigation
- progress/status indicators
- responsive layout

**Done when:** user can clearly navigate the staged workflow.

## T-012 — Reusable Stage Screen
**Owner:** Member 2 | **Priority:** P0 | **Dependencies:** T-011

Support:
- stage title
- context
- generated draft
- loading
- error
- Critic findings
- approve/reject/edit
- regenerate
- needs-review

**Done when:** draft and approved states are visually distinct.

## T-013 — Approval and Editing UX
**Owner:** Member 2 | **Priority:** P0 | **Dependencies:** T-012, T-009

Build explicit Approve, Reject, Edit, Save, Regenerate, and Review Required interactions.

**Done when:** UI never implies approval before explicit approval.

---

# 8. Phase 4 — Discovery

## T-014 — Idea Input
**Owner:** Member 2 | **Priority:** P0 | **Dependencies:** T-011, T-003

Create input flow for idea/business description, user facts, constraints, and context.

**Done when:** user input is stored without being silently converted into AI-discovered facts.

## T-015 — Discovery Stage
**Owner:** Member 1 | **Priority:** P0 | **Dependencies:** T-005, T-006, T-014

Required outputs:
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

**Done when:** facts and assumptions are visibly distinguishable and user approval works.

---

# 9. Phase 5 — Positioning

## T-016 — Positioning Generation
**Owner:** Member 1 | **Priority:** P0 | **Dependencies:** T-015

Generate at least **2 genuinely divergent** directions.

Each direction:
- title
- category
- target audience
- core problem
- differentiator
- value proposition
- competitive angle
- strategic rationale
- potential weakness
- critic findings

**Done when:** directions are strategically different and an approved direction becomes authoritative.

## T-017 — Positioning Comparison UI
**Owner:** Member 2 | **Priority:** P0 | **Dependencies:** T-016

**Done when:** both directions can be compared and the user can explicitly select/edit according to architecture.

---

# 10. Phase 6 — Naming + Personality

## T-018 — Naming + Personality Engine
**Owner:** Member 1 | **Priority:** P0 | **Dependencies:** T-016

Required:
- naming directions
- territory
- proposed name
- rationale
- audience/positioning relationship
- concern
- critic analysis
- sharper alternative
- 3–5 personality traits
- traits to avoid
- brand principles
- principle rationale

Do not make unsupported trademark/domain availability claims.

## T-019 — Naming + Personality UI
**Owner:** Member 2 | **Priority:** P0 | **Dependencies:** T-018

**Done when:** name, rationale, concerns, traits, principles, and Critic findings are clearly presented and approvable.

---

# 11. Phase 7 — Tagline + Pitch

## T-020 — Tagline + Pitch Engine
**Owner:** Member 1 | **Priority:** P0 | **Dependencies:** T-018

Generate:
- tagline options
- rationale
- one-line pitch
- Critic analysis

Critic must check competitor interchangeability.

## T-021 — Tagline + Pitch UI
**Owner:** Member 2 | **Priority:** P0 | **Dependencies:** T-020

**Done when:** options are comparable and explicit approval/edit/reject works.

---

# 12. Phase 8 — Visual Brief

## T-022 — Visual Brief Engine
**Owner:** Member 1 | **Priority:** P0 | **Dependencies:** T-020

Required:
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

Must be labeled as an **AI-generated visual concept/design direction**, not production-ready artwork.

## T-023 — Visual Brief UI
**Owner:** Member 2 | **Priority:** P0 | **Dependencies:** T-022

**Done when:** all visual fields are readable, structured, and clearly labeled as concept/design direction.

---

# 13. Phase 9 — Voice + Messaging

## T-024 — Voice + Messaging Engine
**Owner:** Member 1 | **Priority:** P0 | **Dependencies:** T-022

Required:
- voice description
- tone characteristics
- do/don't list
- 3–4 sample messages
- explanation for each

## T-025 — Voice + Messaging UI
**Owner:** Member 2 | **Priority:** P0 | **Dependencies:** T-024

**Done when:** voice, tone, do/don't rules, examples, and approval state are clear.

---

# 14. Phase 10 — Launch Prep

## T-026 — Launch Prep Engine
**Owner:** Member 1 | **Priority:** P0 | **Dependencies:** T-024

Generate:
- landing headline
- social launch post
- Critic evaluation

**Critical:** Launch Prep must complete before Holistic Consistency Audit.

## T-027 — Launch Prep UI
**Owner:** Member 2 | **Priority:** P0 | **Dependencies:** T-026

**Done when:** headline, social post, Critic findings, and approval actions work.

---

# 15. Phase 11 — Dependency Engine

## T-028 — Dependency Map
**Owner:** Member 1 | **Priority:** P0 | **Dependencies:** T-003, T-009

Implement dependency-aware downstream review.

Rules:
- upstream changes affect only relevant downstream fields;
- unrelated approved decisions remain intact;
- affected fields become `needs_review` according to architecture;
- do not blindly regenerate everything.

**Done when:** affected downstream fields are correctly identified and preserved content remains intact.

---

# 16. Phase 12 — Scenario Probe

## T-029 — Scenario Probe Backend
**Owner:** Member 1 | **Priority:** P0 | **Dependencies:** T-028

Implement:
- scenario branch
- scenario override
- affected dependency calculation
- Strategist + Critic reruns for affected fields
- original-vs-branch comparison data
- isolated branch state

**Done when:** branch cannot silently overwrite the original.

## T-030 — Scenario Probe UI
**Owner:** Member 2 | **Priority:** P0 | **Dependencies:** T-029

Required actions:
- Accept branch
- Keep original
- Edit

**Done when:** original and branch are clearly distinguishable and acceptance creates revision history.

---

# 17. Phase 13 — Holistic Consistency Audit

## T-031 — Holistic Consistency Audit Engine
**Owner:** Member 1 | **Priority:** P0 | **Dependencies:** T-026, T-028

**Critical ordering:** MUST run after Launch Prep.

Audit the complete approved brand system across:
- name
- positioning
- personality
- tagline
- pitch
- visual direction
- voice
- messaging
- launch content

Each finding:
- id
- fields_in_conflict
- issue_type
- evidence
- why_it_matters
- sharper_alternative
- user_action

**Done when:** unresolved required findings can block export.

## T-032 — Consistency Audit UI
**Owner:** Member 2 | **Priority:** P0 | **Dependencies:** T-031

Support Accept / Reject / Edit.

**Done when:** conflicts, evidence, impact, alternatives, and actions are clearly visible and export is blocked while required findings remain unresolved.

---

# 18. Phase 14 — Kit Assembly and Export

## T-033 — Kit Assembly
**Owner:** Member 3 | **Priority:** P0 | **Dependencies:** Required P0 stages, T-031 | **Status:** DONE

Assemble the brand system from authoritative approved decisions only.

## T-034 — Export Gating
**Owner:** Member 3 | **Priority:** P0 | **Dependencies:** T-033 | **Status:** DONE

Export MUST fail when:
- required stage is not approved;
- required consistency findings remain unresolved;
- required data is missing;
- export validation fails.

## T-035 — Markdown Export
**Owner:** Member 3 | **Priority:** P0 | **Dependencies:** T-034 | **Status:** DONE

Export the complete approved brand system.

Visual Brief export must include:
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

**Done when:** Markdown export is complete, readable, and contains approved content only.

## T-036 — Optional PDF Export
**Owner:** Member 3 | **Priority:** P2 | **Dependencies:** T-035

Only implement if stable and useful. It must not delay working Markdown export.

---

# 19. Phase 15 — End-to-End Integration

## T-037 — Full Stage Integration
**Owner:** Member 2 + Member 3 | **Priority:** P0 | **Dependencies:** T-015 through T-035 | **Status:** DONE

Connect:
- frontend
- backend APIs
- AI engine
- persistence
- approvals
- Critic
- dependencies
- Scenario Probe
- consistency audit
- export

**Done when:** a user can complete Idea → Discovery → Positioning → Naming → Tagline → Visual → Voice → Launch → Audit → Export without manual backend manipulation.

---

# 20. Phase 16 — Testing and QA

## T-038 — Unit / Contract Testing
**Owner:** Member 3 | **Priority:** P0 | **Status:** DONE

Test:
- schemas
- state transitions
- approval rules
- revision logging
- API validation
- export gates
- dependency calculations

## T-039 — AI Workflow Testing
**Owner:** Member 1 | **Priority:** P0

Test:
- Strategist
- Critic
- malformed output
- retry limits
- facts vs assumptions
- approved-decision protection
- stage context
- Scenario Probe
- consistency audit

## T-040 — UI/UX Testing
**Owner:** Member 2 | **Priority:** P0

Test:
- navigation
- loading
- errors
- approval
- needs-review
- Critic findings
- Scenario Probe
- consistency audit
- export
- responsive behavior

## T-041 — Full End-to-End QA
**Owner:** Member 3 | **Priority:** P0 | **Dependencies:** T-037, T-038, T-039, T-040 | **Status:** DONE

Complete the entire workflow from a new idea to export.

**Done when:** no manual database manipulation, broken stage transitions, silent approval, silent overwrite, or export bypass remains.

---

# 21. Phase 17 — Security and Reliability

## T-042 — Security Review
**Owner:** Member 3 | **Priority:** P0 | **Status:** DONE

Check:
- secrets
- input validation
- AI output validation
- unauthorized project-state changes
- API exposure
- sensitive logs
- frontend secret exposure

## T-043 — Failure-State Review
**Owner:** Member 1 + Member 3 | **Priority:** P0 | **Status:** DONE

Test:
- AI timeout
- malformed output
- API failure
- network failure
- failed regeneration
- failed export

**Done when:** no fake success is displayed and valid existing state is preserved where possible.

---

# 22. Phase 18 — Performance and Polish

## T-044 — Performance Review
**Owner:** Member 3 | **Priority:** P1 | **Status:** DONE

Check unnecessary AI calls, duplicate requests, excessive regeneration, slow loading, large responses, and unnecessary persistence calls.

## T-045 — UX Polish
**Owner:** Member 2 | **Priority:** P1

Improve:
- visual hierarchy
- spacing
- empty states
- loading/error states
- approval clarity
- comparison layouts
- audit readability
- export experience

---

# 23. Phase 19 — Demo Preparation

## T-046 — Demo Scenario
**Owner:** Member 1 + Member 2 | **Priority:** P0

Create one realistic brand idea demonstrating the complete FOIL workflow.

Demo beats:
1. Problem
2. Product
3. Input
4. AI workflow
5. Output
6. Difference

## T-047 — Demo Script
**Owner:** Member 2 | **Priority:** P0

Prepare a 2–4 minute demo covering:
- problem
- product
- input
- staged AI workflow
- Strategist + Critic
- approval
- dependency/Scenario Probe behavior
- Holistic Consistency Audit
- final export
- differentiation

## T-048 — Demo Backup
**Owner:** Member 3 | **Priority:** P1 | **Status:** DONE

Prepare a stable demo project, known-good build, environment backup, and recovery instructions.

Do not fake live AI behavior.

---

# 24. Phase 20 — Submission Preparation

## T-049 — GitHub / Documentation
**Owner:** Member 3 | **Priority:** P0 | **Status:** DONE

Prepare:
- setup instructions
- architecture overview
- technology stack
- project description
- AI workflow
- run instructions
- known limitations

## T-050 — Individual Contribution Records
**Owner:** All Members | **Priority:** P0

Each member documents their own:
- role
- implementation work
- technical contribution
- testing contribution
- demo contribution

Do not claim another member's work.

## T-051 — Instagram Material
**Owner:** Member 2 | **Priority:** P0

Prepare required Instagram content according to the official hackathon requirements, including applicable project, problem, solution, target user, contribution, technology/AI, Inkloom references, links, tags, and demo information.

Each participant completes their own required submission where individual submission is required.

## T-052 — LinkedIn Material
**Owner:** Member 3 | **Priority:** P0 | **Status:** DONE

Prepare required LinkedIn content including project, target users, problem, solution, workflow, features, technology, contribution, differentiation, Inkloom information, GitHub/live links, required tags, and the demo video uploaded directly to LinkedIn.

Each participant completes their own required submission where applicable.

---

# 25. Final P0 Checklist

- [ ] Idea Input works
- [ ] Discovery works
- [ ] Facts and assumptions are separated
- [ ] Positioning produces at least 2 genuinely divergent directions
- [ ] Naming + Personality works
- [ ] Tagline + Pitch works
- [ ] Visual Brief contains all required fields
- [ ] Visual Brief is labeled as concept/design direction
- [ ] Voice + Messaging works
- [ ] Launch Prep works
- [ ] Holistic Consistency Audit runs AFTER Launch Prep
- [ ] Audit checks the complete approved brand system
- [ ] Every audit finding has a sharper alternative
- [ ] Unresolved required audit findings block export
- [ ] Strategist and Critic roles are separate
- [ ] No third AI agent exists
- [ ] Shared context is authoritative
- [ ] `approved_decisions` cannot be silently overwritten
- [ ] Explicit user approval is required
- [ ] Revision history works
- [x] Dependency-aware review works
- [x] Scenario Probe does not silently overwrite the original
- [x] Scenario Probe supports accept/keep/edit
- [ ] AI output is schema validated
- [ ] Retry limits are enforced
- [ ] Failed AI output is visible
- [ ] No fake success exists
- [ ] No unsupported trademark/domain claims are presented as verified
- [ ] Export contains approved content only
- [ ] Markdown export works
- [ ] End-to-end workflow works without manual backend manipulation
- [ ] Demo uses the real product
- [ ] GitHub documentation is ready
- [ ] Individual contributions are documented
- [ ] Submission requirements are checked

---

# 26. Definition of Done

FOIL is implementation-complete only when:

1. The complete staged workflow works end-to-end.
2. Strategist + Critic architecture is functional.
3. User approval controls the authoritative brand system.
4. Approved decisions cannot be silently overwritten.
5. Dependencies correctly mark affected downstream fields.
6. Scenario Probe remains isolated until accepted.
7. Holistic Consistency Audit occurs after Launch Prep.
8. Required consistency findings are resolved before export.
9. Schema validation and bounded retry behavior work.
10. Failure states are honest and visible.
11. Export contains approved decisions only.
12. The complete approved brand system can be exported.
13. The real product can be demonstrated.
14. No critical P0 task remains incomplete.

---

# 27. Recommended Execution Order

**Foundation → Shared Contracts → AI Engine → Persistence → Frontend Foundation → Discovery → Positioning → Naming + Personality → Tagline + Pitch → Visual Brief → Voice + Messaging → Launch Prep → Dependency Engine → Scenario Probe → Holistic Consistency Audit → Kit Assembly → Export → Integration → QA → Security → Demo → Submission**

Do not spend major effort on P1/P2 polish while critical P0 functionality is broken.

---

# 28. Three-Member Parallel Work Plan

## Member 1 — AI / Backend Lead
Primary sequence:

**T-003 → T-004 → T-005 → T-006 → T-007 → T-015 → T-016 → T-018 → T-020 → T-022 → T-024 → T-026 → T-028 → T-029 → T-031 → T-039**

Focus:
- AI workflow
- Strategist
- Critic
- stage contracts
- dependency engine
- Scenario Probe
- consistency audit

## Member 2 — Frontend / UX Lead
Primary sequence:

**T-011 → T-012 → T-013 → T-014 → T-017 → T-019 → T-021 → T-023 → T-025 → T-027 → T-030 → T-032 → T-040 → T-045 → T-047**

Focus:
- UI
- stage screens
- approval UX
- comparison UX
- Critic presentation
- Scenario Probe
- consistency audit
- demo experience

## Member 3 — Data / Integration / QA Lead
Primary sequence:

**T-001 → T-002 → T-008 → T-009 → T-010 → T-033 → T-034 → T-035 → T-037 → T-038 → T-041 → T-042 → T-044 → T-048 → T-049 → T-052**

Focus:
- persistence
- project state
- revision history
- integration
- export
- QA
- security
- documentation
- submission support

---

# 29. Shared Handoff Rules

When one member finishes a task another member depends on:

1. Verify acceptance criteria.
2. Document API/schema changes.
3. Tell the dependent member what changed.
4. Do not silently change shared contracts.
5. If a contract must change, review its architecture/rules impact first.
6. Test the handoff before marking the task ready.

---

# 30. Critical Stop Conditions

Stop and resolve the issue if:

- a third AI agent is proposed;
- AI can silently modify `approved_decisions`;
- user approval can be bypassed;
- Launch Prep occurs after the Holistic Consistency Audit;
- export bypasses unresolved required findings;
- Scenario Probe can silently overwrite the original;
- malformed AI output can enter approved state;
- failed operations show fake success;
- unsupported trademark/domain availability is presented as verified;
- major architecture changes are made without impact review;
- shared contracts conflict between members.

---

# 31. Final Team Sign-Off

### Member 1
- [ ] AI workflow verified
- [ ] Strategist verified
- [ ] Critic verified
- [x] Dependency behavior verified
- [x] Scenario Probe verified
- [ ] Consistency Audit verified

### Member 2
- [ ] UI workflow verified
- [ ] Approval UX verified
- [ ] Critic UX verified
- [ ] Scenario Probe UX verified
- [ ] Consistency Audit UX verified
- [ ] Demo UX verified

### Member 3
- [ ] Persistence verified
- [ ] Revision history verified
- [ ] Export verified
- [ ] API/integration verified
- [ ] Security verified
- [ ] End-to-end QA verified

### All Members
- [ ] PRD requirements checked
- [ ] Architecture checked
- [ ] Rules checked
- [ ] P0 checklist complete
- [ ] Demo tested
- [ ] Individual contributions documented
- [ ] Submission requirements checked

---

# 32. Status Values

Use only:

- `NOT_STARTED`
- `IN_PROGRESS`
- `BLOCKED`
- `READY_FOR_REVIEW`
- `DONE`

A task is `DONE` only after its acceptance criteria have been verified.

**Current Status: `NOT_STARTED`**
