import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Sparkles, Loader2, Wand2 } from "lucide-react";
import { Link } from "wouter";
import PDFDownloadButton from "@/components/PDFDownloadButton";
import MealNoticePreview from "@/components/MealNoticePreview";
import DateRangePicker, { DateRangeValue } from "@/components/common/DateRangePicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDateRange } from "@/utils/dateFormat";

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
  const { toast } = useToast();
  const [generatingField, setGeneratingField] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [academicYear, setAcademicYear] = useState("2025학년도");
  const [month, setMonth] = useState("4월");
  const [greeting, setGreeting] = useState("");
  const [mealPeriod, setMealPeriod] = useState<DateRangeValue>({ start: "", end: "" });
  const [paymentPeriod, setPaymentPeriod] = useState<DateRangeValue>({ start: "", end: "" });
  const [paymentDetails, setPaymentDetails] = useState<PaymentRow[]>([createPaymentRow()]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notices, setNotices] = useState<NoticeItem[]>([createNoticeItem()]);
  const [issueDate, setIssueDate] = useState("");
  const [principalSignature, setPrincipalSignature] = useState("");
  const documentRef = useRef<HTMLDivElement>(null);

  const { data: profile } = useQuery<ProfileData>({
    queryKey: ["/api/auth/profile"],
    retry: false,
  });

  const previewTitle = useMemo(
    () => `${academicYear} ${month} 학교급식 안내`,
    [academicYear, month]
  );
  const mealPeriodText = useMemo(
    () => formatDateRange(mealPeriod.start, mealPeriod.end),
    [mealPeriod.end, mealPeriod.start]
  );
  const paymentPeriodText = useMemo(
    () => formatDateRange(paymentPeriod.start, paymentPeriod.end),
    [paymentPeriod.end, paymentPeriod.start]
  );

  const schoolName = profile?.schoolName || "학교명";
  const signatureText = principalSignature || (schoolName ? `${schoolName}장` : "");
  const pdfFileName = `${academicYear}_${month}_급식안내문`;

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

  const applyGeneratedField = (fieldName: string, generatedContent: string) => {
    if (fieldName === "greeting") {
      setGreeting(generatedContent);
      return true;
    }

    if (fieldName === "paymentDetails") {
      const parsed = parsePaymentDetails(generatedContent);
      if (parsed) {
        setPaymentDetails(parsed);
        return true;
      }
      toast({
        title: "AI 생성 결과 확인 필요",
        description: "납부내역 형식을 확인해주세요.",
        variant: "destructive",
      });
      return false;
    }

    if (fieldName === "notices") {
      const parsed = parseNotices(generatedContent);
      if (parsed) {
        setNotices(parsed);
        return true;
      }
      toast({
        title: "AI 생성 결과 확인 필요",
        description: "안내 항목 형식을 확인해주세요.",
        variant: "destructive",
      });
      return false;
    }

    return false;
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
          mealPeriod: mealPeriodText,
          paymentPeriod: paymentPeriodText,
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
      const applied = applyGeneratedField(data.fieldName, generatedContent);
      if (applied) {
        toast({
          title: "AI 생성 완료",
          description: "내용이 생성되었습니다. 필요시 수정해주세요.",
        });
      }
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

  const generateAllMutation = useMutation({
    mutationFn: async () => {
      const fields = [
        { fieldName: "greeting", fieldLabel: "인사말" },
        { fieldName: "paymentDetails", fieldLabel: "납부내역" },
        { fieldName: "notices", fieldLabel: "추가 안내 항목" },
      ];

      const results: Array<{ fieldName: string; generatedContent: string }> = [];

      for (const field of fields) {
        const response = await apiRequest("POST", "/api/documents/generate-field", {
          documentType: "급식안내문",
          fieldName: field.fieldName,
          fieldLabel: field.fieldLabel,
          context: {
            academicYear,
            month,
            title: previewTitle,
            greeting,
            mealPeriod: mealPeriodText,
            paymentPeriod: paymentPeriodText,
            paymentMethod,
            issueDate,
            schoolName,
          },
        });

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }

        results.push({
          fieldName: data.fieldName || field.fieldName,
          generatedContent: String(data.generatedContent || "").trim(),
        });
      }

      return results;
    },
    onMutate: () => {
      setIsGeneratingAll(true);
    },
    onSuccess: (results) => {
      let hasError = false;
      results.forEach(({ fieldName, generatedContent }) => {
        const applied = applyGeneratedField(fieldName, generatedContent);
        if (!applied) {
          hasError = true;
        }
      });

      toast({
        title: hasError ? "일부 항목 확인 필요" : "AI 전부 생성 완료",
        description: hasError
          ? "일부 항목의 결과 형식을 확인해주세요."
          : "모든 항목이 생성되었습니다. 필요시 수정해주세요.",
        variant: hasError ? "destructive" : "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "AI 전부 생성 실패",
        description: error.message || "AI 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsGeneratingAll(false);
    },
  });

  const handleReset = () => {
    setAcademicYear("2025학년도");
    setMonth("4월");
    setGreeting("");
    setMealPeriod({ start: "", end: "" });
    setPaymentPeriod({ start: "", end: "" });
    setPaymentDetails([createPaymentRow()]);
    setPaymentMethod("");
    setNotices([createNoticeItem()]);
    setIssueDate("");
    setPrincipalSignature("");
  };

  // 미리보기 공통 props
  const previewProps = {
    schoolName,
    year: academicYear,
    month,
    greeting,
    mealPeriod: mealPeriodText,
    paymentPeriod: paymentPeriodText,
    paymentMethod,
    paymentDetails,
    notices,
    issueDate,
    signatureText,
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild data-testid="button-back">
                <Link href="/">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-foreground">급식안내문 작성</h1>
                <p className="text-sm text-muted-foreground">필요한 정보를 입력하면 AI가 항목을 작성합니다</p>
              </div>
            </div>
            <PDFDownloadButton
              contentRef={documentRef}
              fileName={pdfFileName}
            />
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
            <CardDescription>입력한 내용으로 AI가 항목을 생성합니다.</CardDescription>
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
                  disabled={generatingField === "greeting" || isGeneratingAll}
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
              <DateRangePicker
                label="급식 기간"
                value={mealPeriod}
                onChange={setMealPeriod}
                showDaysBadge
                showSchoolDays={false}
                autoTagLabel="자동 계산"
                startAriaLabel="급식 기간 시작 날짜"
                endAriaLabel="급식 기간 종료 날짜"
              />
              <DateRangePicker
                label="급식비 납부기간"
                value={paymentPeriod}
                onChange={setPaymentPeriod}
                startAriaLabel="급식비 납부기간 시작 날짜"
                endAriaLabel="급식비 납부기간 종료 날짜"
              />
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
                  disabled={generatingField === "paymentDetails" || isGeneratingAll}
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
                  disabled={generatingField === "notices" || isGeneratingAll}
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
              <Button
                type="button"
                className="flex-1"
                onClick={() => generateAllMutation.mutate()}
                disabled={generateAllMutation.isPending || isGeneratingAll}
              >
                {generateAllMutation.isPending || isGeneratingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    AI 전부 생성 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI 전부 생성
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

      {/* PDF 출력용 숨김 영역 */}
      <div
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          overflow: "visible",
        }}
        aria-hidden
      >
        <MealNoticePreview ref={documentRef} {...previewProps} />
      </div>
    </div>
  );
}
