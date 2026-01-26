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
import { educationPlanInputSchema, type EducationPlanInput } from "@shared/schema";
import { HwpReferenceUpload } from "@/components/HwpReferenceUpload";

export default function EducationPlanForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [generatingStatus, setGeneratingStatus] = useState<string>("");
  const [generatingField, setGeneratingField] = useState<string | null>(null);
  const [referenceFileId, setReferenceFileId] = useState<number | null>(null);

  const form = useForm<EducationPlanInput>({
    resolver: zodResolver(educationPlanInputSchema),
    defaultValues: {
      programName: "",
      objectives: "",
      targetStudents: "",
      duration: "",
      instructorInfo: "",
      budget: "",
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (data: EducationPlanInput) => {
      setGeneratingStatus("AI가 계획서를 생성하고 있습니다...");
      const response = await apiRequest("POST", "/api/documents/generate", {
        documentType: "외부 교육 용역 계획서",
        inputs: data,
        uploadedTemplateId: referenceFileId ?? undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratingStatus("");
      toast({
        title: "문서 생성 완료",
        description: "외부 교육 용역 계획서가 성공적으로 생성되었습니다.",
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

  const generateFieldMutation = useMutation({
    mutationFn: async ({ fieldName, fieldLabel }: { fieldName: string; fieldLabel: string }) => {
      setGeneratingField(fieldName);
      const response = await apiRequest("POST", "/api/documents/generate-field", {
        documentType: "외부 교육 용역 계획서",
        fieldName,
        fieldLabel,
        context: {
          programName: form.getValues("programName"),
          objectives: form.getValues("objectives"),
          targetStudents: form.getValues("targetStudents"),
          duration: form.getValues("duration"),
          instructorInfo: form.getValues("instructorInfo"),
          budget: form.getValues("budget"),
        },
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratingField(null);
      form.setValue(data.fieldName as keyof EducationPlanInput, data.generatedContent);
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

  const onSubmit = (data: EducationPlanInput) => {
    const payload = {
      ...data,
      title: data.title || data.programName || "외부 교육 용역 계획서",
    };
    generateMutation.mutate(payload);
  };

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
              <h1 className="text-lg font-semibold text-foreground">외부 교육 용역 계획서 작성</h1>
              <p className="text-sm text-muted-foreground">필요한 정보를 입력하면 AI가 계획서를 생성합니다</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              외부 교육 용역 계획서 정보 입력
            </CardTitle>
            <CardDescription>
              입력한 내용으로 AI가 계획서를 생성합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="programName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>프로그램명</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="예: 청소년 창업 체험 프로그램"
                          {...field}
                          data-testid="input-program-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="objectives"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>교육 목적</FormLabel>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => generateFieldMutation.mutate({ fieldName: "objectives", fieldLabel: "교육 목적" })}
                          disabled={generatingField === "objectives"}
                          data-testid="button-ai-objectives"
                        >
                          {generatingField === "objectives" ? (
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
                          placeholder="교육 목적과 기대 효과를 작성하세요."
                          className="min-h-[120px] resize-none"
                          {...field}
                          data-testid="input-objectives"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="targetStudents"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>대상</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="예: 2학년 120명"
                            {...field}
                            data-testid="input-target-students"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>기간</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="예: 2026년 3월 ~ 6월"
                            {...field}
                            data-testid="input-duration"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="instructorInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>강사 정보</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="강사 경력, 소속, 주요 이력을 입력하세요."
                          className="min-h-[120px] resize-none"
                          {...field}
                          data-testid="input-instructor-info"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>예산</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="예: 5,000,000원"
                          {...field}
                          data-testid="input-budget"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                        AI로 계획서 생성하기
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
