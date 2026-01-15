import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
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

export default function EducationPlanForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [generatingStatus, setGeneratingStatus] = useState<string>("");

  const form = useForm<EducationPlanInput>({
    resolver: zodResolver(educationPlanInputSchema),
    defaultValues: {
      title: "",
      schoolName: "",
      programName: "",
      targetStudents: "",
      duration: "",
      objectives: "",
      contents: "",
      budget: "",
      expectedOutcomes: "",
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (data: EducationPlanInput) => {
      setGeneratingStatus("AI가 계획서를 생성하고 있습니다...");
      const response = await apiRequest("POST", "/api/documents/generate", {
        documentType: "외부 교육 용역 계획서",
        inputs: data,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratingStatus("");
      toast({
        title: "문서 생성 완료",
        description: "외부 교육 용역 계획서가 성공적으로 생성되었습니다.",
      });
      setLocation(`/result/${data.id}`);
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

  const onSubmit = (data: EducationPlanInput) => {
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
              <h1 className="text-lg font-semibold text-foreground">외부 교육 용역 계획서 작성</h1>
              <p className="text-sm text-muted-foreground">필요한 정보를 입력하면 AI가 계획서를 생성합니다</p>
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
              외부 교육 용역 계획서 정보 입력
            </CardTitle>
            <CardDescription>
              아래 정보를 입력하시면 AI가 체계적인 교육 계획서를 생성합니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>계획서 제목 *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="예: 2025년 1학기 창업 체험 교육 계획서" 
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
                    name="schoolName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>학교명 *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="예: OO중학교" 
                            {...field}
                            data-testid="input-school-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="programName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>프로그램명 *</FormLabel>
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
                    name="targetStudents"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>대상 학생 *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="예: 2학년 전체 학생 (120명)" 
                            {...field}
                            data-testid="input-target-students"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>교육 기간 *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="예: 2025년 3월 ~ 6월 (총 12회)" 
                            {...field}
                            data-testid="input-duration"
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
                        <FormLabel>예산 (선택)</FormLabel>
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
                </div>

                <FormField
                  control={form.control}
                  name="objectives"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>교육 목표 *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="예: 1. 창업에 대한 기초 이해 및 창업 마인드 함양&#10;2. 팀 프로젝트를 통한 협업 능력 향상&#10;3. 아이디어 발굴 및 비즈니스 모델 수립 역량 개발"
                          className="min-h-[120px] resize-none"
                          {...field}
                          data-testid="input-objectives"
                        />
                      </FormControl>
                      <FormDescription>
                        교육을 통해 달성하고자 하는 목표를 구체적으로 작성해주세요
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>교육 내용 *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="예: - 창업 기초 이론 교육 (4회)&#10;- 아이디어 발굴 워크숍 (2회)&#10;- 비즈니스 모델 캔버스 작성 (3회)&#10;- 팀 프로젝트 발표 및 피드백 (3회)"
                          className="min-h-[150px] resize-none"
                          {...field}
                          data-testid="input-contents"
                        />
                      </FormControl>
                      <FormDescription>
                        교육 프로그램의 세부 내용과 진행 방식을 작성해주세요
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expectedOutcomes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>기대 효과 (선택)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="예: 학생들의 창업 역량 향상, 진로 탐색 기회 제공, 협업 및 문제 해결 능력 강화"
                          className="min-h-[100px] resize-none"
                          {...field}
                          data-testid="input-expected-outcomes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
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
