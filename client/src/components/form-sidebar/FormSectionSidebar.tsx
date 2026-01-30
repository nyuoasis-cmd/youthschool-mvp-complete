import { cn } from "@/lib/utils";
import { X, ClipboardCheck } from "lucide-react";

export interface FormSection {
  id: string;
  number: number;
  title: string;
  isComplete?: boolean;
}

interface FormSectionSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  documentTitle: string;
  sections: FormSection[];
  activeSection?: string;
  onSectionClick: (sectionId: string) => void;
}

export function FormSectionSidebar({
  isOpen,
  onToggle,
  documentTitle,
  sections,
  activeSection,
  onSectionClick,
}: FormSectionSidebarProps) {
  const completedCount = sections.filter((s) => s.isComplete).length;

  return (
    <>
      {/* 토글 버튼 */}
      <button
        onClick={onToggle}
        className={cn(
          "fixed top-1/2 -translate-y-1/2 z-[60]",
          "bg-primary text-primary-foreground",
          "border-none py-4 px-3 rounded-r-lg",
          "cursor-pointer text-[13px] font-medium",
          "shadow-[2px_0_8px_rgba(0,0,0,0.1)]",
          "transition-all duration-300 ease-in-out",
          "flex items-center gap-2 hover:opacity-90",
          "[writing-mode:vertical-rl]"
        )}
        style={{ left: isOpen ? "256px" : "0px" }}
      >
        <ClipboardCheck className="w-4 h-4" />
        <span>섹션 목록</span>
      </button>

      {/* 사이드바 패널 */}
      <aside
        className={cn(
          "fixed top-[57px] left-0 w-64 h-[calc(100vh-57px)]",
          "bg-background border-r border-border",
          "transition-transform duration-300 ease-in-out",
          "z-50 overflow-y-auto",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!isOpen}
      >
        <div className="p-6">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-foreground">{documentTitle}</h2>
            <button
              onClick={onToggle}
              className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
              aria-label="사이드바 닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-6">
            {sections.length}개 섹션 중 {completedCount}개 완료
          </p>

          {/* 섹션 네비게이션 */}
          <nav className="space-y-1">
            {sections.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => onSectionClick(section.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0",
                      isActive || section.isComplete
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {section.number}
                  </span>
                  {section.title}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* 모바일 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}
    </>
  );
}
