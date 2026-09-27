/**
 * AppShell — Main modern SaaS workspace layout for IdeaToBrand AI.
 * Desktop: Sticky Topbar + Left Workflow Sidebar + Main Stage Workspace.
 * Mobile: Responsive Topbar + Drawer + Horizontal Stage Selector.
 * Professional SVG icons, high visual polish, zero raw emojis.
 */
import { type ReactNode, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFOILStore } from '../store/foilStore';
import type { StageName } from '../../../shared/types';

interface StageRouteItem {
  stage: StageName | 'idea-input';
  label: string;
  route: string;
  step: number;
  category: 'START' | 'STRATEGY' | 'IDENTITY' | 'LAUNCH';
}

const STAGE_ROUTES: StageRouteItem[] = [
  { stage: 'idea-input',          label: 'Idea Input',           route: '/idea-input',          step: 0, category: 'START' },
  { stage: 'discovery',           label: 'Discovery',            route: '/discovery',           step: 1, category: 'STRATEGY' },
  { stage: 'positioning',         label: 'Positioning',          route: '/positioning',         step: 2, category: 'STRATEGY' },
  { stage: 'naming_personality',  label: 'Naming + Personality', route: '/naming-personality',  step: 3, category: 'IDENTITY' },
  { stage: 'tagline_pitch',       label: 'Tagline + Pitch',      route: '/tagline-pitch',       step: 4, category: 'IDENTITY' },
  { stage: 'visual_brief',        label: 'Visual Brief',         route: '/visual-brief',        step: 5, category: 'IDENTITY' },
  { stage: 'voice_messaging',     label: 'Voice + Messaging',    route: '/voice-messaging',     step: 6, category: 'IDENTITY' },
  { stage: 'launch_prep',         label: 'Launch Prep',          route: '/launch-prep',         step: 7, category: 'LAUNCH' },
  { stage: 'consistency_audit',   label: 'Consistency Audit',    route: '/consistency-audit',   step: 8, category: 'LAUNCH' },
  { stage: 'kit_export',          label: 'Kit & Export',         route: '/export',              step: 9, category: 'LAUNCH' },
];

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const {
    ctx,
    uiStates,
    resetProject,
    cloudSaveStatus,
    retrySave,
    setActiveUser,
  } = useFOILStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      setActiveUser(user.id);
    }
  }, [user?.id, setActiveUser]);

  const userDisplayName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Founder';
  const userInitials = userDisplayName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'FO';

  function getStageState(stage: StageName | 'idea-input'): {
    state: 'approved' | 'needs_review' | 'failed' | 'rejected' | 'in_progress' | 'draft' | 'complete';
  } {
    if (stage === 'idea-input') {
      const isComplete = !!Object.keys(ctx.user_facts).length;
      return { state: isComplete ? 'complete' : 'draft' };
    }
    const ui = uiStates[stage as StageName];
    if (!ui) return { state: 'draft' };
    switch (ui.approval_state) {
      case 'approved':       return { state: 'approved' };
      case 'needs_review':   return { state: 'needs_review' };
      case 'failed':         return { state: 'failed' };
      case 'rejected':       return { state: 'rejected' };
      case 'critic_review':
      case 'needs_revision': return { state: 'in_progress' };
      case 'draft':
      default:               return { state: 'draft' };
    }
  }

  const approvedCount = Object.values(ctx.approved_decisions).filter(Boolean).length;
  const totalStages = STAGE_ROUTES.length - 1; // 9 approval stages
  const isScenarioProbe = location.pathname === '/scenario-probe';

  return (
    <div className="min-h-screen flex flex-col bg-paper-50 selection:bg-accent-100 selection:text-accent-700">
      {/* ─── Top Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-border px-4 sm:px-6 h-14 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 -ml-1 text-ink-700 hover:text-ink-950 hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-accent-600 rounded-md transition-colors"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Logo & Brand Wordmark */}
          <button
            onClick={() => { navigate('/'); setMobileMenuOpen(false); }}
            className="flex items-center gap-2.5 hover:opacity-95 transition-opacity focus-visible:ring-2 focus-visible:ring-accent-600 rounded-lg p-1 -ml-1 text-left"
            aria-label="IdeaToBrand AI — go to home"
          >
            <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-sm select-none">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
            </span>
            <div className="flex flex-col">
              <span className="font-bold text-ink-950 tracking-tight text-base leading-none flex items-center gap-1">
                IdeaToBrand <span className="text-accent-600 font-extrabold">AI</span>
              </span>
              <span className="text-[10px] text-ink-500 font-medium tracking-wide">Brand Strategy Engine</span>
            </div>
          </button>

          <span className="hidden sm:block text-border" aria-hidden="true">|</span>

          {/* Current Idea / Session Status Indicator */}
          <div className="hidden sm:flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-medium text-ink-400 flex-shrink-0">Current idea:</span>
            <button
              type="button"
              onClick={() => navigate('/workspace')}
              className="text-xs px-2.5 py-1 rounded-full bg-surface-100 hover:bg-surface-200 border border-border hover:border-accent-400 text-ink-800 font-semibold truncate max-w-[200px] lg:max-w-[280px] cursor-pointer transition-colors text-left flex items-center gap-1.5 group"
              title="Click to view and edit current idea in workspace"
            >
              <span className="truncate">
                {ctx.user_facts['business_description']
                  ? String(ctx.user_facts['business_description'])
                  : 'New Brand Project'}
              </span>
              <span className="text-[10px] text-ink-400 group-hover:text-accent-600 font-normal">✎</span>
            </button>
            {cloudSaveStatus === 'saving' && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-700 font-medium bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" aria-hidden="true" />
                Saving to Supabase...
              </span>
            )}
            {cloudSaveStatus === 'saved' && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-green-700 font-medium bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200 flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" aria-hidden="true" />
                Saved to Supabase
              </span>
            )}
            {cloudSaveStatus === 'error' && (
              <button
                type="button"
                onClick={() => retrySave()}
                className="inline-flex items-center gap-1.5 text-[11px] text-red-700 font-medium bg-red-50 hover:bg-red-100 px-2.5 py-0.5 rounded-full border border-red-200 flex-shrink-0 cursor-pointer transition-colors"
                title="Click to retry saving to Supabase"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" aria-hidden="true" />
                Save failed — Retry
              </button>
            )}
            {cloudSaveStatus === 'idle' && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-600 font-medium bg-surface-100 px-2.5 py-0.5 rounded-full border border-border flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" aria-hidden="true" />
                Supabase Synced
              </span>
            )}
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Progress Bar & Pill */}
          <div className="hidden md:flex items-center gap-2.5 px-3 py-1 bg-surface-100/90 border border-border rounded-full">
            <div className="w-20 h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(approvedCount / totalStages) * 100}%` }}
                aria-hidden="true"
              />
            </div>
            <span className="text-xs font-semibold text-ink-700 tabular-nums">
              {approvedCount}/{totalStages} approved
            </span>
          </div>

          {/* What-If Sandbox Shortcut */}
          <button
            onClick={() => { navigate('/scenario-probe'); setMobileMenuOpen(false); }}
            className={`hidden lg:inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-all ${
              isScenarioProbe
                ? 'bg-accent-100 text-accent-700 font-semibold ring-1 ring-accent-600/20'
                : 'text-ink-600 hover:text-ink-950 hover:bg-surface-100'
            }`}
            aria-label="Open Scenario Probe sandbox"
          >
            <svg className="w-3.5 h-3.5 text-accent-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>What-If Sandbox</span>
          </button>

          {/* Export Kit CTA */}
          <button
            onClick={() => { navigate('/export'); setMobileMenuOpen(false); }}
            className="btn-secondary text-xs px-3 py-1.5 h-8 font-semibold shadow-xs flex items-center gap-1.5"
            aria-label="Export brand kit"
          >
            <svg className="w-3.5 h-3.5 text-ink-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export Kit</span>
          </button>

          {/* Reset Action */}
          <button
            onClick={() => {
              if (window.confirm('Start a new project? This will reset all current session data and return to Idea Input.')) {
                resetProject();
                navigate('/idea-input');
                setMobileMenuOpen(false);
              }
            }}
            className="text-xs text-ink-500 hover:text-red-600 transition-colors px-2 py-1.5 rounded hover:bg-red-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
            aria-label="New project"
          >
            Reset
          </button>

          {/* Auth Identity / Sign Out */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <span
                className="w-7 h-7 rounded-full bg-accent-600 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 shadow-2xs"
                title={user.email || userDisplayName}
                aria-label={`User: ${userDisplayName}`}
              >
                {userInitials}
              </span>
              <span className="text-xs font-medium text-ink-700 hidden xl:inline max-w-[100px] truncate">
                {userDisplayName}
              </span>
              <button
                onClick={async () => {
                  await signOut();
                  navigate('/');
                }}
                className="text-xs text-ink-500 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
                aria-label="Sign out"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 pl-2 border-l border-border">
              <button
                onClick={() => navigate('/login')}
                className="text-xs font-medium text-ink-700 hover:text-ink-950 px-2 py-1 rounded hover:bg-surface-100 transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="btn-primary text-xs px-2.5 py-1"
              >
                Create account
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ─── Body: Left Sidebar + Main Content ────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar — Desktop (260px) */}
        <aside
          className="hidden md:flex flex-col w-64 lg:w-72 flex-shrink-0 border-r border-border bg-white overflow-y-auto"
          aria-label="Stage navigation"
          role="navigation"
        >
          <div className="p-4 border-b border-border/70 bg-surface-100/40 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-ink-500 uppercase tracking-widest">Brand Pipeline</p>
              <p className="text-xs text-ink-500 mt-0.5">10 staged strategic gates</p>
            </div>
            <span className="text-[10px] font-bold text-accent-600 bg-accent-100 px-2 py-0.5 rounded-full border border-indigo-100">
              v1.0
            </span>
          </div>

          <nav className="p-3 space-y-1">
            {STAGE_ROUTES.map(({ stage, label, route, step }) => {
              const isActive = location.pathname === route;
              const { state } = getStageState(stage);

              return (
                <button
                  key={stage}
                  onClick={() => navigate(route)}
                  className={[
                    'w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-150 text-left rounded-lg group cursor-pointer',
                    isActive
                      ? 'bg-accent-100/80 text-accent-700 font-semibold shadow-xs ring-1 ring-accent-600/20'
                      : 'text-ink-700 hover:bg-surface-100 hover:text-ink-950 font-normal',
                  ].join(' ')}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {/* Step status indicator */}
                  <span
                    className={[
                      'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs border transition-colors',
                      state === 'approved' || state === 'complete'
                        ? 'bg-green-50 text-green-700 border-green-200 font-bold'
                        : state === 'needs_review'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 font-bold'
                        : state === 'failed' || state === 'rejected'
                        ? 'bg-red-50 text-red-700 border-red-200 font-bold'
                        : isActive
                        ? 'bg-accent-600 text-white border-accent-600 font-bold shadow-xs'
                        : 'bg-surface-100 text-ink-500 border-border group-hover:border-ink-300',
                    ].join(' ')}
                    aria-hidden="true"
                  >
                    {state === 'approved' || state === 'complete' ? (
                      <svg className="w-3.5 h-3.5 text-green-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : state === 'needs_review' ? (
                      <svg className="w-3.5 h-3.5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    ) : (
                      step
                    )}
                  </span>

                  <span className="truncate flex-1 text-xs sm:text-sm">{label}</span>

                  {(state === 'approved' || state === 'complete') && (
                    <span className="text-[10px] text-green-700 font-bold uppercase tracking-wider bg-green-50 px-1.5 py-0.5 rounded border border-green-200/60">
                      Done
                    </span>
                  )}
                  {state === 'needs_review' && (
                    <span
                      className="ml-auto flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 animate-pulse"
                      aria-label="Needs review"
                    >
                      Review
                    </span>
                  )}
                </button>
              );
            })}

            {/* Scenario Probe Section */}
            <div className="pt-4 mt-3 border-t border-border">
              <p className="px-3 mb-1 text-[11px] font-bold text-ink-400 uppercase tracking-widest">Exploration</p>
              <button
                onClick={() => navigate('/scenario-probe')}
                className={[
                  'w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-150 text-left rounded-lg group cursor-pointer',
                  isScenarioProbe
                    ? 'bg-accent-100/80 text-accent-700 font-semibold shadow-xs ring-1 ring-accent-600/20'
                    : 'text-ink-700 hover:bg-surface-100 hover:text-ink-950',
                ].join(' ')}
                aria-current={isScenarioProbe ? 'page' : undefined}
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs bg-accent-100 text-accent-600 border border-indigo-200 font-bold" aria-hidden="true">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </span>
                <div className="flex flex-col flex-1 truncate">
                  <span className="text-xs sm:text-sm font-medium">Scenario Probe</span>
                  <span className="text-[10px] text-ink-500">Isolated What-If sandbox</span>
                </div>
              </button>
            </div>
          </nav>
        </aside>

        {/* Mobile Menu Backdrop & Drawer */}
        {mobileMenuOpen && (
          <div
            className="md:hidden fixed inset-0 z-40 bg-ink-950/40 backdrop-blur-xs flex"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className="w-72 max-w-[80vw] bg-white h-full shadow-xl flex flex-col p-4 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <span className="font-bold text-ink-950 text-sm">Workflow Navigation</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-ink-500 hover:text-ink-950 rounded hover:bg-surface-100"
                  aria-label="Close navigation drawer"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav className="mt-3 space-y-1">
                {STAGE_ROUTES.map(({ stage, label, route, step }) => {
                  const isActive = location.pathname === route;
                  const { state } = getStageState(stage);
                  return (
                    <button
                      key={stage}
                      onClick={() => { navigate(route); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg text-left transition-colors ${
                        isActive ? 'bg-accent-100 text-accent-700 font-semibold' : 'text-ink-700 hover:bg-surface-100'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs bg-surface-100 border text-ink-600 font-bold">
                        {state === 'approved' || state === 'complete' ? '✓' : step}
                      </span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Mobile: Horizontal Stage Selector Strip */}
        <div
          className="md:hidden w-full overflow-x-auto border-b border-border bg-white flex scrollbar-none sticky top-14 z-20"
          role="navigation"
          aria-label="Mobile stage navigation"
        >
          {STAGE_ROUTES.map(({ stage, label, route, step }) => {
            const isActive = location.pathname === route;
            const { state } = getStageState(stage);
            return (
              <button
                key={stage}
                onClick={() => navigate(route)}
                className={[
                  'flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-xs whitespace-nowrap border-b-2 transition-colors',
                  isActive
                    ? 'border-accent-600 text-accent-700 font-semibold bg-accent-100/30'
                    : 'border-transparent text-ink-600 hover:text-ink-950',
                ].join(' ')}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="text-[10px] font-bold" aria-hidden="true">
                  {state === 'approved' || state === 'complete' ? '✓' : step}
                </span>
                {label}
              </button>
            );
          })}
        </div>

        {/* Main Stage Workspace */}
        <main
          className="flex-1 overflow-y-auto"
          id="main-content"
          aria-label="Stage workspace"
        >
          <div className="max-w-4xl mx-auto px-4 py-8 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
