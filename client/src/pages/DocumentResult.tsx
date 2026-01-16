import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, Download, Copy, CheckCircle2, FileText, Clock, Loader2, RefreshCw, FileDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import type { GeneratedDocument } from "@shared/schema";

export default function DocumentResult() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  // Check if document was passed via state (for immediate display after generation)
  const stateDocument = (window.history.state as any)?.document as GeneratedDocument | undefined;

  const { data: fetchedDocument, isLoading, error } = useQuery<GeneratedDocument>({
    queryKey: [`/api/documents/${id}`],
    enabled: !!id && !stateDocument, // Skip API call if document was passed via state
  });
  
  // Use state document if available, otherwise use fetched document
  const document = stateDocument || fetchedDocument;

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
