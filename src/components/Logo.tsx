import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true, className = '' }) => {
  const sizeMap = {
    sm: { img: 'w-16 h-16', text: 'text-xl' },
    md: { img: 'w-24 h-24', text: 'text-3xl' },
    lg: { img: 'w-48 h-48', text: 'text-5xl' },
    xl: { img: 'w-72 h-72', text: 'text-6xl' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`relative ${currentSize.img} flex items-center justify-center shrink-0`}>
        <img
          src="/logo.svg"
          alt="Snap Deck Logo"
          className="w-full h-full object-contain filter drop-shadow-sm transition-transform hover:scale-105"
        />
      </div>
      {showText && (
        <span className={`font-black ${currentSize.text} tracking-tight text-[#20313f] mt-1 font-['Quicksand']`}>
          Snap Deck
        </span>
      )}
    </div>
  );
};
