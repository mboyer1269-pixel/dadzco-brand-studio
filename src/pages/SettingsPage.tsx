import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

const SettingsPage = () => {
  const { user, session } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [pinging, setPinging] = useState(false);

  const handlePing = async () => {
    setPinging(true);
    setPingResult(null);
    try {
      if (!session) {
        setPingResult("⚠️ No Supabase session. Sign in via Email (magic link) to get a real JWT.");
        setPinging(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke("auth-ping");
      if (error) {
        setPingResult(`❌ Error: ${error.message}`);
      } else {
        setPingResult(`✅ ${JSON.stringify(data)}`);
      }
    } catch (e: any) {
      setPingResult(`❌ ${e.message}`);
    }
    setPinging(false);
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-light text-foreground tracking-wide">
            Settings
          </h1>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-body text-base">Account</CardTitle>
            <CardDescription className="font-body">Admin access details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-body text-muted-foreground uppercase tracking-wider">Email</Label>
              <span className="text-sm font-body text-foreground">
                {user?.email || "Not signed in"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-body text-muted-foreground uppercase tracking-wider">Role</Label>
              <span className="text-sm font-body text-foreground">Administrator</span>
            </div>
          </CardContent>
        </Card>

        {/* Auth Debug Box */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-body text-base">Auth Debug</CardTitle>
            <CardDescription className="font-body">Session & identity status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-body text-muted-foreground uppercase tracking-wider">Session exists</Label>
              <span className={`text-xs font-body font-medium ${session ? "text-green-500" : "text-destructive"}`}>
                {session ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-body text-muted-foreground uppercase tracking-wider">User ID present</Label>
              <span className={`text-xs font-body font-medium ${user?.id ? "text-green-500" : "text-destructive"}`}>
                {user?.id ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-body text-muted-foreground uppercase tracking-wider">Email shown</Label>
              <span className={`text-xs font-body font-medium ${user?.email ? "text-green-500" : "text-destructive"}`}>
                {user?.email ? "Yes" : "No"}
              </span>
            </div>
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <span className="text-xs font-body text-muted-foreground">Edge auth verification</span>
              <Button variant="outline" size="sm" onClick={handlePing} disabled={pinging} className="font-body text-xs">
                {pinging ? "Pinging…" : "Ping Edge Auth"}
              </Button>
            </div>
            {pingResult && (
              <p className="text-xs font-body text-muted-foreground break-all bg-muted/30 rounded p-2">{pingResult}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-body text-base">Appearance</CardTitle>
            <CardDescription className="font-body">Toggle dark mode</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-body">Dark Mode</Label>
              <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-body text-base">Brand DNA</CardTitle>
            <CardDescription className="font-body">Locked brand guidelines</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-body font-medium text-foreground uppercase tracking-wider mb-1">Quiet Luxury</p>
              <p className="text-xs font-body text-muted-foreground">70% negative space · Anti-kitsch · No cartoons · Minimal refined typography</p>
            </div>
            <div>
              <p className="text-xs font-body font-medium text-foreground uppercase tracking-wider mb-1">Funny Premium</p>
              <p className="text-xs font-body text-muted-foreground">Elegant witty typography · No childish graphics · Refined humor</p>
            </div>
            <div className="pt-3 border-t border-border">
              <p className="text-xs font-body font-medium text-foreground uppercase tracking-wider mb-2">Palette</p>
              <div className="flex gap-3">
                {[
                  { name: "Sable", hex: "#CBBFA9", className: "bg-sable" },
                  { name: "Brume", hex: "#E7E4DE", className: "bg-brume" },
                  { name: "Navy", hex: "#0B1B2B", className: "bg-navy" },
                  { name: "Crème", hex: "#F7F2E8", className: "bg-creme" },
                  { name: "Lavande", hex: "#C9C3D6", className: "bg-lavande" },
                ].map((c) => (
                  <div key={c.name} className="text-center">
                    <div className={`h-8 w-8 rounded-sm ${c.className} border border-border`} />
                    <p className="text-[9px] text-muted-foreground font-body mt-1">{c.name}</p>
                    <p className="text-[8px] text-muted-foreground font-body">{c.hex}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
