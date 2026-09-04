export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  summary?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DecisionCardDraft {
  decision: string;
  options: string[];
  whatMatters: string[];
  pros: string[];
  cons: string[];
  tradeOffs: string[];
  risks: string[];
  nextAction: string;
  deadline?: string;
  unresolvedQuestions: string[];
  confidence: 'Low' | 'Medium' | 'High';
}

export interface DecisionCard extends DecisionCardDraft {
  id: string;
  userId: string;
  status: 'Draft' | 'Approved' | 'Done';
  sourceEntryId?: string;
  createdAt: string;
  updatedAt: string;
}

export type ViewTab = 'dashboard' | 'journal' | 'decisions' | 'history';
