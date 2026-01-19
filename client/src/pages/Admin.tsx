import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, FileText, Layout, Trash2, BarChart3, Edit, Loader2, Upload, CheckCircle2, AlertCircle, UserPlus } from "lucide-react";
import type { Template, GeneratedDocument, UploadedTemplate } from "@shared/schema";

interface Stats {
  totalDocuments: number;
  totalTemplates: number;
  documentsByType: Record<string, number>;
}

interface AdminUser {
  id: number;
  email: string;
  name: string;
  userType: string;
  status: string;
  phone: string;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  approvedAt?: string | null;
  rejectedReason?: string | null;
  suspensionEndDate?: string | null;
  deletionType?: string | null;
  organization?: string | null;
  position?: string | null;
}

interface AdminUserListResponse {
  success: boolean;
  data: {
    users: AdminUser[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      limit: number;
    };
  };
}

interface UserStatsResponse {
  success: boolean;
  data: Record<string, number>;
}

export default function Admin() {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "document" | "template" | "uploaded"; id: number; name: string } | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [crawlUrl, setCrawlUrl] = useState("");
  const [pendingSelection, setPendingSelection] = useState<number[]>([]);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<AdminUser | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<AdminUser | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendDurationType, setSuspendDurationType] = useState<"indefinite" | "period" | "until_date">("indefinite");
  const [suspendDurationDays, setSuspendDurationDays] = useState("30");
  const [suspendUntilDate, setSuspendUntilDate] = useState("");
  const [userDeleteDialogOpen, setUserDeleteDialogOpen] = useState(false);
  const [userDeleteTarget, setUserDeleteTarget] = useState<AdminUser | null>(null);
  const [userDeleteReason, setUserDeleteReason] = useState("");
  const [userDeleteType, setUserDeleteType] = useState<"soft" | "hard">("soft");
  const [operatorForm, setOperatorForm] = useState({
    email: "",
    name: "",
    phone: "",
    password: "",
  });

  const normalizePhone = (input: string) => {
    const digits = input.replace(/\D/g, "");
    if (digits.length === 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 11) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
    return input;
  };

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  const { data: templates, isLoading: templatesLoading } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const { data: documents, isLoading: documentsLoading } = useQuery<GeneratedDocument[]>({
    queryKey: ["/api/documents"],
  });

  const { data: uploadedTemplates, isLoading: uploadedTemplatesLoading } = useQuery<UploadedTemplate[]>({
    queryKey: ["/api/uploaded-templates"],
  });

  const { data: userStats } = useQuery<UserStatsResponse>({
    queryKey: ["/api/admin/users/stats"],
  });

  const { data: pendingUsersResponse, isLoading: pendingUsersLoading } = useQuery<AdminUserListResponse>({
    queryKey: ["/api/admin/users?status=pending&limit=50&sort=created_at&order=desc"],
  });

  const { data: allUsersResponse, isLoading: allUsersLoading } = useQuery<AdminUserListResponse>({
    queryKey: ["/api/admin/users?limit=50&sort=created_at&order=desc"],
  });

  const crawlerTemplates = useMemo(
    () => (uploadedTemplates || []).filter((template) => template.documentType === "crawler"),
    [uploadedTemplates]
  );

  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "문서 삭제 완료",
        description: "문서가 성공적으로 삭제되었습니다.",
      });
      setDeleteDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "삭제 실패",
        description: "문서 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "템플릿 삭제 완료",
        description: "템플릿이 성공적으로 삭제되었습니다.",
      });
      setDeleteDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "삭제 실패",
        description: "템플릿 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Template> }) => {
      const response = await apiRequest("PATCH", `/api/templates/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "템플릿 수정 완료",
        description: "템플릿이 성공적으로 수정되었습니다.",
      });
      setEditDialogOpen(false);
      setEditTemplate(null);
    },
    onError: () => {
      toast({
        title: "수정 실패",
        description: "템플릿 수정에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteUploadedTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/uploaded-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/uploaded-templates"] });
      toast({
        title: "템플릿 삭제 완료",
        description: "업로드된 템플릿이 삭제되었습니다.",
      });
      setDeleteDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "삭제 실패",
        description: "템플릿 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const crawlMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/crawler/ingest", { url });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/uploaded-templates"] });
      toast({
        title: "수집 완료",
        description: "문서가 참고 자료로 저장되었습니다.",
      });
      setCrawlUrl("");
    },
    onError: (error) => {
      toast({
        title: "수집 실패",
        description: error instanceof Error ? error.message : "URL 수집에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const createOperatorMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...operatorForm,
        phone: normalizePhone(operatorForm.phone),
      };
      const response = await apiRequest("POST", "/api/auth/operators", payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "운영자 생성 완료",
        description: "운영자 계정이 생성되었습니다.",
      });
      setOperatorForm({ email: "", name: "", phone: "", password: "" });
    },
    onError: (error) => {
      toast({
        title: "운영자 생성 실패",
        description: error instanceof Error ? error.message : "운영자 생성에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const approveUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/approve`, { sendEmail: true });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users?status=pending&limit=50&sort=created_at&order=desc"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users?limit=50&sort=created_at&order=desc"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/stats"] });
      toast({
        title: "승인 완료",
        description: "회원 승인이 완료되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "승인 실패",
        description: error instanceof Error ? error.message : "승인에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async (userIds: number[]) => {
      const response = await apiRequest("POST", "/api/admin/users/approve-bulk", { userIds, sendEmail: true });
      return response.json();
    },
    onSuccess: () => {
      setPendingSelection([]);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users?status=pending&limit=50&sort=created_at&order=desc"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users?limit=50&sort=created_at&order=desc"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/stats"] });
      toast({
        title: "일괄 승인 완료",
        description: "선택한 회원이 승인되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "일괄 승인 실패",
        description: error instanceof Error ? error.message : "일괄 승인에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const rejectUserMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: number; reason: string }) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/reject`, { reason, sendEmail: true });
      return response.json();
    },
    onSuccess: () => {
      setRejectDialogOpen(false);
      setRejectReason("");
      setRejectTarget(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users?status=pending&limit=50&sort=created_at&order=desc"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users?limit=50&sort=created_at&order=desc"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/stats"] });
      toast({
        title: "반려 완료",
        description: "회원 반려 처리가 완료되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "반려 실패",
        description: error instanceof Error ? error.message : "반려 처리에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const suspendUserMutation = useMutation({
    mutationFn: async (payload: {
      userId: number;
      reason: string;
      durationType: "indefinite" | "period" | "until_date";
      durationDays?: number;
      untilDate?: string;
    }) => {
      const response = await apiRequest("POST", `/api/admin/users/${payload.userId}/suspend`, {
        reason: payload.reason,
        durationType: payload.durationType,
        durationDays: payload.durationDays,
        untilDate: payload.untilDate,
        sendEmail: true,
      });
      return response.json();
    },
    onSuccess: () => {
      setSuspendDialogOpen(false);
      setSuspendReason("");
      setSuspendTarget(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users?limit=50&sort=created_at&order=desc"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/stats"] });
      toast({
        title: "정지 완료",
        description: "회원 정지 처리가 완료되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "정지 실패",
        description: error instanceof Error ? error.message : "정지 처리에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const unsuspendUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/unsuspend`, { sendEmail: true });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users?limit=50&sort=created_at&order=desc"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/stats"] });
      toast({
        title: "정지 해제 완료",
        description: "정지 해제가 완료되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "정지 해제 실패",
        description: error instanceof Error ? error.message : "정지 해제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (payload: { userId: number; reason: string; deletionType: "soft" | "hard" }) => {
      const response = await apiRequest("DELETE", `/api/admin/users/${payload.userId}`, {
        reason: payload.reason,
        deletionType: payload.deletionType,
        sendEmail: true,
      });
      return response.json();
    },
    onSuccess: () => {
      setUserDeleteDialogOpen(false);
      setUserDeleteTarget(null);
      setUserDeleteReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users?limit=50&sort=created_at&order=desc"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/stats"] });
      toast({
        title: "삭제 완료",
        description: "회원 삭제 처리가 완료되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "삭제 실패",
        description: error instanceof Error ? error.message : "삭제 처리에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const restoreUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/restore`, { sendEmail: true });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users?limit=50&sort=created_at&order=desc"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/stats"] });
      toast({
        title: "복구 완료",
        description: "회원 복구가 완료되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "복구 실패",
        description: error instanceof Error ? error.message : "복구 처리에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".hwp")) {
      toast({
        title: "잘못된 파일 형식",
        description: "HWP 파일만 업로드할 수 있습니다.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/uploaded-templates/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "업로드 실패");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/uploaded-templates"] });
      toast({
        title: "업로드 완료",
        description: "HWP 템플릿이 성공적으로 업로드되었습니다.",
      });
    } catch (error) {
      toast({
        title: "업로드 실패",
        description: error instanceof Error ? error.message : "파일 업로드에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    
    if (deleteTarget.type === "document") {
      deleteDocumentMutation.mutate(deleteTarget.id);
    } else if (deleteTarget.type === "uploaded") {
      deleteUploadedTemplateMutation.mutate(deleteTarget.id);
    } else {
      deleteTemplateMutation.mutate(deleteTarget.id);
    }
  };

  const handleEditSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editTemplate) return;
    
    const formData = new FormData(e.currentTarget);
    updateTemplateMutation.mutate({
      id: editTemplate.id,
      data: {
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        promptTemplate: formData.get("promptTemplate") as string,
      },
    });
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const pendingUsers = pendingUsersResponse?.data.users ?? [];
  const allUsers = allUsersResponse?.data.users ?? [];
  const allPendingSelected = pendingUsers.length > 0 && pendingSelection.length === pendingUsers.length;

  const togglePendingSelection = (userId: number) => {
    setPendingSelection((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleAllPending = () => {
    if (allPendingSelected) {
      setPendingSelection([]);
    } else {
      setPendingSelection(pendingUsers.map((user) => user.id));
    }
  };

  const getUserTypeLabel = (userType: string) => {
    switch (userType) {
      case "teacher":
        return "교사";
      case "instructor":
        return "강사";
      case "school_admin":
        return "학교 관리자";
      case "operator":
        return "운영자";
      case "system_admin":
        return "시스템 관리자";
      default:
        return "회원";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="secondary">정상</Badge>;
      case "pending":
        return <Badge variant="secondary">승인 대기</Badge>;
      case "suspended":
        return <Badge variant="destructive">정지</Badge>;
      case "deleted":
        return <Badge variant="outline">삭제</Badge>;
      case "rejected":
        return <Badge variant="outline">반려</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">관리자 대시보드</h1>
              <p className="text-sm text-muted-foreground">템플릿과 문서를 관리하세요</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card data-testid="card-stat-documents">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">총 생성 문서</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.totalDocuments || 0}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-templates">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">총 템플릿</CardTitle>
              <Layout className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.totalTemplates || 0}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-types">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">문서 유형별</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {stats?.documentsByType && Object.entries(stats.documentsByType).map(([type, count]) => (
                    <Badge key={type} variant="secondary">
                      {type}: {count}
                    </Badge>
                  ))}
                  {(!stats?.documentsByType || Object.keys(stats.documentsByType).length === 0) && (
                    <span className="text-sm text-muted-foreground">아직 문서가 없습니다</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="templates" className="space-y-6">
          <TabsList>
            <TabsTrigger value="approvals" data-testid="tab-approvals">회원 승인</TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">회원 관리</TabsTrigger>
            <TabsTrigger value="templates" data-testid="tab-templates">템플릿 관리</TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-documents">문서 관리</TabsTrigger>
            <TabsTrigger value="crawler" data-testid="tab-crawler">문서 수집</TabsTrigger>
            <TabsTrigger value="operators" data-testid="tab-operators">운영자 관리</TabsTrigger>
            <TabsTrigger value="uploads" data-testid="tab-uploads">HWP 업로드</TabsTrigger>
          </TabsList>

          <TabsContent value="approvals" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">승인 대기 목록</h2>
              <Button
                disabled={pendingSelection.length === 0 || bulkApproveMutation.isPending}
                onClick={() => bulkApproveMutation.mutate(pendingSelection)}
              >
                {bulkApproveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                선택 항목 일괄 승인
              </Button>
            </div>

            {pendingUsersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : pendingUsers.length > 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={allPendingSelected}
                            onCheckedChange={toggleAllPending}
                            aria-label="전체 선택"
                          />
                        </TableHead>
                        <TableHead>신청일</TableHead>
                        <TableHead>이메일</TableHead>
                        <TableHead>이름</TableHead>
                        <TableHead>소속</TableHead>
                        <TableHead>역할</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead className="text-right">액션</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Checkbox
                              checked={pendingSelection.includes(user.id)}
                              onCheckedChange={() => togglePendingSelection(user.id)}
                              aria-label={`${user.name} 선택`}
                            />
                          </TableCell>
                          <TableCell>{formatDate(user.createdAt)}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.organization || "-"}</TableCell>
                          <TableCell>{getUserTypeLabel(user.userType)}</TableCell>
                          <TableCell>{getStatusBadge(user.status)}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              onClick={() => approveUserMutation.mutate(user.id)}
                              disabled={approveUserMutation.isPending}
                            >
                              승인
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRejectTarget(user);
                                setRejectReason("");
                                setRejectDialogOpen(true);
                              }}
                            >
                              반려
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">승인 대기 회원이 없습니다</h3>
                  <p className="text-sm text-muted-foreground">현재 승인 요청이 없습니다.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">회원 관리</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">전체 회원</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">
                      {userStats?.data
                        ? Object.values(userStats.data).reduce((sum, value) => sum + value, 0)
                        : 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">일반 회원</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">{userStats?.data?.active || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">승인 대기</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">{userStats?.data?.pending || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">정지 회원</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">{userStats?.data?.suspended || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">삭제/반려</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">
                      {(userStats?.data?.deleted || 0) + (userStats?.data?.rejected || 0)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {allUsersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : allUsers.length > 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>이메일</TableHead>
                        <TableHead>이름</TableHead>
                        <TableHead>소속</TableHead>
                        <TableHead>역할</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>가입일</TableHead>
                        <TableHead>최근 접속</TableHead>
                        <TableHead className="text-right">액션</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.organization || "-"}</TableCell>
                          <TableCell>{getUserTypeLabel(user.userType)}</TableCell>
                          <TableCell>{getStatusBadge(user.status)}</TableCell>
                          <TableCell>{formatDate(user.createdAt)}</TableCell>
                          <TableCell>{formatDate(user.lastLoginAt)}</TableCell>
                          <TableCell className="text-right space-x-2">
                            {user.status === "suspended" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => unsuspendUserMutation.mutate(user.id)}
                                disabled={unsuspendUserMutation.isPending}
                              >
                                정지 해제
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSuspendTarget(user);
                                  setSuspendReason("");
                                  setSuspendDurationType("indefinite");
                                  setSuspendDialogOpen(true);
                                }}
                              >
                                정지
                              </Button>
                            )}
                            {user.status === "deleted" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => restoreUserMutation.mutate(user.id)}
                                disabled={restoreUserMutation.isPending}
                              >
                                복구
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setUserDeleteTarget(user);
                                  setUserDeleteReason("");
                                  setUserDeleteType("soft");
                                  setUserDeleteDialogOpen(true);
                                }}
                              >
                                삭제
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">회원이 없습니다</h3>
                  <p className="text-sm text-muted-foreground">아직 등록된 회원이 없습니다.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">템플릿 목록</h2>
            </div>

            {templatesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : templates && templates.length > 0 ? (
              <div className="grid gap-4">
                {templates.map((template) => (
                  <Card key={template.id} data-testid={`card-template-${template.id}`}>
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          {template.isDefault && <Badge variant="secondary">기본</Badge>}
                        </div>
                        <CardDescription>{template.description}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditTemplate(template);
                            setEditDialogOpen(true);
                          }}
                          data-testid={`button-edit-template-${template.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeleteTarget({ type: "template", id: template.id, name: template.name });
                            setDeleteDialogOpen(true);
                          }}
                          data-testid={`button-delete-template-${template.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground">
                        <span>유형: {template.documentType}</span>
                        <span className="mx-2">|</span>
                        <span>카테고리: {template.category}</span>
                        <span className="mx-2">|</span>
                        <span>생성: {formatDate(template.createdAt)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Layout className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">템플릿이 없습니다</h3>
                  <p className="text-sm text-muted-foreground">새 템플릿을 추가해주세요.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">생성된 문서 목록</h2>
            </div>

            {documentsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : documents && documents.length > 0 ? (
              <div className="grid gap-4">
                {documents.map((doc) => (
                  <Card key={doc.id} data-testid={`card-document-${doc.id}`}>
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{doc.title}</CardTitle>
                        <CardDescription>
                          {doc.documentType} | {formatDate(doc.createdAt)}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={doc.status === "completed" ? "default" : doc.status === "failed" ? "destructive" : "secondary"}>
                          {doc.status === "completed" ? "완료" : doc.status === "failed" ? "실패" : "진행중"}
                        </Badge>
                        <Link href={`/result/${doc.id}`}>
                          <Button variant="ghost" size="sm" data-testid={`button-view-document-${doc.id}`}>
                            보기
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeleteTarget({ type: "document", id: doc.id, name: doc.title });
                            setDeleteDialogOpen(true);
                          }}
                          data-testid={`button-delete-document-${doc.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    {doc.processingTimeMs && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          처리 시간: {(doc.processingTimeMs / 1000).toFixed(1)}초
                        </p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">문서가 없습니다</h3>
                  <p className="text-sm text-muted-foreground mb-4">아직 생성된 문서가 없습니다.</p>
                  <Link href="/">
                    <Button data-testid="button-create-document">문서 생성하기</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="uploads" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">HWP 템플릿 업로드</h2>
              <div>
                <input
                  type="file"
                  accept=".hwp"
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                  className="hidden"
                  id="hwp-upload"
                  data-testid="input-hwp-upload"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  data-testid="button-upload-hwp"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  HWP 파일 업로드
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-4">
                  기존 HWP 문서를 업로드하면 AI가 문서 구조와 스타일을 분석하여 
                  새 문서 생성 시 참고 자료로 활용합니다. 
                  업로드된 템플릿은 문서 생성 시 선택할 수 있습니다.
                </p>
              </CardContent>
            </Card>

            {uploadedTemplatesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : uploadedTemplates && uploadedTemplates.length > 0 ? (
              <div className="grid gap-4">
                {uploadedTemplates.map((template) => (
                  <Card key={template.id} data-testid={`card-uploaded-${template.id}`}>
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{template.originalName}</CardTitle>
                          {template.status === "completed" ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              완료
                            </Badge>
                          ) : template.status === "failed" ? (
                            <Badge variant="destructive">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              실패
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              처리중
                            </Badge>
                          )}
                        </div>
                        <CardDescription>
                          업로드: {formatDate(template.createdAt)}
                          {template.extractedFields && Array.isArray(template.extractedFields) && (
                            <span className="ml-2">| 필드: {template.extractedFields.length}개</span>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeleteTarget({ type: "uploaded", id: template.id, name: template.originalName });
                            setDeleteDialogOpen(true);
                          }}
                          data-testid={`button-delete-uploaded-${template.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    {template.extractedText && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {template.extractedText.substring(0, 200)}...
                        </p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">업로드된 템플릿이 없습니다</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    HWP 파일을 업로드하면 AI 문서 생성에 참고됩니다.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="crawler" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">URL 문서 수집</h2>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  특정 문서 URL을 수집해 AI가 참고할 수 있는 자료로 저장합니다. 
                  관리자가 수집한 문서는 일반 사용자의 AI 생성에도 반영됩니다.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    value={crawlUrl}
                    onChange={(event) => setCrawlUrl(event.target.value)}
                    placeholder="수집할 문서 URL을 입력하세요"
                  />
                  <Button
                    onClick={() => crawlMutation.mutate(crawlUrl.trim())}
                    disabled={!crawlUrl.trim() || crawlMutation.isPending}
                  >
                    {crawlMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    URL 수집
                  </Button>
                </div>
              </CardContent>
            </Card>

            {uploadedTemplatesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : crawlerTemplates.length > 0 ? (
              <div className="grid gap-4">
                {crawlerTemplates.map((template) => (
                  <Card key={template.id} data-testid={`card-crawler-${template.id}`}>
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{template.originalName}</CardTitle>
                        <CardDescription>수집: {formatDate(template.createdAt)}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeleteTarget({ type: "uploaded", id: template.id, name: template.originalName });
                            setDeleteDialogOpen(true);
                          }}
                          data-testid={`button-delete-crawler-${template.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    {template.extractedText && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {template.extractedText.substring(0, 200)}...
                        </p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">수집된 문서가 없습니다</h3>
                  <p className="text-sm text-muted-foreground">URL을 추가해 참고 문서를 수집하세요.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="operators" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">운영자 계정 생성</h2>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  문서 수집은 운영자 계정만 사용할 수 있습니다. 최초 1회는 로그인 계정으로 운영자를 생성할 수 있습니다.
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    placeholder="이메일"
                    value={operatorForm.email}
                    onChange={(event) => setOperatorForm((prev) => ({ ...prev, email: event.target.value }))}
                  />
                  <Input
                    placeholder="이름"
                    value={operatorForm.name}
                    onChange={(event) => setOperatorForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                  <Input
                    placeholder="휴대폰 번호 (010-0000-0000)"
                    value={operatorForm.phone}
                    onChange={(event) => setOperatorForm((prev) => ({ ...prev, phone: event.target.value }))}
                  />
                  <Input
                    type="password"
                    placeholder="비밀번호"
                    value={operatorForm.password}
                    onChange={(event) => setOperatorForm((prev) => ({ ...prev, password: event.target.value }))}
                  />
                </div>
                <Button
                  onClick={() => createOperatorMutation.mutate()}
                  disabled={
                    createOperatorMutation.isPending ||
                    !operatorForm.email ||
                    !operatorForm.name ||
                    !operatorForm.phone ||
                    !operatorForm.password
                  }
                >
                  {createOperatorMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  운영자 생성
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>회원 반려</DialogTitle>
            <DialogDescription>
              {rejectTarget?.name}님의 가입을 반려합니다. 사유를 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">반려 사유</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="반려 사유를 입력하세요"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (rejectTarget && rejectReason.trim()) {
                  rejectUserMutation.mutate({ userId: rejectTarget.id, reason: rejectReason.trim() });
                }
              }}
              disabled={!rejectReason.trim() || rejectUserMutation.isPending}
            >
              {rejectUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              반려 처리
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>회원 정지</DialogTitle>
            <DialogDescription>
              {suspendTarget?.name}님의 계정을 정지합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="suspend-reason">정지 사유</Label>
              <Textarea
                id="suspend-reason"
                value={suspendReason}
                onChange={(event) => setSuspendReason(event.target.value)}
                placeholder="정지 사유를 입력하세요"
              />
            </div>
            <div className="space-y-2">
              <Label>정지 기간</Label>
              <Select
                value={suspendDurationType}
                onValueChange={(value) =>
                  setSuspendDurationType(value as "indefinite" | "period" | "until_date")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="정지 기간 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="indefinite">무기한</SelectItem>
                  <SelectItem value="period">기간 지정</SelectItem>
                  <SelectItem value="until_date">날짜 지정</SelectItem>
                </SelectContent>
              </Select>
              {suspendDurationType === "period" && (
                <Input
                  type="number"
                  min="1"
                  value={suspendDurationDays}
                  onChange={(event) => setSuspendDurationDays(event.target.value)}
                  placeholder="정지 일수"
                />
              )}
              {suspendDurationType === "until_date" && (
                <Input
                  type="date"
                  value={suspendUntilDate}
                  onChange={(event) => setSuspendUntilDate(event.target.value)}
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!suspendTarget || !suspendReason.trim()) return;
                const payload = {
                  userId: suspendTarget.id,
                  reason: suspendReason.trim(),
                  durationType: suspendDurationType,
                  durationDays: suspendDurationType === "period" ? Number(suspendDurationDays) : undefined,
                  untilDate: suspendDurationType === "until_date" ? suspendUntilDate : undefined,
                };
                suspendUserMutation.mutate(payload);
              }}
              disabled={!suspendReason.trim() || suspendUserMutation.isPending}
            >
              {suspendUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              정지 처리
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={userDeleteDialogOpen} onOpenChange={setUserDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>회원 삭제</DialogTitle>
            <DialogDescription>
              {userDeleteTarget?.name}님의 계정을 삭제합니다. 삭제 사유를 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>삭제 유형</Label>
              <Select
                value={userDeleteType}
                onValueChange={(value) => setUserDeleteType(value as "soft" | "hard")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="삭제 유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="soft">소프트 삭제 (복구 가능)</SelectItem>
                  <SelectItem value="hard">하드 삭제 (복구 불가)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-reason">삭제 사유</Label>
              <Textarea
                id="delete-reason"
                value={userDeleteReason}
                onChange={(event) => setUserDeleteReason(event.target.value)}
                placeholder="삭제 사유를 입력하세요"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!userDeleteTarget || !userDeleteReason.trim()) return;
                deleteUserMutation.mutate({
                  userId: userDeleteTarget.id,
                  reason: userDeleteReason.trim(),
                  deletionType: userDeleteType,
                });
              }}
              disabled={!userDeleteReason.trim() || deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              삭제 실행
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>삭제 확인</DialogTitle>
            <DialogDescription>
              "{deleteTarget?.name}"을(를) 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} data-testid="button-cancel-delete">
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteDocumentMutation.isPending || deleteTemplateMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {(deleteDocumentMutation.isPending || deleteTemplateMutation.isPending) ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>템플릿 수정</DialogTitle>
            <DialogDescription>
              템플릿 정보를 수정하세요.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSave}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">템플릿 이름</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editTemplate?.name || ""}
                  data-testid="input-template-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">설명</Label>
                <Input
                  id="description"
                  name="description"
                  defaultValue={editTemplate?.description || ""}
                  data-testid="input-template-description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="promptTemplate">프롬프트 템플릿</Label>
                <Textarea
                  id="promptTemplate"
                  name="promptTemplate"
                  rows={10}
                  defaultValue={editTemplate?.promptTemplate || ""}
                  className="font-mono text-sm"
                  data-testid="input-template-prompt"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} data-testid="button-cancel-edit">
                취소
              </Button>
              <Button type="submit" disabled={updateTemplateMutation.isPending} data-testid="button-save-template">
                {updateTemplateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                저장
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
