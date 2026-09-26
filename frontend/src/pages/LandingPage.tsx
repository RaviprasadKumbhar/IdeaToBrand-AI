/**
 * LandingPage — Public Landing Page for IdeaToBrand AI.
 * Explains how the platform turns business ideas into complete brand strategies
 * with designed brand artifacts, plain-language stages, and clear CTAs.
 */
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  function handleStart() {
    if (user) {
      navigate('/workspace');
    } else {
      navigate('/signup');
    }
  }

  return (
    <div className="min-h-screen bg-paper-50 text-ink-950 flex flex-col selection:bg-accent-100 selection:text-accent-700 font-sans">
      {/* ─── Top Navigation ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-border px-4 sm:px-8 h-16 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm select-none">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </div>
          <span className="font-bold text-ink-950 tracking-tight text-lg">
            IdeaToBrand <span className="text-accent-600 font-extrabold">AI</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-ink-700">
          <a href="#process" className="hover:text-ink-950 transition-colors">How It Works</a>
          <a href="#stages" className="hover:text-ink-950 transition-colors">Brand Stages</a>
          <a href="#canvas" className="hover:text-ink-950 transition-colors">Interactive Canvas</a>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <button
              onClick={() => navigate('/workspace')}
              className="btn-primary text-xs sm:text-sm px-4 py-2"
            >
              Open Your Workspace →
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="text-xs sm:text-sm font-medium text-ink-700 hover:text-ink-950 px-3 py-2 rounded-md hover:bg-surface-100 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="btn-primary text-xs sm:text-sm px-4 py-2"
              >
                Create Account
              </button>
            </>
          )}
        </div>
      </header>

      {/* ─── Hero Section ──────────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-8 pt-14 pb-16 sm:pt-20 sm:pb-24 text-center max-w-4xl mx-auto flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-100/80 border border-indigo-100 text-accent-700 text-xs font-semibold uppercase tracking-wider mb-6">
          <span className="w-2 h-2 rounded-full bg-accent-600 animate-pulse" />
          Professional AI Brand Strategy Platform
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-ink-950 tracking-tight leading-[1.1] text-balance">
          Turn your business idea into a <span className="text-accent-600">complete brand strategy</span>.
        </h1>

        <p className="mt-6 text-base sm:text-xl text-ink-700 max-w-2xl leading-relaxed text-balance">
          No confusing marketing jargon. Answer straightforward questions about what you're building, and IdeaToBrand AI shapes your market positioning, brand identity, visual style, voice, and launch kit.
        </p>

        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <button
            onClick={handleStart}
            className="btn-primary w-full sm:w-auto px-8 py-3.5 text-base font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <span>Start Building Your Brand</span>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
          <a
            href="#stages"
            className="btn-secondary w-full sm:w-auto px-6 py-3.5 text-base font-medium"
          >
            Explore the 9 Brand Stages
          </a>
        </div>

        {/* ─── Sample Brand Canvas Preview ───────────────────────────────── */}
        <div id="canvas" className="mt-14 w-full max-w-3xl rounded-2xl border border-border bg-white shadow-card overflow-hidden text-left">
          {/* Canvas Window Header */}
          <div className="bg-surface-100/80 border-b border-border px-4 py-3 flex items-center justify-between text-xs text-ink-600">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />
              <span className="ml-2 font-semibold text-ink-800">Sample Brand Canvas • EcoCourier Urban Logistics</span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Stage 2 of 9 Approved
            </span>
          </div>

          {/* Interactive Strategy Artifact Preview Grid */}
          <div className="p-5 sm:p-6 grid sm:grid-cols-2 gap-4 text-xs">
            {/* Artifact 1: Positioning Vector */}
            <div className="p-4 rounded-xl bg-paper-50 border border-border space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-accent-700 uppercase tracking-wider bg-accent-100 px-2 py-0.5 rounded">
                  Positioning Vector
                </span>
                <span className="text-[10px] text-green-700 font-semibold">✓ Active Decision</span>
              </div>
              <h4 className="font-bold text-sm text-ink-950">Neighborhood First Logistics</h4>
              <p className="text-ink-600 leading-relaxed text-[11px]">
                Empowering independent neighborhood bakeries with zero-emission cargo fleets, rejecting predatory 30% delivery commission fees.
              </p>
              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-ink-500">
                <span>Category: Sustainable Urban Delivery</span>
                <span className="font-semibold text-ink-800">5-Mile Radius</span>
              </div>
            </div>

            {/* Artifact 2: Brand Identity Preview */}
            <div className="p-4 rounded-xl bg-paper-50 border border-border space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider bg-indigo-100 px-2 py-0.5 rounded">
                  Naming & Tone
                </span>
                <span className="text-[10px] text-green-700 font-semibold">✓ Approved</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-base font-extrabold text-ink-950">EcoCourier</span>
                <span className="text-[11px] text-accent-600 font-medium italic">"Clean streets. Warm bread."</span>
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <span className="w-5 h-5 rounded-full bg-emerald-700 border border-white shadow-xs" title="Forest Green #047857" />
                <span className="w-5 h-5 rounded-full bg-amber-400 border border-white shadow-xs" title="Warm Amber #FBBF24" />
                <span className="w-5 h-5 rounded-full bg-stone-900 border border-white shadow-xs" title="Charcoal #1C1917" />
                <span className="w-5 h-5 rounded-full bg-stone-50 border border-border shadow-xs" title="Cream #FAFAF9" />
                <span className="ml-2 text-[10px] text-ink-500">Visual Palette Selected</span>
              </div>
              <div className="text-[11px] text-ink-600">
                Tone traits: Grounded • Reliable • Community-Minded
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works ──────────────────────────────────────────────── */}
      <section id="process" className="py-16 sm:py-20 border-t border-border bg-white px-4 sm:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-accent-600 mb-2">Clear Process</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-ink-950 tracking-tight">
            How IdeaToBrand AI Builds Your Brand
          </h2>
          <p className="mt-3 text-ink-600 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            Move forward with confidence. Each step builds logically on the previous one, so your strategy stays unified and actionable.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mt-12 text-left">
            <div className="card p-6 border-border space-y-3">
              <div className="w-10 h-10 rounded-xl bg-accent-100 text-accent-700 flex items-center justify-center font-bold text-sm">
                01
              </div>
              <h3 className="font-bold text-lg text-ink-950">Describe Your Idea</h3>
              <p className="text-xs text-ink-600 leading-relaxed">
                Tell us what you're building in plain English. Attach your notes, product briefs, or business plans if you have them.
              </p>
            </div>

            <div className="card p-6 border-border space-y-3">
              <div className="w-10 h-10 rounded-xl bg-accent-100 text-accent-700 flex items-center justify-center font-bold text-sm">
                02
              </div>
              <h3 className="font-bold text-lg text-ink-950">Review Strategic Decisions</h3>
              <p className="text-xs text-ink-600 leading-relaxed">
                Compare positioning angles, name candidates, visual styles, and copy blocks. Accept suggestions or edit them with a click.
              </p>
            </div>

            <div className="card p-6 border-border space-y-3">
              <div className="w-10 h-10 rounded-xl bg-accent-100 text-accent-700 flex items-center justify-center font-bold text-sm">
                03
              </div>
              <h3 className="font-bold text-lg text-ink-950">Download Your Brand Kit</h3>
              <p className="text-xs text-ink-600 leading-relaxed">
                Verify cross-stage consistency with an automated audit, then export a complete brand guideline document ready for launch.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 9 Strategic Gates with Plain Language Descriptions ────────── */}
      <section id="stages" className="py-16 sm:py-20 border-t border-border bg-paper-50 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-accent-600 mb-2">Structured Workflow</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-ink-950 tracking-tight">
              Nine Essential Brand Milestones
            </h2>
            <p className="mt-3 text-ink-600 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
              Every stage has a clear purpose. No vague marketing theories—just tangible decisions that define your business.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              {
                num: '01',
                title: 'Brand Discovery',
                desc: 'Understand your business, customers, and market.',
              },
              {
                num: '02',
                title: 'Positioning Matrix',
                desc: 'Find what makes your brand different from competitors.',
              },
              {
                num: '03',
                title: 'Naming + Personality',
                desc: 'Explore brand names and define how your brand should feel.',
              },
              {
                num: '04',
                title: 'Tagline + Pitch',
                desc: 'Create a memorable slogan and a short explanation of your business.',
              },
              {
                num: '05',
                title: 'Visual Brief',
                desc: 'Choose the visual direction for your logo, colors, and overall style.',
              },
              {
                num: '06',
                title: 'Voice + Messaging',
                desc: 'Decide how your brand speaks to customers.',
              },
              {
                num: '07',
                title: 'Launch Preparation',
                desc: 'Prepare the materials and checklist for launching your brand.',
              },
              {
                num: '08',
                title: 'Consistency Audit',
                desc: 'Check whether all parts of your brand work together.',
              },
              {
                num: '09',
                title: 'Kit + Export',
                desc: 'Review and download your finished brand materials.',
              },
            ].map((stage) => (
              <div key={stage.num} className="p-4 rounded-xl bg-white border border-border shadow-xs space-y-1.5 hover:border-accent-600/50 transition-colors">
                <span className="text-[10px] font-bold text-accent-600 bg-accent-100 px-2 py-0.5 rounded">
                  Gate {stage.num}
                </span>
                <h4 className="font-bold text-sm text-ink-950">{stage.title}</h4>
                <p className="text-xs text-ink-600 leading-normal">{stage.desc}</p>
              </div>
            ))}
          </div>

          {/* Scenario Probe Plain Explanation */}
          <div className="mt-6 p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 flex items-start gap-3.5">
            <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
              ✦
            </span>
            <div>
              <h4 className="font-bold text-sm text-indigo-950">Scenario Probe (What-If Sandbox)</h4>
              <p className="text-xs text-indigo-900/80 mt-0.5 leading-relaxed">
                Explore how changing your audience, pricing, or brand direction could affect your strategy—without touching your approved decisions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─────────────────────────────────────────────────── */}
      <section className="py-20 border-t border-border bg-white text-center px-4 sm:px-8">
        <div className="max-w-2xl mx-auto space-y-5">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-ink-950 tracking-tight">
            Ready to build a brand people remember?
          </h2>
          <p className="text-ink-600 text-sm sm:text-base leading-relaxed">
            Create an account or sign in to start turning your business vision into an actionable brand strategy.
          </p>
          <div className="pt-2">
            <button
              onClick={handleStart}
              className="btn-primary px-8 py-3.5 text-base font-semibold shadow-md hover:shadow-lg"
            >
              Start Building Your Brand →
            </button>
          </div>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-border bg-surface-100/60 py-8 px-4 sm:px-8 text-xs text-ink-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-ink-950">IdeaToBrand AI</span>
            <span>•</span>
            <span>Inkloom Hackathon Brand Strategy Workspace</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Supabase Auth Connected
            </span>
            <span>© 2026 IdeaToBrand AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
