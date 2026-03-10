import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const SettingsPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-light text-foreground tracking-wide">
            Paramètres
          </h1>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-body text-base">Compte</CardTitle>
            <CardDescription className="font-body">Détails d'accès administrateur</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-body text-muted-foreground uppercase tracking-wider">Email</Label>
              <span className="text-sm font-body text-foreground">
                {user?.email || (isAuthenticated ? "Admin (code d'accès)" : "—")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-body text-muted-foreground uppercase tracking-wider">Rôle</Label>
              <span className="text-sm font-body text-foreground">Administrateur</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-body text-base">Apparence</CardTitle>
            <CardDescription className="font-body">Basculer le mode sombre</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-body">Mode sombre</Label>
              <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-body text-base">ADN de Marque</CardTitle>
            <CardDescription className="font-body">Directives de marque verrouillées</CardDescription>
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
