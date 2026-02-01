import { useState, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

// 스파클 아이콘 컴포넌트
export const SparkleIcon = ({ className }: { className?: string }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    className={className}
  >
    <path
      d="M8 0L9.79 5.47L15.6 6.18L11.35 10.13L12.58 15.82L8 13.27L3.42 15.82L4.65 10.13L0.4 6.18L6.21 5.47L8 0Z"
      fill="currentColor"
    />
  </svg>
);

// AI 생성 버튼 공통 스타일
export const aiButtonStyles = {
  base: "inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-blue-500 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg hover:from-violet-600 hover:to-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md",
  generating: "from-violet-400 to-blue-400",
};

// 간단한 스타일 버튼 (API 로직 없이 스타일만 적용)
interface AIStyledButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  children?: React.ReactNode;
}

export function AIStyledButton({
  isLoading = false,
  children = "AI 생성",
  className,
  disabled,
  ...props
}: AIStyledButtonProps) {
  return (
    <button
      type="button"
      disabled={isLoading || disabled}
      className={cn(
        aiButtonStyles.base,
        isLoading && aiButtonStyles.generating,
        className
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          생성 중...
        </>
      ) : (
        <>
          <SparkleIcon />
          {children}
        </>
      )}
    </button>
  );
}

interface AIGenerateButtonProps {
  fieldName: string;
  context: Record<string, unknown>;
  onGenerated: (text: string) => void;
  documentType?: "afterschool" | "care";
  endpoint?: string;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function AIGenerateButton({
  fieldName,
  context,
  onGenerated,
  documentType = "afterschool",
  endpoint,
  disabled = false,
  className = "",
}: AIGenerateButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (isGenerating || disabled) return;

    setIsGenerating(true);

    try {
      const response = await apiRequest("POST", endpoint ?? "/api/afterschool/generate-ai-content", {
        fieldName,
        context,
        documentType,
      });

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error(
          `서버 응답이 JSON이 아닙니다. API 경로를 확인해 주세요. (${text.slice(0, 120)}...)`,
        );
      }

      const data = await response.json();

      if (data.success) {
        onGenerated(data.text);
        toast({
          title: "AI 생성 완료",
          description: "내용이 생성되었습니다. 필요시 수정해주세요.",
        });
      } else {
        throw new Error(data.error || "AI 생성에 실패했습니다.");
      }
    } catch (error) {
      console.error("AI 생성 오류:", error);
      toast({
        title: "AI 생성 실패",
        description: error instanceof Error ? error.message : "잠시 후 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={isGenerating || disabled}
      className={cn(
        aiButtonStyles.base,
        isGenerating && aiButtonStyles.generating,
        className
      )}
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          생성 중...
        </>
      ) : (
        <>
          <SparkleIcon />
          {children || "AI 생성"}
        </>
      )}
    </button>
  );
}
