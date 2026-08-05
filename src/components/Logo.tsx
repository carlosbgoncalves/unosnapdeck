import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const sizeMap = {
    sm: 'h-10 sm:h-12 w-auto',
    md: 'h-24 sm:h-28 w-auto',
    lg: 'h-44 sm:h-52 w-auto',
    xl: 'h-64 sm:h-76 w-auto',
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`relative ${currentSize} flex items-center justify-center shrink-0`}>
        <img
          src="/logo.png"
          alt="Snap Deck"
          className="h-full w-auto object-contain filter drop-shadow-md transition-transform hover:scale-105"
        />
      </div>
    </div>
  );
};
