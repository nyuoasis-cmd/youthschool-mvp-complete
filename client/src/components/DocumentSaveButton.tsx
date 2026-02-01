import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentSaveButtonProps {
  onClick: () => void;
  isSaving: boolean;
  variant?: "header" | "footer";
  className?: string;
}

export function DocumentSaveButton({
  onClick,
  isSaving,
  variant = "footer",
  className = "",
}: DocumentSaveButtonProps) {
  if (variant === "header") {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={onClick}
        disabled={isSaving}
        className={`px-5 py-2.5 h-auto ${className}`}
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "저장"
        )}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={isSaving}
      className={`bg-slate-900 hover:bg-slate-800 text-white border-0 ${className}`}
    >
      {isSaving ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          저장 중...
        </>
      ) : (
        "문서 저장"
      )}
    </Button>
  );
}

interface AutoSaveIndicatorProps {
  lastSavedAt: Date | null;
  isSaving: boolean;
  error?: string | null;
}

export function AutoSaveIndicator({ lastSavedAt, isSaving, error }: AutoSaveIndicatorProps) {
  if (error) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-destructive">
        <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
        저장 실패
      </div>
    );
  }

  if (isSaving) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        저장 중...
      </div>
    );
  }

  if (lastSavedAt) {
    const timeStr = lastSavedAt.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        저장됨 {timeStr}
      </div>
    );
  }

  return null;
}
