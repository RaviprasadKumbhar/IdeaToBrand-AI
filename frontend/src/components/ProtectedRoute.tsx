/**
 * ProtectedRoute — Guards authenticated routes.
 * Redirects unauthenticated visitors to /login while preserving destination.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-paper-50 gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-accent-600 border-t-transparent animate-spin" />
        <p className="text-xs font-medium text-ink-500">Checking session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
