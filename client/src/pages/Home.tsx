import { Link } from "wouter";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileText, Briefcase, Sparkles, Clock, CheckCircle2, ArrowRight, Settings, LogIn, LogOut, User, Upload, ClipboardList, MapPin, Shield, CalendarDays, Scale, Users, Coins } from "lucide-react";
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
  const { user, isLoading, isAuthenticated } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<(typeof CATEGORY_OPTIONS)[number]>("전체");
  const [selectedLevel, setSelectedLevel] = useState<(typeof LEVEL_OPTIONS)[number]>("전체");

  const filteredDocuments = useMemo(() => {
    return documentTypes.filter((doc) => {
      const categoryMatch = selectedCategory === "전체" || doc.category === selectedCategory;
      const levelMatch = selectedLevel === "전체" || doc.levels.includes(selectedLevel);
      return categoryMatch && levelMatch;
    });
  }, [selectedCategory, selectedLevel]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="font-semibold text-lg">유스쿨</span>
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
                  <DropdownMenuItem asChild>
                    <Link href="/login" className="flex items-center gap-2 text-destructive" data-testid="button-logout">
                      <LogOut className="h-4 w-4" />
                      로그아웃
                    </Link>
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

      {/* Hero Section */}
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

      {/* Document Types Section */}
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

      {/* Features Section */}
      <section className="bg-muted/30 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
              왜 유스쿨인가요?
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

      {/* CTA Section */}

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">유스쿨 MVP - 학교 문서 행정 AI 자동화 서비스</p>
          <Link href="/admin">
            <Button variant="ghost" size="sm" data-testid="button-admin">
              <Settings className="w-4 h-4 mr-2" />
              관리자
            </Button>
          </Link>
        </div>
      </footer>
    </div>
  );
}
