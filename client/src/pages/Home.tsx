import { Link, useLocation, useSearch } from "wouter";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FileText, Briefcase, Sparkles, Clock, CheckCircle2, Settings, LogIn, LogOut, User, Upload, ClipboardList, MapPin, Shield, CalendarDays, Scale, Users, Coins, MessageSquare, Wrench, Paperclip, Send } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const documentTypes = [
  {
    id: "parent-letter",
    title: "가정통신문",
    description: "학부모님께 전달하는 공식 안내문을 AI가 전문적으로 작성합니다.",
    icon: FileText,
    href: "/create/parent-letter",
    examples: ["겨울방학 안전 안내", "학교 행사 참가 안내", "학급 운영 안내"],
    category: "행정업무",
    levels: ["초등학교", "중학교", "고등학교"],
  },
  {
    id: "parent-meeting",
    title: "학부모총회 안내",
    description: "학기 초 학부모총회 안내문을 전문적으로 작성합니다.",
    icon: Users,
    href: "/create/parent-meeting",
    examples: ["정기/임시총회 지원", "안건별 상세 작성", "참석 안내 자동 생성"],
    category: "행정업무",
    levels: ["초등학교", "중학교", "고등학교"],
  },
  {
    id: "budget-disclosure",
    title: "예산/결산 공개 자료",
    description: "학교 예산 및 결산 공개 설명 자료를 전문적으로 작성합니다.",
    icon: Coins,
    href: "/create/budget-disclosure",
    examples: ["예산/결산 구분 지원", "재원별 자동 계산", "인포그래픽 생성"],
    category: "행정업무",
    levels: ["초등학교", "중학교", "고등학교"],
  },
  {
    id: "education-plan",
    title: "외부 교육 용역 계획서",
    description: "비즈쿨, 창업교육 등 외부 교육 프로그램 계획서를 체계적으로 작성합니다.",
    icon: Briefcase,
    href: "/create/education-plan",
    examples: ["창업 체험 프로그램", "진로 탐색 교육", "코딩 교육 프로그램"],
    category: "행정업무",
    levels: ["중학교", "고등학교"],
  },
  {
    id: "after-school-plan",
    title: "방과후학교 운영계획서",
    description: "방과후학교 운영 정보를 단계별로 입력해 계획서를 자동 생성합니다.",
    icon: ClipboardList,
    href: "/create/after-school-plan",
    examples: ["기본 운영 정보", "프로그램 운영표", "안전 관리 계획"],
    category: "행정업무",
    levels: ["초등학교", "중학교"],
  },
  {
    id: "care-plan",
    title: "초등돌봄교실 운영계획서",
    description: "돌봄교실 운영 정보를 입력하고 AI로 서술형 항목을 자동 생성합니다.",
    icon: ClipboardList,
    href: "/create/care-plan",
    examples: ["운영 목표/방침", "프로그램 운영", "안전 및 급식 관리"],
    category: "행정업무",
    levels: ["초등학교"],
  },
  {
    id: "field-trip-plan",
    title: "현장체험학습 운영계획서",
    description: "체험학습 운영 정보를 단계별로 입력해 계획서를 자동 생성합니다.",
    icon: MapPin,
    href: "/create/field-trip-plan",
    examples: ["교육 목표 및 일정", "안전 관리 계획", "이동 및 활동 계획"],
    category: "행정업무",
    levels: ["초등학교", "중학교", "고등학교"],
  },
  {
    id: "safety-education-plan",
    title: "학교 안전교육 계획서",
    description: "7대 안전교육을 포함한 연간/학기별 안전교육 계획서를 자동 생성합니다.",
    icon: Shield,
    href: "/create/safety-education-plan",
    examples: ["7대 안전교육 영역별 계획", "법정 시수 자동 검증", "월별 실행 계획"],
    category: "행정업무",
    levels: ["초등학교", "중학교", "고등학교"],
  },
  {
    id: "bullying-prevention-plan",
    title: "학교폭력 예방 교육 계획서",
    description: "학교폭력 예방을 위한 체계적인 교육 계획서를 자동 생성합니다.",
    icon: Scale,
    href: "/create/bullying-prevention-plan",
    examples: ["학생·교직원·학부모 교육 계획", "법정 요건 자동 검증", "상담 및 신고 체계 구축"],
    category: "행정업무",
    levels: ["초등학교", "중학교", "고등학교"],
  },
  {
    id: "event-plan",
    title: "교내 행사 운영계획서",
    description: "체육대회, 축제, 졸업식 등 다양한 교내 행사 계획서를 자동 생성합니다.",
    icon: CalendarDays,
    href: "/create/event-plan",
    examples: ["6가지 행사 유형 지원", "안전 관리 체계 수립", "예산 자동 계산"],
    category: "행정업무",
    levels: ["초등학교", "중학교", "고등학교"],
  },
  {
    id: "template-form",
    title: "HWP 양식으로 작성",
    description: "기존 HWP 양식을 업로드하면 자동으로 입력 항목을 만들어 드립니다.",
    icon: Upload,
    href: "/create/template",
    examples: ["기존 가정통신문 양식", "학교 공문 양식", "교육청 서식"],
    category: "기타",
    levels: ["초등학교", "중학교", "고등학교"],
  },
];

const CATEGORY_OPTIONS = ["전체", "수업/평가", "생활기록", "상담업무", "행정업무", "기타"] as const;
const LEVEL_OPTIONS = ["전체", "초등학교", "중학교", "고등학교"] as const;

const features = [
  {
    icon: Sparkles,
    title: "AI 기반 자동 작성",
    description: "Claude AI가 전문적인 공문서 양식에 맞춰 문서를 자동 생성합니다.",
  },
  {
    icon: Clock,
    title: "시간 80% 절약",
    description: "평균 2시간 걸리던 문서 작성을 20분 이내로 단축합니다.",
  },
  {
    icon: CheckCircle2,
    title: "전문적인 품질",
    description: "격식 있는 어투와 체계적인 구조로 신뢰감 있는 문서를 만들어 드립니다.",
  },
];

export default function Home() {
  const { user, isLoading, isAuthenticated, logout, isLoggingOut } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<(typeof CATEGORY_OPTIONS)[number]>("전체");
  const [selectedLevel, setSelectedLevel] = useState<(typeof LEVEL_OPTIONS)[number]>("전체");
  const [activeSection, setActiveSection] = useState<"chat" | "tools">("chat");
  const [chatInput, setChatInput] = useState("");
  const [homeChatId, setHomeChatId] = useState<string | null>(null);
  const [homeMessages, setHomeMessages] = useState<Array<{ role: "user" | "assistant"; content: string; id: string }>>([]);
  const [isSending, setIsSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth > 768;
  });
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredDocuments = useMemo(() => {
    return documentTypes.filter((doc) => {
      const categoryMatch = selectedCategory === "전체" || doc.category === selectedCategory;
      const levelMatch = selectedLevel === "전체" || doc.levels.includes(selectedLevel);
      return categoryMatch && levelMatch;
    });
  }, [selectedCategory, selectedLevel]);

  const quickPrompts = [
    "방과후학교 가정통신문",
    "학사일정 공지사항",
    "학부모 상담 기록",
    "현장체험학습 계획서",
  ];

  useEffect(() => {
    const params = new URLSearchParams(search);
    const tab = params.get("tab");
    if (tab === "tools" || tab === "chat") {
      setActiveSection(tab);
      return;
    }
    if (typeof window === "undefined") return;
    const saved = window.sessionStorage.getItem("home.activeSection");
    if (saved === "tools" || saved === "chat") {
      setActiveSection(saved);
    }
  }, [search]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem("home.activeSection", activeSection);
  }, [activeSection]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 768px)");
    const handleChange = () => {
      setSidebarOpen(!media.matches);
    };

    handleChange();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  const showCharCount = chatInput.length >= 9000;

  const handleSendMessage = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    if (!isAuthenticated) {
      toast({
        title: "로그인이 필요합니다",
        description: "AI 대화를 이용하려면 로그인해주세요.",
        variant: "destructive",
      });
      setLocation("/login");
      return;
    }

    setIsSending(true);
    try {
      let chatId = homeChatId;
      if (!chatId) {
        const chatResponse = await apiRequest("POST", "/api/chats", {});
        const chatResult = await chatResponse.json();
        chatId = chatResult?.data?.chatId;
        if (!chatId) {
          throw new Error("대화를 생성할 수 없습니다.");
        }
        setHomeChatId(chatId);
      }

      const messageResponse = await apiRequest("POST", `/api/chats/${chatId}/messages`, {
        content: trimmed,
      });
      const messageResult = await messageResponse.json();
      const userMessage = messageResult?.data?.userMessage;
      const assistantMessage = messageResult?.data?.assistantMessage;

      setHomeMessages((prev) => [
        ...prev,
        { role: "user", content: userMessage?.content || trimmed, id: userMessage?.messageId || `${Date.now()}-u` },
        { role: "assistant", content: assistantMessage?.content || "응답을 생성하지 못했습니다.", id: assistantMessage?.messageId || `${Date.now()}-a` },
      ]);
      setChatInput("");
    } catch (error) {
      toast({
        title: "메시지 전송 실패",
        description: error instanceof Error ? error.message : "메시지 전송에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleChatKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setAttachedFiles(files);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/login");
    } catch (error) {
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "로그아웃에 실패했습니다",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="font-semibold text-lg">티처메이트</span>
          </Link>
          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="h-9 w-24 bg-muted animate-pulse rounded-md" />
            ) : isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2" data-testid="button-user-menu">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user.profileImageUrl || undefined} alt={user.name || "사용자"} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm">
                      {user.name || user.email || "사용자"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">내 프로필</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/mypage">마이페이지</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      handleLogout();
                    }}
                    disabled={isLoggingOut}
                    className="flex items-center gap-2 text-destructive"
                    data-testid="button-logout"
                  >
                    <LogOut className="h-4 w-4" />
                    로그아웃
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild data-testid="button-login">
                <Link href="/login" className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  로그인
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-64px)]">
        <aside
          className={`border-r bg-background transition-all duration-200 relative ${
            sidebarOpen ? "w-[240px]" : "w-[72px]"
          }`}
        >
          <button
            className="absolute -right-3 top-6 h-7 w-7 rounded-full border bg-background shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-label={sidebarOpen ? "사이드바 접기" : "사이드바 펼치기"}
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>
          <div className="px-3 py-6 space-y-2">
            <button
              className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeSection === "chat" ? "bg-primary/10 text-primary" : "hover:bg-muted"
              }`}
              onClick={() => setActiveSection("chat")}
              aria-label="새 대화"
            >
              <MessageSquare className="h-4 w-4" />
              {sidebarOpen && <span>새 대화</span>}
            </button>
            <button
              className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeSection === "tools" ? "bg-primary/10 text-primary" : "hover:bg-muted"
              }`}
              onClick={() => setActiveSection("tools")}
              aria-label="문서 도구"
            >
              <Wrench className="h-4 w-4" />
              {sidebarOpen && <span>문서 도구</span>}
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col">
          {activeSection === "chat" ? (
            <>
              <div className="flex-1 overflow-y-auto">
                {homeMessages.length === 0 ? (
                  <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-6">
                    <div className="w-full max-w-2xl space-y-6">
                      <div className="text-center space-y-3">
                        <h1 className="text-4xl md:text-5xl font-semibold">
                          {user?.name ? `${user.name} 선생님,` : "안녕하세요,"}
                        </h1>
                        <p className="text-lg md:text-xl text-muted-foreground">무엇을 도와드릴까요?</p>
                      </div>
                      <div className="flex items-end gap-4 rounded-3xl border bg-background px-6 py-5 shadow-sm">
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <div className="flex-1">
                          <Textarea
                            value={chatInput}
                            onChange={(event) => setChatInput(event.target.value)}
                            onKeyDown={handleChatKeyDown}
                            placeholder="무엇을 도와드릴까요?"
                            rows={2}
                            className="resize-none border-0 focus-visible:ring-0 text-center text-base min-h-[96px]"
                            maxLength={10000}
                          />
                          {showCharCount && (
                            <div className={`text-xs mt-1 text-right ${chatInput.length > 10000 ? "text-destructive" : "text-muted-foreground"}`}>
                              {chatInput.length} / 10,000
                            </div>
                          )}
                        </div>
                        <Button
                          onClick={handleSendMessage}
                          disabled={isSending || !chatInput.trim()}
                          className="rounded-full"
                        >
                          {isSending ? <span className="text-xs">전송중</span> : <Send className="h-4 w-4" />}
                        </Button>
                      </div>
                      {attachedFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2 justify-center text-sm text-muted-foreground">
                          {attachedFiles.map((file) => (
                            <span key={file.name} className="rounded-full border px-3 py-1">
                              {file.name}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 justify-center">
                        {quickPrompts.map((prompt) => (
                          <button
                            key={prompt}
                            className="rounded-full border px-3 py-1 text-sm text-primary hover:bg-primary/10"
                            onClick={() => setChatInput(prompt)}
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="max-w-3xl mx-auto px-6 py-12 space-y-4">
                      {homeMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                              message.role === "user"
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-background border rounded-bl-md"
                            }`}
                          >
                            <div className="whitespace-pre-line">{message.content}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t bg-background px-6 py-6">
                      <div className="mx-auto max-w-3xl">
                        <div className="flex items-end gap-4 rounded-3xl border bg-background px-6 py-5 shadow-sm">
                          <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Paperclip className="h-4 w-4" />
                          </Button>
                          <div className="flex-1">
                            <Textarea
                              value={chatInput}
                              onChange={(event) => setChatInput(event.target.value)}
                              onKeyDown={handleChatKeyDown}
                              placeholder="무엇을 도와드릴까요?"
                              rows={2}
                              className="resize-none border-0 focus-visible:ring-0 text-base min-h-[96px]"
                              maxLength={10000}
                            />
                          </div>
                          <Button
                            onClick={handleSendMessage}
                            disabled={isSending || !chatInput.trim()}
                            className="rounded-full"
                          >
                            {isSending ? <span className="text-xs">전송중</span> : <Send className="h-4 w-4" />}
                          </Button>
                        </div>
                        {attachedFiles.length > 0 && (
                          <div className="flex flex-wrap gap-2 justify-center mt-3 text-sm text-muted-foreground">
                            {attachedFiles.map((file) => (
                              <span key={file.name} className="rounded-full border px-3 py-1">
                                {file.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
                <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-24 min-h-[340px] flex items-center">
                  <div className="text-center max-w-3xl mx-auto w-full">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                      <Sparkles className="w-4 h-4" />
                      AI 기반 문서 자동화
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground mb-6">
                      학교 문서 작성,
                      <br />
                      <span className="text-primary">AI가 대신해 드립니다</span>
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
                      가정통신문, 외부 교육 용역 계획서 등 학교 행정 문서를
                      <br className="hidden md:block" />
                      AI가 전문적으로 작성해 드립니다.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center" />
                  </div>
                </div>
              </section>

              <section className="max-w-6xl mx-auto px-6 py-16">
                <div className="mb-8 space-y-4">
                  <h2 className="text-2xl font-semibold text-foreground">문서 유형</h2>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <div className="flex flex-wrap gap-2">
                      {CATEGORY_OPTIONS.map((category) => (
                        <Button
                          key={category}
                          type="button"
                          variant={selectedCategory === category ? "secondary" : "outline"}
                          size="sm"
                          onClick={() => setSelectedCategory(category)}
                        >
                          {category}
                        </Button>
                      ))}
                    </div>
                    <span className="text-muted-foreground">|</span>
                    <div className="flex flex-wrap gap-2">
                      {LEVEL_OPTIONS.map((level) => (
                        <Button
                          key={level}
                          type="button"
                          variant={selectedLevel === level ? "secondary" : "outline"}
                          size="sm"
                          onClick={() => setSelectedLevel(level)}
                        >
                          {level}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDocuments.map((doc) => {
                    const IconComponent = doc.icon;
                    return (
                      <Link key={doc.id} href={doc.href}>
                        <Card
                          className="h-full hover-elevate active-elevate-2 cursor-pointer transition-all duration-200 border-border"
                          data-testid={`card-${doc.id}`}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                <IconComponent className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <CardTitle className="text-base mb-1">{doc.title}</CardTitle>
                                <CardDescription className="text-sm leading-relaxed line-clamp-2">
                                  {doc.description}
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex flex-wrap gap-2">
                              {doc.examples.slice(0, 2).map((example, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground"
                                >
                                  {example}
                                </span>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </section>

              <section className="bg-muted/30 py-16">
                <div className="max-w-6xl mx-auto px-6">
                  <div className="text-center mb-12">
                    <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
                    왜 티처메이트인가요?
                    </h2>
                  </div>

                  <div className="grid md:grid-cols-3 gap-8">
                    {features.map((feature, idx) => {
                      const IconComponent = feature.icon;
                      return (
                        <div key={idx} className="text-center">
                          <div className="inline-flex p-4 rounded-xl bg-background border border-border mb-4">
                            <IconComponent className="w-8 h-8 text-primary" />
                          </div>
                          <h3 className="text-lg font-semibold text-foreground mb-2">
                            {feature.title}
                          </h3>
                          <p className="text-muted-foreground leading-relaxed">
                            {feature.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              <footer className="border-t border-border py-8">
                <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground">티처메이트 MVP - 학교 문서 행정 AI 자동화 서비스</p>
                  <Link href="/admin">
                    <Button variant="ghost" size="sm" data-testid="button-admin">
                      <Settings className="w-4 h-4 mr-2" />
                      관리자
                    </Button>
                  </Link>
                </div>
              </footer>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
