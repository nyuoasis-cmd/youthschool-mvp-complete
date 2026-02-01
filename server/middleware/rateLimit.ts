import rateLimit from "express-rate-limit";
import { Request, Response } from "express";

// 사용자 식별 함수 (로그인 사용자는 ID, 비로그인은 IP)
const keyGenerator = (req: Request): string => {
  if (req.user?.id) {
    return `user_${req.user.id}`;
  }
  // IPv6 주소 정규화 처리
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  // ::ffff:127.0.0.1 형태의 IPv4-mapped IPv6 주소 처리
  if (ip.startsWith("::ffff:")) {
    return ip.substring(7);
  }
  return ip;
};

// 제한 초과 시 응답 메시지
const createLimitHandler = (type: string) => (req: Request, res: Response) => {
  res.status(429).json({
    error: "요청 한도를 초과했습니다",
    message: `${type} 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.`,
    retryAfter: res.getHeader("Retry-After"),
  });
};

// 공통 옵션: IPv6 관련 경고 비활성화
const commonOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  validate: false as const,
};

/**
 * AI 채팅 API Rate Limit
 * - 사용자당 분당 10회
 * - 시간당 100회
 */
export const chatRateLimit = rateLimit({
  ...commonOptions,
  windowMs: 60 * 1000, // 1분
  max: 10, // 분당 10회
  keyGenerator,
  handler: createLimitHandler("AI 채팅"),
  message: { error: "AI 채팅 요청 한도 초과 (분당 10회)" },
});

export const chatHourlyLimit = rateLimit({
  ...commonOptions,
  windowMs: 60 * 60 * 1000, // 1시간
  max: 100, // 시간당 100회
  keyGenerator,
  handler: createLimitHandler("AI 채팅"),
  message: { error: "AI 채팅 요청 한도 초과 (시간당 100회)" },
});

/**
 * AI 문서 생성 API Rate Limit
 * - 사용자당 분당 5회
 * - 시간당 50회
 */
export const aiGenerateRateLimit = rateLimit({
  ...commonOptions,
  windowMs: 60 * 1000, // 1분
  max: 5, // 분당 5회
  keyGenerator,
  handler: createLimitHandler("AI 문서 생성"),
  message: { error: "AI 문서 생성 요청 한도 초과 (분당 5회)" },
});

export const aiGenerateHourlyLimit = rateLimit({
  ...commonOptions,
  windowMs: 60 * 60 * 1000, // 1시간
  max: 50, // 시간당 50회
  keyGenerator,
  handler: createLimitHandler("AI 문서 생성"),
  message: { error: "AI 문서 생성 요청 한도 초과 (시간당 50회)" },
});

/**
 * 일반 API Rate Limit
 * - IP당 분당 100회
 */
export const generalRateLimit = rateLimit({
  ...commonOptions,
  windowMs: 60 * 1000, // 1분
  max: 100, // 분당 100회
  keyGenerator,
  handler: createLimitHandler("API"),
  message: { error: "API 요청 한도 초과 (분당 100회)" },
});

/**
 * 로그인 Rate Limit (브루트포스 방지)
 * - IP당 15분에 5회
 */
export const loginRateLimit = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000, // 15분
  max: 5, // 15분에 5회
  keyGenerator: (req) => {
    const ip = req.ip || "unknown";
    return ip.startsWith("::ffff:") ? ip.substring(7) : ip;
  },
  handler: createLimitHandler("로그인"),
  message: { error: "로그인 시도 횟수 초과. 15분 후 다시 시도해주세요." },
});

/**
 * 일일 AI 사용량 제한 (비용 관리용)
 * - 사용자당 하루 200회
 */
export const dailyAiLimit = rateLimit({
  ...commonOptions,
  windowMs: 24 * 60 * 60 * 1000, // 24시간
  max: 200, // 하루 200회
  keyGenerator,
  handler: createLimitHandler("일일 AI"),
  message: { error: "일일 AI 사용 한도 초과 (하루 200회)" },
});
