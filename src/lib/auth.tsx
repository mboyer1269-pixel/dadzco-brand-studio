import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

const ACCESS_CODE = "0413";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithCode: (code: string) => { error: Error | null };
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const defaultCtx: AuthContextType = {
  user: null,
  session: null,
  isAdmin: false,
  isLoading: true,
  isAuthenticated: false,
  signInWithCode: () => ({ error: new Error("AuthProvider not ready") }),
  signInWithMagicLink: async () => ({ error: new Error("AuthProvider not ready") }),
  signOut: async () => {},
};

const AuthContext = createContext<AuthContextType>(defaultCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCodeAuthenticated, setIsCodeAuthenticated] = useState(() => {
    return sessionStorage.getItem("dadzco_auth") === "true";
  });

  const isAdmin = !!user || isCodeAuthenticated;
  const isAuthenticated = !!session || isCodeAuthenticated;

  useEffect(() => {
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setIsLoading(false);
      }
    );

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithCode = (code: string) => {
    if (code === ACCESS_CODE) {
      setIsCodeAuthenticated(true);
      sessionStorage.setItem("dadzco_auth", "true");
      return { error: null };
    }
    return { error: new Error("Code incorrect.") };
  };

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    setIsCodeAuthenticated(false);
    sessionStorage.removeItem("dadzco_auth");
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isLoading, isAuthenticated, signInWithCode, signInWithMagicLink, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
