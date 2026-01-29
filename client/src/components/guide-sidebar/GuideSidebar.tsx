import { cn } from "@/lib/utils";
import { GuideSidebarToggle } from "./GuideSidebarToggle";
import { X } from "lucide-react";

interface GuideSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  title: string;
  children: React.ReactNode;
}

export function GuideSidebar({
  isOpen,
  onToggle,
  title,
  children,
}: GuideSidebarProps) {
  return (
    <>
      {/* 토글 버튼 */}
      <GuideSidebarToggle isOpen={isOpen} onClick={onToggle} />

      {/* 사이드바 패널 */}
      <aside
        className={cn(
          "fixed top-[73px] right-0 w-[360px] h-[calc(100vh-73px)]",
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
            type="button"
            onClick={onToggle}
            className="bg-transparent border-none text-2xl text-[#999] cursor-pointer p-1 hover:text-[#666] transition-colors"
            aria-label="사이드바 닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="py-5 px-6">{children}</div>
      </aside>

      {/* 모바일 오버레이 (768px 이하) */}
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
