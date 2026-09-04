import React from 'react';
import { 
  Sparkles, 
  Compass, 
  BookOpen, 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  Calendar,
  ChevronRight,
  ShieldCheck,
  CheckCircle,
  Clock,
  CircleDot
} from 'lucide-react';
import type { AuthUser, JournalEntry, DecisionCard, ViewTab } from '../types';

interface DashboardViewProps {
  user: AuthUser;
  entries: JournalEntry[];
  decisions: DecisionCard[];
  onNavigate: (tab: ViewTab) => void;
  onOpenEntry: (entry: JournalEntry) => void;
  onOpenDecision: (decision: DecisionCard) => void;
  onStartNewReflection?: () => void;
  onOpenMobileMenu?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  entries,
  decisions,
  onNavigate,
  onOpenEntry,
  onOpenDecision,
  onStartNewReflection,
  onOpenMobileMenu
}) => {
  const recentEntries = entries.slice(0, 3);
  const recentDecisions = decisions.slice(0, 3);

  const approvedCount = decisions.filter(d => d.status === 'Approved').length;
  const draftCount = decisions.filter(d => d.status === 'Draft').length;
  const doneCount = decisions.filter(d => d.status === 'Done').length;

  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  }).format(new Date());

  return (
    <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-800 overflow-y-auto">
      
      {/* Top Bar Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          {onOpenMobileMenu && (
            <button
              onClick={onOpenMobileMenu}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-md -ml-2"
              aria-label="Open menu"
            >
              <div className="w-5 h-4 flex flex-col justify-between">
                <span className="w-full h-0.5 bg-slate-700 rounded-xs" />
                <span className="w-full h-0.5 bg-slate-700 rounded-xs" />
                <span className="w-full h-0.5 bg-slate-700 rounded-xs" />
              </div>
            </button>
          )}

          <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
            <Lock className="w-3 h-3" />
            <span>Private to you</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="dash-btn-new-reflection"
            onClick={onStartNewReflection || (() => onNavigate('journal'))}
            className="px-4 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
          >
            <Sparkles className="w-4 h-4" />
            <span>New Reflection</span>
          </button>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <div className="p-6 max-w-6xl w-full mx-auto space-y-6">
        
        {/* Welcome Section & Metrics Overview */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{todayFormatted}</span>
                <span>•</span>
                <span className="text-slate-600 font-mono text-[11px]">
                  ID: {user.uid.slice(0, 8)}...
                </span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Welcome back, {user.displayName?.split(' ')[0] || 'Reflector'}
              </h2>
              <p className="text-slate-500 text-sm mt-1 max-w-xl leading-relaxed">
                Sentinel is prepared for your next exploration. Dialogue with Gemini, evaluate trade-offs, and crystallize dilemmas into structured Decision Cards.
              </p>
            </div>

            <button
              onClick={() => onNavigate('journal')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-md shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>Enter Thinking Space</span>
              <ArrowRight className="w-4 h-4 ml-0.5 opacity-80" />
            </button>
          </div>

          {/* 4 Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
            <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200">
              <span className="text-xs text-slate-500 font-medium block">Total Reflections</span>
              <span className="text-2xl font-bold text-slate-900 mt-0.5 block">{entries.length}</span>
            </div>

            <div className="bg-emerald-50/60 rounded-lg p-3.5 border border-emerald-200/80">
              <span className="text-xs text-emerald-800 font-medium block">Approved Decisions</span>
              <span className="text-2xl font-bold text-emerald-950 mt-0.5 block">{approvedCount}</span>
            </div>

            <div className="bg-amber-50/60 rounded-lg p-3.5 border border-amber-200/80">
              <span className="text-xs text-amber-800 font-medium block">Active Drafts</span>
              <span className="text-2xl font-bold text-amber-950 mt-0.5 block">{draftCount}</span>
            </div>

            <div className="bg-blue-50/60 rounded-lg p-3.5 border border-blue-200/80">
              <span className="text-xs text-blue-800 font-medium block">Decisions Executed</span>
              <span className="text-2xl font-bold text-blue-950 mt-0.5 block">{doneCount}</span>
            </div>
          </div>
        </section>

        {/* Two Columns: Recent Reflections & Decision Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column: Recent Reflections */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-slate-700" />
                  <h3 className="font-semibold text-base text-slate-900">Recent Reflections</h3>
                </div>
                <button
                  onClick={() => onNavigate('history')}
                  className="text-xs font-medium text-slate-600 hover:text-blue-600 inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>View all</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {recentEntries.length === 0 ? (
                <div className="py-10 text-center text-slate-500 space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium text-slate-800">No reflections saved yet</p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Converse candidly with Gemini about any crossroad, strategic fork, or project decision.
                  </p>
                  <button
                    onClick={onStartNewReflection || (() => onNavigate('journal'))}
                    className="mt-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Start first session</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentEntries.map((entry) => (
                    <div
                      key={entry.id}
                      onClick={() => onOpenEntry(entry)}
                      className="p-3.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-slate-50 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span className="font-mono text-[11px]">
                          {new Date(entry.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-medium">
                          {entry.messages.length} msgs
                        </span>
                      </div>
                      <h4 className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {entry.title}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                        {entry.summary || entry.messages[0]?.content || 'Private conversation transcript'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1 text-[11px]">
                <Lock className="w-3 h-3 text-emerald-600" /> Stored in your private subcollection
              </span>
              <button
                onClick={() => onNavigate('history')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Browse archive →
              </button>
            </div>
          </section>

          {/* Right Column: Decision Cards */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-slate-700" />
                  <h3 className="font-semibold text-base text-slate-900">Decision Cards</h3>
                </div>
                <button
                  onClick={() => onNavigate('decisions')}
                  className="text-xs font-medium text-slate-600 hover:text-blue-600 inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>View all</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {recentDecisions.length === 0 ? (
                <div className="py-10 text-center text-slate-500 space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                    <Compass className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium text-slate-800">No decision cards formulated</p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    During your reflections, click "Turn into Decision Card" to extract a structured review card.
                  </p>
                  <button
                    onClick={onStartNewReflection || (() => onNavigate('journal'))}
                    className="mt-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Formulate in Journal</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentDecisions.map((card) => {
                    const isApproved = card.status === 'Approved';
                    const isDraft = card.status === 'Draft';
                    return (
                      <div
                        key={card.id}
                        onClick={() => {
                          onOpenDecision(card);
                          onNavigate('decisions');
                        }}
                        className="p-3.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-slate-50 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                              isApproved
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : isDraft
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {card.status}
                          </span>

                          <span className="font-mono text-[11px] text-slate-400">
                            {card.confidence} Confidence
                          </span>
                        </div>

                        <h4 className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                          {card.decision}
                        </h4>

                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                          <span className="truncate max-w-[200px] text-[11px] italic">
                            Next: {card.nextAction}
                          </span>
                          {card.deadline && (
                            <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                              Due: {card.deadline}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                Human-in-the-loop verified
              </span>
              <button
                onClick={() => onNavigate('decisions')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Manage cards →
              </button>
            </div>
          </section>

        </div>

      </div>

    </div>
  );
};
