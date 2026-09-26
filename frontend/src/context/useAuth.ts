import { useContext } from 'react';
import { AuthContext, type AuthContextType } from './authContextInstance';

const fallbackAuth: AuthContextType = {
  user: null,
  session: null,
  loading: false,
  isConfigured: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  resetPassword: async () => ({ error: null }),
  updatePassword: async () => ({ error: null }),
  resendVerification: async () => ({ error: null }),
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  return context ?? fallbackAuth;
}
