import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, CalendarDays, Loader2, Plus, Trash2 } from "lucide-react";
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

type InsuranceStatus = "가입 완료" | "미가입" | "";

interface BasicInfo {
  schoolName: string;
  eventName: string;
  eventType: string;
  startDateTime: string;
  endDateTime: string;
  location: string;
  alternativeDate: string;
  participants: string[];
  expectedCount: string;
  author: string;
  department: string;
  contact: string;
}

interface Overview {
  purpose: string;
  summary: string;
  background: string;
  expectedEffects: string;
}

interface ProgramItem {
  time: string;
  name: string;
  location: string;
  target: string;
  manager: string;
  notes: string;
}

interface OperationPlan {
  policy: string;
  preparation: string;
  specialProgram: string;
}

interface OrganizationTeam {
  team: string;
  manager: string;
  members: string;
  role: string;
  notes: string;
}

interface OrganizationPlan {
  teams: OrganizationTeam[];
  committee: string;
}

interface SafetyPlan {
  measures: string;
  emergencyContact: string;
  firstAid: string;
  weatherPlan: string;
  insurance: InsuranceStatus;
}

interface BudgetItem {
  category: string;
  detail: string;
  quantity: string;
  unitPrice: string;
  notes: string;
}

interface ScheduleItem {
  date: string;
  task: string;
  manager: string;
  completed: boolean;
  notes: string;
}

interface EvaluationPlan {
  methods: string;
  indicators: string;
  feedback: string;
}

const steps = ["기본 정보", "행사 목적 및 개요", "세부 운영 계획", "조직 및 역할 분담", "안전 관리 계획", "예산 계획", "사전 준비 일정", "평가 계획"];

const eventTypes = [
  { value: "체육 행사", label: "체육 행사 🏃" },
  { value: "문화 행사", label: "문화 행사 🎭" },
  { value: "학술 행사", label: "학술 행사 📚" },
  { value: "의례 행사", label: "의례 행사 🎓" },
  { value: "수련 행사", label: "수련 행사 🏕️" },
  { value: "기타", label: "기타 📅" },
];

const participantOptions = ["전교생", "1학년", "2학년", "3학년", "4학년", "5학년", "6학년", "교직원", "학부모"];

const emptyProgram = (): ProgramItem => ({
  time: "",
  name: "",
  location: "",
  target: "",
  manager: "",
  notes: "",
});

const emptyTeam = (): OrganizationTeam => ({
  team: "",
  manager: "",
  members: "",
  role: "",
  notes: "",
});

const emptyBudgetItem = (): BudgetItem => ({
  category: "",
  detail: "",
  quantity: "",
  unitPrice: "",
  notes: "",
});

const emptySchedule = (): ScheduleItem => ({
  date: "",
  task: "",
  manager: "",
  completed: false,
  notes: "",
});

const formatPhoneNumber = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
};

const parseTimeRange = (value: string) => {
  const match = value.match(/^(\d{2}):(\d{2})\s*~\s*(\d{2}):(\d{2})$/);
  if (!match) return null;
  const start = Number(match[1]) * 60 + Number(match[2]);
  const end = Number(match[3]) * 60 + Number(match[4]);
  if (Number.isNaN(start) || Number.isNaN(end) || start >= end) return null;
  return { start, end };
};

export default function EventPlanForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [referenceFileId, setReferenceFileId] = useState<number | null>(null);
  const [basicInfo, setBasicInfo] = useState<BasicInfo>({
    schoolName: "",
    eventName: "",
    eventType: "",
    startDateTime: "",
    endDateTime: "",
    location: "",
    alternativeDate: "",
    participants: [],
    expectedCount: "",
    author: "",
    department: "",
    contact: "",
  });
  const [overview, setOverview] = useState<Overview>({
    purpose: "",
    summary: "",
    background: "",
    expectedEffects: "",
  });
  const [programs, setPrograms] = useState<ProgramItem[]>([emptyProgram(), emptyProgram(), emptyProgram()]);
  const [operation, setOperation] = useState<OperationPlan>({
    policy: "",
    preparation: "",
    specialProgram: "",
  });
  const [organization, setOrganization] = useState<OrganizationPlan>({
    teams: [emptyTeam(), emptyTeam(), emptyTeam()],
    committee: "",
  });
  const [safety, setSafety] = useState<SafetyPlan>({
    measures: "",
    emergencyContact: "",
    firstAid: "",
    weatherPlan: "",
    insurance: "",
  });
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([emptyBudgetItem()]);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([emptySchedule(), emptySchedule(), emptySchedule()]);
  const [evaluation, setEvaluation] = useState<EvaluationPlan>({
    methods: "",
    indicators: "",
    feedback: "",
  });

  const progressValue = ((step + 1) / steps.length) * 100;

  const documentTitle = useMemo(() => {
    if (!basicInfo.schoolName && !basicInfo.eventName) {
      return "교내 행사 운영계획서";
    }
    return `${basicInfo.schoolName || ""} ${basicInfo.eventName || "교내 행사"} 운영계획서`.trim();
  }, [basicInfo.schoolName, basicInfo.eventName]);

  const aiContext = {
    basicInfo,
    overview,
    programs,
    operation,
    organization,
    safety,
    budgetItems,
    scheduleItems,
    evaluation,
  };

  const toggleParticipant = (value: string) => {
    const current = new Set(basicInfo.participants);
    if (current.has(value)) {
      current.delete(value);
    } else {
      current.add(value);
    }
    setBasicInfo((prev) => ({ ...prev, participants: Array.from(current) }));
  };

  const updateProgram = (index: number, updates: Partial<ProgramItem>) => {
    setPrograms((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...updates } : item)));
  };

  const addProgram = () => setPrograms((prev) => [...prev, emptyProgram()]);
  const removeProgram = (index: number) => {
    if (programs.length <= 3) return;
    setPrograms((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateTeam = (index: number, updates: Partial<OrganizationTeam>) => {
    setOrganization((prev) => ({
      ...prev,
      teams: prev.teams.map((item, idx) => (idx === index ? { ...item, ...updates } : item)),
    }));
  };

  const addTeam = () => setOrganization((prev) => ({ ...prev, teams: [...prev.teams, emptyTeam()] }));
  const removeTeam = (index: number) => {
    if (organization.teams.length <= 3) return;
    setOrganization((prev) => ({ ...prev, teams: prev.teams.filter((_, idx) => idx !== index) }));
  };

  const updateBudgetItem = (index: number, updates: Partial<BudgetItem>) => {
    setBudgetItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...updates } : item)));
  };

  const addBudgetItem = () => setBudgetItems((prev) => [...prev, emptyBudgetItem()]);
  const removeBudgetItem = (index: number) => {
    if (budgetItems.length <= 1) return;
    setBudgetItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateScheduleItem = (index: number, updates: Partial<ScheduleItem>) => {
    setScheduleItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...updates } : item)));
  };

  const addScheduleItem = () => setScheduleItems((prev) => [...prev, emptySchedule()]);
  const removeScheduleItem = (index: number) => {
    if (scheduleItems.length <= 3) return;
    setScheduleItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const budgetTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    budgetItems.forEach((item) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unitPrice || 0);
      const amount = Number.isNaN(quantity) || Number.isNaN(unitPrice) ? 0 : quantity * unitPrice;
      if (!item.category) return;
      totals[item.category] = (totals[item.category] || 0) + amount;
    });
    return totals;
  }, [budgetItems]);

  const totalBudget = Object.values(budgetTotals).reduce((sum, value) => sum + value, 0);

  const validateBasicInfo = (info: BasicInfo) => {
    const nextErrors: Record<string, string> = {};
    if (info.schoolName.length < 2 || info.schoolName.length > 50) {
      nextErrors.schoolName = "학교명을 2~50자로 입력해주세요.";
    }
    if (info.eventName.length < 2 || info.eventName.length > 100) {
      nextErrors.eventName = "행사명을 2~100자로 입력해주세요.";
    }
    if (!info.eventType) {
      nextErrors.eventType = "행사 유형을 선택해주세요.";
    }
    if (!info.startDateTime || !info.endDateTime) {
      nextErrors.eventDateTime = "행사 일시를 입력해주세요.";
    } else {
      const start = new Date(info.startDateTime);
      const end = new Date(info.endDateTime);
      const now = new Date();
      if (start >= end) {
        nextErrors.eventDateTime = "종료 시간은 시작 시간보다 뒤여야 합니다.";
      } else if (start <= now) {
        nextErrors.eventDateTime = "행사 일시는 현재보다 미래여야 합니다.";
      }
    }
    if (info.alternativeDate) {
      const alternative = new Date(info.alternativeDate);
      const startDateOnly = info.startDateTime ? new Date(info.startDateTime) : null;
      if (startDateOnly && alternative <= startDateOnly) {
        nextErrors.alternativeDate = "예비 날짜는 행사 날짜보다 뒤여야 합니다.";
      }
    }
    if (info.location.length < 2 || info.location.length > 100) {
      nextErrors.location = "행사 장소를 2~100자로 입력해주세요.";
    }
    if (info.participants.length < 1) {
      nextErrors.participants = "참가 대상을 최소 1개 선택해주세요.";
    }
    const expectedCount = Number(info.expectedCount);
    if (Number.isNaN(expectedCount) || expectedCount < 1) {
      nextErrors.expectedCount = "예상 참가 인원은 1명 이상 입력해주세요.";
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

  const validateOverview = (info: Overview) => {
    const nextErrors: Record<string, string> = {};
    if (!info.purpose.trim()) nextErrors.purpose = "행사 목적을 입력해주세요.";
    if (!info.summary.trim()) nextErrors.summary = "행사 개요를 입력해주세요.";
    if (!info.expectedEffects.trim()) nextErrors.expectedEffects = "기대 효과를 입력해주세요.";
    return nextErrors;
  };

  const validatePrograms = (items: ProgramItem[]) => {
    const nextErrors: Record<string, string> = {};
    if (items.length < 3) {
      nextErrors.programCount = "최소 3개 이상의 프로그램을 입력해 주세요.";
    }
    const ranges: Array<{ start: number; end: number; index: number }> = [];
    items.forEach((item, index) => {
      if (!item.time || !item.name || !item.location || !item.target || !item.manager) {
        nextErrors[`program-${index}`] = "필수 항목을 모두 입력해주세요.";
      }
      const range = parseTimeRange(item.time);
      if (!range) {
        nextErrors[`program-time-${index}`] = "시간은 HH:MM ~ HH:MM 형식으로 입력해주세요.";
      } else {
        ranges.push({ ...range, index });
      }
    });
    for (let i = 0; i < ranges.length; i += 1) {
      for (let j = i + 1; j < ranges.length; j += 1) {
        const a = ranges[i];
        const b = ranges[j];
        if (a.start < b.end && b.start < a.end) {
          nextErrors[`program-overlap-${a.index}`] = "프로그램 시간이 중복됩니다.";
          nextErrors[`program-overlap-${b.index}`] = "프로그램 시간이 중복됩니다.";
        }
      }
    }
    return nextErrors;
  };

  const validateOperation = (info: OperationPlan) => {
    const nextErrors: Record<string, string> = {};
    if (!info.policy.trim()) nextErrors.policy = "운영 방침을 입력해주세요.";
    if (!info.preparation.trim()) nextErrors.preparation = "준비 사항을 입력해주세요.";
    return nextErrors;
  };

  const validateOrganization = (info: OrganizationPlan) => {
    const nextErrors: Record<string, string> = {};
    if (info.teams.length < 3) {
      nextErrors.teamCount = "최소 3개 이상의 조직을 입력해 주세요.";
    }
    info.teams.forEach((item, index) => {
      if (!item.team || !item.manager || !item.members || !item.role) {
        nextErrors[`team-${index}`] = "조직 정보의 필수 항목을 모두 입력해주세요.";
      }
    });
    return nextErrors;
  };

  const validateSafety = (info: SafetyPlan) => {
    const nextErrors: Record<string, string> = {};
    if (!info.measures.trim()) nextErrors.measures = "안전 관리 대책을 입력해주세요.";
    if (!info.emergencyContact.trim()) nextErrors.emergencyContact = "비상 연락망을 입력해주세요.";
    if (!info.firstAid.trim()) nextErrors.firstAid = "응급 처치 체계를 입력해주세요.";
    if (!info.insurance) nextErrors.insurance = "보험 가입 여부를 선택해주세요.";
    return nextErrors;
  };

  const validateBudget = (items: BudgetItem[]) => {
    const nextErrors: Record<string, string> = {};
    if (items.length < 1) {
      nextErrors.budgetCount = "최소 1개 이상의 예산 내역이 필요합니다.";
    }
    items.forEach((item, index) => {
      if (!item.category || !item.detail || !item.quantity || !item.unitPrice) {
        nextErrors[`budget-${index}`] = "예산 내역의 필수 항목을 모두 입력해주세요.";
      }
    });
    return nextErrors;
  };

  const validateSchedule = (items: ScheduleItem[]) => {
    const nextErrors: Record<string, string> = {};
    if (items.length < 3) {
      nextErrors.scheduleCount = "최소 3개 이상의 준비 일정을 입력해 주세요.";
    }
    items.forEach((item, index) => {
      if (!item.date || !item.task || !item.manager) {
        nextErrors[`schedule-${index}`] = "준비 일정의 필수 항목을 입력해주세요.";
      }
    });
    return nextErrors;
  };

  const validateEvaluation = (info: EvaluationPlan) => {
    const nextErrors: Record<string, string> = {};
    if (!info.methods.trim()) nextErrors.methods = "평가 방법을 입력해주세요.";
    if (!info.indicators.trim()) nextErrors.indicators = "평가 지표를 입력해주세요.";
    if (!info.feedback.trim()) nextErrors.feedback = "환류 계획을 입력해주세요.";
    return nextErrors;
  };

  const stepValidators = [
    () => validateBasicInfo(basicInfo),
    () => validateOverview(overview),
    () => ({ ...validatePrograms(programs), ...validateOperation(operation) }),
    () => validateOrganization(organization),
    () => validateSafety(safety),
    () => validateBudget(budgetItems),
    () => validateSchedule(scheduleItems),
    () => validateEvaluation(evaluation),
  ];

  const renderError = (_key: string) => null;

  const buildInputs = () => {
    const basicInfoText = [
      `학교명: ${basicInfo.schoolName || "(미입력)"}`,
      `행사명: ${basicInfo.eventName || "(미입력)"}`,
      `행사 유형: ${basicInfo.eventType || "(미입력)"}`,
      `행사 일시: ${basicInfo.startDateTime || "(미입력)"} ~ ${basicInfo.endDateTime || "(미입력)"}`,
      `행사 장소: ${basicInfo.location || "(미입력)"}`,
      basicInfo.alternativeDate ? `예비 날짜: ${basicInfo.alternativeDate}` : "예비 날짜: (미입력)",
      `참가 대상: ${basicInfo.participants.join(", ") || "(미입력)"}`,
      `예상 참가 인원: ${basicInfo.expectedCount || "(미입력)"}명`,
      `작성자: ${basicInfo.author || "(미입력)"}`,
      `부서: ${basicInfo.department || "(미입력)"}`,
      `연락처: ${basicInfo.contact || "(미입력)"}`,
    ].join("\n");

    const overviewText = [
      `행사 목적: ${overview.purpose || "(미입력)"}`,
      `행사 개요: ${overview.summary || "(미입력)"}`,
      `추진 배경: ${overview.background || "(미입력)"}`,
      `기대 효과: ${overview.expectedEffects || "(미입력)"}`,
    ].join("\n");

    const programText = programs
      .map((item, index) => {
        return `${index + 1}. ${item.time || "(미입력)"} | ${item.name || "(미입력)"} | ${
          item.location || "(미입력)"
        } | ${item.target || "(미입력)"} | ${item.manager || "(미입력)"}${item.notes ? ` | ${item.notes}` : ""}`;
      })
      .join("\n");

    const operationText = [
      `운영 방침: ${operation.policy || "(미입력)"}`,
      `준비 사항: ${operation.preparation || "(미입력)"}`,
      `특별 프로그램: ${operation.specialProgram || "(미입력)"}`,
    ].join("\n");

    const organizationText = [
      "추진 조직:",
      ...organization.teams.map((item, index) => {
        return `${index + 1}. ${item.team || "(미입력)"} / ${item.manager || "(미입력)"} / ${
          item.members || "(미입력)"
        } / ${item.role || "(미입력)"}${item.notes ? ` / ${item.notes}` : ""}`;
      }),
      `위원회 구성: ${organization.committee || "(미입력)"}`,
    ].join("\n");

    const safetyText = [
      `안전 관리 대책: ${safety.measures || "(미입력)"}`,
      `비상 연락망: ${safety.emergencyContact || "(미입력)"}`,
      `응급 처치 체계: ${safety.firstAid || "(미입력)"}`,
      `기상 악화 대책: ${safety.weatherPlan || "(미입력)"}`,
      `보험 가입: ${safety.insurance || "(미입력)"}`,
    ].join("\n");

    const budgetText = [
      "예산 내역:",
      ...budgetItems.map((item, index) => {
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice || 0);
        const amount = Number.isNaN(quantity) || Number.isNaN(unitPrice) ? 0 : quantity * unitPrice;
        return `${index + 1}. ${item.category || "(미입력)"} / ${item.detail || "(미입력)"} / ${
          item.quantity || "(미입력)"
        } / ${item.unitPrice || "(미입력)"} / ${amount.toLocaleString()}원${item.notes ? ` / ${item.notes}` : ""}`;
      }),
      `총 예산: ${totalBudget.toLocaleString()}원`,
    ].join("\n");

    const scheduleText = [
      "사전 준비 일정:",
      ...scheduleItems.map((item, index) => {
        return `${index + 1}. ${item.date || "(미입력)"} / ${item.task || "(미입력)"} / ${
          item.manager || "(미입력)"
        } / ${item.completed ? "완료" : "미완료"}${item.notes ? ` / ${item.notes}` : ""}`;
      }),
    ].join("\n");

    const evaluationText = [
      `평가 방법: ${evaluation.methods || "(미입력)"}`,
      `평가 지표: ${evaluation.indicators || "(미입력)"}`,
      `환류 계획: ${evaluation.feedback || "(미입력)"}`,
    ].join("\n");

    return {
      title: documentTitle,
      basicInfo: basicInfoText,
      overview: overviewText,
      programs: programText,
      operation: operationText,
      organization: organizationText,
      safety: safetyText,
      budget: budgetText,
      schedule: scheduleText,
      evaluation: evaluationText,
    };
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/documents/generate", {
        documentType: "교내 행사 운영계획서",
        inputs: buildInputs(),
        uploadedTemplateId: referenceFileId ?? undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "문서 생성 완료",
        description: "교내 행사 운영계획서가 생성되었습니다.",
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

  const buildDocumentContent = () => {
    const inputs = buildInputs();
    const { title: _title, ...sections } = inputs;
    const labels: Record<string, string> = {
      basicInfo: "기본 정보",
      overview: "행사 목적 및 개요",
      programs: "행사 프로그램",
      operation: "세부 운영 계획",
      organization: "조직 및 역할 분담",
      safety: "안전 관리 계획",
      budget: "예산 계획",
      schedule: "사전 준비 일정",
      evaluation: "평가 계획",
    };
    return Object.entries(sections)
      .map(([key, value]) => `[${labels[key] ?? key}]\n${value}`)
      .join("\n\n");
  };

  const saveMutation = useMutation({
    mutationFn: async (status: "draft" | "completed") => {
      const response = await apiRequest("POST", "/api/documents", {
        documentType: "교내 행사 운영계획서",
        title: documentTitle,
        schoolName: basicInfo.schoolName,
        metadata: {
          location: basicInfo.location,
          targetDate: basicInfo.startDateTime,
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
              <h1 className="text-lg font-semibold text-foreground">교내 행사 운영계획서 작성</h1>
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
                  <CalendarDays className="w-4 h-4 text-primary" />
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
              <CardDescription>행사 운영계획서의 기본 정보를 입력하세요.</CardDescription>
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
                    placeholder="예: ○○고등학교"
                  />
                  {renderError("schoolName")}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">행사명</label>
                  <Input
                    value={basicInfo.eventName}
                    onChange={(event) => {
                      const next = { ...basicInfo, eventName: event.target.value };
                      setBasicInfo(next);
                      setErrors(validateBasicInfo(next));
                    }}
                    placeholder="예: 2025 체육대회"
                  />
                  {renderError("eventName")}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">행사 유형</label>
                  <Select
                    value={basicInfo.eventType}
                    onValueChange={(value) => {
                      const next = { ...basicInfo, eventType: value };
                      setBasicInfo(next);
                      setErrors(validateBasicInfo(next));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="행사 유형 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {eventTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {renderError("eventType")}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">행사 장소</label>
                  <Input
                    value={basicInfo.location}
                    onChange={(event) => {
                      const next = { ...basicInfo, location: event.target.value };
                      setBasicInfo(next);
                      setErrors(validateBasicInfo(next));
                    }}
                    placeholder="예: 학교 운동장"
                  />
                  {renderError("location")}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">행사 일시</label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="datetime-local"
                      value={basicInfo.startDateTime}
                      onChange={(event) => {
                        const next = { ...basicInfo, startDateTime: event.target.value };
                        setBasicInfo(next);
                        setErrors(validateBasicInfo(next));
                      }}
                    />
                    <Input
                      type="datetime-local"
                      value={basicInfo.endDateTime}
                      onChange={(event) => {
                        const next = { ...basicInfo, endDateTime: event.target.value };
                        setBasicInfo(next);
                        setErrors(validateBasicInfo(next));
                      }}
                    />
                  </div>
                  {renderError("eventDateTime")}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">예비 날짜 (선택)</label>
                  <Input
                    type="date"
                    value={basicInfo.alternativeDate}
                    onChange={(event) => {
                      const next = { ...basicInfo, alternativeDate: event.target.value };
                      setBasicInfo(next);
                      setErrors(validateBasicInfo(next));
                    }}
                  />
                  {renderError("alternativeDate")}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">참가 대상</label>
                <div className="flex flex-wrap gap-4">
                  {participantOptions.map((participant) => (
                    <div key={participant} className="flex items-center gap-2">
                      <Checkbox
                        id={`participant-${participant}`}
                        checked={basicInfo.participants.includes(participant)}
                        onCheckedChange={() => {
                          toggleParticipant(participant);
                          setErrors(validateBasicInfo({ ...basicInfo, participants: basicInfo.participants }));
                        }}
                      />
                      <label htmlFor={`participant-${participant}`} className="text-sm">
                        {participant}
                      </label>
                    </div>
                  ))}
                </div>
                {renderError("participants")}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">예상 참가 인원</label>
                  <Input
                    type="number"
                    value={basicInfo.expectedCount}
                    onChange={(event) => {
                      const next = { ...basicInfo, expectedCount: event.target.value };
                      setBasicInfo(next);
                      setErrors(validateBasicInfo(next));
                    }}
                    placeholder="예: 800"
                  />
                  {renderError("expectedCount")}
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
                    placeholder="예: 체육부"
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
              <CardTitle>행사 목적 및 개요</CardTitle>
              <CardDescription>행사의 목적과 전반적인 개요를 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">행사 목적</label>
                  <AIGenerateButton
                    fieldName="purpose"
                    context={{ ...aiContext, currentValue: overview.purpose }}
                    onGenerated={(text) => setOverview((prev) => ({ ...prev, purpose: text }))}
                    endpoint="/api/event-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.eventName || !basicInfo.eventType}
                  />
                </div>
                <Textarea
                  rows={5}
                  value={overview.purpose}
                  onChange={(event) => {
                    const next = { ...overview, purpose: event.target.value };
                    setOverview(next);
                    setErrors(validateOverview(next));
                  }}
                />
                {renderError("purpose")}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">행사 개요</label>
                  <AIGenerateButton
                    fieldName="summary"
                    context={{ ...aiContext, currentValue: overview.summary }}
                    onGenerated={(text) => setOverview((prev) => ({ ...prev, summary: text }))}
                    endpoint="/api/event-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.eventName || !basicInfo.eventType}
                  />
                </div>
                <Textarea
                  rows={5}
                  value={overview.summary}
                  onChange={(event) => {
                    const next = { ...overview, summary: event.target.value };
                    setOverview(next);
                    setErrors(validateOverview(next));
                  }}
                />
                {renderError("summary")}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">추진 배경 (선택)</label>
                  <AIGenerateButton
                    fieldName="background"
                    context={{ ...aiContext, currentValue: overview.background }}
                    onGenerated={(text) => setOverview((prev) => ({ ...prev, background: text }))}
                    endpoint="/api/event-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.eventName || !basicInfo.eventType}
                  />
                </div>
                <Textarea
                  rows={4}
                  value={overview.background}
                  onChange={(event) => setOverview((prev) => ({ ...prev, background: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">기대 효과</label>
                  <AIGenerateButton
                    fieldName="expectedEffects"
                    context={{ ...aiContext, currentValue: overview.expectedEffects }}
                    onGenerated={(text) => setOverview((prev) => ({ ...prev, expectedEffects: text }))}
                    endpoint="/api/event-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.eventName || !basicInfo.eventType}
                  />
                </div>
                <Textarea
                  rows={4}
                  value={overview.expectedEffects}
                  onChange={(event) => {
                    const next = { ...overview, expectedEffects: event.target.value };
                    setOverview(next);
                    setErrors(validateOverview(next));
                  }}
                />
                {renderError("expectedEffects")}
              </div>
            </CardContent>
          </Card>
        )}

            {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>세부 운영 계획</CardTitle>
              <CardDescription>프로그램 일정과 운영 계획을 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {programs.map((item, index) => (
                <div key={`program-${index}`} className="border border-border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">프로그램 {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={programs.length <= 3}
                      onClick={() => removeProgram(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">시간</label>
                      <Input
                        value={item.time}
                        onChange={(event) => updateProgram(index, { time: event.target.value })}
                        placeholder="09:00 ~ 09:30"
                      />
                      {renderError(`program-time-${index}`)}
                      {renderError(`program-overlap-${index}`)}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">프로그램명</label>
                      <Input
                        value={item.name}
                        onChange={(event) => updateProgram(index, { name: event.target.value })}
                        placeholder="예: 개회식"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">장소</label>
                      <Input
                        value={item.location}
                        onChange={(event) => updateProgram(index, { location: event.target.value })}
                        placeholder="예: 운동장"
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">대상</label>
                      <Input
                        value={item.target}
                        onChange={(event) => updateProgram(index, { target: event.target.value })}
                        placeholder="예: 전체"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">담당자</label>
                      <Input
                        value={item.manager}
                        onChange={(event) => updateProgram(index, { manager: event.target.value })}
                        placeholder="담당자명"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">비고</label>
                      <Input
                        value={item.notes}
                        onChange={(event) => updateProgram(index, { notes: event.target.value })}
                        placeholder="추가 메모"
                      />
                    </div>
                  </div>
                  {renderError(`program-${index}`)}
                </div>
              ))}

              <div className="flex items-center justify-between">
                <Button type="button" variant="outline" onClick={addProgram}>
                  <Plus className="w-4 h-4 mr-2" /> 프로그램 추가
                </Button>
                {renderError("programCount")}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">운영 방침</label>
                  <AIGenerateButton
                    fieldName="policy"
                    context={{ ...aiContext, currentValue: operation.policy }}
                    onGenerated={(text) => setOperation((prev) => ({ ...prev, policy: text }))}
                    endpoint="/api/event-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.eventName || !basicInfo.eventType}
                  />
                </div>
                <Textarea
                  rows={4}
                  value={operation.policy}
                  onChange={(event) => {
                    const next = { ...operation, policy: event.target.value };
                    setOperation(next);
                    setErrors(validateOperation(next));
                  }}
                />
                {renderError("policy")}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">준비 사항</label>
                  <AIGenerateButton
                    fieldName="preparation"
                    context={{ ...aiContext, currentValue: operation.preparation }}
                    onGenerated={(text) => setOperation((prev) => ({ ...prev, preparation: text }))}
                    endpoint="/api/event-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.eventName || !basicInfo.eventType}
                  />
                </div>
                <Textarea
                  rows={4}
                  value={operation.preparation}
                  onChange={(event) => {
                    const next = { ...operation, preparation: event.target.value };
                    setOperation(next);
                    setErrors(validateOperation(next));
                  }}
                />
                {renderError("preparation")}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">특별 프로그램 (선택)</label>
                  <AIGenerateButton
                    fieldName="specialProgram"
                    context={{ ...aiContext, currentValue: operation.specialProgram }}
                    onGenerated={(text) => setOperation((prev) => ({ ...prev, specialProgram: text }))}
                    endpoint="/api/event-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.eventName || !basicInfo.eventType}
                  />
                </div>
                <Textarea
                  rows={3}
                  value={operation.specialProgram}
                  onChange={(event) => setOperation((prev) => ({ ...prev, specialProgram: event.target.value }))}
                />
              </div>
            </CardContent>
          </Card>
        )}

            {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>조직 및 역할 분담</CardTitle>
              <CardDescription>추진 조직과 역할을 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {organization.teams.map((item, index) => (
                <div key={`team-${index}`} className="border border-border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">조직 {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={organization.teams.length <= 3}
                      onClick={() => removeTeam(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">부서/팀</label>
                      <Input
                        value={item.team}
                        onChange={(event) => updateTeam(index, { team: event.target.value })}
                        placeholder="예: 총괄"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">책임자</label>
                      <Input
                        value={item.manager}
                        onChange={(event) => updateTeam(index, { manager: event.target.value })}
                        placeholder="책임자명"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">구성원</label>
                      <Input
                        value={item.members}
                        onChange={(event) => updateTeam(index, { members: event.target.value })}
                        placeholder="예: 전체 교사"
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">역할</label>
                      <Input
                        value={item.role}
                        onChange={(event) => updateTeam(index, { role: event.target.value })}
                        placeholder="담당 업무"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">비고</label>
                      <Input
                        value={item.notes}
                        onChange={(event) => updateTeam(index, { notes: event.target.value })}
                        placeholder="추가 메모"
                      />
                    </div>
                  </div>
                  {renderError(`team-${index}`)}
                </div>
              ))}

              <div className="flex items-center justify-between">
                <Button type="button" variant="outline" onClick={addTeam}>
                  <Plus className="w-4 h-4 mr-2" /> 조직 추가
                </Button>
                {renderError("teamCount")}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">위원회 구성 (선택)</label>
                  <AIGenerateButton
                    fieldName="committee"
                    context={{ ...aiContext, currentValue: organization.committee }}
                    onGenerated={(text) => setOrganization((prev) => ({ ...prev, committee: text }))}
                    endpoint="/api/event-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.eventName || !basicInfo.eventType}
                  />
                </div>
                <Textarea
                  rows={3}
                  value={organization.committee}
                  onChange={(event) => setOrganization((prev) => ({ ...prev, committee: event.target.value }))}
                />
              </div>
            </CardContent>
          </Card>
        )}

            {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>안전 관리 계획</CardTitle>
              <CardDescription>안전 관리 방안을 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">안전 관리 대책</label>
                  <AIGenerateButton
                    fieldName="measures"
                    context={{ ...aiContext, currentValue: safety.measures }}
                    onGenerated={(text) => setSafety((prev) => ({ ...prev, measures: text }))}
                    endpoint="/api/event-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.eventName || !basicInfo.eventType}
                  />
                </div>
                <Textarea
                  rows={5}
                  value={safety.measures}
                  onChange={(event) => {
                    const next = { ...safety, measures: event.target.value };
                    setSafety(next);
                    setErrors(validateSafety(next));
                  }}
                />
                {renderError("measures")}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">비상 연락망</label>
                  <AIGenerateButton
                    fieldName="emergencyContact"
                    context={{ ...aiContext, currentValue: safety.emergencyContact }}
                    onGenerated={(text) => setSafety((prev) => ({ ...prev, emergencyContact: text }))}
                    endpoint="/api/event-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.eventName || !basicInfo.eventType}
                  />
                </div>
                <Textarea
                  rows={4}
                  value={safety.emergencyContact}
                  onChange={(event) => {
                    const next = { ...safety, emergencyContact: event.target.value };
                    setSafety(next);
                    setErrors(validateSafety(next));
                  }}
                />
                {renderError("emergencyContact")}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">응급 처치 체계</label>
                  <AIGenerateButton
                    fieldName="firstAid"
                    context={{ ...aiContext, currentValue: safety.firstAid }}
                    onGenerated={(text) => setSafety((prev) => ({ ...prev, firstAid: text }))}
                    endpoint="/api/event-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.eventName || !basicInfo.eventType}
                  />
                </div>
                <Textarea
                  rows={4}
                  value={safety.firstAid}
                  onChange={(event) => {
                    const next = { ...safety, firstAid: event.target.value };
                    setSafety(next);
                    setErrors(validateSafety(next));
                  }}
                />
                {renderError("firstAid")}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">기상 악화 대책 (선택)</label>
                  <AIGenerateButton
                    fieldName="weatherPlan"
                    context={{ ...aiContext, currentValue: safety.weatherPlan }}
                    onGenerated={(text) => setSafety((prev) => ({ ...prev, weatherPlan: text }))}
                    endpoint="/api/event-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.eventName || !basicInfo.eventType}
                  />
                </div>
                <Textarea
                  rows={3}
                  value={safety.weatherPlan}
                  onChange={(event) => setSafety((prev) => ({ ...prev, weatherPlan: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">보험 가입</label>
                <RadioGroup
                  value={safety.insurance}
                  onValueChange={(value) => {
                    const next = { ...safety, insurance: value as InsuranceStatus };
                    setSafety(next);
                    setErrors(validateSafety(next));
                  }}
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="가입 완료" id="insurance-yes" />
                    <label htmlFor="insurance-yes" className="text-sm">
                      가입 완료
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="미가입" id="insurance-no" />
                    <label htmlFor="insurance-no" className="text-sm">
                      미가입
                    </label>
                  </div>
                </RadioGroup>
                {renderError("insurance")}
              </div>
            </CardContent>
          </Card>
        )}

            {step === 5 && (
          <Card>
            <CardHeader>
              <CardTitle>예산 계획</CardTitle>
              <CardDescription>항목별 예산을 입력하면 자동으로 계산됩니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {budgetItems.map((item, index) => {
                const quantity = Number(item.quantity || 0);
                const unitPrice = Number(item.unitPrice || 0);
                const amount = Number.isNaN(quantity) || Number.isNaN(unitPrice) ? 0 : quantity * unitPrice;
                return (
                  <div key={`budget-${index}`} className="border border-border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">예산 항목 {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={budgetItems.length <= 1}
                        onClick={() => removeBudgetItem(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">항목</label>
                        <Input
                          value={item.category}
                          onChange={(event) => updateBudgetItem(index, { category: event.target.value })}
                          placeholder="예: 물품 구입"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">세부 내용</label>
                        <Input
                          value={item.detail}
                          onChange={(event) => updateBudgetItem(index, { detail: event.target.value })}
                          placeholder="예: 상품권"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">수량</label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(event) => updateBudgetItem(index, { quantity: event.target.value })}
                          placeholder="예: 100"
                        />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">단가</label>
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(event) => updateBudgetItem(index, { unitPrice: event.target.value })}
                          placeholder="예: 5000"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">금액 (자동)</label>
                        <Input value={amount.toLocaleString()} readOnly />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">비고</label>
                        <Input
                          value={item.notes}
                          onChange={(event) => updateBudgetItem(index, { notes: event.target.value })}
                          placeholder="추가 메모"
                        />
                      </div>
                    </div>
                    {renderError(`budget-${index}`)}
                  </div>
                );
              })}

              <div className="flex items-center justify-between">
                <Button type="button" variant="outline" onClick={addBudgetItem}>
                  <Plus className="w-4 h-4 mr-2" /> 항목 추가
                </Button>
                {renderError("budgetCount")}
              </div>

              <Card className="bg-emerald-50/50 border-emerald-200">
                <CardHeader>
                  <CardTitle className="text-base">💰 예산 현황</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(budgetTotals).map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between text-sm">
                      <span>{category}</span>
                      <span>{amount.toLocaleString()}원</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-base font-semibold pt-2 border-t border-emerald-200">
                    <span>총 예산</span>
                    <span>{totalBudget.toLocaleString()}원</span>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        )}

            {step === 6 && (
          <Card>
            <CardHeader>
              <CardTitle>사전 준비 일정</CardTitle>
              <CardDescription>행사 전 준비 일정을 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {scheduleItems.map((item, index) => (
                <div key={`schedule-${index}`} className="border border-border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">준비 일정 {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={scheduleItems.length <= 3}
                      onClick={() => removeScheduleItem(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">날짜</label>
                      <Input
                        value={item.date}
                        onChange={(event) => updateScheduleItem(index, { date: event.target.value })}
                        placeholder="예: D-30"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">준비 내용</label>
                      <Input
                        value={item.task}
                        onChange={(event) => updateScheduleItem(index, { task: event.target.value })}
                        placeholder="예: 행사 계획서 작성"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">담당</label>
                      <Input
                        value={item.manager}
                        onChange={(event) => updateScheduleItem(index, { manager: event.target.value })}
                        placeholder="담당자"
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`schedule-completed-${index}`}
                        checked={item.completed}
                        onCheckedChange={(checked) => updateScheduleItem(index, { completed: Boolean(checked) })}
                      />
                      <label htmlFor={`schedule-completed-${index}`} className="text-sm">
                        완료 여부
                      </label>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">비고</label>
                      <Input
                        value={item.notes}
                        onChange={(event) => updateScheduleItem(index, { notes: event.target.value })}
                        placeholder="추가 메모"
                      />
                    </div>
                  </div>
                  {renderError(`schedule-${index}`)}
                </div>
              ))}

              <div className="flex items-center justify-between">
                <Button type="button" variant="outline" onClick={addScheduleItem}>
                  <Plus className="w-4 h-4 mr-2" /> 일정 추가
                </Button>
                {renderError("scheduleCount")}
              </div>
            </CardContent>
          </Card>
        )}

            {step === 7 && (
          <Card>
            <CardHeader>
              <CardTitle>평가 계획</CardTitle>
              <CardDescription>평가 방법과 환류 계획을 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">평가 방법</label>
                  <AIGenerateButton
                    fieldName="evaluation_methods"
                    context={{ ...aiContext, currentValue: evaluation.methods }}
                    onGenerated={(text) => setEvaluation((prev) => ({ ...prev, methods: text }))}
                    endpoint="/api/event-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.eventName || !basicInfo.eventType}
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
                    context={{ ...aiContext, currentValue: evaluation.indicators }}
                    onGenerated={(text) => setEvaluation((prev) => ({ ...prev, indicators: text }))}
                    endpoint="/api/event-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.eventName || !basicInfo.eventType}
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
                    context={{ ...aiContext, currentValue: evaluation.feedback }}
                    onGenerated={(text) => setEvaluation((prev) => ({ ...prev, feedback: text }))}
                    endpoint="/api/event-plan/generate-ai-content"
                    documentType="care"
                    disabled={!basicInfo.schoolName || !basicInfo.eventName || !basicInfo.eventType}
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
