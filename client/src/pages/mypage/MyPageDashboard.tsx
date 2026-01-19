import { useQuery } from "@tanstack/react-query";
import { BarChart3, FileText, Star, Archive, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsResponse {
  totalDocuments: number;
  documentsByType: Record<string, number>;
  documentsByStatus: { draft: number; completed: number };
  recentActivity: Array<{ date: string; count: number }>;
  favoriteCount: number;
}

export default function MyPageDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/documents/stats"],
  });

  const stats: StatsResponse | undefined = data?.data ?? data;

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
