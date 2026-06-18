"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getLatestCheckIn } from "@/lib/alignment";
import { getJournalEntries } from "@/lib/journal-storage";
import {
  createAssistantMessage,
  createConversation,
  createUserMessage,
} from "@/lib/guide-storage";
import type { CheckInResult, GuideConversation } from "@/lib/types";
import { cn } from "@/lib/utils";

const fallbackSuggestedPrompts = [
  "What is the deeper root of this pattern?",
  "What feeling am I trying to get from the outside?",
  "What is one practical action I can take from that state?",
];

export function GuideChat() {
  const [activeConversation, setActiveConversation] =
    useState<GuideConversation | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [latestCheckIn, setLatestCheckIn] = useState<CheckInResult | null>(null);
  const [suggestedPrompts, setSuggestedPrompts] = useState(
    fallbackSuggestedPrompts,
  );
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const initial = createConversation();
      setActiveConversation(initial);
      setSuggestedPrompts(getSuggestionsForConversation(initial));
      setLatestCheckIn(getLatestCheckIn());
    });
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

  const persistConversation = (conversation: GuideConversation) => {
    setActiveConversation({
      ...conversation,
      updatedAt: new Date().toISOString(),
    });
  };

  const messages = activeConversation?.messages ?? [];
  const lastMessage = messages[messages.length - 1];
  const shouldShowSuggestions =
    !isSending &&
    messages.length > 1 &&
    lastMessage?.role === "assistant";

  const sendMessage = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
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
          recentJournalEntries: getJournalEntries().slice(0, 8).map((entry) => ({
            date: entry.date,
            content: entry.content,
          })),
        }),
      });
      const payload = (await response.json()) as {
        data?: string;
        suggestions?: string[];
      };
      const nextSuggestions = normalizeSuggestions(payload.suggestions);

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
      setSuggestedPrompts(nextSuggestions);
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
      setSuggestedPrompts(fallbackSuggestedPrompts);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="mx-auto mt-8 max-w-5xl">
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
                    ? "border-foreground/25 bg-foreground text-background"
                    : "border-border/70 bg-card text-muted-foreground",
                )}
              >
                {message.content}
              </div>
            </div>
          ))}
          {isSending ? (
            <div className="max-w-[85%] rounded-md border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground">
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
                  className="rounded-full border border-border bg-card px-3 py-2 text-left text-xs leading-5 text-foreground transition hover:border-foreground/35 hover:bg-accent"
                >
                  {prompt}
                </button>
              ))}
            </div>
          ) : null}
          <div ref={endRef} />
        </div>

        <form
          className="border-t border-border/60 bg-card/40 p-5"
          onSubmit={sendMessage}
        >
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="What challenge are you facing today?"
            rows={4}
          />
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              disabled={isSending || !input.trim() || !activeConversation}
              onClick={() => {
                void sendMessage();
              }}
            >
              Send
              <Send className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}

function normalizeSuggestions(suggestions?: string[]) {
  const clean = (suggestions ?? [])
    .map((suggestion) => suggestion.trim())
    .filter(Boolean)
    .slice(0, 3);

  return clean.length === 3 ? clean : fallbackSuggestedPrompts;
}

function getSuggestionsForConversation(conversation: GuideConversation) {
  const messages = conversation.messages;
  const lastMessage = messages[messages.length - 1];

  if (lastMessage?.role === "assistant" && messages.length > 1) {
    return buildLocalSuggestions(lastMessage.content);
  }

  return fallbackSuggestedPrompts;
}

function buildLocalSuggestions(reply: string) {
  const lowerReply = reply.toLowerCase();

  if (lowerReply.includes("value") || lowerReply.includes("worth")) {
    return [
      "Where am I still outsourcing my sense of value?",
      "What would calm self-respect do next?",
      "How can I ask for what I want without needing it to define me?",
    ];
  }

  if (lowerReply.includes("action") || lowerReply.includes("avoid")) {
    return [
      "What is the smallest action that would break the delay?",
      "What feeling appears right before I avoid this?",
      "Who would I be if this action was already normal for me?",
    ];
  }

  if (lowerReply.includes("feeling") || lowerReply.includes("state")) {
    return [
      "How can I practice that state before anything changes?",
      "What outer thing am I making responsible for this feeling?",
      "What would this look like in my body today?",
    ];
  }

  return fallbackSuggestedPrompts;
}
