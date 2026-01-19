import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Loader2, Plus, Trash2, Sparkles } from "lucide-react";
import { AIGenerateButton } from "@/components/AIGenerateButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { HwpReferenceUpload } from "@/components/HwpReferenceUpload";

type SchoolLevel = "elementary" | "middle" | "high" | "";
type PlanType = "annual" | "semester" | "";
type EducationMethod = "강의식" | "체험식" | "시청각" | "토론" | "프로젝트";
type AreaKey =
  | "lifeSafety"
  | "trafficSafety"
  | "violenceSafety"
  | "drugsCyberSafety"
  | "disasterSafety"
  | "jobSafety"
  | "firstAid";

interface BasicInfo {
  schoolName: string;
  schoolLevel: SchoolLevel;
  planType: PlanType;
  targetGrades: string[];
  studentCount: string;
  periodStart: string;
  periodEnd: string;
  author: string;
  department: string;
  contact: string;
}

interface GoalsAndPolicy {
  goals: string;
  policy: string;
  keyPoints: string;
  improvements: string;
}

interface SafetyAreaPlan {
  hours: string;
  content: string;
  methods: EducationMethod[];
  materials: string;
  evaluation: string;
}

interface MonthlyPlanItem {
  month: string;
  area: string;
  topic: string;
  target: string;
  hours: string;
  instructor: string;
  notes: string;
}

interface Infrastructure {
  facilities: string;
  materials: string;
  experts: string;
  budget: string;
  committee: string;
}

interface TeacherTrainingItem {
  name: string;
  target: string;
  period: string;
  hours: string;
  content: string;
  method: string;
}

interface EvaluationPlan {
  timing: string;
  methods: string;
  indicators: string;
  feedback: string;
  accidentGoal: string;
}

interface OthersPlan {
  homeConnection: string;
  communityConnection: string;
  specialProgram: string;
  campaign: string;
}

const steps = [
  "기본 정보",
  "안전교육 목표 및 방침",
  "7대 안전교육 영역별 계획",
  "월별/학기별 실행 계획",
  "교육 인프라 및 지원 체계",
  "교직원 안전 연수 계획",
  "평가 및 환류 계획",
  "기타 사항",
];

const gradeOptionsByLevel: Record<Exclude<SchoolLevel, "">, string[]> = {
  elementary: ["1학년", "2학년", "3학년", "4학년", "5학년", "6학년"],
  middle: ["1학년", "2학년", "3학년"],
  high: ["1학년", "2학년", "3학년"],
};

const areaLabels: Record<AreaKey, string> = {
  lifeSafety: "생활안전",
  trafficSafety: "교통안전",
  violenceSafety: "폭력 및 신변안전",
  drugsCyberSafety: "약물 및 사이버중독",
  disasterSafety: "재난안전",
  jobSafety: "직업안전",
  firstAid: "응급처치",
};

const requiredHoursByLevel: Record<Exclude<SchoolLevel, "">, Record<AreaKey, number>> = {
  elementary: {
    lifeSafety: 10,
    trafficSafety: 10,
    violenceSafety: 8,
    drugsCyberSafety: 10,
    disasterSafety: 6,
    jobSafety: 0,
    firstAid: 2,
  },
  middle: {
    lifeSafety: 7,
    trafficSafety: 7,
    violenceSafety: 8,
    drugsCyberSafety: 10,
    disasterSafety: 6,
    jobSafety: 0,
    firstAid: 2,
  },
  high: {
    lifeSafety: 5,
    trafficSafety: 5,
    violenceSafety: 8,
    drugsCyberSafety: 10,
    disasterSafety: 6,
    jobSafety: 5,
    firstAid: 2,
  },
};

const monthOptions = [
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
  "1월",
  "2월",
];

const educationMethods: EducationMethod[] = ["강의식", "체험식", "시청각", "토론", "프로젝트"];

const emptyAreaPlan = (): SafetyAreaPlan => ({
  hours: "",
  content: "",
  methods: [],
  materials: "",
  evaluation: "",
});

const emptyMonthlyPlan = (): MonthlyPlanItem => ({
  month: "",
  area: "",
  topic: "",
  target: "",
  hours: "",
  instructor: "",
  notes: "",
});

const emptyTrainingItem = (): TeacherTrainingItem => ({
  name: "",
  target: "",
  period: "",
  hours: "",
  content: "",
  method: "",
});

export default function SafetyEducationPlanForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeArea, setActiveArea] = useState<AreaKey>("lifeSafety");
  const [basicInfo, setBasicInfo] = useState<BasicInfo>({
    schoolName: "",
    schoolLevel: "",
    planType: "",
    targetGrades: [],
    studentCount: "",
    periodStart: "",
    periodEnd: "",
    author: "",
    department: "",
    contact: "",
  });
  const [goalsAndPolicy, setGoalsAndPolicy] = useState<GoalsAndPolicy>({
    goals: "",
    policy: "",
    keyPoints: "",
    improvements: "",
  });
  const [safetyAreas, setSafetyAreas] = useState<Record<AreaKey, SafetyAreaPlan>>({
    lifeSafety: emptyAreaPlan(),
    trafficSafety: emptyAreaPlan(),
    violenceSafety: emptyAreaPlan(),
    drugsCyberSafety: emptyAreaPlan(),
    disasterSafety: emptyAreaPlan(),
    jobSafety: emptyAreaPlan(),
    firstAid: emptyAreaPlan(),
  });
  const [monthlyPlan, setMonthlyPlan] = useState<MonthlyPlanItem[]>([
    {
      month: "3월",
      area: "생활안전",
      topic: "학교 시설 안전",
      target: "전체",
      hours: "2",
      instructor: "",
      notes: "신학기",
    },
    {
      month: "3월",
      area: "교통안전",
      topic: "보행 안전",
      target: "전체",
      hours: "2",
      instructor: "",
      notes: "",
    },
    {
      month: "4월",
      area: "재난안전",
      topic: "지진 대피 훈련",
      target: "전체",
      hours: "2",
      instructor: "",
      notes: "",
    },
  ]);
  const [infrastructure, setInfrastructure] = useState<Infrastructure>({
    facilities: "",
    materials: "",
    experts: "",
    budget: "",
    committee: "",
  });
  const [teacherTraining, setTeacherTraining] = useState<TeacherTrainingItem[]>([emptyTrainingItem()]);
  const [evaluation, setEvaluation] = useState<EvaluationPlan>({
    timing: "",
    methods: "",
    indicators: "",
    feedback: "",
    accidentGoal: "",
  });
  const [others, setOthers] = useState<OthersPlan>({
    homeConnection: "",
    communityConnection: "",
    specialProgram: "",
    campaign: "",
  });
  const [referenceFileId, setReferenceFileId] = useState<number | null>(null);

  const progressValue = ((step + 1) / steps.length) * 100;
  const gradeOptions = basicInfo.schoolLevel ? gradeOptionsByLevel[basicInfo.schoolLevel] : [];
  const visibleAreas = useMemo(() => {
    const base: AreaKey[] = [
      "lifeSafety",
      "trafficSafety",
      "violenceSafety",
      "drugsCyberSafety",
      "disasterSafety",
      "firstAid",
    ];
    if (basicInfo.schoolLevel === "high") {
      return ["lifeSafety", "trafficSafety", "violenceSafety", "drugsCyberSafety", "disasterSafety", "jobSafety", "firstAid"];
    }
    return base;
  }, [basicInfo.schoolLevel]);

  const requiredHours = basicInfo.schoolLevel ? requiredHoursByLevel[basicInfo.schoolLevel] : null;

  const documentTitle = useMemo(() => {
    const year = basicInfo.periodStart ? basicInfo.periodStart.slice(0, 4) : new Date().getFullYear().toString();
    if (!basicInfo.schoolName) return "학교 안전교육 계획서";
    return `${basicInfo.schoolName} ${year}학년도 안전교육 계획서`;
  }, [basicInfo.periodStart, basicInfo.schoolName]);

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  const toggleGrade = (grade: string) => {
    const current = new Set(basicInfo.targetGrades);
    if (grade === "전체 학년") {
      if (current.has(grade)) {
        setBasicInfo((prev) => ({ ...prev, targetGrades: [] }));
      } else {
        setBasicInfo((prev) => ({ ...prev, targetGrades: ["전체 학년", ...gradeOptions] }));
      }
      return;
    }

    if (current.has(grade)) {
      current.delete(grade);
    } else {
      current.add(grade);
    }

    if (gradeOptions.length && gradeOptions.every((item) => current.has(item))) {
      current.add("전체 학년");
    } else {
      current.delete("전체 학년");
    }

    setBasicInfo((prev) => ({ ...prev, targetGrades: Array.from(current) }));
  };

  const updateSafetyArea = (areaKey: AreaKey, updates: Partial<SafetyAreaPlan>) => {
    setSafetyAreas((prev) => ({
      ...prev,
      [areaKey]: {
        ...prev[areaKey],
        ...updates,
      },
    }));
  };

  const updateMonthlyPlan = (index: number, updates: Partial<MonthlyPlanItem>) => {
    setMonthlyPlan((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...updates } : item)));
  };

  const addMonthlyPlan = () => {
    setMonthlyPlan((prev) => [...prev, emptyMonthlyPlan()]);
  };

  const removeMonthlyPlan = (index: number) => {
    if (monthlyPlan.length <= 10) return;
    setMonthlyPlan((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateTraining = (index: number, updates: Partial<TeacherTrainingItem>) => {
    setTeacherTraining((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...updates } : item)));
  };

  const addTraining = () => {
    setTeacherTraining((prev) => [...prev, emptyTrainingItem()]);
  };

  const removeTraining = (index: number) => {
    if (teacherTraining.length <= 1) return;
    setTeacherTraining((prev) => prev.filter((_, idx) => idx !== index));
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
    if (info.targetGrades.length < 1) {
      nextErrors.targetGrades = "대상 학년을 최소 1개 선택해주세요.";
    }
    const studentCount = Number(info.studentCount);
    if (Number.isNaN(studentCount) || studentCount < 1) {
      nextErrors.studentCount = "대상 학생 수는 1명 이상 입력해주세요.";
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

  const validateGoalsAndPolicy = (info: GoalsAndPolicy) => {
    const nextErrors: Record<string, string> = {};
    if (!info.goals.trim()) nextErrors.goals = "교육 목표를 입력해주세요.";
    if (!info.policy.trim()) nextErrors.policy = "운영 방침을 입력해주세요.";
    if (!info.keyPoints.trim()) nextErrors.keyPoints = "중점 추진 사항을 입력해주세요.";
    return nextErrors;
  };

  const validateSafetyAreas = (areas: Record<AreaKey, SafetyAreaPlan>) => {
    const nextErrors: Record<string, string> = {};
    visibleAreas.forEach((key) => {
      const area = areas[key];
      const hours = Number(area.hours);
      if (Number.isNaN(hours) || hours < 1) {
        nextErrors[`area-${key}-hours`] = "교육 시간을 입력해주세요.";
      }
      if (!area.content.trim()) {
        nextErrors[`area-${key}-content`] = "주요 교육 내용을 입력해주세요.";
      }
      if (!area.methods.length) {
        nextErrors[`area-${key}-methods`] = "교육 방법을 1개 이상 선택해주세요.";
      }
      if (!area.evaluation.trim()) {
        nextErrors[`area-${key}-evaluation`] = "평가 방법을 입력해주세요.";
      }
    });
    return nextErrors;
  };

  const validateMonthlyPlan = (items: MonthlyPlanItem[]) => {
    const nextErrors: Record<string, string> = {};
    if (items.length < 10) {
      nextErrors.monthlyPlanCount = "최소 10개 이상의 일정을 입력해 주세요.";
    }
    items.forEach((item, index) => {
      if (!item.month || !item.area || !item.topic || !item.target || !item.hours || !item.instructor) {
        nextErrors[`monthly-${index}`] = "모든 필수 항목을 입력해주세요.";
      }
    });
    return nextErrors;
  };

  const validateInfrastructure = (info: Infrastructure) => {
    const nextErrors: Record<string, string> = {};
    if (!info.facilities.trim()) nextErrors.facilities = "교육 시설을 입력해주세요.";
    if (!info.materials.trim()) nextErrors.materials = "교육 자료 현황을 입력해주세요.";
    if (!info.budget.trim()) nextErrors.budget = "예산 계획을 입력해주세요.";
    return nextErrors;
  };

  const validateTeacherTraining = (items: TeacherTrainingItem[]) => {
    const nextErrors: Record<string, string> = {};
    if (!items.length) {
      nextErrors.trainingCount = "최소 1개 이상의 연수 계획이 필요합니다.";
      return nextErrors;
    }
    items.forEach((item, index) => {
      if (!item.name || !item.target || !item.period || !item.hours || !item.content || !item.method) {
        nextErrors[`training-${index}`] = "연수 계획의 필수 항목을 모두 입력해주세요.";
      }
    });
    return nextErrors;
  };

  const validateEvaluation = (info: EvaluationPlan) => {
    const nextErrors: Record<string, string> = {};
    if (!info.timing.trim()) nextErrors.timing = "평가 시기를 입력해주세요.";
    if (!info.methods.trim()) nextErrors.methods = "평가 방법을 입력해주세요.";
    if (!info.indicators.trim()) nextErrors.indicators = "평가 지표를 입력해주세요.";
    if (!info.feedback.trim()) nextErrors.feedback = "환류 계획을 입력해주세요.";
    return nextErrors;
  };

  const validateOthers = () => ({});

  const stepValidators = [
    () => validateBasicInfo(basicInfo),
    () => validateGoalsAndPolicy(goalsAndPolicy),
    () => validateSafetyAreas(safetyAreas),
    () => validateMonthlyPlan(monthlyPlan),
    () => validateInfrastructure(infrastructure),
    () => validateTeacherTraining(teacherTraining),
    () => validateEvaluation(evaluation),
    () => validateOthers(),
  ];

  const areaHourTotals = useMemo(() => {
    return visibleAreas.reduce<Record<AreaKey, number>>((acc, key) => {
      const value = Number(safetyAreas[key]?.hours || 0);
      acc[key] = Number.isNaN(value) ? 0 : value;
      return acc;
    }, {
      lifeSafety: 0,
      trafficSafety: 0,
      violenceSafety: 0,
      drugsCyberSafety: 0,
      disasterSafety: 0,
      jobSafety: 0,
      firstAid: 0,
    });
  }, [safetyAreas, visibleAreas]);

  const monthlyHourTotals = useMemo(() => {
    const totals: Record<AreaKey, number> = {
      lifeSafety: 0,
      trafficSafety: 0,
      violenceSafety: 0,
      drugsCyberSafety: 0,
      disasterSafety: 0,
      jobSafety: 0,
      firstAid: 0,
    };
    monthlyPlan.forEach((item) => {
      const areaKey = Object.entries(areaLabels).find(([, label]) => label === item.area)?.[0] as AreaKey | undefined;
      if (!areaKey) return;
      const hours = Number(item.hours || 0);
      totals[areaKey] += Number.isNaN(hours) ? 0 : hours;
    });
    return totals;
  }, [monthlyPlan]);

  const totalAreaHours = visibleAreas.reduce((sum, key) => sum + (areaHourTotals[key] || 0), 0);
  const totalMonthlyHours = visibleAreas.reduce((sum, key) => sum + (monthlyHourTotals[key] || 0), 0);
  const hasHourMismatch = visibleAreas.some((key) => (areaHourTotals[key] || 0) !== (monthlyHourTotals[key] || 0));

  const buildInputs = () => {
    const gradeLabel = basicInfo.targetGrades.includes("전체 학년")
      ? "전체 학년"
      : basicInfo.targetGrades.join(", ");
    const basicInfoText = [
      `학교명: ${basicInfo.schoolName || "(미입력)"}`,
      `학교급: ${basicInfo.schoolLevel === "elementary" ? "초등학교" : basicInfo.schoolLevel === "middle" ? "중학교" : "고등학교"}`,
      `계획서 유형: ${basicInfo.planType === "annual" ? "연간 계획" : "학기별 계획"}`,
      `대상 학년: ${gradeLabel || "(미입력)"}`,
      `대상 학생 수: ${basicInfo.studentCount || "(미입력)"}명`,
      `계획 기간: ${basicInfo.periodStart || "(미입력)"} ~ ${basicInfo.periodEnd || "(미입력)"}`,
      `작성자: ${basicInfo.author || "(미입력)"}`,
      `부서: ${basicInfo.department || "(미입력)"}`,
      `연락처: ${basicInfo.contact || "(미입력)"}`,
    ].join("\n");

    const safetyAreaText = visibleAreas
      .map((key) => {
        const area = safetyAreas[key];
        return [
          `${areaLabels[key]} (${area.hours || "0"}시간)`,
          `- 주요 교육 내용: ${area.content || "(미입력)"}`,
          `- 교육 방법: ${area.methods.length ? area.methods.join(", ") : "(미입력)"}`,
          `- 교육 자료: ${area.materials || "(미입력)"}`,
          `- 평가 방법: ${area.evaluation || "(미입력)"}`,
        ].join("\n");
      })
      .join("\n\n");

    const monthlyPlanText = monthlyPlan
      .map((item, index) => {
        const line = [
          `${index + 1}. ${item.month || "(미입력)"} | ${item.area || "(미입력)"} | ${item.topic || "(미입력)"}`,
          `대상: ${item.target || "(미입력)"} / 시간: ${item.hours || "(미입력)"}시간 / 담당: ${item.instructor || "(미입력)"}`,
          item.notes ? `비고: ${item.notes}` : "",
        ]
          .filter(Boolean)
          .join(" ");
        return line;
      })
      .join("\n");

    const infrastructureText = [
      `교육 시설: ${infrastructure.facilities || "(미입력)"}`,
      `교육 자료 현황: ${infrastructure.materials || "(미입력)"}`,
      `전문 강사 인력풀: ${infrastructure.experts || "(미입력)"}`,
      `예산 계획: ${infrastructure.budget || "(미입력)"}`,
      `안전교육 협의체: ${infrastructure.committee || "(미입력)"}`,
    ].join("\n");

    const trainingText = teacherTraining
      .map((item, index) => {
        return `${index + 1}. ${item.name || "(미입력)"} / 대상: ${item.target || "(미입력)"} / 시기: ${
          item.period || "(미입력)"
        } / 시간: ${item.hours || "(미입력)"}시간 / 내용: ${item.content || "(미입력)"} / 방법: ${
          item.method || "(미입력)"
        }`;
      })
      .join("\n");

    const evaluationText = [
      `평가 시기: ${evaluation.timing || "(미입력)"}`,
      `평가 방법: ${evaluation.methods || "(미입력)"}`,
      `평가 지표: ${evaluation.indicators || "(미입력)"}`,
      `환류 계획: ${evaluation.feedback || "(미입력)"}`,
      `안전사고 예방 목표: ${evaluation.accidentGoal || "(미입력)"}`,
    ].join("\n");

    const othersText = [
      `가정 연계 교육: ${others.homeConnection || "(미입력)"}`,
      `지역사회 연계: ${others.communityConnection || "(미입력)"}`,
      `특색 안전교육: ${others.specialProgram || "(미입력)"}`,
      `안전 캠페인: ${others.campaign || "(미입력)"}`,
    ].join("\n");

    return {
      title: documentTitle,
      basicInfo: basicInfoText,
      goals: goalsAndPolicy.goals || "(미입력)",
      policy: goalsAndPolicy.policy || "(미입력)",
      keyPoints: goalsAndPolicy.keyPoints || "(미입력)",
      improvements: goalsAndPolicy.improvements || "(미입력)",
      safetyAreas: safetyAreaText,
      monthlyPlan: monthlyPlanText,
      infrastructure: infrastructureText,
      teacherTraining: trainingText,
      evaluation: evaluationText,
      others: othersText,
    };
  };

  const buildDocumentContent = () => {
    const inputs = buildInputs();
    const { title: _title, ...sections } = inputs;
    const labels: Record<string, string> = {
      basicInfo: "기본 정보",
      goals: "교육 목표",
      policy: "운영 방침",
      keyPoints: "중점 추진 사항",
      improvements: "전년도 개선사항",
      safetyAreas: "7대 안전교육 영역별 계획",
      monthlyPlan: "월별/학기별 실행 계획",
      infrastructure: "교육 인프라 및 지원 체계",
      teacherTraining: "교직원 안전 연수 계획",
      evaluation: "평가 및 환류 계획",
      others: "기타 사항",
    };
    return Object.entries(sections)
      .map(([key, value]) => `[${labels[key] ?? key}]\n${value}`)
      .join("\n\n");
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/documents/generate", {
        documentType: "학교 안전교육 계획서",
        inputs: buildInputs(),
        uploadedTemplateId: referenceFileId ?? undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "문서 생성 완료",
        description: "학교 안전교육 계획서가 생성되었습니다.",
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
        documentType: "학교 안전교육 계획서",
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

  const aiBaseContext = {
    basicInfo,
    goalsAndPolicy,
    safetyAreas,
    monthlyPlan,
    infrastructure,
    teacherTraining,
    evaluation,
    others,
  };

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
              <h1 className="text-lg font-semibold text-foreground">학교 안전교육 계획서 작성</h1>
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
              <CardDescription>안전교육 계획서의 기본 정보를 입력해주세요.</CardDescription>
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
                  <label className="text-sm font-medium">대상 학생 수</label>
                  <Input
                    type="number"
                    value={basicInfo.studentCount}
                    onChange={(event) => {
                      const next = { ...basicInfo, studentCount: event.target.value };
                      setBasicInfo(next);
                      setErrors(validateBasicInfo(next));
                    }}
                    placeholder="예: 500"
                  />
                  {renderError("studentCount")}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">학교급</label>
                  <RadioGroup
                    value={basicInfo.schoolLevel}
                    onValueChange={(value) => {
                      const next: BasicInfo = {
                        ...basicInfo,
                        schoolLevel: value as SchoolLevel,
                        targetGrades: [],
                      };
                      setBasicInfo(next);
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
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">대상 학년</label>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="grade-all"
                      checked={basicInfo.targetGrades.includes("전체 학년")}
                      onCheckedChange={() => {
                        toggleGrade("전체 학년");
                        setErrors(validateBasicInfo({ ...basicInfo }));
                      }}
                    />
                    <label htmlFor="grade-all" className="text-sm">
                      전체 학년
                    </label>
                  </div>
                  {gradeOptions.map((grade) => (
                    <div key={grade} className="flex items-center gap-2">
                      <Checkbox
                        id={`grade-${grade}`}
                        checked={basicInfo.targetGrades.includes(grade)}
                        onCheckedChange={() => {
                          toggleGrade(grade);
                          setErrors(validateBasicInfo({ ...basicInfo }));
                        }}
                      />
                      <label htmlFor={`grade-${grade}`} className="text-sm">
                        {grade}
                      </label>
                    </div>
                  ))}
                </div>
                {renderError("targetGrades")}
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
                    placeholder="예: 학생안전부"
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
              <CardTitle>안전교육 목표 및 방침</CardTitle>
              <CardDescription>목표/방침/중점 추진 사항을 입력해주세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">교육 목표</label>
                  <AIGenerateButton
                    fieldName="goals"
                    context={{ ...aiBaseContext, currentValue: goalsAndPolicy.goals }}
                    onGenerated={(text) => setGoalsAndPolicy((prev) => ({ ...prev, goals: text }))}
                    endpoint="/api/safety-education-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.schoolLevel || !basicInfo.planType}
                  />
                </div>
                <Textarea
                  rows={5}
                  value={goalsAndPolicy.goals}
                  onChange={(event) => {
                    const next = { ...goalsAndPolicy, goals: event.target.value };
                    setGoalsAndPolicy(next);
                    setErrors(validateGoalsAndPolicy(next));
                  }}
                  placeholder="예) 1. 학생의 안전 의식 함양..."
                />
                {renderError("goals")}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">운영 방침</label>
                  <AIGenerateButton
                    fieldName="policy"
                    context={{ ...aiBaseContext, currentValue: goalsAndPolicy.policy }}
                    onGenerated={(text) => setGoalsAndPolicy((prev) => ({ ...prev, policy: text }))}
                    endpoint="/api/safety-education-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.schoolLevel || !basicInfo.planType}
                  />
                </div>
                <Textarea
                  rows={4}
                  value={goalsAndPolicy.policy}
                  onChange={(event) => {
                    const next = { ...goalsAndPolicy, policy: event.target.value };
                    setGoalsAndPolicy(next);
                    setErrors(validateGoalsAndPolicy(next));
                  }}
                  placeholder="예) 안전교육을 최우선으로 하며..."
                />
                {renderError("policy")}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">중점 추진 사항</label>
                  <AIGenerateButton
                    fieldName="keyPoints"
                    context={{ ...aiBaseContext, currentValue: goalsAndPolicy.keyPoints }}
                    onGenerated={(text) => setGoalsAndPolicy((prev) => ({ ...prev, keyPoints: text }))}
                    endpoint="/api/safety-education-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.schoolLevel || !basicInfo.planType}
                  />
                </div>
                <Textarea
                  rows={4}
                  value={goalsAndPolicy.keyPoints}
                  onChange={(event) => {
                    const next = { ...goalsAndPolicy, keyPoints: event.target.value };
                    setGoalsAndPolicy(next);
                    setErrors(validateGoalsAndPolicy(next));
                  }}
                  placeholder="예) 체험 중심 안전교육 강화..."
                />
                {renderError("keyPoints")}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">전년도 개선사항 (선택)</label>
                  <AIGenerateButton
                    fieldName="improvements"
                    context={{ ...aiBaseContext, currentValue: goalsAndPolicy.improvements }}
                    onGenerated={(text) => setGoalsAndPolicy((prev) => ({ ...prev, improvements: text }))}
                    endpoint="/api/safety-education-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.schoolLevel || !basicInfo.planType}
                  />
                </div>
                <Textarea
                  rows={4}
                  value={goalsAndPolicy.improvements}
                  onChange={(event) => {
                    const next = { ...goalsAndPolicy, improvements: event.target.value };
                    setGoalsAndPolicy(next);
                  }}
                  placeholder="예) 체험 중심 교육으로 전환..."
                />
              </div>
            </CardContent>
          </Card>
        )}

            {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>7대 안전교육 영역별 계획</CardTitle>
              <CardDescription>영역별 계획을 입력하고 법정 시수를 확인하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {visibleAreas.map((key) => (
                  <Button
                    key={key}
                    type="button"
                    variant={activeArea === key ? "default" : "outline"}
                    onClick={() => setActiveArea(key)}
                  >
                    {areaLabels[key]}
                  </Button>
                ))}
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">교육 시간 배정</label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      value={safetyAreas[activeArea].hours}
                      onChange={(event) => {
                        updateSafetyArea(activeArea, { hours: event.target.value });
                        setErrors(validateSafetyAreas({ ...safetyAreas, [activeArea]: { ...safetyAreas[activeArea], hours: event.target.value } }));
                      }}
                      placeholder="예: 10"
                      className="w-32"
                    />
                    {requiredHours && requiredHours[activeArea] > 0 && (
                      <span className="text-sm text-muted-foreground">
                        법정 최소 {requiredHours[activeArea]}시간
                      </span>
                    )}
                    {requiredHours && requiredHours[activeArea] > 0 && (
                      <span
                        className={`text-sm font-medium ${
                          areaHourTotals[activeArea] >= requiredHours[activeArea] ? "text-emerald-600" : "text-amber-600"
                        }`}
                      >
                        {areaHourTotals[activeArea] >= requiredHours[activeArea] ? "✓ 충족" : "⚠️ 부족"}
                      </span>
                    )}
                  </div>
                  {renderError(`area-${activeArea}-hours`)}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-sm font-medium">주요 교육 내용</label>
                    <AIGenerateButton
                      fieldName={`${activeArea}_content`}
                      context={{
                        ...aiBaseContext,
                        areaInfo: {
                          area: activeArea,
                          hours: safetyAreas[activeArea].hours,
                          methods: safetyAreas[activeArea].methods,
                        },
                        currentValue: safetyAreas[activeArea].content,
                      }}
                      onGenerated={(text) => updateSafetyArea(activeArea, { content: text })}
                      endpoint="/api/safety-education-plan/generate-ai-content"
                      documentType="care"
                      disabled={!basicInfo.schoolName || !basicInfo.schoolLevel || !basicInfo.planType}
                    />
                  </div>
                  <Textarea
                    rows={5}
                    value={safetyAreas[activeArea].content}
                    onChange={(event) => {
                      updateSafetyArea(activeArea, { content: event.target.value });
                      setErrors(validateSafetyAreas({ ...safetyAreas, [activeArea]: { ...safetyAreas[activeArea], content: event.target.value } }));
                    }}
                    placeholder="예) 학교 시설 안전, 가정 내 안전..."
                  />
                  {renderError(`area-${activeArea}-content`)}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">교육 방법</label>
                  <div className="flex flex-wrap gap-4">
                    {educationMethods.map((method) => (
                      <div key={method} className="flex items-center gap-2">
                        <Checkbox
                          id={`${activeArea}-method-${method}`}
                          checked={safetyAreas[activeArea].methods.includes(method)}
                          onCheckedChange={() => {
                            const current = new Set(safetyAreas[activeArea].methods);
                            if (current.has(method)) {
                              current.delete(method);
                            } else {
                              current.add(method);
                            }
                            updateSafetyArea(activeArea, { methods: Array.from(current) as EducationMethod[] });
                            setErrors(validateSafetyAreas({ ...safetyAreas, [activeArea]: { ...safetyAreas[activeArea], methods: Array.from(current) as EducationMethod[] } }));
                          }}
                        />
                        <label htmlFor={`${activeArea}-method-${method}`} className="text-sm">
                          {method}
                        </label>
                      </div>
                    ))}
                  </div>
                  {renderError(`area-${activeArea}-methods`)}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">교육 자료 (선택)</label>
                  <Input
                    value={safetyAreas[activeArea].materials}
                    onChange={(event) => updateSafetyArea(activeArea, { materials: event.target.value })}
                    placeholder="예: 안전교육 표준 교재, VR 체험 장비"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">평가 방법</label>
                  <Input
                    value={safetyAreas[activeArea].evaluation}
                    onChange={(event) => {
                      updateSafetyArea(activeArea, { evaluation: event.target.value });
                      setErrors(validateSafetyAreas({ ...safetyAreas, [activeArea]: { ...safetyAreas[activeArea], evaluation: event.target.value } }));
                    }}
                    placeholder="예: 실습 평가, 안전 퀴즈, 관찰 평가"
                  />
                  {renderError(`area-${activeArea}-evaluation`)}
                </div>
              </div>

              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-base">📊 7대 안전교육 시수 현황</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {visibleAreas.map((key) => {
                    const required = requiredHours?.[key] || 0;
                    const current = areaHourTotals[key] || 0;
                    const statusOk = required === 0 || current >= required;
                    return (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span>{areaLabels[key]}</span>
                        <span className={statusOk ? "text-emerald-600" : "text-amber-600"}>
                          {current} / {required}시간 {statusOk ? "✓" : "⚠️"}
                        </span>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between text-sm font-semibold pt-2 border-t border-border">
                    <span>총계</span>
                    <span>
                      {totalAreaHours} / {visibleAreas.reduce((sum, key) => sum + (requiredHours?.[key] || 0), 0)}시간
                    </span>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        )}

            {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>월별/학기별 실행 계획</CardTitle>
              <CardDescription>월별 교육 일정을 입력해주세요. 최소 10개 이상 필요합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {monthlyPlan.map((item, index) => (
                <div key={`${index}-${item.month}-${item.area}`} className="border border-border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">일정 {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={monthlyPlan.length <= 10}
                      onClick={() => removeMonthlyPlan(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">월</label>
                      <Select
                        value={item.month}
                        onValueChange={(value) => updateMonthlyPlan(index, { month: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="월 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {monthOptions.map((month) => (
                            <SelectItem key={month} value={month}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">교육 영역</label>
                      <Select
                        value={item.area}
                        onValueChange={(value) => updateMonthlyPlan(index, { area: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="영역 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {visibleAreas.map((key) => (
                            <SelectItem key={key} value={areaLabels[key]}>
                              {areaLabels[key]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">교육 주제</label>
                      <Input
                        value={item.topic}
                        onChange={(event) => updateMonthlyPlan(index, { topic: event.target.value })}
                        placeholder="주제 입력"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">대상</label>
                      <Input
                        value={item.target}
                        onChange={(event) => updateMonthlyPlan(index, { target: event.target.value })}
                        placeholder="예: 전체"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">시간</label>
                      <Input
                        type="number"
                        value={item.hours}
                        onChange={(event) => updateMonthlyPlan(index, { hours: event.target.value })}
                        placeholder="시간"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">담당자</label>
                      <Input
                        value={item.instructor}
                        onChange={(event) => updateMonthlyPlan(index, { instructor: event.target.value })}
                        placeholder="담당 교사"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">비고</label>
                      <Input
                        value={item.notes}
                        onChange={(event) => updateMonthlyPlan(index, { notes: event.target.value })}
                        placeholder="메모"
                      />
                    </div>
                  </div>
                  {renderError(`monthly-${index}`)}
                </div>
              ))}

              <div className="flex items-center justify-between">
                <Button type="button" variant="outline" onClick={addMonthlyPlan}>
                  <Plus className="w-4 h-4 mr-2" /> 일정 추가
                </Button>
                {renderError("monthlyPlanCount")}
              </div>

              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-base">📊 영역별 배정 시수 확인</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {visibleAreas.map((key) => {
                    const areaTotal = areaHourTotals[key] || 0;
                    const monthlyTotal = monthlyHourTotals[key] || 0;
                    const isMatch = areaTotal === monthlyTotal;
                    return (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span>{areaLabels[key]}</span>
                        <span className={isMatch ? "text-emerald-600" : "text-amber-600"}>
                          {monthlyTotal} / {areaTotal}시간 {isMatch ? "✓" : "⚠️"}
                        </span>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between text-sm font-semibold pt-2 border-t border-border">
                    <span>총 배정 시간</span>
                    <span className={totalMonthlyHours === totalAreaHours ? "text-emerald-600" : "text-amber-600"}>
                      {totalMonthlyHours} / {totalAreaHours}시간 {totalMonthlyHours === totalAreaHours ? "✓" : "⚠️"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        )}

            {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>교육 인프라 및 지원 체계</CardTitle>
              <CardDescription>교육 시설, 자료, 예산 등을 입력해주세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">교육 시설</label>
                  <AIGenerateButton
                    fieldName="infrastructure_facilities"
                    context={{ ...aiBaseContext, currentValue: infrastructure.facilities }}
                    onGenerated={(text) => setInfrastructure((prev) => ({ ...prev, facilities: text }))}
                    endpoint="/api/safety-education-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.schoolLevel || !basicInfo.planType}
                  />
                </div>
                <Textarea
                  rows={4}
                  value={infrastructure.facilities}
                  onChange={(event) => {
                    const next = { ...infrastructure, facilities: event.target.value };
                    setInfrastructure(next);
                    setErrors(validateInfrastructure(next));
                  }}
                  placeholder="예: 체육관, 시청각실, 과학실..."
                />
                {renderError("facilities")}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">교육 자료 현황</label>
                  <AIGenerateButton
                    fieldName="infrastructure_materials"
                    context={{ ...aiBaseContext, currentValue: infrastructure.materials }}
                    onGenerated={(text) => setInfrastructure((prev) => ({ ...prev, materials: text }))}
                    endpoint="/api/safety-education-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.schoolLevel || !basicInfo.planType}
                  />
                </div>
                <Textarea
                  rows={4}
                  value={infrastructure.materials}
                  onChange={(event) => {
                    const next = { ...infrastructure, materials: event.target.value };
                    setInfrastructure(next);
                    setErrors(validateInfrastructure(next));
                  }}
                  placeholder="예: 안전교육 표준 교재 30권..."
                />
                {renderError("materials")}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">전문 강사 인력풀 (선택)</label>
                  <AIGenerateButton
                    fieldName="infrastructure_experts"
                    context={{ ...aiBaseContext, currentValue: infrastructure.experts }}
                    onGenerated={(text) => setInfrastructure((prev) => ({ ...prev, experts: text }))}
                    endpoint="/api/safety-education-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.schoolLevel || !basicInfo.planType}
                  />
                </div>
                <Textarea
                  rows={4}
                  value={infrastructure.experts}
                  onChange={(event) => setInfrastructure((prev) => ({ ...prev, experts: event.target.value }))}
                  placeholder="예: ○○소방서 협약..."
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">예산 계획</label>
                  <AIGenerateButton
                    fieldName="infrastructure_budget"
                    context={{ ...aiBaseContext, currentValue: infrastructure.budget }}
                    onGenerated={(text) => setInfrastructure((prev) => ({ ...prev, budget: text }))}
                    endpoint="/api/safety-education-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.schoolLevel || !basicInfo.planType}
                  />
                </div>
                <Textarea
                  rows={5}
                  value={infrastructure.budget}
                  onChange={(event) => {
                    const next = { ...infrastructure, budget: event.target.value };
                    setInfrastructure(next);
                    setErrors(validateInfrastructure(next));
                  }}
                  placeholder="예: 교육 자료 구입: 200만원..."
                />
                {renderError("budget")}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">안전교육 협의체 (선택)</label>
                  <AIGenerateButton
                    fieldName="infrastructure_committee"
                    context={{ ...aiBaseContext, currentValue: infrastructure.committee }}
                    onGenerated={(text) => setInfrastructure((prev) => ({ ...prev, committee: text }))}
                    endpoint="/api/safety-education-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.schoolLevel || !basicInfo.planType}
                  />
                </div>
                <Textarea
                  rows={4}
                  value={infrastructure.committee}
                  onChange={(event) => setInfrastructure((prev) => ({ ...prev, committee: event.target.value }))}
                  placeholder="예: 위원장: 교감..."
                />
              </div>
            </CardContent>
          </Card>
        )}

            {step === 5 && (
          <Card>
            <CardHeader>
              <CardTitle>교직원 안전 연수 계획</CardTitle>
              <CardDescription>교직원 연수 계획을 입력해주세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {teacherTraining.map((item, index) => (
                <div key={`training-${index}`} className="border border-border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">연수 {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={teacherTraining.length <= 1}
                      onClick={() => removeTraining(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">연수명</label>
                      <Input
                        value={item.name}
                        onChange={(event) => updateTraining(index, { name: event.target.value })}
                        placeholder="예: 심폐소생술 실습"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">대상</label>
                      <Input
                        value={item.target}
                        onChange={(event) => updateTraining(index, { target: event.target.value })}
                        placeholder="예: 전체 교직원"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">시기</label>
                      <Input
                        value={item.period}
                        onChange={(event) => updateTraining(index, { period: event.target.value })}
                        placeholder="예: 4월"
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">시간</label>
                      <Input
                        type="number"
                        value={item.hours}
                        onChange={(event) => updateTraining(index, { hours: event.target.value })}
                        placeholder="예: 2"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">내용</label>
                      <Input
                        value={item.content}
                        onChange={(event) => updateTraining(index, { content: event.target.value })}
                        placeholder="예: CPR, AED 사용법"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">방법</label>
                      <Input
                        value={item.method}
                        onChange={(event) => updateTraining(index, { method: event.target.value })}
                        placeholder="예: 실습 중심"
                      />
                    </div>
                  </div>
                  {renderError(`training-${index}`)}
                </div>
              ))}

              <div className="flex items-center justify-between">
                <Button type="button" variant="outline" onClick={addTraining}>
                  <Plus className="w-4 h-4 mr-2" /> 연수 추가
                </Button>
                {renderError("trainingCount")}
              </div>
            </CardContent>
          </Card>
        )}

            {step === 6 && (
          <Card>
            <CardHeader>
              <CardTitle>평가 및 환류 계획</CardTitle>
              <CardDescription>평가 계획과 환류 방안을 입력해주세요.</CardDescription>
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

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">평가 방법</label>
                  <AIGenerateButton
                    fieldName="evaluation_methods"
                    context={{ ...aiBaseContext, currentValue: evaluation.methods }}
                    onGenerated={(text) => setEvaluation((prev) => ({ ...prev, methods: text }))}
                    endpoint="/api/safety-education-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.schoolLevel || !basicInfo.planType}
                  />
                </div>
                <Textarea
                  rows={4}
                  value={evaluation.methods}
                  onChange={(event) => {
                    const next = { ...evaluation, methods: event.target.value };
                    setEvaluation(next);
                    setErrors(validateEvaluation(next));
                  }}
                />
                {renderError("methods")}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">평가 지표</label>
                  <AIGenerateButton
                    fieldName="evaluation_indicators"
                    context={{ ...aiBaseContext, currentValue: evaluation.indicators }}
                    onGenerated={(text) => setEvaluation((prev) => ({ ...prev, indicators: text }))}
                    endpoint="/api/safety-education-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.schoolLevel || !basicInfo.planType}
                  />
                </div>
                <Textarea
                  rows={4}
                  value={evaluation.indicators}
                  onChange={(event) => {
                    const next = { ...evaluation, indicators: event.target.value };
                    setEvaluation(next);
                    setErrors(validateEvaluation(next));
                  }}
                />
                {renderError("indicators")}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">환류 계획</label>
                  <AIGenerateButton
                    fieldName="evaluation_feedback"
                    context={{ ...aiBaseContext, currentValue: evaluation.feedback }}
                    onGenerated={(text) => setEvaluation((prev) => ({ ...prev, feedback: text }))}
                    endpoint="/api/safety-education-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.schoolLevel || !basicInfo.planType}
                  />
                </div>
                <Textarea
                  rows={4}
                  value={evaluation.feedback}
                  onChange={(event) => {
                    const next = { ...evaluation, feedback: event.target.value };
                    setEvaluation(next);
                    setErrors(validateEvaluation(next));
                  }}
                />
                {renderError("feedback")}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">안전사고 예방 목표 (선택)</label>
                <Input
                  value={evaluation.accidentGoal}
                  onChange={(event) => setEvaluation((prev) => ({ ...prev, accidentGoal: event.target.value }))}
                  placeholder="예: 전년 대비 안전사고 20% 감소"
                />
              </div>
            </CardContent>
          </Card>
        )}

            {step === 7 && (
          <Card>
            <CardHeader>
              <CardTitle>기타 사항</CardTitle>
              <CardDescription>추가 안전교육 활동 계획을 입력해주세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">가정 연계 교육 (선택)</label>
                  <AIGenerateButton
                    fieldName="others_home"
                    context={{ ...aiBaseContext, currentValue: others.homeConnection }}
                    onGenerated={(text) => setOthers((prev) => ({ ...prev, homeConnection: text }))}
                    endpoint="/api/safety-education-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.schoolLevel || !basicInfo.planType}
                  />
                </div>
                <Textarea
                  rows={4}
                  value={others.homeConnection}
                  onChange={(event) => setOthers((prev) => ({ ...prev, homeConnection: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">지역사회 연계 (선택)</label>
                  <AIGenerateButton
                    fieldName="others_community"
                    context={{ ...aiBaseContext, currentValue: others.communityConnection }}
                    onGenerated={(text) => setOthers((prev) => ({ ...prev, communityConnection: text }))}
                    endpoint="/api/safety-education-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.schoolLevel || !basicInfo.planType}
                  />
                </div>
                <Textarea
                  rows={4}
                  value={others.communityConnection}
                  onChange={(event) => setOthers((prev) => ({ ...prev, communityConnection: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">특색 안전교육 (선택)</label>
                  <AIGenerateButton
                    fieldName="others_special"
                    context={{ ...aiBaseContext, currentValue: others.specialProgram }}
                    onGenerated={(text) => setOthers((prev) => ({ ...prev, specialProgram: text }))}
                    endpoint="/api/safety-education-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.schoolLevel || !basicInfo.planType}
                  />
                </div>
                <Textarea
                  rows={4}
                  value={others.specialProgram}
                  onChange={(event) => setOthers((prev) => ({ ...prev, specialProgram: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">안전 캠페인 (선택)</label>
                  <AIGenerateButton
                    fieldName="others_campaign"
                    context={{ ...aiBaseContext, currentValue: others.campaign }}
                    onGenerated={(text) => setOthers((prev) => ({ ...prev, campaign: text }))}
                    endpoint="/api/safety-education-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.schoolLevel || !basicInfo.planType}
                  />
                </div>
                <Textarea
                  rows={4}
                  value={others.campaign}
                  onChange={(event) => setOthers((prev) => ({ ...prev, campaign: event.target.value }))}
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
