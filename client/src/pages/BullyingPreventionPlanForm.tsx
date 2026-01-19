import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Scale, Loader2, Plus, Trash2 } from "lucide-react";
import { AIGenerateButton } from "@/components/AIGenerateButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { HwpReferenceUpload } from "@/components/HwpReferenceUpload";

type SchoolLevel = "elementary" | "middle" | "high" | "";
type PlanType = "annual" | "semester" | "";

interface BasicInfo {
  schoolName: string;
  schoolLevel: SchoolLevel;
  planType: PlanType;
  studentCount: string;
  classCount: string;
  teacherCount: string;
  periodStart: string;
  periodEnd: string;
  author: string;
  department: string;
  contact: string;
}

interface AnalysisInfo {
  previousIncidents: string;
  incidentTypes: string[];
  schoolCharacteristics: string;
  previousEvaluation: string;
  improvements: string;
}

interface GoalsInfo {
  goals: string;
  policy: string;
  keyTasks: string;
  expectedEffects: string;
}

interface GradeEducationItem {
  grade: string;
  semester1Times: string;
  semester1Hours: string;
  semester2Times: string;
  semester2Hours: string;
}

interface StudentEducationInfo {
  timesPerSemester: string;
  gradeEducation: GradeEducationItem[];
  mainContent: string;
  methods: string[];
  materials: string;
  specialProgram: string;
}

interface TeacherTrainingItem {
  date: string;
  topic: string;
  target: string;
  hours: string;
  instructor: string;
  notes: string;
}

interface ParentEducationItem {
  date: string;
  topic: string;
  target: string;
  hours: string;
  method: string;
  notes: string;
}

interface MonthlyPlanItem {
  period: string;
  target: string;
  activity: string;
  method: string;
  responsible: string;
  notes: string;
}

interface CounselingInfo {
  schoolCounseling: string;
  reportingMethods: string;
  emergencyResponse: string;
  externalPartners: string;
}

interface BudgetInfo {
  budgetPlan: string;
  facilities: string;
  materials: string;
}

interface EvaluationInfo {
  timing: string;
  methods: string;
  indicators: string;
  feedback: string;
  targetReduction: string;
}

const steps = [
  "기본 정보",
  "현황 분석",
  "교육 목표 및 방침",
  "학생 대상 교육",
  "교직원 연수",
  "학부모 교육",
  "월별 실행 계획",
  "상담 및 신고 체계",
  "예산 및 인프라",
  "평가 및 환류",
];

const incidentTypeOptions = [
  "언어폭력",
  "신체폭력",
  "사이버폭력",
  "집단따돌림",
  "성폭력",
  "금품갈취",
  "강제심부름",
  "기타",
];

const studentMethodOptions = ["강의", "토론", "역할극", "영상시청", "체험활동"];

const gradeOptionsByLevel: Record<Exclude<SchoolLevel, "">, string[]> = {
  elementary: ["1학년", "2학년", "3학년", "4학년", "5학년", "6학년"],
  middle: ["1학년", "2학년", "3학년"],
  high: ["1학년", "2학년", "3학년"],
};

const emptyGradeEducation = (grade: string): GradeEducationItem => ({
  grade,
  semester1Times: "",
  semester1Hours: "",
  semester2Times: "",
  semester2Hours: "",
});

const emptyTeacherTraining = (): TeacherTrainingItem => ({
  date: "",
  topic: "",
  target: "",
  hours: "",
  instructor: "",
  notes: "",
});

const emptyParentEducation = (): ParentEducationItem => ({
  date: "",
  topic: "",
  target: "",
  hours: "",
  method: "",
  notes: "",
});

const emptyMonthlyPlan = (): MonthlyPlanItem => ({
  period: "",
  target: "",
  activity: "",
  method: "",
  responsible: "",
  notes: "",
});

const formatPhoneNumber = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
};

export default function BullyingPreventionPlanForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [referenceFileId, setReferenceFileId] = useState<number | null>(null);
  const [basicInfo, setBasicInfo] = useState<BasicInfo>({
    schoolName: "",
    schoolLevel: "",
    planType: "",
    studentCount: "",
    classCount: "",
    teacherCount: "",
    periodStart: "",
    periodEnd: "",
    author: "",
    department: "",
    contact: "",
  });
  const [analysis, setAnalysis] = useState<AnalysisInfo>({
    previousIncidents: "",
    incidentTypes: [],
    schoolCharacteristics: "",
    previousEvaluation: "",
    improvements: "",
  });
  const [goals, setGoals] = useState<GoalsInfo>({
    goals: "",
    policy: "",
    keyTasks: "",
    expectedEffects: "",
  });
  const [studentEducation, setStudentEducation] = useState<StudentEducationInfo>({
    timesPerSemester: "",
    gradeEducation: [],
    mainContent: "",
    methods: [],
    materials: "",
    specialProgram: "",
  });
  const [teacherTrainingTimes, setTeacherTrainingTimes] = useState("");
  const [teacherTraining, setTeacherTraining] = useState<TeacherTrainingItem[]>([emptyTeacherTraining()]);
  const [parentEducationTimes, setParentEducationTimes] = useState("");
  const [parentEducation, setParentEducation] = useState<ParentEducationItem[]>([emptyParentEducation()]);
  const [monthlyPlan, setMonthlyPlan] = useState<MonthlyPlanItem[]>([
    { period: "3월", target: "전체 학생", activity: "학교폭력 예방 주간 운영", method: "캠페인, 교육", responsible: "학생부", notes: "신학기" },
  ]);
  const [counseling, setCounseling] = useState<CounselingInfo>({
    schoolCounseling: "",
    reportingMethods: "",
    emergencyResponse: "",
    externalPartners: "",
  });
  const [budget, setBudget] = useState<BudgetInfo>({
    budgetPlan: "",
    facilities: "",
    materials: "",
  });
  const [evaluation, setEvaluation] = useState<EvaluationInfo>({
    timing: "",
    methods: "",
    indicators: "",
    feedback: "",
    targetReduction: "",
  });

  const progressValue = ((step + 1) / steps.length) * 100;
  const gradeOptions = basicInfo.schoolLevel ? gradeOptionsByLevel[basicInfo.schoolLevel] : [];

  const documentTitle = useMemo(() => {
    const year = basicInfo.periodStart ? basicInfo.periodStart.slice(0, 4) : new Date().getFullYear().toString();
    if (!basicInfo.schoolName) return "학교폭력 예방 교육 계획서";
    return `${basicInfo.schoolName} ${year}학년도 학교폭력 예방 교육 계획서`;
  }, [basicInfo.schoolName, basicInfo.periodStart]);

  const aiContext = {
    basicInfo,
    analysis,
    goals,
    studentEducation,
    teacherTrainingTimes,
    teacherTraining,
    parentEducationTimes,
    parentEducation,
    monthlyPlan,
    counseling,
    budget,
    evaluation,
  };

  const handleSchoolLevelChange = (value: SchoolLevel) => {
    const grades = value ? gradeOptionsByLevel[value] : [];
    setBasicInfo((prev) => ({ ...prev, schoolLevel: value }));
    setStudentEducation((prev) => ({
      ...prev,
      gradeEducation: grades.map((grade) => emptyGradeEducation(grade)),
    }));
  };

  const toggleIncidentType = (value: string) => {
    const current = new Set(analysis.incidentTypes);
    if (current.has(value)) {
      current.delete(value);
    } else {
      current.add(value);
    }
    setAnalysis((prev) => ({ ...prev, incidentTypes: Array.from(current) }));
  };

  const toggleMethod = (value: string) => {
    const current = new Set(studentEducation.methods);
    if (current.has(value)) {
      current.delete(value);
    } else {
      current.add(value);
    }
    setStudentEducation((prev) => ({ ...prev, methods: Array.from(current) }));
  };

  const updateGradeEducation = (index: number, updates: Partial<GradeEducationItem>) => {
    setStudentEducation((prev) => ({
      ...prev,
      gradeEducation: prev.gradeEducation.map((item, idx) => (idx === index ? { ...item, ...updates } : item)),
    }));
  };

  const addGradeEducation = () => {
    const nextGrade = `추가 학년 ${studentEducation.gradeEducation.length + 1}`;
    setStudentEducation((prev) => ({
      ...prev,
      gradeEducation: [...prev.gradeEducation, emptyGradeEducation(nextGrade)],
    }));
  };

  const removeGradeEducation = (index: number) => {
    if (studentEducation.gradeEducation.length <= 1) return;
    setStudentEducation((prev) => ({
      ...prev,
      gradeEducation: prev.gradeEducation.filter((_, idx) => idx !== index),
    }));
  };

  const updateTeacherTraining = (index: number, updates: Partial<TeacherTrainingItem>) => {
    setTeacherTraining((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...updates } : item)));
  };

  const addTeacherTraining = () => setTeacherTraining((prev) => [...prev, emptyTeacherTraining()]);
  const removeTeacherTraining = (index: number) => {
    if (teacherTraining.length <= 1) return;
    setTeacherTraining((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateParentEducation = (index: number, updates: Partial<ParentEducationItem>) => {
    setParentEducation((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...updates } : item)));
  };

  const addParentEducation = () => setParentEducation((prev) => [...prev, emptyParentEducation()]);
  const removeParentEducation = (index: number) => {
    if (parentEducation.length <= 1) return;
    setParentEducation((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateMonthlyPlan = (index: number, updates: Partial<MonthlyPlanItem>) => {
    setMonthlyPlan((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...updates } : item)));
  };

  const addMonthlyPlan = () => setMonthlyPlan((prev) => [...prev, emptyMonthlyPlan()]);
  const removeMonthlyPlan = (index: number) => {
    if (monthlyPlan.length <= 5) return;
    setMonthlyPlan((prev) => prev.filter((_, idx) => idx !== index));
  };

  const renderError = (_key: string) => null;

  const validateBasicInfo = (info: BasicInfo) => {
    const nextErrors: Record<string, string> = {};
    if (info.schoolName.length < 2 || info.schoolName.length > 50) {
      nextErrors.schoolName = "학교명을 2~50자로 입력해주세요.";
    }
    if (!info.schoolLevel) {
      nextErrors.schoolLevel = "학교급을 선택해주세요.";
    }
    if (!info.planType) {
      nextErrors.planType = "계획서 유형을 선택해주세요.";
    }
    const studentCount = Number(info.studentCount);
    const classCount = Number(info.classCount);
    const teacherCount = Number(info.teacherCount);
    if (Number.isNaN(studentCount) || studentCount < 1) {
      nextErrors.studentCount = "전체 학생 수는 1명 이상 입력해주세요.";
    }
    if (Number.isNaN(classCount) || classCount < 1) {
      nextErrors.classCount = "학급 수는 1 이상 입력해주세요.";
    }
    if (Number.isNaN(teacherCount) || teacherCount < 1) {
      nextErrors.teacherCount = "교원 수는 1 이상 입력해주세요.";
    }
    if (!info.periodStart || !info.periodEnd) {
      nextErrors.period = "계획 기간을 입력해주세요.";
    } else if (new Date(info.periodStart) > new Date(info.periodEnd)) {
      nextErrors.period = "종료일은 시작일보다 뒤여야 합니다.";
    }
    if (info.author.length < 2 || info.author.length > 20) {
      nextErrors.author = "작성자를 2~20자로 입력해주세요.";
    }
    if (info.department.length < 2 || info.department.length > 30) {
      nextErrors.department = "부서를 2~30자로 입력해주세요.";
    }
    if (!/^010-\d{4}-\d{4}$/.test(info.contact)) {
      nextErrors.contact = "연락처는 010-0000-0000 형식으로 입력해주세요.";
    }
    return nextErrors;
  };

  const validateAnalysis = (info: AnalysisInfo) => {
    const nextErrors: Record<string, string> = {};
    if (!info.schoolCharacteristics.trim()) {
      nextErrors.schoolCharacteristics = "학교 특성 및 환경을 입력해주세요.";
    }
    return nextErrors;
  };

  const validateGoals = (info: GoalsInfo) => {
    const nextErrors: Record<string, string> = {};
    if (!info.goals.trim()) nextErrors.goals = "교육 목표를 입력해주세요.";
    if (!info.policy.trim()) nextErrors.policy = "운영 방침을 입력해주세요.";
    if (!info.keyTasks.trim()) nextErrors.keyTasks = "중점 추진 과제를 입력해주세요.";
    if (!info.expectedEffects.trim()) nextErrors.expectedEffects = "기대 효과를 입력해주세요.";
    return nextErrors;
  };

  const validateStudentEducation = (info: StudentEducationInfo) => {
    const nextErrors: Record<string, string> = {};
    const times = Number(info.timesPerSemester);
    if (Number.isNaN(times) || times < 1) {
      nextErrors.timesPerSemester = "학기당 교육 횟수는 1회 이상 입력해주세요.";
    }
    if (info.gradeEducation.length < 1) {
      nextErrors.gradeEducation = "학년별 교육 시간을 입력해주세요.";
    }
    info.gradeEducation.forEach((item, index) => {
      if (!item.grade || !item.semester1Times || !item.semester1Hours || !item.semester2Times || !item.semester2Hours) {
        nextErrors[`grade-${index}`] = "학년별 교육 시간의 필수 항목을 입력해주세요.";
      }
    });
    if (!info.mainContent.trim()) nextErrors.mainContent = "주요 교육 내용을 입력해주세요.";
    if (!info.methods.length) nextErrors.methods = "교육 방법을 1개 이상 선택해주세요.";
    return nextErrors;
  };

  const validateTeacherTraining = (items: TeacherTrainingItem[], times: string) => {
    const nextErrors: Record<string, string> = {};
    const count = Number(times);
    if (Number.isNaN(count) || count < 1) {
      nextErrors.teacherTrainingTimes = "연수 횟수는 1회 이상 입력해주세요.";
    }
    if (items.length < 1) {
      nextErrors.teacherTrainingCount = "최소 1개 이상의 연수 계획이 필요합니다.";
    }
    items.forEach((item, index) => {
      if (!item.date || !item.topic || !item.target || !item.hours || !item.instructor) {
        nextErrors[`teacher-${index}`] = "연수 계획의 필수 항목을 입력해주세요.";
      }
    });
    return nextErrors;
  };

  const validateParentEducation = (items: ParentEducationItem[], times: string) => {
    const nextErrors: Record<string, string> = {};
    const count = Number(times);
    if (Number.isNaN(count) || count < 1) {
      nextErrors.parentEducationTimes = "교육 횟수는 1회 이상 입력해주세요.";
    }
    if (items.length < 1) {
      nextErrors.parentEducationCount = "최소 1개 이상의 교육 계획이 필요합니다.";
    }
    items.forEach((item, index) => {
      if (!item.date || !item.topic || !item.target || !item.hours || !item.method) {
        nextErrors[`parent-${index}`] = "교육 계획의 필수 항목을 입력해주세요.";
      }
    });
    return nextErrors;
  };

  const validateMonthlyPlan = (items: MonthlyPlanItem[]) => {
    const nextErrors: Record<string, string> = {};
    if (items.length < 5) {
      nextErrors.monthlyPlanCount = "최소 5개 이상의 실행 계획을 입력해 주세요.";
    }
    items.forEach((item, index) => {
      if (!item.period || !item.target || !item.activity || !item.method || !item.responsible) {
        nextErrors[`monthly-${index}`] = "실행 계획의 필수 항목을 입력해주세요.";
      }
    });
    return nextErrors;
  };

  const validateCounseling = (info: CounselingInfo) => {
    const nextErrors: Record<string, string> = {};
    if (!info.schoolCounseling.trim()) nextErrors.schoolCounseling = "학교 내 상담 체계를 입력해주세요.";
    if (!info.reportingMethods.trim()) nextErrors.reportingMethods = "신고 방법 안내를 입력해주세요.";
    if (!info.emergencyResponse.trim()) nextErrors.emergencyResponse = "긴급 대응 체계를 입력해주세요.";
    return nextErrors;
  };

  const validateBudget = (info: BudgetInfo) => {
    const nextErrors: Record<string, string> = {};
    if (!info.budgetPlan.trim()) nextErrors.budgetPlan = "예산 계획을 입력해주세요.";
    return nextErrors;
  };

  const validateEvaluation = (info: EvaluationInfo) => {
    const nextErrors: Record<string, string> = {};
    if (!info.timing.trim()) nextErrors.timing = "평가 시기를 입력해주세요.";
    if (!info.methods.trim()) nextErrors.methods = "평가 방법을 입력해주세요.";
    if (!info.indicators.trim()) nextErrors.indicators = "평가 지표를 입력해주세요.";
    if (!info.feedback.trim()) nextErrors.feedback = "환류 계획을 입력해주세요.";
    return nextErrors;
  };

  const stepValidators = [
    () => validateBasicInfo(basicInfo),
    () => validateAnalysis(analysis),
    () => validateGoals(goals),
    () => validateStudentEducation(studentEducation),
    () => validateTeacherTraining(teacherTraining, teacherTrainingTimes),
    () => validateParentEducation(parentEducation, parentEducationTimes),
    () => validateMonthlyPlan(monthlyPlan),
    () => validateCounseling(counseling),
    () => validateBudget(budget),
    () => validateEvaluation(evaluation),
  ];

  const buildInputs = () => {
    const basicInfoText = [
      `학교명: ${basicInfo.schoolName || "(미입력)"}`,
      `학교급: ${basicInfo.schoolLevel === "elementary" ? "초등학교" : basicInfo.schoolLevel === "middle" ? "중학교" : "고등학교"}`,
      `계획서 유형: ${basicInfo.planType === "annual" ? "연간 계획" : "학기별 계획"}`,
      `전체 학생 수: ${basicInfo.studentCount || "(미입력)"}명`,
      `학급 수: ${basicInfo.classCount || "(미입력)"}학급`,
      `교원 수: ${basicInfo.teacherCount || "(미입력)"}명`,
      `계획 기간: ${basicInfo.periodStart || "(미입력)"} ~ ${basicInfo.periodEnd || "(미입력)"}`,
      `작성자: ${basicInfo.author || "(미입력)"}`,
      `부서: ${basicInfo.department || "(미입력)"}`,
      `연락처: ${basicInfo.contact || "(미입력)"}`,
    ].join("\n");

    const analysisText = [
      `전년도 발생 건수: ${analysis.previousIncidents || "(미입력)"}`,
      `주요 발생 유형: ${analysis.incidentTypes.join(", ") || "(미입력)"}`,
      `학교 특성 및 환경: ${analysis.schoolCharacteristics || "(미입력)"}`,
      `전년도 교육 평가: ${analysis.previousEvaluation || "(미입력)"}`,
      `개선 필요 사항: ${analysis.improvements || "(미입력)"}`,
    ].join("\n");

    const goalsText = [
      `교육 목표: ${goals.goals || "(미입력)"}`,
      `운영 방침: ${goals.policy || "(미입력)"}`,
      `중점 추진 과제: ${goals.keyTasks || "(미입력)"}`,
      `기대 효과: ${goals.expectedEffects || "(미입력)"}`,
    ].join("\n");

    const gradeEducationText = studentEducation.gradeEducation
      .map((item, index) => {
        const totalHours =
          Number(item.semester1Hours || 0) + Number(item.semester2Hours || 0);
        return `${index + 1}. ${item.grade || "(미입력)"} / 1학기 ${item.semester1Times || "(미입력)"}회 ${
          item.semester1Hours || "(미입력)"
        }시간 / 2학기 ${item.semester2Times || "(미입력)"}회 ${
          item.semester2Hours || "(미입력)"
        }시간 / 연간 ${totalHours}시간`;
      })
      .join("\n");

    const studentEducationText = [
      `학기당 교육 횟수: ${studentEducation.timesPerSemester || "(미입력)"}회`,
      `학년별 교육 시간: \n${gradeEducationText || "(미입력)"}`,
      `주요 교육 내용: ${studentEducation.mainContent || "(미입력)"}`,
      `교육 방법: ${studentEducation.methods.join(", ") || "(미입력)"}`,
      `교육 자료: ${studentEducation.materials || "(미입력)"}`,
      `특별 프로그램: ${studentEducation.specialProgram || "(미입력)"}`,
    ].join("\n");

    const teacherTrainingText = [
      `연수 횟수: ${teacherTrainingTimes || "(미입력)"}회`,
      ...teacherTraining.map((item, index) => {
        return `${index + 1}. ${item.date || "(미입력)"} / ${item.topic || "(미입력)"} / ${
          item.target || "(미입력)"
        } / ${item.hours || "(미입력)"}시간 / ${item.instructor || "(미입력)"}${item.notes ? ` / ${item.notes}` : ""}`;
      }),
    ].join("\n");

    const parentEducationText = [
      `교육 횟수: ${parentEducationTimes || "(미입력)"}회`,
      ...parentEducation.map((item, index) => {
        return `${index + 1}. ${item.date || "(미입력)"} / ${item.topic || "(미입력)"} / ${
          item.target || "(미입력)"
        } / ${item.hours || "(미입력)"}시간 / ${item.method || "(미입력)"}${item.notes ? ` / ${item.notes}` : ""}`;
      }),
    ].join("\n");

    const monthlyPlanText = monthlyPlan
      .map((item, index) => {
        return `${index + 1}. ${item.period || "(미입력)"} / ${item.target || "(미입력)"} / ${
          item.activity || "(미입력)"
        } / ${item.method || "(미입력)"} / ${item.responsible || "(미입력)"}${item.notes ? ` / ${item.notes}` : ""}`;
      })
      .join("\n");

    const counselingText = [
      `학교 내 상담 체계: ${counseling.schoolCounseling || "(미입력)"}`,
      `신고 방법 안내: ${counseling.reportingMethods || "(미입력)"}`,
      `긴급 대응 체계: ${counseling.emergencyResponse || "(미입력)"}`,
      `외부 연계 기관: ${counseling.externalPartners || "(미입력)"}`,
    ].join("\n");

    const budgetText = [
      `예산 계획: ${budget.budgetPlan || "(미입력)"}`,
      `교육 시설: ${budget.facilities || "(미입력)"}`,
      `교육 자료 현황: ${budget.materials || "(미입력)"}`,
    ].join("\n");

    const evaluationText = [
      `평가 시기: ${evaluation.timing || "(미입력)"}`,
      `평가 방법: ${evaluation.methods || "(미입력)"}`,
      `평가 지표: ${evaluation.indicators || "(미입력)"}`,
      `환류 계획: ${evaluation.feedback || "(미입력)"}`,
      `폭력 발생률 감소 목표: ${evaluation.targetReduction || "(미입력)"}`,
    ].join("\n");

    return {
      title: documentTitle,
      basicInfo: basicInfoText,
      analysis: analysisText,
      goalsAndPolicy: goalsText,
      studentEducation: studentEducationText,
      teacherTraining: teacherTrainingText,
      parentEducation: parentEducationText,
      monthlyPlan: monthlyPlanText,
      counselingSystem: counselingText,
      budget: budgetText,
      evaluation: evaluationText,
    };
  };

  const buildDocumentContent = () => {
    const inputs = buildInputs();
    const { title: _title, ...sections } = inputs;
    const labels: Record<string, string> = {
      basicInfo: "기본 현황",
      analysis: "현황 분석",
      goalsAndPolicy: "교육 목표 및 방침",
      studentEducation: "학생 대상 교육 계획",
      teacherTraining: "교직원 연수 계획",
      parentEducation: "학부모 교육 계획",
      monthlyPlan: "월별/분기별 실행 계획",
      counselingSystem: "상담 및 신고 체계",
      budget: "예산 및 인프라",
      evaluation: "평가 및 환류",
    };

    return Object.entries(sections)
      .map(([key, value]) => {
        const label = labels[key] ?? key;
        return `[${label}]\n${value}`;
      })
      .join("\n\n");
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/documents/generate", {
        documentType: "학교폭력 예방 교육 계획서",
        inputs: buildInputs(),
        uploadedTemplateId: referenceFileId ?? undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "문서 생성 완료",
        description: "학교폭력 예방 교육 계획서가 생성되었습니다.",
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

  const saveMutation = useMutation({
    mutationFn: async (status: "draft" | "completed") => {
      const response = await apiRequest("POST", "/api/documents", {
        documentType: "학교폭력 예방 교육 계획서",
        title: documentTitle,
        schoolName: basicInfo.schoolName,
        metadata: {
          planType: basicInfo.planType,
          schoolLevel: basicInfo.schoolLevel,
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

  const handleNext = () => {
    setStep((prev) => Math.min(prev + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrev = () => {
    setErrors({});
    setStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  const legalSemesterMet = Number(studentEducation.timesPerSemester || 0) >= 1;
  const legalTeacherMet = Number(teacherTrainingTimes || 0) >= 1;
  const legalParentMet = Number(parentEducationTimes || 0) >= 1;

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
              <h1 className="text-lg font-semibold text-foreground">학교폭력 예방 교육 계획서 작성</h1>
              <p className="text-sm text-muted-foreground">단계별로 정보를 입력하면 계획서를 생성합니다</p>
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
                  <Scale className="w-4 h-4 text-primary" />
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
              <CardTitle>기본 정보</CardTitle>
              <CardDescription>학교폭력 예방 계획서의 기본 정보를 입력하세요.</CardDescription>
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
                    placeholder="예: ○○중학교"
                  />
                  {renderError("schoolName")}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">학교급</label>
                  <RadioGroup
                    value={basicInfo.schoolLevel}
                    onValueChange={(value) => {
                      const next = { ...basicInfo, schoolLevel: value as SchoolLevel };
                      setBasicInfo(next);
                      handleSchoolLevelChange(value as SchoolLevel);
                      setErrors(validateBasicInfo(next));
                    }}
                    className="flex flex-wrap gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="elementary" id="school-level-elementary" />
                      <label htmlFor="school-level-elementary" className="text-sm">
                        초등학교
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="middle" id="school-level-middle" />
                      <label htmlFor="school-level-middle" className="text-sm">
                        중학교
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="high" id="school-level-high" />
                      <label htmlFor="school-level-high" className="text-sm">
                        고등학교
                      </label>
                    </div>
                  </RadioGroup>
                  {renderError("schoolLevel")}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">계획서 유형</label>
                <RadioGroup
                  value={basicInfo.planType}
                  onValueChange={(value) => {
                    const next = { ...basicInfo, planType: value as PlanType };
                    setBasicInfo(next);
                    setErrors(validateBasicInfo(next));
                  }}
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="annual" id="plan-type-annual" />
                    <label htmlFor="plan-type-annual" className="text-sm">
                      연간 계획
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="semester" id="plan-type-semester" />
                    <label htmlFor="plan-type-semester" className="text-sm">
                      학기별 계획
                    </label>
                  </div>
                </RadioGroup>
                {renderError("planType")}
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">전체 학생 수</label>
                  <Input
                    type="number"
                    value={basicInfo.studentCount}
                    onChange={(event) => {
                      const next = { ...basicInfo, studentCount: event.target.value };
                      setBasicInfo(next);
                      setErrors(validateBasicInfo(next));
                    }}
                    placeholder="예: 600"
                  />
                  {renderError("studentCount")}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">학급 수</label>
                  <Input
                    type="number"
                    value={basicInfo.classCount}
                    onChange={(event) => {
                      const next = { ...basicInfo, classCount: event.target.value };
                      setBasicInfo(next);
                      setErrors(validateBasicInfo(next));
                    }}
                    placeholder="예: 20"
                  />
                  {renderError("classCount")}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">교원 수</label>
                  <Input
                    type="number"
                    value={basicInfo.teacherCount}
                    onChange={(event) => {
                      const next = { ...basicInfo, teacherCount: event.target.value };
                      setBasicInfo(next);
                      setErrors(validateBasicInfo(next));
                    }}
                    placeholder="예: 45"
                  />
                  {renderError("teacherCount")}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">계획 기간</label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="date"
                      value={basicInfo.periodStart}
                      onChange={(event) => {
                        const next = { ...basicInfo, periodStart: event.target.value };
                        setBasicInfo(next);
                        setErrors(validateBasicInfo(next));
                      }}
                    />
                    <Input
                      type="date"
                      value={basicInfo.periodEnd}
                      onChange={(event) => {
                        const next = { ...basicInfo, periodEnd: event.target.value };
                        setBasicInfo(next);
                        setErrors(validateBasicInfo(next));
                      }}
                    />
                  </div>
                  {renderError("period")}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">연락처</label>
                  <Input
                    value={basicInfo.contact}
                    onChange={(event) => {
                      const next = { ...basicInfo, contact: formatPhoneNumber(event.target.value) };
                      setBasicInfo(next);
                      setErrors(validateBasicInfo(next));
                    }}
                    placeholder="예: 010-1234-5678"
                  />
                  {renderError("contact")}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">작성자</label>
                  <Input
                    value={basicInfo.author}
                    onChange={(event) => {
                      const next = { ...basicInfo, author: event.target.value };
                      setBasicInfo(next);
                      setErrors(validateBasicInfo(next));
                    }}
                    placeholder="예: 홍길동"
                  />
                  {renderError("author")}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">부서</label>
                  <Input
                    value={basicInfo.department}
                    onChange={(event) => {
                      const next = { ...basicInfo, department: event.target.value };
                      setBasicInfo(next);
                      setErrors(validateBasicInfo(next));
                    }}
                    placeholder="예: 학생생활부"
                  />
                  {renderError("department")}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

            {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>현황 분석</CardTitle>
              <CardDescription>학교폭력 현황을 분석해 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">전년도 학교폭력 발생 건수 (선택)</label>
                  <Input
                    type="number"
                    value={analysis.previousIncidents}
                    onChange={(event) => setAnalysis((prev) => ({ ...prev, previousIncidents: event.target.value }))}
                    placeholder="예: 5"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">주요 발생 유형 (선택)</label>
                  <div className="flex flex-wrap gap-4">
                    {incidentTypeOptions.map((type) => (
                      <div key={type} className="flex items-center gap-2">
                        <Checkbox
                          id={`incident-${type}`}
                          checked={analysis.incidentTypes.includes(type)}
                          onCheckedChange={() => toggleIncidentType(type)}
                        />
                        <label htmlFor={`incident-${type}`} className="text-sm">
                          {type}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">학교 특성 및 환경</label>
                  <AIGenerateButton
                    fieldName="schoolCharacteristics"
                    context={{ ...aiContext, currentValue: analysis.schoolCharacteristics }}
                    onGenerated={(text) => setAnalysis((prev) => ({ ...prev, schoolCharacteristics: text }))}
                    endpoint="/api/bullying-prevention-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.schoolLevel}
                  />
                </div>
                <Textarea
                  rows={5}
                  value={analysis.schoolCharacteristics}
                  onChange={(event) => {
                    const next = { ...analysis, schoolCharacteristics: event.target.value };
                    setAnalysis(next);
                    setErrors(validateAnalysis(next));
                  }}
                />
                {renderError("schoolCharacteristics")}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">전년도 교육 평가 (선택)</label>
                  <AIGenerateButton
                    fieldName="previousEvaluation"
                    context={{ ...aiContext, currentValue: analysis.previousEvaluation }}
                    onGenerated={(text) => setAnalysis((prev) => ({ ...prev, previousEvaluation: text }))}
                    endpoint="/api/bullying-prevention-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.schoolLevel}
                  />
                </div>
                <Textarea
                  rows={4}
                  value={analysis.previousEvaluation}
                  onChange={(event) => setAnalysis((prev) => ({ ...prev, previousEvaluation: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">개선 필요 사항 (선택)</label>
                  <AIGenerateButton
                    fieldName="improvements"
                    context={{ ...aiContext, currentValue: analysis.improvements }}
                    onGenerated={(text) => setAnalysis((prev) => ({ ...prev, improvements: text }))}
                    endpoint="/api/bullying-prevention-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.schoolLevel}
                  />
                </div>
                <Textarea
                  rows={4}
                  value={analysis.improvements}
                  onChange={(event) => setAnalysis((prev) => ({ ...prev, improvements: event.target.value }))}
                />
              </div>
            </CardContent>
          </Card>
        )}

            {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>교육 목표 및 방침</CardTitle>
              <CardDescription>예방교육의 목표와 방침을 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: "goals", label: "교육 목표", rows: 5 },
                { key: "policy", label: "운영 방침", rows: 4 },
                { key: "keyTasks", label: "중점 추진 과제", rows: 4 },
                { key: "expectedEffects", label: "기대 효과", rows: 4 },
              ].map((field) => (
                <div key={field.key} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-sm font-medium">{field.label}</label>
                    <AIGenerateButton
                      fieldName={field.key}
                      context={{ ...aiContext, currentValue: goals[field.key as keyof GoalsInfo] }}
                      onGenerated={(text) => setGoals((prev) => ({ ...prev, [field.key]: text }))}
                      endpoint="/api/bullying-prevention-plan/generate-ai-content"
                      documentType="care"
                      disabled={!basicInfo.schoolName || !basicInfo.schoolLevel}
                    />
                  </div>
                  <Textarea
                    rows={field.rows}
                    value={goals[field.key as keyof GoalsInfo]}
                    onChange={(event) => {
                      const next = { ...goals, [field.key]: event.target.value };
                      setGoals(next);
                      setErrors(validateGoals(next));
                    }}
                  />
                  {renderError(field.key)}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

            {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>학생 대상 교육 계획</CardTitle>
              <CardDescription>학기당 1회 이상 교육이 필요합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">학기당 교육 횟수</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={studentEducation.timesPerSemester}
                    onChange={(event) => {
                      const next = { ...studentEducation, timesPerSemester: event.target.value };
                      setStudentEducation(next);
                      setErrors(validateStudentEducation(next));
                    }}
                    placeholder="예: 2"
                    className="w-32"
                  />
                  <span className={`text-sm font-medium ${legalSemesterMet ? "text-emerald-600" : "text-amber-600"}`}>
                    {legalSemesterMet ? "✅ 법정 요건 충족" : "⚠️ 학기당 1회 이상 필요"}
                  </span>
                </div>
                {renderError("timesPerSemester")}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">학년별 교육 시간 배정</label>
                  <Button type="button" variant="outline" size="sm" onClick={addGradeEducation}>
                    <Plus className="w-4 h-4 mr-1" /> 학년 추가
                  </Button>
                </div>
                {studentEducation.gradeEducation.map((item, index) => {
                  const totalHours =
                    Number(item.semester1Hours || 0) + Number(item.semester2Hours || 0);
                  return (
                    <div key={`grade-${index}`} className="border border-border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">{item.grade || `학년 ${index + 1}`}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={studentEducation.gradeEducation.length <= 1}
                          onClick={() => removeGradeEducation(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">학년</label>
                          <Input
                            value={item.grade}
                            onChange={(event) => updateGradeEducation(index, { grade: event.target.value })}
                            placeholder="예: 1학년"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">1학기 횟수</label>
                          <Input
                            type="number"
                            value={item.semester1Times}
                            onChange={(event) => updateGradeEducation(index, { semester1Times: event.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">1학기 시간</label>
                          <Input
                            type="number"
                            value={item.semester1Hours}
                            onChange={(event) => updateGradeEducation(index, { semester1Hours: event.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">2학기 횟수</label>
                          <Input
                            type="number"
                            value={item.semester2Times}
                            onChange={(event) => updateGradeEducation(index, { semester2Times: event.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">2학기 시간</label>
                          <Input
                            type="number"
                            value={item.semester2Hours}
                            onChange={(event) => updateGradeEducation(index, { semester2Hours: event.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">연간 총 시간 (자동)</label>
                          <Input value={totalHours.toString()} readOnly />
                        </div>
                      </div>
                      {renderError(`grade-${index}`)}
                    </div>
                  );
                })}
                {renderError("gradeEducation")}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">주요 교육 내용</label>
                  <AIGenerateButton
                    fieldName="mainContent"
                    context={{ ...aiContext, currentValue: studentEducation.mainContent }}
                    onGenerated={(text) => setStudentEducation((prev) => ({ ...prev, mainContent: text }))}
                    endpoint="/api/bullying-prevention-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.schoolLevel}
                  />
                </div>
                <Textarea
                  rows={5}
                  value={studentEducation.mainContent}
                  onChange={(event) => {
                    const next = { ...studentEducation, mainContent: event.target.value };
                    setStudentEducation(next);
                    setErrors(validateStudentEducation(next));
                  }}
                />
                {renderError("mainContent")}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">교육 방법</label>
                <div className="flex flex-wrap gap-4">
                  {studentMethodOptions.map((method) => (
                    <div key={method} className="flex items-center gap-2">
                      <Checkbox
                        id={`method-${method}`}
                        checked={studentEducation.methods.includes(method)}
                        onCheckedChange={() => {
                          toggleMethod(method);
                          setErrors(validateStudentEducation({ ...studentEducation }));
                        }}
                      />
                      <label htmlFor={`method-${method}`} className="text-sm">
                        {method}
                      </label>
                    </div>
                  ))}
                </div>
                {renderError("methods")}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">교육 자료 (선택)</label>
                <Input
                  value={studentEducation.materials}
                  onChange={(event) => setStudentEducation((prev) => ({ ...prev, materials: event.target.value }))}
                  placeholder="예: 학교폭력 예방 표준 교재"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">특별 프로그램 (선택)</label>
                  <AIGenerateButton
                    fieldName="specialProgram"
                    context={{ ...aiContext, currentValue: studentEducation.specialProgram }}
                    onGenerated={(text) => setStudentEducation((prev) => ({ ...prev, specialProgram: text }))}
                    endpoint="/api/bullying-prevention-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.schoolLevel}
                  />
                </div>
                <Textarea
                  rows={4}
                  value={studentEducation.specialProgram}
                  onChange={(event) => setStudentEducation((prev) => ({ ...prev, specialProgram: event.target.value }))}
                />
              </div>
            </CardContent>
          </Card>
        )}

            {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>교직원 대상 연수 계획</CardTitle>
              <CardDescription>연간 1회 이상 연수가 필요합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">연수 횟수</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={teacherTrainingTimes}
                    onChange={(event) => {
                      setTeacherTrainingTimes(event.target.value);
                      setErrors(validateTeacherTraining(teacherTraining, event.target.value));
                    }}
                    className="w-32"
                  />
                  <span className={`text-sm font-medium ${legalTeacherMet ? "text-emerald-600" : "text-amber-600"}`}>
                    {legalTeacherMet ? "✅ 법정 요건 충족" : "⚠️ 연간 1회 이상 필요"}
                  </span>
                </div>
                {renderError("teacherTrainingTimes")}
              </div>

              {teacherTraining.map((item, index) => (
                <div key={`teacher-${index}`} className="border border-border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">연수 {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={teacherTraining.length <= 1}
                      onClick={() => removeTeacherTraining(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">연수 일자</label>
                      <Input
                        type="date"
                        value={item.date}
                        onChange={(event) => updateTeacherTraining(index, { date: event.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">연수 주제</label>
                      <Input
                        value={item.topic}
                        onChange={(event) => updateTeacherTraining(index, { topic: event.target.value })}
                        placeholder="연수 주제"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">대상</label>
                      <Input
                        value={item.target}
                        onChange={(event) => updateTeacherTraining(index, { target: event.target.value })}
                        placeholder="대상자"
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">시간</label>
                      <Input
                        type="number"
                        value={item.hours}
                        onChange={(event) => updateTeacherTraining(index, { hours: event.target.value })}
                        placeholder="시간"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">강사</label>
                      <Input
                        value={item.instructor}
                        onChange={(event) => updateTeacherTraining(index, { instructor: event.target.value })}
                        placeholder="강사명"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">비고</label>
                      <Input
                        value={item.notes}
                        onChange={(event) => updateTeacherTraining(index, { notes: event.target.value })}
                        placeholder="비고"
                      />
                    </div>
                  </div>
                  {renderError(`teacher-${index}`)}
                </div>
              ))}

              <div className="flex items-center justify-between">
                <Button type="button" variant="outline" onClick={addTeacherTraining}>
                  <Plus className="w-4 h-4 mr-2" /> 연수 추가
                </Button>
                {renderError("teacherTrainingCount")}
              </div>
            </CardContent>
          </Card>
        )}

            {step === 5 && (
          <Card>
            <CardHeader>
              <CardTitle>학부모 대상 교육 계획</CardTitle>
              <CardDescription>연간 1회 이상 교육이 필요합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">교육 횟수</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={parentEducationTimes}
                    onChange={(event) => {
                      setParentEducationTimes(event.target.value);
                      setErrors(validateParentEducation(parentEducation, event.target.value));
                    }}
                    className="w-32"
                  />
                  <span className={`text-sm font-medium ${legalParentMet ? "text-emerald-600" : "text-amber-600"}`}>
                    {legalParentMet ? "✅ 법정 요건 충족" : "⚠️ 연간 1회 이상 필요"}
                  </span>
                </div>
                {renderError("parentEducationTimes")}
              </div>

              {parentEducation.map((item, index) => (
                <div key={`parent-${index}`} className="border border-border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">교육 {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={parentEducation.length <= 1}
                      onClick={() => removeParentEducation(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">교육 일자</label>
                      <Input
                        type="date"
                        value={item.date}
                        onChange={(event) => updateParentEducation(index, { date: event.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">교육 주제</label>
                      <Input
                        value={item.topic}
                        onChange={(event) => updateParentEducation(index, { topic: event.target.value })}
                        placeholder="교육 주제"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">대상</label>
                      <Input
                        value={item.target}
                        onChange={(event) => updateParentEducation(index, { target: event.target.value })}
                        placeholder="대상자"
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">시간</label>
                      <Input
                        type="number"
                        value={item.hours}
                        onChange={(event) => updateParentEducation(index, { hours: event.target.value })}
                        placeholder="시간"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">방법</label>
                      <Input
                        value={item.method}
                        onChange={(event) => updateParentEducation(index, { method: event.target.value })}
                        placeholder="예: 온라인 연수"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">비고</label>
                      <Input
                        value={item.notes}
                        onChange={(event) => updateParentEducation(index, { notes: event.target.value })}
                        placeholder="비고"
                      />
                    </div>
                  </div>
                  {renderError(`parent-${index}`)}
                </div>
              ))}

              <div className="flex items-center justify-between">
                <Button type="button" variant="outline" onClick={addParentEducation}>
                  <Plus className="w-4 h-4 mr-2" /> 교육 추가
                </Button>
                {renderError("parentEducationCount")}
              </div>
            </CardContent>
          </Card>
        )}

            {step === 6 && (
          <Card>
            <CardHeader>
              <CardTitle>월별/분기별 세부 실행 계획</CardTitle>
              <CardDescription>최소 5개 이상의 실행 계획이 필요합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {monthlyPlan.map((item, index) => (
                <div key={`monthly-${index}`} className="border border-border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">실행 계획 {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={monthlyPlan.length <= 5}
                      onClick={() => removeMonthlyPlan(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">월/분기</label>
                      <Input
                        value={item.period}
                        onChange={(event) => updateMonthlyPlan(index, { period: event.target.value })}
                        placeholder="예: 3월"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">대상</label>
                      <Input
                        value={item.target}
                        onChange={(event) => updateMonthlyPlan(index, { target: event.target.value })}
                        placeholder="예: 전체 학생"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">활동 내용</label>
                      <Input
                        value={item.activity}
                        onChange={(event) => updateMonthlyPlan(index, { activity: event.target.value })}
                        placeholder="활동 내용"
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">추진 방법</label>
                      <Input
                        value={item.method}
                        onChange={(event) => updateMonthlyPlan(index, { method: event.target.value })}
                        placeholder="추진 방법"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">담당</label>
                      <Input
                        value={item.responsible}
                        onChange={(event) => updateMonthlyPlan(index, { responsible: event.target.value })}
                        placeholder="담당 부서/교사"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">비고</label>
                      <Input
                        value={item.notes}
                        onChange={(event) => updateMonthlyPlan(index, { notes: event.target.value })}
                        placeholder="비고"
                      />
                    </div>
                  </div>
                  {renderError(`monthly-${index}`)}
                </div>
              ))}

              <div className="flex items-center justify-between">
                <Button type="button" variant="outline" onClick={addMonthlyPlan}>
                  <Plus className="w-4 h-4 mr-2" /> 계획 추가
                </Button>
                {renderError("monthlyPlanCount")}
              </div>
            </CardContent>
          </Card>
        )}

            {step === 7 && (
          <Card>
            <CardHeader>
              <CardTitle>상담 및 신고 체계</CardTitle>
              <CardDescription>학교폭력 상담 및 신고 체계를 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: "schoolCounseling", label: "학교 내 상담 체계", rows: 5 },
                { key: "reportingMethods", label: "신고 방법 안내", rows: 5 },
                { key: "emergencyResponse", label: "긴급 대응 체계", rows: 5 },
                { key: "externalPartners", label: "외부 연계 기관 (선택)", rows: 4 },
              ].map((field) => (
                <div key={field.key} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-sm font-medium">{field.label}</label>
                    <AIGenerateButton
                      fieldName={field.key}
                      context={{ ...aiContext, currentValue: counseling[field.key as keyof CounselingInfo] }}
                      onGenerated={(text) => setCounseling((prev) => ({ ...prev, [field.key]: text }))}
                      endpoint="/api/bullying-prevention-plan/generate-ai-content"
                      documentType="care"
                      disabled={!basicInfo.schoolName || !basicInfo.schoolLevel}
                    />
                  </div>
                  <Textarea
                    rows={field.rows}
                    value={counseling[field.key as keyof CounselingInfo]}
                    onChange={(event) => {
                      const next = { ...counseling, [field.key]: event.target.value };
                      setCounseling(next);
                      setErrors(validateCounseling(next));
                    }}
                  />
                  {renderError(field.key)}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

            {step === 8 && (
          <Card>
            <CardHeader>
              <CardTitle>예산 및 인프라</CardTitle>
              <CardDescription>예방교육 예산 및 인프라를 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: "budgetPlan", label: "예산 계획", rows: 5 },
                { key: "facilities", label: "교육 시설 (선택)", rows: 4 },
                { key: "materials", label: "교육 자료 현황 (선택)", rows: 4 },
              ].map((field) => (
                <div key={field.key} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-sm font-medium">{field.label}</label>
                    <AIGenerateButton
                      fieldName={field.key}
                      context={{ ...aiContext, currentValue: budget[field.key as keyof BudgetInfo] }}
                      onGenerated={(text) => setBudget((prev) => ({ ...prev, [field.key]: text }))}
                      endpoint="/api/bullying-prevention-plan/generate-ai-content"
                      documentType="care"
                      disabled={!basicInfo.schoolName || !basicInfo.schoolLevel}
                    />
                  </div>
                  <Textarea
                    rows={field.rows}
                    value={budget[field.key as keyof BudgetInfo]}
                    onChange={(event) => {
                      const next = { ...budget, [field.key]: event.target.value };
                      setBudget(next);
                      setErrors(validateBudget(next));
                    }}
                  />
                  {renderError(field.key)}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

            {step === 9 && (
          <Card>
            <CardHeader>
              <CardTitle>평가 및 환류</CardTitle>
              <CardDescription>평가 및 개선 계획을 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">평가 시기</label>
                <Input
                  value={evaluation.timing}
                  onChange={(event) => {
                    const next = { ...evaluation, timing: event.target.value };
                    setEvaluation(next);
                    setErrors(validateEvaluation(next));
                  }}
                  placeholder="예: 중간평가 9월, 최종평가 2월"
                />
                {renderError("timing")}
              </div>

              {[
                { key: "methods", label: "평가 방법", rows: 4 },
                { key: "indicators", label: "평가 지표", rows: 4 },
                { key: "feedback", label: "환류 계획", rows: 4 },
              ].map((field) => (
                <div key={field.key} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-sm font-medium">{field.label}</label>
                    <AIGenerateButton
                      fieldName={`evaluation_${field.key}`}
                      context={{ ...aiContext, currentValue: evaluation[field.key as keyof EvaluationInfo] }}
                      onGenerated={(text) => setEvaluation((prev) => ({ ...prev, [field.key]: text }))}
                      endpoint="/api/bullying-prevention-plan/generate-ai-content"
                      documentType="care"
                      disabled={!basicInfo.schoolName || !basicInfo.schoolLevel}
                    />
                  </div>
                  <Textarea
                    rows={field.rows}
                    value={evaluation[field.key as keyof EvaluationInfo]}
                    onChange={(event) => {
                      const next = { ...evaluation, [field.key]: event.target.value };
                      setEvaluation(next);
                      setErrors(validateEvaluation(next));
                    }}
                  />
                  {renderError(field.key)}
                </div>
              ))}

              <div className="space-y-2">
                <label className="text-sm font-medium">폭력 발생률 감소 목표 (선택)</label>
                <Input
                  value={evaluation.targetReduction}
                  onChange={(event) => setEvaluation((prev) => ({ ...prev, targetReduction: event.target.value }))}
                  placeholder="예: 전년 대비 30% 감소"
                />
              </div>
            </CardContent>
          </Card>
        )}

            <HwpReferenceUpload
              onUploaded={(fileId) => setReferenceFileId(fileId)}
              onClear={() => setReferenceFileId(null)}
            />

            <div className="flex items-center justify-between pt-4">
              <Button type="button" variant="outline" onClick={handlePrev} disabled={step === 0}>
                이전
              </Button>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => saveMutation.mutate("draft")} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "저장 중..." : "임시 저장"}
                </Button>
                <Button type="button" variant="outline" onClick={() => saveMutation.mutate("completed")} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "저장 중..." : "문서 저장"}
                </Button>
                {step < steps.length - 1 ? (
                  <Button type="button" onClick={handleNext}>
                    다음 단계
                  </Button>
                ) : (
                  <Button type="button" onClick={handleGenerate} disabled={generateMutation.isPending}>
                    {generateMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 생성 중...
                      </>
                    ) : (
                      "생성하기"
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
