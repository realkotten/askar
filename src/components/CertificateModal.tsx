import React from 'react';
import { X, Award, CheckCircle2, Printer } from 'lucide-react';
import { AssayCertificate } from '../types';
import { farsiDigits } from '../data';

interface CertificateModalProps {
  certificate: AssayCertificate;
  onClose: () => void;
}

export default function CertificateModal({ certificate, onClose }: CertificateModalProps) {
  const isGold = certificate.metalType === 'gold';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-[fadeIn_0.2s_ease-out]">
      
      {/* Container Card - Styled with premium Clear Liquid Glass */}
      <div className="relative w-full max-w-2xl clear-liquid-glass rounded-[40px] overflow-hidden max-h-[90vh] flex flex-col before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/10 before:to-transparent before:pointer-events-none">
        
        {/* Abstract vector geometric background design of Apple Liquid Glass */}
        <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(#fff_1.5px,transparent_1.5px)] [background-size:24px_24px] pointer-events-none" />
        
        {/* Glowing certificate overlay decoration */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#d4af37]/0 via-[#d4af37] to-[#d4af37]/0" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#d4af37]/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Header toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 liquid-glass-item !rounded-none !border-t-0 !border-x-0 z-10">
          <div className="flex items-center gap-2">
            <Award className="text-[#d4af37]" size={20} />
            <span className="text-sm font-bold text-gray-200">
              {certificate.showTitle !== false ? (certificate.titleSelect || "شناسنامه رسمی عیارسنجی آزمایشگاهی") : "تاییدیه امنیتی عیارسنجی قطعه"}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg liquid-glass-item hover:scale-105 transition-all duration-200 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Certificate Scrollable Container */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 z-10 flex-grow font-sans" id="printable-certificate">
          
          {/* Certificate Inner Form with ornate frame */}
          <div className="relative border border-[#d4af37]/25 liquid-glass-item !bg-transparent rounded-[24px] p-5 md:p-6 space-y-6 overflow-hidden">
            
            {/* Holographic watermark background */}
            <div className="absolute right-6 top-6 opacity-[0.03] pointer-events-none select-none">
              <span className="text-[120px] font-extrabold select-none font-serif">A</span>
            </div>

            {/* Top Sheet: Badge Logo & Official Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div className="text-center sm:text-right">
                <h3 className="text-lg md:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#f5df99] via-[#d4af37] to-[#b3953b]">
                  آزمایشگاه عیار سنجی عسکرنژاد
                </h3>
                <p className="text-[10px] text-gray-400 font-sans mt-1">
                  تحت نظارت اداره کل استاندارد و ملی ایران
                </p>
              </div>

              {/* Hologram showing Tested Purity inside the circular badge - Styled Emerald Green */}
              <div className="relative w-24 h-24 flex flex-col items-center justify-center rounded-full bg-gradient-to-tr from-[#052e16] to-[#121317] border-2 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3),inset_0_0_10px_rgba(16,185,129,0.35)]">
                <span className="text-[9px] text-emerald-400 leading-none uppercase tracking-widest font-serif font-bold">Purity / عیار</span>
                <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-500 font-serif mt-1">
                  {farsiDigits(Math.round(certificate.testedPurity))}
                </span>
                <span className="text-[8px] text-gray-400 font-sans mt-0.5">ثبت رسمی</span>
              </div>
            </div>

            {/* Grid Certificate Core Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-sans">
              {/* Weight (Sample Weight) */}
              <div className="liquid-glass-item p-3.5 rounded-xl flex justify-between items-center col-span-1 md:col-span-2">
                <span className="text-gray-400 font-bold">وزن ناخالص نمونه:</span>
                <span className="font-bold text-gray-100 text-base">
                  {certificate.weight !== undefined && certificate.weight !== null && !isNaN(Number(certificate.weight)) ? (
                    <>
                      {farsiDigits(Number(certificate.weight))} <span className="text-xs text-gray-400 font-normal">گرم</span>
                    </>
                  ) : (
                    <span className="text-gray-500 font-normal">-</span>
                  )}
                </span>
              </div>

              {/* Hallmark ID */}
              <div className="liquid-glass-item p-3.5 rounded-xl flex justify-between items-center">
                <span className="text-gray-400 font-bold">شماره انگ (مهر قطعه):</span>
                <span className="font-mono font-bold text-[#d4af37] text-base">{farsiDigits(certificate.id)}</span>
              </div>

              {/* Customer Name */}
              <div className="liquid-glass-item p-3.5 rounded-xl flex justify-between items-center">
                <span className="text-gray-400 font-bold">نام مشتری:</span>
                <span className="font-bold text-gray-200">{certificate.ownerName}</span>
              </div>

              {/* Lab Name (Constant) */}
              <div className="liquid-glass-item p-3.5 rounded-xl flex justify-between items-center">
                <span className="text-gray-400 font-bold">نام آزمایشگاه:</span>
                <span className="font-bold text-gray-200">آزمایشگاه عیار سنجی عسکرنژاد</span>
              </div>

              {/* Assay Date */}
              <div className="liquid-glass-item p-3.5 rounded-xl flex justify-between items-center">
                <span className="text-gray-400 font-bold">تاریخ عیارسنجی:</span>
                <span className="font-bold text-[#d4af37]">{farsiDigits(certificate.assayDate || '')}</span>
              </div>

              {/* Type Selection */}
              <div className="liquid-glass-item p-3.5 rounded-xl flex justify-between items-center col-span-1 md:col-span-2">
                <span className="text-gray-400 font-bold">نوع قطعه / کالا:</span>
                <span className="font-bold text-[#d4af37]">{certificate.itemType}</span>
              </div>
            </div>

            {/* Inspector Signature without QR pass block */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-5 border-t border-[#d4af37]/15">
              
              <div className="text-right">
                <span className="text-[10px] text-gray-500">مهر رسمی آزمایشگاه و امضای ناظر فنی</span>
                <p className="text-xs font-bold text-[#d4af37] mt-1">{certificate.inspector}</p>
              </div>

              {/* Styled Gold Signature Stamp */}
              <div className="text-center">
                <div className="relative border border-[#d4af37]/45 text-[10px] text-[#d4af37] px-3.5 py-1 uppercase tracking-wider font-mono rounded-lg rotate-[-3deg] liquid-glass-item max-w-max select-none font-extrabold animate-pulse">
                  Verified Assay Standard
                </div>
              </div>

            </div>

          </div>

          {/* Remarks warning banner */}
          <div className="p-3.5 liquid-glass-item border-blue-500/15 text-blue-300 text-xs rounded-xl text-right flex items-start gap-2">
            <span className="inline-block mt-0.5 text-blue-400">•</span>
            <div>
              <p className="font-bold text-blue-200">ملاحظات بارز فنی:</p>
              <p className="text-[11px] text-gray-400 mt-1">{certificate.remarks}</p>
            </div>
          </div>

        </div>

        {/* Footer toolbar buttons - Print button has been completely removed per request - Styled with Liquid Glass */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 liquid-glass-item !rounded-none !border-b-0 !border-x-0 z-10 animate-[slideUp_0.2s_ease-out]">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs text-[#0d0f12] bg-gradient-to-r from-[#ffd700] via-[#ffd700] to-[#b8860b] hover:brightness-110 px-8 py-3 rounded-xl font-bold transition-all cursor-pointer shadow-[0_4px_12px_rgba(212,175,55,0.15)]"
          >
            <CheckCircle2 size={14} />
            <span>بستن پنجره</span>
          </button>
        </div>

      </div>
    </div>
  );
}
