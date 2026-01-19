import { parseHwpFile } from "./hwpParser";

export interface CrawledAttachment {
  url: string;
  name: string;
  type: "hwp" | "other";
  extractedText?: string;
}

export interface CrawlResult {
  title: string;
  text: string;
  markdown: string;
  attachments: CrawledAttachment[];
}

const ATTACHMENT_EXTENSIONS = [
  ".pdf",
  ".hwp",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
];

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_HWP_ATTACHMENTS = 3;

const decodeHtmlEntities = (input: string) => {
  const namedEntities: Record<string, string> = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&apos;": "'",
  };

  let output = input;
  for (const [entity, value] of Object.entries(namedEntities)) {
    output = output.replaceAll(entity, value);
  }

  output = output.replace(/&#(\d+);/g, (_match, num) => {
    const codePoint = Number(num);
    return Number.isFinite(codePoint) ? String.fromCharCode(codePoint) : "";
  });

  output = output.replace(/&#x([0-9a-fA-F]+);/g, (_match, hex) => {
    const codePoint = parseInt(hex, 16);
    return Number.isFinite(codePoint) ? String.fromCharCode(codePoint) : "";
  });

  return output;
};

const extractTitle = (html: string) => {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return "제목 없음";
  return decodeHtmlEntities(match[1]).replace(/\s+/g, " ").trim() || "제목 없음";
};

const extractTextFromHtml = (html: string) => {
  let cleaned = html;
  cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, " ");
  cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, " ");
  cleaned = cleaned.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  cleaned = cleaned.replace(/<br\s*\/?>/gi, "\n");
  cleaned = cleaned.replace(/<\/p>/gi, "\n");
  cleaned = cleaned.replace(/<\/div>/gi, "\n");
  cleaned = cleaned.replace(/<li[^>]*>/gi, "- ");
  cleaned = cleaned.replace(/<\/li>/gi, "\n");
  cleaned = cleaned.replace(/<[^>]+>/g, " ");
  cleaned = decodeHtmlEntities(cleaned);
  cleaned = cleaned.replace(/\r/g, "");
  cleaned = cleaned.replace(/[ \t]+\n/g, "\n");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  cleaned = cleaned.replace(/[ \t]{2,}/g, " ");
  return cleaned.trim();
};

const extractAttachments = (html: string, baseUrl: string): CrawledAttachment[] => {
  const attachments: CrawledAttachment[] = [];
  const seen = new Set<string>();
  const matches = html.matchAll(/href\s*=\s*["']([^"']+)["']/gi);

  for (const match of matches) {
    const href = match[1]?.trim();
    if (!href) continue;
    const lowerHref = href.toLowerCase();
    if (!ATTACHMENT_EXTENSIONS.some(ext => lowerHref.includes(ext))) continue;

    try {
      const absolute = new URL(href, baseUrl).toString();
      if (seen.has(absolute)) continue;
      seen.add(absolute);
      const ext = ATTACHMENT_EXTENSIONS.find(extension => absolute.toLowerCase().includes(extension));
      let name = absolute.split("/").pop() || absolute;
      try {
        name = decodeURIComponent(name);
      } catch {
        name = name;
      }
      attachments.push({
        url: absolute,
        name,
        type: ext === ".hwp" ? "hwp" : "other",
      });
    } catch {
      continue;
    }
  }

  return attachments;
};

const fetchWithTimeout = async (url: string, timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const fetchHwpText = async (url: string): Promise<string | null> => {
  try {
    const response = await fetchWithTimeout(url, 15000);
    if (!response.ok) return null;
    const lengthHeader = response.headers.get("content-length");
    if (lengthHeader && Number(lengthHeader) > MAX_ATTACHMENT_BYTES) {
      return null;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_ATTACHMENT_BYTES) {
      return null;
    }
    const parsed = await parseHwpFile(buffer);
    return parsed.text;
  } catch {
    return null;
  }
};

const buildMarkdown = (
  title: string,
  sourceUrl: string,
  content: string,
  attachments: CrawledAttachment[]
) => {
  const lines = [
    `# ${title}`,
    "",
    "## 메타데이터",
    `- **출처**: ${sourceUrl}`,
    `- **크롤링 일시**: ${new Date().toISOString()}`,
    "",
    "## 본문",
    "",
    content || "본문을 추출하지 못했습니다.",
    "",
  ];

  if (attachments.length > 0) {
    lines.push("## 첨부파일", "");
    attachments.forEach((attachment, index) => {
      lines.push(`${index + 1}. [${attachment.name}](${attachment.url})`);
    });
  }

  return lines.join("\n");
};

export async function crawlDocumentFromUrl(url: string): Promise<CrawlResult> {
  const response = await fetchWithTimeout(url, 15000);
  if (!response.ok) {
    throw new Error("문서를 불러오지 못했습니다.");
  }

  const html = await response.text();
  const title = extractTitle(html);
  const text = extractTextFromHtml(html);
  const attachments = extractAttachments(html, url);

  let hwpCount = 0;
  for (const attachment of attachments) {
    if (attachment.type !== "hwp") continue;
    if (hwpCount >= MAX_HWP_ATTACHMENTS) break;
    const extractedText = await fetchHwpText(attachment.url);
    if (extractedText) {
      attachment.extractedText = extractedText;
      hwpCount += 1;
    }
  }

  const combinedText = [
    text,
    ...attachments
      .filter(att => att.extractedText)
      .map(att => `첨부파일(${att.name}) 내용:\n${att.extractedText}`),
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    title,
    text: combinedText,
    markdown: buildMarkdown(title, url, text, attachments),
    attachments,
  };
}
