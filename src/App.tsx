import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAppInitialization } from "@/hooks/useAppInitialization";
import Index from "./pages/Index";
import InterviewFlow from "./pages/InterviewFlow";
import GenerationPage from "./pages/GenerationPage";
import CapsuleLibrary from "./pages/CapsuleLibrary";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const AppContent = () => {
  const { isInitialized, initError } = useAppInitialization();

  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-serif font-medium mb-4">Initialization Error</h1>
          <p className="text-muted-foreground mb-6">{initError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-hero px-6 py-2 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-primary to-primary-glow rounded-3xl flex items-center justify-center animate-pulse-soft">
            <div className="w-8 h-8 border border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h1 className="text-xl font-serif font-medium mb-2">Initializing Time Capsule</h1>
          <p className="text-muted-foreground">Setting up your personal story space...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/create" element={<InterviewFlow />} />
        <Route path="/generate" element={<GenerationPage />} />
        <Route path="/capsules" element={<CapsuleLibrary />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
