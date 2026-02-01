import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import type { ComponentType } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import ParentLetterForm from "@/pages/ParentLetterForm";
import EducationPlanForm from "@/pages/EducationPlanForm";
import AfterSchoolPlanForm from "@/pages/AfterSchoolPlanForm";
import CarePlanForm from "@/pages/CarePlanForm";
import TemplateForm from "@/pages/TemplateForm";
import FieldTripPlanForm from "@/pages/FieldTripPlanForm";
import FieldTripApplicationForm from "@/pages/FieldTripApplicationForm";
import SafetyEducationPlanForm from "@/pages/SafetyEducationPlanForm";
import EventPlanForm from "@/pages/EventPlanForm";
import BullyingPreventionPlanForm from "@/pages/BullyingPreventionPlanForm";
import ParentMeetingForm from "@/pages/ParentMeetingForm";
import BudgetDisclosureForm from "@/pages/BudgetDisclosureForm";
import MealNoticeForm from "@/pages/MealNoticeForm";
import AbsenceReportForm from "@/pages/AbsenceReportForm";
import RecruitmentNoticeForm from "@/pages/RecruitmentNoticeForm";
import SuneungNoticeForm from "@/pages/SuneungNoticeForm";
import ParticipationForm from "@/pages/ParticipationForm";
import SyllabusForm from "@/pages/SyllabusForm";
import ConsentForm from "@/pages/ConsentForm";
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
import SignupKakao from "@/pages/auth/SignupKakao";
import SignupEmail from "@/pages/auth/SignupEmail";
import SignupTeacherInfo from "@/pages/auth/SignupTeacherInfo";
import SignupStaffInfo from "@/pages/auth/SignupStaffInfo";
import SignupTerms from "@/pages/auth/SignupTerms";
import SignupComplete from "@/pages/auth/SignupComplete";
import BetaClosed from "@/pages/auth/BetaClosed";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";
import PendingApproval from "@/pages/auth/PendingApproval";

type RouteComponent = ComponentType<{ params?: Record<string, string> }>;

function ProtectedView({
  Component,
  params,
}: {
  Component: RouteComponent;
  params?: Record<string, string>;
}) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      setLocation("/login?reason=auth_required");
      return;
    }
    if (user.status !== "active") {
      setLocation("/pending-approval");
    }
  }, [isLoading, setLocation, user]);

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-sm text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  if (!user || user.status !== "active") {
    return null;
  }

  return <Component params={params} />;
}

function ProtectedRoute({
  component: Component,
  ...rest
}: {
  path: string;
  component: RouteComponent;
}) {
  return (
    <Route {...rest}>
      {(params) => <ProtectedView Component={Component} params={params} />}
    </Route>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      {/* Auth routes */}
      <Route path="/login" component={Login} />
      <Route path="/signup" component={SignupSelect} />
      <Route path="/signup/teacher" component={SignupKakao} />
      <Route path="/signup/staff" component={SignupKakao} />
      <Route path="/signup/teacher/email" component={SignupEmail} />
      <Route path="/signup/staff/email" component={SignupEmail} />
      <Route path="/signup/teacher/info" component={SignupTeacherInfo} />
      <Route path="/signup/staff/info" component={SignupStaffInfo} />
      <Route path="/signup/terms" component={SignupTerms} />
      <Route path="/signup/complete" component={SignupComplete} />
      <Route path="/signup/closed" component={BetaClosed} />
      <Route path="/pending-approval" component={PendingApproval} />
      <Route path="/password/find" component={ForgotPassword} />
      <Route path="/password/reset" component={ResetPassword} />
      {/* Document routes */}
      <ProtectedRoute path="/profile" component={Profile} />
      <ProtectedRoute path="/create/parent-letter" component={ParentLetterForm} />
      <ProtectedRoute path="/create/education-plan" component={EducationPlanForm} />
      <ProtectedRoute path="/create/after-school-plan" component={AfterSchoolPlanForm} />
      <ProtectedRoute path="/create/care-plan" component={CarePlanForm} />
      <ProtectedRoute path="/create/field-trip-plan" component={FieldTripPlanForm} />
      <ProtectedRoute path="/create/field-trip-application" component={FieldTripApplicationForm} />
      <ProtectedRoute path="/create/safety-education-plan" component={SafetyEducationPlanForm} />
      <ProtectedRoute path="/create/bullying-prevention-plan" component={BullyingPreventionPlanForm} />
      <ProtectedRoute path="/create/event-plan" component={EventPlanForm} />
      <ProtectedRoute path="/create/parent-meeting" component={ParentMeetingForm} />
      <ProtectedRoute path="/create/budget-disclosure" component={BudgetDisclosureForm} />
      <ProtectedRoute path="/create/meal-notice" component={MealNoticeForm} />
      <ProtectedRoute path="/create/absence-report" component={AbsenceReportForm} />
      <ProtectedRoute path="/create/recruitment-notice" component={RecruitmentNoticeForm} />
      <ProtectedRoute path="/create/suneung-notice" component={SuneungNoticeForm} />
      <ProtectedRoute path="/create/participation-form" component={ParticipationForm} />
      <ProtectedRoute path="/create/syllabus" component={SyllabusForm} />
      <ProtectedRoute path="/create/consent-form" component={ConsentForm} />
      <ProtectedRoute path="/mypage" component={MyPage} />
      <ProtectedRoute path="/mypage/documents" component={MyPageDocumentsPage} />
      <ProtectedRoute path="/mypage/favorites" component={MyPageFavoritesPage} />
      <ProtectedRoute path="/mypage/drafts" component={MyPageDraftsPage} />
      <ProtectedRoute path="/mypage/completed" component={MyPageCompletedPage} />
      <ProtectedRoute path="/mypage/document/:id" component={MyPageDocumentDetail} />
      <ProtectedRoute path="/create/template" component={TemplateForm} />
      <ProtectedRoute path="/create/template/:id" component={TemplateForm} />
      <ProtectedRoute path="/result/:id" component={DocumentResult} />
      <ProtectedRoute path="/history" component={History} />
      <ProtectedRoute path="/admin" component={Admin} />
      <ProtectedRoute path="/chat" component={Chat} />
      <ProtectedRoute path="/chat/:chatId" component={Chat} />
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
