"use client";

interface HeaderProps {
  isLive?: boolean;
}

export function Header({ isLive = true }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur border-b border-slate-700 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg className="w-8 h-8 text-solar" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <h1 className="text-lg font-semibold">Solar House</h1>
        </div>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1 text-xs text-text-secondary">
              <span className="w-2 h-2 rounded-full bg-grid-export pulse-active"></span>
              Live
            </span>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse-glow {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        .pulse-active {
          animation: pulse-glow 2s ease-in-out infinite;
        }
      `}</style>
    </header>
  );
}
