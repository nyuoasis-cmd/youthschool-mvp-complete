import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Upload, Sparkles, Loader2, FileText, Check, AlertCircle, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TemplateField, UploadedTemplate } from "@shared/schema";

export default function TemplateForm() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<UploadedTemplate | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [generatingStatus, setGeneratingStatus] = useState<string>("");

  const templatesQuery = useQuery<UploadedTemplate[]>({
    queryKey: ["/api/uploaded-templates"],
  });

  const templateQuery = useQuery<UploadedTemplate>({
    queryKey: ["/api/uploaded-templates", params.id],
    enabled: !!params.id,
  });

  useEffect(() => {
    if (templateQuery.data) {
      setSelectedTemplate(templateQuery.data);
      const initialValues: Record<string, string> = {};
      (templateQuery.data.extractedFields as TemplateField[] || []).forEach((field) => {
        initialValues[field.name] = field.defaultValue || "";
      });
      setFormValues(initialValues);
    }
  }, [templateQuery.data]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/uploaded-templates/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "파일 업로드에 실패했습니다.");
      }
      
      return response.json();
    },
    onSuccess: (template) => {
      toast({
        title: "업로드 완료",
        description: "HWP 양식이 분석되었습니다. 필드를 확인해주세요.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/uploaded-templates"] });
      setSelectedTemplate(template);
      
      const initialValues: Record<string, string> = {};
      (template.extractedFields as TemplateField[] || []).forEach((field: TemplateField) => {
        initialValues[field.name] = field.defaultValue || "";
      });
      setFormValues(initialValues);
    },
    onError: (error: Error) => {
      toast({
        title: "업로드 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const response = await apiRequest("POST", `/api/uploaded-templates/${templateId}/analyze`, {});
      return response.json();
    },
    onSuccess: (updatedTemplate) => {
      toast({
        title: "분석 완료",
        description: "양식 분석이 완료되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/uploaded-templates"] });
      setSelectedTemplate(updatedTemplate);
      
      const initialValues: Record<string, string> = {};
      (updatedTemplate.extractedFields as TemplateField[] || []).forEach((field: TemplateField) => {
        initialValues[field.name] = field.defaultValue || "";
      });
      setFormValues(initialValues);
    },
    onError: (error: Error) => {
      toast({
        title: "분석 실패",
        description: error.message || "양식 분석 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (data: { templateId: number; inputs: Record<string, string> }) => {
      setGeneratingStatus("AI가 양식에 맞춰 문서를 생성하고 있습니다...");
      const response = await apiRequest("POST", "/api/documents/generate", {
        documentType: selectedTemplate?.documentType || "커스텀 문서",
        inputs: data.inputs,
        uploadedTemplateId: data.templateId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratingStatus("");
      toast({
        title: "문서 생성 완료",
        description: "양식에 맞춰 문서가 생성되었습니다.",
      });
      setLocation(`/result/${data.id}`, { state: { document: data } });
    },
    onError: (error: Error) => {
      setGeneratingStatus("");
      toast({
        title: "문서 생성 실패",
        description: error.message || "문서 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".hwp")) {
      toast({
        title: "파일 형식 오류",
        description: "HWP 파일만 업로드 가능합니다.",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate(file);
  };

  const handleInputChange = (fieldName: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    if (selectedTemplate.status !== "completed") {
      toast({
        title: "양식 분석 중",
        description: "양식 분석이 완료될 때까지 기다려주세요.",
        variant: "destructive",
      });
      return;
    }

    const fields = selectedTemplate.extractedFields as TemplateField[] || [];
    const requiredFields = fields.filter((f) => f.required);
    const missingFields = requiredFields.filter((f) => !formValues[f.name]?.trim());

    if (missingFields.length > 0) {
      toast({
        title: "필수 항목을 입력해주세요",
        description: missingFields.map((f) => f.label).join(", "),
        variant: "destructive",
      });
      return;
    }

    generateMutation.mutate({
      templateId: selectedTemplate.id,
      inputs: formValues,
    });
  };

  const handleSelectTemplate = (template: UploadedTemplate) => {
    setSelectedTemplate(template);
    const initialValues: Record<string, string> = {};
    (template.extractedFields as TemplateField[] || []).forEach((field) => {
      initialValues[field.name] = field.defaultValue || "";
    });
    setFormValues(initialValues);
  };

  const renderField = (field: TemplateField) => {
    const value = formValues[field.name] || "";

    switch (field.type) {
      case "textarea":
        return (
          <Textarea
            id={field.name}
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.description || `${field.label} 입력`}
            className="min-h-[120px]"
            data-testid={`input-${field.name}`}
          />
        );
      case "date":
        return (
          <Input
            id={field.name}
            type="date"
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            data-testid={`input-${field.name}`}
          />
        );
      case "number":
        return (
          <Input
            id={field.name}
            type="number"
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.description || `${field.label} 입력`}
            data-testid={`input-${field.name}`}
          />
        );
      default:
        return (
          <Input
            id={field.name}
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.description || `${field.label} 입력`}
            data-testid={`input-${field.name}`}
          />
        );
    }
  };

  const fields = (selectedTemplate?.extractedFields as TemplateField[]) || [];
  const isProcessing = selectedTemplate?.status === "processing";
  const isCompleted = selectedTemplate?.status === "completed";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild data-testid="button-back">
              <Link href="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">양식 기반 문서 작성</h1>
              <p className="text-sm text-muted-foreground">HWP 양식을 업로드하면 자동으로 입력 항목이 생성됩니다</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {!selectedTemplate ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" />
                  HWP 양식 업로드
                </CardTitle>
                <CardDescription>
                  기존에 사용하던 HWP 양식을 업로드하면 자동으로 입력 항목을 추출합니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept=".hwp"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="hwp-upload"
                    disabled={uploadMutation.isPending}
                    data-testid="input-file-upload"
                  />
                  <label
                    htmlFor="hwp-upload"
                    className="cursor-pointer flex flex-col items-center gap-4"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
                        <p className="text-muted-foreground">양식을 분석하고 있습니다...</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-12 h-12 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">HWP 파일을 선택하세요</p>
                          <p className="text-sm text-muted-foreground">최대 10MB까지 업로드 가능</p>
                        </div>
                        <Button type="button" variant="outline" data-testid="button-select-file">
                          파일 선택
                        </Button>
                      </>
                    )}
                  </label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  이전에 업로드한 양식
                </CardTitle>
                <CardDescription>
                  이전에 업로드한 양식을 선택하여 다시 사용할 수 있습니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                {templatesQuery.isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : templatesQuery.isError ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                    <p>양식 목록을 불러오는데 실패했습니다.</p>
                  </div>
                ) : templatesQuery.data && templatesQuery.data.length > 0 ? (
                  <div className="space-y-2">
                    {templatesQuery.data.map((template) => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover-elevate cursor-pointer"
                        onClick={() => handleSelectTemplate(template)}
                        data-testid={`template-item-${template.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{template.originalName}</p>
                            <p className="text-sm text-muted-foreground">
                              {(template.extractedFields as TemplateField[] || []).length}개 필드 추출됨
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {template.status === "completed" ? (
                            <Badge variant="secondary">
                              <Check className="w-3 h-3 mr-1" />
                              분석 완료
                            </Badge>
                          ) : template.status === "processing" ? (
                            <Badge variant="outline">
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              분석 중
                            </Badge>
                          ) : (
                            <Badge variant="outline">대기 중</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>업로드한 양식이 없습니다.</p>
                    <p className="text-sm">위에서 HWP 파일을 업로드해주세요.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      {selectedTemplate.originalName}
                    </CardTitle>
                    <CardDescription>
                      {isProcessing 
                        ? "양식을 분석하고 있습니다..." 
                        : "아래 항목을 입력하면 양식에 맞춰 문서가 생성됩니다"}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTemplate(null)}
                    data-testid="button-change-template"
                  >
                    다른 양식 선택
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isProcessing ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
                    <p className="text-muted-foreground">양식을 분석하고 있습니다...</p>
                    <p className="text-sm text-muted-foreground">잠시만 기다려주세요.</p>
                  </div>
                ) : fields.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">추출된 필드가 없습니다.</p>
                    <p className="text-sm text-muted-foreground mb-4">AI 분석을 다시 시도하거나 다른 양식을 업로드해주세요.</p>
                    <Button
                      variant="outline"
                      onClick={() => analyzeMutation.mutate(selectedTemplate.id)}
                      disabled={analyzeMutation.isPending}
                      data-testid="button-reanalyze"
                    >
                      {analyzeMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          분석 중...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          다시 분석하기
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                      {fields.map((field) => (
                        <div key={field.name} className="space-y-2">
                          <Label htmlFor={field.name} className="flex items-center gap-2">
                            {field.label}
                            {field.required && <span className="text-destructive">*</span>}
                          </Label>
                          {renderField(field)}
                          {field.description && (
                            <p className="text-xs text-muted-foreground">{field.description}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
                      <Button
                        type="submit"
                        size="lg"
                        disabled={generateMutation.isPending || !isCompleted}
                        className="flex-1"
                        data-testid="button-generate-from-template"
                      >
                        {generateMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {generatingStatus || "생성 중..."}
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            양식에 맞춰 문서 생성
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        onClick={() => {
                          const initialValues: Record<string, string> = {};
                          fields.forEach((field) => {
                            initialValues[field.name] = field.defaultValue || "";
                          });
                          setFormValues(initialValues);
                        }}
                        disabled={generateMutation.isPending}
                        data-testid="button-reset-form"
                      >
                        초기화
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            {selectedTemplate.extractedText && isCompleted && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">원본 양식 내용 (참고용)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 rounded-lg p-4 max-h-[200px] overflow-y-auto">
                    <pre className="text-xs whitespace-pre-wrap text-muted-foreground">
                      {selectedTemplate.extractedText.substring(0, 1000)}
                      {selectedTemplate.extractedText.length > 1000 && "..."}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
