import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GalleryItem } from '../types';
import { dbService } from '../lib/dbService';

// Let's define the jewelry categories
interface Category {
  id: string;
  name: string;
  keywords: string[];
}

const CATEGORIES: Category[] = [
  { id: 'all', name: 'همه آثار', keywords: [] },
  { id: 'rings', name: 'حلقه‌ها', keywords: ['حلقه', 'انگشتر'] },
  { id: 'bracelets', name: 'دستبندها', keywords: ['دستبند', 'النگو'] },
  { id: 'necklaces', name: 'گردنبندها', keywords: ['گردنبند', 'آویز', 'مدال'] },
  { id: 'sets', name: 'سرویس', keywords: ['ست', 'سرویس', 'گوشواره'] }
];

export default function GallerySection() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const defaultSeedItems: GalleryItem[] = [
    {
      id: 'seed-1',
      title: 'حلقه طلا با نگین برلیان تراش گندمی',
      subtitle: 'حلقه و انگشتر',
      description: 'طراحی دست‌ساز ساخته شده از طلای ۱۸ عیار ابزارزنی شده با مخراج‌کاری دقیق برلیان‌های خالص.',
      imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=800',
      createdAt: '2026-05-10T12:00:00.000Z'
    },
    {
      id: 'seed-2',
      title: 'دستبند طلا طرح کتیبه اسلیمی',
      subtitle: 'دستبند',
      description: 'ترکیب کتیبه‌های باستانی ایران و خطوط مدرن اسلیمی صیقل‌خورده با روکش با دوام نانو.',
      imageUrl: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=800',
      createdAt: '2026-05-15T12:00:00.000Z'
    },
    {
      id: 'seed-3',
      title: 'گردنبند زمرد نشان امپریال',
      subtitle: 'گردنبند',
      description: 'مدال مرکزی با نگین زمرد شناسنامه‌دار کلمبیایی احاطه‌شده توسط الماس‌های تراش مارکیز.',
      imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=800',
      createdAt: '2026-05-20T12:00:00.000Z'
    },
    {
      id: 'seed-4',
      title: 'نیم‌ست هندسی متالیک مدرن',
      subtitle: 'سرویس و نیم‌ست',
      description: 'قطعات خلاقانه با حجم‌پردازی‌های سه بعدی مدرن و پرداخت نهایی دستی توسط استادکاران کارگاه عسکرنژاد.',
      imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=800',
      createdAt: '2026-05-25T12:00:00.000Z'
    }
  ];

  const fetchItems = async () => {
    try {
      const data = await dbService.getAllGalleryItems();
      if (Array.isArray(data)) {
        setItems(data);
      }
    } catch (err) {
      console.warn('Could not load gallery items.', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    
    const handleRefresh = () => {
      fetchItems();
    };
    window.addEventListener('refresh-gallery', handleRefresh);
    return () => window.removeEventListener('refresh-gallery', handleRefresh);
  }, []);

  // Filter items based on selected category keywords or direct category ID match
  const filteredItems = items.filter(item => {
    if (selectedCategory === 'all') return true;
    
    // Direct category field match (if provided)
    if (item.category && item.category === selectedCategory) return true;

    const cat = CATEGORIES.find(c => c.id === selectedCategory);
    if (!cat) return true;
    
    // Check if subtitle, title or description contains the keywords
    const searchString = `${item.title} ${item.subtitle || ''} ${item.description || ''}`.toLowerCase();
    return cat.keywords.some(keyword => searchString.includes(keyword));
  });

  // Clamp active index when filtered items change
  useEffect(() => {
    setActiveIndex(0);
  }, [selectedCategory, filteredItems.length]);

  const handlePrev = () => {
    if (filteredItems.length === 0) return;
    setActiveIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
  };

  const handleNext = () => {
    if (filteredItems.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % filteredItems.length);
  };

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-20" style={{ width: '100%', maxWidth: '960px', margin: '0 auto' }}>
        <div className="relative flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-[#d4af37]/20 border-t-[#d4af37] animate-spin" />
          <span className="text-xs text-gray-500 font-sans tracking-widest uppercase">در حال بارگذاری نمایشگاه...</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      id="gallery" 
      className="relative py-12 select-none overflow-hidden bg-[#07090e] rounded-[2.5rem] border border-white/[0.08] shadow-[0_25px_60px_rgba(0,0,0,0.85)]" 
      style={{ width: '100%', maxWidth: '960px', margin: '0 auto' }}
      dir="rtl"
    >
      {/* Liquid Glass Background Effects */}
      <div className="absolute inset-0 bg-[#07090e] pointer-events-none" />
      
      {/* Colorful Fluid Glass Blobs moving behind */}
      <div className="absolute top-1/4 left-1/4 w-40 h-40 rounded-full bg-[#d4af37]/10 blur-[40px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-36 h-36 rounded-full bg-amber-500/[0.06] blur-[50px] pointer-events-none animate-bounce duration-[12000ms]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-cyan-500/[0.03] blur-[60px] pointer-events-none" />

      {/* Glossy Diagonal Reflection on Entire Wrapper Section to deliver the real liquid glass feel */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.06] pointer-events-none z-10" />

      {/* Header section matching luxurious boutique gallery aesthetic */}
      <div className="text-center space-y-2.5 mb-6 px-4 z-10 relative">
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight select-none">
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-gray-100 via-gray-200 to-gray-300">
            گالری آثار ما
          </span>
        </h2>
      </div>

      {/* Beautiful Story Carousel deck conforming perfectly to the reference screenshot mockups */}
      <div className="relative w-full flex items-center justify-center min-h-[510px] sm:min-h-[660px] overflow-visible my-3">
        
        {/* Large back-layer title aura */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none opacity-[0.015] z-0 text-[18vw] font-black tracking-[0.2em] font-mono leading-none text-white uppercase text-center whitespace-nowrap">
          GOLD
        </div>

        {/* Outer container for horizontal cards display */}
        <div className="relative w-full h-[480px] sm:h-[620px] flex items-center justify-center overflow-visible z-10">
          
          {filteredItems.length === 0 ? (
            <div className="text-center space-y-2 text-gray-500 border border-white/5 bg-white/[0.01] p-6 rounded-2xl max-w-[260px] mx-auto backdrop-blur-md">
              <ImageIcon size={24} className="mx-auto text-gray-655" />
              <p className="text-[10px]">هیچ محصولی در این دسته‌بندی هنوز ثبت نشده است.</p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              // Calculate index relationships
              let diff = index - activeIndex;
              if (diff < -filteredItems.length / 2) diff += filteredItems.length;
              if (diff > filteredItems.length / 2) diff -= filteredItems.length;

              const isActive = diff === 0;
              const isLeft = diff < 0;
              const isRight = diff > 0;
              const absDiff = Math.abs(diff);

              // Support 3 visible main cards, with others hidden smoothly
              if (absDiff > 1) return null;

              // 3D Perspective calculations for true 3D Carousel experience
              let translateX = '0%';
              let translateZ = 0;
              let scale = 1;
              let opacity = 0;
              let zIndex = 10;
              let rotateY = 0;

              if (isActive) {
                translateX = '0%';
                translateZ = 60;
                scale = 1.0;
                opacity = 1;
                zIndex = 30;
                rotateY = 0;
              } else if (isLeft) {
                translateX = 'calc(-62% - 15px)';
                translateZ = -80;
                scale = 0.84;
                opacity = 0.45;
                zIndex = 15;
                rotateY = -22; // 3D inward angle
              } else if (isRight) {
                translateX = 'calc(62% + 15px)';
                translateZ = -80;
                scale = 0.84;
                opacity = 0.45;
                zIndex = 15;
                rotateY = 22; // 3D inward angle
              }

              return (
                <motion.div
                  key={item.id}
                  onClick={() => {
                    if (!isActive) setActiveIndex(index);
                  }}
                  className="absolute w-[240px] h-[390px] sm:w-[350px] sm:h-[550px] transition-all duration-300 ease-out cursor-pointer select-none will-change-transform"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: `perspective(1200px) translateX(${translateX}) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                    opacity: opacity,
                    zIndex: zIndex,
                  }}
                  layout
                >
                  {/* Outer Liquid Glass Frameless Container Styled Exactly Like the Story Photo mockup */}
                  <div className={`relative w-full h-full rounded-[2.2rem] overflow-hidden bg-black/40 border-[1.5px] transition-all duration-500 shadow-[0_20px_45px_rgba(0,0,0,0.9)] ${
                    isActive 
                      ? 'border-[#d4af37] ring-1 ring-[#d4af37]/45 shadow-[0_25px_50px_rgba(212,175,55,0.15)]' 
                      : 'border-white/[0.08] hover:border-white/[0.15]'
                  }`}>
                    
                    {/* Portrait Photo View */}
                    <div className="w-full h-full relative">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* Deep darkness bottom-to-top gradient mockup layout covering 60% height */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />
                      
                      {/* Liquid glass light leaks & reflections inside the story card */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-white/[0.12] pointer-events-none mix-blend-overlay z-10" />
                      
                      {/* Top liquid glaze glass sheen block */}
                      <div className="absolute top-0 inset-x-0 h-[45%] bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none z-10" />
                      <div className="absolute top-0 left-0 w-full h-[1px] bg-white/[0.22] z-10" />

                      {/* Category Label badge at top-right inside card */}
                      {item.subtitle && (
                        <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full bg-black/60 border border-white/[0.12] backdrop-blur-md text-[8px] font-bold text-[#d4af37] select-none">
                          {item.subtitle}
                        </div>
                      )}

                      {/* Content Overlay - Title & Description centered near the bottom, exactly corresponding to 'My Story' mockup layout */}
                      <div className="absolute bottom-6 inset-x-0 px-4 text-center space-y-1.5 z-10 flex flex-col items-center">
                        <h3 className="text-xs sm:text-sm font-bold text-white leading-snug drop-shadow-md select-none font-sans tracking-wide">
                          {item.title}
                        </h3>
                        
                        {item.description && (
                          <p className="text-[9px] sm:text-[10px] text-gray-300 font-medium leading-relaxed max-w-[200px] line-clamp-2 select-none opacity-90 drop-shadow">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Minimal Subtle Navigation Arrows */}
        {filteredItems.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2 w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-white hover:text-[#d4af37] flex items-center justify-center transition-all cursor-pointer z-40 border border-white/5 active:scale-95 backdrop-blur-md"
              aria-label="Previous jewel"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-white hover:text-[#d4af37] flex items-center justify-center transition-all cursor-pointer z-40 border border-white/5 active:scale-95 backdrop-blur-md"
              aria-label="Next jewel"
            >
              <ChevronLeft size={14} />
            </button>
          </>
        )}
      </div>

      {/* Categories / Navigation Tabs placed below the carousel with clean dot selector, matching mockup layout beautifully */}
      <div className="w-full px-4 mt-6 select-none z-20 relative">
        <div className="flex items-center justify-center gap-4 sm:gap-6 border-t border-white/[0.06] pt-5 flex-wrap">
          {CATEGORIES.map((cat) => {
            const isTabActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="relative pb-3 flex flex-col items-center justify-center cursor-pointer group focus:outline-none"
              >
                <span className={`text-[11px] sm:text-xs font-bold transition-all duration-300 select-none ${
                  isTabActive
                    ? 'text-white scale-105'
                    : 'text-gray-500 hover:text-gray-300'
                }`}>
                  {cat.name}
                </span>

                {/* Golden Animated Dot below active item conforming perfectly with mockup */}
                {isTabActive ? (
                  <motion.div
                    layoutId="activeCategoryDot"
                    className="absolute bottom-0 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]"
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  />
                ) : (
                  <div className="absolute bottom-0 w-1 h-1 rounded-full bg-transparent group-hover:bg-gray-700 transition-colors" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
