import { useRef, useState } from "react";
import { FileUp, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HwpReferenceUploadProps {
  onUploaded: (fileId: number, parsedContent?: unknown) => void;
  onError?: (message: string) => void;
  onClear?: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

export function HwpReferenceUpload({ onUploaded, onError, onClear }: HwpReferenceUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [message, setMessage] = useState<string>("참고 문서 업로드 (선택)");

  const resetState = () => {
    setFileName(null);
    setFileSize(null);
    setMessage("참고 문서 업로드 (선택)");
    onClear?.();
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const validateFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".hwp")) {
      return "⚠ .hwp 파일만 업로드 가능합니다.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "⚠ 파일 크기는 10MB 이하여야 합니다.";
    }
    return null;
  };

  const uploadFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setMessage(validationError);
      onError?.(validationError);
      return;
    }

    setIsUploading(true);
    setMessage("파일 처리 중...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/hwp", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage =
          errorData?.error?.message || errorData?.error || "파일 업로드에 실패했습니다. 다시 시도해주세요.";
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setFileName(data.data.fileName);
      setFileSize(data.data.fileSize);
      setMessage("✓ 참고 문서가 업로드되었습니다");
      onUploaded(data.data.fileId, data.data.parsedContent);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "파일 업로드에 실패했습니다.";
      setMessage(`⚠ ${errorMessage}`);
      onError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadFile(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    uploadFile(file);
  };

  return (
    <div className="space-y-2">
      <div
        className={`rounded-lg border border-dashed px-4 py-4 transition ${
          isDragging ? "border-primary bg-primary/5" : "border-muted"
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm">
            <FileUp className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">참고 문서 업로드 (선택)</p>
              <p className="text-xs text-muted-foreground">{message}</p>
              {fileName && (
                <p className="text-xs text-muted-foreground">
                  {fileName} · {fileSize ? formatSize(fileSize) : "-"}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input ref={inputRef} type="file" accept=".hwp" className="hidden" onChange={handleFileChange} />
            {fileName ? (
              <Button type="button" variant="ghost" size="icon" onClick={resetState} disabled={isUploading}>
                <X className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => inputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 업로드 중...
                  </>
                ) : (
                  "파일 선택"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
