import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Sparkles, Loader2, Wand2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { parentLetterInputSchema, type ParentLetterInput } from "@shared/schema";
import { HwpReferenceUpload } from "@/components/HwpReferenceUpload";

export default function ParentLetterForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [generatingStatus, setGeneratingStatus] = useState<string>("");
  const [generatingField, setGeneratingField] = useState<string | null>(null);
  const [referenceFileId, setReferenceFileId] = useState<number | null>(null);

  const form = useForm<ParentLetterInput>({
    resolver: zodResolver(parentLetterInputSchema),
    defaultValues: {
      title: "",
      mainContent: "",
      deadline: "",
      contactInfo: "",
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (data: ParentLetterInput) => {
      setGeneratingStatus("AI가 문서를 생성하고 있습니다...");
      const response = await apiRequest("POST", "/api/documents/generate", {
        documentType: "가정통신문",
        inputs: data,
        uploadedTemplateId: referenceFileId ?? undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratingStatus("");
      toast({
        title: "문서 생성 완료",
        description: "가정통신문이 성공적으로 생성되었습니다.",
      });
      // Pass document data via state to avoid API call for anonymous users
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

  const generateFieldMutation = useMutation({
    mutationFn: async ({ fieldName, fieldLabel }: { fieldName: string; fieldLabel: string }) => {
      setGeneratingField(fieldName);
      const response = await apiRequest("POST", "/api/documents/generate-field", {
        documentType: "가정통신문",
        fieldName,
        fieldLabel,
        context: {
          title: form.getValues("title"),
          mainContent: form.getValues("mainContent"),
          deadline: form.getValues("deadline"),
          contactInfo: form.getValues("contactInfo"),
        },
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratingField(null);
      form.setValue(data.fieldName as keyof ParentLetterInput, data.generatedContent);
      toast({
        title: "AI 생성 완료",
        description: "내용이 생성되었습니다. 필요시 수정해주세요.",
      });
    },
    onError: (error: Error) => {
      setGeneratingField(null);
      toast({
        title: "AI 생성 실패",
        description: error.message || "내용 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ParentLetterInput) => {
    generateMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild data-testid="button-back">
              <Link href="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">가정통신문 작성</h1>
              <p className="text-sm text-muted-foreground">필요한 정보를 입력하면 AI가 문서를 생성합니다</p>
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              가정통신문 정보 입력
            </CardTitle>
            <CardDescription>
              입력한 내용으로 AI가 가정통신문을 생성합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>제목</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="예: 겨울방학 안전 생활 안내"
                          {...field}
                          data-testid="input-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mainContent"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>주요 내용</FormLabel>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => generateFieldMutation.mutate({ fieldName: "mainContent", fieldLabel: "주요 내용" })}
                          disabled={generatingField === "mainContent"}
                          data-testid="button-ai-main-content"
                        >
                          {generatingField === "mainContent" ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              생성 중...
                            </>
                          ) : (
                            <>
                              <Wand2 className="w-3 h-3 mr-1" />
                              AI 작성
                            </>
                          )}
                        </Button>
                      </div>
                      <FormControl>
                        <Textarea
                          placeholder="전달할 핵심 내용을 입력하세요."
                          className="min-h-[160px] resize-none"
                          {...field}
                          data-testid="input-main-content"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>마감일/기한</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="예: 2026년 3월 15일까지"
                            {...field}
                            data-testid="input-deadline"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactInfo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>연락처</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="예: 담당 교사 010-1234-5678"
                            {...field}
                            data-testid="input-contact"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <HwpReferenceUpload
                  onUploaded={(fileId) => setReferenceFileId(fileId)}
                  onClear={() => setReferenceFileId(null)}
                />

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={generateMutation.isPending}
                    className="flex-1"
                    data-testid="button-generate"
                  >
                    {generateMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {generatingStatus || "생성 중..."}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        AI로 문서 생성하기
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => form.reset()}
                    disabled={generateMutation.isPending}
                    data-testid="button-reset"
                  >
                    초기화
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
