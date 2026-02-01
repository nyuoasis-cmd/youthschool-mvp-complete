import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { Link } from "wouter";
import PDFDownloadButton from "@/components/PDFDownloadButton";
import MealNoticePreview from "@/components/MealNoticePreview";
import DateRangePicker, { DateRangeValue } from "@/components/common/DateRangePicker";
import { Button } from "@/components/ui/button";
import { AIStyledButton, SparkleIcon } from "@/components/AIGenerateButton";
import { DocumentSaveButton, AutoSaveIndicator } from "@/components/DocumentSaveButton";
import { useDocumentSave } from "@/hooks/use-document-save";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { GuideSidebar, MealNoticeGuide } from "@/components/guide-sidebar";
import {
  FormSectionSidebar,
  type FormSection,
} from "@/components/form-sidebar";

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

// 섹션 정의
const FORM_SECTIONS: FormSection[] = [
  { id: "section-title", number: 1, title: "문서 제목" },
  { id: "section-greeting", number: 2, title: "인사말" },
  { id: "section-period", number: 3, title: "급식/납부기간" },
  { id: "section-payment", number: 4, title: "납부내역" },
  { id: "section-method", number: 5, title: "납부 방법" },
  { id: "section-notices", number: 6, title: "추가 안내" },
  { id: "section-issue", number: 7, title: "발행 정보" },
];

export default function MealNoticeForm() {
  const { toast } = useToast();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [generatingField, setGeneratingField] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("section-title");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
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

  // 문서 저장 기능
  const getFormData = useCallback(() => ({
    academicYear,
    month,
    greeting,
    mealPeriod,
    paymentPeriod,
    paymentDetails,
    paymentMethod,
    notices,
    issueDate,
    principalSignature,
    schoolName,
  }), [academicYear, month, greeting, mealPeriod, paymentPeriod, paymentDetails, paymentMethod, notices, issueDate, principalSignature, schoolName]);

  const getTitle = useCallback(() => `${academicYear} ${month} 급식안내문`, [academicYear, month]);

  const getContent = useCallback(() => {
    return JSON.stringify({
      title: previewTitle,
      greeting,
      mealPeriod: mealPeriodText,
      paymentPeriod: paymentPeriodText,
      paymentDetails,
      paymentMethod,
      notices: notices.map(n => n.content).filter(Boolean),
    });
  }, [previewTitle, greeting, mealPeriodText, paymentPeriodText, paymentDetails, paymentMethod, notices]);

  const handleLoadDocument = useCallback((data: Record<string, unknown>) => {
    if (data.academicYear) setAcademicYear(data.academicYear as string);
    if (data.month) setMonth(data.month as string);
    if (data.greeting) setGreeting(data.greeting as string);
    if (data.mealPeriod) setMealPeriod(data.mealPeriod as DateRangeValue);
    if (data.paymentPeriod) setPaymentPeriod(data.paymentPeriod as DateRangeValue);
    if (data.paymentDetails) setPaymentDetails(data.paymentDetails as PaymentRow[]);
    if (data.paymentMethod) setPaymentMethod(data.paymentMethod as string);
    if (data.notices) setNotices(data.notices as NoticeItem[]);
    if (data.issueDate) setIssueDate(data.issueDate as string);
    if (data.principalSignature) setPrincipalSignature(data.principalSignature as string);
  }, []);

  const {
    isSaving,
    lastSavedAt,
    saveError,
    saveDocument,
    triggerAutoSave,
  } = useDocumentSave({
    documentType: "급식안내문",
    getFormData,
    getTitle,
    getContent,
    onLoadDocument: handleLoadDocument,
  });

  // 폼 변경 시 자동 저장 트리거
  useEffect(() => {
    triggerAutoSave();
  }, [academicYear, month, greeting, mealPeriod, paymentPeriod, paymentDetails, paymentMethod, notices, issueDate, principalSignature, triggerAutoSave]);

  // 섹션으로 스크롤
  const scrollToSection = useCallback((sectionId: string) => {
    const el = sectionRefs.current[sectionId];
    if (el) {
      const y = el.getBoundingClientRect().top + window.pageYOffset - 100;
      window.scrollTo({ top: y, behavior: "smooth" });
      setActiveSection(sectionId);
    }
  }, []);

  // ref 설정 헬퍼
  const setSectionRef = useCallback((id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  }, []);

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
      const response = await apiRequest("POST", "/api/documents/generate-field", {
        documentType: "급식안내문",
        fieldName: "allFields",
        fieldLabel: "전체 필드",
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
      // Parse JSON if string
      let parsed = data.generatedContent;
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          throw new Error("응답 형식 오류");
        }
      }
      return parsed;
    },
    onMutate: () => {
      setIsGeneratingAll(true);
    },
    onSuccess: (data: {
      greeting?: string;
      mealPeriod?: { start: string; end: string };
      paymentPeriod?: { start: string; end: string };
      paymentMethod?: string;
      paymentDetails?: Array<{ grade: string; category: string; calculation: string; amount: string; note: string }>;
      notices?: string[];
    }) => {
      // 인사말 설정
      if (data.greeting) {
        setGreeting(String(data.greeting).trim());
      }
      // 급식 기간 설정
      if (data.mealPeriod && typeof data.mealPeriod === "object") {
        setMealPeriod({
          start: data.mealPeriod.start || "",
          end: data.mealPeriod.end || "",
        });
      }
      // 납부 기간 설정
      if (data.paymentPeriod && typeof data.paymentPeriod === "object") {
        setPaymentPeriod({
          start: data.paymentPeriod.start || "",
          end: data.paymentPeriod.end || "",
        });
      }
      // 납부 방법 설정
      if (data.paymentMethod) {
        setPaymentMethod(String(data.paymentMethod).trim());
      }
      // 납부내역 설정
      if (data.paymentDetails && Array.isArray(data.paymentDetails)) {
        const parsed = data.paymentDetails.map((row) => ({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          grade: String(row.grade || ""),
          category: String(row.category || ""),
          calculation: String(row.calculation || ""),
          amount: String(row.amount || ""),
          note: String(row.note || ""),
        }));
        if (parsed.length > 0) {
          setPaymentDetails(parsed);
        }
      }
      // 안내사항 설정
      if (data.notices && Array.isArray(data.notices)) {
        const parsed = data.notices
          .filter((item) => typeof item === "string" && item.trim())
          .map((content) => ({
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            content: String(content).trim(),
          }));
        if (parsed.length > 0) {
          setNotices(parsed);
        }
      }

      toast({
        title: "AI 전부 생성 완료",
        description: "모든 항목이 생성되었습니다. 필요시 수정해주세요.",
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
    <div className="min-h-screen bg-background relative">
      {/* 좌측 사이드바: 섹션 목록 */}
      <FormSectionSidebar
        isOpen={leftSidebarOpen}
        onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
        documentTitle="급식안내문"
        sections={FORM_SECTIONS}
        activeSection={activeSection}
        onSectionClick={scrollToSection}
      />

      <header
        className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-40 h-[73px] transition-all duration-300"
        style={{ marginLeft: leftSidebarOpen ? "256px" : "0" }}
      >
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
            <div className="flex items-center gap-3">
              <AutoSaveIndicator
                lastSavedAt={lastSavedAt}
                isSaving={isSaving}
                error={saveError}
              />
              <DocumentSaveButton
                onClick={() => saveDocument("completed")}
                isSaving={isSaving}
                variant="header"
              />
              <PDFDownloadButton
                contentRef={documentRef}
                fileName={pdfFileName}
              />
            </div>
          </div>
        </div>
      </header>

      <main
        className="px-6 py-8 transition-all duration-300"
        style={{
          marginLeft: leftSidebarOpen ? "256px" : "0",
          marginRight: isSidebarOpen ? "360px" : "0",
        }}
      >
        <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>급식안내문 정보 입력</CardTitle>
            <CardDescription>입력한 내용으로 AI가 항목을 생성합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <section ref={setSectionRef("section-title")} className="space-y-3">
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

            <section ref={setSectionRef("section-greeting")} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">인사말</h2>
                <AIStyledButton
                  onClick={() => generateFieldMutation.mutate({ fieldName: "greeting", fieldLabel: "인사말" })}
                  disabled={generatingField === "greeting" || isGeneratingAll}
                  isLoading={generatingField === "greeting"}
                />
              </div>
              <Textarea
                placeholder="학부모님께 전달할 인사말을 입력하세요."
                className="min-h-[140px]"
                value={greeting}
                onChange={(event) => setGreeting(event.target.value)}
              />
            </section>

            <div className="h-px bg-border" />

            <section ref={setSectionRef("section-period")} className="grid gap-4 md:grid-cols-2">
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

            <section ref={setSectionRef("section-payment")} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">납부내역</h2>
                <AIStyledButton
                  onClick={() => generateFieldMutation.mutate({ fieldName: "paymentDetails", fieldLabel: "납부내역" })}
                  disabled={generatingField === "paymentDetails" || isGeneratingAll}
                  isLoading={generatingField === "paymentDetails"}
                />
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

            <section ref={setSectionRef("section-method")} className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground">납부 방법</h2>
              <Input
                placeholder="예: 스쿨뱅킹"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
              />
            </section>

            <div className="h-px bg-border" />

            <section ref={setSectionRef("section-notices")} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">추가 안내 항목</h2>
                <AIStyledButton
                  onClick={() => generateFieldMutation.mutate({ fieldName: "notices", fieldLabel: "추가 안내 항목" })}
                  disabled={generatingField === "notices" || isGeneratingAll}
                  isLoading={generatingField === "notices"}
                />
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

            <section ref={setSectionRef("section-issue")} className="grid gap-4 md:grid-cols-2">
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
                미리보기
              </Button>
              <DocumentSaveButton
                onClick={() => saveDocument("completed")}
                isSaving={isSaving}
                variant="footer"
              />
              <button
                type="button"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-blue-500 text-white font-medium rounded-lg shadow-md hover:shadow-lg hover:from-violet-600 hover:to-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => generateAllMutation.mutate()}
                disabled={generateAllMutation.isPending || isGeneratingAll}
              >
                {generateAllMutation.isPending || isGeneratingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI 전부 생성 중...
                  </>
                ) : (
                  <>
                    <SparkleIcon />
                    AI 전부 생성
                  </>
                )}
              </button>
              <Button type="button" variant="secondary" onClick={handleReset}>
                초기화
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </main>

      {/* 미리보기 모달 */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>📄 문서 미리보기</DialogTitle>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto bg-muted/40 p-6">
            <MealNoticePreview {...previewProps} />
          </div>
        </DialogContent>
      </Dialog>

      {/* 가이드 사이드바 */}
      <GuideSidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        title="작성 가이드"
      >
        <MealNoticeGuide />
      </GuideSidebar>

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
