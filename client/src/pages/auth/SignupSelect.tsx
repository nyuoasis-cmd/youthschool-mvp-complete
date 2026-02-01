import { Link } from "wouter";
import { AuthLayout } from "@/components/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Users, ArrowRight } from "lucide-react";

interface UserTypeCardProps {
  icon: React.ReactNode;
  emoji: string;
  title: string;
  description: string;
  href: string;
}

function UserTypeCard({ icon, emoji, title, description, href }: UserTypeCardProps) {
  return (
    <Link href={href}>
      <Card className="cursor-pointer hover:border-primary hover:shadow-md transition-all group">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
            <span className="text-3xl">{emoji}</span>
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <CardDescription className="text-sm mb-4">
            {description}
          </CardDescription>
          <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-white transition-colors">
            {title}로 가입하기
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function SignupSelect() {
  return (
    <AuthLayout>
      <div className="space-y-6">
        {/* Header with BETA badge */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <h2 className="text-2xl font-bold text-gray-900">회원가입</h2>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
              BETA
            </Badge>
          </div>
          <p className="text-sm text-gray-600">
            회원 유형을 선택해주세요
          </p>
        </div>

        {/* User type cards */}
        <div className="space-y-4">
          <UserTypeCard
            icon={<GraduationCap className="h-8 w-8 text-primary" />}
            emoji="🎓"
            title="교사"
            description="학교에서 학생들을 가르치시나요? 수업 자료와 행정 문서를 AI로 자동 생성하세요."
            href="/signup/teacher"
          />

          <UserTypeCard
            icon={<Users className="h-8 w-8 text-primary" />}
            emoji="🏫"
            title="학교 구성원"
            description="행정실, 교무실 등 학교에서 근무하시나요? 업무 문서를 AI로 간편하게 작성하세요."
            href="/signup/staff"
          />
        </div>

        {/* Login link */}
        <div className="pt-4 text-center">
          <p className="text-sm text-gray-600">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              로그인 하기
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
