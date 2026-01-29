import { cn } from "@/lib/utils";

interface GuideSidebarToggleProps {
  isOpen: boolean;
  onClick: () => void;
}

export function GuideSidebarToggle({ isOpen, onClick }: GuideSidebarToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "fixed top-1/2 -translate-y-1/2 z-[60]",
        "bg-[#2563eb] text-white border-none",
        "py-4 px-3 rounded-l-lg cursor-pointer",
        "text-[13px] font-medium",
        "writing-mode-vertical-rl",
        "shadow-[-2px_0_8px_rgba(0,0,0,0.1)]",
        "transition-[right] duration-300 ease-in-out",
        "flex items-center gap-2",
        "hover:bg-[#1d4ed8]",
        isOpen ? "right-[360px]" : "right-0"
      )}
      style={{ writingMode: "vertical-rl" }}
      aria-expanded={isOpen}
      aria-label={isOpen ? "작성 가이드 닫기" : "작성 가이드 열기"}
    >
      <span>📖</span>
      <span>작성 가이드</span>
    </button>
  );
}
