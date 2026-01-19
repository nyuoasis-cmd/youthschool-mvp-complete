import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User, UserType } from "@shared/models/auth";

interface AuthUser {
  id: number;
  email: string;
  name: string;
  userType: UserType;
  phone: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  status: string;
  profileImageUrl?: string;
  createdAt: string;
}

async function fetchUser(): Promise<AuthUser | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function logout(): Promise<void> {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("로그아웃에 실패했습니다");
  }
}

interface LoginInput {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface RegisterPayload {
  userType: UserType | string;
  step1: Record<string, unknown>;
  step2: Record<string, unknown>;
  terms: Record<string, unknown>;
}

interface RegisterResult {
  success: boolean;
  message: string;
  userId: number;
  userType: UserType;
  email: string;
}

interface PasswordResetRequest {
  email: string;
}

interface PasswordResetPayload {
  token: string;
  password: string;
}

interface PasswordResetResponse {
  success: boolean;
  message: string;
}

interface ResendVerificationPayload {
  email: string;
}

interface ResendVerificationResponse {
  success: boolean;
  message: string;
}

interface ValidateResetTokenResponse {
  valid: boolean;
}

async function login(data: LoginInput): Promise<AuthUser> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });

  if (!response.ok) {
    const result = await response.json();
    throw new Error(result.error || "로그인에 실패했습니다");
  }

  const result = await response.json();
  return result.user;
}

async function register(payload: RegisterPayload): Promise<RegisterResult> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "회원가입에 실패했습니다");
  }

  return result;
}

async function requestPasswordReset(payload: PasswordResetRequest): Promise<PasswordResetResponse> {
  const response = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "요청에 실패했습니다");
  }

  return result;
}

async function resetPassword(payload: PasswordResetPayload): Promise<PasswordResetResponse> {
  const response = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "비밀번호 재설정에 실패했습니다");
  }

  return result;
}

async function resendVerification(payload: ResendVerificationPayload): Promise<ResendVerificationResponse> {
  const response = await fetch("/api/auth/resend-verification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "요청에 실패했습니다");
  }

  return result;
}

async function validateResetToken(token: string): Promise<ValidateResetTokenResponse> {
  const response = await fetch(`/api/auth/validate-reset-token?token=${encodeURIComponent(token)}`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "토큰 확인에 실패했습니다");
  }

  return result;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading, error } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/user"], user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.clear();
    },
  });

  const registerMutation = useMutation({
    mutationFn: register,
  });

  const requestPasswordResetMutation = useMutation({
    mutationFn: requestPasswordReset,
  });

  const resetPasswordMutation = useMutation({
    mutationFn: resetPassword,
  });

  const resendVerificationMutation = useMutation({
    mutationFn: resendVerification,
  });

  const validateResetTokenMutation = useMutation({
    mutationFn: validateResetToken,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    userType: user?.userType || null,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    loginError: loginMutation.error,
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    requestPasswordReset: requestPasswordResetMutation.mutateAsync,
    isRequestingPasswordReset: requestPasswordResetMutation.isPending,
    resetPassword: resetPasswordMutation.mutateAsync,
    isResettingPassword: resetPasswordMutation.isPending,
    resendVerification: resendVerificationMutation.mutateAsync,
    isResendingVerification: resendVerificationMutation.isPending,
    validateResetToken: validateResetTokenMutation.mutateAsync,
  };
}
