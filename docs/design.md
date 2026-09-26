# FOIL — Product Design Specification

**Document:** `design.md`  
**Purpose:** UI/UX and interaction design specification for the FOIL AI brand engine  
**Status:** Final implementation-ready design specification  
**Audience:** Frontend, backend/integration, QA, demo, and submission team members

---

## 1. Purpose

This document defines how FOIL should look, behave, and communicate with the user.

FOIL is a staged AI brand-building workspace. The experience must make the AI workflow visible and understandable rather than presenting branding as a single generated answer.

The design must support the complete product flow:

> Idea Input → Discovery → Positioning → Naming + Personality → Tagline + Pitch → Visual Brief → Voice + Messaging → Launch Prep → Holistic Consistency Audit → Kit Assembly → Export

The design must make four things especially clear:

1. What FOIL is currently working on.
2. What the AI generated or inferred.
3. What the Critic found.
4. What the user has actually approved.

---

# 2. Design Goals

## 2.1 Primary goals

- Make a complex AI workflow feel simple.
- Keep the user in control of important brand decisions.
- Make AI reasoning and criticism visible without exposing hidden chain-of-thought.
- Make stage dependencies understandable.
- Make revisions safe and reversible.
- Make the final approved brand system easy to inspect and export.
- Provide a strong demo experience within a short hackathon presentation.
- Keep the interface usable on desktop and smaller screens.

## 2.2 Secondary goals

- Reduce cognitive overload.
- Avoid unnecessary navigation.
- Make unfinished work obvious.
- Make errors recoverable.
- Keep terminology consistent across the application.
- Make the product feel like a serious creative strategy workspace rather than a generic chatbot.

---

# 3. Product UX Principles

## 3.1 User remains the decision maker

AI proposes.

Critic evaluates.

User approves.

The interface must never visually imply that an AI-generated answer is automatically final.

Use clear labels:

- `AI Draft`
- `AI Suggestion`
- `Critic Finding`
- `Approved`
- `Needs Review`
- `Rejected`
- `Edited by You`

---

## 3.2 Progressive disclosure

Do not show every technical detail at once.

Default view:

- decision
- short rationale
- important findings
- required action

Expandable view:

- detailed rationale
- assumptions
- evidence
- affected fields
- revision information

---

## 3.3 Decisions must be explicit

Important actions must use explicit controls.

Examples:

- `Approve`
- `Reject`
- `Edit`
- `Accept Finding`
- `Keep Original`
- `Accept Branch`
- `Export`

Avoid ambiguous controls such as:

- `Continue`
- `Done`
- `Looks Good`

when the action actually changes an authoritative decision.

---

## 3.4 Preserve context

The user should always know:

- current stage
- completed stages
- current decision
- what needs attention
- what is blocked
- what changed

---

## 3.5 Show AI work as structured output

FOIL should not resemble a normal chat application.

Use:

- cards
- structured sections
- comparison panels
- chips
- evidence blocks
- decision controls
- audit findings
- revision indicators

A small contextual AI explanation can be shown, but the main interaction should remain structured.

---

# 4. FOIL Visual Direction

## 4.1 Design concept

FOIL should feel like an **editorial creative strategy workspace**.

The visual language combines:

- clean product UI
- editorial typography
- structured cards
- strong whitespace
- subtle borders
- focused accent color
- visible AI/critic states

The interface should feel intelligent and creative without looking playful or like a consumer chatbot.

---

## 4.2 Recommended visual personality

FOIL should communicate:

- intelligent
- focused
- modern
- creative
- trustworthy
- structured
- premium

Avoid:

- excessive gradients
- excessive glassmorphism
- noisy illustrations
- oversized decorative graphics
- chat-bubble-heavy layouts
- unexplained AI magic
- dense dashboards

---

# 5. Design Tokens

These values define the initial visual system. They may be implemented as CSS variables/design tokens.

## 5.1 Color palette

### Core

| Token | Value | Usage |
|---|---|---|
| `--ink-950` | `#111111` | Primary text / dark surfaces |
| `--ink-700` | `#3F3F46` | Secondary text |
| `--ink-500` | `#71717A` | Muted text |
| `--paper-50` | `#FAF9F7` | Application background |
| `--surface-0` | `#FFFFFF` | Cards / panels |
| `--surface-100` | `#F4F4F5` | Secondary surfaces |
| `--border` | `#E4E4E7` | Borders / dividers |
| `--accent-600` | `#6D5EF5` | Primary actions / active states |
| `--accent-100` | `#EEEBFF` | Accent background |

### Semantic states

| State | Recommended treatment |
|---|---|
| Success | Green text + pale green background |
| Warning / Needs Review | Amber text + pale amber background |
| Error | Red text + pale red background |
| Informational | Blue text + pale blue background |
| AI-generated | Accent/violet treatment |
| User-approved | Green confirmation treatment |

Color must never be the only indicator of state. Pair color with text, icon, or label.

---

# 6. Typography

Use a clean modern sans-serif for application UI.

Recommended hierarchy:

| Level | Purpose |
|---|---|
| Display | Product/project title |
| H1 | Page/stage title |
| H2 | Major section |
| H3 | Card/group title |
| Body | Main readable content |
| Small | Supporting metadata |
| Label | Form/control labels |
| Mono | IDs, technical values, schema/debug information |

Recommended characteristics:

- strong hierarchy
- comfortable line height
- short paragraphs
- readable card content
- no all-caps paragraphs

Suggested type scale:

- Display: 36–48px
- H1: 28–36px
- H2: 22–28px
- H3: 17–20px
- Body: 15–17px
- Small: 13–14px
- Label: 12–14px

---

# 7. Spacing and Layout

Use an 8px-based spacing system.

Recommended values:

- 4px — micro spacing
- 8px — icon/text spacing
- 12px — compact control spacing
- 16px — standard spacing
- 24px — card spacing
- 32px — section spacing
- 48px — major section spacing
- 64px+ — page-level separation

Use generous whitespace around major AI decisions.

---

# 8. Border Radius

Recommended:

- Small controls: 8px
- Inputs: 10px
- Cards: 12–16px
- Major panels: 16–20px
- Pills/chips: full radius

Avoid making every component excessively rounded.

---

# 9. Application Information Architecture

The application should use a persistent workspace structure.

```text
FOIL
│
├── Project Header
│   ├── Project name
│   ├── Save/status indicator
│   └── Export
│
├── Stage Navigation
│   ├── Idea Input
│   ├── Discovery
│   ├── Positioning
│   ├── Naming + Personality
│   ├── Tagline + Pitch
│   ├── Visual Brief
│   ├── Voice + Messaging
│   ├── Launch Prep
│   ├── Consistency Audit
│   ├── Kit Assembly
│   └── Export
│
└── Main Workspace
    ├── Stage content
    ├── AI Draft
    ├── Critic findings
    └── Decision controls
```

---

# 10. Application Shell

## 10.1 Desktop

Use a three-part workspace:

```text
┌──────────────────────────────────────────────────────────────┐
│ FOIL       Project Name                 Save Status   Export  │
├──────────────┬───────────────────────────────────────────────┤
│              │                                               │
│ Stage        │              Main Workspace                   │
│ Navigation   │                                               │
│              │                                               │
│ ✓ Discovery  │                                               │
│ ✓ Position.  │                                               │
│ → Naming     │                                               │
│ ○ Tagline    │                                               │
│ ○ Visual     │                                               │
│ ...          │                                               │
│              │                                               │
└──────────────┴───────────────────────────────────────────────┘
```

### Sidebar behavior

Each stage displays:

- stage name
- status icon
- completion state
- `Needs Review` state when applicable

Possible states:

- `Not Started`
- `In Progress`
- `Ready for Approval`
- `Approved`
- `Needs Review`
- `Blocked`

---

## 10.2 Mobile

The sidebar becomes a compact stage selector.

Use:

- top project header
- current stage indicator
- horizontal/vertical stage navigation
- stacked content cards
- sticky bottom action area where appropriate

Do not simply shrink the desktop three-column layout.

---

# 11. Project Header

The project header should contain:

### Left

- FOIL logo/name
- project name

### Center/right

- save status
- current stage
- optional revision indicator

### Actions

- `View Brand System`
- `Export`

Export must only become actionable when all export requirements are satisfied.

---

# 12. Stage Screen Anatomy

Every stage should follow a consistent structure.

```text
Stage number
Stage name
Short explanation

┌──────────────────────────────────────┐
│ AI Draft                             │
│                                      │
│ Structured generated content         │
│                                      │
│ [Edit] [Approve]                     │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ Critic Findings                      │
│                                      │
│ Finding cards                        │
│                                      │
└──────────────────────────────────────┘

Decision / next-stage controls
```

The exact content differs by stage, but the interaction pattern remains consistent.

---

# 13. Idea Input Design

## 13.1 Goal

Capture the user's initial idea without prematurely forcing structured strategic decisions.

## 13.2 Layout

```text
Start your brand

Tell FOIL about your idea.

[ Large idea input                              ]

Optional context

Audience      [....................]
Category      [....................]
Constraints   [....................]

                         [Start Discovery →]
```

## 13.3 UX rules

- Keep the first input simple.
- Do not overwhelm the user with a long form.
- Optional context can be expanded.
- Clearly distinguish user-provided facts from later AI assumptions.

---

# 14. Discovery Design

Discovery should feel like the AI is organizing the user's idea into a strategic foundation.

## 14.1 Sections

### Core Problem

What problem does the product/service solve?

### Target Audience

Who is the intended audience?

### Context / Situation

When and where does the problem occur?

### User Goals

What does the audience want to achieve?

### Constraints

Known limitations or requirements.

### Value / Desired Outcome

What valuable result should the brand create?

### Known Facts

Facts supplied or explicitly confirmed by the user.

### Inferred Assumptions

AI-generated assumptions that require user awareness.

### Open Questions

Information that remains uncertain.

---

## 14.2 Facts vs assumptions

Use visually distinct cards.

```text
KNOWN FACT
Provided by you
"Product is designed for college students."

ASSUMPTION
Inferred by FOIL
"Users may prioritize affordability over customization."
```

Never present an AI assumption as a user fact.

---

## 14.3 Discovery approval

Primary action:

`Approve Discovery`

Secondary actions:

`Edit`

`Review Assumptions`

If important fields are changed, dependent downstream stages must follow the project's dependency behavior.

---

# 15. Positioning Design

Positioning is a comparison experience.

The UI should make genuinely different strategic directions easy to compare.

## 15.1 Two-direction layout

```text
POSITIONING

Choose the strategic direction that best represents the brand.

┌─────────────────────┐  ┌─────────────────────┐
│ Direction A         │  │ Direction B         │
│                     │  │                     │
│ Title               │  │ Title               │
│ Audience            │  │ Audience            │
│ Problem             │  │ Problem             │
│ Differentiator      │  │ Differentiator      │
│ Value proposition   │  │ Value proposition   │
│ Competitive angle   │  │ Competitive angle   │
│ Strategic rationale │  │ Strategic rationale │
│ Potential weakness  │  │ Potential weakness  │
│                     │  │                     │
│ Critic findings     │  │ Critic findings     │
│                     │  │                     │
│ [Approve]           │  │ [Approve]           │
└─────────────────────┘  └─────────────────────┘
```

## 15.2 Comparison behavior

Allow:

- compare side by side
- expand rationale
- inspect Critic findings
- edit direction
- approve one direction

Do not automatically rank the directions as "best" unless the user makes the decision.

---

# 16. Naming + Personality Design

## 16.1 Naming area

Each naming direction appears as a card.

Display:

- naming territory
- proposed name
- rationale
- relationship to audience
- relationship to positioning
- concern
- Critic analysis
- sharper alternative

## 16.2 Personality area

Use selectable trait chips.

Example:

```text
PERSONALITY

[ Clear ] [ Warm ] [ Bold ] [ Practical ]

Traits to avoid
[ Arrogant ] [ Corporate ] [ Generic ]

Brand principles
1. ...
2. ...
3. ...
```

Approved traits should be visually distinguished from suggestions.

---

# 17. Tagline + Pitch Design

## 17.1 Layout

Present multiple tagline options as cards.

```text
TAGLINE OPTIONS

┌─────────────────────────────────────┐
│ "Example tagline"                   │
│                                     │
│ Why it works                        │
│ ...                                 │
│                                     │
│ Critic                              │
│ ...                                 │
│                                     │
│ [Edit] [Approve]                    │
└─────────────────────────────────────┘
```

## 17.2 Competitor interchangeability

Critic feedback should be easy to understand.

Use a warning such as:

> This line could describe several competitors because the differentiator is not visible.

Then show:

> Sharper alternative: ...

---

# 18. Visual Brief Design

This stage is a structured creative direction, not a production-ready logo generator.

## 18.1 Sections

- Logo direction
- Color mood
- HEX palette
- Typography
- Type roles
- Shape language
- Symbol language
- Composition/layout
- Imagery direction
- Concepts to avoid
- Rationale

## 18.2 Visual disclaimer

Place a visible note:

> AI-generated visual concept/design direction — not production-ready artwork.

## 18.3 Palette

Use visual swatches plus HEX values.

```text
COLOR MOOD

[████] #XXXXXX
[████] #XXXXXX
[████] #XXXXXX
[████] #XXXXXX
```

Do not imply that the colors have been legally or commercially cleared.

---

# 19. Voice + Messaging Design

## 19.1 Voice summary

Display the voice as a concise statement.

Example layout:

```text
VOICE

Clear, direct, encouraging, and practical.

Tone characteristics
[ Direct ] [ Warm ] [ Confident ] [ Human ]
```

## 19.2 Do / Don't

Use a two-column layout.

```text
DO                          DON'T
✓ Use plain language        ✕ Use corporate jargon
✓ Be specific               ✕ Make vague promises
✓ Sound confident           ✕ Sound arrogant
```

## 19.3 Sample messages

Display 3–4 message cards.

Each card contains:

- message
- intended context
- explanation

---

# 20. Launch Prep Design

Launch Prep must appear before the Holistic Consistency Audit.

## 20.1 Content

### Landing headline

Large preview card.

### Social launch post

Scrollable text card.

### Critic

Findings attached to launch content.

## 20.2 Relationship visualization

Show which approved brand elements influence launch content.

```text
Approved Name ─────┐
Approved Position ─┤
Approved Voice ────┼──→ Launch Message
Approved Tagline ──┘
```

This helps users understand that Launch Prep is not an isolated text-generation step.

---

# 21. Critic Finding Design

Critic findings are one of the most important UI patterns in FOIL.

## 21.1 Finding card

```text
┌──────────────────────────────────────────┐
│ C-014  Audience mismatch                 │
│                                          │
│ Target field                             │
│ Tagline                                  │
│                                          │
│ Evidence                                 │
│ "..."                                    │
│                                          │
│ Why it matters                           │
│ ...                                      │
│                                          │
│ Sharper alternative                      │
│ "..."                                    │
│                                          │
│ [Accept Finding] [Edit] [Reject]         │
└──────────────────────────────────────────┘
```

## 21.2 Issue types

Use consistent labels:

- Cliché
- Audience mismatch
- Contradiction
- Vague
- Bias

The UI must not hide the issue type.

---

# 22. Approval UX

## 22.1 Approval panel

Every stage requiring approval should have a clear decision area.

```text
DECISION

Current draft is ready for your review.

[ Approve ]
[ Edit ]
```

## 22.2 Approved state

After approval:

```text
✓ APPROVED BY YOU

Approved on [date/time]
Revision [number]

[Edit Decision]
```

Editing an approved decision must visibly indicate that the approved value is changing and may affect downstream stages.

---

# 23. Needs Review State

When an upstream change affects a downstream field, do not silently regenerate the field.

Show:

```text
NEEDS REVIEW

This field may be affected by a change to:
Positioning

Current approved value:
"..."

[Review Impact]
```

The user must be able to understand:

- what changed upstream
- why this field may be affected
- what can be reviewed
- whether to keep or edit the current value

---

# 24. Dependency Review

A dependency notification should be concise.

Example:

> Positioning changed. Your tagline may no longer match the approved direction.

Actions:

- `Review Tagline`
- `Keep Current`
- `Edit`

Do not automatically overwrite the approved tagline.

---

# 25. Scenario Probe Design

Scenario Probe lets the user test a changed assumption without destroying the original brand system.

## 25.1 Entry point

Use an action such as:

`Run Scenario Probe`

## 25.2 Scenario input

```text
TEST A DIFFERENT SCENARIO

What changed?

[ New target audience ...................... ]

or

[ Change in context ........................ ]

[ Run Scenario ]
```

## 25.3 Comparison view

```text
ORIGINAL                    SCENARIO BRANCH

Audience                    Audience
...                         ...

Positioning                 Positioning
...                         ...

Tagline                     Tagline
...                         ...

Voice                       Voice
...                         ...
```

## 25.4 Branch controls

The user can:

- `Keep Original`
- `Accept Branch`
- `Edit`

The original approved system remains protected until the user explicitly accepts the branch.

---

# 26. Holistic Consistency Audit

This is a major product screen and should feel like a final quality gate.

## 26.1 Header

```text
HOLISTIC CONSISTENCY AUDIT

FOIL is checking the approved brand system
as one connected system.
```

## 26.2 Brand system summary

Show compact summaries for:

- Name
- Positioning
- Personality
- Tagline
- Visual direction
- Voice
- Launch message

## 26.3 Cross-field conflicts

A finding should clearly identify the conflicting fields.

```text
CONTRADICTION

Fields in conflict:
Voice ↔ Visual Brief

Evidence:
...

Why it matters:
...

Sharper alternative:
...

[Accept] [Edit] [Reject]
```

## 26.4 Audit completion

Only show:

`Ready for Kit Assembly`

when there are no unresolved findings and required decisions are approved.

---

# 27. Kit Assembly Design

Kit Assembly should present the approved brand system as a cohesive artifact.

## 27.1 Brand system overview

Use a polished summary page:

```text
BRAND NAME

Tagline

POSITIONING
...

PERSONALITY
...

VOICE
...

VISUAL DIRECTION
...

LAUNCH MESSAGE
...
```

## 27.2 Visual summary

Show:

- approved palette
- typography roles
- shape language
- symbol language
- composition direction
- imagery direction

## 27.3 Source labeling

Every item must clearly represent the approved project state.

Do not mix:

- rejected AI drafts
- unresolved findings
- outdated versions

into the final kit.

---

# 28. Export Design

## 28.1 Export readiness

Before export, show a checklist.

```text
EXPORT READINESS

✓ Discovery approved
✓ Positioning approved
✓ Naming approved
✓ Tagline approved
✓ Visual Brief approved
✓ Voice approved
✓ Launch Prep approved
✓ Consistency Audit resolved

READY TO EXPORT
```

If something is incomplete:

```text
EXPORT BLOCKED

2 items need attention.

[Review Issues]
```

## 28.2 Export controls

Primary:

`Export Markdown`

Optional:

`Export PDF`

The export interface should make clear that the export contains approved decisions.

---

# 29. AI Draft Visual Treatment

AI-generated content should have a subtle but consistent visual marker.

Example:

```text
✦ AI DRAFT
Generated from approved context
```

Do not use a large robot icon or chatbot imagery.

The visual marker should identify AI origin without dominating the content.

---

# 30. User-Edited Content

When a user changes AI output:

```text
Edited by You
```

show near the relevant field.

This distinction is important for transparency and revision tracking.

---

# 31. Revision History UX

The user should be able to understand that important decisions changed over time.

A lightweight history panel can show:

```text
REVISION HISTORY

v4
Positioning approved
Changed by user

v3
Positioning draft regenerated
Critic finding accepted

v2
Initial positioning generated
```

Avoid turning revision history into a complex developer dashboard.

---

# 32. Loading States

AI operations can take time.

Use stage-specific loading states.

Example:

```text
Analyzing your idea...

FOIL is organizing the information into:
• audience
• problem
• context
• goals
• constraints
```

For Critic:

```text
Reviewing this direction...

Checking:
• audience fit
• clarity
• differentiation
• contradictions
```

Avoid fake progress percentages.

---

# 33. Empty States

Empty states must explain the next action.

Example:

```text
No approved positioning yet.

Complete Positioning and approve
a direction before continuing.

[Go to Positioning]
```

---

# 34. Error States

## 34.1 AI generation error

```text
Generation failed

FOIL could not generate this stage.

Your existing approved decisions are safe.

[Try Again]
```

## 34.2 Validation error

```text
The generated response did not match
the required structure.

No decision was saved.

[Retry]
```

## 34.3 Persistent failure

After allowed retries:

```text
FOIL could not complete this operation.

Nothing was silently substituted.

[Try Again]
[Return to Previous Stage]
```

Never display fake success.

---

# 35. Confirmation Dialogs

Use confirmation dialogs only for consequential actions.

Examples:

### Accept Scenario Branch

> Accepting this branch will update the affected approved decisions and mark dependent fields for review.

Buttons:

`Cancel`

`Accept Branch`

### Reject Finding

> Reject this Critic finding?

Buttons:

`Cancel`

`Reject Finding`

Do not use confirmation dialogs for every minor action.

---

# 36. Responsive Design

## 36.1 Desktop

Target:

- 1280px+
- 1440px preferred for comfortable workspace

Use sidebar + main workspace.

## 36.2 Tablet

Target:

- 768–1279px

Use narrower sidebar or collapsible navigation.

Comparison cards may stack if horizontal space becomes insufficient.

## 36.3 Mobile

Target:

- 320–767px

Use:

- single-column layout
- compact stage navigation
- stacked comparison cards
- sticky decision controls
- horizontally scrollable chips
- readable text without horizontal page scrolling

Never require desktop-only interactions for critical decisions.

---

# 37. Accessibility

## 37.1 Keyboard

All interactive controls must be keyboard accessible.

Required:

- visible focus state
- logical tab order
- keyboard-accessible dialogs
- keyboard-accessible stage navigation

## 37.2 Color

Do not rely on color alone.

Example:

Bad:

> yellow = needs review

Good:

> `⚠ Needs Review`

with supporting color.

## 37.3 Text

- avoid tiny body text
- maintain readable line length
- use descriptive button labels
- preserve sufficient contrast

## 37.4 Forms

Every form input should have:

- label
- clear error state
- useful helper text when needed

---

# 38. Component Design System

Recommended reusable UI components:

```text
AppShell
ProjectHeader
StageSidebar
StageHeader
StageProgress
StageCard
AIDraftCard
CriticFindingCard
ApprovalPanel
StatusBadge
DecisionCard
ComparisonCard
FactCard
AssumptionCard
TraitChip
ColorSwatch
MessageCard
DependencyNotice
ScenarioPanel
BranchComparison
AuditFindingCard
AuditSummary
RevisionHistory
ExportChecklist
ConfirmDialog
LoadingState
ErrorState
EmptyState
Toast
```

Components should remain visually consistent across stages.

---

# 39. Button Hierarchy

## Primary

Used for the main stage action.

Examples:

- `Approve`
- `Run Scenario`
- `Export`

## Secondary

Used for supporting actions.

Examples:

- `Edit`
- `Review`
- `Compare`

## Destructive / caution

Used for rejection or destructive actions.

Examples:

- `Reject`
- `Discard`

Never make `Reject` visually identical to the primary approval action.

---

# 40. Form Design

Inputs should have:

- clear label
- placeholder only when helpful
- optional helper text
- validation state
- sufficient height for comfortable interaction

Long-form text areas should support enough vertical space for the expected answer.

---

# 41. Content Writing Style

FOIL's interface copy should be:

- concise
- direct
- calm
- human
- specific

Prefer:

> Review the assumptions before approving Discovery.

Avoid:

> Please carefully review the following AI-generated content and make an informed decision before proceeding to the next stage.

Prefer:

> This change may affect your tagline.

Avoid:

> The system has detected a potential downstream dependency that could potentially influence subsequent brand-generation outputs.

---

# 42. AI Transparency Language

Use consistent wording.

### AI-generated

> Generated by FOIL

### AI assumption

> Inferred by FOIL

### Critic

> Flagged by Critic

### User decision

> Approved by you

### User edit

> Edited by you

This creates a clear separation between AI work and user decisions.

---

# 43. Stage Progress UX

Use a visual progress indicator without implying that every stage is automatically complete.

Example:

```text
01 ✓
Discovery

02 ✓
Positioning

03 →
Naming + Personality

04 ○
Tagline + Pitch

05 ○
Visual Brief
```

Legend:

- ✓ Approved
- → Current
- ○ Not started
- ⚠ Needs Review
- 🔒 Blocked

---

# 44. Demo Experience

FOIL should be easy to demonstrate in a short sequence.

## Demo starting state

Prepare a project with:

- clear idea input
- generated Discovery
- two positioning directions
- naming
- tagline
- visual brief
- voice
- launch content
- resolved or demonstrable Critic finding
- holistic audit
- export

## Recommended demo sequence

### Beat 1 — Problem

Show the initial idea and explain why one-shot AI branding is insufficient.

### Beat 2 — Product

Show FOIL's staged workspace.

### Beat 3 — Input

Enter or reveal the brand idea.

### Beat 4 — AI Workflow

Show:

- Discovery
- Positioning comparison
- Critic finding
- user approval
- dependency/Scenario Probe if time permits

### Beat 5 — Output

Show:

- complete brand system
- holistic consistency audit
- kit
- export

### Beat 6 — Difference

Explain:

- staged workflow
- Strategist + Critic
- user-controlled approvals
- cross-field consistency

---

# 45. Demo-Safe UI

During the demo:

- avoid exposing raw API keys
- avoid developer console views
- avoid unhandled errors
- avoid fake loading if the operation is already complete
- avoid showing unfinished placeholder screens
- avoid claiming features that are not implemented

If a feature is not implemented, do not present it as working.

---

# 46. UX Anti-Patterns

Do not build FOIL as:

### 46.1 A chatbot

Avoid a single conversation box as the primary workflow.

### 46.2 A one-click brand generator

Do not skip staged review and approval.

### 46.3 An automatic decision maker

AI suggestions must not silently become approved decisions.

### 46.4 A dashboard with no workflow

Users need a clear next action.

### 46.5 A wall of AI text

Prefer structured content and progressive disclosure.

### 46.6 A fake critic

Critic findings must identify:

- issue type
- evidence
- why it matters
- sharper alternative
- user action

### 46.7 A destructive revision system

Never silently overwrite approved decisions.

### 46.8 A production logo generator

The Visual Brief must remain clearly positioned as creative direction.

---

# 47. UI State Matrix

Every major field/stage should support these states:

| State | Visual treatment | User action |
|---|---|---|
| Not Started | Muted | Start |
| Generating | Loading | Wait/cancel where supported |
| Draft | AI marker | Review |
| Critic Flagged | Warning | Review finding |
| Ready for Approval | Normal emphasis | Approve/Edit |
| Approved | Success | Continue/Edit |
| Needs Review | Warning | Review impact |
| Error | Error | Retry |
| Blocked | Muted/locked | Resolve dependency |

---

# 48. Final Brand System View

The user should have a single place to see the approved system.

Recommended order:

1. Brand name
2. Positioning
3. Personality
4. Tagline
5. One-line pitch
6. Visual brief
7. Voice
8. Messaging
9. Launch headline
10. Social launch post
11. Consistency status

The view should prioritize readability over editing.

---

# 49. Final Design Acceptance Checklist

Before the frontend is considered visually complete:

## Global

- [ ] Application shell is implemented.
- [ ] Stage navigation is visible.
- [ ] Current stage is obvious.
- [ ] Approved/Needs Review states are clear.
- [ ] AI-generated content is labeled.
- [ ] User-edited content is labeled.
- [ ] Responsive behavior works.

## Workflow

- [ ] Idea Input is simple.
- [ ] Discovery clearly separates facts and assumptions.
- [ ] Positioning supports side-by-side comparison.
- [ ] Naming supports rationale and Critic findings.
- [ ] Tagline supports Critic review.
- [ ] Visual Brief shows structured visual direction.
- [ ] Visual Brief includes the non-production-ready disclaimer.
- [ ] Voice supports do/don't guidance.
- [ ] Launch Prep is visible before Consistency Audit.
- [ ] Holistic Audit shows cross-field conflicts.
- [ ] Kit Assembly presents only the approved system.
- [ ] Export readiness is explicit.

## Critic

- [ ] Finding ID is visible.
- [ ] Issue type is visible.
- [ ] Target field(s) are visible.
- [ ] Evidence is visible.
- [ ] Why it matters is visible.
- [ ] Sharper alternative is visible.
- [ ] User action is visible.

## Approval

- [ ] Approve is explicit.
- [ ] Edit is explicit.
- [ ] Rejection is explicit.
- [ ] Approved decisions are visually distinct.
- [ ] Editing approved decisions communicates downstream impact.

## Dependencies

- [ ] Needs Review is visible.
- [ ] Cause of impact is visible.
- [ ] Current value is preserved.
- [ ] User can review before changing it.

## Scenario Probe

- [ ] Scenario input is clear.
- [ ] Original system remains visible.
- [ ] Branch is clearly labeled.
- [ ] Accept Branch is explicit.
- [ ] Keep Original is explicit.

## Audit

- [ ] Full approved brand system is summarized.
- [ ] Cross-field conflicts are clear.
- [ ] Findings support user action.
- [ ] Unresolved findings block final completion.

## Export

- [ ] Export readiness checklist exists.
- [ ] Incomplete stages are identified.
- [ ] Approved content is used.
- [ ] Export does not imply unresolved content is final.

## Accessibility

- [ ] Keyboard navigation works.
- [ ] Focus states are visible.
- [ ] Contrast is sufficient.
- [ ] Status is not communicated by color alone.
- [ ] Form labels are present.

---

# 50. Design-to-Implementation Guidance

The frontend team should treat this file as the UI/UX source of truth.

The implementation should:

1. Follow the exact workflow and state behavior defined by the PRD and rules.
2. Use architecture.md for technical boundaries and data contracts.
3. Use tasks.md for ownership and execution order.
4. Reuse the component patterns defined in this document.
5. Keep visual styling consistent across every stage.
6. Never introduce UI that implies behavior not supported by the implementation.
7. Preserve the distinction between AI draft, Critic finding, user edit, and approved decision.

If a visual decision conflicts with a product rule, the product rule wins.

If a visual detail is not specified here, prefer the existing design system and consistent behavior over adding a new pattern.

---

# 51. Final Design Principle

FOIL should make the following relationship obvious at every stage:

```text
USER IDEA
    ↓
FOIL STRATEGIST
    ↓
STRUCTURED DRAFT
    ↓
FOIL CRITIC
    ↓
FINDINGS + SHARPER ALTERNATIVES
    ↓
USER DECISION
    ↓
APPROVED BRAND SYSTEM
    ↓
HOLISTIC CONSISTENCY CHECK
    ↓
KIT + EXPORT
```

The product should feel like a **guided brand strategy workspace**, not an AI that makes branding decisions for the user.

**End of design.md**
