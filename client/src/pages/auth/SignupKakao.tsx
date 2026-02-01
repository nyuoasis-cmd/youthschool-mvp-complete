import { useLocation, useRoute, Link } from "wouter";
import { AuthLayout } from "@/components/auth";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Kakao login button color
const KAKAO_YELLOW = "#FEE500";

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

export default function SignupKakao() {
  const [, setLocation] = useLocation();
  const [isTeacher] = useRoute("/signup/teacher");

  const userType = isTeacher ? "teacher" : "staff";
  const userTypeLabel = isTeacher ? "교사" : "학교 구성원";
  const emailSignupPath = isTeacher ? "/signup/teacher/email" : "/signup/staff/email";

  // Handle Kakao login button click
  const handleKakaoLogin = () => {
    window.location.href = `/api/auth/kakao?userType=${userType}`;
  };

  return (
    <AuthLayout title={`${userTypeLabel} 회원가입`}>
      <NewStepIndicator currentStep={1} />

      <div className="space-y-6">
        {/* Kakao login button - Main CTA */}
        <Button
          onClick={handleKakaoLogin}
          className="w-full h-14 text-base font-semibold shadow-md hover:shadow-lg transition-shadow"
          style={{
            backgroundColor: KAKAO_YELLOW,
            color: "#000000",
          }}
        >
          <MessageCircle className="mr-2 h-5 w-5" />
          카카오로 시작하기
        </Button>

        {/* Info text */}
        <p className="text-center text-sm text-gray-500">
          카카오 계정으로 간편하게 가입하세요
        </p>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-sm text-gray-400">또는</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Email signup link - Secondary option */}
        <div className="text-center">
          <Link
            href={emailSignupPath}
            className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
          >
            이메일로 가입하기
          </Link>
        </div>

        {/* Back button */}
        <div className="pt-4">
          <Link href="/signup">
            <Button variant="outline" className="w-full">
              이전 단계로
            </Button>
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
