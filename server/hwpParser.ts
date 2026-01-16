import { toJson, toMarkdown, fileHeader } from "@ohah/hwpjs";
import type { TemplateField } from "@shared/schema";

export interface HwpParseResult {
  text: string;
  markdown: string;
  images: any[];
  header: any;
  fields: TemplateField[];
  styleInfo: Record<string, unknown>;
}

export async function parseHwpFile(buffer: Buffer): Promise<HwpParseResult> {
  try {
    const jsonString = toJson(buffer);
    const jsonData = JSON.parse(jsonString);
    
    const markdownResult = toMarkdown(buffer, {
      image: "base64",
      useHtml: true,
      includeVersion: true,
      includePageInfo: true,
    });
    
    let headerData: any = {};
    try {
      const headerString = fileHeader(buffer);
      headerData = JSON.parse(headerString);
    } catch {
      headerData = {};
    }
    
    const text = extractTextFromJson(jsonData);
    const fields = extractFieldsFromText(text);
    const styleInfo = extractStyleInfo(jsonData);
    
    return {
      text,
      markdown: markdownResult.markdown,
      images: markdownResult.images || [],
      header: headerData,
      fields,
      styleInfo,
    };
  } catch (error) {
    console.error("Error parsing HWP file:", error);
    throw new Error(`HWP 파일 파싱 오류: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
  }
}

function extractTextFromJson(jsonData: any): string {
  const textParts: string[] = [];
  const visited = new WeakSet();
  
  const contentKeys = ["text", "value", "content", "str", "data"];
  const structureKeys = ["sections", "paragraphs", "runs", "children", "body", "bodyText"];
  const skipKeys = ["header", "docInfo", "charShapes", "paraShapes", "fonts", "styles", "binData", "properties", "settings", "version", "flags"];
  
  function extractFromSection(section: any, depth: number = 0) {
    if (!section || typeof section !== "object" || depth > 20) return;
    if (visited.has(section)) return;
    
    try {
      visited.add(section);
    } catch {
    }
    
    if (Array.isArray(section)) {
      for (const item of section) {
        extractFromSection(item, depth + 1);
      }
      return;
    }
    
    for (const key of contentKeys) {
      if (section[key] && typeof section[key] === "string") {
        const text = section[key].trim();
        if (text.length > 0 && text.length < 5000) {
          textParts.push(text);
        }
      }
    }
    
    for (const key of structureKeys) {
      if (section[key] && !skipKeys.includes(key)) {
        extractFromSection(section[key], depth + 1);
      }
    }
    
    if (section.type === "paragraph" || section.type === "run" || section.nodeType === "paragraph") {
      for (const key of Object.keys(section)) {
        if (!skipKeys.includes(key) && !contentKeys.includes(key) && !structureKeys.includes(key)) {
          if (section[key] && typeof section[key] === "object") {
            extractFromSection(section[key], depth + 1);
          }
        }
      }
    }
  }
  
  if (jsonData.sections) {
    extractFromSection(jsonData.sections);
  } else if (jsonData.body) {
    extractFromSection(jsonData.body);
  } else if (jsonData.paragraphs) {
    extractFromSection(jsonData.paragraphs);
  } else {
    extractFromSection(jsonData);
  }
  
  const cleanedText = textParts
    .map(t => t.replace(/\s+/g, " ").trim())
    .filter(t => t.length > 0)
    .join("\n");
  
  return cleanedText;
}

function extractFieldsFromText(text: string): TemplateField[] {
  const fields: TemplateField[] = [];
  const lines = text.split("\n").filter(l => l.trim());
  
  const commonPatterns = [
    { pattern: /제목|문서명|서명/i, name: "title", label: "제목", type: "text" as const },
    { pattern: /학교|학교명/i, name: "schoolName", label: "학교명", type: "text" as const },
    { pattern: /날짜|일자|작성일/i, name: "date", label: "날짜", type: "date" as const },
    { pattern: /목적|취지/i, name: "purpose", label: "목적", type: "textarea" as const },
    { pattern: /내용|본문/i, name: "content", label: "내용", type: "textarea" as const },
    { pattern: /담당자|연락처|문의/i, name: "contact", label: "담당자/연락처", type: "text" as const },
    { pattern: /기간|일정/i, name: "duration", label: "기간", type: "text" as const },
    { pattern: /대상|참가자/i, name: "target", label: "대상", type: "text" as const },
    { pattern: /예산|금액|비용/i, name: "budget", label: "예산", type: "number" as const },
  ];
  
  const foundPatterns = new Set<string>();
  
  for (const line of lines) {
    for (const { pattern, name, label, type } of commonPatterns) {
      if (pattern.test(line) && !foundPatterns.has(name)) {
        foundPatterns.add(name);
        fields.push({
          name,
          label,
          type,
          required: name === "title" || name === "schoolName",
          description: `${label} 입력`,
        });
      }
    }
  }
  
  if (fields.length === 0) {
    fields.push(
      { name: "title", label: "제목", type: "text", required: true },
      { name: "content", label: "내용", type: "textarea", required: true },
    );
  }
  
  return fields;
}

function extractStyleInfo(jsonData: any): Record<string, unknown> {
  const styleInfo: Record<string, unknown> = {};
  
  try {
    if (jsonData.header) {
      styleInfo.version = jsonData.header.version;
      styleInfo.flags = jsonData.header.flags;
    }
    
    if (jsonData.docInfo) {
      styleInfo.documentInfo = {
        hasFonts: !!jsonData.docInfo.fonts,
        hasStyles: !!jsonData.docInfo.styles,
      };
    }
    
    if (jsonData.sections) {
      styleInfo.sectionCount = jsonData.sections.length;
    }
  } catch {
  }
  
  return styleInfo;
}

export function chunkText(text: string, chunkSize: number = 500, overlap: number = 50): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?。！？]\s*/).filter(s => s.trim());
  
  let currentChunk = "";
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      const words = currentChunk.split(/\s+/);
      const overlapWords = words.slice(-Math.floor(overlap / 5));
      currentChunk = overlapWords.join(" ") + " " + sentence;
    } else {
      currentChunk += (currentChunk ? ". " : "") + sentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}
