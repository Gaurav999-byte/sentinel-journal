import React from 'react';
import { 
  LayoutDashboard, 
  Sparkles, 
  Compass, 
  Archive, 
  LogOut, 
  Lock,
  ChevronRight,
  X
} from 'lucide-react';
import { SentinelLogo } from './SentinelLogo';
import type { AuthUser, JournalEntry, DecisionCard, ViewTab } from '../types';

interface SidebarProps {
  user: AuthUser;
  activeTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  onSignOut: () => void;
  recentEntries: JournalEntry[];
  onOpenEntry: (entry: JournalEntry) => void;
  decisionDraftCount?: number;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeTab,
  onSelectTab,
  onSignOut,
  recentEntries,
  onOpenEntry,
  decisionDraftCount = 0,
  mobileOpen = false,
  onCloseMobile
}) => {
  const navItems = [
    {
      id: 'dashboard' as ViewTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'journal' as ViewTab,
      label: 'AI Journal',
      icon: Sparkles,
    },
    {
      id: 'decisions' as ViewTab,
      label: 'Decision Cards',
      icon: Compass,
      badge: decisionDraftCount > 0 ? decisionDraftCount : undefined,
    },
    {
      id: 'history' as ViewTab,
      label: 'History',
      icon: Archive,
    },
  ];

  // User initials
  const initials = user.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : (user.email ? user.email.slice(0, 2).toUpperCase() : 'U');

  const content = (
    <aside className="w-64 bg-slate-900 flex flex-col h-full text-slate-400 font-sans border-r border-slate-800 shrink-0">
      <div className="p-6 flex-1 overflow-y-auto">
        {/* Brand Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => {
              onSelectTab('dashboard');
              onCloseMobile?.();
            }}
            className="text-left cursor-pointer hover:opacity-90 transition-opacity"
            title="Sentinel Home"
          >
            <SentinelLogo variant="dark" size="md" />
          </button>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Primary Navigation */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-link-${item.id}`}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile?.();
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white text-blue-700' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Recent Entries Section (Matching Design HTML) */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <div className="flex items-center justify-between px-4 mb-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Recent Entries
            </h3>
            <button
              id="sidebar-view-all-btn"
              type="button"
              onClick={() => {
                onSelectTab('history');
                onCloseMobile?.();
              }}
              className="text-[11px] font-medium text-slate-500 hover:text-slate-200 transition-colors cursor-pointer px-1 py-0.5 rounded hover:bg-slate-800/60"
              title="View all reflection history"
            >
              View all
            </button>
          </div>

          <div className="space-y-1">
            {recentEntries.length === 0 ? (
              <div className="px-4 py-2 text-xs text-slate-500 italic">
                No saved entries yet
              </div>
            ) : (
              recentEntries.slice(0, 4).map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => {
                    onOpenEntry(entry);
                    onCloseMobile?.();
                  }}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-md cursor-pointer truncate transition-colors flex items-center justify-between group"
                  title={entry.title}
                >
                  <span className="truncate">{entry.title}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Private Vault Badge */}
        <div className="mt-6 px-4 py-3 rounded-lg bg-slate-800/40 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Private encrypted workspace</span>
        </div>
      </div>

      {/* User Footer Profile & Sign Out (Matching Design HTML) */}
      <div className="mt-auto p-4 border-t border-slate-800 bg-slate-900">
        <div className="flex items-center gap-3 mb-3 px-2">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'User'}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full border border-slate-700 object-cover shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-white shrink-0">
              {initials}
            </div>
          )}
          <div className="text-xs truncate">
            <p className="font-medium text-white truncate">
              {user.displayName || 'Reflector'}
            </p>
            <p className="text-slate-500 truncate text-[11px]">
              {user.email || 'Private User'}
            </p>
          </div>
        </div>

        <button
          id="btn-sidebar-signout"
          onClick={onSignOut}
          className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-md transition-colors flex items-center gap-2 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-full shrink-0">
        {content}
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 flex h-full">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
