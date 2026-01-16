import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateDocumentRequestSchema, type GenerateDocumentRequest } from "@shared/schema";
import Anthropic from "@anthropic-ai/sdk";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import multer from "multer";
import { parseHwpFile, chunkText } from "./hwpParser";

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
  // Setup Replit Auth (MUST be before other routes)
  await setupAuth(app);
  registerAuthRoutes(app);

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
