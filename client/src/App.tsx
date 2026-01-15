import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import ParentLetterForm from "@/pages/ParentLetterForm";
import EducationPlanForm from "@/pages/EducationPlanForm";
import DocumentResult from "@/pages/DocumentResult";
import History from "@/pages/History";
import Admin from "@/pages/Admin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/create/parent-letter" component={ParentLetterForm} />
      <Route path="/create/education-plan" component={EducationPlanForm} />
      <Route path="/result/:id" component={DocumentResult} />
      <Route path="/history" component={History} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="youthschool-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
