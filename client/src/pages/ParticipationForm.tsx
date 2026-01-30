import { useState, useRef, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Sparkles, Loader2, Wand2, Eye, Plus, Trash2 } from "lucide-react";
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

type TeamMember = {
  id: string;
  name: string;
  gradeClass: string;
  contact: string;
};

interface ProfileData {
  schoolName?: string;
}

const PROGRAM_TYPES = [
  { value: "contest", label: "공모전/대회" },
  { value: "camp", label: "캠프/교실" },
  { value: "experience", label: "체험학습/견학" },
  { value: "education", label: "교육/연수" },
  { value: "other", label: "기타" },
];

const createTeamMember = (): TeamMember => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  name: "",
  gradeClass: "",
  contact: "",
});

// 섹션 정의
const FORM_SECTIONS: FormSection[] = [
  { id: "section-program", number: 1, title: "프로그램 정보" },
  { id: "section-applicant", number: 2, title: "신청자 정보" },
  { id: "section-guardian", number: 3, title: "보호자 정보" },
  { id: "section-motivation", number: 4, title: "참가 동기" },
  { id: "section-notices", number: 5, title: "유의사항" },
  { id: "section-consent", number: 6, title: "동의사항" },
  { id: "section-signature", number: 7, title: "서명" },
];

// 작성 가이드 정의
const GUIDE_SECTIONS: GuideSection[] = [
  {
    number: 1,
    title: "프로그램 정보",
    items: [
      { label: "프로그램명", description: "대회, 캠프, 체험학습 이름" },
      { label: "프로그램 유형", description: "공모전/캠프/체험학습 등 선택" },
      { label: "주최/주관", description: "주최 기관명 (예: 송파구청)" },
      { label: "참가 부문", description: "해당되는 경우 부문/분야 기재" },
    ],
  },
  {
    number: 2,
    title: "신청자 정보",
    items: [
      { label: "성명", description: "참가 학생 이름" },
      { label: "학교/학년/반", description: "소속 학교 및 학적 정보" },
      { label: "연락처", description: "참가자 휴대폰 번호" },
    ],
    tip: { type: "warning", text: "팀 참가 시 대표학생 정보 입력 후 팀원 추가" },
  },
  {
    number: 3,
    title: "보호자 정보",
    subtitle: "(선택)",
    items: [
      { label: "보호자 성명", description: "법정대리인 이름" },
      { label: "관계", description: "학생과의 관계 (부, 모 등)" },
      { label: "연락처", description: "보호자 휴대폰 번호" },
    ],
    tip: { type: "info", text: "미성년자 참가 시 보호자 정보 필수" },
  },
  {
    number: 4,
    title: "참가 동기",
    items: [
      { label: "참가 동기", description: "프로그램 참가 이유 작성" },
    ],
    tip: { type: "info", text: "AI 생성 버튼으로 참가 동기 자동 작성 가능" },
  },
  {
    number: 5,
    title: "유의사항",
    items: [
      { label: "유의사항", description: "참가 시 주의사항 및 안내문" },
    ],
    tip: { type: "info", text: "AI 생성 버튼으로 유의사항 자동 작성 가능" },
  },
  {
    number: 6,
    title: "동의사항",
    items: [
      { label: "개인정보 수집", description: "참가자 관리, 입상 시 정보 제공 목적" },
      { label: "저작권 활용", description: "공모전 출품작 활용 동의 (공모전만)" },
    ],
    tip: { type: "info", text: "공모전 유형 선택 시 저작권 동의 항목 표시" },
  },
  {
    number: 7,
    title: "서명",
    items: [
      { label: "신청 날짜", description: "신청서 작성 날짜" },
      { label: "수신자", description: "\"○○구청장 귀하\" 형식으로 입력" },
    ],
  },
];

export default function ParticipationForm() {
  const { toast } = useToast();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [generatingField, setGeneratingField] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  // 사이드바 상태 (기본: 닫힘)
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("section-program");

  // 섹션 refs
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // 폼 상태
  const [programName, setProgramName] = useState("");
  const [programType, setProgramType] = useState("contest");
  const [organizer, setOrganizer] = useState("");
  const [participationCategory, setParticipationCategory] = useState("");
  const [applicantName, setApplicantName] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");
  const [classNumber, setClassNumber] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [contact, setContact] = useState("");
  const [guardianEnabled, setGuardianEnabled] = useState(true);
  const [guardianName, setGuardianName] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState("");
  const [guardianContact, setGuardianContact] = useState("");
  const [teamEnabled, setTeamEnabled] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [motivationEnabled, setMotivationEnabled] = useState(true);
  const [motivationContent, setMotivationContent] = useState("");
  const [notices, setNotices] = useState("");
  const [personalInfoConsent, setPersonalInfoConsent] = useState(false);
  const [copyrightConsent, setCopyrightConsent] = useState(false);
  const [signatureDate, setSignatureDate] = useState(new Date().toISOString().split("T")[0]);
  const [recipient, setRecipient] = useState("");

  const { data: profile } = useQuery<ProfileData>({
    queryKey: ["/api/auth/profile"],
    retry: false,
  });

  const schoolName = profile?.schoolName || school || "학교명";

  const getFormContext = () => ({
    programName,
    programType,
    programTypeLabel: PROGRAM_TYPES.find(t => t.value === programType)?.label || programType,
    organizer,
    participationCategory,
    applicantName,
    school,
    grade,
    classNumber,
    studentNumber,
    contact,
    guardianName,
    guardianRelationship,
    guardianContact,
    teamMembers,
    motivationContent,
    notices,
    signatureDate,
    recipient,
    schoolName,
  });

  const applyGeneratedField = (fieldName: string, generatedContent: string) => {
    if (fieldName === "motivationContent") {
      setMotivationContent(generatedContent);
      return true;
    }
    if (fieldName === "notices") {
      setNotices(generatedContent);
      return true;
    }
    return false;
  };

  const generateFieldMutation = useMutation({
    mutationFn: async ({ fieldName, fieldLabel }: { fieldName: string; fieldLabel: string }) => {
      setGeneratingField(fieldName);
      const response = await apiRequest("POST", "/api/documents/generate-field", {
        documentType: "참가 신청서",
        fieldName,
        fieldLabel,
        context: getFormContext(),
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
      const response = await apiRequest("POST", "/api/documents/generate-field", {
        documentType: "참가 신청서",
        fieldName: "allFields",
        fieldLabel: "전체 필드",
        context: getFormContext(),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      // JSON 파싱
      const generatedContent = String(data.generatedContent || "").trim();
      // JSON 블록 추출 (```json ... ``` 또는 순수 JSON)
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
    onSuccess: (data: Record<string, string>) => {
      // 모든 필드 적용
      if (data.programName) setProgramName(data.programName);
      if (data.organizer) setOrganizer(data.organizer);
      if (data.participationCategory) setParticipationCategory(data.participationCategory);
      if (data.applicantName) setApplicantName(data.applicantName);
      if (data.school) setSchool(data.school);
      if (data.grade) setGrade(data.grade);
      if (data.classNumber) setClassNumber(data.classNumber);
      if (data.studentNumber) setStudentNumber(data.studentNumber);
      if (data.contact) setContact(data.contact);
      if (data.guardianName) setGuardianName(data.guardianName);
      if (data.guardianRelationship) setGuardianRelationship(data.guardianRelationship);
      if (data.guardianContact) setGuardianContact(data.guardianContact);
      if (data.motivationContent) setMotivationContent(data.motivationContent);
      if (data.notices) setNotices(data.notices);
      if (data.recipient) setRecipient(data.recipient);

      toast({
        title: "AI 전부 생성 완료",
        description: "모든 항목이 생성되었습니다. 필요시 수정해주세요.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "AI 전부 생성 실패",
        description: error.message || "AI 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsGeneratingAll(false);
    },
  });

  const handleReset = () => {
    setProgramName("");
    setProgramType("contest");
    setOrganizer("");
    setParticipationCategory("");
    setApplicantName("");
    setSchool("");
    setGrade("");
    setClassNumber("");
    setStudentNumber("");
    setContact("");
    setGuardianEnabled(true);
    setGuardianName("");
    setGuardianRelationship("");
    setGuardianContact("");
    setTeamEnabled(false);
    setTeamMembers([]);
    setMotivationEnabled(true);
    setMotivationContent("");
    setNotices("");
    setPersonalInfoConsent(false);
    setCopyrightConsent(false);
    setSignatureDate(new Date().toISOString().split("T")[0]);
    setRecipient("");
    toast({ title: "초기화 완료", description: "모든 입력 내용이 초기화되었습니다." });
  };

  const handleAddTeamMember = () => {
    setTeamMembers((prev) => [...prev, createTeamMember()]);
  };

  const handleRemoveTeamMember = (id: string) => {
    setTeamMembers((prev) => prev.filter((member) => member.id !== id));
  };

  const handleUpdateTeamMember = (id: string, field: keyof TeamMember, value: string) => {
    setTeamMembers((prev) =>
      prev.map((member) => (member.id === id ? { ...member, [field]: value } : member))
    );
  };

  // 섹션으로 스크롤
  const scrollToSection = useCallback((sectionId: string) => {
    const el = sectionRefs.current[sectionId];
    if (el) {
      const y = el.getBoundingClientRect().top + window.pageYOffset - 100;
      window.scrollTo({ top: y, behavior: "smooth" });
      setActiveSection(sectionId);
    }
  }, []);

  // ref 설정 헬퍼
  const setSectionRef = useCallback((id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  }, []);

  return (
    <div className="min-h-screen bg-background relative">
      {/* 좌측 사이드바: 섹션 목록 */}
      <FormSectionSidebar
        isOpen={leftSidebarOpen}
        onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
        documentTitle="참가 신청서"
        sections={FORM_SECTIONS}
        activeSection={activeSection}
        onSectionClick={scrollToSection}
      />

      {/* 우측 사이드바: 작성 가이드 */}
      <FormGuideSidebar
        isOpen={rightSidebarOpen}
        onToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
        title="작성 가이드"
        sections={GUIDE_SECTIONS}
      />

      <header
        className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-40 transition-all duration-300"
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
                <h1 className="text-lg font-semibold text-foreground">참가 신청서 작성</h1>
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
              참가 신청서 정보 입력
            </CardTitle>
            <CardDescription>입력한 내용으로 AI가 항목을 생성합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* 프로그램 정보 */}
            <section ref={setSectionRef("section-program")} className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">프로그램 정보</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">프로그램/대회명 <span className="text-red-500">*</span></span>
                  <Input
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    placeholder="예: 제2회 송파구 초등학교 그림 그리기 대회"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">프로그램 유형</span>
                    <Select value={programType} onValueChange={setProgramType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROGRAM_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">주최/주관</span>
                    <Input
                      value={organizer}
                      onChange={(e) => setOrganizer(e.target.value)}
                      placeholder="예: 송파구청"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">참가 부문/분야</span>
                  <Input
                    value={participationCategory}
                    onChange={(e) => setParticipationCategory(e.target.value)}
                    placeholder="예: 그림 그리기, 쇼츠 영상, 포스터"
                  />
                </div>
              </div>
            </section>

            <div className="h-px bg-border" />

            {/* 신청자 정보 */}
            <section ref={setSectionRef("section-applicant")} className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">신청자 정보</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">성명 <span className="text-red-500">*</span></span>
                  <Input
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    placeholder="홍길동"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">학교명 <span className="text-red-500">*</span></span>
                  <Input
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="○○초등학교"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">학년</span>
                  <Input
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="3"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">반</span>
                  <Input
                    value={classNumber}
                    onChange={(e) => setClassNumber(e.target.value)}
                    placeholder="2"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">번호</span>
                  <Input
                    value={studentNumber}
                    onChange={(e) => setStudentNumber(e.target.value)}
                    placeholder="15"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">연락처 <span className="text-red-500">*</span></span>
                  <Input
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="010-1234-5678"
                  />
                </div>
              </div>

              {/* 팀 참가 */}
              <div className="rounded-lg border border-dashed p-4 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="teamEnabled"
                    checked={teamEnabled}
                    onCheckedChange={(checked) => setTeamEnabled(!!checked)}
                  />
                  <Label htmlFor="teamEnabled" className="text-sm font-medium">팀 참가 (팀원 추가 입력)</Label>
                </div>
                {teamEnabled && (
                  <div className="mt-4 space-y-3">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="flex gap-2 items-center">
                        <Input
                          value={member.name}
                          onChange={(e) => handleUpdateTeamMember(member.id, "name", e.target.value)}
                          placeholder="팀원 성명"
                          className="flex-1"
                        />
                        <Input
                          value={member.gradeClass}
                          onChange={(e) => handleUpdateTeamMember(member.id, "gradeClass", e.target.value)}
                          placeholder="학년/반"
                          className="w-24"
                        />
                        <Input
                          value={member.contact}
                          onChange={(e) => handleUpdateTeamMember(member.id, "contact", e.target.value)}
                          placeholder="연락처"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveTeamMember(member.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={handleAddTeamMember}>
                      <Plus className="w-4 h-4 mr-1" /> 팀원 추가
                    </Button>
                  </div>
                )}
              </div>
            </section>

            <div className="h-px bg-border" />

            {/* 보호자 정보 */}
            <section ref={setSectionRef("section-guardian")} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">보호자 정보</h2>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="guardianEnabled"
                    checked={guardianEnabled}
                    onCheckedChange={(checked) => setGuardianEnabled(!!checked)}
                  />
                  <Label htmlFor="guardianEnabled" className="text-sm text-muted-foreground">포함</Label>
                </div>
              </div>
              {guardianEnabled && (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">보호자 성명</span>
                    <Input
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      placeholder="홍부모"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">학생과의 관계</span>
                    <Input
                      value={guardianRelationship}
                      onChange={(e) => setGuardianRelationship(e.target.value)}
                      placeholder="부/모"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">보호자 연락처</span>
                    <Input
                      value={guardianContact}
                      onChange={(e) => setGuardianContact(e.target.value)}
                      placeholder="010-0000-0000"
                    />
                  </div>
                </div>
              )}
            </section>

            <div className="h-px bg-border" />

            {/* 참가 동기 */}
            <section ref={setSectionRef("section-motivation")} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold text-foreground">참가 동기</h2>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="motivationEnabled"
                      checked={motivationEnabled}
                      onCheckedChange={(checked) => setMotivationEnabled(!!checked)}
                    />
                    <Label htmlFor="motivationEnabled" className="text-sm text-muted-foreground">포함</Label>
                  </div>
                </div>
                {motivationEnabled && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => generateFieldMutation.mutate({ fieldName: "motivationContent", fieldLabel: "참가 동기" })}
                    disabled={generatingField === "motivationContent" || isGeneratingAll}
                  >
                    {generatingField === "motivationContent" ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        생성 중...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3 h-3 mr-1" />
                        AI 작성
                      </>
                    )}
                  </Button>
                )}
              </div>
              {motivationEnabled && (
                <Textarea
                  placeholder="이 프로그램에 참가하고 싶은 이유를 작성하세요."
                  className="min-h-[100px]"
                  value={motivationContent}
                  onChange={(e) => setMotivationContent(e.target.value)}
                />
              )}
            </section>

            <div className="h-px bg-border" />

            {/* 유의사항 */}
            <section ref={setSectionRef("section-notices")} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">유의사항</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => generateFieldMutation.mutate({ fieldName: "notices", fieldLabel: "유의사항" })}
                  disabled={generatingField === "notices" || isGeneratingAll}
                >
                  {generatingField === "notices" ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3 h-3 mr-1" />
                      AI 생성
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                placeholder="예:&#10;• 제출된 작품은 반환하지 않습니다.&#10;• 타 공모전 수상작이나 표절작은 심사에서 제외됩니다."
                className="min-h-[100px]"
                value={notices}
                onChange={(e) => setNotices(e.target.value)}
              />
            </section>

            <div className="h-px bg-border" />

            {/* 동의사항 */}
            <section ref={setSectionRef("section-consent")} className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">동의사항</h2>
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">개인정보 수집·이용 동의</span>
                    <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded">필수</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    수집목적: 참가자 관리 및 연락 | 수집항목: 성명, 학교, 연락처 | 보유기간: 프로그램 종료 후 1년
                  </p>
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Checkbox
                      id="personalInfoConsent"
                      checked={personalInfoConsent}
                      onCheckedChange={(checked) => setPersonalInfoConsent(!!checked)}
                    />
                    <Label htmlFor="personalInfoConsent" className="text-sm">위 내용에 동의합니다</Label>
                  </div>
                </div>

                {programType === "contest" && (
                  <div className="rounded-lg bg-muted/40 p-4 space-y-3">
                    <span className="font-medium text-sm">저작권 활용 동의 (공모전)</span>
                    <p className="text-xs text-muted-foreground">
                      출품작의 저작권은 응모자에게 있으나, 주최측은 공익 목적으로 활용할 수 있습니다.
                    </p>
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Checkbox
                        id="copyrightConsent"
                        checked={copyrightConsent}
                        onCheckedChange={(checked) => setCopyrightConsent(!!checked)}
                      />
                      <Label htmlFor="copyrightConsent" className="text-sm">위 내용에 동의합니다</Label>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <div className="h-px bg-border" />

            {/* 서명 */}
            <section ref={setSectionRef("section-signature")} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <span className="text-sm font-semibold text-foreground">신청 날짜</span>
                <Input
                  type="date"
                  value={signatureDate}
                  onChange={(e) => setSignatureDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <span className="text-sm font-semibold text-foreground">수신자</span>
                <Input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="예: 송파구청장 귀하"
                />
              </div>
            </section>

            {/* 하단 버튼 */}
            <div className="flex flex-col gap-3 pt-4 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => setIsPreviewOpen(true)}>
                <Eye className="w-4 h-4 mr-2" />
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
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    AI 전부 생성 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI 전부 생성
                  </>
                )}
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
            <DialogTitle>문서 미리보기</DialogTitle>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto bg-muted/40 p-6">
            <div className="bg-white p-8 shadow rounded space-y-6">
              <div className="text-center border-b-2 border-black pb-4">
                <h1 className="text-xl font-bold">참 가 신 청 서</h1>
                <p className="text-lg mt-2">{programName || "(프로그램명)"}</p>
                {organizer && <p className="text-sm text-muted-foreground">{organizer}</p>}
              </div>

              <table className="w-full text-sm border-collapse border border-slate-300">
                <tbody>
                  <tr>
                    <td className="border border-slate-300 bg-slate-50 px-3 py-2 font-medium w-24">성명</td>
                    <td className="border border-slate-300 px-3 py-2">{applicantName || "-"}</td>
                    <td className="border border-slate-300 bg-slate-50 px-3 py-2 font-medium w-24">학교</td>
                    <td className="border border-slate-300 px-3 py-2">{school || "-"}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 bg-slate-50 px-3 py-2 font-medium">학년/반/번</td>
                    <td className="border border-slate-300 px-3 py-2">{grade || "-"}학년 {classNumber || "-"}반 {studentNumber || "-"}번</td>
                    <td className="border border-slate-300 bg-slate-50 px-3 py-2 font-medium">연락처</td>
                    <td className="border border-slate-300 px-3 py-2">{contact || "-"}</td>
                  </tr>
                  {guardianEnabled && (
                    <tr>
                      <td className="border border-slate-300 bg-slate-50 px-3 py-2 font-medium">보호자</td>
                      <td className="border border-slate-300 px-3 py-2" colSpan={3}>
                        {guardianName || "-"} ({guardianRelationship || "-"}) / {guardianContact || "-"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {motivationEnabled && motivationContent && (
                <div>
                  <h3 className="font-medium mb-2">참가 동기</h3>
                  <p className="text-sm whitespace-pre-wrap bg-slate-50 p-3 rounded border">{motivationContent}</p>
                </div>
              )}

              {notices && (
                <div>
                  <h3 className="font-medium mb-2">유의사항</h3>
                  <p className="text-sm whitespace-pre-wrap bg-slate-50 p-3 rounded border">{notices}</p>
                </div>
              )}

              <div className="text-center pt-6 border-t">
                <p className="text-sm mb-4">위와 같이 참가를 신청합니다.</p>
                <p className="mb-4">{signatureDate}</p>
                <p className="mb-2">신청인: {applicantName || "___________"} (인)</p>
                {guardianEnabled && <p className="mb-4">보호자: {guardianName || "___________"} (인)</p>}
                <p className="font-medium mt-6">{recipient || "○○○ 귀하"}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
