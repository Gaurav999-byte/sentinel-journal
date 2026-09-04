import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Send, 
  Save, 
  Compass, 
  RotateCcw, 
  Lock, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  Edit3, 
  X,
  ShieldAlert,
  Sliders,
  Split,
  Shield,
  CornerDownLeft
} from 'lucide-react';
import { postChatMessage, postGenerateDecisionCard } from '../services/api';
import { saveUserEntry, saveUserDecision } from '../services/firestore';
import { DecisionDraftReviewModal } from './DecisionDraftReviewModal';
import { AiMessageRenderer } from './AiMessageRenderer';
import { SentinelThinkingState } from './SentinelThinkingState';
import type { 
  AuthUser, 
  ChatMessage, 
  JournalEntry, 
  DecisionCardDraft, 
  DecisionCard 
} from '../types';

interface JournalViewProps {
  user: AuthUser;
  activeEntry: JournalEntry | null;
  onEntrySaved: (entry: JournalEntry) => void;
  onDecisionSaved: (decision: DecisionCard) => void;
  onNewSession: () => void;
  onOpenMobileMenu?: () => void;
}

const STARTER_PROMPTS = [
  {
    category: 'Career & Ambition',
    title: 'Career Pivot Analysis',
    prompt: "I'm considering a major career shift. I have an offer from an established firm with higher pay and stability, but I love the freedom and ownership of my current early-stage startup. Help me evaluate Option A vs Option B with realistic upsides and trade-offs."
  },
  {
    category: 'Strategic Focus',
    title: 'Strategic Priorities & Bandwidth',
    prompt: "I have three competing priorities this quarter and only enough bandwidth for one major initiative. Help me pressure-test the trade-offs, identify critical blind spots, and find the bottom line."
  },
  {
    category: 'Crucial Dialogue',
    title: 'High-Stakes Stakeholder Alignment',
    prompt: "I need to align expectations with a key stakeholder on an uncomfortable topic. Help me prepare clear principles, foresee objections, and remain objective."
  },
  {
    category: 'Capital & Risk',
    title: 'Resource or Financial Fork',
    prompt: "I'm evaluating whether to invest heavily in an unproven opportunity. Help me identify the hidden assumptions, down-side risks, and critical criteria before committing."
  }
];

export const JournalView: React.FC<JournalViewProps> = ({
  user,
  activeEntry,
  onEntrySaved,
  onDecisionSaved,
  onNewSession,
  onOpenMobileMenu
}) => {
  // Session Identity & Persistence Tracking
  const [sessionId, setSessionId] = useState<string>(() => 
    activeEntry?.id || ('entry-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7))
  );
  const [sessionCreatedAt, setSessionCreatedAt] = useState<string>(() => 
    activeEntry?.createdAt || new Date().toISOString()
  );

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (activeEntry && activeEntry.messages && activeEntry.messages.length > 0) {
      return activeEntry.messages;
    }
    return [];
  });

  const [inputContent, setInputContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSynthesizingDecision, setIsSynthesizingDecision] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Auto-save status indicator & persistence state
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(() => 
    activeEntry ? 'saved' : 'idle'
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  // Active reflection entry title
  const [entryTitle, setEntryTitle] = useState(activeEntry?.title || 'AI Thinking Space');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // Decision Card Draft Review State (remains DRAFT / UNSAVED until explicit user approval)
  const [activeDraft, setActiveDraft] = useState<DecisionCardDraft | null>(null);
  const [isDraftReviewOpen, setIsDraftReviewOpen] = useState(false);
  const [isSavingDecision, setIsSavingDecision] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevActiveEntryIdRef = useRef<string | null>(activeEntry?.id || null);

  // User initials
  const userInitials = user.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : (user.email ? user.email.slice(0, 2).toUpperCase() : 'ME');

  // Synchronize when an entry is selected from History / Recent Entries or cleared
  useEffect(() => {
    if (activeEntry) {
      // Only switch session state if the passed entry is genuinely DIFFERENT
      // (prevents in-session dialogue from being wiped by local re-renders or updates)
      if (activeEntry.id !== sessionId) {
        setSessionId(activeEntry.id);
        setSessionCreatedAt(activeEntry.createdAt || new Date().toISOString());
        setMessages(activeEntry.messages || []);
        setInputContent('');
        setEntryTitle(activeEntry.title || 'Untitled Reflection');
        setSaveStatus('saved');
        setSaveError(null);
        setErrorMessage(null);
        setActiveDraft(null);
        setIsDraftReviewOpen(false);
      }
      prevActiveEntryIdRef.current = activeEntry.id;
    } else if (prevActiveEntryIdRef.current !== null) {
      // activeEntry transitioned from an existing entry to null (e.g. New Session triggered externally)
      const freshId = 'entry-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
      setSessionId(freshId);
      setSessionCreatedAt(new Date().toISOString());
      setMessages([]);
      setInputContent('');
      setEntryTitle('AI Thinking Space');
      setSaveStatus('idle');
      setSaveError(null);
      setErrorMessage(null);
      setActiveDraft(null);
      setIsDraftReviewOpen(false);
      prevActiveEntryIdRef.current = null;
    }
  }, [activeEntry]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending, isSynthesizingDecision]);

  /**
   * Persist the conversation/session to authenticated user's Firestore vault
   * Preserves full sequence, timestamps, and active session ID
   */
  const persistSession = async (
    msgsToPersist: ChatMessage[],
    customTitle?: string,
    isManual = false
  ): Promise<JournalEntry | undefined> => {
    if (msgsToPersist.length === 0) return;

    setSaveStatus('saving');
    setSaveError(null);

    const title = (customTitle || entryTitle).trim() || 'Reflection Session';
    const firstUserMsg = msgsToPersist.find(m => m.role === 'user')?.content || '';
    const summaryText = firstUserMsg.slice(0, 160) + (firstUserMsg.length > 160 ? '...' : '');

    const entryPayload: JournalEntry = {
      id: sessionId,
      userId: user.uid,
      title,
      messages: msgsToPersist,
      summary: summaryText,
      tags: activeEntry?.tags && activeEntry.tags.length > 0 ? activeEntry.tags : ['Private Reflection'],
      createdAt: sessionCreatedAt,
      updatedAt: new Date().toISOString()
    };

    try {
      const saved = await saveUserEntry(user.uid, entryPayload);
      setSaveStatus('saved');
      setSaveError(null);
      prevActiveEntryIdRef.current = saved.id;
      onEntrySaved(saved);
      if (isManual) {
        setSaveSuccessNotice('Reflection securely saved to your private journal history.');
        setTimeout(() => setSaveSuccessNotice(null), 3500);
      }
      return saved;
    } catch (err: any) {
      console.error('Auto-save session error:', err);
      setSaveStatus('error');
      const msg = err?.message || 'Failed to auto-save reflection session to Firestore.';
      setSaveError(msg);
      // IMPORTANT: msgsToPersist are never discarded or lost! They remain in state.
      throw err;
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputContent).trim();
    if (!text || isSending) return;

    setErrorMessage(null);
    setSaveError(null);

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputContent('');

    // If first message and title is default, propose smart title
    let proposedTitle = entryTitle;
    if ((!entryTitle || entryTitle === 'AI Thinking Space') && messages.length === 0) {
      proposedTitle = text.slice(0, 45).replace(/[?.!]/g, '').trim() || 'Reflection Session';
      setEntryTitle(proposedTitle);
    }

    setIsSending(true);

    try {
      const reply = await postChatMessage(newMessages);
      const assistantContent = typeof reply === 'string' && reply.trim()
        ? reply.trim()
        : 'I am reflecting on your thoughts. Please continue sharing what is on your mind.';

      const assistantMsg: ChatMessage = {
        id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString()
      };
      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);

      // Automatically persist to Firestore after every turn
      try {
        await persistSession(finalMessages, proposedTitle, false);
      } catch (saveErr) {
        console.warn('Auto-save encountered an issue, dialogue is preserved locally in view:', saveErr);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setErrorMessage(err?.message || 'Failed to receive reflection from Sentinel.');
    } finally {
      setIsSending(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleRetryLastReflection = async () => {
    if (messages.length === 0 || isSending) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== 'user') return;

    setErrorMessage(null);
    setIsSending(true);

    try {
      const reply = await postChatMessage(messages);
      const assistantContent = typeof reply === 'string' && reply.trim()
        ? reply.trim()
        : 'I am reflecting on your thoughts. Please continue sharing what is on your mind.';

      const assistantMsg: ChatMessage = {
        id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString()
      };
      const finalMessages = [...messages, assistantMsg];
      setMessages(finalMessages);

      try {
        await persistSession(finalMessages, entryTitle, false);
      } catch (saveErr) {
        console.warn('Auto-save encountered an issue, dialogue is preserved locally in view:', saveErr);
      }
    } catch (err: any) {
      console.error('Retry chat error:', err);
      setErrorMessage(err?.message || 'Failed to receive reflection from Sentinel. Please try again.');
    } finally {
      setIsSending(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Turn conversation into Decision Card (Card is generated as DRAFT only, NOT automatically saved)
  const handleTurnIntoDecisionCard = async () => {
    if (messages.length === 0) {
      setErrorMessage('Please share your thoughts or dialogue first before synthesizing a decision card.');
      return;
    }

    setIsSynthesizingDecision(true);
    setErrorMessage(null);

    try {
      const draft = await postGenerateDecisionCard(messages);
      setActiveDraft(draft);
      setIsDraftReviewOpen(true);
    } catch (err: any) {
      console.error('Decision synthesis error:', err);
      setErrorMessage(err?.message || 'Unable to synthesize a decision card from this dialogue.');
    } finally {
      setIsSynthesizingDecision(false);
    }
  };

  // Prompt helpers (Continue same session, appending to existing conversation)
  const handleQuickPrompt = (actionType: 'risks' | 'values' | 'compare') => {
    if (actionType === 'risks') {
      handleSendMessage("What blind spots, hidden assumptions, or unaddressed downside risks might I be minimizing here?");
    } else if (actionType === 'values') {
      handleSendMessage("Help me clarify what foundational values, long-term priorities, and non-negotiables should guide this choice.");
    } else {
      handleSendMessage("Structure the options on the table into a clear side-by-side comparison with potential upsides, trade-offs, and critical considerations.");
    }
  };

  // Explicit User Approval & Save for Decision Card
  const handleApproveAndSaveDecision = async (editedDraft: DecisionCardDraft) => {
    setIsSavingDecision(true);
    setErrorMessage(null);
    try {
      const cardId = 'dec-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
      const newCard: DecisionCard = {
        ...editedDraft,
        id: cardId,
        userId: user.uid,
        status: 'Approved',
        sourceEntryId: sessionId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Persist approved card to user-isolated Firestore path
      await saveUserDecision(user.uid, newCard);
      onDecisionSaved(newCard);

      setActiveDraft(null);
      setIsDraftReviewOpen(false);

      setSaveSuccessNotice('Decision Card approved and securely saved to your private vault.');
      setTimeout(() => setSaveSuccessNotice(null), 4000);
    } catch (err: any) {
      console.error('Save decision card error:', err);
      setErrorMessage(err?.message || 'Failed to save Decision Card to your private database.');
    } finally {
      setIsSavingDecision(false);
    }
  };

  // Explicit User Cancel on Decision Card Draft (Leaves conversation intact, card NOT saved)
  const handleCancelDraft = () => {
    setActiveDraft(null);
    setIsDraftReviewOpen(false);
  };

  // Manual Save Action for confirmation or renaming
  const handleSaveReflection = async () => {
    if (messages.length === 0) {
      setErrorMessage('Cannot save an empty reflection session.');
      return;
    }
    try {
      await persistSession(messages, entryTitle, true);
    } catch (err) {
      // Error is captured in saveError banner
    }
  };

  // "New Reflection" creates a NEW journal session without deleting existing saved conversations
  const handleClearSession = () => {
    const freshId = 'entry-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    setSessionId(freshId);
    setSessionCreatedAt(new Date().toISOString());
    setMessages([]);
    setInputContent('');
    setEntryTitle('AI Thinking Space');
    setActiveDraft(null);
    setIsDraftReviewOpen(false);
    setSaveStatus('idle');
    setSaveError(null);
    setErrorMessage(null);
    prevActiveEntryIdRef.current = null;
    onNewSession();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans text-slate-800 overflow-hidden">
      
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3 sm:gap-4 truncate">
          {onOpenMobileMenu && (
            <button
              onClick={onOpenMobileMenu}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-md -ml-2 cursor-pointer"
              aria-label="Open navigation menu"
            >
              <div className="w-5 h-4 flex flex-col justify-between">
                <span className="w-full h-0.5 bg-slate-700 rounded-xs" />
                <span className="w-full h-0.5 bg-slate-700 rounded-xs" />
                <span className="w-full h-0.5 bg-slate-700 rounded-xs" />
              </div>
            </button>
          )}

          {isEditingTitle ? (
            <input
              type="text"
              value={entryTitle}
              autoFocus
              onBlur={() => {
                setIsEditingTitle(false);
                if (messages.length > 0) {
                  persistSession(messages, entryTitle, false).catch(() => {});
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setIsEditingTitle(false);
                  if (messages.length > 0) {
                    persistSession(messages, entryTitle, false).catch(() => {});
                  }
                }
              }}
              onChange={(e) => setEntryTitle(e.target.value)}
              className="text-base sm:text-lg font-semibold text-slate-900 bg-white border border-blue-500 rounded px-2 py-0.5 focus:outline-none"
            />
          ) : (
            <div 
              onClick={() => setIsEditingTitle(true)}
              className="group flex items-center gap-2 cursor-pointer truncate"
              title="Click to rename session"
            >
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 truncate">
                {entryTitle}
              </h2>
              <Edit3 className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}

          <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200/80 shrink-0">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>Private to you</span>
          </span>

          {/* Auto-save Status Badge */}
          <div className="hidden lg:flex items-center text-xs">
            {saveStatus === 'saving' && (
              <span className="text-blue-600 flex items-center gap-1.5 font-medium">
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>Auto-saving...</span>
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-emerald-600 flex items-center gap-1 font-medium" title="All changes saved to your private database">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Saved</span>
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-rose-600 flex items-center gap-1 font-medium" title={saveError || 'Save error'}>
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Save failed</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeDraft && !isDraftReviewOpen && (
            <button
              onClick={() => setIsDraftReviewOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold bg-amber-50 text-amber-900 rounded-md border border-amber-200 hover:bg-amber-100 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Review Draft ({activeDraft.confidence})</span>
            </button>
          )}

          {messages.length > 0 && !activeDraft && (
            <button
              id="top-btn-turn-decision"
              onClick={handleTurnIntoDecisionCard}
              disabled={isSynthesizingDecision}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
              title="Synthesize structured decision card from dialogue"
            >
              {isSynthesizingDecision ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Compass className="w-3.5 h-3.5" />
              )}
              <span>Turn into Decision Card</span>
            </button>
          )}

          <button
            id="btn-save-session"
            onClick={handleSaveReflection}
            disabled={saveStatus === 'saving' || messages.length === 0}
            className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1.5"
            title="Confirm or force save to private vault"
          >
            {saveStatus === 'saving' ? (
              <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 text-slate-600" />
            )}
            <span>Save Session</span>
          </button>

          <button
            id="btn-new-reflection"
            onClick={handleClearSession}
            className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-md transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            title="Start a fresh reflection session"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Reflection</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </header>

      {/* Main Chat Workspace */}
      <div className="flex-1 flex overflow-hidden">
        <section className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
          
          {/* Notification Banners */}
          <AnimatePresence>
            {saveSuccessNotice && (
              <motion.div 
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mx-4 sm:mx-6 mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{saveSuccessNotice}</span>
              </motion.div>
            )}

            {errorMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mx-4 sm:mx-6 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-2 shadow-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-medium">{errorMessage}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
                    <button
                      onClick={handleRetryLastReflection}
                      disabled={isSending}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-md text-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isSending ? 'Retrying...' : 'Retry'}
                    </button>
                  )}
                  <button 
                    onClick={() => setErrorMessage(null)} 
                    className="text-rose-500 hover:text-rose-800 p-1 rounded hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {saveError && (
              <motion.div 
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mx-4 sm:mx-6 mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-medium truncate">Auto-save notice: {saveError} (your conversation is safe in this window)</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => persistSession(messages, entryTitle, true)}
                    disabled={saveStatus === 'saving'}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-md text-xs cursor-pointer transition-colors shadow-2xs"
                  >
                    {saveStatus === 'saving' ? 'Retrying...' : 'Retry Save'}
                  </button>
                  <button 
                    onClick={() => setSaveError(null)} 
                    className="text-amber-700 hover:text-amber-950 p-1 rounded hover:bg-amber-100 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat Messages List */}
          <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="w-full max-w-2xl mx-auto py-6 sm:py-8 px-2 sm:px-4 flex flex-col items-center text-center">
                {/* Private Badge with balanced vertical spacing */}
                <div className="mb-4">
                  <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold shadow-2xs">
                    <Lock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Private AI Thinking Space</span>
                  </span>
                </div>

                {/* Hero Headline & Subheading */}
                <div className="max-w-xl mx-auto mb-8 space-y-2.5">
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
                    What dilemma is on your mind?
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
                    Converse freely with Sentinel to untangle messy priorities, compare non-obvious trade-offs, and crystallize decisions into actionable cards.
                  </p>
                </div>

                {/* Exploration Starters in Clean 2x2 Grid */}
                <div className="w-full text-left">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Exploration Starters
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Click any prompt to begin
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {STARTER_PROMPTS.map((starter, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSendMessage(starter.prompt)}
                        className="p-4 bg-white border border-slate-200/90 hover:border-blue-400 hover:bg-blue-50/20 rounded-xl text-left transition-all group shadow-xs hover:shadow-sm cursor-pointer flex flex-col justify-between h-full"
                      >
                        <div className="flex-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-600 block mb-1.5 transition-colors">
                            {starter.category}
                          </span>
                          <span className="text-xs font-semibold text-slate-900 block mb-1.5 group-hover:text-blue-900 transition-colors">
                            {starter.title}
                          </span>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                            {starter.prompt}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className={`flex gap-3 sm:gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Assistant Avatar */}
                    {!isUser && (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-900 to-blue-900 text-white shrink-0 flex items-center justify-center shadow-xs mt-1">
                        <Shield className="w-4 h-4 text-blue-300" />
                      </div>
                    )}

                    {/* Message Card */}
                    <div
                      className={`shadow-xs ${
                        isUser
                          ? 'bg-slate-900 text-white rounded-2xl rounded-tr-xs p-4 sm:p-4.5 max-w-xl'
                          : 'bg-white border border-slate-200/90 text-slate-800 rounded-2xl rounded-tl-xs p-5 sm:p-6 max-w-2xl sm:max-w-3xl flex-1'
                      }`}
                    >
                      {/* Card Header Meta */}
                      <div className="flex items-center justify-between gap-4 mb-2.5 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${isUser ? 'text-slate-200' : 'text-slate-900'}`}>
                            {isUser ? user.displayName || 'You' : 'Sentinel'}
                          </span>
                          {!isUser && (
                            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/70">
                              Cognitive Partner
                            </span>
                          )}
                        </div>
                        <span className={isUser ? 'text-slate-400' : 'text-slate-400'}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Content Area */}
                      {isUser ? (
                        <div className="text-sm leading-relaxed whitespace-pre-wrap text-slate-100 font-normal">
                          {msg.content}
                        </div>
                      ) : (
                        <AiMessageRenderer 
                          content={msg.content} 
                          onTurnIntoDecision={handleTurnIntoDecisionCard}
                        />
                      )}
                    </div>

                    {/* User Avatar */}
                    {isUser && (
                      <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0 flex items-center justify-center text-xs font-bold text-slate-700 mt-1">
                        {user.photoURL ? (
                          <img 
                            src={user.photoURL} 
                            alt={user.displayName || 'User'} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full rounded-full object-cover" 
                          />
                        ) : (
                          userInitials
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}

            {/* Thinking / Loading State */}
            {isSending && (
              <SentinelThinkingState />
            )}

            {/* Synthesizing Decision Card State */}
            {isSynthesizingDecision && (
              <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-950 shadow-xs max-w-xl">
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
                <div>
                  <span className="font-semibold block text-indigo-950 text-sm">Synthesizing Decision Card...</span>
                  <span className="text-indigo-700 text-xs">Extracting criteria, comparing options, mapping trade-offs & blind spots.</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area & Action Bar */}
          <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0 shadow-xs">
            {/* Quick Action Thinking Tools */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <button
                id="btn-turn-decision-card"
                onClick={handleTurnIntoDecisionCard}
                disabled={isSynthesizingDecision || messages.length === 0}
                className="text-xs px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 cursor-pointer"
                title="Synthesize structured decision card from dialogue"
              >
                {isSynthesizingDecision ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Compass className="w-3.5 h-3.5" />
                )}
                <span>Turn into Decision Card</span>
              </button>

              <button
                onClick={() => handleQuickPrompt('risks')}
                disabled={isSending}
                className="text-xs px-3 py-1.5 bg-white text-slate-700 hover:text-slate-900 font-medium rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Ask Sentinel to pressure-test hidden risks"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>Identify Risks</span>
              </button>

              <button
                onClick={() => handleQuickPrompt('values')}
                disabled={isSending}
                className="text-xs px-3 py-1.5 bg-white text-slate-700 hover:text-slate-900 font-medium rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Clarify core values and non-negotiables"
              >
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                <span>Clarify Values</span>
              </button>

              <button
                onClick={() => handleQuickPrompt('compare')}
                disabled={isSending}
                className="text-xs px-3 py-1.5 bg-white text-slate-700 hover:text-slate-900 font-medium rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Structure choices into an option comparison"
              >
                <Split className="w-3.5 h-3.5 text-indigo-600" />
                <span>Compare Options</span>
              </button>
            </div>

            {/* Prompt Textarea Workspace */}
            <div className="relative border border-slate-300 rounded-xl focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 bg-white transition-all shadow-xs">
              <textarea
                id="textarea-journal-message"
                ref={textareaRef}
                rows={2}
                value={inputContent}
                onChange={(e) => setInputContent(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSending}
                placeholder="Share your thoughts, dilemma, or options (Enter to send, Shift+Enter for new line)..."
                className="w-full p-3.5 pr-14 text-sm leading-relaxed resize-none bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none min-h-[56px] max-h-[160px]"
              />

              <div className="absolute right-2.5 bottom-2.5 flex items-center gap-2">
                <button
                  id="btn-send-message"
                  onClick={() => handleSendMessage()}
                  disabled={isSending || !inputContent.trim()}
                  className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
                  title="Send message (Enter)"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Subtle Footer info */}
            <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Private & isolated to your account</span>
              </div>
              <div className="hidden sm:flex items-center gap-1">
                <span>Press</span>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 border border-slate-200 rounded text-slate-600">Enter ↵</kbd>
                <span>to send</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Decision Card Draft Review Modal */}
      {activeDraft && (
        <DecisionDraftReviewModal
          draft={activeDraft}
          isOpen={isDraftReviewOpen}
          isSaving={isSavingDecision}
          onApproveAndSave={handleApproveAndSaveDecision}
          onCancel={handleCancelDraft}
        />
      )}

    </div>
  );
};
