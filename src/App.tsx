import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";

// Primary pages
import HQ from "./pages/HQ";
import Login from "./pages/Login";
import BrandBook from "./pages/BrandBook";
import Create from "./pages/Create";
import Collections from "./pages/Collections";
import CollectionDetail from "./pages/CollectionDetail";
import Launch from "./pages/Launch";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

// Legacy pages (hidden from sidebar, still accessible)
import Index from "./pages/Index";
import Generate from "./pages/Generate";
import CollectionWizard from "./pages/CollectionWizard";
import Library from "./pages/Library";
import Storytelling from "./pages/Storytelling";
import Exports from "./pages/Exports";
import CalendarPlanner from "./pages/CalendarPlanner";
import RoundTable from "./pages/RoundTable";
import FinancialEngine from "./pages/FinancialEngine";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="font-display text-xl font-light text-foreground tracking-wide animate-pulse">
            DADZCO
          </h2>
          <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground font-body mt-1">
            Loading…
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />

              {/* Primary pages */}
              <Route path="/" element={<ProtectedRoute><HQ /></ProtectedRoute>} />
              <Route path="/brand" element={<ProtectedRoute><BrandBook /></ProtectedRoute>} />
              <Route path="/create" element={<ProtectedRoute><Create /></ProtectedRoute>} />
              <Route path="/collections" element={<ProtectedRoute><Collections /></ProtectedRoute>} />
              <Route path="/collections/new" element={<ProtectedRoute><CollectionWizard /></ProtectedRoute>} />
              <Route path="/collections/:id" element={<ProtectedRoute><CollectionDetail /></ProtectedRoute>} />
              <Route path="/financial" element={<ProtectedRoute><FinancialEngine /></ProtectedRoute>} />
              <Route path="/launch" element={<ProtectedRoute><Launch /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

              {/* Legacy routes (hidden from sidebar) */}
              <Route path="/dashboard-legacy" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/generate" element={<ProtectedRoute><Generate /></ProtectedRoute>} />
              <Route path="/brand-book" element={<ProtectedRoute><BrandBook /></ProtectedRoute>} />
              <Route path="/calendar" element={<ProtectedRoute><CalendarPlanner /></ProtectedRoute>} />
              <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
              <Route path="/storytelling" element={<ProtectedRoute><Storytelling /></ProtectedRoute>} />
              <Route path="/exports" element={<ProtectedRoute><Exports /></ProtectedRoute>} />
              <Route path="/round-table" element={<ProtectedRoute><RoundTable /></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
