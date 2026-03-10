import { AppLayout } from "@/components/AppLayout";
import { Rocket } from "lucide-react";
import { ManusAiBriefing } from "@/components/launch/ManusAiBriefing";
import { MetaLeonardoHub } from "@/components/launch/MetaLeonardoHub";
import { GoLiveOps } from "@/components/launch/GoLiveOps";
import { AutomationGantt } from "@/components/launch/AutomationGantt";

export default function Launch() {
  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="gradient-header rounded-lg p-6 -mx-2">
          <div className="flex items-center gap-3 mb-2">
            <Rocket className="h-5 w-5 text-foreground" />
            <h1 className="font-display text-3xl font-light text-foreground tracking-wide">
              Launch Control
            </h1>
          </div>
          <p className="text-sm text-muted-foreground font-body">
            Centre de commande marketing — Manus AI, Leonardo, Meta
          </p>
        </div>

        {/* Grid Layout: 2 columns on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <ManusAiBriefing />
            <GoLiveOps />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <MetaLeonardoHub />
            <AutomationGantt />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
