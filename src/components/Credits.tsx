import React from 'react';

export const Credits: React.FC = () => {
  return (
    <div className="fixed bottom-2 right-3 z-30 pointer-events-auto">
      <div className="bg-white/80 backdrop-blur-sm border border-[#ddd8e4] px-3 py-1 rounded-full shadow-sm text-[11px] font-semibold text-[#484554] hover:opacity-100 transition-opacity">
        Created by <span className="text-[#20313f] font-bold">Carlos Gonçalves</span>
      </div>
    </div>
  );
};
