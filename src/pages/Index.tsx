import { AppLayout } from "@/components/AppLayout";
import { WelcomeTour } from "@/components/WelcomeTour";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles, FolderOpen, Image, Download, PenTool, TrendingUp, ArrowRight, Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import StrategicAlerts from "@/components/StrategicAlerts";

const quickActions = [
  { label: "New Design", icon: Sparkles, to: "/generate", desc: "Generate with AI", hint: "AI-powered brand designs" },
  { label: "New Collection", icon: FolderOpen, to: "/collections", desc: "Build a capsule", hint: "4Q + 3F + 1 Hero Buzz" },
  { label: "Write Story", icon: PenTool, to: "/storytelling", desc: "Écho & Rire narrative", hint: "Mythology + social copy" },
  { label: "Export Pack", icon: Download, to: "/exports", desc: "Printful / Shopify", hint: "ZIP + CSV ready" },
];

const sampleDesigns = [
  { title: "Silent Geometry Tee", mode: "Quiet Luxury", date: "Feb 24, 2026", palette: "Sable / Navy" },
  { title: "Chief Chaos Engineer", mode: "Funny Premium", date: "Feb 23, 2026", palette: "Crème / Navy" },
];

const sampleCollection = { name: "Capsule Spring 2026", type: "Full Hybrid", skus: 8, status: "Draft" };

const sampleStory = {
  title: "Silent Geometry",
  excerpt: "Dans le silence de la forme, l'écho trouve sa voix…",
};

const Dashboard = () => {
  return (
    <AppLayout>
      <WelcomeTour />
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header with warm gradient */}
        <div className="gradient-header rounded-lg p-6 -mx-2">
          <p className="text-[10px] tracking-[0.35em] uppercase text-muted-foreground font-body mb-1">
            Brand Operating System
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-light text-foreground tracking-wide">
            Good morning
          </h1>
          <p className="mt-2 text-sm text-muted-foreground font-body italic">
            « Écho & Rire » — Where silence meets wit
          </p>
        </div>

        {/* Quick Actions */}
        <section>
          <h2 className="font-display text-lg font-light text-foreground mb-5 flex items-center gap-2">
            Quick Actions
            <span className="text-[9px] tracking-widest uppercase text-muted-foreground font-body ml-2">
              Start here
            </span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Tooltip key={action.label}>
                <TooltipTrigger asChild>
                  <Link to={action.to}>
                    <Card className="group card-lift cursor-pointer border-border hover:border-lavande/40 gradient-card-warm">
                      <CardContent className="p-5 text-center">
                        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted group-hover:bg-lavande/20 transition-colors duration-300">
                          <action.icon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors duration-300" />
                        </div>
                        <p className="text-sm font-body font-medium text-foreground">{action.label}</p>
                        <p className="text-xs text-muted-foreground font-body mt-1">{action.desc}</p>
                      </CardContent>
                    </Card>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="font-body text-xs">
                  {action.hint}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Designs", value: "2", icon: Image },
            { label: "Collections", value: "1", icon: FolderOpen },
            { label: "Stories", value: "1", icon: PenTool },
            { label: "Exports", value: "0", icon: TrendingUp },
          ].map((stat) => (
            <Card key={stat.label} className="border-border card-lift">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">{stat.label}</p>
                    <p className="text-2xl font-display font-light text-foreground mt-1">{stat.value}</p>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Strategic Alerts */}
        <section>
          <StrategicAlerts compact />
        </section>

        {/* Recent Designs — Sample Data */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-lg font-light text-foreground">Recent Designs</h2>
            <Link to="/generate" className="text-xs text-muted-foreground hover:text-foreground font-body flex items-center gap-1 transition-colors">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sampleDesigns.map((d) => (
              <Card key={d.title} className="border-border card-lift gradient-card-warm">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center shrink-0 echo-motif">
                      <Image className="h-6 w-6 text-muted-foreground/60" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-base font-light text-foreground truncate">{d.title}</h3>
                      <p className="text-[10px] text-muted-foreground font-body mt-0.5">{d.mode} · {d.palette}</p>
                      <p className="text-[10px] text-muted-foreground font-body mt-1">{d.date}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Collection + Story row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sample Collection */}
          <section>
            <h2 className="font-display text-lg font-light text-foreground mb-4">Latest Collection</h2>
            <Card className="border-border card-lift gradient-card-warm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display text-base font-light text-foreground">{sampleCollection.name}</h3>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-body uppercase tracking-wider">
                    {sampleCollection.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-body">{sampleCollection.type} · {sampleCollection.skus} SKUs</p>
                <Link to="/collections">
                  <Button variant="ghost" size="sm" className="mt-3 text-xs font-body text-muted-foreground hover:text-foreground p-0 h-auto">
                    View collection <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </section>

          {/* Sample Story */}
          <section>
            <h2 className="font-display text-lg font-light text-foreground mb-4">Latest Story</h2>
            <Card className="border-border card-lift gradient-card-warm">
              <CardContent className="p-5">
                <h3 className="font-display text-base font-light text-foreground mb-1">{sampleStory.title}</h3>
                <p className="text-sm text-muted-foreground font-body italic leading-relaxed">
                  {sampleStory.excerpt}
                </p>
                <Link to="/storytelling">
                  <Button variant="ghost" size="sm" className="mt-3 text-xs font-body text-muted-foreground hover:text-foreground p-0 h-auto">
                    Read more <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </section>
        </div>

        {/* CTA — Round Table */}
        <section className="text-center py-8">
          <div className="echo-motif inline-block p-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <p className="font-display text-base text-foreground">
                Round Table
              </p>
            </div>
            <p className="font-body text-xs text-muted-foreground italic mb-4">
              7 agents · 3 collections · 1 pass
            </p>
            <Link to="/round-table">
              <Button
                size="lg"
                className="font-body text-xs tracking-[0.2em] uppercase h-12 px-10 btn-glow"
              >
                <Users className="h-4 w-4 mr-2" />
                Run Round Table for 3 Collections
              </Button>
            </Link>
            <div className="mt-4">
              <Link to="/generate">
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-body text-xs text-muted-foreground hover:text-foreground"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Or create a single design
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
