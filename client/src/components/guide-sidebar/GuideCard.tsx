import { cn } from "@/lib/utils";

export type TagType = "default" | "tip" | "important";

interface GuideCardTag {
  text: string;
  type: TagType;
}

interface GuideCardExample {
  title: string;
  content: string;
}

interface GuideCardProps {
  title: string;
  tag?: GuideCardTag;
  children: React.ReactNode;
  example?: GuideCardExample;
}

const tagStyles: Record<TagType, string> = {
  default: "bg-[#e0f2fe] text-[#0369a1]",
  tip: "bg-[#fef3c7] text-[#92400e]",
  important: "bg-[#fee2e2] text-[#dc2626]",
};

export function GuideCard({ title, tag, children, example }: GuideCardProps) {
  return (
    <div className="bg-[#fafafa] rounded-xl p-4 mb-3">
      <div className="text-sm font-semibold text-[#333] mb-2 flex items-center gap-2">
        {title}
        {tag && (
          <span
            className={cn(
              "text-[11px] font-medium px-2 py-0.5 rounded",
              tagStyles[tag.type]
            )}
          >
            {tag.text}
          </span>
        )}
      </div>
      <div className="text-[13px] text-[#555] leading-[1.7]">{children}</div>
      {example && (
        <div className="bg-white border border-[#e5e5e5] rounded-md p-2.5 mt-2.5">
          <strong className="text-[#333] text-xs block mb-1">{example.title}</strong>
          <span className="text-xs text-[#666] whitespace-pre-line">{example.content}</span>
        </div>
      )}
    </div>
  );
}

// 텍스트 스타일 헬퍼 컴포넌트
export function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-[#fef9c3] px-1 py-px rounded font-medium">
      {children}
    </span>
  );
}

export function BlueText({ children }: { children: React.ReactNode }) {
  return <span className="text-[#2563eb] font-medium">{children}</span>;
}
