import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, FolderOpen, Image, Download, PenTool, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

const quickActions = [
  { label: "New Design", icon: Sparkles, to: "/generate", desc: "Generate with AI" },
  { label: "New Collection", icon: FolderOpen, to: "/collections", desc: "Build a capsule" },
  { label: "Write Story", icon: PenTool, to: "/storytelling", desc: "Écho & Rire narrative" },
  { label: "Export Pack", icon: Download, to: "/exports", desc: "Printful / Shopify" },
];

const Dashboard = () => {
  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-light text-foreground tracking-wide">
            Good morning
          </h1>
          <p className="mt-1 text-sm text-muted-foreground font-body">
            DADZCO | MUMZCO | APPAREL — Brand Operating System
          </p>
        </div>

        {/* Quick Actions */}
        <section>
          <h2 className="font-display text-lg font-light text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link key={action.label} to={action.to}>
                <Card className="group hover:shadow-md transition-all duration-300 cursor-pointer border-border hover:border-secondary">
                  <CardContent className="p-5 text-center">
                    <action.icon className="h-6 w-6 mx-auto mb-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <p className="text-sm font-body font-medium text-foreground">{action.label}</p>
                    <p className="text-xs text-muted-foreground font-body mt-1">{action.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Designs", value: "0", icon: Image },
            { label: "Collections", value: "0", icon: FolderOpen },
            { label: "Stories", value: "0", icon: PenTool },
            { label: "Exports", value: "0", icon: TrendingUp },
          ].map((stat) => (
            <Card key={stat.label} className="border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-body uppercase tracking-wider">{stat.label}</p>
                    <p className="text-2xl font-display font-light text-foreground mt-1">{stat.value}</p>
                  </div>
                  <stat.icon className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Recent Designs placeholder */}
        <section>
          <h2 className="font-display text-lg font-light text-foreground mb-4">Recent Designs</h2>
          <Card className="border-border border-dashed">
            <CardContent className="p-12 text-center">
              <Image className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground font-body">
                No designs yet. Start by generating your first design.
              </p>
              <Link to="/generate">
                <Button variant="outline" size="sm" className="mt-4 font-body text-xs tracking-wider uppercase">
                  Create Design
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
