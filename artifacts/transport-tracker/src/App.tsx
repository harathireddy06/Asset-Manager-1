import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { LanguageProvider } from "@/contexts/LanguageContext";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";

import Home from "@/pages/Home";
import Track from "@/pages/Track";
import Notifications from "@/pages/Notifications";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <div className="flex flex-col min-h-screen relative max-w-md mx-auto bg-background shadow-2xl overflow-hidden border-x border-border/50">
      <Header />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/track" component={Track} />
          <Route path="/notifications" component={Notifications} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <BottomNav />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            {/* Desktop wrapper for mobile app feel */}
            <div className="min-h-screen bg-muted/30 w-full flex justify-center items-start sm:py-8">
              <div className="w-full sm:w-[480px] h-[100dvh] sm:h-[850px] sm:max-h-[90vh] sm:rounded-[2.5rem] overflow-hidden relative bg-background shadow-2xl border-border ring-1 ring-border/50">
                <Router />
              </div>
            </div>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
