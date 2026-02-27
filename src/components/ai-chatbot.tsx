"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  MessageSquare,
  X,
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  Trash2,
  Minimize2,
  Maximize2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface SuggestedPrompt {
  icon: string;
  label: string;
  prompt: string;
}

// ── Markdown Renderer ────────────────────────────────────────────────────────

function renderMarkdown(text: string): string {
  let html = text
    // Code blocks
    .replace(
      /```(\w*)\n([\s\S]*?)```/g,
      '<pre class="bg-slate-900 text-slate-100 rounded-lg p-3 my-2 overflow-x-auto text-sm font-mono"><code>$2</code></pre>',
    )
    // Inline code
    .replace(
      /`([^`]+)`/g,
      '<code class="bg-muted dark:bg-slate-800 px-1.5 py-0.5 rounded text-sm font-mono text-primary">$1</code>',
    )
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Headers
    .replace(
      /^### (.+)$/gm,
      '<h3 class="font-bold text-base mt-3 mb-1">$1</h3>',
    )
    .replace(/^## (.+)$/gm, '<h2 class="font-bold text-lg mt-3 mb-1">$1</h2>')
    // Tables
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match
        .split("|")
        .filter((c) => c.trim())
        .map((c) => c.trim());
      if (cells.every((c) => /^[-:]+$/.test(c))) return "<!-- separator -->";
      const isHeader = false; // will be determined by context
      return `<tr>${cells.map((c) => `<td class="border border-border px-3 py-1.5 text-sm">${c}</td>`).join("")}</tr>`;
    })
    // Unordered lists
    .replace(/^[•\-\*] (.+)$/gm, '<li class="ml-4 list-disc text-sm">$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-sm">$1</li>')
    // Line breaks
    .replace(/\n\n/g, '<div class="h-2"></div>')
    .replace(/\n/g, "<br/>");

  // Wrap table rows
  html = html.replace(
    /(<tr>[\s\S]*?<\/tr>[\s\S]*?<!-- separator -->[\s\S]*?(?:<tr>[\s\S]*?<\/tr>\s*)*)/g,
    '<table class="border-collapse my-2 w-full">$1</table>',
  );
  html = html.replace(/<!-- separator -->/g, "");

  // Wrap consecutive list items
  html = html.replace(
    /(<li class="ml-4 list-disc[\s\S]*?<\/li>(?:\s*<br\/>\s*<li class="ml-4 list-disc[\s\S]*?<\/li>)*)/g,
    '<ul class="my-1 space-y-0.5">$1</ul>',
  );
  html = html.replace(/<\/li>\s*<br\/>\s*<li/g, "</li><li");

  return html;
}

// ── Suggested Prompts ────────────────────────────────────────────────────────

const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    icon: "📊",
    label: "Today's Overview",
    prompt:
      "Give me today's school overview — attendance, pending tasks, and key metrics",
  },
  {
    icon: "📈",
    label: "Attendance Analysis",
    prompt:
      "Analyze attendance trends for the last 30 days and highlight any concerns",
  },
  {
    icon: "💰",
    label: "Fee Status",
    prompt: "What's the current fee collection status? Any pending payments?",
  },
  {
    icon: "📝",
    label: "Upcoming Exams",
    prompt: "List all upcoming exams and their schedules",
  },
  {
    icon: "⚠️",
    label: "At-Risk Students",
    prompt:
      "Which students are at risk based on attendance and performance data?",
  },
  {
    icon: "🗓️",
    label: "Events & Holidays",
    prompt: "Show me upcoming events and holidays",
  },
];

// ── Chat Bubble Component ────────────────────────────────────────────────────

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 group",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-gradient-to-br from-violet-500 to-indigo-600 text-white",
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message */}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-card border border-border rounded-bl-md",
        )}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div
            className="text-sm text-foreground prose-sm [&_strong]:text-foreground [&_a]:text-primary"
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(message.content),
            }}
          />
        )}
        <p
          className={cn(
            "text-[10px] mt-1 opacity-50",
            isUser ? "text-right" : "text-left",
          )}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

// ── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm">
        <Bot className="w-4 h-4" />
      </div>
      <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

// ── Main Chatbot Component ───────────────────────────────────────────────────

export default function AIChatbot() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Don't render if not logged in
  if (!session || status !== "authenticated") return null;

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    setError(null);
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Auto-resize textarea back
    if (inputRef.current) {
      inputRef.current.style.height = "44px";
    }

    try {
      const historyForAPI = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content.trim(),
          history: historyForAPI,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to get response");
      }

      const assistantMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: data.data.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : "Something went wrong";
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = "44px";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  const userName = session.user?.name || "User";

  return (
    <>
      {/* ── Floating Action Button ── */}
      {!isOpen && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(true);
          }}
          className="fixed bottom-6 right-6 z-50 group"
          aria-label="Open AI Assistant"
        >
          <div className="relative">
            {/* Pulse ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 animate-ping opacity-20" />
            {/* Button */}
            <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/25 flex items-center justify-center transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/40 hover:scale-110 active:scale-95">
              <Sparkles className="w-6 h-6" />
            </div>
            {/* Label */}
            <div className="absolute -top-10 right-0 bg-slate-900 text-white text-xs rounded-lg px-3 py-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
              AI Assistant
              <div className="absolute top-full right-5 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900" />
            </div>
          </div>
        </button>
      )}

      {/* ── Chat Window ── */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-50 flex flex-col bg-background border border-border shadow-2xl shadow-slate-900/20 transition-all duration-300",
            isExpanded
              ? "inset-4 rounded-2xl"
              : "bottom-6 right-6 w-[420px] h-[600px] rounded-2xl max-h-[85vh]",
          )}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">AI Assistant</h3>
                <p className="text-[11px] text-white/70 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  Powered by Gemini AI
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearChat}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Clear chat"
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label={isExpanded ? "Minimize" : "Expand"}
                title={isExpanded ? "Minimize" : "Expand"}
              >
                {isExpanded ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Messages Area ── */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth"
          >
            {/* Welcome / Empty State */}
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center mb-4 shadow-lg shadow-violet-500/25">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">
                  Hello, {userName}! 👋
                </h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-[280px]">
                  I&apos;m your AI-powered school assistant. I can analyze data,
                  answer questions, and help you navigate the platform.
                </p>
                {/* Suggested Prompts */}
                <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      type="button"
                      key={prompt.label}
                      onClick={() => sendMessage(prompt.prompt)}
                      className="text-left p-3 rounded-xl bg-card border border-border hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-md transition-all duration-200 group"
                    >
                      <span className="text-lg">{prompt.icon}</span>
                      <p className="text-xs font-medium text-foreground mt-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                        {prompt.label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Messages */}
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}

            {/* Loading Indicator */}
            {isLoading && <TypingIndicator />}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-red-700 dark:text-red-400">
                    {error}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      const lastUserMsg = [...messages]
                        .reverse()
                        .find((m) => m.role === "user");
                      if (lastUserMsg) sendMessage(lastUserMsg.content);
                    }}
                    className="text-xs text-red-600 dark:text-red-400 underline mt-1 hover:text-red-800"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Input Area ── */}
          <div className="px-4 pb-4 pt-2 border-t border-border">
            <div className="flex items-end gap-2 bg-card rounded-xl border border-border focus-within:border-violet-400 dark:focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all duration-200 p-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about your school..."
                rows={1}
                disabled={isLoading}
                className="flex-1 resize-none bg-transparent border-0 outline-none text-sm px-3 py-2.5 text-foreground placeholder:text-muted-foreground max-h-[120px] disabled:opacity-50"
                style={{ height: "44px" }}
              />
              <button
                type="button"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "p-2.5 rounded-lg transition-all duration-200 flex-shrink-0",
                  input.trim() && !isLoading
                    ? "bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-500/25 hover:shadow-lg hover:shadow-violet-500/40 hover:scale-105 active:scale-95"
                    : "bg-muted text-muted-foreground cursor-not-allowed",
                )}
                aria-label="Send message"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-center text-muted-foreground mt-2 opacity-60">
              AI can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
