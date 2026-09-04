import React from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  Compass, 
  Archive, 
  LayoutDashboard, 
  Lock, 
  LogOut 
} from 'lucide-react';
import { SentinelLogo } from './SentinelLogo';
import type { AuthUser, ViewTab } from '../types';

interface NavbarProps {
  user: AuthUser;
  activeTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  onSignOut: () => void;
  decisionDraftCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  onSelectTab,
  onSignOut,
  decisionDraftCount = 0
}) => {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <button 
              id="nav-logo-btn"
              onClick={() => onSelectTab('dashboard')} 
              className="text-left group cursor-pointer hover:opacity-90 transition-opacity"
              title="Sentinel Home"
            >
              <SentinelLogo variant="light" size="sm" />
            </button>

            <div className="hidden md:flex items-center gap-1.5 pl-3 ml-3 border-l border-slate-200 text-slate-600 text-xs">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
                <Lock className="w-3 h-3" />
                <span>Private to you</span>
              </span>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              id="nav-tab-dashboard"
              onClick={() => onSelectTab('dashboard')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>

            <button
              id="nav-tab-journal"
              onClick={() => onSelectTab('journal')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'journal'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">AI Journal</span>
            </button>

            <button
              id="nav-tab-decisions"
              onClick={() => onSelectTab('decisions')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all relative cursor-pointer ${
                activeTab === 'decisions'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span className="hidden sm:inline">Decision Cards</span>
              {decisionDraftCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                  {decisionDraftCount}
                </span>
              )}
            </button>

            <button
              id="nav-tab-history"
              onClick={() => onSelectTab('history')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Archive className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </button>
          </nav>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || 'User'} 
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full border border-slate-300 object-cover shadow-xs"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-medium text-xs">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
              )}

              <div className="hidden lg:block text-left text-xs leading-tight">
                <span className="font-semibold text-slate-800 block truncate max-w-[130px]">
                  {user.displayName || 'User'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono block truncate max-w-[130px]">
                  {user.email}
                </span>
              </div>
            </div>

            <button
              id="btn-signout"
              onClick={onSignOut}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
