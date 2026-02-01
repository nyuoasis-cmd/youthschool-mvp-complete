import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Sparkles, Loader2, Wand2, Eye, Plus, X } from "lucide-react";
import { Link } from "wouter";
import PDFDownloadButton from "@/components/PDFDownloadButton";
import SuneungNoticePreview from "@/components/SuneungNoticePreview";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { GuideSidebar, SuneungNoticeGuide } from "@/components/guide-sidebar";
import {
  FormSectionSidebar,
  type FormSection,
} from "@/components/form-sidebar";

// 타입 정의
interface ProfileData {
  schoolName?: string;
}

interface ScheduleRow {
  id: string;
  period: string;
  subject: string;
  time: string;
  questions: string;
  note: string;
}

interface SupplyItem {
  id: string;
  content: string;
}

interface NoticeItem {
  id: string;
  content: string;
}

// 유틸리티 함수
const createScheduleRow = (): ScheduleRow => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  period: "",
  subject: "",
  time: "",
  questions: "",
  note: "",
});

const createSupplyItem = (): SupplyItem => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  content: "",
});

const createNoticeItem = (): NoticeItem => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  content: "",
});

// 섹션 정의
const FORM_SECTIONS: FormSection[] = [
  { id: "section-basic", number: 1, title: "기본 정보" },
  { id: "section-greeting", number: 2, title: "인사말" },
  { id: "section-schedule", number: 3, title: "시험 시간표" },
  { id: "section-supplies", number: 4, title: "준비물 안내" },
  { id: "section-cautions", number: 5, title: "유의사항" },
  { id: "section-entry", number: 6, title: "입실 시간" },
  { id: "section-notes", number: 7, title: "추가 안내" },
  { id: "section-issue", number: 8, title: "발행 정보" },
];

export default function SuneungNoticeForm() {
  const { toast } = useToast();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [generatingField, setGeneratingField] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("section-basic");
  const documentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // 기본 정보
  const [academicYear, setAcademicYear] = useState("");
  const [examType, setExamType] = useState("");
  const [examDate, setExamDate] = useState("");
  const [greeting, setGreeting] = useState("");

  // 시험 시간표
  const [schedules, setSchedules] = useState<ScheduleRow[]>([createScheduleRow()]);

  // 준비물
  const [supplies, setSupplies] = useState<SupplyItem[]>([createSupplyItem()]);

  // 유의사항
  const [cautions, setCautions] = useState("");

  // 입실 시간
  const [entryTimeFirst, setEntryTimeFirst] = useState("");
  const [entryTimeOthers, setEntryTimeOthers] = useState("");

  // 추가 안내
  const [additionalNotes, setAdditionalNotes] = useState<NoticeItem[]>([createNoticeItem()]);

  // 발행 정보
  const [issueDate, setIssueDate] = useState("");
  const [principalSignature, setPrincipalSignature] = useState("");

  // 프로필 데이터 가져오기
  const { data: profile } = useQuery<ProfileData>({
    queryKey: ["/api/auth/profile"],
    retry: false,
  });

  const schoolName = profile?.schoolName || "학교명";
  const signatureText = principalSignature || (schoolName ? `${schoolName}장` : "");
  const pdfFileName = `${academicYear}_${examType}_안내문`;

  // 문서 저장 기능
  const getFormData = useCallback(() => ({
    academicYear,
    examType,
    examDate,
    greeting,
    schedules,
    supplies,
    cautions,
    entryTimeFirst,
    entryTimeOthers,
    additionalNotes,
    issueDate,
    principalSignature,
    schoolName,
  }), [academicYear, examType, examDate, greeting, schedules, supplies, cautions, entryTimeFirst, entryTimeOthers, additionalNotes, issueDate, principalSignature, schoolName]);

  const getTitle = useCallback(() => `${academicYear} ${examType} 안내문`, [academicYear, examType]);

  const getContent = useCallback(() => {
    return JSON.stringify(getFormData());
  }, [getFormData]);

  const handleLoadDocument = useCallback((data: Record<string, unknown>) => {
    if (data.academicYear) setAcademicYear(data.academicYear as string);
    if (data.examType) setExamType(data.examType as string);
    if (data.examDate) setExamDate(data.examDate as string);
    if (data.greeting) setGreeting(data.greeting as string);
    if (data.schedules) setSchedules(data.schedules as ScheduleRow[]);
    if (data.supplies) setSupplies(data.supplies as SupplyItem[]);
    if (data.cautions) setCautions(data.cautions as string);
    if (data.entryTimeFirst) setEntryTimeFirst(data.entryTimeFirst as string);
    if (data.entryTimeOthers) setEntryTimeOthers(data.entryTimeOthers as string);
    if (data.additionalNotes) setAdditionalNotes(data.additionalNotes as NoticeItem[]);
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
    documentType: "수능안내문",
    getFormData,
    getTitle,
    getContent,
    onLoadDocument: handleLoadDocument,
  });

  // 폼 변경 시 자동 저장 트리거
  useEffect(() => {
    triggerAutoSave();
  }, [academicYear, examType, examDate, greeting, schedules, supplies, cautions, entryTimeFirst, entryTimeOthers, additionalNotes, issueDate, principalSignature, triggerAutoSave]);

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

  // 시간표 핸들러
  const handleAddScheduleRow = () => {
    setSchedules((prev) => [...prev, createScheduleRow()]);
  };

  const handleRemoveScheduleRow = (id: string) => {
    setSchedules((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.id !== id)));
  };

  const handleUpdateScheduleRow = (id: string, field: keyof ScheduleRow, value: string) => {
    setSchedules((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  // 준비물 핸들러
  const handleAddSupply = () => {
    setSupplies((prev) => [...prev, createSupplyItem()]);
  };

  const handleRemoveSupply = (id: string) => {
    setSupplies((prev) => (prev.length <= 1 ? prev : prev.filter((item) => item.id !== id)));
  };

  const handleUpdateSupply = (id: string, value: string) => {
    setSupplies((prev) =>
      prev.map((item) => (item.id === id ? { ...item, content: value } : item))
    );
  };

  // 추가 안내 핸들러
  const handleAddNote = () => {
    setAdditionalNotes((prev) => [...prev, createNoticeItem()]);
  };

  const handleRemoveNote = (id: string) => {
    setAdditionalNotes((prev) => (prev.length <= 1 ? prev : prev.filter((item) => item.id !== id)));
  };

  const handleUpdateNote = (id: string, value: string) => {
    setAdditionalNotes((prev) =>
      prev.map((item) => (item.id === id ? { ...item, content: value } : item))
    );
  };

  // AI 생성 mutation
  const generateFieldMutation = useMutation({
    mutationFn: async ({ fieldName, fieldLabel }: { fieldName: string; fieldLabel: string }) => {
      setGeneratingField(fieldName);
      const response = await apiRequest("POST", "/api/documents/generate-field", {
        documentType: "수능/모의평가 안내",
        fieldName,
        fieldLabel,
        context: {
          schoolName,
          academicYear,
          examType,
          examDate,
        },
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratingField(null);
      const generatedContent = data.generatedContent;

      if (data.fieldName === "greeting") {
        setGreeting(String(generatedContent || "").trim());
      } else if (data.fieldName === "cautions") {
        setCautions(String(generatedContent || "").trim());
      } else if (data.fieldName === "schedules") {
        try {
          const parsed = typeof generatedContent === "string" ? JSON.parse(generatedContent) : generatedContent;
          if (Array.isArray(parsed)) {
            setSchedules(parsed.map((item: { period?: string; subject?: string; time?: string; questions?: string; note?: string }) => ({
              id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
              period: item.period || "",
              subject: item.subject || "",
              time: item.time || "",
              questions: item.questions || "",
              note: item.note || "",
            })));
          }
        } catch {
          console.error("Failed to parse schedules JSON");
        }
      } else if (data.fieldName === "supplies") {
        try {
          const parsed = typeof generatedContent === "string" ? JSON.parse(generatedContent) : generatedContent;
          if (Array.isArray(parsed)) {
            setSupplies(parsed.map((content: string) => ({
              id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
              content: String(content),
            })));
          }
        } catch {
          console.error("Failed to parse supplies JSON");
        }
      } else if (data.fieldName === "entryTime") {
        try {
          const parsed = typeof generatedContent === "string" ? JSON.parse(generatedContent) : generatedContent;
          if (parsed && typeof parsed === "object") {
            setEntryTimeFirst(parsed.entryTimeFirst || "");
            setEntryTimeOthers(parsed.entryTimeOthers || "");
          }
        } catch {
          console.error("Failed to parse entryTime JSON");
        }
      } else if (data.fieldName === "additionalNotes") {
        try {
          const parsed = typeof generatedContent === "string" ? JSON.parse(generatedContent) : generatedContent;
          if (Array.isArray(parsed)) {
            setAdditionalNotes(parsed.map((content: string) => ({
              id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
              content: String(content),
            })));
          }
        } catch {
          console.error("Failed to parse additionalNotes JSON");
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

  // AI 전부 생성 mutation
  const generateAllMutation = useMutation({
    mutationFn: async () => {
      const fields = [
        { fieldName: "basicInfo", fieldLabel: "기본 정보" },
        { fieldName: "greeting", fieldLabel: "인사말" },
        { fieldName: "schedules", fieldLabel: "시험 시간표" },
        { fieldName: "supplies", fieldLabel: "준비물" },
        { fieldName: "cautions", fieldLabel: "유의사항" },
        { fieldName: "additionalNotes", fieldLabel: "추가 안내" },
      ];

      const results: Array<{ fieldName: string; generatedContent: unknown }> = [];

      for (const field of fields) {
        const response = await apiRequest("POST", "/api/documents/generate-field", {
          documentType: "수능/모의평가 안내",
          fieldName: field.fieldName,
          fieldLabel: field.fieldLabel,
          context: {
            schoolName,
            academicYear,
            examType,
            examDate,
          },
        });

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }

        results.push({
          fieldName: data.fieldName || field.fieldName,
          generatedContent: data.generatedContent,
        });
      }

      return results;
    },
    onMutate: () => {
      setIsGeneratingAll(true);
    },
    onSuccess: (results) => {
      results.forEach(({ fieldName, generatedContent }) => {
        if (fieldName === "basicInfo") {
          try {
            const parsed = typeof generatedContent === "string" ? JSON.parse(generatedContent) : generatedContent;
            if (parsed && typeof parsed === "object") {
              const basicData = parsed as { academicYear?: string; examType?: string; examDate?: string };
              if (basicData.academicYear) setAcademicYear(basicData.academicYear);
              if (basicData.examType) setExamType(basicData.examType);
              if (basicData.examDate) setExamDate(basicData.examDate);
            }
          } catch {
            console.error("Failed to parse basicInfo JSON");
          }
        } else if (fieldName === "greeting") {
          setGreeting(String(generatedContent || "").trim());
        } else if (fieldName === "cautions") {
          setCautions(String(generatedContent || "").trim());
        } else if (fieldName === "schedules") {
          try {
            const parsed = typeof generatedContent === "string" ? JSON.parse(generatedContent) : generatedContent;
            if (Array.isArray(parsed)) {
              setSchedules(parsed.map((item: { period?: string; subject?: string; time?: string; questions?: string; note?: string }) => ({
                id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                period: item.period || "",
                subject: item.subject || "",
                time: item.time || "",
                questions: item.questions || "",
                note: item.note || "",
              })));
            }
          } catch {
            console.error("Failed to parse schedules JSON");
          }
        } else if (fieldName === "supplies") {
          try {
            const parsed = typeof generatedContent === "string" ? JSON.parse(generatedContent) : generatedContent;
            if (Array.isArray(parsed)) {
              setSupplies(parsed.map((content: string) => ({
                id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                content: String(content),
              })));
            }
          } catch {
            console.error("Failed to parse supplies JSON");
          }
        } else if (fieldName === "entryTime") {
          try {
            const parsed = typeof generatedContent === "string" ? JSON.parse(generatedContent) : generatedContent;
            if (parsed && typeof parsed === "object") {
              const entryData = parsed as { entryTimeFirst?: string; entryTimeOthers?: string };
              setEntryTimeFirst(entryData.entryTimeFirst || "");
              setEntryTimeOthers(entryData.entryTimeOthers || "");
            }
          } catch {
            console.error("Failed to parse entryTime JSON");
          }
        } else if (fieldName === "additionalNotes") {
          try {
            const parsed = typeof generatedContent === "string" ? JSON.parse(generatedContent) : generatedContent;
            if (Array.isArray(parsed)) {
              setAdditionalNotes(parsed.map((content: string) => ({
                id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                content: String(content),
              })));
            }
          } catch {
            console.error("Failed to parse additionalNotes JSON");
          }
        }
      });

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

  // 초기화
  const handleReset = () => {
    setAcademicYear("");
    setExamType("");
    setExamDate("");
    setGreeting("");
    setSchedules([createScheduleRow()]);
    setSupplies([createSupplyItem()]);
    setCautions("");
    setEntryTimeFirst("");
    setEntryTimeOthers("");
    setAdditionalNotes([createNoticeItem()]);
    setIssueDate("");
    setPrincipalSignature("");
  };

  // 미리보기 props
  const previewProps = useMemo(() => ({
    schoolName,
    academicYear,
    examType,
    examDate,
    greeting,
    schedules,
    supplies,
    cautions,
    entryTimeFirst,
    entryTimeOthers,
    additionalNotes,
    issueDate,
    signatureText,
  }), [
    schoolName,
    academicYear,
    examType,
    examDate,
    greeting,
    schedules,
    supplies,
    cautions,
    entryTimeFirst,
    entryTimeOthers,
    additionalNotes,
    issueDate,
    signatureText,
  ]);

  return (
    <div className="min-h-screen bg-background relative">
      {/* 좌측 사이드바: 섹션 목록 */}
      <FormSectionSidebar
        isOpen={leftSidebarOpen}
        onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
        documentTitle="수능/모의평가 안내문"
        sections={FORM_SECTIONS}
        activeSection={activeSection}
        onSectionClick={scrollToSection}
      />

      {/* 상단 헤더 */}
      <header
        className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-40 h-[73px] transition-all duration-300"
        style={{ marginLeft: leftSidebarOpen ? "256px" : "0" }}
      >
        <div className="max-w-4xl mx-auto px-6 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">수능/모의평가 안내문 작성</h1>
              <p className="text-sm text-muted-foreground">입력한 내용으로 AI가 항목을 생성합니다</p>
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
      </header>

      {/* 메인 폼 영역 */}
      <main
        className="px-6 py-8 transition-all duration-300"
        style={{
          marginLeft: leftSidebarOpen ? "256px" : "0",
          marginRight: isSidebarOpen ? "360px" : "0",
        }}
      >
        <div className="max-w-4xl mx-auto space-y-8">
          {/* 수능/모의평가 안내문 정보 입력 */}
          <Card>
            <CardHeader>
              <CardTitle>수능/모의평가 안내문 정보 입력</CardTitle>
              <CardDescription>입력한 내용으로 AI가 항목을 생성합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 섹션 1: 기본 정보 */}
              <section ref={setSectionRef("section-basic")} className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground">기본 정보</h2>
                <div className="grid gap-4 grid-cols-[1fr_1fr_160px]">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">학년도 <span className="text-destructive">*</span></label>
                    <Input
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      placeholder="예: 2026학년도"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">시험 유형 <span className="text-destructive">*</span></label>
                    <Input
                      value={examType}
                      onChange={(e) => setExamType(e.target.value)}
                      placeholder="예: 9월 모의평가"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">시험일</label>
                    <Input
                      type="date"
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                      className="[&::-webkit-calendar-picker-indicator]:ml-auto"
                    />
                  </div>
                </div>
              </section>

              <div className="h-px bg-border" />

              {/* 섹션 2: 인사말 */}
              <section ref={setSectionRef("section-greeting")} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">인사말</h2>
                  <AIStyledButton
                    onClick={() => generateFieldMutation.mutate({ fieldName: "greeting", fieldLabel: "인사말" })}
                    disabled={generatingField === "greeting" || isGeneratingAll}
                    isLoading={generatingField === "greeting"}
                  />
                </div>
                <Textarea
                  placeholder="예: 학부모님 안녕하십니까? 2026학년도 9월 모의평가가 다음과 같이 시행됩니다..."
                  className="min-h-[120px]"
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                />
              </section>

              <div className="h-px bg-border" />

              {/* 섹션 3: 시험 시간표 */}
              <section ref={setSectionRef("section-schedule")} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">시험 시간표</h2>
                  <AIStyledButton
                    onClick={() => generateFieldMutation.mutate({ fieldName: "schedules", fieldLabel: "시험 시간표" })}
                    disabled={generatingField === "schedules" || isGeneratingAll}
                    isLoading={generatingField === "schedules"}
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border border-border px-3 py-2 text-left font-medium w-16">교시</th>
                        <th className="border border-border px-3 py-2 text-left font-medium">시험 영역</th>
                        <th className="border border-border px-3 py-2 text-left font-medium">시험 시간</th>
                        <th className="border border-border px-3 py-2 text-left font-medium w-20">문항 수</th>
                        <th className="border border-border px-3 py-2 text-left font-medium">비고</th>
                        <th className="border border-border px-3 py-2 w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedules.map((row) => (
                        <tr key={row.id}>
                          <td className="border border-border px-2 py-1">
                            <Input
                              value={row.period}
                              onChange={(e) => handleUpdateScheduleRow(row.id, "period", e.target.value)}
                              className="h-8"
                              placeholder="1"
                            />
                          </td>
                          <td className="border border-border px-2 py-1">
                            <Input
                              value={row.subject}
                              onChange={(e) => handleUpdateScheduleRow(row.id, "subject", e.target.value)}
                              className="h-8"
                              placeholder="국어"
                            />
                          </td>
                          <td className="border border-border px-2 py-1">
                            <Input
                              value={row.time}
                              onChange={(e) => handleUpdateScheduleRow(row.id, "time", e.target.value)}
                              className="h-8"
                              placeholder="08:40~10:00 (80분)"
                            />
                          </td>
                          <td className="border border-border px-2 py-1">
                            <Input
                              value={row.questions}
                              onChange={(e) => handleUpdateScheduleRow(row.id, "questions", e.target.value)}
                              className="h-8"
                              placeholder="45"
                            />
                          </td>
                          <td className="border border-border px-2 py-1">
                            <Input
                              value={row.note}
                              onChange={(e) => handleUpdateScheduleRow(row.id, "note", e.target.value)}
                              className="h-8"
                              placeholder="비고"
                            />
                          </td>
                          <td className="border border-border px-2 py-1 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleRemoveScheduleRow(row.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleAddScheduleRow}>
                  <Plus className="w-4 h-4 mr-1" />
                  행 추가
                </Button>
              </section>

              <div className="h-px bg-border" />

              {/* 섹션 4: 준비물 안내 */}
              <section ref={setSectionRef("section-supplies")} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">준비물 안내</h2>
                  <AIStyledButton
                    onClick={() => generateFieldMutation.mutate({ fieldName: "supplies", fieldLabel: "준비물" })}
                    disabled={generatingField === "supplies" || isGeneratingAll}
                    isLoading={generatingField === "supplies"}
                  />
                </div>
                {supplies.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <span className="text-primary">*</span>
                    <Input
                      value={item.content}
                      onChange={(e) => handleUpdateSupply(item.id, e.target.value)}
                      placeholder="예: 신분증, 수험표, 검은색 사인펜"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSupply(item.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={handleAddSupply}>
                  <Plus className="w-4 h-4 mr-1" />
                  항목 추가
                </Button>
              </section>

              <div className="h-px bg-border" />

              {/* 섹션 5: 유의사항 */}
              <section ref={setSectionRef("section-cautions")} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">유의사항</h2>
                  <AIStyledButton
                    onClick={() => generateFieldMutation.mutate({ fieldName: "cautions", fieldLabel: "유의사항" })}
                    disabled={generatingField === "cautions" || isGeneratingAll}
                    isLoading={generatingField === "cautions"}
                  />
                </div>
                <Textarea
                  placeholder="예: 휴대폰, 스마트워치, 이어폰 등 모든 전자기기는 시험장 반입이 금지됩니다..."
                  className="min-h-[150px]"
                  value={cautions}
                  onChange={(e) => setCautions(e.target.value)}
                />
              </section>

              <div className="h-px bg-border" />

              {/* 섹션 6: 입실 시간 */}
              <section ref={setSectionRef("section-entry")} className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground">입실 시간</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">1교시 입실</label>
                    <Input
                      value={entryTimeFirst}
                      onChange={(e) => setEntryTimeFirst(e.target.value)}
                      placeholder="예: 08:10까지"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">2~5교시 입실</label>
                    <Input
                      value={entryTimeOthers}
                      onChange={(e) => setEntryTimeOthers(e.target.value)}
                      placeholder="예: 시험 시작 10분 전까지"
                    />
                  </div>
                </div>
              </section>

              <div className="h-px bg-border" />

              {/* 섹션 7: 추가 안내 */}
              <section ref={setSectionRef("section-notes")} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">추가 안내 항목</h2>
                  <AIStyledButton
                    onClick={() => generateFieldMutation.mutate({ fieldName: "additionalNotes", fieldLabel: "추가 안내" })}
                    disabled={generatingField === "additionalNotes" || isGeneratingAll}
                    isLoading={generatingField === "additionalNotes"}
                  />
                </div>
                {additionalNotes.map((item) => (
                  <div key={item.id} className="flex items-start gap-2">
                    <span className="text-primary mt-2">*</span>
                    <Textarea
                      value={item.content}
                      onChange={(e) => handleUpdateNote(item.id, e.target.value)}
                      placeholder="추가 안내사항을 입력하세요"
                      className="flex-1 min-h-[60px]"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveNote(item.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={handleAddNote}>
                  <Plus className="w-4 h-4 mr-1" />
                  안내 항목 추가
                </Button>
              </section>

              <div className="h-px bg-border" />

              {/* 섹션 8: 발행 정보 */}
              <section ref={setSectionRef("section-issue")} className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground">발행 정보</h2>
                <div className="grid gap-4 grid-cols-[160px_1fr]">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">발행 날짜</label>
                    <Input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="[&::-webkit-calendar-picker-indicator]:ml-auto"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">학교장 서명</label>
                    <Input
                      value={principalSignature}
                      onChange={(e) => setPrincipalSignature(e.target.value)}
                      placeholder={signatureText}
                    />
                  </div>
                </div>
              </section>

              {/* 액션 버튼 */}
              <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => setIsPreviewOpen(true)}>
                  <Eye className="w-4 h-4 mr-2" />
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
                      <Loader2 className="w-4 h-4 animate-spin" />
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
        <DialogContent className="max-w-5xl max-h-[90vh] p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>수능/모의평가 안내문 미리보기</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto bg-muted/40 p-6">
            <SuneungNoticePreview {...previewProps} />
          </div>
        </DialogContent>
      </Dialog>

      {/* 가이드 사이드바 */}
      <GuideSidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        title="작성 가이드"
      >
        <SuneungNoticeGuide />
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
        <SuneungNoticePreview ref={documentRef} {...previewProps} />
      </div>
    </div>
  );
}
