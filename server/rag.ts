import { readFile, readdir } from "fs/promises";
import path from "path";
import {
  type RagCategoriesConfig,
  type RagDocumentsMetadata,
  type RagDocument,
  RAG_LOCAL_CATEGORIES_PATH,
  RAG_LOCAL_METADATA_PATH,
  RAG_GITHUB,
  RAG_LOCAL_NEWSLETTER_PATH,
} from "@shared/rag-config";
import { getRagCategoryIdsForDocumentType } from "@shared/category-mapping";

export interface RagReferenceDocument {
  id: string;
  title: string;
  category: string;
  categoryName: string;
  sourceUrl: string;
  contentSnippet: string;
}

const MAX_SNIPPET_LENGTH = 1600;
const DEFAULT_REFERENCE_LIMIT = 3;

let cachedCategories: RagCategoriesConfig | null = null;
let cachedDocuments: RagDocumentsMetadata | null = null;
let cachedFileIndex: Map<string, string> | null = null; // filename -> full path

// Build index of all .txt files in _text directory for fast lookup
async function buildFileIndex(): Promise<Map<string, string>> {
  if (cachedFileIndex) return cachedFileIndex;

  const index = new Map<string, string>();
  const textDir = path.join(RAG_LOCAL_NEWSLETTER_PATH, "documents/_text");

  async function scanDir(dir: string) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith(".txt")) {
          // Store both with and without extension for flexible matching
          const baseName = entry.name.replace(/\.txt$/, "");
          index.set(entry.name, fullPath);
          index.set(baseName, fullPath);
          // Also store normalized name (no extension, lowercase)
          index.set(baseName.toLowerCase(), fullPath);
        }
      }
    } catch {
      // Directory scan error, skip
    }
  }

  await scanDir(textDir);
  cachedFileIndex = index;
  console.log(`[RAG] File index built: ${index.size} entries`);
  return index;
}

const stopwords = new Set([
  "및",
  "또는",
  "그리고",
  "관련",
  "안내",
  "운영",
  "계획",
  "계획서",
  "자료",
  "문서",
  "작성",
  "학교",
  "학부모",
  "학생",
  "교육",
  "교내",
  "교외",
  "가정통신문",
]);

function normalizeText(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function extractKeywords(input: string): string[] {
  const tokens = input
    .toLowerCase()
    .split(/[\s,.;:()\-_/\\]+/)
    .map(token => token.trim())
    .filter(token => token.length >= 2 && !stopwords.has(token));

  return Array.from(new Set(tokens));
}

function scoreDocument(doc: RagDocument, keywords: string[]) {
  if (keywords.length === 0) return 0;
  const haystack = [
    doc.title,
    doc.categoryName,
    doc.filename,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let score = 0;
  for (const keyword of keywords) {
    if (!keyword) continue;
    if (haystack.includes(keyword)) {
      score += 1;
    }
  }

  return score;
}

async function loadCategories(): Promise<RagCategoriesConfig | null> {
  if (cachedCategories) return cachedCategories;
  try {
    const raw = await readFile(path.resolve(RAG_LOCAL_CATEGORIES_PATH), "utf-8");
    cachedCategories = JSON.parse(raw);
    return cachedCategories;
  } catch {
    return null;
  }
}

async function loadDocuments(): Promise<RagDocumentsMetadata | null> {
  if (cachedDocuments) return cachedDocuments;
  try {
    const raw = await readFile(path.resolve(RAG_LOCAL_METADATA_PATH), "utf-8");
    cachedDocuments = JSON.parse(raw);
    return cachedDocuments;
  } catch {
    return null;
  }
}

function resolveDocumentPath(doc: RagDocument, categories: RagCategoriesConfig | null) {
  const folder = categories?.categories.find(cat => cat.id === doc.category)?.folder;
  if (!folder) return null;
  return `${RAG_GITHUB.documentsBasePath}/${folder}/${doc.filename}`;
}

function looksBinary(text: string) {
  if (!text) return true;
  const sample = text.slice(0, 800);
  if (sample.includes("\u0000")) return true;
  const nonPrintable = sample.replace(/[\x09\x0A\x0D\x20-\x7E\u1100-\uD7A3]/g, "");
  return nonPrintable.length / Math.max(sample.length, 1) > 0.3;
}

async function fetchDocumentContent(doc: RagDocument, categories: RagCategoriesConfig | null) {
  const fileIndex = await buildFileIndex();

  // Try to find the file by filename (with .txt extension or converted)
  const filenameBase = doc.filename.replace(/\.(hwp|hwpx|pdf|doc|docx)$/i, "");
  const possibleNames = [
    filenameBase + ".txt",
    filenameBase,
    filenameBase.toLowerCase(),
    doc.filename,
  ];

  for (const name of possibleNames) {
    const filePath = fileIndex.get(name);
    if (filePath) {
      try {
        const text = await readFile(filePath, "utf-8");
        if (looksBinary(text)) continue;
        console.log(`[RAG] Loaded document: ${doc.filename} from ${path.basename(filePath)}`);
        return normalizeText(text);
      } catch {
        // File read error, try next
      }
    }
  }

  console.log(`[RAG] Document not found: ${doc.filename}`);
  return "";
}

function buildSnippet(text: string) {
  const normalized = normalizeText(text);
  if (normalized.length <= MAX_SNIPPET_LENGTH) return normalized;
  return normalized.slice(0, MAX_SNIPPET_LENGTH).trim() + "...";
}

export async function getRagReferenceDocuments(options: {
  documentType: string;
  inputs: Record<string, string>;
  limit?: number;
}): Promise<RagReferenceDocument[]> {
  const { documentType, inputs, limit = DEFAULT_REFERENCE_LIMIT } = options;

  const [documentsData, categoriesData] = await Promise.all([
    loadDocuments(),
    loadCategories(),
  ]);

  if (!documentsData) return [];

  const categoryIds = getRagCategoryIdsForDocumentType(documentType);
  let documents = documentsData.documents;
  if (categoryIds.length > 0) {
    documents = documents.filter(doc => categoryIds.includes(doc.category));
  }

  const inputText = Object.values(inputs).join(" ");
  const keywords = extractKeywords(inputText);

  const scored = documents
    .map(doc => ({ doc, score: scoreDocument(doc, keywords) }))
    .sort((a, b) => b.score - a.score);

  const selected = scored
    .filter(item => item.score > 0)
    .slice(0, limit);

  const fallback = scored.slice(0, limit);
  const finalSelection = (selected.length > 0 ? selected : fallback).map(item => item.doc);

  const references: RagReferenceDocument[] = [];
  for (const doc of finalSelection) {
    const content = await fetchDocumentContent(doc, categoriesData);
    references.push({
      id: doc.id,
      title: doc.title,
      category: doc.category,
      categoryName: doc.categoryName,
      sourceUrl: doc.sourceUrl,
      contentSnippet: buildSnippet(content || doc.title),
    });
  }

  return references;
}
