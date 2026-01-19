import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AIGenerateButtonProps {
  fieldName: string;
  context: Record<string, unknown>;
  onGenerated: (text: string) => void;
  documentType?: "afterschool" | "care";
  endpoint?: string;
  disabled?: boolean;
  className?: string;
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
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      disabled={isGenerating || disabled}
      className={`ai-generate-btn ${className}`}
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          생성 중...
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4 mr-1.5" />
          AI 생성
        </>
      )}
    </Button>
  );
}
