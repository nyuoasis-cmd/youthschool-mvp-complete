import { cn } from "@/lib/utils";
import { X, BookOpen } from "lucide-react";

export interface GuideItem {
  label: string;
  description: string;
}

export interface GuideTip {
  type: "warning" | "info";
  text: string;
}

export interface GuideSection {
  number: number;
  title: string;
  subtitle?: string;
  items: GuideItem[];
  tip?: GuideTip;
}

interface FormGuideSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  title?: string;
  sections: GuideSection[];
}

export function FormGuideSidebar({
  isOpen,
  onToggle,
  title = "작성 가이드",
  sections,
}: FormGuideSidebarProps) {
  return (
    <>
      {/* 토글 버튼 */}
      <button
        onClick={onToggle}
        className={cn(
          "fixed top-1/2 -translate-y-1/2 z-[60]",
          "bg-[#2563eb] text-white",
          "border-none py-4 px-3 rounded-l-lg",
          "cursor-pointer text-[13px] font-medium",
          "shadow-[-2px_0_8px_rgba(0,0,0,0.1)]",
          "transition-all duration-300 ease-in-out",
          "flex items-center gap-2 hover:bg-[#1d4ed8]",
          "[writing-mode:vertical-rl]"
        )}
        style={{ right: isOpen ? "360px" : "0px" }}
      >
        <span>📖</span>
        <span>{title}</span>
      </button>

      {/* 사이드바 패널 */}
      <aside
        className={cn(
          "fixed top-[57px] right-0 w-[360px] h-[calc(100vh-57px)]",
          "bg-white border-l border-[#e5e5e5]",
          "transition-transform duration-300 ease-in-out",
          "z-50 overflow-y-auto",
          "scrollbar-thin scrollbar-track-[#f1f1f1] scrollbar-thumb-[#ccc]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        aria-hidden={!isOpen}
      >
        {/* 헤더 */}
        <div className="flex justify-between items-center py-5 px-6 border-b border-[#e5e5e5] sticky top-0 bg-white z-10">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <span>📖</span>
            {title}
          </h3>
          <button
            onClick={onToggle}
            className="bg-transparent border-none text-2xl text-[#999] cursor-pointer p-1 hover:text-[#666] transition-colors"
            aria-label="사이드바 닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="py-5 px-6 space-y-4">
          {sections.map((section, idx) => (
            <div
              key={idx}
              className="bg-[#f8fafc] rounded-lg p-4 border border-[#e2e8f0]"
            >
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <span
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-xs",
                    idx === 0
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {section.number}
                </span>
                {section.title}
                {section.subtitle && (
                  <span className="text-xs font-normal text-muted-foreground">
                    {section.subtitle}
                  </span>
                )}
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                {section.items.map((item, itemIdx) => (
                  <li key={itemIdx}>
                    <strong>{item.label}:</strong> {item.description}
                  </li>
                ))}
              </ul>
              {section.tip && (
                <p
                  className={cn(
                    "text-xs mt-2",
                    section.tip.type === "warning"
                      ? "text-amber-600"
                      : "text-primary"
                  )}
                >
                  {section.tip.type === "warning" ? "⚠️" : "💡"} {section.tip.text}
                </p>
              )}
            </div>
          ))}
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
