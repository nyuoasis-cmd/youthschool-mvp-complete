import { ReactNode } from "react";
import { Link } from "wouter";
import { BarChart3, FileText, Star, Archive, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
}

interface MyPageLayoutProps {
  activePath: string;
  children: ReactNode;
}

const baseItems: NavItem[] = [
  { href: "/mypage", label: "대시보드", icon: <BarChart3 className="h-4 w-4" /> },
  { href: "/mypage/documents", label: "전체 문서", icon: <FileText className="h-4 w-4" /> },
  { href: "/mypage/favorites", label: "즐겨찾기", icon: <Star className="h-4 w-4" /> },
  { href: "/mypage/drafts", label: "임시 저장", icon: <Archive className="h-4 w-4" /> },
  { href: "/mypage/completed", label: "완성 문서", icon: <CheckCircle2 className="h-4 w-4" /> },
];

export default function MyPageLayout({ activePath, children }: MyPageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-foreground">
            유스쿨
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="w-full lg:w-60 shrink-0">
            <Card className="p-4 space-y-1">
              {baseItems.map((item) => {
                const isActive = activePath === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
              <div className="pt-2 mt-2 border-t border-border">
                <p className="text-xs text-muted-foreground px-3 py-2">문서 타입</p>
                {[
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
                  "HWP 양식 작성",
                ].map((label) => (
                  <div key={label} className="px-3 py-1 text-xs text-muted-foreground">
                    • {label}
                  </div>
                ))}
              </div>
            </Card>
          </aside>
          <section className="flex-1 space-y-6">{children}</section>
        </div>
      </main>
    </div>
  );
}
