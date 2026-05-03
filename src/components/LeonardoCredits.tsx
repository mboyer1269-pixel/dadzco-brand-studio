import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type LeonardoCreditsData =
  | {
      available: true;
      apiPaidTokens: number;
      apiSubscriptionTokens: number;
    }
  | {
      available: false;
    };

export function LeonardoCredits() {
  const { data, isLoading } = useQuery({
    queryKey: ["leonardo-credits"],
    queryFn: async (): Promise<LeonardoCreditsData> => {
      try {
        const { data, error } = await supabase.functions.invoke("leonardo-credits");
        if (error || !data) return { available: false };

        return {
          available: true,
          apiPaidTokens: Number(data.apiPaidTokens ?? 0),
          apiSubscriptionTokens: Number(data.apiSubscriptionTokens ?? 0),
        };
      } catch {
        return { available: false };
      }
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const isUnavailable = data?.available === false;
  const total = data?.available
    ? data.apiPaidTokens + data.apiSubscriptionTokens
    : null;
  const displayValue = isLoading
    ? "…"
    : isUnavailable
      ? "Unavailable"
      : (total ?? 0).toLocaleString();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/30 border border-border cursor-default">
          <Sparkles className="h-3 w-3 text-accent-foreground" />
          <span className="text-[10px] font-body font-medium text-foreground tabular-nums">
            {displayValue}
          </span>
          <span className="text-[9px] font-body text-muted-foreground">Leo</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="font-body text-xs">
        {isUnavailable ? "Leonardo credits unavailable" : "Leonardo AI credits remaining"}
      </TooltipContent>
    </Tooltip>
  );
}
