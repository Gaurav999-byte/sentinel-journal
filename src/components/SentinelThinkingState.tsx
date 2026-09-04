import React, { useState, useEffect } from 'react';
import { Shield, Sparkles } from 'lucide-react';

const REFLECTION_PHRASES = [
  'Sentinel is reflecting on your thoughts...',
  'Unpacking key assumptions & trade-offs...',
  'Analyzing priorities and hidden risks...',
  'Structuring balanced perspective & insights...'
];

export const SentinelThinkingState: React.FC = () => {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % REFLECTION_PHRASES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex gap-3 sm:gap-4 max-w-2xl py-2">
      {/* Sentinel Avatar with calm breathing ring */}
      <div className="relative shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-900 to-blue-900 text-white flex items-center justify-center shadow-xs">
          <Shield className="w-4 h-4 text-blue-300 animate-pulse" />
        </div>
        <div className="absolute -inset-0.5 rounded-xl bg-blue-500/20 blur-xs -z-10 animate-pulse" />
      </div>

      {/* Thinking Content Bubble */}
      <div className="flex-1 bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-slate-800">Sentinel</span>
          <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium border border-blue-100/80 flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            <span>Reflecting</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Subtle 3-pulse cadence */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '180ms' }} />
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '360ms' }} />
          </div>

          <p className="text-xs sm:text-sm text-slate-600 font-medium transition-all duration-300">
            {REFLECTION_PHRASES[phraseIndex]}
          </p>
        </div>

        {/* Minimal progress shimmer */}
        <div className="mt-3 w-full h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-400 via-indigo-500 to-blue-400 rounded-full w-1/2 animate-pulse" />
        </div>
      </div>
    </div>
  );
};
