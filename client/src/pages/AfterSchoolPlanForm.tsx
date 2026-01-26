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

export default function AfterSchoolPlanForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [period, setPeriod] = useState("");
  const [programList, setProgramList] = useState("");
  const [applicationGuide, setApplicationGuide] = useState("");
  const [tuition, setTuition] = useState("");
  const [referenceFileId, setReferenceFileId] = useState<number | null>(null);

  const buildInputs = () => ({
    title: "방과후학교 운영계획서",
    basicInfo: `운영 기간: ${period || "(미입력)"}`,
    programs: programList || "(미입력)",
    recruitment: applicationGuide || "(미입력)",
    budget: tuition || "(미입력)",
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/documents/generate", {
        documentType: "방과후학교 운영계획서",
        inputs: buildInputs(),
        uploadedTemplateId: referenceFileId ?? undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "문서 생성 완료",
        description: "방과후학교 운영계획서가 생성되었습니다.",
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
              <h1 className="text-lg font-semibold text-foreground">방과후학교 운영계획서 작성</h1>
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
              방과후학교 운영 정보 입력
            </CardTitle>
            <CardDescription>입력한 정보로 운영계획서를 작성합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">운영 기간</label>
              <Input
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                placeholder="예: 2026년 1학기 (3월~7월)"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">프로그램 목록</label>
                <AIGenerateButton
                  fieldName="programList"
                  context={{ period, tuition, currentValue: programList }}
                  onGenerated={(text) => setProgramList(text)}
                  endpoint="/api/afterschool/generate-ai-content"
                />
              </div>
              <Textarea
                rows={6}
                value={programList}
                onChange={(event) => setProgramList(event.target.value)}
                placeholder="개설 프로그램과 주요 내용을 입력하세요."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">수강 신청 안내</label>
              <Textarea
                rows={4}
                value={applicationGuide}
                onChange={(event) => setApplicationGuide(event.target.value)}
                placeholder="신청 방법, 기간, 유의사항을 입력하세요."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">수강료</label>
              <Input
                value={tuition}
                onChange={(event) => setTuition(event.target.value)}
                placeholder="예: 월 30,000원"
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
                  setPeriod("");
                  setProgramList("");
                  setApplicationGuide("");
                  setTuition("");
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
