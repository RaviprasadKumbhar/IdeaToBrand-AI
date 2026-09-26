/**
 * LandingPage — Public SaaS Landing Page for IdeaToBrand AI.
 * Displays brand value proposition, workflow capabilities, and direct access to login/signup.
 */
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  function handlePrimaryCTA() {
    if (user) {
      navigate('/workspace');
    } else {
      navigate('/signup');
    }
  }

  return (
    <div className="min-h-screen bg-paper-50 text-ink-950 flex flex-col selection:bg-accent-100 selection:text-accent-700">
      {/* ─── Top Navigation ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-border px-4 sm:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-sm select-none">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </div>
          <span className="font-bold text-ink-950 tracking-tight text-lg">
            IdeaToBrand <span className="text-accent-600 font-extrabold">AI</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-ink-700">
          <a href="#how-it-works" className="hover:text-ink-950 transition-colors">How It Works</a>
          <a href="#capabilities" className="hover:text-ink-950 transition-colors">Capabilities</a>
          <a href="#workflow" className="hover:text-ink-950 transition-colors">Workflow</a>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <button
              onClick={() => navigate('/workspace')}
              className="btn-primary text-xs sm:text-sm px-4 py-2"
            >
              Open Workspace →
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
                Start Building Free
              </button>
            </>
          )}
        </div>
      </header>

      {/* ─── Hero Section ──────────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center max-w-4xl mx-auto flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-100 border border-indigo-100 text-accent-700 text-xs font-semibold uppercase tracking-wider mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-600 animate-pulse" />
          Conversational Brand Strategy Engine
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-ink-950 tracking-tight leading-[1.1] text-balance">
          Turn your idea into a <span className="text-accent-600">brand</span>.
        </h1>

        <p className="mt-6 text-base sm:text-xl text-ink-700 max-w-2xl leading-relaxed text-balance">
          From raw idea to a brand ready for the world. Describe your vision, explore positioning, develop identity, and generate a launch-ready brand kit through an intelligent, full-screen AI workspace.
        </p>

        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <button
            onClick={handlePrimaryCTA}
            className="btn-primary w-full sm:w-auto px-8 py-3.5 text-base font-semibold shadow-md hover:shadow-lg transition-all"
          >
            {user ? 'Go to Workspace' : 'Start Building Free'} →
          </button>
          <a
            href="#how-it-works"
            className="btn-secondary w-full sm:w-auto px-6 py-3.5 text-base font-medium"
          >
            Explore How It Works
          </a>
        </div>

        {/* Visual Preview Card of the Conversational Workspace */}
        <div className="mt-12 sm:mt-16 w-full max-w-3xl rounded-2xl border border-border bg-white shadow-card overflow-hidden text-left">
          <div className="bg-surface-100/70 border-b border-border px-4 py-2.5 flex items-center justify-between text-xs text-ink-500 font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-400/80 inline-block" />
              <span className="ml-2 font-sans font-medium text-ink-700">IdeaToBrand AI Workspace</span>
            </div>
            <span className="text-[11px] bg-green-50 text-green-700 px-2 py-0.5 rounded font-sans font-medium border border-green-200">
              Dual-Agent Strategist Active
            </span>
          </div>

          <div className="p-6 space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-accent-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                U
              </div>
              <div className="bg-accent-100/60 rounded-xl p-3.5 max-w-[85%] text-ink-950 font-medium">
                We're launching a zero-emission cargo bike logistics network for independent bakeries and cafes who need same-day delivery without 30% marketplace fees.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-accent-600 to-indigo-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                ✦
              </div>
              <div className="bg-surface-100 rounded-xl p-4 max-w-[90%] text-ink-800 space-y-2">
                <p className="font-semibold text-accent-700">Strategist Recommendation • Stage 1: Discovery</p>
                <p className="text-xs text-ink-700 leading-relaxed">
                  Your core value proposition is <strong>merchant empowerment & sustainable neighborhood commerce</strong>. Let's position this against predatory aggregators with two strategic directions: <em>The Local Collective</em> vs <em>Precision Clean-Fleet</em>.
                </p>
                <div className="pt-2 flex items-center gap-2">
                  <span className="text-[11px] bg-white border border-border px-2 py-1 rounded text-ink-600">
                    Critic: No antitrust positioning conflict
                  </span>
                  <span className="text-[11px] bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded font-semibold">
                    Ready for Approval
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works ──────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 border-t border-border bg-white px-4 sm:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-accent-600 mb-2">Process</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-ink-950 tracking-tight">
            How IdeaToBrand AI Works
          </h2>
          <p className="mt-3 text-ink-600 max-w-xl mx-auto text-sm sm:text-base">
            No endless multi-step forms. A natural conversational flow powered by structured brand strategy gates.
          </p>

          <div className="grid md:grid-cols-3 gap-8 mt-12 text-left">
            <div className="card p-6 border-border space-y-3">
              <div className="w-9 h-9 rounded-lg bg-accent-100 text-accent-600 flex items-center justify-center font-bold text-sm">
                01
              </div>
              <h3 className="font-bold text-lg text-ink-950">Describe Your Idea</h3>
              <p className="text-xs text-ink-600 leading-relaxed">
                Talk to the AI in your own words, paste meeting notes, or attach business briefs. No arbitrary word caps or rigid constraints.
              </p>
            </div>

            <div className="card p-6 border-border space-y-3">
              <div className="w-9 h-9 rounded-lg bg-accent-100 text-accent-600 flex items-center justify-center font-bold text-sm">
                02
              </div>
              <h3 className="font-bold text-lg text-ink-950">Dual-Agent Strategy</h3>
              <p className="text-xs text-ink-600 leading-relaxed">
                A creative Strategist and a rigorous Critic collaborate to formulate positioning, personality, visual briefs, and voice guidelines.
              </p>
            </div>

            <div className="card p-6 border-border space-y-3">
              <div className="w-9 h-9 rounded-lg bg-accent-100 text-accent-600 flex items-center justify-center font-bold text-sm">
                03
              </div>
              <h3 className="font-bold text-lg text-ink-950">Audit & Export Kit</h3>
              <p className="text-xs text-ink-600 leading-relaxed">
                Run a holistic cross-stage consistency audit, test "What-If" scenarios in isolation, and export a complete, cohesive brand kit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Capabilities ──────────────────────────────────────────────── */}
      <section id="capabilities" className="py-20 border-t border-border bg-paper-50 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-accent-600 mb-2">Complete Pipeline</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-ink-950 tracking-tight">
              Full-Spectrum Brand Architecture
            </h2>
            <p className="mt-3 text-ink-600 text-sm sm:text-base max-w-xl mx-auto">
              Nine integrated strategic gates ensure your brand is differentiated, cohesive, and ready to win.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { title: 'Brand Discovery', desc: 'Isolates core problem, audience segments, and user-provided facts.' },
              { title: 'Positioning Matrix', desc: 'Identifies two distinct strategic vectors with category points-of-difference.' },
              { title: 'Naming & Personality', desc: 'Suggests curated name options, rationales, and tone traits.' },
              { title: 'Tagline & Elevator Pitch', desc: 'Generates high-impact hooks and a clear 30-second investor pitch.' },
              { title: 'Visual Brief', desc: 'Defines color palette logic, typography pairing, and visual aesthetic tone.' },
              { title: 'Voice & Messaging', desc: 'Establishes what to say, what never to say, and key message pillars.' },
              { title: 'Launch Preparation', desc: 'Outlines 30-day go-to-market plan and target channel strategy.' },
              { title: 'Consistency Audit', desc: 'Holistic scanner detects cross-stage contradictions before launch.' },
              { title: 'Brand Kit Export', desc: 'One-click assembly of markdown guidelines, copy decks, and strategy specs.' },
            ].map((cap, i) => (
              <div key={cap.title} className="p-4 rounded-xl bg-white border border-border shadow-xs space-y-1.5">
                <span className="text-[10px] font-bold text-accent-600 bg-accent-100/70 px-2 py-0.5 rounded">
                  Gate 0{i + 1}
                </span>
                <h4 className="font-bold text-sm text-ink-950">{cap.title}</h4>
                <p className="text-xs text-ink-600 leading-normal">{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─────────────────────────────────────────────────── */}
      <section className="py-20 border-t border-border bg-white text-center px-4 sm:px-8">
        <div className="max-w-2xl mx-auto space-y-5">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-ink-950 tracking-tight">
            Ready to turn your idea into a lasting brand?
          </h2>
          <p className="text-ink-600 text-sm sm:text-base">
            No credit card required. Experience structured AI brand strategy in a streamlined conversational workspace.
          </p>
          <div className="pt-2">
            <button
              onClick={handlePrimaryCTA}
              className="btn-primary px-8 py-3.5 text-base font-semibold shadow-md hover:shadow-lg"
            >
              {user ? 'Open Your Workspace' : 'Get Started Free'} →
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
            <span>Brand Strategy Intelligence Engine</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Systems Operational
            </span>
            <span>© 2026 IdeaToBrand AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
