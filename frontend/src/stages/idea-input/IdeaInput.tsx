/**
 * IdeaInput — T-014: Modern SaaS Idea Input Page.
 * Redesigned for IdeaToBrand AI with clean typography, refined hierarchy,
 * professional SVG icons, accessible validation, and collapsible optional context.
 */
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFOILStore } from '../../store/foilStore';
import type { IdeaInput as IdeaInputType } from '../../../../shared/types';

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

interface SampleIdea {
  id: string;
  label: string;
  tag: string;
  desc: string;
  audience: string;
  category: string;
  constraints: string;
}

const SAMPLE_IDEAS: SampleIdea[] = [
  {
    id: 'ecocourier',
    label: 'EcoCourier',
    tag: 'Logistics',
    desc: 'An on-demand, zero-emission cargo bike logistics service for local independent merchants, cafes, and bakeries in dense urban neighborhoods who need same-day delivery without paying predatory marketplace commissions.',
    audience: 'Urban independent merchants, artisan bakeries, boutique retail, and local shoppers.',
    category: 'Sustainable Urban Logistics & Last-Mile Delivery',
    constraints: 'Zero-emission cargo bikes only, same-day delivery within 5-mile radius, merchant-first pricing.',
  },
  {
    id: 'studynest',
    label: 'StudyNest',
    tag: 'EdTech',
    desc: 'A collaborative peer-matching platform that helps university students find compatible teammates for semester group projects based on working habits, schedule compatibility, and shared academic goals.',
    audience: 'Undergraduate and graduate university students aged 18–26.',
    category: 'EdTech & Student Collaboration',
    constraints: 'Must integrate with university SSO; completely free for student organizations.',
  },
];

export function IdeaInput() {
  const navigate = useNavigate();
  const { startNewProject, ideaInput, ctx } = useFOILStore();

  const [description, setDescription] = useState<string>(
    String(ideaInput?.business_description ?? ctx?.user_facts?.business_description ?? '')
  );
  const [audience, setAudience] = useState<string>(
    String(ideaInput?.target_audience ?? ctx?.user_facts?.target_audience ?? '')
  );
  const [category, setCategory] = useState<string>(
    String(ideaInput?.category ?? ctx?.user_facts?.category ?? '')
  );
  const [constraints, setConstraints] = useState<string>(
    String(ideaInput?.constraints ?? ctx?.user_facts?.constraints ?? '')
  );
  const [showOptional, setShowOptional] = useState(
    !!(ideaInput?.target_audience || ctx?.user_facts?.target_audience ||
       ideaInput?.category || ctx?.user_facts?.category ||
       ideaInput?.constraints || ctx?.user_facts?.constraints)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const wordCount = countWords(description);
  const wordCountColor =
    wordCount === 0 ? 'text-ink-500'
    : wordCount < 5 ? 'text-amber-600'
    : wordCount > 500 ? 'text-red-600'
    : wordCount > 400 ? 'text-amber-600'
    : 'text-green-600';

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!description.trim()) {
      newErrors.description = 'Please describe your idea or business.';
    } else if (wordCount < 5) {
      newErrors.description = 'Please provide at least 5 words so IdeaToBrand AI has enough to work with.';
    } else if (wordCount > 500) {
      newErrors.description = `Your description is ${wordCount} words. Please keep it under 500 words.`;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!validate()) return;

    const input: IdeaInputType = {
      business_description: description.trim(),
      ...(audience.trim() ? { target_audience: audience.trim() } : {}),
      ...(category.trim() ? { category: category.trim() } : {}),
      ...(constraints.trim() ? { constraints: constraints.trim() } : {}),
    };

    // Store as user_facts and initialize clean project — strictly separate from downstream AI assumptions
    await startNewProject(input);
    navigate('/discovery');
  }

  function applySampleIdea(sample: SampleIdea) {
    if (description.trim() && description.trim() !== sample.desc) {
      const confirmOverwrite = window.confirm(
        'Replace your current description and context with this template?'
      );
      if (!confirmOverwrite) return;
    }

    setDescription(sample.desc);
    setAudience(sample.audience);
    setCategory(sample.category);
    setConstraints(sample.constraints);
    setSelectedTemplateId(sample.id);
    setShowOptional(true);
    setErrors({});
  }

  return (
    <div className="max-w-3xl mx-auto py-2 sm:py-4">
      {/* ─── Hero Section ──────────────────────────────────────────────── */}
      <header className="mb-8 text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-100 text-accent-600 text-[11px] font-bold uppercase tracking-widest mb-3.5 border border-indigo-100">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-600 animate-pulse" aria-hidden="true" />
          BRAND STRATEGY WORKSPACE
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-950 tracking-tight leading-tight">
          Turn your idea into a brand.
        </h1>
        <p className="mt-2.5 text-sm sm:text-base text-ink-700 max-w-2xl leading-relaxed">
          Describe your idea. Build a differentiated brand identity, clear messaging, and a launch-ready brand kit through a structured AI workflow.
        </p>

        {/* ─── Quick-Start Templates ────────────────────────────────────── */}
        <div className="mt-6 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center gap-2.5">
          <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-accent-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Quick-start templates:
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {SAMPLE_IDEAS.map((sample) => {
              const isSelected = selectedTemplateId === sample.id || description === sample.desc;
              return (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => applySampleIdea(sample)}
                  className={[
                    'inline-flex items-center gap-2 text-xs px-3.5 py-1.5 rounded-full transition-all duration-150 border font-medium cursor-pointer',
                    isSelected
                      ? 'bg-accent-100 border-accent-600/40 text-accent-700 font-semibold shadow-xs ring-1 ring-accent-600/20'
                      : 'bg-white border-border text-ink-700 hover:bg-surface-100 hover:text-ink-950 hover:border-ink-300',
                  ].join(' ')}
                >
                  <span className="font-semibold">{sample.label}</span>
                  <span className="text-[10px] text-ink-400 bg-surface-100 px-1.5 py-0.5 rounded">
                    {sample.tag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ─── Main Form ─────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} noValidate aria-label="Idea input form" className="space-y-6">
        {/* Idea Description Card */}
        <div className="card p-6 sm:p-7 space-y-5 bg-white border-border shadow-card">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="idea-description"
                className="block text-sm font-bold text-ink-950"
              >
                Your idea or business description
                <span className="text-red-500 ml-1" aria-hidden="true">*</span>
              </label>
              <span
                className={`text-xs font-bold tabular-nums px-2.5 py-0.5 rounded-full bg-surface-100 border border-border/60 ${wordCountColor}`}
                aria-live="polite"
                aria-label={`${wordCount} words`}
              >
                {wordCount} / 500 words
              </span>
            </div>

            <p className="text-xs text-ink-500 mb-3" id="idea-description-hint">
              Use your own words. IdeaToBrand AI will keep this as a user-provided fact — it will not be converted into an AI assumption. (5–500 words)
            </p>

            <textarea
              id="idea-description"
              name="business_description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (submitted) validate();
              }}
              rows={6}
              placeholder="e.g. An on-demand, zero-emission cargo bike logistics network for independent neighborhood bakeries, cafes, and boutique retailers who need same-day delivery without paying predatory marketplace commissions."
              className={[
                'w-full min-h-[160px] sm:min-h-[180px] rounded-lg border px-4 py-3 text-sm text-ink-950 placeholder:text-ink-400 resize-y leading-relaxed font-sans',
                'focus:outline-none focus:ring-2 focus:ring-accent-600/30 focus:border-accent-600 transition-all duration-150',
                errors.description ? 'border-red-400 bg-red-50/20' : 'border-border bg-white',
              ].join(' ')}
              aria-required="true"
              aria-describedby="idea-description-hint idea-description-error"
              aria-invalid={!!errors.description}
              minLength={1}
              maxLength={4000}
            />

            {errors.description && (
              <p id="idea-description-error" role="alert" className="mt-2 text-xs font-semibold text-red-600 flex items-center gap-1.5">
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.description}
              </p>
            )}
          </div>

          {/* Facts and Assumptions Information Panel */}
          <div className="flex items-start gap-3 p-4 bg-indigo-50/70 rounded-xl border border-indigo-100 text-xs text-ink-700 leading-relaxed">
            <svg className="w-5 h-5 text-accent-600 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <div>
              <span className="font-bold text-accent-600 uppercase tracking-wider block mb-0.5 text-[11px]">
                Ground Truth Separation
              </span>
              Everything you enter here is stored as <strong className="text-ink-950 font-semibold">user-provided facts</strong> — strictly separated from downstream AI assumptions and never silently altered.
            </div>
          </div>
        </div>

        {/* ─── Collapsible Optional Context ────────────────────────────── */}
        <div className="card p-5 sm:p-6 bg-white border-border shadow-card transition-all">
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="w-full flex items-center justify-between text-left group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 rounded-md p-1 -m-1"
            aria-expanded={showOptional}
            aria-controls="optional-context-fields"
            aria-label="Toggle optional context and constraints"
          >
            <div className="flex items-center gap-3">
              <span
                className="w-6 h-6 rounded-md bg-surface-100 border border-border flex items-center justify-center text-ink-600 transition-transform duration-200 group-hover:bg-accent-100 group-hover:text-accent-600"
                aria-hidden="true"
                style={{ transform: showOptional ? 'rotate(90deg)' : 'none' }}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
              <div>
                <span className="text-sm font-bold text-ink-950 group-hover:text-accent-600 transition-colors">
                  Optional context{showOptional ? '' : ' (expand)'}
                </span>
                <p className="text-xs text-ink-500 font-normal mt-0.5">
                  Target audience, category, and strategic constraints
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-accent-600 group-hover:underline hidden sm:inline-block">
              {showOptional ? 'Collapse' : 'Add context'}
            </span>
          </button>

          {showOptional && (
            <div id="optional-context-fields" className="mt-5 pt-5 border-t border-border space-y-4.5">
              <p className="text-xs text-ink-500 leading-normal">
                These optional parameters provide initial boundaries for the Strategist. They remain user-provided facts.
              </p>

              {/* Target Audience: Own full row on desktop */}
              <div>
                <label htmlFor="idea-audience" className="block text-xs font-bold text-ink-700 uppercase tracking-wider mb-1.5">
                  Target audience
                </label>
                <input
                  id="idea-audience"
                  type="text"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="e.g. Independent bakery owners and urban cafes in dense cities"
                  className="input-text"
                  aria-describedby="audience-hint"
                />
                <p id="audience-hint" className="text-[11px] text-ink-400 mt-1">
                  Who is this for? (Stored as user fact)
                </p>
              </div>

              {/* Category & Constraints: 2 columns on desktop, stacked on mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="idea-category" className="block text-xs font-bold text-ink-700 uppercase tracking-wider mb-1.5">
                    Category or industry
                  </label>
                  <input
                    id="idea-category"
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Sustainable Urban Logistics"
                    className="input-text"
                  />
                  <p className="text-[11px] text-ink-400 mt-1">
                    Market niche or industry domain
                  </p>
                </div>

                <div>
                  <label htmlFor="idea-constraints" className="block text-xs font-bold text-ink-700 uppercase tracking-wider mb-1.5">
                    Constraints or context
                  </label>
                  <input
                    id="idea-constraints"
                    type="text"
                    value={constraints}
                    onChange={(e) => setConstraints(e.target.value)}
                    placeholder="e.g. Zero-emission cargo bikes only, same-day delivery"
                    className="input-text"
                  />
                  <p className="text-[11px] text-ink-400 mt-1">
                    Hard boundaries, budget, or geography
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Bottom Action Area ────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2 text-xs text-ink-500">
            <span className="w-2 h-2 rounded-full bg-accent-600" aria-hidden="true" />
            <span>Step 1 of 10: Initializes Strategist analysis and facts vs assumptions separation.</span>
          </div>
          <button
            type="submit"
            id="btn-start-discovery"
            disabled={!description.trim()}
            className="btn-primary w-full sm:w-auto px-7 py-3 text-sm font-semibold tracking-wide disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            aria-label="Start Discovery — begin the brand-building workflow"
          >
            <span>Start Discovery</span>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
