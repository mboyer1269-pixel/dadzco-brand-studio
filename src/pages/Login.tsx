import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

const Login = () => {
  const { signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const { error } = await signInWithMagicLink(email.trim());
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
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

        {status === "sent" ? (
          <div className="text-center animate-fade-in">
            <div className="mb-4 h-px w-12 mx-auto bg-secondary" />
            <p className="font-body text-sm text-foreground">
              Magic link sent to <span className="font-medium">{email}</span>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Check your inbox and click the link to sign in.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-xs font-body font-medium tracking-wider uppercase text-muted-foreground mb-2">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dadzco.brand@gmail.com"
                required
                className="bg-card border-border font-body"
                autoComplete="email"
              />
            </div>

            {status === "error" && (
              <p className="text-xs text-destructive font-body">{errorMsg}</p>
            )}

            <Button
              type="submit"
              disabled={status === "sending"}
              className="w-full font-body text-xs tracking-wider uppercase"
            >
              {status === "sending" ? "Sending…" : "Sign In with Magic Link"}
            </Button>

            <p className="text-center text-xs text-muted-foreground font-body">
              Private access · Authorized administrators only
            </p>
          </form>
        )}

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
