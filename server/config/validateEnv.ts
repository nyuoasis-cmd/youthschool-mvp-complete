/**
 * 환경변수 유효성 검사
 *
 * 서버 시작 시 필수 환경변수를 체크합니다.
 */

interface EnvConfig {
  DATABASE_URL: string;
  SESSION_SECRET: string;
  ANTHROPIC_API_KEY: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  BASE_URL?: string;
  NODE_ENV: string;
  PORT: string;
}

const requiredEnvVars = [
  "DATABASE_URL",
  "SESSION_SECRET",
  "ANTHROPIC_API_KEY",
] as const;

const optionalEnvVars = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "BASE_URL",
  "OPENAI_API_KEY",
  "EMAIL_VERIFICATION_ENABLED",
] as const;

export function validateEnv(): EnvConfig {
  const missing: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `❌ 필수 환경변수가 설정되지 않았습니다:\n` +
      missing.map((variable) => `  - ${variable}`).join("\n") +
      `\n\n.env 파일을 확인하거나 .env.example을 참고하세요.`
    );
  }

  if (process.env.SESSION_SECRET!.length < 32) {
    console.warn(
      "⚠️  경고: SESSION_SECRET이 너무 짧습니다. " +
      "보안을 위해 최소 32자 이상의 랜덤 문자열을 사용하세요."
    );
  }

  const emailVars = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];
  const hasEmailConfig = emailVars.every((variable) => process.env[variable]);

  if (!hasEmailConfig) {
    console.warn(
      "⚠️  경고: 이메일 설정이 완료되지 않았습니다. " +
      "회원 승인 알림 등 이메일 기능이 작동하지 않습니다."
    );
  }

  for (const variable of optionalEnvVars) {
    if (!process.env[variable]) {
      continue;
    }
  }

  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    SESSION_SECRET: process.env.SESSION_SECRET!,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    BASE_URL: process.env.BASE_URL || "http://localhost:5000",
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: process.env.PORT || "5000",
  };
}

// server/index.ts의 최상단에서 호출 예시:
// import { validateEnv } from "./config/validateEnv";
// const env = validateEnv();
