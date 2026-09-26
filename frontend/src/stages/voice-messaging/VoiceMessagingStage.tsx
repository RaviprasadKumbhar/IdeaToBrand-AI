import { GenericStage } from '../../components/GenericStage';

interface SampleMessage { message: string; explanation: string; }

export function VoiceMessagingStage() {
  return (
    <GenericStage stage="voice_messaging" stageNumber={6} title="Voice + Messaging"
      description="Brand voice description, tone, do/don't guidelines, and sample messages.">
      {(content) => (
        <div className="space-y-5">
          <div>
            <p className="section-label mb-1">Voice Description</p>
            <p className="text-base text-ink-950 font-medium">{content.voice_description as string}</p>
          </div>
          <div>
            <p className="section-label mb-2">Tone Characteristics</p>
            <div className="flex flex-wrap gap-2">
              {(content.tone_characteristics as string[] ?? []).map((t, i) => (
                <span key={i} className="badge-approved px-3 py-1.5 text-sm">{t}</span>
              ))}
            </div>
          </div>
          {/* Do / Don't — two-column */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="section-label text-green-700 mb-2">Do</p>
              <ul className="space-y-1">
                {(content.do_list as string[] ?? []).map((d, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink-950"><span className="text-green-600 font-bold">✓</span>{d}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="section-label text-red-600 mb-2">Don't</p>
              <ul className="space-y-1">
                {(content.dont_list as string[] ?? []).map((d, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink-950"><span className="text-red-500 font-bold">✕</span>{d}</li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            <p className="section-label mb-3">Sample Messages</p>
            <div className="space-y-3">
              {(content.sample_messages as SampleMessage[] ?? []).map((msg, i) => (
                <div key={i} className="border border-border rounded-md p-4">
                  <p className="text-sm font-semibold text-ink-950 mb-1">"{msg.message}"</p>
                  <p className="text-xs text-ink-500">{msg.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </GenericStage>
  );
}
