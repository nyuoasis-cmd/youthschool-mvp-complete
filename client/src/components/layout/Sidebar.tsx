import { useLocation } from "wouter";
import { MessageSquare, FileText, FolderOpen, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { icon: MessageSquare, label: "새 대화", path: "/chat" },
  { icon: FileText, label: "문서 도구", path: "/" },
  { icon: FolderOpen, label: "내 문서", path: "/mypage/documents" },
  { icon: Settings, label: "관리자", path: "/admin", adminOnly: true },
];

export function Sidebar() {
  const [location, navigate] = useLocation();

  return (
    <nav className="p-4 space-y-2">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          location === item.path || location.startsWith(item.path + "/");

        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
              "hover:bg-accent",
              isActive && "bg-accent font-medium",
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
