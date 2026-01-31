import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { chats, chatMessages } from "@shared/schema";
import { requireFullAuth } from "../auth/middleware";
import { and, desc, eq, ilike, isNull, inArray } from "drizzle-orm";
import crypto from "crypto";
import OpenAI from "openai";
import { getRagReferenceDocuments } from "../rag";

const router = Router();
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

const createChatSchema = z.object({
  title: z.string().max(200).optional(),
});

const createMessageSchema = z.object({
  content: z.string().min(1, "메시지를 입력해주세요").max(10000, "최대 10,000자까지 입력할 수 있습니다"),
});

const listChatsSchema = z.object({
  search: z.string().optional(),
  limit: z.string().optional(),
});

const generateId = (prefix: string) => `${prefix}_${crypto.randomBytes(8).toString("hex")}`;

const getDefaultTitle = (content: string) => {
  const trimmed = content.trim();
  if (!trimmed) return "새 대화";
  return trimmed.length > 20 ? `${trimmed.slice(0, 20)}...` : trimmed;
};

async function generateAssistantReply(content: string) {
  const client = getOpenAiClient();
  if (!client) {
    return "현재 AI 응답 생성이 준비 중입니다. 잠시 후 다시 시도해주세요.";
  }

  // RAG 검색: 관련 문서 컨텍스트 가져오기
  let ragContext = "";
  try {
    const references = await getRagReferenceDocuments({
      documentType: "일반",
      inputs: { query: content },
      limit: 3,
    });

    if (references.length > 0) {
      ragContext = "\n\n[참고 문서]\n" + references
        .map((ref, idx) => `${idx + 1}. ${ref.title} (${ref.categoryName})\n${ref.contentSnippet}`)
        .join("\n\n");
      console.log(`[RAG Chat] Found ${references.length} reference documents`);
    }
  } catch (error) {
    console.error("[RAG Chat] Error fetching references:", error);
  }

  const systemPrompt = `당신은 티처메이트(TeacherMate) AI입니다. 학교 행정 문서와 교육 업무 질문에 도움을 주세요.
- 학교 문서 양식, 가정통신문, 공문 작성 등에 전문적인 도움을 제공합니다.
- 친절하고 명확하게 답변해 주세요.
- 관련 참고 문서가 제공된 경우, 해당 내용을 참고하여 더 정확한 답변을 해주세요.${ragContext}`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 1200,
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      { role: "user", content },
    ],
  });

  return completion.choices[0]?.message?.content || "응답을 생성하지 못했습니다.";
}

router.get("/chats", requireFullAuth, async (req: Request, res: Response) => {
  try {
    const parseResult = listChatsSchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({ error: "잘못된 요청입니다" });
    }

    const userId = req.user!.id;
    const limit = Math.min(100, Math.max(1, Number(parseResult.data.limit || 50)));
    const conditions = [eq(chats.userId, userId), isNull(chats.deletedAt)];

    if (parseResult.data.search) {
      conditions.push(ilike(chats.title, `%${parseResult.data.search}%`));
    }

    const chatList = await db
      .select()
      .from(chats)
      .where(and(...conditions))
      .orderBy(desc(chats.updatedAt))
      .limit(limit);

    const chatIds = chatList.map((chat) => chat.chatId);
    let lastMessageMap = new Map<string, string>();
    if (chatIds.length > 0) {
      const latestMessages = await db
        .select()
        .from(chatMessages)
        .where(inArray(chatMessages.chatId, chatIds))
        .orderBy(desc(chatMessages.createdAt));
      for (const message of latestMessages) {
        if (!lastMessageMap.has(message.chatId)) {
          lastMessageMap.set(message.chatId, message.content);
        }
      }
    }

    res.json({
      success: true,
      data: chatList.map((chat) => ({
        ...chat,
        preview: lastMessageMap.get(chat.chatId) || "",
      })),
    });
  } catch (error) {
    console.error("Chat list error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

router.post("/chats", requireFullAuth, async (req: Request, res: Response) => {
  try {
    const result = createChatSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "잘못된 요청입니다" });
    }

    const chatId = generateId("chat");
    const title = result.data.title?.trim() || "새 대화";

    const [created] = await db
      .insert(chats)
      .values({
        chatId,
        userId: req.user!.id,
        title,
        isPinned: false,
        category: null,
        updatedAt: new Date(),
      })
      .returning();

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error("Chat create error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

router.get("/chats/:chatId", requireFullAuth, async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const [chat] = await db
      .select()
      .from(chats)
      .where(and(eq(chats.chatId, chatId), eq(chats.userId, req.user!.id), isNull(chats.deletedAt)))
      .limit(1);

    if (!chat) {
      return res.status(404).json({ error: "대화를 찾을 수 없습니다" });
    }

    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.chatId, chatId))
      .orderBy(chatMessages.createdAt);

    res.json({ success: true, data: { chat, messages } });
  } catch (error) {
    console.error("Chat detail error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

router.post("/chats/:chatId/messages", requireFullAuth, async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const result = createMessageSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const [chat] = await db
      .select()
      .from(chats)
      .where(and(eq(chats.chatId, chatId), eq(chats.userId, req.user!.id), isNull(chats.deletedAt)))
      .limit(1);

    if (!chat) {
      return res.status(404).json({ error: "대화를 찾을 수 없습니다" });
    }

    const userMessageId = generateId("msg");
    await db.insert(chatMessages).values({
      messageId: userMessageId,
      chatId,
      role: "user",
      content: result.data.content.trim(),
    });

    const assistantContent = await generateAssistantReply(result.data.content.trim());
    const assistantMessageId = generateId("msg");
    await db.insert(chatMessages).values({
      messageId: assistantMessageId,
      chatId,
      role: "assistant",
      content: assistantContent,
    });

    const nextTitle = chat.title === "새 대화" ? getDefaultTitle(result.data.content) : chat.title;
    await db.update(chats).set({
      updatedAt: new Date(),
      title: nextTitle,
    }).where(eq(chats.chatId, chatId));

    res.json({
      success: true,
      data: {
        userMessage: {
          messageId: userMessageId,
          chatId,
          role: "user",
          content: result.data.content.trim(),
        },
        assistantMessage: {
          messageId: assistantMessageId,
          chatId,
          role: "assistant",
          content: assistantContent,
        },
      },
    });
  } catch (error) {
    console.error("Chat message error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

router.delete("/chats/:chatId", requireFullAuth, async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const result = await db
      .update(chats)
      .set({ deletedAt: new Date() })
      .where(and(eq(chats.chatId, chatId), eq(chats.userId, req.user!.id), isNull(chats.deletedAt)));

    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ error: "대화를 찾을 수 없습니다" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Chat delete error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

export { router as chatRouter };
