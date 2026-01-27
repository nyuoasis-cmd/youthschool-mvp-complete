import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, jsonb, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

// Re-export auth models (Replit Auth integration)
export * from "./models/auth";

// Document Types
export const DOCUMENT_TYPES = {
  PARENT_LETTER: "가정통신문",
  MEAL_NOTICE: "급식안내문",
  PARENT_MEETING: "학부모총회 안내",
  BUDGET_DISCLOSURE: "예산/결산 공개 자료",
  EDUCATION_PLAN: "외부 교육 용역 계획서",
  AFTER_SCHOOL_PLAN: "방과후학교 운영계획서",
  FIELD_TRIP_PLAN: "현장체험학습 운영계획서",
  SAFETY_EDUCATION_PLAN: "학교 안전교육 계획서",
  EVENT_PLAN: "교내 행사 운영계획서",
  BULLYING_PREVENTION_PLAN: "학교폭력 예방 교육 계획서",
} as const;

export type DocumentType = typeof DOCUMENT_TYPES[keyof typeof DOCUMENT_TYPES];

// Templates table
export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // communication, business
  documentType: text("document_type").notNull(),
  isDefault: boolean("is_default").default(false),
  promptTemplate: text("prompt_template"), // AI prompt template
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true,
});

export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templates.$inferSelect;

// Generated Documents table
export const generatedDocuments = pgTable("generated_documents", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"), // optional - links to authenticated user
  templateId: integer("template_id").references(() => templates.id),
  documentType: text("document_type").notNull(),
  title: text("title").notNull(),
  schoolName: text("school_name"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  content: text("content"),
  inputData: jsonb("input_data").$type<Record<string, string>>(),
  generatedContent: text("generated_content"),
  status: text("status").default("completed"), // pending, completed, failed
  isFavorite: boolean("is_favorite").default(false),
  referenceFileId: integer("reference_file_id"),
  referenceFileName: text("reference_file_name"),
  viewCount: integer("view_count").default(0),
  editCount: integer("edit_count").default(0),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  processingTimeMs: integer("processing_time_ms"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertGeneratedDocumentSchema = createInsertSchema(generatedDocuments).omit({
  id: true,
  createdAt: true,
});

export type InsertGeneratedDocument = z.infer<typeof insertGeneratedDocumentSchema>;
export type GeneratedDocument = typeof generatedDocuments.$inferSelect;

// Document attachments (files linked to generated documents)
export const documentAttachments = pgTable("document_attachments", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => generatedDocuments.id).notNull(),
  userId: varchar("user_id"), // owner for access control
  originalName: text("original_name").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertDocumentAttachmentSchema = createInsertSchema(documentAttachments).omit({
  id: true,
  createdAt: true,
});

export type InsertDocumentAttachment = z.infer<typeof insertDocumentAttachmentSchema>;
export type DocumentAttachment = typeof documentAttachments.$inferSelect;

// Form Input Schema for Parent Letter (가정통신문)
export const parentLetterInputSchema = z.object({
  title: z.string().optional(),
  mainContent: z.string().optional(),
  deadline: z.string().optional(),
  contactInfo: z.string().optional(),
});

export type ParentLetterInput = z.infer<typeof parentLetterInputSchema>;

// Form Input Schema for Education Plan (외부 교육 용역 계획서)
export const educationPlanInputSchema = z.object({
  title: z.string().optional(),
  programName: z.string().optional(),
  objectives: z.string().optional(),
  targetStudents: z.string().optional(),
  duration: z.string().optional(),
  instructorInfo: z.string().optional(),
  budget: z.string().optional(),
});

export type EducationPlanInput = z.infer<typeof educationPlanInputSchema>;

// Aftercare Plan / Report Schemas (OpenAPI)
export const aftercarePlanInputsSchema = z.object({
  school_name: z.string().min(1),
  term_label: z.string().min(1),
  doc_title: z.string().optional(),
  operation_types: z.array(z.enum(["after_school", "vacation", "morning"])).min(1),
  period: z.object({
    start_date: z.string().min(1),
    end_date: z.string().min(1),
  }),
  days_of_week: z.array(z.enum(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"])).min(1),
  time_semester: z.object({
    start_time: z.string().min(1),
    end_time: z.string().min(1),
  }),
  time_vacation: z
    .object({
      start_time: z.string().min(1),
      end_time: z.string().min(1),
    })
    .optional(),
  location: z.string().min(1),
  contact: z
    .object({
      name: z.string().optional(),
      phone: z.string().optional(),
    })
    .optional(),
  target_grades: z.array(z.enum(["G1", "G2", "G3", "G4", "G5", "G6"])).min(1),
  capacity: z.number().min(1),
  application_period_text: z.string().optional(),
  selection_criteria: z.array(z.enum(["DUAL_INCOME", "LOW_INCOME", "SINGLE_PARENT", "MULTI_CHILD", "OTHER"])).min(1),
  selection_criteria_note: z.string().optional(),
  daily_schedule: z
    .array(
      z.object({
        slot: z.string().min(1),
        activity: z.string().min(1),
        note: z.string().optional(),
      })
    )
    .optional(),
  programs: z
    .array(
      z.object({
        name: z.string().min(1),
        frequency: z.string().min(1),
        owner: z.string().optional(),
        place: z.string().optional(),
      })
    )
    .optional(),
  staffing: z
    .array(
      z.object({
        role: z.string().min(1),
        count: z.number().min(0),
        work_time: z.string().optional(),
        duties: z.string().optional(),
      })
    )
    .optional(),
  attendance_method: z.enum(["ELECTRONIC", "PAPER", "MIXED"]),
  return_home_policy: z.enum(["GUARDIAN_HANDOFF", "GROUP_DISMISSAL", "OTHER"]),
  emergency_contact_enabled: z.boolean().optional(),
  emergency_response_enabled: z.boolean().optional(),
  hygiene_snack_enabled: z.boolean().optional(),
  budget_total: z.number().min(0).optional(),
  budget_items: z
    .array(
      z.object({
        category: z.enum(["SNACK", "SUPPLIES", "PROGRAM", "CONSUMABLES", "OTHER"]),
        amount: z.number().min(0),
        basis: z.string().optional(),
      })
    )
    .optional(),
  evaluation_cycle: z.enum(["MONTHLY", "SEMESTERLY", "ADHOC"]).optional(),
  satisfaction_survey: z.enum(["YES", "NO"]).optional(),
});

export type AftercarePlanInputs = z.infer<typeof aftercarePlanInputsSchema>;

export const aftercareReportInputsSchema = z.object({
  school_name: z.string().min(1),
  period_label: z.string().min(1),
  operation_types: z.array(z.enum(["after_school", "vacation", "morning"])).min(1),
  location: z.string().optional(),
  operation_days: z.number().min(0),
  avg_participants: z.number().min(0),
  total_participants: z.number().min(0).optional(),
  program_summary: z
    .array(
      z.object({
        area: z.string().min(1),
        count: z.number().min(0),
        note: z.string().optional(),
      })
    )
    .optional(),
  staffing_changes_text: z.string().optional(),
  training_coordination_text: z.string().optional(),
  incident_flag: z.enum(["NONE", "EXISTS"]),
  incidents: z
    .array(
      z.object({
        when_text: z.string().min(1),
        content: z.string().min(1),
        action: z.string().min(1),
        prevention: z.string().min(1),
      })
    )
    .optional(),
  complaints_text: z.string().optional(),
  complaint_actions_text: z.string().optional(),
  budget: z
    .object({
      allocated: z.number().min(0),
      spent: z.number().min(0),
      remaining: z.number().min(0),
    })
    .optional(),
  major_expenses: z
    .array(
      z.object({
        category: z.string().min(1),
        amount: z.number().min(0),
        note: z.string().optional(),
      })
    )
    .optional(),
  survey_summary_text: z.string().optional(),
  strengths: z.array(z.string()).optional(),
  improvements: z.array(z.string()).optional(),
});

export type AftercareReportInputs = z.infer<typeof aftercareReportInputsSchema>;

// Generate Document Request Schema
export const generateDocumentRequestSchema = z.object({
  documentType: z.enum([
    "가정통신문",
    "급식안내문",
    "학부모총회 안내",
    "예산/결산 공개 자료",
    "외부 교육 용역 계획서",
    "방과후학교 운영계획서",
    "초등돌봄교실 운영계획서",
    "현장체험학습 운영계획서",
    "학교 안전교육 계획서",
    "교내 행사 운영계획서",
    "학교폭력 예방 교육 계획서",
  ]),
  templateId: z.number().optional(),
  uploadedTemplateId: z.number().optional(), // HWP template to use for RAG context
  inputs: z.record(z.string()),
});

export type GenerateDocumentRequest = z.infer<typeof generateDocumentRequestSchema>;

// Aftercare Drafts & Library tables
export const aftercareDrafts = pgTable("aftercare_drafts", {
  draftId: varchar("draft_id", { length: 32 }).primaryKey(),
  userId: varchar("user_id"),
  toolId: text("tool_id").notNull(),
  title: text("title").notNull(),
  status: text("status").default("editing"),
  inputs: jsonb("inputs").$type<Record<string, unknown>>().notNull(),
  generatedFields: jsonb("generated_fields").$type<Record<string, { text: string; source: string; last_generated_at?: string }>>(),
  validation: jsonb("validation").$type<{ blocking: unknown[]; warnings: unknown[] }>(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const aftercareLibrary = pgTable("aftercare_library", {
  docId: varchar("doc_id", { length: 32 }).primaryKey(),
  userId: varchar("user_id"),
  toolId: text("tool_id").notNull(),
  title: text("title").notNull(),
  inputs: jsonb("inputs").$type<Record<string, unknown>>().notNull(),
  generatedFields: jsonb("generated_fields").$type<Record<string, { text: string; source: string; last_generated_at?: string }>>(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertAftercareDraftSchema = createInsertSchema(aftercareDrafts).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertAftercareLibrarySchema = createInsertSchema(aftercareLibrary).omit({
  createdAt: true,
});

export type AftercareDraft = typeof aftercareDrafts.$inferSelect;
export type InsertAftercareDraft = z.infer<typeof insertAftercareDraftSchema>;
export type AftercareLibraryDoc = typeof aftercareLibrary.$inferSelect;
export type InsertAftercareLibraryDoc = z.infer<typeof insertAftercareLibrarySchema>;

// Uploaded HWP Templates table - stores parsed HWP document templates
export const uploadedTemplates = pgTable("uploaded_templates", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"), // links to authenticated user
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  documentType: text("document_type"), // 가정통신문, 외부 교육 용역 계획서, etc.
  extractedText: text("extracted_text"), // full text content
  extractedMarkdown: text("extracted_markdown"), // markdown format
  extractedFields: jsonb("extracted_fields").$type<TemplateField[]>(), // parsed fields
  styleInfo: jsonb("style_info").$type<Record<string, unknown>>(), // style/format info
  status: text("status").default("pending"), // pending, processing, completed, failed
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Template field definition
export interface TemplateField {
  name: string;
  label: string;
  type: "text" | "textarea" | "date" | "number" | "select";
  required: boolean;
  defaultValue?: string;
  options?: string[]; // for select type
  description?: string;
}

export const insertUploadedTemplateSchema = createInsertSchema(uploadedTemplates).omit({
  id: true,
  createdAt: true,
});

export type InsertUploadedTemplate = z.infer<typeof insertUploadedTemplateSchema>;
export type UploadedTemplate = typeof uploadedTemplates.$inferSelect;

// Document embeddings for RAG
export const documentEmbeddings = pgTable("document_embeddings", {
  id: serial("id").primaryKey(),
  uploadedTemplateId: integer("uploaded_template_id").references(() => uploadedTemplates.id),
  chunkIndex: integer("chunk_index").notNull(),
  chunkText: text("chunk_text").notNull(),
  embedding: text("embedding"), // JSON string of embedding vector (for now, pgvector later)
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertDocumentEmbeddingSchema = createInsertSchema(documentEmbeddings).omit({
  id: true,
  createdAt: true,
});

export type InsertDocumentEmbedding = z.infer<typeof insertDocumentEmbeddingSchema>;
export type DocumentEmbedding = typeof documentEmbeddings.$inferSelect;

// Chats
export const chats = pgTable("chats", {
  chatId: varchar("chat_id", { length: 32 }).primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  category: varchar("category", { length: 50 }),
  isPinned: boolean("is_pinned").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  deletedAt: timestamp("deleted_at"),
});

export const chatMessages = pgTable("chat_messages", {
  messageId: varchar("message_id", { length: 32 }).primaryKey(),
  chatId: varchar("chat_id", { length: 32 }).references(() => chats.chatId, { onDelete: "cascade" }).notNull(),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertChatSchema = createInsertSchema(chats).omit({
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  createdAt: true,
});

export type Chat = typeof chats.$inferSelect;
export type InsertChat = z.infer<typeof insertChatSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
