import { ErrorRequestHandler } from "express";
import { logger } from "../logger";
import { ZodError } from "zod";

/**
 * 전역 에러 핸들러 미들웨어
 *
 * 사용법:
 * server/index.ts의 마지막에 추가:
 * app.use(errorHandler);
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  logger.error("Error occurred:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    user: req.user?.id,
    timestamp: new Date().toISOString(),
  });

  if (err.code) {
    switch (err.code) {
      case "23505":
        return res.status(400).json({
          message: "이미 존재하는 데이터입니다.",
          field: err.constraint,
          detail: err.detail,
        });
      case "23503":
        return res.status(400).json({
          message: "참조된 데이터가 존재하지 않습니다.",
          detail: "연결된 데이터를 먼저 확인해주세요.",
        });
      case "23502":
        return res.status(400).json({
          message: "필수 항목이 누락되었습니다.",
          field: err.column,
        });
      case "22P02":
        return res.status(400).json({
          message: "잘못된 데이터 형식입니다.",
        });
    }
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "입력 데이터가 올바르지 않습니다.",
      errors: err.errors.map((error) => ({
        field: error.path.join("."),
        message: error.message,
        code: error.code,
      })),
    });
  }

  if (err.status === 401 || err.message === "Unauthorized") {
    return res.status(401).json({
      message: "로그인이 필요합니다.",
      redirectTo: "/login",
    });
  }

  if (err.status === 403 || err.message === "Forbidden") {
    return res.status(403).json({
      message: "접근 권한이 없습니다.",
    });
  }

  if (err.status === 404) {
    return res.status(404).json({
      message: "요청한 리소스를 찾을 수 없습니다.",
      url: req.url,
    });
  }

  if (err.status === 429) {
    return res.status(429).json({
      message: "너무 많은 요청을 보내셨습니다. 잠시 후 다시 시도해주세요.",
      retryAfter: err.retryAfter,
    });
  }

  res.status(err.status || 500).json({
    message: err.message || "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
      details: err,
    }),
  });
};

/**
 * 404 Not Found 핸들러
 *
 * 사용법:
 * 모든 라우트 정의 후, errorHandler 전에 추가:
 * app.use(notFoundHandler);
 * app.use(errorHandler);
 */
export const notFoundHandler: ErrorRequestHandler = (_req, _res, next) => {
  const error: any = new Error("Not Found");
  error.status = 404;
  next(error);
};
