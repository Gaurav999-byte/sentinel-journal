import React, { useState } from 'react';
import { 
  Lock, 
  Sparkles, 
  ArrowRight,
  Fingerprint,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { SentinelLogo } from './SentinelLogo';
import { signInWithGoogle } from '../lib/firebase';

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const user = await signInWithGoogle();
      if (user && onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err: any) {
      const code = err?.code || '';
      const msg = err?.message || '';

      if (
        code === 'auth/popup-closed-by-user' ||
        msg.includes('popup-closed-by-user')
      ) {
        setErrorMessage(
          'Sign-in was cancelled or closed. If you did not see the Google window, please ensure your browser allows popups for this site.'
        );
      } else if (
        code === 'auth/popup-blocked' ||
        msg.includes('popup-blocked') ||
        msg.includes('blocked')
      ) {
        setErrorMessage(
          'Sign-in popup was blocked by your browser. Please allow popups for this site and click Continue with Google again.'
        );
      } else if (
        code === 'auth/cancelled-popup-request' ||
        msg.includes('cancelled-popup-request')
      ) {
        setErrorMessage(
          'A previous sign-in request was cancelled. Please try clicking Continue with Google again.'
        );
      } else if (
        code === 'auth/network-request-failed' ||
        msg.includes('network-request-failed')
      ) {
        setErrorMessage(
          'Network connection error while connecting to Google. Please check your internet connection and try again.'
        );
      } else if (
        code === 'auth/unauthorized-domain' ||
        msg.includes('unauthorized-domain')
      ) {
        setErrorMessage(
          'This domain is not authorized in your Firebase Authentication console settings.'
        );
      } else if (
        code === 'auth/operation-not-allowed' ||
        msg.includes('operation-not-allowed')
      ) {
        setErrorMessage(
          'Google sign-in is not enabled for this project. Please check Firebase console configuration.'
        );
      } else {
        console.warn('Sign-in issue:', err);
        setErrorMessage(
          msg || 'Authentication could not be completed. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans text-slate-800">
      
      {/* Top minimal header */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between">
        <SentinelLogo variant="light" size="md" />
        
        <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-full font-medium shadow-2xs">
          <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="hidden sm:inline">Zero Data Leakage Architecture</span>
          <span className="sm:hidden">Private Vault</span>
        </div>
      </header>

      {/* Hero & Authentication Card */}
      <main className="w-full max-w-5xl mx-auto px-4 pt-4 pb-8 sm:pt-6 sm:pb-10 flex-1 flex flex-col items-center justify-center text-center">
        
        {/* Core Value Header */}
        <div className="max-w-3xl mx-auto mb-5 sm:mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-3 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Private Cognitive Workspace & Decision Engine</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-2.5 leading-snug max-w-2xl sm:max-w-3xl mx-auto">
            A private space to reflect, brainstorm, and resolve real-life decisions.
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl mx-auto">
            Converse candidly with Sentinel about life crossroads and strategic trade-offs. When you reach clarity, formulate structured Decision Cards with complete human approval.
          </p>
        </div>

        {/* Centered Login Card */}
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs text-left mb-8 sm:mb-10">
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Sign in to your private vault</h2>
              <p className="text-xs text-slate-500 mt-0.5">Secure authentication powered by Google & Firebase</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <Fingerprint className="w-4.5 h-4.5" />
            </div>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs leading-relaxed flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            id="btn-google-signin"
            type="button"
            onClick={handleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-all shadow-xs disabled:opacity-75 disabled:cursor-not-allowed group cursor-pointer"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2.5">
                <div className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin shrink-0" />
                <span>Opening Google Sign-In...</span>
              </div>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.1 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.4 0 15.3c0 2.9.7 5.6 1.9 8l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.1-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
                  />
                </svg>
                <span>Continue with Google</span>
                <ArrowRight className="w-4 h-4 ml-1 opacity-70 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>

          {loading && (
            <div className="mt-2.5 text-center">
              <button
                type="button"
                id="btn-cancel-signin"
                onClick={() => {
                  setLoading(false);
                  setErrorMessage(
                    'Sign-in was cancelled. If the Google popup window did not open, check whether your browser blocked popups for this site.'
                  );
                }}
                className="text-xs text-slate-500 hover:text-slate-800 underline transition-colors cursor-pointer"
              >
                Cancel or retry sign-in
              </button>
            </div>
          )}

          {/* User-facing human-friendly security copy */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-start gap-2.5 text-slate-500 text-xs leading-relaxed">
            <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              Your journal stays private to your account. Your reflections and decisions are protected by account-level access controls.
            </p>
          </div>
        </div>

        {/* 4 Architectural Security Pillars */}
        <div className="w-full max-w-5xl">
          <div className="text-left mb-2.5 px-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Privacy & Security Architecture
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 w-full text-left">
            <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors flex flex-col justify-between h-full">
              <div>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <ShieldCheck className="w-4.5 h-4.5" />
                </div>
                <h3 className="font-semibold text-slate-900 text-xs sm:text-sm mb-1">User Isolation</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Your journal entries and decision cards remain strictly isolated to your verified account. No cross-user access is permitted.
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors flex flex-col justify-between h-full">
              <div>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                  <Cpu className="w-4.5 h-4.5" />
                </div>
                <h3 className="font-semibold text-slate-900 text-xs sm:text-sm mb-1">Server-Side Gemini</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  All AI reasoning runs through authenticated backend services. Model credentials and API keys are never exposed to browser clients.
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors flex flex-col justify-between h-full">
              <div>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-4.5 h-4.5" />
                </div>
                <h3 className="font-semibold text-slate-900 text-xs sm:text-sm mb-1">Human Approval</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  AI syntheses never convert into permanent decisions automatically. You review, refine, and sign off on every action card.
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors flex flex-col justify-between h-full">
              <div>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                  <EyeOff className="w-4.5 h-4.5" />
                </div>
                <h3 className="font-semibold text-slate-900 text-xs sm:text-sm mb-1">Zero Training Retention</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Your candid thoughts and dilemmas are ephemeral to runtime inference and are never used to train public foundational models.
                </p>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* Minimal Footer */}
      <footer className="w-full border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        Sentinel Journal • Professional Cognitive Workspace
      </footer>

    </div>
  );
};

