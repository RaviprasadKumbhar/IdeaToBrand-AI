/**
 * AppShell — Professional studio brand strategy workspace layout for IdeaToBrand AI.
 * Desktop: Sticky Topbar with authenticated account menu + Categorized Sidebar with plain-language stage guides.
 * Mobile: Responsive Topbar + Collapsible Drawer with account actions.
 * Zero demo mock accounts, authentic Supabase user session display.
 */
import { type ReactNode, useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFOILStore } from '../store/foilStore';
import { useAuth } from '../context/AuthContext';
import type { StageName } from '../../../shared/types';

interface StageRouteItem {
  stage: StageName | 'idea-input';
  label: string;
  description: string;
  route: string;
  step: number;
}

interface NavSection {
  title: string;
  items: StageRouteItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Foundation',
    items: [
      {
        stage: 'idea-input',
        label: 'Idea Input',
        description: 'Define what you are building and attach reference notes.',
        route: '/workspace',
        step: 0,
      },
      {
        stage: 'discovery',
        label: 'Brand Discovery',
        description: 'Understand your business, customers, and market.',
        route: '/discovery',
        step: 1,
      },
    ],
  },
  {
    title: 'Strategy & Identity',
    items: [
      {
        stage: 'positioning',
        label: 'Positioning Matrix',
        description: 'Find what makes your brand different from competitors.',
        route: '/positioning',
        step: 2,
      },
      {
        stage: 'naming_personality',
        label: 'Naming + Personality',
        description: 'Explore brand names and define how your brand should feel.',
        route: '/naming-personality',
        step: 3,
      },
      {
        stage: 'tagline_pitch',
        label: 'Tagline + Pitch',
        description: 'Create a memorable slogan and a short explanation of your business.',
        route: '/tagline-pitch',
        step: 4,
      },
      {
        stage: 'visual_brief',
        label: 'Visual Brief',
        description: 'Choose the visual direction for your logo, colors, and overall style.',
        route: '/visual-brief',
        step: 5,
      },
      {
        stage: 'voice_messaging',
        label: 'Voice + Messaging',
        description: 'Decide how your brand speaks to customers.',
        route: '/voice-messaging',
        step: 6,
      },
    ],
  },
  {
    title: 'Launch & Delivery',
    items: [
      {
        stage: 'launch_prep',
        label: 'Launch Preparation',
        description: 'Prepare the materials and checklist for launching your brand.',
        route: '/launch-prep',
        step: 7,
      },
      {
        stage: 'consistency_audit',
        label: 'Consistency Audit',
        description: 'Check whether all parts of your brand work together.',
        route: '/consistency-audit',
        step: 8,
      },
      {
        stage: 'kit_export',
        label: 'Kit + Export',
        description: 'Review and download your finished brand materials.',
        route: '/export',
        step: 9,
      },
    ],
  },
];

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { ctx, uiStates, resetProject } = useFOILStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Close account menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      case 'approved':
        return { state: 'approved' };
      case 'needs_review':
        return { state: 'needs_review' };
      case 'failed':
        return { state: 'failed' };
      case 'rejected':
        return { state: 'rejected' };
      case 'critic_review':
      case 'needs_revision':
        return { state: 'in_progress' };
      case 'draft':
      default:
        return { state: 'draft' };
    }
  }

  const approvedCount = Object.values(ctx.approved_decisions).filter(Boolean).length;
  const totalStages = 9; // 9 strategic gates
  const isScenarioProbe = location.pathname === '/scenario-probe';

  // Real user display info
  const userEmail = user?.email || 'Authenticated User';
  const userName = user?.user_metadata?.full_name || userEmail.split('@')[0] || 'Brand Founder';
  const userInitial = (userName[0] || 'U').toUpperCase();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  function handleNewProject() {
    if (window.confirm('Start a new brand project? This will reset all current session data and return to Idea Input.')) {
      resetProject();
      navigate('/workspace');
      setMobileMenuOpen(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-paper-50 selection:bg-accent-100 selection:text-accent-700 font-sans">
      {/* ─── Top Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-border px-4 sm:px-6 h-14 flex items-center justify-between shadow-2xs">
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
            onClick={() => { navigate('/workspace'); setMobileMenuOpen(false); }}
            className="flex items-center gap-2.5 hover:opacity-95 transition-opacity focus-visible:ring-2 focus-visible:ring-accent-600 rounded-lg p-1 -ml-1 text-left"
            aria-label="IdeaToBrand AI — go to home"
          >
            <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm select-none">
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

          {/* Project Name / Session Status Indicator */}
          <div className="hidden sm:flex items-center gap-2 min-w-0">
            <span className="text-xs px-2.5 py-1 rounded-full bg-surface-100 border border-border text-ink-700 font-medium truncate max-w-[180px] lg:max-w-[240px]">
              {ctx.user_facts['business_description']
                ? String(ctx.user_facts['business_description']).slice(0, 28) + '…'
                : 'New Brand Project'}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-green-700 font-medium bg-green-50 px-2 py-0.5 rounded-full border border-green-200 flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" aria-hidden="true" />
              Active Project
            </span>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Progress Pill */}
          <div className="hidden md:flex items-center gap-2.5 px-3 py-1 bg-surface-100/90 border border-border rounded-full">
            <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
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

          {/* Compact New Project Action */}
          <button
            onClick={handleNewProject}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-md text-ink-700 hover:text-ink-950 hover:bg-surface-100 border border-border/80 transition-colors flex items-center gap-1"
            title="Start fresh project"
            aria-label="New Project"
          >
            <span>+</span>
            <span className="hidden sm:inline">New Project</span>
          </button>

          {/* Export Kit CTA */}
          <button
            onClick={() => { navigate('/export'); setMobileMenuOpen(false); }}
            className="btn-secondary text-xs px-3 py-1.5 h-8 font-semibold shadow-2xs flex items-center gap-1.5"
            aria-label="Export brand kit"
          >
            <svg className="w-3.5 h-3.5 text-ink-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden sm:inline">Export Kit</span>
          </button>

          {/* Authenticated User Account Menu Dropdown */}
          <div className="relative" ref={accountMenuRef}>
            <button
              onClick={() => setAccountMenuOpen(!accountMenuOpen)}
              className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-accent-600/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
              aria-label="User account menu"
              aria-expanded={accountMenuOpen}
            >
              <div className="w-7 h-7 rounded-full bg-accent-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {userInitial}
              </div>
            </button>

            {/* Dropdown Card */}
            {accountMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white border border-border shadow-lg py-2 z-50 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-3.5 py-2.5 border-b border-border">
                  <p className="font-bold text-ink-950 truncate">{userName}</p>
                  <p className="text-[11px] text-ink-500 truncate mt-0.5">{userEmail}</p>
                  <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200 font-medium">
                    Verified Supabase Account
                  </span>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setAccountMenuOpen(false);
                      navigate('/workspace');
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-surface-100 text-ink-700 flex items-center gap-2"
                  >
                    <span>✦</span> Brand Workspace
                  </button>
                  <button
                    onClick={() => {
                      setAccountMenuOpen(false);
                      navigate('/scenario-probe');
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-surface-100 text-ink-700 flex items-center gap-2"
                  >
                    <span>⚡</span> Scenario Probe
                  </button>
                </div>

                <div className="pt-1 border-t border-border">
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-3.5 py-2 hover:bg-red-50 text-red-600 font-semibold flex items-center gap-2 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ─── Body: Left Categorized Sidebar + Main Content ────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar — Desktop (280px) */}
        <aside
          className="hidden md:flex flex-col w-72 lg:w-80 flex-shrink-0 border-r border-border bg-white overflow-y-auto"
          aria-label="Stage navigation"
          role="navigation"
        >
          {/* Sidebar Top: Compact Project Header */}
          <div className="p-3.5 border-b border-border/80 bg-surface-100/40 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-ink-500 uppercase tracking-widest">Brand Strategy Pipeline</p>
              <p className="text-xs text-ink-600 mt-0.5">9 sequential milestones</p>
            </div>
            <button
              onClick={handleNewProject}
              className="text-[11px] font-semibold text-accent-700 hover:text-accent-800 bg-accent-100/80 hover:bg-accent-100 px-2 py-1 rounded border border-indigo-100 transition-colors flex items-center gap-1"
              title="Reset and start new project"
            >
              <span>+ New</span>
            </button>
          </div>

          {/* Categorized Stage Navigation */}
          <nav className="p-3 space-y-4 flex-1">
            {NAV_SECTIONS.map((section) => (
              <div key={section.title}>
                <p className="px-2.5 mb-1.5 text-[10px] font-extrabold text-ink-400 uppercase tracking-wider">
                  {section.title}
                </p>
                <div className="space-y-1">
                  {section.items.map(({ stage, label, description, route, step }) => {
                    const isActive = location.pathname === route || (stage === 'idea-input' && location.pathname === '/idea-input');
                    const { state } = getStageState(stage);

                    return (
                      <button
                        key={stage}
                        onClick={() => navigate(route)}
                        className={[
                          'w-full flex items-start gap-2.5 px-2.5 py-2 text-left rounded-lg group cursor-pointer transition-all duration-150',
                          isActive
                            ? 'bg-accent-100/80 text-accent-700 font-semibold shadow-2xs ring-1 ring-accent-600/20'
                            : 'text-ink-700 hover:bg-surface-100 hover:text-ink-950',
                        ].join(' ')}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {/* Step status indicator */}
                        <span
                          className={[
                            'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] border mt-0.5 transition-colors',
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
                            <svg className="w-3 h-3 text-green-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : state === 'needs_review' ? (
                            <span className="text-amber-600 font-bold">!</span>
                          ) : (
                            step
                          )}
                        </span>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold truncate">{label}</span>
                            {(state === 'approved' || state === 'complete') && (
                              <span className="text-[9px] text-green-700 font-bold uppercase tracking-wider bg-green-50 px-1 py-0.2 rounded border border-green-200">
                                Done
                              </span>
                            )}
                            {state === 'needs_review' && (
                              <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-amber-100 text-amber-800 animate-pulse">
                                Review
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-ink-500 leading-snug line-clamp-1 group-hover:text-ink-700 transition-colors">
                            {description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Scenario Probe Section */}
            <div className="pt-3 border-t border-border">
              <p className="px-2.5 mb-1.5 text-[10px] font-extrabold text-ink-400 uppercase tracking-wider">
                Strategic Sandbox
              </p>
              <button
                onClick={() => navigate('/scenario-probe')}
                className={[
                  'w-full flex items-start gap-2.5 px-2.5 py-2 text-left rounded-lg group cursor-pointer transition-all duration-150',
                  isScenarioProbe
                    ? 'bg-accent-100/80 text-accent-700 font-semibold shadow-2xs ring-1 ring-accent-600/20'
                    : 'text-ink-700 hover:bg-surface-100 hover:text-ink-950',
                ].join(' ')}
                aria-current={isScenarioProbe ? 'page' : undefined}
              >
                <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold mt-0.5">
                  ✦
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold block">Scenario Probe</span>
                  <p className="text-[11px] text-ink-500 leading-snug">
                    Explore how changing your audience, pricing, or brand direction could affect your strategy.
                  </p>
                </div>
              </button>
            </div>
          </nav>

          {/* Sidebar Footer: Actual Authenticated User Account */}
          <div className="p-3 border-t border-border bg-surface-100/30 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-accent-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                {userInitial}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink-950 truncate leading-tight">{userName}</p>
                <p className="text-[10px] text-ink-500 truncate leading-tight">{userEmail}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="text-xs text-ink-500 hover:text-red-600 p-1.5 rounded hover:bg-surface-100 transition-colors"
              title="Sign out of IdeaToBrand AI"
              aria-label="Sign out"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </aside>

        {/* Mobile Menu Backdrop & Drawer */}
        {mobileMenuOpen && (
          <div
            className="md:hidden fixed inset-0 z-40 bg-ink-950/40 backdrop-blur-xs flex"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className="w-72 max-w-[85vw] bg-white h-full shadow-xl flex flex-col p-4 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-accent-600 text-white flex items-center justify-center font-bold text-xs">
                    ✦
                  </span>
                  <span className="font-bold text-ink-950 text-sm">IdeaToBrand AI</span>
                </div>
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

              {/* Mobile Account Info */}
              <div className="py-3 border-b border-border flex items-center justify-between">
                <div className="truncate">
                  <p className="text-xs font-bold text-ink-950 truncate">{userName}</p>
                  <p className="text-[10px] text-ink-500 truncate">{userEmail}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-xs text-red-600 font-semibold px-2 py-1 rounded bg-red-50"
                >
                  Sign Out
                </button>
              </div>

              <nav className="mt-3 space-y-4 flex-1">
                {NAV_SECTIONS.map((section) => (
                  <div key={section.title}>
                    <p className="text-[10px] font-bold text-ink-400 uppercase tracking-wider mb-1">
                      {section.title}
                    </p>
                    <div className="space-y-1">
                      {section.items.map(({ stage, label, route, step }) => {
                        const isActive = location.pathname === route;
                        const { state } = getStageState(stage);
                        return (
                          <button
                            key={stage}
                            onClick={() => { navigate(route); setMobileMenuOpen(false); }}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg text-left transition-colors ${
                              isActive ? 'bg-accent-100 text-accent-700 font-semibold' : 'text-ink-700 hover:bg-surface-100'
                            }`}
                          >
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-surface-100 border text-ink-600 font-bold">
                              {state === 'approved' || state === 'complete' ? '✓' : step}
                            </span>
                            <span className="truncate">{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="pt-2 border-t border-border">
                  <button
                    onClick={() => { navigate('/scenario-probe'); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg text-left text-indigo-700 bg-indigo-50 font-medium"
                  >
                    <span>⚡</span> Scenario Probe
                  </button>
                </div>
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
          {NAV_SECTIONS.flatMap((s) => s.items).map(({ stage, label, route, step }) => {
            const isActive = location.pathname === route;
            const { state } = getStageState(stage);
            return (
              <button
                key={stage}
                onClick={() => navigate(route)}
                className={[
                  'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs whitespace-nowrap border-b-2 transition-colors',
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
