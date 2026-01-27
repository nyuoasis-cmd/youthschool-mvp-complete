import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Sparkles, Loader2, Wand2, Eye } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type PaymentRow = {
  id: string;
  grade: string;
  category: string;
  calculation: string;
  amount: string;
  note: string;
};

type NoticeItem = {
  id: string;
  content: string;
};

interface ProfileData {
  schoolName?: string;
}

const academicYearOptions = ["2025학년도", "2026학년도"];
const monthOptions = [
  "1월",
  "2월",
  "3월",
  "4월",
  "5월",
  "6월",
  "7월",
  "8월",
  "9월",
  "10월",
  "11월",
  "12월",
];

const createPaymentRow = (): PaymentRow => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  grade: "",
  category: "",
  calculation: "",
  amount: "",
  note: "",
});

const createNoticeItem = (): NoticeItem => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  content: "",
});

export default function MealNoticeForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [generatingField, setGeneratingField] = useState<string | null>(null);
  const [academicYear, setAcademicYear] = useState("2025학년도");
  const [month, setMonth] = useState("4월");
  const [greeting, setGreeting] = useState("");
  const [mealPeriod, setMealPeriod] = useState("");
  const [paymentPeriod, setPaymentPeriod] = useState("");
  const [paymentDetails, setPaymentDetails] = useState<PaymentRow[]>([createPaymentRow()]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notices, setNotices] = useState<NoticeItem[]>([createNoticeItem()]);
  const [issueDate, setIssueDate] = useState("");
  const [principalSignature, setPrincipalSignature] = useState("");

  const { data: profile } = useQuery<ProfileData>({
    queryKey: ["/api/auth/profile"],
    retry: false,
  });

  const previewTitle = useMemo(
    () => `${academicYear} ${month} 학교급식 안내`,
    [academicYear, month]
  );

  const schoolName = profile?.schoolName || "학교명";
  const signatureText = principalSignature || (schoolName ? `${schoolName}장` : "");

  const handleAddPaymentRow = () => {
    setPaymentDetails((prev) => [...prev, createPaymentRow()]);
  };

  const handleRemovePaymentRow = (id: string) => {
    setPaymentDetails((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.id !== id)));
  };

  const handleUpdatePaymentRow = (id: string, field: keyof PaymentRow, value: string) => {
    setPaymentDetails((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleAddNotice = () => {
    setNotices((prev) => [...prev, createNoticeItem()]);
  };

  const handleRemoveNotice = (id: string) => {
    setNotices((prev) => (prev.length <= 1 ? prev : prev.filter((notice) => notice.id !== id)));
  };

  const handleUpdateNotice = (id: string, value: string) => {
    setNotices((prev) =>
      prev.map((notice) => (notice.id === id ? { ...notice, content: value } : notice))
    );
  };

  const parsePaymentDetails = (text: string): PaymentRow[] | null => {
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) return null;
      const normalized = parsed
        .filter((row) => row && typeof row === "object")
        .map((row) => ({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          grade: String((row as Record<string, unknown>).grade ?? ""),
          category: String((row as Record<string, unknown>).category ?? ""),
          calculation: String((row as Record<string, unknown>).calculation ?? ""),
          amount: String((row as Record<string, unknown>).amount ?? ""),
          note: String((row as Record<string, unknown>).note ?? ""),
        }));
      return normalized.length > 0 ? normalized : null;
    } catch {
      return null;
    }
  };

  const parseNotices = (text: string): NoticeItem[] | null => {
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) return null;
      const normalized = parsed
        .filter((item) => typeof item === "string" && item.trim())
        .map((content) => ({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          content: content.trim(),
        }));
      return normalized.length > 0 ? normalized : null;
    } catch {
      return null;
    }
  };

  const generateFieldMutation = useMutation({
    mutationFn: async ({ fieldName, fieldLabel }: { fieldName: string; fieldLabel: string }) => {
      setGeneratingField(fieldName);
      const response = await apiRequest("POST", "/api/documents/generate-field", {
        documentType: "급식안내문",
        fieldName,
        fieldLabel,
        context: {
          academicYear,
          month,
          title: previewTitle,
          greeting,
          mealPeriod,
          paymentPeriod,
          paymentMethod,
          issueDate,
          schoolName,
        },
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratingField(null);
      const generatedContent = String(data.generatedContent || "").trim();
      if (data.fieldName === "greeting") {
        setGreeting(generatedContent);
      } else if (data.fieldName === "paymentDetails") {
        const parsed = parsePaymentDetails(generatedContent);
        if (parsed) {
          setPaymentDetails(parsed);
        } else {
          toast({
            title: "AI 생성 결과 확인 필요",
            description: "납부내역 형식을 확인해주세요.",
            variant: "destructive",
          });
        }
      } else if (data.fieldName === "notices") {
        const parsed = parseNotices(generatedContent);
        if (parsed) {
          setNotices(parsed);
        } else {
          toast({
            title: "AI 생성 결과 확인 필요",
            description: "안내 항목 형식을 확인해주세요.",
            variant: "destructive",
          });
        }
      }

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

  const generateMutation = useMutation({
    mutationFn: async () => {
      const paymentText = paymentDetails
        .map(
          (row) =>
            `- ${row.grade || "(학년 미입력)"} | ${row.category || "(구분 미입력)"} | ${row.calculation || "(산출내역 미입력)"} | ${row.amount || "(납부금액 미입력)"} | ${row.note || ""}`
        )
        .join("\n");

      const noticeText = notices
        .map((notice, index) => `${index + 1}. ${notice.content || "(안내사항 미입력)"}`)
        .join("\n");

      const response = await apiRequest("POST", "/api/documents/generate", {
        documentType: "급식안내문",
        inputs: {
          academicYear,
          month,
          title: previewTitle,
          greeting,
          mealPeriod,
          paymentPeriod,
          paymentDetails: paymentText,
          paymentMethod,
          notices: noticeText,
          issueDate,
          principalSignature: signatureText,
          schoolName,
        },
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "문서 생성 완료",
        description: "급식안내문이 성공적으로 생성되었습니다.",
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

  const handleReset = () => {
    setAcademicYear("2025학년도");
    setMonth("4월");
    setGreeting("");
    setMealPeriod("");
    setPaymentPeriod("");
    setPaymentDetails([createPaymentRow()]);
    setPaymentMethod("");
    setNotices([createNoticeItem()]);
    setIssueDate("");
    setPrincipalSignature("");
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
              <h1 className="text-lg font-semibold text-foreground">급식안내문 작성</h1>
              <p className="text-sm text-muted-foreground">필요한 정보를 입력하면 AI가 급식안내문을 생성합니다</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              급식안내문 정보 입력
            </CardTitle>
            <CardDescription>입력한 내용으로 AI가 급식안내문을 생성합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">문서 제목</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">학년도</span>
                  <Select value={academicYear} onValueChange={setAcademicYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="학년도 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {academicYearOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">월</span>
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="월 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
                📄 미리보기: <strong className="text-foreground">{previewTitle}</strong>
              </div>
            </section>

            <div className="h-px bg-border" />

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">인사말</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => generateFieldMutation.mutate({ fieldName: "greeting", fieldLabel: "인사말" })}
                  disabled={generatingField === "greeting"}
                >
                  {generatingField === "greeting" ? (
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
              <Textarea
                placeholder="학부모님께 전달할 인사말을 입력하세요."
                className="min-h-[140px]"
                value={greeting}
                onChange={(event) => setGreeting(event.target.value)}
              />
            </section>

            <div className="h-px bg-border" />

            <section className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <span className="text-sm font-semibold text-foreground">급식 기간</span>
                <Input
                  placeholder="예: 2025. 4. 1.(화) ~ 4. 30.(수)"
                  value={mealPeriod}
                  onChange={(event) => setMealPeriod(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <span className="text-sm font-semibold text-foreground">급식비 납부기간</span>
                <Input
                  placeholder="예: 2025. 4. 1.(화) ~ 4. 7.(월)"
                  value={paymentPeriod}
                  onChange={(event) => setPaymentPeriod(event.target.value)}
                />
              </div>
            </section>

            <div className="h-px bg-border" />

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">납부내역</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => generateFieldMutation.mutate({ fieldName: "paymentDetails", fieldLabel: "납부내역" })}
                  disabled={generatingField === "paymentDetails"}
                >
                  {generatingField === "paymentDetails" ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3 h-3 mr-1" />
                      AI 생성
                    </>
                  )}
                </Button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-3 text-center w-[80px] font-semibold">학년</th>
                      <th className="px-3 py-3 text-center w-[140px] font-semibold">구분</th>
                      <th className="px-3 py-3 text-center font-semibold">산출내역</th>
                      <th className="px-3 py-3 text-center w-[120px] font-semibold">납부금액</th>
                      <th className="px-3 py-3 text-center w-[120px] font-semibold">비고</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentDetails.map((row) => (
                      <tr key={row.id} className="border-t border-border">
                        <td className="p-2">
                          <Input
                            value={row.grade}
                            onChange={(event) => handleUpdatePaymentRow(row.id, "grade", event.target.value)}
                            placeholder="1학년"
                            className="text-center"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={row.category}
                            onChange={(event) => handleUpdatePaymentRow(row.id, "category", event.target.value)}
                            placeholder="석식"
                            className="text-center"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={row.calculation}
                            onChange={(event) => handleUpdatePaymentRow(row.id, "calculation", event.target.value)}
                            placeholder="12일*5,900원=70,800원"
                            className="text-center"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={row.amount}
                            onChange={(event) => handleUpdatePaymentRow(row.id, "amount", event.target.value)}
                            placeholder="70,800원"
                            className="text-center"
                          />
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <Input
                              value={row.note}
                              onChange={(event) => handleUpdatePaymentRow(row.id, "note", event.target.value)}
                              placeholder=""
                              className="text-center"
                            />
                            {paymentDetails.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemovePaymentRow(row.id)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                ✕
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button type="button" variant="outline" onClick={handleAddPaymentRow}>
                + 행 추가
              </Button>
            </section>

            <div className="h-px bg-border" />

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground">납부 방법</h2>
              <Input
                placeholder="예: 스쿨뱅킹"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
              />
            </section>

            <div className="h-px bg-border" />

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">추가 안내 항목</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => generateFieldMutation.mutate({ fieldName: "notices", fieldLabel: "추가 안내 항목" })}
                  disabled={generatingField === "notices"}
                >
                  {generatingField === "notices" ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3 h-3 mr-1" />
                      AI 생성
                    </>
                  )}
                </Button>
              </div>
              <div className="space-y-3">
                {notices.map((notice) => (
                  <div key={notice.id} className="flex gap-3 rounded-lg bg-muted/40 p-3">
                    <span className="text-primary font-semibold">※</span>
                    <Textarea
                      value={notice.content}
                      onChange={(event) => handleUpdateNotice(notice.id, event.target.value)}
                      placeholder="안내사항을 입력하세요"
                      className="min-h-[80px]"
                    />
                    {notices.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveNotice(notice.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" onClick={handleAddNotice}>
                + 안내 항목 추가
              </Button>
            </section>

            <div className="h-px bg-border" />

            <section className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <span className="text-sm font-semibold text-foreground">발행 날짜</span>
                <Input
                  placeholder="예: 2025년 4월 1일"
                  value={issueDate}
                  onChange={(event) => setIssueDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <span className="text-sm font-semibold text-foreground">
                  학교장 서명
                  <span className="ml-2 rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">자동 채움</span>
                </span>
                <Input
                  value={signatureText}
                  onChange={(event) => setPrincipalSignature(event.target.value)}
                  placeholder="학교명 + 장"
                />
              </div>
            </section>

            <div className="flex flex-col gap-3 pt-4 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => setIsPreviewOpen(true)}>
                <Eye className="w-4 h-4 mr-2" />
                미리보기
              </Button>
              <Button type="button" className="flex-1" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    문서 생성 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI로 문서 생성하기
                  </>
                )}
              </Button>
              <Button type="button" variant="secondary" onClick={handleReset}>
                초기화
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>📄 문서 미리보기</DialogTitle>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto bg-muted/40 p-6">
            <div className="mx-auto w-[210mm] min-h-[297mm] bg-white p-[15mm] text-[11pt] leading-relaxed text-black shadow-lg">
              <div className="flex items-center justify-between border-b-2 border-black pb-3">
                <div className="text-[18pt] font-bold">{schoolName}</div>
                <div className="flex-1 text-center text-[22pt] font-bold tracking-[12px]">
                  가 정 통 신 문
                </div>
                <table className="border-collapse text-[9pt]">
                  <tbody>
                    {["제공부서", "담 당 자", "전화번호"].map((label) => (
                      <tr key={label}>
                        <th className="border border-gray-400 bg-gray-100 px-2 py-1 font-semibold">{label}</th>
                        <td className="border border-gray-400 px-4" />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="my-8 text-center text-[18pt] font-bold underline underline-offset-4">
                {previewTitle}
              </div>

              <div className="mb-5 whitespace-pre-line">{greeting || " "}</div>

              <div className="space-y-2">
                <div>
                  <strong>1. 급식 기간 : </strong>
                  {mealPeriod || " "}
                </div>
                <div>
                  <strong>2. 급식비 납부기간 : </strong>
                  {paymentPeriod || " "}
                </div>
                <div>
                  <strong>3. 납부내역</strong>
                </div>
              </div>

              <table className="mt-3 w-full border-collapse text-[10pt]">
                <thead>
                  <tr>
                    {["학 년", "구 분", "산 출 내 역", "납부금액", "비 고"].map((label) => (
                      <th key={label} className="border border-black bg-gray-100 px-3 py-2 text-center font-semibold">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paymentDetails.map((row) => (
                    <tr key={row.id}>
                      <td className="border border-black px-3 py-2 text-center">{row.grade || " "}</td>
                      <td className="border border-black px-3 py-2 text-center">{row.category || " "}</td>
                      <td className="border border-black px-3 py-2 text-center">{row.calculation || " "}</td>
                      <td className="border border-black px-3 py-2 text-center">{row.amount || " "}</td>
                      <td className="border border-black px-3 py-2 text-center">{row.note || " "}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4">
                <strong>4. 납부방법 : </strong>
                {paymentMethod || " "}
              </div>

              <div className="mt-4 space-y-2 text-[10pt]">
                {notices.map((notice) => (
                  <div key={notice.id}>※ {notice.content || " "}</div>
                ))}
              </div>

              <div className="mt-12 text-center">
                <div className="text-[14pt]">{issueDate || " "}</div>
                <div className="mt-4 text-[20pt] font-bold tracking-[16px]">{signatureText}</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
