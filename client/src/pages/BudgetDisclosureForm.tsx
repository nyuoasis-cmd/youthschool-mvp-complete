import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Coins, Loader2 } from "lucide-react";
import { AIGenerateButton } from "@/components/AIGenerateButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { HwpReferenceUpload } from "@/components/HwpReferenceUpload";

const documentTypes = ["예산", "결산"] as const;

export default function BudgetDisclosureForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [documentType, setDocumentType] = useState<string>("");
  const [fiscalYear, setFiscalYear] = useState("");
  const [mainItems, setMainItems] = useState("");
  const [disclosurePeriod, setDisclosurePeriod] = useState("");
  const [referenceFileId, setReferenceFileId] = useState<number | null>(null);

  const buildInputs = () => ({
    title: `${fiscalYear || "연도"} ${documentType || "예산/결산"} 공개 자료`,
    basicInfo: [
      `자료 유형: ${documentType || "(미입력)"}`,
      `회계연도: ${fiscalYear || "(미입력)"}`,
    ].join("\n"),
    overview: `주요 항목: ${mainItems || "(미입력)"}`,
    attachments: `공개 기간: ${disclosurePeriod || "(미입력)"}`,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/documents/generate", {
        documentType: "예산/결산 공개 자료",
        inputs: buildInputs(),
        uploadedTemplateId: referenceFileId ?? undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "문서 생성 완료",
        description: "예산/결산 공개 자료가 생성되었습니다.",
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
              <h1 className="text-lg font-semibold text-foreground">예산/결산 공개 자료 작성</h1>
              <p className="text-sm text-muted-foreground">필요한 정보를 입력하면 공개 자료를 생성합니다</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-primary" />
              예산/결산 정보 입력
            </CardTitle>
            <CardDescription>입력한 정보로 공개 자료를 작성합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">자료 유형</label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="예산 / 결산" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">회계연도</label>
                <Input
                  value={fiscalYear}
                  onChange={(event) => setFiscalYear(event.target.value)}
                  placeholder="예: 2026년"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">주요 항목</label>
                <AIGenerateButton
                  fieldName="mainFeatures"
                  context={{ documentType, fiscalYear, currentValue: mainItems }}
                  onGenerated={(text) => setMainItems(text)}
                  endpoint="/api/budget-disclosure/generate-ai-content"
                />
              </div>
              <Textarea
                rows={6}
                value={mainItems}
                onChange={(event) => setMainItems(event.target.value)}
                placeholder="주요 수입/지출 항목을 입력하세요."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">공개 기간</label>
              <Input
                value={disclosurePeriod}
                onChange={(event) => setDisclosurePeriod(event.target.value)}
                placeholder="예: 2026년 3월 1일 ~ 3월 31일"
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
                  setDocumentType("");
                  setFiscalYear("");
                  setMainItems("");
                  setDisclosurePeriod("");
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
