import React, { useState, useEffect } from 'react';
import { Logo } from '../components/Logo.tsx';

interface JoinScreenProps {
  roomId: string;
  inviteToken: string;
  onJoinSuccess: (playerId: string, playerName: string, quota: number) => void;
}

export const JoinScreen: React.FC<JoinScreenProps> = ({ roomId, inviteToken, onJoinSuccess }) => {
  const [playerName, setPlayerName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateToken = () => {
    setIsLoading(true);
    setError(null);

    fetch(`/api/rooms/${roomId}/join/${inviteToken}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Server returned ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data.isJoined && data.existingName) {
          setPlayerName(data.existingName);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('[JoinScreen] Validation failed:', { roomId, inviteToken: inviteToken.slice(0, 6) + '...', error: err.message });
        setError(err.message);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    validateToken();
  }, [roomId, inviteToken]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    setIsJoining(true);
    setError(null);

    fetch(`/api/rooms/${roomId}/join/${inviteToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName: playerName.trim() }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Could not join room');
        }
        return res.json();
      })
      .then((data) => {
        onJoinSuccess(data.playerId, data.name, data.quota);
      })
      .catch((err) => {
        setError(err.message);
        setIsJoining(false);
      });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f6fb] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#20313f] border-t-transparent rounded-full animate-spin" />
          <p className="font-bold text-[#20313f]">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f8f6fb] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm max-w-md w-full text-center border border-[#e4dfec]">
          <div className="w-16 h-16 bg-[#fee2e2] text-[#e52b2b] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#fca5a5]">
            <span className="material-symbols-outlined text-3xl">error</span>
          </div>
          <h2 className="text-2xl font-black text-[#20313f]">Invitation Error</h2>
          <p className="text-sm font-semibold text-[#484554] mt-2 mb-6">{error}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={validateToken}
              className="inline-block bg-[#2b70c9] text-white px-6 py-3 rounded-full text-sm font-bold shadow-sm hover:bg-[#1d5ba8] transition-all"
            >
              Retry
            </button>
            <a
              href="/"
              className="inline-block bg-[#20313f] text-white px-6 py-3 rounded-full text-sm font-bold shadow-sm hover:bg-[#2b70c9] transition-all"
            >
              Create New Game
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f6fb] text-[#20313f] flex items-center justify-center p-5 relative overflow-hidden">
      <main className="w-full max-w-md z-10 relative">
        <div className="bg-white border border-[#e4dfec] rounded-3xl p-8 flex flex-col items-center text-center shadow-sm">
          {/* Logo Header */}
          <Logo size="lg" showText={false} className="mb-4" />

          <h1 className="text-3xl font-black text-[#20313f] mb-2 tracking-tight">You're Invited!</h1>
          <p className="text-sm font-semibold text-[#484554] mb-6">
            Join the custom photo card game <span className="font-extrabold text-[#e52b2b]">Snap Deck</span>.
          </p>

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
            <div className="flex flex-col gap-2 text-left relative">
              <label htmlFor="playerName" className="text-xs font-extrabold text-[#20313f] uppercase tracking-wider">
                Your Name
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#797586]">
                  person
                </span>
                <input
                  id="playerName"
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="e.g. CardMaster99"
                  required
                  className="w-full bg-[#f8f6fb] border border-[#ddd8e4] text-[#20313f] font-bold text-base rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#2b70c9]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isJoining}
              className="w-full bg-[#e52b2b] text-white font-black text-lg rounded-full py-4 px-8 shadow-md hover:bg-[#dc2626] transition-all flex items-center justify-center gap-2 disabled:opacity-60 border-2 border-[#b91c1c]"
            >
              <span>{isJoining ? 'Joining...' : 'Join Game'}</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-2 text-[#484554] text-xs font-bold opacity-70">
            <span className="material-symbols-outlined text-sm">verified</span>
            <span>Snap Deck Room</span>
          </div>
        </div>
      </main>
    </div>
  );
};
