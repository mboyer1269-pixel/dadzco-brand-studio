import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function LeonardoCredits() {
  const { data, isLoading } = useQuery({
    queryKey: ["leonardo-credits"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("leonardo-credits");
      if (error) throw error;
      return data as {
        apiPaidTokens: number;
        apiSubscriptionTokens: number;
      };
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const total = (data?.apiPaidTokens ?? 0) + (data?.apiSubscriptionTokens ?? 0);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/30 border border-border cursor-default">
          <Sparkles className="h-3 w-3 text-accent-foreground" />
          <span className="text-[10px] font-body font-medium text-foreground tabular-nums">
            {isLoading ? "…" : total.toLocaleString()}
          </span>
          <span className="text-[9px] font-body text-muted-foreground">Leo</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="font-body text-xs">
        Leonardo AI credits remaining
      </TooltipContent>
    </Tooltip>
  );
}
