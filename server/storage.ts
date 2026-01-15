import { 
  type User, type InsertUser,
  type Template, type InsertTemplate,
  type GeneratedDocument, type InsertGeneratedDocument 
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Templates
  getTemplate(id: number): Promise<Template | undefined>;
  getTemplates(): Promise<Template[]>;
  getTemplatesByType(documentType: string): Promise<Template[]>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  
  // Generated Documents
  getDocument(id: number): Promise<GeneratedDocument | undefined>;
  getDocuments(): Promise<GeneratedDocument[]>;
  createDocument(doc: InsertGeneratedDocument): Promise<GeneratedDocument>;
  updateDocument(id: number, updates: Partial<GeneratedDocument>): Promise<GeneratedDocument | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private templates: Map<number, Template>;
  private documents: Map<number, GeneratedDocument>;
  private templateIdCounter: number;
  private documentIdCounter: number;

  constructor() {
    this.users = new Map();
    this.templates = new Map();
    this.documents = new Map();
    this.templateIdCounter = 1;
    this.documentIdCounter = 1;
    
    // Initialize default templates
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates() {
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

    defaultTemplates.forEach((template) => {
      this.createTemplate(template);
    });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      fullName: null,
      schoolName: null,
      role: "teacher",
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  // Templates
  async getTemplate(id: number): Promise<Template | undefined> {
    return this.templates.get(id);
  }

  async getTemplates(): Promise<Template[]> {
    return Array.from(this.templates.values()).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async getTemplatesByType(documentType: string): Promise<Template[]> {
    return Array.from(this.templates.values()).filter(
      (t) => t.documentType === documentType
    );
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const id = this.templateIdCounter++;
    const template: Template = {
      ...insertTemplate,
      id,
      description: insertTemplate.description ?? null,
      isDefault: insertTemplate.isDefault ?? false,
      promptTemplate: insertTemplate.promptTemplate ?? null,
      createdAt: new Date(),
    };
    this.templates.set(id, template);
    return template;
  }

  // Documents
  async getDocument(id: number): Promise<GeneratedDocument | undefined> {
    return this.documents.get(id);
  }

  async getDocuments(): Promise<GeneratedDocument[]> {
    return Array.from(this.documents.values()).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async createDocument(insertDoc: InsertGeneratedDocument): Promise<GeneratedDocument> {
    const id = this.documentIdCounter++;
    const document: GeneratedDocument = {
      ...insertDoc,
      id,
      templateId: insertDoc.templateId ?? null,
      inputData: insertDoc.inputData ?? null,
      generatedContent: insertDoc.generatedContent ?? null,
      status: insertDoc.status ?? "pending",
      processingTimeMs: insertDoc.processingTimeMs ?? null,
      createdAt: new Date(),
    };
    this.documents.set(id, document);
    return document;
  }

  async updateDocument(id: number, updates: Partial<GeneratedDocument>): Promise<GeneratedDocument | undefined> {
    const existing = this.documents.get(id);
    if (!existing) return undefined;
    
    const updated: GeneratedDocument = { ...existing, ...updates };
    this.documents.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
