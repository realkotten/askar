import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import HallmarkInquiry from './components/HallmarkInquiry';
import CertificateModal from './components/CertificateModal';
import ServicesSection from './components/ServicesSection';
import AboutSection from './components/AboutSection';
import ContactSection from './components/ContactSection';
import AdminDashboard from './components/AdminDashboard';
import GallerySection from './components/GallerySection';
import { AssayCertificate } from './types';
import { Coins, ChevronDown, ArrowUpCircle, Sparkles, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import bgImage from './assets/images/gold_assay_master_bg_1780006183087.png';

export default function App() {
  const [selectedCertificate, setSelectedCertificate] = useState<AssayCertificate | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // Background gold particles state
  const [particles, setParticles] = useState<Array<{ id: number; left: number; delay: number; duration: number; size: number }>>([]);

  useEffect(() => {
    // Generate gold particles dynamically for premium background ambient
    const initialParticles = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 6 + Math.random() * 12,
      size: 2 + Math.random() * 4,
    }));
    setParticles(initialParticles);

    // Track scroll to show return-to-top button
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCertificateFound = (_cert: AssayCertificate) => {
    // Expand certificate smoothly inline within the inquiry component (no popup window)
  };

  const handleScrollToContent = () => {
    window.scrollTo({
      top: window.scrollY + 650,
      behavior: 'smooth'
    });
  };

  return (
    <div className="min-h-screen relative bg-[#0a0c0f] text-gray-100 flex flex-col font-sans select-none overflow-x-hidden pb-12">
      
      {/* Decorative Gold Ambient Blurred Glows */}
      <div className="absolute top-[10%] left-[5%] w-96 h-96 rounded-full bg-[#d4af37]/5 blur-[120px] pointer-events-none select-none z-0" />
      <div className="absolute top-[40%] right-[5%] w-96 h-96 rounded-full bg-[#aa8c2c]/5 blur-[140px] pointer-events-none select-none z-0" />
      <div className="absolute bottom-[15%] left-[20%] w-[500px] h-[500px] rounded-full bg-[#d4af37]/3 blur-[160px] pointer-events-none select-none z-0" />

      {/* Hero Liquid Gold Laboratory Image Banner Background - Fully Blended & More Visible */}
      <div className="fixed inset-0 w-full h-full opacity-[0.65] z-0 select-none overflow-hidden pointer-events-none">
        <img 
          src={bgImage} 
          alt="Gold Refinery Lab Background" 
          className="w-full h-full object-cover scale-100 pointer-events-none select-none filter brightness-[0.55] contrast-[1.15]"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0c0f]/30 via-[#0a0c0f]/70 to-[#0a0c0f]" />
      </div>

      {/* Floating Animated Golden Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10 select-none">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute bg-gradient-to-br from-[#ffd700] to-[#b8860b] rounded-full opacity-40 shadow-[0_0_8px_rgba(212,175,55,0.6)]"
            style={{
              left: `${p.left}%`,
              bottom: `-20px`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animation: `gold-drift ${p.duration}s infinite linear`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Standard Sticky Header */}
      <Header onAdminClick={() => setShowAdmin(true)} />

      {/* Core Main Container */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 select-none relative z-20 space-y-16">
        
        {/* HERO SECTION WITH TITLE & HALLMARK INQUIRY */}
        <motion.div 
          id="home"
          className="flex flex-col items-center justify-center text-center pt-6 md:pt-12 pb-6 space-y-8 select-none"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Main Title Badge */}
          <div className="space-y-4 max-w-3xl">
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight select-none px-2">
              <span 
                className="block text-transparent bg-clip-text bg-gradient-to-r from-[#f9e8a2] via-[#d4af37] to-[#aa8c2c] drop-shadow-sm select-none leading-tight animate-blink"
                style={{ fontSize: '33px' }}
              >
                ری‌گیری عسکرنژاد
              </span>
              <span className="sr-only">
                ریگیری عسکر نژاد
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-[0px] h-0 overflow-hidden select-none pointer-events-none opacity-0">
              با اطمینان از صحت شماره انگ، خلوص و اصالت قطعه یا پاکت آزمایشگاهی طلا و نقره مطلع شوید. عیارسنجی فوق‌پیشرفته تحت نظارت مسئول فنی آزمایشگاه معتمد استاندارد ملی.
            </p>
          </div>

          {/* Core Glassmorphic Hallmark Inquiry Box */}
          <div className="w-full max-w-xl mx-auto">
            <HallmarkInquiry onCertificateFound={handleCertificateFound} />
          </div>

          {/* Unified National Alloy & Assay Gate Portal Link */}
          <div className="mt-2 text-center select-none">
            <span className="text-gray-400 text-sm md:text-base font-medium">
              سامانه یکپارچه استعلام انگ و عیارسنجی کشوری{' '}
            </span>
            <a 
              href="https://reygiry.ir" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[#d4af37] hover:text-[#fcf0c2] text-sm md:text-base font-bold font-mono tracking-wider underline underline-offset-4 cursor-pointer transition-colors duration-200"
              style={{ fontSize: '20px' }}
            >
              reygiry.ir
            </a>
          </div>

          {/* Smooth Scroll visual cue */}
          <div 
            onClick={handleScrollToContent}
            className="flex flex-col items-center gap-1.5 text-xs text-gray-500 hover:text-[#d4af37] transition-all cursor-pointer pt-4 animate-bounce"
          >
            <span>خدمات ما را بررسی فرمایید</span>
            <ChevronDown size={14} />
          </div>

        </motion.div>

        {/* SLIDING GALLERY AREA */}
        <motion.div 
          className="w-full flex justify-center py-4 px-4 sm:px-0"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <GallerySection />
        </motion.div>

        {/* SERVICES SECTION */}
        <motion.div 
          id="services" 
          className="pt-8 select-none"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <ServicesSection />
        </motion.div>

        {/* ABOUT SECTION */}
        <motion.div 
          id="about" 
          className="pt-8 select-none"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <AboutSection />
        </motion.div>

        {/* CONTACT SECTION */}
        <motion.div 
          id="contact" 
          className="pt-8 pb-12 select-none"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <ContactSection />
        </motion.div>

      </main>

      {/* SOLID STATIC MINIMAL FOOTER - NO MENUS */}
      <footer className="w-full liquid-glass border-x-0 border-b-0 border-t border-white/10 rounded-none shadow-[0_-15px_40px_rgba(0,0,0,0.55)] mt-16 select-none relative z-30 py-8 text-center text-gray-400 text-xs space-y-4">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 font-sans">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAdmin(true)}
              className="text-[11px] text-gray-600 hover:text-[#d4af37] cursor-pointer transition-all duration-300 underline underline-offset-2 decoration-dashed"
            >
              سامانه کنترل داخلی (ویژه مدیریت)
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 text-[10px] text-gray-600 leading-relaxed font-sans">
          آزمایشگاه فوق‌تخصصی عیارسنجی و صنایع ری‌گیری طلا و نقره، تحت نظارت فنی و ممیزی مستقیم مسئول فنی آزمایشگاه معتمد استاندارد ملی کشور.
        </div>
      </footer>

      {/* SECURE ADMIN ENTRY DASHBOARD PORTAL */}
      {showAdmin && (
        <AdminDashboard onClose={() => setShowAdmin(false)} />
      )}

      {/* Certificate Modal when searched from HallmarkInquiry */}
      {selectedCertificate && (
        <CertificateModal
          certificate={selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
        />
      )}

      {/* Floating Scroll-to-Top Button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 p-2 rounded-full bg-[#121317]/90 border border-[#d4af37]/35 text-[#d4af37] hover:text-[#f9e8a2] shadow-[0_4px_15px_rgba(0,0,0,0.5)] cursor-pointer hover:scale-105 transition-all duration-300 z-50 animate-[slideUp_0.2s_ease-out]"
          aria-label="Back to Top"
        >
          <ArrowUpCircle size={24} />
        </button>
      )}

    </div>
  );
}

