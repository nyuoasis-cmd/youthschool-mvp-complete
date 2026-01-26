import { readFile } from "fs/promises";
import path from "path";
import {
  type RagCategoriesConfig,
  type RagDocumentsMetadata,
  type RagDocument,
  buildRagRawUrl,
  RAG_LOCAL_CATEGORIES_PATH,
  RAG_LOCAL_METADATA_PATH,
  RAG_GITHUB,
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
  const relativePath = resolveDocumentPath(doc, categories);
  if (!relativePath) return "";
  try {
    const response = await fetch(buildRagRawUrl(relativePath));
    if (!response.ok) return "";
    const text = await response.text();
    if (looksBinary(text)) return "";
    return normalizeText(text);
  } catch {
    return "";
  }
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
