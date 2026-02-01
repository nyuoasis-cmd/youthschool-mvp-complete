import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Eye, Plus, Trash2, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AIStyledButton, SparkleIcon } from "@/components/AIGenerateButton";
import { DocumentSaveButton, AutoSaveIndicator } from "@/components/DocumentSaveButton";
import { useDocumentSave } from "@/hooks/use-document-save";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

type CollectionItem = {
  id: string;
  name: string;
  type: string;
};

type ThirdPartyRecipient = {
  id: string;
  name: string;
  purpose: string;
  items: string;
  retentionPeriod: string;
};

interface ProfileData {
  schoolName?: string;
}

// 섹션 정의
const FORM_SECTIONS: FormSection[] = [
  { id: "section-header", number: 1, title: "동의서 정보" },
  { id: "section-collection", number: 2, title: "수집·이용 내역" },
  { id: "section-third-party", number: 3, title: "제3자 제공" },
  { id: "section-refusal", number: 4, title: "거부 권리 안내" },
  { id: "section-subject", number: 5, title: "동의 대상자 정보" },
  { id: "section-consent", number: 6, title: "동의 체크" },
  { id: "section-signature", number: 7, title: "서명" },
];

// 작성 가이드 정의
const GUIDE_SECTIONS: GuideSection[] = [
  {
    number: 1,
    title: "동의서 정보",
    items: [
      { label: "동의서 제목", description: "예: 개인정보 수집·이용 동의서" },
      { label: "부제목/용도", description: "예: 학교폭력 전담기구 학부모위원 위촉용" },
      { label: "안내문", description: "동의서 상단에 표시할 안내 문구" },
    ],
  },
  {
    number: 2,
    title: "수집·이용 내역",
    items: [
      { label: "수집 목적", description: "개인정보를 수집하는 목적" },
      { label: "수집 항목", description: "필수/선택 수집 항목 구분" },
      { label: "보유 기간", description: "예: 재학 기간, 1년, 목적 달성 시" },
    ],
    tip: { type: "info", text: "개인정보 보호법 제15조에 따라 수집 목적과 항목을 명시해야 합니다" },
  },
  {
    number: 3,
    title: "제3자 제공",
    subtitle: "(선택)",
    items: [
      { label: "제공받는 자", description: "예: 앨범제작 계약 업체" },
      { label: "제공 목적", description: "예: 졸업 앨범 제작" },
      { label: "제공 항목", description: "제공되는 개인정보 항목" },
    ],
    tip: { type: "warning", text: "제3자 제공 시 별도 동의가 필요합니다" },
  },
  {
    number: 4,
    title: "거부 권리 안내",
    items: [
      { label: "거부 권리", description: "동의를 거부할 수 있다는 안내" },
      { label: "거부 시 불이익", description: "동의 거부 시 발생하는 불이익 설명" },
    ],
  },
  {
    number: 5,
    title: "동의 대상자 정보",
    items: [
      { label: "대상자 유형", description: "학생, 학생+보호자, 일반인 등" },
    ],
  },
  {
    number: 6,
    title: "동의 체크",
    items: [
      { label: "동의 체크박스", description: "필수/선택 동의 항목 설정" },
    ],
  },
  {
    number: 7,
    title: "서명",
    items: [
      { label: "서명 날짜", description: "동의서 작성 날짜" },
      { label: "수신자", description: "\"○○학교장 귀하\" 형식으로 입력" },
    ],
  },
];

const createCollectionItem = (): CollectionItem => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  name: "",
  type: "text",
});

const createThirdPartyRecipient = (): ThirdPartyRecipient => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  name: "",
  purpose: "",
  items: "",
  retentionPeriod: "",
});

export default function ConsentForm() {
  const { toast } = useToast();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [generatingField, setGeneratingField] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  // 사이드바 상태 (기본: 닫힘)
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("section-header");

  // 섹션 refs
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // 동의서 정보
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");

  // 수집·이용 내역
  const [collectionPurpose, setCollectionPurpose] = useState("");
  const [requiredItems, setRequiredItems] = useState<CollectionItem[]>([
    { id: "1", name: "성명", type: "text" },
    { id: "2", name: "연락처", type: "phone" },
  ]);
  const [optionalItems, setOptionalItems] = useState<CollectionItem[]>([]);
  const [retentionPeriod, setRetentionPeriod] = useState("");

  // 제3자 제공
  const [thirdPartyEnabled, setThirdPartyEnabled] = useState(false);
  const [thirdPartyRecipients, setThirdPartyRecipients] = useState<ThirdPartyRecipient[]>([]);

  // 거부 권리 안내
  const [refusalConsequence, setRefusalConsequence] = useState("");

  // 대상자 정보
  const [subjectType, setSubjectType] = useState<"student" | "student_parent" | "general">("student_parent");
  const [studentGrade, setStudentGrade] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [studentName, setStudentName] = useState("");
  const [guardianName, setGuardianName] = useState("");

  // 동의 체크
  const [collectionConsent, setCollectionConsent] = useState(false);
  const [thirdPartyConsent, setThirdPartyConsent] = useState(false);

  // 서명
  const [signatureDate, setSignatureDate] = useState("");
  const [recipient, setRecipient] = useState("");

  const { data: profile } = useQuery<ProfileData>({
    queryKey: ["/api/auth/profile"],
    retry: false,
  });

  const schoolName = profile?.schoolName || "○○학교";

  // 문서 저장 기능
  const getFormData = useCallback(() => ({
    title,
    subtitle,
    description,
    collectionPurpose,
    requiredItems,
    optionalItems,
    retentionPeriod,
    thirdPartyEnabled,
    thirdPartyRecipients,
    refusalConsequence,
    subjectType,
    studentGrade,
    studentClass,
    studentNumber,
    studentName,
    guardianName,
    collectionConsent,
    thirdPartyConsent,
    signatureDate,
    recipient,
    schoolName,
  }), [title, subtitle, description, collectionPurpose, requiredItems, optionalItems, retentionPeriod, thirdPartyEnabled, thirdPartyRecipients, refusalConsequence, subjectType, studentGrade, studentClass, studentNumber, studentName, guardianName, collectionConsent, thirdPartyConsent, signatureDate, recipient, schoolName]);

  const getTitle = useCallback(() => `${title || "개인정보동의서"} - ${studentName || ""}`, [title, studentName]);

  const getContent = useCallback(() => {
    return JSON.stringify(getFormData());
  }, [getFormData]);

  const handleLoadDocument = useCallback((data: Record<string, unknown>) => {
    if (data.title) setTitle(data.title as string);
    if (data.subtitle) setSubtitle(data.subtitle as string);
    if (data.description) setDescription(data.description as string);
    if (data.collectionPurpose) setCollectionPurpose(data.collectionPurpose as string);
    if (data.requiredItems) setRequiredItems(data.requiredItems as CollectionItem[]);
    if (data.optionalItems) setOptionalItems(data.optionalItems as CollectionItem[]);
    if (data.retentionPeriod) setRetentionPeriod(data.retentionPeriod as string);
    if (data.thirdPartyEnabled !== undefined) setThirdPartyEnabled(data.thirdPartyEnabled as boolean);
    if (data.thirdPartyRecipients) setThirdPartyRecipients(data.thirdPartyRecipients as ThirdPartyRecipient[]);
    if (data.refusalConsequence) setRefusalConsequence(data.refusalConsequence as string);
    if (data.subjectType) setSubjectType(data.subjectType as "student" | "student_parent" | "general");
    if (data.studentGrade) setStudentGrade(data.studentGrade as string);
    if (data.studentClass) setStudentClass(data.studentClass as string);
    if (data.studentNumber) setStudentNumber(data.studentNumber as string);
    if (data.studentName) setStudentName(data.studentName as string);
    if (data.guardianName) setGuardianName(data.guardianName as string);
    if (data.collectionConsent !== undefined) setCollectionConsent(data.collectionConsent as boolean);
    if (data.thirdPartyConsent !== undefined) setThirdPartyConsent(data.thirdPartyConsent as boolean);
    if (data.signatureDate) setSignatureDate(data.signatureDate as string);
    if (data.recipient) setRecipient(data.recipient as string);
  }, []);

  const {
    isSaving,
    lastSavedAt,
    saveError,
    saveDocument,
    triggerAutoSave,
  } = useDocumentSave({
    documentType: "개인정보동의서",
    getFormData,
    getTitle,
    getContent,
    onLoadDocument: handleLoadDocument,
  });

  // 폼 변경 시 자동 저장 트리거
  useEffect(() => {
    triggerAutoSave();
  }, [title, subtitle, description, collectionPurpose, requiredItems, optionalItems, retentionPeriod, thirdPartyEnabled, thirdPartyRecipients, refusalConsequence, subjectType, studentGrade, studentClass, studentNumber, studentName, guardianName, collectionConsent, thirdPartyConsent, signatureDate, recipient, triggerAutoSave]);

  const getFormContext = () => ({
    title,
    subtitle,
    description,
    collectionPurpose,
    requiredItems: requiredItems.map((item) => item.name).join(", "),
    optionalItems: optionalItems.map((item) => item.name).join(", "),
    retentionPeriod,
    thirdPartyEnabled,
    thirdPartyRecipients,
    refusalConsequence,
    subjectType,
    studentGrade,
    studentClass,
    studentNumber,
    studentName,
    guardianName,
    signatureDate,
    recipient,
    schoolName,
  });

  const applyGeneratedField = (fieldName: string, generatedContent: string) => {
    if (fieldName === "collectionPurpose") {
      setCollectionPurpose(generatedContent);
      return true;
    }
    if (fieldName === "refusalConsequence") {
      setRefusalConsequence(generatedContent);
      return true;
    }
    if (fieldName === "description") {
      setDescription(generatedContent);
      return true;
    }
    return false;
  };

  const generateFieldMutation = useMutation({
    mutationFn: async ({ fieldName, fieldLabel }: { fieldName: string; fieldLabel: string }) => {
      setGeneratingField(fieldName);
      const response = await apiRequest("POST", "/api/documents/generate-field", {
        documentType: "개인정보 동의서",
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
        documentType: "개인정보 동의서",
        fieldName: "allFields",
        fieldLabel: "전체 필드",
        context: getFormContext(),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const generatedContent = String(data.generatedContent || "").trim();
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
      if (data.title) setTitle(data.title);
      if (data.subtitle) setSubtitle(data.subtitle);
      if (data.description) setDescription(data.description);
      if (data.collectionPurpose) setCollectionPurpose(data.collectionPurpose);
      if (data.retentionPeriod) setRetentionPeriod(data.retentionPeriod);
      if (data.refusalConsequence) setRefusalConsequence(data.refusalConsequence);
      if (data.studentGrade) setStudentGrade(data.studentGrade);
      if (data.studentClass) setStudentClass(data.studentClass);
      if (data.studentNumber) setStudentNumber(data.studentNumber);
      if (data.studentName) setStudentName(data.studentName);
      if (data.guardianName) setGuardianName(data.guardianName);
      if (data.recipient) setRecipient(data.recipient);

      // 필드 누락 체크
      const requiredFields = ["title", "collectionPurpose", "retentionPeriod", "refusalConsequence"];
      const missingFields = requiredFields.filter(
        (f) => !data[f] || String(data[f]).trim() === ""
      );

      if (missingFields.length > 0) {
        toast({
          title: "일부 항목 누락",
          description: `${missingFields.length}개 항목 누락: ${missingFields.join(", ")}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "AI 전부 생성 완료",
          description: "모든 항목이 생성되었습니다. 필요시 수정해주세요.",
        });
      }
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
    setTitle("");
    setSubtitle("");
    setDescription("");
    setCollectionPurpose("");
    setRequiredItems([
      { id: "1", name: "성명", type: "text" },
      { id: "2", name: "연락처", type: "phone" },
    ]);
    setOptionalItems([]);
    setRetentionPeriod("");
    setThirdPartyEnabled(false);
    setThirdPartyRecipients([]);
    setRefusalConsequence("");
    setSubjectType("student_parent");
    setStudentGrade("");
    setStudentClass("");
    setStudentNumber("");
    setStudentName("");
    setGuardianName("");
    setCollectionConsent(false);
    setThirdPartyConsent(false);
    setSignatureDate("");
    setRecipient("");
    toast({ title: "초기화 완료", description: "모든 입력 내용이 초기화되었습니다." });
  };

  // 수집 항목 관리
  const handleAddRequiredItem = () => {
    setRequiredItems((prev) => [...prev, createCollectionItem()]);
  };
  const handleRemoveRequiredItem = (id: string) => {
    setRequiredItems((prev) => prev.filter((item) => item.id !== id));
  };
  const handleUpdateRequiredItem = (id: string, name: string) => {
    setRequiredItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name } : item))
    );
  };

  const handleAddOptionalItem = () => {
    setOptionalItems((prev) => [...prev, createCollectionItem()]);
  };
  const handleRemoveOptionalItem = (id: string) => {
    setOptionalItems((prev) => prev.filter((item) => item.id !== id));
  };
  const handleUpdateOptionalItem = (id: string, name: string) => {
    setOptionalItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name } : item))
    );
  };

  // 제3자 제공 관리
  const handleAddThirdParty = () => {
    setThirdPartyRecipients((prev) => [...prev, createThirdPartyRecipient()]);
  };
  const handleRemoveThirdParty = (id: string) => {
    setThirdPartyRecipients((prev) => prev.filter((r) => r.id !== id));
  };
  const handleUpdateThirdParty = (id: string, field: keyof ThirdPartyRecipient, value: string) => {
    setThirdPartyRecipients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
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
        documentTitle="개인정보 동의서"
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
                <h1 className="text-lg font-semibold text-foreground">개인정보 동의서 작성</h1>
                <p className="text-sm text-muted-foreground">필요한 정보를 입력하면 AI가 항목을 작성합니다</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <AutoSaveIndicator
                lastSavedAt={lastSavedAt}
                isSaving={isSaving}
                error={saveError}
              />
              <DocumentSaveButton
                onClick={() => saveDocument("completed")}
                isSaving={isSaving}
                variant="header"
              />
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">PDF 다운로드</Button>
            </div>
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
              <CardTitle>개인정보 동의서 정보 입력</CardTitle>
              <CardDescription>입력한 내용으로 AI가 항목을 생성합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* 동의서 정보 */}
              <section ref={setSectionRef("section-header")} className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground">동의서 정보</h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">동의서 제목 <span className="text-red-500">*</span></span>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="예: 개인정보 수집·이용 동의서"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">부제목/용도</span>
                    <Input
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      placeholder="예: 학교폭력 전담기구 학부모위원 위촉용"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">안내문</span>
                      <AIStyledButton
                        onClick={() => generateFieldMutation.mutate({ fieldName: "description", fieldLabel: "안내문" })}
                        disabled={generatingField === "description" || isGeneratingAll}
                        isLoading={generatingField === "description"}
                      />
                    </div>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="예: 본교에서는 아래와 같이 개인정보를 수집·이용하고자 합니다. 내용을 읽으신 후 동의 여부를 결정하여 주시기 바랍니다."
                      className="min-h-[80px]"
                    />
                  </div>
                </div>
              </section>

              <div className="h-px bg-border" />

              {/* 수집·이용 내역 */}
              <section ref={setSectionRef("section-collection")} className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground">개인정보 수집·이용 내역</h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">수집 목적 <span className="text-red-500">*</span></span>
                      <AIStyledButton
                        onClick={() => generateFieldMutation.mutate({ fieldName: "collectionPurpose", fieldLabel: "수집 목적" })}
                        disabled={generatingField === "collectionPurpose" || isGeneratingAll}
                        isLoading={generatingField === "collectionPurpose"}
                      />
                    </div>
                    <Textarea
                      value={collectionPurpose}
                      onChange={(e) => setCollectionPurpose(e.target.value)}
                      placeholder="예: 학교폭력 전담기구 학부모 구성원 위촉 및 운영"
                      className="min-h-[80px]"
                    />
                  </div>

                  {/* 필수 수집 항목 */}
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">필수 수집 항목</span>
                    <div className="space-y-2">
                      {requiredItems.map((item) => (
                        <div key={item.id} className="flex gap-2 items-center">
                          <Input
                            value={item.name}
                            onChange={(e) => handleUpdateRequiredItem(item.id, e.target.value)}
                            placeholder="항목명 (예: 성명)"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveRequiredItem(item.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={handleAddRequiredItem}>
                        <Plus className="w-4 h-4 mr-1" /> 필수 항목 추가
                      </Button>
                    </div>
                  </div>

                  {/* 선택 수집 항목 */}
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">선택 수집 항목</span>
                    <div className="space-y-2">
                      {optionalItems.map((item) => (
                        <div key={item.id} className="flex gap-2 items-center">
                          <Input
                            value={item.name}
                            onChange={(e) => handleUpdateOptionalItem(item.id, e.target.value)}
                            placeholder="항목명 (예: 이메일)"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveOptionalItem(item.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={handleAddOptionalItem}>
                        <Plus className="w-4 h-4 mr-1" /> 선택 항목 추가
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">보유 기간 <span className="text-red-500">*</span></span>
                    <Input
                      value={retentionPeriod}
                      onChange={(e) => setRetentionPeriod(e.target.value)}
                      placeholder="예: 재학 기간, 1년, 목적 달성 시까지"
                    />
                  </div>
                </div>
              </section>

              <div className="h-px bg-border" />

              {/* 제3자 제공 */}
              <section ref={setSectionRef("section-third-party")} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">개인정보 제3자 제공</h2>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="thirdPartyEnabled"
                      checked={thirdPartyEnabled}
                      onCheckedChange={(checked) => setThirdPartyEnabled(!!checked)}
                    />
                    <Label htmlFor="thirdPartyEnabled" className="text-sm text-muted-foreground">포함</Label>
                  </div>
                </div>
                {thirdPartyEnabled && (
                  <div className="space-y-4">
                    {thirdPartyRecipients.map((recipient) => (
                      <div key={recipient.id} className="rounded-lg border p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">제공받는 자</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveThirdParty(recipient.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <Input
                            value={recipient.name}
                            onChange={(e) => handleUpdateThirdParty(recipient.id, "name", e.target.value)}
                            placeholder="제공받는 자 (예: 앨범제작 업체)"
                          />
                          <Input
                            value={recipient.purpose}
                            onChange={(e) => handleUpdateThirdParty(recipient.id, "purpose", e.target.value)}
                            placeholder="제공 목적 (예: 졸업 앨범 제작)"
                          />
                          <Input
                            value={recipient.items}
                            onChange={(e) => handleUpdateThirdParty(recipient.id, "items", e.target.value)}
                            placeholder="제공 항목 (예: 성명, 사진)"
                          />
                          <Input
                            value={recipient.retentionPeriod}
                            onChange={(e) => handleUpdateThirdParty(recipient.id, "retentionPeriod", e.target.value)}
                            placeholder="보유 기간 (예: 제작 후 납품 시까지)"
                          />
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={handleAddThirdParty}>
                      <Plus className="w-4 h-4 mr-1" /> 제공받는 자 추가
                    </Button>
                  </div>
                )}
              </section>

              <div className="h-px bg-border" />

              {/* 거부 권리 안내 */}
              <section ref={setSectionRef("section-refusal")} className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground">동의 거부 권리 안내</h2>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                  위의 개인정보 수집·이용에 대한 동의를 거부할 수 있습니다.
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">거부 시 불이익 <span className="text-red-500">*</span></span>
                    <AIStyledButton
                      onClick={() => generateFieldMutation.mutate({ fieldName: "refusalConsequence", fieldLabel: "거부 시 불이익" })}
                      disabled={generatingField === "refusalConsequence" || isGeneratingAll}
                      isLoading={generatingField === "refusalConsequence"}
                    />
                  </div>
                  <Textarea
                    value={refusalConsequence}
                    onChange={(e) => setRefusalConsequence(e.target.value)}
                    placeholder="예: 동의하지 않을 경우 해당 서비스 이용에 제한을 받을 수 있습니다."
                    className="min-h-[80px]"
                  />
                </div>
              </section>

              <div className="h-px bg-border" />

              {/* 동의 대상자 정보 */}
              <section ref={setSectionRef("section-subject")} className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground">동의 대상자 정보</h2>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="student_parent"
                        name="subjectType"
                        checked={subjectType === "student_parent"}
                        onChange={() => setSubjectType("student_parent")}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="student_parent" className="text-sm">학생 + 보호자</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="student"
                        name="subjectType"
                        checked={subjectType === "student"}
                        onChange={() => setSubjectType("student")}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="student" className="text-sm">학생만</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="general"
                        name="subjectType"
                        checked={subjectType === "general"}
                        onChange={() => setSubjectType("general")}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="general" className="text-sm">일반인</Label>
                    </div>
                  </div>

                  {(subjectType === "student" || subjectType === "student_parent") && (
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="space-y-2">
                        <span className="text-sm text-muted-foreground">학년</span>
                        <Input
                          value={studentGrade}
                          onChange={(e) => setStudentGrade(e.target.value)}
                          placeholder="3"
                        />
                      </div>
                      <div className="space-y-2">
                        <span className="text-sm text-muted-foreground">반</span>
                        <Input
                          value={studentClass}
                          onChange={(e) => setStudentClass(e.target.value)}
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
                        <span className="text-sm text-muted-foreground">학생 성명</span>
                        <Input
                          value={studentName}
                          onChange={(e) => setStudentName(e.target.value)}
                          placeholder="홍길동"
                        />
                      </div>
                    </div>
                  )}

                  {subjectType === "student_parent" && (
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">보호자 성명</span>
                      <Input
                        value={guardianName}
                        onChange={(e) => setGuardianName(e.target.value)}
                        placeholder="홍부모"
                      />
                    </div>
                  )}

                  {subjectType === "general" && (
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">성명</span>
                      <Input
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="홍길동"
                      />
                    </div>
                  )}
                </div>
              </section>

              <div className="h-px bg-border" />

              {/* 동의 체크 */}
              <section ref={setSectionRef("section-consent")} className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground">동의 의사 표시</h2>
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">개인정보 수집·이용 동의</span>
                      <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded">필수</span>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Checkbox
                        id="collectionConsent"
                        checked={collectionConsent}
                        onCheckedChange={(checked) => setCollectionConsent(!!checked)}
                      />
                      <Label htmlFor="collectionConsent" className="text-sm">개인정보 수집·이용에 동의합니다</Label>
                    </div>
                  </div>

                  {thirdPartyEnabled && (
                    <div className="rounded-lg bg-muted/40 p-4 space-y-3">
                      <span className="font-medium text-sm">개인정보 제3자 제공 동의</span>
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Checkbox
                          id="thirdPartyConsent"
                          checked={thirdPartyConsent}
                          onCheckedChange={(checked) => setThirdPartyConsent(!!checked)}
                        />
                        <Label htmlFor="thirdPartyConsent" className="text-sm">개인정보 제3자 제공에 동의합니다</Label>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <div className="h-px bg-border" />

              {/* 서명 */}
              <section ref={setSectionRef("section-signature")} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <span className="text-sm font-semibold text-foreground">작성 날짜</span>
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
                    placeholder={`예: ${schoolName}장 귀하`}
                  />
                </div>
              </section>

              {/* 하단 버튼 */}
              <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => setIsPreviewOpen(true)}>
                  <Eye className="w-4 h-4 mr-2" />
                  미리보기
                </Button>
                <DocumentSaveButton
                  onClick={() => saveDocument("completed")}
                  isSaving={isSaving}
                  variant="footer"
                />
                <button
                  type="button"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-blue-500 text-white font-medium rounded-lg shadow-md hover:shadow-lg hover:from-violet-600 hover:to-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => generateAllMutation.mutate()}
                  disabled={generateAllMutation.isPending || isGeneratingAll}
                >
                  {generateAllMutation.isPending || isGeneratingAll ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      AI 전부 생성 중...
                    </>
                  ) : (
                    <>
                      <SparkleIcon />
                      AI 전부 생성
                    </>
                  )}
                </button>
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
                <h1 className="text-xl font-bold">{title || "개인정보 수집·이용 동의서"}</h1>
                {subtitle && <p className="text-base mt-2 text-muted-foreground">({subtitle})</p>}
              </div>

              {description && (
                <p className="text-sm leading-relaxed">{description}</p>
              )}

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="bg-slate-50">
                      <td className="border-b border-r px-4 py-2 font-medium w-32">수집 목적</td>
                      <td className="border-b px-4 py-2">{collectionPurpose || "-"}</td>
                    </tr>
                    <tr>
                      <td className="border-b border-r px-4 py-2 font-medium bg-slate-50">필수 항목</td>
                      <td className="border-b px-4 py-2">{requiredItems.map((i) => i.name).filter(Boolean).join(", ") || "-"}</td>
                    </tr>
                    {optionalItems.length > 0 && (
                      <tr>
                        <td className="border-b border-r px-4 py-2 font-medium bg-slate-50">선택 항목</td>
                        <td className="border-b px-4 py-2">{optionalItems.map((i) => i.name).filter(Boolean).join(", ")}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="border-r px-4 py-2 font-medium bg-slate-50">보유 기간</td>
                      <td className="px-4 py-2">{retentionPeriod || "-"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {thirdPartyEnabled && thirdPartyRecipients.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">개인정보 제3자 제공</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="border-b border-r px-3 py-2 text-left">제공받는 자</th>
                          <th className="border-b border-r px-3 py-2 text-left">제공 목적</th>
                          <th className="border-b border-r px-3 py-2 text-left">제공 항목</th>
                          <th className="border-b px-3 py-2 text-left">보유 기간</th>
                        </tr>
                      </thead>
                      <tbody>
                        {thirdPartyRecipients.map((r) => (
                          <tr key={r.id}>
                            <td className="border-r px-3 py-2">{r.name || "-"}</td>
                            <td className="border-r px-3 py-2">{r.purpose || "-"}</td>
                            <td className="border-r px-3 py-2">{r.items || "-"}</td>
                            <td className="px-3 py-2">{r.retentionPeriod || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
                <p className="font-medium mb-1">동의 거부 권리 안내</p>
                <p>위의 개인정보 수집·이용에 대한 동의를 거부할 수 있습니다.</p>
                {refusalConsequence && <p className="mt-1">{refusalConsequence}</p>}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-slate-400 rounded flex items-center justify-center">
                    {collectionConsent && <span className="text-xs">✓</span>}
                  </div>
                  <span className="text-sm">개인정보 수집·이용에 동의합니다</span>
                </div>
                {thirdPartyEnabled && (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-slate-400 rounded flex items-center justify-center">
                      {thirdPartyConsent && <span className="text-xs">✓</span>}
                    </div>
                    <span className="text-sm">개인정보 제3자 제공에 동의합니다</span>
                  </div>
                )}
              </div>

              <div className="text-center pt-6 border-t">
                <p className="mb-4">{signatureDate}</p>
                {(subjectType === "student" || subjectType === "student_parent") && (
                  <p className="mb-2">
                    {studentGrade && `${studentGrade}학년 `}
                    {studentClass && `${studentClass}반 `}
                    {studentNumber && `${studentNumber}번 `}
                    학생: {studentName || "___________"} (인)
                  </p>
                )}
                {subjectType === "student_parent" && (
                  <p className="mb-4">보호자: {guardianName || "___________"} (인)</p>
                )}
                {subjectType === "general" && (
                  <p className="mb-4">성명: {studentName || "___________"} (인)</p>
                )}
                <p className="font-medium mt-6">{recipient || `${schoolName}장 귀하`}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
