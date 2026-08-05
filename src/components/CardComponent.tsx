import React from 'react';
import { Card, CardColor, CardRank } from '../types.ts';

interface CardComponentProps {
  card?: Card;
  isBack?: boolean;
  roomId?: string;
  isPlayable?: boolean;
  onClick?: () => void;
  className?: string;
  isLifted?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const COLOR_BG: Record<CardColor, string> = {
  RED: 'bg-[#e52b2b] text-white',
  YELLOW: 'bg-[#f5b812] text-[#20313f]',
  GREEN: 'bg-[#38a34a] text-white',
  BLUE: 'bg-[#2b70c9] text-white',
  WILD: 'bg-gradient-to-tr from-[#20313f] via-[#e52b2b] to-[#f5b812] text-white',
};

export const CardComponent: React.FC<CardComponentProps> = ({
  card,
  isBack = false,
  roomId,
  isPlayable = true,
  onClick,
  className = '',
  isLifted = false,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-20 h-28 text-xs',
    md: 'w-28 h-40 sm:w-32 sm:h-48 text-sm',
    lg: 'w-36 h-52 sm:w-40 sm:h-56 text-base',
  }[size];

  if (isBack) {
    return (
      <div
        onClick={onClick}
        className={`card-stock ${sizeClasses} rounded-2xl bg-[#20313f] text-white flex flex-col items-center justify-center cursor-pointer select-none relative overflow-hidden group border-4 border-white shadow-md hover:scale-105 transition-transform ${className}`}
      >
        <img
          src="/logo.svg"
          alt="Snap Deck"
          className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform"
        />
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  }

  if (!card) return null;

  const bgStyle = COLOR_BG[card.color] || COLOR_BG.WILD;

  // Render rank icon
  const renderRankSymbol = (rank: CardRank) => {
    switch (rank) {
      case 'SKIP': return <span className="material-symbols-outlined font-bold text-2xl">block</span>;
      case 'REVERSE': return <span className="material-symbols-outlined font-bold text-2xl">sync_alt</span>;
      case 'DRAW2': return <span className="font-bold text-xl">+2</span>;
      case 'WILD': return <span className="material-symbols-outlined font-bold text-2xl">palette</span>;
      case 'WILD4': return <span className="font-bold text-2xl">+4</span>;
      default: return <span className="font-extrabold text-3xl">{rank}</span>;
    }
  };

  const cardImgUrl = roomId
    ? `/api/rooms/${roomId}/card-image/${card.color}/${card.rank}`
    : null;

  return (
    <div
      onClick={onClick}
      className={`card-stock ${sizeClasses} ${bgStyle} rounded-2xl flex flex-col justify-between p-2.5 relative select-none transition-all duration-200 border-4 border-white ${
        isPlayable ? 'cursor-pointer hover:scale-105 active:scale-95' : 'opacity-60 cursor-not-allowed filter grayscale-[20%]'
      } ${isLifted ? 'card-lifted shadow-2xl ring-4 ring-[#fe7e4f]' : ''} ${className}`}
    >
      {/* Top Left Badge */}
      <div className="w-7 h-7 rounded-full bg-white text-[#1c1a23] flex items-center justify-center shadow-sm font-bold text-xs self-start pointer-events-none">
        {card.rank === 'SKIP' ? '🚫' : card.rank === 'REVERSE' ? '🔄' : card.rank === 'DRAW2' ? '+2' : card.rank === 'WILD' ? '🌈' : card.rank === 'WILD4' ? '+4' : card.rank}
      </div>

      {/* Center Display: Photo or Symbol */}
      <div className="flex-1 flex items-center justify-center my-1 relative overflow-hidden rounded-xl bg-white/20 border border-white/30 pointer-events-none">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {renderRankSymbol(card.rank)}
        </div>
        {cardImgUrl && (
          <img
            src={cardImgUrl}
            alt={`${card.color} ${card.rank}`}
            className="w-full h-full object-cover rounded-xl relative z-10 pointer-events-none"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        )}
      </div>

      {/* Bottom Right Badge (Inverted) */}
      <div className="w-7 h-7 rounded-full bg-white text-[#1c1a23] flex items-center justify-center shadow-sm font-bold text-xs self-end transform rotate-180 pointer-events-none">
        {card.rank === 'SKIP' ? '🚫' : card.rank === 'REVERSE' ? '🔄' : card.rank === 'DRAW2' ? '+2' : card.rank === 'WILD' ? '🌈' : card.rank === 'WILD4' ? '+4' : card.rank}
      </div>
    </div>
  );
};
