import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Sparkles, Loader2, Wand2, Eye, Plus, X, Check } from "lucide-react";
import { Link } from "wouter";
import PDFDownloadButton from "@/components/PDFDownloadButton";
import RecruitmentNoticePreview from "@/components/RecruitmentNoticePreview";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { GuideSidebar, RecruitmentNoticeGuide } from "@/components/guide-sidebar";
import {
  FormSectionSidebar,
  type FormSection,
} from "@/components/form-sidebar";
import { cn } from "@/lib/utils";

// 타입 정의
interface ProfileData {
  schoolName?: string;
}

interface PositionItem {
  id: string;
  jobType: string;
  headcount: number;
  contractType: string;
  duties: string;
}

interface ScheduleItem {
  id: string;
  stage: string;
  datetime: string;
  note: string;
}

// 섹션 정의
const FORM_SECTIONS: FormSection[] = [
  { id: "overview", number: 1, title: "채용 개요" },
  { id: "conditions", number: 2, title: "근로 조건" },
  { id: "qualifications", number: 3, title: "응시 자격" },
  { id: "schedule", number: 4, title: "채용 일정" },
  { id: "documents", number: 5, title: "제출 서류" },
];

// 시도교육청 목록
const educationOffices = [
  "서울특별시교육청",
  "부산광역시교육청",
  "대구광역시교육청",
  "인천광역시교육청",
  "광주광역시교육청",
  "대전광역시교육청",
  "울산광역시교육청",
  "세종특별자치시교육청",
  "경기도교육청",
  "강원특별자치도교육청",
  "충청북도교육청",
  "충청남도교육청",
  "전북특별자치도교육청",
  "전라남도교육청",
  "경상북도교육청",
  "경상남도교육청",
  "제주특별자치도교육청",
];

// 채용직종 그룹
const jobTypeGroups = {
  급식: ["조리실무사", "조리사", "영양사"],
  행정: ["행정실무사", "사무행정지원사", "교무실무사"],
  교육지원: ["돌봄전담사", "특수교육실무사", "방과후학교실무사", "전문상담사", "사서실무사"],
  시설관리: ["시설관리사", "배움터지킴이", "당직전담사"],
  교원: ["기간제교사", "초빙교사", "강사"],
};

// 계약유형
const contractTypes = ["무기계약직", "기간제(1년)", "기간제(단기)", "대체인력", "시간제"];

// 보수유형
const salaryTypes = ["월급제", "시급제"];

// 1차 접수 시 제출서류
const firstSubmissionDocs = [
  { id: "application", label: "응시원서", default: true },
  { id: "selfIntro", label: "자기소개서", default: true },
  { id: "privacyConsent", label: "개인정보 수집·이용 동의서", default: true },
  { id: "certificate", label: "자격증 사본", default: false },
  { id: "career", label: "경력증명서", default: false },
  { id: "transcript", label: "성적증명서", default: false },
];

// 최종합격자 제출서류
const finalSubmissionDocs = [
  { id: "resident", label: "주민등록초본", default: true },
  { id: "health", label: "채용신체검사서", default: true },
  { id: "noDisqualification", label: "채용결격사유 부존재 확인서", default: true },
  { id: "sexCrime", label: "성범죄·아동학대 경력조회 동의서", default: true },
  { id: "diploma", label: "졸업증명서", default: false },
  { id: "bank", label: "통장사본", default: false },
];

// 유틸리티 함수
const createPositionItem = (): PositionItem => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  jobType: "",
  headcount: 1,
  contractType: "",
  duties: "",
});

const createScheduleItem = (stage: string): ScheduleItem => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  stage,
  datetime: "",
  note: "",
});

export default function RecruitmentNoticeForm() {
  const { toast } = useToast();
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [generatingField, setGeneratingField] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const documentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // 섹션 1: 기본 정보
  const [schoolName, setSchoolName] = useState("");
  const [noticeNumber, setNoticeNumber] = useState("");
  const [noticeDate, setNoticeDate] = useState("");
  const [educationOffice, setEducationOffice] = useState("");

  // 섹션 2: 채용 개요
  const [positions, setPositions] = useState<PositionItem[]>([createPositionItem()]);

  // 섹션 3: 근로 조건
  const [contractPeriod, setContractPeriod] = useState<DateRangeValue>({ start: "", end: "" });
  const [isUntilRetirement, setIsUntilRetirement] = useState(false);
  const [workTimeStart, setWorkTimeStart] = useState("");
  const [workTimeEnd, setWorkTimeEnd] = useState("");
  const [breakTime, setBreakTime] = useState("");
  const [workPlace, setWorkPlace] = useState("");
  const [salaryType, setSalaryType] = useState("");
  const [salaryAmount, setSalaryAmount] = useState("");
  const [salaryUnit, setSalaryUnit] = useState("원/월");
  const [salaryNote, setSalaryNote] = useState("");

  // 섹션 4: 응시 자격
  const [minAge, setMinAge] = useState("");
  const [retirementAge, setRetirementAge] = useState("");
  const [requiredCertificates, setRequiredCertificates] = useState<string[]>([]);
  const [certificateInput, setCertificateInput] = useState("");
  const [otherQualifications, setOtherQualifications] = useState("");
  const [preferredConditions, setPreferredConditions] = useState("");

  // 섹션 5: 채용 일정
  const [schedules, setSchedules] = useState<ScheduleItem[]>([
    createScheduleItem("접수기간"),
    createScheduleItem("서류전형 발표"),
    createScheduleItem("면접전형"),
    createScheduleItem("최종합격자 발표"),
  ]);
  const [contactDepartment, setContactDepartment] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // 섹션 6: 제출 서류
  const [selectedFirstDocs, setSelectedFirstDocs] = useState<string[]>([]);
  const [selectedFinalDocs, setSelectedFinalDocs] = useState<string[]>([]);

  // 프로필 데이터 가져오기
  const { data: profile } = useQuery<ProfileData>({
    queryKey: ["/api/auth/profile"],
    retry: false,
  });

  // 프로필에서 학교명 자동 채움
  useEffect(() => {
    if (profile?.schoolName && !schoolName) {
      setSchoolName(profile.schoolName);
    }
  }, [profile?.schoolName, schoolName]);

  // 섹션 완료 여부 계산
  const completedSections = useMemo(() => {
    const completed: string[] = [];

    // 채용 개요
    if (positions.some(p => p.jobType && p.contractType)) {
      completed.push("overview");
    }

    // 근로 조건
    if ((contractPeriod.start && contractPeriod.end) || isUntilRetirement) {
      if (workPlace) {
        completed.push("conditions");
      }
    }

    // 응시 자격
    if (otherQualifications || requiredCertificates.length > 0) {
      completed.push("qualifications");
    }

    // 채용 일정
    if (schedules.some(s => s.datetime)) {
      completed.push("schedule");
    }

    // 제출 서류
    if (selectedFirstDocs.length > 0 && selectedFinalDocs.length > 0) {
      completed.push("documents");
    }

    return completed;
  }, [schoolName, noticeNumber, noticeDate, positions, contractPeriod, isUntilRetirement, workPlace, otherQualifications, requiredCertificates, schedules, selectedFirstDocs, selectedFinalDocs]);

  // 스크롤 감지 및 활성 섹션 업데이트
  // 섹션으로 스크롤
  const scrollToSection = useCallback((sectionId: string) => {
    const element = sectionRefs.current[sectionId];
    if (element) {
      const yOffset = -100;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
      setActiveSection(sectionId);
    }
  }, []);

  // ref 설정 헬퍼
  const setSectionRef = useCallback((id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  }, []);

  // 채용 직종 추가/삭제/수정
  const handleAddPosition = () => {
    setPositions(prev => [...prev, createPositionItem()]);
  };

  const handleRemovePosition = (id: string) => {
    setPositions(prev => prev.length <= 1 ? prev : prev.filter(p => p.id !== id));
  };

  const handleUpdatePosition = (id: string, field: keyof PositionItem, value: string | number) => {
    setPositions(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  // 자격증 추가/삭제
  const handleAddCertificate = () => {
    if (certificateInput.trim()) {
      setRequiredCertificates(prev => [...prev, certificateInput.trim()]);
      setCertificateInput("");
    }
  };

  const handleRemoveCertificate = (index: number) => {
    setRequiredCertificates(prev => prev.filter((_, i) => i !== index));
  };

  const handleCertificateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCertificate();
    }
  };

  // 일정 수정
  const handleUpdateSchedule = (id: string, field: keyof ScheduleItem, value: string) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  // 제출서류 토글
  const toggleFirstDoc = (docId: string) => {
    setSelectedFirstDocs(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const toggleFinalDoc = (docId: string) => {
    setSelectedFinalDocs(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  // AI 생성 mutation
  const generateFieldMutation = useMutation({
    mutationFn: async ({ fieldName, fieldLabel }: { fieldName: string; fieldLabel: string }) => {
      setGeneratingField(fieldName);
      const response = await apiRequest("POST", "/api/documents/generate-field", {
        documentType: "채용공고",
        fieldName,
        fieldLabel,
        context: {
          schoolName,
          educationOffice,
          positions: positions.map(p => ({ jobType: p.jobType, contractType: p.contractType })),
          salaryType,
        },
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratingField(null);
      const generatedContent = String(data.generatedContent || "").trim();

      if (data.fieldName === "duties") {
        // 담당업무는 현재 선택된 첫 번째 position에 적용
        if (positions.length > 0) {
          handleUpdatePosition(positions[0].id, "duties", generatedContent);
        }
      } else if (data.fieldName === "salaryNote") {
        setSalaryNote(generatedContent);
      } else if (data.fieldName === "otherQualifications") {
        setOtherQualifications(generatedContent);
      } else if (data.fieldName === "preferredConditions") {
        setPreferredConditions(generatedContent);
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
      const response = await apiRequest("POST", "/api/documents/generate-field", {
        documentType: "채용공고",
        fieldName: "allFields",
        fieldLabel: "전체 필드",
        context: {
          schoolName,
          educationOffice,
          positions: positions.map(p => ({ jobType: p.jobType, contractType: p.contractType })),
          salaryType,
        },
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      // JSON 파싱
      const generatedContent = String(data.generatedContent || "").trim();
      let jsonStr = generatedContent;
      const jsonMatch = generatedContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      return JSON.parse(jsonStr);
    },
    onMutate: () => {
      setIsGeneratingAll(true);
    },
    onSuccess: (data: Record<string, unknown>) => {
      // 기본 정보
      if (data.schoolName) setSchoolName(String(data.schoolName));
      if (data.noticeNumber) setNoticeNumber(String(data.noticeNumber));

      // 채용 개요
      if (data.jobType || data.contractType || data.duties) {
        const newPosition = {
          ...positions[0],
          jobType: String(data.jobType || positions[0].jobType),
          headcount: Number(data.headcount) || positions[0].headcount,
          contractType: String(data.contractType || positions[0].contractType),
          duties: String(data.duties || positions[0].duties),
        };
        setPositions([newPosition]);
      }

      // 근로 조건
      if (data.workTimeStart) setWorkTimeStart(String(data.workTimeStart));
      if (data.workTimeEnd) setWorkTimeEnd(String(data.workTimeEnd));
      if (data.breakTime) setBreakTime(String(data.breakTime));
      if (data.workPlace) setWorkPlace(String(data.workPlace));
      if (data.salaryType) setSalaryType(String(data.salaryType));
      if (data.salaryAmount) setSalaryAmount(String(data.salaryAmount));
      if (data.salaryNote) setSalaryNote(String(data.salaryNote));

      // 응시 자격
      if (data.minAge) setMinAge(String(data.minAge));
      if (data.retirementAge) setRetirementAge(String(data.retirementAge));
      if (data.otherQualifications) setOtherQualifications(String(data.otherQualifications));
      if (data.preferredConditions) setPreferredConditions(String(data.preferredConditions));

      // 채용 일정
      if (Array.isArray(data.schedules)) {
        const newSchedules = (data.schedules as Array<{ stage: string; datetime: string; note: string }>).map((s, i) => ({
          id: schedules[i]?.id || `${Date.now()}-${i}`,
          stage: s.stage || schedules[i]?.stage || "",
          datetime: s.datetime || "",
          note: s.note || "",
        }));
        setSchedules(newSchedules);
      }
      if (data.contactDepartment) setContactDepartment(String(data.contactDepartment));
      if (data.contactPhone) setContactPhone(String(data.contactPhone));

      // 제출 서류 (랜덤 체크)
      if (Array.isArray(data.selectedFirstDocs)) {
        setSelectedFirstDocs(data.selectedFirstDocs as string[]);
      }
      if (Array.isArray(data.selectedFinalDocs)) {
        setSelectedFinalDocs(data.selectedFinalDocs as string[]);
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

  // 초기화
  const handleReset = () => {
    setSchoolName(profile?.schoolName || "");
    setNoticeNumber("");
    setNoticeDate("");
    setEducationOffice("");
    setPositions([createPositionItem()]);
    setContractPeriod({ start: "", end: "" });
    setIsUntilRetirement(false);
    setWorkTimeStart("");
    setWorkTimeEnd("");
    setBreakTime("");
    setWorkPlace("");
    setSalaryType("");
    setSalaryAmount("");
    setSalaryUnit("원/월");
    setSalaryNote("");
    setMinAge("");
    setRetirementAge("");
    setRequiredCertificates([]);
    setCertificateInput("");
    setOtherQualifications("");
    setPreferredConditions("");
    setSchedules([
      createScheduleItem("접수기간"),
      createScheduleItem("서류전형 발표"),
      createScheduleItem("면접전형"),
      createScheduleItem("최종합격자 발표"),
    ]);
    setContactDepartment("");
    setContactPhone("");
    setSelectedFirstDocs([]);
    setSelectedFinalDocs([]);
  };

  // PDF 파일명
  const pdfFileName = `${schoolName || "학교"}_채용공고_${noticeNumber || ""}`;

  // 미리보기 props
  const previewProps = {
    schoolName: schoolName || "학교명",
    noticeNumber,
    noticeDate,
    educationOffice,
    positions,
    contractPeriod,
    isUntilRetirement,
    workTimeStart,
    workTimeEnd,
    breakTime,
    workPlace,
    salaryType,
    salaryAmount,
    salaryUnit,
    salaryNote,
    minAge,
    retirementAge,
    requiredCertificates,
    otherQualifications,
    preferredConditions,
    schedules,
    contactDepartment,
    contactPhone,
    selectedFirstDocs: firstSubmissionDocs.filter(d => selectedFirstDocs.includes(d.id)).map(d => d.label),
    selectedFinalDocs: finalSubmissionDocs.filter(d => selectedFinalDocs.includes(d.id)).map(d => d.label),
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* 좌측 사이드바: 섹션 목록 */}
      <FormSectionSidebar
        isOpen={isLeftSidebarOpen}
        onToggle={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
        documentTitle="채용공고"
        sections={FORM_SECTIONS}
        activeSection={activeSection}
        onSectionClick={scrollToSection}
      />

      {/* 상단 헤더 */}
      <header
        className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-40 h-[73px] transition-all duration-300"
        style={{ marginLeft: isLeftSidebarOpen ? "256px" : "0" }}
      >
        <div className="max-w-4xl mx-auto px-6 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">채용공고 작성</h1>
              <p className="text-sm text-muted-foreground">필요한 정보를 입력하면 AI가 항목을 작성합니다</p>
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
          marginLeft: isLeftSidebarOpen ? "256px" : "0",
          marginRight: isSidebarOpen ? "360px" : "0",
        }}
      >
          <div className="max-w-4xl mx-auto space-y-8">
            {/* 채용 공고 정보 입력 */}
            <Card>
              <CardHeader>
                <CardTitle>채용 공고 정보 입력</CardTitle>
                <CardDescription>입력한 내용으로 AI가 항목을 생성합니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 채용 개요 */}
                <section ref={setSectionRef("overview")} className="space-y-6">
                  <h2 className="text-sm font-semibold text-foreground">채용 개요</h2>
                {positions.map((position, index) => (
                  <div key={position.id} className="space-y-4 p-4 border rounded-lg relative">
                    {positions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemovePosition(position.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">채용직종 <span className="text-destructive">*</span></label>
                        <Select
                          value={position.jobType}
                          onValueChange={(v) => handleUpdatePosition(position.id, "jobType", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="직종 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(jobTypeGroups).map(([group, jobs]) => (
                              <SelectGroup key={group}>
                                <SelectLabel>{group}</SelectLabel>
                                {jobs.map((job) => (
                                  <SelectItem key={job} value={job}>
                                    {job}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">채용인원 <span className="text-destructive">*</span></label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            value={position.headcount}
                            onChange={(e) => handleUpdatePosition(position.id, "headcount", parseInt(e.target.value) || 1)}
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground">명</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">계약유형 <span className="text-destructive">*</span></label>
                        <Select
                          value={position.contractType}
                          onValueChange={(v) => handleUpdatePosition(position.id, "contractType", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="유형 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {contractTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">담당업무 <span className="text-destructive">*</span></label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => generateFieldMutation.mutate({ fieldName: "duties", fieldLabel: "담당업무" })}
                          disabled={generatingField === "duties" || isGeneratingAll}
                        >
                          {generatingField === "duties" ? (
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
                        placeholder="담당 업무를 입력하세요. 여러 업무는 줄바꿈으로 구분합니다."
                        className="min-h-[100px]"
                        value={position.duties}
                        onChange={(e) => handleUpdatePosition(position.id, "duties", e.target.value)}
                      />
                    </div>
                  </div>
                ))}

                <Button type="button" variant="outline" onClick={handleAddPosition}>
                  <Plus className="w-4 h-4 mr-2" />
                  채용 직종 추가
                </Button>
              </section>

              <div className="h-px bg-border" />

              {/* 근로 조건 */}
              <section ref={setSectionRef("conditions")} className="space-y-6">
                <h2 className="text-sm font-semibold text-foreground">근로 조건</h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium">계약기간 <span className="text-destructive">*</span></label>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="untilRetirement"
                        checked={isUntilRetirement}
                        onCheckedChange={(checked) => setIsUntilRetirement(checked === true)}
                      />
                      <label htmlFor="untilRetirement" className="text-sm text-muted-foreground cursor-pointer">
                        정년까지
                      </label>
                    </div>
                  </div>
                  {!isUntilRetirement && (
                    <DateRangePicker
                      label="계약기간"
                      value={contractPeriod}
                      onChange={setContractPeriod}
                      startAriaLabel="계약 시작일"
                      endAriaLabel="계약 종료일"
                    />
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">근무시간 <span className="text-destructive">*</span></label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={workTimeStart}
                        onChange={(e) => setWorkTimeStart(e.target.value)}
                      />
                      <span>~</span>
                      <Input
                        type="time"
                        value={workTimeEnd}
                        onChange={(e) => setWorkTimeEnd(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">휴게시간</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={breakTime}
                        onChange={(e) => setBreakTime(e.target.value)}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">분</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">근무장소 <span className="text-destructive">*</span></label>
                  <Input
                    placeholder="예: 오창고등학교 급식실"
                    value={workPlace}
                    onChange={(e) => setWorkPlace(e.target.value)}
                  />
                </div>

                <div className="h-px bg-border" />

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">보수 유형 <span className="text-destructive">*</span></label>
                    <Select value={salaryType} onValueChange={setSalaryType}>
                      <SelectTrigger>
                        <SelectValue placeholder="선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {salaryTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">보수 금액</label>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="예: 2,500,000"
                        value={salaryAmount}
                        onChange={(e) => setSalaryAmount(e.target.value)}
                        className="flex-1"
                      />
                      <Select value={salaryUnit} onValueChange={setSalaryUnit}>
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="원/월">원/월</SelectItem>
                          <SelectItem value="원/시간">원/시간</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">보수 관련 비고</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => generateFieldMutation.mutate({ fieldName: "salaryNote", fieldLabel: "보수 관련 비고" })}
                      disabled={generatingField === "salaryNote" || isGeneratingAll}
                    >
                      {generatingField === "salaryNote" ? (
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
                    placeholder="보수 관련 추가 안내사항을 입력하세요."
                    className="min-h-[80px]"
                    value={salaryNote}
                    onChange={(e) => setSalaryNote(e.target.value)}
                  />
                </div>
              </section>

              <div className="h-px bg-border" />

              {/* 응시 자격 */}
              <section ref={setSectionRef("qualifications")} className="space-y-6">
                <h2 className="text-sm font-semibold text-foreground">응시 자격</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">연령 조건</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">만</span>
                      <Input
                        type="number"
                        placeholder="18"
                        value={minAge}
                        onChange={(e) => setMinAge(e.target.value)}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">세 이상</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">정년 기준</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">만</span>
                      <Input
                        type="number"
                        value={retirementAge}
                        onChange={(e) => setRetirementAge(e.target.value)}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">세</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">필수 자격증</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {requiredCertificates.map((cert, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                      >
                        {cert}
                        <button
                          type="button"
                          onClick={() => handleRemoveCertificate(index)}
                          className="hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="자격증 이름을 입력하고 Enter"
                      value={certificateInput}
                      onChange={(e) => setCertificateInput(e.target.value)}
                      onKeyDown={handleCertificateKeyDown}
                    />
                    <Button type="button" variant="outline" onClick={handleAddCertificate}>
                      추가
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">기타 응시자격</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => generateFieldMutation.mutate({ fieldName: "otherQualifications", fieldLabel: "기타 응시자격" })}
                      disabled={generatingField === "otherQualifications" || isGeneratingAll}
                    >
                      {generatingField === "otherQualifications" ? (
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
                    placeholder="기타 응시자격을 입력하세요."
                    className="min-h-[100px]"
                    value={otherQualifications}
                    onChange={(e) => setOtherQualifications(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">우대사항</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => generateFieldMutation.mutate({ fieldName: "preferredConditions", fieldLabel: "우대사항" })}
                      disabled={generatingField === "preferredConditions" || isGeneratingAll}
                    >
                      {generatingField === "preferredConditions" ? (
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
                    placeholder="우대사항을 입력하세요."
                    className="min-h-[100px]"
                    value={preferredConditions}
                    onChange={(e) => setPreferredConditions(e.target.value)}
                  />
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    채용결격사유는 교육청 규정에 따라 자동으로 포함됩니다.
                  </p>
                </div>
              </section>

              <div className="h-px bg-border" />

              {/* 채용 일정 */}
              <section ref={setSectionRef("schedule")} className="space-y-6">
                <h2 className="text-sm font-semibold text-foreground">채용 일정</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border rounded-lg">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold w-[140px]">구분</th>
                        <th className="px-4 py-3 text-left font-semibold">일시</th>
                        <th className="px-4 py-3 text-left font-semibold">비고</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedules.map((schedule) => (
                        <tr key={schedule.id} className="border-t">
                          <td className="px-4 py-3 font-medium">{schedule.stage}</td>
                          <td className="px-4 py-3">
                            <Input
                              type="datetime-local"
                              value={schedule.datetime}
                              onChange={(e) => handleUpdateSchedule(schedule.id, "datetime", e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              placeholder={schedule.stage === "접수기간" ? "평일 09:00~16:00" : "합격자 개별통보"}
                              value={schedule.note}
                              onChange={(e) => handleUpdateSchedule(schedule.id, "note", e.target.value)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">담당부서</label>
                    <Input
                      placeholder="예: 행정실"
                      value={contactDepartment}
                      onChange={(e) => setContactDepartment(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">연락처</label>
                    <Input
                      type="tel"
                      placeholder="예: 043-000-0000"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                    />
                  </div>
                </div>
              </section>

              <div className="h-px bg-border" />

              {/* 제출 서류 */}
              <section ref={setSectionRef("documents")} className="space-y-6">
                <h2 className="text-sm font-semibold text-foreground">제출 서류</h2>
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">1차 접수 시 제출서류</h3>
                  <div className="flex flex-wrap gap-2">
                    {firstSubmissionDocs.map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => toggleFirstDoc(doc.id)}
                        className={cn(
                          "px-4 py-2 rounded-lg border text-sm transition-colors",
                          selectedFirstDocs.includes(doc.id)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-foreground border-border hover:bg-muted"
                        )}
                      >
                        {selectedFirstDocs.includes(doc.id) && <Check className="w-3 h-3 inline mr-1" />}
                        {doc.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">최종합격자 제출서류</h3>
                  <div className="flex flex-wrap gap-2">
                    {finalSubmissionDocs.map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => toggleFinalDoc(doc.id)}
                        className={cn(
                          "px-4 py-2 rounded-lg border text-sm transition-colors",
                          selectedFinalDocs.includes(doc.id)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-foreground border-border hover:bg-muted"
                        )}
                      >
                        {selectedFinalDocs.includes(doc.id) && <Check className="w-3 h-3 inline mr-1" />}
                        {doc.label}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

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
            </CardContent>
          </Card>
          </div>
        </main>

      {/* 미리보기 모달 */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>📄 채용공고 미리보기</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto bg-muted/40 p-6">
            <RecruitmentNoticePreview {...previewProps} />
          </div>
        </DialogContent>
      </Dialog>

      {/* 가이드 사이드바 */}
      <GuideSidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        title="작성 가이드"
      >
        <RecruitmentNoticeGuide />
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
        <RecruitmentNoticePreview ref={documentRef} {...previewProps} />
      </div>
    </div>
  );
}
