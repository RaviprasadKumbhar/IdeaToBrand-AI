/**
 * KitExportStage — Stage 9 (design.md § 27, § 28).
 * Displays complete structured Brand Plan Result, export readiness checklist,
 * and authoritative Markdown download & clipboard copy.
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
  const [copied, setCopied] = useState(false);

  const approved = store.ctx.approved_decisions;
  const consistencyFindings = store.ctx.consistency_findings;
  const stageChecks = REQUIRED_STAGES.map(({ stage, label, route }) => ({
    label, ok: !!approved[stage as keyof typeof approved], route,
  }));
  const auditResolved = consistencyFindings.length === 0 ||
    consistencyFindings.every(f => f.user_action !== null);
  const allGreen = stageChecks.every(c => c.ok) && auditResolved;

  // Extracted structured brand plan data from approved decisions
  const discovery = approved.discovery?.content as any;
  const positioning = approved.positioning?.content as any;
  const naming = approved.naming_personality?.content as any;
  const tagline = approved.tagline_pitch?.content as any;
  const visual = approved.visual_brief?.content as any;
  const voice = approved.voice_messaging?.content as any;
  const launch = approved.launch_prep?.content as any;

  const activeBrandName =
    typeof naming?.selected_name === 'string'
      ? naming.selected_name
      : naming?.selected_name?.proposed_name ||
        naming?.proposed_name ||
        naming?.naming_directions?.[0]?.proposed_name ||
        'Your Brand';

  const activeTagline =
    tagline?.selected_tagline ||
    tagline?.tagline_options?.[0] ||
    '';

  const brandConcept =
    String(store.ctx.user_facts?.business_description || discovery?.core_problem || '');

  const hasAnyApproved = Object.keys(approved).length > 0;

  async function handleExport() {
    if (!allGreen) return;
    setIsExporting(true);
    setExportError(null);
    try {
      const result = await assembleExport(
        store.ctx as unknown as Record<string, unknown>,
        consistencyFindings
      );
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
    a.download = `${activeBrandName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-brand-kit.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCopy() {
    if (!exportContent) return;
    navigator.clipboard.writeText(exportContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <article aria-labelledby="export-heading" className="space-y-6">
      <header>
        <p className="section-label mb-1">Stage 9</p>
        <h1 id="export-heading" className="text-h1 font-bold text-ink-950">Kit Assembly & Export</h1>
        <p className="text-body text-ink-500 mt-1">Review your complete structured brand plan and export your approved brand system.</p>
      </header>

      {/* ─── Structured Brand Plan Result (Sections 1–8) ──────────────────── */}
      {hasAnyApproved && (
        <section aria-label="Structured Brand Plan Overview" className="space-y-4">
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-h3 font-semibold text-ink-950">Structured Brand Plan Result</h2>
            <span className="text-xs text-ink-500 font-medium">
              {Object.keys(approved).length} of 7 required stages approved
            </span>
          </div>

          {/* Hero Brand Identity Banner */}
          <div className="card p-6 bg-gradient-to-r from-accent-950 via-ink-900 to-indigo-950 text-white rounded-xl shadow-sm space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-accent-300">
                Authoritative Brand Foundation
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {activeBrandName}
            </h3>
            {activeTagline && (
              <p className="text-sm sm:text-base italic text-accent-100 font-medium">
                "{activeTagline}"
              </p>
            )}
            {brandConcept && (
              <p className="text-xs sm:text-sm text-ink-200 pt-1 leading-relaxed max-w-2xl">
                {brandConcept}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Section 1: Concept & Problem Foundation */}
            {discovery && (
              <div className="card p-4 bg-white border-border shadow-xs space-y-2 text-left">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent-700">
                    1. Problem & Audience Foundation
                  </span>
                  <span className="text-[9px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                    ✓ Approved
                  </span>
                </div>
                {discovery.target_audience && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-ink-400 block">Target Audience</span>
                    <p className="text-xs font-medium text-ink-900">{discovery.target_audience}</p>
                  </div>
                )}
                {discovery.core_problem && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-ink-400 block">Core Problem</span>
                    <p className="text-xs text-ink-800">{discovery.core_problem}</p>
                  </div>
                )}
                {discovery.value_desired_outcome && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-ink-400 block">Desired Value Outcome</span>
                    <p className="text-xs text-ink-800">{discovery.value_desired_outcome}</p>
                  </div>
                )}
              </div>
            )}

            {/* Section 2: Positioning Matrix */}
            {positioning && (
              <div className="card p-4 bg-white border-border shadow-xs space-y-2 text-left">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent-700">
                    2. Positioning & Differentiation
                  </span>
                  <span className="text-[9px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                    ✓ Approved
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-ink-400 block">Strategic Angle</span>
                  <p className="text-xs font-semibold text-ink-950">
                    {positioning.selected_direction?.title || positioning.title || 'Marketplace Vector'}
                  </p>
                </div>
                {(positioning.selected_direction?.value_proposition || positioning.value_proposition) && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-ink-400 block">Value Proposition</span>
                    <p className="text-xs text-accent-700 font-medium italic">
                      "{positioning.selected_direction?.value_proposition || positioning.value_proposition}"
                    </p>
                  </div>
                )}
                {(positioning.selected_direction?.differentiator || positioning.differentiator) && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-ink-400 block">Key Differentiator</span>
                    <p className="text-xs text-ink-800">
                      {positioning.selected_direction?.differentiator || positioning.differentiator}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Section 3: Brand Personality & Principles */}
            {naming && (
              <div className="card p-4 bg-white border-border shadow-xs space-y-2 text-left">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent-700">
                    3. Name & Brand Personality
                  </span>
                  <span className="text-[9px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                    ✓ Approved
                  </span>
                </div>
                {Array.isArray(naming.personality_traits) && naming.personality_traits.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-ink-400 block mb-1">Personality Traits</span>
                    <div className="flex flex-wrap gap-1">
                      {naming.personality_traits.map((t: any, i: number) => (
                        <span key={i} className="text-[11px] bg-accent-50 text-accent-700 font-medium px-2 py-0.5 rounded border border-accent-200">
                          {typeof t === 'string' ? t : t.trait}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {Array.isArray(naming.brand_principles) && naming.brand_principles.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-ink-400 block mb-0.5">Core Brand Principles</span>
                    <ul className="text-xs text-ink-800 space-y-0.5 list-disc list-inside">
                      {naming.brand_principles.slice(0, 3).map((p: any, i: number) => (
                        <li key={i}>{typeof p === 'string' ? p : p.principle}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Section 4: Tagline & Pitch */}
            {tagline && (
              <div className="card p-4 bg-white border-border shadow-xs space-y-2 text-left">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent-700">
                    4. Tagline & Pitch
                  </span>
                  <span className="text-[9px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                    ✓ Approved
                  </span>
                </div>
                {activeTagline && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-ink-400 block">Primary Tagline</span>
                    <p className="text-xs font-bold text-ink-950">"{activeTagline}"</p>
                  </div>
                )}
                {tagline.one_line_pitch && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-ink-400 block">One-Line Pitch</span>
                    <p className="text-xs text-ink-800 leading-relaxed">{tagline.one_line_pitch}</p>
                  </div>
                )}
              </div>
            )}

            {/* Section 5: Visual Direction */}
            {visual && (
              <div className="card p-4 bg-white border-border shadow-xs space-y-2 text-left">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent-700">
                    5. Visual Brief & Color Tokens
                  </span>
                  <span className="text-[9px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                    ✓ Approved
                  </span>
                </div>
                {visual.logo_direction && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-ink-400 block">Logo Direction</span>
                    <p className="text-xs text-ink-800">{visual.logo_direction}</p>
                  </div>
                )}
                {Array.isArray(visual.hex_palette) && visual.hex_palette.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-ink-400 block mb-1">Color Palette</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {visual.hex_palette.map((hex: string, i: number) => (
                        <div key={i} className="flex items-center gap-1.5 bg-surface-50 border border-border rounded px-2 py-0.5 text-[11px] font-mono">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10 flex-shrink-0"
                            style={{ backgroundColor: hex }}
                            aria-hidden="true"
                          />
                          <span>{hex}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Section 6: Voice & Messaging */}
            {voice && (
              <div className="card p-4 bg-white border-border shadow-xs space-y-2 text-left">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent-700">
                    6. Voice & Messaging Architecture
                  </span>
                  <span className="text-[9px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                    ✓ Approved
                  </span>
                </div>
                {voice.voice_description && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-ink-400 block">Voice Character</span>
                    <p className="text-xs text-ink-800">{voice.voice_description}</p>
                  </div>
                )}
                {Array.isArray(voice.tone_characteristics) && voice.tone_characteristics.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {voice.tone_characteristics.map((t: string, i: number) => (
                      <span key={i} className="text-[10px] font-medium bg-surface-100 text-ink-700 px-2 py-0.5 rounded border border-border">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Section 7: Launch Content */}
            {launch && (
              <div className="card p-4 bg-white border-border shadow-xs space-y-2 text-left md:col-span-2">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent-700">
                    7. Launch Copy & GTM Ready
                  </span>
                  <span className="text-[9px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                    ✓ Approved
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {launch.landing_headline && (
                    <div>
                      <span className="text-[10px] font-bold uppercase text-ink-400 block">Landing Headline</span>
                      <p className="text-xs font-semibold text-ink-950 mt-0.5">{launch.landing_headline}</p>
                    </div>
                  )}
                  {launch.social_launch_post && (
                    <div>
                      <span className="text-[10px] font-bold uppercase text-ink-400 block">Social Launch Post</span>
                      <p className="text-xs text-ink-800 whitespace-pre-wrap mt-0.5">{launch.social_launch_post}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── Export Readiness Checklist ─────────────────────────────────── */}
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
                  className="ml-auto text-xs text-accent-600 underline hover:no-underline focus:outline-none focus:underline cursor-pointer"
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
              <button
                onClick={() => navigate('/consistency-audit')}
                className="ml-auto text-xs text-accent-600 underline hover:no-underline cursor-pointer"
                aria-label="Go to Consistency Audit stage"
              >
                Resolve findings
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Blocked state */}
      {!allGreen && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-2" role="alert">
          <span className="text-red-600 font-bold" aria-hidden="true">✕</span>
          <div>
            <p className="text-sm font-semibold text-red-800">Export blocked</p>
            <p className="text-xs text-red-700">Complete and approve all required stages, then resolve all Consistency Audit findings.</p>
          </div>
        </div>
      )}

      {/* Export actions */}
      {allGreen && !exportContent && (
        <div className="flex gap-3">
          <button id="btn-export-markdown" onClick={handleExport} disabled={isExporting} className="btn-primary cursor-pointer">
            {isExporting ? 'Assembling…' : 'Export Markdown'}
          </button>
        </div>
      )}

      {exportError && (
        <div className="card border-red-200 p-4" role="alert">
          <p className="text-sm text-red-700 font-medium">{exportError}</p>
          <button onClick={handleExport} className="btn-primary mt-2 text-xs cursor-pointer">Try Again</button>
        </div>
      )}

      {/* Complete Assembled Brand Kit Preview & Download */}
      {exportContent && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3.5 bg-green-50 border border-green-200 rounded-md">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm" aria-hidden="true">✓</span>
            <div>
              <p className="text-sm font-semibold text-green-800">Brand kit assembled from approved decisions only.</p>
              <p className="text-xs text-green-700 mt-0.5">{exportContent.split('\n').length} lines generated from {Object.keys(store.ctx.approved_decisions).length} approved stages.</p>
            </div>
          </div>

          <div className="card p-4 space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-border">
              <p className="section-label text-ink-500">Brand Kit Markdown Preview</p>
              <span className="text-[11px] text-ink-400 font-mono">
                {exportContent.length} characters
              </span>
            </div>
            <pre className="text-xs font-mono text-ink-800 bg-surface-50 p-4 rounded-lg border border-border whitespace-pre-wrap overflow-x-auto max-h-96 leading-relaxed">
              {exportContent}
            </pre>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button id="btn-download-markdown" onClick={handleDownload} className="btn-primary cursor-pointer">
              ↓ Download Markdown
            </button>
            <button
              id="btn-copy-markdown"
              onClick={handleCopy}
              className="btn-secondary text-xs px-3.5 py-2 font-medium cursor-pointer"
            >
              {copied ? '✓ Copied to Clipboard!' : '📋 Copy to Clipboard'}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
