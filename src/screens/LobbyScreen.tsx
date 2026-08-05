import React from 'react';
import { BroadcastPayload } from '../types.ts';
import { Logo } from '../components/Logo.tsx';

interface LobbyScreenProps {
  roomId: string;
  playerId: string;
  isHost: boolean;
  hostToken?: string;
  broadcastState?: BroadcastPayload | null;
  onStartGame: () => void;
  isStarting?: boolean;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  roomId,
  playerId,
  isHost,
  broadcastState,
  onStartGame,
  isStarting,
}) => {
  const players = broadcastState?.players || [];
  const joinedCount = players.filter((p) => p.joined).length;
  const totalPlayers = broadcastState?.nPlayers || players.length || 4;
  const allJoined = joinedCount >= totalPlayers;

  // Format selected theme display name
  const themeId = broadcastState?.self.selectedTheme || 'theme';
  const themeName =
    themeId === 'dream_houses'
      ? 'Dream Houses'
      : themeId === 'muscle_cars'
      ? 'Muscle Cars'
      : themeId === 'professional_monkeys'
      ? 'Professional Monkeys'
      : themeId === 'tropical_beaches'
      ? 'Tropical Beaches'
      : themeId === 'martian_women'
      ? 'Women from Mars'
      : themeId;

  return (
    <div className="min-h-screen bg-[#f8f6fb] text-[#20313f] flex flex-col font-medium">
      <main className="flex-grow w-full max-w-4xl mx-auto px-5 py-8 pb-28 flex flex-col gap-8">
        {/* Header Section */}
        <section className="flex flex-col items-center justify-center text-center gap-3">
          <Logo size="md" showText={false} />
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <div className="bg-[#20313f] text-white rounded-full px-5 py-1.5 shadow-xs flex items-center gap-2 border border-[#20313f]">
              <span className="material-symbols-outlined text-lg">groups</span>
              <span className="text-xs font-black tracking-wider uppercase">Lobby #{roomId}</span>
            </div>
            <div className="bg-[#e8f5e9] text-[#2e7d32] border border-[#a5d6a7] rounded-full px-4 py-1.5 flex items-center gap-1.5 shadow-xs">
              <span className="material-symbols-outlined text-base">palette</span>
              <span className="text-xs font-black tracking-wider uppercase">Theme: {themeName}</span>
            </div>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-[#20313f] tracking-tight">Get Ready to Play!</h2>
          <p className="text-sm font-semibold text-[#484554] max-w-xl mx-auto">
            Waiting for players to join the game lobby before the host starts the round.
          </p>
        </section>

        {/* Theme Banner */}
        <section className="bg-white border border-[#e4dfec] rounded-2xl p-5 flex items-center gap-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-[#20313f] text-white flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">style</span>
          </div>
          <div>
            <p className="font-black text-[#20313f] text-sm">🎨 Selected Theme: {themeName}</p>
            <p className="text-xs font-medium text-[#484554] mt-0.5">
              The card deck has been pre-configured with photos from the {themeName} collection for all players.
            </p>
          </div>
        </section>

        {/* Player List */}
        <section className="flex flex-col gap-3">
          <h3 className="text-lg font-black text-[#20313f] mb-1 flex items-center gap-2 uppercase tracking-wide">
            <span className="material-symbols-outlined">group</span>
            Players ({joinedCount} / {totalPlayers})
          </h3>

          <div className="grid grid-cols-1 gap-3">
            {players.map((p) => {
              const isSelf = p.id === playerId;

              return (
                <div
                  key={p.id}
                  className={`rounded-2xl p-4 flex items-center justify-between border transition-all ${
                    p.joined ? 'bg-white border-[#e4dfec] shadow-xs' : 'bg-[#f8f6fb] border-dashed border-[#ddd8e4] opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-11 h-11 rounded-full bg-[#20313f] text-white flex items-center justify-center font-bold text-base shadow-xs">
                        {p.name ? p.name.charAt(0).toUpperCase() : '?'}
                      </div>
                      {p.isHost && (
                        <div
                          className="absolute -bottom-1 -right-1 bg-[#e52b2b] text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-xs"
                          title="Host"
                        >
                          <span className="material-symbols-outlined text-[12px]">star</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-base text-[#20313f] flex items-center gap-2">
                        {p.name}
                        {isSelf && <span className="text-xs text-[#2b70c9] font-black">(You)</span>}
                        {p.isHost && <span className="text-xs text-[#484554] font-semibold">(Host)</span>}
                      </p>
                      {p.joined && (
                        <p className="text-xs font-medium text-[#484554] flex items-center gap-1.5 mt-0.5">
                          <span className="bg-[#e8f5e9] text-[#2e7d32] border border-[#a5d6a7] px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-xs">check</span>
                            Deck Ready
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    {!p.joined ? (
                      <span className="bg-[#f1ecf8] text-[#484554] border border-[#ddd8e4] rounded-full px-3 py-1 text-xs font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">hourglass_empty</span>
                        Waiting...
                      </span>
                    ) : (
                      <span className="bg-[#dcfce7] text-[#166534] border border-[#bbf7d0] rounded-full px-3.5 py-1 text-xs font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        Joined
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Action Controls */}
        <section className="mt-4 flex flex-col items-center gap-4">
          {isHost ? (
            <div className="w-full flex flex-col items-center gap-2">
              <button
                onClick={onStartGame}
                disabled={!allJoined || isStarting}
                className={`w-full max-w-sm py-4 rounded-full font-black text-lg flex items-center justify-center gap-2 transition-all ${
                  allJoined && !isStarting
                    ? 'bg-[#20313f] text-white shadow-md hover:bg-[#2b70c9] cursor-pointer'
                    : 'bg-[#ddd8e4] text-[#797586] cursor-not-allowed border border-[#c9c4d7]'
                }`}
              >
                <span className="material-symbols-outlined">play_circle</span>
                {isStarting ? 'Starting Game...' : 'Start Game'}
              </button>
              {!allJoined && (
                <p className="text-xs font-bold text-[#484554] flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">info</span>
                  Waiting for all {totalPlayers} players to join the lobby...
                </p>
              )}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-xs font-bold text-[#484554] flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-base">hourglass_empty</span>
                {allJoined
                  ? 'All players joined! Waiting for host to start...'
                  : 'Waiting for remaining players to join...'}
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
