import React, { useState } from 'react';
import { Scale, Timer, Microscope, Sparkles, MessageCircle, ArrowLeft, Check, Compass, ShieldAlert } from 'lucide-react';
import { servicesData, farsiDigits } from '../data';
import { ServiceItem } from '../types';
import { motion } from 'motion/react';
import subBgImage from '../assets/images/gold_assay_lab_bg_1779469758141.png';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  }
};

export default function ServicesSection() {
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Return matching lucide icon dynamically
  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Scale':
        return <Scale className="text-[#d4af37]" size={20} />;
      case 'Timer':
        return <Timer className="text-[#d4af37]" size={20} />;
      case 'Microscope':
        return <Microscope className="text-[#d4af37]" size={20} />;
      case 'Sparkles':
        return <Sparkles className="text-[#d4af37]" size={20} />;
      case 'MessageCircle':
        return <MessageCircle className="text-[#d4af37]" size={20} />;
      default:
        return <Compass className="text-[#d4af37]" size={20} />;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 z-10" id="services-component" dir="rtl">
      
      {/* Outer Card wrapping the entire section styled with Obsidian Gold Glass and beautiful lab background image */}
      <div 
        className="relative obsidian-gold-glass rounded-[40px] p-6 md:p-8 overflow-hidden bg-cover bg-center bg-no-repeat transition-all duration-300"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(16, 18, 22, 0.86), rgba(10, 11, 13, 0.94)), url(${subBgImage})`
        }}
      >
        
        <div className="relative z-10">
          {/* Ornate title header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 pb-5 mb-5 border-b border-[#d4af37]/15">
            <h2 className="text-lg md:text-xl font-bold text-gray-100 font-sans">
              خدمات تخصصی عیارسنجی و ری‌گیری (Our Services)
            </h2>
          </div>

          {/* List of Services - Exactly matches mockup's gauge line and item structure with scroll staggering */}
          <motion.div 
            className="space-y-4"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {servicesData.map((service) => {
              const isHovered = hoveredId === service.id;
              return (
                <motion.div 
                  key={service.id}
                  variants={itemVariants}
                  onMouseEnter={() => setHoveredId(service.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => setSelectedService(service)}
                  className="relative flex items-center justify-between p-4 md:p-5 rounded-[24px] liquid-glass-item hover:scale-[1.01] hover:shadow-[0_8px_30px_rgb(212,175,55,0.06)] cursor-pointer transition-all duration-300 group gap-4 min-w-0 animate-none"
                >
                  
                  {/* 1. (Right element in RTL): Brand Info & Gold Icon Group */}
                  <div className="flex items-center gap-3 sm:gap-4 text-right min-w-0">
                    {/* Golden circular base icon container matching mockup perfectly */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#1d1f27]/60 to-[#121316]/60 border border-white/10 group-hover:border-[#d4af37]/45 group-hover:shadow-[0_0_12px_rgba(212,175,55,0.15)] transition-all duration-300 flex-shrink-0">
                      {renderIcon(service.iconName)}
                    </div>

                    <div className="flex flex-col min-w-0 text-right">
                      <span className="text-sm md:text-base font-semibold text-gray-200 group-hover:text-white transition-colors truncate">
                        {service.title}
                      </span>
                      <span className="text-[10px] text-gray-500 group-hover:text-gray-400 mt-0.5 transition-colors truncate">
                        {service.accuracyTag}
                      </span>
                    </div>
                  </div>

                  {/* 2. (Left element in RTL): Horizontal progress gauge line */}
                  <div className="flex items-center gap-2 sm:gap-3 w-1/4 sm:w-1/3 flex-shrink-0">
                    <div className="w-full h-[3px] bg-gray-800 rounded-full overflow-hidden relative">
                      <div 
                        className="absolute top-0 right-0 h-full bg-gradient-to-l from-[#f9e8a2] to-[#d4af37] rounded-full transition-all duration-500 ease-out"
                        style={{ 
                          width: isHovered ? '100%' : `${service.progressPercentage}%` 
                        }}
                      />
                    </div>
                    {/* Small digital percentage ticker on hover */}
                    <span className="hidden sm:inline text-[9px] font-mono text-gray-500 group-hover:text-[#d4af37] transition-all">
                      {farsiDigits(service.progressPercentage)}٪
                    </span>
                  </div>

                </motion.div>
              );
            })}
          </motion.div>
        </div>

      </div>

      {/* Expanded Details Overlay / Modal */}
      {selectedService && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="relative w-full max-w-lg liquid-glass rounded-[40px] p-6 md:p-8 shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden">
            
            {/* Background luxury lights */}
            <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-[#d4af37]/5 blur-[80px]" />

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-800/80 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center">
                  {renderIcon(selectedService.iconName)}
                </div>
                <h4 className="text-base md:text-lg font-bold text-gray-100">{selectedService.title}</h4>
              </div>
              <button 
                onClick={() => setSelectedService(null)}
                className="p-1 px-2 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg cursor-pointer"
              >
                بستن
              </button>
            </div>

            {/* Description Body */}
            <div className="space-y-4 text-sm text-gray-300 text-right leading-relaxed">
              <p className="font-medium text-gray-100 underline decoration-[#d4af37]/25 underline-offset-4">توضیحات تکمیلی:</p>
              <p className="text-gray-300 text-xs md:text-sm">{selectedService.fullDesc}</p>
              
              <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-white/5 text-xs">
                <div className="liquid-glass-item p-3 rounded-[16px]">
                  <span className="text-gray-400 block pb-1">مدت زمان متوسط فرآیند:</span>
                  <span className="text-[#d4af37] font-semibold block">{selectedService.timeEstimate}</span>
                </div>
                <div className="liquid-glass-item p-3 rounded-[16px]">
                  <span className="text-gray-400 block pb-1">سطح دقت رسمی:</span>
                  <span className="text-green-400 font-semibold block">{selectedService.accuracyTag}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer Close */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setSelectedService(null)}
                className="bg-gradient-to-r from-[#d4af37] to-[#aa8c2c] text-[#0d0f12] font-bold text-xs md:text-sm px-6 py-2.5 rounded-xl cursor-pointer hover:opacity-90"
              >
                متوجه شدم
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
