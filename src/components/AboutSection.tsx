import React from 'react';
import { Award, Compass, ShieldCheck, Flame, Users, Landmark, LandmarkIcon } from 'lucide-react';
import { farsiDigits } from '../data';
import { motion } from 'motion/react';
import subBgImage from '../assets/images/gold_assay_master_bg_1780006183087.png';

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

export default function AboutSection() {
  const values = [
    {
      icon: <Flame className="text-[#d4af37]" size={22} />,
      title: 'ری‌گیری با ذوب استاندارد',
      desc: 'استفاده از به‌روزترین روش حرارتی ذوب با کوره‌های القایی پیشرفته جهت تصفیه فیزیکی فلزات گرانبها در دماهای بالای ۱۰۶۴ درجه سانتیگراد.'
    },
    {
      icon: <Users className="text-[#d4af37]" size={22} />,
      title: 'بیش از دو دهه تجربه',
      desc: 'سابقه درخشان در خدمت‌رسانی به صرافان، سازندگان جواهرات خطوط تولید و بازرگانان عمده بازار سنتی طلا همگام با فناوری مدرن.'
    }
  ];

  return (
    <div className="w-full max-w-2xl mx-auto px-4 z-10" id="about-component" dir="rtl">
      <div 
        className="relative obsidian-gold-glass rounded-[40px] p-6 md:p-8 overflow-hidden bg-cover bg-center bg-no-repeat transition-all duration-300"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(16, 18, 22, 0.86), rgba(10, 11, 13, 0.94)), url(${subBgImage})`
        }}
      >
        <div className="relative z-10">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 pb-5 mb-5 border-b border-[#d4af37]/15">
            <h2 className="text-lg md:text-xl font-bold text-gray-100 font-sans">
              درباره آزمایشگاه عیارسنجی عسکرنژاد (About Us)
            </h2>
          </div>

          {/* Narrative bio */}
          <div className="space-y-4 text-right mb-6">
            <p className="text-sm text-gray-200 leading-relaxed">
              <strong>آزمایشگاه عیارسنجی طلا و نقره عسگرنژاد</strong> با هدف ارتقای شفافیت معاملات و اطمینان‌بخشی به صنایع فلزات گرانبهای کشور تاسیس گردیده است. ما متعهد به پیاده‌سازی دقیق ضوابط استاندارد ملی شماره ۲۶ (عیارسنجی طلا) و استاندارد ملی شماره ۱۸ (نقره) در ایران می‌باشیم.
            </p>
            <p className="text-xs text-gray-400 leading-relaxed font-sans">
              تمام دستگاه‌های این مرکز به طور منظم کالیبره شده و نتایج آزمون‌های ری‌گیری توسط ناظرین باصلاحیت ارزیابی می‌شود. کدهای صادره آزمایشگاه به عنوان مهر معتبر تجاری در کلیه بازارهای مبادله‌ای طلا مورد شناسایی قرار می‌گیرند.
            </p>
          </div>

          {/* Dynamic highlights Grid with stagger animations */}
          <motion.div 
            className="space-y-4"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
          >
            {values.map((v, idx) => (
              <motion.div 
                key={idx}
                variants={itemVariants}
                className="liquid-glass-item p-4 rounded-[24px] flex items-start gap-4 text-right transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_8px_30px_rgb(212,175,55,0.06)]"
              >
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-[#1d1f27]/60 to-[#121316]/60 border border-white/10 flex items-center justify-center">
                  {v.icon}
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-[#f9e8a2]">{v.title}</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">{v.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Official Stats counter decoration */}
          <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-gray-800/60 text-center">
            <div>
              <span className="text-xl md:text-2xl font-bold text-[#d4af37] font-serif block">+{farsiDigits(25)}</span>
              <span className="text-[10px] text-gray-500">سال پاسخگویی</span>
            </div>
            <div>
              <span className="text-xl md:text-2xl font-bold text-[#d4af37] font-serif block">+{farsiDigits(150)}K</span>
              <span className="text-[10px] text-gray-500">انگ صادر شده</span>
            </div>
            <div>
              <span className="text-xl md:text-2xl font-bold text-[#d4af37] font-serif block">۹۹.۹۹٪</span>
              <span className="text-[10px] text-gray-500">تاییدیه‌های دقیق</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
