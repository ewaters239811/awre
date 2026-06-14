import type { GuideConversation, GuideMessage } from "@/lib/types";

const STORAGE_KEY = "aura.guideConversations.v1";

export function createOpeningMessage(): GuideMessage {
  return {
    role: "assistant",
    content:
      "Bring me one daily challenge. I will help you read it through Thinking, Willing, Feeling, and Being, then find the cleanest next step.",
    createdAt: new Date().toISOString(),
  };
}

export function createConversation(): GuideConversation {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    title: "New conversation",
    createdAt: now,
    updatedAt: now,
    messages: [createOpeningMessage()],
  };
}

export function createUserMessage(content: string): GuideMessage {
  return {
    role: "user",
    content,
    createdAt: new Date().toISOString(),
  };
}

export function createAssistantMessage(content: string): GuideMessage {
  return {
    role: "assistant",
    content,
    createdAt: new Date().toISOString(),
  };
}

export function getGuideConversations(): GuideConversation[] {
  if (!isBrowser()) return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGuideConversation(conversation: GuideConversation) {
  if (!isBrowser()) return;

  const conversations = getGuideConversations();
  const next = [
    {
      ...conversation,
      title: getConversationTitle(conversation),
      updatedAt: new Date().toISOString(),
    },
    ...conversations.filter((item) => item.id !== conversation.id),
  ];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function deleteGuideConversation(id: string) {
  if (!isBrowser()) return [];

  const next = getGuideConversations().filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearGuideConversations() {
  if (isBrowser()) localStorage.removeItem(STORAGE_KEY);
}

function getConversationTitle(conversation: GuideConversation) {
  const firstUserMessage = conversation.messages.find(
    (message) => message.role === "user",
  );

  if (!firstUserMessage) return conversation.title;

  const title = firstUserMessage.content.trim().replace(/\s+/g, " ");
  return title.length > 42 ? `${title.slice(0, 42)}...` : title;
}

function isBrowser() {
  return typeof window !== "undefined";
}
