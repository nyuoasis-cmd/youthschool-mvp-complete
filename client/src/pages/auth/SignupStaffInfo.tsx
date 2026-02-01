import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { AuthLayout } from "@/components/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { School, Briefcase, X } from "lucide-react";
import { STAFF_DUTY_OPTIONS, STAFF_POSITION_OPTIONS } from "@shared/models/auth";
import { cn } from "@/lib/utils";

// Step indicator for 3-step registration
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
const staffInfoSchema = z.object({
  schoolName: z.string().min(1, "학교명을 입력해주세요"),
  position: z.string().optional(),
});

type StaffInfoData = z.infer<typeof staffInfoSchema>;

export default function SignupStaffInfo() {
  const [, setLocation] = useLocation();
  const [selectedDuties, setSelectedDuties] = useState<string[]>([]);
  const [dutiesEtc, setDutiesEtc] = useState("");

  // Check for signup data (Kakao session or email signup)
  useEffect(() => {
    const checkSignupData = async () => {
      // Check for email signup data first
      const emailSignupData = sessionStorage.getItem("emailSignupData");
      const authProvider = sessionStorage.getItem("signupAuthProvider");

      if (emailSignupData && authProvider === "email") {
        const data = JSON.parse(emailSignupData);
        if (data.userType !== "staff") {
          setLocation("/signup/teacher/info");
        }
        return;
      }

      // Check for Kakao session
      try {
        const response = await fetch("/api/auth/kakao/session");
        if (!response.ok) {
          setLocation("/signup/staff");
          return;
        }
        const data = await response.json();
        if (data.userType !== "staff") {
          setLocation("/signup/teacher/info");
        }
      } catch (error) {
        setLocation("/signup/staff");
      }
    };
    checkSignupData();
  }, [setLocation]);

  const form = useForm<StaffInfoData>({
    resolver: zodResolver(staffInfoSchema),
    defaultValues: {
      schoolName: "",
      position: "",
    },
  });

  const toggleDuty = (duty: string) => {
    setSelectedDuties((prev) =>
      prev.includes(duty) ? prev.filter((d) => d !== duty) : [...prev, duty]
    );
  };

  const onSubmit = (data: StaffInfoData) => {
    // Store staff info in sessionStorage
    const staffInfo = {
      ...data,
      duties: selectedDuties,
      dutiesEtc: selectedDuties.includes("기타") ? dutiesEtc : undefined,
    };
    sessionStorage.setItem("signupStaffInfo", JSON.stringify(staffInfo));

    // Navigate to terms page
    setLocation("/signup/terms");
  };

  return (
    <AuthLayout title="학교 구성원 회원가입">
      <NewStepIndicator currentStep={2} />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* School name */}
        <div className="space-y-2">
          <Label htmlFor="schoolName">
            소속 학교명 <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <School className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="schoolName"
              type="text"
              placeholder="예: 서울고등학교"
              className="pl-10"
              {...form.register("schoolName")}
            />
          </div>
          {form.formState.errors.schoolName && (
            <p className="text-sm text-red-600">
              {form.formState.errors.schoolName.message}
            </p>
          )}
        </div>

        {/* Position */}
        <div className="space-y-2">
          <Label htmlFor="position">담당</Label>
          <Select
            value={form.watch("position") || ""}
            onValueChange={(value) => form.setValue("position", value)}
          >
            <SelectTrigger>
              <Briefcase className="h-4 w-4 mr-2 text-gray-400" />
              <SelectValue placeholder="담당 선택 (선택사항)" />
            </SelectTrigger>
            <SelectContent>
              {STAFF_POSITION_OPTIONS.map((position) => (
                <SelectItem key={position} value={position}>
                  {position}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Duties - Chip multi-select */}
        <div className="space-y-2">
          <Label>담당 업무</Label>
          <p className="text-xs text-gray-500 mb-2">복수 선택 가능</p>
          <div className="flex flex-wrap gap-2">
            {STAFF_DUTY_OPTIONS.map((duty) => (
              <Badge
                key={duty}
                variant={selectedDuties.includes(duty) ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-colors px-3 py-1.5",
                  selectedDuties.includes(duty)
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "hover:bg-gray-100"
                )}
                onClick={() => toggleDuty(duty)}
              >
                {duty}
                {selectedDuties.includes(duty) && (
                  <X className="ml-1 h-3 w-3" />
                )}
              </Badge>
            ))}
          </div>
        </div>

        {/* "기타" input field */}
        {selectedDuties.includes("기타") && (
          <div className="space-y-2">
            <Label htmlFor="dutiesEtc">기타 업무 내용</Label>
            <Input
              id="dutiesEtc"
              type="text"
              placeholder="기타 담당 업무를 입력하세요"
              value={dutiesEtc}
              onChange={(e) => setDutiesEtc(e.target.value)}
            />
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between pt-4">
          <Link href="/signup/staff">
            <Button type="button" variant="outline">
              이전 단계
            </Button>
          </Link>
          <Button type="submit">다음 단계로</Button>
        </div>
      </form>
    </AuthLayout>
  );
}
