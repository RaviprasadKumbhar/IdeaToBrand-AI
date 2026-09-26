# FOIL — The Brand Engine That Argues Back

FOIL is a staged AI brand engine built for the Inkloom Hackathon. It pairs every generative stage with an adversarial Critic, enforces explicit founder approval at every gate, supports branch comparisons via Scenario Probe, and runs a Holistic Consistency Audit before final export.

---

## 1. Team Ownership & Responsibilities

| Role | Member | Responsibilities | Feature Branch |
|---|---|---|---|
| **Member 1** | AI / Backend Lead | AI provider abstraction, Strategist prompts, Critic engine, stage schemas, dependency engine, Consistency Audit | `feature/member-1-ai-backend` |
| **Member 2** | Frontend / UX Lead | Application shell, stage UI screens, approval UX, Critic card UI, Scenario Probe diff view, consistency audit UI | `feature/member-2-frontend-ux` |
| **Member 3** | Data / Integration / QA Lead | Project persistence (sessionStorage recovery), approval state machine, revision history, API integration, testing, build/QA | `feature/member-3-integration-qa` |

---

## 2. Architecture & Storage Model

As documented in `docs/architecture.md`:
- **Server database / durable persistence**: **None in MVP**. The backend is completely stateless.
- **Runtime State**: The frontend owns the authoritative `SharedContext` in memory during an active session.
- **Session Survivability**: Client-side `sessionStorage` mirrors `SharedContext` solely for same-tab refresh recovery. Closing the tab ends the session. No user authentication or multi-tenant database is in MVP scope.

---

## 3. Local Development Setup

### Prerequisites
- **Node.js**: `>= 20.0.0`
- **npm**: `>= 10.0.0`

### Step 1: Clone the repository
```bash
git clone https://github.com/RaviprasadKumbhar/IdeaToBrand-AI.git
cd IdeaToBrand-AI
```

### Step 2: Configure Environment Variables
Copy the sanitized environment template to `.env`:
```bash
# On Linux/macOS
cp .env.example .env

# On Windows PowerShell
copy .env.example .env
```

Open `.env` and fill in your private API keys:
```env
# Application
NODE_ENV=development
PORT=5000

# AI Provider Credentials
OPENAI_API_KEY=your_openai_api_key_here
GEMINI_API_KEY=

# Verified Project Endpoints
SUPABASE_URL=https://zksrwnojdjfddhmvhpxm.supabase.co
VITE_SUPABASE_URL=https://zksrwnojdjfddhmvhpxm.supabase.co
VITE_API_BASE_URL=http://localhost:5000
```
> **Security Notice**: Never commit `.env` to Git. `.gitignore` is configured to prevent `.env` from being tracked.

### Step 3: Install Dependencies
```bash
npm install
```

### Step 4: Run Tests
```bash
npm test
```

---

## 4. Git Workflow Guidelines

1. **Never commit directly to `main`**: Always work on your assigned feature branch:
   - Member 1: `feature/member-1-ai-backend`
   - Member 2: `feature/member-2-frontend-ux`
   - Member 3: `feature/member-3-integration-qa`
2. **Never overwrite another member's uncommitted work**: Pull latest changes before branching or merging.
3. **Never commit secrets**: Keep all real keys in `.env` only; `.env.example` must contain placeholders only.
4. **Shared contracts are authoritative**: Do not unilaterally alter contracts in `shared/` without consulting team leads.
