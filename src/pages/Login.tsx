import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

function mapAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "Courriel ou mot de passe invalide.";
  if (m.includes("email not confirmed")) return "Veuillez confirmer votre courriel avant de vous connecter.";
  if (m.includes("rate") || m.includes("too many")) return "Trop de tentatives. Réessayez dans quelques minutes.";
  return "Connexion impossible pour le moment. Réessayez.";
}

const Login = () => {
  const { signInWithMagicLink, signInWithPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"password" | "magic">("password");

  const clearError = () => setError("");

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLoading(true);
    const { error: err } = await signInWithPassword(email.trim(), password);
    setLoading(false);
    if (err) setError(mapAuthError(err.message));
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLoading(true);
    const { error: err } = await signInWithMagicLink(email.trim());
    setLoading(false);
    if (err) {
      setError(mapAuthError(err.message));
    } else {
      setMagicLinkSent(true);
    }
  };

  const switchMode = (next: "password" | "magic") => {
    setMode(next);
    clearError();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <div className="mb-12 text-center">
          <h1 className="font-display text-4xl font-light tracking-wide text-foreground">
            DADZCO
          </h1>
          <p className="mt-1 font-display text-lg tracking-widest text-muted-foreground">
            BRAND OS
          </p>
        </div>

        {magicLinkSent ? (
          <div className="text-center space-y-3 py-4">
            <p className="text-sm font-body text-foreground">Lien envoyé à {email}</p>
            <p className="text-xs text-muted-foreground font-body">Vérifiez votre boîte mail et cliquez sur le lien.</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setMagicLinkSent(false); switchMode("password"); }}
              className="font-body text-xs"
            >
              Retour
            </Button>
          </div>
        ) : mode === "password" ? (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-body font-medium tracking-wider uppercase text-muted-foreground mb-2">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError(); }}
                placeholder="admin@dadzco.com"
                required
                className="bg-card border-border font-body"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-body font-medium tracking-wider uppercase text-muted-foreground mb-2">
                Mot de passe
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError(); }}
                required
                className="bg-card border-border font-body"
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-xs text-destructive font-body">{error}</p>}
            <div className="space-y-3 pt-2">
              <Button type="submit" disabled={loading} className="w-full font-body text-xs tracking-wider uppercase">
                {loading ? "Connexion…" : "Connexion"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={loading}
                onClick={() => switchMode("magic")}
                className="w-full font-body text-xs tracking-wider uppercase"
              >
                Recevoir un lien magique
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div>
              <label htmlFor="email-magic" className="block text-xs font-body font-medium tracking-wider uppercase text-muted-foreground mb-2">
                Email
              </label>
              <Input
                id="email-magic"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError(); }}
                placeholder="admin@dadzco.com"
                required
                className="bg-card border-border font-body"
                autoComplete="email"
              />
            </div>
            {error && <p className="text-xs text-destructive font-body">{error}</p>}
            <div className="space-y-3 pt-2">
              <Button type="submit" disabled={loading} className="w-full font-body text-xs tracking-wider uppercase">
                {loading ? "Envoi…" : "Envoyer le lien magique"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={loading}
                onClick={() => switchMode("password")}
                className="w-full font-body text-xs tracking-wider uppercase"
              >
                Connexion par mot de passe
              </Button>
            </div>
          </form>
        )}

        <p className="text-center text-xs text-muted-foreground font-body mt-6">
          Accès privé · Administrateurs autorisés uniquement
        </p>

        <div className="mt-16 text-center">
          <p className="text-[10px] tracking-widest uppercase text-muted-foreground font-body">
            DADZCO | MUMZCO | APPAREL
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
