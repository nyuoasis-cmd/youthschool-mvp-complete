import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../db";
import {
  users,
  teachers,
  instructors,
  schoolAdmins,
  userManagementLogs,
  USER_STATUS,
  USER_TYPES,
} from "@shared/models/auth";
import { hasRole, isAuthenticated } from "../auth/middleware";
import { hashPassword } from "../auth/password";
import {
  sendApprovalResultEmail,
  sendRejectionEmail,
  sendSuspensionEmail,
  sendUnsuspensionEmail,
  sendDeletionEmail,
  sendAdminPasswordResetEmail,
} from "../auth/email";
import { and, or, ilike, eq, desc, asc, sql, inArray } from "drizzle-orm";

const router = Router();

const requireAdmin = [isAuthenticated, hasRole(USER_TYPES.OPERATOR, USER_TYPES.SYSTEM_ADMIN)];

const listQuerySchema = z.object({
  status: z.string().optional(),
  userType: z.string().optional(),
  search: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sort: z.string().optional(),
  order: z.string().optional(),
});

const approveSchema = z.object({
  sendEmail: z.boolean().optional().default(true),
});

const rejectSchema = z.object({
  reason: z.string().min(1, "반려 사유를 입력해주세요"),
  sendEmail: z.boolean().optional().default(true),
});

const bulkApproveSchema = z.object({
  userIds: z.array(z.number().int().positive()).min(1),
  sendEmail: z.boolean().optional().default(true),
});

const suspendSchema = z.object({
  reason: z.string().min(1, "정지 사유를 입력해주세요"),
  durationType: z.enum(["indefinite", "period", "until_date"]).default("indefinite"),
  durationDays: z.number().int().positive().optional(),
  untilDate: z.string().optional(),
  sendEmail: z.boolean().optional().default(true),
});

const unsuspendSchema = z.object({
  reason: z.string().optional(),
  sendEmail: z.boolean().optional().default(true),
});

const deleteSchema = z.object({
  deletionType: z.enum(["soft", "hard"]).default("soft"),
  reason: z.string().min(1, "삭제 사유를 입력해주세요"),
  sendEmail: z.boolean().optional().default(true),
});

const restoreSchema = z.object({
  reason: z.string().optional(),
  sendEmail: z.boolean().optional().default(true),
});

const adminUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
  organization: z.string().max(255).optional(),
  position: z.string().max(100).optional(),
  purpose: z.string().max(50).optional(),
  status: z.enum(["active", "pending", "suspended", "deleted", "rejected"]).optional(),
});

const adminResetPasswordSchema = z.object({
  method: z.enum(["temporary", "link"]).default("temporary"),
});

function getPagination(params: z.infer<typeof listQuerySchema>) {
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(params.limit || "20", 10)));
  return { page, limit, offset: (page - 1) * limit };
}

function getSort(params: z.infer<typeof listQuerySchema>) {
  const sortKey = params.sort || "created_at";
  const orderKey = (params.order || "desc").toLowerCase();
  const sortColumn = {
    created_at: users.createdAt,
    last_login_at: users.lastLoginAt,
    name: users.name,
    email: users.email,
  }[sortKey] || users.createdAt;
  return orderKey === "asc" ? asc(sortColumn) : desc(sortColumn);
}

router.get("/users", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const parseResult = listQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({ error: "잘못된 요청입니다" });
    }

    const params = parseResult.data;
    const { page, limit, offset } = getPagination(params);
    const orderBy = getSort(params);

    const conditions = [];
    if (params.status) {
      conditions.push(eq(users.status, params.status));
    }
    if (params.userType) {
      conditions.push(eq(users.userType, params.userType));
    }
    if (params.search) {
      const keyword = `%${params.search}%`;
      conditions.push(
        or(
          ilike(users.name, keyword),
          ilike(users.email, keyword),
          ilike(teachers.schoolName, keyword),
          ilike(schoolAdmins.schoolName, keyword),
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .leftJoin(teachers, eq(teachers.userId, users.id))
      .leftJoin(schoolAdmins, eq(schoolAdmins.userId, users.id))
      .where(whereClause);
    const totalCount = Number(countRow?.count || 0);

    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        userType: users.userType,
        status: users.status,
        phone: users.phone,
        emailVerified: users.emailVerified,
        phoneVerified: users.phoneVerified,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        approvedAt: users.approvedAt,
        approvedBy: users.approvedBy,
        rejectedAt: users.rejectedAt,
        rejectedReason: users.rejectedReason,
        suspensionReason: users.suspensionReason,
        suspensionStartDate: users.suspensionStartDate,
        suspensionEndDate: users.suspensionEndDate,
        deletedAt: users.deletedAt,
        deletionReason: users.deletionReason,
        deletionType: users.deletionType,
        organization: sql<string>`coalesce(${teachers.schoolName}, ${schoolAdmins.schoolName})`,
        position: sql<string>`coalesce(${schoolAdmins.position}, ${users.position})`,
        department: teachers.department,
        subject: teachers.subject,
        specialties: instructors.specialties,
      })
      .from(users)
      .leftJoin(teachers, eq(teachers.userId, users.id))
      .leftJoin(instructors, eq(instructors.userId, users.id))
      .leftJoin(schoolAdmins, eq(schoolAdmins.userId, users.id))
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const usersWithParsed = rows.map((row) => ({
      ...row,
      specialties: row.specialties ? JSON.parse(row.specialties) : [],
    }));

    res.json({
      success: true,
      data: {
        users: usersWithParsed,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          limit,
        },
      },
    });
  } catch (error) {
    console.error("Admin users list error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

router.get("/users/stats", ...requireAdmin, async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        status: users.status,
        count: sql<number>`count(*)`,
      })
      .from(users)
      .groupBy(users.status);

    const stats = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = Number(row.count);
      return acc;
    }, {});

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error("Admin user stats error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

router.post("/users/:id/approve", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const result = approveSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "잘못된 요청입니다" });
    }

    const [targetUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!targetUser) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
    }

    await db.update(users)
      .set({
        status: USER_STATUS.ACTIVE,
        approvedAt: new Date(),
        approvedBy: req.user!.id,
        rejectedAt: null,
        rejectedBy: null,
        rejectedReason: null,
        suspensionReason: null,
        suspensionStartDate: null,
        suspensionEndDate: null,
      })
      .where(eq(users.id, userId));

    await db.insert(userManagementLogs).values({
      userId,
      actionType: "approve",
      actionBy: req.user!.id,
      reason: null,
      details: { sendEmail: result.data.sendEmail },
    });

    if (result.data.sendEmail) {
      await sendApprovalResultEmail(targetUser.email, targetUser.name, true);
    }

    res.json({ success: true, message: "회원 승인이 완료되었습니다." });
  } catch (error) {
    console.error("Admin approve error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

router.post("/users/approve-bulk", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = bulkApproveSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "잘못된 요청입니다" });
    }

    const userIds = result.data.userIds;
    const approvedAt = new Date();

    await db.update(users)
      .set({
        status: USER_STATUS.ACTIVE,
        approvedAt,
        approvedBy: req.user!.id,
        rejectedAt: null,
        rejectedBy: null,
        rejectedReason: null,
        suspensionReason: null,
        suspensionStartDate: null,
        suspensionEndDate: null,
      })
      .where(inArray(users.id, userIds));

    const targets = await db.select().from(users).where(inArray(users.id, userIds));
    await db.insert(userManagementLogs).values(
      targets.map((user) => ({
        userId: user.id,
        actionType: "approve",
        actionBy: req.user!.id,
        reason: null,
        details: { sendEmail: result.data.sendEmail, bulk: true },
      }))
    );

    if (result.data.sendEmail) {
      await Promise.all(
        targets.map((user) => sendApprovalResultEmail(user.email, user.name, true))
      );
    }

    res.json({ success: true, message: "일괄 승인이 완료되었습니다." });
  } catch (error) {
    console.error("Admin bulk approve error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

router.post("/users/:id/reject", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const result = rejectSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const [targetUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!targetUser) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
    }

    await db.update(users)
      .set({
        status: USER_STATUS.REJECTED,
        rejectedAt: new Date(),
        rejectedBy: req.user!.id,
        rejectedReason: result.data.reason,
      })
      .where(eq(users.id, userId));

    await db.insert(userManagementLogs).values({
      userId,
      actionType: "reject",
      actionBy: req.user!.id,
      reason: result.data.reason,
      details: { sendEmail: result.data.sendEmail },
    });

    if (result.data.sendEmail) {
      await sendRejectionEmail(targetUser.email, targetUser.name, result.data.reason);
    }

    res.json({ success: true, message: "회원 반려 처리가 완료되었습니다." });
  } catch (error) {
    console.error("Admin reject error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

router.post("/users/:id/suspend", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const result = suspendSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const [targetUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!targetUser) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
    }

    const now = new Date();
    let endDate: Date | null = null;
    if (result.data.durationType === "period") {
      const days = result.data.durationDays || 1;
      endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    } else if (result.data.durationType === "until_date" && result.data.untilDate) {
      endDate = new Date(result.data.untilDate);
    }

    await db.update(users)
      .set({
        status: USER_STATUS.SUSPENDED,
        suspensionReason: result.data.reason,
        suspensionStartDate: now,
        suspensionEndDate: endDate,
      })
      .where(eq(users.id, userId));

    await db.insert(userManagementLogs).values({
      userId,
      actionType: "suspend",
      actionBy: req.user!.id,
      reason: result.data.reason,
      details: {
        durationType: result.data.durationType,
        durationDays: result.data.durationDays,
        untilDate: result.data.untilDate,
        sendEmail: result.data.sendEmail,
      },
    });

    if (result.data.sendEmail) {
      await sendSuspensionEmail(targetUser.email, targetUser.name, result.data.reason, now, endDate);
    }

    res.json({ success: true, message: "회원 정지 처리가 완료되었습니다." });
  } catch (error) {
    console.error("Admin suspend error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

router.post("/users/:id/unsuspend", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const result = unsuspendSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "잘못된 요청입니다" });
    }

    const [targetUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!targetUser) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
    }

    await db.update(users)
      .set({
        status: USER_STATUS.ACTIVE,
        suspensionReason: null,
        suspensionStartDate: null,
        suspensionEndDate: null,
      })
      .where(eq(users.id, userId));

    await db.insert(userManagementLogs).values({
      userId,
      actionType: "unsuspend",
      actionBy: req.user!.id,
      reason: result.data.reason || null,
      details: { sendEmail: result.data.sendEmail },
    });

    if (result.data.sendEmail) {
      await sendUnsuspensionEmail(targetUser.email, targetUser.name);
    }

    res.json({ success: true, message: "정지 해제가 완료되었습니다." });
  } catch (error) {
    console.error("Admin unsuspend error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

router.delete("/users/:id", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const result = deleteSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    if (req.user!.id === userId) {
      return res.status(400).json({ error: "자기 자신은 삭제할 수 없습니다" });
    }

    const [targetUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!targetUser) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
    }

    const now = new Date();
    const permanentDeletionDate = result.data.deletionType === "soft"
      ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      : null;

    if (result.data.deletionType === "hard") {
      await db.insert(userManagementLogs).values({
        userId,
        actionType: "delete",
        actionBy: req.user!.id,
        reason: result.data.reason,
        details: { deletionType: "hard" },
      });

      await db.delete(users).where(eq(users.id, userId));
    } else {
      await db.update(users)
        .set({
          status: USER_STATUS.DELETED,
          deletedAt: now,
          deletedBy: req.user!.id,
          deletionReason: result.data.reason,
          deletionType: result.data.deletionType,
          permanentDeletionDate,
        })
        .where(eq(users.id, userId));

      await db.insert(userManagementLogs).values({
        userId,
        actionType: "delete",
        actionBy: req.user!.id,
        reason: result.data.reason,
        details: { deletionType: result.data.deletionType },
      });
    }

    if (result.data.sendEmail) {
      await sendDeletionEmail(
        targetUser.email,
        targetUser.name,
        result.data.reason,
        result.data.deletionType,
        permanentDeletionDate
      );
    }

    res.json({ success: true, message: "회원 삭제 처리가 완료되었습니다." });
  } catch (error) {
    console.error("Admin delete error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

router.post("/users/:id/restore", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const result = restoreSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "잘못된 요청입니다" });
    }

    const [targetUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!targetUser) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
    }

    await db.update(users)
      .set({
        status: USER_STATUS.ACTIVE,
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
        deletionType: null,
        permanentDeletionDate: null,
      })
      .where(eq(users.id, userId));

    await db.insert(userManagementLogs).values({
      userId,
      actionType: "restore",
      actionBy: req.user!.id,
      reason: result.data.reason || null,
      details: { sendEmail: result.data.sendEmail },
    });

    if (result.data.sendEmail) {
      await sendUnsuspensionEmail(targetUser.email, targetUser.name);
    }

    res.json({ success: true, message: "회원 복구가 완료되었습니다." });
  } catch (error) {
    console.error("Admin restore error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

router.patch("/users/:id", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const result = adminUpdateSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    await db.update(users)
      .set({
        ...result.data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await db.insert(userManagementLogs).values({
      userId,
      actionType: "update",
      actionBy: req.user!.id,
      reason: null,
      details: result.data,
    });

    res.json({ success: true, message: "회원 정보가 수정되었습니다." });
  } catch (error) {
    console.error("Admin update error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

router.post("/users/:id/password-reset", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const result = adminResetPasswordSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "잘못된 요청입니다" });
    }

    const [targetUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!targetUser) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
    }

    if (result.data.method === "temporary") {
      const tempPassword = `YS-${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}!`;
      const hashedPassword = await hashPassword(tempPassword);
      await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, userId));

      await db.insert(userManagementLogs).values({
        userId,
        actionType: "password_reset",
        actionBy: req.user!.id,
        reason: "temporary_password",
        details: { method: "temporary" },
      });

      await sendAdminPasswordResetEmail(targetUser.email, targetUser.name, tempPassword);

      res.json({ success: true, message: "임시 비밀번호가 발급되었습니다." });
      return;
    }

    res.status(400).json({ error: "링크 방식은 아직 지원되지 않습니다" });
  } catch (error) {
    console.error("Admin password reset error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

router.get("/users/:id/logs", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const logs = await db
      .select()
      .from(userManagementLogs)
      .where(eq(userManagementLogs.userId, userId))
      .orderBy(desc(userManagementLogs.actionAt));

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error("Admin log fetch error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

// Token usage statistics (placeholder - connect to actual logging later)
router.get("/token-usage", ...requireAdmin, async (_req: Request, res: Response) => {
  try {
    // TODO: Connect to actual usage tracking once implemented
    // For now, return placeholder data structure
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Placeholder data - in production, query from a usage_logs table
    res.json({
      success: true,
      data: {
        today: {
          requests: 0,
          estimatedCost: 0,
        },
        thisWeek: {
          requests: 0,
          estimatedCost: 0,
        },
        thisMonth: {
          requests: 0,
          estimatedCost: 0,
        },
        byEndpoint: {},
        // Rate limit info
        rateLimits: {
          aiGenerate: { perMinute: 5, perHour: 50, perDay: 200 },
          chat: { perMinute: 10, perHour: 100, perDay: 200 },
        },
        note: "실제 사용량은 OpenAI 대시보드에서 확인하세요: https://platform.openai.com/usage",
      },
    });
  } catch (error) {
    console.error("Token usage error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

export { router as adminRouter };
