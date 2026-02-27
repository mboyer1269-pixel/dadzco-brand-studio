import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Rocket, CalendarDays, Mail, Share2, CheckSquare,
} from "lucide-react";

export default function Launch() {
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="gradient-header rounded-lg p-6 -mx-2">
          <div className="flex items-center gap-3 mb-2">
            <Rocket className="h-6 w-6 text-foreground" />
            <h1 className="font-display text-3xl font-light text-foreground tracking-wide">
              Launch
            </h1>
          </div>
          <p className="text-sm text-muted-foreground font-body italic">
            Marketing plan, content calendar & go-live checklist
          </p>
        </div>

        {/* Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base font-light flex items-center gap-2">
                <Share2 className="h-4 w-4" /> Marketing Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground font-body">
                Define your launch strategy, target audience, and content pillars for each approved capsule.
              </p>
              <Badge variant="outline" className="mt-3 text-[9px] font-body">Coming Soon</Badge>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base font-light flex items-center gap-2">
                <Mail className="h-4 w-4" /> Posts & Emails
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground font-body">
                Auto-generated social posts (TikTok, Instagram) and email sequences from capsule storytelling.
              </p>
              <Badge variant="outline" className="mt-3 text-[9px] font-body">Coming Soon</Badge>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base font-light flex items-center gap-2">
                <CheckSquare className="h-4 w-4" /> Go-Live Checklist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground font-body">
                Pre-launch validation: Shopify sync, Printful upload, QA pass, pricing confirmed, legal review.
              </p>
              <Badge variant="outline" className="mt-3 text-[9px] font-body">Coming Soon</Badge>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base font-light flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground font-body">
                Gantt-style launch timeline with milestones per capsule.
              </p>
              <Badge variant="outline" className="mt-3 text-[9px] font-body">Coming Soon</Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
