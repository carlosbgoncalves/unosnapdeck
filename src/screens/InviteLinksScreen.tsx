import React, { useState } from 'react';
import { InviteLink, BroadcastPayload } from '../types.ts';
import { Logo } from '../components/Logo.tsx';

interface InviteLinksScreenProps {
  roomId: string;
  inviteLinks: InviteLink[];
  broadcastState?: BroadcastPayload | null;
  onContinueToLobby: () => void;
}

export const InviteLinksScreen: React.FC<InviteLinksScreenProps> = ({
  roomId,
  inviteLinks,
  broadcastState,
  onContinueToLobby,
}) => {
  const [copiedSlot, setCopiedSlot] = useState<number | null>(null);
  const [showToast, setShowToast] = useState(false);

  const handleCopy = (url: string, slotIndex: number) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedSlot(slotIndex);
      setShowToast(true);
      setTimeout(() => {
        setCopiedSlot(null);
        setShowToast(false);
      }, 2500);
    });
  };

  const handleShare = (url: string) => {
    if (navigator.share) {
      navigator.share({
        title: 'Snap Deck Invitation',
        text: 'Join my Snap Deck photo card game!',
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    }
  };

  const joinedCount = broadcastState
    ? broadcastState.players.filter((p) => p.joined).length
    : 1;

  const totalSlots = broadcastState ? broadcastState.nPlayers : inviteLinks.length;

  return (
    <div className="min-h-screen bg-[#f8f6fb] text-[#20313f] flex flex-col items-center justify-center p-5 relative overflow-x-hidden">
      <main className="w-full max-w-[600px] z-10 flex flex-col gap-6 my-8">
        {/* Header */}
        <header className="text-center flex flex-col items-center gap-2">
          <Logo size="md" showText={false} />
          <h1 className="text-3xl font-black text-[#20313f] tracking-tight">Invite Your Players</h1>
          <p className="text-sm font-semibold text-[#484554] max-w-[85%] mx-auto">
            Send one link to each player. Each link is unique to that player.
          </p>
        </header>

        {/* Player Slots List */}
        <div className="flex flex-col gap-3">
          {inviteLinks.map((link) => {
            const playerInfo = broadcastState?.players.find((p) => p.slotIndex === link.slotIndex);
            const isJoined = playerInfo ? playerInfo.joined : link.slotIndex === 0;
            const playerName = playerInfo ? playerInfo.name : link.slotIndex === 0 ? 'Host' : `Player ${link.slotIndex + 1}`;

            return (
              <div
                key={link.slotIndex}
                className={`rounded-2xl p-4 border border-[#e4dfec] flex flex-col md:flex-row gap-3 items-start md:items-center justify-between transition-all ${
                  isJoined ? 'bg-white shadow-xs' : 'bg-[#f8f6fb] opacity-95'
                }`}
              >
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    isJoined ? 'bg-[#20313f] text-white' : 'bg-[#f1ecf8] text-[#484554]'
                  }`}>
                    {link.slotIndex + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-base text-[#20313f] flex items-center gap-2">
                      {playerName}
                      {link.slotIndex === 0 && (
                        <span className="text-[10px] font-extrabold text-white bg-[#e52b2b] px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Host
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <input
                    type="text"
                    readOnly
                    value={link.inviteUrl}
                    className="flex-1 md:w-44 bg-[#f8f6fb] text-[#484554] text-xs font-mono font-medium rounded-xl border border-[#ddd8e4] px-3 py-2 truncate outline-none"
                  />
                  <button
                    onClick={() => handleCopy(link.inviteUrl, link.slotIndex)}
                    title="Copy Link"
                    className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center transition-all ${
                      copiedSlot === link.slotIndex
                        ? 'bg-[#38a34a] text-white'
                        : 'bg-[#20313f] text-white hover:bg-[#2b70c9]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {copiedSlot === link.slotIndex ? 'check' : 'content_copy'}
                    </span>
                  </button>
                  <button
                    onClick={() => handleShare(link.inviteUrl)}
                    title="Share"
                    className="w-9 h-9 shrink-0 bg-[#f1ecf8] border border-[#ddd8e4] text-[#20313f] rounded-xl flex items-center justify-center hover:bg-[#e4dfec]"
                  >
                    <span className="material-symbols-outlined text-lg">share</span>
                  </button>
                </div>

                <div className="w-full md:w-auto flex justify-end">
                  {isJoined ? (
                    <span className="bg-[#dcfce7] text-[#166534] text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 border border-[#bbf7d0]">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      Joined
                    </span>
                  ) : (
                    <span className="bg-[#fef9c3] text-[#854d0e] text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 border border-[#fef08a]">
                      <span className="material-symbols-outlined text-sm animate-pulse">hourglass_empty</span>
                      Waiting
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Status Area */}
        <div className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center gap-1 border border-[#e4dfec] shadow-xs">
          <p className="text-[11px] font-extrabold text-[#484554] uppercase tracking-wider">Room Lobby</p>
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold text-[#20313f]">
              <span className="text-[#e52b2b] text-xl font-black">{joinedCount}</span> / {totalSlots} Players Joined
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onContinueToLobby}
          className="w-full bg-[#20313f] text-white font-black text-lg py-4 rounded-full shadow-md hover:bg-[#2b70c9] transition-all flex items-center justify-center gap-2"
        >
          Continue to Lobby
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </main>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[#20313f] text-white px-6 py-3 rounded-full text-xs font-bold shadow-xl z-50 flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-[#38a34a]">check_circle</span>
          Link copied to clipboard!
        </div>
      )}
    </div>
  );
};
