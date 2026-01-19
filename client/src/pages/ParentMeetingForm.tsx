import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Users, Loader2, Plus, Trash2 } from "lucide-react";
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

interface BasicInfo {
  schoolName: string;
  meetingType: string;
  grade: string;
  classNumber: string;
  meetingSession: string;
  meetingSessionCustom: string;
  period: string;
  periodCustom: string;
  author: string;
  position: string;
  writeDate: string;
}

interface AgendaItem {
  title: string;
  manager: string;
  notes: string;
}

interface ScheduleInfo {
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  locationDetails: string;
  gatherTime: string;
  notes: string;
}

interface AttendanceInfo {
  targets: string[];
  method: string;
  onlinePlatform: string;
  onlinePlatformCustom: string;
  meetingLink: string;
  meetingId: string;
  meetingPassword: string;
  replyRequired: string;
  replyMethods: string[];
  replyDeadline: string;
  supplies: string;
  precautions: string;
}

interface OthersInfo {
  membershipFee: string;
  officerElection: string;
  privacyConsent: string;
  contact: string;
  additional: string;
}

interface GreetingsInfo {
  opening: string;
  purpose: string;
  cooperation: string;
  closing: string;
}

const steps = ["기본 정보", "안건", "일정 및 장소", "참석 안내", "기타 사항", "인사말"];

const meetingTypes = ["정기총회", "임시총회"];
const gradeOptions = ["전체", "1학년", "2학년", "3학년", "4학년", "5학년", "6학년"];
const meetingSessionOptions = ["2025학년도 제1차", "2025학년도 제2차", "2025학년도 제3차", "직접 입력"];
const periodOptions = ["학기 초(3월)", "1학기 중(4-7월)", "학기 초(9월)", "2학기 중(10-12월)", "기타"];
const attendanceTargets = ["학부모 전원", "학부모 대표", "희망자"];
const attendanceMethods = ["대면", "온라인", "대면+온라인"];
const onlinePlatforms = ["Zoom", "Google Meet", "MS Teams", "기타"];
const replyMethods = ["가정통신문 회신란", "e알리미", "문자 메시지", "학급 단체 채팅방", "기타"];

const emptyAgendaItem = (): AgendaItem => ({
  title: "",
  manager: "",
  notes: "",
});

const formatDuration = (start: string, end: string) => {
  if (!start || !end) return "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((val) => Number.isNaN(val))) return "";
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  if (endMinutes <= startMinutes) return "";
  const diff = endMinutes - startMinutes;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  return `${hours}시간 ${minutes}분`;
};

export default function ParentMeetingForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [basicInfo, setBasicInfo] = useState<BasicInfo>({
    schoolName: "",
    meetingType: "",
    grade: "전체",
    classNumber: "",
    meetingSession: meetingSessionOptions[0],
    meetingSessionCustom: "",
    period: periodOptions[0],
    periodCustom: "",
    author: "",
    position: "",
    writeDate: "",
  });
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([emptyAgendaItem(), emptyAgendaItem()]);
  const [agendaDetails, setAgendaDetails] = useState("");
  const [schedule, setSchedule] = useState<ScheduleInfo>({
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    locationDetails: "",
    gatherTime: "",
    notes: "",
  });
  const [attendance, setAttendance] = useState<AttendanceInfo>({
    targets: [],
    method: "대면",
    onlinePlatform: "Zoom",
    onlinePlatformCustom: "",
    meetingLink: "",
    meetingId: "",
    meetingPassword: "",
    replyRequired: "필수",
    replyMethods: [],
    replyDeadline: "",
    supplies: "",
    precautions: "",
  });
  const [others, setOthers] = useState<OthersInfo>({
    membershipFee: "",
    officerElection: "",
    privacyConsent: "",
    contact: "",
    additional: "",
  });
  const [greetings, setGreetings] = useState<GreetingsInfo>({
    opening: "",
    purpose: "",
    cooperation: "",
    closing: "",
  });
  const [referenceFileId, setReferenceFileId] = useState<number | null>(null);

  const progressValue = ((step + 1) / steps.length) * 100;
  const durationText = useMemo(() => formatDuration(schedule.startTime, schedule.endTime), [schedule.startTime, schedule.endTime]);

  const documentTitle = useMemo(() => {
    return `${basicInfo.schoolName || "학교"} 학부모총회 안내`;
  }, [basicInfo.schoolName]);

  const meetingSessionValue =
    basicInfo.meetingSession === "직접 입력" ? basicInfo.meetingSessionCustom : basicInfo.meetingSession;
  const periodValue = basicInfo.period === "기타" ? basicInfo.periodCustom : basicInfo.period;
  const onlinePlatformValue =
    attendance.onlinePlatform === "기타" ? attendance.onlinePlatformCustom : attendance.onlinePlatform;
  const showOnlineFields = attendance.method.includes("온라인");

  const updateAgendaItem = (index: number, updates: Partial<AgendaItem>) => {
    setAgendaItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...updates } : item)));
  };

  const addAgendaItem = () => setAgendaItems((prev) => [...prev, emptyAgendaItem()]);
  const removeAgendaItem = (index: number) => {
    if (agendaItems.length <= 1) return;
    setAgendaItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const toggleAttendanceTarget = (value: string) => {
    const current = new Set(attendance.targets);
    if (current.has(value)) {
      current.delete(value);
    } else {
      current.add(value);
    }
    setAttendance((prev) => ({ ...prev, targets: Array.from(current) }));
  };

  const toggleReplyMethod = (value: string) => {
    const current = new Set(attendance.replyMethods);
    if (current.has(value)) {
      current.delete(value);
    } else {
      current.add(value);
    }
    setAttendance((prev) => ({ ...prev, replyMethods: Array.from(current) }));
  };

  const buildInputs = () => {
    const basicInfoText = [
      `학교명: ${basicInfo.schoolName || "(미입력)"}`,
      `총회 유형: ${basicInfo.meetingType || "(미입력)"}`,
      `학년: ${basicInfo.grade || "(미입력)"}`,
      `학급: ${basicInfo.grade === "전체" ? "-" : basicInfo.classNumber || "(미입력)"}`,
      `총회 차수: ${meetingSessionValue || "(미입력)"}`,
      `개최 시기: ${periodValue || "(미입력)"}`,
      `작성자: ${basicInfo.author || "(미입력)"}`,
      `직책: ${basicInfo.position || "(미입력)"}`,
      `작성 날짜: ${basicInfo.writeDate || "(미입력)"}`,
    ].join("\n");

    const agendaText = [
      "안건 목록:",
      ...agendaItems.map((item, index) => {
        return `${index + 1}. ${item.title || "(미입력)"} / 담당: ${item.manager || "(미입력)"}${item.notes ? ` / ${item.notes}` : ""}`;
      }),
      `안건 상세 내용: ${agendaDetails || "(미입력)"}`,
    ].join("\n");

    const scheduleText = [
      `개최 날짜: ${schedule.date || "(미입력)"}`,
      `개최 시간: ${schedule.startTime || "(미입력)"} ~ ${schedule.endTime || "(미입력)"}`,
      `개최 장소: ${schedule.location || "(미입력)"}`,
      `장소 세부 안내: ${schedule.locationDetails || "(미입력)"}`,
      `집합 시간: ${schedule.gatherTime || "(미입력)"}`,
      `비고: ${schedule.notes || "(미입력)"}`,
    ].join("\n");

    const attendanceText = [
      `참석 대상: ${attendance.targets.join(", ") || "(미입력)"}`,
      `참석 방법: ${attendance.method || "(미입력)"}`,
      `온라인 플랫폼: ${showOnlineFields ? onlinePlatformValue || "(미입력)" : "-"}`,
      `회의 링크: ${showOnlineFields ? attendance.meetingLink || "(미입력)" : "-"}`,
      `회의 ID: ${showOnlineFields ? attendance.meetingId || "(미입력)" : "-"}`,
      `회의 비밀번호: ${showOnlineFields ? attendance.meetingPassword || "(미입력)" : "-"}`,
      `참석 회신: ${attendance.replyRequired || "(미입력)"}`,
      `회신 방법: ${attendance.replyMethods.join(", ") || "(미입력)"}`,
      `회신 기한: ${attendance.replyDeadline || "(미입력)"}`,
      `준비물 안내: ${attendance.supplies || "(미입력)"}`,
      `참석 유의사항: ${attendance.precautions || "(미입력)"}`,
    ].join("\n");

    const othersText = [
      `학부모회비 안내: ${others.membershipFee || "(미입력)"}`,
      `학부모회 임원 선출 안내: ${others.officerElection || "(미입력)"}`,
      `개인정보 수집 동의: ${others.privacyConsent || "(미입력)"}`,
      `문의처 안내: ${others.contact || "(미입력)"}`,
      `기타 안내사항: ${others.additional || "(미입력)"}`,
    ].join("\n");

    const greetingsText = [
      `도입 인사말: ${greetings.opening || "(미입력)"}`,
      `총회 취지 설명: ${greetings.purpose || "(미입력)"}`,
      `협조 요청 사항: ${greetings.cooperation || "(미입력)"}`,
      `마무리 인사말: ${greetings.closing || "(미입력)"}`,
    ].join("\n");

    return {
      title: documentTitle,
      basicInfo: basicInfoText,
      agenda: agendaText,
      schedule: scheduleText,
      attendance: attendanceText,
      others: othersText,
      greetings: greetingsText,
    };
  };

  const buildDocumentContent = () => {
    const inputs = buildInputs();
    const { title: _title, ...sections } = inputs;
    const labels: Record<string, string> = {
      basicInfo: "기본 정보",
      agenda: "안건",
      schedule: "일정 및 장소",
      attendance: "참석 안내",
      others: "기타 사항",
      greetings: "인사말",
    };
    return Object.entries(sections)
      .map(([key, value]) => `[${labels[key] ?? key}]\n${value}`)
      .join("\n\n");
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/documents/generate", {
        documentType: "학부모총회 안내",
        inputs: buildInputs(),
        uploadedTemplateId: referenceFileId ?? undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "문서 생성 완료",
        description: "학부모총회 안내문이 생성되었습니다.",
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
        documentType: "학부모총회 안내",
        title: documentTitle,
        schoolName: basicInfo.schoolName,
        metadata: {
          targetGrade: basicInfo.grade,
          targetDate: schedule.date,
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
              <h1 className="text-lg font-semibold text-foreground">학부모총회 안내 작성</h1>
              <p className="text-sm text-muted-foreground">단계별로 정보를 입력하면 안내문을 생성합니다</p>
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
                  <Users className="w-4 h-4 text-primary" />
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
                  <CardDescription>학부모총회의 기본 정보를 입력하세요.</CardDescription>
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
                      <label className="text-sm font-medium">총회 유형</label>
                      <RadioGroup
                        value={basicInfo.meetingType}
                        onValueChange={(value) => setBasicInfo((prev) => ({ ...prev, meetingType: value }))}
                        className="flex flex-wrap gap-4"
                      >
                        {meetingTypes.map((type) => (
                          <label key={type} className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value={type} />
                            {type}
                          </label>
                        ))}
                      </RadioGroup>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">학년</label>
                      <Select
                        value={basicInfo.grade}
                        onValueChange={(value) => setBasicInfo((prev) => ({ ...prev, grade: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="학년 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {gradeOptions.map((grade) => (
                            <SelectItem key={grade} value={grade}>
                              {grade}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">학급</label>
                      <Input
                        type="number"
                        value={basicInfo.classNumber}
                        onChange={(event) => setBasicInfo((prev) => ({ ...prev, classNumber: event.target.value }))}
                        placeholder="예: 1"
                        disabled={basicInfo.grade === "전체"}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">총회 차수</label>
                      <Select
                        value={basicInfo.meetingSession}
                        onValueChange={(value) => setBasicInfo((prev) => ({ ...prev, meetingSession: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="총회 차수 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {meetingSessionOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {basicInfo.meetingSession === "직접 입력" && (
                        <Input
                          className="mt-2"
                          value={basicInfo.meetingSessionCustom}
                          onChange={(event) => setBasicInfo((prev) => ({ ...prev, meetingSessionCustom: event.target.value }))}
                          placeholder="예: 2025학년도 제4차"
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">개최 시기</label>
                      <Select
                        value={basicInfo.period}
                        onValueChange={(value) => setBasicInfo((prev) => ({ ...prev, period: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="개최 시기 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {periodOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {basicInfo.period === "기타" && (
                        <Input
                          className="mt-2"
                          value={basicInfo.periodCustom}
                          onChange={(event) => setBasicInfo((prev) => ({ ...prev, periodCustom: event.target.value }))}
                          placeholder="예: 방학 중"
                        />
                      )}
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
                        placeholder="예: 3학년 담임"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">작성 날짜</label>
                    <Input
                      type="date"
                      value={basicInfo.writeDate}
                      onChange={(event) => setBasicInfo((prev) => ({ ...prev, writeDate: event.target.value }))}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>안건</CardTitle>
                  <CardDescription>총회에서 다룰 안건을 입력하세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {agendaItems.map((item, index) => (
                    <div key={`agenda-${index}`} className="border border-border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">안건 {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={agendaItems.length <= 1}
                          onClick={() => removeAgendaItem(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">안건 제목</label>
                          <Input
                            value={item.title}
                            onChange={(event) => updateAgendaItem(index, { title: event.target.value })}
                            placeholder="예: 학급 운영 계획 안내"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">담당</label>
                          <Input
                            value={item.manager}
                            onChange={(event) => updateAgendaItem(index, { manager: event.target.value })}
                            placeholder="예: 담임"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">비고</label>
                          <Input
                            value={item.notes}
                            onChange={(event) => updateAgendaItem(index, { notes: event.target.value })}
                            placeholder="추가 메모"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button type="button" variant="outline" onClick={addAgendaItem}>
                    <Plus className="w-4 h-4 mr-2" /> 안건 추가
                  </Button>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-sm font-medium">안건 상세 내용</label>
                      <AIGenerateButton
                        fieldName="agendaDetails"
                        context={{ basicInfo, agendaItems, currentValue: agendaDetails }}
                        onGenerated={(text) => setAgendaDetails(text)}
                        endpoint="/api/parent-meeting/generate-ai-content"
                        documentType="parent-meeting"
                      />
                    </div>
                    <Textarea
                      rows={8}
                      value={agendaDetails}
                      onChange={(event) => setAgendaDetails(event.target.value)}
                      placeholder="안건별 상세 설명을 입력하세요."
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>일정 및 장소</CardTitle>
                  <CardDescription>총회 일정과 장소를 입력하세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">개최 날짜</label>
                      <Input
                        type="date"
                        value={schedule.date}
                        onChange={(event) => setSchedule((prev) => ({ ...prev, date: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">시작 시간</label>
                      <Input
                        type="time"
                        value={schedule.startTime}
                        onChange={(event) => setSchedule((prev) => ({ ...prev, startTime: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">종료 시간</label>
                      <Input
                        type="time"
                        value={schedule.endTime}
                        onChange={(event) => setSchedule((prev) => ({ ...prev, endTime: event.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">개최 장소</label>
                    <Input
                      value={schedule.location}
                      onChange={(event) => setSchedule((prev) => ({ ...prev, location: event.target.value }))}
                      placeholder="예: 각 학급 교실"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-sm font-medium">장소 세부 안내</label>
                      <AIGenerateButton
                        fieldName="locationDetails"
                        context={{ basicInfo, schedule, currentValue: schedule.locationDetails }}
                        onGenerated={(text) => setSchedule((prev) => ({ ...prev, locationDetails: text }))}
                        endpoint="/api/parent-meeting/generate-ai-content"
                        documentType="parent-meeting"
                      />
                    </div>
                    <Textarea
                      rows={4}
                      value={schedule.locationDetails}
                      onChange={(event) => setSchedule((prev) => ({ ...prev, locationDetails: event.target.value }))}
                      placeholder="장소 위치, 주차 안내 등을 입력하세요."
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">집합 시간</label>
                      <Input
                        type="time"
                        value={schedule.gatherTime}
                        onChange={(event) => setSchedule((prev) => ({ ...prev, gatherTime: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">총회 소요 시간</label>
                      <Input value={durationText} readOnly placeholder="자동 계산" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">비고</label>
                    <Textarea
                      rows={3}
                      value={schedule.notes}
                      onChange={(event) => setSchedule((prev) => ({ ...prev, notes: event.target.value }))}
                      placeholder="추가 안내 사항을 입력하세요."
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>참석 안내</CardTitle>
                  <CardDescription>참석 대상과 방법을 입력하세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">참석 대상</label>
                    <div className="flex flex-wrap gap-4">
                      {attendanceTargets.map((target) => (
                        <label key={target} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={attendance.targets.includes(target)}
                            onCheckedChange={() => toggleAttendanceTarget(target)}
                          />
                          {target}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">참석 방법</label>
                    <RadioGroup
                      value={attendance.method}
                      onValueChange={(value) => setAttendance((prev) => ({ ...prev, method: value }))}
                      className="flex flex-wrap gap-4"
                    >
                      {attendanceMethods.map((method) => (
                        <label key={method} className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value={method} />
                          {method}
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  {showOnlineFields && (
                    <Card className="border border-muted">
                      <CardHeader>
                        <CardTitle className="text-base">온라인 참석 정보</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">온라인 플랫폼</label>
                            <Select
                              value={attendance.onlinePlatform}
                              onValueChange={(value) => setAttendance((prev) => ({ ...prev, onlinePlatform: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="플랫폼 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                {onlinePlatforms.map((platform) => (
                                  <SelectItem key={platform} value={platform}>
                                    {platform}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {attendance.onlinePlatform === "기타" && (
                              <Input
                                className="mt-2"
                                value={attendance.onlinePlatformCustom}
                                onChange={(event) =>
                                  setAttendance((prev) => ({ ...prev, onlinePlatformCustom: event.target.value }))
                                }
                                placeholder="플랫폼 이름"
                              />
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">회의 링크</label>
                            <Input
                              value={attendance.meetingLink}
                              onChange={(event) => setAttendance((prev) => ({ ...prev, meetingLink: event.target.value }))}
                              placeholder="https://"
                            />
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">회의 ID</label>
                            <Input
                              value={attendance.meetingId}
                              onChange={(event) => setAttendance((prev) => ({ ...prev, meetingId: event.target.value }))}
                              placeholder="예: 123 456 789"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">회의 비밀번호</label>
                            <Input
                              value={attendance.meetingPassword}
                              onChange={(event) => setAttendance((prev) => ({ ...prev, meetingPassword: event.target.value }))}
                              placeholder="예: abc123"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">참석 회신</label>
                    <RadioGroup
                      value={attendance.replyRequired}
                      onValueChange={(value) => setAttendance((prev) => ({ ...prev, replyRequired: value }))}
                      className="flex flex-wrap gap-4"
                    >
                      {["필수", "선택"].map((value) => (
                        <label key={value} className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value={value} />
                          {value}
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">회신 방법</label>
                    <div className="flex flex-wrap gap-4">
                      {replyMethods.map((method) => (
                        <label key={method} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={attendance.replyMethods.includes(method)}
                            onCheckedChange={() => toggleReplyMethod(method)}
                          />
                          {method}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">회신 기한</label>
                    <Input
                      type="date"
                      value={attendance.replyDeadline}
                      onChange={(event) => setAttendance((prev) => ({ ...prev, replyDeadline: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-sm font-medium">준비물 안내</label>
                      <AIGenerateButton
                        fieldName="supplies"
                        context={{ basicInfo, attendance, currentValue: attendance.supplies }}
                        onGenerated={(text) => setAttendance((prev) => ({ ...prev, supplies: text }))}
                        endpoint="/api/parent-meeting/generate-ai-content"
                        documentType="parent-meeting"
                      />
                    </div>
                    <Textarea
                      rows={3}
                      value={attendance.supplies}
                      onChange={(event) => setAttendance((prev) => ({ ...prev, supplies: event.target.value }))}
                      placeholder="예: 필기도구, 안내문"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-sm font-medium">참석 유의사항</label>
                      <AIGenerateButton
                        fieldName="precautions"
                        context={{ basicInfo, attendance, currentValue: attendance.precautions }}
                        onGenerated={(text) => setAttendance((prev) => ({ ...prev, precautions: text }))}
                        endpoint="/api/parent-meeting/generate-ai-content"
                        documentType="parent-meeting"
                      />
                    </div>
                    <Textarea
                      rows={3}
                      value={attendance.precautions}
                      onChange={(event) => setAttendance((prev) => ({ ...prev, precautions: event.target.value }))}
                      placeholder="예: 실내화 착용, 주차 제한"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle>기타 사항</CardTitle>
                  <CardDescription>추가 안내 사항을 입력하세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {[
                    { key: "membershipFee", label: "학부모회비 안내", rows: 4 },
                    { key: "officerElection", label: "학부모회 임원 선출 안내", rows: 4 },
                    { key: "privacyConsent", label: "개인정보 수집 동의", rows: 3 },
                    { key: "contact", label: "문의처 안내", rows: 3 },
                    { key: "additional", label: "기타 안내사항", rows: 4 },
                  ].map((field) => (
                    <div key={field.key} className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-sm font-medium">{field.label}</label>
                        <AIGenerateButton
                          fieldName={field.key}
                          context={{ basicInfo, attendance, others, currentValue: others[field.key as keyof OthersInfo] }}
                          onGenerated={(text) => setOthers((prev) => ({ ...prev, [field.key]: text }))}
                          endpoint="/api/parent-meeting/generate-ai-content"
                          documentType="parent-meeting"
                        />
                      </div>
                      <Textarea
                        rows={field.rows}
                        value={others[field.key as keyof OthersInfo]}
                        onChange={(event) => setOthers((prev) => ({ ...prev, [field.key]: event.target.value }))}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {step === 5 && (
              <Card>
                <CardHeader>
                  <CardTitle>인사말</CardTitle>
                  <CardDescription>학부모님께 드리는 인사말을 작성하세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {[
                    { key: "opening", label: "도입 인사말", rows: 5 },
                    { key: "purpose", label: "총회 취지 설명", rows: 5 },
                    { key: "cooperation", label: "협조 요청 사항", rows: 4 },
                    { key: "closing", label: "마무리 인사말", rows: 4 },
                  ].map((field) => (
                    <div key={field.key} className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-sm font-medium">{field.label}</label>
                        <AIGenerateButton
                          fieldName={field.key}
                          context={{ basicInfo, greetings, currentValue: greetings[field.key as keyof GreetingsInfo] }}
                          onGenerated={(text) => setGreetings((prev) => ({ ...prev, [field.key]: text }))}
                          endpoint="/api/parent-meeting/generate-ai-content"
                          documentType="parent-meeting"
                        />
                      </div>
                      <Textarea
                        rows={field.rows}
                        value={greetings[field.key as keyof GreetingsInfo]}
                        onChange={(event) => setGreetings((prev) => ({ ...prev, [field.key]: event.target.value }))}
                      />
                    </div>
                  ))}
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
