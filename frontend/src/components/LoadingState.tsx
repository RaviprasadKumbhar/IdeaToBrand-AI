/**
 * LoadingState — stage-specific loading UI (design.md § 32).
 * Never uses fake progress percentages.
 */
import type { StageName } from '../../../shared/types';

interface LoadingStateProps {
  stage: StageName;
}

const LOADING_MESSAGES: Record<StageName, { title: string; bullets: string[] }> = {
  discovery: {
    title: 'Analyzing your idea…',
    bullets: ['core problem', 'target audience', 'context', 'goals', 'constraints', 'assumptions'],
  },
  positioning: {
    title: 'Generating strategic directions…',
    bullets: ['researching differentiation', 'forming 2+ divergent directions', 'running Critic analysis'],
  },
  naming_personality: {
    title: 'Developing naming directions…',
    bullets: ['naming territories', 'personality traits', 'brand principles', 'Critic evaluation'],
  },
  tagline_pitch: {
    title: 'Crafting tagline options…',
    bullets: ['generating tagline options', 'interchangeability check', 'one-line pitch'],
  },
  visual_brief: {
    title: 'Building visual direction…',
    bullets: ['color palette', 'typography', 'shape language', 'imagery direction'],
  },
  voice_messaging: {
    title: 'Defining brand voice…',
    bullets: ['voice description', 'tone characteristics', 'do/don\'t guidelines', 'sample messages'],
  },
  launch_prep: {
    title: 'Preparing launch content…',
    bullets: ['landing headline', 'social launch post', 'Critic evaluation'],
  },
  consistency_audit: {
    title: 'Running Holistic Consistency Audit…',
    bullets: ['checking name ↔ positioning', 'tagline ↔ personality', 'visuals ↔ audience', 'voice ↔ launch content'],
  },
  kit_export: {
    title: 'Assembling brand kit…',
    bullets: ['collecting approved decisions', 'validating completeness', 'formatting export'],
  },
};

export function LoadingState({ stage }: LoadingStateProps) {
  const { title, bullets } = LOADING_MESSAGES[stage] ?? {
    title: 'Generating…',
    bullets: [],
  };

  return (
    <div
      className="card p-8 flex flex-col items-center gap-6 text-center"
      role="status"
      aria-live="polite"
      aria-label={title}
    >
      {/* Animated spinner */}
      <div className="relative flex items-center justify-center">
        <div
          className="w-12 h-12 rounded-full border-2 border-accent-100 border-t-accent-600 animate-spin"
          aria-hidden="true"
        />
        <span className="absolute text-accent-600 text-lg" aria-hidden="true">✶</span>
      </div>

      <div className="max-w-xs">
        <p className="text-h3 text-ink-950 font-semibold mb-1">{title}</p>
        <p className="text-xs text-ink-500 mb-4">FOIL is organizing the information into:</p>
        <ul className="text-sm text-ink-700 space-y-2 text-left">
          {bullets.map((b, i) => (
            <li key={b} className="flex items-center gap-2.5">
              <span
                className="w-2 h-2 rounded-full bg-accent-600 flex-shrink-0 animate-pulse"
                style={{ animationDelay: `${i * 150}ms` }}
                aria-hidden="true"
              />
              <span className="text-ink-700">{b}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-[11px] text-ink-400 italic">
        Using only approved decisions from previous stages
      </p>
    </div>
  );
}
