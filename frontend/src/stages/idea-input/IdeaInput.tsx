/**
 * IdeaInput — T-014: Modern SaaS Idea Input Page.
 * Redesigned for IdeaToBrand AI with clean typography, refined hierarchy,
 * accessible validation, and collapsible optional context.
 */
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFOILStore } from '../../store/foilStore';
import type { IdeaInput as IdeaInputType } from '../../../../shared/types';

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const SAMPLE_IDEAS = [
  {
    label: 'EcoCourier (Logistics)',
    desc: 'An on-demand, zero-emission cargo bike logistics service for local independent merchants, cafes, and bakeries in dense urban neighborhoods who need same-day delivery without paying predatory marketplace commissions.',
    audience: 'Urban independent merchants, artisan bakeries, boutique retail, and local shoppers.',
    category: 'Sustainable Urban Logistics & Last-Mile Delivery',
    constraints: 'Zero-emission cargo bikes only, same-day delivery within 5-mile radius, merchant-first pricing.',
  },
  {
    label: 'StudyNest (EdTech)',
    desc: 'A collaborative peer-matching platform that helps university students find compatible teammates for semester group projects based on working habits, schedule compatibility, and shared academic goals.',
    audience: 'Undergraduate and graduate university students aged 18–26.',
    category: 'EdTech & Student Collaboration',
    constraints: 'Must integrate with university SSO; completely free for student organizations.',
  },
];

export function IdeaInput() {
  const navigate = useNavigate();
  const { setIdeaInput, ideaInput } = useFOILStore();

  const [description, setDescription] = useState(ideaInput?.business_description ?? '');
  const [audience, setAudience] = useState(ideaInput?.target_audience ?? '');
  const [category, setCategory] = useState(ideaInput?.category ?? '');
  const [constraints, setConstraints] = useState(ideaInput?.constraints ?? '');
  const [showOptional, setShowOptional] = useState(
    !!(ideaInput?.target_audience || ideaInput?.category || ideaInput?.constraints)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!validate()) return;

    const input: IdeaInputType = {
      business_description: description.trim(),
      ...(audience.trim() ? { target_audience: audience.trim() } : {}),
      ...(category.trim() ? { category: category.trim() } : {}),
      ...(constraints.trim() ? { constraints: constraints.trim() } : {}),
    };

    // Store as user_facts — strictly separate from AI assumptions
    setIdeaInput(input);
    navigate('/discovery');
  }

  function applySampleIdea(sample: typeof SAMPLE_IDEAS[0]) {
    setDescription(sample.desc);
    setAudience(sample.audience);
    setCategory(sample.category);
    setConstraints(sample.constraints);
    setShowOptional(true);
    setErrors({});
  }

  return (
    <div className="max-w-3xl mx-auto py-2">
      {/* ─── Hero Section ──────────────────────────────────────────────── */}
      <header className="mb-8 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-100 text-accent-700 text-xs font-bold uppercase tracking-wider mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-600" />
          START YOUR BRAND
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-950 tracking-tight leading-tight">
          Turn your idea into a brand.
        </h1>
        <p className="mt-2.5 text-base text-ink-700 max-w-2xl leading-relaxed">
          Describe your idea. Build a brand identity, messaging, and launch-ready brand kit through a structured AI workflow.
        </p>

        {/* Quick Demo Inspirations */}
        <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-ink-500">Quick-start templates:</span>
          {SAMPLE_IDEAS.map((sample) => (
            <button
              key={sample.label}
              type="button"
              onClick={() => applySampleIdea(sample)}
              className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white border border-border text-accent-600 hover:bg-accent-100 hover:border-accent-600/30 transition-all shadow-2xs"
            >
              ✦ {sample.label}
            </button>
          ))}
        </div>
      </header>

      {/* ─── Main Form ─────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} noValidate aria-label="Idea input form" className="space-y-6">
        <div className="card p-6 sm:p-7 space-y-5 bg-white border-border/90 shadow-sm">
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
                className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-full bg-surface-100 ${wordCountColor}`}
                aria-live="polite"
                aria-label={`${wordCount} words`}
              >
                {wordCount} / 500 words
              </span>
            </div>

            <p className="text-xs text-ink-500 mb-2.5" id="idea-description-hint">
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
              rows={5}
              placeholder="e.g. An on-demand, zero-emission cargo bike logistics network for independent neighborhood bakeries, cafes, and boutique retailers who need same-day delivery without paying predatory marketplace commissions."
              className={[
                'w-full rounded-lg border px-4 py-3 text-sm text-ink-950 placeholder:text-ink-400 resize-y leading-relaxed',
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
              <p id="idea-description-error" role="alert" className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                <span>⚠</span> {errors.description}
              </p>
            )}
          </div>

          {/* User-provided facts notice banner */}
          <div className="flex items-start gap-2.5 p-3.5 bg-accent-100/70 rounded-lg border border-accent-600/20 text-xs text-accent-700 font-medium">
            <span aria-hidden="true" className="text-accent-600 font-bold mt-0.5">ℹ</span>
            <span>
              Everything you enter here is stored as <strong>user-provided facts</strong> — clearly separated from downstream AI assumptions and never silently altered.
            </span>
          </div>
        </div>

        {/* ─── Collapsible Optional Context ────────────────────────────── */}
        <div className="card p-5 sm:p-6 bg-white border-border/90 shadow-sm transition-all">
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="w-full flex items-center justify-between text-sm font-bold text-ink-800 hover:text-ink-950 transition-colors"
            aria-expanded={showOptional}
            aria-controls="optional-context-fields"
            aria-label="Toggle optional context and constraints"
          >
            <div className="flex items-center gap-2.5">
              <span
                className="w-5 h-5 rounded-md bg-surface-100 border border-border flex items-center justify-center text-xs text-ink-600 transition-transform duration-200"
                aria-hidden="true"
                style={{ transform: showOptional ? 'rotate(90deg)' : 'none' }}
              >
                ›
              </span>
              <span>Optional context{showOptional ? '' : ' (expand)'}</span>
            </div>
            <span className="text-xs font-normal text-ink-500">
              {showOptional ? 'Click to collapse' : 'Add audience, category, constraints'}
            </span>
          </button>

          {showOptional && (
            <div id="optional-context-fields" className="mt-4 pt-4 border-t border-border/70 space-y-4">
              <p className="text-xs text-ink-500">
                These optional parameters provide initial boundaries for the Strategist. They remain user-provided facts.
              </p>

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

              <div className="grid sm:grid-cols-2 gap-4">
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
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Submit Action Bar ────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-ink-500 hidden sm:block">
            Step 1 of 10: Initializes Strategist analysis and facts vs assumptions separation.
          </p>
          <button
            type="submit"
            id="btn-start-discovery"
            disabled={!description.trim()}
            className="btn-primary w-full sm:w-auto px-7 py-3 text-sm font-semibold tracking-wide disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all"
            aria-label="Start Discovery — begin the brand-building workflow"
          >
            Start Discovery →
          </button>
        </div>
      </form>
    </div>
  );
}
