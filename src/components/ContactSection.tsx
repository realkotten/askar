import React from 'react';
import { Mail, Phone, MapPin, Clock, ShieldCheck, Instagram } from 'lucide-react';
import { farsiDigits } from '../data';
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
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

export default function ContactSection() {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 z-10" id="contact-component" dir="rtl">
      <div 
        className="relative obsidian-gold-glass rounded-[40px] p-6 md:p-8 overflow-hidden bg-cover bg-center bg-no-repeat transition-all duration-300"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(16, 18, 22, 0.86), rgba(10, 11, 13, 0.94)), url(${subBgImage})`
        }}
      >
        <div className="relative z-10">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 pb-5 mb-6 border-b border-[#d4af37]/15">
            <h2 className="text-lg md:text-xl font-bold text-gray-100 font-sans">
              اطلاعات تماس و نشانی آزمایشگاه (Contact Us)
            </h2>
          </div>

          {/* Info Grid - Styled beautifully with staggered items on viewport entry */}
          <motion.div 
            className="grid grid-cols-1 gap-4 text-right font-sans"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
          >
            
            {/* Address Box */}
            <motion.div 
              variants={itemVariants} 
              className="liquid-glass-item p-5 rounded-[24px] transition-all duration-300 flex items-start gap-4 hover:scale-[1.01] hover:shadow-[0_8px_30px_rgb(212,175,55,0.06)]"
            >
              <div className="w-10 h-10 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center flex-shrink-0">
                <MapPin className="text-[#d4af37]" size={18} />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 block">نشانی دقیق کارگاه عسکرنژاد:</span>
                <span className="text-sm text-gray-200 leading-relaxed block font-semibold">
                  کرمان، سه راه شمال جنوبی بازار حاج آقا علی, بازار کفاش‌ها کاروانسرای گلشن, طبقه اول, کارگاه طلاسازی عسکرنژاد
                </span>
              </div>
            </motion.div>

            {/* Fixed Landline Box */}
            <motion.div 
              variants={itemVariants} 
              className="liquid-glass-item p-5 rounded-[24px] transition-all duration-300 flex items-start gap-4 hover:scale-[1.01] hover:shadow-[0_8px_30px_rgb(212,175,55,0.06)]"
            >
              <div className="w-10 h-10 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center flex-shrink-0">
                <Phone className="text-[#d4af37]" size={18} />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 block">تلفن ثابت کارگاه:</span>
                <a href="tel:03432254175" className="text-sm font-bold text-[#d4af37] hover:text-[#fcf0c2] transition-colors font-mono block">
                  ۰۳۴-۳۲۲۵۴۱۷۵
                </a>
              </div>
            </motion.div>

            {/* Mobile Box */}
            <motion.div 
              variants={itemVariants} 
              className="liquid-glass-item p-5 rounded-[24px] transition-all duration-300 flex items-start gap-4 hover:scale-[1.01] hover:shadow-[0_8px_30px_rgb(212,175,55,0.06)]"
            >
              <div className="w-10 h-10 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center flex-shrink-0">
                <Phone className="text-[#d4af37]" size={18} />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 block">تلفن همراه مسئول فنی:</span>
                <a href="tel:09137209382" className="text-sm font-bold text-[#d4af37] hover:text-[#fcf0c2] transition-colors font-mono block">
                  ۰۹۱۳۷۲۰۹۳۸۲
                </a>
              </div>
            </motion.div>

            {/* New Instagram Box */}
            <motion.div 
              variants={itemVariants} 
              className="liquid-glass-item p-5 rounded-[24px] transition-all duration-300 flex items-start gap-4 min-w-0 overflow-hidden hover:scale-[1.01] hover:shadow-[0_8px_30px_rgb(236,72,153,0.06)]"
            >
              <div className="w-10 h-10 rounded-xl bg-pink-600/10 border border-pink-500/20 flex items-center justify-center flex-shrink-0 animate-none">
                <Instagram className="text-pink-500" size={18} />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <span className="text-[10px] text-gray-500 block">صفحه رسمی اینستاگرام:</span>
                <a 
                  href="https://instagram.com/goldgallery.askarnezhad" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs sm:text-sm font-bold text-pink-400 hover:text-pink-300 transition-colors font-mono block break-all select-text"
                >
                  goldgallery.askarnezhad
                </a>
              </div>
            </motion.div>

            {/* Clock/Hours Box */}
            <motion.div 
              variants={itemVariants} 
              className="liquid-glass-item p-5 rounded-[24px] transition-all duration-300 flex items-start gap-4 hover:scale-[1.01] hover:shadow-[0_8px_30px_rgb(212,175,55,0.06)]"
            >
              <div className="w-10 h-10 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center flex-shrink-0">
                <Clock className="text-[#d4af37]" size={18} />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 block">ساعات فعالیت ری‌گیری و عیارسنجی:</span>
                <span className="text-xs text-gray-300 leading-normal block font-semibold">از شنبه تا پنجشنبه</span>
                <span className="text-xs text-gray-300 leading-normal block">صبح‌ها: {farsiDigits('9:30')} تا {farsiDigits('1:00')}</span>
                <span className="text-xs text-gray-300 leading-normal block">عصرها: {farsiDigits('4:30')} تا {farsiDigits('9:00')}</span>
              </div>
            </motion.div>

            {/* Email Box */}
            <motion.div 
              variants={itemVariants} 
              className="liquid-glass-item p-5 rounded-[24px] transition-all duration-300 flex items-start gap-4 min-w-0 overflow-hidden hover:scale-[1.01] hover:shadow-[0_8px_30px_rgb(212,175,55,0.06)]"
            >
              <div className="w-10 h-10 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center flex-shrink-0">
                <Mail className="text-[#d4af37]" size={18} />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <span className="text-[10px] text-gray-500 block">مکاتبات دیجیتال:</span>
                <a 
                  href="mailto:askarnejadmehdi@gmail.com" 
                  className="text-xs sm:text-sm text-gray-300 hover:text-[#d4af37] font-mono tracking-tight block transition-colors break-all select-text"
                >
                  askarnejadmehdi@gmail.com
                </a>
              </div>
            </motion.div>

          </motion.div>

          {/* Security Certificate assurance seal */}
          <motion.div 
            className="mt-8 p-4 liquid-glass-item rounded-[24px] text-center flex flex-col sm:flex-row items-center justify-between gap-3"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex items-center gap-2 text-right">
              <ShieldCheck size={18} className="text-[#d4af37] flex-shrink-0" />
              <p className="text-[11px] text-gray-400">
                تمام فلزات ارسالی مراجعین با نظارت مستقیم محمد مهدی عسکرنژاد ذوب و ممیزی عیار می‌گردند.
              </p>
            </div>
            <span className="text-[9px] text-[#d4af37] border border-[#d4af37]/20 rounded-full px-2.5 py-0.5 tracking-widest uppercase font-mono bg-[#d4af37]/5">
              Verified Spot
            </span>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
