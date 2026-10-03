import React from 'react';
import { Instagram, Coins } from 'lucide-react';

interface HeaderProps {
  onAdminClick?: () => void;
}

export default function Header({ onAdminClick }: HeaderProps) {
  return (
    <header 
      className="w-full z-50 sticky top-0 liquid-glass !border-t-0 !border-x-0 !border-b border-white/15 !rounded-none shadow-lg h-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between relative" 
      dir="ltr"
    >
      
      {/* Left Side (in LTR context): Brand Vector Logo Button (Admin Entry Trigger) */}
      <div 
        onClick={onAdminClick}
        className="flex items-center gap-3 cursor-pointer select-none group"
        title="ورود به بخش مدیریت مراجعین"
      >
        {/* Logo vector icon wrapper */}
        <div className="relative w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center clear-liquid-glass border-[#d4af37]/35 rounded-xl shadow-[0_0_15px_rgba(212,175,55,0.15)] group-hover:border-[#d4af37]/70 transition-all duration-300">
          <Coins className="text-[#d4af37] w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform duration-300" />
        </div>
      </div>

      {/* Center: Brand Name Text Elements absolute-centered (Askarnejad spans) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-center pointer-events-auto select-none">
        <span 
          className="font-bold tracking-wider font-serif text-transparent bg-clip-text bg-gradient-to-r from-[#f5df99] via-[#d4af37] to-[#b3953b] uppercase text-center"
          style={{ height: '49px', width: '280px', fontSize: '25px', textAlign: 'center', lineHeight: '64px' }}
        >
          Askarnejad
        </span>
        <span className="text-[8px] sm:text-[9px] md:text-[10px] text-gray-400 tracking-tight leading-none font-medium mt-1 text-center whitespace-nowrap" dir="rtl">
          سامانه استعلام انگ طلا و نقره
        </span>
      </div>

      {/* Right Side: Instagram Handle Link (Optimized icon button) */}
      <div className="flex items-center gap-2 sm:gap-4" dir="rtl">
        {/* Official Instagram Link - beautiful icon launcher */}
        <a 
          href="https://instagram.com/goldgallery.askarnezhad" 
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center text-[#d4af37] hover:text-[#f9e8a2] clear-liquid-glass border border-[#d4af37]/30 rounded-xl transition-all duration-300"
          style={{ width: '44px', height: '44px' }}
          title="اینستاگرام عسکرنژاد"
          aria-label="Instagram"
        >
          <Instagram className="text-[#d4af37] flex-shrink-0" style={{ width: '28px', height: '28px' }} />
        </a>
      </div>

    </header>
  );
}
