import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

const Login = () => {
  const { signInWithCode } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const { error } = signInWithCode(code.trim());
    if (error) setError(error.message);
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="code" className="block text-xs font-body font-medium tracking-wider uppercase text-muted-foreground mb-2">
              Code d'accès
            </label>
            <Input
              id="code"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="••••"
              required
              className="bg-card border-border font-body text-center text-2xl tracking-[0.5em]"
              autoComplete="off"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive font-body">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full font-body text-xs tracking-wider uppercase"
          >
            Entrer
          </Button>

          <p className="text-center text-xs text-muted-foreground font-body">
            Accès privé · Administrateurs autorisés uniquement
          </p>
        </form>

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
