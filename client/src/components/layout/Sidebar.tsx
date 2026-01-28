import { useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, FolderOpen, MessageSquare, MoreHorizontal, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const menuItems = [
  { icon: MessageSquare, label: "새 대화", path: "/chat" },
  { icon: FileText, label: "문서 도구", path: "/" },
  { icon: FolderOpen, label: "내 문서", path: "/mypage/documents" },
  { icon: Settings, label: "관리자", path: "/admin", adminOnly: true },
];

type RecentDocument = {
  id: number;
  title: string;
  documentType: string;
  updatedAt?: string;
  createdAt?: string;
};

const ADMIN_USER_TYPES = new Set(["system_admin", "operator"]);

export function Sidebar() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isAdminUser = user ? ADMIN_USER_TYPES.has(user.userType) : false;
  const visibleMenuItems = useMemo(
    () => menuItems.filter((item) => !item.adminOnly || isAdminUser),
    [isAdminUser],
  );

  const { data: recentDocuments = [], isLoading } = useQuery({
    queryKey: ["/api/documents", "sidebar", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", "6");
      params.set("sortBy", "updatedAt");
      params.set("order", "desc");
      const response = await fetch(`/api/documents?${params.toString()}`, {
        credentials: "include",
      });
      const payload = await response.json();
      return (payload?.data?.documents ?? []) as RecentDocument[];
    },
  });

  const handleRename = async (doc: RecentDocument) => {
    const nextTitle = window.prompt("새 이름을 입력하세요:", doc.title);
    if (!nextTitle || nextTitle.trim() === doc.title) return;
    await apiRequest("PUT", `/api/documents/${doc.id}`, { title: nextTitle.trim() });
    queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
  };

  const handleDuplicate = async (doc: RecentDocument) => {
    await apiRequest("POST", `/api/documents/${doc.id}/duplicate`, {});
    queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
  };

  const handleDelete = async (doc: RecentDocument) => {
    const confirmed = window.confirm("정말 삭제하시겠습니까?");
    if (!confirmed) return;
    await apiRequest("DELETE", `/api/documents/${doc.id}`);
    queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
  };

  const getDocumentIcon = (type: string) => {
    if (type.includes("가정")) return "📮";
    if (type.includes("급식")) return "🍽️";
    if (type.includes("현장")) return "🎒";
    if (type.includes("방과후")) return "📚";
    if (type.includes("예산")) return "💰";
    if (type.includes("안전")) return "🛡️";
    return "📄";
  };

  return (
    <nav className="flex h-full flex-col px-2 py-4">
      <div className="space-y-2 px-2">
        {visibleMenuItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          location === item.path || location.startsWith(item.path + "/");

        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              "hover:bg-muted",
              isActive && "bg-muted font-medium",
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </button>
        );
      })}
      </div>

      <div className="mt-4 border-t pt-4">
        <div className="px-3 pb-2 text-xs font-medium text-muted-foreground">최근 문서</div>
        <div className="space-y-1 px-1">
          {!user && (
            <p className="px-2 text-xs text-muted-foreground">
              로그인 후 최근 문서를 확인할 수 있어요.
            </p>
          )}
          {user && isLoading && (
            <p className="px-2 text-xs text-muted-foreground">최근 문서를 불러오는 중...</p>
          )}
          {user && !isLoading && recentDocuments.length === 0 && (
            <p className="px-2 text-xs text-muted-foreground">최근 문서가 없습니다.</p>
          )}
          {recentDocuments.map((doc) => (
            <div
              key={doc.id}
              className="group flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-muted"
            >
              <button
                type="button"
                className="flex flex-1 items-center gap-2 text-left text-sm"
                onClick={() => navigate(`/result/${doc.id}`)}
              >
                <span className="text-base">{getDocumentIcon(doc.documentType)}</span>
                <span className="truncate">{doc.title}</span>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="문서 메뉴"
                    className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-background group-hover:opacity-100"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => handleRename(doc)}>
                    📝 이름 변경
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicate(doc)}>
                    📋 복제
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => handleDelete(doc)}
                  >
                    🗑️ 삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}
