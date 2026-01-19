import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useRoute } from "wouter";
import { ArrowLeft, Copy, Star, Trash2, Edit3, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface DocumentDetail {
  id: number;
  title: string;
  documentType: string;
  schoolName?: string | null;
  status?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  content?: string | null;
  generatedContent?: string | null;
  isFavorite?: boolean | null;
  referenceFileName?: string | null;
}

export default function MyPageDocumentDetail() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [, params] = useRoute<{ id: string }>("/mypage/document/:id");
  const documentId = params?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["/api/documents", documentId],
    enabled: !!documentId,
    queryFn: async () => {
      const response = await fetch(`/api/documents/${documentId}`);
      return response.json();
    },
  });

  const document: DocumentDetail | undefined = data?.data ?? data;
  const [isEditing, setIsEditing] = useState(() => {
    const search = location.split("?")[1];
    const params = new URLSearchParams(search);
    return params.get("edit") === "1";
  });
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftGenerated, setDraftGenerated] = useState("");
  const [draftStatus, setDraftStatus] = useState<"draft" | "completed">("completed");

  const syncDraft = () => {
    setDraftTitle(document?.title || "");
    setDraftContent(document?.content || "");
    setDraftGenerated(document?.generatedContent || "");
    setDraftStatus(document?.status === "draft" ? "draft" : "completed");
  };

  const favoriteMutation = useMutation({
    mutationFn: async (isFavorite: boolean) => {
      const response = await apiRequest("PATCH", `/api/documents/${documentId}/favorite`, { isFavorite });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/documents/${documentId}/duplicate`, {});
      return response.json();
    },
    onSuccess: (result) => {
      toast({ title: "문서 복사 완료", description: "복사본이 생성되었습니다." });
      if (result?.data?.id) {
        setLocation(`/mypage/document/${result.data.id}`);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/documents/${documentId}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "문서 삭제 완료", description: "문서가 삭제되었습니다." });
      setLocation("/mypage/documents");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PUT", `/api/documents/${documentId}`, {
        title: draftTitle,
        content: draftContent,
        generatedContent: draftGenerated,
        status: draftStatus,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "문서 수정 완료", description: "문서가 수정되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setIsEditing(false);
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/mypage/documents">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-foreground">문서 상세</h1>
            <p className="text-sm text-muted-foreground">저장된 문서를 확인합니다.</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">문서를 불러오는 중...</p>
        ) : !document ? (
          <p className="text-sm text-muted-foreground">문서를 찾을 수 없습니다.</p>
        ) : (
          <>
            <Card>
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between">
                  {isEditing ? (
                    <Input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} />
                  ) : (
                    <CardTitle>{document.title}</CardTitle>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => favoriteMutation.mutate(!document.isFavorite)}
                  >
                    <Star className={`h-4 w-4 ${document.isFavorite ? "text-yellow-500 fill-yellow-400" : "text-muted-foreground"}`} />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{document.documentType}</Badge>
                  {isEditing ? (
                    <select
                      value={draftStatus}
                      onChange={(event) => setDraftStatus(event.target.value as "draft" | "completed")}
                      className="border border-border rounded-md px-2 py-1 text-xs"
                    >
                      <option value="completed">완성</option>
                      <option value="draft">임시</option>
                    </select>
                  ) : (
                    <Badge variant={document.status === "draft" ? "outline" : "default"}>
                      {document.status === "draft" ? "임시" : "완성"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground">학교명</p>
                  <p>{document.schoolName || "미입력"}</p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground">작성일</p>
                    <p>{document.createdAt ? new Date(document.createdAt).toLocaleString("ko-KR") : "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">수정일</p>
                    <p>{document.updatedAt ? new Date(document.updatedAt).toLocaleString("ko-KR") : "-"}</p>
                  </div>
                </div>
                {document.referenceFileName && (
                  <div>
                    <p className="text-muted-foreground">참고 파일</p>
                    <p>{document.referenceFileName}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>문서 내용</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea value={draftContent} onChange={(event) => setDraftContent(event.target.value)} rows={8} />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm text-foreground">
                    {document.content || "내용이 없습니다."}
                  </pre>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI 생성 내용</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea value={draftGenerated} onChange={(event) => setDraftGenerated(event.target.value)} rows={8} />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm text-foreground">
                    {document.generatedContent || "AI 생성 내용이 없습니다."}
                  </pre>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (!isEditing) {
                    syncDraft();
                  }
                  setIsEditing((prev) => !prev);
                }}
              >
                <Edit3 className="h-4 w-4 mr-2" /> {isEditing ? "편집 취소" : "수정"}
              </Button>
              {isEditing && (
                <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" /> 저장
                </Button>
              )}
              <Button variant="outline" onClick={() => duplicateMutation.mutate()}>
                <Copy className="h-4 w-4 mr-2" /> 복사
              </Button>
              <Button variant="destructive" onClick={() => deleteMutation.mutate()}>
                <Trash2 className="h-4 w-4 mr-2" /> 삭제
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
