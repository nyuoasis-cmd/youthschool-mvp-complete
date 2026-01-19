import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, Phone } from "lucide-react";

interface PhoneVerificationProps {
  phone: string;
  onPhoneChange: (phone: string) => void;
  onVerified: () => void;
  isVerified: boolean;
  disabled?: boolean;
}

export function PhoneVerification({
  phone,
  onPhoneChange,
  onVerified,
  isVerified,
  disabled = false,
}: PhoneVerificationProps) {
  const [code, setCode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { toast } = useToast();

  // Format phone number as user types
  const handlePhoneChange = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "");

    // Format as 010-0000-0000
    let formatted = digits;
    if (digits.length > 3) {
      formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }
    if (digits.length > 7) {
      formatted = `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
    }

    onPhoneChange(formatted);
  };

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Send verification code
  const handleSendCode = async () => {
    if (!phone.match(/^010-\d{4}-\d{4}$/)) {
      toast({
        title: "오류",
        description: "올바른 휴대폰 번호 형식이 아닙니다 (010-0000-0000)",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch("/api/auth/send-phone-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "인증번호 발송에 실패했습니다");
      }

      setCodeSent(true);
      setCountdown(180); // 3 minutes
      toast({
        title: "발송 완료",
        description: "인증번호가 발송되었습니다",
      });
    } catch (error) {
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "인증번호 발송에 실패했습니다",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Verify code
  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      toast({
        title: "오류",
        description: "인증번호는 6자리입니다",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch("/api/auth/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "인증에 실패했습니다");
      }

      onVerified();
      toast({
        title: "인증 완료",
        description: "휴대폰 인증이 완료되었습니다",
      });
    } catch (error) {
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "인증에 실패했습니다",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Format countdown time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phone">휴대폰 번호 *</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="phone"
              type="tel"
              placeholder="010-0000-0000"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              disabled={disabled || isVerified}
              className="pl-10"
              maxLength={13}
            />
          </div>
          <Button
            type="button"
            variant={codeSent ? "outline" : "default"}
            onClick={handleSendCode}
            disabled={disabled || isVerified || isSending || (countdown > 0)}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : countdown > 0 ? (
              formatTime(countdown)
            ) : codeSent ? (
              "재발송"
            ) : (
              "인증번호 받기"
            )}
          </Button>
        </div>
      </div>

      {codeSent && !isVerified && (
        <div className="space-y-2">
          <Label htmlFor="code">인증번호</Label>
          <div className="flex gap-2">
            <Input
              id="code"
              type="text"
              placeholder="6자리 인증번호"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              disabled={disabled || isVerifying}
              maxLength={6}
              className="font-mono text-center tracking-widest"
            />
            <Button
              type="button"
              onClick={handleVerifyCode}
              disabled={disabled || isVerifying || code.length !== 6}
            >
              {isVerifying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "확인"
              )}
            </Button>
          </div>
          {countdown > 0 && (
            <p className="text-sm text-gray-500">
              남은 시간: {formatTime(countdown)}
            </p>
          )}
        </div>
      )}

      {isVerified && (
        <div className="flex items-center gap-2 text-green-600">
          <Check className="h-4 w-4" />
          <span className="text-sm font-medium">인증 완료</span>
        </div>
      )}
    </div>
  );
}
