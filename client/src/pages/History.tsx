import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, FileText, Clock, Briefcase, Loader2, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { GeneratedDocument } from "@shared/schema";

function formatDate(dateString: string | Date | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getDocumentIcon(documentType: string) {
  if (documentType === "가정통신문") {
    return FileText;
  }
  return Briefcase;
}

export default function History() {
  const { data: documents, isLoading, error } = useQuery<GeneratedDocument[]>({
    queryKey: ["/api/documents"],
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild data-testid="button-back">
              <Link href="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">생성 이력</h1>
              <p className="text-sm text-muted-foreground">이전에 생성한 문서 목록입니다</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">문서 목록을 불러오는 중...</p>
            </div>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">문서 목록을 불러오는데 실패했습니다.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                다시 시도
              </Button>
            </CardContent>
          </Card>
        ) : !documents || documents.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Inbox className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                생성된 문서가 없습니다
              </h3>
              <p className="text-muted-foreground mb-6">
                첫 번째 문서를 생성해 보세요!
              </p>
              <Button asChild data-testid="button-create-first">
                <Link href="/">문서 생성하기</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {documents.map((doc) => {
              const IconComponent = getDocumentIcon(doc.documentType);
              return (
                <Link key={doc.id} href={`/result/${doc.id}`}>
                  <Card 
                    className="hover-elevate active-elevate-2 cursor-pointer transition-all"
                    data-testid={`card-document-${doc.id}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <IconComponent className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{doc.title}</CardTitle>
                            <CardDescription className="flex items-center gap-3 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {doc.documentType}
                              </Badge>
                              {doc.createdAt && (
                                <span className="flex items-center gap-1 text-xs">
                                  <Clock className="w-3 h-3" />
                                  {formatDate(doc.createdAt)}
                                </span>
                              )}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge 
                          variant={doc.status === "completed" ? "secondary" : "outline"}
                          className={doc.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : ""}
                        >
                          {doc.status === "completed" ? "완료" : doc.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    {doc.generatedContent && (
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {doc.generatedContent.substring(0, 150)}...
                        </p>
                      </CardContent>
                    )}
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
