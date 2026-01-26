export const RAG_GITHUB = {
  owner: "nyuoasis-cmd",
  repo: "school-newsletter-rag",
  ref: "main",
  metadataPath: "metadata/documents.json",
  categoriesPath: "config/categories.json",
  documentsBasePath: "documents",
} as const;

export const RAG_RAW_BASE_URL = `https://raw.githubusercontent.com/${RAG_GITHUB.owner}/${RAG_GITHUB.repo}/${RAG_GITHUB.ref}`;

export const RAG_LOCAL_DATA_DIR = "shared/rag-data";
export const RAG_LOCAL_METADATA_PATH = `${RAG_LOCAL_DATA_DIR}/documents.json`;
export const RAG_LOCAL_CATEGORIES_PATH = `${RAG_LOCAL_DATA_DIR}/categories.json`;

export const buildRagRawUrl = (relativePath: string) =>
  `${RAG_RAW_BASE_URL}/${relativePath.replace(/^\/+/, "")}`;

export interface RagCategory {
  id: string;
  name: string;
  folder: string;
  keywords: string[];
}

export interface RagCategoriesConfig {
  categories: RagCategory[];
  defaultCategory: string;
}

export interface RagDocument {
  id: string;
  title: string;
  filename: string;
  category: string;
  categoryName: string;
  date: string;
  sourceUrl: string;
  downloadUrl: string;
  downloadedAt: string;
  classified: boolean;
  classifiedAt: string;
  reclassifiedAt?: string;
}

export interface RagDocumentsMetadata {
  documents: RagDocument[];
}
