/**
 * IdeaInput — T-014: Idea Input flow (design.md § 13).
 * Captures business description, user-provided facts, constraints, context.
 * USER INPUT IS STORED AS USER INPUT — never silently converted to AI facts.
 * Validates: 1–500 words; accessible labels; empty/error states.
 */
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFOILStore } from '../../store/foilStore';
import type { IdeaInput as IdeaInputType } from '../../../../shared/types';

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

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
    : wordCount > 500 ? 'text-red-600'
    : wordCount > 400 ? 'text-amber-600'
    : 'text-green-600';

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!description.trim()) {
      newErrors.description = 'Please describe your idea or business.';
    } else if (wordCount < 5) {
      newErrors.description = 'Please provide at least 5 words so FOIL has enough to work with.';
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

    // Store as user_facts — explicitly user-provided, never mixed with ai_assumptions
    setIdeaInput(input);
    navigate('/discovery');
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Page header */}
      <header className="mb-10">
        <p className="section-label mb-2">Start your brand</p>
        <h1 className="text-h1 text-ink-950 font-bold mb-3">Tell FOIL about your idea.</h1>
        <p className="text-body text-ink-500">
          Describe what you're building — a product, service, or venture.
          FOIL will run it through a staged, adversarially-checked brand-building process.
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate aria-label="Idea input form">
        {/* ─── Main description ─────────────────────────────────────────── */}
        <div className="card p-6 mb-6 space-y-4">
          <div>
            <label
              htmlFor="idea-description"
              className="block text-sm font-semibold text-ink-950 mb-1"
            >
              Your idea or business description
              <span className="text-red-500 ml-1" aria-hidden="true">*</span>
            </label>
            <p className="text-xs text-ink-500 mb-2" id="idea-description-hint">
              Use your own words. FOIL will keep this as a user-provided fact — it will not be converted into an AI assumption.
              (5–500 words)
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
              placeholder="e.g. An app that helps university students find compatible teammates for class projects, matching them by skills, schedule, and working style rather than random assignment."
              className={[
                'w-full rounded-md border px-4 py-3 text-sm text-ink-950 placeholder:text-ink-500 resize-y',
                'focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 transition-colors',
                errors.description ? 'border-red-400 bg-red-50/30' : 'border-border bg-white',
              ].join(' ')}
              aria-required="true"
              aria-describedby="idea-description-hint idea-description-error"
              aria-invalid={!!errors.description}
              minLength={1}
              maxLength={4000}
            />
            {/* Word count */}
            <div className="flex justify-between items-center mt-1.5">
              <span id="idea-description-error" role="alert" aria-live="polite">
                {errors.description && (
                  <span className="text-xs text-red-600">{errors.description}</span>
                )}
              </span>
              <span className={`text-xs font-medium ${wordCountColor}`} aria-live="polite" aria-label={`${wordCount} words`}>
                {wordCount} / 500 words
              </span>
            </div>
          </div>

          {/* ─── User-provided facts notice ─────────────────────────────── */}
          <div className="flex items-start gap-2 p-3 bg-accent-100 rounded-sm border border-accent-600/20 text-xs text-accent-600">
            <span aria-hidden="true">ℹ</span>
            <span>
              Everything you enter here is stored as <strong>user-provided facts</strong> — clearly
              separate from anything FOIL infers or assumes later.
            </span>
          </div>
        </div>

        {/* ─── Optional context ─────────────────────────────────────────── */}
        <div className="card p-6 mb-8">
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="flex items-center gap-2 text-sm font-semibold text-ink-700 hover:text-ink-950 transition-colors mb-0"
            aria-expanded={showOptional}
            aria-controls="optional-context-fields"
          >
            <span
              className="w-5 h-5 rounded border border-border flex items-center justify-center text-xs transition-transform"
              aria-hidden="true"
              style={{ transform: showOptional ? 'rotate(90deg)' : 'none' }}
            >
              ›
            </span>
            Optional context{showOptional ? '' : ' (expand)'}
          </button>

          {showOptional && (
            <div id="optional-context-fields" className="mt-4 space-y-4">
              <p className="text-xs text-ink-500">
                These fields are optional. If provided, they are stored as explicit user facts —
                not inferred by the AI.
              </p>

              <div>
                <label htmlFor="idea-audience" className="block text-sm font-medium text-ink-700 mb-1">
                  Target audience
                </label>
                <input
                  id="idea-audience"
                  type="text"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="e.g. University students aged 18–26"
                  className="w-full rounded border border-border px-3 py-2 text-sm text-ink-950 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-accent-600 transition-colors bg-white"
                  aria-describedby="audience-hint"
                />
                <p id="audience-hint" className="text-xs text-ink-500 mt-1">
                  Who is this for? (user-provided — will not be overwritten by AI)
                </p>
              </div>

              <div>
                <label htmlFor="idea-category" className="block text-sm font-medium text-ink-700 mb-1">
                  Category or industry
                </label>
                <input
                  id="idea-category"
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. EdTech, B2C SaaS"
                  className="w-full rounded border border-border px-3 py-2 text-sm text-ink-950 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-accent-600 transition-colors bg-white"
                />
              </div>

              <div>
                <label htmlFor="idea-constraints" className="block text-sm font-medium text-ink-700 mb-1">
                  Constraints or context
                </label>
                <input
                  id="idea-constraints"
                  type="text"
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  placeholder="e.g. Must integrate with university SSO, no paid tiers initially"
                  className="w-full rounded border border-border px-3 py-2 text-sm text-ink-950 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-accent-600 transition-colors bg-white"
                />
                <p className="text-xs text-ink-500 mt-1">
                  Known limitations, requirements, or positioning constraints.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ─── Submit ────────────────────────────────────────────────────── */}
        <div className="flex justify-end gap-4">
          <button
            type="submit"
            id="btn-start-discovery"
            disabled={!description.trim()}
            className="btn-primary px-6 py-3 text-base disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Start Discovery — begin the FOIL brand-building workflow"
          >
            Start Discovery →
          </button>
        </div>
      </form>
    </div>
  );
}
