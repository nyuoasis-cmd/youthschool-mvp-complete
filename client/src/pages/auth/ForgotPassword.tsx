import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AuthLayout } from "@/components/auth";
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
import { Mail, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다"),
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "요청에 실패했습니다");
      }

      setSentEmail(data.email);
      setIsEmailSent(true);
    } catch (error) {
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "요청에 실패했습니다",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!sentEmail) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: sentEmail }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "요청에 실패했습니다");
      }

      toast({
        title: "발송 완료",
        description: "비밀번호 재설정 메일이 재발송되었습니다",
      });
    } catch (error) {
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "요청에 실패했습니다",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEmailSent) {
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
              메일이 발송되었습니다
            </h2>
            <p className="mt-2 text-gray-600">
              비밀번호 재설정 링크를 확인해주세요
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-left">
            <div className="flex items-start gap-4">
              <Mail className="h-6 w-6 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm text-blue-700">
                  <strong>{sentEmail}</strong>
                </p>
                <p className="mt-2 text-sm text-blue-700">
                  메일함에서 비밀번호 재설정 링크를 클릭해주세요.
                </p>
                <p className="mt-2 text-sm text-blue-600">
                  이 링크는 <strong>1시간</strong> 동안 유효합니다.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-500">
              메일이 오지 않았나요?
            </p>
            <Button
              variant="outline"
              onClick={handleResend}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  발송 중...
                </>
              ) : (
                "메일 재발송"
              )}
            </Button>
          </div>

          <div className="pt-4">
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

  return (
    <AuthLayout
      title="비밀번호 찾기"
      subtitle="가입 시 등록한 이메일을 입력해주세요"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>이메일</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="example@email.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                처리 중...
              </>
            ) : (
              "비밀번호 재설정 메일 발송"
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
