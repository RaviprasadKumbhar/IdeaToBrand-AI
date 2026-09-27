# IdeaToBrand AI (FOIL) — User Manual & Operator Guide

Welcome to **IdeaToBrand AI** (powered by the FOIL architecture). This manual walks you through everything you need to know to take a raw startup or business concept and turn it into a cohesive, market-tested, launch-ready brand system.

---

## Table of Contents
1. [Overview & Core Philosophy](#1-overview--core-philosophy)
2. [Getting Started & Authentication](#2-getting-started--authentication)
3. [The 10-Stage Brand Pipeline](#3-the-10-stage-brand-pipeline)
   - [Stage 0: Idea Input](#stage-0-idea-input)
   - [Stage 1: Discovery](#stage-1-discovery)
   - [Stage 2: Positioning](#stage-2-positioning)
   - [Stage 3: Naming & Personality](#stage-3-naming--personality)
   - [Stage 4: Tagline & Pitch](#stage-4-tagline--pitch)
   - [Stage 5: Visual Brief](#stage-5-visual-brief)
   - [Stage 6: Voice & Messaging](#stage-6-voice--messaging)
   - [Stage 7: Launch Prep](#stage-7-launch-prep)
   - [Stage 8: Holistic Consistency Audit](#stage-8-holistic-consistency-audit)
   - [Stage 9: Kit Assembly & Export](#stage-9-kit-assembly--export)
4. [Dual AI Engine: Strategist vs. Critic](#4-dual-ai-engine-strategist-vs-critic)
5. [Scenario Probe ("What-If" Analysis)](#5-scenario-probe-what-if-analysis)
6. [Conversational Chat Workspace](#6-conversational-chat-workspace)
7. [Downstream Dependencies & State Machine](#7-downstream-dependencies--state-machine)
8. [Export Gating & Output Artifacts](#8-export-gating--output-artifacts)
9. [Frequently Asked Questions (FAQ) & Troubleshooting](#9-frequently-asked-questions-faq--troubleshooting)

---

## 1. Overview & Core Philosophy
Traditional generative branding tools produce flattering, cliché-filled placeholder copy that sounds generic. **IdeaToBrand AI** is fundamentally different:
- **It Argues Back**: Every stage draft is vetted by an adversarial **Critic AI** looking for clichés, audience mismatches, and contradictions.
- **Strict Human Approval Gate**: The AI suggests, but nothing becomes official until *you* click **Approve**.
- **Choke-Point Architecture**: Every approved decision is permanently recorded in an immutable revision log with full audit trails.
- **Dependency Awareness**: If you modify an upstream decision (e.g., Positioning), downstream stages (e.g., Tagline, Visuals) are flagged as `needs_review`—never blindly overwritten.

---

## 2. Getting Started & Authentication

### 2.1 Accessing the Application
- Open `http://localhost:5173/` in your web browser.
- You will see the **IdeaToBrand AI Landing Page** highlighting the core features.

### 2.2 Account Creation & Login
1. Click **Get Started** or navigate to `/signup`.
2. Enter your Name, Email, and Password (minimum 6 characters).
3. If email verification is enabled, confirm your email, then navigate to `/login`.
4. Once authenticated, you will be redirected to the **Chat Workspace** (`/workspace`).

---

## 3. The 10-Stage Brand Pipeline

The canonical FOIL brand lifecycle progresses sequentially through 10 stages:

```
Idea Input
  ↓
Discovery (Stage 1)
  ↓
Positioning (Stage 2)
  ↓
Naming + Personality (Stage 3)
  ↓
Tagline + Pitch (Stage 4)
  ↓
Visual Brief (Stage 5)
  ↓
Voice + Messaging (Stage 6)
  ↓
Launch Prep (Stage 7)
  ↓
Holistic Consistency Audit (Stage 8)
  ↓
Kit Assembly & Export (Stage 9)
```

---

### Stage 0: Idea Input
- **URL**: `/idea-input`
- **What it does**: Captures your raw business concept, target market, category, and real-world constraints.
- **Rules**:
  - The business description requires at least 5 words.
  - You can select one of the pre-built templates (e.g., AgriTech Farmer Marketplace, Specialty Coffee, B2B SaaS, Student Collaboration) or type your own concept.
  - User facts are strictly preserved and kept separate from AI assumptions.
- **Action**: Click **Start Discovery →**.

---

### Stage 1: Discovery
- **URL**: `/discovery`
- **What it generates**:
  - `core_problem`: The acute problem facing your customers.
  - `target_audience`: The exact segment who feels the pain.
  - `context_situation`: When and where the problem arises.
  - `user_goals` & `constraints`: What the user wants to achieve and limitations.
  - `facts_vs_assumptions`: Separates proven user facts from AI hypotheses.
- **Critic Evaluation**: Evaluates whether the problem is too broad, solution-biased, or lacking specificity.
- **Action**: Review findings, edit any field if desired, and click **Approve Discovery**.

---

### Stage 2: Positioning
- **URL**: `/positioning`
- **What it generates**:
  - Presents at least **2 distinct strategic directions** (e.g., "The Premium Specialist" vs. "The Frictionless Utility").
  - Each direction contains: category, target audience, differentiator, value proposition, competitive angle, strategic rationale, and potential weakness.
- **Critic Evaluation**: Flags generic claims, "all-in-one" traps, or unprovable superiority claims.
- **Action**: Select your preferred direction card and click **Approve Selected Direction**.

---

### Stage 3: Naming & Personality
- **URL**: `/naming-personality`
- **What it generates**:
  - Multiple brand naming territories (e.g., Evocative, Descriptive, Invented).
  - Proposed names with linguistic rationale and trademark conflict risk assessments.
  - 3–5 distinct personality traits with audience justifications.
  - Negative traits to avoid (anti-traits) and core brand principles.
- **Action**: Select the winning name or edit the field, address any Critic concerns, and click **Approve Naming & Personality**.

---

### Stage 4: Tagline & Pitch
- **URL**: `/tagline-pitch`
- **What it generates**:
  - Tagline candidates categorized by emotional angle and functional angle.
  - High-impact **One-Line Pitch** (30-second elevator pitch).
- **Critic Evaluation**: Strictly checks for buzzwords ("streamline", "seamless", "synergy", "revolutionize").
- **Action**: Edit or select the sharpest tagline, click **Approve Tagline & Pitch**.

---

### Stage 5: Visual Brief
- **URL**: `/visual-brief`
- **What it generates**:
  - Comprehensive 10-field creative direction.
  - Color palette (Primary, Secondary, Accent, Background) with hex codes and color psychology rationale.
  - Typography pairings (Header font, Body font, Monospace/Accent).
  - Imagery guidelines, mood boards, aesthetic philosophy, and physical/digital UI guidelines.
- **Action**: Click **Approve Visual Brief**.

---

### Stage 6: Voice & Messaging
- **URL**: `/voice-messaging`
- **What it generates**:
  - 3 Core Pillars of messaging.
  - Voice tonal attributes (e.g., authoritative yet approachable).
  - Clear **"Say This vs. Don't Say This"** behavioral copy guidelines.
- **Action**: Click **Approve Voice & Messaging**.

---

### Stage 7: Launch Prep
- **URL**: `/launch-prep`
- **What it generates**:
  - High-converting **Landing Headline & Subhead**.
  - Ready-to-publish **Social Launch Post** (LinkedIn/Twitter/Instagram format).
- **Critic Evaluation**: Verifies alignment with the approved visual tone and positioning.
- **Action**: Click **Approve Launch Prep**.
- **Progression**: Unlocks the prominent **"Proceed to Holistic Consistency Audit →"** button.

---

### Stage 8: Holistic Consistency Audit
- **URL**: `/consistency-audit`
- **What it does**:
  - Evaluates the **entire approved brand system as one single connected organism**—not stage by stage.
  - Cross-checks Naming against Positioning, Visual Direction against Voice, and Launch Post against Target Audience.
- **Finding Format**:
  - `fields_in_conflict`: The two or more stages clashing (e.g., `visual_brief.color_mood` vs `positioning.category`).
  - `issue_type`: Contradiction, Cliché, Audience Mismatch, Vague, or Bias.
  - `evidence` & `why_it_matters`: Factual proof of the conflict.
  - `sharper_alternative`: A specific, concrete alternative suggestion.
- **Resolution**:
  - **Accept**: Automatically updates the target stage decision with the sharper alternative and writes to the revision log (`cause: "consistency_finding_accept"`).
  - **Reject**: Explicitly dismisses the finding with reason.
  - **Edit**: Lets you refine the text manually.
- **Approval**: Once all findings are resolved, click **Approve Audit & Proceed to Export →**.

---

### Stage 9: Kit Assembly & Export
- **URL**: `/export`
- **What it does**:
  - Gated safety checklist: Checks that all 7 generative stages are approved and all Consistency Audit findings are resolved.
  - Compiles the entire brand kit into a clean, markdown/PDF ready document.
- **Action**: Click **Export Brand Kit (.md)** to download your complete brand book.

---

## 4. Dual AI Engine: Strategist vs. Critic

IdeaToBrand AI avoids standard hallucination through paired adversarial engines:

| Dimension | Strategist AI | Critic AI |
|---|---|---|
| **Role** | Generates strategic recommendations and stage drafts. | Audits drafts for flaws, generic copy, and logic gaps. |
| **Output** | Structured JSON matching strict Zod schemas. | Specific findings with evidence and sharper alternatives. |
| **Authority** | Suggests directions. | Cannot block you permanently, but informs human review. |
| **User Agency** | You can accept, reject, or edit drafts. | You decide whether to Accept, Edit, or Reject each finding. |

---

## 5. Scenario Probe ("What-If" Analysis)

- **URL**: `/scenario-probe`
- **What it does**: Allows founders to stress-test their brand strategy against major pivots **without touching or damaging their active brand**.
- **How to run a test**:
  1. Select the stage to pivot from (e.g., *Positioning*).
  2. Enter your what-if question (e.g., *"What if we target working software engineers instead of engineering college students?"*).
  3. Click **Run Scenario Probe**.
- **What happens**:
  - The engine determines all downstream affected stages.
  - Generates an **isolated sandbox branch**.
  - Displays a side-by-side comparison (**Original vs. Branch (What-If)**) with clean, formatted field differences.
  - Runs Critic AI on the branched content.
- **Decisions**:
  - **Accept Branch**: Replaces the affected approved decisions through the single choke point, flags downstream dependents for review, and records a `scenario_accept` entry in the revision log.
  - **Keep Original**: Discards the branch completely. Your original decisions remain 100% untouched.
  - **Edit Scenario**: Modify your what-if input and test again.
  - **Return to Workspace**: Seamlessly return to the main workspace once decided.

---

## 6. Conversational Chat Workspace

- **URL**: `/workspace`
- Designed for speed and natural language collaboration:
  - Discuss your brand idea in plain English.
  - The AI suggests immediate action plans and displays "What I Understand" summaries.
  - Direct shortcuts to jump into any specific stage deep-dive (`/discovery`, `/positioning`, `/scenario-probe`, etc.).
  - Instant Project Switcher and Cloud Save status in the top bar.

---

## 7. Downstream Dependencies & State Machine

When an approved stage is modified, IdeaToBrand AI prevents silent cascading errors:
- If **Positioning** is re-approved with new content, **Naming**, **Tagline**, **Visual Brief**, **Voice**, and **Launch Prep** are marked `needs_review`.
- Downstream stages are **NEVER** silently deleted or automatically overwritten with robot text.
- You can inspect the prompt banner explaining: *"Upstream stage Positioning was updated. Review this stage to ensure strategic harmony."*

---

## 8. Export Gating & Output Artifacts

Export is strictly gated to ensure zero low-quality exports:
- ❌ **Blocked if**: Any of the 7 generative stages has not been approved.
- ❌ **Blocked if**: Launch Prep was skipped.
- ❌ **Blocked if**: There are unresolved Holistic Consistency Audit findings.
- ✅ **Unblocked when**: All 7 generative stages are approved and all Consistency Audit findings have been resolved (Accepted, Edited, or Rejected).

**Output File**: `ideatobrand-kit.md` containing:
1. Executive Brand Summary
2. Core Problem & Target Audience
3. Market Positioning & Differentiators
4. Brand Name, Etymology & Principles
5. Taglines & Elevator Pitch
6. Complete 10-Field Visual Guidelines (Colors, Fonts, Rules)
7. Voice, Tone & Messaging Matrix
8. Launch Materials (Headline & Social Posts)
9. Consistency Audit Resolution Log
10. Complete Immutable Revision History

---

## 9. Frequently Asked Questions (FAQ) & Troubleshooting

#### Q1: Why does Launch Prep say "Approving Launch Prep unlocks Stage 8"?
> Stage 8 (Holistic Consistency Audit) requires your final launch materials to test against your original positioning. Once Launch Prep is approved, click the **"Proceed to Holistic Consistency Audit →"** button.

#### Q2: Does refreshing the page lose my approved decisions?
> No. All approved decisions are permanently persisted in the session and automatically synced to Supabase Cloud Storage. Upon reload, your stages retain their approved state.

#### Q3: Does testing a What-If Scenario in Scenario Probe change my current project?
> Absolutely not. Scenario Probe generates an isolated memory sandbox. Your approved decisions are only modified if you explicitly click **Accept Branch**.

#### Q4: Why is the Export button disabled?
> Check the Export Readiness checklist on `/export`. Ensure all 7 stages have a green checkmark (`✓`) and the Consistency Audit indicates all findings are resolved.
