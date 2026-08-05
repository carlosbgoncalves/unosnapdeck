import React from 'react';
import { Logo } from './Logo.tsx';

interface HeaderProps {
  playerName?: string;
  isHost?: boolean;
  roomId?: string;
  onHomeClick?: () => void;
  onQuit?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ playerName, isHost, roomId, onHomeClick, onQuit }) => {
  return (
    <header className="w-full top-0 sticky z-40 bg-[#ffffff] shadow-[0px_4px_16px_rgba(32,49,63,0.08)] border-b border-[#e4dfec]">
      <div className="flex justify-between items-center px-4 sm:px-8 py-2.5 w-full max-w-7xl mx-auto">
        {/* Brand Logo */}
        <div 
          className="flex items-center gap-2 cursor-pointer group"
          onClick={onHomeClick}
        >
          <Logo size="sm" />
          {roomId && (
            <span className="text-[11px] font-bold text-[#e52b2b] bg-[#fee2e2] px-2 py-0.5 rounded-full inline-block border border-[#fca5a5]">
              Room #{roomId}
            </span>
          )}
        </div>

        {/* Player Profile & Quit info */}
        <div className="flex items-center gap-3">
          {playerName && (
            <div className="flex items-center gap-2.5 bg-[#f1ecf8] px-3.5 py-1.5 rounded-full border border-[#ddd8e4] shadow-sm">
              <div className="w-7 h-7 rounded-full bg-[#20313f] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {playerName.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden xs:block">
                <div className="text-sm font-bold text-[#20313f] flex items-center gap-1.5">
                  {playerName}
                  {isHost && (
                    <span className="text-[10px] font-extrabold text-white bg-[#e52b2b] px-2 py-0.2 rounded-full tracking-wide uppercase">
                      Host
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {onQuit && (
            <button
              onClick={onQuit}
              className="px-3 py-1.5 bg-[#fee2e2] hover:bg-[#fca5a5] text-[#e52b2b] hover:text-white font-extrabold text-xs rounded-full transition-all border border-[#fca5a5] flex items-center gap-1 cursor-pointer shadow-xs"
              title="Quit Game"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              <span className="hidden sm:inline">Quit</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
