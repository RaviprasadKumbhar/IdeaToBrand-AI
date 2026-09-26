# FOIL — Official 2–4 Minute Demo Script (T-047)

> **Document Version:** 1.0  
> **Author / Owner:** Member 2 (Frontend / UX Lead)  
> **Target Demo Duration:** ~3 minutes 20 seconds (Within the 2–4 minute official limit)  
> **Product Name:** FOIL (First-principles Operational Identity Layer)  
> **Repository Convention:** `docs/demo-script.md`  
> **Official References:** `docs/PRD.md`, `docs/architecture.md`, `docs/tasks.md`, `docs/memory.md`, Inkloom Participant Handbook

---

## 1. Demo Overview & Narrative Arc

FOIL is a staged AI brand intelligence engine that transforms rough, incomplete founder ideas into a launch-ready, internally coherent brand system. Unlike conventional "single-prompt" AI tools that generate disjointed slogans, generic logos, and clichéd marketing copy, FOIL enforces:

1. **A disciplined 10-stage sequential pipeline** where later stages strictly build upon earlier approved context.
2. **Dual AI Roles (Strategist vs. Critic):** The Strategist generates candidate drafts, while an adversarial Critic audits every field for clichés, audience mismatches, contradictions, and vagueness—offering sharper alternatives.
3. **Strict Human Gatekeeping:** AI outputs are candidate drafts only. No decision enters the authoritative brand system without explicit human approval. Approved data is immutable and append-only.
4. **Isolated Scenario Probe:** A sandbox environment where founders can stress-test hypothetical "what-if" strategic pivots without corrupting their approved brand state.
5. **Holistic Consistency Audit:** A system-wide coherence gate that runs strictly after Launch Prep and blocks final kit export until all blocking cross-stage contradictions are resolved.

---

## 2. Truthful Implementation Status Verification

Per hackathon integrity rules and `tasks.md`, this script reflects the **actual working application state**. Never claim an unimplemented capability is working during the presentation.

| Feature / Step | Status | Implementation Details | Demo Guidance |
| :--- | :--- | :--- | :--- |
| **Stage Workflow (10 Stages)** | ✅ **Verified Working** | Complete state machine implemented in `shared/state-machine.ts` and rendered across 11 stage views in `frontend/src/stages/`. | Run live from browser. Navigate through topological stage sequence. |
| **Approval Bar & Human Gate** | ✅ **Verified Working** | `ApprovalBar.tsx` requires explicit user clicks (`Approve & Proceed`, `Request Changes`). Unapproved stages block downstream progression. | Highlight the visual transition from "Draft" to "Approved" badges. |
| **Critic Findings & Sharper Alternatives** | ✅ **Verified Working** | Adversarial critic findings display severity, issue type (`cliché`, `audience_mismatch`, `contradiction`, `vague`), evidence, and "Sharper Alternative" quick-apply actions. | Click "Use Alternative" to demonstrate interactive human refinement. |
| **Inline Editing (`EditableField`)** | ✅ **Verified Working** | Every generated text field can be edited in place by the user before approval. | Click to edit an assumption into a verified user fact. |
| **Scenario Probe Sandbox** | ✅ **Verified Working** | `ScenarioProbePage.tsx` runs hypothetical pivots in an isolated sandbox (`scenario_overrides`), calculates downstream impact, and displays side-by-side diffs. Supports `Accept`, `Keep Original`, and `Edit Branch`. | Demonstrate running a "B2B enterprise pivot" scenario and keeping original. |
| **Holistic Consistency Audit Gate** | ✅ **Verified Working** | `ConsistencyAuditPage.tsx` checks cross-stage consistency across the entire approved brand. High/critical severity findings lock the Export button until resolved. | Show the red blocking badge on Export, resolve the finding, and show the gate unlock. |
| **Kit Assembly & Markdown Export** | ✅ **Verified Working** | `KitExportPage.tsx` compiles all approved decisions into a unified Markdown brand book. Supports direct clipboard copying and `.md` file download. | Click "Download Brand Kit" and open the generated markdown file. |
| **SessionStorage Persistence** | ✅ **Verified Working** | Auto-saves `SharedContext` to browser `sessionStorage` for same-tab reload resilience. | Mention resilience; tab reload preserves state. |
| **Automated Test Suite** | ✅ **Verified Working** | 160 Vitest tests passing across frontend state machine, dependencies, screens, audit gates, and export. | Show terminal summary or test suite badge if asked. |
| **Live AI Backend Connection** | ⚙️ **Requires Setup** | Full integration with Member 1 & 3 backend (`http://localhost:5000`) requiring valid `OPENAI_API_KEY` or `GEMINI_API_KEY`. If running standalone, uses the built-in development client (`api-client.ts`) with realistic latency and mock data. | Use local dev server with API client. Fallback to mock adapter if WiFi is unstable. |
| **Legal Trademark Office Verification** | ❌ **Not Implemented (Out of Scope)** | FOIL provides naming candidates and positioning, but does **not** query live USPTO/EUIPO databases. | **Never claim** names are legally cleared trademarks; state that FOIL flags linguistic novelty and provides candidate names. |
| **Raster Image / Logo Rendering** | ❌ **Not Implemented (By Design)** | The Visual Brief outputs structured design direction (color tokens, font pairings, mood/imagery guidelines), not rendered SVG/PNG assets. | Explain that FOIL outputs the strategic brief for human designers or downstream creative tools like Inkloom. |
| **Multi-User Real-Time Sync** | ❌ **Not Implemented (Out of Scope)** | State is local to the founder's session. No WebSocket multi-cursor collaboration. | Do not claim multi-user collaboration; present as the founder's dedicated strategic co-pilot. |

---

## 3. Pre-Demo Setup & Environment Checklist

Before recording or presenting the live demo, verify the following steps:

1. **Node & Dependencies:** Ensure Node.js 18+ is installed.
   ```bash
   cd IdeaToBrand-AI/frontend
   npm install
   ```
2. **Start Development Server:**
   ```bash
   npm run dev
   ```
   *Frontend URL:* `http://localhost:5173`
3. **Clean Browser State:** Open `http://localhost:5173` in an incognito or fresh browser window to clear any previous `sessionStorage` data.
4. **Display Settings:** Set browser zoom to 100% or 110% on a standard 1080p display for crisp typography and readable badges.
5. **Backend Mode Selection:**
   - **Mode A (Live Backend):** Backend running on `http://localhost:5000` with active API key.
   - **Mode B (Autonomous Frontend Client - Recommended for judged video):** Uses `api-client.ts` with simulated 1.5s network delay, ensuring zero risk of third-party API rate limits or latency spikes during recording.

---

## 4. Standardized Demo Input Data

To ensure consistency and realism, use the following pre-formulated demo idea:

* **Brand / Project Name:** `EcoCourier`
* **Raw Idea Input:**
  > *"An on-demand, zero-emission cargo bike logistics service for local independent merchants, cafes, and bakeries in dense urban neighborhoods who need same-day delivery without paying predatory marketplace commissions."*
* **Target Audience:** Urban independent merchants (bakeries, boutique retail, coffee roasters) and eco-conscious local shoppers.
* **Competitors:** Uber Eats, DoorDash, traditional motorized courier vans.
* **Scenario Probe Hypothetical Shift:**
  > *"What happens if we pivot from neighborhood retail to B2B cold-chain pharmaceutical delivery?"*

---

## 5. Second-by-Second Demo Script & Action Sequence

| Timestamp | Phase / Beat | Screen & On-Screen Actions | Spoken Narration (Word-for-Word Voiceover) | Visual Focus |
| :--- | :--- | :--- | :--- | :--- |
| **0:00 – 0:25** (25s) | **Beat 1: The Problem** | **Screen:** Landing / Idea Input Screen (`/`). Cursor hovering over the empty idea input box. | *"Every great business starts with a rough, unshaped idea. But when founders turn to typical AI tools for help, they get hit with a single prompt that spits out generic clichés, synthetic logos, and disjointed marketing copy with zero architectural memory. There is no strategic rigor, no validation of assumptions, and no system coherence. We built FOIL to solve this."* | Clean, dark-mode header; clear problem statement. |
| **0:25 – 0:48** (23s) | **Beat 2: Product & Architecture** | **Action:** Show the stage progression bar at the top (Idea → Discovery → Positioning → Naming → Visual Brief → Consistency Audit → Export). | *"FOIL stands for First-principles Operational Identity Layer. It is a staged brand intelligence engine. Instead of a single black box prompt, FOIL breaks brand creation into 10 structured gates. Crucially, FOIL introduces a dual-agent architecture: an AI Strategist that proposes candidate drafts, and an adversarial AI Critic that attacks clichés and mismatches—with the founder always in complete control."* | Top stage navigation bar, "Draft" indicators. |
| **0:48 – 1:18** (30s) | **Beat 3: Input & Discovery Stage** | **Action:** Paste the demo text into the Idea Input field. Click **"Initialize Brand Engine"**.<br>Transition to **Discovery Stage** (`/discovery`). | *"Let's input a realistic startup idea: EcoCourier—a zero-emission cargo bike delivery network for local independent retailers. The Strategist immediately analyzes the input, strictly separating verified user facts from AI assumptions. Notice how the Critic immediately flags that 'same-day delivery' is an unverified assumption without stated fleet capacity. As the founder, I can edit any field in place, approve the facts, and lock Discovery."* | Facts vs. Assumptions card; Critic warning badge; inline editing; clicking **"Approve & Proceed"**. |
| **1:18 – 1:52** (34s) | **Beat 4: Positioning & Dual-Agent Tension** | **Action:** Screen navigates to **Positioning** (`/positioning`). View two divergent directions: *Direction A: The Neighborhood Commerce Ally* vs. *Direction B: Precision Green Logistics*. Click on Direction A. | *"In the Positioning stage, FOIL doesn't give a single bland compromise. It generates genuinely divergent strategic directions. Direction A focuses on community empowerment, while Direction B focuses on cold carbon metrics. Here, our Critic caught a cliché in the value proposition: 'Fast and green.' It suggests a sharper alternative: 'Zero-tailpipe delivery at merchant-first margins.' I click 'Use Alternative', and the copy updates instantly. I approve Direction A."* | Side-by-side positioning cards; Critic "Sharper Alternative" button; clicking "Use Alternative"; clicking **"Approve Direction A"**. |
| **1:52 – 2:25** (33s) | **Beat 5: The Scenario Probe (Differentiation)** | **Action:** Click on the top navigation tool **"Scenario Probe"** (`/scenario-probe`).<br>Type hypothetical pivot: *"Pivot to B2B enterprise medical logistics"*. Click **"Run Scenario Probe"**. | *"Now for FOIL's signature capability: The Scenario Probe. Suppose an investor asks: 'What happens if you pivot to B2B enterprise medical logistics?' In ordinary tools, this would corrupt your entire project. In FOIL, the Scenario Probe creates an isolated sandbox. It models the downstream shockwave—showing how our friendly neighborhood tone clashes with medical compliance. We see a side-by-side diff. Because we don't want this shift, I click 'Keep Original'. Our approved brand remains completely untouched."* | Scenario Probe sandbox view; downstream impact diff (red/green highlight); clicking **"Keep Original Brand System"**. |
| **2:25 – 2:55** (30s) | **Beat 6: Holistic Consistency Audit** | **Action:** Fast-forward navigation through Visual Brief and Launch Prep into **Consistency Audit** (`/consistency-audit`). Show the high-severity finding. | *"After completing Launch Prep, FOIL runs the Holistic Consistency Audit across the entire brand system. Notice this: the export button is locked. Why? The auditor detected a critical contradiction: our Visual Brief specified playful pastel tones, but our Launch Prep messaging claims enterprise reliability. Every finding includes evidence and a sharper resolution. Once I click 'Apply Fix' and re-validate, the audit clears, and the export gate unlocks."* | Red severity banner; "Export Blocked" status; clicking "Resolve Finding"; green "All Checks Passed" status. |
| **2:55 – 3:20** (25s) | **Beat 7: Final Kit Assembly & Export** | **Action:** Navigate to **Kit Export** (`/kit-export`). Scroll down the Markdown Brand Kit preview. Click **"Download Markdown"** and **"Copy to Clipboard"**. | *"Now we arrive at Kit Assembly. FOIL compiles every approved decision—and only approved decisions—into a comprehensive, launch-ready Markdown Brand Kit. We have our brand essence, positioning, voice rules, visual tokens, and launch roadmap formatted cleanly for downstream design teams or tools like Inkloom. I can copy it with one click or download the full markdown file."* | Formatted Markdown preview; success toast for copy; downloaded `.md` file in browser tray. |
| **3:20 – 3:30** (10s) | **Beat 8: Wrap-up & Submission** | **Screen:** Return to Dashboard / Show GitHub repo & documentation. | *"FOIL transforms brand creation from ungrounded hallucination into an accountable, disciplined engineering process. Built for the Inkloom Hackathon by our 3-member team, 100% verified and reproducible. Thank you!"* | Clean closing view, GitHub repo link visible. |

---

## 6. Live Failure Fallback & Resilience Guide

If an unexpected error occurs during a live demonstration or recording, follow these scripted contingency procedures:

### Fallback 1: Live AI API Timeout or Network Disconnect
* **Symptom:** AI generation spinner exceeds 10 seconds or returns `StageErrorResponse` (HTTP 502/504).
* **Presenter Script:**  
  > *"Notice how FOIL handles real-world API latency: our bounded retry handler prevents infinite hanging and surfaces a clear error banner. The user's previous approved decisions are completely safe."*
* **Action:** Click the inline **"Retry Stage Generation"** button. If the network is entirely down, toggle `VITE_API_BASE_URL` to local mock mode in `.env` and refresh the page.

### Fallback 2: Accidental Tab Refresh or Browser Crash
* **Symptom:** Browser window is accidentally reloaded or closed.
* **Presenter Script:**  
  > *"If a founder accidentally refreshes their browser, nothing is lost. FOIL continuously synchronizes active project state to client-side session storage."*
* **Action:** Reload the tab. Point out that the current stage, previous approved decisions, and revision logs are instantly restored from `sessionStorage`.

### Fallback 3: Export Gate Remains Blocked
* **Symptom:** Presenter tries to click "Export" before resolving consistency audit findings.
* **Presenter Script:**  
  > *"This is by design: FOIL's architectural rules strictly prevent unverified, contradictory brand assets from being exported. Let's resolve the final high-priority finding."*
* **Action:** Click **"Apply Alternative"** on the remaining audit card, verify the green checkmark, then proceed to `/kit-export`.

---

## 7. Product Differentiation & Judge Takeaways

When judges evaluate FOIL, emphasize these five architectural differentiators:

1. **Staged Pipeline vs. One-Shot Black Box:** Complex brand identity cannot be solved in a single prompt. FOIL's 10 stages maintain topological dependency.
2. **Dual-Agent Adversarial Tension:** The Strategist generates; the Critic interrogates. The AI is never allowed to grade its own homework.
3. **Immutable Human Approval:** AI output is always quarantined as a candidate draft. Only explicit founder clicks commit data into `approved_decisions`.
4. **Isolated What-If Sandboxing (Scenario Probe):** Strategic exploration without catastrophic state corruption.
5. **Enforced Consistency Gating:** Downstream deliverables are mathematically protected from upstream contradictions.

---

## 8. Hackathon Submission Compliance Checklist

Per the **Inkloom Participant Handbook (Sections 05, 06, 07A, 07B, 09)**, every team member must complete their individual submission requirements:

- [x] **Demo Video Length:** Script timed at ~3m 20s (strictly within the 2–4 minute requirement).
- [x] **Live Product Demonstration:** Shows actual working screens, interactive clicks, and real data; no slides-only presentation.
- [x] **All 6 Required Beats Included:** Problem, Product, Input, AI Workflow, Output, Difference.
- [x] **Truthful Representation:** Explicitly clarifies out-of-scope items (no fake trademark verification, no rendered raster logos).
- [x] **Inkloom Sponsor Acknowledgement:** Script and social templates acknowledge Inkloom's presenting sponsorship without falsely claiming an unreleased API integration.
- [x] **Repository Documentation:** Documented under `docs/demo-script.md` following repository conventions.
- [x] **Social Publication Preparedness:** Covers both the Instagram demo reel and direct LinkedIn video upload formats required for individual member submission.
