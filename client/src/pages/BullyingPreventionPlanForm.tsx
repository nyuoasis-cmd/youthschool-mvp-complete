import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Loader2, Scale } from "lucide-react";
import { AIGenerateButton } from "@/components/AIGenerateButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { HwpReferenceUpload } from "@/components/HwpReferenceUpload";

const targets = ["학생", "교직원", "학부모"] as const;

export default function BullyingPreventionPlanForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [target, setTarget] = useState<string>("");
  const [educationDateTime, setEducationDateTime] = useState("");
  const [educationContent, setEducationContent] = useState("");
  const [legalBasis, setLegalBasis] = useState("");
  const [referenceFileId, setReferenceFileId] = useState<number | null>(null);

  const buildInputs = () => ({
    title: "학교폭력 예방 교육 계획서",
    basicInfo: [
      `대상: ${target || "(미입력)"}`,
      `교육 일시: ${educationDateTime || "(미입력)"}`,
    ].join("\n"),
    mainContent: educationContent || "(미입력)",
    legalBasis: legalBasis || "(미입력)",
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/documents/generate", {
        documentType: "학교폭력 예방 교육 계획서",
        inputs: buildInputs(),
        uploadedTemplateId: referenceFileId ?? undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "문서 생성 완료",
        description: "학교폭력 예방 교육 계획서가 생성되었습니다.",
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
              <h1 className="text-lg font-semibold text-foreground">학교폭력 예방 교육 계획서 작성</h1>
              <p className="text-sm text-muted-foreground">필요한 정보를 입력하면 계획서를 생성합니다</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              학교폭력 예방 교육 정보 입력
            </CardTitle>
            <CardDescription>입력한 정보로 계획서를 작성합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">대상</label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger>
                  <SelectValue placeholder="대상 선택" />
                </SelectTrigger>
                <SelectContent>
                  {targets.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">교육 일시</label>
              <Input
                value={educationDateTime}
                onChange={(event) => setEducationDateTime(event.target.value)}
                placeholder="예: 2026년 4월 12일 14:00"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">교육 내용</label>
                <AIGenerateButton
                  fieldName="educationContent"
                  context={{ target, educationDateTime, currentValue: educationContent }}
                  onGenerated={(text) => setEducationContent(text)}
                  endpoint="/api/bullying-prevention-plan/generate-ai-content"
                />
              </div>
              <Textarea
                rows={6}
                value={educationContent}
                onChange={(event) => setEducationContent(event.target.value)}
                placeholder="교육 내용을 입력하세요."
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">법적 근거</label>
                <AIGenerateButton
                  fieldName="legalBasis"
                  context={{ target, currentValue: legalBasis }}
                  onGenerated={(text) => setLegalBasis(text)}
                  endpoint="/api/bullying-prevention-plan/generate-ai-content"
                />
              </div>
              <Textarea
                rows={4}
                value={legalBasis}
                onChange={(event) => setLegalBasis(event.target.value)}
                placeholder="관련 법령 근거를 입력하세요."
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
                  setTarget("");
                  setEducationDateTime("");
                  setEducationContent("");
                  setLegalBasis("");
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
