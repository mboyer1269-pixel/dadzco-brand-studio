import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Login = () => {
  const { signInWithCode, signInWithMagicLink } = useAuth();
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const { error } = signInWithCode(code.trim());
    if (error) setError(error.message);
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await signInWithMagicLink(email.trim());
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setMagicLinkSent(true);
    }
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

        <Tabs defaultValue="code" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="code" className="font-body text-xs">Code d'accès</TabsTrigger>
            <TabsTrigger value="email" className="font-body text-xs">Email</TabsTrigger>
          </TabsList>

          <TabsContent value="code">
            <form onSubmit={handleCodeSubmit} className="space-y-6">
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
                  onChange={(e) => { setCode(e.target.value); setError(""); }}
                  placeholder="••••"
                  required
                  className="bg-card border-border font-body text-center text-2xl tracking-[0.5em]"
                  autoComplete="off"
                />
              </div>
              {error && <p className="text-xs text-destructive font-body">{error}</p>}
              <Button type="submit" className="w-full font-body text-xs tracking-wider uppercase">
                Entrer
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="email">
            {magicLinkSent ? (
              <div className="text-center space-y-3 py-4">
                <p className="text-sm font-body text-foreground">✓ Lien envoyé à {email}</p>
                <p className="text-xs text-muted-foreground font-body">Vérifiez votre boîte mail et cliquez sur le lien.</p>
                <Button variant="ghost" size="sm" onClick={() => setMagicLinkSent(false)} className="font-body text-xs">
                  Renvoyer
                </Button>
              </div>
            ) : (
              <form onSubmit={handleMagicLink} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-xs font-body font-medium tracking-wider uppercase text-muted-foreground mb-2">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    placeholder="admin@dadzco.com"
                    required
                    className="bg-card border-border font-body"
                    autoComplete="email"
                  />
                </div>
                {error && <p className="text-xs text-destructive font-body">{error}</p>}
                <Button type="submit" disabled={loading} className="w-full font-body text-xs tracking-wider uppercase">
                  {loading ? "Envoi…" : "Envoyer le lien magique"}
                </Button>
              </form>
            )}
          </TabsContent>
        </Tabs>

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
