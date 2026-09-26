import { GenericStage } from '../../components/GenericStage';

export function LaunchPrepStage() {
  return (
    <GenericStage stage="launch_prep" stageNumber={7} title="Launch Prep"
      description="Landing headline and social launch post — checked against your approved brand system.">
      {(content) => (
        <div className="space-y-5">
          <div>
            <p className="section-label mb-2">Landing Headline</p>
            <div className="p-5 bg-ink-950 rounded-md text-center">
              <p className="text-2xl font-bold text-white leading-snug">{content.landing_headline as string}</p>
            </div>
          </div>
          <div>
            <p className="section-label mb-2">Social Launch Post</p>
            <div className="border border-border rounded-md p-4 bg-surface-100 whitespace-pre-wrap text-sm text-ink-950">
              {content.social_launch_post as string}
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 bg-accent-100 border border-accent-600/20 rounded-sm text-xs text-accent-600">
            <span aria-hidden="true">ℹ</span>
            <span>Launch Prep must be approved before the Holistic Consistency Audit can run.</span>
          </div>
        </div>
      )}
    </GenericStage>
  );
}
