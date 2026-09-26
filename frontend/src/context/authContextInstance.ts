import { createContext } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | Error | null }>;
  signOut: () => Promise<void>;
  signInDemo: (email?: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
