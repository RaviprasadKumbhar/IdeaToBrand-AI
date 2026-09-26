/**
 * AppShell — main modern SaaS workspace layout.
 * Desktop: sidebar + main. Mobile: top nav + responsive drawer/tabs.
 * Updated with IdeaToBrand AI branding and polished visual hierarchy.
 */
import { type ReactNode, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  { stage: 'idea-input',          label: 'Idea Input',           route: '/',                   step: 0, category: 'START' },
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
  const { ctx, uiStates, resetProject } = useFOILStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function getStatusIcon(stage: StageName | 'idea-input'): { icon: string; className: string } {
    if (stage === 'idea-input') {
      const isComplete = !!Object.keys(ctx.user_facts).length;
      return isComplete
        ? { icon: '✓', className: 'text-green-600 bg-green-50 border-green-200' }
        : { icon: '0', className: 'text-ink-500 bg-surface-100 border-border' };
    }
    const ui = uiStates[stage as StageName];
    if (!ui) return { icon: '○', className: 'text-ink-500 bg-surface-100 border-border' };
    switch (ui.approval_state) {
      case 'approved':      return { icon: '✓', className: 'text-green-600 bg-green-50 border-green-200 font-bold' };
      case 'needs_review':  return { icon: '⚠', className: 'text-amber-600 bg-amber-50 border-amber-200 font-bold' };
      case 'failed':        return { icon: '✕', className: 'text-red-600 bg-red-50 border-red-200 font-bold' };
      case 'rejected':      return { icon: '✕', className: 'text-red-500 bg-red-50 border-red-200 font-bold' };
      case 'critic_review':
      case 'needs_revision':return { icon: '⟳', className: 'text-accent-600 bg-accent-100 border-accent-600/30 font-bold' };
      case 'draft':
      default:              return { icon: '○', className: 'text-ink-400 bg-surface-100 border-border' };
    }
  }

  const approvedCount = Object.values(ctx.approved_decisions).filter(Boolean).length;
  const totalStages = STAGE_ROUTES.length - 1; // exclude idea-input (0-9 stages = 9 approval stages)
  const isScenarioProbe = location.pathname === '/scenario-probe';

  return (
    <div className="min-h-screen flex flex-col bg-paper-50 selection:bg-accent-100 selection:text-accent-700">
      {/* ─── Project Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-border/80 px-4 sm:px-6 h-14 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-3.5">
          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 -ml-1 text-ink-700 hover:text-ink-950 focus-visible:ring-2 focus-visible:ring-accent-600 rounded-md"
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
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-accent-600 rounded-lg p-1 -ml-1"
            aria-label="IdeaToBrand AI — go to home"
          >
            <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-sm select-none">
              ✦
            </span>
            <div className="flex flex-col text-left">
              <span className="font-bold text-ink-950 tracking-tight text-base leading-none">
                IdeaToBrand <span className="text-accent-600 font-extrabold">AI</span>
              </span>
              <span className="text-[10px] text-ink-500 font-medium tracking-wide">Brand Intelligence</span>
            </div>
          </button>

          <span className="hidden sm:block text-border" aria-hidden="true">|</span>

          {/* Project Name / Pill */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-surface-100 border border-border text-ink-700 font-medium truncate max-w-[220px]">
              {ctx.user_facts['business_description']
                ? String(ctx.user_facts['business_description']).slice(0, 32) + '…'
                : 'New Brand Project'}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-green-700 font-medium bg-green-50/80 px-2 py-0.5 rounded-full border border-green-200">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" aria-hidden="true" />
              Session Active
            </span>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          {/* Progress Pill */}
          <div className="hidden md:flex items-center gap-2.5 px-3 py-1 bg-surface-100/80 border border-border rounded-full">
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

          {/* Scenario Probe shortcut */}
          <button
            onClick={() => { navigate('/scenario-probe'); setMobileMenuOpen(false); }}
            className={`hidden lg:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md transition-all ${
              isScenarioProbe
                ? 'bg-accent-100 text-accent-700 font-semibold'
                : 'text-ink-600 hover:text-ink-950 hover:bg-surface-100'
            }`}
            aria-label="Open Scenario Probe sandbox"
          >
            <span>⚡ What-If Sandbox</span>
          </button>

          {/* Export Kit CTA */}
          <button
            onClick={() => { navigate('/export'); setMobileMenuOpen(false); }}
            className="btn-secondary text-xs px-3 py-1.5 h-8 font-semibold shadow-xs"
            aria-label="Export brand kit"
          >
            Export Kit
          </button>

          {/* New Project Action */}
          <button
            onClick={() => {
              if (window.confirm('Start a new project? This will reset all current session data.')) {
                resetProject();
                navigate('/');
                setMobileMenuOpen(false);
              }
            }}
            className="text-xs text-ink-500 hover:text-red-600 transition-colors px-2 py-1.5 rounded"
            aria-label="New project"
          >
            Reset
          </button>
        </div>
      </header>

      {/* ─── Body: Sidebar + Main ─────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar — Desktop (260px) */}
        <aside
          className="hidden md:flex flex-col w-64 lg:w-72 flex-shrink-0 border-r border-border/80 bg-white overflow-y-auto"
          aria-label="Stage navigation"
          role="navigation"
        >
          <div className="p-4 border-b border-border/60 bg-surface-100/40">
            <p className="text-[11px] font-bold text-ink-500 uppercase tracking-widest">Brand Pipeline</p>
            <p className="text-xs text-ink-500 mt-0.5">10 staged strategic gates</p>
          </div>

          <nav className="p-3 space-y-1">
            {STAGE_ROUTES.map(({ stage, label, route, step }) => {
              const isActive = location.pathname === route;
              const { icon } = getStatusIcon(stage);
              const needsReview = uiStates[stage as StageName]?.approval_state === 'needs_review';
              const isApproved = uiStates[stage as StageName]?.approval_state === 'approved';

              return (
                <button
                  key={stage}
                  onClick={() => navigate(route)}
                  className={[
                    'w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-150 text-left rounded-lg group',
                    isActive
                      ? 'bg-accent-100/80 text-accent-700 font-semibold shadow-xs'
                      : 'text-ink-700 hover:bg-surface-100 hover:text-ink-950 font-normal',
                  ].join(' ')}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {/* Step status badge */}
                  <span
                    className={[
                      'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs border transition-colors',
                      icon === '✓'
                        ? 'bg-green-50 text-green-700 border-green-200 font-bold'
                        : icon === '⚠'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 font-bold'
                        : icon === '✕'
                        ? 'bg-red-50 text-red-700 border-red-200 font-bold'
                        : isActive
                        ? 'bg-accent-600 text-white border-accent-600 font-bold'
                        : 'bg-surface-100 text-ink-500 border-border group-hover:border-ink-400',
                    ].join(' ')}
                    aria-hidden="true"
                  >
                    {icon === '✓' || icon === '✕' || icon === '⚠' ? icon : step}
                  </span>

                  <span className="truncate flex-1 text-xs sm:text-sm">{label}</span>

                  {isApproved && (
                    <span className="text-[10px] text-green-700 font-bold uppercase tracking-wider bg-green-50 px-1.5 py-0.5 rounded border border-green-200/60">
                      Done
                    </span>
                  )}
                  {needsReview && (
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

            {/* What-If Sandbox section */}
            <div className="pt-4 mt-3 border-t border-border/80">
              <p className="px-3 mb-1 text-[11px] font-bold text-ink-400 uppercase tracking-widest">Exploration</p>
              <button
                onClick={() => navigate('/scenario-probe')}
                className={[
                  'w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-150 text-left rounded-lg group',
                  isScenarioProbe
                    ? 'bg-accent-100/80 text-accent-700 font-semibold shadow-xs'
                    : 'text-ink-700 hover:bg-surface-100 hover:text-ink-950',
                ].join(' ')}
                aria-current={isScenarioProbe ? 'page' : undefined}
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs bg-accent-100 text-accent-600 border border-accent-600/30 font-bold" aria-hidden="true">
                  ⚡
                </span>
                <div className="flex flex-col flex-1 truncate">
                  <span className="text-xs sm:text-sm font-medium">Scenario Probe</span>
                  <span className="text-[10px] text-ink-500">Isolated What-If sandbox</span>
                </div>
              </button>
            </div>
          </nav>
        </aside>

        {/* Mobile menu backdrop & drawer */}
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
                  className="p-1 text-ink-500 hover:text-ink-950 rounded"
                >
                  ✕
                </button>
              </div>
              <nav className="mt-3 space-y-1">
                {STAGE_ROUTES.map(({ stage, label, route, step }) => {
                  const isActive = location.pathname === route;
                  const { icon } = getStatusIcon(stage);
                  return (
                    <button
                      key={stage}
                      onClick={() => { navigate(route); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md text-left ${
                        isActive ? 'bg-accent-100 text-accent-700 font-semibold' : 'text-ink-700'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs bg-surface-100 border text-ink-600 font-bold">
                        {icon === '✓' ? '✓' : step}
                      </span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Mobile: horizontal stage selector strip */}
        <div
          className="md:hidden w-full overflow-x-auto border-b border-border bg-white flex scrollbar-none sticky top-14 z-20"
          role="navigation"
          aria-label="Mobile stage navigation"
        >
          {STAGE_ROUTES.map(({ stage, label, route }) => {
            const isActive = location.pathname === route;
            const { icon } = getStatusIcon(stage);
            return (
              <button
                key={stage}
                onClick={() => navigate(route)}
                className={[
                  'flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-xs whitespace-nowrap border-b-2 transition-colors',
                  isActive
                    ? 'border-accent-600 text-accent-700 font-semibold bg-accent-100/20'
                    : 'border-transparent text-ink-600 hover:text-ink-950',
                ].join(' ')}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="text-[10px] font-bold" aria-hidden="true">{icon}</span>
                {label}
              </button>
            );
          })}
        </div>

        {/* Main workspace */}
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
