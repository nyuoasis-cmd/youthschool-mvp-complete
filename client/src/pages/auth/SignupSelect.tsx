import { Link } from "wouter";
import { AuthLayout } from "@/components/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Presentation, Building2, ArrowRight } from "lucide-react";

interface UserTypeCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}

function UserTypeCard({ icon, title, description, href }: UserTypeCardProps) {
  return (
    <Link href={href}>
      <Card className="cursor-pointer hover:border-primary hover:shadow-md transition-all group">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
            {icon}
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
    <AuthLayout
      title="회원가입"
      subtitle="회원 유형을 선택해주세요"
    >
      <div className="space-y-4">
        <UserTypeCard
          icon={<GraduationCap className="h-8 w-8 text-primary" />}
          title="교사"
          description="프로그램 신청 및 행정 문서 자동 생성을 원하시나요?"
          href="/signup/teacher"
        />

        <UserTypeCard
          icon={<Presentation className="h-8 w-8 text-primary" />}
          title="강사"
          description="전문 교육 프로그램을 제공하고 싶으신가요?"
          href="/signup/instructor"
        />

        <UserTypeCard
          icon={<Building2 className="h-8 w-8 text-primary" />}
          title="학교 관리자"
          description="학교 단위로 프로그램을 관리하고 싶으신가요?"
          href="/signup/school-admin"
        />

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
