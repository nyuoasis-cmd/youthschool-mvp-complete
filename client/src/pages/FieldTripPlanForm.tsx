import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { ArrowLeft, Loader2, MapPin, Plus, Trash2, Eye } from "lucide-react";
import { AIGenerateButton } from "@/components/AIGenerateButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { HwpReferenceUpload } from "@/components/HwpReferenceUpload";

type TransportationType = "전세버스" | "대중교통" | "도보" | "기타" | "";
type InsuranceType = "가입 완료" | "학교 단체 보험 적용" | "미가입" | "";
type CostMethodType = "학부모 부담" | "학교 예산" | "혼합" | "";

interface BasicInfo {
  schoolName: string;
  gradeClass: string;
  studentCount: string;
  teacherCount: string;
  assistants: string;
  tripTitle: string;
  tripDate: string;
  tripTime: string;
}

interface LocationInfo {
  placeName: string;
  address: string;
  transportation: TransportationType;
  transportCompany: string;
  vehicleNumber: string;
  driverContact: string;
  route: string;
  travelTime: string;
}

interface EducationInfo {
  goals: string;
  curriculumLink: string;
  activities: string;
  priorEducation: string;
  postActivities: string;
}

interface ScheduleItem {
  time: string;
  activity: string;
  location: string;
  notes: string;
}

interface SafetyInfo {
  supervisorName: string;
  supervisorContact: string;
  emergencyContacts: string;
  emergencyPlan: string;
  safetyEducation: string;
  staffAssignment: string;
  insurance: InsuranceType;
  insuranceDetails: string;
}

interface OtherInfo {
  cost: string;
  costMethod: CostMethodType;
  meal: string;
  specialNotes: string;
  consentMethod: string;
}

const emptyScheduleItem = (): ScheduleItem => ({
  time: "",
  activity: "",
  location: "",
  notes: "",
});

const steps = ["기본 정보", "장소 및 이동", "교육 목표", "세부 일정", "안전 관리", "기타 사항"];

export default function FieldTripPlanForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [referenceFileId, setReferenceFileId] = useState<number | null>(null);
  const [basicInfo, setBasicInfo] = useState<BasicInfo>({
    schoolName: "",
    gradeClass: "",
    studentCount: "",
    teacherCount: "",
    assistants: "",
    tripTitle: "",
    tripDate: "",
    tripTime: "",
  });
  const [locationInfo, setLocationInfo] = useState<LocationInfo>({
    placeName: "",
    address: "",
    transportation: "",
    transportCompany: "",
    vehicleNumber: "",
    driverContact: "",
    route: "",
    travelTime: "",
  });
  const [educationInfo, setEducationInfo] = useState<EducationInfo>({
    goals: "",
    curriculumLink: "",
    activities: "",
    priorEducation: "",
    postActivities: "",
  });
  const [schedule, setSchedule] = useState<ScheduleItem[]>([
    emptyScheduleItem(),
    emptyScheduleItem(),
    emptyScheduleItem(),
  ]);
  const [safetyInfo, setSafetyInfo] = useState<SafetyInfo>({
    supervisorName: "",
    supervisorContact: "",
    emergencyContacts: "",
    emergencyPlan: "",
    safetyEducation: "",
    staffAssignment: "",
    insurance: "",
    insuranceDetails: "",
  });
  const [otherInfo, setOtherInfo] = useState<OtherInfo>({
    cost: "",
    costMethod: "",
    meal: "",
    specialNotes: "",
    consentMethod: "",
  });

  const progressValue = ((step + 1) / steps.length) * 100;

  const documentTitle = useMemo(() => {
    if (!basicInfo.schoolName) {
      return "현장체험학습 운영계획서";
    }
    return `${basicInfo.schoolName} 현장체험학습 운영계획서`;
  }, [basicInfo.schoolName]);

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  const isValidTimeRange = (value: string) =>
    /^(?:[01]\d|2[0-3]):[0-5]\d\s~\s(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);

  const isValidScheduleTime = (value: string) =>
    /^(?:[01]\d|2[0-3]):[0-5]\d\s*-\s*(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);

  const validateBasicInfo = (info: BasicInfo) => {
    const nextErrors: Record<string, string> = {};
    if (info.schoolName.length < 2 || info.schoolName.length > 50) {
      nextErrors.schoolName = "학교명을 2~50자로 입력해주세요.";
    }
    if (info.gradeClass.length < 2 || info.gradeClass.length > 30) {
      nextErrors.gradeClass = "학년/학급을 2~30자로 입력해주세요.";
    }
    const students = Number(info.studentCount);
    const teachers = Number(info.teacherCount);
    if (Number.isNaN(students) || students < 1) {
      nextErrors.studentCount = "참가 학생 수는 1명 이상 입력해주세요.";
    }
    if (Number.isNaN(teachers) || teachers < 1) {
      nextErrors.teacherCount = "인솔 교사 수는 1명 이상 입력해주세요.";
    }
    if (info.tripTitle.length < 5 || info.tripTitle.length > 100) {
      nextErrors.tripTitle = "체험학습 주제는 5~100자로 입력해주세요.";
    }
    if (!info.tripDate) {
      nextErrors.tripDate = "실시 일자를 입력해주세요.";
    } else {
      const today = new Date();
      const dateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const inputDate = new Date(info.tripDate);
      if (inputDate < dateOnly) {
        nextErrors.tripDate = "실시 일자는 오늘 이후 날짜로 입력해주세요.";
      }
    }
    if (!info.tripTime || !isValidTimeRange(info.tripTime)) {
      nextErrors.tripTime = "실시 시간은 HH:MM ~ HH:MM 형식으로 입력해주세요.";
    }
    return nextErrors;
  };

  const validateLocationInfo = (info: LocationInfo) => {
    const nextErrors: Record<string, string> = {};
    if (!info.placeName.trim()) {
      nextErrors.placeName = "체험 장소명을 입력해주세요.";
    }
    if (!info.address.trim()) {
      nextErrors.address = "장소 주소를 입력해주세요.";
    }
    if (!info.transportation) {
      nextErrors.transportation = "이동 수단을 선택해주세요.";
    }
    if (info.transportation === "전세버스") {
      if (!info.transportCompany.trim()) {
        nextErrors.transportCompany = "운송 업체명을 입력해주세요.";
      }
      if (!info.vehicleNumber.trim()) {
        nextErrors.vehicleNumber = "차량 번호를 입력해주세요.";
      }
      if (!info.driverContact.trim() || !/^010-\d{4}-\d{4}$/.test(info.driverContact)) {
        nextErrors.driverContact = "운전기사 연락처는 010-0000-0000 형식으로 입력해주세요.";
      }
    }
    if (!info.travelTime.trim()) {
      nextErrors.travelTime = "소요 시간을 입력해주세요.";
    }
    return nextErrors;
  };

  const validateEducationInfo = (info: EducationInfo) => {
    const nextErrors: Record<string, string> = {};
    if (!info.goals.trim()) {
      nextErrors.goals = "교육 목표를 입력해주세요.";
    }
    if (!info.curriculumLink.trim()) {
      nextErrors.curriculumLink = "교육과정 연계를 입력해주세요.";
    }
    if (!info.activities.trim()) {
      nextErrors.activities = "주요 활동 내용을 입력해주세요.";
    }
    return nextErrors;
  };

  const validateSchedule = (items: ScheduleItem[]) => {
    const nextErrors: Record<string, string> = {};
    if (items.length < 3) {
      nextErrors.schedule = "일정은 최소 3개 이상 입력해주세요.";
      return nextErrors;
    }
    items.forEach((item, index) => {
      if (!item.time.trim() || !isValidScheduleTime(item.time.trim())) {
        nextErrors[`schedule_time_${index}`] = "시간은 HH:MM-HH:MM 형식으로 입력해주세요.";
      }
      if (!item.activity.trim()) {
        nextErrors[`schedule_activity_${index}`] = "활동 내용을 입력해주세요.";
      }
      if (!item.location.trim()) {
        nextErrors[`schedule_location_${index}`] = "장소를 입력해주세요.";
      }
    });
    return nextErrors;
  };

  const validateSafetyInfo = (info: SafetyInfo) => {
    const nextErrors: Record<string, string> = {};
    if (!info.supervisorName.trim()) {
      nextErrors.supervisorName = "인솔 책임자 이름을 입력해주세요.";
    }
    if (!info.supervisorContact.trim() || !/^010-\d{4}-\d{4}$/.test(info.supervisorContact)) {
      nextErrors.supervisorContact = "연락처는 010-0000-0000 형식으로 입력해주세요.";
    }
    if (!info.emergencyContacts.trim()) {
      nextErrors.emergencyContacts = "비상 연락망을 입력해주세요.";
    }
    if (!info.emergencyPlan.trim()) {
      nextErrors.emergencyPlan = "응급 상황 대처 방안을 입력해주세요.";
    }
    if (!info.safetyEducation.trim()) {
      nextErrors.safetyEducation = "안전 교육 내용을 입력해주세요.";
    }
    if (!info.insurance) {
      nextErrors.insurance = "보험 가입 여부를 선택해주세요.";
    }
    if (info.insurance === "가입 완료" && !info.insuranceDetails.trim()) {
      nextErrors.insuranceDetails = "보험 상세 정보를 입력해주세요.";
    }
    return nextErrors;
  };

  const validateOtherInfo = (info: OtherInfo) => {
    const nextErrors: Record<string, string> = {};
    if (!info.cost.trim()) {
      nextErrors.cost = "체험 비용을 입력해주세요.";
    }
    if (!info.costMethod) {
      nextErrors.costMethod = "비용 부담 방법을 선택해주세요.";
    }
    if (!info.meal.trim()) {
      nextErrors.meal = "중식 계획을 입력해주세요.";
    }
    if (!info.consentMethod.trim()) {
      nextErrors.consentMethod = "학부모 동의 방법을 입력해주세요.";
    }
    return nextErrors;
  };

  const stepValidators = [
    () => validateBasicInfo(basicInfo),
    () => validateLocationInfo(locationInfo),
    () => validateEducationInfo(educationInfo),
    () => validateSchedule(schedule),
    () => validateSafetyInfo(safetyInfo),
    () => validateOtherInfo(otherInfo),
  ];

  const buildInputs = () => {
    const basicInfoText = [
      `학교명: ${basicInfo.schoolName || "(미입력)"}`,
      `학년/학급: ${basicInfo.gradeClass || "(미입력)"}`,
      `참가 인원: 학생 ${basicInfo.studentCount || "0"}명, 교사 ${basicInfo.teacherCount || "0"}명`,
      basicInfo.assistants ? `보조 인력: ${basicInfo.assistants}` : "",
      `체험학습 주제: ${basicInfo.tripTitle || "(미입력)"}`,
      `실시 일자: ${basicInfo.tripDate || "(미입력)"}`,
      `실시 시간: ${basicInfo.tripTime || "(미입력)"}`,
    ]
      .filter(Boolean)
      .join("\n");

    const locationInfoText = [
      `장소: ${locationInfo.placeName || "(미입력)"}`,
      `주소: ${locationInfo.address || "(미입력)"}`,
      `이동 수단: ${locationInfo.transportation || "(미입력)"}`,
      locationInfo.transportation === "전세버스" ? `운송 업체명: ${locationInfo.transportCompany || "(미입력)"}` : "",
      locationInfo.transportation === "전세버스" ? `차량 번호: ${locationInfo.vehicleNumber || "(미입력)"}` : "",
      locationInfo.transportation === "전세버스" ? `운전기사 연락처: ${locationInfo.driverContact || "(미입력)"}` : "",
      locationInfo.route ? `이동 경로: ${locationInfo.route}` : "",
      `소요 시간: ${locationInfo.travelTime || "(미입력)"}`,
    ]
      .filter(Boolean)
      .join("\n");

    const educationInfoText = [
      `교육 목표: ${educationInfo.goals || "(미입력)"}`,
      `교육과정 연계: ${educationInfo.curriculumLink || "(미입력)"}`,
      `주요 활동 내용: ${educationInfo.activities || "(미입력)"}`,
      educationInfo.priorEducation ? `사전 교육: ${educationInfo.priorEducation}` : "",
      educationInfo.postActivities ? `사후 활동: ${educationInfo.postActivities}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const scheduleText = schedule
      .map((item, index) => {
        return [
          `${index + 1}. ${item.time || "-"} / ${item.activity || "-"} / ${item.location || "-"}`,
          item.notes ? `- 비고: ${item.notes}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n");

    const safetyInfoText = [
      `인솔 책임자: ${safetyInfo.supervisorName || "(미입력)"} (${safetyInfo.supervisorContact || "-"})`,
      `비상 연락망: ${safetyInfo.emergencyContacts || "(미입력)"}`,
      `응급 상황 대처 방안: ${safetyInfo.emergencyPlan || "(미입력)"}`,
      `안전 교육 내용: ${safetyInfo.safetyEducation || "(미입력)"}`,
      safetyInfo.staffAssignment ? `안전 관리 인력 배치: ${safetyInfo.staffAssignment}` : "",
      `보험 가입 여부: ${safetyInfo.insurance || "(미입력)"}`,
      safetyInfo.insurance === "가입 완료" ? `보험 상세 정보: ${safetyInfo.insuranceDetails || "(미입력)"}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const otherInfoText = [
      `체험 비용: ${otherInfo.cost || "(미입력)"}`,
      `비용 부담 방법: ${otherInfo.costMethod || "(미입력)"}`,
      `중식 계획: ${otherInfo.meal || "(미입력)"}`,
      otherInfo.specialNotes ? `특이사항: ${otherInfo.specialNotes}` : "",
      `학부모 동의 방법: ${otherInfo.consentMethod || "(미입력)"}`,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      title: documentTitle,
      basicInfo: basicInfoText,
      locationInfo: locationInfoText,
      educationInfo: educationInfoText,
      schedule: scheduleText,
      safetyInfo: safetyInfoText,
      otherInfo: otherInfoText,
    };
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/documents/generate", {
        documentType: "현장체험학습 운영계획서",
        inputs: buildInputs(),
        uploadedTemplateId: referenceFileId ?? undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "문서 생성 완료",
        description: "현장체험학습 운영계획서가 생성되었습니다.",
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
      locationInfo: "장소 및 이동",
      educationInfo: "교육 목표",
      schedule: "세부 일정",
      safetyInfo: "안전 관리",
      otherInfo: "기타 사항",
    };
    return Object.entries(sections)
      .map(([key, value]) => `[${labels[key] ?? key}]\n${value}`)
      .join("\n\n");
  };

  const saveMutation = useMutation({
    mutationFn: async (status: "draft" | "completed") => {
      const response = await apiRequest("POST", "/api/documents", {
        documentType: "현장체험학습 운영계획서",
        title: documentTitle,
        schoolName: basicInfo.schoolName,
        metadata: {
          targetDate: basicInfo.tripDate,
          targetGrade: basicInfo.gradeClass,
          location: locationInfo.placeName,
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

  const updateScheduleItem = (index: number, key: keyof ScheduleItem, value: string) => {
    setSchedule((prev) => prev.map((item, idx) => (idx === index ? { ...item, [key]: value } : item)));
  };

  const addScheduleItem = () => {
    setSchedule((prev) => [...prev, emptyScheduleItem()]);
  };

  const removeScheduleItem = (index: number) => {
    setSchedule((prev) => prev.filter((_, idx) => idx !== index));
  };

  const renderError = (_key: string) => null;

  const aiContext = {
    basicInfo,
    locationInfo,
    educationInfo,
    schedule,
    safetyInfo,
    otherInfo,
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild data-testid="button-back">
              <Link href="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">현장체험학습 운영계획서 작성</h1>
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
                  <MapPin className="w-4 h-4 text-primary" />
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
              <CardDescription>체험학습의 기본 정보를 입력해주세요.</CardDescription>
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
                    placeholder="예: ○○초등학교"
                  />
                  {renderError("schoolName")}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">학년/학급</label>
                  <Input
                    value={basicInfo.gradeClass}
                    onChange={(event) => {
                      const next = { ...basicInfo, gradeClass: event.target.value };
                      setBasicInfo(next);
                      setErrors(validateBasicInfo(next));
                    }}
                    placeholder="예: 5학년 2반"
                  />
                  {renderError("gradeClass")}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">참가 학생 수</label>
                  <Input
                    type="number"
                    min={1}
                    value={basicInfo.studentCount}
                    onChange={(event) => {
                      const next = { ...basicInfo, studentCount: event.target.value };
                      setBasicInfo(next);
                      setErrors(validateBasicInfo(next));
                    }}
                    placeholder="예: 28"
                  />
                  {renderError("studentCount")}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">인솔 교사 수</label>
                  <Input
                    type="number"
                    min={1}
                    value={basicInfo.teacherCount}
                    onChange={(event) => {
                      const next = { ...basicInfo, teacherCount: event.target.value };
                      setBasicInfo(next);
                      setErrors(validateBasicInfo(next));
                    }}
                    placeholder="예: 2"
                  />
                  {renderError("teacherCount")}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">보조 인력 (선택)</label>
                <Input
                  value={basicInfo.assistants}
                  onChange={(event) => setBasicInfo({ ...basicInfo, assistants: event.target.value })}
                  placeholder="예: 학부모 도우미 3명"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">체험학습 주제</label>
                <Input
                  value={basicInfo.tripTitle}
                  onChange={(event) => {
                    const next = { ...basicInfo, tripTitle: event.target.value };
                    setBasicInfo(next);
                    setErrors(validateBasicInfo(next));
                  }}
                  placeholder="예: 국립중앙박물관 역사문화 체험"
                />
                {renderError("tripTitle")}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">실시 일자</label>
                  <Input
                    type="date"
                    value={basicInfo.tripDate}
                    onChange={(event) => {
                      const next = { ...basicInfo, tripDate: event.target.value };
                      setBasicInfo(next);
                      setErrors(validateBasicInfo(next));
                    }}
                  />
                  {renderError("tripDate")}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">실시 시간</label>
                  <Input
                    value={basicInfo.tripTime}
                    onChange={(event) => {
                      const next = { ...basicInfo, tripTime: event.target.value };
                      setBasicInfo(next);
                      setErrors(validateBasicInfo(next));
                    }}
                    placeholder="예: 09:00 ~ 15:30"
                  />
                  {renderError("tripTime")}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>장소 및 이동 정보</CardTitle>
              <CardDescription>체험 장소와 이동 계획을 입력해주세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">체험 장소명</label>
                <Input
                  value={locationInfo.placeName}
                  onChange={(event) => {
                    const next = { ...locationInfo, placeName: event.target.value };
                    setLocationInfo(next);
                    setErrors(validateLocationInfo(next));
                  }}
                  placeholder="예: 국립중앙박물관"
                />
                {renderError("placeName")}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">장소 주소</label>
                <Input
                  value={locationInfo.address}
                  onChange={(event) => {
                    const next = { ...locationInfo, address: event.target.value };
                    setLocationInfo(next);
                    setErrors(validateLocationInfo(next));
                  }}
                  placeholder="예: 서울특별시 용산구 서빙고로 137"
                />
                {renderError("address")}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">이동 수단</label>
                <RadioGroup
                  value={locationInfo.transportation}
                  onValueChange={(value) => {
                    const next = { ...locationInfo, transportation: value as TransportationType };
                    setLocationInfo(next);
                    setErrors(validateLocationInfo(next));
                  }}
                  className="flex flex-wrap gap-6"
                >
                  {["전세버스", "대중교통", "도보", "기타"].map((item) => (
                    <label key={item} className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value={item} />
                      {item}
                    </label>
                  ))}
                </RadioGroup>
                {renderError("transportation")}
              </div>

              {locationInfo.transportation === "전세버스" && (
                <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">운송 업체명</label>
                    <Input
                      value={locationInfo.transportCompany}
                      onChange={(event) => {
                        const next = { ...locationInfo, transportCompany: event.target.value };
                        setLocationInfo(next);
                        setErrors(validateLocationInfo(next));
                      }}
                      placeholder="예: ○○관광"
                    />
                    {renderError("transportCompany")}
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">차량 번호</label>
                      <Input
                        value={locationInfo.vehicleNumber}
                        onChange={(event) => {
                          const next = { ...locationInfo, vehicleNumber: event.target.value };
                          setLocationInfo(next);
                          setErrors(validateLocationInfo(next));
                        }}
                        placeholder="예: 12가 3456"
                      />
                      {renderError("vehicleNumber")}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">운전기사 연락처</label>
                      <Input
                        value={locationInfo.driverContact}
                        onChange={(event) => {
                          const next = { ...locationInfo, driverContact: formatPhoneNumber(event.target.value) };
                          setLocationInfo(next);
                          setErrors(validateLocationInfo(next));
                        }}
                        placeholder="예: 010-1234-5678"
                      />
                      {renderError("driverContact")}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">이동 경로 (선택)</label>
                <Textarea
                  value={locationInfo.route}
                  onChange={(event) => setLocationInfo({ ...locationInfo, route: event.target.value })}
                  placeholder="예: 학교 → 경부고속도로 → 박물관"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">소요 시간</label>
                <Input
                  value={locationInfo.travelTime}
                  onChange={(event) => {
                    const next = { ...locationInfo, travelTime: event.target.value };
                    setLocationInfo(next);
                    setErrors(validateLocationInfo(next));
                  }}
                  placeholder="예: 약 1시간 30분"
                />
                {renderError("travelTime")}
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>교육 목표 및 내용</CardTitle>
              <CardDescription>체험학습의 교육적 목표와 활동 내용을 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">교육 목표</label>
                  <AIGenerateButton
                    fieldName="goals"
                    context={{ ...aiContext, currentValue: educationInfo.goals }}
                    endpoint="/api/generate/field-trip-plan/field"
                    onGenerated={(text) => {
                      const next = { ...educationInfo, goals: text };
                      setEducationInfo(next);
                      setErrors(validateEducationInfo(next));
                    }}
                  />
                </div>
                <Textarea
                  value={educationInfo.goals}
                  onChange={(event) => {
                    const next = { ...educationInfo, goals: event.target.value };
                    setEducationInfo(next);
                    setErrors(validateEducationInfo(next));
                  }}
                  placeholder="교육 목표를 입력해주세요"
                  rows={4}
                />
                {renderError("goals")}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">교육과정 연계</label>
                  <AIGenerateButton
                    fieldName="curriculumLink"
                    context={{ ...aiContext, currentValue: educationInfo.curriculumLink }}
                    endpoint="/api/generate/field-trip-plan/field"
                    onGenerated={(text) => {
                      const next = { ...educationInfo, curriculumLink: text };
                      setEducationInfo(next);
                      setErrors(validateEducationInfo(next));
                    }}
                  />
                </div>
                <Textarea
                  value={educationInfo.curriculumLink}
                  onChange={(event) => {
                    const next = { ...educationInfo, curriculumLink: event.target.value };
                    setEducationInfo(next);
                    setErrors(validateEducationInfo(next));
                  }}
                  placeholder="교육과정 연계를 입력해주세요"
                  rows={3}
                />
                {renderError("curriculumLink")}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">주요 활동 내용</label>
                  <AIGenerateButton
                    fieldName="activities"
                    context={{ ...aiContext, currentValue: educationInfo.activities }}
                    endpoint="/api/generate/field-trip-plan/field"
                    onGenerated={(text) => {
                      const next = { ...educationInfo, activities: text };
                      setEducationInfo(next);
                      setErrors(validateEducationInfo(next));
                    }}
                  />
                </div>
                <Textarea
                  value={educationInfo.activities}
                  onChange={(event) => {
                    const next = { ...educationInfo, activities: event.target.value };
                    setEducationInfo(next);
                    setErrors(validateEducationInfo(next));
                  }}
                  placeholder="주요 활동 내용을 입력해주세요"
                  rows={5}
                />
                {renderError("activities")}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">사전 교육 내용 (선택)</label>
                  <AIGenerateButton
                    fieldName="priorEducation"
                    context={{ ...aiContext, currentValue: educationInfo.priorEducation }}
                    endpoint="/api/generate/field-trip-plan/field"
                    onGenerated={(text) => setEducationInfo({ ...educationInfo, priorEducation: text })}
                  />
                </div>
                <Textarea
                  value={educationInfo.priorEducation}
                  onChange={(event) => setEducationInfo({ ...educationInfo, priorEducation: event.target.value })}
                  placeholder="사전 교육 내용을 입력해주세요"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">사후 활동 계획 (선택)</label>
                  <AIGenerateButton
                    fieldName="postActivities"
                    context={{ ...aiContext, currentValue: educationInfo.postActivities }}
                    endpoint="/api/generate/field-trip-plan/field"
                    onGenerated={(text) => setEducationInfo({ ...educationInfo, postActivities: text })}
                  />
                </div>
                <Textarea
                  value={educationInfo.postActivities}
                  onChange={(event) => setEducationInfo({ ...educationInfo, postActivities: event.target.value })}
                  placeholder="사후 활동 계획을 입력해주세요"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>세부 일정</CardTitle>
              <CardDescription>시간대별 일정을 입력해주세요. 최소 3개 이상 필요합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {errors.schedule && <p className="text-sm text-destructive">{errors.schedule}</p>}
              <div className="space-y-4">
                {schedule.map((item, index) => (
                  <Card key={`schedule-${index}`} className="border border-border">
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">일정 {index + 1}</h3>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeScheduleItem(index)}
                          disabled={schedule.length <= 3}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          삭제
                        </Button>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">시간</label>
                          <Input
                            value={item.time}
                            onChange={(event) => updateScheduleItem(index, "time", event.target.value)}
                            placeholder="예: 09:00-10:00"
                          />
                          {renderError(`schedule_time_${index}`)}
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">장소</label>
                          <Input
                            value={item.location}
                            onChange={(event) => updateScheduleItem(index, "location", event.target.value)}
                            placeholder="예: 학교 정문"
                          />
                          {renderError(`schedule_location_${index}`)}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">활동 내용</label>
                        <Input
                          value={item.activity}
                          onChange={(event) => updateScheduleItem(index, "activity", event.target.value)}
                          placeholder="예: 출석 확인 및 이동"
                        />
                        {renderError(`schedule_activity_${index}`)}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">비고 (선택)</label>
                        <Input
                          value={item.notes}
                          onChange={(event) => updateScheduleItem(index, "notes", event.target.value)}
                          placeholder="예: 출석 확인"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button type="button" variant="outline" onClick={addScheduleItem}>
                <Plus className="w-4 h-4 mr-2" />
                일정 추가
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>안전 관리 계획</CardTitle>
              <CardDescription>안전한 체험학습을 위한 관리 계획을 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">인솔 책임자 이름</label>
                  <Input
                    value={safetyInfo.supervisorName}
                    onChange={(event) => {
                      const next = { ...safetyInfo, supervisorName: event.target.value };
                      setSafetyInfo(next);
                      setErrors(validateSafetyInfo(next));
                    }}
                    placeholder="예: 홍길동"
                  />
                  {renderError("supervisorName")}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">인솔 책임자 연락처</label>
                  <Input
                    value={safetyInfo.supervisorContact}
                    onChange={(event) => {
                      const next = { ...safetyInfo, supervisorContact: formatPhoneNumber(event.target.value) };
                      setSafetyInfo(next);
                      setErrors(validateSafetyInfo(next));
                    }}
                    placeholder="예: 010-1111-2222"
                  />
                  {renderError("supervisorContact")}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">비상 연락망</label>
                <Textarea
                  value={safetyInfo.emergencyContacts}
                  onChange={(event) => {
                    const next = { ...safetyInfo, emergencyContacts: event.target.value };
                    setSafetyInfo(next);
                    setErrors(validateSafetyInfo(next));
                  }}
                  placeholder="예: 담임교사 010-0000-0000"
                  rows={4}
                />
                {renderError("emergencyContacts")}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">응급 상황 대처 방안</label>
                  <AIGenerateButton
                    fieldName="emergencyPlan"
                    context={{ ...aiContext, currentValue: safetyInfo.emergencyPlan }}
                    endpoint="/api/generate/field-trip-plan/field"
                    onGenerated={(text) => {
                      const next = { ...safetyInfo, emergencyPlan: text };
                      setSafetyInfo(next);
                      setErrors(validateSafetyInfo(next));
                    }}
                  />
                </div>
                <Textarea
                  value={safetyInfo.emergencyPlan}
                  onChange={(event) => {
                    const next = { ...safetyInfo, emergencyPlan: event.target.value };
                    setSafetyInfo(next);
                    setErrors(validateSafetyInfo(next));
                  }}
                  placeholder="응급 상황 대처 방안을 입력해주세요"
                  rows={4}
                />
                {renderError("emergencyPlan")}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">안전 교육 내용</label>
                  <AIGenerateButton
                    fieldName="safetyEducation"
                    context={{ ...aiContext, currentValue: safetyInfo.safetyEducation }}
                    endpoint="/api/generate/field-trip-plan/field"
                    onGenerated={(text) => {
                      const next = { ...safetyInfo, safetyEducation: text };
                      setSafetyInfo(next);
                      setErrors(validateSafetyInfo(next));
                    }}
                  />
                </div>
                <Textarea
                  value={safetyInfo.safetyEducation}
                  onChange={(event) => {
                    const next = { ...safetyInfo, safetyEducation: event.target.value };
                    setSafetyInfo(next);
                    setErrors(validateSafetyInfo(next));
                  }}
                  placeholder="안전 교육 내용을 입력해주세요"
                  rows={4}
                />
                {renderError("safetyEducation")}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">안전 관리 인력 배치 (선택)</label>
                <Textarea
                  value={safetyInfo.staffAssignment}
                  onChange={(event) => setSafetyInfo({ ...safetyInfo, staffAssignment: event.target.value })}
                  placeholder="예: 1조 홍길동 교사"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">보험 가입 여부</label>
                <RadioGroup
                  value={safetyInfo.insurance}
                  onValueChange={(value) => {
                    const next = { ...safetyInfo, insurance: value as InsuranceType };
                    setSafetyInfo(next);
                    setErrors(validateSafetyInfo(next));
                  }}
                  className="space-y-2"
                >
                  {["가입 완료", "학교 단체 보험 적용", "미가입"].map((item) => (
                    <label key={item} className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value={item} />
                      {item}
                    </label>
                  ))}
                </RadioGroup>
                {renderError("insurance")}
              </div>

              {safetyInfo.insurance === "가입 완료" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">보험 상세 정보</label>
                  <Input
                    value={safetyInfo.insuranceDetails}
                    onChange={(event) => {
                      const next = { ...safetyInfo, insuranceDetails: event.target.value };
                      setSafetyInfo(next);
                      setErrors(validateSafetyInfo(next));
                    }}
                    placeholder="예: ○○보험, 증권번호 123-456-789"
                  />
                  {renderError("insuranceDetails")}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step === 5 && (
          <Card>
            <CardHeader>
              <CardTitle>기타 사항</CardTitle>
              <CardDescription>비용, 급식, 동의 방법 등을 입력해주세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">체험 비용</label>
                <Textarea
                  value={otherInfo.cost}
                  onChange={(event) => {
                    const next = { ...otherInfo, cost: event.target.value };
                    setOtherInfo(next);
                    setErrors(validateOtherInfo(next));
                  }}
                  placeholder="예: 1인당 15,000원 (교통비 10,000원, 입장료 5,000원)"
                  rows={3}
                />
                {renderError("cost")}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">비용 부담 방법</label>
                <RadioGroup
                  value={otherInfo.costMethod}
                  onValueChange={(value) => {
                    const next = { ...otherInfo, costMethod: value as CostMethodType };
                    setOtherInfo(next);
                    setErrors(validateOtherInfo(next));
                  }}
                  className="space-y-2"
                >
                  {["학부모 부담", "학교 예산", "혼합"].map((item) => (
                    <label key={item} className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value={item} />
                      {item}
                    </label>
                  ))}
                </RadioGroup>
                {renderError("costMethod")}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">중식 계획</label>
                <Textarea
                  value={otherInfo.meal}
                  onChange={(event) => {
                    const next = { ...otherInfo, meal: event.target.value };
                    setOtherInfo(next);
                    setErrors(validateOtherInfo(next));
                  }}
                  placeholder="예: 도시락 지참 (학교 급식실 제공)"
                  rows={3}
                />
                {renderError("meal")}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">특이사항 (선택)</label>
                <Textarea
                  value={otherInfo.specialNotes}
                  onChange={(event) => setOtherInfo({ ...otherInfo, specialNotes: event.target.value })}
                  placeholder="예: 알레르기 학생 2명"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">학부모 동의 방법</label>
                <Input
                  value={otherInfo.consentMethod}
                  onChange={(event) => {
                    const next = { ...otherInfo, consentMethod: event.target.value };
                    setOtherInfo(next);
                    setErrors(validateOtherInfo(next));
                  }}
                  placeholder="예: 가정통신문 발송 및 동의서 징구"
                />
                {renderError("consentMethod")}
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-6 space-y-4">
                <div className="text-center border-b pb-4">
                  <h2 className="text-xl font-bold">{documentTitle}</h2>
                  <p className="text-muted-foreground">{basicInfo.tripTitle || "체험학습 주제 미입력"}</p>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-semibold">기본 정보</p>
                    <p className="text-muted-foreground">
                      {basicInfo.gradeClass || "-"} / 학생 {basicInfo.studentCount || "-"}명 / 교사 {basicInfo.teacherCount || "-"}명
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold">장소 및 이동</p>
                    <p className="text-muted-foreground">
                      {locationInfo.placeName || "-"} / {locationInfo.transportation || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold">교육 목표</p>
                    <p className="text-muted-foreground line-clamp-2">{educationInfo.goals || "-"}</p>
                  </div>
                  <div>
                    <p className="font-semibold">세부 일정</p>
                    <p className="text-muted-foreground">총 {schedule.length}개 일정</p>
                  </div>
                  <div>
                    <p className="font-semibold">안전 관리</p>
                    <p className="text-muted-foreground">
                      책임자: {safetyInfo.supervisorName || "-"} / 보험: {safetyInfo.insurance || "-"}
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
              <div className="flex flex-wrap gap-2 justify-end">
                <Button variant="outline" onClick={() => saveMutation.mutate("draft")} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "저장 중..." : "임시 저장"}
                </Button>
                <Button variant="outline" onClick={() => saveMutation.mutate("completed")} disabled={saveMutation.isPending}>
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
