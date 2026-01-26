import type { RagReferenceDocument } from "./rag";

function buildRagSection(documents: RagReferenceDocument[]) {
  if (documents.length === 0) return "";

  const sections = documents.map((doc, index) => {
    return [
      `[참고문서 ${index + 1}] ${doc.title}`,
      doc.sourceUrl ? `출처: ${doc.sourceUrl}` : "",
      doc.contentSnippet,
    ]
      .filter(Boolean)
      .join("\n");
  });

  return [
    "[참고 문서 - RAG]",
    "다음은 비슷한 유형의 실제 학교 문서 예시입니다:",
    "---",
    sections.join("\n\n---\n\n"),
    "---",
    "",
  ].join("\n");
}

export function buildRagPrompt(options: {
  basePrompt: string;
  ragDocuments: RagReferenceDocument[];
  extraContext?: string;
}) {
  const { basePrompt, ragDocuments, extraContext } = options;

  const parts = [];
  if (extraContext && extraContext.trim()) {
    parts.push(extraContext.trim());
  }

  const ragSection = buildRagSection(ragDocuments);
  if (ragSection) {
    parts.push(ragSection);
  }

  parts.push(basePrompt);
  return parts.filter(Boolean).join("\n\n");
}
