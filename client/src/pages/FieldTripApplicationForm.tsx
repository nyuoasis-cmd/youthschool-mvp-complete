import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { Link } from "wouter";
import PDFDownloadButton from "@/components/PDFDownloadButton";
import FieldTripApplicationPreview from "@/components/FieldTripApplicationPreview";
import DateRangePicker, { DateRangeValue } from "@/components/common/DateRangePicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { calculateDateRange, formatDateRange } from "@/utils/dateFormat";

type StudentInfo = {
  grade: string;
  className: string;
  number: string;
  name: string;
};

type PlanActivity = {
  id: string;
  time: string;
  place: string;
  content: string;
};

type PlanDay = {
  id: string;
  date: string;
  activities: PlanActivity[];
};

type GuardianInfo = {
  name: string;
  relation: string;
  contact: string;
};

type Companion = {
  id: string;
  name: string;
  relation: string;
  contact: string;
};

interface ProfileData {
  schoolName?: string;
}

const tripTypes = [
  { id: "family-trip", label: "가족여행", icon: "✈️" },
  { id: "relatives", label: "친인척방문", icon: "👨‍👩‍👧" },
  { id: "tour", label: "답사견학", icon: "🏛️" },
  { id: "activity", label: "체험활동", icon: "🎭" },
  { id: "career", label: "직업체험", icon: "💼" },
  { id: "competition", label: "대회참가", icon: "🏆" },
  { id: "family-event", label: "가족행사", icon: "🎓" },
  { id: "etc", label: "기타", icon: "📝" },
];

const timeOptions = ["오전", "오후", "저녁", "종일"];

const createPlanActivity = (): PlanActivity => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  time: "오전",
  place: "",
  content: "",
});

const createPlanDay = (): PlanDay => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  date: "",
  activities: [createPlanActivity()],
});

const createCompanion = (): Companion => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  name: "",
  relation: "",
  contact: "",
});

export default function FieldTripApplicationForm() {
  const { toast } = useToast();
  const documentRef = useRef<HTMLDivElement>(null);
  const [generatingField, setGeneratingField] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  const [studentInfo, setStudentInfo] = useState<StudentInfo>({
    grade: "",
    className: "",
    number: "",
    name: "",
  });
  const [period, setPeriod] = useState<DateRangeValue>({ start: "", end: "" });
  const [tripType, setTripType] = useState("");
  const [destination, setDestination] = useState("");
  const [detailPlace, setDetailPlace] = useState("");
  const [purpose, setPurpose] = useState("");
  const [planDays, setPlanDays] = useState<PlanDay[]>([createPlanDay()]);
  const [guardian, setGuardian] = useState<GuardianInfo>({
    name: "",
    relation: "",
    contact: "",
  });
  const [companions, setCompanions] = useState<Companion[]>([createCompanion()]);
  const [applicationDate, setApplicationDate] = useState("");
  const [agreementChecked, setAgreementChecked] = useState(false);

  const { data: profile } = useQuery<ProfileData>({
    queryKey: ["/api/auth/profile"],
    retry: false,
  });

  const schoolName = profile?.schoolName || "학교명";
  const periodText = useMemo(
    () => formatDateRange(period.start, period.end),
    [period.end, period.start]
  );
  const periodRange = useMemo(() => calculateDateRange(period.start, period.end), [period.end, period.start]);
  const usedDays = periodRange?.totalDays ?? 0;
  const remainingDays = Math.max(20 - usedDays, 0);

  const parsePlanDays = (text: string): PlanDay[] | null => {
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) return null;
      const normalized = parsed
        .filter((day) => day && typeof day === "object")
        .map((day) => ({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          date: String((day as Record<string, unknown>).date ?? ""),
          activities: Array.isArray((day as Record<string, unknown>).activities)
            ? (day as Record<string, unknown>).activities.map((activity: Record<string, unknown>) => ({
                id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                time: String(activity.time ?? "오전"),
                place: String(activity.place ?? ""),
                content: String(activity.content ?? ""),
              }))
            : [createPlanActivity()],
        }));
      return normalized.length > 0 ? normalized : null;
    } catch {
      return null;
    }
  };

  const applyGeneratedField = (fieldName: string, generatedContent: string) => {
    if (fieldName === "purpose") {
      setPurpose(generatedContent);
      return true;
    }
    if (fieldName === "planDays") {
      const parsed = parsePlanDays(generatedContent);
      if (parsed) {
        setPlanDays(parsed);
        return true;
      }
      toast({
        title: "AI 생성 결과 확인 필요",
        description: "체험학습 계획 형식을 확인해주세요.",
        variant: "destructive",
      });
      return false;
    }
    return false;
  };

  const buildContext = () => ({
    studentInfo,
    period: periodText,
    tripType,
    destination,
    detailPlace,
    purpose,
    guardian,
    companions,
  });

  const generateFieldMutation = useMutation({
    mutationFn: async ({ fieldName, fieldLabel }: { fieldName: string; fieldLabel: string }) => {
      setGeneratingField(fieldName);
      const response = await apiRequest("POST", "/api/documents/generate-field", {
        documentType: "교외체험학습 신청서",
        fieldName,
        fieldLabel,
        context: buildContext(),
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratingField(null);
      const generatedContent = String(data.generatedContent || "").trim();
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

  const generateAllMutation = useMutation({
    mutationFn: async () => {
      const fields = [
        { fieldName: "purpose", fieldLabel: "체험학습 목적" },
        { fieldName: "planDays", fieldLabel: "체험학습 계획" },
      ];

      const results: Array<{ fieldName: string; generatedContent: string }> = [];

      for (const field of fields) {
        const response = await apiRequest("POST", "/api/documents/generate-field", {
          documentType: "교외체험학습 신청서",
          fieldName: field.fieldName,
          fieldLabel: field.fieldLabel,
          context: buildContext(),
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
    onMutate: () => setIsGeneratingAll(true),
    onSuccess: (results) => {
      let hasError = false;
      results.forEach(({ fieldName, generatedContent }) => {
        const applied = applyGeneratedField(fieldName, generatedContent);
        if (!applied) {
          hasError = true;
        }
      });
      toast({
        title: hasError ? "일부 항목 확인 필요" : "AI 전부 생성 완료",
        description: hasError ? "일부 항목의 결과 형식을 확인해주세요." : "모든 항목이 생성되었습니다.",
        variant: hasError ? "destructive" : "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "AI 전부 생성 실패",
        description: error.message || "AI 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
    onSettled: () => setIsGeneratingAll(false),
  });

  const handleAddPlanDay = () => {
    setPlanDays((prev) => [...prev, createPlanDay()]);
  };

  const handleRemovePlanDay = (id: string) => {
    setPlanDays((prev) => (prev.length <= 1 ? prev : prev.filter((day) => day.id !== id)));
  };

  const handleUpdatePlanDay = (id: string, value: Partial<PlanDay>) => {
    setPlanDays((prev) => prev.map((day) => (day.id === id ? { ...day, ...value } : day)));
  };

  const handleAddActivity = (dayId: string) => {
    setPlanDays((prev) =>
      prev.map((day) =>
        day.id === dayId ? { ...day, activities: [...day.activities, createPlanActivity()] } : day
      )
    );
  };

  const handleRemoveActivity = (dayId: string, activityId: string) => {
    setPlanDays((prev) =>
      prev.map((day) =>
        day.id === dayId
          ? {
              ...day,
              activities: day.activities.length <= 1 ? day.activities : day.activities.filter((a) => a.id !== activityId),
            }
          : day
      )
    );
  };

  const handleUpdateActivity = (dayId: string, activityId: string, value: Partial<PlanActivity>) => {
    setPlanDays((prev) =>
      prev.map((day) =>
        day.id === dayId
          ? {
              ...day,
              activities: day.activities.map((activity) =>
                activity.id === activityId ? { ...activity, ...value } : activity
              ),
            }
          : day
      )
    );
  };

  const handleAddCompanion = () => {
    setCompanions((prev) => [...prev, createCompanion()]);
  };

  const handleRemoveCompanion = (id: string) => {
    setCompanions((prev) => (prev.length <= 1 ? prev : prev.filter((companion) => companion.id !== id)));
  };

  const handleUpdateCompanion = (id: string, value: Partial<Companion>) => {
    setCompanions((prev) => prev.map((companion) => (companion.id === id ? { ...companion, ...value } : companion)));
  };

  const handleReset = () => {
    setStudentInfo({ grade: "", className: "", number: "", name: "" });
    setPeriod({ start: "", end: "" });
    setTripType("");
    setDestination("");
    setDetailPlace("");
    setPurpose("");
    setPlanDays([createPlanDay()]);
    setGuardian({ name: "", relation: "", contact: "" });
    setCompanions([createCompanion()]);
    setApplicationDate("");
    setAgreementChecked(false);
  };

  const pdfFileName = "교외체험학습_신청서";
  const previewProps = {
    schoolName,
    studentInfo,
    period,
    tripType: tripType || "미선택",
    destination,
    detailPlace,
    purpose,
    planDays,
    guardian,
    companions,
    applicationDate,
    agreementChecked,
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-foreground">교외체험학습 신청서 작성</h1>
                <p className="text-sm text-muted-foreground">필요한 정보를 입력하면 신청서를 생성합니다</p>
              </div>
            </div>
            <PDFDownloadButton contentRef={documentRef} fileName={pdfFileName} />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              교외체험학습 신청서 정보 입력
            </CardTitle>
            <CardDescription>입력한 내용으로 AI가 신청서를 생성합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">학생 정보</h2>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">학년</span>
                  <Select value={studentInfo.grade} onValueChange={(value) => setStudentInfo({ ...studentInfo, grade: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="학년 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {["1학년", "2학년", "3학년", "4학년", "5학년", "6학년"].map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">반</span>
                  <Select
                    value={studentInfo.className}
                    onValueChange={(value) => setStudentInfo({ ...studentInfo, className: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="반 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => `${i + 1}반`).map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">번호</span>
                  <Input
                    value={studentInfo.number}
                    onChange={(event) => setStudentInfo({ ...studentInfo, number: event.target.value })}
                    placeholder="번호"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">성명</span>
                  <Input
                    value={studentInfo.name}
                    onChange={(event) => setStudentInfo({ ...studentInfo, name: event.target.value })}
                    placeholder="학생 이름"
                  />
                </div>
              </div>
            </section>

            <div className="h-px bg-border" />

            <section className="space-y-3">
              <DateRangePicker
                label="체험학습 기간"
                value={period}
                onChange={setPeriod}
                showDaysBadge
                autoTagLabel="자동 계산"
                startAriaLabel="체험학습 기간 시작 날짜"
                endAriaLabel="체험학습 기간 종료 날짜"
              />
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                {periodRange
                  ? `💡 연간 최대 20일 (현재 사용: ${usedDays}일/잔여 ${remainingDays}일)`
                  : "💡 연간 최대 20일까지 신청할 수 있습니다."}
              </div>
            </section>

            <div className="h-px bg-border" />

            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">체험학습 유형</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {tripTypes.map((type) => {
                  const isSelected = tripType === type.label;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setTripType(type.label)}
                      className={`rounded-lg border px-3 py-4 text-center text-sm font-medium transition ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-foreground hover:border-primary/60"
                      }`}
                    >
                      <div className="text-xl mb-1">{type.icon}</div>
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="h-px bg-border" />

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-foreground">목적지 및 체험 목적</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => generateFieldMutation.mutate({ fieldName: "purpose", fieldLabel: "체험학습 목적" })}
                  disabled={generatingField === "purpose" || isGeneratingAll}
                >
                  {generatingField === "purpose" ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI 작성
                    </>
                  )}
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">목적지</span>
                  <Input
                    value={destination}
                    onChange={(event) => setDestination(event.target.value)}
                    placeholder="목적지를 입력하세요"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">상세 장소</span>
                  <Input
                    value={detailPlace}
                    onChange={(event) => setDetailPlace(event.target.value)}
                    placeholder="상세 장소를 입력하세요"
                  />
                </div>
              </div>
              <Textarea
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
                placeholder="체험학습 목적을 입력하세요."
                className="min-h-[120px]"
              />
            </section>

            <div className="h-px bg-border" />

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-foreground">체험학습 계획</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => generateFieldMutation.mutate({ fieldName: "planDays", fieldLabel: "체험학습 계획" })}
                  disabled={generatingField === "planDays" || isGeneratingAll}
                >
                  {generatingField === "planDays" ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI 생성
                    </>
                  )}
                </Button>
              </div>
              <div className="space-y-4">
                {planDays.map((day, index) => (
                  <div key={day.id} className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{index + 1}일차</span>
                        <Input
                          type="date"
                          value={day.date}
                          onChange={(event) => handleUpdatePlanDay(day.id, { date: event.target.value })}
                          className="h-9 w-[160px]"
                          aria-label={`${index + 1}일차 날짜`}
                        />
                      </div>
                      {planDays.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemovePlanDay(day.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          삭제
                        </Button>
                      )}
                    </div>

                    <div className="space-y-3">
                      {day.activities.map((activity) => (
                        <div key={activity.id} className="grid gap-3 md:grid-cols-[120px_1fr_1.5fr_auto] items-center">
                          <Select
                            value={activity.time}
                            onValueChange={(value) => handleUpdateActivity(day.id, activity.id, { time: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="시간대" />
                            </SelectTrigger>
                            <SelectContent>
                              {timeOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={activity.place}
                            onChange={(event) => handleUpdateActivity(day.id, activity.id, { place: event.target.value })}
                            placeholder="장소"
                          />
                          <Input
                            value={activity.content}
                            onChange={(event) => handleUpdateActivity(day.id, activity.id, { content: event.target.value })}
                            placeholder="활동 내용"
                          />
                          {day.activities.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveActivity(day.id, activity.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              ✕
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    <Button type="button" variant="outline" size="sm" onClick={() => handleAddActivity(day.id)}>
                      + 활동 추가
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" onClick={handleAddPlanDay}>
                + 일차 추가
              </Button>
            </section>

            <div className="h-px bg-border" />

            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">보호자 및 인솔자 정보</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">보호자 성명</span>
                  <Input
                    value={guardian.name}
                    onChange={(event) => setGuardian({ ...guardian, name: event.target.value })}
                    placeholder="보호자 이름"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">관계</span>
                  <Input
                    value={guardian.relation}
                    onChange={(event) => setGuardian({ ...guardian, relation: event.target.value })}
                    placeholder="관계"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">연락처</span>
                  <Input
                    value={guardian.contact}
                    onChange={(event) => setGuardian({ ...guardian, contact: event.target.value })}
                    placeholder="연락처"
                  />
                </div>
              </div>
            </section>

            <div className="h-px bg-border" />

            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">동반 가족</h2>
              <div className="space-y-3">
                {companions.map((companion, index) => (
                  <div key={companion.id} className="grid gap-3 md:grid-cols-[80px_1fr_1fr_1fr_auto] items-center">
                    <div className="text-sm font-semibold text-muted-foreground">No. {index + 1}</div>
                    <Input
                      value={companion.name}
                      onChange={(event) => handleUpdateCompanion(companion.id, { name: event.target.value })}
                      placeholder="성명"
                    />
                    <Input
                      value={companion.relation}
                      onChange={(event) => handleUpdateCompanion(companion.id, { relation: event.target.value })}
                      placeholder="관계"
                    />
                    <Input
                      value={companion.contact}
                      onChange={(event) => handleUpdateCompanion(companion.id, { contact: event.target.value })}
                      placeholder="연락처"
                    />
                    {companions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCompanion(companion.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" onClick={handleAddCompanion}>
                + 행 추가
              </Button>
            </section>

            <div className="h-px bg-border" />

            <section className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <span className="text-sm font-semibold text-foreground">신청일</span>
                <Input
                  placeholder="예: 2025년 3월 1일"
                  value={applicationDate}
                  onChange={(event) => setApplicationDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <span className="text-sm font-semibold text-foreground">
                  학교명
                  <span className="ml-2 rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">자동 채움</span>
                </span>
                <Input value={schoolName} disabled />
              </div>
            </section>

            <div className="h-px bg-border" />

            <section className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
                <div className="flex items-start gap-3">
                  <Checkbox checked={agreementChecked} onCheckedChange={(checked) => setAgreementChecked(!!checked)} />
                  <div>
                    <p className="font-semibold">📌 확인 및 동의사항</p>
                    <p className="text-muted-foreground">
                      위와 같이 교외체험학습을 신청하며, 안전 수칙을 준수하고 필요한 안내 사항에 동의합니다.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <div className="flex flex-col gap-3 pt-4 sm:flex-row">
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
                    AI로 문서 생성하기
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

      <div
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          overflow: "visible",
        }}
        aria-hidden
      >
        <FieldTripApplicationPreview ref={documentRef} {...previewProps} />
      </div>
    </div>
  );
}
