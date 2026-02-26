import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/lib/auth";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-h-screen">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-background/80 backdrop-blur-sm sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground font-body hidden md:inline">
                DADZCO · Brand OS
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-body">
                {user?.email}
              </span>
              <div className="h-7 w-7 rounded-full bg-lavande/20 flex items-center justify-center transition-colors hover:bg-lavande/30">
                <span className="text-xs font-medium text-foreground font-body">
                  D
                </span>
              </div>
            </div>
          </header>
          <div className="flex-1 p-6 md:p-8 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
