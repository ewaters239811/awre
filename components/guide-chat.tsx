"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  createAssistantMessage,
  createConversation,
  createUserMessage,
} from "@/lib/guide-storage";
import type { GuideConversation } from "@/lib/types";
import { cn } from "@/lib/utils";

const fallbackSuggestedPrompts = [
  "What is the deeper root of this pattern?",
  "What feeling am I trying to get from the outside?",
  "What is one practical action I can take from that state?",
];

const entryPaths = [
  {
    label: "Talk through today",
    prompt:
      "Help me talk through what is on my mind and find the deeper pattern underneath it.",
  },
  {
    label: "Understand what I want",
    prompt:
      "Help me understand what inner state or feeling is underneath something I want.",
  },
  {
    label: "Find one next step",
    prompt:
      "Help me find the cleanest next action I can take from a steadier state.",
  },
];

export function GuideChat() {
  const [activeConversation, setActiveConversation] =
    useState<GuideConversation | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState(
    fallbackSuggestedPrompts,
  );
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const initial = createConversation();
      setActiveConversation(initial);
      setSuggestedPrompts(getSuggestionsForConversation(initial));
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
  const shouldShowEntryPaths =
    !isSending && messages.length === 1 && lastMessage?.role === "assistant";

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
        }),
      });
      const payload = (await response.json()) as {
        enabled?: boolean;
        data?: string;
        suggestions?: string[];
      };
      const reply = payload.data?.trim();

      if (!response.ok || !payload.enabled || !reply) {
        throw new Error("Guide response unavailable.");
      }

      const nextSuggestions = normalizeSuggestions(payload.suggestions, reply);
      persistConversation({
        ...conversationWithUserMessage,
        messages: [
          ...conversationWithUserMessage.messages,
          createAssistantMessage(reply),
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
    <section className="mx-auto max-w-5xl md:mt-8">
      <div className="flex min-h-[calc(100dvh-9.5rem)] flex-col overflow-hidden rounded-none border-border/60 bg-transparent md:aura-glass md:min-h-[680px] md:rounded-lg">
        <div className="border-b border-border/60 px-1 py-4 md:p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-primary">
            Guide
          </p>
          <h1 className="mt-2 font-serif text-2xl font-semibold md:text-4xl">
            Talk Through What&apos;s On Your Mind
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Bring whatever feels present: a want, a mood, a decision, a delay,
            or a thought that keeps repeating.
          </p>
        </div>

        <div className="min-h-[320px] flex-1 space-y-4 overflow-y-auto px-1 py-4 md:max-h-[58vh] md:min-h-[420px] md:p-5">
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
                  "max-w-[92%] rounded-2xl border px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[85%] md:rounded-md",
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
            <div className="max-w-[92%] rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground sm:max-w-[85%] md:rounded-md">
              Thinking with you...
            </div>
          ) : null}
          {shouldShowEntryPaths ? (
            <div className="grid gap-2 pt-1 sm:grid-cols-3">
              {entryPaths.map((path) => (
                <button
                  key={path.label}
                  type="button"
                  onClick={() => setInput(path.prompt)}
                  className="rounded-md border border-border bg-card px-4 py-3 text-left text-sm leading-5 text-foreground transition hover:border-foreground/35 hover:bg-accent"
                >
                  {path.label}
                </button>
              ))}
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
          className="sticky bottom-0 border-t border-border/60 bg-background/92 px-1 py-3 backdrop-blur-xl md:bg-card/40 md:p-5"
          onSubmit={sendMessage}
        >
          <Textarea
            className="min-h-24 rounded-2xl md:rounded-md"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="What is on your mind?"
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
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            ClearPth is for reflection and personal growth, not crisis care,
            medical advice, therapy, or diagnosis.
          </p>
        </form>
      </div>
    </section>
  );
}

function normalizeSuggestions(suggestions?: string[], reply?: string) {
  const clean = (suggestions ?? [])
    .map((suggestion) => suggestion.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (clean.length === 3) return clean;
  if (reply) return buildLocalSuggestions(reply);

  return fallbackSuggestedPrompts;
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
