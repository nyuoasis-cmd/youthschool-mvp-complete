import { useState, useRef, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Sparkles, Plus, Trash2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Link } from "wouter";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  FormSectionSidebar,
  FormGuideSidebar,
  type FormSection,
  type GuideSection,
} from "@/components/form-sidebar";

type ScheduleRow = {
  id: string;
  date: string;
  day: string;
  time: string;
  session: string;
  unit: string;
  content: string;
  note: string;
};

type EvalItem = {
  id: string;
  item: string;
  ratio: string;
};

interface ProfileData {
  schoolName?: string;
}

const COURSE_TYPES = [
  { value: "joint", label: "공동교육과정" },
  { value: "inter-school", label: "학교간 공동교육과정" },
  { value: "regular", label: "일반 교육과정" },
  { value: "afterschool", label: "방과후학교" },
];

const SUBJECT_AREAS = ["국어", "수학", "영어", "사회", "과학", "기술가정", "예술", "체육", "제2외국어", "기타"];

const COURSE_CATEGORIES = [
  { value: "general", label: "일반선택" },
  { value: "career", label: "진로선택" },
  { value: "specialized", label: "전문교과" },
  { value: "extra", label: "고시외과목" },
];

const CREDITS_OPTIONS = [
  { value: "2credits", label: "2학점 (32시간)" },
  { value: "3credits", label: "3학점 (48시간)" },
  { value: "other", label: "기타" },
];

const EVAL_METHODS = [
  { value: "performance", label: "수행평가 100%" },
  { value: "written", label: "지필평가 100%" },
  { value: "mixed", label: "지필 + 수행 혼합" },
];

const CLASS_TYPES = [
  "강의형",
  "발표수업형",
  "토의·토론학습형",
  "프로젝트수업형",
  "PBL",
  "거꾸로수업형",
  "실험·실습형",
];

const DAYS = ["월", "화", "수", "목", "금", "토"];

const createScheduleRow = (): ScheduleRow => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  date: "",
  day: "",
  time: "",
  session: "",
  unit: "",
  content: "",
  note: "",
});

const createEvalItem = (): EvalItem => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  item: "",
  ratio: "",
});

// 섹션 정의
const FORM_SECTIONS: FormSection[] = [
  { id: "section-metadata", number: 1, title: "기본 정보" },
  { id: "section-course", number: 2, title: "과목 정보" },
  { id: "section-instructor", number: 3, title: "담당 교사" },
  { id: "section-co-instructor", number: 4, title: "코티칭 교사" },
  { id: "section-operation", number: 5, title: "수업 운영" },
  { id: "section-method", number: 6, title: "수업 방법" },
  { id: "section-evaluation", number: 7, title: "평가" },
  { id: "section-schedule", number: 8, title: "주차별 강의 계획" },
  { id: "section-remote", number: 9, title: "원격학습 계획" },
];

// 작성 가이드 정의
const GUIDE_SECTIONS: GuideSection[] = [
  {
    number: 1,
    title: "기본 정보",
    items: [
      { label: "운영 기관", description: "과정을 운영하는 학교/기관명" },
      { label: "학기", description: "예: 2025학년도 2학기" },
      { label: "과정 유형", description: "공동교육과정/일반 교육과정 등" },
    ],
  },
  {
    number: 2,
    title: "과목 정보",
    items: [
      { label: "과목명", description: "개설 과목명" },
      { label: "과목 설명", description: "과목의 목표와 특성" },
    ],
    tip: { type: "info", text: "AI 생성으로 과목 설명을 자동 작성할 수 있습니다" },
  },
  {
    number: 3,
    title: "담당 교사",
    items: [
      { label: "교사/강사 구분", description: "정교사 또는 외부 강사" },
      { label: "이름/소속", description: "담당자 정보" },
    ],
  },
  {
    number: 5,
    title: "수업 운영",
    items: [
      { label: "학점(시간)", description: "2학점(32시간) 또는 3학점(48시간)" },
      { label: "수업 시간", description: "요일 및 시간대" },
      { label: "대상 학년", description: "수강 가능 학년" },
    ],
  },
  {
    number: 7,
    title: "평가",
    items: [
      { label: "평가 방법", description: "수행/지필/혼합" },
      { label: "평가 항목", description: "항목별 반영 비율" },
    ],
  },
  {
    number: 8,
    title: "주차별 강의 계획",
    items: [
      { label: "일정표", description: "날짜, 차시, 단원, 학습내용" },
    ],
    tip: { type: "info", text: "AI 생성으로 주차별 계획을 자동 생성할 수 있습니다" },
  },
];

export default function SyllabusForm() {
  const { toast } = useToast();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [generatingField, setGeneratingField] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  // 사이드바 상태 (기본: 닫힘)
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("section-metadata");

  // 접이식 섹션 상태
  const [coInstructorOpen, setCoInstructorOpen] = useState(false);
  const [remoteOpen, setRemoteOpen] = useState(false);

  // 섹션 refs
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // 폼 상태 - 기본 정보
  const [institution, setInstitution] = useState("");
  const [semester, setSemester] = useState("");
  const [courseType, setCourseType] = useState("");

  // 과목 정보
  const [courseName, setCourseName] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [subjectArea, setSubjectArea] = useState("");
  const [courseCategory, setCourseCategory] = useState("");

  // 담당 교사
  const [instructorType, setInstructorType] = useState("");
  const [instructorName, setInstructorName] = useState("");
  const [instructorAffiliation, setInstructorAffiliation] = useState("");
  const [instructorEmail, setInstructorEmail] = useState("");

  // 코티칭 교사
  const [coInstructorType, setCoInstructorType] = useState("");
  const [coInstructorName, setCoInstructorName] = useState("");
  const [coInstructorAffiliation, setCoInstructorAffiliation] = useState("");
  const [coInstructorEmail, setCoInstructorEmail] = useState("");

  // 수업 운영
  const [credits, setCredits] = useState("");
  const [totalSessions, setTotalSessions] = useState("");
  const [schedule, setSchedule] = useState("");
  const [targetGrade, setTargetGrade] = useState("");
  const [capacity, setCapacity] = useState("");
  const [location, setLocation] = useState("");
  const [scope, setScope] = useState("");

  // 수업 방법
  const [classTypes, setClassTypes] = useState<string[]>([]);
  const [textbook, setTextbook] = useState("");
  const [materials, setMaterials] = useState("");

  // 평가
  const [evalMethod, setEvalMethod] = useState("");
  const [writtenRatio, setWrittenRatio] = useState("");
  const [performanceRatio, setPerformanceRatio] = useState("");
  const [evalItems, setEvalItems] = useState<EvalItem[]>([]);

  // 주차별 강의 계획
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>([createScheduleRow(), createScheduleRow(), createScheduleRow()]);

  // 원격학습 계획
  const [remoteMethod, setRemoteMethod] = useState("");
  const [remoteNotes, setRemoteNotes] = useState("");

  const { data: profile } = useQuery<ProfileData>({
    queryKey: ["/api/auth/profile"],
    retry: false,
  });

  const getFormContext = () => ({
    institution,
    semester,
    courseType,
    courseName,
    courseDescription,
    subjectArea,
    courseCategory,
    instructorType,
    instructorName,
    instructorAffiliation,
    credits,
    totalSessions,
    schedule,
    targetGrade,
    capacity,
    classTypes,
    evalMethod,
    scheduleRows,
  });

  const applyGeneratedField = (fieldName: string, generatedContent: string) => {
    if (fieldName === "courseDescription") {
      setCourseDescription(generatedContent);
      return true;
    }
    return false;
  };

  const generateFieldMutation = useMutation({
    mutationFn: async ({ fieldName, fieldLabel }: { fieldName: string; fieldLabel: string }) => {
      setGeneratingField(fieldName);
      const response = await apiRequest("POST", "/api/documents/generate-field", {
        documentType: "강의계획서",
        fieldName,
        fieldLabel,
        context: getFormContext(),
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratingField(null);
      const generatedContent = String(data.generatedContent || "").trim();

      if (data.fieldName === "weeklySchedule") {
        // 주차별 계획 JSON 파싱
        try {
          let jsonStr = generatedContent;
          const jsonMatch = generatedContent.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
          }
          const parsed = JSON.parse(jsonStr) as Array<{ session: string; unit: string; content: string }>;

          if (Array.isArray(parsed) && parsed.length > 0) {
            const rows = parsed.map((row) => ({
              id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
              date: "",
              day: "",
              time: "",
              session: row.session || "",
              unit: row.unit || "",
              content: row.content || "",
              note: "",
            }));
            setScheduleRows(rows);
            toast({
              title: "AI 생성 완료",
              description: `${rows.length}개 차시의 강의 계획이 생성되었습니다.`,
            });
            return;
          }
        } catch (e) {
          console.error("Failed to parse weeklySchedule:", e);
          toast({
            title: "파싱 실패",
            description: "주차별 강의 계획 파싱에 실패했습니다.",
            variant: "destructive",
          });
          return;
        }
      }

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

  // 필수 필드 목록
  const REQUIRED_FIELDS = [
    "institution", "semester", "courseType", "courseName", "courseDescription",
    "subjectArea", "courseCategory", "instructorType", "instructorName",
    "instructorAffiliation", "credits", "totalSessions", "schedule",
    "targetGrade", "capacity", "location", "scope", "classTypes",
    "textbook", "materials", "evalMethod", "scheduleRows"
  ];

  // 재시도 카운트
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 2;

  // 생성된 데이터를 폼에 적용하는 함수
  const applyGeneratedData = (data: Record<string, unknown>) => {
    // 기본 정보
    if (data.institution) setInstitution(String(data.institution));
    if (data.semester) setSemester(String(data.semester));
    if (data.courseType) setCourseType(String(data.courseType));

    // 과목 정보
    if (data.courseName) setCourseName(String(data.courseName));
    if (data.courseDescription) setCourseDescription(String(data.courseDescription));
    if (data.subjectArea) setSubjectArea(String(data.subjectArea));
    if (data.courseCategory) setCourseCategory(String(data.courseCategory));

    // 담당 교사
    if (data.instructorType) setInstructorType(String(data.instructorType));
    if (data.instructorName) setInstructorName(String(data.instructorName));
    if (data.instructorAffiliation) setInstructorAffiliation(String(data.instructorAffiliation));

    // 수업 운영
    if (data.credits) setCredits(String(data.credits));
    if (data.totalSessions) setTotalSessions(String(data.totalSessions));
    if (data.schedule) setSchedule(String(data.schedule));
    if (data.targetGrade) setTargetGrade(String(data.targetGrade));
    if (data.capacity) setCapacity(String(data.capacity));
    if (data.location) setLocation(String(data.location));
    if (data.scope) setScope(String(data.scope));

    // 수업 방법
    if (Array.isArray(data.classTypes)) {
      setClassTypes(data.classTypes as string[]);
    }
    if (data.textbook) setTextbook(String(data.textbook));
    if (data.materials) setMaterials(String(data.materials));

    // 평가
    if (data.evalMethod) setEvalMethod(String(data.evalMethod));

    // 주차별 강의 계획
    if (Array.isArray(data.scheduleRows) && data.scheduleRows.length > 0) {
      const rows = (data.scheduleRows as Array<Record<string, string>>).map((row) => ({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        date: row.date || "",
        day: row.day || "",
        time: row.time || "",
        session: row.session || "",
        unit: row.unit || "",
        content: row.content || "",
        note: row.note || "",
      }));
      setScheduleRows(rows);
    }
  };

  // 누락 필드 확인 함수
  const checkMissingFields = (data: Record<string, unknown>) => {
    return REQUIRED_FIELDS.filter(
      (field) => !data[field] || (typeof data[field] === "string" && String(data[field]).trim() === "")
    );
  };

  const generateAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/documents/generate-field", {
        documentType: "강의계획서",
        fieldName: "allFields",
        fieldLabel: "전체 필드",
        context: getFormContext(),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const generatedContent = String(data.generatedContent || "").trim();
      let jsonStr = generatedContent;
      const jsonMatch = generatedContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      const parsed = JSON.parse(jsonStr);
      return parsed;
    },
    onMutate: () => {
      setIsGeneratingAll(true);
    },
    onSuccess: (data: Record<string, unknown>) => {
      const missingFields = checkMissingFields(data);

      // 누락 필드가 있고 재시도 횟수가 남았으면 자동 재시도
      if (missingFields.length > 0 && retryCount < MAX_RETRIES) {
        toast({
          title: `재시도 중... (${retryCount + 1}/${MAX_RETRIES})`,
          description: `${missingFields.length}개 항목 누락으로 다시 생성합니다.`,
        });
        setRetryCount((prev) => prev + 1);
        // 잠시 후 재시도
        setTimeout(() => {
          generateAllMutation.mutate();
        }, 500);
        return;
      }

      // 데이터 적용
      applyGeneratedData(data);

      // 결과 알림
      if (missingFields.length > 0) {
        toast({
          title: "일부 항목 누락",
          description: `${MAX_RETRIES}회 재시도 후에도 ${missingFields.length}개 항목이 누락되었습니다. 수동 입력이 필요합니다.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "AI 전부 생성 완료",
          description: retryCount > 0
            ? `${retryCount}회 재시도 후 모든 항목이 생성되었습니다.`
            : "모든 항목이 생성되었습니다. 필요시 수정해주세요.",
        });
      }

      // 재시도 카운트 초기화
      setRetryCount(0);
    },
    onError: (error: Error) => {
      toast({
        title: "AI 전부 생성 실패",
        description: error.message || "AI 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      // 에러 시 재시도 카운트 초기화
      setRetryCount(0);
    },
    onSettled: () => {
      setIsGeneratingAll(false);
    },
  });

  const handleReset = () => {
    setInstitution("");
    setSemester("");
    setCourseType("");
    setCourseName("");
    setCourseDescription("");
    setSubjectArea("");
    setCourseCategory("");
    setInstructorType("");
    setInstructorName("");
    setInstructorAffiliation("");
    setInstructorEmail("");
    setCoInstructorType("");
    setCoInstructorName("");
    setCoInstructorAffiliation("");
    setCoInstructorEmail("");
    setCredits("");
    setTotalSessions("");
    setSchedule("");
    setTargetGrade("");
    setCapacity("");
    setLocation("");
    setScope("");
    setClassTypes([]);
    setTextbook("");
    setMaterials("");
    setEvalMethod("");
    setWrittenRatio("");
    setPerformanceRatio("");
    setEvalItems([]);
    setScheduleRows([createScheduleRow(), createScheduleRow(), createScheduleRow()]);
    setRemoteMethod("");
    setRemoteNotes("");
    toast({ title: "초기화 완료", description: "모든 입력 내용이 초기화되었습니다." });
  };

  const handleAddScheduleRow = () => {
    setScheduleRows((prev) => [...prev, createScheduleRow()]);
  };

  const handleRemoveScheduleRow = (id: string) => {
    setScheduleRows((prev) => prev.filter((row) => row.id !== id));
  };

  const handleUpdateScheduleRow = (id: string, field: keyof ScheduleRow, value: string) => {
    setScheduleRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleAddEvalItem = () => {
    setEvalItems((prev) => [...prev, createEvalItem()]);
  };

  const handleRemoveEvalItem = (id: string) => {
    setEvalItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateEvalItem = (id: string, field: keyof EvalItem, value: string) => {
    setEvalItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleClassTypeChange = (type: string, checked: boolean) => {
    setClassTypes((prev) =>
      checked ? [...prev, type] : prev.filter((t) => t !== type)
    );
  };

  const scrollToSection = useCallback((sectionId: string) => {
    const el = sectionRefs.current[sectionId];
    if (el) {
      const y = el.getBoundingClientRect().top + window.pageYOffset - 100;
      window.scrollTo({ top: y, behavior: "smooth" });
      setActiveSection(sectionId);
    }
  }, []);

  const setSectionRef = useCallback((id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  }, []);

  return (
    <div className="min-h-screen bg-background relative">
      <FormSectionSidebar
        isOpen={leftSidebarOpen}
        onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
        documentTitle="강의계획서"
        sections={FORM_SECTIONS}
        activeSection={activeSection}
        onSectionClick={scrollToSection}
      />

      <FormGuideSidebar
        isOpen={rightSidebarOpen}
        onToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
        title="작성 가이드"
        sections={GUIDE_SECTIONS}
      />

      <header
        className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50 h-[73px] transition-all duration-300"
        style={{
          marginLeft: leftSidebarOpen ? "256px" : "0",
          marginRight: rightSidebarOpen ? "360px" : "0",
        }}
      >
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-foreground">강의계획서 작성</h1>
                <p className="text-sm text-muted-foreground">필요한 정보를 입력하면 AI가 항목을 작성합니다</p>
              </div>
            </div>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">PDF 다운로드</Button>
          </div>
        </div>
      </header>

      <main
        className="px-6 py-8 transition-all duration-300"
        style={{
          marginLeft: leftSidebarOpen ? "256px" : "0",
          marginRight: rightSidebarOpen ? "360px" : "0",
        }}
      >
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                강의계획서 정보 입력
              </CardTitle>
              <CardDescription>입력한 내용으로 AI가 항목을 생성합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* 기본 정보 */}
              <section ref={setSectionRef("section-metadata")} className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground">기본 정보</h2>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">운영 기관 <span className="text-red-500">*</span></span>
                    <Input
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      placeholder="온세종학교"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">학기 <span className="text-red-500">*</span></span>
                    <Input
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      placeholder="2025학년도 2학기"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">과정 유형</span>
                    <Select value={courseType} onValueChange={setCourseType}>
                      <SelectTrigger>
                        <SelectValue placeholder="선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {COURSE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              <div className="h-px bg-border" />

              {/* 과목 정보 */}
              <section ref={setSectionRef("section-course")} className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground">과목 정보</h2>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">과목명 <span className="text-red-500">*</span></span>
                    <Input
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                      placeholder="인공지능수학"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">교과</span>
                    <Select value={subjectArea} onValueChange={setSubjectArea}>
                      <SelectTrigger>
                        <SelectValue placeholder="선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUBJECT_AREAS.map((area) => (
                          <SelectItem key={area} value={area}>{area}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">과목 유형</span>
                    <Select value={courseCategory} onValueChange={setCourseCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {COURSE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">과목 설명 및 특성 <span className="text-red-500">*</span></span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => generateFieldMutation.mutate({ fieldName: "courseDescription", fieldLabel: "과목 설명" })}
                      disabled={generatingField === "courseDescription" || isGeneratingAll}
                    >
                      {generatingField === "courseDescription" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          생성 중...
                        </>
                      ) : "AI 생성"}
                    </Button>
                  </div>
                  <Textarea
                    value={courseDescription}
                    onChange={(e) => setCourseDescription(e.target.value)}
                    placeholder="인공지능 기술을 이해하고 구현하는데 필요한 기본 수학 지식을 학습합니다."
                    className="min-h-[80px]"
                  />
                </div>
              </section>

              <div className="h-px bg-border" />

              {/* 담당 교사 */}
              <section ref={setSectionRef("section-instructor")} className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground">담당 교사</h2>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">교사/강사 구분 <span className="text-red-500">*</span></span>
                    <Select value={instructorType} onValueChange={setInstructorType}>
                      <SelectTrigger>
                        <SelectValue placeholder="선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="teacher">교사</SelectItem>
                        <SelectItem value="instructor">강사</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">이름 <span className="text-red-500">*</span></span>
                    <Input
                      value={instructorName}
                      onChange={(e) => setInstructorName(e.target.value)}
                      placeholder="홍길동"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">소속</span>
                    <Input
                      value={instructorAffiliation}
                      onChange={(e) => setInstructorAffiliation(e.target.value)}
                      placeholder="서울시립대학교"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">이메일</span>
                    <Input
                      type="email"
                      value={instructorEmail}
                      onChange={(e) => setInstructorEmail(e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
              </section>

              <div className="h-px bg-border" />

              {/* 코티칭 교사 (접이식) */}
              <section ref={setSectionRef("section-co-instructor")} className="space-y-3">
                <button
                  type="button"
                  className="flex items-center justify-between w-full text-left"
                  onClick={() => setCoInstructorOpen(!coInstructorOpen)}
                >
                  <h2 className="text-sm font-semibold text-foreground">코티칭 교사 (선택)</h2>
                  {coInstructorOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {coInstructorOpen && (
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">교사/강사 구분</span>
                      <Select value={coInstructorType} onValueChange={setCoInstructorType}>
                        <SelectTrigger>
                          <SelectValue placeholder="선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="teacher">교사</SelectItem>
                          <SelectItem value="instructor">강사</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">이름</span>
                      <Input
                        value={coInstructorName}
                        onChange={(e) => setCoInstructorName(e.target.value)}
                        placeholder="이름"
                      />
                    </div>
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">소속</span>
                      <Input
                        value={coInstructorAffiliation}
                        onChange={(e) => setCoInstructorAffiliation(e.target.value)}
                        placeholder="소속"
                      />
                    </div>
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">이메일</span>
                      <Input
                        type="email"
                        value={coInstructorEmail}
                        onChange={(e) => setCoInstructorEmail(e.target.value)}
                        placeholder="이메일"
                      />
                    </div>
                  </div>
                )}
              </section>

              <div className="h-px bg-border" />

              {/* 수업 운영 */}
              <section ref={setSectionRef("section-operation")} className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground">수업 운영</h2>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">학점(시간) <span className="text-red-500">*</span></span>
                    <Select value={credits} onValueChange={setCredits}>
                      <SelectTrigger>
                        <SelectValue placeholder="선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {CREDITS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">수업 횟수 <span className="text-red-500">*</span></span>
                    <Input
                      value={totalSessions}
                      onChange={(e) => setTotalSessions(e.target.value)}
                      placeholder="주 1회 (총 12회)"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">수업 시간 <span className="text-red-500">*</span></span>
                    <Input
                      value={schedule}
                      onChange={(e) => setSchedule(e.target.value)}
                      placeholder="(목) 18:30~21:00"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">대상 학년 <span className="text-red-500">*</span></span>
                    <Input
                      value={targetGrade}
                      onChange={(e) => setTargetGrade(e.target.value)}
                      placeholder="2, 3학년"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">수강 인원</span>
                    <Input
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      placeholder="5~15명"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">수업 장소</span>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="창의융합실 (3층)"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">운영 범위</span>
                    <Input
                      value={scope}
                      onChange={(e) => setScope(e.target.value)}
                      placeholder="관내 고등학교"
                    />
                  </div>
                </div>
              </section>

              <div className="h-px bg-border" />

              {/* 수업 방법 */}
              <section ref={setSectionRef("section-method")} className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground">수업 방법</h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">수업 유형 <span className="text-red-500">*</span> (복수 선택 가능)</span>
                    <div className="flex flex-wrap gap-3">
                      {CLASS_TYPES.map((type) => (
                        <label key={type} className="inline-flex items-center gap-2">
                          <Checkbox
                            checked={classTypes.includes(type)}
                            onCheckedChange={(checked) => handleClassTypeChange(type, !!checked)}
                          />
                          <span className="text-sm">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">교재</span>
                      <Input
                        value={textbook}
                        onChange={(e) => setTextbook(e.target.value)}
                        placeholder="자체 제작 학습자료"
                      />
                    </div>
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">준비물/자료</span>
                      <Input
                        value={materials}
                        onChange={(e) => setMaterials(e.target.value)}
                        placeholder="노트북, 필기구"
                      />
                    </div>
                  </div>
                </div>
              </section>

              <div className="h-px bg-border" />

              {/* 평가 */}
              <section ref={setSectionRef("section-evaluation")} className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground">평가</h2>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">평가 방법 <span className="text-red-500">*</span></span>
                    <Select value={evalMethod} onValueChange={setEvalMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {EVAL_METHODS.map((method) => (
                          <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {evalMethod === "mixed" && (
                    <>
                      <div className="space-y-2">
                        <span className="text-sm text-muted-foreground">지필평가 비율 (%)</span>
                        <Input
                          type="number"
                          value={writtenRatio}
                          onChange={(e) => setWrittenRatio(e.target.value)}
                          placeholder="40"
                          min="0"
                          max="100"
                        />
                      </div>
                      <div className="space-y-2">
                        <span className="text-sm text-muted-foreground">수행평가 비율 (%)</span>
                        <Input
                          type="number"
                          value={performanceRatio}
                          onChange={(e) => setPerformanceRatio(e.target.value)}
                          placeholder="60"
                          min="0"
                          max="100"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">평가 항목별 비율</span>
                    <Button type="button" variant="ghost" size="sm" onClick={handleAddEvalItem}>
                      <Plus className="w-3 h-3 mr-1" /> 항목 추가
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {evalItems.map((item) => (
                      <div key={item.id} className="flex gap-2 items-center">
                        <Input
                          value={item.item}
                          onChange={(e) => handleUpdateEvalItem(item.id, "item", e.target.value)}
                          placeholder="평가 항목"
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          value={item.ratio}
                          onChange={(e) => handleUpdateEvalItem(item.id, "ratio", e.target.value)}
                          placeholder="비율 (%)"
                          className="w-24"
                          min="0"
                          max="100"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveEvalItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <div className="h-px bg-border" />

              {/* 주차별 강의 계획 */}
              <section ref={setSectionRef("section-schedule")} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">주차별 강의 계획</h2>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => generateFieldMutation.mutate({ fieldName: "weeklySchedule", fieldLabel: "주차별 계획" })}
                      disabled={generatingField === "weeklySchedule" || isGeneratingAll}
                    >
                      {generatingField === "weeklySchedule" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          생성 중...
                        </>
                      ) : "AI 생성"}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={handleAddScheduleRow}>
                      <Plus className="w-3 h-3 mr-1" /> 행 추가
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-2 py-2 text-left font-semibold w-20">날짜</th>
                        <th className="px-2 py-2 text-left font-semibold w-14">요일</th>
                        <th className="px-2 py-2 text-left font-semibold w-24">시간</th>
                        <th className="px-2 py-2 text-left font-semibold w-16">차시</th>
                        <th className="px-2 py-2 text-left font-semibold">단원</th>
                        <th className="px-2 py-2 text-left font-semibold">학습(평가)내용</th>
                        <th className="px-2 py-2 text-left font-semibold w-20">비고</th>
                        <th className="px-2 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduleRows.map((row) => (
                        <tr key={row.id} className="border-t border-border">
                          <td className="px-1 py-1">
                            <Input
                              value={row.date}
                              onChange={(e) => handleUpdateScheduleRow(row.id, "date", e.target.value)}
                              placeholder="9. 4."
                              className="h-8 text-xs"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <Select value={row.day} onValueChange={(v) => handleUpdateScheduleRow(row.id, "day", v)}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="-" />
                              </SelectTrigger>
                              <SelectContent>
                                {DAYS.map((d) => (
                                  <SelectItem key={d} value={d}>{d}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-1 py-1">
                            <Input
                              value={row.time}
                              onChange={(e) => handleUpdateScheduleRow(row.id, "time", e.target.value)}
                              placeholder="18:30~21:00"
                              className="h-8 text-xs"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <Input
                              value={row.session}
                              onChange={(e) => handleUpdateScheduleRow(row.id, "session", e.target.value)}
                              placeholder="1"
                              className="h-8 text-xs"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <Input
                              value={row.unit}
                              onChange={(e) => handleUpdateScheduleRow(row.id, "unit", e.target.value)}
                              placeholder="단원명"
                              className="h-8 text-xs"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <Input
                              value={row.content}
                              onChange={(e) => handleUpdateScheduleRow(row.id, "content", e.target.value)}
                              placeholder="학습 내용"
                              className="h-8 text-xs"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <Input
                              value={row.note}
                              onChange={(e) => handleUpdateScheduleRow(row.id, "note", e.target.value)}
                              placeholder="비고"
                              className="h-8 text-xs"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleRemoveScheduleRow(row.id)}
                            >
                              <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <div className="h-px bg-border" />

              {/* 원격학습 계획 (접이식) */}
              <section ref={setSectionRef("section-remote")} className="space-y-3">
                <button
                  type="button"
                  className="flex items-center justify-between w-full text-left"
                  onClick={() => setRemoteOpen(!remoteOpen)}
                >
                  <h2 className="text-sm font-semibold text-foreground">원격학습 계획 (선택)</h2>
                  {remoteOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {remoteOpen && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">원격학습 방법</span>
                      <Input
                        value={remoteMethod}
                        onChange={(e) => setRemoteMethod(e.target.value)}
                        placeholder="ZOOM 실시간 쌍방향 수업"
                      />
                    </div>
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">유의사항</span>
                      <Input
                        value={remoteNotes}
                        onChange={(e) => setRemoteNotes(e.target.value)}
                        placeholder="유의사항"
                      />
                    </div>
                  </div>
                )}
              </section>

              {/* 하단 버튼 */}
              <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => setIsPreviewOpen(true)}>
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
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      AI 전부 생성 중...
                    </>
                  ) : "AI 전부 생성"}
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
        <DialogContent className="max-w-3xl p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>강의계획서 미리보기</DialogTitle>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto bg-muted/40 p-6">
            <div className="bg-white p-8 shadow rounded space-y-6">
              <div className="text-center border-b-2 border-black pb-4">
                <h1 className="text-xl font-bold">{semester || "(학기)"} {institution || "(기관)"}</h1>
                <h2 className="text-lg font-semibold mt-2">({courseName || "과목명"}) 강의 계획서</h2>
              </div>

              <div>
                <h3 className="font-medium mb-2">과목 설명 및 특성</h3>
                <p className="text-sm whitespace-pre-wrap bg-slate-50 p-3 rounded border">
                  {courseDescription || "(과목 설명 미입력)"}
                </p>
              </div>

              <table className="w-full text-sm border-collapse border border-slate-300">
                <tbody>
                  <tr>
                    <td className="border border-slate-300 bg-slate-50 px-3 py-2 font-medium w-28">담당 교사</td>
                    <td className="border border-slate-300 px-3 py-2">
                      {instructorName || "-"} ({instructorType === "teacher" ? "교사" : instructorType === "instructor" ? "강사" : "-"})
                      {instructorAffiliation && ` / ${instructorAffiliation}`}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 bg-slate-50 px-3 py-2 font-medium">학점(시간)</td>
                    <td className="border border-slate-300 px-3 py-2">
                      {CREDITS_OPTIONS.find(c => c.value === credits)?.label || credits || "-"}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 bg-slate-50 px-3 py-2 font-medium">수업 시간</td>
                    <td className="border border-slate-300 px-3 py-2">{schedule || "-"}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 bg-slate-50 px-3 py-2 font-medium">대상 학년</td>
                    <td className="border border-slate-300 px-3 py-2">{targetGrade || "-"}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 bg-slate-50 px-3 py-2 font-medium">수업 유형</td>
                    <td className="border border-slate-300 px-3 py-2">{classTypes.join(", ") || "-"}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 bg-slate-50 px-3 py-2 font-medium">평가 방법</td>
                    <td className="border border-slate-300 px-3 py-2">
                      {EVAL_METHODS.find(m => m.value === evalMethod)?.label || evalMethod || "-"}
                    </td>
                  </tr>
                </tbody>
              </table>

              {scheduleRows.length > 0 && scheduleRows.some(r => r.content) && (
                <div>
                  <h3 className="font-medium mb-2">주차별 강의 계획</h3>
                  <table className="w-full text-xs border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="border border-slate-300 px-2 py-1">날짜</th>
                        <th className="border border-slate-300 px-2 py-1">요일</th>
                        <th className="border border-slate-300 px-2 py-1">시간</th>
                        <th className="border border-slate-300 px-2 py-1">차시</th>
                        <th className="border border-slate-300 px-2 py-1">단원</th>
                        <th className="border border-slate-300 px-2 py-1">학습내용</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduleRows.filter(r => r.content).map((row) => (
                        <tr key={row.id}>
                          <td className="border border-slate-300 px-2 py-1">{row.date}</td>
                          <td className="border border-slate-300 px-2 py-1">{row.day}</td>
                          <td className="border border-slate-300 px-2 py-1">{row.time}</td>
                          <td className="border border-slate-300 px-2 py-1">{row.session}</td>
                          <td className="border border-slate-300 px-2 py-1">{row.unit}</td>
                          <td className="border border-slate-300 px-2 py-1">{row.content}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="text-center text-sm text-muted-foreground mt-8">
                (상세 미리보기는 PDF 다운로드 시 제공됩니다)
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
