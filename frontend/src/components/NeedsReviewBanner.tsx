/**
 * NeedsReviewBanner — shown when upstream change affects this stage (design.md § 23).
 * Does NOT auto-regenerate. User must explicitly review.
 */
interface NeedsReviewBannerProps {
  cause: string;
  onReview: () => void;
}

export function NeedsReviewBanner({ cause, onReview }: NeedsReviewBannerProps) {
  return (
    <div
      className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-md"
      role="status"
      aria-live="polite"
    >
      <span className="text-amber-600 text-lg mt-0.5" aria-hidden="true">⚠</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800">Needs Review</p>
        <p className="text-sm text-amber-700 mt-0.5">
          This stage may be affected by a change to: <strong>{cause}</strong>.
          Your current approved value is preserved until you explicitly update it.
        </p>
      </div>
      <button
        id="btn-review-impact"
        onClick={onReview}
        className="flex-shrink-0 btn-secondary text-xs border-amber-300 hover:border-amber-400"
        aria-label={`Review impact from ${cause} change`}
      >
        Review Impact
      </button>
    </div>
  );
}
