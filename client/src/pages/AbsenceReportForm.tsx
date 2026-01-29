import { useMemo, useRef, useState } from "react";
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

interface ProfileData {
  schoolName?: string;
}

const ABSENCE_TYPE_OPTIONS: { id: AbsenceType; label: string; icon: string }[] = [
  { id: 'illness', label: '질병결석', icon: '🤒' },
  { id: 'attendance', label: '출석인정', icon: '✅' },
  { id: 'other', label: '기타결석', icon: '📝' },
  { id: 'unapproved', label: '미인정결석', icon: '❌' },
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

export default function AbsenceReportForm() {
  const { toast } = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [generatingField, setGeneratingField] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const documentRef = useRef<HTMLDivElement>(null);

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
        fieldName: "reason",
        fieldLabel: "결석 사유",
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
    onMutate: () => {
      setIsGeneratingAll(true);
    },
    onSuccess: (data) => {
      const generatedContent = String(data.generatedContent || "").trim();
      setReason(generatedContent);
      toast({
        title: "AI 전체 생성 완료",
        description: "결석 사유가 생성되었습니다. 필요시 수정해주세요.",
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
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50 h-[73px]">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
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
        </div>
      </header>

      <main className={`max-w-4xl mx-auto px-6 py-8 transition-all duration-300 ${isSidebarOpen ? 'mr-[360px]' : ''}`}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              결석신고서 정보 입력
            </CardTitle>
            <CardDescription>학생 정보와 결석 내용을 입력하세요. AI가 결석 사유를 작성해드립니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 학생 정보 섹션 */}
            <section className="space-y-3">
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
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">결석 종류</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {ABSENCE_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setAbsenceType(option.id)}
                    className={`
                      flex flex-col items-center p-4 rounded-xl border-2 transition-all
                      ${absenceType === option.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                      }
                    `}
                  >
                    <span className="text-2xl mb-2">{option.icon}</span>
                    <span className={`text-sm font-medium ${absenceType === option.id ? 'text-primary' : 'text-foreground'}`}>
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <div className="h-px bg-border" />

            {/* 결석 기간 섹션 */}
            <section className="space-y-3">
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
            <section className="space-y-3">
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
                      AI 작성
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
            <section className="space-y-3">
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
            <section className="space-y-3">
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
            <section className="space-y-3">
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
