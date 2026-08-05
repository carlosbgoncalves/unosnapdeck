import React, { useState, useEffect } from 'react';
import { Logo } from '../components/Logo.tsx';
import { ThemeOption } from '../types.ts';

interface CreateGameScreenProps {
  onCreateGame: (hostName: string, nPlayers: number, themeId: string) => void;
  isLoading?: boolean;
}

const FALLBACK_THEMES: ThemeOption[] = [
  {
    id: 'dream_houses',
    name: 'Dream Houses',
    description: 'Architectural dream homes & luxury mansions.',
    icon: 'villa',
    photoCount: 75,
  },
  {
    id: 'muscle_cars',
    name: 'Muscle Cars',
    description: 'Classic & modern high-performance muscle cars.',
    icon: 'directions_car',
    photoCount: 79,
  },
  {
    id: 'professional_monkeys',
    name: 'Professional Monkeys',
    description: 'Fun monkeys working various careers & professions.',
    icon: 'smart_toy',
    photoCount: 93,
  },
  {
    id: 'tropical_beaches',
    name: 'Tropical Beaches',
    description: 'Stunning tropical beaches & island lagoons.',
    icon: 'beach_access',
    photoCount: 114,
  },
];

export const CreateGameScreen: React.FC<CreateGameScreenProps> = ({ onCreateGame, isLoading }) => {
  const [hostName, setHostName] = useState('Player 1');
  const [nPlayers, setNPlayers] = useState(4);
  const [selectedThemeId, setSelectedThemeId] = useState<string>('dream_houses');
  const [availableThemes, setAvailableThemes] = useState<ThemeOption[]>(FALLBACK_THEMES);

  useEffect(() => {
    fetch('/api/themes')
      .then((r) => r.json())
      .then((data) => {
        if (data.themes && data.themes.length > 0) {
          setAvailableThemes(data.themes);
        }
      })
      .catch(() => {});
  }, []);

  const handleDecrement = () => {
    if (nPlayers > 2) setNPlayers(nPlayers - 1);
  };

  const handleIncrement = () => {
    if (nPlayers < 10) setNPlayers(nPlayers + 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateGame(hostName, nPlayers, selectedThemeId);
  };

  return (
    <div className="min-h-screen bg-[#f8f6fb] text-[#20313f] flex flex-col items-center pt-8 px-5 pb-16">
      {/* Header */}
      <header className="flex flex-col items-center justify-center w-full max-w-md mb-8 text-center">
        <Logo size="lg" />
        <p className="text-base font-semibold text-[#484554] mt-2">UNO Custom Card Game Session</p>
      </header>

      {/* Form */}
      <main className="w-full max-w-md flex flex-col gap-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Host Name Input */}
          <section className="bg-white p-5 rounded-2xl border border-[#e4dfec] shadow-sm flex flex-col gap-2">
            <label htmlFor="hostName" className="text-xs font-extrabold text-[#20313f] uppercase tracking-wider">
              Host Name
            </label>
            <input
              id="hostName"
              type="text"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder="Enter your name"
              required
              className="w-full py-3 px-4 rounded-xl border border-[#ddd8e4] bg-[#f8f6fb] text-lg font-bold text-[#20313f] focus:outline-none focus:ring-2 focus:ring-[#2b70c9]"
            />
          </section>

          {/* Player Count Stepper */}
          <section className="bg-white p-5 rounded-2xl border border-[#e4dfec] shadow-sm flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-extrabold text-[#20313f] uppercase tracking-wider">Number of Players</label>
              <span className="text-xs font-bold text-[#484554] flex items-center gap-1 bg-[#f1ecf8] px-2.5 py-1 rounded-full border border-[#ddd8e4]">
                <span className="material-symbols-outlined text-sm">groups</span> 2 - 10
              </span>
            </div>
            <div className="flex items-center justify-between bg-[#f8f6fb] rounded-full p-2 border border-[#ddd8e4]">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={nPlayers <= 2}
                className="w-12 h-12 rounded-full bg-white border border-[#ddd8e4] text-[#20313f] hover:bg-[#e4dfec] flex items-center justify-center shadow-xs disabled:opacity-40 font-bold transition-all"
              >
                <span className="material-symbols-outlined text-2xl">remove</span>
              </button>
              <div className="text-4xl font-black text-[#20313f] w-16 text-center font-['Quicksand']">
                {nPlayers}
              </div>
              <button
                type="button"
                onClick={handleIncrement}
                disabled={nPlayers >= 10}
                className="w-12 h-12 rounded-full bg-white border border-[#ddd8e4] text-[#20313f] hover:bg-[#e4dfec] flex items-center justify-center shadow-xs disabled:opacity-40 font-bold transition-all"
              >
                <span className="material-symbols-outlined text-2xl">add</span>
              </button>
            </div>
          </section>

          {/* Theme Selector */}
          <section className="bg-white p-5 rounded-2xl border border-[#e4dfec] shadow-sm flex flex-col gap-3">
            <label className="text-xs font-extrabold text-[#20313f] uppercase tracking-wider">Select Deck Theme</label>
            <p className="text-xs font-semibold text-[#797586]">
              Choose the card deck photo theme for all players in this game session.
            </p>

            <div className="grid grid-cols-1 gap-2.5">
              {availableThemes.map((theme) => {
                const isSelected = selectedThemeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setSelectedThemeId(theme.id)}
                    className={`w-full p-3.5 rounded-xl border-2 transition-all text-left flex items-center gap-3.5 cursor-pointer ${
                      isSelected
                        ? 'border-[#20313f] bg-[#f0f4f8] shadow-sm'
                        : 'border-[#ddd8e4] bg-[#f8f6fb] hover:border-[#20313f]'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-[#20313f] text-white' : 'bg-[#e4dfec] text-[#484554]'
                    }`}>
                      <span className="material-symbols-outlined text-xl">{theme.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-[#20313f]">{theme.name}</p>
                      <p className="text-xs font-medium text-[#484554] truncate">
                        {theme.description}
                      </p>
                    </div>
                    {isSelected && (
                      <span className="material-symbols-outlined text-[#20313f] shrink-0 font-bold">check_circle</span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 rounded-full text-lg font-black bg-[#e52b2b] hover:bg-[#dc2626] text-white flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95 disabled:opacity-60 border-2 border-[#b91c1c]"
          >
            {isLoading ? 'Creating Game...' : 'Create Game & Get Invites'}
            <span className="material-symbols-outlined">rocket_launch</span>
          </button>
        </form>
      </main>
    </div>
  );
};
