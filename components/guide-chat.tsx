"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Plus, Send, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getCurrentAccount,
  saveGuideConversationToAccount,
} from "@/lib/account-data";
import {
  createAssistantMessage,
  createConversation,
  createUserMessage,
  getLatestGuideConversation,
  clearGuideConversations,
  saveGuideConversation,
} from "@/lib/guide-storage";
import { getOnboardingProfile } from "@/lib/onboarding-storage";
import type { GuideConversation } from "@/lib/types";
import { cn } from "@/lib/utils";

const fallbackSuggestedPrompts = [
  "Go deeper.",
  "Name the root.",
  "Give me the next move.",
];

const entryPaths = [
  {
    label: "Talk through today",
    prompt:
      "Help me talk through what is on my mind and understand what is underneath it.",
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
  const [firstName, setFirstName] = useState("there");
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
      const initial = getLatestGuideConversation() ?? createConversation();
      setActiveConversation(initial);
      setSuggestedPrompts(getSuggestionsForConversation(initial));
      setSpeechSupported("speechSynthesis" in window);
    });

    getCurrentAccount()
      .then((user) => setFirstName(getFirstName(user)))
      .catch(() => setFirstName("there"));

    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

  const persistConversation = (conversation: GuideConversation) => {
    const nextConversation = {
      ...conversation,
      updatedAt: new Date().toISOString(),
    };

    setActiveConversation(nextConversation);
    saveGuideConversation(nextConversation);
    saveGuideConversationToAccount(nextConversation).catch(() => undefined);
  };

  const messages = activeConversation?.messages ?? [];
  const lastMessage = messages[messages.length - 1];
  const shouldShowSuggestions =
    !isSending &&
    messages.length > 1 &&
    lastMessage?.role === "assistant";
  const shouldShowEntryPaths =
    !isSending && messages.length === 1 && lastMessage?.role === "assistant";
  const patternLabel = getPatternLabel(activeConversation);

  const startFreshConversation = () => {
    if (isSending) return;

    window.speechSynthesis?.cancel();
    setSpeakingMessageId(null);
    setInput("");

    const freshConversation = createConversation();
    clearGuideConversations();
    persistConversation(freshConversation);
    setSuggestedPrompts(fallbackSuggestedPrompts);
  };

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
          conversationMemory: buildConversationMemory(
            conversationWithUserMessage,
          ),
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
      <div className="flex min-h-[calc(100dvh-8.25rem)] flex-col overflow-hidden rounded-none bg-transparent md:min-h-[720px]">
        <div className="pb-5 pt-2 md:pb-7 md:pt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.22em] text-primary/85 md:text-xs md:tracking-[0.26em]">
                Mirror
              </p>
              <h1 className="mt-2 font-serif text-[2.45rem] font-semibold leading-[0.98] text-foreground md:text-5xl">
                {firstName}, what are you carrying?
              </h1>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0 rounded-full border-white/[0.08] bg-card/36 px-3 text-xs"
              onClick={startFreshConversation}
              disabled={isSending || !activeConversation}
              aria-label="Start a new chat"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              New
            </Button>
          </div>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-muted-foreground md:text-base">
            A private mirror for what stands between you and your desired
            reality.
          </p>
          {messages.length > 1 ? (
            <button
              type="button"
              onClick={() => setInput("Continue from what we were working through last time.")}
              className="mt-4 rounded-full border border-primary/14 bg-card/24 px-4 py-2 text-left text-xs leading-5 text-foreground/78 transition hover:border-primary/30 hover:bg-card/40"
            >
              Continue from last time
            </button>
          ) : null}
        </div>

        <div className="min-h-[310px] flex-1 space-y-6 overflow-y-auto py-6 md:max-h-[62vh] md:min-h-[460px] md:pr-2">
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
                  "max-w-[92%] px-4 py-3.5 text-[15px] leading-7 sm:max-w-[82%] md:px-5 md:py-4 md:text-[15px] md:leading-7",
                  message.role === "user"
                    ? "rounded-[1.45rem] border border-white/[0.08] bg-card/50 text-foreground shadow-[0_14px_36px_rgba(0,0,0,0.22)] backdrop-blur-xl"
                    : "rounded-none border-0 bg-transparent pl-0 text-foreground/78 shadow-none",
                )}
              >
                {message.role === "assistant" ? (
                  <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-primary/76">
                    ClearPth
                  </p>
                ) : null}
                <p>{message.content}</p>
                {message.role === "assistant" && speechSupported ? (
                  <button
                    type="button"
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-card/28 px-3 py-1.5 text-xs font-medium text-foreground/82 transition hover:border-primary/25 hover:bg-card/42"
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
              <div className="max-w-[92%] rounded-full border border-white/[0.07] bg-card/34 px-4 py-3 text-sm text-muted-foreground sm:max-w-[82%]">
              Thinking with you...
            </div>
          ) : null}
          {patternLabel ? (
            <div className="inline-flex max-w-full rounded-full border border-primary/14 bg-primary/8 px-3 py-1.5 text-[11px] leading-5 text-primary/90">
              Pattern named: {patternLabel}
            </div>
          ) : null}
          {shouldShowEntryPaths ? (
            <div className="grid gap-2 pt-1 sm:grid-cols-3">
              {entryPaths.map((path) => (
                <button
                  key={path.label}
                  type="button"
                  onClick={() => setInput(path.prompt)}
                  className="rounded-full border border-primary/14 bg-card/28 px-4 py-3 text-left text-sm leading-5 text-foreground/82 transition hover:border-primary/30 hover:bg-card/44"
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
                  className="min-w-[13rem] rounded-full border border-primary/14 bg-card/28 px-3 py-2 text-left text-xs leading-5 text-foreground/82 transition hover:border-primary/30 hover:bg-card/44 md:min-w-0"
                >
                  {prompt}
                </button>
              ))}
            </div>
          ) : null}
          <div ref={endRef} />
        </div>

        <form
          className="sticky bottom-0 border-t border-white/[0.05] bg-background/88 py-4 backdrop-blur-2xl md:bg-transparent md:pb-2 md:pt-5"
          onSubmit={sendMessage}
        >
          <Textarea
            className="min-h-16 rounded-[1.5rem] border-white/[0.1] !bg-transparent text-[16px] leading-6 text-foreground shadow-[inset_0_1px_0_rgba(244,239,228,0.05),0_16px_44px_rgba(0,0,0,0.22)] backdrop-blur-xl placeholder:text-foreground/38 focus-visible:bg-card/10 md:min-h-20 md:rounded-2xl"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="What is on your mind?"
            rows={2}
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

function getFirstName(user: {
  email?: string;
  user_metadata?: { full_name?: string; name?: string };
} | null) {
  const name =
    user?.user_metadata?.full_name?.trim() ||
    user?.user_metadata?.name?.trim() ||
    user?.email?.split("@")[0] ||
    "there";

  return name.split(/\s+/)[0];
}

function getPatternLabel(conversation: GuideConversation | null) {
  if (!conversation || conversation.messages.length < 3) return "";

  const combined = conversation.messages
    .slice(-8)
    .map((message) => message.content.toLowerCase())
    .join(" ");

  if (combined.includes("avoid") || combined.includes("procrastinat")) {
    return "avoiding the next honest action";
  }

  if (
    combined.includes("worth") ||
    combined.includes("value") ||
    combined.includes("validation")
  ) {
    return "looking outside for proof of value";
  }

  if (
    combined.includes("bored") ||
    combined.includes("numb") ||
    combined.includes("empty")
  ) {
    return "seeking aliveness without direction";
  }

  if (
    combined.includes("fear") ||
    combined.includes("anxious") ||
    combined.includes("worry")
  ) {
    return "letting fear lead perception";
  }

  if (
    combined.includes("mood") ||
    combined.includes("feeling") ||
    combined.includes("state")
  ) {
    return "letting state decide identity";
  }

  return "returning to the same inner question";
}

function buildLocalSuggestions(reply: string) {
  const lowerReply = reply.toLowerCase();

  if (lowerReply.includes("value") || lowerReply.includes("worth")) {
    return [
      "Name the root.",
      "What would self-respect do?",
      "Go deeper.",
    ];
  }

  if (lowerReply.includes("action") || lowerReply.includes("avoid")) {
    return [
      "Give me the next move.",
      "What am I avoiding feeling?",
      "Who would I be if this was normal?",
    ];
  }

  if (lowerReply.includes("feeling") || lowerReply.includes("state")) {
    return [
      "How do I practice that state?",
      "What am I making responsible for this?",
      "What would this feel like in my body?",
    ];
  }

  return fallbackSuggestedPrompts;
}

function buildConversationMemory(conversation: GuideConversation) {
  const olderMessages = conversation.messages.slice(0, -10);
  const memoryMessages = olderMessages
    .map((message) => ({
      role: message.role === "user" ? "User" : "Guide",
      content: truncateMemoryText(message.content.trim()),
    }))
    .filter((message) => message.content)
    .slice(-12);

  if (!memoryMessages.length) return "";

  return memoryMessages
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");
}

function truncateMemoryText(value: string) {
  return value.length > 240 ? `${value.slice(0, 237).trim()}...` : value;
}
