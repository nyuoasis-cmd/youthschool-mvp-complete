import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useRoute } from "wouter";
import { z } from "zod";
import { AuthLayout, PasswordStrength } from "@/components/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import { cn } from "@/lib/utils";

// Step indicator
function NewStepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { id: 1, name: "기본정보" },
    { id: 2, name: "추가정보" },
    { id: 3, name: "약관동의" },
  ];

  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center justify-center space-x-2">
        {steps.map((step, stepIdx) => (
          <li key={step.id} className="flex items-center">
            {stepIdx > 0 && (
              <div
                className={cn(
                  "w-8 h-0.5 mx-1",
                  step.id <= currentStep ? "bg-primary" : "bg-gray-200"
                )}
              />
            )}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  step.id < currentStep
                    ? "bg-primary text-white"
                    : step.id === currentStep
                    ? "border-2 border-primary text-primary bg-white"
                    : "border-2 border-gray-300 text-gray-400 bg-white"
                )}
              >
                {step.id < currentStep ? "✓" : step.id}
              </div>
              <span
                className={cn(
                  "mt-1.5 text-xs font-medium",
                  step.id === currentStep ? "text-primary" : "text-gray-500"
                )}
              >
                {step.name}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}

// Form schema
const emailSignupSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다"),
  password: z.string()
    .min(8, "비밀번호는 8자 이상이어야 합니다")
    .regex(/[a-zA-Z]/, "영문을 포함해야 합니다")
    .regex(/[0-9]/, "숫자를 포함해야 합니다"),
  passwordConfirm: z.string(),
  name: z.string().min(2, "이름은 2자 이상이어야 합니다"),
  nickname: z.string().min(2, "닉네임은 2자 이상이어야 합니다").max(20, "닉네임은 20자 이하여야 합니다"),
}).refine(data => data.password === data.passwordConfirm, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["passwordConfirm"],
});

type EmailSignupData = z.infer<typeof emailSignupSchema>;

export default function SignupEmail() {
  const [, setLocation] = useLocation();
  const [isTeacher] = useRoute("/signup/teacher/email");
  const { toast } = useToast();

  const userType = isTeacher ? "teacher" : "staff";
  const userTypeLabel = isTeacher ? "교사" : "학교 구성원";
  const backPath = isTeacher ? "/signup/teacher" : "/signup/staff";
  const infoPath = isTeacher ? "/signup/teacher/info" : "/signup/staff/info";

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [emailChecked, setEmailChecked] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const form = useForm<EmailSignupData>({
    resolver: zodResolver(emailSignupSchema),
    defaultValues: {
      email: "",
      password: "",
      passwordConfirm: "",
      name: "",
      nickname: "",
    },
  });

  const password = form.watch("password");

  // Check email availability
  const checkEmail = async () => {
    const emailValue = form.getValues("email");
    if (!emailValue || !emailValue.includes("@")) {
      toast({
        title: "오류",
        description: "올바른 이메일을 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    setCheckingEmail(true);
    try {
      const response = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValue }),
      });
      const data = await response.json();

      setEmailChecked(true);
      setEmailAvailable(data.available);

      if (data.available) {
        toast({
          title: "사용 가능",
          description: "사용 가능한 이메일입니다",
        });
      } else {
        // Check if it's a Kakao account
        if (data.authProvider === "kakao") {
          toast({
            title: "카카오 계정 존재",
            description: "이미 카카오로 가입된 이메일입니다. 카카오 로그인을 이용해주세요.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "사용 불가",
            description: "이미 사용 중인 이메일입니다",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "이메일 확인에 실패했습니다",
        variant: "destructive",
      });
    } finally {
      setCheckingEmail(false);
    }
  };

  const onSubmit = async (data: EmailSignupData) => {
    if (!emailChecked || !emailAvailable) {
      toast({
        title: "이메일 확인 필요",
        description: "이메일 중복 확인을 해주세요",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Store email signup data in session
      sessionStorage.setItem("emailSignupData", JSON.stringify({
        email: data.email,
        password: data.password,
        name: data.name,
        nickname: data.nickname,
        userType,
      }));
      sessionStorage.setItem("signupUserType", userType);
      sessionStorage.setItem("signupAuthProvider", "email");

      // Navigate to info page
      setLocation(infoPath);
    } catch (error) {
      toast({
        title: "오류",
        description: "회원가입에 실패했습니다",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title={`${userTypeLabel} 회원가입`}>
      <NewStepIndicator currentStep={1} />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">이메일 주소 *</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                className="pl-10"
                {...form.register("email", {
                  onChange: () => {
                    setEmailChecked(false);
                    setEmailAvailable(false);
                  },
                })}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={checkEmail}
              disabled={checkingEmail}
            >
              {checkingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : "중복 확인"}
            </Button>
          </div>
          {form.formState.errors.email && (
            <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
          )}
          {emailChecked && (
            <p className={`text-sm ${emailAvailable ? "text-green-600" : "text-red-600"}`}>
              {emailAvailable ? "사용 가능한 이메일입니다" : "이미 사용 중인 이메일입니다"}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password">비밀번호 *</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="8자 이상, 영문/숫자 조합"
              className="pl-10 pr-10"
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <PasswordStrength password={password} />
          {form.formState.errors.password && (
            <p className="text-sm text-red-600">{form.formState.errors.password.message}</p>
          )}
        </div>

        {/* Password Confirm */}
        <div className="space-y-2">
          <Label htmlFor="passwordConfirm">비밀번호 확인 *</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="passwordConfirm"
              type={showPasswordConfirm ? "text" : "password"}
              placeholder="비밀번호를 다시 입력하세요"
              className="pl-10 pr-10"
              {...form.register("passwordConfirm")}
            />
            <button
              type="button"
              onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {form.formState.errors.passwordConfirm && (
            <p className="text-sm text-red-600">{form.formState.errors.passwordConfirm.message}</p>
          )}
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">이름 (선생님 성함) *</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="name"
              type="text"
              placeholder="홍길동"
              className="pl-10"
              {...form.register("name")}
            />
          </div>
          {form.formState.errors.name && (
            <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
          )}
        </div>

        {/* Nickname */}
        <div className="space-y-2">
          <Label htmlFor="nickname">닉네임 *</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="nickname"
              type="text"
              placeholder="서비스에서 표시될 닉네임"
              className="pl-10"
              {...form.register("nickname")}
            />
          </div>
          <p className="text-xs text-muted-foreground">로그인 후 화면에 표시되는 이름입니다</p>
          {form.formState.errors.nickname && (
            <p className="text-sm text-red-600">{form.formState.errors.nickname.message}</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex justify-between pt-4">
          <Link href={backPath}>
            <Button type="button" variant="outline">이전</Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                처리 중...
              </>
            ) : (
              "다음 단계로"
            )}
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}
