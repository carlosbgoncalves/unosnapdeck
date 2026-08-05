import React, { useState } from 'react';
import { BroadcastPayload, Card, CardColor } from '../types.ts';
import { CardComponent } from '../components/CardComponent.tsx';
import { ColorPickerModal } from '../components/ColorPickerModal.tsx';

interface GameTableScreenProps {
  roomId: string;
  playerId: string;
  broadcastState: BroadcastPayload;
  onPlayCard: (cardId: string, chosenColor?: CardColor) => void;
  onDrawCard: () => void;
  onQuitGame?: () => void;
}

export const GameTableScreen: React.FC<GameTableScreenProps> = ({
  roomId,
  playerId,
  broadcastState,
  onPlayCard,
  onDrawCard,
  onQuitGame,
}) => {
  const [selectedWildCardId, setSelectedWildCardId] = useState<string | null>(null);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>(() => {
    if (typeof window === 'undefined') return 'desktop';
    if (window.innerWidth < 640) return 'mobile';
    if (window.innerWidth < 1024) return 'tablet';
    return 'desktop';
  });

  React.useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 640) setScreenSize('mobile');
      else if (w < 1024) setScreenSize('tablet');
      else setScreenSize('desktop');
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const game = broadcastState.game;
  const players = broadcastState.players;
  const self = broadcastState.self;

  const isMobile = screenSize === 'mobile';
  const isTablet = screenSize === 'tablet';

  const tableCardSize: 'sm' | 'md' | 'lg' = isMobile ? 'sm' : isTablet ? 'md' : 'lg';
  const handCardSize: 'xs' | 'sm' | 'md' | 'lg' = isMobile
    ? self.hand.length > 6 ? 'xs' : 'sm'
    : isTablet
    ? 'md'
    : 'lg';

  // Auto-hide toast message after 3 seconds
  React.useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Preload card images into browser cache for instant rendering
  React.useEffect(() => {
    if (!roomId || !self.hand) return;
    const cardsToPreload = [...self.hand];
    if (game.topDiscard) cardsToPreload.push(game.topDiscard);

    cardsToPreload.forEach((c) => {
      const img = new Image();
      img.src = `/api/rooms/${roomId}/card-image/${c.color}/${c.rank}`;
    });
  }, [roomId, self.hand, game.topDiscard]);

  const isMyTurn = game.currentTurnPlayerId === playerId;
  const currentTurnPlayer = players.find((p) => p.id === game.currentTurnPlayerId);

  // Check if a card is playable
  const isPlayableCard = (card: Card) => {
    if (!isMyTurn) return false;
    if (card.color === 'WILD') return true;
    const topCard = game.topDiscard;
    if (!topCard) return true;
    const currentColor = game.activeColor || topCard.color;
    if (card.color === currentColor) return true;
    if (card.rank === topCard.rank) return true;
    return false;
  };

  const handleCardClick = (card: Card) => {
    if (!isMyTurn) {
      setToastMessage(`It's currently ${currentTurnPlayer?.name || 'another player'}'s turn! Please wait.`);
      return;
    }

    if (!isPlayableCard(card)) {
      const topCard = game.topDiscard;
      const activeColor = game.activeColor || topCard?.color || 'the matching';
      setToastMessage(`Cannot play this card! Must match color (${activeColor}) or rank (${topCard?.rank}).`);
      return;
    }

    if (card.color === 'WILD') {
      setSelectedWildCardId(card.id);
    } else {
      onPlayCard(card.id);
    }
  };

  const handleColorSelect = (color: CardColor) => {
    if (selectedWildCardId) {
      onPlayCard(selectedWildCardId, color);
      setSelectedWildCardId(null);
    }
  };

  const placeholderDimensions = {
    sm: 'w-[110px] h-[154px] text-xs',
    md: 'w-[150px] h-[210px] text-sm',
    lg: 'w-[200px] h-[280px] text-base',
  }[tableCardSize];

  return (
    <div className="min-h-screen max-h-screen bg-[#f8f6fb] text-[#20313f] flex flex-col justify-between overflow-hidden relative">
      <ColorPickerModal
        isOpen={selectedWildCardId !== null}
        onSelectColor={handleColorSelect}
      />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-[#20313f] text-white px-5 py-2.5 rounded-full shadow-2xl font-bold text-xs flex items-center gap-2 border border-white/20 animate-bounce">
          <span className="material-symbols-outlined text-amber-400 text-sm">info</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Player Order Strip (Top) */}
      <div className="w-full flex justify-center py-1.5 sm:py-2.5 px-3 z-20 bg-white/90 backdrop-blur-md border-b border-[#e4dfec] shadow-xs">
        <div className="flex gap-2 sm:gap-3 overflow-x-auto max-w-full pb-0.5 hide-scrollbar">
          {players.map((p) => {
            const isTurn = p.id === game.currentTurnPlayerId;
            const isSelf = p.id === playerId;

            return (
              <div
                key={p.id}
                className={`flex flex-col items-center min-w-[64px] sm:min-w-[76px] rounded-2xl p-1.5 sm:p-2 transition-all ${
                  isTurn
                    ? 'bg-[#20313f] text-white ring-2 sm:ring-4 ring-[#e52b2b] shadow-md scale-105'
                    : isSelf
                    ? 'bg-[#f1ecf8] text-[#20313f] border border-[#ddd8e4]'
                    : 'bg-[#f8f6fb] text-[#484554]'
                }`}
              >
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white text-[#20313f] font-bold text-[10px] sm:text-xs flex items-center justify-center mb-0.5 sm:mb-1 shadow-xs border border-[#ddd8e4]">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-[10px] sm:text-xs font-bold truncate max-w-[60px] sm:max-w-[70px]">
                  {isSelf ? 'You' : p.name}
                </span>
                <div className="flex items-center gap-0.5 sm:gap-1 bg-white/90 text-[#20313f] rounded-full px-1.5 sm:px-2 py-0.5 mt-0.5 shadow-xs border border-[#e4dfec]">
                  <span className="material-symbols-outlined text-[10px] sm:text-[12px] text-[#20313f]">style</span>
                  <span className="text-[10px] sm:text-xs font-bold">{p.cardCount}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Turn Banner */}
      <div className="flex justify-center my-1 sm:my-2 z-20">
        <div
          className={`px-4 sm:px-6 py-1 sm:py-2 rounded-full font-black text-xs sm:text-sm shadow-sm border flex items-center gap-1.5 sm:gap-2 ${
            isMyTurn
              ? 'bg-[#e52b2b] text-white border-[#b91c1c] animate-bounce'
              : 'bg-white text-[#20313f] border-[#e4dfec]'
          }`}
        >
          <span className="material-symbols-outlined text-base sm:text-lg">
            {isMyTurn ? 'pan_tool' : 'hourglass_empty'}
          </span>
          <span>{isMyTurn ? "Your Turn!" : `${currentTurnPlayer?.name || 'Player'}'s turn`}</span>
        </div>
      </div>

      {/* Main Play Area (Center) */}
      <div className="flex-1 flex flex-col items-center justify-center relative my-1 sm:my-2 px-2 sm:px-4 min-h-0">
        {/* Play Direction Indicator */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
          <span
            className={`material-symbols-outlined text-[180px] sm:text-[240px] text-[#20313f] transition-all duration-1000 ${
              game.turnDirection === 1 ? 'rotate-0' : 'rotate-180'
            }`}
          >
            sync
          </span>
        </div>

        <div className="flex items-center justify-center gap-4 sm:gap-10 md:gap-16 z-10 py-1 sm:py-4">
          {/* Draw Pile */}
          <div className="relative flex flex-col items-center group">
            <CardComponent
              isBack
              roomId={roomId}
              size={tableCardSize}
              onClick={isMyTurn ? onDrawCard : undefined}
            />
            {isMyTurn && (
              <button
                onClick={onDrawCard}
                className="mt-2 sm:mt-3 px-3.5 sm:px-5 py-1.5 sm:py-2 bg-[#e52b2b] text-white font-black text-xs sm:text-sm rounded-full flex items-center gap-1 sm:gap-1.5 shadow-md hover:bg-[#b91c1c] transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm sm:text-base">pan_tool_alt</span>
                Draw Card
              </button>
            )}
            <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-7 h-7 sm:w-9 sm:h-9 bg-[#20313f] text-white font-black text-xs sm:text-sm rounded-full flex items-center justify-center border-2 border-white shadow-lg z-20">
              {game.drawPileCount}
            </div>
          </div>

          {/* Discard Pile */}
          <div className="relative flex flex-col items-center">
            {game.topDiscard ? (
              <CardComponent
                card={game.topDiscard}
                roomId={roomId}
                size={tableCardSize}
                isPlayable={false}
              />
            ) : (
              <div className={`rounded-2xl border-4 border-dashed border-[#ddd8e4] flex items-center justify-center text-[#797586] font-bold ${placeholderDimensions}`}>
                Empty
              </div>
            )}
            {game.activeColor && (
              <div className="mt-2 sm:mt-3 text-[11px] sm:text-sm font-black text-[#20313f] bg-white px-3 sm:px-4 py-1 sm:py-1.5 rounded-full border border-[#e4dfec] flex items-center gap-1.5 sm:gap-2 shadow-sm">
                Active Color:{' '}
                <span
                  className="inline-block w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-black/10 shadow-xs"
                  style={{
                    backgroundColor:
                      game.activeColor === 'RED'
                        ? '#e52b2b'
                        : game.activeColor === 'YELLOW'
                        ? '#f5b812'
                        : game.activeColor === 'GREEN'
                        ? '#38a34a'
                        : game.activeColor === 'BLUE'
                        ? '#2b70c9'
                        : '#20313f',
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Player's Hand (Bottom) */}
      <div className="w-full bg-white/95 backdrop-blur-md pt-2 sm:pt-4 pb-4 sm:pb-8 px-2 sm:px-4 border-t border-[#e4dfec] z-30 shadow-2xl shrink-0">
        <div className="flex justify-between items-center max-w-5xl mx-auto mb-1.5 sm:mb-3 px-2">
          <span className="text-xs sm:text-sm font-black text-[#20313f] flex items-center gap-1.5 sm:gap-2">
            <span className="material-symbols-outlined text-sm sm:text-base text-[#1a52e8]">style</span>
            Your Hand ({self.hand.length} cards)
          </span>
          <div className="flex items-center gap-2 sm:gap-3">
            {isMyTurn && (
              <span className="text-[10px] sm:text-sm font-black text-[#e52b2b] animate-pulse">
                Select a card to play
              </span>
            )}
            {onQuitGame && (
              <button
                onClick={() => setShowQuitConfirm(true)}
                className="px-2.5 sm:px-3 py-0.5 sm:py-1 bg-[#fee2e2] hover:bg-[#e52b2b] text-[#e52b2b] hover:text-white text-[10px] sm:text-xs font-bold rounded-full transition-all border border-[#fca5a5] flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xs">logout</span>
                Quit Game
              </button>
            )}
          </div>
        </div>

        {/* Card Hand Container with Overlap & Dynamic Sizing */}
        <div className="w-full overflow-x-auto hide-scrollbar py-2 sm:py-4 px-2">
          <div className="flex justify-center items-end min-w-max mx-auto px-4 pb-2">
            {self.hand.map((card, index) => {
              const playable = isPlayableCard(card);
              const overlapClass = index > 0
                ? isMobile
                  ? handCardSize === 'xs' ? '-ml-7' : '-ml-10'
                  : isTablet
                  ? '-ml-12'
                  : '-ml-14'
                : '';

              return (
                <div
                  key={card.id}
                  className={`transition-transform duration-200 hover:z-40 hover:-translate-y-4 ${overlapClass}`}
                  style={{ zIndex: index + 10 }}
                >
                  <CardComponent
                    card={card}
                    roomId={roomId}
                    isPlayable={playable}
                    size={handCardSize}
                    onClick={() => handleCardClick(card)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quit Game Confirmation Modal */}
      {showQuitConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center border border-[#e4dfec]">
            <div className="w-12 h-12 rounded-full bg-[#fee2e2] text-[#e52b2b] flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-2xl">logout</span>
            </div>
            <h3 className="font-extrabold text-lg text-[#20313f] mb-2">Quit Game?</h3>
            <p className="text-xs text-[#484554] font-medium mb-6">
              Are you sure you want to quit? Your cards will be returned to the draw pile, and the remaining players will continue the game.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="flex-1 py-2.5 rounded-full border border-[#ddd8e4] font-bold text-xs text-[#20313f] hover:bg-[#f1ecf8] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowQuitConfirm(false);
                  if (onQuitGame) onQuitGame();
                }}
                className="flex-1 py-2.5 rounded-full bg-[#e52b2b] hover:bg-[#b91c1c] text-white font-bold text-xs transition-all shadow-md cursor-pointer"
              >
                Yes, Quit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
