import React from 'react';
import { CardColor } from '../types.ts';

interface ColorPickerModalProps {
  isOpen: boolean;
  onSelectColor: (color: CardColor) => void;
}

export const ColorPickerModal: React.FC<ColorPickerModalProps> = ({ isOpen, onSelectColor }) => {
  if (!isOpen) return null;

  const colors: Array<{ color: CardColor; label: string; bg: string; text: string }> = [
    { color: 'RED', label: 'Red', bg: 'bg-[#e52b2b]', text: 'text-white' },
    { color: 'YELLOW', label: 'Yellow', bg: 'bg-[#f5b812]', text: 'text-[#20313f]' },
    { color: 'GREEN', label: 'Green', bg: 'bg-[#38a34a]', text: 'text-white' },
    { color: 'BLUE', label: 'Blue', bg: 'bg-[#2b70c9]', text: 'text-white' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#20313f]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-lg border border-[#e4dfec] text-center flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-[#f1ecf8] text-[#20313f] flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl">palette</span>
        </div>
        <div>
          <h3 className="text-2xl font-black text-[#20313f]">Choose Next Color</h3>
          <p className="text-xs font-semibold text-[#484554] mt-1">
            Wild card played! Select the color for the next player.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full mt-2">
          {colors.map((c) => (
            <button
              key={c.color}
              onClick={() => onSelectColor(c.color)}
              className={`${c.bg} ${c.text} py-4 rounded-2xl font-black text-lg shadow-xs hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 border-2 border-white`}
            >
              <span className="w-4 h-4 rounded-full bg-white/40" />
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
