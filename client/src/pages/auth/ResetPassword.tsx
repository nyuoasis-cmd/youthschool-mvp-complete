import { useState, useEffect } from "react";
import { Link, useSearch, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AuthLayout, PasswordStrength } from "@/components/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { CheckCircle, XCircle, Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, "비밀번호는 8자 이상이어야 합니다")
    .regex(/[a-zA-Z]/, "영문을 포함해야 합니다")
    .regex(/[0-9]/, "숫자를 포함해야 합니다")
    .regex(/[^a-zA-Z0-9]/, "특수문자를 포함해야 합니다"),
  passwordConfirm: z.string(),
}).refine(data => data.password === data.passwordConfirm, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["passwordConfirm"],
});

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const { toast } = useToast();
  const { resetPassword, isResettingPassword, validateResetToken } = useAuth();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const params = new URLSearchParams(search);
  const token = params.get("token") || "";

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      passwordConfirm: "",
    },
  });

  const password = form.watch("password");

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsValidating(false);
        setIsTokenValid(false);
        return;
      }

      try {
        const data = await validateResetToken(token);
        if (data.valid) {
          setIsTokenValid(true);
        } else {
          setIsTokenValid(false);
        }
      } catch {
        setIsTokenValid(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const onSubmit = async (data: ResetPasswordInput) => {
    try {
      await resetPassword({ token, password: data.password });
      setIsSuccess(true);
    } catch (error) {
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "비밀번호 재설정에 실패했습니다",
        variant: "destructive",
      });
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <AuthLayout>
        <div className="text-center space-y-6">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-gray-600">링크를 확인하고 있습니다...</p>
        </div>
      </AuthLayout>
    );
  }

  // Invalid token state
  if (!isTokenValid) {
    return (
      <AuthLayout>
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              유효하지 않은 링크
            </h2>
            <p className="mt-2 text-gray-600">
              비밀번호 재설정 링크가 만료되었거나 유효하지 않습니다.
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
            <p>링크는 발송 후 1시간 동안만 유효합니다.</p>
            <p className="mt-1">새로운 링크를 요청해주세요.</p>
          </div>

          <div className="space-y-2">
            <Link href="/password/find">
              <Button className="w-full">
                비밀번호 찾기 다시 하기
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                로그인으로 돌아가기
              </Button>
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <AuthLayout>
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              비밀번호가 변경되었습니다
            </h2>
            <p className="mt-2 text-gray-600">
              새 비밀번호로 로그인해주세요
            </p>
          </div>

          <Link href="/login">
            <Button className="w-full">
              로그인하기
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  // Reset password form
  return (
    <AuthLayout
      title="새 비밀번호 설정"
      subtitle="새로운 비밀번호를 입력해주세요"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>새 비밀번호</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="8자 이상, 영문/숫자/특수문자 포함"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <PasswordStrength password={password} />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="passwordConfirm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>새 비밀번호 확인</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPasswordConfirm ? "text" : "password"}
                      placeholder="비밀번호를 다시 입력해주세요"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    >
                      {showPasswordConfirm ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full"
            disabled={isResettingPassword}
          >
            {isResettingPassword ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                처리 중...
              </>
            ) : (
              "비밀번호 변경"
            )}
          </Button>

          <div className="text-center">
            <Link href="/login">
              <Button variant="ghost" type="button">
                <ArrowLeft className="mr-2 h-4 w-4" />
                로그인으로 돌아가기
              </Button>
            </Link>
          </div>
        </form>
      </Form>
    </AuthLayout>
  );
}
