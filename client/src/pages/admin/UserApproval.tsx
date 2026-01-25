import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Mail, Building2, Briefcase, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PendingUser {
  id: number;
  email: string;
  name: string;
  userType: string;
  organization: string | null;
  position: string | null;
  purpose: string | null;
  additionalNotes: string | null;
  phone: string | null;
  createdAt: string;
}

interface PendingUserListResponse {
  success: boolean;
  data: {
    users: PendingUser[];
  };
}

const userTypeLabels: Record<string, string> = {
  teacher: "교사",
  instructor: "강사",
  school_admin: "학교 관리자",
  operator: "운영자",
  system_admin: "시스템 관리자",
};

export default function UserApproval() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingUsersResponse, isLoading } = useQuery<PendingUserListResponse>({
    queryKey: ["admin", "users", "pending"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users?status=pending&limit=50&sort=created_at&order=desc", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("승인 대기 목록을 불러오지 못했습니다.");
      return res.json();
    },
  });

  const pendingUsers = pendingUsersResponse?.data.users ?? [];

  const approveMutation = useMutation({
    mutationFn: async (user: PendingUser) => {
      const res = await fetch(`/api/admin/users/${user.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sendEmail: true }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "승인에 실패했습니다.");
      }
      return user;
    },
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users", "pending"] });
      toast({
        title: "✅ 승인 완료",
        description: `${user.name}님의 가입이 승인되었습니다.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ 오류 발생",
        description: error.message || "승인 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (user: PendingUser) => {
      const res = await fetch(`/api/admin/users/${user.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason: "관리자 반려", sendEmail: true }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "거부에 실패했습니다.");
      }
      return user;
    },
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users", "pending"] });
      toast({
        title: "거부 완료",
        description: `${user.name}님의 가입이 거부되었습니다.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ 오류 발생",
        description: error.message || "거부 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">회원 승인 관리</h1>
          <p className="text-muted-foreground mt-2">
            승인 대기 중인 회원:{" "}
            <span className="font-semibold text-primary">
            {pendingUsers.length || 0}
            </span>
            명
          </p>
        </div>
      </div>

      {pendingUsers.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">승인 대기 중인 회원이 없습니다.</p>
              <p className="text-sm mt-2">모든 회원 신청이 처리되었습니다.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pendingUsers.map((user) => (
            <Card key={user.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{user.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {userTypeLabels[user.userType] || user.userType}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  {user.organization && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{user.organization}</span>
                    </div>
                  )}

                  {user.position && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span>{user.position}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {user.additionalNotes && (
                  <div className="mt-4 p-3 bg-muted rounded-md text-sm">
                    <p className="text-muted-foreground mb-1 font-medium">추가 정보</p>
                    <p className="text-sm leading-relaxed">{user.additionalNotes}</p>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex gap-2 pt-4">
                <Button
                  onClick={() => approveMutation.mutate(user)}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  className="flex-1"
                  size="sm"
                >
                  {approveMutation.isPending && approveMutation.variables?.id === user.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      승인
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => rejectMutation.mutate(user)}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  variant="destructive"
                  className="flex-1"
                  size="sm"
                >
                  {rejectMutation.isPending && rejectMutation.variables?.id === user.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-1" />
                      거부
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
