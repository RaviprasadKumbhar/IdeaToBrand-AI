/**
 * AppShell — main three-part workspace layout (design.md § 10).
 * Desktop: sidebar + main. Mobile: top nav + stacked content.
 */
import { type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFOILStore } from '../store/foilStore';
import type { StageName } from '../../../shared/types';

const STAGE_ROUTES: { stage: StageName | 'idea-input'; label: string; route: string }[] = [
  { stage: 'idea-input',          label: 'Idea Input',         route: '/' },
  { stage: 'discovery',           label: 'Discovery',          route: '/discovery' },
  { stage: 'positioning',         label: 'Positioning',        route: '/positioning' },
  { stage: 'naming_personality',  label: 'Naming + Personality', route: '/naming-personality' },
  { stage: 'tagline_pitch',       label: 'Tagline + Pitch',    route: '/tagline-pitch' },
  { stage: 'visual_brief',        label: 'Visual Brief',       route: '/visual-brief' },
  { stage: 'voice_messaging',     label: 'Voice + Messaging',  route: '/voice-messaging' },
  { stage: 'launch_prep',         label: 'Launch Prep',        route: '/launch-prep' },
  { stage: 'consistency_audit',   label: 'Consistency Audit',  route: '/consistency-audit' },
  { stage: 'kit_export',          label: 'Kit & Export',       route: '/export' },
];

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { ctx, uiStates, resetProject } = useFOILStore();

  function getStatusIcon(stage: StageName | 'idea-input'): { icon: string; className: string } {
    if (stage === 'idea-input') {
      const isComplete = !!Object.keys(ctx.user_facts).length;
      return isComplete
        ? { icon: '✓', className: 'text-green-600' }
        : { icon: '○', className: 'text-ink-500' };
    }
    const ui = uiStates[stage as StageName];
    if (!ui) return { icon: '○', className: 'text-ink-500' };
    switch (ui.approval_state) {
      case 'approved':      return { icon: '✓', className: 'text-green-600' };
      case 'needs_review':  return { icon: '⚠', className: 'text-amber-600' };
      case 'failed':        return { icon: '✕', className: 'text-red-600' };
      case 'rejected':      return { icon: '✕', className: 'text-red-500' };
      case 'critic_review':
      case 'needs_revision':return { icon: '⟳', className: 'text-accent-600' };
      case 'draft':
      default:              return { icon: '○', className: 'text-ink-500' };
    }
  }

  const approvedCount = Object.values(ctx.approved_decisions).filter(Boolean).length;
  const totalStages = STAGE_ROUTES.length - 1; // exclude idea-input

  return (
    <div className="min-h-screen flex flex-col bg-paper-50">
      {/* ─── Project Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white border-b border-border px-4 h-14 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            aria-label="FOIL — go to home"
          >
            <span className="w-8 h-8 rounded-md bg-accent-600 flex items-center justify-center text-white font-bold text-sm select-none">F</span>
            <span className="font-bold text-ink-950 tracking-tight text-base">FOIL</span>
          </button>
          <span className="hidden sm:block text-border">|</span>
          <span className="hidden sm:block text-sm text-ink-700 font-medium truncate max-w-[200px]">
            {ctx.user_facts['business_description']
              ? String(ctx.user_facts['business_description']).slice(0, 40) + '…'
              : 'New Brand Project'}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Progress indicator */}
          <div className="hidden md:flex items-center gap-2">
            <div className="w-24 h-1.5 bg-surface-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-600 rounded-full transition-all duration-500"
                style={{ width: `${(approvedCount / totalStages) * 100}%` }}
              />
            </div>
            <span className="text-xs text-ink-500">{approvedCount}/{totalStages} approved</span>
          </div>

          <button
            onClick={() => navigate('/export')}
            className="btn-secondary text-xs px-3 py-1.5"
            aria-label="Export brand kit"
          >
            Export Kit
          </button>
          <button
            onClick={() => {
              if (window.confirm('Start a new project? This will clear the current session.')) {
                resetProject();
                navigate('/');
              }
            }}
            className="text-xs text-ink-500 hover:text-ink-700 transition-colors"
            aria-label="New project"
          >
            New Project
          </button>
        </div>
      </header>

      {/* ─── Body: Sidebar + Main ─────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar — desktop */}
        <aside
          className="hidden md:flex flex-col w-56 lg:w-64 flex-shrink-0 border-r border-border bg-white overflow-y-auto"
          aria-label="Stage navigation"
          role="navigation"
        >
          <nav className="py-4">
            <p className="px-4 mb-2 section-label">Workflow</p>
            <ul role="list">
              {STAGE_ROUTES.map(({ stage, label, route }) => {
                const isActive = location.pathname === route;
                const { icon, className: iconClass } = getStatusIcon(stage);
                return (
                  <li key={stage}>
                    <button
                      onClick={() => navigate(route)}
                      className={[
                        'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left',
                        isActive
                          ? 'bg-accent-100 text-accent-600 font-semibold'
                          : 'text-ink-700 hover:bg-surface-100',
                      ].join(' ')}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span className={`w-4 text-center text-xs font-bold ${iconClass}`} aria-hidden="true">
                        {icon}
                      </span>
                      <span className="truncate">{label}</span>
                      {uiStates[stage as StageName]?.approval_state === 'needs_review' && (
                        <span className="ml-auto badge-needs-review">Review</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Mobile: horizontal stage selector strip */}
        <div
          className="md:hidden w-full overflow-x-auto border-b border-border bg-white flex"
          style={{ position: 'sticky', top: '56px', zIndex: 20 }}
          role="navigation"
          aria-label="Stage navigation"
        >
          {STAGE_ROUTES.map(({ stage, label, route }) => {
            const isActive = location.pathname === route;
            const { icon, className: iconClass } = getStatusIcon(stage);
            return (
              <button
                key={stage}
                onClick={() => navigate(route)}
                className={[
                  'flex-shrink-0 flex items-center gap-1.5 px-3 py-3 text-xs whitespace-nowrap border-b-2 transition-colors',
                  isActive
                    ? 'border-accent-600 text-accent-600 font-semibold'
                    : 'border-transparent text-ink-700',
                ].join(' ')}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={`text-[10px] font-bold ${iconClass}`} aria-hidden="true">{icon}</span>
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
