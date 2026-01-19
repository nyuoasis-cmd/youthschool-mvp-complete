import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Coins, Loader2, Plus, Trash2 } from "lucide-react";
import { AIGenerateButton } from "@/components/AIGenerateButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { HwpReferenceUpload } from "@/components/HwpReferenceUpload";

type DocumentKind = "예산 공개" | "결산 공개" | "";

interface BasicInfo {
  schoolName: string;
  documentType: DocumentKind;
  fiscalYear: string;
  startDate: string;
  endDate: string;
  purpose: string;
  author: string;
  position: string;
  writeDate: string;
}

interface OverviewInfo {
  totalAmount: string;
  changeAmount: string;
  changeRate: string;
  changeStatus: "증가" | "감소" | "동일" | "";
  totalStudents: string;
  budgetDirection: string;
  mainFeatures: string;
}

interface ResourceItem {
  category: string;
  amount: string;
  ratio: string;
  notes: string;
}

interface ProjectItem {
  name: string;
  amount: string;
  ratio: string;
  department: string;
  notes: string;
  purpose: string;
  details: string;
  expectedEffects: string;
}

interface PerformanceInfo {
  achievements: string;
  executionAmount: string;
  unspentReason: string;
  improvements: string;
}

interface ExecutionItem {
  quarter: string;
  budgetAmount: string;
  executedAmount: string;
  ratio: string;
  notes: string;
}

interface FuturePlansInfo {
  executionPlan: string;
  focusAreas: string;
  expectedEffects: string;
}

interface AttachmentsInfo {
  parentNotice: string;
  terminology: string;
  contactInfo: string;
}

const fiscalYears = ["2025", "2024", "2023"];
const purposes = ["학부모 및 지역주민 대상", "학교운영위원회 심의용", "교육청 제출용", "홈페이지 게시용"];
const changeStatuses: OverviewInfo["changeStatus"][] = ["증가", "감소", "동일"];
const classificationBases = ["교육활동별", "부서별", "목적별"];

const emptyResourceItem = (): ResourceItem => ({
  category: "",
  amount: "",
  ratio: "",
  notes: "",
});

const emptyProjectItem = (): ProjectItem => ({
  name: "",
  amount: "",
  ratio: "",
  department: "",
  notes: "",
  purpose: "",
  details: "",
  expectedEffects: "",
});

const emptyExecutionItem = (quarter: string): ExecutionItem => ({
  quarter,
  budgetAmount: "",
  executedAmount: "",
  ratio: "",
  notes: "",
});

const formatNumber = (value: string) => {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString();
};

const parseNumber = (value: string) => {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
};

export default function BudgetDisclosureForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [basicInfo, setBasicInfo] = useState<BasicInfo>({
    schoolName: "",
    documentType: "",
    fiscalYear: "2025",
    startDate: "",
    endDate: "",
    purpose: purposes[0],
    author: "",
    position: "",
    writeDate: "",
  });
  const [overview, setOverview] = useState<OverviewInfo>({
    totalAmount: "",
    changeAmount: "",
    changeRate: "",
    changeStatus: "",
    totalStudents: "",
    budgetDirection: "",
    mainFeatures: "",
  });
  const [resources, setResources] = useState<ResourceItem[]>([
    emptyResourceItem(),
    emptyResourceItem(),
    emptyResourceItem(),
  ]);
  const [resourceDescription, setResourceDescription] = useState("");
  const [classificationBasis, setClassificationBasis] = useState(classificationBases[0]);
  const [projects, setProjects] = useState<ProjectItem[]>([
    emptyProjectItem(),
    emptyProjectItem(),
    emptyProjectItem(),
  ]);
  const [performance, setPerformance] = useState<PerformanceInfo>({
    achievements: "",
    executionAmount: "",
    unspentReason: "",
    improvements: "",
  });
  const [executions, setExecutions] = useState<ExecutionItem[]>([
    emptyExecutionItem("1분기"),
    emptyExecutionItem("2분기"),
    emptyExecutionItem("3분기"),
    emptyExecutionItem("4분기"),
  ]);
  const [executionAnalysis, setExecutionAnalysis] = useState("");
  const [futurePlans, setFuturePlans] = useState<FuturePlansInfo>({
    executionPlan: "",
    focusAreas: "",
    expectedEffects: "",
  });
  const [attachments, setAttachments] = useState<AttachmentsInfo>({
    parentNotice: "",
    terminology: "",
    contactInfo: "",
  });
  const [referenceFileId, setReferenceFileId] = useState<number | null>(null);

  const totalAmountNumber = parseNumber(overview.totalAmount);
  const totalStudentsNumber = parseNumber(overview.totalStudents);
  const amountPerStudent = totalStudentsNumber ? Math.round(totalAmountNumber / totalStudentsNumber) : 0;
  const executionAmountNumber = parseNumber(performance.executionAmount);
  const executionRate = totalAmountNumber ? (executionAmountNumber / totalAmountNumber) * 100 : 0;

  const resourceSum = resources.reduce((sum, item) => sum + parseNumber(item.amount), 0);
  const resourceRatioSum = resources.reduce((sum, item) => sum + Number(item.ratio || 0), 0);
  const projectSum = projects.reduce((sum, item) => sum + parseNumber(item.amount), 0);
  const projectRatioSum = projects.reduce((sum, item) => sum + Number(item.ratio || 0), 0);
  const executionBudgetSum = executions.reduce((sum, item) => sum + parseNumber(item.budgetAmount), 0);
  const executionExecutedSum = executions.reduce((sum, item) => sum + parseNumber(item.executedAmount), 0);
  const executionTotalRate = executionBudgetSum ? (executionExecutedSum / executionBudgetSum) * 100 : 0;

  const majorProjects = useMemo(() => {
    return [...projects]
      .map((item, index) => ({
        ...item,
        _index: index,
        _amount: parseNumber(item.amount),
      }))
      .filter((item) => item.name || item._amount > 0)
      .sort((a, b) => b._amount - a._amount)
      .slice(0, Math.min(5, projects.length));
  }, [projects]);

  const visibleSteps = useMemo(() => {
    const list = [
      { key: "basic", label: "기본 정보" },
      { key: "overview", label: "예산/결산 개요" },
      { key: "resources", label: "재원별 내역" },
      { key: "projects", label: "사업별 예산/결산" },
      { key: "performance", label: "성과 및 평가", show: basicInfo.documentType === "결산 공개" },
      { key: "execution", label: "집행 현황", show: basicInfo.documentType === "결산 공개" },
      { key: "future", label: "향후 계획", show: basicInfo.documentType === "예산 공개" },
      { key: "attachments", label: "첨부 자료" },
    ];
    return list.filter((item) => item.show !== false);
  }, [basicInfo.documentType]);

  const currentStep = visibleSteps[step]?.key ?? "basic";
  const progressValue = ((step + 1) / visibleSteps.length) * 100;

  const updateResource = (index: number, updates: Partial<ResourceItem>) => {
    setResources((prev) => {
      const next = prev.map((item, idx) => (idx === index ? { ...item, ...updates } : item));
      return next.map((item) => {
        const amount = parseNumber(item.amount);
        const ratio = totalAmountNumber ? ((amount / totalAmountNumber) * 100).toFixed(1) : "";
        return { ...item, ratio };
      });
    });
  };

  const updateProject = (index: number, updates: Partial<ProjectItem>) => {
    setProjects((prev) => {
      const next = prev.map((item, idx) => (idx === index ? { ...item, ...updates } : item));
      return next.map((item) => {
        const amount = parseNumber(item.amount);
        const ratio = totalAmountNumber ? ((amount / totalAmountNumber) * 100).toFixed(1) : "";
        return { ...item, ratio };
      });
    });
  };

  const updateExecution = (index: number, updates: Partial<ExecutionItem>) => {
    setExecutions((prev) => {
      const next = prev.map((item, idx) => (idx === index ? { ...item, ...updates } : item));
      return next.map((item) => {
        const budgetAmount = parseNumber(item.budgetAmount);
        const executedAmount = parseNumber(item.executedAmount);
        const ratio = budgetAmount ? ((executedAmount / budgetAmount) * 100).toFixed(1) : "";
        return { ...item, ratio };
      });
    });
  };

  const addResource = () => setResources((prev) => [...prev, emptyResourceItem()]);
  const removeResource = (index: number) => {
    if (resources.length <= 1) return;
    setResources((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addProject = () => setProjects((prev) => [...prev, emptyProjectItem()]);
  const removeProject = (index: number) => {
    if (projects.length <= 1) return;
    setProjects((prev) => prev.filter((_, idx) => idx !== index));
  };

  const buildInputs = () => {
    const basicInfoText = [
      `학교명: ${basicInfo.schoolName || "(미입력)"}`,
      `문서 유형: ${basicInfo.documentType || "(미입력)"}`,
      `회계연도: ${basicInfo.fiscalYear || "(미입력)"}`,
      `대상 기간: ${basicInfo.startDate || "(미입력)"} ~ ${basicInfo.endDate || "(미입력)"}`,
      `공개 목적: ${basicInfo.purpose || "(미입력)"}`,
      `작성자: ${basicInfo.author || "(미입력)"}`,
      `직책: ${basicInfo.position || "(미입력)"}`,
      `작성 날짜: ${basicInfo.writeDate || "(미입력)"}`,
    ].join("\n");

    const overviewText = [
      `총 예산(결산)액: ${overview.totalAmount || "(미입력)"}`,
      `전년 대비 증감 금액: ${overview.changeAmount || "(미입력)"}`,
      `전년 대비 증감 비율: ${overview.changeRate || "(미입력)"}%`,
      `증감 상태: ${overview.changeStatus || "(미입력)"}`,
      `전체 학생 수: ${overview.totalStudents || "(미입력)"}`,
      `학생 1인당 금액: ${amountPerStudent.toLocaleString()}원`,
      `편성 방향: ${overview.budgetDirection || "(미입력)"}`,
      `주요 특징: ${overview.mainFeatures || "(미입력)"}`,
    ].join("\n");

    const resourcesText = [
      "재원별 내역:",
      ...resources.map((item, index) => {
        return `${index + 1}. ${item.category || "(미입력)"} / ${item.amount || "(미입력)"} / ${
          item.ratio || "(미입력)"
        }% ${item.notes ? `/ ${item.notes}` : ""}`;
      }),
      `재원별 설명: ${resourceDescription || "(미입력)"}`,
    ].join("\n");

    const projectsText = [
      `사업 분류 기준: ${classificationBasis}`,
      "사업별 내역:",
      ...projects.map((item, index) => {
        return `${index + 1}. ${item.name || "(미입력)"} / ${item.amount || "(미입력)"} / ${
          item.ratio || "(미입력)"
        }% / ${item.department || "(미입력)"} ${item.notes ? `/ ${item.notes}` : ""}`;
      }),
      "주요 사업별 상세:",
      ...majorProjects.map((item) => {
        return `${item.name || "(미입력)"}: 목적(${item.purpose || "(미입력)"}), 세부 내역(${
          item.details || "(미입력)"
        }), 기대 효과(${item.expectedEffects || "(미입력)"})`;
      }),
    ].join("\n");

    const performanceText = [
      `주요 성과: ${performance.achievements || "(미입력)"}`,
      `예산액: ${overview.totalAmount || "(미입력)"}`,
      `집행액: ${performance.executionAmount || "(미입력)"}`,
      `집행률: ${executionRate.toFixed(1)}%`,
      `미집행 사유: ${performance.unspentReason || "(미입력)"}`,
      `개선 사항: ${performance.improvements || "(미입력)"}`,
    ].join("\n");

    const executionText = [
      "분기별 집행 현황:",
      ...executions.map((item) => {
        return `${item.quarter}: 예산 ${item.budgetAmount || "(미입력)"}, 집행 ${
          item.executedAmount || "(미입력)"
        }, 집행률 ${item.ratio || "(미입력)"}%${item.notes ? ` (${item.notes})` : ""}`;
      }),
      `집행 현황 분석: ${executionAnalysis || "(미입력)"}`,
    ].join("\n");

    const futurePlansText = [
      `집행 계획: ${futurePlans.executionPlan || "(미입력)"}`,
      `중점 추진 사항: ${futurePlans.focusAreas || "(미입력)"}`,
      `기대 효과: ${futurePlans.expectedEffects || "(미입력)"}`,
    ].join("\n");

    const attachmentsText = [
      `학부모 안내 사항: ${attachments.parentNotice || "(미입력)"}`,
      `용어 설명: ${attachments.terminology || "(미입력)"}`,
      `문의처 안내: ${attachments.contactInfo || "(미입력)"}`,
    ].join("\n");

    return {
      title: `${basicInfo.fiscalYear || "연도"}학년도 ${basicInfo.schoolName || "학교"} ${
        basicInfo.documentType || "예산/결산"
      } 공개 자료`,
      basicInfo: basicInfoText,
      overview: overviewText,
      resources: resourcesText,
      projects: projectsText,
      performance: performanceText,
      execution: executionText,
      futurePlans: futurePlansText,
      attachments: attachmentsText,
    };
  };

  const buildDocumentContent = () => {
    const inputs = buildInputs();
    const { title: _title, ...sections } = inputs;
    const labels: Record<string, string> = {
      basicInfo: "기본 정보",
      overview: "예산/결산 개요",
      resources: "재원별 내역",
      projects: "사업별 예산/결산",
      performance: "성과 및 평가",
      execution: "집행 현황",
      futurePlans: "향후 계획",
      attachments: "첨부 자료",
    };
    return Object.entries(sections)
      .filter(([key]) => {
        if (key === "performance" || key === "execution") {
          return basicInfo.documentType === "결산 공개";
        }
        if (key === "futurePlans") {
          return basicInfo.documentType === "예산 공개";
        }
        return true;
      })
      .map(([key, value]) => `[${labels[key] ?? key}]\n${value}`)
      .join("\n\n");
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/documents/generate", {
        documentType: "예산/결산 공개 자료",
        inputs: buildInputs(),
        uploadedTemplateId: referenceFileId ?? undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "문서 생성 완료",
        description: "예산/결산 공개 자료가 생성되었습니다.",
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
        documentType: "예산/결산 공개 자료",
        title: buildInputs().title,
        schoolName: basicInfo.schoolName,
        metadata: {
          purpose: basicInfo.purpose,
          targetDate: basicInfo.startDate,
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
    setStep((prev) => Math.min(prev + 1, visibleSteps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrev = () => {
    setStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
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
              <h1 className="text-lg font-semibold text-foreground">예산/결산 공개 자료 작성</h1>
              <p className="text-sm text-muted-foreground">단계별로 정보를 입력하면 공개 자료를 생성합니다</p>
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
                  <Coins className="w-4 h-4 text-primary" />
                  단계 이동
                </CardTitle>
                <CardDescription>{`${step + 1}단계 / ${visibleSteps.length}단계`}</CardDescription>
                <Progress value={progressValue} className="mt-3" />
              </CardHeader>
              <CardContent className="space-y-2">
                {visibleSteps.map((item, idx) => (
                  <Button
                    key={item.key}
                    type="button"
                    variant={idx === step ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setStep(idx)}
                  >
                    {item.label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </aside>

          <div className="flex-1 space-y-6">
            {currentStep === "basic" && (
              <Card>
                <CardHeader>
                  <CardTitle>기본 정보</CardTitle>
                  <CardDescription>예산/결산 공개 자료의 기본 정보를 입력하세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">학교명</label>
                      <Input
                        value={basicInfo.schoolName}
                        onChange={(event) => setBasicInfo((prev) => ({ ...prev, schoolName: event.target.value }))}
                        placeholder="예: ○○초등학교"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">문서 유형</label>
                      <RadioGroup
                        value={basicInfo.documentType}
                        onValueChange={(value) => setBasicInfo((prev) => ({ ...prev, documentType: value as DocumentKind }))}
                        className="flex flex-wrap gap-4"
                      >
                        {["예산 공개", "결산 공개"].map((type) => (
                          <label key={type} className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value={type} />
                            {type}
                          </label>
                        ))}
                      </RadioGroup>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">회계연도</label>
                      <Select
                        value={basicInfo.fiscalYear}
                        onValueChange={(value) => setBasicInfo((prev) => ({ ...prev, fiscalYear: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="연도 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {fiscalYears.map((year) => (
                            <SelectItem key={year} value={year}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">대상 시작일</label>
                      <Input
                        type="date"
                        value={basicInfo.startDate}
                        onChange={(event) => setBasicInfo((prev) => ({ ...prev, startDate: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">대상 종료일</label>
                      <Input
                        type="date"
                        value={basicInfo.endDate}
                        onChange={(event) => setBasicInfo((prev) => ({ ...prev, endDate: event.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">공개 목적</label>
                      <Select
                        value={basicInfo.purpose}
                        onValueChange={(value) => setBasicInfo((prev) => ({ ...prev, purpose: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="공개 목적 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {purposes.map((purpose) => (
                            <SelectItem key={purpose} value={purpose}>
                              {purpose}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">작성 날짜</label>
                      <Input
                        type="date"
                        value={basicInfo.writeDate}
                        onChange={(event) => setBasicInfo((prev) => ({ ...prev, writeDate: event.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">작성자</label>
                      <Input
                        value={basicInfo.author}
                        onChange={(event) => setBasicInfo((prev) => ({ ...prev, author: event.target.value }))}
                        placeholder="예: 홍길동"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">직책</label>
                      <Input
                        value={basicInfo.position}
                        onChange={(event) => setBasicInfo((prev) => ({ ...prev, position: event.target.value }))}
                        placeholder="예: 행정실장"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === "overview" && (
              <Card>
                <CardHeader>
                  <CardTitle>예산/결산 개요</CardTitle>
                  <CardDescription>전체 예산(결산) 개요를 입력하세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">총 예산(결산)액</label>
                      <Input
                        value={overview.totalAmount}
                        onChange={(event) =>
                          setOverview((prev) => ({ ...prev, totalAmount: formatNumber(event.target.value) }))
                        }
                        placeholder="예: 1,500,000,000"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">전체 학생 수</label>
                      <Input
                        value={overview.totalStudents}
                        onChange={(event) =>
                          setOverview((prev) => ({ ...prev, totalStudents: formatNumber(event.target.value) }))
                        }
                        placeholder="예: 500"
                      />
                      <p className="text-xs text-muted-foreground">
                        학생 1인당 금액: {amountPerStudent ? amountPerStudent.toLocaleString() : "-"}원
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">전년 대비 증감 금액</label>
                      <Input
                        value={overview.changeAmount}
                        onChange={(event) =>
                          setOverview((prev) => ({ ...prev, changeAmount: formatNumber(event.target.value) }))
                        }
                        placeholder="예: 100,000,000"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">전년 대비 증감 비율(%)</label>
                      <Input
                        value={overview.changeRate}
                        onChange={(event) => setOverview((prev) => ({ ...prev, changeRate: event.target.value }))}
                        placeholder="예: 7.1"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">증감 상태</label>
                      <RadioGroup
                        value={overview.changeStatus}
                        onValueChange={(value) => setOverview((prev) => ({ ...prev, changeStatus: value as OverviewInfo["changeStatus"] }))}
                        className="flex flex-wrap gap-3"
                      >
                        {changeStatuses.map((status) => (
                          <label key={status} className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value={status} />
                            {status}
                          </label>
                        ))}
                      </RadioGroup>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-sm font-medium">예산(결산) 편성 방향</label>
                      <AIGenerateButton
                        fieldName="budgetDirection"
                        context={{ basicInfo, overview, currentValue: overview.budgetDirection }}
                        onGenerated={(text) => setOverview((prev) => ({ ...prev, budgetDirection: text }))}
                        endpoint="/api/budget-disclosure/generate-ai-content"
                        documentType="budget-disclosure"
                      />
                    </div>
                    <Textarea
                      rows={5}
                      value={overview.budgetDirection}
                      onChange={(event) => setOverview((prev) => ({ ...prev, budgetDirection: event.target.value }))}
                      placeholder="예산 편성의 기본 방향을 입력하세요."
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-sm font-medium">주요 특징</label>
                      <AIGenerateButton
                        fieldName="mainFeatures"
                        context={{ basicInfo, overview, currentValue: overview.mainFeatures }}
                        onGenerated={(text) => setOverview((prev) => ({ ...prev, mainFeatures: text }))}
                        endpoint="/api/budget-disclosure/generate-ai-content"
                        documentType="budget-disclosure"
                      />
                    </div>
                    <Textarea
                      rows={5}
                      value={overview.mainFeatures}
                      onChange={(event) => setOverview((prev) => ({ ...prev, mainFeatures: event.target.value }))}
                      placeholder="주요 특징을 입력하세요."
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === "resources" && (
              <Card>
                <CardHeader>
                  <CardTitle>재원별 내역</CardTitle>
                  <CardDescription>재원별 예산(결산) 내역을 입력하세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {resources.map((item, index) => (
                    <div key={`resource-${index}`} className="border border-border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">재원 {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={resources.length <= 1}
                          onClick={() => removeResource(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid md:grid-cols-4 gap-4">
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-sm font-medium">재원 구분</label>
                          <Input
                            value={item.category}
                            onChange={(event) => updateResource(index, { category: event.target.value })}
                            placeholder="예: 국고보조금"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">금액</label>
                          <Input
                            value={item.amount}
                            onChange={(event) => updateResource(index, { amount: formatNumber(event.target.value) })}
                            placeholder="예: 500,000,000"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">비율(%)</label>
                          <Input value={item.ratio} readOnly placeholder="자동 계산" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">비고</label>
                        <Input
                          value={item.notes}
                          onChange={(event) => updateResource(index, { notes: event.target.value })}
                          placeholder="추가 메모"
                        />
                      </div>
                    </div>
                  ))}

                  <Button type="button" variant="outline" onClick={addResource}>
                    <Plus className="w-4 h-4 mr-2" /> 재원 추가
                  </Button>

                  <div className="rounded-lg border border-dashed border-muted p-4 text-sm text-muted-foreground">
                    <p>총 금액: {resourceSum.toLocaleString()}원</p>
                    <p>총 비율: {resourceRatioSum.toFixed(1)}%</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-sm font-medium">재원별 설명</label>
                      <AIGenerateButton
                        fieldName="resourceDescription"
                        context={{ basicInfo, overview, resources, currentValue: resourceDescription }}
                        onGenerated={(text) => setResourceDescription(text)}
                        endpoint="/api/budget-disclosure/generate-ai-content"
                        documentType="budget-disclosure"
                      />
                    </div>
                    <Textarea
                      rows={5}
                      value={resourceDescription}
                      onChange={(event) => setResourceDescription(event.target.value)}
                      placeholder="재원별 상세 설명을 입력하세요."
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === "projects" && (
              <Card>
                <CardHeader>
                  <CardTitle>사업별 예산/결산</CardTitle>
                  <CardDescription>사업별 예산(결산) 내역을 입력하세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">사업 분류 기준</label>
                    <RadioGroup
                      value={classificationBasis}
                      onValueChange={setClassificationBasis}
                      className="flex flex-wrap gap-4"
                    >
                      {classificationBases.map((basis) => (
                        <label key={basis} className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value={basis} />
                          {basis}
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  {projects.map((item, index) => (
                    <div key={`project-${index}`} className="border border-border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">사업 {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={projects.length <= 1}
                          onClick={() => removeProject(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid md:grid-cols-5 gap-4">
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-sm font-medium">사업명</label>
                          <Input
                            value={item.name}
                            onChange={(event) => updateProject(index, { name: event.target.value })}
                            placeholder="예: 교육과정 운영"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">금액</label>
                          <Input
                            value={item.amount}
                            onChange={(event) => updateProject(index, { amount: formatNumber(event.target.value) })}
                            placeholder="예: 400,000,000"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">비율(%)</label>
                          <Input value={item.ratio} readOnly placeholder="자동 계산" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">담당</label>
                          <Input
                            value={item.department}
                            onChange={(event) => updateProject(index, { department: event.target.value })}
                            placeholder="예: 교무"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">비고</label>
                        <Input
                          value={item.notes}
                          onChange={(event) => updateProject(index, { notes: event.target.value })}
                          placeholder="추가 메모"
                        />
                      </div>
                    </div>
                  ))}

                  <Button type="button" variant="outline" onClick={addProject}>
                    <Plus className="w-4 h-4 mr-2" /> 사업 추가
                  </Button>

                  <div className="rounded-lg border border-dashed border-muted p-4 text-sm text-muted-foreground">
                    <p>총 금액: {projectSum.toLocaleString()}원</p>
                    <p>총 비율: {projectRatioSum.toFixed(1)}%</p>
                  </div>

                  {majorProjects.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold">주요 사업별 상세</h4>
                      {majorProjects.map((project) => (
                        <Card key={`major-${project._index}`} className="border border-muted">
                          <CardHeader>
                            <CardTitle className="text-base">
                              {project.name || "주요 사업"} {project.amount ? `${project.amount}원` : ""}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <label className="text-sm font-medium">사업 목적</label>
                                <AIGenerateButton
                                  fieldName={`projectPurpose-${project._index}`}
                                  context={{ basicInfo, overview, project, currentValue: project.purpose }}
                                  onGenerated={(text) => updateProject(project._index, { purpose: text })}
                                  endpoint="/api/budget-disclosure/generate-ai-content"
                                  documentType="budget-disclosure"
                                />
                              </div>
                              <Textarea
                                rows={3}
                                value={project.purpose}
                                onChange={(event) => updateProject(project._index, { purpose: event.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <label className="text-sm font-medium">세부 내역</label>
                                <AIGenerateButton
                                  fieldName={`projectDetails-${project._index}`}
                                  context={{ basicInfo, overview, project, currentValue: project.details }}
                                  onGenerated={(text) => updateProject(project._index, { details: text })}
                                  endpoint="/api/budget-disclosure/generate-ai-content"
                                  documentType="budget-disclosure"
                                />
                              </div>
                              <Textarea
                                rows={4}
                                value={project.details}
                                onChange={(event) => updateProject(project._index, { details: event.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <label className="text-sm font-medium">기대 효과</label>
                                <AIGenerateButton
                                  fieldName={`projectEffects-${project._index}`}
                                  context={{ basicInfo, overview, project, currentValue: project.expectedEffects }}
                                  onGenerated={(text) => updateProject(project._index, { expectedEffects: text })}
                                  endpoint="/api/budget-disclosure/generate-ai-content"
                                  documentType="budget-disclosure"
                                />
                              </div>
                              <Textarea
                                rows={3}
                                value={project.expectedEffects}
                                onChange={(event) => updateProject(project._index, { expectedEffects: event.target.value })}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {currentStep === "performance" && (
              <Card>
                <CardHeader>
                  <CardTitle>성과 및 평가</CardTitle>
                  <CardDescription>결산 성과 및 평가를 입력하세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-sm font-medium">주요 성과</label>
                      <AIGenerateButton
                        fieldName="achievements"
                        context={{ basicInfo, overview, projects, currentValue: performance.achievements }}
                        onGenerated={(text) => setPerformance((prev) => ({ ...prev, achievements: text }))}
                        endpoint="/api/budget-disclosure/generate-ai-content"
                        documentType="budget-disclosure"
                      />
                    </div>
                    <Textarea
                      rows={6}
                      value={performance.achievements}
                      onChange={(event) => setPerformance((prev) => ({ ...prev, achievements: event.target.value }))}
                    />
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">예산액</label>
                      <Input value={overview.totalAmount} readOnly />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">집행액</label>
                      <Input
                        value={performance.executionAmount}
                        onChange={(event) =>
                          setPerformance((prev) => ({ ...prev, executionAmount: formatNumber(event.target.value) }))
                        }
                        placeholder="예: 1,450,000,000"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">집행률</label>
                      <Input value={executionRate ? executionRate.toFixed(1) : ""} readOnly placeholder="자동 계산" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-sm font-medium">미집행 사유</label>
                      <AIGenerateButton
                        fieldName="unspentReason"
                        context={{ basicInfo, overview, performance, currentValue: performance.unspentReason }}
                        onGenerated={(text) => setPerformance((prev) => ({ ...prev, unspentReason: text }))}
                        endpoint="/api/budget-disclosure/generate-ai-content"
                        documentType="budget-disclosure"
                      />
                    </div>
                    <Textarea
                      rows={3}
                      value={performance.unspentReason}
                      onChange={(event) => setPerformance((prev) => ({ ...prev, unspentReason: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-sm font-medium">개선 사항</label>
                      <AIGenerateButton
                        fieldName="improvements"
                        context={{ basicInfo, overview, performance, currentValue: performance.improvements }}
                        onGenerated={(text) => setPerformance((prev) => ({ ...prev, improvements: text }))}
                        endpoint="/api/budget-disclosure/generate-ai-content"
                        documentType="budget-disclosure"
                      />
                    </div>
                    <Textarea
                      rows={4}
                      value={performance.improvements}
                      onChange={(event) => setPerformance((prev) => ({ ...prev, improvements: event.target.value }))}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === "execution" && (
              <Card>
                <CardHeader>
                  <CardTitle>집행 현황</CardTitle>
                  <CardDescription>분기별 집행 현황을 입력하세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {executions.map((item, index) => (
                    <div key={`execution-${index}`} className="border border-border rounded-lg p-4 space-y-4">
                      <div className="grid md:grid-cols-5 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">분기</label>
                          <Input value={item.quarter} readOnly />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">예산액</label>
                          <Input
                            value={item.budgetAmount}
                            onChange={(event) =>
                              updateExecution(index, { budgetAmount: formatNumber(event.target.value) })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">집행액</label>
                          <Input
                            value={item.executedAmount}
                            onChange={(event) =>
                              updateExecution(index, { executedAmount: formatNumber(event.target.value) })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">집행률(%)</label>
                          <Input value={item.ratio} readOnly placeholder="자동 계산" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">비고</label>
                          <Input
                            value={item.notes}
                            onChange={(event) => updateExecution(index, { notes: event.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="rounded-lg border border-dashed border-muted p-4 text-sm text-muted-foreground">
                    <p>예산액 합계: {executionBudgetSum.toLocaleString()}원</p>
                    <p>집행액 합계: {executionExecutedSum.toLocaleString()}원</p>
                    <p>집행률: {executionTotalRate ? executionTotalRate.toFixed(1) : "-"}%</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-sm font-medium">집행 현황 분석</label>
                      <AIGenerateButton
                        fieldName="executionAnalysis"
                        context={{ basicInfo, overview, executions, currentValue: executionAnalysis }}
                        onGenerated={(text) => setExecutionAnalysis(text)}
                        endpoint="/api/budget-disclosure/generate-ai-content"
                        documentType="budget-disclosure"
                      />
                    </div>
                    <Textarea
                      rows={4}
                      value={executionAnalysis}
                      onChange={(event) => setExecutionAnalysis(event.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === "future" && (
              <Card>
                <CardHeader>
                  <CardTitle>향후 계획</CardTitle>
                  <CardDescription>향후 추진 계획을 입력하세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-sm font-medium">집행 계획</label>
                      <AIGenerateButton
                        fieldName="executionPlan"
                        context={{ basicInfo, overview, currentValue: futurePlans.executionPlan }}
                        onGenerated={(text) => setFuturePlans((prev) => ({ ...prev, executionPlan: text }))}
                        endpoint="/api/budget-disclosure/generate-ai-content"
                        documentType="budget-disclosure"
                      />
                    </div>
                    <Textarea
                      rows={5}
                      value={futurePlans.executionPlan}
                      onChange={(event) => setFuturePlans((prev) => ({ ...prev, executionPlan: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-sm font-medium">중점 추진 사항</label>
                      <AIGenerateButton
                        fieldName="focusAreas"
                        context={{ basicInfo, overview, currentValue: futurePlans.focusAreas }}
                        onGenerated={(text) => setFuturePlans((prev) => ({ ...prev, focusAreas: text }))}
                        endpoint="/api/budget-disclosure/generate-ai-content"
                        documentType="budget-disclosure"
                      />
                    </div>
                    <Textarea
                      rows={5}
                      value={futurePlans.focusAreas}
                      onChange={(event) => setFuturePlans((prev) => ({ ...prev, focusAreas: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-sm font-medium">기대 효과</label>
                      <AIGenerateButton
                        fieldName="futureEffects"
                        context={{ basicInfo, overview, currentValue: futurePlans.expectedEffects }}
                        onGenerated={(text) => setFuturePlans((prev) => ({ ...prev, expectedEffects: text }))}
                        endpoint="/api/budget-disclosure/generate-ai-content"
                        documentType="budget-disclosure"
                      />
                    </div>
                    <Textarea
                      rows={4}
                      value={futurePlans.expectedEffects}
                      onChange={(event) => setFuturePlans((prev) => ({ ...prev, expectedEffects: event.target.value }))}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === "attachments" && (
              <Card>
                <CardHeader>
                  <CardTitle>첨부 자료</CardTitle>
                  <CardDescription>학부모 안내 사항과 참고 정보를 입력하세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-sm font-medium">학부모 안내 사항</label>
                      <AIGenerateButton
                        fieldName="parentNotice"
                        context={{ basicInfo, overview, currentValue: attachments.parentNotice }}
                        onGenerated={(text) => setAttachments((prev) => ({ ...prev, parentNotice: text }))}
                        endpoint="/api/budget-disclosure/generate-ai-content"
                        documentType="budget-disclosure"
                      />
                    </div>
                    <Textarea
                      rows={5}
                      value={attachments.parentNotice}
                      onChange={(event) => setAttachments((prev) => ({ ...prev, parentNotice: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-sm font-medium">용어 설명</label>
                      <AIGenerateButton
                        fieldName="terminology"
                        context={{ basicInfo, overview, currentValue: attachments.terminology }}
                        onGenerated={(text) => setAttachments((prev) => ({ ...prev, terminology: text }))}
                        endpoint="/api/budget-disclosure/generate-ai-content"
                        documentType="budget-disclosure"
                      />
                    </div>
                    <Textarea
                      rows={4}
                      value={attachments.terminology}
                      onChange={(event) => setAttachments((prev) => ({ ...prev, terminology: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-sm font-medium">문의처 안내</label>
                      <AIGenerateButton
                        fieldName="contactInfo"
                        context={{ basicInfo, overview, currentValue: attachments.contactInfo }}
                        onGenerated={(text) => setAttachments((prev) => ({ ...prev, contactInfo: text }))}
                        endpoint="/api/budget-disclosure/generate-ai-content"
                        documentType="budget-disclosure"
                      />
                    </div>
                    <Textarea
                      rows={3}
                      value={attachments.contactInfo}
                      onChange={(event) => setAttachments((prev) => ({ ...prev, contactInfo: event.target.value }))}
                    />
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
                <Button type="button" variant="outline" onClick={() => saveMutation.mutate("draft")} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "저장 중..." : "임시 저장"}
                </Button>
                <Button type="button" variant="outline" onClick={() => saveMutation.mutate("completed")} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "저장 중..." : "문서 저장"}
                </Button>
                {step < visibleSteps.length - 1 ? (
                  <Button type="button" onClick={handleNext}>
                    다음 단계
                  </Button>
                ) : (
                  <Button type="button" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                    {generateMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        생성 중...
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
