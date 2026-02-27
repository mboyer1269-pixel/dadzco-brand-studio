import {
  LayoutDashboard,
  Palette,
  Wand2,
  FolderOpen,
  Rocket,
  Settings,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "HQ", url: "/", icon: LayoutDashboard },
  { title: "Brand", url: "/brand", icon: Palette },
  { title: "Create", url: "/create", icon: Wand2 },
  { title: "Collections", url: "/collections", icon: FolderOpen },
  { title: "Launch", url: "/launch", icon: Rocket },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4">
        {!collapsed && (
          <div className="mb-2">
            <h2 className="font-display text-xl font-light tracking-wide text-foreground">
              DADZCO
            </h2>
            <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground font-body">
              Brand OS
            </p>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center">
            <span className="font-display text-lg font-light text-foreground">D</span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-body text-muted-foreground hover:bg-accent/30 hover:text-foreground transition-all duration-200"
                      activeClassName="bg-accent/40 text-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 space-y-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="w-full justify-start gap-3 text-muted-foreground font-body"
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          {!collapsed && <span className="text-xs">{theme === "light" ? "Dark mode" : "Light mode"}</span>}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start gap-3 text-muted-foreground font-body"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="text-xs">Sign out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
