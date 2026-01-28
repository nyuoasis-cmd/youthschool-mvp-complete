import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Bot, Plus, Send, Search, Loader2, Paperclip, Mic, Menu, Wrench } from "lucide-react";

interface ChatItem {
  chatId: string;
  title: string;
  preview?: string;
  updatedAt?: string;
  createdAt?: string;
}

interface ChatMessage {
  messageId: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

interface ChatDetailResponse {
  success: boolean;
  data: {
    chat: ChatItem;
    messages: ChatMessage[];
  };
}

interface ChatListResponse {
  success: boolean;
  data: ChatItem[];
}

export default function Chat() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ chatId?: string }>("/chat/:chatId");
  const activeChatId = params?.chatId;
  const [messageInput, setMessageInput] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState<"chat" | "tools">("chat");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: chatListResponse, isLoading: chatListLoading } = useQuery<ChatListResponse>({
    queryKey: ["/api/chats"],
  });

  const { data: chatDetailResponse, isLoading: chatDetailLoading } = useQuery<ChatDetailResponse>({
    queryKey: activeChatId ? [`/api/chats/${activeChatId}`] : ["/api/chats/none"],
    enabled: !!activeChatId,
  });

  const createChatMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/chats", {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      if (data?.data?.chatId) {
        setLocation(`/chat/${data.data.chatId}`);
      }
    },
    onError: (error) => {
      toast({
        title: "대화 생성 실패",
        description: error instanceof Error ? error.message : "대화를 만들 수 없습니다.",
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (payload: { chatId: string; content: string }) => {
      const response = await apiRequest("POST", `/api/chats/${payload.chatId}/messages`, {
        content: payload.content,
      });
      return response.json();
    },
    onSuccess: () => {
      setMessageInput("");
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      if (activeChatId) {
        queryClient.invalidateQueries({ queryKey: [`/api/chats/${activeChatId}`] });
      }
    },
    onError: (error) => {
      toast({
        title: "메시지 전송 실패",
        description: error instanceof Error ? error.message : "메시지 전송에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const chatList = chatListResponse?.data ?? [];
  const filteredChats = useMemo(() => {
    if (!searchValue.trim()) return chatList;
    return chatList.filter((chat) => chat.title.toLowerCase().includes(searchValue.toLowerCase()));
  }, [chatList, searchValue]);

  const messages = chatDetailResponse?.data.messages ?? [];

  useEffect(() => {
    if (!activeChatId && chatList.length > 0) {
      setLocation(`/chat/${chatList[0].chatId}`);
    }
  }, [activeChatId, chatList, setLocation]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chatDetailLoading]);

  const handleSend = () => {
    if (!activeChatId) {
      createChatMutation.mutate();
      return;
    }
    const trimmed = messageInput.trim();
    if (!trimmed) return;
    sendMessageMutation.mutate({ chatId: activeChatId, content: trimmed });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const showCharCount = messageInput.length >= 9000;
  const quickPrompts = [
    "방과후학교 가정통신문 작성",
    "학사일정 공지사항 만들기",
    "학부모 상담 기록 작성",
    "현장체험학습 계획서 작성",
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="h-16 border-b bg-background flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen((prev) => !prev)}>
            <Menu className="h-5 w-5" />
          </Button>
          <Bot className="h-5 w-5 text-primary" />
          <span className="font-semibold">티처메이트 AI</span>
          <Badge variant="secondary">MVP</Badge>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Button variant="ghost" size="sm">GPT-4.1</Button>
          <span>무료 플랜</span>
        </div>
      </div>

      <div className="flex h-[calc(100vh-64px)]">
        <aside
          className={`border-r bg-background flex flex-col transition-all duration-200 ${
            sidebarOpen ? "w-[260px]" : "w-0 overflow-hidden"
          }`}
        >
          <div className="p-4 space-y-3">
            <div className="grid gap-2">
              <Button
                variant={activeMenu === "chat" ? "default" : "ghost"}
                className="justify-start"
                onClick={() => {
                  setActiveMenu("chat");
                  if (!activeChatId && chatList[0]?.chatId) {
                    setLocation(`/chat/${chatList[0].chatId}`);
                  }
                }}
              >
                새 대화
              </Button>
              <Button
                variant={activeMenu === "tools" ? "default" : "ghost"}
                className="justify-start"
                onClick={() => {
                  setActiveMenu("tools");
                  setLocation("/");
                }}
              >
                <Wrench className="mr-2 h-4 w-4" />
                문서 도구
              </Button>
            </div>
            <Button className="w-full" onClick={() => createChatMutation.mutate()} disabled={createChatMutation.isPending}>
              {createChatMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              새 대화 시작
            </Button>
          </div>
          <div className="px-4 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="대화 검색..."
                className="pl-9"
              />
            </div>
          </div>
          <ScrollArea className="flex-1 px-2 pb-4">
            {chatListLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredChats.length > 0 ? (
              <div className="space-y-2">
                {filteredChats.map((chat) => (
                  <button
                    key={chat.chatId}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                      chat.chatId === activeChatId ? "bg-primary/10 border-primary" : "bg-background"
                    }`}
                    onClick={() => setLocation(`/chat/${chat.chatId}`)}
                  >
                    <div className="text-sm font-medium line-clamp-1">{chat.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {chat.preview || "아직 메시지가 없습니다"}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-sm text-muted-foreground text-center">
                대화가 없습니다. 새 대화를 시작하세요.
              </div>
            )}
          </ScrollArea>
        </aside>

        <main className="flex-1 flex flex-col">
          <div className="flex-1 overflow-hidden">
            <div ref={scrollRef} className="h-full overflow-y-auto px-6 py-6">
              <div className="mx-auto max-w-3xl space-y-4">
                {chatDetailLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="space-y-6 text-center">
                    <div className="space-y-2">
                      <div className="text-2xl font-semibold">
                        {user?.name ? `${user.name} 선생님,` : "안녕하세요"}
                      </div>
                      <p className="text-muted-foreground">무엇을 도와드릴까요?</p>
                    </div>
                    <Card className="mx-auto max-w-xl">
                      <CardContent className="py-6 space-y-4">
                        <div className="flex flex-wrap gap-2 justify-center">
                          {quickPrompts.map((prompt) => (
                            <button
                              key={prompt}
                              className="rounded-full border px-3 py-1 text-sm text-primary hover:bg-primary/10"
                              onClick={() => setMessageInput(prompt)}
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.messageId}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-background border rounded-bl-md"
                        }`}
                      >
                        <div className="whitespace-pre-line">{message.content}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="border-t bg-background px-6 py-4">
            <div className="mx-auto max-w-3xl">
              <div className="flex items-end gap-3 rounded-2xl border bg-background px-4 py-3 shadow-sm">
                <Button variant="ghost" size="icon" disabled>
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" disabled>
                  <Mic className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                  <Textarea
                    value={messageInput}
                    onChange={(event) => setMessageInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="티처메이트에게 물어보기"
                    rows={2}
                    className="resize-none border-0 focus-visible:ring-0"
                    maxLength={10000}
                  />
                  {showCharCount && (
                    <div className={`text-xs mt-1 text-right ${messageInput.length > 10000 ? "text-destructive" : "text-muted-foreground"}`}>
                      {messageInput.length} / 10,000
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleSend}
                  disabled={sendMessageMutation.isPending || !messageInput.trim()}
                  className="rounded-full"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
