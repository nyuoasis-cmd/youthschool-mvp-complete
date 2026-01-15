import { 
  type Template, type InsertTemplate,
  type GeneratedDocument, type InsertGeneratedDocument,
  templates, generatedDocuments
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

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
  createDocument(doc: InsertGeneratedDocument): Promise<GeneratedDocument>;
  updateDocument(id: number, updates: Partial<GeneratedDocument>): Promise<GeneratedDocument | undefined>;
  deleteDocument(id: number): Promise<boolean>;
  
  // Stats
  getStats(userId?: string): Promise<{ totalDocuments: number; totalTemplates: number; documentsByType: Record<string, number> }>;
  
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

  // Initialize default templates if none exist
  async initializeDefaultTemplates(): Promise<void> {
    const existingTemplates = await this.getTemplates();
    if (existingTemplates.length > 0) return;

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
    ];

    for (const template of defaultTemplates) {
      await this.createTemplate(template);
    }
  }
}

export const storage = new DatabaseStorage();
