import React, { useState } from 'react';
import { 
  Compass, 
  CheckCircle2, 
  Sparkles, 
  Trash2, 
  Lock,
  Search,
  CheckCircle, 
  CircleDot, 
  AlertCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  ArrowRight,
  X
} from 'lucide-react';
import { updateUserDecisionStatus, deleteUserDecision } from '../services/firestore';
import { DecisionCardDetailModal } from './DecisionCardDetailModal';
import type { AuthUser, DecisionCard, ViewTab } from '../types';

interface DecisionCardsViewProps {
  user: AuthUser;
  decisions: DecisionCard[];
  isLoading?: boolean;
  onDecisionUpdated: (updatedCard: DecisionCard) => void;
  onDecisionDeleted: (decisionId: string) => void;
  onNavigate: (tab: ViewTab) => void;
  onStartNewReflection?: () => void;
  onOpenMobileMenu?: () => void;
}

export const DecisionCardsView: React.FC<DecisionCardsViewProps> = ({
  user,
  decisions,
  isLoading = false,
  onDecisionUpdated,
  onDecisionDeleted,
  onNavigate,
  onStartNewReflection,
  onOpenMobileMenu
}) => {
  const [activeFilter, setActiveFilter] = useState<'All' | 'Approved' | 'Draft' | 'Done'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<DecisionCard | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Decision Card Deletion states
  const [cardToDelete, setCardToDelete] = useState<DecisionCard | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filteredDecisions = decisions.filter(card => {
    const matchesFilter = activeFilter === 'All' || card.status === activeFilter;
    const searchLower = searchQuery.toLowerCase().trim();
    const matchesSearch = searchLower === '' || 
      card.decision.toLowerCase().includes(searchLower) ||
      (card.options && card.options.some(o => o.toLowerCase().includes(searchLower))) ||
      (card.whatMatters && card.whatMatters.some(w => w.toLowerCase().includes(searchLower))) ||
      (card.pros && card.pros.some(p => p.toLowerCase().includes(searchLower))) ||
      (card.cons && card.cons.some(c => c.toLowerCase().includes(searchLower))) ||
      (card.nextAction && card.nextAction.toLowerCase().includes(searchLower));
    return matchesFilter && matchesSearch;
  });

  const handleStatusChange = async (card: DecisionCard, newStatus: 'Draft' | 'Approved' | 'Done') => {
    setActionLoadingId(card.id);
    setErrorMessage(null);
    try {
      await updateUserDecisionStatus(user.uid, card.id, newStatus);
      const updated: DecisionCard = {
        ...card,
        status: newStatus,
        updatedAt: new Date().toISOString()
      };
      onDecisionUpdated(updated);
      if (selectedCard?.id === card.id) {
        setSelectedCard(updated);
      }
      setSuccessNotice(`Decision status updated to "${newStatus}".`);
      setTimeout(() => setSuccessNotice(null), 3500);
    } catch (err: any) {
      console.error('Failed to update status:', err);
      setErrorMessage(err?.message || 'Failed to update decision card status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenDeleteDialog = (card: DecisionCard) => {
    setDeleteError(null);
    setCardToDelete(card);
  };

  const handleOpenDeleteDialogById = (cardId: string) => {
    const target = decisions.find(d => d.id === cardId) || selectedCard;
    if (target) {
      handleOpenDeleteDialog(target);
    }
  };

  const handleCancelDelete = () => {
    if (deletingId) return;
    setCardToDelete(null);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!cardToDelete) return;
    const targetCardId = cardToDelete.id;
    setDeletingId(targetCardId);
    setDeleteError(null);

    try {
      await deleteUserDecision(user.uid, targetCardId);
      // Immediately remove card from UI and refresh all counters in parent state
      onDecisionDeleted(targetCardId);
      if (selectedCard?.id === targetCardId) {
        setSelectedCard(null);
      }
      setCardToDelete(null);
      setSuccessNotice('Decision Card deleted.');
      setTimeout(() => setSuccessNotice(null), 3500);
    } catch (err: any) {
      console.error('Failed to delete card:', err);
      setDeleteError(err?.message || 'Failed to delete decision card. Please click Delete to retry.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-800 overflow-y-auto">
      
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          {onOpenMobileMenu && (
            <button
              onClick={onOpenMobileMenu}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-md -ml-2 cursor-pointer"
              aria-label="Open menu"
            >
              <div className="w-5 h-4 flex flex-col justify-between">
                <span className="w-full h-0.5 bg-slate-700 rounded-xs" />
                <span className="w-full h-0.5 bg-slate-700 rounded-xs" />
                <span className="w-full h-0.5 bg-slate-700 rounded-xs" />
              </div>
            </button>
          )}

          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-slate-900">Decision Cards</h1>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
              <Lock className="w-3 h-3" />
              <span>Private to you</span>
            </span>
          </div>
        </div>

        <button
          id="decisions-btn-new"
          onClick={onStartNewReflection || (() => onNavigate('journal'))}
          className="px-4 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
        >
          <Sparkles className="w-4 h-4" />
          <span>Formulate in Journal</span>
        </button>
      </header>

      {/* Main Content Area */}
      <div className="p-6 max-w-6xl w-full mx-auto space-y-6">
        
        {/* Notification Banners */}
        {successNotice && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-2 shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successNotice}</span>
            </div>
            <button onClick={() => setSuccessNotice(null)} className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-2 shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-700 hover:text-rose-950 p-1 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Filters & Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Status Filter Tabs */}
          <div className="flex items-center p-1 bg-slate-200/80 rounded-lg w-full sm:w-auto">
            {(['All', 'Approved', 'Done', 'Draft'] as const).map((tab) => {
              const count = tab === 'All' 
                ? decisions.length 
                : decisions.filter(d => d.status === tab).length;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeFilter === tab
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{tab}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeFilter === tab ? 'bg-slate-100 text-slate-800 font-bold' : 'bg-slate-300/60 text-slate-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search decisions, criteria, options..."
              className="w-full text-xs pl-8 pr-8 py-2 rounded-md bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4 animate-pulse">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <div className="h-4 bg-slate-200 rounded w-24" />
                  <div className="h-4 bg-slate-200 rounded w-20" />
                </div>
                <div className="h-6 bg-slate-200 rounded w-3/4" />
                <div className="space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-full" />
                  <div className="h-4 bg-slate-100 rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredDecisions.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-md mx-auto space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
              <Compass className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-slate-900 mb-1">
                {decisions.length === 0 ? 'No decision cards yet' : 'No matching cards found'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {decisions.length === 0 
                  ? 'Reflect with Sentinel in the AI Journal, then click "Turn into Decision Card" to synthesize and approve a structured card.'
                  : 'Try adjusting your status filter tab or clearing your search term.'}
              </p>
            </div>

            {decisions.length === 0 ? (
              <button
                onClick={onStartNewReflection || (() => onNavigate('journal'))}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Start Reflection in Journal</span>
              </button>
            ) : (
              <button
                onClick={() => { setSearchQuery(''); setActiveFilter('All'); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-md transition-colors cursor-pointer"
              >
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        )}

        {/* Cards Grid */}
        {!isLoading && filteredDecisions.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredDecisions.map((card) => {
              const isApproved = card.status === 'Approved';
              const isDone = card.status === 'Done';
              const isDraft = card.status === 'Draft';
              const confidenceVal = card.confidence === 'High' ? 85 : card.confidence === 'Medium' ? 65 : 40;

              return (
                <div
                  key={card.id}
                  className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors group"
                >
                  <div className="space-y-4">
                    
                    {/* Status & Confidence Header */}
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          isApproved
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : isDone
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {card.status}
                        </span>

                        <span className="text-[11px] font-mono text-slate-500">
                          {card.confidence} Confidence ({confidenceVal}%)
                        </span>
                      </div>

                      <span className="text-[11px] font-mono text-slate-400">
                        {new Date(card.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    {/* DECISION TITLE & OPEN ACTION */}
                    <div 
                      onClick={() => setSelectedCard(card)}
                      className="cursor-pointer space-y-1"
                    >
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Decision
                      </span>
                      <h3 className="font-semibold text-base text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                        {card.decision}
                      </h3>
                    </div>

                    {/* OPTIONS PREVIEW */}
                    {card.options && card.options.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                          Options Considered ({card.options.length})
                        </span>
                        <div className="space-y-1.5 text-xs text-slate-700">
                          {card.options.slice(0, 3).map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />
                              <span className="line-clamp-1">{opt}</span>
                            </div>
                          ))}
                          {card.options.length > 3 && (
                            <span className="text-[10px] text-slate-400 italic">
                              +{card.options.length - 3} more options
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* WHAT MATTERS (CRITERIA) */}
                    {card.whatMatters && card.whatMatters.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                          What Matters
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {card.whatMatters.map((val, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium"
                            >
                              {val}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* PROS & CONS BADGES */}
                    {((card.pros && card.pros.length > 0) || (card.cons && card.cons.length > 0)) && (
                      <div className="flex items-center gap-3 text-xs">
                        {card.pros && card.pros.length > 0 && (
                          <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                            <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{card.pros.length} Pros</span>
                          </div>
                        )}
                        {card.cons && card.cons.length > 0 && (
                          <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                            <ThumbsDown className="w-3.5 h-3.5 text-amber-600" />
                            <span>{card.cons.length} Cons</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* NEXT ACTION */}
                    <div className="p-3 rounded-lg bg-slate-50 border border-dashed border-slate-300">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Next Action
                        </span>
                        {card.deadline && (
                          <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{card.deadline}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs italic text-slate-600 leading-relaxed line-clamp-2">
                        {card.nextAction || 'Review and finalize roadmap'}
                      </p>
                    </div>

                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {/* Open Card details button */}
                      <button
                        onClick={() => setSelectedCard(card)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                        <span>Open Card</span>
                      </button>

                      {/* Mark as Done action */}
                      {isApproved && (
                        <button
                          onClick={() => handleStatusChange(card, 'Done')}
                          disabled={actionLoadingId === card.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-medium transition-colors cursor-pointer"
                          title="Mark decision as executed"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Mark Done</span>
                        </button>
                      )}

                      {/* Reopen action */}
                      {isDone && (
                        <button
                          onClick={() => handleStatusChange(card, 'Approved')}
                          disabled={actionLoadingId === card.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                          title="Reopen decision card"
                        >
                          <CircleDot className="w-3.5 h-3.5 text-blue-600" />
                          <span>Reopen</span>
                        </button>
                      )}

                      {/* Approve draft */}
                      {isDraft && (
                        <button
                          onClick={() => handleStatusChange(card, 'Approved')}
                          disabled={actionLoadingId === card.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                      )}
                    </div>

                    {/* Delete button */}
                    <button
                      id={`decision-delete-btn-${card.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDeleteDialog(card);
                      }}
                      disabled={deletingId !== null || actionLoadingId === card.id}
                      title="Delete card"
                      aria-label="Delete decision card"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Detailed Modal for Opened Card */}
      <DecisionCardDetailModal
        card={selectedCard}
        isOpen={Boolean(selectedCard)}
        actionLoading={Boolean(actionLoadingId || deletingId)}
        onClose={() => setSelectedCard(null)}
        onStatusChange={handleStatusChange}
        onDelete={handleOpenDeleteDialogById}
      />

      {/* Delete Confirmation Dialog */}
      {cardToDelete && (
        <div
          id="decision-delete-confirmation-dialog"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-60 flex items-center justify-center p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-decision-dialog-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 id="delete-decision-dialog-title" className="font-semibold text-base text-slate-900">
                  Delete Decision Card permanently?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  This action cannot be undone. Only this decision card will be removed; your journal and reflection history will remain safe.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                  {cardToDelete.status}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {new Date(cardToDelete.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                {cardToDelete.decision || 'Untitled Decision'}
              </p>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 flex-1">
                  <span className="font-semibold">Unable to delete decision card</span>
                  <p className="leading-relaxed text-[11px]">{deleteError}</p>
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                id="btn-cancel-delete-card"
                type="button"
                onClick={handleCancelDelete}
                disabled={deletingId !== null}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete-card"
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingId !== null}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                {deletingId !== null ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
