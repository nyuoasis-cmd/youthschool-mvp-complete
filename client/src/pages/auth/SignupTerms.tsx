import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { AuthLayout } from "@/components/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Step indicator for 3-step registration
function NewStepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { id: 1, name: "기본정보" },
    { id: 2, name: "추가정보" },
    { id: 3, name: "약관동의" },
  ];

  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center justify-center space-x-2">
        {steps.map((step, stepIdx) => (
          <li key={step.id} className="flex items-center">
            {stepIdx > 0 && (
              <div
                className={cn(
                  "w-8 h-0.5 mx-1",
                  step.id <= currentStep ? "bg-primary" : "bg-gray-200"
                )}
              />
            )}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  step.id < currentStep
                    ? "bg-primary text-white"
                    : step.id === currentStep
                    ? "border-2 border-primary text-primary bg-white"
                    : "border-2 border-gray-300 text-gray-400 bg-white"
                )}
              >
                {step.id < currentStep ? "✓" : step.id}
              </div>
              <span
                className={cn(
                  "mt-1.5 text-xs font-medium",
                  step.id === currentStep ? "text-primary" : "text-gray-500"
                )}
              >
                {step.name}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default function SignupTerms() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);
  const [authProvider, setAuthProvider] = useState<string>("kakao");

  // Terms state
  const [termsOfService, setTermsOfService] = useState(false);
  const [privacyPolicy, setPrivacyPolicy] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  // Check for signup data
  useEffect(() => {
    const checkSignupData = async () => {
      // Check for email signup data first
      const emailSignupData = sessionStorage.getItem("emailSignupData");
      const storedAuthProvider = sessionStorage.getItem("signupAuthProvider");

      if (emailSignupData && storedAuthProvider === "email") {
        const data = JSON.parse(emailSignupData);
        setUserType(data.userType);
        setAuthProvider("email");

        const teacherInfo = sessionStorage.getItem("signupTeacherInfo");
        const staffInfo = sessionStorage.getItem("signupStaffInfo");

        if (data.userType === "teacher" && !teacherInfo) {
          setLocation("/signup/teacher/info");
          return;
        }
        if (data.userType === "staff" && !staffInfo) {
          setLocation("/signup/staff/info");
          return;
        }
        return;
      }

      // Check for Kakao session
      try {
        const response = await fetch("/api/auth/kakao/session");
        if (!response.ok) {
          setLocation("/signup");
          return;
        }
        const data = await response.json();
        setUserType(data.userType);
        setAuthProvider("kakao");

        const teacherInfo = sessionStorage.getItem("signupTeacherInfo");
        const staffInfo = sessionStorage.getItem("signupStaffInfo");

        if (data.userType === "teacher" && !teacherInfo) {
          setLocation("/signup/teacher/info");
          return;
        }
        if (data.userType === "staff" && !staffInfo) {
          setLocation("/signup/staff/info");
          return;
        }
      } catch (error) {
        setLocation("/signup");
      }
    };
    checkSignupData();
  }, [setLocation]);

  const allRequiredChecked = termsOfService && privacyPolicy;
  const allChecked = termsOfService && privacyPolicy && marketingConsent;

  const handleCheckAll = (checked: boolean) => {
    setTermsOfService(checked);
    setPrivacyPolicy(checked);
    setMarketingConsent(checked);
  };

  const handlePrevStep = () => {
    if (userType === "teacher") {
      setLocation("/signup/teacher/info");
    } else {
      setLocation("/signup/staff/info");
    }
  };

  const handleSubmit = async () => {
    if (!allRequiredChecked) {
      toast({
        title: "약관 동의 필요",
        description: "필수 약관에 모두 동의해주세요",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get profile info from sessionStorage
      const teacherInfo = sessionStorage.getItem("signupTeacherInfo");
      const staffInfo = sessionStorage.getItem("signupStaffInfo");

      const profileInfo = userType === "teacher"
        ? JSON.parse(teacherInfo || "{}")
        : JSON.parse(staffInfo || "{}");

      let response;

      if (authProvider === "email") {
        // Email registration
        const emailSignupData = JSON.parse(sessionStorage.getItem("emailSignupData") || "{}");

        response = await fetch("/api/auth/email/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: emailSignupData.email,
            password: emailSignupData.password,
            name: emailSignupData.name,
            nickname: emailSignupData.nickname,
            userType: emailSignupData.userType,
            schoolName: profileInfo.schoolName,
            subject: profileInfo.subject,
            position: profileInfo.position,
            duties: profileInfo.duties,
            dutiesEtc: profileInfo.dutiesEtc,
            termsOfService,
            privacyPolicy,
            marketingConsent,
          }),
        });
      } else {
        // Kakao registration
        response = await fetch("/api/auth/kakao/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schoolName: profileInfo.schoolName,
            subject: profileInfo.subject,
            position: profileInfo.position,
            duties: profileInfo.duties,
            dutiesEtc: profileInfo.dutiesEtc,
            termsOfService,
            privacyPolicy,
            marketingConsent,
          }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "가입 신청에 실패했습니다");
      }

      // Clear session storage
      sessionStorage.removeItem("signupTeacherInfo");
      sessionStorage.removeItem("signupStaffInfo");
      sessionStorage.removeItem("emailSignupData");
      sessionStorage.removeItem("signupAuthProvider");
      sessionStorage.removeItem("signupUserType");

      toast({
        title: "가입 완료",
        description: "회원가입이 완료되었습니다",
      });

      // Navigate to complete page
      setLocation(`/signup/complete?type=${userType}`);
    } catch (error) {
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "가입 신청에 실패했습니다",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const userTypeLabel = userType === "teacher" ? "교사" : "학교 구성원";

  return (
    <AuthLayout title={`${userTypeLabel} 회원가입`}>
      <NewStepIndicator currentStep={3} />

      <div className="space-y-6">
        {/* Terms checkbox list */}
        <div className="border rounded-lg p-4 space-y-4">
          {/* Check all */}
          <div className="flex items-center space-x-2 pb-3 border-b">
            <Checkbox
              id="checkAll"
              checked={allChecked}
              onCheckedChange={(checked) => handleCheckAll(!!checked)}
            />
            <Label htmlFor="checkAll" className="font-medium cursor-pointer">
              전체 동의
            </Label>
          </div>

          <div className="space-y-3">
            {/* Terms of Service */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="termsOfService"
                  checked={termsOfService}
                  onCheckedChange={(checked) => setTermsOfService(!!checked)}
                />
                <Label htmlFor="termsOfService" className="cursor-pointer">
                  <span className="text-primary">[필수]</span> 서비스 이용약관 동의
                </Label>
              </div>
              <Button type="button" variant="ghost" size="sm" className="text-gray-500 h-auto p-1">
                보기
              </Button>
            </div>

            {/* Privacy Policy */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="privacyPolicy"
                  checked={privacyPolicy}
                  onCheckedChange={(checked) => setPrivacyPolicy(!!checked)}
                />
                <Label htmlFor="privacyPolicy" className="cursor-pointer">
                  <span className="text-primary">[필수]</span> 개인정보 수집·이용 동의
                </Label>
              </div>
              <Button type="button" variant="ghost" size="sm" className="text-gray-500 h-auto p-1">
                보기
              </Button>
            </div>

            {/* Marketing Consent */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="marketingConsent"
                checked={marketingConsent}
                onCheckedChange={(checked) => setMarketingConsent(!!checked)}
              />
              <Label htmlFor="marketingConsent" className="cursor-pointer">
                <span className="text-gray-500">[선택]</span> 마케팅 정보 수신 동의
              </Label>
            </div>
          </div>
        </div>

        {/* Error message if required terms not checked */}
        {!allRequiredChecked && (
          <p className="text-sm text-gray-500 text-center">
            필수 약관에 동의해주세요
          </p>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between pt-2">
          <Button type="button" variant="outline" onClick={handlePrevStep}>
            이전 단계
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!allRequiredChecked || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                가입 중...
              </>
            ) : (
              "가입하기"
            )}
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
