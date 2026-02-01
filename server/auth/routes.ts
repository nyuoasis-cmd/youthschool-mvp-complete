import { Router, Request, Response } from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { db } from "../db";
import {
  users, teachers, instructors, schoolAdmins,
  emailVerifications, passwordResets, phoneVerifications,
  User, UserType, USER_STATUS,
  loginSchema, checkEmailSchema,
  phoneVerificationRequestSchema, phoneVerificationConfirmSchema,
  forgotPasswordSchema, resetPasswordSchema, changePasswordSchema,
  updateProfileSchema, deleteAccountSchema,
  teacherRegisterSchema, instructorRegisterSchema, schoolAdminRegisterSchema, operatorRegisterSchema,
  operatorCreateSchema
} from "@shared/models/auth";
import { eq, and, gt, lt, sql } from "drizzle-orm";
import { hashPassword, verifyPassword } from "./password";
import {
  generateToken, generatePhoneCode,
  getEmailVerificationExpiry, getPasswordResetExpiry, getPhoneCodeExpiry,
  isExpired, sendVerificationSMS, maskEmail
} from "./verification";
import { sendVerificationEmail, sendPasswordResetEmail } from "./email";
import { isAuthenticated, requireFullAuth, isSystemAdmin, hasRole } from "./middleware";
import { USER_TYPES, staff, teachers } from "@shared/models/auth";
import { IS_EMAIL_VERIFICATION_ENABLED } from "../config/featureFlags";
import { getKakaoAuthUrl, getKakaoToken, getKakaoUserInfo, extractKakaoUserData } from "./kakao";

const router = Router();

// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

// ============================================
// Passport Configuration
// ============================================

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);

        if (!user) {
          return done(null, false, { message: "이메일 또는 비밀번호가 일치하지 않습니다" });
        }

        // Check if account is locked
        if (user.lockedUntil && new Date() < user.lockedUntil) {
          const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
          return done(null, false, { message: `로그인이 ${remainingMinutes}분간 차단되었습니다` });
        }

        // Verify password
        const isValid = await verifyPassword(password, user.password);
        if (!isValid) {
          // Increment login attempts
          const newAttempts = user.loginAttempts + 1;
          const updateData: Partial<User> = { loginAttempts: newAttempts };

          if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
            const lockUntil = new Date();
            lockUntil.setMinutes(lockUntil.getMinutes() + LOCKOUT_DURATION_MINUTES);
            updateData.lockedUntil = lockUntil;
          }

          await db.update(users).set(updateData).where(eq(users.id, user.id));

          if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
            return done(null, false, { message: `5회 로그인 실패로 ${LOCKOUT_DURATION_MINUTES}분간 로그인이 차단되었습니다` });
          }

          return done(null, false, { message: "이메일 또는 비밀번호가 일치하지 않습니다" });
        }

        // Check account status
        if (IS_EMAIL_VERIFICATION_ENABLED && !user.emailVerified) {
          return done(null, false, { message: "이메일 인증이 완료되지 않았습니다. 인증 메일을 확인해주세요" });
        }

        if (user.status === USER_STATUS.SUSPENDED) {
          if (user.suspensionEndDate && new Date() > user.suspensionEndDate) {
            await db.update(users).set({
              status: USER_STATUS.ACTIVE,
              suspensionReason: null,
              suspensionStartDate: null,
              suspensionEndDate: null,
            }).where(eq(users.id, user.id));
          } else {
            return done(null, false, { message: "계정이 정지되었습니다. 관리자에게 문의해주세요" });
          }
        }

        if (user.status === USER_STATUS.DELETED) {
          return done(null, false, { message: "삭제된 계정입니다" });
        }

        if (user.status === USER_STATUS.PENDING) {
          return done(null, false, { message: "관리자 승인 대기 중입니다. 승인 후 이용 가능합니다" });
        }

        if (user.status === USER_STATUS.REJECTED) {
          return done(null, false, { message: "가입이 반려되었습니다. 이메일을 확인해주세요" });
        }

        // Reset login attempts and update last login
        await db.update(users).set({
          loginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
        }).where(eq(users.id, user.id));

        // Return user without password
        const { password: _, ...userWithoutPassword } = user;
        return done(null, userWithoutPassword as Express.User);
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      done(null, userWithoutPassword as Express.User);
    } else {
      done(null, false);
    }
  } catch (error) {
    done(error);
  }
});

// ============================================
// Auth Routes
// ============================================

/**
 * POST /api/auth/check-email
 * Check if email is already registered
 */
router.post("/check-email", async (req: Request, res: Response) => {
  try {
    const result = checkEmailSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { email } = result.data;
    const [existing] = await db
      .select({ id: users.id, authProvider: users.authProvider })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existing) {
      res.json({
        available: false,
        authProvider: existing.authProvider || "email"
      });
    } else {
      res.json({ available: true });
    }
  } catch (error) {
    console.error("Check email error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

/**
 * POST /api/auth/send-phone-code
 * Send SMS verification code
 */
router.post("/send-phone-code", async (req: Request, res: Response) => {
  try {
    const result = phoneVerificationRequestSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { phone } = result.data;

    // Check for recent verification attempts (rate limiting)
    const recentVerifications = await db
      .select()
      .from(phoneVerifications)
      .where(
        and(
          eq(phoneVerifications.phone, phone),
          gt(phoneVerifications.createdAt, new Date(Date.now() - 60000)) // Within last minute
        )
      )
      .limit(1);

    if (recentVerifications.length > 0) {
      return res.status(429).json({ error: "1분 후에 다시 시도해주세요" });
    }

    // Generate and store code
    const code = generatePhoneCode();
    const expiresAt = getPhoneCodeExpiry();

    await db.insert(phoneVerifications).values({
      phone,
      code,
      expiresAt,
    });

    // Send SMS (mock in development)
    await sendVerificationSMS(phone, code);

    res.json({ success: true, message: "인증번호가 발송되었습니다" });
  } catch (error) {
    console.error("Send phone code error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

/**
 * POST /api/auth/verify-phone
 * Verify phone number with SMS code
 */
router.post("/verify-phone", async (req: Request, res: Response) => {
  try {
    const result = phoneVerificationConfirmSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { phone, code } = result.data;

    // Find the most recent verification for this phone
    const [verification] = await db
      .select()
      .from(phoneVerifications)
      .where(
        and(
          eq(phoneVerifications.phone, phone),
          eq(phoneVerifications.verified, false),
          gt(phoneVerifications.expiresAt, new Date())
        )
      )
      .orderBy(phoneVerifications.createdAt)
      .limit(1);

    if (!verification) {
      return res.status(400).json({ error: "인증번호가 만료되었습니다. 다시 요청해주세요" });
    }

    // Check attempts
    if (verification.attempts >= 3) {
      return res.status(400).json({ error: "인증 시도 횟수를 초과했습니다. 다시 요청해주세요" });
    }

    // Verify code
    if (verification.code !== code) {
      await db.update(phoneVerifications)
        .set({ attempts: verification.attempts + 1 })
        .where(eq(phoneVerifications.id, verification.id));
      return res.status(400).json({ error: "인증번호가 일치하지 않습니다" });
    }

    // Mark as verified
    await db.update(phoneVerifications)
      .set({ verified: true })
      .where(eq(phoneVerifications.id, verification.id));

    res.json({ success: true, message: "인증이 완료되었습니다" });
  } catch (error) {
    console.error("Verify phone error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { userType } = req.body;

    // Validate based on user type
    let validationResult;
    if (userType === "teacher") {
      validationResult = teacherRegisterSchema.safeParse(req.body);
    } else if (userType === "instructor") {
      validationResult = instructorRegisterSchema.safeParse(req.body);
    } else if (userType === "school_admin") {
      validationResult = schoolAdminRegisterSchema.safeParse(req.body);
    } else if (userType === "operator") {
      validationResult = operatorRegisterSchema.safeParse(req.body);
    } else {
      return res.status(400).json({ error: "올바르지 않은 사용자 유형입니다" });
    }

    if (!validationResult.success) {
      return res.status(400).json({
        error: validationResult.error.errors[0].message,
        errors: validationResult.error.errors
      });
    }

    const data = validationResult.data;
    const step1 = data.step1;
    const terms = data.terms;
    const step2 = "step2" in data ? data.step2 : null;

    // Check email availability
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, step1.email.toLowerCase()))
      .limit(1);

    if (existing) {
      return res.status(400).json({ error: "이미 사용 중인 이메일입니다" });
    }

    // Hash password
    const hashedPassword = await hashPassword(step1.password);

    // Determine initial status
    const initialStatus = USER_STATUS.PENDING;

    // Create user
    const organization = userType === "teacher"
      ? (step2 as { schoolName?: string } | null)?.schoolName
      : userType === "school_admin"
        ? (step2 as { schoolName?: string } | null)?.schoolName
        : undefined;
    const position = userType === "school_admin"
      ? (step2 as { position?: string } | null)?.position
      : undefined;

    const [newUser] = (await db.insert(users).values({
      email: step1.email.toLowerCase(),
      password: hashedPassword,
      userType: userType as UserType,
      name: step1.name,
      phone: step1.phone || "",
      phoneVerified: false,
      emailVerified: IS_EMAIL_VERIFICATION_ENABLED ? false : true,
      status: initialStatus,
      organization: organization || null,
      position: position || null,
    }).returning()) as Array<typeof users.$inferSelect>;

    // Create type-specific record
    if (userType === "teacher") {
      const teacherStep2 = step2 as { schoolName: string; schoolAddress: string; subject?: string; department?: string };
      await db.insert(teachers).values({
        userId: newUser.id,
        schoolName: teacherStep2.schoolName,
        schoolAddress: teacherStep2.schoolAddress,
        subject: teacherStep2.subject || null,
        department: teacherStep2.department || null,
      });
    } else if (userType === "instructor") {
      const instructorStep2 = step2 as { specialties: string[]; careerYears?: number; introduction?: string };
      await db.insert(instructors).values({
        userId: newUser.id,
        specialties: JSON.stringify(instructorStep2.specialties),
        careerYears: instructorStep2.careerYears || null,
        introduction: instructorStep2.introduction || null,
      });
    } else if (userType === "school_admin") {
      const adminStep2 = step2 as { schoolName: string; schoolAddress: string; position: string; department: string };
      // For school admin, approvalFile should be handled via file upload
      await db.insert(schoolAdmins).values({
        userId: newUser.id,
        schoolName: adminStep2.schoolName,
        schoolAddress: adminStep2.schoolAddress,
        position: adminStep2.position,
        department: adminStep2.department,
        approvalFile: req.body.approvalFile || "pending", // Placeholder
      });
    }

    if (IS_EMAIL_VERIFICATION_ENABLED) {
      // Generate email verification token
      const token = generateToken();
      const expiresAt = getEmailVerificationExpiry();

      await db.insert(emailVerifications).values({
        userId: newUser.id,
        token,
        expiresAt,
      });

      // Send verification email
      await sendVerificationEmail(newUser.email, token, newUser.name);
    }

    res.status(201).json({
      success: true,
      message: IS_EMAIL_VERIFICATION_ENABLED
        ? "회원가입이 완료되었습니다. 이메일을 확인해주세요."
        : "회원가입이 완료되었습니다. 관리자 승인 후 서비스를 이용하실 수 있습니다.",
      userId: newUser.id,
      userType: newUser.userType,
      email: maskEmail(newUser.email),
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

/**
 * POST /api/auth/operators
 * Create operator account (operator/system admin only)
 * First operator can be created without authentication
 */
router.post("/operators", async (req: Request, res: Response) => {
  try {
    // Check if any operator exists
    const [{ count: operatorCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.userType, USER_TYPES.OPERATOR));

    // If operators exist, require authentication
    if (Number(operatorCount) > 0) {
      if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "로그인이 필요합니다" });
      }

      const requesterType = req.user.userType;
      const isPrivileged = requesterType === USER_TYPES.OPERATOR || requesterType === USER_TYPES.SYSTEM_ADMIN;

      if (!isPrivileged) {
        return res.status(403).json({ error: "접근 권한이 없습니다" });
      }
    }

    const validationResult = operatorCreateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: validationResult.error.errors[0].message,
        errors: validationResult.error.errors,
      });
    }

    const { email, password, name, phone } = validationResult.data;

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existing) {
      return res.status(400).json({ error: "이미 사용 중인 이메일입니다" });
    }

    const hashedPassword = await hashPassword(password);

    const [newUser] = (await db.insert(users).values({
      email: email.toLowerCase(),
      password: hashedPassword,
      userType: USER_TYPES.OPERATOR,
      name,
      phone,
      phoneVerified: false,
      emailVerified: true,
      status: USER_STATUS.ACTIVE,
    }).returning()) as Array<typeof users.$inferSelect>;

    res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        userType: newUser.userType,
      },
    });
  } catch (error) {
    console.error("Operator creation error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

/**
 * GET /api/auth/verify-email/:token
 * Verify email address
 */
router.get("/verify-email/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const [verification] = await db
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.token, token))
      .limit(1);

    if (!verification) {
      return res.redirect("/login?error=invalid_token");
    }

    if (isExpired(verification.expiresAt)) {
      return res.redirect("/login?error=token_expired");
    }

    // Update user's email verification status
    await db.update(users)
      .set({
        emailVerified: true,
      })
      .where(eq(users.id, verification.userId));

    // Delete verification record
    await db.delete(emailVerifications)
      .where(eq(emailVerifications.id, verification.id));

    res.redirect("/login?verified=true");
  } catch (error) {
    console.error("Email verification error:", error);
    res.redirect("/login?error=server_error");
  }
});

/**
 * POST /api/auth/resend-verification
 * Resend email verification
 */
router.post("/resend-verification", async (req: Request, res: Response) => {
  try {
    if (!IS_EMAIL_VERIFICATION_ENABLED) {
      return res.json({
        success: true,
        message: "현재 이메일 인증이 비활성화되어 있습니다.",
      });
    }
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "이메일을 입력해주세요" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      // Don't reveal if email exists
      return res.json({ success: true, message: "인증 메일이 발송되었습니다" });
    }

    if (user.emailVerified) {
      return res.status(400).json({ error: "이미 인증된 이메일입니다" });
    }

    // Delete old verification tokens
    await db.delete(emailVerifications)
      .where(eq(emailVerifications.userId, user.id));

    // Generate new token
    const token = generateToken();
    const expiresAt = getEmailVerificationExpiry();

    await db.insert(emailVerifications).values({
      userId: user.id,
      token,
      expiresAt,
    });

    // Send email
    await sendVerificationEmail(user.email, token, user.name);

    res.json({ success: true, message: "인증 메일이 발송되었습니다" });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post("/login", (req: Request, res: Response, next) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors[0].message });
  }

  passport.authenticate("local", (err: Error, user: Express.User, info: { message: string }) => {
    if (err) {
      console.error("Login error:", err);
      return res.status(500).json({ error: "서버 오류가 발생했습니다" });
    }

    if (!user) {
      return res.status(401).json({ error: info?.message || "로그인에 실패했습니다" });
    }

    const sessionMaxAge = Number(process.env.SESSION_TIMEOUT) || 2 * 60 * 60 * 1000;
    req.session.cookie.maxAge = sessionMaxAge;

    req.logIn(user, (err) => {
      if (err) {
        console.error("Login session error:", err);
        return res.status(500).json({ error: "서버 오류가 발생했습니다" });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          userType: user.userType,
          phone: user.phone,
          phoneVerified: user.phoneVerified,
          emailVerified: user.emailVerified,
          status: user.status,
          profileImageUrl: user.profileImageUrl,
          createdAt: user.createdAt,
        },
      });
    });
  })(req, res, next);
});

/**
 * POST /api/auth/logout
 * Logout current user
 */
router.post("/logout", (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ error: "로그아웃에 실패했습니다" });
    }
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destroy error:", err);
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });
});

/**
 * GET /api/auth/user
 * Get current authenticated user
 */
router.get("/user", (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "로그인이 필요합니다" });
  }

  res.json({
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
    userType: req.user.userType,
    phone: req.user.phone,
    phoneVerified: req.user.phoneVerified,
    emailVerified: req.user.emailVerified,
    status: req.user.status,
    profileImageUrl: req.user.profileImageUrl,
    createdAt: req.user.createdAt,
  });
});

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const result = forgotPasswordSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { email } = result.data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ success: true, message: "비밀번호 재설정 메일이 발송되었습니다" });
    }

    // Delete old reset tokens
    await db.delete(passwordResets)
      .where(eq(passwordResets.userId, user.id));

    // Generate new token
    const token = generateToken();
    const expiresAt = getPasswordResetExpiry();

    await db.insert(passwordResets).values({
      userId: user.id,
      token,
      expiresAt,
    });

    // Send email
    await sendPasswordResetEmail(user.email, token, user.name);

    res.json({
      success: true,
      message: "비밀번호 재설정 메일이 발송되었습니다",
      email: maskEmail(user.email),
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

/**
 * GET /api/auth/validate-reset-token
 * Validate password reset token
 */
router.get("/validate-reset-token", async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      return res.json({ valid: false });
    }

    const [resetRecord] = await db
      .select()
      .from(passwordResets)
      .where(
        and(
          eq(passwordResets.token, token),
          eq(passwordResets.used, false)
        )
      )
      .limit(1);

    if (!resetRecord || isExpired(resetRecord.expiresAt)) {
      return res.json({ valid: false });
    }

    res.json({ valid: true });
  } catch (error) {
    console.error("Validate reset token error:", error);
    res.json({ valid: false });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const result = resetPasswordSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { token, password } = result.data;

    const [resetRecord] = await db
      .select()
      .from(passwordResets)
      .where(
        and(
          eq(passwordResets.token, token),
          eq(passwordResets.used, false)
        )
      )
      .limit(1);

    if (!resetRecord) {
      return res.status(400).json({ error: "유효하지 않은 링크입니다" });
    }

    if (isExpired(resetRecord.expiresAt)) {
      return res.status(400).json({ error: "링크가 만료되었습니다. 다시 요청해주세요" });
    }

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Update password
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, resetRecord.userId));

    // Mark token as used
    await db.update(passwordResets)
      .set({ used: true })
      .where(eq(passwordResets.id, resetRecord.id));

    res.json({ success: true, message: "비밀번호가 변경되었습니다" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

/**
 * PUT /api/auth/password
 * Change password (requires authentication)
 */
router.put("/password", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const result = changePasswordSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { currentPassword, newPassword } = result.data;
    const userId = req.user!.id;

    // Get current password hash
    const [user] = await db
      .select({ password: users.password })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ error: "현재 비밀번호가 일치하지 않습니다" });
    }

    // Hash and update new password
    const hashedPassword = await hashPassword(newPassword);
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));

    res.json({ success: true, message: "비밀번호가 변경되었습니다" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

/**
 * GET /api/auth/profile
 * Get user profile with type-specific data
 */
router.get("/profile", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const userType = req.user!.userType;

    let profile: any = { ...req.user };

    // Get type-specific data
    if (userType === "teacher") {
      const [teacher] = await db
        .select()
        .from(teachers)
        .where(eq(teachers.userId, userId))
        .limit(1);
      if (teacher) {
        profile = { ...profile, ...teacher };
      }
    } else if (userType === "instructor") {
      const [instructor] = await db
        .select()
        .from(instructors)
        .where(eq(instructors.userId, userId))
        .limit(1);
      if (instructor) {
        profile = { ...profile, ...instructor };
        profile.specialties = instructor.specialties ? JSON.parse(instructor.specialties) : [];
      }
    } else if (userType === "school_admin") {
      const [admin] = await db
        .select()
        .from(schoolAdmins)
        .where(eq(schoolAdmins.userId, userId))
        .limit(1);
      if (admin) {
        profile = { ...profile, ...admin };
      }
    }

    res.json(profile);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put("/profile", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const result = updateProfileSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const userId = req.user!.id;
    const userType = req.user!.userType;
    const updates = result.data;

    // Update base user fields
    const userUpdates: Partial<User> = {};
    if (updates.name) userUpdates.name = updates.name;
    if (updates.profileImageUrl !== undefined) userUpdates.profileImageUrl = updates.profileImageUrl;

    if (Object.keys(userUpdates).length > 0) {
      await db.update(users)
        .set({ ...userUpdates, updatedAt: new Date() })
        .where(eq(users.id, userId));
    }

    // Update type-specific fields
    if (userType === "teacher") {
      const teacherUpdates: any = {};
      if (updates.schoolName) teacherUpdates.schoolName = updates.schoolName;
      if (updates.schoolAddress) teacherUpdates.schoolAddress = updates.schoolAddress;
      if (updates.subject) teacherUpdates.subject = updates.subject;
      if (updates.department) teacherUpdates.department = updates.department;

      if (Object.keys(teacherUpdates).length > 0) {
        await db.update(teachers)
          .set({ ...teacherUpdates, updatedAt: new Date() })
          .where(eq(teachers.userId, userId));
      }
    } else if (userType === "instructor") {
      const instructorUpdates: any = {};
      if (updates.specialties) instructorUpdates.specialties = JSON.stringify(updates.specialties);
      if (updates.careerYears !== undefined) instructorUpdates.careerYears = updates.careerYears;
      if (updates.introduction) instructorUpdates.introduction = updates.introduction;

      if (Object.keys(instructorUpdates).length > 0) {
        await db.update(instructors)
          .set({ ...instructorUpdates, updatedAt: new Date() })
          .where(eq(instructors.userId, userId));
      }
    } else if (userType === "school_admin") {
      const adminUpdates: any = {};
      if (updates.schoolName) adminUpdates.schoolName = updates.schoolName;
      if (updates.schoolAddress) adminUpdates.schoolAddress = updates.schoolAddress;
      if (updates.position) adminUpdates.position = updates.position;
      if (updates.department) adminUpdates.department = updates.department;

      if (Object.keys(adminUpdates).length > 0) {
        await db.update(schoolAdmins)
          .set({ ...adminUpdates, updatedAt: new Date() })
          .where(eq(schoolAdmins.userId, userId));
      }
    }

    res.json({ success: true, message: "프로필이 수정되었습니다" });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

/**
 * DELETE /api/auth/account
 * Delete user account
 */
router.delete("/account", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const result = deleteAccountSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { password } = result.data;
    const userId = req.user!.id;

    // Verify password
    const [user] = await db
      .select({ password: users.password })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return res.status(400).json({ error: "비밀번호가 일치하지 않습니다" });
    }

    // Soft delete - mark as deleted instead of actually deleting
    await db.update(users)
      .set({ status: USER_STATUS.DELETED, updatedAt: new Date() })
      .where(eq(users.id, userId));

    // Logout
    req.logout((err) => {
      if (err) {
        console.error("Logout error during account deletion:", err);
      }
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destroy error:", err);
        }
        res.clearCookie("connect.sid");
        res.json({ success: true, message: "계정이 삭제되었습니다" });
      });
    });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

// ============================================
// Kakao OAuth Routes
// ============================================

/**
 * GET /api/auth/kakao
 * Redirect to Kakao OAuth login
 */
router.get("/kakao", (req: Request, res: Response) => {
  const userType = (req.query.userType as string) || "teacher";

  if (userType !== "teacher" && userType !== "staff") {
    return res.status(400).json({ error: "올바르지 않은 사용자 유형입니다" });
  }

  const authUrl = getKakaoAuthUrl(userType);
  res.redirect(authUrl);
});

/**
 * GET /api/auth/kakao/callback
 * Handle Kakao OAuth callback
 */
router.get("/kakao/callback", async (req: Request, res: Response) => {
  try {
    console.log("Kakao callback received:", req.query);
    const { code, state, error, error_description } = req.query;

    // Handle error from Kakao
    if (error) {
      console.error("Kakao OAuth error:", error, error_description);
      return res.redirect(`/signup?error=kakao_${error}`);
    }

    if (!code || typeof code !== "string") {
      console.error("No code in Kakao callback");
      return res.redirect("/signup?error=no_code");
    }

    const userType = (state as string) || "teacher";
    console.log("User type from state:", userType);

    // Exchange code for token
    console.log("Exchanging code for token...");
    const tokenData = await getKakaoToken(code);
    console.log("Token received successfully");

    // Get user info
    console.log("Getting user info from Kakao...");
    const kakaoUser = await getKakaoUserInfo(tokenData.access_token);
    console.log("Kakao user info:", JSON.stringify(kakaoUser, null, 2));
    const userData = extractKakaoUserData(kakaoUser);
    console.log("Extracted user data:", userData);

    // Check if user already exists with this kakaoId
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.kakaoId, userData.kakaoId))
      .limit(1);

    if (existingUser && existingUser.status !== USER_STATUS.REJECTED) {
      // User already registered (and not rejected)
      if (existingUser.status === USER_STATUS.ACTIVE) {
        // Update last login
        await db.update(users).set({
          lastLoginAt: new Date(),
        }).where(eq(users.id, existingUser.id));

        // Log user in
        const { password: _, ...userWithoutPassword } = existingUser;
        req.logIn(userWithoutPassword as Express.User, (err) => {
          if (err) {
            console.error("Kakao login session error:", err);
            return res.redirect("/login?error=session_error");
          }
          return res.redirect("/");
        });
        return;
      } else if (existingUser.status === USER_STATUS.PENDING) {
        return res.redirect("/pending-approval");
      } else {
        return res.redirect(`/login?error=account_${existingUser.status}`);
      }
    }

    // If rejected user exists, delete them first to allow re-registration
    if (existingUser && existingUser.status === USER_STATUS.REJECTED) {
      await db.delete(users).where(eq(users.id, existingUser.id));
    }

    // New user - store temp data in session and redirect to info page
    (req.session as any).kakaoTempData = {
      kakaoId: userData.kakaoId,
      name: userData.name,
      email: userData.email,
      profileImageUrl: userData.profileImageUrl,
      userType,
    };

    // Redirect to appropriate info page
    if (userType === "teacher") {
      res.redirect("/signup/teacher/info");
    } else {
      res.redirect("/signup/staff/info");
    }
  } catch (error) {
    console.error("Kakao callback error:", error);
    res.redirect("/signup?error=kakao_failed");
  }
});

/**
 * GET /api/auth/kakao/session
 * Get Kakao temp data from session (for frontend)
 */
router.get("/kakao/session", (req: Request, res: Response) => {
  const kakaoData = (req.session as any).kakaoTempData;

  if (!kakaoData) {
    return res.status(404).json({ error: "카카오 로그인 정보가 없습니다" });
  }

  res.json(kakaoData);
});

/**
 * POST /api/auth/kakao/register
 * Complete Kakao registration with additional info
 */
router.post("/kakao/register", async (req: Request, res: Response) => {
  try {
    const kakaoData = (req.session as any).kakaoTempData;

    if (!kakaoData) {
      return res.status(400).json({ error: "카카오 로그인 정보가 없습니다. 다시 로그인해주세요." });
    }

    const {
      schoolName,
      subject,
      position,
      duties,
      dutiesEtc,
      termsOfService,
      privacyPolicy,
      marketingConsent,
    } = req.body;

    // Validate required fields
    if (!schoolName) {
      return res.status(400).json({ error: "학교명을 입력해주세요" });
    }

    if (!termsOfService || !privacyPolicy) {
      return res.status(400).json({ error: "필수 약관에 동의해주세요" });
    }

    const userType = kakaoData.userType as "teacher" | "staff";

    // Check if kakaoId already exists (double check)
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.kakaoId, kakaoData.kakaoId))
      .limit(1);

    if (existing) {
      return res.status(400).json({ error: "이미 가입된 계정입니다" });
    }

    // Generate a placeholder email if not provided by Kakao
    const email = kakaoData.email || `kakao_${kakaoData.kakaoId}@kakao.teachermate.co.kr`;

    // Check if email already exists
    const [existingEmail] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingEmail) {
      return res.status(400).json({ error: "이미 사용 중인 이메일입니다" });
    }

    // Create user
    const [newUser] = (await db.insert(users).values({
      email: email.toLowerCase(),
      password: "", // No password for Kakao users
      userType: userType,
      name: kakaoData.name || "카카오 사용자",
      phone: "",
      phoneVerified: false,
      emailVerified: true, // Kakao email is verified
      status: USER_STATUS.PENDING,
      organization: schoolName,
      position: position || null,
      kakaoId: kakaoData.kakaoId,
      duties: duties || null,
      dutiesEtc: dutiesEtc || null,
      marketingAgreed: !!marketingConsent,
      profileImageUrl: kakaoData.profileImageUrl || null,
    }).returning()) as Array<typeof users.$inferSelect>;

    // Create type-specific record
    if (userType === "teacher") {
      await db.insert(teachers).values({
        userId: newUser.id,
        schoolName: schoolName,
        schoolAddress: null,
        subject: subject || null,
        department: null,
      });
    } else if (userType === "staff") {
      await db.insert(staff).values({
        userId: newUser.id,
        schoolName: schoolName,
        position: position || null,
      });
    }

    // Clear session data
    delete (req.session as any).kakaoTempData;

    res.status(201).json({
      success: true,
      message: "회원가입이 완료되었습니다. 관리자 승인 후 서비스를 이용하실 수 있습니다.",
      userId: newUser.id,
      userType: newUser.userType,
    });
  } catch (error) {
    console.error("Kakao registration error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

// ============================================
// Email Registration Routes
// ============================================

/**
 * POST /api/auth/email/register
 * Complete email registration
 */
router.post("/email/register", async (req: Request, res: Response) => {
  try {
    const {
      email,
      password,
      name,
      nickname,
      userType,
      schoolName,
      subject,
      position,
      duties,
      dutiesEtc,
      termsOfService,
      privacyPolicy,
      marketingConsent,
    } = req.body;

    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({ error: "이메일, 비밀번호, 이름을 입력해주세요" });
    }

    if (!schoolName) {
      return res.status(400).json({ error: "학교명을 입력해주세요" });
    }

    if (!termsOfService || !privacyPolicy) {
      return res.status(400).json({ error: "필수 약관에 동의해주세요" });
    }

    if (userType !== "teacher" && userType !== "staff") {
      return res.status(400).json({ error: "올바르지 않은 사용자 유형입니다" });
    }

    // Check if email already exists
    const [existingEmail] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingEmail) {
      return res.status(400).json({ error: "이미 사용 중인 이메일입니다" });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const [newUser] = (await db.insert(users).values({
      email: email.toLowerCase(),
      password: hashedPassword,
      userType: userType,
      name: name,
      nickname: nickname || null,
      phone: "",
      phoneVerified: false,
      emailVerified: true, // Skip email verification for beta
      status: USER_STATUS.ACTIVE, // Auto-approve for beta
      organization: schoolName,
      position: position || null,
      authProvider: "email",
      duties: duties || null,
      dutiesEtc: dutiesEtc || null,
      marketingAgreed: !!marketingConsent,
    }).returning()) as Array<typeof users.$inferSelect>;

    // Create type-specific record
    if (userType === "teacher") {
      await db.insert(teachers).values({
        userId: newUser.id,
        schoolName: schoolName,
        schoolAddress: null,
        subject: subject || null,
        department: null,
      });
    } else if (userType === "staff") {
      await db.insert(staff).values({
        userId: newUser.id,
        schoolName: schoolName,
        position: position || null,
      });
    }

    res.status(201).json({
      success: true,
      message: "회원가입이 완료되었습니다.",
      userId: newUser.id,
      userType: newUser.userType,
    });
  } catch (error) {
    console.error("Email registration error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

export { router as authRouter, passport };
