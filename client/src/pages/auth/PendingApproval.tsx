import { useEffect } from "react";
import { useLocation } from "wouter";
import { AuthLayout } from "@/components/auth";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Clock, XCircle, Mail, Calendar, LogOut } from "lucide-react";

export default function PendingApproval() {
  const [, setLocation] = useLocation();
  const { user, isLoading, logout, isLoggingOut } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      setLocation("/login");
      return;
    }
    if (user.status === "active") {
      setLocation("/");
    }
  }, [isLoading, setLocation, user]);

  const formattedDate = user?.createdAt
    ? new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(user.createdAt))
    : "-";

  const isRejected = user?.status === "rejected";

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  return (
    <AuthLayout>
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isRejected ? "bg-red-100" : "bg-yellow-100"}`}>
            {isRejected ? (
              <XCircle className="h-10 w-10 text-red-600" />
            ) : (
              <Clock className="h-10 w-10 text-yellow-600" />
            )}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isRejected ? "승인이 거부되었습니다" : "승인 대기 중입니다"}
          </h2>
          <p className="mt-2 text-gray-600">
            {isRejected
              ? "관리자에게 문의하여 주세요."
              : "관리자 승인 완료 후 서비스를 이용하실 수 있습니다."}
          </p>
        </div>

        <div className={`rounded-lg border p-6 text-left ${isRejected ? "bg-red-50 border-red-200" : "bg-yellow-50 border-yellow-200"}`}>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-500" />
              <span className="text-gray-700">이메일: {user?.email || "-"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-gray-700">신청일: {formattedDate}</span>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            {isRejected
              ? "문의: admin@youth.kr"
              : "승인 완료 시 이메일로 안내됩니다."}
          </p>
        </div>

        <div className="pt-2">
          <Button
            variant={isRejected ? "destructive" : "outline"}
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full"
          >
            <LogOut className="mr-2 h-4 w-4" />
            로그아웃
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
