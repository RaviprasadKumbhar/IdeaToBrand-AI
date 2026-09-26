# FOIL — Demo Backup & Recovery Guide (Task T-048)

This document establishes the operational backup plan, known-good verification checklist, offline/live runtime instructions, and recovery procedures for demonstrating **FOIL (The Brand Engine That Argues Back)** during judging and live presentations.

---

## 1. Ethical & Technical Invariant Disclaimers

1. **Zero Secret Policy**: This backup document and repository contain **zero API credentials or secrets**. All API keys must be loaded exclusively through local `.env` files.
2. **Honesty in Presentation**: 
   - **Never claim a prerecorded or mock response is live generation.**
   - If running with `MockAIProvider` (offline demo mode), explicitly disclose: *"We are running with our deterministic local mock provider for latency-independent demonstration."*
   - If running with live LLM providers (`OpenAIProvider` or `GeminiProvider`), ensure valid API quotas and network connectivity before starting.

---

## 2. Known-Good Build Verification

Prior to any demo recording or live judging session, verify the known-good build state:

### Step 1: Run Full Workspace Build
```bash
npm run build
```
**Expected Output**:
- `@foil/shared`: `tsc -b` completes with code 0.
- `@foil/backend`: `tsc -b` completes with code 0, emitting `backend/dist/server.js`.
- `frontend`: `tsc -b && vite build` completes with code 0, emitting production bundle to `frontend/dist/`.

### Step 2: Run Full Regression Test Suite
```bash
# Backend and root integration/unit/security tests (204 tests)
npm test

# Frontend component and stage tests (160 tests)
npm --prefix frontend test
```
**Expected Outcome**: Total **364 / 364 tests passing (100% green)**.

---

## 3. Demo Scenario: "CapstoneSync"

The standardized demo scenario showcases a realistic, high-stakes brand problem that highlights FOIL's stage-by-stage reasoning and adversarial critique.

### Seed Idea Input
- **Business Description**:
  > *"A collaborative peer-matching platform for university engineering seniors to form capstone project teams based on verified technical skill profiles, schedule compatibility, and mutual work ethic rather than random class assignments or chaotic group chats."*
- **Target Audience**: `Senior undergraduate engineering and computer science students facing mandatory year-long capstone projects.`
- **Category**: `Higher Education / Collaborative Team Formation`
- **Known Facts**: `Semester capstone registration closes in 2 weeks; group formation is mandatory; unvetted rosters historically experience a 35% dropout/failure rate.`
- **Constraints**: `Must integrate with academic calendars; must not violate student privacy or honor codes.`

---

## 4. The 6 Demo Beats (2–4 Minutes Presentation Flow)

| Beat | Stage / Screen | Key Talking Points & Actions | Visible System Behavior |
|---|---|---|---|
| **1. Problem** | Problem Framing | Founders start with a rough sentence, but turning it into a brand requires real decisions, not generic text dumps. | Explain why single-prompt LLM wrappers fail founders by producing hollow clichés. |
| **2. Product** | FOIL App Shell | Introduce FOIL: A staged brand engine with dual-agent reasoning (Strategist + Critic) and founder approval gates. | Show navigation bar with stages: Discovery → Positioning → Naming → Tagline → Visual → Voice → Launch → Audit → Export. |
| **3. Input** | Idea Input Screen | Paste the CapstoneSync idea. Show word count validator and structured fact extraction. | Click **"Start Discovery"**; facts are isolated from assumptions. |
| **4. AI Workflow** | Staged Progression | Walk through Discovery and Positioning. Point out Critic findings. | Show **Divergent Positioning Directions** (Direction A: *The Academic Matchmaker* vs Direction B: *The Project Compass*). Approve Direction A. |
| **5. Difference (Scenario Probe)** | Scenario Probe Screen | Run a "What-If" branch: *"What if we pivoted from students to university enterprise capstone administrators?"* | Show side-by-side branch comparison. Original approved state is **not overwritten**. Demonstrate **"Keep Original"** or **"Accept Branch"** with logged revision. |
| **6. Output & Audit** | Audit & Markdown Export | Run Holistic Consistency Audit across all 7 stages. Address any cross-stage finding. | Click **"Export Brand Kit"**. Export gating validates all stages and findings, then renders the full 10-section Markdown kit. |

---

## 5. Environment & Runtime Modes

### Mode A: Live AI Generation Mode (Requires Active API Key)
Ensure `.env` in the repository root contains valid credentials:
```env
NODE_ENV=development
PORT=5000
AI_PROVIDER=OPENAI
OPENAI_API_KEY=sk-proj-YOUR_ACTUAL_KEY
AI_REQUEST_TIMEOUT_MS=30000
VITE_API_BASE_URL=http://localhost:5000
```
Start both services in separate terminals:
```bash
# Terminal 1: Backend
npm --prefix backend run dev

# Terminal 2: Frontend
npm --prefix frontend run dev
```
Open browser to `http://localhost:5173`.

### Mode B: Offline / Deterministic Demo Mode (No API Keys Needed)
If Wi-Fi drops or API rate-limits occur during the presentation:
1. FOIL includes a deterministic `MockAIProvider` in `backend/src/ai/providers/mock.ts`.
2. Configure `.env` with:
   ```env
   NODE_ENV=test
   PORT=5000
   AI_PROVIDER=OPENAI
   OPENAI_API_KEY=mock-demo-key
   VITE_API_BASE_URL=http://localhost:5000
   ```
3. In this mode, mock responses for all 7 stages, Critic findings, Scenario Probe, and Consistency Audit return instantly with schema-valid CapstoneSync fixtures.

---

## 6. Emergency Recovery & Troubleshooting

### Scenario 1: Port Collision (`PORT 5000 in use`)
```powershell
# Windows PowerShell: Find and terminate process on port 5000
Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```
Or override the port in `.env`:
```env
PORT=5001
VITE_API_BASE_URL=http://localhost:5001
```

### Scenario 2: Frontend Page Refresh During Demo
- **Recovery**: FOIL utilizes `sessionStorage` refresh-recovery (`shared/src/store/sessionStorage.ts`). Simply reload the browser tab (`F5`). All approved decisions, stage drafts, and revision logs are restored from the active session.
- **Full Reset**: To restart from a blank slate, click **"New Project"** in the top navigation or run in browser devtools:
  ```javascript
  sessionStorage.clear();
  window.location.reload();
  ```

### Scenario 3: AI Request Timeout or Network Blip
- If a live request times out, FOIL catches the error cleanly and presents a structured error card with a **"Try Again"** button. Existing approved decisions remain non-destructively preserved.
