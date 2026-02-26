import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

const ADMIN_EMAIL = "dadzco.brand@gmail.com";
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCodeAuthenticated, setIsCodeAuthenticated] = useState(() => {
    return sessionStorage.getItem("dadzco_auth") === "true";
  });

  const isAdmin = isCodeAuthenticated || user?.email === ADMIN_EMAIL;
  const isAuthenticated = isCodeAuthenticated || !!user;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
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
    if (email.toLowerCase() !== ADMIN_EMAIL) {
      return { error: new Error("Access restricted.") };
    }
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
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
