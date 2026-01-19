import {
  type Template,
  type InsertTemplate,
  type GeneratedDocument,
  type InsertGeneratedDocument,
  type UploadedTemplate,
  type InsertUploadedTemplate,
  type DocumentEmbedding,
  type InsertDocumentEmbedding,
  type DocumentAttachment,
  type InsertDocumentAttachment,
  type AftercareDraft,
  type InsertAftercareDraft,
  type AftercareLibraryDoc,
  type InsertAftercareLibraryDoc,
  templates,
  generatedDocuments,
  documentAttachments,
  uploadedTemplates,
  documentEmbeddings,
  aftercareDrafts,
  aftercareLibrary,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, or, ilike, asc } from "drizzle-orm";

export interface IStorage {
  // Templates
  getTemplate(id: number): Promise<Template | undefined>;
  getTemplates(): Promise<Template[]>;
  getTemplatesByType(documentType: string): Promise<Template[]>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: number, updates: Partial<Template>): Promise<Template | undefined>;
  deleteTemplate(id: number): Promise<boolean>;
  
  // Generated Documents
  getDocument(id: number): Promise<GeneratedDocument | undefined>;
  getDocuments(userId?: string): Promise<GeneratedDocument[]>;
  getDocumentsPaged(
    userId: string,
    options: {
      page: number;
      limit: number;
      sortBy: "createdAt" | "updatedAt" | "title";
      order: "asc" | "desc";
      documentType?: string;
      status?: string;
      isFavorite?: boolean;
      search?: string;
    }
  ): Promise<{ documents: GeneratedDocument[]; total: number }>;
  createDocument(doc: InsertGeneratedDocument): Promise<GeneratedDocument>;
  updateDocument(id: number, updates: Partial<GeneratedDocument>): Promise<GeneratedDocument | undefined>;
  deleteDocument(id: number): Promise<boolean>;
  
  // Uploaded Templates (HWP)
  getUploadedTemplate(id: number): Promise<UploadedTemplate | undefined>;
  getUploadedTemplates(userId?: string): Promise<UploadedTemplate[]>;
  getUploadedTemplatesByType(documentType: string, limit?: number): Promise<UploadedTemplate[]>;
  createUploadedTemplate(template: InsertUploadedTemplate): Promise<UploadedTemplate>;
  updateUploadedTemplate(id: number, updates: Partial<UploadedTemplate>): Promise<UploadedTemplate | undefined>;
  deleteUploadedTemplate(id: number): Promise<boolean>;

  // Document Attachments
  getAttachment(id: number): Promise<DocumentAttachment | undefined>;
  listAttachmentsByDocumentId(documentId: number): Promise<DocumentAttachment[]>;
  createAttachment(attachment: InsertDocumentAttachment): Promise<DocumentAttachment>;
  deleteAttachment(id: number): Promise<boolean>;
  
  // Document Embeddings (RAG)
  getEmbeddingsByTemplateId(templateId: number): Promise<DocumentEmbedding[]>;
  createEmbedding(embedding: InsertDocumentEmbedding): Promise<DocumentEmbedding>;
  deleteEmbeddingsByTemplateId(templateId: number): Promise<boolean>;

  // Aftercare Drafts & Library
  createAftercareDraft(draft: InsertAftercareDraft): Promise<AftercareDraft>;
  getAftercareDraft(draftId: string): Promise<AftercareDraft | undefined>;
  updateAftercareDraft(draftId: string, updates: Partial<AftercareDraft>): Promise<AftercareDraft | undefined>;
  listAftercareLibrary(toolId?: string): Promise<AftercareLibraryDoc[]>;
  createAftercareLibraryDoc(doc: InsertAftercareLibraryDoc): Promise<AftercareLibraryDoc>;
  getAftercareLibraryDoc(docId: string): Promise<AftercareLibraryDoc | undefined>;
  
  // Stats
  getStats(userId?: string): Promise<{ totalDocuments: number; totalTemplates: number; documentsByType: Record<string, number> }>;
  getDocumentStats(userId: string): Promise<{
    totalDocuments: number;
    documentsByType: Record<string, number>;
    documentsByStatus: { draft: number; completed: number };
    recentActivity: Array<{ date: string; count: number }>;
    favoriteCount: number;
  }>;
  
  // Initialization
  initializeDefaultTemplates(): Promise<void>;
}

// DatabaseStorage implementation using Drizzle ORM
export class DatabaseStorage implements IStorage {
  
  // Templates
  async getTemplate(id: number): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template || undefined;
  }

  async getTemplates(): Promise<Template[]> {
    return await db.select().from(templates).orderBy(desc(templates.createdAt));
  }

  async getTemplatesByType(documentType: string): Promise<Template[]> {
    return await db.select().from(templates).where(eq(templates.documentType, documentType));
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const [template] = await db.insert(templates).values(insertTemplate).returning();
    return template;
  }

  async updateTemplate(id: number, updates: Partial<Template>): Promise<Template | undefined> {
    const [updated] = await db.update(templates).set(updates).where(eq(templates.id, id)).returning();
    return updated || undefined;
  }

  async deleteTemplate(id: number): Promise<boolean> {
    const result = await db.delete(templates).where(eq(templates.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Documents
  async getDocument(id: number): Promise<GeneratedDocument | undefined> {
    const [document] = await db.select().from(generatedDocuments).where(eq(generatedDocuments.id, id));
    return document || undefined;
  }

  async getDocuments(userId?: string): Promise<GeneratedDocument[]> {
    if (!userId) {
      return []; // Anonymous users see no documents
    }
    return await db.select().from(generatedDocuments)
      .where(eq(generatedDocuments.userId, userId))
      .orderBy(desc(generatedDocuments.createdAt));
  }

  async getDocumentsPaged(
    userId: string,
    options: {
      page: number;
      limit: number;
      sortBy: "createdAt" | "updatedAt" | "title";
      order: "asc" | "desc";
      documentType?: string;
      status?: string;
      isFavorite?: boolean;
      search?: string;
    }
  ): Promise<{ documents: GeneratedDocument[]; total: number }> {
    const { page, limit, sortBy, order, documentType, status, isFavorite, search } = options;
    const whereClauses = [eq(generatedDocuments.userId, userId)];

    if (documentType) {
      whereClauses.push(eq(generatedDocuments.documentType, documentType));
    }
    if (status) {
      whereClauses.push(eq(generatedDocuments.status, status));
    }
    if (typeof isFavorite === "boolean") {
      whereClauses.push(eq(generatedDocuments.isFavorite, isFavorite));
    }
    if (search) {
      const keyword = `%${search}%`;
      whereClauses.push(
        or(
          ilike(generatedDocuments.title, keyword),
          ilike(generatedDocuments.schoolName, keyword),
          ilike(generatedDocuments.content, keyword),
          ilike(generatedDocuments.generatedContent, keyword)
        )!
      );
    }

    const whereCondition = and(...whereClauses);
    const sortColumn =
      sortBy === "title"
        ? generatedDocuments.title
        : sortBy === "updatedAt"
          ? generatedDocuments.updatedAt
          : generatedDocuments.createdAt;
    const orderBy = order === "asc" ? asc(sortColumn) : desc(sortColumn);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(generatedDocuments)
      .where(whereCondition);

    const documents = await db
      .select()
      .from(generatedDocuments)
      .where(whereCondition)
      .orderBy(orderBy)
      .limit(limit)
      .offset((page - 1) * limit);

    return { documents, total: Number(count) };
  }

  async createDocument(insertDoc: InsertGeneratedDocument): Promise<GeneratedDocument> {
    const [document] = await db.insert(generatedDocuments).values(insertDoc).returning();
    return document;
  }

  async updateDocument(id: number, updates: Partial<GeneratedDocument>): Promise<GeneratedDocument | undefined> {
    const [updated] = await db.update(generatedDocuments).set(updates).where(eq(generatedDocuments.id, id)).returning();
    return updated || undefined;
  }

  async deleteDocument(id: number): Promise<boolean> {
    const result = await db.delete(generatedDocuments).where(eq(generatedDocuments.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Document Attachments
  async getAttachment(id: number): Promise<DocumentAttachment | undefined> {
    const [attachment] = await db.select().from(documentAttachments).where(eq(documentAttachments.id, id));
    return attachment || undefined;
  }

  async listAttachmentsByDocumentId(documentId: number): Promise<DocumentAttachment[]> {
    return await db.select().from(documentAttachments)
      .where(eq(documentAttachments.documentId, documentId))
      .orderBy(desc(documentAttachments.createdAt));
  }

  async createAttachment(attachment: InsertDocumentAttachment): Promise<DocumentAttachment> {
    const [created] = await db.insert(documentAttachments).values(attachment).returning();
    return created;
  }

  async deleteAttachment(id: number): Promise<boolean> {
    const result = await db.delete(documentAttachments).where(eq(documentAttachments.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Stats
  async getStats(userId?: string): Promise<{ totalDocuments: number; totalTemplates: number; documentsByType: Record<string, number> }> {
    const allTemplates = await db.select().from(templates);
    
    // Anonymous users see empty stats for documents
    if (!userId) {
      return {
        totalDocuments: 0,
        totalTemplates: allTemplates.length,
        documentsByType: {},
      };
    }
    
    const documents = await db.select().from(generatedDocuments).where(eq(generatedDocuments.userId, userId));

    const documentsByType: Record<string, number> = {};
    documents.forEach(doc => {
      const type = doc.documentType;
      documentsByType[type] = (documentsByType[type] || 0) + 1;
    });

    return {
      totalDocuments: documents.length,
      totalTemplates: allTemplates.length,
      documentsByType,
    };
  }

  async getDocumentStats(userId: string): Promise<{
    totalDocuments: number;
    documentsByType: Record<string, number>;
    documentsByStatus: { draft: number; completed: number };
    recentActivity: Array<{ date: string; count: number }>;
    favoriteCount: number;
  }> {
    const documents = await db.select().from(generatedDocuments).where(eq(generatedDocuments.userId, userId));
    const documentsByType: Record<string, number> = {};
    const documentsByStatus = { draft: 0, completed: 0 };
    let favoriteCount = 0;
    const activityMap = new Map<string, number>();

    documents.forEach((doc) => {
      documentsByType[doc.documentType] = (documentsByType[doc.documentType] || 0) + 1;
      if (doc.status === "draft") {
        documentsByStatus.draft += 1;
      } else {
        documentsByStatus.completed += 1;
      }
      if (doc.isFavorite) {
        favoriteCount += 1;
      }
      const date = doc.createdAt ? doc.createdAt.toISOString().slice(0, 10) : "";
      if (date) {
        activityMap.set(date, (activityMap.get(date) || 0) + 1);
      }
    });

    const recentActivity = Array.from(activityMap.entries())
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .slice(0, 7)
      .map(([date, count]) => ({ date, count }))
      .reverse();

    return {
      totalDocuments: documents.length,
      documentsByType,
      documentsByStatus,
      recentActivity,
      favoriteCount,
    };
  }

  // Uploaded Templates (HWP)
  async getUploadedTemplate(id: number): Promise<UploadedTemplate | undefined> {
    const [template] = await db.select().from(uploadedTemplates).where(eq(uploadedTemplates.id, id));
    return template || undefined;
  }

  async getUploadedTemplates(userId?: string): Promise<UploadedTemplate[]> {
    if (!userId) {
      return [];
    }
    return await db.select().from(uploadedTemplates)
      .where(eq(uploadedTemplates.userId, userId))
      .orderBy(desc(uploadedTemplates.createdAt));
  }

  async getUploadedTemplatesByType(documentType: string, limit: number = 10): Promise<UploadedTemplate[]> {
    return await db.select().from(uploadedTemplates)
      .where(eq(uploadedTemplates.documentType, documentType))
      .orderBy(desc(uploadedTemplates.createdAt))
      .limit(limit);
  }

  async createUploadedTemplate(template: InsertUploadedTemplate): Promise<UploadedTemplate> {
    const [created] = await db.insert(uploadedTemplates).values(template).returning();
    return created;
  }

  async updateUploadedTemplate(id: number, updates: Partial<UploadedTemplate>): Promise<UploadedTemplate | undefined> {
    const [updated] = await db.update(uploadedTemplates).set(updates).where(eq(uploadedTemplates.id, id)).returning();
    return updated || undefined;
  }

  async deleteUploadedTemplate(id: number): Promise<boolean> {
    // First delete associated embeddings
    await this.deleteEmbeddingsByTemplateId(id);
    const result = await db.delete(uploadedTemplates).where(eq(uploadedTemplates.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Document Embeddings (RAG)
  async getEmbeddingsByTemplateId(templateId: number): Promise<DocumentEmbedding[]> {
    return await db.select().from(documentEmbeddings)
      .where(eq(documentEmbeddings.uploadedTemplateId, templateId))
      .orderBy(documentEmbeddings.chunkIndex);
  }

  async createEmbedding(embedding: InsertDocumentEmbedding): Promise<DocumentEmbedding> {
    const [created] = await db.insert(documentEmbeddings).values(embedding).returning();
    return created;
  }

  async deleteEmbeddingsByTemplateId(templateId: number): Promise<boolean> {
    const result = await db.delete(documentEmbeddings).where(eq(documentEmbeddings.uploadedTemplateId, templateId));
    return (result.rowCount ?? 0) > 0;
  }

  // Aftercare Drafts & Library
  async createAftercareDraft(draft: InsertAftercareDraft): Promise<AftercareDraft> {
    const [created] = await db.insert(aftercareDrafts).values(draft).returning();
    return created;
  }

  async getAftercareDraft(draftId: string): Promise<AftercareDraft | undefined> {
    const [draft] = await db.select().from(aftercareDrafts).where(eq(aftercareDrafts.draftId, draftId));
    return draft || undefined;
  }

  async updateAftercareDraft(draftId: string, updates: Partial<AftercareDraft>): Promise<AftercareDraft | undefined> {
    const [updated] = await db
      .update(aftercareDrafts)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(aftercareDrafts.draftId, draftId))
      .returning();
    return updated || undefined;
  }

  async listAftercareLibrary(toolId?: string): Promise<AftercareLibraryDoc[]> {
    if (toolId) {
      return await db.select().from(aftercareLibrary).where(eq(aftercareLibrary.toolId, toolId)).orderBy(desc(aftercareLibrary.createdAt));
    }
    return await db.select().from(aftercareLibrary).orderBy(desc(aftercareLibrary.createdAt));
  }

  async createAftercareLibraryDoc(doc: InsertAftercareLibraryDoc): Promise<AftercareLibraryDoc> {
    const [created] = await db.insert(aftercareLibrary).values(doc).returning();
    return created;
  }

  async getAftercareLibraryDoc(docId: string): Promise<AftercareLibraryDoc | undefined> {
    const [doc] = await db.select().from(aftercareLibrary).where(eq(aftercareLibrary.docId, docId));
    return doc || undefined;
  }

  // Initialize default templates if none exist
  async initializeDefaultTemplates(): Promise<void> {
    const existingTemplates = await this.getTemplates();
    const existingByType = new Set(existingTemplates.map(template => template.documentType));

    const defaultTemplates: InsertTemplate[] = [
      {
        name: "가정통신문",
        description: "초중고 가정통신문 기본 양식",
        category: "communication",
        documentType: "가정통신문",
        isDefault: true,
        promptTemplate: `당신은 학교 행정 문서 작성 전문가입니다. 아래 정보를 바탕으로 전문적이고 격식있는 가정통신문을 작성해주세요.

[입력 정보]
- 제목: {title}
- 학교명: {schoolName}
- 목적: {purpose}
- 주요 내용: {mainContent}
- 마감일/기한: {deadline}
- 연락처: {contactInfo}
- 추가 사항: {additionalNotes}

[작성 지침]
1. 학부모님께 경어체로 공손하게 작성
2. 핵심 내용을 명확하게 전달
3. 필요 시 번호 목록 사용
4. 마지막에 학교명과 발신일 포함
5. 전체적으로 공식적이고 신뢰감 있는 톤 유지

가정통신문을 작성해주세요:`,
      },
      {
        name: "학부모총회 안내",
        description: "학부모총회 안내문 기본 양식",
        category: "communication",
        documentType: "학부모총회 안내",
        isDefault: true,
        promptTemplate: `당신은 학교의 학부모총회 안내문 작성 전문가입니다. 아래 정보를 바탕으로 격식 있는 공문서 형식의 안내문을 작성해주세요.

[입력 정보]
- 문서 제목: {title}
- 기본 정보: {basicInfo}
- 안건: {agenda}
- 일정 및 장소: {schedule}
- 참석 안내: {attendance}
- 기타 사항: {others}
- 인사말: {greetings}

[작성 지침]
1. 학부모님께 예의를 갖춘 공문서 문체 사용
2. 제목, 본문, 마무리 인사로 구성
3. 일정/장소/참석 안내는 명확하게 구분
4. 안건은 목록 형태로 정리
5. 인사말은 따뜻하고 정중한 어조 유지

학부모총회 안내문을 작성해주세요:`,
      },
      {
        name: "예산/결산 공개 자료",
        description: "학교 예산/결산 공개 자료 기본 양식",
        category: "communication",
        documentType: "예산/결산 공개 자료",
        isDefault: true,
        promptTemplate: `당신은 학교 예산/결산 공개 자료 작성 전문가입니다. 아래 정보를 바탕으로 학부모가 이해하기 쉬운 공개 자료를 작성해주세요.

[입력 정보]
- 문서 제목: {title}
- 기본 정보: {basicInfo}
- 예산/결산 개요: {overview}
- 재원별 내역: {resources}
- 사업별 내역: {projects}
- 성과 및 평가: {performance}
- 집행 현황: {execution}
- 향후 계획: {futurePlans}
- 첨부 자료: {attachments}

[작성 지침]
1. 투명성과 이해도를 높이는 설명 방식
2. 핵심 수치와 의미를 함께 제시
3. 학부모 친화적인 문장 사용
4. 항목별 제목을 명확히 구분
5. 결산/예산에 따라 필요한 항목만 자연스럽게 반영

예산/결산 공개 자료를 작성해주세요:`,
      },
      {
        name: "외부 교육 용역 계획서",
        description: "비즈쿨 외부 교육 용역 계획서",
        category: "business",
        documentType: "외부 교육 용역 계획서",
        isDefault: true,
        promptTemplate: `당신은 학교 교육 프로그램 기획 전문가입니다. 아래 정보를 바탕으로 체계적이고 전문적인 외부 교육 용역 계획서를 작성해주세요.

[입력 정보]
- 계획서 제목: {title}
- 학교명: {schoolName}
- 프로그램명: {programName}
- 대상 학생: {targetStudents}
- 교육 기간: {duration}
- 교육 목표: {objectives}
- 교육 내용: {contents}
- 예산: {budget}
- 기대 효과: {expectedOutcomes}

[작성 지침]
1. 공식 문서 형식에 맞게 체계적으로 구성
2. 교육 목표와 내용을 명확하게 서술
3. 세부 일정이나 커리큘럼이 있다면 표 형식 활용
4. 기대 효과를 구체적으로 제시
5. 예산 사용 계획이 있다면 항목별로 정리

외부 교육 용역 계획서를 작성해주세요:`,
      },
      {
        name: "방과후학교 운영계획서",
        description: "학교 방과후학교 운영계획서 기본 양식",
        category: "business",
        documentType: "방과후학교 운영계획서",
        isDefault: true,
        promptTemplate: `당신은 한국 학교의 방과후학교 운영계획서 작성 전문가입니다. 아래 정보를 바탕으로 공식 문서 형식의 운영계획서를 작성해주세요.

[입력 정보]
- 기본 정보: {basicInfo}
- 운영 목표/방침: {objectives}
- 프로그램 운영표: {programs}
- 모집/수납/회계: {recruitment}
- 안전/학생 관리: {safety}

[작성 지침]
1. 문서 구조는 "기본 정보 → 운영 목표/방침 → 프로그램 운영 → 모집/수납/회계 → 안전/학생 관리" 순서를 따릅니다.
2. 표 형태가 적절한 항목(프로그램 운영표, 환불 기준 등)은 표로 정리합니다.
3. 필수 항목이 누락되지 않도록 입력 정보를 충실히 반영합니다.
4. 학교 행정 문서에 맞는 격식 있는 어투로 작성합니다.
5. 날짜/금액/시간은 명확하고 일관된 형식으로 표기합니다.

방과후학교 운영계획서를 작성해주세요:`,
      },
      {
        name: "초등돌봄교실 운영계획서",
        description: "초등돌봄교실 운영계획서 기본 양식",
        category: "business",
        documentType: "초등돌봄교실 운영계획서",
        isDefault: true,
        promptTemplate: `당신은 한국 초등돌봄교실 운영계획서 작성 전문가입니다. 아래 정보를 바탕으로 공식 문서 형식의 운영계획서를 작성해주세요.

[입력 정보]
- 기본 정보: {basicInfo}
- 운영 목표/방침: {objectives}
- 프로그램 운영: {programs}
- 학생 모집/관리: {recruitment}
- 안전/급식 관리: {safety}
- 인력 배치 기준: {staffing}

[작성 지침]
1. 문서 구조는 "기본 정보 → 운영 목표/방침 → 프로그램 운영 → 학생 모집/관리 → 안전/급식 관리 → 인력 배치 기준" 순서를 따릅니다.
2. 항목이 길 경우 소제목과 단락을 분리해 가독성을 높입니다.
3. 입력 정보를 충실히 반영하고 미입력 항목은 일반적인 표현으로 처리합니다.
4. 돌봄교실 운영계획서에 맞는 공문서 톤으로 작성합니다.
5. 날짜/시간/인원은 명확하고 일관된 형식으로 표기합니다.

초등돌봄교실 운영계획서를 작성해주세요:`,
      },
      {
        name: "현장체험학습 운영계획서",
        description: "현장체험학습 운영계획서 기본 양식",
        category: "business",
        documentType: "현장체험학습 운영계획서",
        isDefault: true,
        promptTemplate: `당신은 학교 현장체험학습 운영계획서 작성 전문가입니다. 아래 정보를 바탕으로 공문서 형식의 운영계획서를 작성해주세요.

[입력 정보]
- 기본 정보: {basicInfo}
- 장소 및 이동 정보: {locationInfo}
- 교육 목표 및 내용: {educationInfo}
- 세부 일정: {schedule}
- 안전 관리 계획: {safetyInfo}
- 기타 사항: {otherInfo}

[작성 지침]
1. 공문서 형식의 격식체로 작성합니다.
2. 안전 관리 계획을 강조하여 서술합니다.
3. 세부 일정은 시간대별로 자연스럽게 설명합니다.
4. 평가 계획과 기대 효과를 포함합니다.
5. 문서 구조는 "기본 정보 → 추진 배경 및 필요성 → 운영 목표 → 운영 방침 → 세부 일정 → 이동 계획 → 안전 관리 계획 → 주요 활동 내용 → 사전·사후 활동 → 예산 계획 → 기대 효과 → 평가 계획 → 기타 사항" 순서를 따릅니다.

현장체험학습 운영계획서를 작성해주세요:`,
      },
      {
        name: "학교 안전교육 계획서",
        description: "학교 안전교육 계획서 기본 양식",
        category: "business",
        documentType: "학교 안전교육 계획서",
        isDefault: true,
        promptTemplate: `당신은 학교 안전교육 계획서 작성 전문가입니다. 아래 정보를 바탕으로 공문서 형식의 계획서를 작성해주세요.

[입력 정보]
- 기본 정보: {basicInfo}
- 교육 목표: {goals}
- 운영 방침: {policy}
- 중점 추진 사항: {keyPoints}
- 전년도 개선사항: {improvements}
- 7대 안전교육 영역별 계획: {safetyAreas}
- 월별/학기별 실행 계획: {monthlyPlan}
- 교육 인프라 및 지원 체계: {infrastructure}
- 교직원 안전 연수 계획: {teacherTraining}
- 평가 및 환류 계획: {evaluation}
- 기타 사항: {others}

[작성 지침]
1. 공문서 형식의 격식체로 작성합니다.
2. 법적 근거(학교안전사고 예방 및 보상에 관한 법률)를 간략히 언급합니다.
3. 7대 안전교육 영역별 계획과 시수 배정이 명확히 드러나도록 서술합니다.
4. 월별 실행 계획과 평가·환류 체계를 포함합니다.
5. 문서 구조는 "기본 현황 → 추진 배경 및 필요성 → 안전교육 목표 → 운영 방침 → 중점 추진 사항 → 7대 안전교육 영역별 계획 → 월별/학기별 실행 계획 → 교육 인프라 및 지원 체계 → 교직원 연수 계획 → 평가 및 환류 → 기타 사항 → 기대 효과" 순서를 따릅니다.

학교 안전교육 계획서를 작성해주세요:`,
      },
      {
        name: "학교폭력 예방 교육 계획서",
        description: "학교폭력 예방 교육 계획서 기본 양식",
        category: "business",
        documentType: "학교폭력 예방 교육 계획서",
        isDefault: true,
        promptTemplate: `당신은 학교폭력 예방 교육 계획서 작성 전문가입니다. 아래 정보를 바탕으로 공문서 형식의 계획서를 작성해주세요.

[입력 정보]
- 기본 정보: {basicInfo}
- 현황 분석: {analysis}
- 교육 목표 및 방침: {goalsAndPolicy}
- 학생 대상 교육 계획: {studentEducation}
- 교직원 연수 계획: {teacherTraining}
- 학부모 교육 계획: {parentEducation}
- 월별/분기별 실행 계획: {monthlyPlan}
- 상담 및 신고 체계: {counselingSystem}
- 예산 및 인프라: {budget}
- 평가 및 환류: {evaluation}

[작성 지침]
1. 공문서 형식의 격식체로 작성합니다.
2. 학교폭력예방 및 대책에 관한 법률 제15조의 법적 근거를 간략히 언급합니다.
3. 학생·교직원·학부모 대상 교육 계획이 구분되어 명확히 드러나도록 작성합니다.
4. 상담 및 신고 체계와 비상 대응 절차를 강조합니다.
5. 문서 구조는 "기본 현황 → 추진 배경 및 필요성 → 현황 분석 → 예방교육 목표 → 운영 방침 → 중점 추진 과제 → 학생 대상 교육 계획 → 교직원 연수 계획 → 학부모 교육 계획 → 월별 실행 계획 → 상담 및 신고 체계 → 예산 및 인프라 → 평가 및 환류 → 기대 효과" 순서를 따릅니다.

학교폭력 예방 교육 계획서를 작성해주세요:`,
      },
      {
        name: "교내 행사 운영계획서",
        description: "교내 행사 운영계획서 기본 양식",
        category: "business",
        documentType: "교내 행사 운영계획서",
        isDefault: true,
        promptTemplate: `당신은 교내 행사 운영계획서 작성 전문가입니다. 아래 정보를 바탕으로 공문서 형식의 운영계획서를 작성해주세요.

[입력 정보]
- 기본 정보: {basicInfo}
- 행사 목적 및 개요: {overview}
- 행사 프로그램: {programs}
- 운영 방침 및 준비 사항: {operation}
- 추진 조직 및 역할: {organization}
- 안전 관리 계획: {safety}
- 예산 계획: {budget}
- 사전 준비 일정: {schedule}
- 평가 계획: {evaluation}

[작성 지침]
1. 공문서 형식의 격식체로 작성합니다.
2. 행사 유형에 맞는 표현과 운영 방안을 포함합니다.
3. 안전 관리와 비상 대응 계획을 강조합니다.
4. 예산과 일정이 명확히 드러나도록 구성합니다.
5. 문서 구조는 "기본 현황 → 행사 목적 → 추진 배경 및 필요성 → 행사 개요 → 기대 효과 → 세부 운영 계획 → 추진 조직 및 역할 → 안전 관리 계획 → 예산 계획 → 사전 준비 일정 → 평가 및 환류 → 성공적인 행사 운영 방안" 순서를 따릅니다.

교내 행사 운영계획서를 작성해주세요:`,
      },
    ];

    for (const template of defaultTemplates) {
      if (!existingByType.has(template.documentType)) {
        await this.createTemplate(template);
      }
    }
  }
}

export const storage = new DatabaseStorage();
