import React, { useState } from 'react';
import { Search, Sparkles, RefreshCw, AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { generateDynamicCertificate, farsiDigits } from '../data';
import { dbService } from '../lib/dbService';
import { AssayCertificate } from '../types';
import { toEnglishDigits } from '../utils/digitUtils';

interface HallmarkInquiryProps {
  onCertificateFound: (cert: AssayCertificate) => void;
}

export default function HallmarkInquiry({ onCertificateFound }: HallmarkInquiryProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [foundCert, setFoundCert] = useState<AssayCertificate | null>(null);
  const [showNotFound, setShowNotFound] = useState(false);
  const [searchedCode, setSearchedCode] = useState('');
  const [showPhone, setShowPhone] = useState(false);

  const handleInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = toEnglishDigits(query).trim().toUpperCase();
    if (!cleanKey) {
      setError('لطفاً شماره انگ یا کد شناسنامه را وارد کنید.');
      setTimeout(() => setError(''), 4000);
      return;
    }

    setLoading(true);
    setFoundCert(null);
    setShowNotFound(false);
    setError('');

    try {
      const cert = await dbService.getCertificate(cleanKey);

      if (!cert) {
        setSearchedCode(cleanKey);
        setShowNotFound(true);
      } else {
        setFoundCert(cert);
        onCertificateFound(cert);
      }
    } catch (err) {
      setError('خطایی در ارتباط با دیتابیس رخ داد.');
    } finally {
      setLoading(false);
    }
  };

  const clearInquiry = () => {
    setQuery('');
    setFoundCert(null);
    setShowNotFound(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 z-10">
      
      {/* Centered Glassmorphic Card styled exactly like the mockup with Liquid Glass */}
      <div className="relative clear-liquid-glass rounded-[40px] p-6 md:p-8 overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/10 before:to-transparent before:pointer-events-none">
        
        {/* Abstract vector geometric background design of Apple Liquid Glass */}
        <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(#fff_1.5px,transparent_1.5px)] [background-size:24px_24px] pointer-events-none" />

        {/* Abstract golden flare accent behind the panel */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-[#d4af37]/10 blur-[60px]" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-[#d4af37]/10 blur-[60px]" />

        {/* Card Header Translation: "استعلام انگ" */}
        <div className="text-center mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-100 select-none">
            استعلام شماره انگ
          </h1>
          <p className="text-xs text-gray-400 mt-2 font-medium">
            با وارد کردن شناسه تاییدیه یا کد انگ، اصالت و مشخصات رسمی آزمایشگاهی کالا را مشاهده نمایید.
          </p>
        </div>

        {/* Inquiry Form */}
        <form onSubmit={handleInquiry} className="relative">
          {/* Main search bar matching the exact design style with elements aligned perfectly in RTL */}
          <div className="relative flex flex-col sm:flex-row gap-3 sm:gap-0 sm:items-center bg-transparent sm:clear-liquid-glass rounded-2xl sm:p-2 transition-all duration-300 w-full justify-between">
            
            {/* 1. RIGHT SIDE (or Top on mobile): Search Icon & Input Field */}
            <div className="flex items-center flex-grow pl-2 clear-liquid-glass sm:!bg-transparent sm:!border-0 sm:!shadow-none rounded-2xl p-4 sm:p-0">
              <div className="text-gray-400 pr-1 pl-1">
                <Search size={20} className="text-[#d4af37]/80" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="شماره انگ را وارد کنید"
                className="w-full bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none px-2 font-bold text-base text-gray-100 placeholder-gray-500 text-right select-text"
                dir="rtl"
              />
            </div>

            {/* 2. LEFT SIDE (or Bottom on mobile): Action button "استعلام" */}
            <button
              type="submit"
              disabled={loading}
              className="colored-liquid-glass text-white hover:text-[#fae298] hover:bg-white/15 border-0 disabled:text-gray-600 disabled:bg-transparent font-extrabold text-base py-3.5 sm:py-2.5 md:py-3.5 px-6 md:px-8 rounded-2xl sm:rounded-xl cursor-pointer shadow-[0_4px_15px_rgba(212,175,55,0.18)] hover:shadow-[0_4px_22px_rgba(212,175,55,0.32)] transition-all duration-300 flex items-center gap-2 min-w-full sm:min-w-[100px] md:min-w-[130px] justify-center flex-shrink-0 animate-none font-sans"
            >
              {loading ? (
                <RefreshCw size={16} className="animate-spin text-white" />
              ) : (
                'استعلام'
              )}
            </button>

          </div>

          {/* Test codes shortcut section has been fully removed under your request */}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-950/40 border border-red-800/40 text-red-300 text-xs rounded-xl flex items-center gap-2 animate-[slideUp_0.2s_ease-out]">
              <AlertTriangle size={14} className="flex-shrink-0" />
              <p className="text-right">{error}</p>
            </div>
          )}
        </form>

        {/* Searching Status Indicator */}
        {loading && (
          <div className="mt-6 p-5 liquid-glass-item border-[#d4af37]/25 rounded-2xl text-center flex flex-col items-center justify-center gap-3 animate-pulse">
            <RefreshCw size={24} className="animate-spin text-[#d4af37]" />
            <p className="text-xs text-[#d4af37] font-medium font-sans">
              اتصال به پایگاه داده مرکزی آزمایشگاهی...
            </p>
            <span className="text-[10px] text-gray-500">
              در حال تطبیق با استانداردهای رسمی عیارسنجی و بررسی هولوگرام امنیت
            </span>
          </div>
        )}

        {/* Complete Expanding Official Certificate Results (Replacing popup window) */}
        {!loading && foundCert && (
          <div className="mt-6 space-y-6 animate-[slideUp_0.35s_ease-out] text-right" dir="rtl">
            
            {/* Official Certificate Form with ornate gold-tinted frame & Apple Glass details */}
            <div className="relative border border-[#d4af37]/25 clear-liquid-glass rounded-[32px] p-5 md:p-6 space-y-6 overflow-hidden">
              
              {/* Holographic watermark background */}
              <div className="absolute right-6 top-6 opacity-[0.02] pointer-events-none select-none">
                <span className="text-[100px] font-extrabold select-none font-serif">A</span>
              </div>

              {/* Glowing decorative gradient accent */}
              <div className="absolute top-0 right-0 left-0 h-0.5 bg-gradient-to-r from-[#d4af37]/0 via-[#d4af37]/40 to-[#d4af37]/0" />

              {/* Top Section: Badge Logo & Laboratory Header */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-5 border-b border-white/10">
                <div className="text-center sm:text-right">
                  <h3 className="text-base md:text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#f5df99] via-[#d4af37] to-[#b3953b]">
                    آزمایشگاه عیارسنجی عسکرنژاد
                  </h3>
                  <p className="text-[10px] text-gray-400 font-medium mt-1">
                    تحت نظارت رسمی اداره کل استاندارد کشور
                  </p>
                </div>

                {/* Hologram showing Tested Purity inside the circular badge - Styled Emerald Green */}
                <div className="relative w-[125px] h-[125px] flex flex-col items-center justify-center rounded-full bg-gradient-to-tr from-[#052e16] to-[#0e0f11] border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3),inset_0_0_8px_rgba(16,185,129,0.35)]">
                  <span className="text-[7px] text-emerald-400 leading-none uppercase tracking-widest font-serif font-black">Purity / عیار</span>
                  <span className="text-[28px] font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-500 font-serif mt-0.5">
                    {farsiDigits(Math.round(foundCert.testedPurity))}
                  </span>
                  <span className="text-[7px] text-gray-500 font-sans mt-0.5">ثبت نهایی</span>
                </div>
              </div>

              {/* Grid Certificate Core Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs font-sans">
                {/* Weight (Sample Weight) - FIRST ITEM */}
                <div className="clear-liquid-glass !bg-white/[0.01] p-3 rounded-xl flex justify-between items-center border-white/5 col-span-1 sm:col-span-2">
                  <span className="text-gray-400 font-bold">وزن ناخالص نمونه:</span>
                  <span className="font-bold text-gray-100 text-sm">
                    {foundCert.weight !== undefined && foundCert.weight !== null && !isNaN(Number(foundCert.weight)) ? (
                      <>
                        {farsiDigits(Number(foundCert.weight))} <span className="text-[10px] text-gray-400 font-normal">گرم</span>
                      </>
                    ) : (
                      <span className="text-gray-500 font-normal">-</span>
                    )}
                  </span>
                </div>

                {/* Hallmark ID */}
                <div className="clear-liquid-glass !bg-white/[0.01] p-3 rounded-xl flex justify-between items-center border-white/5">
                  <span className="text-gray-400 font-bold">شماره انگ (مهر قطعه):</span>
                  <span className="font-mono font-bold text-[#d4af37] text-sm">{farsiDigits(foundCert.id)}</span>
                </div>

                {/* Customer Name */}
                <div className="clear-liquid-glass !bg-white/[0.01] p-3 rounded-xl flex justify-between items-center border-white/5">
                  <span className="text-gray-400 font-bold">نام مشتری:</span>
                  <span className="font-bold text-gray-250">{foundCert.ownerName}</span>
                </div>

                {/* Lab Name (Constant) */}
                <div className="clear-liquid-glass !bg-white/[0.01] p-3 rounded-xl flex justify-between items-center border-white/5 col-span-1 sm:col-span-2">
                  <span className="text-gray-400 font-bold">نام مرجع آزمایشگاهی:</span>
                  <span className="font-bold text-gray-250">آزمایشگاه سنجش عیار و ری‌گیری عسکرنژاد</span>
                </div>

                {/* Assay Date */}
                <div className="clear-liquid-glass !bg-white/[0.01] p-3 rounded-xl flex justify-between items-center border-white/5">
                  <span className="text-gray-400 font-bold">تاریخ عیارسنجی:</span>
                  <span className="font-bold text-[#d4af37]">{farsiDigits(foundCert.assayDate || '')}</span>
                </div>

                {/* Type Selection */}
                <div className="clear-liquid-glass !bg-white/[0.01] p-3 rounded-xl flex justify-between items-center border-white/5">
                  <span className="text-gray-400 font-bold">نوع قطعه / کالا:</span>
                  <span className="font-bold text-[#d4af37]">💍 {foundCert.itemType}</span>
                </div>
              </div>

              {/* Inspector Signature and Stamps */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-white/10">
                <div className="text-right">
                  <span className="text-[9px] text-gray-500">مهر کارشناس فنی و ناظر متالورژی ری‌گیری</span>
                  <p className="text-xs font-bold text-[#d4af37] mt-0.5">{foundCert.inspector}</p>
                </div>

                {/* Styled Gold Signature Stamp */}
                <div className="relative border border-[#d4af37]/35 text-[9px] text-[#d4af37] px-3 py-1 uppercase tracking-wider font-mono rounded-lg rotate-[-2deg] bg-yellow-950/20 max-w-max select-none font-bold">
                  Verified Assay Standard
                </div>
              </div>

            </div>

            {/* Print and share indicators inline */}
            <div className="text-center">
              <button
                type="button"
                onClick={clearInquiry}
                className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-8 py-3 rounded-xl cursor-pointer transition-all font-sans font-bold shadow-md"
              >
                <span>انجام استعلام جدید طلا و نقره</span>
              </button>
            </div>

          </div>
        )}

        {/* Beautiful Custom Error Card for Unregistered Codes */}
        {!loading && showNotFound && (
          <div className="mt-6 liquid-glass-item !border-red-500/35 rounded-[24px] p-5 md:p-6 text-right space-y-4 animate-[slideUp_0.3s_ease-out] relative overflow-hidden shadow-[0_15px_40px_rgba(239,68,68,0.15)]">
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-red-500/0 via-red-500/40 to-red-500/0" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-start gap-3 border-b border-red-500/15 pb-3">
              <div className="p-2 liquid-glass-item border-red-500/20 rounded-xl text-red-400 flex-shrink-0">
                <AlertTriangle size={20} className="animate-pulse" />
              </div>
              <div className="space-y-1 flex-grow">
                <h3 className="text-sm font-extrabold text-red-200">کد انگ در پایگاه داده ثبت نیست!</h3>
                <p className="text-[10px] text-gray-450">آزمایشگاه عیارسنجی عسکرنژاد</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowNotFound(false)}
                className="text-xs text-gray-500 hover:text-gray-300 p-1 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-gray-300 leading-relaxed font-sans font-medium">
              <p>
                کد وارد شده <strong className="text-red-400 font-mono font-bold bg-red-950/80 border border-red-900/40 px-2.5 py-0.5 rounded text-sm select-all">{farsiDigits(searchedCode)}</strong> معتبر نبوده و در پایگاه داده مرکزی عسکرنژاد ثبت نشده است. ساخت گواهینامه یا مهر حک شده روی این کالا با استانداردهای رسمی مطابقت ندارد.
              </p>
              
              <div className="liquid-glass-item p-4 rounded-xl space-y-1.5 text-[11px] text-gray-400">
                <p className="font-bold text-gray-200">راهنمای رفع مشکل:</p>
                <ul className="list-disc list-inside space-y-1 pr-1 w-full">
                  <li>بررسی کنید حروف را با کلام صحیح یا لاتین اشتباه تایپ نکرده باشید.</li>
                  <li>شماره انگ معمولاً تلفیقی از حروف انگلیسی و اعداد عیاری است (مثال: G750).</li>
                  <li>در صورت اطمینان، با شماره تلفن مستقیم پشتیبانی ما تماس بگیرید.</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1 font-sans">
              <button
                type="button"
                onClick={() => {
                  setShowNotFound(false);
                  const s = document.querySelector('input[type="text"]') as HTMLInputElement;
                  s?.focus();
                  s?.select();
                }}
                className="flex-1 text-center bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 text-red-300 hover:text-red-200 text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer"
              >
                تصحیح شماره انگ
              </button>
              {showPhone ? (
                <a
                  href="tel:09137209382"
                  className="flex-1 text-center bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/40 text-emerald-300 text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 block"
                  dir="ltr"
                >
                  ۰۹۱۳۷۲۰۹۳۸۲ <span className="text-[10px] text-emerald-400 font-normal font-sans">(تماس مستقیم)</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPhone(true)}
                  className="flex-1 text-center bg-gray-850 hover:bg-gray-800 border border-gray-750 text-gray-300 text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  ارتباط با کارشناس آزمایشگاه
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
