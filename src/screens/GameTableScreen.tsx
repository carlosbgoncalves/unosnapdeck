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

  const game = broadcastState.game;
  const players = broadcastState.players;
  const self = broadcastState.self;

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

  return (
    <div className="min-h-screen bg-[#f8f6fb] text-[#20313f] flex flex-col justify-between overflow-hidden relative">
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
      <div className="w-full flex justify-center py-2.5 px-4 z-20 bg-white/90 backdrop-blur-md border-b border-[#e4dfec] shadow-xs">
        <div className="flex gap-3 overflow-x-auto max-w-full pb-1 hide-scrollbar">
          {players.map((p) => {
            const isTurn = p.id === game.currentTurnPlayerId;
            const isSelf = p.id === playerId;

            return (
              <div
                key={p.id}
                className={`flex flex-col items-center min-w-[76px] rounded-2xl p-2 transition-all ${
                  isTurn
                    ? 'bg-[#20313f] text-white ring-4 ring-[#e52b2b] shadow-md scale-105'
                    : isSelf
                    ? 'bg-[#f1ecf8] text-[#20313f] border border-[#ddd8e4]'
                    : 'bg-[#f8f6fb] text-[#484554]'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-white text-[#20313f] font-bold text-xs flex items-center justify-center mb-1 shadow-xs border border-[#ddd8e4]">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold truncate max-w-[70px]">
                  {isSelf ? 'You' : p.name}
                </span>
                <div className="flex items-center gap-1 bg-white/90 text-[#20313f] rounded-full px-2 py-0.5 mt-1 shadow-xs border border-[#e4dfec]">
                  <span className="material-symbols-outlined text-[12px] text-[#20313f]">style</span>
                  <span className="text-xs font-bold">{p.cardCount}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Turn Banner */}
      <div className="flex justify-center my-2 z-20">
        <div
          className={`px-6 py-2 rounded-full font-black text-sm shadow-sm border flex items-center gap-2 ${
            isMyTurn
              ? 'bg-[#e52b2b] text-white border-[#b91c1c] animate-bounce'
              : 'bg-white text-[#20313f] border-[#e4dfec]'
          }`}
        >
          <span className="material-symbols-outlined text-lg">
            {isMyTurn ? 'pan_tool' : 'hourglass_empty'}
          </span>
          <span>{isMyTurn ? "Your Turn!" : `${currentTurnPlayer?.name || 'Player'}'s turn`}</span>
        </div>
      </div>

      {/* Main Play Area (Center) */}
      <div className="flex-1 flex flex-col items-center justify-center relative my-2 px-4">
        {/* Play Direction Indicator */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
          <span
            className={`material-symbols-outlined text-[240px] text-[#20313f] transition-all duration-1000 ${
              game.turnDirection === 1 ? 'rotate-0' : 'rotate-180'
            }`}
          >
            sync
          </span>
        </div>

        <div className="flex items-center justify-center gap-8 sm:gap-16 z-10 py-4">
          {/* Draw Pile */}
          <div className="relative flex flex-col items-center group">
            <CardComponent
              isBack
              roomId={roomId}
              size="lg"
              onClick={isMyTurn ? onDrawCard : undefined}
            />
            {isMyTurn && (
              <button
                onClick={onDrawCard}
                className="mt-3 px-5 py-2 bg-[#e52b2b] text-white font-black text-xs sm:text-sm rounded-full flex items-center gap-1.5 shadow-md hover:bg-[#b91c1c] transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">pan_tool_alt</span>
                Draw Card
              </button>
            )}
            <div className="absolute -top-4 -right-4 w-9 h-9 bg-[#20313f] text-white font-black text-xs sm:text-sm rounded-full flex items-center justify-center border-2 border-white shadow-lg z-20">
              {game.drawPileCount}
            </div>
          </div>

          {/* Discard Pile */}
          <div className="relative flex flex-col items-center">
            {game.topDiscard ? (
              <CardComponent
                card={game.topDiscard}
                roomId={roomId}
                size="lg"
                isPlayable={false}
              />
            ) : (
              <div className="w-40 h-60 sm:w-48 sm:h-72 rounded-3xl border-4 border-dashed border-[#ddd8e4] flex items-center justify-center text-[#797586] font-bold">
                Empty
              </div>
            )}
            {game.activeColor && (
              <div className="mt-3 text-xs sm:text-sm font-black text-[#20313f] bg-white px-4 py-1.5 rounded-full border border-[#e4dfec] flex items-center gap-2 shadow-sm">
                Active Color:{' '}
                <span
                  className="inline-block w-4 h-4 rounded-full border border-black/10 shadow-xs"
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
      <div className="w-full bg-white/95 backdrop-blur-md pt-4 pb-8 px-4 border-t border-[#e4dfec] z-30 shadow-2xl">
        <div className="flex justify-between items-center max-w-5xl mx-auto mb-3 px-2">
          <span className="text-sm font-black text-[#20313f] flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-[#1a52e8]">style</span>
            Your Hand ({self.hand.length} cards)
          </span>
          <div className="flex items-center gap-3">
            {isMyTurn && (
              <span className="text-xs sm:text-sm font-black text-[#e52b2b] animate-pulse">
                Select a card to play
              </span>
            )}
            {onQuitGame && (
              <button
                onClick={() => setShowQuitConfirm(true)}
                className="px-3 py-1 bg-[#fee2e2] hover:bg-[#e52b2b] text-[#e52b2b] hover:text-white text-xs font-bold rounded-full transition-all border border-[#fca5a5] flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xs">logout</span>
                Quit Game
              </button>
            )}
          </div>
        </div>

        {/* Card Hand Container with Enhanced Overlap & Large Visual Size */}
        <div className="w-full overflow-x-auto hide-scrollbar py-4 px-2">
          <div className="flex justify-center gap-2 sm:gap-4 min-w-max mx-auto px-6">
            {self.hand.map((card) => {
              const playable = isPlayableCard(card);
              return (
                <CardComponent
                  key={card.id}
                  card={card}
                  roomId={roomId}
                  isPlayable={playable}
                  size="lg"
                  onClick={() => handleCardClick(card)}
                />
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
