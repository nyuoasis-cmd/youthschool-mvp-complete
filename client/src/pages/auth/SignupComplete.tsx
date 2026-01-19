import { useState } from "react";
import { Link, useSearch } from "wouter";
import { AuthLayout } from "@/components/auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Clock, Mail, Loader2 } from "lucide-react";

export default function SignupComplete() {
  const search = useSearch();
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);

  const params = new URLSearchParams(search);
  const userType = params.get("type") || "teacher";
  const email = params.get("email") || "";

  const isSchoolAdmin = userType === "school_admin";
  const showApprovalNotice = true;

  const handleResendEmail = async () => {
    if (!email) return;

    setIsResending(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: decodeURIComponent(email) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "발송에 실패했습니다");
      }

      toast({
        title: "발송 완료",
        description: "인증 메일이 재발송되었습니다",
      });
    } catch (error) {
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "발송에 실패했습니다",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const getUserTypeLabel = () => {
    switch (userType) {
      case "teacher": return "교사";
      case "instructor": return "강사";
      case "school_admin": return "학교 관리자";
      case "operator": return "운영자";
      default: return "회원";
    }
  };

  return (
    <AuthLayout>
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isSchoolAdmin ? "bg-yellow-100" : "bg-green-100"}`}>
            {isSchoolAdmin ? (
              <Clock className="h-10 w-10 text-yellow-600" />
            ) : (
              <CheckCircle className="h-10 w-10 text-green-600" />
            )}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            회원가입 완료!
          </h2>
          <p className="mt-2 text-gray-600">
            {getUserTypeLabel()}로 가입해주셔서 감사합니다
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-left">
          <div className="flex items-start gap-4">
            <Mail className="h-6 w-6 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-800">인증 메일이 발송되었습니다</h3>
              <p className="mt-1 text-sm text-blue-700">
                <strong>{email}</strong>
              </p>
              <p className="mt-2 text-sm text-blue-700">
                메일함에서 인증 링크를 클릭하여 계정을 활성화해주세요.
              </p>
              <p className="mt-2 text-sm text-blue-600">
                이 링크는 <strong>24시간</strong> 동안 유효합니다.
              </p>
            </div>
          </div>
        </div>

        {showApprovalNotice && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-left">
            <div className="flex items-start gap-4">
              <Clock className="h-6 w-6 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-800">관리자 승인 대기 중</h3>
                <p className="mt-1 text-sm text-yellow-700">
                  {isSchoolAdmin
                    ? "학교 관리자 계정은 시스템 관리자의 승인이 필요합니다."
                    : "이메일 인증 완료 후 운영자 승인이 진행됩니다."}
                </p>
                <p className="mt-2 text-sm text-yellow-700">
                  승인 완료 시 등록하신 이메일로 안내 메일이 발송됩니다.
                </p>
                <p className="mt-2 text-sm text-yellow-600">
                  평균 승인 소요 시간: <strong>1~2 영업일</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {email && (
          <div className="space-y-2">
            <p className="text-sm text-gray-500">
              인증 메일이 오지 않았나요?
            </p>
            <Button
              variant="outline"
              onClick={handleResendEmail}
              disabled={isResending}
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  발송 중...
                </>
              ) : (
                "인증 메일 재발송"
              )}
            </Button>
          </div>
        )}

        <div className="pt-4">
          <Link href="/">
            <Button className="w-full">홈으로 이동</Button>
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
