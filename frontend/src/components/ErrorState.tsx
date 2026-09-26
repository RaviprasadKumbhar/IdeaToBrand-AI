/**
 * ErrorState -- honest error display (design.md s 34).
 * NEVER displays fake success. Never substitutes content silently.
 */
import type { StageErrorResponse } from '../../../shared/types';

interface ErrorStateProps {
  error: StageErrorResponse;
  onRetry: () => void;
  onBack?: () => void;
}

export function ErrorState({ error, onRetry, onBack }: ErrorStateProps) {
  const isRetryable = error.retryable;

  return (
    <div
      className="card border-red-200 p-6 space-y-4"
      role="alert"
      aria-live="assertive"
    >
      {/* Header row */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 text-lg font-bold" aria-hidden="true">
          X
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-semibold text-red-800 leading-snug">
            {error.error_type === 'schema_validation_failed'
              ? 'The generated response did not match the required structure'
              : 'Generation failed'}
          </h2>
          <p className="text-sm text-red-700 mt-1 leading-relaxed">
            {error.message}
          </p>
        </div>
      </div>

      {/* Safe-state notice */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-surface-100 border border-border rounded-sm">
        <span className="text-ink-500 text-sm" aria-hidden="true">lock</span>
        <p className="text-xs text-ink-600">
          Your existing approved decisions are safe. Nothing was silently substituted.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {isRetryable && (
          <button
            id="btn-retry-error"
            onClick={onRetry}
            className="btn-primary text-sm"
            aria-label="Try generating again"
          >
            Try Again
          </button>
        )}
        {onBack && (
          <button
            id="btn-back-error"
            onClick={onBack}
            className="btn-secondary text-sm"
            aria-label="Return to previous stage"
          >
            Return to Previous Stage
          </button>
        )}
      </div>
    </div>
  );
}
