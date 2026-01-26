import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ClipboardList, Loader2 } from "lucide-react";
import { AIGenerateButton } from "@/components/AIGenerateButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { HwpReferenceUpload } from "@/components/HwpReferenceUpload";

export default function CarePlanForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [operatingTime, setOperatingTime] = useState("");
  const [targetGrades, setTargetGrades] = useState("");
  const [objectives, setObjectives] = useState("");
  const [programContent, setProgramContent] = useState("");
  const [snackGuide, setSnackGuide] = useState("");
  const [referenceFileId, setReferenceFileId] = useState<number | null>(null);

  const buildInputs = () => ({
    title: "초등돌봄교실 운영계획서",
    basicInfo: [
      `운영 시간: ${operatingTime || "(미입력)"}`,
      `대상 학년: ${targetGrades || "(미입력)"}`,
    ].join("\n"),
    objectives: objectives || "(미입력)",
    programs: programContent || "(미입력)",
    safety: snackGuide || "(미입력)",
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/documents/generate", {
        documentType: "초등돌봄교실 운영계획서",
        inputs: buildInputs(),
        uploadedTemplateId: referenceFileId ?? undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "문서 생성 완료",
        description: "초등돌봄교실 운영계획서가 생성되었습니다.",
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
              <h1 className="text-lg font-semibold text-foreground">초등돌봄교실 운영계획서 작성</h1>
              <p className="text-sm text-muted-foreground">필요한 정보를 입력하면 계획서를 생성합니다</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              돌봄교실 운영 정보 입력
            </CardTitle>
            <CardDescription>입력한 내용으로 운영계획서를 작성합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">운영 시간</label>
                <Input
                  value={operatingTime}
                  onChange={(event) => setOperatingTime(event.target.value)}
                  placeholder="예: 13:00 ~ 18:00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">대상 학년</label>
                <Input
                  value={targetGrades}
                  onChange={(event) => setTargetGrades(event.target.value)}
                  placeholder="예: 1~2학년"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">운영 목표</label>
                <AIGenerateButton
                  fieldName="careObjectives"
                  context={{ operatingTime, targetGrades, currentValue: objectives }}
                  onGenerated={(text) => setObjectives(text)}
                  endpoint="/api/afterschool/generate-ai-content"
                  documentType="care"
                />
              </div>
              <Textarea
                rows={5}
                value={objectives}
                onChange={(event) => setObjectives(event.target.value)}
                placeholder="운영 목표와 방침을 입력하세요."
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">프로그램 내용</label>
                <AIGenerateButton
                  fieldName="careProgramContent"
                  context={{ operatingTime, targetGrades, currentValue: programContent }}
                  onGenerated={(text) => setProgramContent(text)}
                  endpoint="/api/afterschool/generate-ai-content"
                  documentType="care"
                />
              </div>
              <Textarea
                rows={6}
                value={programContent}
                onChange={(event) => setProgramContent(event.target.value)}
                placeholder="주요 활동과 프로그램을 입력하세요."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">간식 안내</label>
              <Input
                value={snackGuide}
                onChange={(event) => setSnackGuide(event.target.value)}
                placeholder="예: 주 3회 간식 제공"
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
                  setOperatingTime("");
                  setTargetGrades("");
                  setObjectives("");
                  setProgramContent("");
                  setSnackGuide("");
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
