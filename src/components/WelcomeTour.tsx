import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles, FolderOpen, PenTool, X } from "lucide-react";

const TOUR_KEY = "dadzco-tour-seen";

const steps = [
  {
    icon: Sparkles,
    title: "Create with AI",
    desc: "Generate brand-aligned designs with DNA validation. Your palette, your rules.",
  },
  {
    icon: FolderOpen,
    title: "Build Collections",
    desc: "Capsule wizard: 4 Quiet + 3 Funny + 1 Hero Buzz. Auto pricing & margins.",
  },
  {
    icon: PenTool,
    title: "Tell Your Story",
    desc: "Écho & Rire narratives, Shopify copy, TikTok captions — all generated per SKU.",
  },
];

export function WelcomeTour() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(TOUR_KEY, "true");
  };

  const next = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else dismiss();
  };

  if (!visible) return null;

  const current = steps[step];

  return (
    <AnimatePresence>
      <motion.div
        key="tour-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm px-4"
      >
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -12 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative w-full max-w-sm rounded-lg border border-border bg-card p-8 text-center shadow-xl"
        >
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-lavande/20">
            <current.icon className="h-6 w-6 text-foreground" />
          </div>

          <h3 className="font-display text-xl font-light text-foreground mb-2">
            {current.title}
          </h3>
          <p className="text-sm text-muted-foreground font-body leading-relaxed">
            {current.desc}
          </p>

          <div className="flex items-center justify-center gap-1.5 my-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === step ? "w-6 bg-foreground" : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>

          <Button
            onClick={next}
            className="w-full font-body text-xs tracking-wider uppercase h-10"
          >
            {step < steps.length - 1 ? "Next" : "Get Started"}
          </Button>

          {step < steps.length - 1 && (
            <button
              onClick={dismiss}
              className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors font-body"
            >
              Skip tour
            </button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
