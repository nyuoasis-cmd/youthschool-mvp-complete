import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, varchar, boolean, integer, text, serial } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for express-session
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User types enum
export const USER_TYPES = {
  TEACHER: "teacher",
  STAFF: "staff",
  SYSTEM_ADMIN: "system_admin",
  OPERATOR: "operator",
  // Legacy types (deprecated - kept for backward compatibility)
  INSTRUCTOR: "instructor",
  SCHOOL_ADMIN: "school_admin",
} as const;

export type UserType = typeof USER_TYPES[keyof typeof USER_TYPES];

// User status enum
export const USER_STATUS = {
  ACTIVE: "active",
  PENDING: "pending",
  SUSPENDED: "suspended",
  DELETED: "deleted",
  REJECTED: "rejected",
} as const;

export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS];

// Auth provider enum
export const AUTH_PROVIDERS = {
  EMAIL: "email",
  KAKAO: "kakao",
} as const;

export type AuthProvider = typeof AUTH_PROVIDERS[keyof typeof AUTH_PROVIDERS];

// Users table - main user information
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  password: varchar("password", { length: 255 }),
  authProvider: varchar("auth_provider", { length: 20 }).default("email").$type<AuthProvider>(),
  userType: varchar("user_type", { length: 20 }).notNull().$type<UserType>(),
  name: varchar("name", { length: 100 }).notNull(),
  nickname: varchar("nickname", { length: 50 }),
  phone: varchar("phone", { length: 20 }).notNull(),
  phoneVerified: boolean("phone_verified").default(false).notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull().$type<UserStatus>(),
  organization: varchar("organization", { length: 255 }),
  position: varchar("position", { length: 100 }),
  purpose: varchar("purpose", { length: 50 }),
  additionalNotes: text("additional_notes"),
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
  // Kakao OAuth fields
  kakaoId: varchar("kakao_id", { length: 100 }).unique(),
  duties: jsonb("duties").$type<string[]>(),
  dutiesEtc: varchar("duties_etc", { length: 200 }),
  marketingAgreed: boolean("marketing_agreed").default(false),
  lastLoginAt: timestamp("last_login_at"),
  loginAttempts: integer("login_attempts").default(0).notNull(),
  lockedUntil: timestamp("locked_until"),
  approvedAt: timestamp("approved_at"),
  approvedBy: integer("approved_by").references(() => users.id),
  rejectedAt: timestamp("rejected_at"),
  rejectedBy: integer("rejected_by").references(() => users.id),
  rejectedReason: text("rejected_reason"),
  suspensionReason: text("suspension_reason"),
  suspensionStartDate: timestamp("suspension_start_date"),
  suspensionEndDate: timestamp("suspension_end_date"),
  deletedAt: timestamp("deleted_at"),
  deletedBy: integer("deleted_by").references(() => users.id),
  deletionReason: text("deletion_reason"),
  deletionType: varchar("deletion_type", { length: 20 }),
  permanentDeletionDate: timestamp("permanent_deletion_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Teachers table - additional info for teachers
export const teachers = pgTable("teachers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  schoolName: varchar("school_name", { length: 200 }).notNull(),
  schoolAddress: text("school_address"), // Optional (removed required constraint)
  subject: varchar("subject", { length: 100 }),
  department: varchar("department", { length: 100 }),
  certificateFile: varchar("certificate_file", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Instructors table - additional info for instructors
export const instructors = pgTable("instructors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  specialties: text("specialties"), // JSON array string
  careerYears: integer("career_years"),
  introduction: text("introduction"),
  certificateFile: varchar("certificate_file", { length: 500 }),
  bankName: varchar("bank_name", { length: 100 }),
  accountNumber: varchar("account_number", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// School admins table - additional info for school administrators (legacy)
export const schoolAdmins = pgTable("school_admins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  schoolName: varchar("school_name", { length: 200 }).notNull(),
  schoolAddress: text("school_address").notNull(),
  position: varchar("position", { length: 100 }).notNull(),
  department: varchar("department", { length: 100 }).notNull(),
  approvalFile: varchar("approval_file", { length: 500 }).notNull(),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Staff table - additional info for school staff members (new signup flow)
export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  schoolName: varchar("school_name", { length: 200 }).notNull(),
  position: varchar("position", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Email verifications table
export const emailVerifications = pgTable("email_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: varchar("token", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Password resets table
export const passwordResets = pgTable("password_resets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: varchar("token", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Phone verifications table (for SMS codes)
export const phoneVerifications = pgTable("phone_verifications", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").default(false).notNull(),
  attempts: integer("attempts").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User management logs table
export const userManagementLogs = pgTable("user_management_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  actionType: varchar("action_type", { length: 50 }).notNull(),
  actionBy: integer("action_by").references(() => users.id, { onDelete: "set null" }),
  actionAt: timestamp("action_at").defaultNow().notNull(),
  reason: text("reason"),
  details: jsonb("details"),
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Teacher = typeof teachers.$inferSelect;
export type InsertTeacher = typeof teachers.$inferInsert;
export type Instructor = typeof instructors.$inferSelect;
export type InsertInstructor = typeof instructors.$inferInsert;
export type SchoolAdmin = typeof schoolAdmins.$inferSelect;
export type InsertSchoolAdmin = typeof schoolAdmins.$inferInsert;
export type Staff = typeof staff.$inferSelect;
export type InsertStaff = typeof staff.$inferInsert;
export type UserManagementLog = typeof userManagementLogs.$inferSelect;
export type InsertUserManagementLog = typeof userManagementLogs.$inferInsert;

// Drizzle Zod schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertTeacherSchema = createInsertSchema(teachers);
export const insertInstructorSchema = createInsertSchema(instructors);
export const insertSchoolAdminSchema = createInsertSchema(schoolAdmins);
export const insertStaffSchema = createInsertSchema(staff);
export const insertUserManagementLogSchema = createInsertSchema(userManagementLogs);

// ============================================
// Zod Validation Schemas for API
// ============================================

// Login schema
export const loginSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
  rememberMe: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Password validation
const passwordSchema = z.string()
  .min(8, "비밀번호는 8자 이상이어야 합니다")
  .regex(/[a-zA-Z]/, "영문을 포함해야 합니다")
  .regex(/[0-9]/, "숫자를 포함해야 합니다")
  .regex(/[^a-zA-Z0-9]/, "특수문자를 포함해야 합니다");

// Phone validation
const phoneSchema = z.string()
  .regex(/^010-\d{4}-\d{4}$/, "올바른 휴대폰 번호 형식이 아닙니다 (010-0000-0000)");

// Registration Step 1 - Basic info base (without password confirm refinement)
// Phone is optional for MVP - only email verification required
const registerStep1BaseSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다"),
  password: passwordSchema,
  passwordConfirm: z.string(),
  name: z.string().min(2, "이름은 2자 이상이어야 합니다").max(100, "이름은 100자 이하여야 합니다"),
  phone: phoneSchema.optional(),
});

// Registration Step 1 - for full registration (email verification only)
export const registerStep1Schema = registerStep1BaseSchema.refine(
  data => data.password === data.passwordConfirm, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["passwordConfirm"],
});

export type RegisterStep1Input = z.infer<typeof registerStep1Schema>;

export const operatorCreateSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다"),
  password: passwordSchema,
  name: z.string().min(2, "이름은 2자 이상이어야 합니다").max(100, "이름은 100자 이하여야 합니다"),
  phone: phoneSchema,
});

export type OperatorCreateInput = z.infer<typeof operatorCreateSchema>;

// Teacher info schema (Step 2 for teachers)
export const teacherInfoSchema = z.object({
  schoolName: z.string().min(1, "학교명을 입력해주세요").max(200, "학교명은 200자 이하여야 합니다"),
  schoolAddress: z.string().min(10, "학교 주소를 입력해주세요").max(500, "주소는 500자 이하여야 합니다"),
  subject: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
});

export type TeacherInfoInput = z.infer<typeof teacherInfoSchema>;

// Instructor info schema (Step 2 for instructors)
export const instructorInfoSchema = z.object({
  specialties: z.array(z.string()).min(1, "전문 분야를 1개 이상 선택해주세요"),
  careerYears: z.number().min(0).max(100).optional(),
  introduction: z.string().max(500, "자기소개는 500자 이하여야 합니다").optional(),
  bankName: z.string().max(100).optional(),
  accountNumber: z.string().max(100).optional(),
});

export type InstructorInfoInput = z.infer<typeof instructorInfoSchema>;

// School admin info schema (Step 2 for school admins)
export const schoolAdminInfoSchema = z.object({
  schoolName: z.string().min(1, "학교명을 입력해주세요").max(200, "학교명은 200자 이하여야 합니다"),
  schoolAddress: z.string().min(10, "학교 주소를 입력해주세요").max(500, "주소는 500자 이하여야 합니다"),
  position: z.string().min(1, "직위를 입력해주세요").max(100, "직위는 100자 이하여야 합니다"),
  department: z.string().min(1, "담당 부서를 입력해주세요").max(100, "부서명은 100자 이하여야 합니다"),
});

export type SchoolAdminInfoInput = z.infer<typeof schoolAdminInfoSchema>;

// Terms agreement schema (Step 3)
export const termsAgreementSchema = z.object({
  ageVerification: z.boolean().refine(val => val === true, "만 14세 이상이어야 합니다"),
  termsOfService: z.boolean().refine(val => val === true, "서비스 이용약관에 동의해주세요"),
  privacyPolicy: z.boolean().refine(val => val === true, "개인정보 처리방침에 동의해주세요"),
  marketingConsent: z.boolean().optional(),
});

export type TermsAgreementInput = z.infer<typeof termsAgreementSchema>;

// Full registration schemas by user type
export const teacherRegisterSchema = z.object({
  userType: z.literal("teacher"),
  step1: registerStep1BaseSchema,
  step2: teacherInfoSchema,
  terms: termsAgreementSchema,
});

export type TeacherRegisterInput = z.infer<typeof teacherRegisterSchema>;

export const instructorRegisterSchema = z.object({
  userType: z.literal("instructor"),
  step1: registerStep1BaseSchema,
  step2: instructorInfoSchema,
  terms: termsAgreementSchema,
});

export type InstructorRegisterInput = z.infer<typeof instructorRegisterSchema>;

export const schoolAdminRegisterSchema = z.object({
  userType: z.literal("school_admin"),
  step1: registerStep1BaseSchema,
  step2: schoolAdminInfoSchema,
  terms: termsAgreementSchema,
});

export type SchoolAdminRegisterInput = z.infer<typeof schoolAdminRegisterSchema>;

export const operatorRegisterSchema = z.object({
  userType: z.literal("operator"),
  step1: registerStep1BaseSchema,
  terms: termsAgreementSchema,
});

export type OperatorRegisterInput = z.infer<typeof operatorRegisterSchema>;

// Email check schema
export const checkEmailSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다"),
});

// Phone verification request schema
export const phoneVerificationRequestSchema = z.object({
  phone: phoneSchema,
});

// Phone verification confirm schema
export const phoneVerificationConfirmSchema = z.object({
  phone: phoneSchema,
  code: z.string().length(6, "인증번호는 6자리입니다"),
});

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다"),
});

// Reset password schema
export const resetPasswordSchema = z.object({
  token: z.string().min(1, "토큰이 필요합니다"),
  password: passwordSchema,
  passwordConfirm: z.string(),
}).refine(data => data.password === data.passwordConfirm, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["passwordConfirm"],
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// Change password schema (for logged in users)
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "현재 비밀번호를 입력해주세요"),
  newPassword: passwordSchema,
  newPasswordConfirm: z.string(),
}).refine(data => data.newPassword === data.newPasswordConfirm, {
  message: "새 비밀번호가 일치하지 않습니다",
  path: ["newPasswordConfirm"],
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// Profile update schema
export const updateProfileSchema = z.object({
  name: z.string().min(2, "이름은 2자 이상이어야 합니다").max(100).optional(),
  phone: phoneSchema.optional(),
  profileImageUrl: z.string().url().optional().nullable(),
  // Type-specific fields
  schoolName: z.string().max(200).optional(),
  schoolAddress: z.string().max(500).optional(),
  subject: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  position: z.string().max(100).optional(),
  specialties: z.array(z.string()).optional(),
  careerYears: z.number().min(0).max(100).optional(),
  introduction: z.string().max(500).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// Delete account schema
export const deleteAccountSchema = z.object({
  password: z.string().min(1, "비밀번호를 입력해주세요"),
  reason: z.string().optional(),
  confirmation: z.boolean().refine(val => val === true, "계정 삭제에 동의해주세요"),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

// Specialty options for instructors
export const SPECIALTY_OPTIONS = [
  "창업",
  "디지털 마케팅",
  "프로그래밍",
  "디자인",
  "AI/머신러닝",
  "데이터 분석",
  "영상 제작",
  "3D 프린팅",
  "드론",
  "로봇",
  "환경/에너지",
  "금융/경제",
  "진로 교육",
  "리더십",
  "기타",
] as const;

// Subject options for teachers
export const SUBJECT_OPTIONS = [
  "국어",
  "영어",
  "수학",
  "과학",
  "사회",
  "역사",
  "도덕",
  "기술가정",
  "정보",
  "음악",
  "미술",
  "체육",
  "제2외국어",
  "진로",
  "창의적 체험활동",
  "기타",
] as const;

// Position options for school admins
export const POSITION_OPTIONS = [
  "교장",
  "교감",
  "부장교사",
  "행정실장",
  "담당교사",
  "기타",
] as const;

// Teacher duty options (담당 업무)
export const TEACHER_DUTY_OPTIONS = [
  "학급 담임",
  "진로교육",
  "창업교육/비즈쿨",
  "SW·AI교육",
  "자유학기제",
  "동아리 운영",
  "교무기획",
  "연구/연수",
  "방과후학교",
  "기타",
] as const;

// Staff duty options (학교 구성원 담당 업무)
export const STAFF_DUTY_OPTIONS = [
  "총무/문서관리",
  "인사/채용",
  "예산/회계",
  "급식 운영",
  "시설/환경",
  "방과후/돌봄",
  "교육정보/전산",
  "기타",
] as const;

// Staff position options
export const STAFF_POSITION_OPTIONS = [
  "행정실장",
  "행정주사",
  "주무관",
  "교무실무사",
  "영양사",
  "시설관리",
  "기타",
] as const;

// Staff info schema (for new signup flow)
export const staffInfoSchema = z.object({
  schoolName: z.string().min(1, "학교명을 입력해주세요").max(200, "학교명은 200자 이하여야 합니다"),
  position: z.string().max(100).optional(),
});

export type StaffInfoInput = z.infer<typeof staffInfoSchema>;

// Kakao registration schema (for new signup flow)
export const kakaoRegisterSchema = z.object({
  userType: z.enum(["teacher", "staff"]),
  kakaoId: z.string().min(1, "카카오 ID가 필요합니다"),
  name: z.string().min(2, "이름은 2자 이상이어야 합니다"),
  email: z.string().email("올바른 이메일 형식이 아닙니다"),
  schoolName: z.string().min(1, "학교명을 입력해주세요"),
  subject: z.string().optional(),
  position: z.string().optional(),
  duties: z.array(z.string()).optional(),
  dutiesEtc: z.string().max(200).optional(),
  termsOfService: z.boolean().refine(val => val === true, "서비스 이용약관에 동의해주세요"),
  privacyPolicy: z.boolean().refine(val => val === true, "개인정보 처리방침에 동의해주세요"),
  marketingConsent: z.boolean().optional(),
});

export type KakaoRegisterInput = z.infer<typeof kakaoRegisterSchema>;
