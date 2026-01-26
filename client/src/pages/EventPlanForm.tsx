import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, CalendarDays, Loader2 } from "lucide-react";
import { AIGenerateButton } from "@/components/AIGenerateButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { HwpReferenceUpload } from "@/components/HwpReferenceUpload";

const eventTypes = ["체육대회", "축제", "졸업식", "입학식", "발표회", "기타"] as const;

export default function EventPlanForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState<string>("");
  const [eventDateTime, setEventDateTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [program, setProgram] = useState("");
  const [safetyPlan, setSafetyPlan] = useState("");
  const [referenceFileId, setReferenceFileId] = useState<number | null>(null);

  const buildInputs = () => ({
    title: eventName || "교내 행사 운영계획서",
    basicInfo: [
      `행사명: ${eventName || "(미입력)"}`,
      `행사 유형: ${eventType || "(미입력)"}`,
      `일시: ${eventDateTime || "(미입력)"}`,
      `장소: ${eventLocation || "(미입력)"}`,
    ].join("\n"),
    programs: program || "(미입력)",
    safety: safetyPlan || "(미입력)",
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/documents/generate", {
        documentType: "교내 행사 운영계획서",
        inputs: buildInputs(),
        uploadedTemplateId: referenceFileId ?? undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "문서 생성 완료",
        description: "교내 행사 운영계획서가 생성되었습니다.",
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
              <h1 className="text-lg font-semibold text-foreground">교내 행사 운영계획서 작성</h1>
              <p className="text-sm text-muted-foreground">필요한 정보를 입력하면 계획서를 생성합니다</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              교내 행사 정보 입력
            </CardTitle>
            <CardDescription>입력한 정보로 운영계획서를 작성합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">행사명</label>
                <Input
                  value={eventName}
                  onChange={(event) => setEventName(event.target.value)}
                  placeholder="예: 2026 체육대회"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">행사 유형</label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger>
                    <SelectValue placeholder="행사 유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">일시</label>
                <Input
                  value={eventDateTime}
                  onChange={(event) => setEventDateTime(event.target.value)}
                  placeholder="예: 2026년 5월 20일 09:00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">장소</label>
                <Input
                  value={eventLocation}
                  onChange={(event) => setEventLocation(event.target.value)}
                  placeholder="예: 운동장"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">프로그램</label>
                <AIGenerateButton
                  fieldName="eventProgram"
                  context={{ eventName, eventType, eventDateTime, eventLocation, currentValue: program }}
                  onGenerated={(text) => setProgram(text)}
                  endpoint="/api/event-plan/generate-ai-content"
                />
              </div>
              <Textarea
                rows={6}
                value={program}
                onChange={(event) => setProgram(event.target.value)}
                placeholder="세부 프로그램을 입력하세요."
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">안전 계획</label>
                <AIGenerateButton
                  fieldName="eventSafetyPlan"
                  context={{ eventName, eventType, eventLocation, currentValue: safetyPlan }}
                  onGenerated={(text) => setSafetyPlan(text)}
                  endpoint="/api/event-plan/generate-ai-content"
                />
              </div>
              <Textarea
                rows={5}
                value={safetyPlan}
                onChange={(event) => setSafetyPlan(event.target.value)}
                placeholder="안전 관리 방안을 입력하세요."
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
                  setEventName("");
                  setEventType("");
                  setEventDateTime("");
                  setEventLocation("");
                  setProgram("");
                  setSafetyPlan("");
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
