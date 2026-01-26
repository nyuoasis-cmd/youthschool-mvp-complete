import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Loader2, Shield } from "lucide-react";
import { AIGenerateButton } from "@/components/AIGenerateButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { HwpReferenceUpload } from "@/components/HwpReferenceUpload";

const SAFETY_AREAS = [
  "생활안전",
  "교통안전",
  "폭력 및 신변안전",
  "약물 및 사이버중독 예방",
  "재난안전",
  "직업안전",
  "응급처치",
] as const;

export default function SafetyEducationPlanForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [areas, setAreas] = useState<string[]>([]);
  const [targetGrades, setTargetGrades] = useState("");
  const [annualHours, setAnnualHours] = useState("");
  const [educationContent, setEducationContent] = useState("");
  const [educationMethod, setEducationMethod] = useState("");
  const [referenceFileId, setReferenceFileId] = useState<number | null>(null);

  const toggleArea = (area: string) => {
    setAreas((prev) =>
      prev.includes(area) ? prev.filter((item) => item !== area) : [...prev, area],
    );
  };

  const buildInputs = () => ({
    title: "학교 안전교육 계획서",
    basicInfo: [
      `교육 영역: ${areas.join(", ") || "(미입력)"}`,
      `대상 학년: ${targetGrades || "(미입력)"}`,
      `연간 시수: ${annualHours || "(미입력)"}`,
    ].join("\n"),
    goals: educationContent || "(미입력)",
    policy: educationMethod || "(미입력)",
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/documents/generate", {
        documentType: "학교 안전교육 계획서",
        inputs: buildInputs(),
        uploadedTemplateId: referenceFileId ?? undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "문서 생성 완료",
        description: "학교 안전교육 계획서가 생성되었습니다.",
      });
      setLocation(`/result/${data.id}`, { state: { document: data } });
    },
    onError: (error: Error) => {
      toast({
        title: "문서 생성 실패",
        description: error.message || "문서 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">학교 안전교육 계획서 작성</h1>
              <p className="text-sm text-muted-foreground">필요한 정보를 입력하면 계획서를 생성합니다</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              안전교육 정보 입력
            </CardTitle>
            <CardDescription>입력한 정보로 계획서를 작성합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">교육 영역</label>
              <div className="grid sm:grid-cols-2 gap-2">
                {SAFETY_AREAS.map((area) => (
                  <label key={area} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={areas.includes(area)} onCheckedChange={() => toggleArea(area)} />
                    {area}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">대상 학년</label>
                <Input
                  value={targetGrades}
                  onChange={(event) => setTargetGrades(event.target.value)}
                  placeholder="예: 전교생 / 1~3학년"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">연간 시수</label>
                <Input
                  value={annualHours}
                  onChange={(event) => setAnnualHours(event.target.value)}
                  placeholder="예: 34시간"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">교육 내용</label>
                <AIGenerateButton
                  fieldName="educationContent"
                  context={{ areas, targetGrades, annualHours, currentValue: educationContent }}
                  onGenerated={(text) => setEducationContent(text)}
                  endpoint="/api/safety-education-plan/generate-ai-content"
                />
              </div>
              <Textarea
                rows={6}
                value={educationContent}
                onChange={(event) => setEducationContent(event.target.value)}
                placeholder="영역별 교육 내용을 입력하세요."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">교육 방법</label>
              <Textarea
                rows={4}
                value={educationMethod}
                onChange={(event) => setEducationMethod(event.target.value)}
                placeholder="예: 이론 강의, 체험 활동, 실습"
              />
            </div>

            <HwpReferenceUpload
              onUploaded={(fileId) => setReferenceFileId(fileId)}
              onClear={() => setReferenceFileId(null)}
            />

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button
                type="button"
                size="lg"
                className="flex-1"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  "AI로 문서 생성하기"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => {
                  setAreas([]);
                  setTargetGrades("");
                  setAnnualHours("");
                  setEducationContent("");
                  setEducationMethod("");
                }}
              >
                초기화
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
