/**
 * App — Root Application with Supabase AuthProvider, Public Landing & Auth Pages,
 * and Authenticated Stage Workspace (AppShell).
 */
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
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
import { ScenarioProbePage } from './stages/scenario-probe/ScenarioProbePage';

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-20 px-4 gap-4 text-center bg-paper-50 font-sans">
      <p className="text-6xl font-extrabold text-ink-950">404</p>
      <h2 className="text-xl font-bold text-ink-800">Page not found</h2>
      <p className="text-sm text-ink-500 max-w-sm">
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="pt-2 flex items-center gap-3">
        <Link to="/" className="btn-secondary text-xs px-4 py-2">
          ← Back to Home
        </Link>
        <Link to="/workspace" className="btn-primary text-xs px-4 py-2">
          Open Workspace
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Landing & Authentication */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Authenticated Workspace: Main Idea Canvas */}
          <Route
            path="/workspace"
            element={
              <ProtectedRoute>
                <AppShell>
                  <IdeaInput />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route path="/idea-input" element={<Navigate to="/workspace" replace />} />
          <Route path="/chat" element={<Navigate to="/workspace" replace />} />
          <Route path="/app" element={<Navigate to="/workspace" replace />} />

          {/* Deep-Dive Stage Views */}
          <Route
            path="/discovery"
            element={
              <ProtectedRoute>
                <AppShell>
                  <DiscoveryStage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/positioning"
            element={
              <ProtectedRoute>
                <AppShell>
                  <PositioningStage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/naming-personality"
            element={
              <ProtectedRoute>
                <AppShell>
                  <NamingPersonalityStage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tagline-pitch"
            element={
              <ProtectedRoute>
                <AppShell>
                  <TaglinePitchStage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/visual-brief"
            element={
              <ProtectedRoute>
                <AppShell>
                  <VisualBriefStage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/voice-messaging"
            element={
              <ProtectedRoute>
                <AppShell>
                  <VoiceMessagingStage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/launch-prep"
            element={
              <ProtectedRoute>
                <AppShell>
                  <LaunchPrepStage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/consistency-audit"
            element={
              <ProtectedRoute>
                <AppShell>
                  <ConsistencyAuditStage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/scenario-probe"
            element={
              <ProtectedRoute>
                <AppShell>
                  <ScenarioProbePage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/export"
            element={
              <ProtectedRoute>
                <AppShell>
                  <KitExportStage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* Catch-All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
