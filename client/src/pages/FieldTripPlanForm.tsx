import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Loader2, MapPin } from "lucide-react";
import { AIGenerateButton } from "@/components/AIGenerateButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { HwpReferenceUpload } from "@/components/HwpReferenceUpload";

export default function FieldTripPlanForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [place, setPlace] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [target, setTarget] = useState("");
  const [educationGoal, setEducationGoal] = useState("");
  const [schedule, setSchedule] = useState("");
  const [safetyPlan, setSafetyPlan] = useState("");
  const [cost, setCost] = useState("");
  const [referenceFileId, setReferenceFileId] = useState<number | null>(null);

  const buildInputs = () => ({
    title: "현장체험학습 운영계획서",
    basicInfo: [
      `체험 장소: ${place || "(미입력)"}`,
      `일시: ${dateTime || "(미입력)"}`,
      `대상: ${target || "(미입력)"}`,
    ].join("\n"),
    educationInfo: educationGoal || "(미입력)",
    schedule: schedule || "(미입력)",
    safetyInfo: safetyPlan || "(미입력)",
    otherInfo: cost || "(미입력)",
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/documents/generate", {
        documentType: "현장체험학습 운영계획서",
        inputs: buildInputs(),
        uploadedTemplateId: referenceFileId ?? undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "문서 생성 완료",
        description: "현장체험학습 운영계획서가 생성되었습니다.",
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
              <h1 className="text-lg font-semibold text-foreground">현장체험학습 운영계획서 작성</h1>
              <p className="text-sm text-muted-foreground">필요한 정보를 입력하면 계획서를 생성합니다</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              현장체험학습 정보 입력
            </CardTitle>
            <CardDescription>입력한 정보로 운영계획서를 작성합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">체험 장소</label>
                <Input
                  value={place}
                  onChange={(event) => setPlace(event.target.value)}
                  placeholder="예: 국립과학관"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">일시</label>
                <Input
                  value={dateTime}
                  onChange={(event) => setDateTime(event.target.value)}
                  placeholder="예: 2026년 4월 10일 09:00~15:00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">대상</label>
              <Input
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                placeholder="예: 2학년 전체 120명"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">교육 목표</label>
                <AIGenerateButton
                  fieldName="goals"
                  context={{ place, dateTime, target, currentValue: educationGoal }}
                  onGenerated={(text) => setEducationGoal(text)}
                  endpoint="/api/generate/field-trip-plan/field"
                />
              </div>
              <Textarea
                rows={5}
                value={educationGoal}
                onChange={(event) => setEducationGoal(event.target.value)}
                placeholder="교육 목표를 입력하세요."
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">일정</label>
                <AIGenerateButton
                  fieldName="schedule"
                  context={{ place, dateTime, target, currentValue: schedule }}
                  onGenerated={(text) => setSchedule(text)}
                  endpoint="/api/generate/field-trip-plan/field"
                />
              </div>
              <Textarea
                rows={5}
                value={schedule}
                onChange={(event) => setSchedule(event.target.value)}
                placeholder="세부 일정과 이동 계획을 입력하세요."
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">안전 계획</label>
                <AIGenerateButton
                  fieldName="safetyPlan"
                  context={{ place, dateTime, target, currentValue: safetyPlan }}
                  onGenerated={(text) => setSafetyPlan(text)}
                  endpoint="/api/generate/field-trip-plan/field"
                />
              </div>
              <Textarea
                rows={5}
                value={safetyPlan}
                onChange={(event) => setSafetyPlan(event.target.value)}
                placeholder="안전 관리 방안을 입력하세요."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">비용</label>
              <Input
                value={cost}
                onChange={(event) => setCost(event.target.value)}
                placeholder="예: 1인당 20,000원"
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
                  setPlace("");
                  setDateTime("");
                  setTarget("");
                  setEducationGoal("");
                  setSchedule("");
                  setSafetyPlan("");
                  setCost("");
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
