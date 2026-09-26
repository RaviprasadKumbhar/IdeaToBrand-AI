/**
 * ProtectedRoute — Guards authenticated FOIL routes.
 * Architecture & Security Requirements § 8:
 * Strictly verifies that a user is both authenticated AND has confirmed their email.
 * - Unauthenticated users are redirected to /login with state preservation.
 * - Unverified users are redirected to /verify-email.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, isUserEmailConfirmed } from '../context/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-paper-50 gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-accent-600 border-t-transparent animate-spin" />
        <p className="text-xs font-medium text-ink-500">Checking secure session...</p>
      </div>
    );
  }

  // 1. Must have an authenticated Supabase user
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Email verification is mandatory before accessing protected FOIL functionality
  if (!isUserEmailConfirmed(user)) {
    return <Navigate to="/verify-email" state={{ email: user.email, from: location }} replace />;
  }

  return <>{children}</>;
}
