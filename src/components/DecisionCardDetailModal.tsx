import React from 'react';
import { 
  X, 
  CheckCircle, 
  CheckCircle2, 
  CircleDot, 
  Trash2, 
  ThumbsUp, 
  ThumbsDown, 
  AlertTriangle, 
  HelpCircle, 
  ArrowRight, 
  Calendar,
  Lock,
  Compass
} from 'lucide-react';
import type { DecisionCard } from '../types';

interface DecisionCardDetailModalProps {
  card: DecisionCard | null;
  isOpen: boolean;
  actionLoading: boolean;
  onClose: () => void;
  onStatusChange: (card: DecisionCard, newStatus: 'Approved' | 'Done') => void;
  onDelete: (cardId: string) => void;
}

export const DecisionCardDetailModal: React.FC<DecisionCardDetailModalProps> = ({
  card,
  isOpen,
  actionLoading,
  onClose,
  onStatusChange,
  onDelete
}) => {
  if (!isOpen || !card) return null;

  const isApproved = card.status === 'Approved';
  const isDone = card.status === 'Done';
  const confidenceScore = 
    card.confidence === 'High' ? 85 : 
    card.confidence === 'Medium' ? 65 : 40;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden font-sans text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isApproved
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : isDone
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  {card.status}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {new Date(card.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 line-clamp-1 mt-0.5">
                {card.decision}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Decision Headline */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Core Decision
            </span>
            <p className="text-sm sm:text-base font-semibold text-slate-900 leading-snug">
              {card.decision}
            </p>
          </div>

          {/* Options Considered */}
          {card.options && card.options.length > 0 && (
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Options Considered
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {card.options.map((opt, i) => (
                  <div 
                    key={i} 
                    className="p-3 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-800 flex items-start gap-2 shadow-xs"
                  >
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{opt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What Matters */}
          {card.whatMatters && card.whatMatters.length > 0 && (
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Guiding Values & Criteria
              </span>
              <div className="flex flex-wrap gap-2">
                {card.whatMatters.map((w, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-medium border border-slate-200"
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Pros & Cons Columns */}
          {((card.pros && card.pros.length > 0) || (card.cons && card.cons.length > 0)) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Pros */}
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/70 space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 text-xs font-bold uppercase tracking-wider">
                  <ThumbsUp className="w-4 h-4 text-emerald-600" />
                  <span>Pros / Key Advantages</span>
                </div>
                {card.pros && card.pros.length > 0 ? (
                  <ul className="space-y-1.5 text-xs text-emerald-950">
                    {card.pros.map((p, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-emerald-700 italic">No specific pros recorded.</p>
                )}
              </div>

              {/* Cons */}
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/70 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 text-xs font-bold uppercase tracking-wider">
                  <ThumbsDown className="w-4 h-4 text-amber-600" />
                  <span>Cons / Key Drawbacks</span>
                </div>
                {card.cons && card.cons.length > 0 ? (
                  <ul className="space-y-1.5 text-xs text-amber-950">
                    {card.cons.map((c, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-amber-700 italic">No specific cons recorded.</p>
                )}
              </div>

            </div>
          )}

          {/* Trade-offs & Risks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Trade-offs */}
            {card.tradeOffs && card.tradeOffs.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Key Trade-offs
                </span>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {card.tradeOffs.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-slate-400">•</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risks & Unknowns */}
            {card.risks && card.risks.length > 0 && (
              <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200/70 space-y-2">
                <div className="flex items-center gap-1.5 text-rose-800 text-xs font-bold uppercase tracking-wider">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Risks & Unknowns</span>
                </div>
                <ul className="space-y-1.5 text-xs text-rose-950">
                  {card.risks.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </div>

          {/* Unresolved Questions */}
          {card.unresolvedQuestions && card.unresolvedQuestions.length > 0 && (
            <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-100 space-y-2">
              <div className="flex items-center gap-1.5 text-blue-900 text-xs font-bold uppercase tracking-wider">
                <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                <span>Unresolved Questions</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {card.unresolvedQuestions.map((q, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold">?</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommended Next Action & Deadline */}
          <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                <span>Recommended Next Action</span>
              </span>
              {card.deadline && (
                <span className="text-xs font-semibold text-blue-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Deadline: {card.deadline}</span>
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-slate-100 leading-relaxed">
              {card.nextAction || 'Review and finalize implementation roadmap'}
            </p>
          </div>

          {/* Confidence Meter */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wider">
                Confidence Level
              </span>
              <span className="font-bold text-blue-600">
                {card.confidence} ({confidenceScore}%)
              </span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${confidenceScore}%` }}
              />
            </div>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {isApproved && (
              <button
                onClick={() => onStatusChange(card, 'Done')}
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Mark as Done</span>
              </button>
            )}

            {isDone && (
              <button
                onClick={() => onStatusChange(card, 'Approved')}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <CircleDot className="w-4 h-4" />
                <span>Reopen as Approved</span>
              </button>
            )}

            <button
              onClick={() => onDelete(card.id)}
              disabled={actionLoading}
              className="px-3 py-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Card</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
