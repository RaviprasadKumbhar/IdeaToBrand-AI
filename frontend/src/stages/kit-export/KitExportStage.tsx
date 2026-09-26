/**
 * KitExportStage — Stage 9 (design.md § 27, § 28).
 * Export readiness checklist + Markdown download.
 * Export is BLOCKED unless all required stages are approved and audit is resolved.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFOILStore } from '../../store/foilStore';
import { assembleExport } from '../../lib/api-client';

const REQUIRED_STAGES: { stage: string; label: string; route: string }[] = [
  { stage: 'discovery',          label: 'Discovery approved',          route: '/discovery' },
  { stage: 'positioning',        label: 'Positioning approved',        route: '/positioning' },
  { stage: 'naming_personality', label: 'Naming + Personality approved', route: '/naming-personality' },
  { stage: 'tagline_pitch',      label: 'Tagline + Pitch approved',    route: '/tagline-pitch' },
  { stage: 'visual_brief',       label: 'Visual Brief approved',       route: '/visual-brief' },
  { stage: 'voice_messaging',    label: 'Voice + Messaging approved',  route: '/voice-messaging' },
  { stage: 'launch_prep',        label: 'Launch Prep approved',        route: '/launch-prep' },
] as const;

export function KitExportStage() {
  const store = useFOILStore();
  const navigate = useNavigate();
  const [isExporting, setIsExporting] = useState(false);
  const [exportContent, setExportContent] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const approved = store.ctx.approved_decisions;
  const consistencyFindings = store.ctx.consistency_findings;
  const stageChecks = REQUIRED_STAGES.map(({ stage, label, route }) => ({
    label, ok: !!approved[stage as keyof typeof approved], route,
  }));
  const auditResolved = consistencyFindings.length === 0 ||
    consistencyFindings.every(f => f.user_action !== null);
  const allGreen = stageChecks.every(c => c.ok) && auditResolved;

  async function handleExport() {
    if (!allGreen) return;
    setIsExporting(true);
    setExportError(null);
    try {
      const result = await assembleExport(approved as Record<string, unknown>);
      if (result.status === 'failed') {
        setExportError('Export failed. No partial file was produced. Please check that all stages are approved.');
      } else {
        setExportContent(result.content);
      }
    } catch {
      setExportError('Export failed. Your approved decisions are safe. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }

  function handleDownload() {
    if (!exportContent) return;
    const blob = new Blob([exportContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ideatobrand-kit.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <article aria-labelledby="export-heading" className="space-y-6">
      <header>
        <p className="section-label mb-1">Stage 9</p>
        <h1 id="export-heading" className="text-h1 font-bold text-ink-950">Kit Assembly & Export</h1>
        <p className="text-body text-ink-500 mt-1">Export your approved brand system as a Markdown document.</p>
      </header>

      {/* Export readiness checklist */}
      <section aria-label="Export readiness checklist">
        <h2 className="text-h3 font-semibold text-ink-950 mb-3">Export Readiness</h2>
        <div className="card p-5 divide-y divide-border">
          {stageChecks.map(({ label, ok, route }) => (
            <div key={label} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <span
                className={[
                  'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold',
                  ok ? 'bg-green-100 text-green-700' : 'bg-surface-100 text-ink-400',
                ].join(' ')}
                aria-hidden="true"
              >
                {ok ? '\u2713' : '\u25cb'}
              </span>
              <span className={`text-sm flex-1 ${ok ? 'text-ink-950' : 'text-ink-500'}`}>{label}</span>
              {!ok && (
                <button
                  onClick={() => navigate(route)}
                  className="ml-auto text-xs text-accent-600 underline hover:no-underline focus:outline-none focus:underline"
                  aria-label={`Go to ${label.replace(' approved', '')} stage`}
                >
                  Go to stage
                </button>
              )}
            </div>
          ))}
          <div className="flex items-center gap-3 py-2.5 last:pb-0">
            <span
              className={[
                'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold',
                auditResolved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-600',
              ].join(' ')}
              aria-hidden="true"
            >
              {auditResolved ? '\u2713' : '!'}
            </span>
            <span className={`text-sm flex-1 ${auditResolved ? 'text-ink-950' : 'text-amber-700'}`}>Consistency Audit resolved</span>
            {!auditResolved && (
              <button onClick={() => navigate('/consistency-audit')} className="ml-auto text-xs text-accent-600 underline hover:no-underline" aria-label="Go to Consistency Audit stage">
                Resolve findings
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Blocked state */}
      {!allGreen && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-2" role="alert">
          <span className="text-red-600">✕</span>
          <div>
            <p className="text-sm font-semibold text-red-800">Export blocked</p>
            <p className="text-xs text-red-700">Complete and approve all required stages, then resolve all Consistency Audit findings.</p>
          </div>
        </div>
      )}

      {/* Export actions */}
      {allGreen && !exportContent && (
        <div className="flex gap-3">
          <button id="btn-export-markdown" onClick={handleExport} disabled={isExporting} className="btn-primary">
            {isExporting ? 'Assembling…' : 'Export Markdown'}
          </button>
        </div>
      )}

      {exportError && (
        <div className="card border-red-200 p-4" role="alert">
          <p className="text-sm text-red-700">{exportError}</p>
          <button onClick={handleExport} className="btn-primary mt-2 text-xs">Try Again</button>
        </div>
      )}

      {exportContent && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3.5 bg-green-50 border border-green-200 rounded-md">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm" aria-hidden="true">\u2713</span>
            <div>
              <p className="text-sm font-semibold text-green-800">Brand kit assembled from approved decisions only.</p>
              <p className="text-xs text-green-700 mt-0.5">{exportContent.split('\n').length} lines generated from {Object.keys(store.ctx.approved_decisions).length} approved stages.</p>
            </div>
          </div>
          <div className="card p-4">
            <p className="section-label mb-2 text-ink-500">Preview</p>
            <pre className="text-xs font-mono text-ink-700 whitespace-pre-wrap overflow-x-auto max-h-64 leading-relaxed">{exportContent}</pre>
          </div>
          <button id="btn-download-markdown" onClick={handleDownload} className="btn-primary">
            \u2193 Download Markdown
          </button>
        </div>
      )}
    </article>
  );
}
