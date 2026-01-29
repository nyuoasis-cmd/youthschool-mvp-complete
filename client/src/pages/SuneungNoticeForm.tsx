import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Sparkles, Loader2, Wand2, Eye, Plus, X } from "lucide-react";
import { Link } from "wouter";
import PDFDownloadButton from "@/components/PDFDownloadButton";
import SuneungNoticePreview from "@/components/SuneungNoticePreview";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { GuideSidebar, SuneungNoticeGuide } from "@/components/guide-sidebar";

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

export default function SuneungNoticeForm() {
  const { toast } = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [generatingField, setGeneratingField] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const documentRef = useRef<HTMLDivElement>(null);

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
      const generatedContent = String(data.generatedContent || "").trim();

      if (data.fieldName === "greeting") {
        setGreeting(generatedContent);
      } else if (data.fieldName === "cautions") {
        setCautions(generatedContent);
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
        { fieldName: "greeting", fieldLabel: "인사말" },
        { fieldName: "cautions", fieldLabel: "유의사항" },
      ];

      const results: Array<{ fieldName: string; generatedContent: string }> = [];

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
          generatedContent: String(data.generatedContent || "").trim(),
        });
      }

      return results;
    },
    onMutate: () => {
      setIsGeneratingAll(true);
    },
    onSuccess: (results) => {
      results.forEach(({ fieldName, generatedContent }) => {
        if (fieldName === "greeting") {
          setGreeting(generatedContent);
        } else if (fieldName === "cautions") {
          setCautions(generatedContent);
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
    <div className="min-h-screen bg-background">
      {/* 상단 헤더 */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50 h-[73px]">
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
          <PDFDownloadButton
            contentRef={documentRef}
            fileName={pdfFileName}
          />
        </div>
      </header>

      {/* 메인 폼 영역 */}
      <main className={`max-w-4xl mx-auto px-6 py-8 transition-all duration-300 ${isSidebarOpen ? "mr-[360px]" : ""}`}>
        <div className="space-y-8">
          {/* 섹션 1: 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">1</span>
                기본 정보
              </CardTitle>
              <CardDescription>학년도와 시험 유형을 선택하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {/* 섹션 2: 인사말 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">2</span>
                인사말
              </CardTitle>
              <CardDescription>학부모님께 전달할 인사말을 작성하세요.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">인사말</label>
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
                  placeholder="예: 학부모님 안녕하십니까? 2026학년도 9월 모의평가가 다음과 같이 시행됩니다..."
                  className="min-h-[120px]"
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* 섹션 3: 시험 시간표 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">3</span>
                시험 시간표
              </CardTitle>
              <CardDescription>교시별 시험 시간과 영역을 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {/* 섹션 4: 준비물 안내 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">4</span>
                준비물 안내
              </CardTitle>
              <CardDescription>수험생이 준비해야 할 물품을 안내합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
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
            </CardContent>
          </Card>

          {/* 섹션 5: 유의사항 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">5</span>
                유의사항
              </CardTitle>
              <CardDescription>전자기기 반입금지 등 중요 유의사항을 안내합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-destructive">* 중요</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => generateFieldMutation.mutate({ fieldName: "cautions", fieldLabel: "유의사항" })}
                    disabled={generatingField === "cautions" || isGeneratingAll}
                  >
                    {generatingField === "cautions" ? (
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
                  placeholder="예: 휴대폰, 스마트워치, 이어폰 등 모든 전자기기는 시험장 반입이 금지됩니다..."
                  className="min-h-[150px]"
                  value={cautions}
                  onChange={(e) => setCautions(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* 섹션 6: 입실 시간 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">6</span>
                입실 시간
              </CardTitle>
              <CardDescription>교시별 입실 시간을 안내합니다.</CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* 섹션 7: 추가 안내 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">7</span>
                추가 안내 항목
              </CardTitle>
              <CardDescription>기타 안내사항을 추가하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
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
            </CardContent>
          </Card>

          {/* 섹션 8: 발행 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">8</span>
                발행 정보
              </CardTitle>
              <CardDescription>발행일과 서명 정보를 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* 하단 액션 버튼 */}
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
