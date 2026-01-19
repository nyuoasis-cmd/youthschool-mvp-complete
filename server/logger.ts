import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";

// 로그 디렉토리 설정
const logDir = path.join(process.cwd(), "logs");

// 로그 포맷 정의
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} ${level.toUpperCase()}`;

    // 메타데이터가 있으면 추가
    if (Object.keys(meta).length > 0) {
      const metaStr = Object.entries(meta)
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(" ");
      log += ` ${metaStr}`;
    }

    log += ` ${message}`;

    // 스택 트레이스가 있으면 추가
    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  })
);

// 콘솔용 컬러 포맷
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  logFormat
);

// 에러 로그 파일 (일별 로테이션)
const errorFileTransport = new DailyRotateFile({
  dirname: logDir,
  filename: "error-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  level: "error",
  maxSize: "20m",
  maxFiles: "14d", // 14일간 보관
  format: logFormat,
});

// 전체 로그 파일 (일별 로테이션)
const combinedFileTransport = new DailyRotateFile({
  dirname: logDir,
  filename: "combined-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "7d", // 7일간 보관
  format: logFormat,
});

// 로거 생성
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  transports: [
    errorFileTransport,
    combinedFileTransport,
  ],
});

// 개발 환경에서는 콘솔에도 출력
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// HTTP 요청 로깅 헬퍼
export function logRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  requestId?: string,
  body?: Record<string, any>
) {
  const meta: Record<string, any> = {
    method,
    path,
    status: statusCode,
    duration: `${durationMs}ms`,
  };

  if (requestId) meta.request_id = requestId;
  if (body && statusCode >= 400) {
    // 에러 응답일 때만 body 로깅 (비밀번호 등 민감정보 제외)
    const sanitizedBody = { ...body };
    delete sanitizedBody.password;
    delete sanitizedBody.token;
    meta.response = sanitizedBody;
  }

  if (statusCode >= 500) {
    logger.error("Server error", meta);
  } else if (statusCode >= 400) {
    logger.warn("Client error", meta);
  } else {
    logger.info("Request completed", meta);
  }
}

// 에러 로깅 헬퍼
export function logError(
  error: Error,
  context?: Record<string, any>
) {
  logger.error(error.message, {
    ...context,
    stack: error.stack,
    name: error.name,
  });
}

// 인증 관련 로깅
export function logAuth(
  action: string,
  email: string,
  success: boolean,
  reason?: string
) {
  const meta = {
    action,
    email: maskEmail(email),
    success,
    reason,
  };

  if (success) {
    logger.info("Auth action", meta);
  } else {
    logger.warn("Auth action failed", meta);
  }
}

// 이메일 마스킹 (개인정보 보호)
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const maskedLocal = local.length > 2
    ? local[0] + "*".repeat(local.length - 2) + local[local.length - 1]
    : "**";
  return `${maskedLocal}@${domain}`;
}

export default logger;
