"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Send, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  createAssistantMessage,
  createConversation,
  createUserMessage,
} from "@/lib/guide-storage";
import { getOnboardingProfile } from "@/lib/onboarding-storage";
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
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(
    null,
  );
  const [speechSupported, setSpeechSupported] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState(
    fallbackSuggestedPrompts,
  );
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const initial = createConversation();
      setActiveConversation(initial);
      setSuggestedPrompts(getSuggestionsForConversation(initial));
      setSpeechSupported("speechSynthesis" in window);
    });

    return () => {
      window.speechSynthesis?.cancel();
    };
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
          onboardingProfile: getOnboardingProfile(),
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

  const toggleReadAloud = (messageId: string, content: string) => {
    if (!speechSupported) return;

    if (speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(content);
    const softVoice = getSoftFeminineVoice();
    if (softVoice) {
      utterance.voice = softVoice;
    }
    utterance.rate = 0.86;
    utterance.pitch = 1.08;
    utterance.volume = 0.95;
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <section className="mx-auto max-w-4xl md:mt-8">
      <div className="flex min-h-[calc(100dvh-8.75rem)] flex-col overflow-hidden rounded-none border-border/60 bg-transparent md:aura-glass md:min-h-[680px] md:rounded-lg">
        <div className="border-b border-border/50 pb-5 pt-3 md:p-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary md:text-xs md:tracking-[0.24em]">
            Guide
          </p>
          <h1 className="mt-1 font-serif text-[2rem] font-semibold leading-tight md:mt-2 md:text-4xl">
            What&apos;s on your mind?
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-muted-foreground md:text-base">
            Talk through a want, mood, decision, delay, or repeating thought.
          </p>
        </div>

        <div className="min-h-[300px] flex-1 space-y-4 overflow-y-auto py-5 md:max-h-[58vh] md:min-h-[420px] md:space-y-5 md:p-6">
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
                  "max-w-[92%] rounded-2xl border px-4 py-3.5 text-[15px] leading-7 shadow-sm sm:max-w-[82%] md:rounded-md md:px-5 md:py-4 md:text-[15px] md:leading-7",
                  message.role === "user"
                    ? "border-foreground/25 bg-foreground text-background"
                    : "border-border/70 bg-card text-muted-foreground",
                )}
              >
                <p>{message.content}</p>
                {message.role === "assistant" && speechSupported ? (
                  <button
                    type="button"
                    className="mt-3 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/45 px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-foreground/35 hover:bg-accent"
                    onClick={() =>
                      toggleReadAloud(message.createdAt, message.content)
                    }
                    aria-label={
                      speakingMessageId === message.createdAt
                        ? "Stop reading response"
                        : "Read response aloud"
                    }
                  >
                    {speakingMessageId === message.createdAt ? (
                      <Square className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <Volume2 className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {speakingMessageId === message.createdAt
                      ? "Stop"
                      : "Listen"}
                  </button>
                ) : null}
              </div>
            </div>
          ))}
          {isSending ? (
              <div className="max-w-[92%] rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground sm:max-w-[82%] md:rounded-md">
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
                  className="rounded-2xl border border-border bg-card px-4 py-3 text-left text-sm leading-5 text-foreground transition hover:border-foreground/35 hover:bg-accent md:rounded-md"
                >
                  {path.label}
                </button>
              ))}
            </div>
          ) : null}
          {shouldShowSuggestions ? (
            <div className="flex gap-2 overflow-x-auto pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setInput(prompt)}
                  className="min-w-[13rem] rounded-full border border-border bg-card px-3 py-2 text-left text-xs leading-5 text-foreground transition hover:border-foreground/35 hover:bg-accent md:min-w-0"
                >
                  {prompt}
                </button>
              ))}
            </div>
          ) : null}
          <div ref={endRef} />
        </div>

        <form
          className="sticky bottom-0 border-t border-border/50 bg-background/94 py-4 backdrop-blur-xl md:bg-card/40 md:p-6"
          onSubmit={sendMessage}
        >
          <Textarea
            className="min-h-20 rounded-2xl text-[16px] leading-6 md:min-h-24 md:rounded-md"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="What is on your mind?"
            rows={3}
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
          <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
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

function getSoftFeminineVoice() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const preferredNames = [
    "Samantha",
    "Ava",
    "Allison",
    "Susan",
    "Victoria",
    "Karen",
    "Moira",
    "Tessa",
    "Zira",
    "Jenny",
    "Aria",
    "Michelle",
    "Female",
  ];

  return (
    preferredNames
      .map((name) =>
        voices.find((voice) =>
          voice.name.toLowerCase().includes(name.toLowerCase()),
        ),
      )
      .find(Boolean) ??
    voices.find(
      (voice) =>
        voice.lang.toLowerCase().startsWith("en") &&
        /female|woman|samantha|ava|allison|susan|victoria|zira|jenny|aria/i.test(
          voice.name,
        ),
    ) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ??
    voices[0]
  );
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
