import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { AIGenerateButton } from "@/components/AIGenerateButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { HwpReferenceUpload } from "@/components/HwpReferenceUpload";

const DAYS = ["월", "화", "수", "목", "금"] as const;
const GRADES = [1, 2, 3, 4, 5, 6] as const;
const CARE_TYPES = ["오후돌봄", "저녁돌봄", "방학돌봄", "아침돌봄"] as const;
const PURPOSES = ["방과후 돌봄 공백 해소", "맞벌이 가정 지원", "저소득층 아동 보호", "안전한 돌봄 환경 제공"] as const;
const POLICIES = ["무상 돌봄 운영", "수요자 중심 운영", "안전 최우선 운영"] as const;

type Day = (typeof DAYS)[number];

interface ProgramInfo {
  name: string;
  days: Day[];
  startTime: string;
  endTime: string;
  targetGrades: number[];
  capacity: string;
  instructorType: string;
  content: string;
}

const emptyProgram: ProgramInfo = {
  name: "",
  days: [],
  startTime: "",
  endTime: "",
  targetGrades: [],
  capacity: "",
  instructorType: "",
  content: "",
};

const currentYear = new Date().getFullYear();

export default function CarePlanForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [highlightedField, setHighlightedField] = useState<string | null>(null);
  const initialBasicInfo = {
    schoolName: "",
    year: `${currentYear}`,
    semester: "1학기",
    careTypes: [] as string[],
    targetGrades: [] as number[],
  };
  const initialObjectives = {
    purposes: [] as string[],
    policies: [] as string[],
    additionalGoals: "",
  };
  const initialAttendanceMethods: string[] = [];
  const initialPickupMethod = "";
  const initialAbsenceProcedure = "";
  const initialEmergencyContactSystem = "";
  const initialStartDate = "";
  const initialEndDate = "";
  const initialSafetyEducationTiming = "";
  const initialSafetyEducationContent = "";
  const initialSnackProvided = "제공";
  const initialSnackMethod = "학교 직접 제공";
  const initialAllergyManagementPlan = "";
  const initialCareStaffCount = "";
  const initialTotalCapacity = "";
  const initialClassroomCount = "";
  const initialStaffAllocationCriteria = "";

  const [basicInfo, setBasicInfo] = useState(initialBasicInfo);
  const [objectives, setObjectives] = useState(initialObjectives);
  const [programs, setPrograms] = useState<ProgramInfo[]>([]);
  const [attendanceMethods, setAttendanceMethods] = useState<string[]>(initialAttendanceMethods);
  const [pickupMethod, setPickupMethod] = useState(initialPickupMethod);
  const [absenceProcedure, setAbsenceProcedure] = useState(initialAbsenceProcedure);
  const [emergencyContactSystem, setEmergencyContactSystem] = useState(initialEmergencyContactSystem);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [safetyEducationTiming, setSafetyEducationTiming] = useState(initialSafetyEducationTiming);
  const [safetyEducationContent, setSafetyEducationContent] = useState(initialSafetyEducationContent);
  const [snackProvided, setSnackProvided] = useState(initialSnackProvided);
  const [snackMethod, setSnackMethod] = useState(initialSnackMethod);
  const [allergyManagementPlan, setAllergyManagementPlan] = useState(initialAllergyManagementPlan);
  const [careStaffCount, setCareStaffCount] = useState(initialCareStaffCount);
  const [totalCapacity, setTotalCapacity] = useState(initialTotalCapacity);
  const [classroomCount, setClassroomCount] = useState(initialClassroomCount);
  const [staffAllocationCriteria, setStaffAllocationCriteria] = useState(initialStaffAllocationCriteria);
  const [referenceFileId, setReferenceFileId] = useState<number | null>(null);
  const draftStorageKey = "carePlanDraft";

  const documentTitle = basicInfo.year && basicInfo.semester
    ? `${basicInfo.year}학년도 ${basicInfo.semester} 초등돌봄교실 운영계획서`
    : "초등돌봄교실 운영계획서";

  const buildInputs = () => {
    const basicInfoText = [
      `학교명: ${basicInfo.schoolName || "(미입력)"}`,
      `학년도: ${basicInfo.year || "(미입력)"}`,
      `학기: ${basicInfo.semester || "(미입력)"}`,
      `돌봄교실 유형: ${basicInfo.careTypes.length ? basicInfo.careTypes.join(", ") : "(미입력)"}`,
      `대상 학년: ${basicInfo.targetGrades.length ? formatGrades(basicInfo.targetGrades) : "(미입력)"}`,
      `운영 기간: ${startDate || "(미입력)"} ~ ${endDate || "(미입력)"}`,
    ]
      .filter(Boolean)
      .join("\n");

    const objectivesText = [
      `운영 목적: ${objectives.purposes.length ? objectives.purposes.join(", ") : "(미입력)"}`,
      `운영 방침: ${objectives.policies.length ? objectives.policies.join(", ") : "(미입력)"}`,
      objectives.additionalGoals ? `추가 목표/방침: ${objectives.additionalGoals}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const programsText = programs.length
      ? programs
          .map((program, index) => {
            return [
              `${index + 1}. ${program.name || "(미입력)"}`,
              `- 운영 요일/시간: ${formatDays(program.days)} ${formatTimeRange(program.startTime, program.endTime)}`.trim(),
              `- 대상 학년: ${formatGrades(program.targetGrades)}`,
              `- 정원: ${program.capacity || "(미입력)"}명`,
              `- 강사 유형: ${program.instructorType || "(미입력)"}`,
              program.content ? `- 프로그램 내용: ${program.content}` : "",
            ]
              .filter(Boolean)
              .join("\n");
          })
          .join("\n\n")
      : "(프로그램 미등록)";

    const recruitmentText = [
      `출결 확인 방법: ${attendanceMethods.length ? attendanceMethods.join(", ") : "(미입력)"}`,
      `결석 처리 절차: ${absenceProcedure || "(미입력)"}`,
      `하원 방법: ${pickupMethod || "(미입력)"}`,
      `긴급 연락망 구축 방법: ${emergencyContactSystem || "(미입력)"}`,
    ]
      .filter(Boolean)
      .join("\n");

    const safetyText = [
      `안전교육 실시 시기: ${safetyEducationTiming || "(미입력)"}`,
      `안전교육 내용: ${safetyEducationContent || "(미입력)"}`,
      `간식 제공 여부: ${snackProvided || "(미입력)"}`,
      `간식 제공 방식: ${snackMethod || "(미입력)"}`,
      `알레르기 관리 방안: ${allergyManagementPlan || "(미입력)"}`,
    ]
      .filter(Boolean)
      .join("\n");

    const staffingText = [
      `돌봄전담사 수: ${careStaffCount || "(미입력)"}`,
      `총 정원: ${totalCapacity || "(미입력)"}`,
      `교실 수: ${classroomCount || "(미입력)"}`,
      `인력 배치 기준: ${staffAllocationCriteria || "(미입력)"}`,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      title: documentTitle,
      basicInfo: basicInfoText,
      objectives: objectivesText,
      programs: programsText,
      recruitment: recruitmentText,
      safety: safetyText,
      staffing: staffingText,
    };
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/documents/generate", {
        documentType: "초등돌봄교실 운영계획서",
        inputs: buildInputs(),
        uploadedTemplateId: referenceFileId ?? undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "문서 생성 완료",
        description: "초등돌봄교실 운영계획서가 생성되었습니다.",
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

  const buildDocumentContent = () => {
    const inputs = buildInputs();
    const { title: _title, ...sections } = inputs;
    const labels: Record<string, string> = {
      basicInfo: "기본 정보",
      objectives: "운영 목표 및 방침",
      programs: "프로그램 운영 계획",
      recruitment: "학생 모집 및 관리",
      safety: "안전 및 급식 관리",
      staffing: "예산 및 인력 운영",
    };
    return Object.entries(sections)
      .map(([key, value]) => `[${labels[key] ?? key}]\n${value}`)
      .join("\n\n");
  };

  const saveMutation = useMutation({
    mutationFn: async (status: "draft" | "completed") => {
      const response = await apiRequest("POST", "/api/documents", {
        documentType: "초등돌봄교실 운영계획서",
        title: documentTitle,
        schoolName: basicInfo.schoolName,
        metadata: {
          semester: basicInfo.semester,
          targetGrade: basicInfo.targetGrades.join(", "),
          capacity: totalCapacity,
        },
        content: buildDocumentContent(),
        referenceFileId,
        status,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "문서 저장 완료",
        description: "문서가 내역에 저장되었습니다.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "문서 저장 실패",
        description: error.message || "문서 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const getSafeStorage = () => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  };

  const flashHighlight = (fieldKey: string) => {
    setHighlightedField(fieldKey);
    setTimeout(() => {
      setHighlightedField((current) => (current === fieldKey ? null : current));
    }, 1000);
  };

  const formatGrades = (grades: number[]) => {
    if (!grades.length) return "초등 1-2학년 중심";
    return grades.map((grade) => `${grade}학년`).join(", ");
  };

  const formatDays = (days: Day[]) => {
    return days.length ? days.join(", ") : "주 5회";
  };

  const formatTimeRange = (start: string, end: string) => {
    if (!start || !end) return "";
    return `${start}~${end}`;
  };

  const stepItems = [
    { id: "section-basic", label: "1. 기본 정보" },
    { id: "section-objectives", label: "2. 운영 목표 및 방침" },
    { id: "section-programs", label: "4. 프로그램 운영 계획" },
    { id: "section-recruitment", label: "5. 학생 모집 및 관리" },
    { id: "section-safety", label: "6. 안전 및 급식 관리" },
    { id: "section-staffing", label: "7. 예산 및 인력 운영" },
  ];

  const scrollToSection = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const updateProgram = (index: number, updates: Partial<ProgramInfo>) => {
    setPrograms((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...updates } : item)));
  };

  const addProgram = () => {
    setPrograms((prev) => [...prev, { ...emptyProgram }]);
  };

  const removeProgram = (index: number) => {
    setPrograms((prev) => prev.filter((_, idx) => idx !== index));
  };

  const buildDraftPayload = () => ({
    basicInfo,
    objectives,
    programs,
    attendanceMethods,
    pickupMethod,
    absenceProcedure,
    emergencyContactSystem,
    startDate,
    endDate,
    safetyEducationTiming,
    safetyEducationContent,
    snackProvided,
    snackMethod,
    allergyManagementPlan,
    careStaffCount,
    totalCapacity,
    classroomCount,
    staffAllocationCriteria,
    savedAt: new Date().toISOString(),
  });

  const toArray = <T,>(value: unknown, fallback: T[] = []) => (Array.isArray(value) ? (value as T[]) : fallback);

  const restoreDraft = (payload: ReturnType<typeof buildDraftPayload>) => {
    if (!payload || typeof payload !== "object") return;
    const nextBasicInfo = payload.basicInfo ?? initialBasicInfo;
    const nextObjectives = payload.objectives ?? initialObjectives;

    setBasicInfo({
      schoolName: typeof nextBasicInfo.schoolName === "string" ? nextBasicInfo.schoolName : initialBasicInfo.schoolName,
      year: typeof nextBasicInfo.year === "string" ? nextBasicInfo.year : initialBasicInfo.year,
      semester: typeof nextBasicInfo.semester === "string" ? nextBasicInfo.semester : initialBasicInfo.semester,
      careTypes: toArray<string>(nextBasicInfo.careTypes, initialBasicInfo.careTypes),
      targetGrades: toArray<number>(nextBasicInfo.targetGrades, initialBasicInfo.targetGrades),
    });

    setObjectives({
      purposes: toArray<string>(nextObjectives.purposes, initialObjectives.purposes),
      policies: toArray<string>(nextObjectives.policies, initialObjectives.policies),
      additionalGoals: typeof nextObjectives.additionalGoals === "string" ? nextObjectives.additionalGoals : initialObjectives.additionalGoals,
    });

    setPrograms(Array.isArray(payload.programs) ? payload.programs : []);
    setAttendanceMethods(toArray<string>(payload.attendanceMethods, initialAttendanceMethods));
    setPickupMethod(typeof payload.pickupMethod === "string" ? payload.pickupMethod : initialPickupMethod);
    setAbsenceProcedure(typeof payload.absenceProcedure === "string" ? payload.absenceProcedure : initialAbsenceProcedure);
    setEmergencyContactSystem(
      typeof payload.emergencyContactSystem === "string" ? payload.emergencyContactSystem : initialEmergencyContactSystem
    );
    setStartDate(typeof payload.startDate === "string" ? payload.startDate : initialStartDate);
    setEndDate(typeof payload.endDate === "string" ? payload.endDate : initialEndDate);
    setSafetyEducationTiming(
      typeof payload.safetyEducationTiming === "string" ? payload.safetyEducationTiming : initialSafetyEducationTiming
    );
    setSafetyEducationContent(
      typeof payload.safetyEducationContent === "string" ? payload.safetyEducationContent : initialSafetyEducationContent
    );
    setSnackProvided(typeof payload.snackProvided === "string" ? payload.snackProvided : initialSnackProvided);
    setSnackMethod(typeof payload.snackMethod === "string" ? payload.snackMethod : initialSnackMethod);
    setAllergyManagementPlan(
      typeof payload.allergyManagementPlan === "string" ? payload.allergyManagementPlan : initialAllergyManagementPlan
    );
    setCareStaffCount(typeof payload.careStaffCount === "string" ? payload.careStaffCount : initialCareStaffCount);
    setTotalCapacity(typeof payload.totalCapacity === "string" ? payload.totalCapacity : initialTotalCapacity);
    setClassroomCount(typeof payload.classroomCount === "string" ? payload.classroomCount : initialClassroomCount);
    setStaffAllocationCriteria(
      typeof payload.staffAllocationCriteria === "string"
        ? payload.staffAllocationCriteria
        : initialStaffAllocationCriteria
    );
  };

  const handleSaveDraft = () => {
    try {
      const storage = getSafeStorage();
      if (!storage) {
        throw new Error("localStorage unavailable");
      }
      const payload = buildDraftPayload();
      storage.setItem(draftStorageKey, JSON.stringify(payload));
      toast({
        title: "임시 저장 완료",
        description: "작성 중인 내용이 브라우저에 저장되었습니다.",
      });
    } catch {
      toast({
        title: "임시 저장 실패",
        description: "브라우저 저장 공간을 확인해주세요.",
        variant: "destructive",
      });
    }
  };

  const handleLoadDraft = () => {
    try {
      const storage = getSafeStorage();
      if (!storage) {
        throw new Error("localStorage unavailable");
      }
      const raw = storage.getItem(draftStorageKey);
      if (!raw) {
        toast({
          title: "임시 저장 없음",
          description: "불러올 임시 저장 내용이 없습니다.",
        });
        return;
      }
      const payload = JSON.parse(raw) as ReturnType<typeof buildDraftPayload>;
      restoreDraft(payload);
      toast({
        title: "임시 저장 불러옴",
        description: "저장된 내용을 복원했습니다.",
      });
    } catch {
      toast({
        title: "불러오기 실패",
        description: "저장된 데이터를 읽을 수 없습니다.",
        variant: "destructive",
      });
    }
  };

  const handleClearDraft = () => {
    const storage = getSafeStorage();
    if (storage) {
      storage.removeItem(draftStorageKey);
    }
    toast({
      title: "임시 저장 삭제",
      description: "브라우저에 저장된 임시 데이터가 삭제되었습니다.",
    });
  };

  useEffect(() => {
    const storage = getSafeStorage();
    if (!storage) return;
    const raw = storage.getItem(draftStorageKey);
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as ReturnType<typeof buildDraftPayload>;
      restoreDraft(payload);
      toast({
        title: "임시 저장 복원",
        description: "이전에 저장한 내용을 자동으로 불러왔습니다.",
      });
    } catch {
      storage.removeItem(draftStorageKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              홈으로
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">초등돌봄교실 운영계획서</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="w-full lg:w-64 shrink-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">단계 이동</CardTitle>
                <CardDescription>단계를 선택하면 해당 위치로 이동합니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {stepItems.map((item) => (
                  <Button
                    key={item.id}
                    type="button"
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => scrollToSection(item.id)}
                  >
                    {item.label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </aside>
          <div className="flex-1 space-y-6">
        <Card id="section-basic">
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">학교명</label>
                <Input
                  value={basicInfo.schoolName}
                  onChange={(event) => setBasicInfo({ ...basicInfo, schoolName: event.target.value })}
                  placeholder="예: 부산사랑초등학교"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">학년도</label>
                <Input
                  value={basicInfo.year}
                  onChange={(event) => setBasicInfo({ ...basicInfo, year: event.target.value })}
                  placeholder="예: 2025"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">학기</label>
                <Input
                  value={basicInfo.semester}
                  onChange={(event) => setBasicInfo({ ...basicInfo, semester: event.target.value })}
                  placeholder="예: 1학기"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">돌봄교실 유형</label>
              <div className="flex flex-wrap gap-4">
                {CARE_TYPES.map((type) => (
                  <label key={type} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={basicInfo.careTypes.includes(type)}
                      onCheckedChange={(checked) => {
                        const next = checked
                          ? [...basicInfo.careTypes, type]
                          : basicInfo.careTypes.filter((item) => item !== type);
                        setBasicInfo({ ...basicInfo, careTypes: next });
                      }}
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">대상 학년</label>
              <div className="flex flex-wrap gap-4">
                {GRADES.map((grade) => (
                  <label key={grade} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={basicInfo.targetGrades.includes(grade)}
                      onCheckedChange={(checked) => {
                        const next = checked
                          ? [...basicInfo.targetGrades, grade]
                          : basicInfo.targetGrades.filter((item) => item !== grade);
                        setBasicInfo({ ...basicInfo, targetGrades: next });
                      }}
                    />
                    {grade}학년
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card id="section-objectives">
          <CardHeader>
            <CardTitle>Step 2. 운영 목표 및 방침</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">운영 목적</label>
              <div className="grid md:grid-cols-2 gap-3">
                {PURPOSES.map((purpose) => (
                  <label key={purpose} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={objectives.purposes.includes(purpose)}
                      onCheckedChange={(checked) => {
                        const next = checked
                          ? [...objectives.purposes, purpose]
                          : objectives.purposes.filter((item) => item !== purpose);
                        setObjectives({ ...objectives, purposes: next });
                      }}
                    />
                    {purpose}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">운영 방침</label>
              <div className="grid md:grid-cols-2 gap-3">
                {POLICIES.map((policy) => (
                  <label key={policy} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={objectives.policies.includes(policy)}
                      onCheckedChange={(checked) => {
                        const next = checked
                          ? [...objectives.policies, policy]
                          : objectives.policies.filter((item) => item !== policy);
                        setObjectives({ ...objectives, policies: next });
                      }}
                    />
                    {policy}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2 form-group-with-ai">
              <label className="text-sm font-medium">추가 목표/방침 (선택)</label>
              <AIGenerateButton
                fieldName="additionalGoals"
                documentType="care"
                context={{
                  schoolName: basicInfo.schoolName,
                  year: basicInfo.year,
                  semester: basicInfo.semester,
                  careTypes: basicInfo.careTypes,
                  purposes: objectives.purposes,
                  policies: objectives.policies,
                }}
                onGenerated={(text) => {
                  setObjectives({ ...objectives, additionalGoals: text });
                  flashHighlight("additionalGoals");
                }}
              />
              <Textarea
                value={objectives.additionalGoals}
                onChange={(event) => setObjectives({ ...objectives, additionalGoals: event.target.value })}
                placeholder="예: 학생들의 창의성과 사회성을 함양하고, 학부모의 양육 부담을 경감합니다."
                rows={4}
                maxLength={500}
                className={highlightedField === "additionalGoals" ? "ai-success-highlight" : ""}
              />
              <div className="text-right text-xs text-muted-foreground">
                {objectives.additionalGoals.length} / 500자
              </div>
            </div>
          </CardContent>
        </Card>

        <Card id="section-programs">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Step 4. 프로그램 운영 계획</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addProgram}>
              <Plus className="w-4 h-4 mr-1" />
              프로그램 추가
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {programs.length === 0 ? (
              <div className="text-sm text-muted-foreground">추가된 프로그램이 없습니다.</div>
            ) : (
              programs.map((program, index) => (
                <Card key={`${program.name}-${index}`} className="border border-muted">
                  <CardHeader className="flex flex-row items-center justify-between py-4">
                    <CardTitle className="text-base">프로그램 {index + 1}</CardTitle>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeProgram(index)}>
                      <Trash2 className="w-4 h-4 mr-1" />
                      삭제
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">프로그램명</label>
                        <Input
                          value={program.name}
                          onChange={(event) => updateProgram(index, { name: event.target.value })}
                          placeholder="예: 책놀이"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">정원</label>
                        <Input
                          value={program.capacity}
                          onChange={(event) => updateProgram(index, { capacity: event.target.value })}
                          placeholder="예: 15"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">운영 요일</label>
                      <div className="flex flex-wrap gap-4">
                        {DAYS.map((day) => (
                          <label key={day} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={program.days.includes(day)}
                              onCheckedChange={(checked) => {
                                const next = checked
                                  ? [...program.days, day]
                                  : program.days.filter((item) => item !== day);
                                updateProgram(index, { days: next });
                              }}
                            />
                            {day}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">운영 시작 시간</label>
                        <Input
                          value={program.startTime}
                          onChange={(event) => updateProgram(index, { startTime: event.target.value })}
                          placeholder="예: 15:00"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">운영 종료 시간</label>
                        <Input
                          value={program.endTime}
                          onChange={(event) => updateProgram(index, { endTime: event.target.value })}
                          placeholder="예: 16:00"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">대상 학년</label>
                      <div className="flex flex-wrap gap-4">
                        {GRADES.map((grade) => (
                          <label key={grade} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={program.targetGrades.includes(grade)}
                              onCheckedChange={(checked) => {
                                const next = checked
                                  ? [...program.targetGrades, grade]
                                  : program.targetGrades.filter((item) => item !== grade);
                                updateProgram(index, { targetGrades: next });
                              }}
                            />
                            {grade}학년
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">강사 유형</label>
                      <RadioGroup
                        value={program.instructorType}
                        onValueChange={(value) => updateProgram(index, { instructorType: value })}
                        className="flex flex-wrap gap-4"
                      >
                        {["돌봄전담사", "외부강사", "자원봉사자"].map((type) => (
                          <label key={type} className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value={type} />
                            {type}
                          </label>
                        ))}
                      </RadioGroup>
                    </div>

                    <div className="space-y-2 form-group-with-ai">
                      <label className="text-sm font-medium">프로그램 내용</label>
                      <AIGenerateButton
                        fieldName="programContent"
                        documentType="care"
                        context={{
                          programName: program.name,
                          operatingDays: formatDays(program.days),
                          operatingTime: formatTimeRange(program.startTime, program.endTime),
                          targetGrades: formatGrades(program.targetGrades),
                          capacity: program.capacity,
                          instructorType: program.instructorType,
                        }}
                        onGenerated={(text) => {
                          updateProgram(index, { content: text });
                          flashHighlight(`programContent-${index}`);
                        }}
                      />
                      <Textarea
                        value={program.content}
                        onChange={(event) => updateProgram(index, { content: event.target.value })}
                        placeholder="프로그램의 활동 내용과 교육적 효과를 설명하세요."
                        rows={3}
                        className={highlightedField === `programContent-${index}` ? "ai-success-highlight" : ""}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        <Card id="section-recruitment">
          <CardHeader>
            <CardTitle>Step 5. 학생 모집 및 관리</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">출결 확인 방법</label>
              <div className="flex flex-wrap gap-4">
                {["전자 출결 시스템", "돌봄전담사 수기 기록", "학부모 문자 확인"].map((method) => (
                  <label key={method} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={attendanceMethods.includes(method)}
                      onCheckedChange={(checked) => {
                        const next = checked
                          ? [...attendanceMethods, method]
                          : attendanceMethods.filter((item) => item !== method);
                        setAttendanceMethods(next);
                      }}
                    />
                    {method}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2 form-group-with-ai">
              <label className="text-sm font-medium">결석 처리 절차</label>
              <AIGenerateButton
                fieldName="absenceProcedure"
                documentType="care"
                context={{ attendanceMethods }}
                onGenerated={(text) => {
                  setAbsenceProcedure(text);
                  flashHighlight("absenceProcedure");
                }}
              />
              <Textarea
                value={absenceProcedure}
                onChange={(event) => setAbsenceProcedure(event.target.value)}
                placeholder="예: 학부모 사전 연락 → 출결 기록 → 무단 결석 시 담임교사 통보"
                rows={3}
                className={highlightedField === "absenceProcedure" ? "ai-success-highlight" : ""}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">하원 방법</label>
              <RadioGroup value={pickupMethod} onValueChange={setPickupMethod} className="flex flex-wrap gap-4">
                {["학부모 직접 인계", "동의서 기반 자율 하원", "안전귀가 지도"].map((method) => (
                  <label key={method} className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value={method} />
                    {method}
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2 form-group-with-ai">
              <label className="text-sm font-medium">긴급 연락망 구축 방법</label>
              <AIGenerateButton
                fieldName="emergencyContactSystem"
                documentType="care"
                context={{ pickupMethod }}
                onGenerated={(text) => {
                  setEmergencyContactSystem(text);
                  flashHighlight("emergencyContactSystem");
                }}
              />
              <Textarea
                value={emergencyContactSystem}
                onChange={(event) => setEmergencyContactSystem(event.target.value)}
                placeholder="예: 학부모 연락처, 비상연락처, 담임교사 연락처 등록"
                rows={3}
                className={highlightedField === "emergencyContactSystem" ? "ai-success-highlight" : ""}
              />
            </div>
          </CardContent>
        </Card>

        <Card id="section-safety">
          <CardHeader>
            <CardTitle>Step 6. 안전 및 급식 관리</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">운영 시작일</label>
                <Input value={startDate} onChange={(event) => setStartDate(event.target.value)} placeholder="예: 2025-03-04" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">운영 종료일</label>
                <Input value={endDate} onChange={(event) => setEndDate(event.target.value)} placeholder="예: 2025-12-24" />
              </div>
            </div>

            <div className="space-y-2 form-group-with-ai">
              <label className="text-sm font-medium">안전교육 실시 시기</label>
              <AIGenerateButton
                fieldName="safetyEducationTiming"
                documentType="care"
                context={{ startDate, endDate }}
                onGenerated={(text) => {
                  setSafetyEducationTiming(text);
                  flashHighlight("safetyEducationTiming");
                }}
              />
              <Textarea
                value={safetyEducationTiming}
                onChange={(event) => setSafetyEducationTiming(event.target.value)}
                placeholder="예: 학기 초, 월 1회"
                rows={3}
                className={highlightedField === "safetyEducationTiming" ? "ai-success-highlight" : ""}
              />
            </div>

            <div className="space-y-2 form-group-with-ai">
              <label className="text-sm font-medium">안전교육 내용</label>
              <AIGenerateButton
                fieldName="safetyEducationContent"
                documentType="care"
                context={{
                  schoolName: basicInfo.schoolName,
                  targetGrades: formatGrades(basicInfo.targetGrades),
                }}
                onGenerated={(text) => {
                  setSafetyEducationContent(text);
                  flashHighlight("safetyEducationContent");
                }}
              />
              <Textarea
                value={safetyEducationContent}
                onChange={(event) => setSafetyEducationContent(event.target.value)}
                placeholder="예: 화재/지진 대피 교육, 성폭력 예방 교육, 교통안전 교육"
                rows={4}
                className={highlightedField === "safetyEducationContent" ? "ai-success-highlight" : ""}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">간식 제공 여부</label>
              <RadioGroup value={snackProvided} onValueChange={setSnackProvided} className="flex flex-wrap gap-4">
                {["제공", "미제공"].map((value) => (
                  <label key={value} className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value={value} />
                    {value}
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">간식 제공 방식</label>
              <RadioGroup value={snackMethod} onValueChange={setSnackMethod} className="flex flex-wrap gap-4">
                {["학교 직접 제공", "외부 업체 위탁"].map((value) => (
                  <label key={value} className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value={value} />
                    {value}
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2 form-group-with-ai">
              <label className="text-sm font-medium">알레르기 관리 방안</label>
              <AIGenerateButton
                fieldName="allergyManagementPlan"
                documentType="care"
                context={{ snackProvided, snackMethod }}
                onGenerated={(text) => {
                  setAllergyManagementPlan(text);
                  flashHighlight("allergyManagementPlan");
                }}
              />
              <Textarea
                value={allergyManagementPlan}
                onChange={(event) => setAllergyManagementPlan(event.target.value)}
                placeholder="예: 사전 조사, 대체 식품 제공"
                rows={3}
                className={highlightedField === "allergyManagementPlan" ? "ai-success-highlight" : ""}
              />
            </div>
          </CardContent>
        </Card>

        <Card id="section-staffing">
          <CardHeader>
            <CardTitle>Step 7. 예산 및 인력 운영</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">돌봄전담사 수</label>
                <Input value={careStaffCount} onChange={(event) => setCareStaffCount(event.target.value)} placeholder="예: 3" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">총 정원</label>
                <Input value={totalCapacity} onChange={(event) => setTotalCapacity(event.target.value)} placeholder="예: 35" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">교실 수</label>
                <Input value={classroomCount} onChange={(event) => setClassroomCount(event.target.value)} placeholder="예: 2" />
              </div>
            </div>

            <div className="space-y-2 form-group-with-ai">
              <label className="text-sm font-medium">인력 배치 기준</label>
              <AIGenerateButton
                fieldName="staffAllocationCriteria"
                documentType="care"
                context={{ careStaffCount, totalCapacity, classroomCount }}
                onGenerated={(text) => {
                  setStaffAllocationCriteria(text);
                  flashHighlight("staffAllocationCriteria");
                }}
              />
              <Textarea
                value={staffAllocationCriteria}
                onChange={(event) => setStaffAllocationCriteria(event.target.value)}
                placeholder="예: 학생 15명당 돌봄전담사 1명"
                rows={3}
                className={highlightedField === "staffAllocationCriteria" ? "ai-success-highlight" : ""}
              />
            </div>
          </CardContent>
        </Card>

        <HwpReferenceUpload
          onUploaded={(fileId) => setReferenceFileId(fileId)}
          onClear={() => setReferenceFileId(null)}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handleSaveDraft}>
              임시 저장
            </Button>
            <Button type="button" variant="outline" onClick={handleLoadDraft}>
              임시 저장 불러오기
            </Button>
            <Button type="button" variant="ghost" onClick={handleClearDraft}>
              임시 저장 삭제
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => saveMutation.mutate("draft")}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "저장 중..." : "임시 저장"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => saveMutation.mutate("completed")}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "저장 중..." : "문서 저장"}
            </Button>
            <Button
              type="button"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                "운영계획서 생성하기"
              )}
            </Button>
          </div>
        </div>
          </div>
        </div>
      </main>
    </div>
  );
}
