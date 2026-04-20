import { AppLayout } from "@/components/AppLayout";
import { Rocket } from "lucide-react";
import { LaunchChecklist } from "@/components/launch/LaunchChecklist";

export default function Launch() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="gradient-header rounded-lg p-6 -mx-2">
          <div className="flex items-center gap-3 mb-2">
            <Rocket className="h-5 w-5 text-foreground" />
            <h1 className="font-display text-3xl font-light text-foreground tracking-wide">
              Launch Control
            </h1>
          </div>
          <p className="text-sm text-muted-foreground font-body">
            Checklist de pré-lancement — état persisté
          </p>
        </div>

        <LaunchChecklist />
      </div>
    </AppLayout>
  );
}
