export type PillarName = "Thinking" | "Willing" | "Feeling";

export type CheckInDraft = {
  thinkingScore: number;
  willingScore: number;
  feelingScore: number;
  dominantThought: string;
  avoidedAction: string;
  currentFeeling: string;
  highestBeingChoice: string;
};

export type AlignmentPrescription = {
  thoughtCorrection: string;
  actionStep: string;
  embodimentPractice: string;
  identityAffirmation: string;
};

export type AiAlignment = AlignmentPrescription & {
  summary: string;
};

export type CheckInResult = CheckInDraft & {
  id: string;
  createdAt: string;
  beingScore: number;
  stateLabel: string;
  strongestPillar: PillarName;
  weakestPillar: PillarName;
  prescription: AlignmentPrescription;
  aiAlignment?: AiAlignment;
  aiQuote?: string;
  aiGeneratedAt?: string;
};

export type GuideMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type GuideConversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: GuideMessage[];
};

export type DailyRitual = {
  id: string;
  date: string;
  morningIntention: string;
  chosenBeing: string;
  protectedBoundary: string;
  eveningAlignment: string;
  eveningFragmentation: string;
  lesson: string;
  createdAt: string;
  updatedAt: string;
};

export type JournalEntry = {
  id: string;
  date: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type BeingMetric = {
  label: string;
  value: string;
  detail: string;
};

export type BeingDashboardAnalysis = {
  archetype: string;
  summary: string;
  rootCause: string;
  hiddenDebt: string;
  leveragePoint: string;
  nextPractice: string;
};
