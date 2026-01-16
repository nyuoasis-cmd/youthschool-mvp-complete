import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, jsonb, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models (Replit Auth integration)
export * from "./models/auth";

// Document Types
export const DOCUMENT_TYPES = {
  PARENT_LETTER: "가정통신문",
  EDUCATION_PLAN: "외부 교육 용역 계획서",
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
  inputData: jsonb("input_data").$type<Record<string, string>>(),
  generatedContent: text("generated_content"),
  status: text("status").default("completed"), // pending, completed, failed
  processingTimeMs: integer("processing_time_ms"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertGeneratedDocumentSchema = createInsertSchema(generatedDocuments).omit({
  id: true,
  createdAt: true,
});

export type InsertGeneratedDocument = z.infer<typeof insertGeneratedDocumentSchema>;
export type GeneratedDocument = typeof generatedDocuments.$inferSelect;

// Form Input Schema for Parent Letter (가정통신문)
export const parentLetterInputSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요"),
  schoolName: z.string().min(1, "학교명을 입력해주세요"),
  purpose: z.string().min(1, "목적을 입력해주세요"),
  mainContent: z.string().min(10, "주요 내용을 10자 이상 입력해주세요"),
  additionalNotes: z.string().optional(),
  deadline: z.string().optional(),
  contactInfo: z.string().optional(),
});

export type ParentLetterInput = z.infer<typeof parentLetterInputSchema>;

// Form Input Schema for Education Plan (외부 교육 용역 계획서)
export const educationPlanInputSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요"),
  schoolName: z.string().min(1, "학교명을 입력해주세요"),
  programName: z.string().min(1, "프로그램명을 입력해주세요"),
  targetStudents: z.string().min(1, "대상 학생을 입력해주세요"),
  duration: z.string().min(1, "교육 기간을 입력해주세요"),
  objectives: z.string().min(10, "교육 목표를 10자 이상 입력해주세요"),
  contents: z.string().min(10, "교육 내용을 10자 이상 입력해주세요"),
  budget: z.string().optional(),
  expectedOutcomes: z.string().optional(),
});

export type EducationPlanInput = z.infer<typeof educationPlanInputSchema>;

// Generate Document Request Schema
export const generateDocumentRequestSchema = z.object({
  documentType: z.enum(["가정통신문", "외부 교육 용역 계획서"]),
  templateId: z.number().optional(),
  inputs: z.record(z.string()),
});

export type GenerateDocumentRequest = z.infer<typeof generateDocumentRequestSchema>;

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
