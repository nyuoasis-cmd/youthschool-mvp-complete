import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateDocumentRequestSchema, type GenerateDocumentRequest } from "@shared/schema";
import Anthropic from "@anthropic-ai/sdk";

// Initialize Anthropic client with AI Integrations
const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
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

  // Get all generated documents
  app.get("/api/documents", async (req, res) => {
    try {
      const documents = await storage.getDocuments();
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  // Get single document
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

      const { documentType, inputs } = parseResult.data;

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

      // Create initial document record
      const title = inputs.title || `${documentType} - ${new Date().toLocaleDateString('ko-KR')}`;
      const document = await storage.createDocument({
        templateId: template.id,
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

  // Delete document
  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid document ID" });
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

  // Get stats
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  return httpServer;
}
