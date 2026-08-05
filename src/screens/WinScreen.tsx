import React, { useEffect, useState } from 'react';
import { GameWinner } from '../types.ts';
import { Logo } from '../components/Logo.tsx';

interface WinScreenProps {
  winnerData: GameWinner;
  onLeaveGame: () => void;
}

export const WinScreen: React.FC<WinScreenProps> = ({ winnerData, onLeaveGame }) => {
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; delay: number; color: string }>>([]);

  useEffect(() => {
    // Generate confetti particles
    const colors = ['#20313f', '#e52b2b', '#2b70c9', '#f5b812', '#38a34a'];
    const particles = Array.from({ length: 40 }).map((_, idx) => ({
      id: idx,
      left: Math.random() * 100,
      delay: Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setConfetti(particles);
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f6fb] text-[#20313f] relative font-medium overflow-x-hidden flex flex-col items-center justify-center p-5">
      {/* Confetti */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {confetti.map((p) => (
          <div
            key={p.id}
            className="absolute w-3 h-3 rounded-full animate-fall"
            style={{
              left: `${p.left}%`,
              animationDelay: `${p.delay}s`,
              backgroundColor: p.color,
            }}
          />
        ))}
      </div>

      {/* Main Card */}
      <div className="z-10 flex flex-col items-center max-w-lg w-full bg-white rounded-3xl shadow-sm border border-[#e4dfec] p-8 relative overflow-hidden my-6">
        {/* Logo */}
        <Logo size="md" showText={false} className="mb-4" />

        {/* Winner Announcement */}
        <div className="text-center z-10 mb-6 flex flex-col items-center">
          <div className="relative w-28 h-28 mb-4 rounded-full bg-[#f5b812] p-1.5 shadow-md flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-[#20313f] text-white flex items-center justify-center font-black text-4xl">
              {winnerData.name.charAt(0).toUpperCase()}
            </div>
            <span className="absolute -bottom-2 -right-2 bg-[#e52b2b] text-white rounded-full p-2 shadow-sm">
              <span className="material-symbols-outlined text-2xl">emoji_events</span>
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#20313f] tracking-tight mb-2">
            {winnerData.name} Wins!
          </h1>
          <p className="text-xs font-bold text-[#484554] bg-[#f1ecf8] px-4 py-1.5 rounded-full border border-[#ddd8e4]">
            Game finished in {winnerData.turnCount} turns
          </p>
        </div>

        {/* Standings */}
        <div className="w-full bg-[#f8f6fb] rounded-2xl p-5 mb-6 border border-[#ddd8e4]">
          <h2 className="text-base font-extrabold text-[#20313f] mb-3 uppercase tracking-wider">Final Standings</h2>
          <div className="flex flex-col gap-2">
            {winnerData.standings.map((s, idx) => (
              <div
                key={s.playerId}
                className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#e4dfec]"
              >
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-sm text-[#e52b2b] w-5">#{idx + 1}</span>
                  <div className="w-8 h-8 rounded-full bg-[#20313f] text-white font-bold text-xs flex items-center justify-center">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-bold text-sm text-[#20313f]">{s.name}</span>
                </div>
                <div className="flex items-center gap-1 text-[#484554] font-bold text-xs">
                  <span className="material-symbols-outlined text-sm">style</span>
                  <span>{s.cardCount} card{s.cardCount !== 1 ? 's' : ''} left</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy Note */}
        <div className="flex items-center gap-1.5 text-[#484554] text-xs font-bold mb-6 text-center justify-center opacity-80">
          <span className="material-symbols-outlined text-base text-[#38a34a]">verified_user</span>
          <p>Photos and game data have been securely deleted from our servers.</p>
        </div>

        {/* Action Button */}
        <button
          onClick={onLeaveGame}
          className="w-full bg-[#20313f] text-white font-black text-lg py-4 rounded-full shadow-md hover:bg-[#2b70c9] transition-all flex items-center justify-center gap-2"
        >
          <span>Leave Game</span>
          <span className="material-symbols-outlined">exit_to_app</span>
        </button>
      </div>

      {/* Confetti Falling Animation Style */}
      <style>{`
        @keyframes fall {
          0% { transform: translateY(-50px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
        .animate-fall {
          animation: fall 3s linear infinite;
        }
      `}</style>
    </div>
  );
};
