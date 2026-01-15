import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, FileText, Layout, Trash2, Plus, BarChart3, Edit, Loader2 } from "lucide-react";
import type { Template, GeneratedDocument } from "@shared/schema";

interface Stats {
  totalDocuments: number;
  totalTemplates: number;
  documentsByType: Record<string, number>;
}

export default function Admin() {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "document" | "template"; id: number; name: string } | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  const { data: templates, isLoading: templatesLoading } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const { data: documents, isLoading: documentsLoading } = useQuery<GeneratedDocument[]>({
    queryKey: ["/api/documents"],
  });

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

  const handleDelete = () => {
    if (!deleteTarget) return;
    
    if (deleteTarget.type === "document") {
      deleteDocumentMutation.mutate(deleteTarget.id);
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
            <TabsTrigger value="templates" data-testid="tab-templates">템플릿 관리</TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-documents">문서 관리</TabsTrigger>
          </TabsList>

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
        </Tabs>
      </main>

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
