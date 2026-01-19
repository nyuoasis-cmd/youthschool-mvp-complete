import { Request, Response, NextFunction } from "express";
import { USER_STATUS, users, UserType } from "@shared/models/auth";
import { db } from "../db";
import { eq } from "drizzle-orm";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      userType: UserType;
      name: string;
      phone: string;
      phoneVerified: boolean;
      emailVerified: boolean;
      status: string;
      organization?: string | null;
      position?: string | null;
      purpose?: string | null;
      additionalNotes?: string | null;
      profileImageUrl: string | null;
      lastLoginAt: Date | null;
      approvedAt?: Date | null;
      approvedBy?: number | null;
      rejectedAt?: Date | null;
      rejectedBy?: number | null;
      rejectedReason?: string | null;
      suspensionReason?: string | null;
      suspensionStartDate?: Date | null;
      suspensionEndDate?: Date | null;
      deletedAt?: Date | null;
      deletedBy?: number | null;
      deletionReason?: string | null;
      deletionType?: string | null;
      permanentDeletionDate?: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }
  }
}

/**
 * Middleware to check if user is authenticated
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    return next();
  }
  return res.status(401).json({ error: "로그인이 필요합니다" });
}

/**
 * Middleware to check if user's email is verified
 */
export function isEmailVerified(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "로그인이 필요합니다" });
  }
  if (!req.user.emailVerified) {
    return res.status(403).json({ error: "이메일 인증이 필요합니다" });
  }
  return next();
}

/**
 * Middleware to check if user account is active
 */
export function isActiveUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "로그인이 필요합니다" });
  }
  if (req.user.status === USER_STATUS.SUSPENDED) {
    if (req.user.suspensionEndDate && new Date() > req.user.suspensionEndDate) {
      db.update(users)
        .set({
          status: USER_STATUS.ACTIVE,
          suspensionReason: null,
          suspensionStartDate: null,
          suspensionEndDate: null,
        })
        .where(eq(users.id, req.user.id))
        .catch((error) => {
          console.error("Auto unsuspend error:", error);
        });
      req.user.status = USER_STATUS.ACTIVE;
    } else {
      return res.status(403).json({ error: "계정이 정지되었습니다. 관리자에게 문의해주세요" });
    }
  }
  if (req.user.status === USER_STATUS.DELETED) {
    return res.status(403).json({ error: "삭제된 계정입니다" });
  }
  if (req.user.status === USER_STATUS.PENDING) {
    return res.status(403).json({ error: "관리자 승인 대기 중입니다" });
  }
  if (req.user.status === USER_STATUS.REJECTED) {
    return res.status(403).json({ error: "가입이 반려되었습니다. 관리자에게 문의해주세요" });
  }
  return next();
}

/**
 * Middleware to check if user has specific role(s)
 */
export function hasRole(...allowedRoles: UserType[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }
    if (!allowedRoles.includes(req.user.userType as UserType)) {
      return res.status(403).json({ error: "접근 권한이 없습니다" });
    }
    return next();
  };
}

/**
 * Middleware to check if user is system admin
 */
export function isSystemAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "로그인이 필요합니다" });
  }
  if (req.user.userType !== "system_admin") {
    return res.status(403).json({ error: "시스템 관리자 권한이 필요합니다" });
  }
  return next();
}

/**
 * Combined middleware: authenticated + email verified + active
 */
export function requireFullAuth(req: Request, res: Response, next: NextFunction) {
  isAuthenticated(req, res, (err?: unknown) => {
    if (err || res.headersSent) return;
    isEmailVerified(req, res, (err?: unknown) => {
      if (err || res.headersSent) return;
      isActiveUser(req, res, next);
    });
  });
}

/**
 * Optional authentication - doesn't fail if not logged in, just sets req.user
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  // Passport already handles this - just proceed
  return next();
}
