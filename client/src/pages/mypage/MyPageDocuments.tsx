import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Calendar, Eye, List, LayoutGrid, Star, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export interface DocumentRow {
  id: number;
  title: string;
  documentType: string;
  schoolName?: string | null;
  status?: string | null;
  createdAt?: string | Date | null;
  isFavorite?: boolean | null;
}

interface DocumentsPageProps {
  initialStatus?: "draft" | "completed";
  initialFavorite?: boolean;
}

const documentTypeOptions = [
  "전체",
  "가정통신문",
  "외부 교육 용역 계획서",
  "방과후학교 운영계획서",
  "초등돌봄교실 운영계획서",
  "현장체험학습 운영계획서",
  "학교 안전교육 계획서",
  "학교폭력 예방 교육 계획서",
  "교내 행사 운영계획서",
  "학부모총회 안내",
  "예산/결산 공개 자료",
];

const sortOptions = [
  { value: "createdAt:desc", label: "최신순" },
  { value: "createdAt:asc", label: "오래된순" },
  { value: "title:asc", label: "제목순" },
];

export default function MyPageDocuments({ initialStatus, initialFavorite }: DocumentsPageProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [documentType, setDocumentType] = useState("전체");
  const [status, setStatus] = useState<string>(initialStatus ?? "all");
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [sortValue, setSortValue] = useState(sortOptions[0].value);
  const [page, setPage] = useState(1);

  const [sortBy, order] = sortValue.split(":") as ["createdAt" | "updatedAt" | "title", "asc" | "desc"];

  const queryKey = [
    "/api/documents",
    { search, documentType, status, viewMode, sortBy, order, page, initialFavorite },
  ];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      params.set("sortBy", sortBy);
      params.set("order", order);
      if (search.trim()) params.set("search", search.trim());
      if (documentType !== "전체") params.set("documentType", documentType);
      if (status !== "all") params.set("status", status);
      if (typeof initialFavorite === "boolean") params.set("isFavorite", String(initialFavorite));

      const response = await fetch(`/api/documents?${params.toString()}`);
      const payload = await response.json();
      return payload?.data ?? { documents: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } };
    },
  });

  const documents: DocumentRow[] = data?.documents ?? [];
  const pagination = data?.pagination ?? { total: 0, page: 1, limit: 20, totalPages: 1 };

  const statusCounts = useMemo(() => {
    const total = pagination.total || 0;
    const drafts = initialStatus === "draft" ? total : undefined;
    const completed = initialStatus === "completed" ? total : undefined;
    return { total, drafts, completed };
  }, [pagination.total, initialStatus]);

  const favoriteMutation = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: number; isFavorite: boolean }) => {
      const response = await apiRequest("PATCH", `/api/documents/${id}/favorite`, { isFavorite });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/documents/${id}/duplicate`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "문서 복사 완료", description: "복사본이 생성되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/documents/${id}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "문서 삭제 완료", description: "문서가 삭제되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
  });

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>전체 문서</CardTitle>
            <CardDescription>생성하거나 저장한 문서를 관리합니다.</CardDescription>
          </div>
          <Button asChild>
            <Link href="/">+ 새 문서</Link>
          </Button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-3">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="제목, 학교명, 내용으로 검색"
            />
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger className="md:w-56">
                <SelectValue placeholder="문서 타입" />
              </SelectTrigger>
              <SelectContent>
                {documentTypeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortValue} onValueChange={setSortValue}>
              <SelectTrigger className="md:w-40">
                <SelectValue placeholder="정렬" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <Tabs value={status} onValueChange={setStatus}>
              <TabsList>
                <TabsTrigger value="all">전체 ({statusCounts.total})</TabsTrigger>
                <TabsTrigger value="completed">완성</TabsTrigger>
                <TabsTrigger value="draft">임시</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "card" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("card")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">문서 목록을 불러오는 중...</div>
        ) : documents.length === 0 ? (
          <div className="text-sm text-muted-foreground">표시할 문서가 없습니다.</div>
        ) : viewMode === "card" ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <Card key={doc.id} className="border border-border">
                <CardHeader className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{doc.documentType}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => favoriteMutation.mutate({ id: doc.id, isFavorite: !doc.isFavorite })}
                    >
                      <Star className={`h-4 w-4 ${doc.isFavorite ? "text-yellow-500 fill-yellow-400" : "text-muted-foreground"}`} />
                    </Button>
                  </div>
                  <CardTitle className="text-base">{doc.title}</CardTitle>
                  <CardDescription>{doc.schoolName || "학교명 미입력"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString("ko-KR") : "-"}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant={doc.status === "draft" ? "outline" : "default"}>
                      {doc.status === "draft" ? "임시" : "완성"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/mypage/document/${doc.id}`}>
                        <Eye className="h-4 w-4 mr-1" /> 보기
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/mypage/document/${doc.id}?edit=1`}>
                        수정
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => duplicateMutation.mutate(doc.id)}>
                      <Copy className="h-4 w-4 mr-1" /> 복사
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(doc.id)}>
                      <Trash2 className="h-4 w-4 mr-1" /> 삭제
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between border-b border-border pb-2">
                <div>
                  <p className="text-sm font-medium">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.documentType} · {doc.schoolName || "학교명 미입력"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={doc.status === "draft" ? "outline" : "default"}>
                    {doc.status === "draft" ? "임시" : "완성"}
                  </Badge>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/mypage/document/${doc.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/mypage/document/${doc.id}?edit=1`}>
                      수정
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => favoriteMutation.mutate({ id: doc.id, isFavorite: !doc.isFavorite })}>
                    <Star className={`h-4 w-4 ${doc.isFavorite ? "text-yellow-500 fill-yellow-400" : "text-muted-foreground"}`} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(doc.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1}>
            이전
          </Button>
          <span className="text-xs text-muted-foreground">
            {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
            disabled={page >= pagination.totalPages}
          >
            다음
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
