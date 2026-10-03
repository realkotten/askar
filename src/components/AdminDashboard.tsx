import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, Key, LogOut, Plus, Minus, Trash2, Edit, Check, X, 
  Database, Coins, Search, ShieldCheck, Download, Upload, Sparkles, FileText, User, Copy,
  Image as ImageIcon, ChevronUp, ChevronDown, AlertCircle, ArrowRight
} from 'lucide-react';
import { AssayCertificate, GalleryItem } from '../types';
import { initialCertificatesList } from '../data/allCertificates';
import { dbService, getGoogleSheetUrl } from '../lib/dbService';
import { farsiDigits } from '../data';
import { getTodayJalali } from '../utils/dateUtils';
import { toEnglishDigits, toEnglishNumberOrString, findMissingHallmarkCodes } from '../utils/digitUtils';

/**
 * Helper to dynamically calculate next sequential hallmark codes (کد انگ).
 * If baseCode has numbers (e.g. 786498), suggests: 786499, 786500, 786501, 786502.
 * If baseCode has alphanumeric prefix (e.g. A820 or ASK-100), increments number: A821, A822, A823, A824.
 * If baseCode is empty, finds the highest/latest code registered in the certificates database.
 */
export function getSuggestedNextCodes(
  inputCode: string,
  certsList: AssayCertificate[] = [],
  count: number = 4
): { nextAutoCode: string; suggestions: string[]; lastExistingCode: string } {
  let lastFoundCode = '';

  if (certsList && certsList.length > 0) {
    const validCodes = certsList
      .map(c => toEnglishDigits(c.id || '').trim())
      .filter(id => id.length > 0);

    // Prefer pure numeric codes sorted by highest value
    const pureNumbers = validCodes.filter(id => /^\d+$/.test(id));
    if (pureNumbers.length > 0) {
      pureNumbers.sort((a, b) => {
        try {
          const numA = BigInt(a);
          const numB = BigInt(b);
          return numB > numA ? 1 : numB < numA ? -1 : 0;
        } catch {
          return b.localeCompare(a, undefined, { numeric: true });
        }
      });
      lastFoundCode = pureNumbers[0];
    } else {
      // Find codes containing numbers
      const withDigits = validCodes.filter(id => /\d+/.test(id));
      if (withDigits.length > 0) {
        lastFoundCode = withDigits[0];
      } else if (validCodes.length > 0) {
        lastFoundCode = validCodes[0];
      }
    }
  }

  // Fallback benchmark starting code if database is empty
  if (!lastFoundCode) {
    lastFoundCode = '786498';
  }

  // Derive the 4 suggestions from inputCode if non-empty; otherwise from lastFoundCode
  const rawBase = inputCode && inputCode.trim() ? inputCode.trim() : lastFoundCode;
  const baseToUse = toEnglishDigits(rawBase);

  const match = baseToUse.match(/^(.*?)(\d+)(.*?)$/);
  const suggestions: string[] = [];

  if (match) {
    const prefix = match[1];
    const numStr = match[2];
    const suffix = match[3];
    const padLength = numStr.length;

    try {
      const baseBigInt = BigInt(numStr);
      for (let i = 1; i <= count; i++) {
        const nextBigInt = baseBigInt + BigInt(i);
        const nextNumStr = nextBigInt.toString().padStart(padLength, '0');
        suggestions.push(`${prefix}${nextNumStr}${suffix}`);
      }
    } catch {
      const baseNum = parseInt(numStr, 10) || 0;
      for (let i = 1; i <= count; i++) {
        const nextNum = (baseNum + i).toString().padStart(padLength, '0');
        suggestions.push(`${prefix}${nextNum}${suffix}`);
      }
    }
  } else {
    for (let i = 1; i <= count; i++) {
      suggestions.push(`${baseToUse}-${i}`);
    }
  }

  // When input is empty, nextAutoCode is the first suggestion (+1 from previous database record)
  const nextAutoCode = inputCode && inputCode.trim() ? toEnglishDigits(inputCode.trim()) : suggestions[0];

  return {
    nextAutoCode,
    suggestions,
    lastExistingCode: lastFoundCode,
  };
}

interface AdminDashboardProps {
  onClose: () => void;
}

export default function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Database states
  const [certificates, setCertificates] = useState<AssayCertificate[]>(() => initialCertificatesList);
  const [dbStatus, setDbStatus] = useState<{
    configured: boolean;
    connected: boolean;
    error: string | null;
    details: { host: string; database: string; user: string; port: string } | null;
    firebase?: {
      initialized: boolean;
      projectId: string | null;
      databaseId: string | null;
    };
  } | null>(null);

  // Google Sheet database integration states
  const [sheetUrlInput, setSheetUrlInput] = useState(() => localStorage.getItem('GOOGLE_SHEET_URL') || '');
  const [showGoogleSheetGuide, setShowGoogleSheetGuide] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editModeId, setEditModeId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Gallery states
  const [activeTab, setActiveTab] = useState<'certificates' | 'gallery'>('certificates');
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [galleryTitle, setGalleryTitle] = useState('');
  const [gallerySubtitle, setGallerySubtitle] = useState('');
  const [galleryDescription, setGalleryDescription] = useState('');
  const [galleryCategory, setGalleryCategory] = useState('rings');
  const [galleryOrder, setGalleryOrder] = useState('');
  const [galleryImageUrl, setGalleryImageUrl] = useState(''); // Stores compressed base64
  const [gallerySuccess, setGallerySuccess] = useState('');
  const [galleryError, setGalleryError] = useState('');
  const [gallerySaving, setGallerySaving] = useState(false);
  const [galleryDeletingId, setGalleryDeletingId] = useState<string | null>(null);
  const [galleryDeleteConfirmId, setGalleryDeleteConfirmId] = useState<string | null>(null);

  // Form states for adding/editing
  const [hallmarkId, setHallmarkId] = useState('');
  const hallmarkInputRef = useRef<HTMLInputElement>(null);
  const [certificateNo, setCertificateNo] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [assayDate, setAssayDate] = useState('');
  const [metalType, setMetalType] = useState<'gold' | 'silver'>('gold');
  const [declaredPurity, setDeclaredPurity] = useState('۱۸ عیار (۷۵۰)');
  const [testedPurity, setTestedPurity] = useState<string | number>('');
  const [weight, setWeight] = useState<string | number>('');
  const [inspector, setInspector] = useState('مسئول فنی و ناظر رسمی آزمایشگاه عیارسنجی');
  const [status, setStatus] = useState<'approved' | 'rejected' | 'pending'>('approved');
  const [itemType, setItemType] = useState('');
  const [labBranch, setLabBranch] = useState('شعبه مرکزی بازار تهران');
  const [remarks, setRemarks] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');

  // Extended form fields from reference screenshot
  const [sendSms, setSendSms] = useState(true);
  const [showGoldWeight_reg, setShowGoldWeight_reg] = useState(true);
  const [showCustomerName, setShowCustomerName] = useState(true);
  const [showWeight, setShowWeight] = useState(true);
  const [sampleRegistered, setSampleRegistered] = useState('نمونه خاک شماره ۱');
  const [showSampleWeight, setShowSampleWeight] = useState(true);
  const [showActive, setShowActive] = useState(true);
  const [showGoldWeight, setShowGoldWeight] = useState(true);
  const [showPrepTime, setShowPrepTime] = useState(true);
  const [prepTime, setPrepTime] = useState('۲۴ ساعت کاری');
  const [showTitle, setShowTitle] = useState(true);
  const [titleSelect, setTitleSelect] = useState('برگه رسمی آزمایش عیارسنجی طلا و نقره');
  const [wageType, setWageType] = useState<'percentage' | 'fixed'>('percentage');
  const [wageAmount, setWageAmount] = useState('۰.۵٪');
  const [documentType, setDocumentType] = useState<'hallmark' | 'packet'>('hallmark');
  const [packetNumber, setPacketNumber] = useState('');

  // Contact list states
  const [contacts, setContacts] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ASKARNEJAD_CONTACTS');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return [
      'گالری طلا عسکرنژاد',
      'جواهری مظفریان',
      'طلاسازی خانی',
      'بازرگانی طلا نصر',
      'گالری کیا',
    ];
  });
  const [showContactSuggestions, setShowContactSuggestions] = useState(false);
  const [showContactManager, setShowContactManager] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const contactDropdownRef = useRef<HTMLDivElement>(null);

  const handleAddContact = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (contacts.includes(trimmed)) return;
    const updated = [...contacts, trimmed];
    setContacts(updated);
    localStorage.setItem('ASKARNEJAD_CONTACTS', JSON.stringify(updated));
    setNewContactName('');
  };

  const handleDeleteContact = (name: string) => {
    const updated = contacts.filter(c => c !== name);
    setContacts(updated);
    localStorage.setItem('ASKARNEJAD_CONTACTS', JSON.stringify(updated));
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (contactDropdownRef.current && !contactDropdownRef.current.contains(event.target as Node)) {
        setShowContactSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Default credentials
  const CORRECT_USERNAME = 'admin';
  const CORRECT_PASSCODE = '18750';

  useEffect(() => {
    // Check if previously logged in (including permanent local storage)
    const adminSession = localStorage.getItem('askarnejad_admin_logged_perm') || sessionStorage.getItem('askarnejad_admin_logged');
    if (adminSession === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (isAuthenticated) {
        const certs = await loadCertificates();
        await loadGalleryItems();
        resetForm(certs);
      }
    })();
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && !editModeId && !hallmarkId && certificates.length > 0) {
      const { nextAutoCode } = getSuggestedNextCodes('', certificates, 4);
      if (nextAutoCode) {
        setHallmarkId(nextAutoCode);
      }
    }
  }, [isAuthenticated, certificates, editModeId, hallmarkId]);

  const loadCertificates = async () => {
    try {
      const allCerts = await dbService.getAllCertificates();
      setCertificates(allCerts);
      // Refresh database config connection status from server API
      try {
        const response = await fetch('/api/db-status');
        if (response.ok) {
          const statusData = await response.json();
          setDbStatus(statusData);
        }
      } catch (err) {
        console.warn('Could not fetch database connection status:', err);
      }
      return allCerts;
    } catch (e) {
      console.error('Failed to load certificates', e);
      return [];
    }
  };

  const loadGalleryItems = async () => {
    try {
      setGalleryItems(await dbService.getAllGalleryItems());
    } catch (e) {
      console.error('Failed to load gallery items', e);
    }
  };

  const handleGalleryImageUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Canvas compression to shrink size & safe transmission footprint
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 640;
        const MAX_HEIGHT = 480;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
          setGalleryImageUrl(compressedBase64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveGalleryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setGalleryError('');
    setGallerySuccess('');

    if (!galleryTitle.trim()) {
      setGalleryError('لطفاً عنوان تصویر را وارد کنید.');
      return;
    }
    if (!galleryImageUrl) {
      setGalleryError('لطفاً تصویر گالری را بارگذاری کنید.');
      return;
    }

    setGallerySaving(true);
    try {
      const newItem: GalleryItem = {
        id: `gal-${Date.now()}`,
        title: galleryTitle.trim(),
        subtitle: gallerySubtitle.trim() || undefined,
        description: galleryDescription.trim() || undefined,
        category: galleryCategory,
        imageUrl: galleryImageUrl,
        order: galleryOrder.trim() ? Number(galleryOrder.trim()) : 999999,
        createdAt: new Date().toISOString()
      };

      await dbService.saveGalleryItem(newItem);

      setGallerySuccess('تصویر با موفقیت ثبت شد.');
      setGalleryTitle('');
      setGallerySubtitle('');
      setGalleryDescription('');
      setGalleryOrder('');
      setGalleryImageUrl('');
      await loadGalleryItems();
      
      // Dispatch live sync event
      window.dispatchEvent(new Event('refresh-gallery'));
      
      setTimeout(() => setGallerySuccess(''), 4000);
    } catch (err: any) {
      setGalleryError(err.message || 'خطا در ثبت تصویر گالری تصاویر.');
    } finally {
      setGallerySaving(false);
    }
  };

  const handleDeleteGalleryItem = async (id: string) => {
    setGalleryDeletingId(id);
    // Optimistically update local list state for instant UI response
    setGalleryItems(prev => prev.filter(p => p.id !== id));
    try {
      await dbService.deleteGalleryItem(id);
      await loadGalleryItems();
      
      // Dispatch live sync event
      window.dispatchEvent(new Event('refresh-gallery'));
    } catch (err) {
      console.error('Failed to delete gallery item', err);
      await loadGalleryItems(); // rollback
      setGalleryError('خطا در حذف تصویر از سرور.');
    } finally {
      setGalleryDeletingId(null);
    }
  };

  const handleMoveGalleryItem = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= galleryItems.length) return;

    const currentItem = galleryItems[index];
    const adjacentItem = galleryItems[targetIndex];

    // Read or construct safe numeric orders
    const orderCurrent = currentItem.order !== undefined && currentItem.order !== null ? currentItem.order : (index * 10 + 10);
    const orderAdjacent = adjacentItem.order !== undefined && adjacentItem.order !== null ? adjacentItem.order : (targetIndex * 10 + 10);

    let newOrderCurrent = orderAdjacent;
    let newOrderAdjacent = orderCurrent;

    // Direct collision resolution
    if (newOrderCurrent === newOrderAdjacent) {
      newOrderCurrent = direction === 'up' ? orderAdjacent - 1 : orderAdjacent + 1;
    }

    const updatedCurrent = { ...currentItem, order: newOrderCurrent };
    const updatedAdjacent = { ...adjacentItem, order: newOrderAdjacent };

    // Update state optimistically
    const updatedItems = [...galleryItems];
    updatedItems[index] = updatedAdjacent;
    updatedItems[targetIndex] = updatedCurrent;

    // Apply immediate sorting
    updatedItems.sort((a, b) => {
      const orderA = a.order !== undefined && a.order !== null ? Number(a.order) : 999999;
      const orderB = b.order !== undefined && b.order !== null ? Number(b.order) : 999999;
      if (orderA !== orderB) return orderA - orderB;
      return b.createdAt.localeCompare(a.createdAt);
    });

    setGalleryItems(updatedItems);

    try {
      await dbService.saveGalleryItem(updatedCurrent);
      await dbService.saveGalleryItem(updatedAdjacent);
      await loadGalleryItems();
      window.dispatchEvent(new Event('refresh-gallery'));
    } catch (err) {
      console.error('Failed to swap gallery items order', err);
      await loadGalleryItems();
    }
  };

  const handleSaveGoogleSheetUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = sheetUrlInput.trim();
    if (cleanUrl) {
      if (!cleanUrl.startsWith('https://script.google.com/')) {
        alert('آدرس اسکریپت نامعتبر است. آدرس وب‌اپ گوگل باید با https://script.google.com شروع شود.');
        return;
      }
      localStorage.setItem('GOOGLE_SHEET_URL', cleanUrl);
    } else {
      localStorage.removeItem('GOOGLE_SHEET_URL');
    }
    await loadCertificates();
  };

  const handleCopyAppsScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim().toLowerCase() === CORRECT_USERNAME && password === CORRECT_PASSCODE) {
      setIsAuthenticated(true);
      // Permanent storage for auto-login to prevent constant credentials prompts as requested by the user
      localStorage.setItem('askarnejad_admin_logged_perm', 'true');
      sessionStorage.setItem('askarnejad_admin_logged', 'true');
      setLoginError('');
    } else {
      setLoginError('نام کاربری یا کلمه عبور مدیریت نامعتبر است.');
      setPassword('');
      setTimeout(() => setLoginError(''), 4000);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('askarnejad_admin_logged');
    localStorage.removeItem('askarnejad_admin_logged_perm');
    setUsername('');
    setPassword('');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportSuccess('');
    setImportError('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const rawText = event.target?.result as string;
        if (!rawText || !rawText.trim()) {
          throw new Error('فایل انتخاب شده خالی است.');
        }

        // Clean UTF-8 BOM or surrounding whitespace
        const cleanText = rawText.replace(/^\uFEFF/, '').trim();
        let parsedData: any;
        try {
          parsedData = JSON.parse(cleanText);
        } catch {
          throw new Error('فرمت فایل نامعتبر است. فایل باید یک JSON معتبر باشد.');
        }

        // If double stringified, parse once more
        if (typeof parsedData === 'string') {
          try {
            parsedData = JSON.parse(parsedData);
          } catch (_) {}
        }

        // Extract raw items from multiple potential export schemas
        let rawItems: any[] = [];
        if (Array.isArray(parsedData)) {
          rawItems = parsedData;
        } else if (parsedData && typeof parsedData === 'object') {
          if (Array.isArray(parsedData.certificates)) {
            rawItems = parsedData.certificates;
          } else if (Array.isArray(parsedData.data)) {
            rawItems = parsedData.data;
          } else if (Array.isArray(parsedData.items)) {
            rawItems = parsedData.items;
          } else if (Array.isArray(parsedData.rows)) {
            rawItems = parsedData.rows;
          } else if (Array.isArray(parsedData.records)) {
            rawItems = parsedData.records;
          } else if (parsedData.askarnejad_certificates_db) {
            const dbVal = parsedData.askarnejad_certificates_db;
            rawItems = Array.isArray(dbVal) ? dbVal : Object.values(dbVal);
          } else {
            // Assume key-value map dictionary where key is certificate ID
            rawItems = Object.entries(parsedData).map(([key, val]) => {
              if (val && typeof val === 'object') {
                return { id: key, ...(val as object) };
              }
              return null;
            }).filter(Boolean);
          }
        }

        if (!rawItems || rawItems.length === 0) {
          throw new Error('هیچ داده یا شناسنامه‌ای در فایل JSON یافت نشد.');
        }

        // Normalize and extract valid certificates
        const normalizedList: AssayCertificate[] = [];

        for (const item of rawItems) {
          if (!item || typeof item !== 'object') continue;

          // Resolve ID / hallmark code (supports standard and Persian property names)
          const rawId = item.id || item.hallmarkId || item.hallmark_id || item.hallmark || 
                        item.code || item.Code || item['کد انگ'] || item['کد_انگ'] || item['شماره انگ'] || 
                        item['شماره_انگ'] || item['کد'] || item['انگ'] || item.certificateNo || 
                        item.certificate_no || item.certNo || item.serial || item.ID || item.key || item.Key || '';

          const cleanId = toEnglishDigits(String(rawId)).trim().toUpperCase();
          if (!cleanId) continue;

          // Resolve tested purity
          const rawPurity = item.testedPurity ?? item.tested_purity ?? item.purity ?? 
                            item.ayar ?? item.tested_ayar ?? item.ayarTested ?? 
                            item['عیار'] ?? item['عیار سنجیده شده'] ?? item['عیار_سنجیده_شده'] ?? 
                            item['عیار آزمایشگاه'] ?? 750;
          const purityNum = typeof rawPurity === 'number' 
            ? rawPurity 
            : parseFloat(toEnglishDigits(String(rawPurity)).replace(/[٫,\/]/g, '.')) || 750;

          // Resolve weight
          const rawWeight = item.weight ?? item.vazn ?? item.goldWeight ?? item.gold_weight ?? 
                            item['وزن'] ?? item['وزن نمونه'] ?? item['وزن_نمونه'] ?? item['وزن طلا'];
          let weightNum: number | null = null;
          if (rawWeight !== undefined && rawWeight !== null && rawWeight !== '') {
            const parsedW = typeof rawWeight === 'number' 
              ? rawWeight 
              : parseFloat(toEnglishDigits(String(rawWeight)).replace(/[٫,\/]/g, '.'));
            if (!isNaN(parsedW) && parsedW >= 0) {
              weightNum = parsedW;
            }
          }

          const certNo = item.certificateNo || item.certificate_no || item.certNo || item['شماره گواهی'] || item['شماره_گواهی'] || `ATC-${cleanId}`;
          const owner = item.ownerName || item.owner_name || item.owner || item.customerName || 
                        item.customer_name || item.customer || item.name || item['نام'] || 
                        item['نام مشتری'] || item['نام_مشتری'] || item['مالک'] || '';
          const assayDateVal = item.assayDate || item.assay_date || item.date || item.tarikh || 
                               item['تاریخ'] || item['تاریخ عیارسنجی'] || getTodayJalali();
          const metal = item.metalType || item.metal_type || item.metal || (String(item['فلز'] || '').includes('نقره') ? 'silver' : 'gold');
          const declared = item.declaredPurity || item.declared_purity || item.declared_ayar || item['عیار اسمی'] || '۱۸ عیار (۷۵۰)';
          const inspectorVal = item.inspector || item.inspector_name || item.supervisor || item['کارشناس'] || item['ناظر'] || 'مسئول فنی و ناظر رسمی آزمایشگاه عیارسنجی عسکرنژاد';
          const statusVal = item.status || item.approvalStatus || item['وضعیت'] || 'approved';
          const itemTypeVal = item.itemType || item.item_type || item.item || item.type || item['نوع قطعه'] || item['نوع'] || 'ساخت';
          const lab = item.labBranch || item.lab_branch || item.branch || item['شعبه'] || 'آزمایشگاه عیار سنجی عسکرنژاد';
          const remarksVal = item.remarks || item.notes || item.description || item.tozihat || item['توضیحات'] || item['ملاحظات'] || undefined;
          const qrVal = item.qrValue || item.qr_value || `https://askarnejad-gold.com/verify/${cleanId}`;

          const normCert: AssayCertificate = {
            id: cleanId,
            certificateNo: certNo,
            ownerName: owner,
            assayDate: assayDateVal,
            metalType: metal,
            declaredPurity: declared,
            testedPurity: purityNum,
            weight: weightNum,
            inspector: inspectorVal,
            status: statusVal,
            itemType: itemTypeVal,
            labBranch: lab,
            qrValue: qrVal,
            remarks: remarksVal,

            // Additional customizable options with smart fallback
            sendSms: item.sendSms === undefined ? true : (item.sendSms === true || item.sendSms === 1 || item.sendSms === '1'),
            showGoldWeight_reg: item.showGoldWeight_reg === undefined ? true : (item.showGoldWeight_reg === true || item.showGoldWeight_reg === 1 || item.showGoldWeight_reg === '1'),
            showCustomerName: item.showCustomerName === undefined ? true : (item.showCustomerName === true || item.showCustomerName === 1 || item.showCustomerName === '1'),
            showWeight: item.showWeight === undefined ? true : (item.showWeight === true || item.showWeight === 1 || item.showWeight === '1'),
            sampleRegistered: item.sampleRegistered || item.sample_registered || 'نمونه خاک شماره ۱',
            showSampleWeight: item.showSampleWeight === undefined ? true : (item.showSampleWeight === true || item.showSampleWeight === 1 || item.showSampleWeight === '1'),
            showActive: item.showActive === undefined ? true : (item.showActive === true || item.showActive === 1 || item.showActive === '1'),
            showGoldWeight: item.showGoldWeight === undefined ? true : (item.showGoldWeight === true || item.showGoldWeight === 1 || item.showGoldWeight === '1'),
            showPrepTime: item.showPrepTime === undefined ? true : (item.showPrepTime === true || item.showPrepTime === 1 || item.showPrepTime === '1'),
            prepTime: item.prepTime || item.prep_time || '۲۴ ساعت کاری',
            showTitle: item.showTitle === undefined ? true : (item.showTitle === true || item.showTitle === 1 || item.showTitle === '1'),
            titleSelect: item.titleSelect || item.title_select || 'برگه رسمی آزمایش عیارسنجی طلا و نقره',
            wageType: item.wageType || item.wage_type || 'percentage',
            wageAmount: item.wageAmount || item.wage_amount || '۰.۵٪',
            documentType: item.documentType || item.document_type || 'hallmark',
            packetNumber: item.packetNumber || item.packet_number || undefined,
          };

          normalizedList.push(normCert);
        }

        if (normalizedList.length === 0) {
          throw new Error('هیچ شناسنامه معتبری با شناسه یا کد انگ در فایل یافت نشد.');
        }

        const result = await dbService.saveCertificatesBatch(normalizedList);
        await loadCertificates();

        setImportSuccess(`تعداد ${farsiDigits(result.savedCount || normalizedList.length)} شناسنامه با موفقیت وارد پایگاه داده گردید.`);
        
        setTimeout(() => {
          setImportSuccess('');
        }, 5000);
      } catch (err: any) {
        console.error('Import database error:', err);
        setImportError(err?.message || 'خطا در خواندن و بارگذاری فایل پشتیبان.');
        setTimeout(() => {
          setImportError('');
        }, 6000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const resetForm = (customCertsList?: AssayCertificate[]) => {
    const listToUse = customCertsList || certificates;
    const { nextAutoCode } = getSuggestedNextCodes('', listToUse, 4);
    setHallmarkId(nextAutoCode);
    // Auto-generate a beautiful certificate number
    const randomSerial = Math.floor(1000 + Math.random() * 9000);
    setCertificateNo(`ATC-2026-${randomSerial}`);
    setOwnerName('');
    
    // Automatically retrieve current Shamsi date
    setAssayDate(getTodayJalali());
    
    setMetalType('gold');
    setDeclaredPurity('۱۸ عیار (۷۵۰)');
    setTestedPurity('');
    setWeight('');
    setInspector('مسئول فنی و ناظر رسمی آزمایشگاه عیارسنجی عسکرنژاد');
    setStatus('approved');
    setItemType('ساخت');
    setLabBranch('آزمایشگاه عیار سنجی عسکرنژاد');
    setRemarks('آنالیز دقیق ساختاری و ذوب با روش سنجش عیار رسمی عسکرنژاد.');
    setEditModeId(null);
    setFormError('');

    // Reset screenshot properties
    setSendSms(true);
    setShowGoldWeight_reg(true);
    setShowCustomerName(true);
    setShowWeight(true);
    setSampleRegistered('نمونه خاک شماره ۱');
    setShowSampleWeight(true);
    setShowActive(true);
    setShowGoldWeight(true);
    setShowPrepTime(true);
    setPrepTime('۲۴ ساعت کاری');
    setShowTitle(true);
    setTitleSelect('برگه رسمی آزمایش عیارسنجی طلا و نقره');
    setWageType('percentage');
    setWageAmount('۰.۵٪');
    setDocumentType('hallmark');
    setPacketNumber('');
  };

  const handleAddCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const cleanId = toEnglishDigits(hallmarkId).trim().toUpperCase();

    if (!cleanId) {
      setFormError('لطفاً شماره انگ طلا را وارد کنید.');
      return;
    }

    // Verify if it exists when creating new (not editing)
    if (!editModeId) {
      const existing = await dbService.getCertificate(cleanId);
      if (existing) {
        setFormError(`کد انگ ${cleanId} از قبل در پایگاه داده وجود دارد.`);
        return;
      }
    }

    const testedPurityStr = toEnglishNumberOrString(testedPurity);
    const testedPurityNum = parseFloat(testedPurityStr);

    if (isNaN(testedPurityNum) || testedPurityNum <= 0) {
      setFormError('لطفاً عیار سنجیده شده را به عنوان عدد معتبر وارد کنید.');
      return;
    }

    const weightTrimmed = toEnglishNumberOrString(weight).trim();
    let weightNum: number | null = null;
    if (weightTrimmed !== '') {
      const parsedW = parseFloat(weightTrimmed);
      if (isNaN(parsedW) || parsedW <= 0) {
        setFormError('لطفاً وزن کالا را به عنوان عدد معتبر یا خالی بگذارید.');
        return;
      }
      weightNum = parsedW;
    }

    const newCert: AssayCertificate = {
      id: cleanId,
      certificateNo,
      ownerName,
      assayDate,
      metalType,
      declaredPurity,
      testedPurity: testedPurityNum,
      weight: weightNum,
      inspector,
      status,
      itemType,
      labBranch,
      qrValue: `https://askarnejad-gold.com/verify/${cleanId}`,
      remarks: remarks || undefined,

      // Screenshot-introduced variables
      sendSms,
      showGoldWeight_reg,
      showCustomerName,
      showWeight,
      sampleRegistered,
      showSampleWeight,
      showActive,
      showGoldWeight,
      showPrepTime,
      prepTime,
      showTitle,
      titleSelect,
      wageType,
      wageAmount,
      documentType,
      packetNumber
    };

    try {
      await dbService.saveCertificate(newCert);
      setFormSuccess(editModeId ? 'اطلاعات گواهی با موفقیت بروزرسانی شد.' : 'اطلاعات طلای تست شده با موفقیت در دیتابیس ذخیره شد.');
      const updatedCerts = await loadCertificates();
      
      setTimeout(() => {
        setFormSuccess('');
        resetForm(updatedCerts);
      }, 1500);
    } catch (e: any) {
      setFormError(e?.message || 'خطا در ذخیره اطلاعات. لطفا دوباره تلاش کنید.');
    }
  };

  const handleEdit = (cert: AssayCertificate) => {
    setEditModeId(cert.id);
    setHallmarkId(cert.id);
    setCertificateNo(cert.certificateNo);
    setOwnerName(cert.ownerName);
    setAssayDate(cert.assayDate);
    setMetalType(cert.metalType);
    setDeclaredPurity(cert.declaredPurity);
    setTestedPurity(cert.testedPurity.toString());
    setWeight(cert.weight !== undefined && cert.weight !== null ? cert.weight.toString() : '');
    setInspector(cert.inspector);
    setStatus(cert.status);
    setItemType(cert.itemType);
    setLabBranch(cert.labBranch);
    setRemarks(cert.remarks || '');

    // Set interactive options with elegant defaults
    setSendSms(cert.sendSms ?? true);
    setShowGoldWeight_reg(cert.showGoldWeight_reg ?? true);
    setShowCustomerName(cert.showCustomerName ?? true);
    setShowWeight(cert.showWeight ?? true);
    setSampleRegistered(cert.sampleRegistered ?? 'نمونه خاک شماره ۱');
    setShowSampleWeight(cert.showSampleWeight ?? true);
    setShowActive(cert.showActive ?? true);
    setShowGoldWeight(cert.showGoldWeight ?? true);
    setShowPrepTime(cert.showPrepTime ?? true);
    setPrepTime(cert.prepTime ?? '۲۴ ساعت کاری');
    setShowTitle(cert.showTitle ?? true);
    setTitleSelect(cert.titleSelect ?? 'برگه رسمی آزمایش عیارسنجی طلا و نقره');
    setWageType(cert.wageType ?? 'percentage');
    setWageAmount(cert.wageAmount ?? '۰.۵٪');
    setDocumentType(cert.documentType ?? 'hallmark');
    setPacketNumber(cert.packetNumber ?? '');

    // Scroll form into view
    document.getElementById('admin-form-container')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(`آیا از حذف دائم اطلاعات کد انگ ${id} از دیتابیس مراجعین آزمایشگاه اطمینان دارید؟`)) {
      try {
        await dbService.deleteCertificate(id);
        await loadCertificates();
      } catch (e) {
        console.error('Failed to delete', e);
      }
    }
  };

  const exportBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(certificates, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `askarnejad_database_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Numerals Normalizers for seamless search across Persian, Arabic and Western digits
  const toEnglishDigits = (s: string): string => {
    if (!s) return '';
    return s.toString()
      .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
      .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
  };

  const toEnglishDecimal = (s: string): string => {
    if (!s) return '';
    const norm = toEnglishDigits(s);
    return norm.replace(/[٫,\/]/g, '.');
  };

  const toFarsiDigits = (s: string) => s.replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d, 10)]);

  const filteredCerts = certificates.filter(cert => {
    if (!searchQuery.trim()) return true;
    const qLower = searchQuery.toLowerCase();
    const qEng = toEnglishDigits(qLower);
    const qFar = toFarsiDigits(qLower);

    const matches = (target: string) => {
      const tLower = target.toLowerCase();
      return tLower.includes(qLower) || tLower.includes(qEng) || tLower.includes(qFar);
    };

    return (
      matches(cert.id) ||
      matches(cert.ownerName) ||
      matches(cert.itemType) ||
      matches(cert.certificateNo) ||
      matches(cert.assayDate)
    );
  });

  // Match and highlight search term in text returning safe JSX
  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return <span>{text}</span>;

    const qLower = query.toLowerCase();
    const qEng = toEnglishDigits(qLower);
    const qFar = toFarsiDigits(qLower);

    // Keep unique search terms and escape regex characters to prevent syntax issues
    const escapeRegex = (s: string) => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const terms = Array.from(new Set([qLower, qEng, qFar].filter(Boolean))).map(escapeRegex);
    
    if (terms.length === 0) return <span>{text}</span>;

    try {
      const regex = new RegExp(`(${terms.join('|')})`, 'gi');
      const parts = text.split(regex);
      
      return (
        <span>
          {parts.map((part, i) => {
            const isMatch = regex.test(part);
            return isMatch ? (
              <mark 
                key={i} 
                className="bg-[#d4af37]/35 text-slate-900 rounded px-0.5 font-bold border border-[#d4af37]/40 mx-0.5 select-all"
              >
                {part}
              </mark>
            ) : (
              <span key={i}>{part}</span>
            );
          })}
        </span>
      );
    } catch (e) {
      return <span>{text}</span>;
    }
  };

  // Detect missing sequential hallmark codes (کدهای جامانده / مفقودی)
  const missingHallmarkCodes = findMissingHallmarkCodes(certificates.map(c => c.id)).missingCodesList;

  // Dynamically calculate next 4 sequential hallmark code suggestions
  const { suggestions: suggestedCodes, lastExistingCode } = getSuggestedNextCodes(
    hallmarkId,
    certificates,
    4
  );

  const handleStepHallmark = (delta: number) => {
    const current = toEnglishDigits((hallmarkId || '').trim());
    if (!current) {
      const { nextAutoCode } = getSuggestedNextCodes('', certificates, 1);
      const baseCode = nextAutoCode || '1';
      setHallmarkId(baseCode);
      return;
    }

    const match = current.match(/^(.*?)(\d+)(.*?)$/);
    if (!match) {
      return;
    }

    const prefix = match[1];
    const numStr = match[2];
    const suffix = match[3];
    const numVal = parseInt(numStr, 10);
    const nextVal = Math.max(1, numVal + delta);
    const padded = String(nextVal).padStart(numStr.length, '0');
    setHallmarkId(`${prefix}${padded}${suffix}`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-50 flex flex-col font-sans select-none text-gray-800" dir="rtl">
      
      {/* Decorative Golden Accent Lines */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#ffd700] via-[#d4af37] to-[#aa8c2c]" />

      {/* Header of the full screen portal */}
      <header className="bg-white/95 border-b border-gray-200 py-4 px-6 sm:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-[#d4af37]/35 flex items-center justify-center shadow-[0_2px_8px_rgba(212,175,55,0.1)]">
            <Database className="text-[#aa8210]" size={20} />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-gray-900">
              سامانه مدیریت آزمایشگاه عیارسنجی
            </h1>
            <p className="text-[10px] text-gray-500 font-medium">پورتال اختصاصی و امنیتی ثبت نتایج ری‌گیری طلا و نقره</p>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-600 hover:text-gray-900 transition-all cursor-pointer"
          title="بستن پنل مدیریت"
        >
          <X size={20} />
        </button>
      </header>

      {/* 1. AUTHENTICATION PROTECTION VIEW */}
      {!isAuthenticated ? (
        <div className="flex-grow flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md bg-white border border-gray-200 shadow-xl rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute -top-16 -left-16 w-32 h-32 rounded-full bg-[#d4af37]/5 blur-[45px]" />
            <div className="absolute -bottom-16 -right-16 w-32 h-32 rounded-full bg-[#aa8c2c]/5 blur-[45px]" />

            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center mx-auto mb-4">
                <Lock className="text-[#aa8210]" size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">درگاه ورود امنیتی مدیریت</h2>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                این بخش انحصاراً در اختیار مدیریت و ناظر فنی آزمایشگاه جهت ثبت اسناد و پاسخ عیارسنجی می‌باشد.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username Input */}
              <div className="space-y-1.5 text-right">
                <label className="text-xs text-gray-700 block pr-1 font-bold">نام کاربری مدیریت:</label>
                <div className="relative flex items-center">
                  <span className="absolute right-3.5 text-[#aa8210]">
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="نام کاربری (admin)"
                    className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#d4af37] rounded-xl text-center font-bold text-gray-900 placeholder-gray-400 focus:outline-none transition-all select-text font-sans text-sm"
                    dir="ltr"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5 text-right">
                <label className="text-xs text-gray-700 block pr-1 font-bold">کلمه عبور امنیتی:</label>
                <div className="relative flex items-center">
                  <span className="absolute right-3.5 text-[#aa8210]">
                    <Key size={16} />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="رمز عبور مدیریت"
                    className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#d4af37] rounded-xl text-center font-bold tracking-widest text-gray-900 placeholder-gray-400 focus:outline-none transition-all select-text text-sm"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Login credentials screen cleared of plain sight hints for security */}

              {loginError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <X size={14} className="flex-shrink-0" />
                  <p className="flex-grow text-right">{loginError}</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-[#f5df99] via-[#d4af37] to-[#aa8c2c] text-[#0d0f12] font-extrabold py-3 rounded-xl cursor-pointer hover:from-[#fcf0c2] hover:via-[#e6c148] transition-all shadow-[0_4px_15px_rgba(212,175,55,0.15)] flex items-center justify-center gap-2 text-xs font-sans"
              >
                <ShieldCheck size={16} />
                تایید اعتبار و ورود امن
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-grow flex flex-col w-full relative z-10 overflow-x-hidden select-none">
          {/* Tabs Selector Navigation */}
          <div className="bg-white border-b border-gray-200 px-6 sm:px-12 py-3.5 flex items-center justify-start gap-4 flex-shrink-0 select-none">
            <button
              onClick={() => setActiveTab('certificates')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                activeTab === 'certificates' 
                  ? 'bg-[#d4af37] text-slate-900 shadow-md font-bold' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-slate-100'
              }`}
            >
              <Coins size={14} />
              <span>مدیریت انگ و مراجعین</span>
            </button>
            
            <button
              onClick={() => setActiveTab('gallery')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                activeTab === 'gallery' 
                  ? 'bg-[#d4af37] text-slate-900 shadow-md font-bold' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-slate-100'
              }`}
            >
              <ImageIcon size={14} />
              <span>مدیریت گالری تصاویر</span>
            </button>
          </div>

          {activeTab === 'certificates' ? (
            <div className="flex-grow max-w-7xl mx-auto w-full px-[3px] py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
          
          {/* LEFT SIDE/PANEL (Inputs FORM): Coordinates 5 of 12 width on Large view */}
          <div className="lg:col-span-5 space-y-6" id="admin-form-container">
            
            {/* Form Glass Card */}
            <div className="bg-white border-2 border-gray-200/90 rounded-3xl pl-[4px] pr-[4px] pt-[20px] pb-5 sm:pb-7 space-y-6 relative shadow-lg">
              <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-[#d4af37]/10 blur-[50px] pointer-events-none" />
              
              <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <h3 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2 mr-[42px]">
                  <Plus className="text-[#aa8210]" size={20} />
                  {editModeId ? 'ویرایش شناسنامه فنی انگ' : 'ثبت اطلاعات انگ آزمایشگاهی جدید'}
                </h3>
              </div>

              <form onSubmit={handleAddCertificate} className="space-y-6">
                
                {/* 1. MAIN SPECIFICATION SECTION */}
                <div className="space-y-5 bg-slate-50/90 p-4 sm:p-6 rounded-3xl border border-gray-200/90 shadow-inner">
                  {!editModeId && lastExistingCode ? (
                    <div className="pb-2 flex justify-center sm:justify-end border-b border-gray-200">
                      <span className="w-[260px] h-[30.5px] pl-0 font-bold text-[15px] leading-[29.5px] text-center text-gray-700 inline-block">
                        آخرین کد انگ ثبت شده: <strong className="text-gray-950 font-mono font-bold text-[20px]">{lastExistingCode}</strong>
                      </span>
                    </div>
                  ) : null}
                  
                  {/* Hallmark ID (Big mobile input) */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs sm:text-sm text-gray-900 block font-black">
                        شماره انگ (مهر قطعه طلا یا نقره):
                      </label>
                      {editModeId && (
                        <span className="text-[11px] text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md font-bold">
                          غیرقابل تغییر در حالت ویرایش
                        </span>
                      )}
                    </div>

                    <div className="relative flex items-center">
                      {!editModeId && (
                        <button
                          type="button"
                          onClick={() => handleStepHallmark(-1)}
                          className="absolute left-2.5 sm:left-3.5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100 text-amber-900 border border-amber-300 hover:border-amber-400 transition-all duration-150 active:scale-90 shadow-sm cursor-pointer"
                          title="کاهش شماره انگ (-۱)"
                          aria-label="کاهش شماره انگ"
                        >
                          <Minus size={20} strokeWidth={2.5} />
                        </button>
                      )}

                      <input
                        ref={hallmarkInputRef}
                        type="text"
                        value={hallmarkId}
                        onChange={(e) => setHallmarkId(e.target.value)}
                        placeholder="مثال: 786498 یا A820"
                        className="w-full h-14 sm:h-16 pl-14 pr-14 sm:pl-16 sm:pr-16 bg-white border-2 border-amber-300 focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/20 rounded-2xl text-gray-950 font-black font-mono tracking-widest text-center focus:outline-none transition-all placeholder-gray-400 select-text text-xl sm:text-2xl shadow-sm"
                        dir="ltr"
                        disabled={!!editModeId}
                      />

                      {!editModeId && (
                        <button
                          type="button"
                          onClick={() => handleStepHallmark(+1)}
                          className="absolute right-2.5 sm:right-3.5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100 text-amber-900 border border-amber-300 hover:border-amber-400 transition-all duration-150 active:scale-90 shadow-sm cursor-pointer"
                          title="افزایش شماره انگ (+۱)"
                          aria-label="افزایش شماره انگ"
                        >
                          <Plus size={20} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>

                    {/* ⚠️ Missing Hallmark Codes Alert (کدهای انگ جا افتاده / مفقودی) */}
                    {!editModeId && missingHallmarkCodes.length > 0 && (
                      <div className="bg-rose-50/90 border-2 border-rose-300/80 rounded-2xl p-3.5 sm:p-4 space-y-2.5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm text-rose-950 font-black flex items-center gap-1.5">
                            <AlertCircle size={17} className="text-rose-600 flex-shrink-0" />
                            <span>کدهای انگ جامانده بین اسناد ({missingHallmarkCodes.length} مورد):</span>
                          </span>
                          <span className="text-[10px] sm:text-xs font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-md">
                            نیازمند ثبت
                          </span>
                        </div>
                        
                        <p className="text-[11px] sm:text-xs text-rose-800 leading-relaxed font-medium">
                          بین شماره‌های انگ ثبت شده در سیستم، کدهای زیر جا افتاده‌اند. برای ثبت یا بررسی روی هر کد کلیک کنید:
                        </p>

                        <div className="flex flex-wrap gap-2 pt-1">
                          {missingHallmarkCodes.slice(0, 12).map((missingCode, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setHallmarkId(missingCode)}
                              className="px-3 py-1.5 bg-white hover:bg-rose-100 border-2 border-rose-300 hover:border-rose-400 text-rose-900 rounded-xl font-mono font-black text-xs sm:text-sm tracking-wider transition-all duration-150 flex items-center gap-1.5 active:scale-95 shadow-sm cursor-pointer"
                              title={`انتخاب کد انگ جامانده ${missingCode}`}
                            >
                              <span className="text-[10px] text-rose-500 font-sans">انگ:</span>
                              <span dir="ltr">{missingCode}</span>
                              <ArrowRight size={11} className="text-rose-400 rotate-180" />
                            </button>
                          ))}
                          {missingHallmarkCodes.length > 12 && (
                            <span className="text-[11px] text-rose-600 font-bold self-center px-1">
                              + {missingHallmarkCodes.length - 12} کد دیگر
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Button directly under input */}
                    {!editModeId && (
                      <button
                        type="button"
                        onClick={() => resetForm()}
                        className="w-full py-3 px-4 rounded-2xl border border-amber-200/90 hover:border-amber-400 bg-gradient-to-br from-amber-50/90 to-yellow-50/40 hover:from-amber-100/90 hover:to-yellow-100/60 text-amber-950 font-black text-xs sm:text-sm transition-all duration-150 active:scale-[0.98] shadow-sm cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Sparkles size={16} className="text-amber-600 animate-pulse" />
                        <span>کد بعدی / پاک کردن</span>
                      </button>
                    )}
                  </div>

                  {/* Customer Name */}
                  <div className="space-y-1.5 relative" ref={contactDropdownRef}>
                    <div className="flex justify-between items-center">
                      <label className="text-xs sm:text-sm text-gray-900 block font-bold">نام مشتری / صاحب کالا:</label>
                      <button
                        type="button"
                        onClick={() => setShowContactManager(true)}
                        className="text-xs sm:text-sm text-[#aa8210] hover:text-[#d4af37] flex items-center gap-1.5 font-bold transition-all cursor-pointer bg-amber-50 hover:bg-amber-100/80 px-3 py-1 rounded-xl border border-amber-200 active:scale-95"
                      >
                        👥 مخاطبان ({contacts.length})
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={ownerName}
                        onChange={(e) => {
                          setOwnerName(e.target.value);
                          setShowContactSuggestions(true);
                        }}
                        onFocus={() => setShowContactSuggestions(true)}
                        placeholder="مثال: گالری طلا عسکرنژاد"
                        className="w-full h-13 sm:h-14 px-4 bg-white border border-gray-300 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 rounded-2xl text-gray-900 text-sm sm:text-base focus:outline-none transition-all select-text font-bold"
                      />
                      {showContactSuggestions && (
                        <div className="absolute right-0 left-0 mt-1 max-h-56 overflow-y-auto bg-white border-2 border-amber-200 rounded-2xl shadow-xl z-50 divide-y divide-gray-100">
                          {(() => {
                            const filtered = contacts.filter(c => 
                              c.toLowerCase().includes(ownerName.trim().toLowerCase())
                            );
                            if (filtered.length === 0) {
                              return (
                                <div className="p-4 text-center text-gray-500 text-xs font-sans">
                                  مخاطبی یافت نشد. می‌توانید این نام را ذخیره کنید:
                                  {ownerName.trim() && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleAddContact(ownerName.trim());
                                        setShowContactSuggestions(false);
                                      }}
                                      className="block w-full mt-2 text-center text-xs text-[#aa8210] hover:text-[#d4af37] font-bold py-2 bg-amber-50 rounded-xl"
                                    >
                                      ➕ افزودن "{ownerName.trim()}" به مخاطبان
                                    </button>
                                  )}
                                </div>
                              );
                            }
                            return (
                              <>
                                {filtered.map((contact, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                      setOwnerName(contact);
                                      setShowContactSuggestions(false);
                                    }}
                                    className="w-full text-right px-4 py-3 hover:bg-amber-50/60 text-gray-900 text-sm font-bold transition-colors block"
                                  >
                                    👤 {contact}
                                  </button>
                                ))}
                                {ownerName.trim() && !contacts.includes(ownerName.trim()) && (
                                  <button
                                    key="add-new-contact-inline-suggest"
                                    type="button"
                                    onClick={() => {
                                      handleAddContact(ownerName.trim());
                                      setShowContactSuggestions(false);
                                    }}
                                    className="w-full text-center py-2.5 bg-amber-50 hover:bg-amber-100 text-xs text-[#aa8210] font-bold transition-colors block border-t border-dashed border-amber-200"
                                  >
                                    ➕ ذخیره "{ownerName.trim()}" در مخاطبان
                                  </button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Assay Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm text-gray-900 block font-bold">تاریخ ثبت انگ (شمسی):</label>
                    <input
                      type="text"
                      value={assayDate}
                      onChange={(e) => setAssayDate(e.target.value)}
                      placeholder="مثال: ۱۴۰۵/۰۳/۱۰"
                      className="w-full h-13 sm:h-14 px-4 bg-white border border-gray-300 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 rounded-2xl text-[#aa8210] text-sm sm:text-base focus:outline-none transition-all select-text font-bold text-center"
                      dir="ltr"
                    />
                  </div>

                  {/* Lab Name (Constant) */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-500 block font-bold">نام آزمایشگاه (ثابت):</label>
                    <input
                      type="text"
                      value="آزمایشگاه عیار سنجی عسکرنژاد"
                      disabled
                      className="w-full h-12 px-4 bg-slate-100 border border-gray-200 rounded-2xl text-gray-600 text-xs sm:text-sm font-bold focus:outline-none"
                    />
                  </div>

                  {/* Type Select Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm text-gray-900 block font-bold">نوع قطعه / کالا:</label>
                    <select
                      value={itemType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItemType(val);
                        if (val === 'نقره') {
                          setMetalType('silver');
                          setDeclaredPurity('نقره استرلینگ (۹۲۵)');
                          setTestedPurity('');
                        } else {
                          setMetalType('gold');
                          setDeclaredPurity('۱۸ عیار (۷۵۰)');
                          setTestedPurity('');
                        }
                      }}
                      className="w-full h-13 sm:h-14 px-4 bg-white border border-gray-300 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 rounded-2xl text-gray-900 text-sm sm:text-base focus:outline-none transition-all cursor-pointer font-bold"
                    >
                      <option value="ساخت">💍 ساخت</option>
                      <option value="متفرقه">⚜️ متفرقه</option>
                      <option value="شمش">🧱 شمش</option>
                      <option value="سکه">🥇 سکه</option>
                      <option value="آبشده">🔥 آبشده</option>
                      <option value="نقره">🥈 نقره</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans">
                    {/* Tested Purity */}
                    <div className="space-y-1.5 text-right">
                      <label className="text-xs sm:text-sm text-gray-900 block font-bold">عیار آزمایشگاه / خلوص:</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={testedPurity}
                        onChange={(e) => setTestedPurity(e.target.value)}
                        placeholder="مثال: 750 یا 750.5"
                        className="w-full h-13 sm:h-14 px-4 bg-white border border-gray-300 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 rounded-2xl text-[#aa8210] font-mono font-black text-center focus:outline-none transition-all select-text text-base sm:text-lg"
                        dir="ltr"
                      />
                    </div>

                    {/* Weight (Sample Weight) */}
                    <div className="space-y-1.5 text-right">
                      <label className="text-xs sm:text-sm text-gray-900 block font-bold">وزن نمونه (گرم - اختیاری):</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="مثال: 12.45"
                        className="w-full h-13 sm:h-14 px-4 bg-white border border-gray-300 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 rounded-2xl text-gray-900 font-mono font-bold text-center focus:outline-none transition-all select-text text-base sm:text-lg"
                        dir="ltr"
                      />
                    </div>
                  </div>

                </div>

                {/* Status Logs */}
                {formError && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-2xl flex items-center gap-2.5 shadow-sm">
                    <X size={18} className="flex-shrink-0" />
                    <p className="flex-grow text-right font-bold">{formError}</p>
                  </div>
                )}
                
                {formSuccess && (
                  <div className="p-4 bg-green-50 border border-green-200 text-green-700 text-xs sm:text-sm rounded-2xl flex items-center gap-2.5 shadow-sm">
                    <ShieldCheck size={18} className="flex-shrink-0 text-green-600" />
                    <p className="flex-grow text-right text-green-900 font-bold">{formSuccess}</p>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full min-h-[58px] bg-gradient-to-r from-[#ffd700] via-[#d4af37] to-[#aa8c2c] text-slate-950 font-black py-3.5 px-6 rounded-2xl cursor-pointer hover:opacity-95 transition-all duration-300 shadow-[0_4px_20px_rgba(212,175,55,0.25)] flex items-center justify-center gap-2 text-base sm:text-lg font-sans active:scale-[0.98]"
                >
                  {editModeId ? (
                    <>
                      <Check size={20} />
                      ذخیره تغییرات گواهی
                    </>
                  ) : (
                    <>
                      <Plus size={20} />
                      ثبت شماره انگ
                    </>
                  )}
                </button>

              </form>
            </div>
            
          </div>

          {/* RIGHT SIDE (Active Database Tables): Coordinates 7 of 12 width */}
          <div className="lg:col-span-7 flex flex-col space-y-6">
            
            {/* Database stats box */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center shadow-sm">
                <span className="text-[10px] text-gray-500 block">کل انگ‌های ثبت شده:</span>
                <span className="text-xl font-bold font-mono text-[#aa8210] block mt-1">{farsiDigits(certificates.length)}</span>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center shadow-sm">
                <span className="text-[10px] text-gray-500 block">طلای تایید شده (Approved):</span>
                <span className="text-xl font-bold font-mono text-emerald-600 block mt-1">
                  {farsiDigits(certificates.filter(c => c.metalType === 'gold' && c.status === 'approved').length)}
                </span>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center shadow-sm">
                <span className="text-[10px] text-gray-500 block">نقره تایید شده (Silver):</span>
                <span className="text-xl font-bold font-mono text-blue-600 block mt-1">
                  {farsiDigits(certificates.filter(c => c.metalType === 'silver' && c.status === 'approved').length)}
                </span>
              </div>
            </div>

            {/* List Table Glass Panel */}
            <div className="pl-6 pt-6 pr-6 pb-6 -ml-[36px] -mr-[32px] border border-gray-200 rounded-3xl bg-white flex-grow flex flex-col min-w-0 shadow-md">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4 mb-4 mr-[33px]">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-1.5 mr-[30px] ml-[11px]">
                    <Coins className="text-[#aa8210]" size={16} />
                    لیست و وضعیت اسناد پایگاه داده
                  </h3>
                  <p className="text-[10px] text-gray-500 font-medium mr-[28px]">امکان حذف، ویرایش یا جسجتوی آنی در اطلاعات مراجعین</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImportBackup}
                    accept=".json"
                    className="hidden"
                  />
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-[#aa8210] bg-[#d4af37]/15 hover:bg-[#d4af37]/25 border border-[#d4af37]/35 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                  >
                    <Upload size={12} />
                    ایمپورت دیتابیس (JSON)
                  </button>
                  <button 
                    type="button"
                    onClick={exportBackup}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-700 bg-slate-50 hover:bg-slate-100 border border-gray-200 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                  >
                    <Download size={12} />
                    خروجی دیتابیس (JSON)
                  </button>
                </div>
              </div>

              {/* Import status logs */}
              {importSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl flex items-center gap-2 animate-[slideUp_0.2s_ease-out]">
                  <ShieldCheck size={14} className="flex-shrink-0 text-green-600" />
                  <p className="flex-grow text-right font-medium">{importSuccess}</p>
                </div>
              )}
              {importError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 animate-[slideUp_0.2s_ease-out]">
                  <X size={14} className="flex-shrink-0 text-red-600" />
                  <p className="flex-grow text-right font-medium">{importError}</p>
                </div>
              )}

              {/* Fast Database Search Bar & Missing Codes Summary */}
              {missingHallmarkCodes.length > 0 && (
                <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-rose-900 font-bold">
                    <AlertCircle size={15} className="text-rose-600 flex-shrink-0" />
                    <span>{missingHallmarkCodes.length} شماره انگ جامانده در پایگاه داده شناسایی شد:</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {missingHallmarkCodes.slice(0, 4).map((c, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setHallmarkId(c);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-2 py-0.5 bg-white border border-rose-300 hover:border-rose-400 text-rose-800 rounded font-mono font-bold text-[11px] cursor-pointer"
                        title="تنظیم به عنوان کد انگ جدید"
                      >
                        {c}
                      </button>
                    ))}
                    {missingHallmarkCodes.length > 4 && (
                      <span className="text-[10px] text-rose-600 font-bold">
                        +{missingHallmarkCodes.length - 4} مورد
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Fast Database Search Bar */}
              <div className="relative mb-4 flex items-center">
                <span className="absolute right-3.5 text-gray-400">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  placeholder="جستجو با کد انگ طلا، نام مالک، نوع قطعه..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-[#d4af37] focus:bg-white rounded-xl text-xs text-gray-900 focus:outline-none transition-all placeholder-gray-400 select-text"
                />
              </div>

              {/* List container */}
              <div className="flex-grow overflow-x-auto min-h-[300px] overflow-y-auto max-h-[500px] space-y-3.5 select-all pr-1">
                {filteredCerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-16 space-y-2">
                    <FileText size={32} className="text-gray-700" />
                    <p className="text-xs text-gray-500 font-medium">هیچ سندی با معیارهای جستجو در پایگاه داده پیدا نشد.</p>
                  </div>
                ) : (
                  filteredCerts.map((cert) => (
                    <div 
                      key={cert.id}
                      className="group relative flex items-center justify-between p-4 rounded-xl bg-white border border-gray-200 hover:border-[#d4af37]/40 transition-all duration-300 min-w-0 shadow-sm hover:shadow-md"
                    >
                      {/* Left Side (in RTL): Action buttons for delete & edit (stacked vertically) */}
                      <div className="flex flex-col items-center justify-center gap-1.5 flex-shrink-0 ml-1">
                        {deleteConfirmId === cert.id ? (
                          <div className="flex flex-col items-center gap-1 bg-red-50 border border-red-200 p-1 rounded-lg animate-pulse" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[9px] text-red-700 font-bold px-0.5 font-sans leading-none">حذف؟</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await dbService.deleteCertificate(cert.id);
                                  await loadCertificates();
                                  setDeleteConfirmId(null);
                                }}
                                className="w-[35px] h-[35px] rounded-lg bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
                                title="بله، حذف کن"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmId(null);
                                }}
                                className="w-[35px] h-[35px] rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-all cursor-pointer shadow-sm"
                                title="لغو"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleEdit(cert)}
                              className="w-[35px] h-[35px] rounded-lg outline-none border border-gray-200 hover:border-[#d4af37]/60 bg-amber-50/50 hover:bg-amber-100/70 text-[#b58d14] flex items-center justify-center hover:scale-105 transition-all cursor-pointer shadow-2xs"
                              title="ویرایش این سند"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(cert.id)}
                              className="w-[35px] h-[35px] rounded-lg outline-none border border-gray-200 hover:border-red-300 bg-red-50/50 hover:bg-red-100/70 text-red-500 hover:text-red-600 flex items-center justify-center hover:scale-105 transition-all cursor-pointer shadow-2xs"
                              title="حذف دائمی از دیتابیس"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>

                      {/* Right Elements (Grouped safely inside RTL layout) */}
                      <div className="flex items-center gap-3.5 text-right min-w-0 flex-1 ml-2">
                        {/* Hallmark Code Circle Badge */}
                        <div className="w-14 h-14 flex-shrink-0 flex flex-col justify-center items-center rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50/60 border border-[#d4af37]/40 group-hover:border-[#d4af37]/80 transition-colors shadow-2xs">
                          <span className="text-[10px] text-[#b58d14] font-sans font-black uppercase tracking-wider">کد انگ</span>
                          <span className="text-sm font-black text-gray-900 font-mono tracking-wide">{highlightText(cert.id, searchQuery)}</span>
                        </div>

                        <div className="flex flex-col min-w-0 text-right space-y-1 flex-1">
                          {/* Row 1: Owner Name + Metal Badge */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm sm:text-base font-black text-gray-900 truncate">
                              {highlightText(cert.ownerName, searchQuery)}
                            </span>
                            {cert.metalType === 'gold' ? (
                              <span className="text-[11px] px-2 py-0.5 rounded-lg bg-amber-100/80 text-amber-900 border border-amber-200 font-bold">
                                طلا
                              </span>
                            ) : (
                              <span className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 font-bold">
                                نقره
                              </span>
                            )}
                          </div>
                          
                          {/* Row 2: Item Type, Weight & Tested Purity */}
                          <div className="text-xs sm:text-[13px] text-gray-700 font-medium flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-800 italic no-underline border-[#006cff]">{highlightText(cert.itemType, searchQuery)}</span>
                            {cert.weight !== undefined && cert.weight !== null && (
                              <span className="h-[33px] text-[13px] bg-amber-50/90 text-gray-950 border border-amber-200/90 px-2.5 rounded-md font-bold flex items-center gap-1">
                                وزن: <span className="font-mono font-black text-amber-700 text-[13px] dir-ltr" dir="ltr">{cert.weight}</span> <span className="text-gray-950">گرم</span>
                              </span>
                            )}
                            <span className="h-[33px] text-[15px] bg-emerald-50/90 text-gray-950 border border-emerald-200/90 px-2.5 rounded-md font-bold flex items-center gap-1">
                              عیار: <span className="font-mono font-black text-emerald-700 text-[15px] dir-ltr" dir="ltr">{toEnglishDigits(cert.testedPurity)}</span>
                            </span>
                          </div>

                          {/* Row 3: Date */}
                          {cert.assayDate && (
                            <div className="text-[11px] text-gray-500 font-sans">
                              تاریخ آزمون: <span className="text-gray-700 font-medium">{highlightText(cert.assayDate, searchQuery)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  ))
                )}
              </div>

              {/* Dynamic cPanel Database Connection Status & Guide Alert */}
              {dbStatus && (
                <div className={`mt-6 p-3.5 rounded-xl border text-xs leading-relaxed ${
                  dbStatus.firebase?.initialized || dbStatus.php_mode
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : dbStatus.connected 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                      : dbStatus.configured 
                        ? 'bg-red-50 border-red-200 text-red-850'
                        : 'bg-slate-50 border-gray-200 text-gray-700'
                }`}>
                  <div className="flex items-start gap-2.5">
                    <Database size={16} className={`flex-shrink-0 mt-0.5 ${
                      dbStatus.firebase?.initialized || dbStatus.php_mode ? 'text-emerald-600 animate-pulse' : dbStatus.connected ? 'text-emerald-600' : dbStatus.configured ? 'text-red-600' : 'text-[#aa8210]'
                    }`} />
                    <div className="flex-grow space-y-1 text-right">
                      <div className="font-bold flex items-center justify-between">
                        <span>
                          {dbStatus.firebase?.initialized
                            ? '🟢 پایگاه داده ابری امن فعال و متصل است (Firebase Firestore)'
                            : dbStatus.php_mode === 'mysql'
                              ? '🟢 پایگاه داده فعال و متصل است (MySQL محلی هاست)'
                              : dbStatus.php_mode === 'json'
                                ? '🟢 پایگاه داده فعال است (ذخیره‌سازی فایل متنی هاست)'
                                : dbStatus.connected 
                                  ? '🟢 اتصال موفق به پایگاه داده سی‌پنل (MySQL)' 
                                  : dbStatus.configured 
                                    ? '🔴 خطا در ارتباط با پایگاه داده MySQL سی‌پنل'
                                    : '🟡 ذخیره محلی فعال است (دیتابیس آنلاین متصل نیست)'}
                        </span>
                        <span className="font-mono text-[10px] text-gray-500 bg-black/5 px-1.5 py-0.5 rounded">
                          {dbStatus.firebase?.initialized ? 'Firebase Cloud Sync' : dbStatus.php_mode ? 'Native PHP Storage' : 'cPanel Sync'}
                        </span>
                      </div>
                      
                      {dbStatus.firebase?.initialized && (
                        <p className="text-[11px] text-emerald-700 font-mono">
                          Active Cloud Storage: Firestore ({dbStatus.firebase.projectId})
                        </p>
                      )}

                      {dbStatus.php_mode && (
                        <p className="text-[11px] text-emerald-700 font-mono">
                          Active Storage Mode: {dbStatus.php_mode === 'mysql' ? 'MySQL Database (cPanel Local)' : 'data.json Secure File (cPanel API)'}
                        </p>
                      )}

                      {dbStatus.connected && dbStatus.details && !dbStatus.firebase?.initialized && !dbStatus.php_mode && (
                        <p className="text-[11px] text-emerald-700 font-mono">
                          Connected: {dbStatus.details.host}:{dbStatus.details.port} / DB: {dbStatus.details.database}
                        </p>
                      )}

                      {!dbStatus.connected && dbStatus.configured && !dbStatus.firebase?.initialized && !dbStatus.php_mode && (
                        <div className="space-y-1 mt-1">
                          <p className="text-[11px] text-red-600 font-mono text-left dir-ltr">
                            Error: {dbStatus.error}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            <strong>راه‌حل:</strong> لطفاً وارد سی‌پنل خود شده، به بخش <strong className="text-gray-750">Remote Database Access</strong> بروید و آی‌پی این کانتینر یا علامت <strong className="text-gray-750">%</strong> (برای اجازه به همه هاست‌ها) را اضافه کنید تا فایروال هاست شما اجازه اتصال بدهد.
                          </p>
                        </div>
                      )}

                      {!dbStatus.configured && !dbStatus.firebase?.initialized && !dbStatus.php_mode && (
                        <div className="space-y-2 text-[11px] mt-1">
                          <p className="text-gray-600 font-semibold">
                            در حال حاضر اطلاعات در حافظه محلی مرورگر و سرور موقت ذخیره می‌شوند. برای اتصال به دیتابیس سی‌پنل خود، متغیرهای محیطی زیر را تنظیم کینید:
                          </p>
                          <div className="font-mono bg-slate-100 p-2 border border-gray-200 rounded text-[#aa8210] text-[10px] select-all leading-relaxed text-left dir-ltr space-y-0.5">
                            <div>MYSQL_HOST = [IP یا آدرس دامنه هاست شما]</div>
                            <div>MYSQL_USER = [نام کاربری دیتابیس در سی‌پنل]</div>
                            <div>MYSQL_PASSWORD = [کلمه عبور دیتابیس]</div>
                            <div>MYSQL_DATABASE = [نام دیتابیس ساخته شده]</div>
                          </div>
                          <p className="text-[10px] text-gray-500">
                            نکته: در سی‌پنل حتماً IP سرور یا علامت <span className="font-bold text-gray-700">%</span> را در بخش Remote Database Access مجاز نمایید.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 📊 Google Sheets Direct Database Bypass Panel */}
              <div className="mt-4 p-4 rounded-xl border border-amber-200 bg-amber-50/70 leading-relaxed text-xs">
                <div className="flex items-center gap-2 mb-2.5 text-amber-800 font-bold">
                  <Database size={15} className="text-amber-600" />
                  <span>📊 دیتابیس مستقیم گوگل‌شیت (مقاوم در برابر فیلترینگ و قطعی هاست)</span>
                </div>
                
                <p className="text-gray-600 text-[11px] mb-3 leading-relaxed">
                  اگر به علت فیلترینگ اینترنت، فایروال یا محدودیت‌های تحریم هاست، سرویس cPanel یا دیتابیس MySQL شما متصل نمی‌شود، دیتابیس را به یک **Google Sheet رایگان** متصل کنید تا اطلاعات ۱۰۰٪ در سطح اینترنت پایدار، امن و پرسرعت همگام‌سازی شوند.
                </p>

                <form onSubmit={handleSaveGoogleSheetUrl} className="space-y-2.5">
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-1 font-medium">آدرس وب‌اپ گوگل (Apps Script Web App URL)</label>
                    <input
                      type="text"
                      dir="ltr"
                      placeholder="https://script.google.com/macros/s/.../exec"
                      value={sheetUrlInput}
                      onChange={(e) => setSheetUrlInput(e.target.value)}
                      className="w-full p-2 bg-white border border-gray-200 focus:border-[#d4af37] text-[11px] text-gray-805 font-mono focus:outline-none transition-all rounded-lg select-all"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-grow py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-all text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Check size={12} />
                      {getGoogleSheetUrl() ? 'ویرایش و بروزرسانی اتصال گوگل' : 'ذخیره و اتصال دیتابیس گوگل‌شیت'}
                    </button>
                    {getGoogleSheetUrl() && (
                      <button
                        type="button"
                        onClick={async () => {
                          localStorage.removeItem('GOOGLE_SHEET_URL');
                          setSheetUrlInput('');
                          await loadCertificates();
                        }}
                        className="px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg transition-all text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                        title="قطع اتصال گوگل"
                      >
                        <X size={12} />
                        قطع اتصال
                      </button>
                    )}
                  </div>
                </form>

                {/* Step-by-Step Interactive Accordion */}
                <div className="mt-3.5 pt-3 border-t border-amber-200">
                  <button
                    type="button"
                    onClick={() => setShowGoogleSheetGuide(!showGoogleSheetGuide)}
                    className="w-full flex items-center justify-between text-[11px] text-amber-800 hover:text-amber-700 transition-all font-semibold outline-none cursor-pointer"
                  >
                    <span>{showGoogleSheetGuide ? '▲ بستن راهنمای راه‌اندازی گام‌به‌گام' : '▼ راهنمای ۵ دقیقه‌ای راه‌اندازی و دریافت کد گوگل'}</span>
                    <span className="text-[10px] bg-amber-100 px-2 py-0.5 rounded text-amber-800">آموزش رایگان</span>
                  </button>

                  {showGoogleSheetGuide && (
                    <div className="mt-2.5 space-y-3 text-gray-600 text-[11px] border-t border-amber-200 pt-2.5">
                      <div className="space-y-1.5 list-none pr-0">
                        <div className="flex items-start gap-1">
                          <span className="font-bold text-amber-800 ml-1">۱.</span>
                          <span>یک فایل اکسل یا شیت جدید در <a href="https://docs.google.com/spreadsheets" target="_blank" rel="noopener noreferrer" className="text-amber-900 font-bold underline">Google Sheets</a> اکانت خود بسازید.</span>
                        </div>
                        <div className="flex items-start gap-1">
                          <span className="font-bold text-amber-800 ml-1">۲.</span>
                          <span>در منوی بالا روی <strong className="text-gray-950">Extensions</strong> (یا افزونه‌ها) و سپس روی <strong className="text-gray-950">Apps Script</strong> کلیک کنید.</span>
                        </div>
                        <div className="flex items-start gap-1">
                          <span className="font-bold text-amber-800 ml-1">۳.</span>
                          <span>کل کدهای پیش‌فرض را پاک کرده و با فشردن این دکمه کدهای دروازه اطلاعات عیار را کپی و آنجا پیس (Paste) کنید.</span>
                        </div>
                        
                        <div className="my-2.5 pr-4">
                          <button
                            type="button"
                            onClick={handleCopyAppsScript}
                            className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              copySuccess 
                                ? 'bg-green-50 border-green-200 text-green-700' 
                                : 'bg-amber-100/50 border-amber-200 text-amber-800 hover:bg-amber-100'
                            }`}
                          >
                            <Copy size={11} />
                            {copySuccess ? '✓ کد اسکریپت با موفقیت کپی شد' : 'کپی کردن خودکار کد اسکریپت گوگل'}
                          </button>
                        </div>

                        <div className="flex items-start gap-1">
                          <span className="font-bold text-amber-800 ml-1">۴.</span>
                          <span>روی دکمه <strong className="text-gray-950">Deploy</strong> (در راست بالا) -&gt; <strong className="text-gray-950">New deployment</strong> کلیک کنید:
                            <ul className="list-disc list-inside mt-1 pr-3 space-y-1 text-gray-500 text-[10px]">
                              <li>نوع دیپلوی را با زدن علامت چرخ‌دنده روی <strong className="text-amber-800">Web app</strong> بگذارید.</li>
                              <li>بخش **Execute as** را روی <strong className="text-amber-800">Me</strong> قرار دهید.</li>
                              <li>بخش **Who has access** را روی <strong className="text-amber-800">Anyone</strong> بگذارید تا اپلیکیشن عیاری بدون محدودیت به گوگل متصل شود.</li>
                            </ul>
                          </span>
                        </div>
                        <div className="flex items-start gap-1">
                          <span className="font-bold text-amber-800 ml-1">۵.</span>
                          <span>دکمه آبی <strong className="text-gray-950">Deploy</strong> را بزنید، دسترسی‌های جیمیل خود را مجاز کنید و آدرس <strong className="font-mono text-amber-800 text-[10.5px]">Web app URL</strong> تولید شده را کپی کرده و در کادر بالا ذخیره کنید! کار تمام است!</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Quick action logout option */}
            <div className="flex justify-between items-center text-xs text-gray-750 bg-gray-50 p-4 border border-gray-200 rounded-2xl">
              <span>مدیریت فعال: پورتال ناظر فنی آزمایشگاه</span>
              <button 
                onClick={handleLogout}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-all font-semibold cursor-pointer"
              >
                <LogOut size={12} />
                خروج امن مأمور فنی
              </button>
            </div>

          </div>

        </div>
      ) : (
            
            /* GALLERY MANAGEMENT VIEW MODULE */
            <div className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-y-auto">
              
              {/* Left Column: Register New Photo Image Form */}
              <div className="lg:col-span-5 space-y-6">
                <div className="p-6 border border-gray-200 rounded-2xl bg-white space-y-5 relative select-none shadow-sm">
                  
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h3 className="text-sm sm:text-base font-bold text-gray-800 flex items-center gap-2">
                      <Plus className="text-[#cc9a06]" size={16} />
                      <span>ثبت و آپلود محصول جدید در نمایشگاه</span>
                    </h3>
                  </div>

                  <form onSubmit={handleSaveGalleryItem} className="space-y-4">
                    
                    {/* Item Title Input */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 block pr-0.5 font-bold">نام اثر یا زیورآلات (اجباری):</label>
                      <input
                        type="text"
                        value={galleryTitle}
                        onChange={(e) => setGalleryTitle(e.target.value)}
                        placeholder="مثال: حلقه طلا با نگین برلیان تراش گندمی"
                        className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 focus:bg-white border border-gray-200 focus:border-[#d4af37] rounded-xl text-gray-850 text-xs focus:outline-none transition-all font-bold select-text"
                        required
                      />
                    </div>

                    {/* Item Category Dropdown Selection Input */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 block pr-0.5 font-bold">دسته‌بندی محصول (گروه اثر):</label>
                      <select
                        value={galleryCategory}
                        onChange={(e) => setGalleryCategory(e.target.value)}
                        className="w-full px-2.5 h-[39px] bg-gray-50 hover:bg-gray-100 focus:bg-white border border-gray-200 focus:border-[#d4af37] rounded-xl text-gray-700 text-xs focus:outline-none transition-all cursor-pointer font-bold"
                      >
                        <option value="rings">💍 حلقه‌ها و انگشترها</option>
                        <option value="bracelets">✨ دستبندها و النگوها</option>
                        <option value="necklaces">📿 گردنبندها و آویزها</option>
                        <option value="sets">⚜️ سرویس و نیم‌ست</option>
                      </select>
                    </div>

                    {/* Item Subtitle / Zone Badging */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 block pr-0.5 font-bold">مجموعه / کلکسیون یا ویژگی عیار (اختیاری):</label>
                      <input
                        type="text"
                        value={gallerySubtitle}
                        onChange={(e) => setGallerySubtitle(e.target.value)}
                        placeholder="مثال: کلکسیون لوکس عسکرنژاد"
                        className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 focus:bg-white border border-gray-200 focus:border-[#d4af37] rounded-xl text-[#cc9a06] text-xs focus:outline-none transition-all font-semibold select-text"
                      />
                    </div>

                    {/* Detailed Paragraph Description */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 block pr-0.5 font-bold">توضیحات طراحی، سنگ‌های قیمتی و ابزارزنی (اختیاری):</label>
                      <textarea
                        value={galleryDescription}
                        onChange={(e) => setGalleryDescription(e.target.value)}
                        placeholder="مشخصات ساخت اعم از دست‌ساز بودن، نوع رکاب، درصد خلوص، مخراج‌کاری برلیان و غیره را برای مشتریان توصیف کنید..."
                        rows={4}
                        className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 focus:bg-white border border-gray-200 focus:border-[#d4af37] rounded-xl text-gray-700 text-xs focus:outline-none transition-all leading-relaxed select-text"
                      />
                    </div>

                    {/* Image Show Order / Custom Sorting input */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 block pr-0.5 font-bold">ترتیب نمایش در گالری (اختیاری):</label>
                      <input
                        type="number"
                        value={galleryOrder}
                        onChange={(e) => setGalleryOrder(e.target.value)}
                        placeholder="مثال: ۱ (عدد کوچک‌تر در گالری بالا قرار می‌گیرد)"
                        className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 focus:bg-white border border-gray-200 focus:border-[#d4af37] rounded-xl text-gray-850 text-xs focus:outline-none transition-all font-bold select-text text-right"
                        dir="rtl"
                      />
                    </div>

                    {/* Image Selector Container (Drag and Drop / Select) */}
                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-500 block pr-0.5 font-bold">آپلود و عکاسی از زیور قرار داده شده:</label>
                      
                      <div 
                        onClick={() => document.getElementById('gallery-file-picker')?.click()}
                        className="border-2 border-dashed border-gray-200 hover:border-[#d4af37]/50 rounded-xl p-6 bg-gray-50 hover:bg-gray-100/50 flex flex-col items-center justify-center gap-3 cursor-pointer group hover:bg-white transition-all duration-300 relative overflow-hidden h-[155px]"
                      >
                        {galleryImageUrl ? (
                          <>
                            <img 
                              src={galleryImageUrl} 
                              alt="پیش‌نمایش"
                              className="absolute inset-0 w-full h-full object-cover opacity-60"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-[#0d0e12]/60 flex flex-col items-center justify-center gap-1.5 z-10 text-[#d4af37]">
                              <Check size={20} className="text-emerald-450" />
                              <span className="text-[10px] font-bold text-emerald-300">تصویر آماده ثبت (فشرده شده)</span>
                              <span className="text-[9px] text-gray-300 underline">کلیک جهت تعویض فایل</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center group-hover:scale-105 group-hover:border-[#d4af37]/35 transition-all text-gray-500 group-hover:text-[#cc9a06]">
                              <Upload size={18} />
                            </div>
                            <div className="text-center">
                              <span className="text-[10px] font-bold text-gray-600 block">انتخاب تصویر از سیستم</span>
                              <span className="text-[9px] text-gray-400 block mt-1">فرمت‌های مجاز: JPEG, PNG, WEBP</span>
                            </div>
                          </>
                        )}
                      </div>

                      <input 
                        type="file"
                        id="gallery-file-picker"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleGalleryImageUpload(file);
                        }}
                      />
                    </div>

                    {/* Status Prompts */}
                    {galleryError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                        <X size={14} className="flex-shrink-0 text-red-500" />
                        <p className="flex-grow text-right">{galleryError}</p>
                      </div>
                    )}

                    {gallerySuccess && (
                      <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl flex items-center gap-2">
                        <Check size={14} className="flex-shrink-0 text-green-600" />
                        <p className="flex-grow text-right text-green-800">{gallerySuccess}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={gallerySaving}
                      className="w-full bg-gradient-to-r from-[#ffd700] via-[#d4af37] to-[#aa8c2c] text-amber-950 font-bold py-2.5 rounded-xl cursor-pointer hover:opacity-90 transition-all duration-300 shadow-[0_4px_15px_rgba(212,175,55,0.15)] flex items-center justify-center gap-2 text-xs sm:text-sm font-sans"
                    >
                      {gallerySaving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-amber-950 border-t-transparent rounded-full animate-spin" />
                          <span>در حال ذخیره...</span>
                        </>
                      ) : (
                        <>
                          <Check size={15} />
                          <span>ثبت اثر در نمایشگاه مراجعین</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Quick logout action inside gallery too */}
                <div className="flex justify-between items-center text-xs text-gray-750 bg-gray-50 p-4 border border-gray-200 rounded-2xl select-none">
                  <span className="text-gray-500 font-semibold text-[10px]">پورتال طلا و جواهرات عسکرنژاد</span>
                  <button 
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-all font-semibold cursor-pointer"
                  >
                    <LogOut size={12} />
                    خروج امن مأمور فنی
                  </button>
                </div>
              </div>

              {/* Right Column: List of Current Showcase items with Delete operations */}
              <div className="lg:col-span-7 space-y-6">
                <div className="p-6 border border-gray-200 rounded-2xl bg-white space-y-5 flex flex-col h-full max-h-[690px] select-none shadow-sm">
                  
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-gray-800 flex items-center gap-2">
                        <ImageIcon className="text-[#cc9a06]" size={16} />
                        <span>محصولات فعال در گالری مراجعین</span>
                      </h3>
                      <p className="text-[10px] text-gray-500 font-semibold mt-1">تعداد موارد قابل مشاهده: {farsiDigits(String(galleryItems.length))} اثر طلا و جواهر</p>
                    </div>
                  </div>

                  {/* List Container Grid */}
                  <div className="flex-grow overflow-y-auto space-y-3.5 pr-1 select-none">
                    {galleryItems.length === 0 ? (
                      <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                        <ImageIcon className="text-gray-300" size={40} />
                        <p className="text-xs text-[#a0a0ab] font-sans tracking-wide">گالری مراجعین خالی است. اولین محصول یا اثر را ثبت و فرستاده تا به مراجعین نمایش داده شود.</p>
                      </div>
                    ) : (
                      galleryItems.map((item, index) => (
                        <div 
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-2xl bg-white border border-gray-200 hover:border-[#d4af37]/45 transition-all duration-300 shadow-sm hover:shadow group"
                        >
                          {/* Deletion button tools and controls */}
                          <div className="flex items-center gap-2">
                            {/* Up/Down rearrangement arrows */}
                            <div className="flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => handleMoveGalleryItem(index, 'up')}
                                className="w-[18px] h-[18px] rounded flex items-center justify-center bg-gray-50 border border-gray-200 text-gray-500 hover:text-[#d4af37] disabled:opacity-35 disabled:hover:text-gray-500 hover:bg-white transition-all cursor-pointer"
                                title="انتقال به بالا"
                              >
                                <ChevronUp size={10} />
                              </button>
                              <button
                                type="button"
                                disabled={index === galleryItems.length - 1}
                                onClick={() => handleMoveGalleryItem(index, 'down')}
                                className="w-[18px] h-[18px] rounded flex items-center justify-center bg-gray-50 border border-gray-200 text-gray-500 hover:text-[#d4af37] disabled:opacity-35 disabled:hover:text-gray-500 hover:bg-white transition-all cursor-pointer"
                                title="انتقال به پایین"
                              >
                                <ChevronDown size={10} />
                              </button>
                            </div>


                            {galleryDeleteConfirmId === item.id ? (
                              <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 p-1 rounded-xl" onClick={(e) => e.stopPropagation()}>
                                <span className="text-[10px] text-red-700 font-bold px-1.5 font-sans">حذف؟</span>
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await handleDeleteGalleryItem(item.id);
                                    setGalleryDeleteConfirmId(null);
                                  }}
                                  className="w-6 h-6 rounded bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all cursor-pointer"
                                  title="بله، حذف کن"
                                >
                                  <Check size={11} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setGalleryDeleteConfirmId(null);
                                  }}
                                  className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-all cursor-pointer"
                                  title="لغو"
                                >
                                  <X size={11} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setGalleryDeleteConfirmId(item.id)}
                                disabled={galleryDeletingId === item.id}
                                className="w-9 h-9 rounded-xl border border-gray-200 hover:border-red-300 bg-gray-50 text-red-500 hover:text-red-700 flex items-center justify-center hover:scale-105 transition-all cursor-pointer"
                                title="حذف دائمی از نمایشگاه"
                              >
                                {galleryDeletingId === item.id ? (
                                  <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Trash2 size={13} />
                                )}
                              </button>
                            )}
                          </div>

                          {/* Detail fields layout with preview thumbnail */}
                          <div className="flex items-center gap-3.5 text-right min-w-0 pr-2 flex-grow justify-end">
                            <div className="flex flex-col min-w-0 text-right space-y-0.5 max-w-[280px]">
                              <span className="text-xs font-bold text-gray-800 truncate">{item.title}</span>
                              {item.subtitle && (
                                <span className="text-[10px] text-[#cc9a06] font-bold pr-0.5 truncate">{item.subtitle}</span>
                              )}
                              {item.description && (
                                <p className="text-[9px] text-gray-500 line-clamp-1 truncate">{item.description}</p>
                              )}
                            </div>

                            {/* Small Card Thumbnail preview */}
                            <div className="w-16 h-12 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 group-hover:border-[#d4af37]/50 transition-colors relative">
                              <img 
                                src={item.imageUrl} 
                                alt={item.title} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* Contact Manager Modal Overlay */}
      {showContactManager && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-white rounded-2xl w-full max-w-md border border-gray-200 overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50/50">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                👥 مدیریت لیست مخاطبان و مشتریان
              </h3>
              <button 
                onClick={() => setShowContactManager(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Quick Add Interface */}
            <div className="p-4 bg-gray-50 border-b border-gray-100 space-y-2">
              <span className="text-[10px] text-gray-500 block pr-0.5 font-bold">افزودن مخاطب یا مشتری جدید به لیست:</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="مثال: بازرگانی طلا مظفریان"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddContact(newContactName);
                    }
                  }}
                  className="flex-grow px-3 py-1.5 bg-white border border-gray-250 focus:border-[#d4af37] rounded-xl text-gray-900 text-xs focus:outline-none transition-all font-bold"
                />
                <button
                  type="button"
                  onClick={() => handleAddContact(newContactName)}
                  className="px-4 py-1.5 bg-[#cc9a06] hover:bg-[#d4af37] text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>ثبت</span>
                </button>
              </div>
            </div>

            {/* Contacts Scrollable List */}
            <div className="p-4 flex-grow overflow-y-auto space-y-2 max-h-[40vh]">
              <span className="text-[10px] text-gray-500 block pr-0.5 font-bold">لیست مخاطبان فعال ({contacts.length} مورد):</span>
              {contacts.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs font-sans">
                  مخاطبی در لیست شما ثبت نشده است. برای ثبت سریعتر نام مشتری، مخاطبان را اضافه کنید.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden bg-white">
                  {contacts.map((contactName, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span className="text-xs text-gray-850 font-bold">{contactName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteContact(contactName)}
                        className="w-7 h-7 rounded-lg text-red-400 hover:text-red-700 hover:bg-red-50 flex items-center justify-center transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                        title="حذف مخاطب"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Explainer / Footer */}
            <div className="p-4 bg-amber-50/50 border-t border-gray-100 text-[10px] text-amber-900 select-none font-sans leading-relaxed text-right">
              ℹ️ هنگامی که کاربر یا مأمور فنی در کادر <strong>نام مشتری</strong> متنی می‌نویسد، لیست مخاطبان بالا به صورت خودکار باز شده و پیشنهاد داده می‌شود تا بدون نیاز به تایپ مجدد، نام مدنظر انتخاب شود.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const GOOGLE_APPS_SCRIPT_CODE = `/**
 * 📊 Google Sheets API Backend Gateway for Assay Hallmark App
 * Copy and paste this code in Extensions -> Apps Script
 */

function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const action = e.parameter.action;
  const id = e.parameter.id;
  
  if (action === 'get') {
    const cert = getCertificateById(sheet, id);
    return renderJson(cert);
  } else if (action === 'list') {
    const certs = getAllCertificates(sheet);
    return renderJson(certs);
  }
  
  // Default to list
  const certs = getAllCertificates(sheet);
  return renderJson(certs);
}

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch(err) {
    return renderJson({ success: false, error: 'Malformed JSON input' });
  }
  
  const action = data.action;
  
  if (action === 'save') {
    saveCertificate(sheet, data.certificate);
    return renderJson({ success: true });
  } else if (action === 'delete') {
    deleteCertificate(sheet, data.id);
    return renderJson({ success: true });
  }
  
  return renderJson({ success: false, error: 'Unknown action: ' + action });
}

function renderJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
                       .setMimeType(ContentService.MimeType.JSON);
}

// Full schema ordered columns
const COLUMNS = [
  "id", "certificateNo", "ownerName", "assayDate", "metalType",
  "declaredPurity", "testedPurity", "weight", "inspector", "status",
  "itemType", "labBranch", "qrValue", "remarks", "sendSms",
  "showGoldWeight_reg", "showCustomerName", "showWeight", "sampleRegistered", "showSampleWeight",
  "showActive", "showGoldWeight", "showPrepTime", "prepTime", "showTitle",
  "titleSelect", "wageType", "wageAmount", "documentType", "packetNumber", "createdAt"
];

function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS);
  }
}

function getHeaderIndexes(sheet) {
  ensureHeaders(sheet);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const indexes = {};
  COLUMNS.forEach(col => {
    let idx = headers.indexOf(col);
    if (idx === -1) {
      // Add missing column dynamically
      sheet.getRange(1, headers.length + 1).setValue(col);
      headers.push(col);
      idx = headers.length - 1;
    }
    indexes[col] = idx;
  });
  return indexes;
}

function getAllCertificates(sheet) {
  ensureHeaders(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  
  const dataRange = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
  const rows = dataRange.getValues();
  const indexes = getHeaderIndexes(sheet);
  
  const list = [];
  rows.forEach(row => {
    const cert = {};
    COLUMNS.forEach(col => {
      const val = row[indexes[col]];
      // Cast booleans
      if (col.startsWith('show') || col === 'sendSms') {
        cert[col] = (val === true || val === 'true' || val === 1 || val === '1');
      } else if (col === 'testedPurity' || col === 'weight') {
        cert[col] = val !== '' ? Number(val) : 0;
      } else {
        cert[col] = val !== null ? String(val) : '';
      }
    });
    if (cert.id) {
      list.push(cert);
    }
  });
  return list;
}

function getCertificateById(sheet, id) {
  const list = getAllCertificates(sheet);
  const cleanId = String(id).toUpperCase().trim();
  const matched = list.find(c => String(c.id).toUpperCase().trim() === cleanId);
  return matched || null;
}

function saveCertificate(sheet, cert) {
  ensureHeaders(sheet);
  const id = String(cert.id).toUpperCase().trim();
  const indexes = getHeaderIndexes(sheet);
  
  // Find row
  const lastRow = sheet.getLastRow();
  let targetRowIndex = -1;
  
  if (lastRow > 1) {
    const ids = sheet.getRange(2, indexes["id"] + 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).toUpperCase().trim() === id) {
        targetRowIndex = i + 2; // +2 for header and 0-indexing
        break;
      }
    }
  }
  
  // Map fields to raw row array
  const rowData = [];
  const maxCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, maxCol).getValues()[0];
  
  headers.forEach((colName, index) => {
    let val = cert[colName];
    if (val === undefined) {
      val = '';
    }
    rowData.push(val);
  });
  
  if (targetRowIndex !== -1) {
    // Update existing row
    sheet.getRange(targetRowIndex, 1, 1, headers.length).setValues([rowData]);
  } else {
    // Insert new row
    sheet.appendRow(rowData);
  }
}

function deleteCertificate(sheet, id) {
  ensureHeaders(sheet);
  const cleanId = String(id).toUpperCase().trim();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  
  const indexes = getHeaderIndexes(sheet);
  const ids = sheet.getRange(2, indexes["id"] + 1, lastRow - 1, 1).getValues();
  
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).toUpperCase().trim() === cleanId) {
      sheet.deleteRow(i + 2);
      break;
    }
  }
}
`;
