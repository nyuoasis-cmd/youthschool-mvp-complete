import { Link, useLocation, useSearch } from "wouter";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FileText, Sparkles, Clock, CheckCircle2, Settings, LogIn, LogOut, User, ClipboardList, MessageSquare, Wrench, Paperclip, MoreHorizontal, BookOpen, ClipboardCheck, Loader2, Shield } from "lucide-react";

// 화살표 아이콘 (전송 가능)
const ArrowUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5"/>
    <polyline points="5 12 12 5 19 12"/>
  </svg>
);

// 타이핑 인디케이터
const TypingIndicator = () => (
  <div className="flex items-center gap-1 px-4 py-3">
    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
    <span className="text-sm text-gray-400 ml-2">티처메이트가 답변을 작성하고 있어요</span>
  </div>
);
import { useAuth } from "@/hooks/use-auth";

const documentTypes = [
  {
    id: "meal-notice",
    title: "급식안내문",
    description: "월별 학교급식 안내문을 AI로 빠르게 작성합니다.",
    icon: FileText,
    href: "/create/meal-notice",
    examples: ["급식 기간 안내", "급식비 납부 안내", "추가 안내사항"],
    category: "행정업무",
    levels: ["초등학교", "중학교", "고등학교"],
  },
  {
    id: "absence-report",
    title: "결석신고서",
    description: "질병/출석인정/기타/미인정 결석 신고서를 간편하게 작성합니다.",
    icon: FileText,
    href: "/create/absence-report",
    examples: ["질병결석 신고", "출석인정 결석", "증빙서류 첨부"],
    category: "행정업무",
    levels: ["초등학교", "중학교", "고등학교"],
  },
  {
    id: "suneung-notice",
    title: "수능/모의평가 안내",
    description: "수능 및 모의평가 안내문을 AI로 자동 작성합니다.",
    icon: ClipboardList,
    href: "/create/suneung-notice",
    examples: ["시험 시간표 자동 생성", "준비물 안내", "유의사항 작성"],
    category: "행정업무",
    levels: ["고등학교"],
  },
  {
    id: "recruitment-notice",
    title: "채용공고 작성",
    description: "학교 채용공고를 AI로 쉽게 작성하세요. 교육공무직 채용에 최적화되어 있습니다.",
    icon: ClipboardList,
    href: "/create/recruitment-notice",
    examples: ["직종별 업무 자동 생성", "교육청 규정 반영", "일정표 자동 구성"],
    category: "행정업무",
    levels: ["초등학교", "중학교", "고등학교"],
  },
  {
    id: "participation-form",
    title: "참가 신청서",
    description: "공모전, 캠프, 체험학습 등 각종 프로그램 참가 신청서를 AI로 작성합니다.",
    icon: ClipboardList,
    href: "/create/participation-form",
    examples: ["공모전 참가", "캠프 신청", "체험학습 참가"],
    category: "행정업무",
    levels: ["초등학교", "중학교", "고등학교"],
  },
  {
    id: "syllabus",
    title: "강의계획서",
    description: "공동교육과정 또는 학교 교육과정의 강의계획서를 AI로 작성합니다.",
    icon: BookOpen,
    href: "/create/syllabus",
    examples: ["과목 설명 자동 생성", "주차별 계획 작성", "평가 방법 설정"],
    category: "수업/평가",
    levels: ["중학교", "고등학교"],
  },
  {
    id: "consent-form",
    title: "개인정보 동의서",
    description: "개인정보 수집·이용 및 제3자 제공 동의서를 AI로 작성합니다.",
    icon: ClipboardCheck,
    href: "/create/consent-form",
    examples: ["수집 목적 자동 생성", "제3자 제공 설정", "동의 체크박스"],
    category: "행정업무",
    levels: ["초등학교", "중학교", "고등학교"],
  },
];

const CATEGORY_OPTIONS = ["전체", "수업/평가", "생활기록", "상담업무", "행정업무", "기타"] as const;

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

type RecentDocument = {
  id: number;
  title: string;
  documentType: string;
  updatedAt?: string;
  createdAt?: string;
};

type RecentChat = {
  chatId: string;
  title: string;
  updatedAt?: string;
  preview?: string;
};

export default function Home() {
  const { user, isLoading, isAuthenticated, logout, isLoggingOut } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<(typeof CATEGORY_OPTIONS)[number]>("전체");
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
  const isAdminUser = user?.userType === "system_admin" || user?.userType === "operator";

  const { data: recentChats = [], isLoading: isChatsLoading } = useQuery({
    queryKey: ["/api/chats", "sidebar", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const response = await fetch(`/api/chats?limit=6`, {
        credentials: "include",
      });
      const payload = await response.json();
      return (payload?.data ?? []) as RecentChat[];
    },
  });

  const { data: recentDocuments = [], isLoading: isRecentLoading } = useQuery({
    queryKey: ["/api/documents", "sidebar", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", "6");
      params.set("sortBy", "updatedAt");
      params.set("order", "desc");
      const response = await fetch(`/api/documents?${params.toString()}`, {
        credentials: "include",
      });
      const payload = await response.json();
      return (payload?.data?.documents ?? []) as RecentDocument[];
    },
  });

  const filteredDocuments = useMemo(() => {
    return documentTypes.filter((doc) => {
      return selectedCategory === "전체" || doc.category === selectedCategory;
    });
  }, [selectedCategory]);

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
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
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
    if (files.length > 8) {
      toast({
        title: "파일 개수 초과",
        description: "파일은 최대 8개까지 첨부할 수 있습니다.",
        variant: "destructive",
      });
      return;
    }
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

  const handleRenameDocument = async (doc: RecentDocument) => {
    const nextTitle = window.prompt("새 이름을 입력하세요:", doc.title);
    if (!nextTitle || nextTitle.trim() === doc.title) return;
    await apiRequest("PUT", `/api/documents/${doc.id}`, { title: nextTitle.trim() });
    queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
  };

  const handleDuplicateDocument = async (doc: RecentDocument) => {
    await apiRequest("POST", `/api/documents/${doc.id}/duplicate`, {});
    queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
  };

  const handleDeleteDocument = async (doc: RecentDocument) => {
    const confirmed = window.confirm("정말 삭제하시겠습니까?");
    if (!confirmed) return;
    await apiRequest("DELETE", `/api/documents/${doc.id}`);
    queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
  };

  const handleLoadChat = async (chat: RecentChat) => {
    try {
      const response = await fetch(`/api/chats/${chat.chatId}`, {
        credentials: "include",
      });
      const payload = await response.json();
      if (payload?.data?.messages) {
        setHomeChatId(chat.chatId);
        setHomeMessages(
          payload.data.messages.map((m: any) => ({
            role: m.role,
            content: m.content,
            id: m.messageId,
          }))
        );
        setActiveSection("chat");
      }
    } catch (error) {
      toast({
        title: "대화 불러오기 실패",
        description: "대화를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleRenameChat = async (chat: RecentChat) => {
    const nextTitle = window.prompt("새 이름을 입력하세요:", chat.title);
    if (!nextTitle || nextTitle.trim() === chat.title) return;
    await apiRequest("PUT", `/api/chats/${chat.chatId}`, { title: nextTitle.trim() });
    queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
  };

  const handleDeleteChat = async (chat: RecentChat) => {
    const confirmed = window.confirm("정말 삭제하시겠습니까?");
    if (!confirmed) return;
    await apiRequest("DELETE", `/api/chats/${chat.chatId}`);
    queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
    if (homeChatId === chat.chatId) {
      setHomeChatId(null);
      setHomeMessages([]);
    }
  };

  const handleNewChat = () => {
    setHomeChatId(null);
    setHomeMessages([]);
    setChatInput("");
    setActiveSection("chat");
  };

  const getDocumentIcon = (type: string) => {
    if (type.includes("가정")) return "📮";
    if (type.includes("급식")) return "🍽️";
    if (type.includes("현장")) return "🎒";
    if (type.includes("방과후")) return "📚";
    if (type.includes("예산")) return "💰";
    if (type.includes("안전")) return "🛡️";
    return "📄";
  };

  const getEditUrl = (doc: RecentDocument): string => {
    const typeToPath: Record<string, string> = {
      "급식안내문": "/create/meal-notice",
      "결석신고서": "/create/absence-report",
      "수능안내문": "/create/suneung-notice",
      "채용공고": "/create/recruitment-notice",
      "참가신청서": "/create/participation-form",
      "강의계획서": "/create/syllabus",
      "현장체험학습": "/create/field-trip",
      "개인정보동의서": "/create/consent-form",
    };
    const basePath = typeToPath[doc.documentType] || `/mypage/document/${doc.id}`;
    return `${basePath}?id=${doc.id}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            {/* Logo Icon */}
            <div className="w-8 h-8 relative">
              <div
                className="absolute w-3 h-7 left-1 top-0.5 bg-[#1B2A4A] rounded-sm"
                style={{ transform: "rotate(-8deg)" }}
              />
              <div className="absolute w-2.5 h-5 right-0.5 top-1.5 bg-[#7EC8B5] rounded-sm" />
            </div>
            {/* Logo Text */}
            <span className="text-lg font-extrabold text-[#1B2A4A] tracking-tight">
              teachermate
            </span>
          </a>
          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="h-9 w-24 bg-muted animate-pulse rounded-md" />
            ) : isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2" data-testid="button-user-menu">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user.profileImageUrl || undefined} alt={user.nickname || user.name || "사용자"} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm">
                      {user.nickname || user.name || user.email || "사용자"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user.nickname || user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">내 프로필</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/mypage">마이페이지</Link>
                  </DropdownMenuItem>
                  {(user.userType === "system_admin" || user.userType === "operator") && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          관리자 대시보드
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
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
          className={`border-r bg-background transition-all duration-200 relative flex flex-col ${
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
                activeSection === "chat" && !homeChatId ? "bg-primary/10 text-primary" : "hover:bg-muted"
              }`}
              onClick={handleNewChat}
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
          {sidebarOpen && (
            <div className="mt-2 px-3 pb-6 space-y-4">
              {/* 대화 이력 */}
              <div className="border-t pt-4">
                <div className="px-2 text-xs font-medium text-muted-foreground">대화 이력</div>
                <div className="mt-2 space-y-1">
                  {!user && (
                    <p className="px-2 text-xs text-muted-foreground">
                      로그인 후 대화 이력을 확인할 수 있어요.
                    </p>
                  )}
                  {user && isChatsLoading && (
                    <p className="px-2 text-xs text-muted-foreground">대화 이력을 불러오는 중...</p>
                  )}
                  {user && !isChatsLoading && recentChats.length === 0 && (
                    <p className="px-2 text-xs text-muted-foreground">대화 이력이 없습니다.</p>
                  )}
                  {recentChats.map((chat) => (
                    <div
                      key={chat.chatId}
                      className={`group flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-muted ${
                        homeChatId === chat.chatId ? "bg-primary/10" : ""
                      }`}
                    >
                      <button
                        type="button"
                        className="flex flex-1 items-center gap-2 text-left text-sm overflow-hidden"
                        onClick={() => handleLoadChat(chat)}
                      >
                        <span className="text-base shrink-0">💬</span>
                        <span className="truncate max-w-full">{chat.title}</span>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label="대화 메뉴"
                            className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-background group-hover:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => handleRenameChat(chat)}>
                            📝 이름 변경
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDeleteChat(chat)}
                          >
                            🗑️ 삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </div>

              {/* 최근 문서 */}
              <div className="border-t pt-4">
                <div className="px-2 text-xs font-medium text-muted-foreground">최근 문서</div>
                <div className="mt-2 space-y-1">
                  {!user && (
                    <p className="px-2 text-xs text-muted-foreground">
                      로그인 후 최근 문서를 확인할 수 있어요.
                    </p>
                  )}
                  {user && isRecentLoading && (
                    <p className="px-2 text-xs text-muted-foreground">최근 문서를 불러오는 중...</p>
                  )}
                  {user && !isRecentLoading && recentDocuments.length === 0 && (
                    <p className="px-2 text-xs text-muted-foreground">최근 문서가 없습니다.</p>
                  )}
                  {recentDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="group flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-muted"
                    >
                      <button
                        type="button"
                        className="flex flex-1 items-center gap-2 text-left text-sm overflow-hidden"
                        onClick={() => setLocation(`/result/${doc.id}`)}
                      >
                        <span className="text-base shrink-0">{getDocumentIcon(doc.documentType)}</span>
                        <span className="truncate max-w-full">{doc.title}</span>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label="문서 메뉴"
                            className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-background group-hover:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => setLocation(getEditUrl(doc))}>
                            ✏️ 편집
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRenameDocument(doc)}>
                            📝 이름 변경
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateDocument(doc)}>
                            📋 복제
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDeleteDocument(doc)}
                          >
                            🗑️ 삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>

        <main className="flex-1 flex flex-col">
          {activeSection === "chat" ? (
            <>
              <div className="flex-1 overflow-y-auto">
                {homeMessages.length === 0 ? (
                  <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-6">
                    <div className="w-full max-w-2xl space-y-6">
                      <div className="text-center space-y-3">
                        <h1 className="text-2xl md:text-3xl font-semibold text-muted-foreground">
                          무엇을 도와드릴까요?
                        </h1>
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
                            placeholder={isSending ? "답변을 생성하고 있습니다..." : "티처메이트에게 물어보기"}
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
                          variant="ghost"
                          size="icon"
                          onClick={handleSendMessage}
                          disabled={!isSending && !chatInput.trim()}
                          className={`rounded-full transition-colors ${
                            isSending
                              ? "bg-gray-100 text-gray-500"
                              : chatInput.trim()
                              ? "bg-blue-500 text-white hover:bg-blue-600"
                              : "bg-gray-100 text-gray-400"
                          }`}
                          aria-label={isSending ? "생성 중" : "전송"}
                        >
                          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpIcon />}
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
                      {isSending && <TypingIndicator />}
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
                              placeholder={isSending ? "답변을 생성하고 있습니다..." : "티처메이트에게 물어보기"}
                              rows={2}
                              className="resize-none border-0 focus-visible:ring-0 text-base min-h-[96px]"
                              maxLength={10000}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleSendMessage}
                            disabled={!isSending && !chatInput.trim()}
                            className={`rounded-full transition-colors ${
                              isSending
                                ? "bg-gray-100 text-gray-500"
                                : chatInput.trim()
                                ? "bg-blue-500 text-white hover:bg-blue-600"
                                : "bg-gray-100 text-gray-400"
                            }`}
                            aria-label={isSending ? "생성 중" : "전송"}
                          >
                            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpIcon />}
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
                                <CardDescription className="text-sm leading-relaxed line-clamp-2 word-keep-all">
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
                          <p className="text-muted-foreground leading-relaxed word-keep-all">
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
                  {isAdminUser && (
                    <Link href="/admin">
                      <Button variant="ghost" size="sm" data-testid="button-admin">
                        <Settings className="w-4 h-4 mr-2" />
                        관리자
                      </Button>
                    </Link>
                  )}
                </div>
              </footer>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
