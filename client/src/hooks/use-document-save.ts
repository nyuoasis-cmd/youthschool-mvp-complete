import { useState, useCallback, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

interface SaveDocumentParams {
  documentType: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
  generatedContent?: string;
  status?: "draft" | "completed";
}

interface UseDocumentSaveOptions {
  documentType: string;
  getFormData: () => Record<string, unknown>;
  getTitle: () => string;
  getContent: () => string;
  getGeneratedContent?: () => string;
  autoSaveInterval?: number; // ms, default 30000 (30초)
  onLoadDocument?: (data: Record<string, unknown>) => void;
}

export function useDocumentSave(options: UseDocumentSaveOptions) {
  const {
    documentType,
    getFormData,
    getTitle,
    getContent,
    getGeneratedContent,
    autoSaveInterval = 30000,
    onLoadDocument,
  } = options;

  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [documentId, setDocumentId] = useState<number | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastFormDataRef = useRef<string>("");

  // URL에서 문서 ID 추출
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) {
      setDocumentId(Number(id));
      loadDocument(Number(id));
    }
  }, []);

  // 문서 불러오기
  const loadDocument = async (id: number) => {
    try {
      const response = await fetch(`/api/documents/${id}`, {
        credentials: "include",
      });
      if (response.ok) {
        const result = await response.json();
        const doc = result.data || result;
        if (doc && onLoadDocument) {
          onLoadDocument(doc.metadata || doc.inputData || {});
        }
      }
    } catch (error) {
      console.error("문서 불러오기 실패:", error);
    }
  };

  // 저장 mutation
  const saveMutation = useMutation({
    mutationFn: async (params: SaveDocumentParams) => {
      const endpoint = documentId
        ? `/api/documents/${documentId}`
        : "/api/documents";
      const method = documentId ? "PUT" : "POST";

      const response = await apiRequest(method, endpoint, {
        documentType: params.documentType,
        title: params.title,
        content: params.content,
        metadata: params.metadata,
        generatedContent: params.generatedContent,
        status: params.status || "completed",
      });

      return response.json();
    },
    onSuccess: (data) => {
      if (!documentId && data.data?.id) {
        setDocumentId(data.data.id);
        // URL 업데이트 (새 문서인 경우)
        const newUrl = `${window.location.pathname}?id=${data.data.id}`;
        window.history.replaceState({}, "", newUrl);
      }
      setLastSavedAt(new Date());
      setSaveError(null);
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
    onError: (error: Error) => {
      setSaveError(error.message);
    },
  });

  // 저장 함수
  const saveDocument = useCallback(
    async (status: "draft" | "completed" = "completed") => {
      if (!isAuthenticated) {
        toast({
          title: "로그인이 필요합니다",
          description: "문서를 저장하려면 로그인해주세요.",
          variant: "destructive",
        });
        setLocation("/login");
        return;
      }

      setIsSaving(true);
      try {
        await saveMutation.mutateAsync({
          documentType,
          title: getTitle(),
          content: getContent(),
          metadata: getFormData(),
          generatedContent: getGeneratedContent?.(),
          status,
        });

        if (status === "completed") {
          toast({
            title: "문서가 저장되었습니다",
            description: "마이페이지에서 확인할 수 있습니다.",
          });
        }
      } catch (error) {
        toast({
          title: "저장에 실패했습니다",
          description: "다시 시도해주세요.",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [isAuthenticated, documentType, getTitle, getContent, getFormData, getGeneratedContent, saveMutation, toast, setLocation]
  );

  // 자동 저장
  const triggerAutoSave = useCallback(() => {
    if (!isAuthenticated) return;

    const currentFormData = JSON.stringify(getFormData());
    if (currentFormData === lastFormDataRef.current) return;

    lastFormDataRef.current = currentFormData;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      saveDocument("draft");
    }, autoSaveInterval);
  }, [isAuthenticated, getFormData, saveDocument, autoSaveInterval]);

  // 클린업
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  return {
    documentId,
    isSaving,
    lastSavedAt,
    saveError,
    saveDocument,
    triggerAutoSave,
    isAuthenticated,
  };
}
