import React from 'react';

interface SentinelLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'dark' | 'light';
  showSubtitle?: boolean;
  className?: string;
}

export const SentinelLogo: React.FC<SentinelLogoProps> = ({
  size = 'md',
  variant = 'light',
  showSubtitle = false,
  className = ''
}) => {
  const isDark = variant === 'dark';

  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  const titleSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Precision Geometric Sentinel Mark */}
      <div 
        className={`relative ${iconSizes[size]} shrink-0 rounded-lg overflow-hidden shadow-xs flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 p-1.5`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full text-white"
        >
          {/* Geometric Sentinel Shield */}
          <path
            d="M12 2.5L4.5 5.8V11.8C4.5 16.5 7.7 20.6 12 21.8C16.3 20.6 19.5 16.5 19.5 11.8V5.8L12 2.5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white"
          />
          {/* Inner Clarity Diamond / Decision Compass Facet */}
          <path
            d="M12 7.2L15.8 11.5L12 15.8L8.2 11.5L12 7.2Z"
            fill="currentColor"
            className="text-white/20"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          {/* Central Sentinel Beacon */}
          <circle cx="12" cy="11.5" r="1.5" fill="#FFFFFF" />
        </svg>
      </div>

      {/* Wordmark */}
      <div className="flex flex-col text-left">
        <span
          className={`font-bold ${titleSizes[size]} tracking-tight leading-none ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          Sentinel
        </span>
        {showSubtitle && (
          <span className={`text-[10px] font-medium tracking-wide mt-0.5 ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Private Decision Vault
          </span>
        )}
      </div>
    </div>
  );
};
