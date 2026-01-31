import { useMemo, useRef, useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye, Sparkles, Loader2, Wand2 } from "lucide-react";
import { Link } from "wouter";
import PDFDownloadButton from "@/components/PDFDownloadButton";
import AbsenceReportPreview, { AbsenceType } from "@/components/AbsenceReportPreview";
import DateRangePicker, { DateRangeValue } from "@/components/common/DateRangePicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { GuideSidebar, AbsenceReportGuide } from "@/components/guide-sidebar";
import {
  FormSectionSidebar,
  type FormSection,
} from "@/components/form-sidebar";

interface ProfileData {
  schoolName?: string;
}

const ABSENCE_TYPE_OPTIONS: { id: AbsenceType; label: string }[] = [
  { id: 'illness', label: '질병결석' },
  { id: 'attendance', label: '출석인정' },
  { id: 'other', label: '기타결석' },
  { id: 'unapproved', label: '미인정결석' },
];

const ABSENCE_TYPE_LABELS: Record<AbsenceType, string> = {
  illness: '질병결석',
  attendance: '출석인정',
  other: '기타결석',
  unapproved: '미인정결석',
};

const EVIDENCE_OPTIONS = [
  { id: 'medical', label: '진료확인서' },
  { id: 'prescription', label: '처방전' },
  { id: 'hospitalization', label: '입원확인서' },
  { id: 'official', label: '공문' },
  { id: 'consent', label: '학부모 확인서' },
  { id: 'other', label: '기타' },
];

// 섹션 정의
const FORM_SECTIONS: FormSection[] = [
  { id: "section-student", number: 1, title: "학생 정보" },
  { id: "section-type", number: 2, title: "결석 종류" },
  { id: "section-period", number: 3, title: "결석 기간" },
  { id: "section-reason", number: 4, title: "결석 사유" },
  { id: "section-evidence", number: 5, title: "증빙서류" },
  { id: "section-parent", number: 6, title: "보호자 정보" },
  { id: "section-submit", number: 7, title: "제출일" },
];

export default function AbsenceReportForm() {
  const { toast } = useToast();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [generatingField, setGeneratingField] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("section-student");
  const documentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

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

  // 폼 상태
  const [grade, setGrade] = useState("");
  const [classNum, setClassNum] = useState("");
  const [number, setNumber] = useState("");
  const [studentName, setStudentName] = useState("");
  const [absenceType, setAbsenceType] = useState<AbsenceType>("illness");
  const [absencePeriod, setAbsencePeriod] = useState<DateRangeValue>({ start: "", end: "" });
  const [reason, setReason] = useState("");
  const [evidenceList, setEvidenceList] = useState<string[]>([]);
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [submissionDate, setSubmissionDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const { data: profile } = useQuery<ProfileData>({
    queryKey: ["/api/auth/profile"],
    retry: false,
  });

  const schoolName = profile?.schoolName || "○○초등학교";

  const pdfFileName = useMemo(() => {
    const dateStr = absencePeriod.start || new Date().toISOString().split("T")[0];
    return `결석신고서_${studentName || "학생"}_${dateStr}`;
  }, [studentName, absencePeriod.start]);

  // 기간 텍스트 계산
  const periodText = useMemo(() => {
    if (!absencePeriod.start || !absencePeriod.end) return "";
    const start = new Date(absencePeriod.start);
    const end = new Date(absencePeriod.end);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return `${absencePeriod.start} ~ ${absencePeriod.end} (${days}일간)`;
  }, [absencePeriod]);

  const handleEvidenceToggle = (id: string) => {
    setEvidenceList((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const getEvidenceLabels = () => {
    return evidenceList
      .map((id) => EVIDENCE_OPTIONS.find((opt) => opt.id === id)?.label)
      .filter(Boolean) as string[];
  };

  // AI 사유 생성 mutation
  const generateFieldMutation = useMutation({
    mutationFn: async ({ fieldName, fieldLabel }: { fieldName: string; fieldLabel: string }) => {
      setGeneratingField(fieldName);
      const response = await apiRequest("POST", "/api/documents/generate-field", {
        documentType: "결석신고서",
        fieldName,
        fieldLabel,
        context: {
          schoolName,
          grade,
          classNum,
          number,
          studentName,
          absenceType: ABSENCE_TYPE_LABELS[absenceType],
          period: periodText,
          evidenceList: getEvidenceLabels(),
          parentName,
        },
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratingField(null);
      const generatedContent = String(data.generatedContent || "").trim();
      if (data.fieldName === "reason") {
        setReason(generatedContent);
        toast({
          title: "AI 생성 완료",
          description: "결석 사유가 생성되었습니다. 필요시 수정해주세요.",
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

  // AI 전체 생성 mutation
  const generateAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/documents/generate-field", {
        documentType: "결석신고서",
        fieldName: "allFields",
        fieldLabel: "전체 필드",
        context: {
          schoolName,
          grade,
          classNum,
          number,
          studentName,
          absenceType: ABSENCE_TYPE_LABELS[absenceType],
          period: periodText,
          evidenceList: getEvidenceLabels(),
          parentName,
        },
      });
      const data = await response.json();
      // Parse JSON if string
      let parsed = data.generatedContent;
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          // If parsing fails, treat as reason only
          return { reason: parsed };
        }
      }
      return parsed;
    },
    onMutate: () => {
      setIsGeneratingAll(true);
    },
    onSuccess: (data: { reason?: string; suggestedEvidence?: string[] }) => {
      // 결석 사유 설정
      if (data.reason) {
        setReason(String(data.reason).trim());
      }
      // 추천 증빙서류 설정
      if (data.suggestedEvidence && Array.isArray(data.suggestedEvidence)) {
        // 기존 선택된 것과 병합하지 않고 새로 설정
        const validEvidence = data.suggestedEvidence.filter(
          (id) => EVIDENCE_OPTIONS.some((opt) => opt.id === id)
        );
        if (validEvidence.length > 0) {
          setEvidenceList(validEvidence);
        }
      }
      toast({
        title: "AI 전체 생성 완료",
        description: "결석 사유와 증빙서류가 생성되었습니다. 필요시 수정해주세요.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "AI 전체 생성 실패",
        description: error.message || "AI 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsGeneratingAll(false);
    },
  });

  const handleReset = () => {
    setGrade("");
    setClassNum("");
    setNumber("");
    setStudentName("");
    setAbsenceType("illness");
    setAbsencePeriod({ start: "", end: "" });
    setReason("");
    setEvidenceList([]);
    setParentName("");
    setParentPhone("");
    setSubmissionDate(new Date().toISOString().split("T")[0]);
    toast({
      title: "초기화 완료",
      description: "모든 입력 내용이 초기화되었습니다.",
    });
  };

  // 미리보기 props
  const previewProps = {
    schoolName,
    grade,
    classNum,
    number,
    studentName,
    absenceType,
    startDate: absencePeriod.start,
    endDate: absencePeriod.end,
    reason,
    evidenceList: getEvidenceLabels(),
    parentName,
    parentPhone,
    submissionDate,
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* 좌측 사이드바: 섹션 목록 */}
      <FormSectionSidebar
        isOpen={leftSidebarOpen}
        onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
        documentTitle="결석신고서"
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
            <Button variant="ghost" size="icon" asChild data-testid="button-back">
              <Link href="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">결석신고서 작성</h1>
              <p className="text-sm text-muted-foreground">학생 정보와 결석 사유를 입력해주세요</p>
            </div>
          </div>
          <PDFDownloadButton
            contentRef={documentRef}
            fileName={pdfFileName}
          />
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
        <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>결석신고서 정보 입력</CardTitle>
            <CardDescription>학생 정보와 결석 내용을 입력하세요. AI가 결석 사유를 작성해드립니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 학생 정보 섹션 */}
            <section ref={setSectionRef("section-student")} className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">학생 정보</h2>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="grade">학년</Label>
                  <Input
                    id="grade"
                    type="number"
                    min="1"
                    max="6"
                    placeholder="예: 3"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="classNum">반</Label>
                  <Input
                    id="classNum"
                    type="number"
                    min="1"
                    placeholder="예: 2"
                    value={classNum}
                    onChange={(e) => setClassNum(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number">번호</Label>
                  <Input
                    id="number"
                    type="number"
                    min="1"
                    placeholder="예: 15"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentName">성명</Label>
                  <Input
                    id="studentName"
                    placeholder="홍길동"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                  />
                </div>
              </div>
            </section>

            <div className="h-px bg-border" />

            {/* 결석 종류 섹션 */}
            <section ref={setSectionRef("section-type")} className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">결석 종류</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {ABSENCE_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setAbsenceType(option.id)}
                    className={`
                      flex items-center justify-center p-4 rounded-xl border-2 transition-all
                      ${absenceType === option.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                      }
                    `}
                  >
                    <span className={`text-sm font-medium ${absenceType === option.id ? 'text-primary' : 'text-foreground'}`}>
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <div className="h-px bg-border" />

            {/* 결석 기간 섹션 */}
            <section ref={setSectionRef("section-period")} className="space-y-3">
              <DateRangePicker
                label="결석 기간"
                value={absencePeriod}
                onChange={setAbsencePeriod}
                showDaysBadge
                showSchoolDays={false}
                autoTagLabel="자동 계산"
                startAriaLabel="결석 시작 날짜"
                endAriaLabel="결석 종료 날짜"
              />
            </section>

            <div className="h-px bg-border" />

            {/* 결석 사유 섹션 */}
            <section ref={setSectionRef("section-reason")} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">결석 사유</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => generateFieldMutation.mutate({ fieldName: "reason", fieldLabel: "결석 사유" })}
                  disabled={generatingField === "reason" || isGeneratingAll}
                >
                  {generatingField === "reason" ? (
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
              <Textarea
                placeholder="결석 사유를 상세히 작성해주세요. (예: 고열 및 감기 증상으로 인한 병원 치료)"
                className="min-h-[120px]"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </section>

            <div className="h-px bg-border" />

            {/* 증빙서류 섹션 */}
            <section ref={setSectionRef("section-evidence")} className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">증빙서류 (선택)</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {EVIDENCE_OPTIONS.map((option) => (
                  <div
                    key={option.id}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                      ${evidenceList.includes(option.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                      }
                    `}
                    onClick={() => handleEvidenceToggle(option.id)}
                  >
                    <Checkbox
                      id={option.id}
                      checked={evidenceList.includes(option.id)}
                      onCheckedChange={() => handleEvidenceToggle(option.id)}
                    />
                    <Label htmlFor={option.id} className="cursor-pointer flex-1">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </section>

            <div className="h-px bg-border" />

            {/* 보호자 정보 섹션 */}
            <section ref={setSectionRef("section-parent")} className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">보호자 정보</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="parentName">보호자명</Label>
                  <Input
                    id="parentName"
                    placeholder="홍부모"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parentPhone">연락처</Label>
                  <Input
                    id="parentPhone"
                    type="tel"
                    placeholder="010-1234-5678"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                  />
                </div>
              </div>
            </section>

            <div className="h-px bg-border" />

            {/* 제출일 섹션 */}
            <section ref={setSectionRef("section-submit")} className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">제출일</h2>
              <Input
                type="date"
                value={submissionDate}
                onChange={(e) => setSubmissionDate(e.target.value)}
                className="max-w-xs"
              />
            </section>

            {/* 버튼 영역 */}
            <div className="flex flex-col gap-3 pt-4 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => setIsPreviewOpen(true)}>
                <Eye className="w-4 h-4 mr-2" />
                미리보기
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={() => generateAllMutation.mutate()}
                disabled={generateAllMutation.isPending || isGeneratingAll}
              >
                {generateAllMutation.isPending || isGeneratingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    AI 전체 생성 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI 전체 생성
                  </>
                )}
              </Button>
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
            <AbsenceReportPreview {...previewProps} />
          </div>
        </DialogContent>
      </Dialog>

      {/* 가이드 사이드바 */}
      <GuideSidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        title="작성 가이드"
      >
        <AbsenceReportGuide />
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
        <AbsenceReportPreview ref={documentRef} {...previewProps} />
      </div>
    </div>
  );
}
