import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { BarChart3, FileText, Star, Archive, CheckCircle2, ChevronRight, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface StatsResponse {
  totalDocuments: number;
  documentsByType: Record<string, number>;
  documentsByStatus: { draft: number; completed: number };
  recentActivity: Array<{ date: string; count: number }>;
  favoriteCount: number;
}

interface RecentDocument {
  id: number;
  title: string;
  documentType: string;
  status: string;
  createdAt: string;
}

// 문서 타입별 폼 페이지 URL
const getEditUrl = (doc: RecentDocument): string => {
  const typeToPath: Record<string, string> = {
    "급식안내문": "/create/meal-notice",
    "결석신고서": "/create/absence-report",
    "수능안내문": "/create/suneung-notice",
    "채용공고": "/create/recruitment-notice",
    "참가신청서": "/create/participation-form",
    "강의계획서": "/create/syllabus",
    "현장체험학습": "/create/field-trip",
    "개인정보동의서": "/create/consent-form",
  };
  const basePath = typeToPath[doc.documentType] || `/mypage/document/${doc.id}`;
  return `${basePath}?id=${doc.id}`;
};

// 문서 타입별 아이콘
const getDocIcon = (type: string): string => {
  const icons: Record<string, string> = {
    "급식안내문": "🍱",
    "결석신고서": "📝",
    "수능안내문": "📋",
    "채용공고": "📢",
    "참가신청서": "📄",
    "강의계획서": "📚",
    "현장체험학습": "🌿",
    "개인정보동의서": "🔒",
  };
  return icons[type] || "📄";
};

export default function MyPageDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/documents/stats"],
  });

  const { data: recentData } = useQuery({
    queryKey: ["/api/documents", "recent"],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "5", sortBy: "updatedAt", order: "desc" });
      const response = await fetch(`/api/documents?${params.toString()}`, { credentials: "include" });
      const payload = await response.json();
      return payload?.data?.documents ?? [];
    },
  });

  const stats: StatsResponse | undefined = data?.data ?? data;
  const recentDocs: RecentDocument[] = recentData ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>대시보드</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">통계를 불러오는 중...</p>
          ) : (
            <div className="grid md:grid-cols-4 gap-4">
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" /> 전체 문서
                </div>
                <p className="text-2xl font-semibold">{stats?.totalDocuments ?? 0}</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4" /> 완성 문서
                </div>
                <p className="text-2xl font-semibold">{stats?.documentsByStatus?.completed ?? 0}</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Archive className="h-4 w-4" /> 임시 저장
                </div>
                <p className="text-2xl font-semibold">{stats?.documentsByStatus?.draft ?? 0}</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="h-4 w-4" /> 즐겨찾기
                </div>
                <p className="text-2xl font-semibold">{stats?.favoriteCount ?? 0}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 최근 문서 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> 최근 문서
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/mypage/documents">
              전체 보기 <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentDocs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-4">아직 저장된 문서가 없습니다.</p>
              <Button asChild>
                <Link href="/">새 문서 작성하기</Link>
              </Button>
            </div>
          ) : (
            recentDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg">
                  {getDocIcon(doc.documentType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={doc.status === "draft" ? "outline" : "secondary"} className="text-xs">
                      {doc.status === "draft" ? "임시" : "완성"}
                    </Badge>
                    <span>{new Date(doc.createdAt).toLocaleDateString("ko-KR")}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" asChild>
                  <Link href={getEditUrl(doc)}>
                    <Edit className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> 최근 활동
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(stats?.recentActivity ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">최근 활동이 없습니다.</p>
            ) : (
              stats?.recentActivity?.map((item) => (
                <div key={item.date} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.date}</span>
                  <span className="font-medium">{item.count}건</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>문서 타입별 분포</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats && Object.keys(stats.documentsByType || {}).length > 0 ? (
              Object.entries(stats.documentsByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{type}</span>
                  <span className="font-medium">{count}건</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">문서 데이터가 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
