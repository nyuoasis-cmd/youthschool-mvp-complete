import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, Copy, CheckCircle2, FileText, Clock, Loader2, RefreshCw, FileDown, Paperclip, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import type { DocumentAttachment, GeneratedDocument } from "@shared/schema";

export default function DocumentResult() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  
  // Check if document was passed via state (for immediate display after generation)
  const stateDocument = (window.history.state as any)?.document as GeneratedDocument | undefined;

  const { data: fetchedDocument, isLoading, error } = useQuery<GeneratedDocument>({
    queryKey: [`/api/documents/${id}`],
    enabled: !!id && !stateDocument, // Skip API call if document was passed via state
  });
  
  // Use state document if available, otherwise use fetched document
  const document = stateDocument || fetchedDocument;
  const canManageAttachments = !!document?.userId && isAuthenticated && `${user?.id}` === document.userId;
  const attachmentsEndpoint = document ? `/api/documents/${document.id}/attachments` : null;

  const { data: attachments } = useQuery<DocumentAttachment[]>({
    queryKey: [attachmentsEndpoint],
    enabled: canManageAttachments && !!attachmentsEndpoint,
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!document) {
        throw new Error("문서 정보를 찾을 수 없습니다.");
      }
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/documents/${document.id}/attachments`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "첨부파일 업로드에 실패했습니다.");
      }

      return response.json();
    },
    onSuccess: () => {
      if (attachmentsEndpoint) {
        queryClient.invalidateQueries({ queryKey: [attachmentsEndpoint] });
      }
      toast({
        title: "업로드 완료",
        description: "첨부파일이 저장되었습니다.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "업로드 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachmentId: number) => {
      const response = await fetch(`/api/attachments/${attachmentId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "첨부파일 삭제에 실패했습니다.");
      }
    },
    onSuccess: () => {
      if (attachmentsEndpoint) {
        queryClient.invalidateQueries({ queryKey: [attachmentsEndpoint] });
      }
      toast({
        title: "삭제 완료",
        description: "첨부파일이 삭제되었습니다.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "삭제 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCopy = async () => {
    if (!document?.generatedContent) return;
    
    try {
      await navigator.clipboard.writeText(document.generatedContent);
      setCopied(true);
      toast({
        title: "복사 완료",
        description: "문서 내용이 클립보드에 복사되었습니다.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "복사 실패",
        description: "클립보드에 복사할 수 없습니다.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = (format: "txt" | "docx" | "pdf") => {
    if (!document?.generatedContent) return;

    if (format === "txt") {
      const blob = new Blob([document.generatedContent], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `${document.title || "document"}.txt`;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      const downloadUrl = `/api/documents/${document.id}/export/${format}`;
      const a = window.document.createElement("a");
      a.href = downloadUrl;
      a.download = `${document.title || "document"}.${format}`;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
    }

    toast({
      title: "다운로드 시작",
      description: `${format.toUpperCase()} 파일이 다운로드됩니다.`,
    });
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    for (const file of files) {
      await uploadAttachmentMutation.mutateAsync(file);
    }
    e.target.value = "";
  };

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size}B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
    return `${(size / (1024 * 1024)).toFixed(1)}MB`;
  };

  const formatAttachmentDate = (date: string | Date | null) => {
    if (!date) return "";
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(date));
  };

  // Only show loading if we're fetching and don't have state document
  if (isLoading && !stateDocument) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">문서를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-6">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">문서를 찾을 수 없습니다</h2>
            <p className="text-muted-foreground mb-6">
              요청하신 문서가 존재하지 않거나 삭제되었습니다.
            </p>
            <Button asChild data-testid="button-back-home">
              <Link href="/">홈으로 돌아가기</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild data-testid="button-back">
                <Link href="/">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-foreground">문서 생성 완료</h1>
                <p className="text-sm text-muted-foreground">{document.title}</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              생성 완료
            </Badge>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Document Info */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-xl">{document.title}</CardTitle>
                <CardDescription className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {document.documentType}
                  </span>
                  {document.processingTimeMs && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {(document.processingTimeMs / 1000).toFixed(1)}초
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  data-testid="button-copy"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      복사됨
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      복사
                    </>
                  )}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" data-testid="button-download">
                      <FileDown className="w-4 h-4 mr-2" />
                      내보내기
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => handleDownload("docx")}
                      data-testid="button-download-docx"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      DOCX (Word)
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDownload("pdf")}
                      data-testid="button-download-pdf"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDownload("txt")}
                      data-testid="button-download-txt"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      텍스트
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Attachments */}
        {document && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-primary" />
                    첨부파일
                  </CardTitle>
                  <CardDescription>
                    관련 자료를 첨부하여 문서와 함께 관리할 수 있습니다.
                  </CardDescription>
                </div>
                {canManageAttachments && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      multiple
                      onChange={handleAttachmentUpload}
                      className="hidden"
                      id="attachment-upload"
                      disabled={uploadAttachmentMutation.isPending}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-testid="button-upload-attachment"
                      disabled={uploadAttachmentMutation.isPending}
                      onClick={() => {
                        const input = window.document.getElementById("attachment-upload") as HTMLInputElement | null;
                        input?.click();
                      }}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadAttachmentMutation.isPending ? "업로드 중..." : "파일 첨부"}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!canManageAttachments ? (
                <div className="text-sm text-muted-foreground">
                  첨부파일 기능은 로그인 후 생성한 문서에서만 사용할 수 있습니다.
                </div>
              ) : attachments && attachments.length > 0 ? (
                <div className="space-y-3">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-lg"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-md bg-muted">
                          <Paperclip className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{attachment.originalName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.fileSize)} · {formatAttachmentDate(attachment.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const url = `/api/attachments/${attachment.id}/download`;
                            const link = window.document.createElement("a");
                            link.href = url;
                            link.click();
                          }}
                          data-testid={`button-download-attachment-${attachment.id}`}
                        >
                          <FileDown className="w-4 h-4 mr-2" />
                          다운로드
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAttachmentMutation.mutate(attachment.id)}
                          disabled={deleteAttachmentMutation.isPending}
                          data-testid={`button-delete-attachment-${attachment.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          삭제
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">첨부된 파일이 없습니다.</div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Generated Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">생성된 문서</CardTitle>
            <CardDescription>
              AI가 생성한 문서 내용입니다. 필요에 따라 수정하여 사용하세요.
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div 
              className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-foreground leading-relaxed"
              data-testid="text-generated-content"
            >
              {document.generatedContent}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Button 
            variant="outline" 
            className="flex-1"
            asChild
            data-testid="button-create-new"
          >
            <Link href="/">
              <RefreshCw className="w-4 h-4 mr-2" />
              새 문서 작성
            </Link>
          </Button>
          <Button 
            variant="outline" 
            className="flex-1"
            asChild
            data-testid="button-view-history"
          >
            <Link href="/history">
              <FileText className="w-4 h-4 mr-2" />
              생성 이력 보기
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
