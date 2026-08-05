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
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const COLOR_MAP: Record<CardColor, { bg: string; border: string }> = {
  RED:    { bg: '#d32f2f', border: '#b71c1c' },
  YELLOW: { bg: '#eab308', border: '#ca8a04' },
  GREEN:  { bg: '#16a34a', border: '#15803d' },
  BLUE:   { bg: '#2563eb', border: '#1d4ed8' },
  WILD:   { bg: '#3b0764', border: '#2e1065' },
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
  // Proportions derived directly from card_design_example.svg
  // (Outer white border: 3%, Color inner rect, photo viewport with white frame)
  const d = {
    xs:  { w: 80,  h: 112, r: 10, outerBdr: 2.5, pad: 3, numSz: 14, tabSz: 18, logoH: 10, photoBorder: 2, bottomH: 18 },
    sm:  { w: 110, h: 154, r: 12, outerBdr: 3,   pad: 4, numSz: 18, tabSz: 24, logoH: 14, photoBorder: 3, bottomH: 24 },
    md:  { w: 150, h: 210, r: 16, outerBdr: 4,   pad: 6, numSz: 26, tabSz: 36, logoH: 20, photoBorder: 4, bottomH: 36 },
    lg:  { w: 200, h: 280, r: 20, outerBdr: 6,   pad: 8, numSz: 36, tabSz: 48, logoH: 28, photoBorder: 5, bottomH: 48 },
    xl:  { w: 250, h: 350, r: 24, outerBdr: 7,   pad: 10, numSz: 46, tabSz: 60, logoH: 36, photoBorder: 6, bottomH: 60 },
  }[size];

  const goldStyle = (isWild: boolean): React.CSSProperties => {
    if (isWild) {
      return {
        fontSize: d.numSz,
        lineHeight: 1,
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
      };
    }
    return {
      fontSize: d.numSz,
      fontWeight: 900,
      fontFamily: "'Quicksand', sans-serif",
      background: 'linear-gradient(180deg, #eebb1b 0%, #f5e6a3 40%, #d4af37 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.45))',
      lineHeight: 1,
    };
  };

  // ════════════════ CARD BACK ════════════════
  if (isBack) {
    return (
      <div
        onClick={onClick}
        className={`relative select-none cursor-pointer group transition-transform duration-200 hover:scale-105 ${className}`}
        style={{
          width: d.w, height: d.h, borderRadius: d.r,
          background: 'white',
          padding: d.outerBdr,
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          overflow: 'hidden', flexShrink: 0,
        }}
      >
        <div style={{
          width: '100%', height: '100%',
          borderRadius: d.r - d.outerBdr,
          background: '#2563eb',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            inset: d.pad,
            borderRadius: d.r - d.outerBdr - 2,
            border: `${d.photoBorder}px solid rgba(255,255,255,0.85)`,
            background: '#0f172a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            <img
              src="/logo.png"
              alt="Snap Deck"
              className="group-hover:scale-110 transition-transform duration-300"
              style={{
                width: '78%', height: '78%', objectFit: 'contain',
                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
              }}
            />
          </div>
        </div>
        {/* Glossy sheen */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: d.r,
          background: 'linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)',
          pointerEvents: 'none',
        }} />
      </div>
    );
  }

  // ════════════════ CARD FACE ════════════════
  if (!card) return null;

  const colorConfig = COLOR_MAP[card.color] || COLOR_MAP.WILD;
  const isWild = card.color === 'WILD';
  const bgStyle = isWild
    ? 'linear-gradient(135deg, #2e1065 0%, #4c1d95 50%, #5b21b6 100%)'
    : colorConfig.bg;

  const getRankDisplay = (rank: CardRank): string => {
    switch (rank) {
      case 'SKIP':    return '⊘';
      case 'REVERSE': return '⇄';
      case 'DRAW2':   return '+2';
      case 'WILD':    return '🌈';
      case 'WILD4':   return '+4';
      default:        return rank;
    }
  };
  const rankText = getRankDisplay(card.rank);

  const cardImgUrl = roomId
    ? `/api/rooms/${roomId}/card-image/${card.color}/${card.rank}`
    : null;

  const photoTop = d.outerBdr + d.pad;
  const photoLeft = d.outerBdr + d.pad;
  const photoRight = d.outerBdr + d.pad;
  const photoBottom = d.outerBdr + d.pad + d.bottomH;

  return (
    <div
      onClick={onClick}
      className={`relative select-none transition-all duration-200 ${
        isPlayable ? 'cursor-pointer hover:scale-105 active:scale-95' : 'opacity-60 cursor-not-allowed'
      } ${isLifted ? 'ring-4 ring-[#fe7e4f] -translate-y-4' : ''} ${className}`}
      style={{
        width: d.w, height: d.h, borderRadius: d.r,
        background: 'white', // Outer White Border from card_design_example.svg
        padding: d.outerBdr,
        boxShadow: isLifted ? '0 16px 40px rgba(0,0,0,0.45)' : '0 6px 20px rgba(0,0,0,0.3)',
        overflow: 'hidden', flexShrink: 0,
      }}
    >
      {/* ── Inner Solid Color Rectangle ── */}
      <div style={{
        width: '100%', height: '100%',
        borderRadius: d.r - d.outerBdr,
        background: bgStyle,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* ── Photo Viewport with Crisp White Border Frame ── */}
        <div style={{
          position: 'absolute',
          top: d.pad, left: d.pad, right: d.pad, bottom: d.pad + d.bottomH,
          borderRadius: d.r - d.outerBdr - 3,
          background: 'white',
          padding: d.photoBorder,
          overflow: 'hidden', zIndex: 5,
        }}>
          {/* Inner image container */}
          <div style={{
            width: '100%', height: '100%',
            borderRadius: (d.r - d.outerBdr - 3) / 1.4,
            overflow: 'hidden',
            position: 'relative',
            background: '#0f172a',
          }}>
            {cardImgUrl && (
              <img
                src={cardImgUrl}
                alt={`${card.color} ${card.rank}`}
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%',
                  objectFit: 'cover', zIndex: 5,
                }}
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
            )}
          </div>
        </div>

        {/* ── Top-Left Corner Cutout Tab ── */}
        <div style={{
          position: 'absolute',
          top: d.pad, left: d.pad,
          width: d.tabSz, height: d.tabSz,
          background: 'white',
          borderBottomRightRadius: d.r - 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10,
        }}>
          <span style={goldStyle(isWild)}>
            {rankText}
          </span>
        </div>

        {/* ── Bottom Bar: Snap Deck logo (left) + Gold Rank (right) directly on Card Color ── */}
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: d.bottomH + d.pad,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: `0 ${d.pad + 4}px`,
          zIndex: 10,
        }}>
          <img
            src="/logo.png"
            alt="Snap Deck"
            style={{
              height: d.logoH, width: 'auto', objectFit: 'contain',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
            }}
          />
          <span style={goldStyle(isWild)}>
            {rankText}
          </span>
        </div>

        {/* ── Glossy Diagonal Sheen ── */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: d.r - d.outerBdr,
          background: 'linear-gradient(135deg, transparent 25%, rgba(255,255,255,0.15) 45%, rgba(255,255,255,0.05) 55%, transparent 75%)',
          pointerEvents: 'none', zIndex: 20,
        }} />
      </div>
    </div>
  );
};
