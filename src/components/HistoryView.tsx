import React, { useState } from 'react';
import { 
  Archive, 
  Search, 
  Trash2, 
  ArrowRight, 
  Lock, 
  Calendar, 
  MessageSquare, 
  BookOpen, 
  Sparkles,
  X,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { deleteUserEntry } from '../services/firestore';
import { AiMessageRenderer } from './AiMessageRenderer';
import type { AuthUser, JournalEntry, ViewTab } from '../types';

interface HistoryViewProps {
  user: AuthUser;
  entries: JournalEntry[];
  onOpenInJournal: (entry: JournalEntry) => void;
  onEntryDeleted: (entryId: string) => void;
  onNavigate: (tab: ViewTab) => void;
  onStartNewSession?: () => void;
  onOpenMobileMenu?: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  user,
  entries,
  onOpenInJournal,
  onEntryDeleted,
  onNavigate,
  onStartNewSession,
  onOpenMobileMenu
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReaderEntry, setSelectedReaderEntry] = useState<JournalEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<JournalEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.summary && entry.summary.toLowerCase().includes(searchQuery.toLowerCase())) ||
      entry.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const handleOpenDeleteDialog = (entry: JournalEntry) => {
    setDeleteError(null);
    setEntryToDelete(entry);
  };

  const handleCancelDelete = () => {
    if (deletingId) return;
    setEntryToDelete(null);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!entryToDelete) return;
    const targetEntryId = entryToDelete.id;
    setDeletingId(targetEntryId);
    setDeleteError(null);

    try {
      await deleteUserEntry(user.uid, targetEntryId);
      // Immediately remove from UI and update count
      onEntryDeleted(targetEntryId);
      if (selectedReaderEntry?.id === targetEntryId) {
        setSelectedReaderEntry(null);
      }
      setEntryToDelete(null);
      setStatusNotice('Reflection deleted successfully.');
      setTimeout(() => {
        setStatusNotice(null);
      }, 3500);
    } catch (err: any) {
      console.error('Failed to delete reflection entry:', err);
      // If deletion fails, show clear error and keep reflection visible in UI
      setDeleteError(err?.message || 'Failed to delete reflection from vault. Please try again.');
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

          <h1 className="text-lg font-semibold text-slate-900">Reflection History</h1>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
            <Lock className="w-3 h-3" />
            <span>Private to you</span>
          </span>
        </div>

        <button
          onClick={onStartNewSession || (() => onNavigate('journal'))}
          className="px-4 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
        >
          <Sparkles className="w-4 h-4" />
          <span>New Session</span>
        </button>
      </header>

      {/* Main Content Area */}
      <div className="p-6 max-w-6xl w-full mx-auto space-y-6">
        
        {/* Status Notice Banner */}
        {statusNotice && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-lg flex items-center justify-between shadow-xs animate-in fade-in duration-150">
            <span className="font-medium">{statusNotice}</span>
            <button 
              onClick={() => setStatusNotice(null)} 
              className="text-emerald-600 hover:text-emerald-900 p-0.5 rounded cursor-pointer"
              aria-label="Dismiss notice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved reflections, insights, or dilemmas..."
              className="w-full text-xs pl-10 pr-4 py-2.5 rounded-md bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
            />
          </div>

          <span className="text-xs text-slate-500 font-mono hidden sm:inline">
            {filteredEntries.length} {filteredEntries.length === 1 ? 'reflection' : 'reflections'}
          </span>
        </div>

        {/* Entries Grid */}
        {filteredEntries.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-md mx-auto space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
              <Archive className="w-6 h-6 text-slate-500" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-slate-900 mb-1">
                {entries.length === 0 ? 'No reflections saved yet' : 'No reflections match query'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {entries.length === 0 
                  ? 'When you reflect with Sentinel, click "Save Session" to store the dialogue in your private vault.'
                  : 'Try searching for different keywords or clearing the search field.'}
              </p>
            </div>

            {entries.length === 0 && (
              <button
                onClick={onStartNewSession || (() => onNavigate('journal'))}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md transition-colors cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Start Reflection in Journal</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono text-[11px] flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {new Date(entry.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>

                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium flex items-center gap-1">
                      <MessageSquare className="w-2.5 h-2.5" />
                      {entry.messages.length}
                    </span>
                  </div>

                  <h3 className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {entry.title}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                    {entry.summary || entry.messages[0]?.content || 'Private conversation transcript'}
                  </p>
                </div>

                {/* Card Action Footer */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => setSelectedReaderEntry(entry)}
                    className="text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                    <span>Read Full</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onOpenInJournal(entry)}
                      title="Load conversation in AI Journal"
                      className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span className="text-[11px] font-medium">Continue</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>

                    <button
                      id={`history-delete-btn-${entry.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDeleteDialog(entry);
                      }}
                      disabled={deletingId === entry.id}
                      title="Delete reflection"
                      aria-label={`Delete reflection ${entry.title}`}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reader Modal */}
        {selectedReaderEntry && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-xl my-8">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-0.5">
                    <Lock className="w-3 h-3 text-emerald-600" />
                    <span>Private Reflection Transcript</span>
                  </div>
                  <h3 className="font-semibold text-lg text-slate-900">
                    {selectedReaderEntry.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedReaderEntry(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 text-sm flex-1 bg-slate-50">
                {selectedReaderEntry.messages.map((m) => {
                  const isUser = m.role === 'user';
                  return (
                    <div key={m.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                      {!isUser && (
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-900 to-blue-900 shrink-0 flex items-center justify-center text-xs font-bold text-white shadow-2xs">
                          S
                        </div>
                      )}
                      <div className={`p-4 rounded-xl text-xs leading-relaxed max-w-xl shadow-xs ${
                        isUser
                          ? 'bg-slate-900 text-white rounded-tr-xs'
                          : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs flex-1'
                      }`}>
                        <div className="flex items-center justify-between gap-4 mb-2 text-[10px]">
                          <span className={`font-semibold ${isUser ? 'text-slate-300' : 'text-slate-700'}`}>
                            {isUser ? 'You' : 'Sentinel'}
                          </span>
                          <span className={isUser ? 'text-slate-400' : 'text-slate-400'}>
                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {isUser ? (
                          <div className="whitespace-pre-wrap text-slate-100">{m.content}</div>
                        ) : (
                          <AiMessageRenderer content={m.content} />
                        )}
                      </div>
                      {isUser && (
                        <div className="w-7 h-7 rounded-full bg-slate-200 shrink-0 flex items-center justify-center text-xs font-bold text-slate-700">
                          {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="p-4 border-t border-slate-200 bg-white rounded-b-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedReaderEntry(null)}
                    className="text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 font-medium rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Close
                  </button>

                  <button
                    id="reader-delete-btn"
                    onClick={() => handleOpenDeleteDialog(selectedReaderEntry)}
                    className="text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1 font-medium"
                    title="Delete reflection"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    const entry = selectedReaderEntry;
                    setSelectedReaderEntry(null);
                    onOpenInJournal(entry);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
                >
                  <span>Continue in Journal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {entryToDelete && (
          <div
            id="delete-confirmation-dialog"
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 id="delete-dialog-title" className="font-semibold text-base text-slate-900">
                    Delete Reflection
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    Delete this reflection? This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-xs font-medium text-slate-800 line-clamp-2">
                  {entryToDelete.title || 'Untitled Reflection'}
                </p>
                <span className="text-[11px] text-slate-400 mt-1 block font-mono">
                  {new Date(entryToDelete.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })} • {entryToDelete.messages.length} messages
                </span>
              </div>

              {deleteError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 flex-1">
                    <span className="font-semibold">Unable to delete reflection</span>
                    <p className="leading-relaxed text-[11px]">{deleteError}</p>
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  id="btn-cancel-delete"
                  type="button"
                  onClick={handleCancelDelete}
                  disabled={deletingId !== null}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-delete"
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

    </div>
  );
};
