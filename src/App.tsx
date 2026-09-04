import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { auth, mapFirebaseUser, signOutUser } from './lib/firebase';
import { fetchUserEntries, fetchUserDecisions } from './services/firestore';
import { Sidebar } from './components/Sidebar';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { JournalView } from './components/JournalView';
import { DecisionCardsView } from './components/DecisionCardsView';
import { HistoryView } from './components/HistoryView';
import type { AuthUser, JournalEntry, DecisionCard, ViewTab } from './types';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App Navigation
  const [activeTab, setActiveTab] = useState<ViewTab>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // User Isolated Data
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [decisions, setDecisions] = useState<DecisionCard[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Active Journal Session (loaded from history or new)
  const [activeEntry, setActiveEntry] = useState<JournalEntry | null>(null);
  // Session key to force fresh JournalView initialization when new session requested
  const [journalSessionKey, setJournalSessionKey] = useState<number>(0);

  const loadUserData = async (uid: string) => {
    setDataLoading(true);
    setDataError(null);
    try {
      const [loadedEntries, loadedDecisions] = await Promise.all([
        fetchUserEntries(uid),
        fetchUserDecisions(uid)
      ]);
      setEntries(loadedEntries);
      setDecisions(loadedDecisions);
    } catch (err: any) {
      console.error('Failed to load user private data:', err);
      setDataError('Could not sync your private vault. Click retry to reconnect.');
    } finally {
      setDataLoading(false);
    }
  };

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const mapped = mapFirebaseUser(firebaseUser);
      setUser(mapped);
      setAuthLoading(false);

      if (mapped) {
        await loadUserData(mapped.uid);
      } else {
        setEntries([]);
        setDecisions([]);
        setActiveEntry(null);
        setActiveTab('dashboard');
        setDataError(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Entry saved callback
  const handleEntrySaved = (saved: JournalEntry) => {
    setEntries((prev) => {
      const exists = prev.some(e => e.id === saved.id);
      if (exists) {
        return prev.map(e => e.id === saved.id ? saved : e);
      }
      return [saved, ...prev];
    });
    setActiveEntry(saved);
  };

  // Decision saved callback
  const handleDecisionSaved = (savedCard: DecisionCard) => {
    setDecisions((prev) => {
      const exists = prev.some(d => d.id === savedCard.id);
      if (exists) {
        return prev.map(d => d.id === savedCard.id ? savedCard : d);
      }
      return [savedCard, ...prev];
    });
  };

  // Decision updated callback
  const handleDecisionUpdated = (updatedCard: DecisionCard) => {
    setDecisions((prev) =>
      prev.map(d => d.id === updatedCard.id ? updatedCard : d)
    );
  };

  // Decision deleted callback
  const handleDecisionDeleted = (cardId: string) => {
    setDecisions((prev) => prev.filter(d => d.id !== cardId));
  };

  // Entry deleted callback
  const handleEntryDeleted = (entryId: string) => {
    setEntries((prev) => prev.filter(e => e.id !== entryId));
    if (activeEntry?.id === entryId) {
      setActiveEntry(null);
    }
  };

  // Open entry in Journal
  const handleOpenInJournal = (entry: JournalEntry) => {
    setActiveEntry(entry);
    setJournalSessionKey(prev => prev + 1);
    setActiveTab('journal');
  };

  // Start fresh reflection session
  const handleStartNewReflection = () => {
    setActiveEntry(null);
    setJournalSessionKey(prev => prev + 1);
    setActiveTab('journal');
  };

  // Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans text-slate-800">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg text-white mb-4 shadow-xs animate-pulse">
          S
        </div>
        <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mb-3" />
        <span className="text-xs text-slate-500 font-medium">
          Loading Sentinel Private Vault...
        </span>
      </div>
    );
  }

  // Unauthenticated: Show Login/Landing View
  if (!user) {
    return <LoginView />;
  }

  const draftCount = decisions.filter(d => d.status === 'Draft').length;

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans text-slate-800 bg-white">
      
      {/* Left Sidebar (Matching Design HTML) */}
      <Sidebar
        user={user}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'journal' && activeTab !== 'journal' && !activeEntry) {
            // retain active session or start fresh
          }
          setActiveTab(tab);
        }}
        onSignOut={handleSignOut}
        recentEntries={entries}
        onOpenEntry={handleOpenInJournal}
        decisionDraftCount={draftCount}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main App Workspace (Matching Design HTML) */}
      <main className="flex-1 flex flex-col bg-slate-50 h-full overflow-hidden relative">
        {dataError && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between z-20 shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{dataError}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadUserData(user.uid)}
                disabled={dataLoading}
                className="px-2.5 py-1 bg-amber-200/70 hover:bg-amber-200 font-semibold rounded text-amber-900 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${dataLoading ? 'animate-spin' : ''}`} />
                <span>Retry</span>
              </button>
              <button 
                onClick={() => setDataError(null)}
                className="p-1 text-amber-700 hover:text-amber-900 rounded cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            user={user}
            entries={entries}
            decisions={decisions}
            onNavigate={(tab) => setActiveTab(tab)}
            onOpenEntry={(entry) => handleOpenInJournal(entry)}
            onOpenDecision={() => setActiveTab('decisions')}
            onStartNewReflection={handleStartNewReflection}
            onOpenMobileMenu={() => setMobileSidebarOpen(true)}
          />
        )}

        <div className={`flex-1 flex flex-col h-full overflow-hidden ${activeTab === 'journal' ? '' : 'hidden'}`}>
          <JournalView
            key={journalSessionKey}
            user={user}
            activeEntry={activeEntry}
            onEntrySaved={handleEntrySaved}
            onDecisionSaved={handleDecisionSaved}
            onNewSession={handleStartNewReflection}
            onOpenMobileMenu={() => setMobileSidebarOpen(true)}
          />
        </div>

        {activeTab === 'decisions' && (
          <DecisionCardsView
            user={user}
            decisions={decisions}
            isLoading={dataLoading}
            onDecisionUpdated={handleDecisionUpdated}
            onDecisionDeleted={handleDecisionDeleted}
            onNavigate={(tab) => setActiveTab(tab)}
            onStartNewReflection={handleStartNewReflection}
            onOpenMobileMenu={() => setMobileSidebarOpen(true)}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            user={user}
            entries={entries}
            onOpenInJournal={handleOpenInJournal}
            onEntryDeleted={handleEntryDeleted}
            onNavigate={(tab) => setActiveTab(tab)}
            onStartNewSession={handleStartNewReflection}
            onOpenMobileMenu={() => setMobileSidebarOpen(true)}
          />
        )}
      </main>

    </div>
  );
}
