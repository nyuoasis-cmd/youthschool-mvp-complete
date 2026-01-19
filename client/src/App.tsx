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
import AfterSchoolPlanForm from "@/pages/AfterSchoolPlanForm";
import CarePlanForm from "@/pages/CarePlanForm";
import TemplateForm from "@/pages/TemplateForm";
import FieldTripPlanForm from "@/pages/FieldTripPlanForm";
import SafetyEducationPlanForm from "@/pages/SafetyEducationPlanForm";
import EventPlanForm from "@/pages/EventPlanForm";
import BullyingPreventionPlanForm from "@/pages/BullyingPreventionPlanForm";
import ParentMeetingForm from "@/pages/ParentMeetingForm";
import BudgetDisclosureForm from "@/pages/BudgetDisclosureForm";
import MyPage from "@/pages/MyPage";
import MyPageDocumentsPage from "@/pages/MyPageDocuments";
import MyPageFavoritesPage from "@/pages/MyPageFavorites";
import MyPageDraftsPage from "@/pages/MyPageDrafts";
import MyPageCompletedPage from "@/pages/MyPageCompleted";
import MyPageDocumentDetail from "@/pages/mypage/MyPageDocumentDetail";
import DocumentResult from "@/pages/DocumentResult";
import History from "@/pages/History";
import Admin from "@/pages/Admin";
import Profile from "@/pages/Profile";
import Chat from "@/pages/Chat";
// Auth pages
import Login from "@/pages/auth/Login";
import SignupSelect from "@/pages/auth/SignupSelect";
import SignupTeacher from "@/pages/auth/SignupTeacher";
import SignupInstructor from "@/pages/auth/SignupInstructor";
import SignupSchoolAdmin from "@/pages/auth/SignupSchoolAdmin";
import SignupComplete from "@/pages/auth/SignupComplete";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      {/* Auth routes */}
      <Route path="/login" component={Login} />
      <Route path="/signup" component={SignupSelect} />
      <Route path="/signup/teacher" component={SignupTeacher} />
      <Route path="/signup/instructor" component={SignupInstructor} />
      <Route path="/signup/school-admin" component={SignupSchoolAdmin} />
      <Route path="/signup/complete" component={SignupComplete} />
      <Route path="/password/find" component={ForgotPassword} />
      <Route path="/password/reset" component={ResetPassword} />
      <Route path="/profile" component={Profile} />
      {/* Document routes */}
      <Route path="/create/parent-letter" component={ParentLetterForm} />
      <Route path="/create/education-plan" component={EducationPlanForm} />
      <Route path="/create/after-school-plan" component={AfterSchoolPlanForm} />
      <Route path="/create/care-plan" component={CarePlanForm} />
      <Route path="/create/field-trip-plan" component={FieldTripPlanForm} />
      <Route path="/create/safety-education-plan" component={SafetyEducationPlanForm} />
      <Route path="/create/bullying-prevention-plan" component={BullyingPreventionPlanForm} />
      <Route path="/create/event-plan" component={EventPlanForm} />
      <Route path="/create/parent-meeting" component={ParentMeetingForm} />
      <Route path="/create/budget-disclosure" component={BudgetDisclosureForm} />
      <Route path="/mypage" component={MyPage} />
      <Route path="/mypage/documents" component={MyPageDocumentsPage} />
      <Route path="/mypage/favorites" component={MyPageFavoritesPage} />
      <Route path="/mypage/drafts" component={MyPageDraftsPage} />
      <Route path="/mypage/completed" component={MyPageCompletedPage} />
      <Route path="/mypage/document/:id" component={MyPageDocumentDetail} />
      <Route path="/create/template" component={TemplateForm} />
      <Route path="/create/template/:id" component={TemplateForm} />
      <Route path="/result/:id" component={DocumentResult} />
      <Route path="/history" component={History} />
      <Route path="/admin" component={Admin} />
      <Route path="/chat" component={Chat} />
      <Route path="/chat/:chatId" component={Chat} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="teachermate-theme">
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
