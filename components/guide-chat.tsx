"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Plus, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getLatestCheckIn } from "@/lib/alignment";
import {
  createAssistantMessage,
  createConversation,
  createUserMessage,
  deleteGuideConversation,
  getGuideConversations,
  saveGuideConversation,
} from "@/lib/guide-storage";
import type { CheckInResult, GuideConversation } from "@/lib/types";
import { cn } from "@/lib/utils";

const suggestedPrompts = [
  "What is the deeper root of this pattern?",
  "What feeling am I trying to get from the outside?",
  "What is one practical action I can take from that state?",
];

export function GuideChat() {
  const [conversations, setConversations] = useState<GuideConversation[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<GuideConversation | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [latestCheckIn, setLatestCheckIn] = useState<CheckInResult | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const saved = getGuideConversations();
      const initial = saved[0] ?? createConversation();

      if (saved.length === 0) {
        saveGuideConversation(initial);
      }

      setConversations(saved.length > 0 ? saved : [initial]);
      setActiveConversation(initial);
      setLatestCheckIn(getLatestCheckIn());
    });
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

  const createNewConversation = () => {
    const conversation = createConversation();
    saveGuideConversation(conversation);
    const next = [conversation, ...conversations];
    setConversations(next);
    setActiveConversation(conversation);
    setInput("");
  };

  const removeConversation = (id: string) => {
    const next = deleteGuideConversation(id);
    const replacement = next[0] ?? createConversation();

    if (next.length === 0) {
      saveGuideConversation(replacement);
    }

    setConversations(next.length > 0 ? next : [replacement]);
    setActiveConversation((current) =>
      current?.id === id ? replacement : current,
    );
  };

  const persistConversation = (conversation: GuideConversation) => {
    saveGuideConversation(conversation);
    setActiveConversation(conversation);
    setConversations(getGuideConversations());
  };

  const messages = activeConversation?.messages ?? [];
  const lastMessage = messages[messages.length - 1];
  const shouldShowSuggestions =
    !isSending &&
    messages.length > 1 &&
    lastMessage?.role === "assistant";

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = input.trim();
    if (!content || isSending || !activeConversation) return;

    const userMessage = createUserMessage(content);
    const conversationWithUserMessage: GuideConversation = {
      ...activeConversation,
      messages: [...activeConversation.messages, userMessage],
    };

    persistConversation(conversationWithUserMessage);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch("/api/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversationWithUserMessage.messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          latestCheckIn,
        }),
      });
      const payload = (await response.json()) as {
        data?: string;
      };

      persistConversation({
        ...conversationWithUserMessage,
        messages: [
          ...conversationWithUserMessage.messages,
          createAssistantMessage(
            payload.data ??
              "Name the challenge in one sentence, then choose one step that restores inner order.",
          ),
        ],
      });
    } catch {
      persistConversation({
        ...conversationWithUserMessage,
        messages: [
          ...conversationWithUserMessage.messages,
          createAssistantMessage(
            "The guide is quiet for a moment. Return to one clear thought, one honorable action, and one feeling you can carry with steadiness.",
          ),
        ],
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="mx-auto mt-8 grid max-w-6xl gap-5 lg:grid-cols-[280px_1fr]">
      <aside className="aura-glass rounded-lg p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary">
              Conversations
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {conversations.length} saved
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            onClick={createNewConversation}
            aria-label="New conversation"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 grid gap-2">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={cn(
                "group flex items-center gap-2 rounded-md border border-border/50 bg-black/18 p-2 transition duration-200 hover:border-primary/25 hover:bg-white/[0.04]",
                activeConversation?.id === conversation.id &&
                  "border-primary/40 bg-primary/10",
              )}
            >
              <button
                type="button"
                onClick={() => setActiveConversation(conversation)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block truncate text-sm font-medium">
                  {conversation.title}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {new Date(conversation.updatedAt).toLocaleDateString()}
                </span>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeConversation(conversation.id)}
                aria-label="Delete conversation"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </aside>

      <div className="aura-glass flex min-h-[680px] flex-col rounded-lg">
        <div className="border-b border-border/60 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-primary">
            Daily Guide
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold">
            Work Through A Challenge
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            A reflective guide for daily challenges, drawing from spiritual
            traditions, inner development, and nervous-system awareness.
          </p>
        </div>

        <div className="max-h-[58vh] min-h-[420px] flex-1 space-y-4 overflow-y-auto p-5">
          {activeConversation?.messages.map((message) => (
            <div
              key={message.createdAt}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-md border px-4 py-3 text-sm leading-6 shadow-sm",
                  message.role === "user"
                    ? "border-primary/30 bg-primary/14 text-foreground"
                    : "border-border/55 bg-black/24 text-muted-foreground",
                )}
              >
                {message.content}
              </div>
            </div>
          ))}
          {isSending ? (
            <div className="max-w-[85%] rounded-md border border-border/55 bg-black/24 px-4 py-3 text-sm text-muted-foreground">
              Reading the pattern...
            </div>
          ) : null}
          {shouldShowSuggestions ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setInput(prompt)}
                  className="rounded-full border border-primary/20 bg-primary/10 px-3 py-2 text-left text-xs leading-5 text-primary transition hover:border-primary/35 hover:bg-primary/15"
                >
                  {prompt}
                </button>
              ))}
            </div>
          ) : null}
          <div ref={endRef} />
        </div>

        <form
          className="border-t border-border/60 bg-black/10 p-5"
          onSubmit={sendMessage}
        >
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="What challenge are you facing today?"
            rows={4}
          />
          <div className="mt-3 flex justify-end">
            <Button type="submit" disabled={isSending || !input.trim()}>
              Send
              <Send className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
