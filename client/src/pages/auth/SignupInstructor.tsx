import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { AuthLayout, StepIndicator, REGISTRATION_STEPS, PasswordStrength } from "@/components/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Eye, EyeOff, Mail, Lock, User, Clock } from "lucide-react";
import { SPECIALTY_OPTIONS } from "@shared/models/auth";
import { IS_EMAIL_VERIFICATION_ENABLED } from "@/lib/featureFlags";

const step1Schema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다"),
  password: z.string()
    .min(8, "비밀번호는 8자 이상이어야 합니다")
    .regex(/[a-zA-Z]/, "영문을 포함해야 합니다")
    .regex(/[0-9]/, "숫자를 포함해야 합니다")
    .regex(/[^a-zA-Z0-9]/, "특수문자를 포함해야 합니다"),
  passwordConfirm: z.string(),
  name: z.string().min(2, "이름은 2자 이상이어야 합니다"),
}).refine(data => data.password === data.passwordConfirm, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["passwordConfirm"],
});

const step2Schema = z.object({
  specialties: z.array(z.string()).min(1, "전문 분야를 1개 이상 선택해주세요"),
  careerYears: z.number().min(0).max(100).optional(),
  introduction: z.string().max(500).optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
});

const step3Schema = z.object({
  ageVerification: z.boolean().refine(val => val === true, "만 14세 이상이어야 합니다"),
  termsOfService: z.boolean().refine(val => val === true, "서비스 이용약관에 동의해주세요"),
  privacyPolicy: z.boolean().refine(val => val === true, "개인정보 처리방침에 동의해주세요"),
  marketingConsent: z.boolean().optional(),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;

export default function SignupInstructor() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { register: registerUser, isRegistering } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [emailChecked, setEmailChecked] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null);

  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { email: "", password: "", passwordConfirm: "", name: "" },
  });

  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: { specialties: [], careerYears: undefined, introduction: "", bankName: "", accountNumber: "" },
  });

  const step3Form = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: { ageVerification: false, termsOfService: false, privacyPolicy: false, marketingConsent: false },
  });

  const password = step1Form.watch("password");
  const specialties = step2Form.watch("specialties");
  const introduction = step2Form.watch("introduction") || "";

  const checkEmail = async () => {
    const emailValue = step1Form.getValues("email");
    if (!emailValue || !emailValue.includes("@")) {
      toast({ title: "오류", description: "올바른 이메일을 입력해주세요", variant: "destructive" });
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
      toast({
        title: data.available ? "사용 가능" : "사용 불가",
        description: data.available ? "사용 가능한 이메일입니다" : "이미 사용 중인 이메일입니다",
        variant: data.available ? "default" : "destructive",
      });
    } catch {
      toast({ title: "오류", description: "이메일 확인에 실패했습니다", variant: "destructive" });
    } finally {
      setCheckingEmail(false);
    }
  };

  const onStep1Submit = async (data: Step1Data) => {
    if (!emailChecked || !emailAvailable) {
      toast({ title: "이메일 확인 필요", description: "이메일 중복 확인을 해주세요", variant: "destructive" });
      return;
    }
    setStep1Data(data);
    setCurrentStep(2);
  };

  const onStep2Submit = async (data: Step2Data) => {
    setStep2Data(data);
    setCurrentStep(3);
  };

  const onStep3Submit = async (data: Step3Data) => {
    if (!step1Data || !step2Data) return;
    setIsLoading(true);
    try {
      const result = await registerUser({
        userType: "instructor",
        step1: step1Data,
        step2: step2Data,
        terms: data,
      });
      const description = IS_EMAIL_VERIFICATION_ENABLED
        ? "이메일을 확인하여 인증을 완료해주세요"
        : "회원가입이 완료되었습니다. 관리자 승인 후 서비스를 이용하실 수 있습니다.";
      toast({
        title: "회원가입 완료",
        description,
      });
      setLocation(`/signup/complete?type=instructor&email=${encodeURIComponent(result.email)}`);
    } catch (error) {
      toast({ title: "오류", description: error instanceof Error ? error.message : "회원가입에 실패했습니다", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSpecialty = (specialty: string) => {
    const current = step2Form.getValues("specialties");
    if (current.includes(specialty)) {
      step2Form.setValue("specialties", current.filter(s => s !== specialty));
    } else {
      step2Form.setValue("specialties", [...current, specialty]);
    }
  };

  const handleCheckAll = (checked: boolean) => {
    step3Form.setValue("ageVerification", checked);
    step3Form.setValue("termsOfService", checked);
    step3Form.setValue("privacyPolicy", checked);
    step3Form.setValue("marketingConsent", checked);
  };

  const allTermsChecked = step3Form.watch("ageVerification") && step3Form.watch("termsOfService") && step3Form.watch("privacyPolicy");

  return (
    <AuthLayout title="강사 회원가입">
      <StepIndicator steps={REGISTRATION_STEPS} currentStep={currentStep} />

      {currentStep === 1 && (
        <form onSubmit={step1Form.handleSubmit(onStep1Submit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일 주소 *</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input id="email" type="email" placeholder="example@email.com" className="pl-10"
                  {...step1Form.register("email", { onChange: () => { setEmailChecked(false); setEmailAvailable(false); } })} />
              </div>
              <Button type="button" variant="outline" onClick={checkEmail} disabled={checkingEmail}>
                {checkingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : "중복 확인"}
              </Button>
            </div>
            {step1Form.formState.errors.email && <p className="text-sm text-red-600">{step1Form.formState.errors.email.message}</p>}
            {emailChecked && <p className={`text-sm ${emailAvailable ? "text-green-600" : "text-red-600"}`}>{emailAvailable ? "사용 가능한 이메일입니다" : "이미 사용 중인 이메일입니다"}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">비밀번호 *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="8자 이상, 영문/숫자/특수문자 조합" className="pl-10 pr-10" {...step1Form.register("password")} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <PasswordStrength password={password} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="passwordConfirm">비밀번호 확인 *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input id="passwordConfirm" type={showPasswordConfirm ? "text" : "password"} placeholder="비밀번호를 다시 입력하세요" className="pl-10 pr-10" {...step1Form.register("passwordConfirm")} />
              <button type="button" onClick={() => setShowPasswordConfirm(!showPasswordConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {step1Form.formState.errors.passwordConfirm && <p className="text-sm text-red-600">{step1Form.formState.errors.passwordConfirm.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">이름 * (실명)</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input id="name" type="text" placeholder="홍길동" className="pl-10" {...step1Form.register("name")} />
            </div>
            {step1Form.formState.errors.name && <p className="text-sm text-red-600">{step1Form.formState.errors.name.message}</p>}
          </div>

          <div className="flex justify-between pt-4">
            <Link href="/signup"><Button type="button" variant="outline">이전</Button></Link>
            <Button type="submit">다음 단계로</Button>
          </div>
        </form>
      )}

      {currentStep === 2 && (
        <form onSubmit={step2Form.handleSubmit(onStep2Submit)} className="space-y-4">
          <div className="space-y-2">
            <Label>전문 분야 * (복수 선택 가능)</Label>
            <div className="grid grid-cols-2 gap-2">
              {SPECIALTY_OPTIONS.map((specialty) => (
                <div key={specialty} onClick={() => toggleSpecialty(specialty)}
                  className={`cursor-pointer p-2 text-sm rounded-md border transition-colors ${specialties.includes(specialty) ? "bg-primary text-white border-primary" : "bg-white text-gray-700 border-gray-200 hover:border-primary"}`}>
                  {specialty}
                </div>
              ))}
            </div>
            {step2Form.formState.errors.specialties && <p className="text-sm text-red-600">{step2Form.formState.errors.specialties.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="careerYears">경력 (년수)</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input id="careerYears" type="number" placeholder="5" className="pl-10" min={0} max={100} {...step2Form.register("careerYears", { valueAsNumber: true })} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">년</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="introduction">자기소개 (최대 500자)</Label>
            <Textarea id="introduction" placeholder="전문 분야와 경력에 대해 간단히 소개해주세요" className="min-h-[100px]" maxLength={500} {...step2Form.register("introduction")} />
            <p className="text-xs text-gray-500 text-right">{introduction.length}/500</p>
          </div>

          <div className="space-y-2">
            <Label>강사료 지급 계좌 (선택)</Label>
            <div className="flex gap-2">
              <Input placeholder="은행명" className="flex-1" {...step2Form.register("bankName")} />
              <Input placeholder="계좌번호" className="flex-[2]" {...step2Form.register("accountNumber")} />
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>이전 단계</Button>
            <Button type="submit">다음 단계로</Button>
          </div>
        </form>
      )}

      {currentStep === 3 && (
        <form onSubmit={step3Form.handleSubmit(onStep3Submit)} className="space-y-4">
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b">
              <Checkbox id="checkAll" checked={allTermsChecked && step3Form.watch("marketingConsent")} onCheckedChange={(checked) => handleCheckAll(!!checked)} />
              <Label htmlFor="checkAll" className="font-medium cursor-pointer">전체 동의</Label>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox id="ageVerification" checked={step3Form.watch("ageVerification")} onCheckedChange={(checked) => step3Form.setValue("ageVerification", !!checked)} />
                <Label htmlFor="ageVerification" className="cursor-pointer"><span className="text-primary">[필수]</span> 만 14세 이상입니다</Label>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="termsOfService" checked={step3Form.watch("termsOfService")} onCheckedChange={(checked) => step3Form.setValue("termsOfService", !!checked)} />
                  <Label htmlFor="termsOfService" className="cursor-pointer"><span className="text-primary">[필수]</span> 서비스 이용약관 동의</Label>
                </div>
                <Button type="button" variant="ghost" size="sm" className="text-gray-500">보기</Button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="privacyPolicy" checked={step3Form.watch("privacyPolicy")} onCheckedChange={(checked) => step3Form.setValue("privacyPolicy", !!checked)} />
                  <Label htmlFor="privacyPolicy" className="cursor-pointer"><span className="text-primary">[필수]</span> 개인정보 수집 및 이용 동의</Label>
                </div>
                <Button type="button" variant="ghost" size="sm" className="text-gray-500">보기</Button>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="marketingConsent" checked={step3Form.watch("marketingConsent")} onCheckedChange={(checked) => step3Form.setValue("marketingConsent", !!checked)} />
                <Label htmlFor="marketingConsent" className="cursor-pointer"><span className="text-gray-500">[선택]</span> 마케팅 정보 수신 동의</Label>
              </div>
            </div>
          </div>
          {(step3Form.formState.errors.ageVerification || step3Form.formState.errors.termsOfService || step3Form.formState.errors.privacyPolicy) && (
            <p className="text-sm text-red-600">필수 약관에 모두 동의해주세요</p>
          )}
          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={() => setCurrentStep(2)}>이전 단계</Button>
            <Button type="submit" disabled={isLoading || isRegistering}>
              {isLoading || isRegistering ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />가입 중...</>) : "가입 완료"}
            </Button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
