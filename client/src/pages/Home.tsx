import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileText, Briefcase, Sparkles, Clock, CheckCircle2, ArrowRight, Settings, LogIn, LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const documentTypes = [
  {
    id: "parent-letter",
    title: "가정통신문",
    description: "학부모님께 전달하는 공식 안내문을 AI가 전문적으로 작성합니다.",
    icon: FileText,
    href: "/create/parent-letter",
    examples: ["겨울방학 안전 안내", "학교 행사 참가 안내", "학급 운영 안내"],
  },
  {
    id: "education-plan",
    title: "외부 교육 용역 계획서",
    description: "비즈쿨, 창업교육 등 외부 교육 프로그램 계획서를 체계적으로 작성합니다.",
    icon: Briefcase,
    href: "/create/education-plan",
    examples: ["창업 체험 프로그램", "진로 탐색 교육", "코딩 교육 프로그램"],
  },
];

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="font-semibold text-lg">YouthSchool</span>
          </div>
          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="h-9 w-24 bg-muted animate-pulse rounded-md" />
            ) : isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2" data-testid="button-user-menu">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "사용자"} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm">
                      {user.firstName || user.email || "사용자"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/history">내 문서 보기</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <a href="/api/logout" className="flex items-center gap-2 text-destructive" data-testid="button-logout">
                      <LogOut className="h-4 w-4" />
                      로그아웃
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild data-testid="button-login">
                <a href="/api/login" className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  로그인
                </a>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="text-center max-w-3xl mx-auto">
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
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild data-testid="button-start-now">
                <Link href="/create/parent-letter">
                  지금 시작하기
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild data-testid="button-view-history">
                <Link href="/history">생성 이력 보기</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Document Types Section */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
            문서 유형 선택
          </h2>
          <p className="text-muted-foreground">
            생성하고자 하는 문서 유형을 선택해 주세요
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {documentTypes.map((doc) => {
            const IconComponent = doc.icon;
            return (
              <Link key={doc.id} href={doc.href}>
                <Card 
                  className="h-full hover-elevate active-elevate-2 cursor-pointer transition-all duration-200 border-border"
                  data-testid={`card-${doc.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <IconComponent className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{doc.title}</CardTitle>
                        <CardDescription className="text-base leading-relaxed">
                          {doc.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">예시</p>
                      <div className="flex flex-wrap gap-2">
                        {doc.examples.map((example, idx) => (
                          <span
                            key={idx}
                            className="inline-flex px-3 py-1 rounded-md bg-muted text-sm text-muted-foreground"
                          >
                            {example}
                          </span>
                        ))}
                      </div>
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
              왜 YouthSchool인가요?
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
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
            지금 바로 시작하세요
          </h2>
          <p className="text-muted-foreground mb-8">
            간단한 정보 입력만으로 전문적인 문서가 완성됩니다
          </p>
          <Button size="lg" asChild data-testid="button-cta-start">
            <Link href="/create/parent-letter">
              문서 작성 시작하기
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">YouthSchool MVP - 학교 문서 행정 AI 자동화 서비스</p>
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
