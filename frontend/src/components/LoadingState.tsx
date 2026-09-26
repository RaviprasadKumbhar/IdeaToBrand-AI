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
      className="card p-8 flex flex-col items-center gap-5 text-center"
      role="status"
      aria-live="polite"
      aria-label={title}
    >
      {/* Spinner */}
      <div
        className="w-10 h-10 rounded-full border-2 border-accent-100 border-t-accent-600 animate-spin"
        aria-hidden="true"
      />

      <div>
        <p className="text-h3 text-ink-950 font-semibold mb-3">{title}</p>
        <p className="text-sm text-ink-500 mb-3">FOIL is organizing the information into:</p>
        <ul className="text-sm text-ink-700 space-y-1 text-left inline-block">
          {bullets.map((b) => (
            <li key={b} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-600 flex-shrink-0" aria-hidden="true" />
              {b}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
