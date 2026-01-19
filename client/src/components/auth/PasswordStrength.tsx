import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

interface Requirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: Requirement[] = [
  { label: "8자 이상", test: (p) => p.length >= 8 },
  { label: "영문 포함", test: (p) => /[a-zA-Z]/.test(p) },
  { label: "숫자 포함", test: (p) => /[0-9]/.test(p) },
  { label: "특수문자 포함", test: (p) => /[^a-zA-Z0-9]/.test(p) },
];

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const passedCount = requirements.filter((req) => req.test(password)).length;

  const getStrengthColor = () => {
    if (passedCount === 0) return "bg-gray-200";
    if (passedCount === 1) return "bg-red-500";
    if (passedCount === 2) return "bg-orange-500";
    if (passedCount === 3) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStrengthText = () => {
    if (passedCount === 0) return "";
    if (passedCount === 1) return "매우 약함";
    if (passedCount === 2) return "약함";
    if (passedCount === 3) return "보통";
    return "강함";
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Strength bar */}
      {password.length > 0 && (
        <div className="space-y-1">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  level <= passedCount ? getStrengthColor() : "bg-gray-200"
                )}
              />
            ))}
          </div>
          <p
            className={cn(
              "text-xs font-medium",
              passedCount <= 1
                ? "text-red-600"
                : passedCount === 2
                ? "text-orange-600"
                : passedCount === 3
                ? "text-yellow-600"
                : "text-green-600"
            )}
          >
            {getStrengthText()}
          </p>
        </div>
      )}

      {/* Requirements list */}
      <ul className="space-y-1">
        {requirements.map((req, index) => {
          const passed = req.test(password);
          return (
            <li
              key={index}
              className={cn(
                "flex items-center gap-2 text-sm transition-colors",
                password.length === 0
                  ? "text-gray-400"
                  : passed
                  ? "text-green-600"
                  : "text-gray-400"
              )}
            >
              {passed ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
              <span>{req.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function isPasswordValid(password: string): boolean {
  return requirements.every((req) => req.test(password));
}
