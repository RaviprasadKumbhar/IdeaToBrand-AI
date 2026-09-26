/**
 * ErrorState — honest error display (design.md § 34).
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
      className="card border-red-200 bg-red-50/50 p-8 flex flex-col items-center gap-4 text-center"
      role="alert"
      aria-live="assertive"
    >
      <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600 text-xl" aria-hidden="true">
        ✕
      </div>

      <div>
        <h2 className="text-h3 text-red-800 font-semibold mb-1">
          {error.error_type === 'schema_validation_failed'
            ? 'The generated response did not match the required structure'
            : 'Generation failed'}
        </h2>
        <p className="text-sm text-red-700 max-w-sm">
          {error.message}
        </p>
        <p className="text-sm text-ink-500 mt-2">
          Your existing approved decisions are safe. Nothing was silently substituted.
        </p>
      </div>

      <div className="flex gap-3">
        {isRetryable && (
          <button
            id="btn-retry-error"
            onClick={onRetry}
            className="btn-primary"
            aria-label="Try generating again"
          >
            Try Again
          </button>
        )}
        {onBack && (
          <button
            id="btn-back-error"
            onClick={onBack}
            className="btn-secondary"
            aria-label="Return to previous stage"
          >
            Return to Previous Stage
          </button>
        )}
      </div>
    </div>
  );
}
