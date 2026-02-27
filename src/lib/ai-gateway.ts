// DADZCO Brand OS V2 — AI Gateway Client Service
// Routes tasks to the centralized AI Gateway Manager

import { supabase } from "@/integrations/supabase/client";

export type AITaskType = "strategy" | "storytelling" | "mockup" | "production" | "scoring" | "general";

export interface AIGatewayResponse {
  content: string;
  model: string;
  provider: string;
  fallback: boolean;
  fallbackFrom: string | null;
  usage: { input: number; output: number };
  estimatedCost: number;
  durationMs: number;
}

export interface ScoringResult {
  adn_alignment: number;
  anti_kitsch_compliance: number;
  market_differentiation: number;
  viral_potential: number;
  pod_feasibility: number;
  margin_strength: number;
  final_score: number;
  notes?: string;
}

export interface GateResult {
  passed: boolean;
  gate: string;
  message: string;
  value?: number;
  threshold?: number;
}

export interface LifecycleTransitionResult {
  allowed: boolean;
  previousStatus?: string;
  newStatus?: string;
  gates?: GateResult[];
  blockedBy?: GateResult[];
  forced?: boolean;
  error?: string;
}

export const LIFECYCLE_STATUSES = [
  { id: "idea", label: "Idée", color: "bg-muted" },
  { id: "strategy_review", label: "Revue Stratégique", color: "bg-blue-500/20" },
  { id: "mockup_stage", label: "Mockup Preview", color: "bg-amber-500/20" },
  { id: "approved_for_production", label: "Approuvé Production", color: "bg-green-500/20" },
  { id: "in_production", label: "En Production", color: "bg-purple-500/20" },
  { id: "ready_for_export", label: "Prêt Export", color: "bg-emerald-500/20" },
  { id: "exported", label: "Exporté", color: "bg-primary/20" },
] as const;

/**
 * Send a task through the AI Gateway Manager.
 * Automatically routes to the best model with fallback.
 */
export async function callAIGateway(
  taskType: AITaskType,
  messages: Array<{ role: string; content: string }>,
  options?: {
    temperature?: number;
    max_tokens?: number;
    response_format?: unknown;
    collectionId?: string;
    designId?: string;
  }
): Promise<AIGatewayResponse> {
  const { data, error } = await supabase.functions.invoke("ai-gateway", {
    body: {
      taskType,
      messages,
      options: {
        temperature: options?.temperature,
        max_tokens: options?.max_tokens,
        response_format: options?.response_format,
      },
      collectionId: options?.collectionId,
      designId: options?.designId,
    },
  });

  if (error) throw new Error(`AI Gateway error: ${error.message}`);
  if (data?.error) throw new Error(data.error);
  return data as AIGatewayResponse;
}

/**
 * Score a collection using the AI scoring engine.
 */
export async function scoreCollection(
  collectionId?: string,
  collectionData?: unknown
): Promise<ScoringResult> {
  const { data, error } = await supabase.functions.invoke("score-collection", {
    body: { collectionId, collectionData },
  });

  if (error) throw new Error(`Scoring error: ${error.message}`);
  if (data?.error) throw new Error(data.error);
  return data as ScoringResult;
}

/**
 * Attempt a lifecycle status transition with gate validation.
 */
export async function transitionLifecycle(
  collectionId: string,
  targetStatus: string,
  force = false
): Promise<LifecycleTransitionResult> {
  const { data, error } = await supabase.functions.invoke("lifecycle-gate", {
    body: { collectionId, targetStatus, force },
  });

  if (error) throw new Error(`Lifecycle error: ${error.message}`);
  return data as LifecycleTransitionResult;
}

/**
 * Get the display info for a lifecycle status.
 */
export function getLifecycleDisplay(status: string) {
  return LIFECYCLE_STATUSES.find((s) => s.id === status) || LIFECYCLE_STATUSES[0];
}
