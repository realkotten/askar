import { AssayCertificate, GalleryItem } from '../types';
import { mockCertificates } from '../data';
import { toEnglishDigits } from '../utils/digitUtils';

const LOCAL_STORAGE_KEY = 'askarnejad_certificates_db';
const GALLERY_LOCAL_STORAGE_KEY = 'askarnejad_gallery_db';
const GOOGLE_SHEET_KEY = 'GOOGLE_SHEET_URL';

// Helper to check if Google Sheets mode is active
export function getGoogleSheetUrl(): string | null {
  try {
    const url = localStorage.getItem(GOOGLE_SHEET_KEY);
    if (url && url.trim().startsWith('https://script.google.com/')) {
      return url.trim();
    }
  } catch (e) {
    console.error('Error reading GOOGLE_SHEET_URL', e);
  }
  return null;
}

// Helper to load current local storage database
function getLocalDB(): Record<string, AssayCertificate> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with mockCertificates so all embedded records are always guaranteed present
      return { ...mockCertificates, ...parsed };
    }
  } catch (e) {
    console.error('Error reading from localStorage', e);
  }
  // Fallback to seeding with mockCertificates
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mockCertificates));
  return { ...mockCertificates };
}

// Helper to save database to local storage
function saveLocalDB(db: Record<string, AssayCertificate>) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.error('Error writing to localStorage', e);
  }
}

// Helper to load current local storage gallery database
function getLocalGalleryDB(): Record<string, GalleryItem> {
  try {
    const raw = localStorage.getItem(GALLERY_LOCAL_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading from gallery localStorage', e);
  }
  return {};
}

// Helper to save gallery database to local storage
function saveLocalGalleryDB(db: Record<string, GalleryItem>) {
  try {
    localStorage.setItem(GALLERY_LOCAL_STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.error('Error writing gallery to localStorage', e);
  }
}

// Helper for Google Sheets Web App fetch with CORS/redirect support
async function fetchFromAppsScript(url: string, options: RequestInit = {}): Promise<any> {
  const response = await fetch(url, {
    ...options,
    redirect: 'follow',
  });
  if (!response.ok) {
    throw new Error(`Google Apps Script returned status ${response.status}`);
  }
  return response.json();
}

export const dbService = {
  getCertificate: async (id: string): Promise<AssayCertificate | null> => {
    const cleanId = toEnglishDigits(id).trim().toUpperCase();
    const encodedId = encodeURIComponent(cleanId);
    
    // Check if Google Sheet mode is active
    const sheetUrl = getGoogleSheetUrl();
    if (sheetUrl) {
      try {
        const resData = await fetchFromAppsScript(`${sheetUrl}?action=get&id=${encodedId}`);
        if (resData) {
          // Sync server version back to local storage
          const localDB = getLocalDB();
          localDB[cleanId] = resData;
          saveLocalDB(localDB);
          return resData;
        }
        return null;
      } catch (e) {
        console.warn('Google Sheet fetch getCertificate failed, falling back to local storage', e);
      }
    } else {
      // Normal cPanel/backend fetch
      try {
        const response = await fetch(`/api/certificates/${encodedId}`);
        if (response.ok) {
          const serverCert = await response.json();
          if (serverCert) {
            // Sync server version back to local storage
            const localDB = getLocalDB();
            localDB[cleanId] = serverCert;
            saveLocalDB(localDB);
            return serverCert;
          }
        }
      } catch (e) {
        console.warn('Backend API connection failed in getCertificate, using local fallback.', e);
      }
    }

    // Fallback to local storage
    const localDB = getLocalDB();
    return localDB[cleanId] || null;
  },

  saveCertificate: async (cert: AssayCertificate): Promise<void> => {
    const cleanId = toEnglishDigits(cert.id).trim().toUpperCase();
    const normalizedCert = { ...cert, id: cleanId };

    // 1. Always write to local storage first (ensure client data safety)
    const localDB = getLocalDB();
    localDB[cleanId] = normalizedCert;
    saveLocalDB(localDB);

    // 2. Try to sync to the server/Google Sheet
    const sheetUrl = getGoogleSheetUrl();
    if (sheetUrl) {
      try {
        const response = await fetch(sheetUrl, {
          method: 'POST',
          redirect: 'follow',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'save', certificate: normalizedCert }),
        });

        if (!response.ok) {
          throw new Error(`HTTP status: ${response.status}`);
        }
        const resData = await response.json();
        if (!resData || !resData.success) {
          throw new Error(resData?.error || 'خطا در ذخیره‌سازی سمت اسکریپت گوگل');
        }
      } catch (e: any) {
        console.error('Google Sheet save sync failed', e);
        throw new Error(`اطلاعات به صورت محلی در مرورگر ضبط شد اما ذخیره در گوگل‌شیت شکست خورد (${e.message}). مطمئن شوید وب‌اپ به درستی دیپلوی شده است.`);
      }
    } else {
      try {
        const response = await fetch('/api/certificates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(normalizedCert),
        });

        if (!response.ok) {
          const respText = await response.text();
          let errMsg = 'Failed to save certificate';
          try {
            const parsed = JSON.parse(respText);
            if (parsed.error) errMsg = parsed.error;
          } catch {
            if (respText) errMsg = respText;
          }
          throw new Error(`اطلاعات به صورت محلی در حافظه مرورگر با موفقیت ثبت شد اما سرور پاسخ نداد (${errMsg}). لطفاً مطمئن شوید سرویس بک‌اند روی هاست فعال است.`);
        }
      } catch (e: any) {
        console.error('Backend sync failed', e);
        if (e.message && e.message.includes('به صورت محلی')) {
          throw e;
        }
        throw new Error('اطلاعات با موفقیت در مرورگر شما ذخیره شد، اما ارتباط با سرور آنلاین موقتاً مقدور نیست (خطای شبکه/هاست). برای استعلام عمومی باید بک‌اند را روی هاست فعال کنید.');
      }
    }
  },

  deleteCertificate: async (id: string): Promise<void> => {
    const cleanId = toEnglishDigits(id).trim().toUpperCase();
    const encodedId = encodeURIComponent(cleanId);

    // 1. Delete from local storage
    const localDB = getLocalDB();
    delete localDB[cleanId];
    saveLocalDB(localDB);

    // 2. Try to delete from server/Google Sheet
    const sheetUrl = getGoogleSheetUrl();
    if (sheetUrl) {
      try {
        const response = await fetch(sheetUrl, {
          method: 'POST',
          redirect: 'follow',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'delete', id: cleanId }),
        });
        if (!response.ok) {
          throw new Error(`HTTP status: ${response.status}`);
        }
        const resData = await response.json();
        if (!resData || !resData.success) {
          throw new Error(resData?.error || 'خطای سمت اسکریپت گوگل');
        }
      } catch (e: any) {
        console.error('Google Sheet delete failed', e);
        throw new Error(`حذف محلی انجام شد اما حذف از گوگل‌شیت با خطا روبه‌رو شد: ${e.message}`);
      }
    } else {
      try {
        const response = await fetch(`/api/certificates/${encodedId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const respText = await response.text();
          let errMsg = 'Failed to delete certificate';
          try {
            const parsed = JSON.parse(respText);
            if (parsed.error) errMsg = parsed.error;
          } catch {
            if (respText) errMsg = respText;
          }
          throw new Error(`حذف محلی با موفقیت انجام شد اما سرور با خطا پاسخ داد: ${errMsg}`);
        }
      } catch (e: any) {
        console.error('Backend delete failed', e);
        if (e.message && e.message.includes('حذف محلی')) {
          throw e;
        }
        throw new Error('حذف فیزیکی از مرورگر با موفقیت انجام شد، اما ارتباط برای حذف از سرور آنلاین برقرار نگردید.');
      }
    }
  },

  getAllCertificates: async (): Promise<AssayCertificate[]> => {
    const sheetUrl = getGoogleSheetUrl();
    if (sheetUrl) {
      try {
        const resData = await fetchFromAppsScript(`${sheetUrl}?action=list`);
        if (Array.isArray(resData)) {
          // Sync whole fetched list to local storage
          const localDB = getLocalDB();
          resData.forEach((cert: AssayCertificate) => {
            localDB[cert.id.toUpperCase()] = cert;
          });
          saveLocalDB(localDB);
          return resData.sort((a: AssayCertificate, b: AssayCertificate) => b.id.localeCompare(a.id));
        }
      } catch (e) {
        console.warn('Google Sheet getAllCertificates failed, using local storage database.', e);
      }
    } else {
      try {
        const response = await fetch('/api/certificates');
        if (response.ok) {
          const data = await response.json();
          // Sync whole fetched list to local storage
          const localDB = getLocalDB();
          data.forEach((cert: AssayCertificate) => {
            localDB[cert.id.toUpperCase()] = cert;
          });
          saveLocalDB(localDB);
          return data.sort((a: AssayCertificate, b: AssayCertificate) => b.id.localeCompare(a.id));
        }
      } catch (e) {
        console.warn('Backend load failed in getAllCertificates, falling back to local storage database.', e);
      }
    }

    // Fallback
    const localDB = getLocalDB();
    const data = Object.values(localDB);
    return data.sort((a: AssayCertificate, b: AssayCertificate) => b.id.localeCompare(a.id));
  },

  saveCertificatesBatch: async (certsList: AssayCertificate[]): Promise<{ savedCount: number }> => {
    if (!certsList || certsList.length === 0) return { savedCount: 0 };

    // 1. Immediately write all to localStorage (guarantees offline & browser persistence)
    const localDB = getLocalDB();
    const normalizedList: AssayCertificate[] = [];

    for (const raw of certsList) {
      if (!raw) continue;
      const rawId = raw.id || raw.certificateNo || '';
      const cleanId = toEnglishDigits(String(rawId)).trim().toUpperCase();
      if (!cleanId) continue;

      const normalized: AssayCertificate = {
        ...raw,
        id: cleanId,
        certificateNo: raw.certificateNo || `ATC-${cleanId}`,
        ownerName: raw.ownerName || '',
        assayDate: raw.assayDate || '',
        metalType: raw.metalType || 'gold',
        declaredPurity: raw.declaredPurity || '۱۸ عیار (۷۵۰)',
        testedPurity: typeof raw.testedPurity === 'number' ? raw.testedPurity : (parseFloat(toEnglishDigits(String(raw.testedPurity || 0))) || 0),
        weight: (raw as any).weight !== undefined && (raw as any).weight !== null && (raw as any).weight !== '' 
          ? (typeof raw.weight === 'number' ? raw.weight : (parseFloat(toEnglishDigits(String((raw as any).weight))) || null)) 
          : null,
        inspector: raw.inspector || 'مسئول فنی و ناظر رسمی آزمایشگاه عیارسنجی عسکرنژاد',
        status: raw.status || 'approved',
        itemType: raw.itemType || 'ساخت',
        labBranch: raw.labBranch || 'آزمایشگاه عیار سنجی عسکرنژاد',
        qrValue: raw.qrValue || `https://askarnejad-gold.com/verify/${cleanId}`,
      };

      localDB[cleanId] = normalized;
      normalizedList.push(normalized);
    }

    saveLocalDB(localDB);

    if (normalizedList.length === 0) {
      return { savedCount: 0 };
    }

    // 2. Try syncing to Google Sheets if configured
    const sheetUrl = getGoogleSheetUrl();
    if (sheetUrl) {
      try {
        await fetch(sheetUrl, {
          method: 'POST',
          redirect: 'follow',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'batch_save', certificates: normalizedList }),
        });
      } catch (e) {
        console.warn('Google Sheet batch sync notice (saved locally in browser storage)', e);
      }
    } else {
      // 3. Try syncing to server bulk endpoint
      try {
        const response = await fetch('/api/certificates/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(normalizedList),
        });
        if (!response.ok) {
          // Fallback: iterate gently without throwing fatal errors
          for (const cert of normalizedList) {
            try {
              await fetch('/api/certificates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cert),
              });
            } catch (_) {}
          }
        }
      } catch (e) {
        console.warn('Backend bulk sync notice (saved locally in browser storage)', e);
      }
    }

    return { savedCount: normalizedList.length };
  },

  getAllGalleryItems: async (): Promise<GalleryItem[]> => {
    try {
      const response = await fetch('/api/gallery');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          // Sync server version back to local storage (overwrite to ensure deleted/updated items align perfectly)
          const localGallery: Record<string, GalleryItem> = {};
          data.forEach((item: GalleryItem) => {
            localGallery[item.id] = item;
          });
          saveLocalGalleryDB(localGallery);
          return data.sort((a: GalleryItem, b: GalleryItem) => {
            const orderA = a.order !== undefined && a.order !== null ? Number(a.order) : 999999;
            const orderB = b.order !== undefined && b.order !== null ? Number(b.order) : 999999;
            if (orderA !== orderB) {
              return orderA - orderB;
            }
            return b.createdAt.localeCompare(a.createdAt);
          });
        }
      }
    } catch (e) {
      console.warn('Backend load failed in getAllGalleryItems, using local storage gallery database.', e);
    }

    // Fallback
    const localGallery = getLocalGalleryDB();
    const data = Object.values(localGallery);
    return data.sort((a: GalleryItem, b: GalleryItem) => {
      const orderA = a.order !== undefined && a.order !== null ? Number(a.order) : 999999;
      const orderB = b.order !== undefined && b.order !== null ? Number(b.order) : 999999;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
  },

  saveGalleryItem: async (item: GalleryItem): Promise<void> => {
    // 1. Always write to local storage first (ensure client data safety)
    const localGallery = getLocalGalleryDB();
    localGallery[item.id] = item;
    saveLocalGalleryDB(localGallery);

    // 2. Try to sync to the server
    try {
      const response = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });

      if (!response.ok) {
        const respText = await response.text();
        let errMsg = 'Failed to save gallery item';
        try {
          const parsed = JSON.parse(respText);
          if (parsed.error) errMsg = parsed.error;
        } catch {
          if (respText) errMsg = respText;
        }
        console.warn(`Syncing gallery item failed on server (${errMsg}). Retaining in local storage.`);
      }
    } catch (e: any) {
      console.error('Backend gallery sync failed, but data was persisted locally.', e);
    }
  },

  deleteGalleryItem: async (id: string): Promise<void> => {
    // 1. Delete from local storage
    const localGallery = getLocalGalleryDB();
    delete localGallery[id];
    saveLocalGalleryDB(localGallery);

    // 2. Try to delete from server
    const response = await fetch(`/api/gallery/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const respText = await response.text();
      let errMsg = 'Failed to delete gallery item from server';
      try {
        const parsed = JSON.parse(respText);
        if (parsed.error) errMsg = parsed.error;
      } catch {
        if (respText) errMsg = respText;
      }
      throw new Error(errMsg);
    }
  }
};
