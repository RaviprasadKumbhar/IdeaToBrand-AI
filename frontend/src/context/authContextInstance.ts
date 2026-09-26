import { createContext } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | Error | null; requiresVerification?: boolean; email?: string }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | Error | null; requiresVerification?: boolean; session?: Session | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | Error | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | Error | null }>;
  resendVerification: (email: string) => Promise<{ error: AuthError | Error | null }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
