import React, { useState, useEffect } from 'react';
import { Logo } from '../components/Logo.tsx';
import { CardColor, CardRank } from '../types.ts';

interface LoadingGameScreenProps {
  roomId: string;
  onComplete: () => void;
}

const COLORS: CardColor[] = ['RED', 'YELLOW', 'GREEN', 'BLUE'];
const RANKS: CardRank[] = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'SKIP', 'REVERSE', 'DRAW2', 'WILD', 'WILD4'
];

export const LoadingGameScreen: React.FC<LoadingGameScreenProps> = ({ roomId, onComplete }) => {
  const [loadedCount, setLoadedCount] = useState(0);
  const [currentAsset, setCurrentAsset] = useState<string>('Initializing deck...');
  const [hasError, setHasError] = useState(false);

  // Total card image combinations (4 colors x 15 ranks = 60)
  const totalAssets = COLORS.length * RANKS.length;

  useEffect(() => {
    let mounted = true;
    let completed = 0;

    const urls: string[] = [];
    COLORS.forEach((color) => {
      RANKS.forEach((rank) => {
        urls.push(`/api/rooms/${roomId}/card-image/${color}/${rank}`);
      });
    });

    const loadImageWithRetry = (url: string, retries = 3) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        if (!mounted) return;
        completed++;
        setLoadedCount(completed);
        setCurrentAsset(`Loaded card asset (${completed}/${totalAssets})`);

        if (completed >= totalAssets) {
          setTimeout(() => {
            if (mounted) onComplete();
          }, 300);
        }
      };

      img.onerror = () => {
        if (!mounted) return;
        if (retries > 0) {
          // Retry with timestamp to bypass stale cache
          setTimeout(() => {
            loadImageWithRetry(`${url}?r=${4 - retries}`, retries - 1);
          }, 500);
        } else {
          // Force count so loading screen doesn't block indefinitely
          completed++;
          setLoadedCount(completed);
          setHasError(true);
          if (completed >= totalAssets) {
            setTimeout(() => {
              if (mounted) onComplete();
            }, 300);
          }
        }
      };
    };

    urls.forEach((url) => {
      loadImageWithRetry(url, 3);
    });

    return () => {
      mounted = false;
    };
  }, [roomId, onComplete, totalAssets]);

  const progressPercent = Math.min(100, Math.round((loadedCount / totalAssets) * 100));

  return (
    <div className="min-h-screen bg-[#f8f6fb] text-[#20313f] flex flex-col items-center justify-center p-6">
      <main className="w-full max-w-md bg-white rounded-3xl p-8 border border-[#e4dfec] shadow-xl flex flex-col items-center text-center gap-6">
        <Logo size="md" showText={true} />

        <div className="flex flex-col items-center gap-2">
          <h2 className="text-2xl font-black text-[#20313f] tracking-tight">
            Preparing Card Deck...
          </h2>
          <p className="text-xs font-semibold text-[#484554]">
            Pre-rendering and optimizing all card images for smooth gameplay.
          </p>
        </div>

        {/* Progress Display */}
        <div className="w-full flex flex-col gap-2 my-2">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-extrabold text-[#484554] uppercase tracking-wider">
              {currentAsset}
            </span>
            <span className="text-xl font-black text-[#e52b2b]">
              {progressPercent}%
            </span>
          </div>

          {/* Progress Bar Container */}
          <div className="w-full h-5 bg-[#f1ecf8] rounded-full overflow-hidden border border-[#ddd8e4] p-0.5 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-[#e52b2b] via-[#f5b812] to-[#38a34a] rounded-full transition-all duration-300 ease-out flex items-center justify-end px-2"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="w-2.5 h-2.5 bg-white/90 rounded-full animate-pulse" />
            </div>
          </div>
        </div>

        {hasError && (
          <p className="text-xs font-bold text-[#b8860b] bg-[#fffbeb] border border-[#fef08a] rounded-xl p-2.5 w-full">
            ⚠️ Some card images took longer to generate. Starting game with fallback symbols...
          </p>
        )}

        <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#797586] bg-[#f8f6fb] px-4 py-2 rounded-full border border-[#ddd8e4]">
          <span className="material-symbols-outlined text-base animate-spin text-[#20313f]">
            sync
          </span>
          <span>100% photo visibility guarantee</span>
        </div>
      </main>
    </div>
  );
};
