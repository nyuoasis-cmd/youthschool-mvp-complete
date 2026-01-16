import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateDocumentRequestSchema, type GenerateDocumentRequest } from "@shared/schema";
import Anthropic from "@anthropic-ai/sdk";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import multer from "multer";
import { parseHwpFile, chunkText } from "./hwpParser";
import { exportToDocx, exportToPdf } from "./documentExporter";

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

// Initialize Anthropic client with AI Integrations
const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Replit Auth (MUST be before other routes) - skip in local development
  if (process.env.REPL_ID) {
    await setupAuth(app);
    registerAuthRoutes(app);
  }

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
      const userId = (req.user as any)?.claims?.sub;
      const documents = await storage.getDocuments(userId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  // Get single document (requires authentication and ownership)
  app.get("/api/documents/:id", async (req, res) => {
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
      const userId = (req.user as any)?.claims?.sub;
      
      // Anonymous documents (userId is null) cannot be accessed via API
      // They are only viewable immediately after creation via state
      if (!document.userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      if (document.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(document);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ error: "Failed to fetch document" });
    }
  });

  // Create document manually (without AI)
  app.post("/api/documents", async (req, res) => {
    try {
      const { documentType, content, title } = req.body;
      
      if (!content || !title) {
        return res.status(400).json({ error: "Title and content are required" });
      }

      const userId = (req.user as any)?.claims?.sub;
      
      // Get template for document type
      const templates = await storage.getTemplatesByType(documentType || "가정통신문");
      const template = templates.find(t => t.isDefault) || templates[0];
      
      const document = await storage.createDocument({
        templateId: template?.id || null,
        userId: userId || null,
        documentType: documentType || "가정통신문",
        title,
        inputData: {},
        generatedContent: content,
        status: "completed",
        processingTimeMs: 0,
      });

      res.status(201).json(document);
    } catch (error) {
      console.error("Error creating document:", error);
      res.status(500).json({ error: "Failed to create document" });
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
      }

      // Inject RAG context into prompt
      if (ragContext) {
        prompt = ragContext + prompt;
      }

      // Create initial document record
      const title = inputs.title || `${documentType} - ${new Date().toLocaleDateString('ko-KR')}`;
      const userId = (req.user as any)?.claims?.sub;
      const document = await storage.createDocument({
        templateId: template.id,
        userId: userId || null,
        documentType,
        title,
        inputData: inputs,
        status: "pending",
      });

      // Generate content using Claude AI
      let generatedContent: string;
      try {
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
      } catch (aiError) {
        console.error("AI generation error:", aiError);
        
        // Update document with error status
        await storage.updateDocument(document.id, {
          status: "failed",
          processingTimeMs: Date.now() - startTime,
        });
        
        return res.status(500).json({ 
          error: "AI 문서 생성에 실패했습니다. 잠시 후 다시 시도해주세요.",
          documentId: document.id 
        });
      }

      // Update document with generated content
      const processingTimeMs = Date.now() - startTime;
      const updatedDocument = await storage.updateDocument(document.id, {
        generatedContent,
        status: "completed",
        processingTimeMs,
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
      }

      if (!prompt) {
        return res.status(400).json({ error: `지원하지 않는 필드입니다: ${fieldName}` });
      }

      // Generate content using Claude AI
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
      const generatedText = content.type === "text" ? content.text : "";

      res.json({ 
        fieldName, 
        generatedContent: generatedText.trim() 
      });
    } catch (error) {
      console.error("Error generating field content:", error);
      res.status(500).json({ error: "AI 내용 생성에 실패했습니다. 잠시 후 다시 시도해주세요." });
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
      const userId = (req.user as any)?.claims?.sub;
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
      
      const userId = (req.user as any)?.claims?.sub;
      
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
      const userId = (req.user as any)?.claims?.sub;
      const stats = await storage.getStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // ================== HWP Upload & Template Extraction ==================

  // Upload HWP file and extract template
  app.post("/api/uploaded-templates/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "파일이 필요합니다" });
      }

      const userId = (req.user as any)?.claims?.sub;
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
      const userId = (req.user as any)?.claims?.sub;
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
      const userId = (req.user as any)?.claims?.sub;
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
      const userId = (req.user as any)?.claims?.sub;
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
      const userId = (req.user as any)?.claims?.sub;
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
      const userId = (req.user as any)?.claims?.sub;
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
