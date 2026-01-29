import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  generateDocumentRequestSchema,
  aftercarePlanInputsSchema,
  aftercareReportInputsSchema,
  type GenerateDocumentRequest,
} from "@shared/schema";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { setupAuth, isAuthenticated, isSystemAdmin, hasRole, requireFullAuth } from "./auth";
import { adminRouter } from "./admin/routes";
import { chatRouter } from "./chat/routes";
import { USER_TYPES } from "@shared/models/auth";
import multer from "multer";
import { parseHwpFile, chunkText } from "./hwpParser";
import { crawlDocumentFromUrl } from "./crawler";
import { exportToDocx, exportToPdf } from "./documentExporter";
import { getRagReferenceDocuments } from "./rag";
import { buildRagPrompt } from "./prompts";
import {
  AFTERCARE_FIELD_KEYS,
  checkPolicyNoNewNumbers,
  generateAftercareFieldText,
  mergeDeep,
  renderAftercarePlanHtml,
  renderAftercareReportHtml,
  validateInputs,
  type GeneratedField,
  type ToolId,
} from "./aftercare";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith(".hwp") || 
        file.mimetype === "application/x-hwp" ||
        file.mimetype === "application/octet-stream") {
      cb(null, true);
    } else {
      cb(new Error("HWP 파일만 업로드 가능합니다"));
    }
  },
});

const toRagInputs = (context?: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(context || {}).map(([key, value]) => [
      key,
      typeof value === "string" ? value : JSON.stringify(value),
    ]),
  );

const attachmentsRoot = path.resolve(process.cwd(), "uploads", "attachments");
fs.mkdirSync(attachmentsRoot, { recursive: true });

const attachmentUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, attachmentsRoot),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "");
      const safeExt = ext.length <= 10 ? ext : "";
      const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${safeExt}`;
      cb(null, uniqueName);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// Initialize Anthropic client with AI Integrations
const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

// Initialize OpenAI client lazily to avoid startup crash when key is missing
let openaiClient: OpenAI | null = null;
const getOpenAiClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication (MUST be before other routes)
  await setupAuth(app);
  app.use("/api/admin", adminRouter);
  app.use("/api", chatRouter);

  // Initialize default templates if needed
  await storage.initializeDefaultTemplates();
  
  // Get all templates
  app.get("/api/templates", async (req, res) => {
    try {
      const templates = await storage.getTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  // Get templates by document type
  app.get("/api/templates/type/:documentType", async (req, res) => {
    try {
      const { documentType } = req.params;
      const templates = await storage.getTemplatesByType(decodeURIComponent(documentType));
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  // Get all generated documents (scoped to authenticated user if logged in)
  app.get("/api/documents", async (req, res) => {
    try {
      const userId = req.user?.id?.toString();
      const hasQuery = Object.keys(req.query || {}).length > 0;

      if (!userId) {
        return res.json(
          hasQuery
            ? { success: true, data: { documents: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } } }
            : []
        );
      }

      if (hasQuery) {
        const page = Math.max(1, Number(req.query.page || 1));
        const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
        const sortBy = (req.query.sortBy as "createdAt" | "updatedAt" | "title") || "createdAt";
        const order = (req.query.order as "asc" | "desc") || "desc";
        const documentType = req.query.documentType ? String(req.query.documentType) : undefined;
        const status = req.query.status ? String(req.query.status) : undefined;
        const isFavorite = typeof req.query.isFavorite === "string" ? req.query.isFavorite === "true" : undefined;
        const search = req.query.search ? String(req.query.search) : undefined;

        const result = await storage.getDocumentsPaged(userId, {
          page,
          limit,
          sortBy,
          order,
          documentType,
          status,
          isFavorite,
          search,
        });

        return res.json({
          success: true,
          data: {
            documents: result.documents,
            pagination: {
              total: result.total,
              page,
              limit,
              totalPages: Math.max(1, Math.ceil(result.total / limit)),
            },
          },
        });
      }

      const documents = await storage.getDocuments(userId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  // Get single document (requires authentication and ownership)
  app.get("/api/documents/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }
      
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      // Check ownership: users can only view their own documents
      const userId = req.user?.id?.toString();
      
      // Anonymous documents (userId is null) cannot be accessed via API
      // They are only viewable immediately after creation via state
      if (!document.userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      if (document.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const updated = await storage.updateDocument(id, {
        viewCount: (document.viewCount ?? 0) + 1,
      });
      res.json({ success: true, data: updated || document });
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ error: "Failed to fetch document" });
    }
  });

  // Create document manually (without AI)
  app.post("/api/documents", requireFullAuth, async (req, res) => {
    try {
      const {
        documentType,
        content,
        title,
        schoolName,
        metadata,
        generatedContent,
        referenceFileId,
        referenceFileName,
        status,
      } = req.body;
      
      if (!content || !title || !documentType) {
        return res.status(400).json({ error: "필수 입력값이 누락되었습니다." });
      }

      const userId = req.user?.id?.toString();
      
      // Get template for document type
      const templates = await storage.getTemplatesByType(documentType || "가정통신문");
      const template = templates.find(t => t.isDefault) || templates[0];
      
      let resolvedReferenceFileName = referenceFileName;
      if (referenceFileId && !resolvedReferenceFileName) {
        const uploadedTemplate = await storage.getUploadedTemplate(Number(referenceFileId));
        resolvedReferenceFileName = uploadedTemplate?.originalName;
      }

      const derivedSchoolName = schoolName || (() => {
        const match = typeof content === "string" ? content.match(/학교명:\s*([^\n]+)/) : null;
        return match ? match[1].trim() : null;
      })();

      const document = await storage.createDocument({
        templateId: template?.id || null,
        userId: userId || null,
        documentType: documentType || "가정통신문",
        title,
        schoolName: derivedSchoolName || null,
        metadata: metadata || null,
        content,
        inputData: {},
        generatedContent: generatedContent || content,
        status: status || "completed",
        referenceFileId: referenceFileId ? Number(referenceFileId) : null,
        referenceFileName: resolvedReferenceFileName || null,
        updatedAt: new Date(),
        viewCount: 0,
        editCount: 0,
        processingTimeMs: 0,
      });

      res.status(201).json({ success: true, data: { id: document.id, message: "문서가 저장되었습니다." } });
    } catch (error) {
      console.error("Error creating document:", error);
      res.status(500).json({ error: "Failed to create document" });
    }
  });

  // Update document
  app.put("/api/documents/:id", requireFullAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: { code: "DOCUMENT_NOT_FOUND", message: "문서를 찾을 수 없습니다." } });
      }

      const document = await storage.getDocument(id);
      if (!document || document.userId !== req.user?.id?.toString()) {
        return res.status(403).json({ error: { code: "UNAUTHORIZED", message: "접근 권한이 없습니다." } });
      }

      const updates = {
        ...req.body,
        updatedAt: new Date(),
        editCount: (document.editCount ?? 0) + 1,
      };

      await storage.updateDocument(id, updates);
      res.json({ success: true, data: { id, message: "문서가 수정되었습니다." } });
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ error: { code: "DATABASE_ERROR", message: "문서 수정 중 오류가 발생했습니다." } });
    }
  });

  // Delete document
  app.delete("/api/documents/:id", requireFullAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: { code: "DOCUMENT_NOT_FOUND", message: "문서를 찾을 수 없습니다." } });
      }

      const document = await storage.getDocument(id);
      if (!document || document.userId !== req.user?.id?.toString()) {
        return res.status(403).json({ error: { code: "UNAUTHORIZED", message: "접근 권한이 없습니다." } });
      }

      const deleted = await storage.deleteDocument(id);
      if (!deleted) {
        return res.status(404).json({ error: { code: "DOCUMENT_NOT_FOUND", message: "문서를 찾을 수 없습니다." } });
      }

      res.json({ success: true, data: { message: "문서가 삭제되었습니다." } });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ error: { code: "DATABASE_ERROR", message: "문서 삭제 중 오류가 발생했습니다." } });
    }
  });

  // Duplicate document
  app.post("/api/documents/:id/duplicate", requireFullAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: { code: "DOCUMENT_NOT_FOUND", message: "문서를 찾을 수 없습니다." } });
      }

      const document = await storage.getDocument(id);
      if (!document || document.userId !== req.user?.id?.toString()) {
        return res.status(403).json({ error: { code: "UNAUTHORIZED", message: "접근 권한이 없습니다." } });
      }

      const duplicated = await storage.createDocument({
        templateId: document.templateId,
        userId: document.userId,
        documentType: document.documentType,
        title: `${document.title} (복사본)`,
        schoolName: document.schoolName,
        metadata: document.metadata,
        content: document.content,
        inputData: document.inputData,
        generatedContent: document.generatedContent,
        status: "draft",
        isFavorite: false,
        referenceFileId: document.referenceFileId,
        referenceFileName: document.referenceFileName,
        updatedAt: new Date(),
        viewCount: 0,
        editCount: 0,
      });

      res.json({ success: true, data: { id: duplicated.id, message: "문서가 복사되었습니다." } });
    } catch (error) {
      console.error("Error duplicating document:", error);
      res.status(500).json({ error: { code: "DATABASE_ERROR", message: "문서 복사 중 오류가 발생했습니다." } });
    }
  });

  // Toggle favorite
  app.patch("/api/documents/:id/favorite", requireFullAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: { code: "DOCUMENT_NOT_FOUND", message: "문서를 찾을 수 없습니다." } });
      }

      const document = await storage.getDocument(id);
      if (!document || document.userId !== req.user?.id?.toString()) {
        return res.status(403).json({ error: { code: "UNAUTHORIZED", message: "접근 권한이 없습니다." } });
      }

      const isFavorite = !!req.body?.isFavorite;
      const updated = await storage.updateDocument(id, { isFavorite, updatedAt: new Date() });
      res.json({
        success: true,
        data: {
          isFavorite: updated?.isFavorite ?? isFavorite,
          message: isFavorite ? "즐겨찾기가 설정되었습니다." : "즐겨찾기가 해제되었습니다.",
        },
      });
    } catch (error) {
      console.error("Error toggling favorite:", error);
      res.status(500).json({ error: { code: "DATABASE_ERROR", message: "즐겨찾기 처리 중 오류가 발생했습니다." } });
    }
  });

  // Document stats
  app.get("/api/documents/stats", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id?.toString();
      if (!userId) {
        return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "접근 권한이 없습니다." } });
      }
      const stats = await storage.getDocumentStats(userId);
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error("Error fetching document stats:", error);
      res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: "통계 조회 실패" } });
    }
  });

  // Generate document with AI
  app.post("/api/documents/generate", async (req, res) => {
    const startTime = Date.now();
    
    try {
      // Validate request body
      const parseResult = generateDocumentRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid request",
          details: parseResult.error.errors 
        });
      }

      const { documentType, inputs, uploadedTemplateId } = parseResult.data;

      const extractSchoolName = (data: Record<string, string>) => {
        if (data.schoolName) return data.schoolName;
        const basicInfo = data.basicInfo || "";
        const match = basicInfo.match(/학교명:\s*([^\n]+)/);
        return match ? match[1].trim() : null;
      };

      const extractMetadata = (data: Record<string, string>) => {
        const metadata: Record<string, unknown> = {};
        if (data.purpose) metadata.purpose = data.purpose;
        if (data.location) metadata.location = data.location;
        if (data.tripDate) metadata.targetDate = data.tripDate;
        if (data.startDate) metadata.targetDate = data.startDate;
        if (data.gradeClass) metadata.targetGrade = data.gradeClass;
        if (data.targetStudents) metadata.targetGrade = data.targetStudents;
        if (data.programName) metadata.program = data.programName;
        return metadata;
      };

      const extractContent = (data: Record<string, string>) => {
        return (
          data.mainContent ||
          data.contents ||
          data.basicInfo ||
          data.overview ||
          ""
        );
      };

      // Get the default template for this document type
      const templates = await storage.getTemplatesByType(documentType);
      const template = templates.find(t => t.isDefault) || templates[0];
      
      if (!template || !template.promptTemplate) {
        return res.status(404).json({ error: "Template not found for this document type" });
      }

      // Build the prompt by replacing placeholders
      let prompt = template.promptTemplate;
      for (const [key, value] of Object.entries(inputs)) {
        prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), value || "(미입력)");
      }

      // Add RAG context from uploaded template if provided
      let ragContext = "";
      if (uploadedTemplateId) {
        const uploadedTemplate = await storage.getUploadedTemplate(uploadedTemplateId);
        if (uploadedTemplate && uploadedTemplate.extractedText) {
          const embeddings = await storage.getEmbeddingsByTemplateId(uploadedTemplateId);
          const contextChunks = embeddings.slice(0, 5).map(e => e.chunkText).join("\n\n");
          
          ragContext = `
[참조 문서 서식]
다음은 참고할 수 있는 기존 문서 서식입니다. 이 서식의 구조, 표현 방식, 톤을 참고하여 문서를 작성해주세요:

${contextChunks || uploadedTemplate.extractedText.substring(0, 2000)}

[참조 문서 서식 끝]

`;
        }
      } else {
        const crawlerTemplates = await storage.getUploadedTemplatesByType("crawler", 2);
        if (crawlerTemplates.length > 0) {
          const crawlerSections: string[] = [];
          for (const crawlerTemplate of crawlerTemplates) {
            const embeddings = await storage.getEmbeddingsByTemplateId(crawlerTemplate.id);
            const contextChunks = embeddings.slice(0, 3).map(e => e.chunkText).join("\n\n");
            const fallbackText = crawlerTemplate.extractedText?.substring(0, 1500) || "";
            crawlerSections.push(
              `[참고 문서: ${crawlerTemplate.originalName}]\n` +
              `${contextChunks || fallbackText}\n` +
              `[참고 문서 끝]`
            );
          }
          if (crawlerSections.length > 0) {
            ragContext = `
[관리자 참고 문서]
다음 참고 문서들을 바탕으로 문서를 작성해주세요:

${crawlerSections.join("\n\n")}

[관리자 참고 문서 끝]

`;
          }
        }
      }

      const ragDocuments = await getRagReferenceDocuments({
        documentType,
        inputs,
        limit: 3,
      });

      prompt = buildRagPrompt({
        basePrompt: prompt,
        ragDocuments,
        extraContext: ragContext,
      });

      // Create initial document record
      const title = inputs.title || `${documentType} - ${new Date().toLocaleDateString('ko-KR')}`;
      const userId = req.user?.id?.toString();
      const schoolName = extractSchoolName(inputs);
      const metadata = extractMetadata(inputs);
      const content = extractContent(inputs);
      const uploadedTemplate = uploadedTemplateId ? await storage.getUploadedTemplate(uploadedTemplateId) : undefined;

      const document = await storage.createDocument({
        templateId: template.id,
        userId: userId || null,
        documentType,
        title,
        schoolName: schoolName || null,
        metadata,
        content: content || null,
        inputData: inputs,
        status: "pending",
        referenceFileId: uploadedTemplateId || null,
        referenceFileName: uploadedTemplate?.originalName || null,
        updatedAt: new Date(),
        viewCount: 0,
        editCount: 0,
      });

      // Generate content using Anthropic or OpenAI (fallback)
      let generatedContent: string;
      const hasAnthropicKey = !!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
      const hasOpenAiKey = !!process.env.OPENAI_API_KEY;

      const generateWithOpenAI = async () => {
        const client = getOpenAiClient();
        if (!client) {
          throw new Error("OPENAI_API_KEY is not set.");
        }
        const completion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          max_tokens: 1600,
          temperature: 0.7,
          messages: [{ role: "user", content: prompt }],
        });
        return completion.choices[0]?.message?.content || "";
      };

      try {
        if (hasAnthropicKey) {
          const message = await anthropic.messages.create({
            model: "claude-sonnet-4-5",
            max_tokens: 4096,
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
          });

          const content = message.content[0];
          generatedContent = content.type === "text" ? content.text : "";
        } else if (hasOpenAiKey) {
          generatedContent = await generateWithOpenAI();
        } else {
          throw new Error("No AI API key configured");
        }
      } catch (aiError) {
        if (hasAnthropicKey && hasOpenAiKey) {
          try {
            generatedContent = await generateWithOpenAI();
          } catch (fallbackError) {
            console.error("AI generation error:", aiError, fallbackError);
            await storage.updateDocument(document.id, {
              status: "failed",
              processingTimeMs: Date.now() - startTime,
            });
            return res.status(500).json({
              error: "AI 문서 생성에 실패했습니다. 잠시 후 다시 시도해주세요.",
              documentId: document.id,
            });
          }
        } else {
          console.error("AI generation error:", aiError);
          await storage.updateDocument(document.id, {
            status: "failed",
            processingTimeMs: Date.now() - startTime,
          });
          return res.status(500).json({
            error: "AI 문서 생성에 실패했습니다. 잠시 후 다시 시도해주세요.",
            documentId: document.id,
          });
        }
      }

      // Update document with generated content
      const processingTimeMs = Date.now() - startTime;
      const updatedDocument = await storage.updateDocument(document.id, {
        generatedContent,
        status: "completed",
        processingTimeMs,
        updatedAt: new Date(),
      });

      res.status(201).json(updatedDocument);
    } catch (error) {
      console.error("Error generating document:", error);
      res.status(500).json({ error: "Failed to generate document" });
    }
  });

  // Generate content for a specific field using AI
  app.post("/api/documents/generate-field", async (req, res) => {
    try {
      const { documentType, fieldName, fieldLabel, context } = req.body;
      
      if (!documentType || !fieldName || !fieldLabel) {
        return res.status(400).json({ error: "documentType, fieldName, and fieldLabel are required" });
      }

      // Build context-aware prompt for specific field generation
      const contextDescription = Object.entries(context || {})
        .filter(([key, value]) => key !== fieldName && value)
        .map(([key, value]) => `- ${key}: ${value}`)
        .join("\n");

      let prompt = "";
      
      if (documentType === "가정통신문") {
        if (fieldName === "mainContent") {
          prompt = `당신은 한국 학교의 가정통신문 작성 전문가입니다.
다음 정보를 바탕으로 '주요 내용' 부분만 작성해주세요.

[제공된 정보]
${contextDescription || "제목, 학교명, 목적 등의 정보가 아직 입력되지 않았습니다."}

[작성 지침]
- 학부모님께 전달할 핵심 내용을 명확하고 간결하게 작성
- 공손하고 격식 있는 어투 사용
- 번호 매기기나 구조화된 형식 활용
- 200-400자 내외로 작성

'주요 내용' 텍스트만 출력하세요 (제목이나 설명 없이):`;
        } else if (fieldName === "additionalNotes") {
          prompt = `당신은 한국 학교의 가정통신문 작성 전문가입니다.
다음 정보를 바탕으로 '추가 사항' 부분만 작성해주세요.

[제공된 정보]
${contextDescription || "제목, 학교명, 주요 내용 등의 정보가 아직 입력되지 않았습니다."}

[작성 지침]
- 회신서 제출 안내, 문의처, 기타 참고사항 등 포함
- 학부모님께서 취해야 할 행동이 있다면 명확히 안내
- 100-200자 내외로 작성

'추가 사항' 텍스트만 출력하세요 (제목이나 설명 없이):`;
        }
      } else if (documentType === "급식안내문") {
        if (fieldName === "greeting") {
          prompt = `당신은 학교 급식 담당 영양(교)사입니다.
학부모님께 전달할 급식안내문 인사말을 작성해주세요.

[입력 정보]
${contextDescription || "학년도, 월, 급식 기간 정보가 아직 입력되지 않았습니다."}

[작성 지침]
- 공문서 형식의 격식체 + 따뜻하고 친절한 톤
- 학년도/월/급식 기간 정보가 있다면 자연스럽게 언급
- 위생·안전·영양에 대한 간단한 안내 포함
- 3~5문장, 줄바꿈 없이 작성

인사말 텍스트만 출력하세요 (제목이나 설명 없이).`;
        } else if (fieldName === "paymentDetails") {
          prompt = `당신은 학교 급식 담당 영양(교)사입니다.
다음 정보를 바탕으로 납부내역 표 데이터를 생성해주세요.

[입력 정보]
${contextDescription || "급식 기간, 납부 기간 정보가 아직 입력되지 않았습니다."}

[작성 지침]
- 1~3개의 행 생성
- 학년, 구분, 산출내역, 납부금액, 비고로 구성
- 금액 표기는 예: 70,800원 형식
- 비고는 비워도 됨
- 입력 정보(급식 기간/납부 기간)가 있으면 산출내역에 반영

[출력 형식]
아래 JSON 배열만 출력하세요. 코드블록/설명 텍스트 금지:
[
  {"grade":"1학년","category":"석식(수요일 비희망)","calculation":"12일*5,900원=70,800원","amount":"70,800원","note":""}
]
`;
        } else if (fieldName === "notices") {
          prompt = `당신은 학교 급식 담당 영양(교)사입니다.
다음 정보를 바탕으로 추가 안내 항목을 작성해주세요.

[입력 정보]
${contextDescription || "안내 내용을 작성하기 위한 기본 정보가 아직 입력되지 않았습니다."}

[작성 지침]
- 2~4개 항목
- 학부모가 알아야 할 안내사항 중심
- 알레르기 유발 식품, 신청/변경/취소, 위생·안전, 환불/결석 기준 등 포함
- 공손하고 전문적인 문장, 간결하게 작성

[출력 형식]
아래 JSON 배열만 출력하세요. 코드블록/설명 텍스트 금지:
["급식 신청 및 취소는 전월 1일~5일 사이에 진행됩니다.","학교에서 인정하는 장기결석은 증빙 제출 시 환불 가능합니다."]
`;
        }
      } else if (documentType === "수능/모의평가 안내") {
        if (fieldName === "greeting") {
          prompt = `당신은 고등학교 교무부 담당 교사입니다.
수능 또는 모의평가 안내문의 인사말을 작성해주세요.

[입력 정보]
${contextDescription || "학년도, 시험 유형(수능/6월 모의평가/9월 모의평가), 시험일 정보가 아직 입력되지 않았습니다."}

[작성 지침]
- 학부모님과 학생에게 전달하는 공문서 형식의 격식체
- 계절 인사와 학교 교육에 대한 관심 감사
- 시험(수능/모의평가)의 중요성과 성공적인 응시를 위한 안내임을 명시
- 학생들의 노력에 대한 격려와 좋은 결과를 기원하는 내용 포함
- 4~6문장, 줄바꿈 없이 작성

인사말 텍스트만 출력하세요 (제목이나 설명 없이).`;
        } else if (fieldName === "cautions") {
          prompt = `당신은 고등학교 교무부 담당 교사입니다.
수능 또는 모의평가 응시 시 유의사항을 작성해주세요.

[입력 정보]
${contextDescription || "시험 유형 정보가 아직 입력되지 않았습니다."}

[작성 지침]
다음 내용을 반드시 포함하여 작성:
1. 전자기기 반입 금지 (휴대폰, 스마트워치, 무선이어폰, 전자계산기 등)
2. 신분증 및 수험표 지참 필수
3. 지정된 필기구만 사용 (검은색 사인펜, 컴퓨터용 사인펜)
4. 부정행위 시 불이익 (해당 시험 무효, 응시 제한 등)
5. 입실 시간 준수 (지각 시 해당 교시 응시 불가)
6. 점심시간 외출 금지 및 휴식 시간 안내
7. 답안 작성 및 수정 방법

[출력 형식]
- 각 항목을 번호 또는 기호(•, -, 등)로 구분
- 명확하고 간결하게 작성
- 8~12개 항목으로 구성
- 줄바꿈으로 항목 구분

유의사항 텍스트만 출력하세요 (제목이나 설명 없이).`;
        }
      } else if (documentType === "외부 교육 용역 계획서") {
        if (fieldName === "objectives") {
          prompt = `당신은 한국 학교의 교육 계획서 작성 전문가입니다.
다음 정보를 바탕으로 '교육 목표' 부분만 작성해주세요.

[제공된 정보]
${contextDescription || "프로그램명, 대상 학생 등의 정보가 아직 입력되지 않았습니다."}

[작성 지침]
- 교육을 통해 달성하고자 하는 구체적인 목표 3-5개 작성
- 각 목표는 측정 가능하고 명확하게
- 번호 매기기 형식 사용

'교육 목표' 텍스트만 출력하세요 (제목이나 설명 없이):`;
        } else if (fieldName === "contents") {
          prompt = `당신은 한국 학교의 교육 계획서 작성 전문가입니다.
다음 정보를 바탕으로 '교육 내용' 부분만 작성해주세요.

[제공된 정보]
${contextDescription || "프로그램명, 교육 목표 등의 정보가 아직 입력되지 않았습니다."}

[작성 지침]
- 교육 프로그램의 세부 내용과 진행 방식 작성
- 회차별 또는 주제별로 구조화
- 구체적인 활동 내용 포함
- 300-500자 내외로 작성

'교육 내용' 텍스트만 출력하세요 (제목이나 설명 없이):`;
        } else if (fieldName === "expectedOutcomes") {
          prompt = `당신은 한국 학교의 교육 계획서 작성 전문가입니다.
다음 정보를 바탕으로 '기대 효과' 부분만 작성해주세요.

[제공된 정보]
${contextDescription || "프로그램명, 교육 목표, 교육 내용 등의 정보가 아직 입력되지 않았습니다."}

[작성 지침]
- 교육 이후 예상되는 효과와 성과
- 학생, 학교, 지역사회에 미치는 긍정적 영향
- 150-250자 내외로 작성

'기대 효과' 텍스트만 출력하세요 (제목이나 설명 없이):`;
        }
      } else if (documentType === "교외체험학습 신청서") {
        if (fieldName === "purpose") {
          prompt = `당신은 한국 초등학교 교외체험학습 신청서 작성을 도와주는 전문가입니다.
학부모가 작성하는 교외체험학습 신청서의 '체험학습 목적' 부분을 작성해주세요.

[제공된 정보]
${contextDescription || "학생 정보, 체험학습 기간, 유형, 목적지 등의 정보가 아직 입력되지 않았습니다."}

[작성 지침]
- 체험학습을 통해 얻고자 하는 교육적 목표와 기대 효과를 구체적으로 작성
- 가족과 함께하는 경험의 의미, 새로운 환경에서의 학습 기회 등 포함
- 학교에서 배운 내용과 연계할 수 있는 점이 있다면 언급
- 자연스럽고 진정성 있는 문장으로 작성
- 3~5문장, 150~250자 내외로 작성

체험학습 목적 텍스트만 출력하세요 (제목이나 설명 없이):`;
        } else if (fieldName === "planDays") {
          prompt = `당신은 한국 초등학교 교외체험학습 신청서 작성을 도와주는 전문가입니다.
학부모가 작성하는 교외체험학습 신청서의 '체험학습 계획' 부분을 작성해주세요.

[제공된 정보]
${contextDescription || "학생 정보, 체험학습 기간, 유형, 목적지 등의 정보가 아직 입력되지 않았습니다."}

[작성 지침]
- 제공된 기간과 목적지를 바탕으로 일차별 계획 작성
- 각 일차에 오전/오후/저녁 등 시간대별로 구체적인 활동 내용 포함
- 장소와 활동 내용을 명확하게 기술
- 교육적 가치가 있는 활동을 포함 (역사 탐방, 자연 체험, 문화 경험 등)
- 현실적이고 실현 가능한 일정으로 작성

[출력 형식]
아래 JSON 배열 형식만 출력하세요. 코드블록/설명 텍스트 금지:
[
  {
    "date": "2025-03-15",
    "activities": [
      {"time": "오전", "place": "장소명", "content": "활동 내용"},
      {"time": "오후", "place": "장소명", "content": "활동 내용"}
    ]
  },
  {
    "date": "2025-03-16",
    "activities": [
      {"time": "오전", "place": "장소명", "content": "활동 내용"},
      {"time": "오후", "place": "장소명", "content": "활동 내용"}
    ]
  }
]`;
        }
      }

      if (!prompt) {
        return res.status(400).json({ error: `지원하지 않는 필드입니다: ${fieldName}` });
      }

      const ragDocuments = await getRagReferenceDocuments({
        documentType,
        inputs: (context as Record<string, string>) || {},
        limit: 3,
      });
      prompt = buildRagPrompt({
        basePrompt: prompt,
        ragDocuments,
      });

      // Generate content using Anthropic or OpenAI (fallback)
      const hasAnthropicKey = !!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
      const hasOpenAiKey = !!process.env.OPENAI_API_KEY;
      let generatedText = "";

      const generateWithOpenAI = async () => {
        const client = getOpenAiClient();
        if (!client) {
          throw new Error("OPENAI_API_KEY is not set.");
        }
        const completion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          max_tokens: 800,
          temperature: 0.7,
          messages: [{ role: "user", content: prompt }],
        });
        return completion.choices[0]?.message?.content || "";
      };

      if (hasAnthropicKey) {
        try {
          const message = await anthropic.messages.create({
            model: "claude-sonnet-4-5",
            max_tokens: 1024,
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
          });

          const content = message.content[0];
          generatedText = content.type === "text" ? content.text : "";
        } catch (anthropicError) {
          if (!hasOpenAiKey) {
            throw anthropicError;
          }
          generatedText = await generateWithOpenAI();
        }
      } else if (hasOpenAiKey) {
        generatedText = await generateWithOpenAI();
      } else {
        return res.status(500).json({ error: "AI API 키가 설정되지 않았습니다." });
      }

      res.json({ 
        fieldName, 
        generatedContent: generatedText.trim() 
      });
    } catch (error) {
      console.error("Error generating field content:", error);
      res.status(500).json({ error: "AI 내용 생성에 실패했습니다. 잠시 후 다시 시도해주세요." });
    }
  });

  // ================== Safety Education Plan AI Generation API ==================
  app.post("/api/safety-education-plan/generate-ai-content", async (req, res) => {
    try {
      const { fieldName, context } = req.body;

      if (!fieldName) {
        return res.status(400).json({
          success: false,
          error: "fieldName이 필요합니다.",
        });
      }

      const basicInfo = context?.basicInfo || {};
      const schoolName = basicInfo?.schoolName || "학교";
      const schoolLevel = basicInfo?.schoolLevel || "elementary";
      const planType = basicInfo?.planType || "annual";

      const levelLabel =
        schoolLevel === "elementary" ? "초등학교" : schoolLevel === "middle" ? "중학교" : "고등학교";
      const planTypeLabel = planType === "annual" ? "연간 계획" : "학기별 계획";
      const currentValue = context?.currentValue || "";

      const areaLabelsMap: Record<string, string> = {
        lifeSafety: "생활안전",
        trafficSafety: "교통안전",
        violenceSafety: "폭력 및 신변안전",
        drugsCyberSafety: "약물 및 사이버중독 예방",
        disasterSafety: "재난안전",
        jobSafety: "직업안전",
        firstAid: "응급처치",
      };

      const areaKey = fieldName.endsWith("_content") ? fieldName.replace("_content", "") : null;
      const areaInfo = context?.areaInfo || {};

      const baseContext = [
        `학교명: ${schoolName}`,
        `학교급: ${levelLabel}`,
        `계획 유형: ${planTypeLabel}`,
      ].join("\n");

      const promptMap: Record<string, string> = {
        educationContent: `${baseContext}

다음 정보를 바탕으로 안전교육 내용을 작성해 주세요.

[입력 정보]
- 교육 영역: ${context?.areas?.join(", ") || "미정"}
- 대상 학년: ${context?.targetGrades || "미정"}
- 연간 시수: ${context?.annualHours || "미정"}

[작성 지침]
- 영역별 핵심 교육 내용을 포함
- 학년별 수준을 고려한 표현
- 4~6문장 또는 불릿 형태

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "교육 내용만 출력하세요."}`,
        goals: `${baseContext}

다음 정보를 바탕으로 안전교육 목표를 작성해 주세요.

[작성 지침]
- 3~5개 항목으로 번호를 매겨 작성
- 공문서 어투의 격식체 사용
- 학생 안전 의식 함양과 실천 역량을 강조

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "목표 내용만 출력하세요."}`,
        policy: `${baseContext}

다음 정보를 바탕으로 안전교육 운영 방침을 작성해 주세요.

[작성 지침]
- 3~4문장으로 작성
- 체험 중심, 예방 중심의 운영 원칙 포함
- 교육청 지침 준수 및 학교 구성원 협력 언급

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "운영 방침 내용만 출력하세요."}`,
        keyPoints: `${baseContext}

다음 정보를 바탕으로 중점 추진 사항을 작성해 주세요.

[작성 지침]
- 3~4개 항목으로 번호를 매겨 작성
- 지역사회 연계, 교직원 역량 강화 등 포함
- 실행 가능한 표현 사용

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "중점 추진 사항만 출력하세요."}`,
        improvements: `${baseContext}

다음 정보를 바탕으로 전년도 개선사항을 작성해 주세요.

[작성 지침]
- 2~3문장으로 작성
- 전년도 운영 결과를 바탕으로 개선 포인트를 제시

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "개선사항만 출력하세요."}`,
        infrastructure_facilities: `${baseContext}

안전교육 운영을 위한 교육 시설 현황을 작성해 주세요.

[작성 지침]
- 3~4문장 또는 불릿 형태로 작성
- 실제 활용 가능한 시설을 구체적으로 제시

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "시설 현황만 출력하세요."}`,
        infrastructure_materials: `${baseContext}

안전교육 자료 현황을 작성해 주세요.

[작성 지침]
- 3~4문장 또는 항목으로 작성
- 교재, 영상, 체험 장비 등 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "교육 자료 현황만 출력하세요."}`,
        infrastructure_experts: `${baseContext}

전문 강사 인력풀 및 연계 기관 현황을 작성해 주세요.

[작성 지침]
- 2~3문장으로 작성
- 소방서, 경찰서 등 협력 기관 명시

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "전문 강사 인력풀 내용만 출력하세요."}`,
        infrastructure_budget: `${baseContext}

안전교육 예산 계획을 작성해 주세요.

[작성 지침]
- 항목별 예산 배분을 포함
- 총 예산 요약을 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "예산 계획만 출력하세요."}`,
        infrastructure_committee: `${baseContext}

안전교육 협의체 구성 및 역할을 작성해 주세요.

[작성 지침]
- 2~3문장으로 작성
- 역할 분담을 간략히 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "협의체 내용만 출력하세요."}`,
        evaluation_methods: `${baseContext}

안전교육 평가 방법을 작성해 주세요.

[작성 지침]
- 3~4문장 또는 번호 목록으로 작성
- 사전/사후 검사, 만족도 조사 등을 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "평가 방법만 출력하세요."}`,
        evaluation_indicators: `${baseContext}

안전교육 평가 지표를 작성해 주세요.

[작성 지침]
- 3~4개 항목으로 작성
- 정량/정성 지표 혼합

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "평가 지표만 출력하세요."}`,
        evaluation_feedback: `${baseContext}

평가 결과 환류 계획을 작성해 주세요.

[작성 지침]
- 3~4문장으로 작성
- 차년도 계획 반영 및 보완 교육 내용 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "환류 계획만 출력하세요."}`,
        others_home: `${baseContext}

가정 연계 안전교육 계획을 작성해 주세요.

[작성 지침]
- 2~3문장으로 작성
- 학부모 참여 및 가정 안전 점검 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "가정 연계 교육 내용만 출력하세요."}`,
        others_community: `${baseContext}

지역사회 연계 안전교육 계획을 작성해 주세요.

[작성 지침]
- 2~3문장으로 작성
- 소방서, 경찰서 연계 활동 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "지역사회 연계 내용만 출력하세요."}`,
        others_special: `${baseContext}

특색 안전교육 프로그램을 작성해 주세요.

[작성 지침]
- 2~3문장으로 작성
- 학교 특색 프로그램 또는 행사 제안

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "특색 안전교육 내용만 출력하세요."}`,
        others_campaign: `${baseContext}

안전 캠페인 운영 계획을 작성해 주세요.

[작성 지침]
- 2~3문장으로 작성
- 안전 주간, 공모전, 캠페인 운영 등 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "안전 캠페인 내용만 출력하세요."}`,
      };

      if (areaKey && areaLabelsMap[areaKey]) {
        const areaLabel = areaLabelsMap[areaKey];
        promptMap[fieldName] = `${baseContext}

[안전교육 영역]
- 영역: ${areaLabel}
- 교육 시간: ${areaInfo?.hours || "(미입력)"}시간
- 교육 방법: ${(areaInfo?.methods || []).join(", ") || "(미입력)"}

다음 정보를 바탕으로 '${areaLabel}' 주요 교육 내용을 작성해 주세요.

[작성 지침]
- 4~6문장 또는 불릿으로 작성
- 교육 목표, 핵심 내용, 기대 효과 포함
- 학교급에 맞는 구체적 활동 제시

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "주요 교육 내용만 출력하세요."}`;
      }

      let prompt = promptMap[fieldName];
      if (!prompt) {
        return res.status(400).json({
          success: false,
          error: `지원하지 않는 필드입니다: ${fieldName}`,
        });
      }

      const ragDocuments1 = await getRagReferenceDocuments({
        documentType: "교내 행사 운영계획서",
        inputs: toRagInputs(context),
        limit: 3,
      });
      prompt = buildRagPrompt({ basePrompt: prompt, ragDocuments: ragDocuments1 });

      const ragDocuments2 = await getRagReferenceDocuments({
        documentType: "학교 안전교육 계획서",
        inputs: toRagInputs(context),
        limit: 3,
      });
      prompt = buildRagPrompt({ basePrompt: prompt, ragDocuments: ragDocuments2 });

      const hasAnthropicKey = !!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
      const hasOpenAiKey = !!process.env.OPENAI_API_KEY;
      let generatedText = "";

      const generateWithOpenAI = async () => {
        const client = getOpenAiClient();
        if (!client) {
          throw new Error("OPENAI_API_KEY is not set.");
        }
        const completion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          max_tokens: 900,
          temperature: 0.7,
          messages: [{ role: "user", content: prompt }],
        });
        return completion.choices[0]?.message?.content || "";
      };

      if (hasAnthropicKey) {
        try {
          const message = await anthropic.messages.create({
            model: "claude-sonnet-4-5",
            max_tokens: 1200,
            messages: [{ role: "user", content: prompt }],
          });
          const content = message.content[0];
          generatedText = content.type === "text" ? content.text : "";
        } catch (anthropicError) {
          if (!hasOpenAiKey) {
            throw anthropicError;
          }
          generatedText = await generateWithOpenAI();
        }
      } else if (hasOpenAiKey) {
        generatedText = await generateWithOpenAI();
      } else {
        return res.status(500).json({
          success: false,
          error: "AI API 키가 설정되지 않았습니다.",
        });
      }

      res.json({
        success: true,
        text: generatedText.trim(),
      });
    } catch (error) {
      console.error("Safety education AI generation error:", error);
      res.status(500).json({
        success: false,
        error: "AI 내용 생성에 실패했습니다. 잠시 후 다시 시도해주세요.",
      });
    }
  });

  // ================== Event Plan AI Generation API ==================
  app.post("/api/event-plan/generate-ai-content", async (req, res) => {
    try {
      const { fieldName, context } = req.body;

      if (!fieldName) {
        return res.status(400).json({
          success: false,
          error: "fieldName이 필요합니다.",
        });
      }

      const basicInfo = context?.basicInfo || {};
      const schoolName = basicInfo?.schoolName || "학교";
      const eventName = context?.eventName || basicInfo?.eventName || "교내 행사";
      const eventType = context?.eventType || basicInfo?.eventType || "행사";
      const participants = (basicInfo?.participants || []).join(", ");
      const expectedCount = basicInfo?.expectedCount;
      const eventDateTime =
        context?.eventDateTime ||
        `${basicInfo?.startDateTime || ""} ~ ${basicInfo?.endDateTime || ""}`.trim();
      const location = context?.eventLocation || basicInfo?.location;
      const currentValue = context?.currentValue || "";

      const baseContext = [
        `학교명: ${schoolName}`,
        `행사명: ${eventName}`,
        `행사 유형: ${eventType}`,
        eventDateTime ? `행사 일시: ${eventDateTime}` : "",
        location ? `행사 장소: ${location}` : "",
        participants ? `참가 대상: ${participants}` : "",
        expectedCount ? `예상 참가 인원: ${expectedCount}명` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const promptMap: Record<string, string> = {
        eventProgram: `${baseContext}

다음 정보를 바탕으로 행사 프로그램을 작성해 주세요.

[작성 지침]
- 4~6개 내외의 프로그램 항목
- 행사 유형에 맞는 활동 구성
- 간결한 문장 또는 불릿 형식

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "프로그램 내용만 출력하세요."}`,
        eventSafetyPlan: `${baseContext}

다음 정보를 바탕으로 행사 안전 계획을 작성해 주세요.

[작성 지침]
- 인원 통제, 응급 대응, 안전 교육 포함
- 3~5문장으로 작성

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "안전 계획만 출력하세요."}`,
        purpose: `${baseContext}

다음 정보를 바탕으로 행사 목적을 작성해 주세요.

[작성 지침]
- 3~4문장으로 작성
- 공문서 어투의 격식체 사용
- 교육적 의의 및 공동체 가치 강조

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "행사 목적 내용만 출력하세요."}`,
        summary: `${baseContext}

다음 정보를 바탕으로 행사 개요를 작성해 주세요.

[작성 지침]
- 3~4문장으로 작성
- 행사 구성과 진행 방식 요약
- 행사 유형별 특성 반영

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "행사 개요 내용만 출력하세요."}`,
        background: `${baseContext}

다음 정보를 바탕으로 추진 배경을 작성해 주세요.

[작성 지침]
- 2~3문장으로 작성
- 행사 추진 필요성과 기대되는 변화 서술

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "추진 배경 내용만 출력하세요."}`,
        expectedEffects: `${baseContext}

다음 정보를 바탕으로 기대 효과를 작성해 주세요.

[작성 지침]
- 3~4문장으로 작성
- 학생 성장, 공동체 활성화, 교육적 효과 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "기대 효과 내용만 출력하세요."}`,
        policy: `${baseContext}

다음 정보를 바탕으로 운영 방침을 작성해 주세요.

[작성 지침]
- 3~4문장으로 작성
- 안전 최우선, 참여 확대, 공정한 운영 원칙 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "운영 방침 내용만 출력하세요."}`,
        preparation: `${baseContext}

다음 정보를 바탕으로 준비 사항을 작성해 주세요.

[작성 지침]
- 4~5문장 또는 항목으로 작성
- 필요한 물품, 시설, 인력 준비 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "준비 사항 내용만 출력하세요."}`,
        specialProgram: `${baseContext}

다음 정보를 바탕으로 특별 프로그램을 작성해 주세요.

[작성 지침]
- 2~3문장으로 작성
- 행사 유형에 맞는 특색 프로그램 제안

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "특별 프로그램 내용만 출력하세요."}`,
        committee: `${baseContext}

다음 정보를 바탕으로 위원회 구성을 작성해 주세요.

[작성 지침]
- 2~3문장 또는 항목으로 작성
- 위원장, 부위원장, 위원 구성 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "위원회 구성 내용만 출력하세요."}`,
        measures: `${baseContext}

다음 정보를 바탕으로 안전 관리 대책을 작성해 주세요.

[작성 지침]
- 4~5문장으로 작성
- 안전요원 배치, 동선 관리, 위험 요소 점검 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "안전 관리 대책 내용만 출력하세요."}`,
        emergencyContact: `${baseContext}

다음 정보를 바탕으로 비상 연락망을 작성해 주세요.

[작성 지침]
- 항목형으로 작성
- 담당자, 학교, 119 등 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "비상 연락망 내용만 출력하세요."}`,
        firstAid: `${baseContext}

다음 정보를 바탕으로 응급 처치 체계를 작성해 주세요.

[작성 지침]
- 3~4문장으로 작성
- 보건실/의료진 대기, 응급 이송 절차 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "응급 처치 체계 내용만 출력하세요."}`,
        weatherPlan: `${baseContext}

다음 정보를 바탕으로 기상 악화 대책을 작성해 주세요.

[작성 지침]
- 2~3문장으로 작성
- 우천 시 대체 일정, 실내 전환 등 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "기상 악화 대책 내용만 출력하세요."}`,
        evaluation_methods: `${baseContext}

다음 정보를 바탕으로 평가 방법을 작성해 주세요.

[작성 지침]
- 3~4문장 또는 번호 목록으로 작성
- 설문조사, 평가회, 운영진 회의 등 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "평가 방법 내용만 출력하세요."}`,
        evaluation_indicators: `${baseContext}

다음 정보를 바탕으로 평가 지표를 작성해 주세요.

[작성 지침]
- 3~4개 항목으로 작성
- 참가율, 만족도, 안전사고 지표 등 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "평가 지표 내용만 출력하세요."}`,
        evaluation_feedback: `${baseContext}

다음 정보를 바탕으로 환류 계획을 작성해 주세요.

[작성 지침]
- 3~4문장으로 작성
- 차년도 반영, 우수 사례 공유 등 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "환류 계획 내용만 출력하세요."}`,
      };

      let prompt = promptMap[fieldName];
      if (!prompt) {
        return res.status(400).json({
          success: false,
          error: `지원하지 않는 필드입니다: ${fieldName}`,
        });
      }

      const ragDocuments = await getRagReferenceDocuments({
        documentType: "교내 행사 운영계획서",
        inputs: toRagInputs(context),
        limit: 3,
      });
      prompt = buildRagPrompt({ basePrompt: prompt, ragDocuments });

      const hasAnthropicKey = !!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
      const hasOpenAiKey = !!process.env.OPENAI_API_KEY;
      let generatedText = "";

      const generateWithOpenAI = async () => {
        const client = getOpenAiClient();
        if (!client) {
          throw new Error("OPENAI_API_KEY is not set.");
        }
        const completion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          max_tokens: 900,
          temperature: 0.7,
          messages: [{ role: "user", content: prompt }],
        });
        return completion.choices[0]?.message?.content || "";
      };

      if (hasAnthropicKey) {
        try {
          const message = await anthropic.messages.create({
            model: "claude-sonnet-4-5",
            max_tokens: 1200,
            messages: [{ role: "user", content: prompt }],
          });
          const content = message.content[0];
          generatedText = content.type === "text" ? content.text : "";
        } catch (anthropicError) {
          if (!hasOpenAiKey) {
            throw anthropicError;
          }
          generatedText = await generateWithOpenAI();
        }
      } else if (hasOpenAiKey) {
        generatedText = await generateWithOpenAI();
      } else {
        return res.status(500).json({
          success: false,
          error: "AI API 키가 설정되지 않았습니다.",
        });
      }

      res.json({
        success: true,
        text: generatedText.trim(),
      });
    } catch (error) {
      console.error("Event plan AI generation error:", error);
      res.status(500).json({
        success: false,
        error: "AI 내용 생성에 실패했습니다. 잠시 후 다시 시도해주세요.",
      });
    }
  });

  // ================== Parent Meeting AI Generation API ==================
  app.post("/api/parent-meeting/generate-ai-content", async (req, res) => {
    try {
      const { fieldName, context } = req.body;

      if (!fieldName) {
        return res.status(400).json({
          success: false,
          error: "fieldName이 필요합니다.",
        });
      }

      const basicInfo = context?.basicInfo || {};
      const agendaItems = context?.agendaItems || [];
      const attendance = context?.attendance || {};
      const schedule = context?.schedule || {};
      const currentValue = context?.currentValue || "";

      const baseContext = [
        `학교명: ${basicInfo?.schoolName || "학교"}`,
        basicInfo?.meetingType ? `총회 유형: ${basicInfo.meetingType}` : "",
        basicInfo?.grade ? `학년: ${basicInfo.grade}` : "",
        basicInfo?.classNumber ? `학급: ${basicInfo.classNumber}반` : "",
        basicInfo?.meetingSession ? `총회 차수: ${basicInfo.meetingSession}` : "",
        basicInfo?.period ? `개최 시기: ${basicInfo.period}` : "",
        basicInfo?.author ? `작성자: ${basicInfo.author}` : "",
        basicInfo?.position ? `직책: ${basicInfo.position}` : "",
        schedule?.date ? `개최 날짜: ${schedule.date}` : "",
        schedule?.startTime && schedule?.endTime ? `개최 시간: ${schedule.startTime} ~ ${schedule.endTime}` : "",
        schedule?.location ? `개최 장소: ${schedule.location}` : "",
        attendance?.method ? `참석 방법: ${attendance.method}` : "",
        attendance?.replyRequired ? `참석 회신: ${attendance.replyRequired}` : "",
        attendance?.replyDeadline ? `회신 기한: ${attendance.replyDeadline}` : "",
        agendaItems.length
          ? `안건 목록: ${agendaItems
              .map((item: { title?: string; manager?: string }, index: number) => {
                const title = item.title || "(미입력)";
                const manager = item.manager ? `(${item.manager})` : "";
                return `${index + 1}. ${title}${manager}`;
              })
              .join(", ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");

      const promptMap: Record<string, string> = {
        agendaDetails: `${baseContext}

다음 정보를 바탕으로 학부모총회 안건 상세 내용을 작성해 주세요.

[작성 지침]
- 안건별로 번호와 항목을 구분
- 3~6문장으로 요약
- 공문서 형식의 격식체 사용

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "안건 상세 내용만 출력하세요."}`,
        locationDetails: `${baseContext}

다음 정보를 바탕으로 장소 세부 안내를 작성해 주세요.

[작성 지침]
- 위치 안내와 동선, 주차 관련 내용을 포함
- 2~4문장으로 간결하게 작성
- 학부모가 이해하기 쉬운 표현 사용

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "장소 세부 안내만 출력하세요."}`,
        supplies: `${baseContext}

다음 정보를 바탕으로 준비물 안내를 작성해 주세요.

[작성 지침]
- 참석 준비물을 2~3가지 제시
- 선택 준비물이 있다면 괄호로 표기
- 공손한 어조 유지

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "준비물 안내만 출력하세요."}`,
        precautions: `${baseContext}

다음 정보를 바탕으로 참석 유의사항을 작성해 주세요.

[작성 지침]
- 주차, 복장, 출입 절차 등 안내
- 2~4문장으로 작성
- 협조 요청을 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "참석 유의사항만 출력하세요."}`,
        membershipFee: `${baseContext}

다음 정보를 바탕으로 학부모회비 안내를 작성해 주세요.

[작성 지침]
- 회비 목적과 납부 방식 안내
- 자율 참여 여부 명시
- 공손한 어조 유지

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "학부모회비 안내만 출력하세요."}`,
        officerElection: `${baseContext}

다음 정보를 바탕으로 학부모회 임원 선출 안내를 작성해 주세요.

[작성 지침]
- 선출 대상과 절차 간단히 안내
- 참여 독려 문장 포함
- 2~4문장 구성

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "임원 선출 안내만 출력하세요."}`,
        privacyConsent: `${baseContext}

다음 정보를 바탕으로 개인정보 수집 동의 안내를 작성해 주세요.

[작성 지침]
- 수집 목적과 항목을 간단히 명시
- 보관 기간 또는 파기 안내 포함
- 2~3문장으로 작성

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "개인정보 수집 동의 안내만 출력하세요."}`,
        contact: `${baseContext}

다음 정보를 바탕으로 문의처 안내를 작성해 주세요.

[작성 지침]
- 담당 부서/담당자와 연락처를 포함
- 친절하고 공손한 문장
- 1~2문장 구성

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "문의처 안내만 출력하세요."}`,
        additional: `${baseContext}

다음 정보를 바탕으로 기타 안내사항을 작성해 주세요.

[작성 지침]
- 추가로 전달할 내용을 2~4문장으로 정리
- 공문서 형식 유지

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "기타 안내사항만 출력하세요."}`,
        opening: `${baseContext}

다음 정보를 바탕으로 도입 인사말을 작성해 주세요.

[작성 지침]
- 학부모에 대한 감사 인사 포함
- 자기 소개(학교/학년/담당자) 포함
- 4~5문장 구성, 따뜻한 어조

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "도입 인사말만 출력하세요."}`,
        purpose: `${baseContext}

다음 정보를 바탕으로 총회 취지 설명을 작성해 주세요.

[작성 지침]
- 총회 목적과 주요 안건 언급
- 학부모 참여의 중요성 강조
- 3~4문장 구성

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "총회 취지 설명만 출력하세요."}`,
        cooperation: `${baseContext}

다음 정보를 바탕으로 협조 요청 사항을 작성해 주세요.

[작성 지침]
- 참석 및 회신 협조 요청 포함
- 정중한 어조 유지
- 3~4문장 구성

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "협조 요청 사항만 출력하세요."}`,
        closing: `${baseContext}

다음 정보를 바탕으로 마무리 인사말을 작성해 주세요.

[작성 지침]
- 건강과 감사 인사 포함
- 간결한 2~3문장 구성
- 따뜻하고 정중한 어조

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "마무리 인사말만 출력하세요."}`,
      };

      let prompt = promptMap[fieldName];
      if (!prompt) {
        return res.status(400).json({
          success: false,
          error: `지원하지 않는 필드입니다: ${fieldName}`,
        });
      }

      const ragDocuments = await getRagReferenceDocuments({
        documentType: "학교폭력 예방 교육 계획서",
        inputs: toRagInputs(context),
        limit: 3,
      });
      prompt = buildRagPrompt({ basePrompt: prompt, ragDocuments });

      const hasAnthropicKey = !!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
      const hasOpenAiKey = !!process.env.OPENAI_API_KEY;
      let generatedText = "";

      const generateWithOpenAI = async () => {
        const client = getOpenAiClient();
        if (!client) {
          throw new Error("OPENAI_API_KEY is not set.");
        }
        const completion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          max_tokens: 900,
          temperature: 0.7,
          messages: [{ role: "user", content: prompt }],
        });
        return completion.choices[0]?.message?.content || "";
      };

      if (hasAnthropicKey) {
        try {
          const message = await anthropic.messages.create({
            model: "claude-sonnet-4-5",
            max_tokens: 1200,
            messages: [{ role: "user", content: prompt }],
          });
          const content = message.content[0];
          generatedText = content.type === "text" ? content.text : "";
        } catch (anthropicError) {
          if (!hasOpenAiKey) {
            throw anthropicError;
          }
          generatedText = await generateWithOpenAI();
        }
      } else if (hasOpenAiKey) {
        generatedText = await generateWithOpenAI();
      } else {
        return res.status(500).json({
          success: false,
          error: "AI API 키가 설정되지 않았습니다.",
        });
      }

      res.json({
        success: true,
        text: generatedText.trim(),
      });
    } catch (error) {
      console.error("Parent meeting AI generation error:", error);
      res.status(500).json({
        success: false,
        error: "AI 내용 생성에 실패했습니다. 잠시 후 다시 시도해주세요.",
      });
    }
  });

  // ================== Budget Disclosure AI Generation API ==================
  app.post("/api/budget-disclosure/generate-ai-content", async (req, res) => {
    try {
      const { fieldName, context } = req.body;

      if (!fieldName) {
        return res.status(400).json({
          success: false,
          error: "fieldName이 필요합니다.",
        });
      }

      const basicInfo = context?.basicInfo || {};
      const overview = context?.overview || {};
      const resources = context?.resources || [];
      const project = context?.project || {};
      const currentValue = context?.currentValue || "";

      const baseContext = [
        `학교명: ${basicInfo?.schoolName || "학교"}`,
        basicInfo?.documentType ? `문서 유형: ${basicInfo.documentType}` : "",
        basicInfo?.fiscalYear ? `회계연도: ${basicInfo.fiscalYear}` : "",
        overview?.totalAmount ? `총 예산(결산)액: ${overview.totalAmount}원` : "",
        overview?.changeAmount ? `전년 대비 증감: ${overview.changeAmount}원` : "",
        overview?.changeRate ? `전년 대비 증감률: ${overview.changeRate}%` : "",
        overview?.changeStatus ? `증감 상태: ${overview.changeStatus}` : "",
        resources.length
          ? `재원 주요 항목: ${resources
              .slice(0, 4)
              .map((item: { category?: string; amount?: string }) => `${item.category || "항목"} ${item.amount || ""}`)
              .join(", ")}`
          : "",
        project?.name ? `사업명: ${project.name}` : "",
        project?.amount ? `사업 금액: ${project.amount}원` : "",
        project?.ratio ? `사업 비율: ${project.ratio}%` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const promptMap: Record<string, string> = {
        budgetDirection: `${baseContext}

다음 정보를 바탕으로 예산(결산) 편성 방향을 작성해 주세요.

[작성 지침]
- 학부모가 이해하기 쉬운 언어 사용
- 예산 편성의 기본 철학과 방향 강조
- 5~7문장으로 작성
- 긍정적이고 미래지향적 어조

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "편성 방향만 출력하세요."}`,
        mainFeatures: `${baseContext}

다음 정보를 바탕으로 주요 특징을 작성해 주세요.

[작성 지침]
- 핵심 특징을 3~5개 항목으로 정리
- 수치가 있다면 함께 제시
- 간결한 문장 사용

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "주요 특징만 출력하세요."}`,
        resourceDescription: `${baseContext}

다음 정보를 바탕으로 재원별 설명을 작성해 주세요.

[작성 지침]
- 재원별 주요 사용 목적 설명
- 항목별로 간단히 정리
- 학부모가 이해하기 쉬운 표현 사용

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "재원별 설명만 출력하세요."}`,
        achievements: `${baseContext}

다음 정보를 바탕으로 주요 성과를 작성해 주세요.

[작성 지침]
- 4~6개 주요 성과 나열
- 정량/정성 지표 균형 있게 제시
- 학생 및 교육 효과 강조

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "주요 성과만 출력하세요."}`,
        unspentReason: `${baseContext}

다음 정보를 바탕으로 미집행 사유를 작성해 주세요.

[작성 지침]
- 간결하게 2~3문장 작성
- 객관적인 표현 사용

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "미집행 사유만 출력하세요."}`,
        improvements: `${baseContext}

다음 정보를 바탕으로 개선 사항을 작성해 주세요.

[작성 지침]
- 향후 보완 계획을 3~4문장으로 작성
- 실행 가능한 개선 방향 제시

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "개선 사항만 출력하세요."}`,
        executionAnalysis: `${baseContext}

다음 정보를 바탕으로 집행 현황 분석을 작성해 주세요.

[작성 지침]
- 분기별 집행 흐름 요약
- 개선 방향 간단히 제시
- 3~4문장 구성

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "집행 현황 분석만 출력하세요."}`,
        executionPlan: `${baseContext}

다음 정보를 바탕으로 집행 계획을 작성해 주세요.

[작성 지침]
- 분기/시기별 계획 언급
- 4~5문장 구성
- 구체적 실행 계획 강조

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "집행 계획만 출력하세요."}`,
        focusAreas: `${baseContext}

다음 정보를 바탕으로 중점 추진 사항을 작성해 주세요.

[작성 지침]
- 핵심 추진 과제 3~5개 제시
- 간결한 문장 사용

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "중점 추진 사항만 출력하세요."}`,
        futureEffects: `${baseContext}

다음 정보를 바탕으로 기대 효과를 작성해 주세요.

[작성 지침]
- 교육 효과 및 재정 효율성 강조
- 3~4문장 구성

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "기대 효과만 출력하세요."}`,
        parentNotice: `${baseContext}

다음 정보를 바탕으로 학부모 안내 사항을 작성해 주세요.

[작성 지침]
- 투명성 및 협조 요청 포함
- 3~4문장 구성

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "학부모 안내 사항만 출력하세요."}`,
        terminology: `${baseContext}

다음 정보를 바탕으로 용어 설명을 작성해 주세요.

[작성 지침]
- 핵심 용어 3~5개 항목 정리
- 간단한 정의 제공

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "용어 설명만 출력하세요."}`,
        contactInfo: `${baseContext}

다음 정보를 바탕으로 문의처 안내를 작성해 주세요.

[작성 지침]
- 담당 부서/담당자와 연락처 포함
- 1~2문장 구성

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "문의처 안내만 출력하세요."}`,
      };

      if (fieldName.startsWith("projectPurpose-")) {
        const prompt = `${baseContext}

다음 정보를 바탕으로 사업 목적을 작성해 주세요.

[작성 지침]
- 사업 목적과 필요성을 3~4문장으로 작성
- 학생 중심 효과 강조

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "사업 목적만 출력하세요."}`;
        promptMap[fieldName] = prompt;
      }

      if (fieldName.startsWith("projectDetails-")) {
        const prompt = `${baseContext}

다음 정보를 바탕으로 사업 세부 내역을 작성해 주세요.

[작성 지침]
- 3~5개 항목으로 나열
- 항목별 용도 설명 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "세부 내역만 출력하세요."}`;
        promptMap[fieldName] = prompt;
      }

      if (fieldName.startsWith("projectEffects-")) {
        const prompt = `${baseContext}

다음 정보를 바탕으로 사업 기대 효과를 작성해 주세요.

[작성 지침]
- 교육 효과 중심으로 3~4문장 작성
- 정량/정성 효과 균형 있게 제시

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "기대 효과만 출력하세요."}`;
        promptMap[fieldName] = prompt;
      }

      let prompt = promptMap[fieldName];
      if (!prompt) {
        return res.status(400).json({
          success: false,
          error: `지원하지 않는 필드입니다: ${fieldName}`,
        });
      }

      const ragDocuments = await getRagReferenceDocuments({
        documentType: "예산/결산 공개 자료",
        inputs: toRagInputs(context),
        limit: 3,
      });
      prompt = buildRagPrompt({ basePrompt: prompt, ragDocuments });

      const hasAnthropicKey = !!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
      const hasOpenAiKey = !!process.env.OPENAI_API_KEY;
      let generatedText = "";

      const generateWithOpenAI = async () => {
        const client = getOpenAiClient();
        if (!client) {
          throw new Error("OPENAI_API_KEY is not set.");
        }
        const completion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          max_tokens: 900,
          temperature: 0.7,
          messages: [{ role: "user", content: prompt }],
        });
        return completion.choices[0]?.message?.content || "";
      };

      if (hasAnthropicKey) {
        try {
          const message = await anthropic.messages.create({
            model: "claude-sonnet-4-5",
            max_tokens: 1200,
            messages: [{ role: "user", content: prompt }],
          });
          const content = message.content[0];
          generatedText = content.type === "text" ? content.text : "";
        } catch (anthropicError) {
          if (!hasOpenAiKey) {
            throw anthropicError;
          }
          generatedText = await generateWithOpenAI();
        }
      } else if (hasOpenAiKey) {
        generatedText = await generateWithOpenAI();
      } else {
        return res.status(500).json({
          success: false,
          error: "AI API 키가 설정되지 않았습니다.",
        });
      }

      res.json({
        success: true,
        text: generatedText.trim(),
      });
    } catch (error) {
      console.error("Budget disclosure AI generation error:", error);
      res.status(500).json({
        success: false,
        error: "AI 내용 생성에 실패했습니다. 잠시 후 다시 시도해주세요.",
      });
    }
  });

  // ================== Bullying Prevention Plan AI Generation API ==================
  app.post("/api/bullying-prevention-plan/generate-ai-content", async (req, res) => {
    try {
      const { fieldName, context } = req.body;

      if (!fieldName) {
        return res.status(400).json({
          success: false,
          error: "fieldName이 필요합니다.",
        });
      }

      const basicInfo = context?.basicInfo || {};
      const schoolName = basicInfo?.schoolName || "학교";
      const schoolLevel = basicInfo?.schoolLevel || "elementary";
      const planType = basicInfo?.planType || "annual";
      const studentCount = basicInfo?.studentCount;
      const classCount = basicInfo?.classCount;
      const teacherCount = basicInfo?.teacherCount;
      const currentValue = context?.currentValue || "";

      const levelLabel =
        schoolLevel === "elementary" ? "초등학교" : schoolLevel === "middle" ? "중학교" : "고등학교";
      const planTypeLabel = planType === "annual" ? "연간 계획" : "학기별 계획";
      const analysis = context?.analysis || {};

      const baseContext = [
        `학교명: ${schoolName}`,
        `학교급: ${levelLabel}`,
        `계획 유형: ${planTypeLabel}`,
        studentCount ? `학생 수: ${studentCount}명` : "",
        classCount ? `학급 수: ${classCount}학급` : "",
        teacherCount ? `교원 수: ${teacherCount}명` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const promptMap: Record<string, string> = {
        educationContent: `${baseContext}

다음 정보를 바탕으로 학교폭력 예방 교육 내용을 작성해 주세요.

[입력 정보]
- 대상: ${context?.target || "미정"}
- 교육 일시: ${context?.educationDateTime || "미정"}

[작성 지침]
- 핵심 메시지 3~5문장
- 예방, 신고 절차, 상호 존중 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "교육 내용만 출력하세요."}`,
        legalBasis: `${baseContext}

다음 정보를 바탕으로 학교폭력 예방 교육의 법적 근거를 작성해 주세요.

[작성 지침]
- 학교폭력예방 및 대책에 관한 법률 제15조 언급
- 1~2문장으로 간결하게 작성

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "법적 근거만 출력하세요."}`,
        schoolCharacteristics: `${baseContext}

다음 정보를 바탕으로 학교 특성 및 환경을 작성해 주세요.

[작성 지침]
- 3~4문장으로 작성
- 학교 주변 환경, 학생 특성, 생활 환경 등을 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "학교 특성 및 환경만 출력하세요."}`,
        previousEvaluation: `${baseContext}

다음 정보를 바탕으로 전년도 교육 평가 내용을 작성해 주세요.

[작성 지침]
- 2~3문장으로 작성
- 만족도, 효과성, 개선점 등을 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "전년도 교육 평가 내용만 출력하세요."}`,
        improvements: `${baseContext}

다음 정보를 바탕으로 개선 필요 사항을 작성해 주세요.

[작성 지침]
- 2~3문장으로 작성
- 학교폭력 예방교육 개선 방향 제시

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "개선 필요 사항만 출력하세요."}`,
        goals: `${baseContext}

다음 정보를 바탕으로 교육 목표를 작성해 주세요.

[작성 지침]
- 3~5개 항목으로 번호를 매겨 작성
- 학교폭력 인식 제고, 방관자 역할 개선 등 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "교육 목표만 출력하세요."}`,
        policy: `${baseContext}

다음 정보를 바탕으로 운영 방침을 작성해 주세요.

[작성 지침]
- 3~4문장으로 작성
- 예방 중심, 학년별 맞춤형 교육 원칙 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "운영 방침만 출력하세요."}`,
        keyTasks: `${baseContext}

다음 정보를 바탕으로 중점 추진 과제를 작성해 주세요.

[작성 지침]
- 3~4개 항목으로 번호를 매겨 작성
- 사이버폭력, 또래상담, 상담체계 강화 등 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "중점 추진 과제만 출력하세요."}`,
        expectedEffects: `${baseContext}

다음 정보를 바탕으로 기대 효과를 작성해 주세요.

[작성 지침]
- 3~4문장으로 작성
- 학교폭력 감소, 학교 문화 개선, 안전한 환경 강조

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "기대 효과만 출력하세요."}`,
        mainContent: `${baseContext}

다음 정보를 바탕으로 주요 교육 내용을 작성해 주세요.

[작성 지침]
- 4~6개 항목 또는 문장으로 작성
- 학교폭력 이해, 사이버폭력 예방, 갈등 해결 등 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "주요 교육 내용만 출력하세요."}`,
        specialProgram: `${baseContext}

다음 정보를 바탕으로 특별 프로그램을 작성해 주세요.

[작성 지침]
- 2~3문장으로 작성
- 또래상담, 연극, 캠페인 등 특색 프로그램 제시

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "특별 프로그램 내용만 출력하세요."}`,
        schoolCounseling: `${baseContext}

다음 정보를 바탕으로 학교 내 상담 체계를 작성해 주세요.

[작성 지침]
- 3~4문장으로 작성
- Wee클래스, 전문상담교사 배치 등 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "학교 내 상담 체계만 출력하세요."}`,
        reportingMethods: `${baseContext}

다음 정보를 바탕으로 신고 방법 안내를 작성해 주세요.

[작성 지침]
- 항목형으로 작성
- 117 신고센터, 학교 신고함, 담임교사 신고 등 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "신고 방법 안내만 출력하세요."}`,
        emergencyResponse: `${baseContext}

다음 정보를 바탕으로 긴급 대응 체계를 작성해 주세요.

[작성 지침]
- 3~4문장으로 작성
- 초기 대응 절차, 보고 체계, 보호 조치 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "긴급 대응 체계만 출력하세요."}`,
        externalPartners: `${baseContext}

다음 정보를 바탕으로 외부 연계 기관을 작성해 주세요.

[작성 지침]
- 2~3문장 또는 항목으로 작성
- 경찰서, 상담센터, 지원단 등 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "외부 연계 기관만 출력하세요."}`,
        budgetPlan: `${baseContext}

다음 정보를 바탕으로 예산 계획을 작성해 주세요.

[작성 지침]
- 항목별 예산 배분 포함
- 총 예산 요약 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "예산 계획만 출력하세요."}`,
        facilities: `${baseContext}

다음 정보를 바탕으로 교육 시설을 작성해 주세요.

[작성 지침]
- 2~3문장 또는 항목으로 작성
- 상담실, 교육장 등 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "교육 시설만 출력하세요."}`,
        materials: `${baseContext}

다음 정보를 바탕으로 교육 자료 현황을 작성해 주세요.

[작성 지침]
- 2~3문장 또는 항목으로 작성
- 교재, 교구, 영상자료 등 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "교육 자료 현황만 출력하세요."}`,
        evaluation_methods: `${baseContext}

다음 정보를 바탕으로 평가 방법을 작성해 주세요.

[작성 지침]
- 3~4문장 또는 번호 목록으로 작성
- 인식도 조사, 만족도 설문 등 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "평가 방법만 출력하세요."}`,
        evaluation_indicators: `${baseContext}

다음 정보를 바탕으로 평가 지표를 작성해 주세요.

[작성 지침]
- 3~4개 항목으로 작성
- 정량/정성 지표 혼합

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "평가 지표만 출력하세요."}`,
        evaluation_feedback: `${baseContext}

다음 정보를 바탕으로 환류 계획을 작성해 주세요.

[작성 지침]
- 3~4문장으로 작성
- 차년도 반영 및 개선 방안 포함

${currentValue ? `[기존 입력]\n${currentValue}\n\n기존 내용을 보완해 작성하세요.` : "환류 계획만 출력하세요."}`,
      };

      const prompt = promptMap[fieldName];
      if (!prompt) {
        return res.status(400).json({
          success: false,
          error: `지원하지 않는 필드입니다: ${fieldName}`,
        });
      }

      const hasAnthropicKey = !!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
      const hasOpenAiKey = !!process.env.OPENAI_API_KEY;
      let generatedText = "";

      const generateWithOpenAI = async () => {
        const client = getOpenAiClient();
        if (!client) {
          throw new Error("OPENAI_API_KEY is not set.");
        }
        const completion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          max_tokens: 900,
          temperature: 0.7,
          messages: [{ role: "user", content: prompt }],
        });
        return completion.choices[0]?.message?.content || "";
      };

      if (hasAnthropicKey) {
        try {
          const message = await anthropic.messages.create({
            model: "claude-sonnet-4-5",
            max_tokens: 1200,
            messages: [{ role: "user", content: prompt }],
          });
          const content = message.content[0];
          generatedText = content.type === "text" ? content.text : "";
        } catch (anthropicError) {
          if (!hasOpenAiKey) {
            throw anthropicError;
          }
          generatedText = await generateWithOpenAI();
        }
      } else if (hasOpenAiKey) {
        generatedText = await generateWithOpenAI();
      } else {
        return res.status(500).json({
          success: false,
          error: "AI API 키가 설정되지 않았습니다.",
        });
      }

      res.json({
        success: true,
        text: generatedText.trim(),
      });
    } catch (error) {
      console.error("Bullying prevention AI generation error:", error);
      res.status(500).json({
        success: false,
        error: "AI 내용 생성에 실패했습니다. 잠시 후 다시 시도해주세요.",
      });
    }
  });

  // Export document as DOCX or PDF
  app.get("/api/documents/:id/export/:format", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const format = req.params.format as "docx" | "pdf";
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }
      
      if (!["docx", "pdf"].includes(format)) {
        return res.status(400).json({ error: "Invalid format. Use 'docx' or 'pdf'" });
      }
      
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      // Check ownership
      const userId = req.user?.id?.toString();
      if (document.userId && document.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      if (!document.generatedContent) {
        return res.status(400).json({ error: "Document has no content to export" });
      }
      
      const schoolName = document.inputData?.schoolName;
      
      let buffer: Buffer;
      let contentType: string;
      let fileExtension: string;
      
      if (format === "docx") {
        buffer = await exportToDocx({
          title: document.title,
          content: document.generatedContent,
          schoolName,
          format: "docx",
        });
        contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        fileExtension = "docx";
      } else {
        buffer = await exportToPdf({
          title: document.title,
          content: document.generatedContent,
          schoolName,
          format: "pdf",
        });
        contentType = "application/pdf";
        fileExtension = "pdf";
      }
      
      const safeTitle = document.title.replace(/[^a-zA-Z0-9가-힣\s]/g, "").trim() || "document";
      const fileName = `${safeTitle}.${fileExtension}`;
      
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error) {
      console.error("Error exporting document:", error);
      res.status(500).json({ error: "Failed to export document" });
    }
  });

  // Delete document (requires authentication and ownership)
  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }
      
      // Check ownership before delete
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      const userId = req.user?.id?.toString();
      
      // Anonymous documents cannot be deleted via API
      if (!document.userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      if (document.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const deleted = await storage.deleteDocument(id);
      if (!deleted) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // ================== Document Attachments ==================

  // List attachments for a document (requires authentication and ownership)
  app.get("/api/documents/:id/attachments", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }

      const userId = req.user?.id?.toString();
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      if (!document.userId || document.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const attachments = await storage.listAttachmentsByDocumentId(id);
      res.json(attachments);
    } catch (error) {
      console.error("Error listing attachments:", error);
      res.status(500).json({ error: "Failed to fetch attachments" });
    }
  });

  // Upload attachment for a document (requires authentication and ownership)
  app.post("/api/documents/:id/attachments", requireFullAuth, attachmentUpload.single("file"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "파일이 필요합니다" });
      }

      const userId = req.user?.id?.toString();
      const document = await storage.getDocument(id);
      if (!document) {
        await fs.promises.unlink(req.file.path).catch(() => undefined);
        return res.status(404).json({ error: "Document not found" });
      }

      if (!document.userId || document.userId !== userId) {
        await fs.promises.unlink(req.file.path).catch(() => undefined);
        return res.status(403).json({ error: "Access denied" });
      }

      const attachment = await storage.createAttachment({
        documentId: id,
        userId: userId || null,
        originalName: req.file.originalname,
        fileName: req.file.filename,
        mimeType: req.file.mimetype || "application/octet-stream",
        fileSize: req.file.size,
      });

      res.status(201).json(attachment);
    } catch (error) {
      console.error("Error uploading attachment:", error);
      res.status(500).json({ error: "첨부파일 업로드 실패" });
    }
  });

  // Download attachment (requires authentication and ownership)
  app.get("/api/attachments/:id/download", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid attachment ID" });
      }

      const userId = req.user?.id?.toString();
      const attachment = await storage.getAttachment(id);
      if (!attachment) {
        return res.status(404).json({ error: "Attachment not found" });
      }

      if (!attachment.userId || attachment.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const filePath = path.join(attachmentsRoot, attachment.fileName);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }

      res.download(filePath, attachment.originalName);
    } catch (error) {
      console.error("Error downloading attachment:", error);
      res.status(500).json({ error: "첨부파일 다운로드 실패" });
    }
  });

  // Delete attachment (requires authentication and ownership)
  app.delete("/api/attachments/:id", requireFullAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid attachment ID" });
      }

      const userId = req.user?.id?.toString();
      const attachment = await storage.getAttachment(id);
      if (!attachment) {
        return res.status(404).json({ error: "Attachment not found" });
      }

      if (!attachment.userId || attachment.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const filePath = path.join(attachmentsRoot, attachment.fileName);
      await fs.promises.unlink(filePath).catch(() => undefined);

      const deleted = await storage.deleteAttachment(id);
      if (!deleted) {
        return res.status(404).json({ error: "Attachment not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting attachment:", error);
      res.status(500).json({ error: "첨부파일 삭제 실패" });
    }
  });

  // Create template
  app.post("/api/templates", async (req, res) => {
    try {
      const template = await storage.createTemplate(req.body);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  // Update template
  app.patch("/api/templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }
      
      const updated = await storage.updateTemplate(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating template:", error);
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  // Delete template
  app.delete("/api/templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }
      
      const deleted = await storage.deleteTemplate(id);
      if (!deleted) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  // Get stats (scoped to authenticated user if logged in)
  app.get("/api/stats", async (req, res) => {
    try {
      const userId = req.user?.id?.toString();
      const stats = await storage.getStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // ================== Afterschool Plan AI Generation API ==================

  // Generate AI content for afterschool plan form fields
  app.post("/api/afterschool/generate-ai-content", async (req, res) => {
    try {
      const { fieldName, context, documentType } = req.body;

      if (!fieldName) {
        return res.status(400).json({
          success: false,
          error: "fieldName이 필요합니다."
        });
      }

      const schoolName = context?.schoolName || "우리 초등학교";
      const year = context?.year || new Date().getFullYear().toString();
      const semester = context?.semester || "1학기";

      // Build prompt based on field name
      const afterschoolPrompts: Record<string, string> = {
        programList: `${schoolName} 방과후학교 운영계획서에 포함할 프로그램 목록을 작성해주세요.

입력 정보:
- 운영 기간: ${context?.period || "미정"}
- 수강료 정보: ${context?.tuition || "미정"}

요구사항:
- 4~6개 내외의 프로그램 항목 제시
- 항목마다 핵심 활동을 한 줄로 설명
- 간결하고 공문서 톤 유지

형식: 불릿 목록`,
        // Step 2: 운영 목표 및 방침 - 추가 목적
        additionalPurpose: `${schoolName}의 ${year}학년도 방과후학교 운영 목적을 작성해주세요.

선택된 목적:
${context?.purposes?.join(", ") || "학생 소질·적성 계발"}

요구사항:
- 2-3문장으로 작성
- 교육적이고 전문적인 톤
- 학생 중심의 내용
- 구체적인 교육 목표 포함

형식: 일반 문장 (불릿 포인트 없이)`,

        // Step 4: 프로그램 설명
        programDescription: `'${context?.programName || "프로그램"}' 프로그램에 대한 설명을 작성해주세요.

프로그램 정보:
- 대상: ${context?.targetGrade || "1-6학년"}
- 운영시간: ${context?.operatingTime || "주 1회"}
- 유형: ${context?.programType || "특기적성"}

요구사항:
- 3-4문장으로 작성
- 교육적 효과 포함
- 운영 방식 간략히 설명
- 학생들의 발달에 도움이 되는 측면 강조

형식: 일반 문장`,

        // Step 5: 안전 및 위생 관리 - 안전교육 계획
        safetyEducationPlan: `${schoolName} 방과후학교의 안전교육 계획을 작성해주세요.

학교 정보:
- 대상 학생: ${context?.targetStudents || "전학년"}
- 참여 학생 수: 약 ${context?.totalStudents || "100"}명

요구사항:
- 4-5문장으로 작성
- 화재안전, 성폭력예방, 실종예방 등 포함
- 교육 시기 및 방법 명시
- 교육청 지침 준수 내용 포함

형식: 일반 문장`,

        // Step 5: 안전교육 내용
        safetyTrainingContent: `방과후학교 운영을 위한 안전교육 내용을 작성해주세요.

요구사항:
- 3-4문장으로 작성
- 화재대피, 지진대응, 생활안전 등 포함
- 교육 방법과 주기 명시
- 학생 참여형 교육 내용 포함

형식: 일반 문장`,

        // Step 5: 위생관리 계획
        hygieneManagementPlan: `방과후학교 운영을 위한 위생관리 계획을 작성해주세요.

요구사항:
- 3-4문장으로 작성
- 시설 소독, 환기 등 포함
- 개인위생 지도 방안
- 감염병 예방 조치

형식: 일반 문장`,

        // Step 6: 예산 편성 원칙
        budgetPrinciple: `방과후학교 예산 편성 및 집행 원칙을 작성해주세요.

예산 정보:
- 총 예산: ${context?.totalBudget || "미정"}원

요구사항:
- 3-4문장으로 작성
- 투명성과 효율성 강조
- 교육청 지침 준수
- 학부모 부담 최소화 원칙

형식: 일반 문장`,

        // Step 3: 모집 및 수납 - 환불 예외 사항
        refundException: `방과후학교 수강료 환불 예외 사항을 작성해주세요.

요구사항:
- 2-3문장으로 작성
- 특별한 사유(질병, 전학 등)에 대한 환불 규정
- 교육청 지침에 부합하는 내용

형식: 일반 문장`,

        // Step 2: 기타 방침
        customPolicy: `방과후학교 운영의 기타 방침을 작성해주세요.

기존 선택된 방침:
${context?.policies?.join(", ") || "공개 모집 원칙, 안전 관리 강화"}

요구사항:
- 2-3문장으로 작성
- 기존 방침과 중복되지 않는 내용
- 학교 특색에 맞는 방침

형식: 일반 문장`,
      };

      const carePrompts: Record<string, string> = {
        careObjectives: `초등돌봄교실 운영 목표를 작성해주세요.

입력 정보:
- 운영 시간: ${context?.operatingTime || "미정"}
- 대상 학년: ${context?.targetGrades || "미정"}

요구사항:
- 3~4문장으로 작성
- 돌봄 목표와 기대 효과 포함
- 학부모 안심 요소 강조

형식: 일반 문장`,
        careProgramContent: `초등돌봄교실 프로그램 내용을 작성해주세요.

입력 정보:
- 운영 시간: ${context?.operatingTime || "미정"}
- 대상 학년: ${context?.targetGrades || "미정"}

요구사항:
- 주요 활동 3~5개를 설명
- 안전·정서 지원 요소 포함
- 간결한 문장 구성

형식: 일반 문장 또는 불릿`,
        additionalGoals: `${schoolName}의 ${year}학년도 ${semester} 초등돌봄교실 운영 목표를 작성해주세요.

운영 정보:
- 돌봄교실 유형: ${context?.careTypes?.join(", ") || "오후돌봄"}
- 선택된 목적: ${context?.purposes?.join(", ") || ""}
- 선택된 방침: ${context?.policies?.join(", ") || ""}

요구사항:
- 2-3문장으로 작성
- 안전한 돌봄 환경 강조
- 맞벌이 가정 지원 측면
- 학생의 전인적 발달 지원
- 교육적이고 따뜻한 톤

형식: 일반 문장 (불릿 포인트 없이)`,

        programContent: `'${context?.programName || "프로그램"}' 돌봄 프로그램의 내용을 작성해주세요.

프로그램 정보:
- 운영: ${context?.operatingDays || "주 5회"} ${context?.operatingTime || ""}
- 대상: ${context?.targetGrades || "1-2학년"}
- 정원: ${context?.capacity || "15"}명
- 강사: ${context?.instructorType || "돌봄전담사"}

요구사항:
- 3-4문장으로 작성
- 프로그램의 주요 활동 내용
- 학생들의 흥미와 발달 수준에 맞는 내용
- 안전하고 즐겁게 참여할 수 있는 활동 강조
- 기대되는 교육적 효과

형식: 일반 문장`,

        absenceProcedure: `초등돌봄교실의 결석 처리 절차를 작성해주세요.

출결 관리:
- 확인 방법: ${context?.attendanceMethods?.join(", ") || "전자 출결 시스템"}

요구사항:
- 3-4문장으로 작성
- 사전 연락 → 기록 → 통보 순서
- 무단 결석 시 대응 방안
- 학부모와의 소통 강조

형식: 일반 문장`,

        emergencyContactSystem: `초등돌봄교실의 긴급 연락망 구축 방법을 작성해주세요.

하원 방식: ${context?.pickupMethod || "학부모 직접 인계"}

요구사항:
- 3-4문장으로 작성
- 학부모 연락처, 비상연락처 등록
- 긴급 상황 시 연락 절차
- 담임교사 및 관리자 연계

형식: 일반 문장`,

        safetyEducationTiming: `초등돌봄교실 안전교육 실시 시기를 작성해주세요.

운영 기간: ${context?.startDate || ""} ~ ${context?.endDate || ""}

요구사항:
- 2-3문장으로 작성
- 학기 초, 월별, 분기별 등 구체적 시기
- 정기 교육과 수시 교육 구분
- 교육 횟수 명시

형식: 일반 문장
예: 학기 초 오리엔테이션 시 기본 안전교육을 실시하고, 매월 1회 주제별 안전교육을 진행합니다.`,

        safetyEducationContent: `${schoolName} 돌봄교실 안전교육 내용을 작성해주세요.

대상: ${context?.targetGrades || "초등 1-2학년 중심"}

요구사항:
- 4-5문장으로 작성
- 생활안전(화재, 지진 대피)
- 교통안전
- 신변안전(성폭력 예방, 유괴 예방)
- 저학년 눈높이에 맞는 체험형 교육 방식
- 반복 교육의 중요성

형식: 일반 문장`,

        allergyManagementPlan: `돌봄교실 간식 제공 시 알레르기 관리 방안을 작성해주세요.

간식 제공:
- 제공 여부: ${context?.snackProvided || "제공"}
- 제공 방식: ${context?.snackMethod || "학교 직접 제공"}

요구사항:
- 3-4문장으로 작성
- 입실 시 알레르기 사전 조사
- 대체 식품 제공 방안
- 비상 약품 비치
- 응급 상황 대응 체계
- 학부모와의 정보 공유

형식: 일반 문장`,

        staffAllocationCriteria: `초등돌봄교실 인력 배치 기준을 작성해주세요.

인력 정보:
- 돌봄전담사: ${context?.careStaffCount || "미정"}명
- 총 정원: ${context?.totalCapacity || "미정"}명
- 교실 수: ${context?.classroomCount || "미정"}개

요구사항:
- 3-4문장으로 작성
- 교육부 기준 준수 (학생 15명당 돌봄전담사 1명)
- 교실별 인력 배치
- 업무 분장 원칙
- 안전한 돌봄을 위한 적정 인력 강조

형식: 일반 문장`,
      };

      const selectedPrompts = documentType === "care" ? carePrompts : afterschoolPrompts;
      let prompt = selectedPrompts[fieldName];
      if (!prompt) {
        return res.status(400).json({
          success: false,
          error: `지원하지 않는 필드입니다: ${fieldName}`
        });
      }

      const ragDocuments = await getRagReferenceDocuments({
        documentType:
          documentType === "care" ? "초등돌봄교실 운영계획서" : "방과후학교 운영계획서",
        inputs: toRagInputs(context),
        limit: 3,
      });
      prompt = buildRagPrompt({ basePrompt: prompt, ragDocuments });

      const client = getOpenAiClient();
      if (!client) {
        return res.status(500).json({
          success: false,
          error: "AI API 키가 설정되지 않았습니다.",
        });
      }

      // Generate content using OpenAI
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 500,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content:
              documentType === "care"
                ? "당신은 한국의 초등학교 돌봄교실 운영 전문가입니다. 안전하고 따뜻한 돌봄 환경 조성을 위한 전문적인 문서를 작성합니다."
                : "당신은 한국의 초등학교 행정 문서 작성 전문가입니다. 교육청 기준에 맞는 전문적이고 명확한 문장을 작성합니다.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const generatedText = completion.choices[0]?.message?.content || "";

      res.json({
        success: true,
        text: generatedText.trim(),
        fieldName,
      });
    } catch (error) {
      console.error("AI 생성 오류:", error);
      res.status(500).json({
        success: false,
        error: "AI 생성에 실패했습니다. 잠시 후 다시 시도해주세요.",
      });
    }
  });

  // Generate AI content for field trip plan fields
  app.post("/api/generate/field-trip-plan/field", async (req, res) => {
    try {
      const { fieldName, context } = req.body as { fieldName?: string; context?: Record<string, unknown> };

      if (!fieldName) {
        return res.status(400).json({ success: false, error: "fieldName is required" });
      }

      const contextText = context ? JSON.stringify(context, null, 2) : "입력 정보 없음";
      let prompt = "";

      switch (fieldName) {
        case "goals":
          prompt = `다음 정보를 바탕으로 현장체험학습 운영계획서의 "교육 목표"를 3~5문장으로 작성해 주세요.

[입력 정보]
${contextText}

[작성 지침]
1. 공문서 어투로 작성
2. 학습 목표와 태도/역량을 함께 포함
3. 과도한 장식 없이 명확하게 작성

교육 목표 텍스트만 출력하세요.`;
          break;
        case "curriculumLink":
          prompt = `다음 정보를 바탕으로 "교육과정 연계"를 2~4문장으로 작성해 주세요.

[입력 정보]
${contextText}

[작성 지침]
1. 관련 교과와 성취기준을 구체적으로 언급
2. 학습 내용과 연계성을 강조

교육과정 연계 텍스트만 출력하세요.`;
          break;
        case "activities":
          prompt = `다음 정보를 바탕으로 "주요 활동 내용"을 4~6문장 또는 불릿 형태로 작성해 주세요.

[입력 정보]
${contextText}

[작성 지침]
1. 활동 흐름이 자연스럽게 이어지도록 구성
2. 관찰/체험/조별 활동 등을 포함

주요 활동 내용만 출력하세요.`;
          break;
        case "schedule":
          prompt = `다음 정보를 바탕으로 현장체험학습 "세부 일정"을 작성해 주세요.

[입력 정보]
${contextText}

[작성 지침]
1. 시간대별 흐름이 보이도록 작성
2. 이동, 체험, 정리 시간을 포함
3. 간결한 불릿 형태 권장

세부 일정만 출력하세요.`;
          break;
        case "safetyPlan":
          prompt = `다음 정보를 바탕으로 현장체험학습 "안전 관리 계획"을 작성해 주세요.

[입력 정보]
${contextText}

[작성 지침]
1. 인솔자 역할 및 비상 연락체계 포함
2. 사전 안전교육 및 현장 안전수칙 포함
3. 4~6문장으로 작성

안전 관리 계획만 출력하세요.`;
          break;
        case "priorEducation":
          prompt = `다음 정보를 바탕으로 "사전 교육 내용"을 2~4문장으로 작성해 주세요.

[입력 정보]
${contextText}

[작성 지침]
1. 안전 교육과 학습 준비 내용을 포함
2. 학생 행동 수칙을 간결하게 정리

사전 교육 내용만 출력하세요.`;
          break;
        case "postActivities":
          prompt = `다음 정보를 바탕으로 "사후 활동 계획"을 2~4문장으로 작성해 주세요.

[입력 정보]
${contextText}

[작성 지침]
1. 소감문, 발표, 정리 활동 등 포함
2. 학습 성과 정리 중심

사후 활동 계획만 출력하세요.`;
          break;
        case "emergencyPlan":
          prompt = `다음 정보를 바탕으로 "응급 상황 대처 방안"을 3~5문장으로 작성해 주세요.

[입력 정보]
${contextText}

[작성 지침]
1. 응급환자 발생 시 절차를 단계적으로 서술
2. 인근 의료기관, 119, 보호자 연락 포함

응급 상황 대처 방안만 출력하세요.`;
          break;
        case "safetyEducation":
          prompt = `다음 정보를 바탕으로 "안전 교육 내용"을 3~5문장으로 작성해 주세요.

[입력 정보]
${contextText}

[작성 지침]
1. 교통/화재/실종/집단활동 안전 포함
2. 학생 준수 사항을 명확하게 작성

안전 교육 내용만 출력하세요.`;
          break;
        default:
          return res.status(400).json({ success: false, error: `지원하지 않는 필드입니다: ${fieldName}` });
      }

      const ragDocuments = await getRagReferenceDocuments({
        documentType: "현장체험학습 운영계획서",
        inputs: toRagInputs(context),
        limit: 3,
      });
      prompt = buildRagPrompt({ basePrompt: prompt, ragDocuments });

      const hasAnthropicKey = !!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
      const hasOpenAiKey = !!process.env.OPENAI_API_KEY;
      let generatedText = "";

      if (hasAnthropicKey) {
        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-5",
          max_tokens: 600,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        const content = message.content[0];
        generatedText = content.type === "text" ? content.text.trim() : "";
      } else if (hasOpenAiKey) {
        const client = getOpenAiClient();
        if (!client) {
          throw new Error("OPENAI_API_KEY is not set.");
        }
        const completion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          max_tokens: 600,
          temperature: 0.7,
          messages: [{ role: "user", content: prompt }],
        });
        generatedText = (completion.choices[0]?.message?.content || "").trim();
      } else {
        return res.status(500).json({ success: false, error: "AI API 키가 설정되지 않았습니다." });
      }

      res.json({ success: true, text: generatedText, generatedText });
    } catch (error) {
      console.error("Error generating field trip content:", error);
      res.status(500).json({ success: false, error: "AI 내용 생성에 실패했습니다." });
    }
  });

  // ================== Aftercare Plan/Report API ==================

  const mapDraft = (draft: {
    draftId: string;
    toolId: string;
    title: string;
    status: string | null;
    inputs: Record<string, unknown>;
    generatedFields?: Record<string, GeneratedField> | null;
    validation?: { blocking: unknown[]; warnings: unknown[] } | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  }) => ({
    draft_id: draft.draftId,
    tool_id: draft.toolId,
    title: draft.title,
    status: draft.status || "editing",
    inputs: draft.inputs,
    generated_fields: draft.generatedFields || {},
    validation: draft.validation || { blocking: [], warnings: [] },
    created_at: draft.createdAt?.toISOString(),
    updated_at: draft.updatedAt?.toISOString(),
  });

  const mapLibraryDoc = (doc: {
    docId: string;
    toolId: string;
    title: string;
    createdAt: Date | null;
  }) => ({
    doc_id: doc.docId,
    tool_id: doc.toolId,
    title: doc.title,
    created_at: doc.createdAt?.toISOString(),
  });

  const getSchemaByToolId = (toolId: ToolId) =>
    toolId === "aftercare_plan" ? aftercarePlanInputsSchema : aftercareReportInputsSchema;

  const createId = (prefix: string) => `${prefix}_${crypto.randomBytes(6).toString("hex")}`;

  // Create draft
  app.post("/v1/tools/:toolId/drafts", async (req, res) => {
    try {
      const toolId = req.params.toolId as ToolId;
      if (!AFTERCARE_FIELD_KEYS[toolId]) {
        return res.status(400).json({
          error: { code: "INVALID_TOOL", message: "지원하지 않는 tool_id입니다." },
        });
      }

      const { title, inputs } = req.body || {};
      if (!title || !inputs) {
        return res.status(400).json({
          error: { code: "INVALID_REQUEST", message: "title과 inputs가 필요합니다." },
        });
      }

      const schema = getSchemaByToolId(toolId);
      const parseResult = schema.safeParse(inputs);
      if (!parseResult.success) {
        return res.status(400).json({
          error: { code: "INVALID_REQUEST", message: "입력값 형식이 올바르지 않습니다." },
        });
      }

      const validation = validateInputs(toolId, parseResult.data);
      const draft = await storage.createAftercareDraft({
        draftId: createId("drf"),
        userId: req.user?.id?.toString() || null,
        toolId,
        title,
        status: "editing",
        inputs: parseResult.data,
        generatedFields: {},
        validation,
      });

      res.status(201).json({ draft: mapDraft(draft) });
    } catch (error) {
      console.error("Error creating aftercare draft:", error);
      res.status(500).json({ error: { code: "SERVER_ERROR", message: "초안 생성 실패" } });
    }
  });

  // Patch draft
  app.patch("/v1/drafts/:draftId", async (req, res) => {
    try {
      const { draftId } = req.params;
      const draft = await storage.getAftercareDraft(draftId);
      if (!draft) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "초안을 찾을 수 없습니다." } });
      }

      const updates: { title?: string; inputs?: Record<string, unknown> } = {};
      if (req.body?.title) updates.title = req.body.title;
      if (req.body?.inputs) updates.inputs = mergeDeep(draft.inputs || {}, req.body.inputs);

      const validation = validateInputs(draft.toolId as ToolId, updates.inputs || (draft.inputs as Record<string, unknown>));
      const updated = await storage.updateAftercareDraft(draftId, {
        ...updates,
        validation,
      });

      if (!updated) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "초안을 찾을 수 없습니다." } });
      }

      res.json({ draft: mapDraft(updated) });
    } catch (error) {
      console.error("Error updating aftercare draft:", error);
      res.status(500).json({ error: { code: "SERVER_ERROR", message: "초안 수정 실패" } });
    }
  });

  // Generate field
  app.post("/v1/drafts/:draftId/fields/:fieldKey:generate", async (req, res) => {
    try {
      const { draftId, fieldKey } = req.params;
      const draft = await storage.getAftercareDraft(draftId);
      if (!draft) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "초안을 찾을 수 없습니다." } });
      }

      const toolId = draft.toolId as ToolId;
      if (!AFTERCARE_FIELD_KEYS[toolId]?.includes(fieldKey)) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "필드를 찾을 수 없습니다." } });
      }

      const options = req.body || {};
      const text = await generateAftercareFieldText(
        anthropic,
        toolId,
        fieldKey,
        draft.inputs as Record<string, unknown>,
        options
      );

      const mode = options.mode === "append" ? "append" : "overwrite";
      const existing = (draft.generatedFields || {})[fieldKey];
      const mergedText = mode === "append" && existing?.text ? `${existing.text}\n${text}` : text;

      const policyCheck = checkPolicyNoNewNumbers(mergedText, draft.inputs);
      if (policyCheck.violated) {
        return res.status(422).json({
          error: {
            code: "POLICY_VIOLATION_NEW_NUMBER",
            message: "입력값에 없는 수치/날짜/금액이 생성되었습니다.",
            evidence: policyCheck.evidence,
          },
        });
      }

      const generatedFields = {
        ...(draft.generatedFields || {}),
        [fieldKey]: {
          text: mergedText,
          source: existing && mode === "append" ? "mixed" : "ai",
          last_generated_at: new Date().toISOString(),
        },
      };

      const validation = validateInputs(toolId, draft.inputs as Record<string, unknown>);
      const updated = await storage.updateAftercareDraft(draftId, {
        generatedFields,
        validation,
      });

      res.json({
        field_key: fieldKey,
        result: {
          text: mergedText,
          policy_checks: {
            new_numeric_detected: false,
            forbidden_wording_detected: false,
          },
        },
        validation: updated?.validation || validation,
      });
    } catch (error) {
      console.error("Error generating field:", error);
      res.status(500).json({ error: { code: "SERVER_ERROR", message: "필드 생성 실패" } });
    }
  });

  // Validate draft
  app.post("/v1/drafts/:draftId:validate", async (req, res) => {
    try {
      const { draftId } = req.params;
      const draft = await storage.getAftercareDraft(draftId);
      if (!draft) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "초안을 찾을 수 없습니다." } });
      }
      const validation = validateInputs(draft.toolId as ToolId, draft.inputs as Record<string, unknown>);
      await storage.updateAftercareDraft(draftId, { validation });
      res.json({ validation });
    } catch (error) {
      console.error("Error validating draft:", error);
      res.status(500).json({ error: { code: "SERVER_ERROR", message: "검증 실패" } });
    }
  });

  // Render draft
  app.post("/v1/drafts/:draftId:render", async (req, res) => {
    try {
      const { draftId } = req.params;
      const draft = await storage.getAftercareDraft(draftId);
      if (!draft) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "초안을 찾을 수 없습니다." } });
      }

      const includeAppendixTables = req.body?.include_appendix_tables ?? true;
      const validation = validateInputs(draft.toolId as ToolId, draft.inputs as Record<string, unknown>);
      const toolId = draft.toolId as ToolId;
      const renderData =
        toolId === "aftercare_plan"
          ? renderAftercarePlanHtml(draft.inputs as any, (draft.generatedFields || {}) as Record<string, GeneratedField>, includeAppendixTables)
          : renderAftercareReportHtml(draft.inputs as any, (draft.generatedFields || {}) as Record<string, GeneratedField>, includeAppendixTables);

      await storage.updateAftercareDraft(draftId, {
        status: "rendered",
        validation,
      });

      res.json({
        render: {
          format: "html",
          title: draft.title,
          toc: renderData.toc,
          html: renderData.html,
        },
        validation,
      });
    } catch (error) {
      console.error("Error rendering draft:", error);
      res.status(500).json({ error: { code: "SERVER_ERROR", message: "렌더링 실패" } });
    }
  });

  // Finalize draft
  app.post("/v1/drafts/:draftId:finalize", async (req, res) => {
    try {
      const { draftId } = req.params;
      const draft = await storage.getAftercareDraft(draftId);
      if (!draft) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "초안을 찾을 수 없습니다." } });
      }

      const title = req.body?.title || draft.title;
      const validation = validateInputs(draft.toolId as ToolId, draft.inputs as Record<string, unknown>);
      if (validation.blocking.length) {
        return res.status(422).json({
          error: { code: "VALIDATION_BLOCKING", message: "필수 항목이 누락되었습니다." },
        });
      }

      const doc = await storage.createAftercareLibraryDoc({
        docId: createId("doc"),
        userId: draft.userId,
        toolId: draft.toolId,
        title,
        inputs: draft.inputs,
        generatedFields: draft.generatedFields || {},
      });

      await storage.updateAftercareDraft(draftId, { status: "finalized", title });

      res.status(201).json({ doc: mapLibraryDoc(doc) });
    } catch (error) {
      console.error("Error finalizing draft:", error);
      res.status(500).json({ error: { code: "SERVER_ERROR", message: "저장 실패" } });
    }
  });

  // Library list
  app.get("/v1/library", async (req, res) => {
    try {
      const toolId = req.query.tool_id as string | undefined;
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const cursor = req.query.cursor as string | undefined;

      const docs = await storage.listAftercareLibrary(toolId);
      const sorted = docs.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
      const startIndex = cursor ? Math.max(sorted.findIndex((doc) => doc.docId === cursor) + 1, 0) : 0;
      const items = sorted.slice(startIndex, startIndex + limit);
      const next = sorted[startIndex + limit]?.docId || null;

      res.json({
        items: items.map(mapLibraryDoc),
        next_cursor: next,
      });
    } catch (error) {
      console.error("Error listing library:", error);
      res.status(500).json({ error: { code: "SERVER_ERROR", message: "목록 조회 실패" } });
    }
  });

  // Library detail
  app.get("/v1/library/:docId", async (req, res) => {
    try {
      const { docId } = req.params;
      const doc = await storage.getAftercareLibraryDoc(docId);
      if (!doc) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "문서를 찾을 수 없습니다." } });
      }

      const toolId = doc.toolId as ToolId;
      const renderData =
        toolId === "aftercare_plan"
          ? renderAftercarePlanHtml(doc.inputs as any, (doc.generatedFields || {}) as Record<string, GeneratedField>, true)
          : renderAftercareReportHtml(doc.inputs as any, (doc.generatedFields || {}) as Record<string, GeneratedField>, true);

      res.json({
        doc: mapLibraryDoc(doc),
        inputs: doc.inputs,
        generated_fields: doc.generatedFields || {},
        render: {
          format: "html",
          toc: renderData.toc,
          html: renderData.html,
        },
      });
    } catch (error) {
      console.error("Error fetching library doc:", error);
      res.status(500).json({ error: { code: "SERVER_ERROR", message: "문서 조회 실패" } });
    }
  });

  // ================== HWP Upload & Template Extraction ==================

  // Upload HWP file for AI reference
  app.post("/api/upload/hwp", requireFullAuth, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { code: "UPLOAD_FAILED", message: "파일이 필요합니다." },
        });
      }

      const fileName = req.file.originalname || "reference.hwp";
      const fileSize = req.file.size;
      const userId = req.user?.id?.toString();

      const parseResult = await parseHwpFile(req.file.buffer);

      const extractTables = (markdown: string) => {
        const tables: Array<{ rowCount: number; colCount: number; data: string[][] }> = [];
        const lines = markdown.split("\n");
        let current: string[] = [];
        const flushTable = () => {
          if (current.length < 2) {
            current = [];
            return;
          }
          const header = current[0];
          const separator = current[1];
          if (!header.includes("|") || !separator.includes("|")) {
            current = [];
            return;
          }
          const rows = current
            .filter((line) => line.includes("|"))
            .map((line) =>
              line
                .split("|")
                .map((cell) => cell.trim())
                .filter((cell) => cell.length > 0)
            );
          const rowCount = rows.length;
          const colCount = rows[0]?.length || 0;
          if (rowCount && colCount) {
            tables.push({ rowCount, colCount, data: rows });
          }
          current = [];
        };

        for (const line of lines) {
          if (line.includes("|")) {
            current.push(line);
          } else if (current.length) {
            flushTable();
          }
        }
        if (current.length) flushTable();
        return tables;
      };

      const extractStructure = (markdown: string) => {
        const lines = markdown.split("\n");
        const sections: Array<{ heading: string; content: string }> = [];
        let currentHeading = "";
        let currentContent: string[] = [];
        let title = "";

        const flushSection = () => {
          if (!currentHeading) return;
          const content = currentContent.join("\n").trim();
          sections.push({ heading: currentHeading, content });
          currentContent = [];
        };

        for (const line of lines) {
          const headingMatch = line.match(/^#{1,3}\s+(.+)/);
          if (headingMatch) {
            if (!title) {
              title = headingMatch[1].trim();
            }
            if (currentHeading) flushSection();
            currentHeading = headingMatch[1].trim();
            continue;
          }
          currentContent.push(line);
        }
        flushSection();
        return {
          title: title || fileName.replace(/\.(hwp)$/i, ""),
          sections,
        };
      };

      const parsedContent = {
        text: parseResult.text,
        tables: extractTables(parseResult.markdown),
        structure: extractStructure(parseResult.markdown),
      };

      const template = await storage.createUploadedTemplate({
        userId: userId || null,
        fileName: `${Date.now()}-${fileName}`,
        originalName: fileName,
        status: "completed",
        extractedText: parseResult.text,
        extractedMarkdown: parseResult.markdown,
        extractedFields: parseResult.fields,
        styleInfo: parseResult.styleInfo,
      });

      const chunks = chunkText(parseResult.text);
      for (let i = 0; i < chunks.length; i++) {
        await storage.createEmbedding({
          uploadedTemplateId: template.id,
          chunkIndex: i,
          chunkText: chunks[i],
        });
      }

      res.status(201).json({
        success: true,
        data: {
          fileId: template.id,
          fileName,
          fileSize,
          parsedContent,
          uploadedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("HWP upload error:", error);
      const message = error instanceof Error ? error.message : "파일 업로드에 실패했습니다.";
      res.status(500).json({
        success: false,
        error: { code: "UPLOAD_FAILED", message },
      });
    }
  });

  // Crawl a document URL and store as reference for RAG
  app.post(
    "/api/crawler/ingest",
    hasRole(USER_TYPES.OPERATOR),
    async (req, res) => {
    try {
      const { url, urls } = req.body as { url?: string; urls?: string[] };
      const targets = urls && urls.length ? urls : url ? [url] : [];
      if (!targets.length) {
        return res.status(400).json({ error: "수집할 URL을 입력해주세요." });
      }

      const userId = req.user?.id?.toString();
      const results: Array<{
        fileId: number;
        title: string;
        sourceUrl: string;
        attachments: number;
      }> = [];

      for (const targetUrl of targets) {
        let parsedUrl: URL;
        try {
          parsedUrl = new URL(targetUrl);
        } catch {
          return res.status(400).json({ error: "올바른 URL 형식이 아닙니다." });
        }

        const crawlResult = await crawlDocumentFromUrl(parsedUrl.toString());
        if (!crawlResult.text) {
          return res.status(400).json({ error: "본문을 추출하지 못했습니다." });
        }

        const template = await storage.createUploadedTemplate({
          userId: userId || null,
          fileName: `crawl-${Date.now()}`,
          originalName: crawlResult.title || parsedUrl.hostname,
          documentType: "crawler",
          status: "completed",
          extractedText: crawlResult.text,
          extractedMarkdown: crawlResult.markdown,
          extractedFields: [],
          styleInfo: {
            source: "crawl",
            sourceUrl: parsedUrl.toString(),
            attachments: crawlResult.attachments.map(att => ({
              url: att.url,
              name: att.name,
              type: att.type,
            })),
          },
        });

        const chunks = chunkText(crawlResult.text);
        for (let i = 0; i < chunks.length; i++) {
          await storage.createEmbedding({
            uploadedTemplateId: template.id,
            chunkIndex: i,
            chunkText: chunks[i],
          });
        }

        results.push({
          fileId: template.id,
          title: crawlResult.title,
          sourceUrl: parsedUrl.toString(),
          attachments: crawlResult.attachments.length,
        });
      }

      res.status(201).json({
        success: true,
        data: targets.length === 1 ? results[0] : results,
      });
    } catch (error) {
      console.error("Crawler ingest error:", error);
      const message = error instanceof Error ? error.message : "크롤링에 실패했습니다.";
      res.status(500).json({ error: message });
    }
    }
  );

  // Upload HWP file and extract template
  app.post("/api/uploaded-templates/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "파일이 필요합니다" });
      }

      const userId = req.user?.id?.toString();
      const fileName = `${Date.now()}-${req.file.originalname}`;
      
      // Create initial template record
      const template = await storage.createUploadedTemplate({
        userId: userId || null,
        fileName,
        originalName: req.file.originalname,
        status: "processing",
      });

      // Parse HWP file
      try {
        const parseResult = await parseHwpFile(req.file.buffer);
        
        // Update template with extracted data
        const updated = await storage.updateUploadedTemplate(template.id, {
          extractedText: parseResult.text,
          extractedMarkdown: parseResult.markdown,
          extractedFields: parseResult.fields,
          styleInfo: parseResult.styleInfo,
          status: "completed",
        });

        // Create embeddings for RAG
        const chunks = chunkText(parseResult.text);
        for (let i = 0; i < chunks.length; i++) {
          await storage.createEmbedding({
            uploadedTemplateId: template.id,
            chunkIndex: i,
            chunkText: chunks[i],
          });
        }

        res.status(201).json(updated);
      } catch (parseError) {
        await storage.updateUploadedTemplate(template.id, {
          status: "failed",
        });
        throw parseError;
      }
    } catch (error) {
      console.error("Error uploading HWP file:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "HWP 파일 업로드 실패" 
      });
    }
  });

  // Get all uploaded templates (user-scoped)
  app.get("/api/uploaded-templates", async (req, res) => {
    try {
      const userId = req.user?.id?.toString();
      const templates = await storage.getUploadedTemplates(userId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching uploaded templates:", error);
      res.status(500).json({ error: "Failed to fetch uploaded templates" });
    }
  });

  // Get single uploaded template
  app.get("/api/uploaded-templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }
      
      const template = await storage.getUploadedTemplate(id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      // Check ownership
      const userId = req.user?.id?.toString();
      if (template.userId && template.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error fetching uploaded template:", error);
      res.status(500).json({ error: "Failed to fetch uploaded template" });
    }
  });

  // Delete uploaded template
  app.delete("/api/uploaded-templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }
      
      const template = await storage.getUploadedTemplate(id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      // Check ownership
      const userId = req.user?.id?.toString();
      if (template.userId && template.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      await storage.deleteUploadedTemplate(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting uploaded template:", error);
      res.status(500).json({ error: "Failed to delete uploaded template" });
    }
  });

  // Get embeddings for a template (for RAG context)
  app.get("/api/uploaded-templates/:id/embeddings", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }
      
      const template = await storage.getUploadedTemplate(id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      // Check ownership
      const userId = req.user?.id?.toString();
      if (template.userId && template.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const embeddings = await storage.getEmbeddingsByTemplateId(id);
      res.json(embeddings);
    } catch (error) {
      console.error("Error fetching embeddings:", error);
      res.status(500).json({ error: "Failed to fetch embeddings" });
    }
  });

  // Use AI to analyze template and extract fields
  app.post("/api/uploaded-templates/:id/analyze", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }
      
      const template = await storage.getUploadedTemplate(id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      // Check ownership
      const userId = req.user?.id?.toString();
      if (template.userId && template.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Use Claude to analyze the document and extract fields
      const analysisPrompt = `당신은 한국어 학교 행정 문서 분석 전문가입니다. 다음 문서 내용을 분석하여 필요한 입력 필드를 추출해주세요.

[문서 내용]
${template.extractedText?.substring(0, 3000) || "(내용 없음)"}

[분석 지침]
1. 문서에서 사용자가 입력해야 할 항목들을 식별하세요
2. 각 항목에 대해 다음 정보를 JSON 형식으로 제공하세요:
   - name: 영문 필드명 (camelCase)
   - label: 한국어 라벨
   - type: "text", "textarea", "date", "number", "select" 중 하나
   - required: true/false
   - description: 필드 설명

JSON 배열 형식으로만 응답해주세요:`;

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 2048,
        messages: [{ role: "user", content: analysisPrompt }],
      });

      const content = message.content[0];
      const responseText = content.type === "text" ? content.text : "";
      
      // Parse the JSON response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const fields = JSON.parse(jsonMatch[0]);
        
        // Update template with AI-analyzed fields
        const updated = await storage.updateUploadedTemplate(id, {
          extractedFields: fields,
        });
        
        res.json(updated);
      } else {
        res.status(500).json({ error: "필드 분석에 실패했습니다" });
      }
    } catch (error) {
      console.error("Error analyzing template:", error);
      res.status(500).json({ error: "템플릿 분석 실패" });
    }
  });

  return httpServer;
}
