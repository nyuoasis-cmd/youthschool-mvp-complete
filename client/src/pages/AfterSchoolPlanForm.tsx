import { useMemo, useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { ArrowLeft, Plus, Trash2, Pencil, Loader2, Eye, Sparkles } from "lucide-react";
import { AIGenerateButton } from "@/components/AIGenerateButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { HwpReferenceUpload } from "@/components/HwpReferenceUpload";

const DAYS = ["월", "화", "수", "목", "금"] as const;
const TERMS = ["1학기", "2학기", "연중"] as const;
const PROGRAM_GRADES = [1, 2, 3, 4, 5, 6] as const;

type Day = (typeof DAYS)[number];
type Term = (typeof TERMS)[number];

interface BasicInfo {
  schoolName: string;
  schoolYear: string;
  term: Term | "";
  periodStart: string;
  periodEnd: string;
  operationDays: Day[];
  sessionHours: string;
  sessionMinutes: string;
  department: string;
  manager: string;
  contact: string;
}

interface ObjectivesInfo {
  mainPurpose: string;
  customPurpose: string;
  additionalPurpose: string;
  policies: string[];
  customPolicy: string;
}

interface ProgramInfo {
  name: string;
  grades: number[];
  capacity: string;
  days: Day[];
  startTime: string;
  endTime: string;
  location: string;
  weeks: string;
  sessionsPerWeek: string;
  instructorType: "내부강사" | "외부강사" | "";
  instructorName: string;
  fee: string;
  materialFeeType: "없음" | "있음" | "";
  materialFeeAmount: string;
  notes: string;
}

interface RecruitmentInfo {
  recruitmentMethod: string;
  paymentMethods: string[];
  paymentOther: string;
  refundPolicyType: "교육청 기준" | "학교 자체 규정" | "";
  refundBeforeStart: string;
  refundBeforeThird: string;
  refundBeforeHalf: string;
  refundException: string;
}

interface SafetyInfo {
  attendanceMethods: string[];
  attendanceOther: string;
  returnMethod: string;
  safetyTraining: "예" | "아니오" | "";
  safetyTrainingTime: string;
  safetyTrainingContent: string;
  incidentResponses: string[];
  incidentOther: string;
}

const emptyProgram: ProgramInfo = {
  name: "",
  grades: [],
  capacity: "",
  days: [],
  startTime: "",
  endTime: "",
  location: "",
  weeks: "",
  sessionsPerWeek: "",
  instructorType: "",
  instructorName: "",
  fee: "",
  materialFeeType: "",
  materialFeeAmount: "",
  notes: "",
};

const currentYear = new Date().getFullYear();
const schoolYearOptions = Array.from({ length: 5 }, (_, idx) => `${currentYear - 2 + idx}`);

export default function AfterSchoolPlanForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [basicInfo, setBasicInfo] = useState<BasicInfo>({
    schoolName: "",
    schoolYear: `${currentYear}`,
    term: "",
    periodStart: "",
    periodEnd: "",
    operationDays: [],
    sessionHours: "",
    sessionMinutes: "",
    department: "",
    manager: "",
    contact: "",
  });
  const [objectives, setObjectives] = useState<ObjectivesInfo>({
    mainPurpose: "",
    customPurpose: "",
    additionalPurpose: "",
    policies: [],
    customPolicy: "",
  });
  const [programs, setPrograms] = useState<ProgramInfo[]>([]);
  const [programDraft, setProgramDraft] = useState<ProgramInfo>(emptyProgram);
  const [programErrors, setProgramErrors] = useState<Record<string, string>>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [recruitment, setRecruitment] = useState<RecruitmentInfo>({
    recruitmentMethod: "",
    paymentMethods: [],
    paymentOther: "",
    refundPolicyType: "",
    refundBeforeStart: "100",
    refundBeforeThird: "67",
    refundBeforeHalf: "50",
    refundException: "",
  });
  const [safety, setSafety] = useState<SafetyInfo>({
    attendanceMethods: [],
    attendanceOther: "",
    returnMethod: "",
    safetyTraining: "",
    safetyTrainingTime: "",
    safetyTrainingContent: "",
    incidentResponses: [],
    incidentOther: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [referenceFileId, setReferenceFileId] = useState<number | null>(null);

  const steps = ["기본 정보", "운영 목표", "프로그램", "모집·수납", "안전관리", "확인"];
  const progressValue = ((step + 1) / steps.length) * 100;

  const documentTitle = useMemo(() => {
    if (!basicInfo.schoolYear || !basicInfo.term) {
      return "방과후학교 운영계획서";
    }
    const termLabel = basicInfo.term === "연중" ? "연중" : basicInfo.term;
    return `${basicInfo.schoolYear}학년도 ${termLabel} 방과후학교 운영계획`;
  }, [basicInfo.schoolYear, basicInfo.term]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/documents/generate", {
        documentType: "방과후학교 운영계획서",
        inputs: buildInputs(),
        uploadedTemplateId: referenceFileId ?? undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "문서 생성 완료",
        description: "방과후학교 운영계획서가 생성되었습니다.",
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

  const buildInputs = () => {
    const basicInfoText = [
      `학교명: ${basicInfo.schoolName || "(미입력)"}`,
      `학년도: ${basicInfo.schoolYear || "(미입력)"}`,
      `학기: ${basicInfo.term || "(미입력)"}`,
      `문서 제목: ${documentTitle}`,
      `운영 기간: ${basicInfo.periodStart || "(미입력)"} ~ ${basicInfo.periodEnd || "(미입력)"}`,
      `운영 요일: ${basicInfo.operationDays.length ? basicInfo.operationDays.join(", ") : "(미입력)"}`,
      `1회 운영시간: ${basicInfo.sessionHours || "0"}시간 ${basicInfo.sessionMinutes || "0"}분`,
      basicInfo.department ? `담당 부서: ${basicInfo.department}` : "",
      basicInfo.manager ? `담당자: ${basicInfo.manager}` : "",
      basicInfo.contact ? `문의처: ${basicInfo.contact}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const objectivesText = [
      `운영 목적: ${objectives.mainPurpose === "직접 입력" ? objectives.customPurpose : objectives.mainPurpose || "(미입력)"}`,
      objectives.additionalPurpose ? `추가 목적: ${objectives.additionalPurpose}` : "",
      `운영 방침: ${objectives.policies.length ? objectives.policies.join(", ") : "(미입력)"}`,
      objectives.policies.includes("기타") && objectives.customPolicy ? `기타 방침: ${objectives.customPolicy}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const programsText = programs.length
      ? programs
          .map((program, index) => {
            const totalSessions = Number(program.weeks || 0) * Number(program.sessionsPerWeek || 0);
            return [
              `${index + 1}. ${program.name}`,
              `- 대상 학년: ${program.grades.length ? program.grades.join(", ") + "학년" : "(미입력)"}`,
              `- 정원: ${program.capacity || "(미입력)"}명`,
              `- 운영 요일/시간: ${program.days.join(", ")} ${program.startTime} ~ ${program.endTime}`,
              `- 장소: ${program.location || "(미입력)"}`,
              `- 총 차시: ${program.weeks || "0"}주 × ${program.sessionsPerWeek || "0"}회 = ${totalSessions}차시`,
              `- 강사 구분: ${program.instructorType || "(미입력)"}`,
              program.instructorName ? `- 강사명: ${program.instructorName}` : "",
              `- 수강료: ${program.fee || "0"}원`,
              `- 재료비: ${program.materialFeeType === "있음" ? `${program.materialFeeAmount || "0"}원` : "없음"}`,
              program.notes ? `- 비고: ${program.notes}` : "",
            ]
              .filter(Boolean)
              .join("\n");
          })
          .join("\n\n")
      : "(프로그램 미등록)";

    const recruitmentText = [
      `학생 모집 방식: ${recruitment.recruitmentMethod || "(미입력)"}`,
      `수강료 수납 방식: ${recruitment.paymentMethods.length ? recruitment.paymentMethods.join(", ") : "(미입력)"}`,
      recruitment.paymentMethods.includes("기타") && recruitment.paymentOther
        ? `기타 수납 방식: ${recruitment.paymentOther}`
        : "",
      `환불 원칙: ${recruitment.refundPolicyType || "(미입력)"}`,
      recruitment.refundPolicyType === "학교 자체 규정"
        ? `- 개강 전 취소: ${recruitment.refundBeforeStart || "0"}% 환불`
        : "",
      recruitment.refundPolicyType === "학교 자체 규정"
        ? `- 1/3 경과 전: ${recruitment.refundBeforeThird || "0"}% 환불`
        : "",
      recruitment.refundPolicyType === "학교 자체 규정"
        ? `- 1/2 경과 전: ${recruitment.refundBeforeHalf || "0"}% 환불`
        : "",
      recruitment.refundPolicyType === "학교 자체 규정" ? "- 1/2 경과 후: 환불 불가" : "",
      recruitment.refundException ? `환불 예외 사항: ${recruitment.refundException}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const safetyText = [
      `출결 관리 방식: ${safety.attendanceMethods.length ? safety.attendanceMethods.join(", ") : "(미입력)"}`,
      safety.attendanceMethods.includes("기타") && safety.attendanceOther ? `기타 출결 방식: ${safety.attendanceOther}` : "",
      `귀가 지도 방식: ${safety.returnMethod || "(미입력)"}`,
      `안전교육 실시: ${safety.safetyTraining || "(미입력)"}`,
      safety.safetyTraining === "예" ? `안전교육 실시 시기: ${safety.safetyTrainingTime || "(미입력)"}` : "",
      safety.safetyTraining === "예" ? `안전교육 내용: ${safety.safetyTrainingContent || "(미입력)"}` : "",
      `사고 대응 체계: ${safety.incidentResponses.length ? safety.incidentResponses.join(", ") : "(미입력)"}`,
      safety.incidentResponses.includes("기타") && safety.incidentOther ? `기타 대응: ${safety.incidentOther}` : "",
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
    };
  };

  const buildDocumentContent = () => {
    const inputs = buildInputs();
    const { title: _title, ...sections } = inputs;
    const labels: Record<string, string> = {
      basicInfo: "기본 정보",
      objectives: "운영 목표 및 방침",
      programs: "프로그램",
      recruitment: "모집·수납",
      safety: "안전관리",
    };
    return Object.entries(sections)
      .map(([key, value]) => `[${labels[key] ?? key}]\n${value}`)
      .join("\n\n");
  };

  const saveMutation = useMutation({
    mutationFn: async (status: "draft" | "completed") => {
      const response = await apiRequest("POST", "/api/documents", {
        documentType: "방과후학교 운영계획서",
        title: documentTitle,
        schoolName: basicInfo.schoolName,
        metadata: {
          semester: basicInfo.term,
          targetGrade: basicInfo.gradeClass,
          programs: programs.map((program) => program.name).filter(Boolean),
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

  const validateBasicInfo = (info: BasicInfo) => {
    const nextErrors: Record<string, string> = {};
    if (!info.schoolName || info.schoolName.length < 2 || info.schoolName.length > 30) {
      nextErrors.schoolName = "학교명을 2~30자로 입력해주세요.";
    }
    if (!info.schoolYear || info.schoolYear.length !== 4) {
      nextErrors.schoolYear = "학년도는 4자리로 입력해주세요.";
    }
    if (!info.term) {
      nextErrors.term = "학기를 선택해주세요.";
    }
    if (!info.periodStart) {
      nextErrors.periodStart = "시작일을 입력해주세요.";
    }
    if (!info.periodEnd) {
      nextErrors.periodEnd = "종료일을 입력해주세요.";
    }
    if (info.periodStart && info.periodEnd && info.periodStart > info.periodEnd) {
      nextErrors.periodEnd = "운영 종료일은 시작일 이후여야 합니다.";
    }
    if (!info.operationDays.length) {
      nextErrors.operationDays = "운영 요일을 1개 이상 선택해주세요.";
    }
    const hours = Number(info.sessionHours);
    const minutes = Number(info.sessionMinutes);
    if (Number.isNaN(hours) || hours < 0 || hours > 24) {
      nextErrors.sessionHours = "시간은 0~24 사이로 입력해주세요.";
    }
    if (Number.isNaN(minutes) || minutes < 0 || minutes > 59) {
      nextErrors.sessionMinutes = "분은 0~59 사이로 입력해주세요.";
    }
    if (info.department && (info.department.length < 1 || info.department.length > 20)) {
      nextErrors.department = "담당 부서는 1~20자로 입력해주세요.";
    }
    if (info.manager && (info.manager.length < 1 || info.manager.length > 10)) {
      nextErrors.manager = "담당자는 1~10자로 입력해주세요.";
    }
    if (info.contact && info.contact.length < 2) {
      nextErrors.contact = "문의처를 올바르게 입력해주세요.";
    }
    return nextErrors;
  };

  const validateObjectives = (info: ObjectivesInfo) => {
    const nextErrors: Record<string, string> = {};
    if (!info.mainPurpose) {
      nextErrors.mainPurpose = "운영 목적을 선택해주세요.";
    }
    if (info.mainPurpose === "직접 입력" && !info.customPurpose.trim()) {
      nextErrors.customPurpose = "운영 목적을 입력해주세요.";
    }
    if (info.additionalPurpose && info.additionalPurpose.length > 200) {
      nextErrors.additionalPurpose = "추가 목적은 200자 이하로 입력해주세요.";
    }
    if (!info.policies.length) {
      nextErrors.policies = "운영 방침을 1개 이상 선택해주세요.";
    }
    if (info.policies.includes("기타") && !info.customPolicy.trim()) {
      nextErrors.customPolicy = "기타 방침을 입력해주세요.";
    }
    return nextErrors;
  };

  const validateRecruitment = (info: RecruitmentInfo) => {
    const nextErrors: Record<string, string> = {};
    if (!info.recruitmentMethod) {
      nextErrors.recruitmentMethod = "학생 모집 방식을 선택해주세요.";
    }
    if (!info.paymentMethods.length) {
      nextErrors.paymentMethods = "수강료 수납 방식을 1개 이상 선택해주세요.";
    }
    if (info.paymentMethods.includes("기타") && !info.paymentOther.trim()) {
      nextErrors.paymentOther = "기타 수납 방식을 입력해주세요.";
    }
    if (!info.refundPolicyType) {
      nextErrors.refundPolicyType = "환불 원칙을 선택해주세요.";
    }
    if (info.refundPolicyType === "학교 자체 규정") {
      const beforeStart = Number(info.refundBeforeStart);
      const beforeThird = Number(info.refundBeforeThird);
      const beforeHalf = Number(info.refundBeforeHalf);
      if ([beforeStart, beforeThird, beforeHalf].some((value) => Number.isNaN(value) || value < 0 || value > 100)) {
        nextErrors.refundBeforeStart = "환불 비율은 0~100 사이로 입력해주세요.";
      }
    }
    if (info.refundException && info.refundException.length > 200) {
      nextErrors.refundException = "환불 예외 사항은 200자 이하로 입력해주세요.";
    }
    return nextErrors;
  };

  const validateSafety = (info: SafetyInfo) => {
    const nextErrors: Record<string, string> = {};
    if (!info.attendanceMethods.length) {
      nextErrors.attendanceMethods = "출결 관리 방식을 1개 이상 선택해주세요.";
    }
    if (info.attendanceMethods.includes("기타") && !info.attendanceOther.trim()) {
      nextErrors.attendanceOther = "기타 출결 방식을 입력해주세요.";
    }
    if (!info.returnMethod) {
      nextErrors.returnMethod = "귀가 지도 방식을 선택해주세요.";
    }
    if (!info.safetyTraining) {
      nextErrors.safetyTraining = "안전교육 실시 여부를 선택해주세요.";
    }
    if (info.safetyTraining === "예") {
      if (!info.safetyTrainingTime.trim()) {
        nextErrors.safetyTrainingTime = "안전교육 실시 시기를 입력해주세요.";
      }
      if (!info.safetyTrainingContent.trim()) {
        nextErrors.safetyTrainingContent = "안전교육 내용을 입력해주세요.";
      }
    }
    if (!info.incidentResponses.length) {
      nextErrors.incidentResponses = "사고 대응 체계를 1개 이상 선택해주세요.";
    }
    if (info.incidentResponses.includes("기타") && !info.incidentOther.trim()) {
      nextErrors.incidentOther = "기타 대응 체계를 입력해주세요.";
    }
    return nextErrors;
  };

  const validateProgram = (info: ProgramInfo) => {
    const nextErrors: Record<string, string> = {};
    if (!info.name || info.name.length < 2 || info.name.length > 30) {
      nextErrors.name = "프로그램명은 2~30자로 입력해주세요.";
    }
    if (!info.grades.length) {
      nextErrors.grades = "대상 학년을 1개 이상 선택해주세요.";
    }
    const capacity = Number(info.capacity);
    if (Number.isNaN(capacity) || capacity < 1 || capacity > 100) {
      nextErrors.capacity = "정원은 1~100 사이로 입력해주세요.";
    }
    if (!info.days.length) {
      nextErrors.days = "운영 요일을 1개 이상 선택해주세요.";
    }
    if (basicInfo.operationDays.length && info.days.some((day) => !basicInfo.operationDays.includes(day))) {
      nextErrors.days = "프로그램 요일은 기본 정보의 운영 요일 내에서 선택해주세요.";
    }
    if (!info.startTime || !info.endTime) {
      nextErrors.time = "운영 시간을 입력해주세요.";
    }
    if (!info.location || info.location.length < 2 || info.location.length > 30) {
      nextErrors.location = "장소는 2~30자로 입력해주세요.";
    }
    const weeks = Number(info.weeks);
    const sessionsPerWeek = Number(info.sessionsPerWeek);
    if (Number.isNaN(weeks) || weeks < 1) {
      nextErrors.weeks = "주차는 1 이상으로 입력해주세요.";
    }
    if (Number.isNaN(sessionsPerWeek) || sessionsPerWeek < 1) {
      nextErrors.sessionsPerWeek = "주당 횟수는 1 이상으로 입력해주세요.";
    }
    if (!info.instructorType) {
      nextErrors.instructorType = "강사 구분을 선택해주세요.";
    }
    const fee = Number(info.fee);
    if (Number.isNaN(fee) || fee < 0) {
      nextErrors.fee = "수강료는 0 이상으로 입력해주세요.";
    }
    if (!info.materialFeeType) {
      nextErrors.materialFeeType = "재료비 여부를 선택해주세요.";
    }
    if (info.materialFeeType === "있음") {
      const materialFee = Number(info.materialFeeAmount);
      if (Number.isNaN(materialFee) || materialFee < 0) {
        nextErrors.materialFeeAmount = "재료비는 0 이상으로 입력해주세요.";
      }
    }
    if (info.notes && info.notes.length > 100) {
      nextErrors.notes = "비고는 100자 이하로 입력해주세요.";
    }
    return nextErrors;
  };

  const stepValidators = [
    () => validateBasicInfo(basicInfo),
    () => validateObjectives(objectives),
    () => {
      const nextErrors: Record<string, string> = {};
      if (!programs.length) {
        nextErrors.programs = "프로그램을 최소 1개 이상 등록해주세요.";
      }
      return nextErrors;
    },
    () => validateRecruitment(recruitment),
    () => validateSafety(safety),
    () => ({}),
  ];

  const handleNext = () => {
    setStep((prev) => Math.min(prev + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrev = () => {
    setErrors({});
    setStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleProgramSave = () => {
    setProgramErrors({});
    if (editingIndex === null) {
      setPrograms((prev) => [...prev, programDraft]);
    } else {
      setPrograms((prev) => prev.map((item, idx) => (idx === editingIndex ? programDraft : item)));
    }
    setProgramDraft(emptyProgram);
    setEditingIndex(null);
  };

  const startEditProgram = (index: number) => {
    setProgramDraft(programs[index]);
    setEditingIndex(index);
    setProgramErrors({});
  };

  const handleProgramDelete = (index: number) => {
    setPrograms((prev) => prev.filter((_, idx) => idx !== index));
    if (editingIndex === index) {
      setProgramDraft(emptyProgram);
      setEditingIndex(null);
      setProgramErrors({});
    }
  };

  const renderError = (_key: string) => null;

  const renderProgramError = (_key: string) => null;

  const summaryPrograms = programs.map((program, index) => ({
    id: `${program.name}-${index}`,
    name: program.name,
    grades: program.grades.length ? `${program.grades.join("-")}학년` : "-",
    capacity: program.capacity ? `${program.capacity}명` : "-",
    time: program.days.length ? `${program.days.join("")} ${program.startTime}` : "-",
    instructor: program.instructorType || "-",
    fee: program.fee ? `${program.fee}원` : "-",
    materialFee: program.materialFeeType === "있음" ? `${program.materialFeeAmount}원` : "없음",
  }));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">방과후학교 운영계획서 작성</h1>
              <p className="text-sm text-muted-foreground">단계별로 정보를 입력하면 운영계획서를 생성합니다</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="w-full lg:w-64 shrink-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="w-4 h-4 text-primary" />
                  단계 이동
                </CardTitle>
                <CardDescription>{`${step + 1}단계 / ${steps.length}단계`}</CardDescription>
                <Progress value={progressValue} className="mt-3" />
              </CardHeader>
              <CardContent className="space-y-2">
                {steps.map((label, idx) => (
                  <Button
                    key={label}
                    type="button"
                    variant={idx === step ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setStep(idx)}
                  >
                    {label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </aside>
          <div className="flex-1 space-y-6">
            {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>기본 정보 입력</CardTitle>
              <CardDescription>운영계획서의 기본 정보를 입력해주세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">학교명</label>
                  <Input
                    value={basicInfo.schoolName}
                    onChange={(event) => {
                      const next = { ...basicInfo, schoolName: event.target.value };
                      setBasicInfo(next);
                      setErrors(validateBasicInfo(next));
                    }}
                    placeholder="예: OO초등학교"
                  />
                  {renderError("schoolName")}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">학년도</label>
                  <Select
                    value={basicInfo.schoolYear}
                    onValueChange={(value) => {
                      const next = { ...basicInfo, schoolYear: value };
                      setBasicInfo(next);
                      setErrors(validateBasicInfo(next));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="학년도 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {schoolYearOptions.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {renderError("schoolYear")}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">학기</label>
                <RadioGroup
                  value={basicInfo.term}
                  onValueChange={(value) => {
                    const next = { ...basicInfo, term: value as Term };
                    setBasicInfo(next);
                    setErrors(validateBasicInfo(next));
                  }}
                  className="flex flex-wrap gap-6"
                >
                  {TERMS.map((term) => (
                    <label key={term} className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value={term} />
                      {term}
                    </label>
                  ))}
                </RadioGroup>
                {renderError("term")}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">문서 제목</label>
                <Input value={documentTitle} readOnly />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">운영 시작일</label>
                  <Input
                    type="date"
                    value={basicInfo.periodStart}
                    onChange={(event) => {
                      const next = { ...basicInfo, periodStart: event.target.value };
                      setBasicInfo(next);
                      setErrors(validateBasicInfo(next));
                    }}
                  />
                  {renderError("periodStart")}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">운영 종료일</label>
                  <Input
                    type="date"
                    value={basicInfo.periodEnd}
                    onChange={(event) => {
                      const next = { ...basicInfo, periodEnd: event.target.value };
                      setBasicInfo(next);
                      setErrors(validateBasicInfo(next));
                    }}
                  />
                  {renderError("periodEnd")}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">운영 요일</label>
                <div className="flex flex-wrap gap-4">
                  {DAYS.map((day) => (
                    <label key={day} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={basicInfo.operationDays.includes(day)}
                        onCheckedChange={(checked) => {
                          const nextDays = checked
                            ? [...basicInfo.operationDays, day]
                            : basicInfo.operationDays.filter((item) => item !== day);
                          const next = { ...basicInfo, operationDays: nextDays };
                          setBasicInfo(next);
                          setErrors(validateBasicInfo(next));
                        }}
                      />
                      {day}
                    </label>
                  ))}
                </div>
                {renderError("operationDays")}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">1회 운영시간</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={24}
                      value={basicInfo.sessionHours}
                      onChange={(event) => {
                        const next = { ...basicInfo, sessionHours: event.target.value };
                        setBasicInfo(next);
                        setErrors(validateBasicInfo(next));
                      }}
                      placeholder="시간"
                    />
                    <span className="text-sm text-muted-foreground">시간</span>
                    <Input
                      type="number"
                      min={0}
                      max={59}
                      value={basicInfo.sessionMinutes}
                      onChange={(event) => {
                        const next = { ...basicInfo, sessionMinutes: event.target.value };
                        setBasicInfo(next);
                        setErrors(validateBasicInfo(next));
                      }}
                      placeholder="분"
                    />
                    <span className="text-sm text-muted-foreground">분</span>
                  </div>
                  {renderError("sessionHours")}
                  {renderError("sessionMinutes")}
                </div>
                <div />
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">담당 부서</label>
                  <Input
                    value={basicInfo.department}
                    onChange={(event) => {
                      const next = { ...basicInfo, department: event.target.value };
                      setBasicInfo(next);
                      setErrors(validateBasicInfo(next));
                    }}
                    placeholder="예: 교무부"
                  />
                  {renderError("department")}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">담당자</label>
                  <Input
                    value={basicInfo.manager}
                    onChange={(event) => {
                      const next = { ...basicInfo, manager: event.target.value };
                      setBasicInfo(next);
                      setErrors(validateBasicInfo(next));
                    }}
                    placeholder="예: 홍길동"
                  />
                  {renderError("manager")}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">문의처</label>
                  <Input
                    value={basicInfo.contact}
                    onChange={(event) => {
                      const next = { ...basicInfo, contact: event.target.value };
                      setBasicInfo(next);
                      setErrors(validateBasicInfo(next));
                    }}
                    placeholder="예: 02-123-4567"
                  />
                  {renderError("contact")}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>운영 목표 및 방침</CardTitle>
              <CardDescription>주요 운영 목적과 방침을 설정해주세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">운영 목적</label>
                <RadioGroup
                  value={objectives.mainPurpose}
                  onValueChange={(value) => {
                    const next = { ...objectives, mainPurpose: value };
                    setObjectives(next);
                    setErrors(validateObjectives(next));
                  }}
                  className="space-y-2"
                >
                  {[
                    "학생 소질·적성 계발",
                    "학력 향상 및 기초학력 보충",
                    "창의성 및 인성 함양",
                    "직접 입력",
                  ].map((purpose) => (
                    <label key={purpose} className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value={purpose} />
                      {purpose}
                    </label>
                  ))}
                </RadioGroup>
                {renderError("mainPurpose")}
              </div>

              {objectives.mainPurpose === "직접 입력" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">직접 입력</label>
                  <Input
                    value={objectives.customPurpose}
                    onChange={(event) => {
                      const next = { ...objectives, customPurpose: event.target.value };
                      setObjectives(next);
                      setErrors(validateObjectives(next));
                    }}
                    placeholder="운영 목적을 입력해주세요"
                  />
                  {renderError("customPurpose")}
                </div>
              )}

              <div className="space-y-2 relative">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">추가 목적 (선택)</label>
                  <AIGenerateButton
                    fieldName="additionalPurpose"
                    context={{
                      schoolName: basicInfo.schoolName,
                      year: basicInfo.schoolYear,
                      purposes: objectives.mainPurpose === "직접 입력"
                        ? [objectives.customPurpose]
                        : [objectives.mainPurpose],
                    }}
                    onGenerated={(text) => {
                      const next = { ...objectives, additionalPurpose: text };
                      setObjectives(next);
                      setErrors(validateObjectives(next));
                    }}
                  />
                </div>
                <Textarea
                  value={objectives.additionalPurpose}
                  onChange={(event) => {
                    const next = { ...objectives, additionalPurpose: event.target.value };
                    setObjectives(next);
                    setErrors(validateObjectives(next));
                  }}
                  placeholder="부가 목적을 입력해주세요"
                />
                {renderError("additionalPurpose")}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">운영 방침</label>
                <div className="grid md:grid-cols-2 gap-3">
                  {[
                    "공개 모집 원칙",
                    "무상 또는 실비 운영",
                    "학부모 수요 조사 기반 편성",
                    "저소득층 학생 우선 배려",
                    "안전 관리 강화",
                    "기타",
                  ].map((policy) => (
                    <label key={policy} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={objectives.policies.includes(policy)}
                        onCheckedChange={(checked) => {
                          const nextPolicies = checked
                            ? [...objectives.policies, policy]
                            : objectives.policies.filter((item) => item !== policy);
                          const next = { ...objectives, policies: nextPolicies };
                          setObjectives(next);
                          setErrors(validateObjectives(next));
                        }}
                      />
                      {policy}
                    </label>
                  ))}
                </div>
                {renderError("policies")}
              </div>

              {objectives.policies.includes("기타") && (
                <div className="space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">기타 방침</label>
                    <AIGenerateButton
                      fieldName="customPolicy"
                      context={{
                        schoolName: basicInfo.schoolName,
                        year: basicInfo.schoolYear,
                        policies: objectives.policies.filter(p => p !== "기타"),
                      }}
                      onGenerated={(text) => {
                        const next = { ...objectives, customPolicy: text };
                        setObjectives(next);
                        setErrors(validateObjectives(next));
                      }}
                    />
                  </div>
                  <Textarea
                    value={objectives.customPolicy}
                    onChange={(event) => {
                      const next = { ...objectives, customPolicy: event.target.value };
                      setObjectives(next);
                      setErrors(validateObjectives(next));
                    }}
                    placeholder="기타 방침 입력"
                    rows={2}
                  />
                  {renderError("customPolicy")}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>프로그램 운영표</CardTitle>
              <CardDescription>프로그램을 추가하고 운영 정보를 입력해주세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {errors.programs && <p className="text-sm text-destructive">{errors.programs}</p>}

              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">프로그램 목록</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setProgramDraft(emptyProgram);
                    setEditingIndex(null);
                    setProgramErrors({});
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  프로그램 추가
                </Button>
              </div>

              {programs.length > 0 && (
                <div className="space-y-4">
                  {programs.map((program, index) => (
                    <Card key={`${program.name}-${index}`}>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-base">{program.name || `프로그램 ${index + 1}`}</CardTitle>
                          <CardDescription>
                            {program.days.join(", ")} {program.startTime} ~ {program.endTime}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => startEditProgram(index)}>
                            <Pencil className="w-4 h-4 mr-1" />
                            편집
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => handleProgramDelete(index)}>
                            <Trash2 className="w-4 h-4 mr-1" />
                            삭제
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}

              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle className="text-base">
                    {editingIndex === null ? "새 프로그램 입력" : `프로그램 ${editingIndex + 1} 수정`}
                  </CardTitle>
                  <CardDescription>필수 항목을 입력한 뒤 저장하세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">프로그램명</label>
                      <Input
                        value={programDraft.name}
                        onChange={(event) => setProgramDraft({ ...programDraft, name: event.target.value })}
                        placeholder="예: 창의수학"
                      />
                      {renderProgramError("name")}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">정원</label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={programDraft.capacity}
                        onChange={(event) => setProgramDraft({ ...programDraft, capacity: event.target.value })}
                        placeholder="예: 20"
                      />
                      {renderProgramError("capacity")}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">대상 학년</label>
                    <div className="flex flex-wrap gap-4">
                      {PROGRAM_GRADES.map((grade) => (
                        <label key={grade} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={programDraft.grades.includes(grade)}
                            onCheckedChange={(checked) => {
                              const nextGrades = checked
                                ? [...programDraft.grades, grade]
                                : programDraft.grades.filter((item) => item !== grade);
                              setProgramDraft({ ...programDraft, grades: nextGrades });
                            }}
                          />
                          {grade}학년
                        </label>
                      ))}
                    </div>
                    {renderProgramError("grades")}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">운영 요일</label>
                    <div className="flex flex-wrap gap-4">
                      {DAYS.map((day) => (
                        <label key={day} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={programDraft.days.includes(day)}
                            onCheckedChange={(checked) => {
                              const nextDays = checked
                                ? [...programDraft.days, day]
                                : programDraft.days.filter((item) => item !== day);
                              setProgramDraft({ ...programDraft, days: nextDays });
                            }}
                          />
                          {day}
                        </label>
                      ))}
                    </div>
                    {renderProgramError("days")}
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">시작 시간</label>
                      <Input
                        type="time"
                        value={programDraft.startTime}
                        onChange={(event) => setProgramDraft({ ...programDraft, startTime: event.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">종료 시간</label>
                      <Input
                        type="time"
                        value={programDraft.endTime}
                        onChange={(event) => setProgramDraft({ ...programDraft, endTime: event.target.value })}
                      />
                      {renderProgramError("time")}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">장소</label>
                    <Input
                      value={programDraft.location}
                      onChange={(event) => setProgramDraft({ ...programDraft, location: event.target.value })}
                      placeholder="예: 3학년 1반 교실"
                    />
                    {renderProgramError("location")}
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">주차</label>
                      <Input
                        type="number"
                        min={1}
                        value={programDraft.weeks}
                        onChange={(event) => setProgramDraft({ ...programDraft, weeks: event.target.value })}
                        placeholder="예: 16"
                      />
                      {renderProgramError("weeks")}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">주당 횟수</label>
                      <Input
                        type="number"
                        min={1}
                        value={programDraft.sessionsPerWeek}
                        onChange={(event) => setProgramDraft({ ...programDraft, sessionsPerWeek: event.target.value })}
                        placeholder="예: 2"
                      />
                      {renderProgramError("sessionsPerWeek")}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">강사 구분</label>
                      <RadioGroup
                        value={programDraft.instructorType}
                        onValueChange={(value) => setProgramDraft({ ...programDraft, instructorType: value as ProgramInfo["instructorType"] })}
                        className="flex gap-6"
                      >
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="내부강사" />
                          내부강사
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="외부강사" />
                          외부강사
                        </label>
                      </RadioGroup>
                      {renderProgramError("instructorType")}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">강사명</label>
                      <Input
                        value={programDraft.instructorName}
                        onChange={(event) => setProgramDraft({ ...programDraft, instructorName: event.target.value })}
                        placeholder="예: 김수학"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">수강료</label>
                      <Input
                        type="number"
                        min={0}
                        value={programDraft.fee}
                        onChange={(event) => setProgramDraft({ ...programDraft, fee: event.target.value })}
                        placeholder="예: 80000"
                      />
                      {renderProgramError("fee")}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">재료비</label>
                      <RadioGroup
                        value={programDraft.materialFeeType}
                        onValueChange={(value) =>
                          setProgramDraft({ ...programDraft, materialFeeType: value as ProgramInfo["materialFeeType"] })
                        }
                        className="flex gap-6"
                      >
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="없음" />
                          없음
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="있음" />
                          있음
                        </label>
                      </RadioGroup>
                      {renderProgramError("materialFeeType")}
                      {programDraft.materialFeeType === "있음" && (
                        <div className="mt-2">
                          <Input
                            type="number"
                            min={0}
                            value={programDraft.materialFeeAmount}
                            onChange={(event) => setProgramDraft({ ...programDraft, materialFeeAmount: event.target.value })}
                            placeholder="예: 10000"
                          />
                          {renderProgramError("materialFeeAmount")}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">비고</label>
                      <AIGenerateButton
                        fieldName="programDescription"
                        context={{
                          schoolName: basicInfo.schoolName,
                          year: basicInfo.schoolYear,
                          programName: programDraft.name,
                          targetGrade: programDraft.grades.length
                            ? `${programDraft.grades.join(", ")}학년`
                            : "전학년",
                          operatingTime: programDraft.days.length
                            ? `${programDraft.days.join(", ")} ${programDraft.startTime} ~ ${programDraft.endTime}`
                            : "미정",
                          programType: programDraft.instructorType || "특기적성",
                        }}
                        onGenerated={(text) => setProgramDraft({ ...programDraft, notes: text })}
                        disabled={!programDraft.name}
                      />
                    </div>
                    <Textarea
                      value={programDraft.notes}
                      onChange={(event) => setProgramDraft({ ...programDraft, notes: event.target.value })}
                      placeholder="추가 정보를 입력해주세요"
                    />
                    {renderProgramError("notes")}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setProgramDraft(emptyProgram)}>
                      초기화
                    </Button>
                    <Button type="button" onClick={handleProgramSave}>
                      저장
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {programs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">요약 보기</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>프로그램명</TableHead>
                          <TableHead>대상</TableHead>
                          <TableHead>정원</TableHead>
                          <TableHead>요일·시간</TableHead>
                          <TableHead>강사</TableHead>
                          <TableHead>수강료</TableHead>
                          <TableHead>재료비</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summaryPrograms.map((program) => (
                          <TableRow key={program.id}>
                            <TableCell>{program.name}</TableCell>
                            <TableCell>{program.grades}</TableCell>
                            <TableCell>{program.capacity}</TableCell>
                            <TableCell>{program.time}</TableCell>
                            <TableCell>{program.instructor}</TableCell>
                            <TableCell>{program.fee}</TableCell>
                            <TableCell>{program.materialFee}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>모집 및 수납 방법</CardTitle>
              <CardDescription>학생 모집 방식과 수납/환불 기준을 입력해주세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">학생 모집 방식</label>
                <RadioGroup
                  value={recruitment.recruitmentMethod}
                  onValueChange={(value) => {
                    const next = { ...recruitment, recruitmentMethod: value };
                    setRecruitment(next);
                    setErrors(validateRecruitment(next));
                  }}
                  className="space-y-2"
                >
                  {["선착순", "추첨", "선착순 + 대기 후 추첨"].map((method) => (
                    <label key={method} className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value={method} />
                      {method}
                    </label>
                  ))}
                </RadioGroup>
                {renderError("recruitmentMethod")}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">수강료 수납 방식</label>
                <div className="flex flex-wrap gap-4">
                  {["스쿨뱅킹", "계좌이체", "기타"].map((method) => (
                    <label key={method} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={recruitment.paymentMethods.includes(method)}
                        onCheckedChange={(checked) => {
                          const nextMethods = checked
                            ? [...recruitment.paymentMethods, method]
                            : recruitment.paymentMethods.filter((item) => item !== method);
                          const next = { ...recruitment, paymentMethods: nextMethods };
                          setRecruitment(next);
                          setErrors(validateRecruitment(next));
                        }}
                      />
                      {method}
                    </label>
                  ))}
                </div>
                {renderError("paymentMethods")}
              </div>

              {recruitment.paymentMethods.includes("기타") && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">기타 수납 방식</label>
                  <Input
                    value={recruitment.paymentOther}
                    onChange={(event) => {
                      const next = { ...recruitment, paymentOther: event.target.value };
                      setRecruitment(next);
                      setErrors(validateRecruitment(next));
                    }}
                    placeholder="기타 수납 방식 입력"
                  />
                  {renderError("paymentOther")}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">환불 원칙</label>
                <RadioGroup
                  value={recruitment.refundPolicyType}
                  onValueChange={(value) => {
                    const next = { ...recruitment, refundPolicyType: value as RecruitmentInfo["refundPolicyType"] };
                    setRecruitment(next);
                    setErrors(validateRecruitment(next));
                  }}
                  className="space-y-2"
                >
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="교육청 기준" />
                    교육청 기준 적용
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="학교 자체 규정" />
                    학교 자체 규정
                  </label>
                </RadioGroup>
                {renderError("refundPolicyType")}
              </div>

              {recruitment.refundPolicyType === "학교 자체 규정" && (
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">개강 전 취소 (%)</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={recruitment.refundBeforeStart}
                      onChange={(event) => {
                        const next = { ...recruitment, refundBeforeStart: event.target.value };
                        setRecruitment(next);
                        setErrors(validateRecruitment(next));
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">1/3 경과 전 (%)</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={recruitment.refundBeforeThird}
                      onChange={(event) => {
                        const next = { ...recruitment, refundBeforeThird: event.target.value };
                        setRecruitment(next);
                        setErrors(validateRecruitment(next));
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">1/2 경과 전 (%)</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={recruitment.refundBeforeHalf}
                      onChange={(event) => {
                        const next = { ...recruitment, refundBeforeHalf: event.target.value };
                        setRecruitment(next);
                        setErrors(validateRecruitment(next));
                      }}
                    />
                  </div>
                  {renderError("refundBeforeStart")}
                </div>
              )}

              <div className="space-y-2 relative">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">환불 예외 사항 (선택)</label>
                  <AIGenerateButton
                    fieldName="refundException"
                    context={{
                      schoolName: basicInfo.schoolName,
                      year: basicInfo.schoolYear,
                      refundPolicyType: recruitment.refundPolicyType,
                    }}
                    onGenerated={(text) => {
                      const next = { ...recruitment, refundException: text };
                      setRecruitment(next);
                      setErrors(validateRecruitment(next));
                    }}
                  />
                </div>
                <Textarea
                  value={recruitment.refundException}
                  onChange={(event) => {
                    const next = { ...recruitment, refundException: event.target.value };
                    setRecruitment(next);
                    setErrors(validateRecruitment(next));
                  }}
                  placeholder="특이사항을 입력해주세요"
                />
                {renderError("refundException")}
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>안전 및 학생 관리</CardTitle>
              <CardDescription>출결 관리와 안전 교육 정보를 입력해주세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">출결 관리 방식</label>
                <div className="flex flex-wrap gap-4">
                  {["전자 출결 시스템 활용", "강사별 출석부 기록", "기타"].map((method) => (
                    <label key={method} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={safety.attendanceMethods.includes(method)}
                        onCheckedChange={(checked) => {
                          const nextMethods = checked
                            ? [...safety.attendanceMethods, method]
                            : safety.attendanceMethods.filter((item) => item !== method);
                          const next = { ...safety, attendanceMethods: nextMethods };
                          setSafety(next);
                          setErrors(validateSafety(next));
                        }}
                      />
                      {method}
                    </label>
                  ))}
                </div>
                {renderError("attendanceMethods")}
              </div>

              {safety.attendanceMethods.includes("기타") && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">기타 출결 관리</label>
                  <Input
                    value={safety.attendanceOther}
                    onChange={(event) => {
                      const next = { ...safety, attendanceOther: event.target.value };
                      setSafety(next);
                      setErrors(validateSafety(next));
                    }}
                    placeholder="기타 출결 관리 입력"
                  />
                  {renderError("attendanceOther")}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">귀가 지도 방식</label>
                <RadioGroup
                  value={safety.returnMethod}
                  onValueChange={(value) => {
                    const next = { ...safety, returnMethod: value };
                    setSafety(next);
                    setErrors(validateSafety(next));
                  }}
                  className="space-y-2"
                >
                  {["학부모 직접 인계", "하교 안전 지도 후 귀가", "학부모 동의서 기반 자율 귀가"].map((method) => (
                    <label key={method} className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value={method} />
                      {method}
                    </label>
                  ))}
                </RadioGroup>
                {renderError("returnMethod")}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">안전교육 실시</label>
                <RadioGroup
                  value={safety.safetyTraining}
                  onValueChange={(value) => {
                    const next = { ...safety, safetyTraining: value as SafetyInfo["safetyTraining"] };
                    setSafety(next);
                    setErrors(validateSafety(next));
                  }}
                  className="flex gap-6"
                >
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="예" />
                    예
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="아니오" />
                    아니오
                  </label>
                </RadioGroup>
                {renderError("safetyTraining")}
              </div>

              {safety.safetyTraining === "예" && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">실시 시기</label>
                    <Input
                      value={safety.safetyTrainingTime}
                      onChange={(event) => {
                        const next = { ...safety, safetyTrainingTime: event.target.value };
                        setSafety(next);
                        setErrors(validateSafety(next));
                      }}
                      placeholder="예: 학기 초"
                    />
                    {renderError("safetyTrainingTime")}
                  </div>
                  <div className="space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">교육 내용</label>
                      <AIGenerateButton
                        fieldName="safetyTrainingContent"
                        context={{
                          schoolName: basicInfo.schoolName,
                          year: basicInfo.schoolYear,
                        }}
                        onGenerated={(text) => {
                          const next = { ...safety, safetyTrainingContent: text };
                          setSafety(next);
                          setErrors(validateSafety(next));
                        }}
                      />
                    </div>
                    <Textarea
                      value={safety.safetyTrainingContent}
                      onChange={(event) => {
                        const next = { ...safety, safetyTrainingContent: event.target.value };
                        setSafety(next);
                        setErrors(validateSafety(next));
                      }}
                      placeholder="예: 화재·지진 대피"
                      rows={3}
                    />
                    {renderError("safetyTrainingContent")}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">사고 대응 체계</label>
                <div className="grid md:grid-cols-2 gap-3">
                  {["응급처치 매뉴얼 비치", "보험 가입", "비상연락망 구축", "기타"].map((item) => (
                    <label key={item} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={safety.incidentResponses.includes(item)}
                        onCheckedChange={(checked) => {
                          const nextResponses = checked
                            ? [...safety.incidentResponses, item]
                            : safety.incidentResponses.filter((value) => value !== item);
                          const next = { ...safety, incidentResponses: nextResponses };
                          setSafety(next);
                          setErrors(validateSafety(next));
                        }}
                      />
                      {item}
                    </label>
                  ))}
                </div>
                {renderError("incidentResponses")}
              </div>

              {safety.incidentResponses.includes("기타") && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">기타 대응 체계</label>
                  <Input
                    value={safety.incidentOther}
                    onChange={(event) => {
                      const next = { ...safety, incidentOther: event.target.value };
                      setSafety(next);
                      setErrors(validateSafety(next));
                    }}
                    placeholder="기타 대응 체계 입력"
                  />
                  {renderError("incidentOther")}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step === 5 && (
          <Card>
            <CardHeader>
              <CardTitle>입력 내용 확인</CardTitle>
              <CardDescription>입력한 내용을 확인하고 문서를 생성하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border border-border bg-muted/40 p-6 space-y-4">
                <div className="text-center border-b pb-4">
                  <h2 className="text-xl font-bold">{documentTitle}</h2>
                  <p className="text-muted-foreground">{basicInfo.schoolName || "학교명 미입력"}</p>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-semibold">기본 정보</p>
                    <p className="text-muted-foreground">
                      {basicInfo.schoolYear}학년도 {basicInfo.term || "-"} / {basicInfo.periodStart || "-"} ~{" "}
                      {basicInfo.periodEnd || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold">프로그램</p>
                    <p className="text-muted-foreground">총 {programs.length}개 프로그램</p>
                    {programs.slice(0, 3).map((program, index) => (
                      <p key={`${program.name}-${index}`} className="text-muted-foreground">
                        {index + 1}. {program.name} ({program.grades.join(", ")}학년, {program.capacity}명)
                      </p>
                    ))}
                  </div>
                  <div>
                    <p className="font-semibold">모집 및 환불</p>
                    <p className="text-muted-foreground">모집: {recruitment.recruitmentMethod || "-"}</p>
                    <p className="text-muted-foreground">환불: {recruitment.refundPolicyType || "-"}</p>
                  </div>
                  <div>
                    <p className="font-semibold">안전 관리</p>
                    <p className="text-muted-foreground">
                      출결: {safety.attendanceMethods.join(", ") || "-"} / 귀가: {safety.returnMethod || "-"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

            <HwpReferenceUpload
              onUploaded={(fileId) => setReferenceFileId(fileId)}
              onClear={() => setReferenceFileId(null)}
            />

            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <Button variant="outline" onClick={handlePrev} disabled={step === 0}>
                이전
              </Button>
              <div className="flex flex-col sm:flex-row gap-3">
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
                {step < steps.length - 1 ? (
                  <Button onClick={handleNext}>다음</Button>
                ) : (
                  <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                    {generateMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        문서 생성 중...
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        문서 생성
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
