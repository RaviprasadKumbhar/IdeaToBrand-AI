import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { IdeaInput } from './stages/idea-input/IdeaInput';
import { DiscoveryStage } from './stages/discovery/DiscoveryStage';
import { PositioningStage } from './stages/positioning/PositioningStage';
import { NamingPersonalityStage } from './stages/naming-personality/NamingPersonalityStage';
import { TaglinePitchStage } from './stages/tagline-pitch/TaglinePitchStage';
import { VisualBriefStage } from './stages/visual-brief/VisualBriefStage';
import { VoiceMessagingStage } from './stages/voice-messaging/VoiceMessagingStage';
import { LaunchPrepStage } from './stages/launch-prep/LaunchPrepStage';
import { ConsistencyAuditStage } from './stages/consistency-audit/ConsistencyAuditStage';
import { KitExportStage } from './stages/kit-export/KitExportStage';

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <p className="text-5xl font-bold text-ink-950">404</p>
      <p className="text-body text-ink-500">Page not found.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/"                    element={<IdeaInput />} />
          <Route path="/discovery"           element={<DiscoveryStage />} />
          <Route path="/positioning"         element={<PositioningStage />} />
          <Route path="/naming-personality"  element={<NamingPersonalityStage />} />
          <Route path="/tagline-pitch"       element={<TaglinePitchStage />} />
          <Route path="/visual-brief"        element={<VisualBriefStage />} />
          <Route path="/voice-messaging"     element={<VoiceMessagingStage />} />
          <Route path="/launch-prep"         element={<LaunchPrepStage />} />
          <Route path="/consistency-audit"   element={<ConsistencyAuditStage />} />
          <Route path="/export"              element={<KitExportStage />} />
          <Route path="*"                    element={<NotFound />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
