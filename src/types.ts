export interface AssayCertificate {
  id: string;
  certificateNo: string;
  ownerName: string;
  assayDate: string;
  metalType: 'gold' | 'silver';
  declaredPurity: string; // e.g. "۱۸ عیار (۷۵۰)"
  testedPurity: number; // e.g. 750.3
  weight?: number | null; // in grams
  inspector: string;
  status: 'approved' | 'rejected' | 'pending';
  itemType: string; // e.g. "شمش طلا", "مصنوعات ساخته شده"
  labBranch: string; // e.g. "شعبه مرکزی تهران"
  qrValue: string;
  remarks?: string;

  // New fields from the reference screenshot
  sendSms?: boolean;             // ارسال پیام عیار (فعال/غیرفعال)
  showGoldWeight_reg?: boolean;  // نمایش وزن طلا(ثبت)
  showCustomerName?: boolean;    // نمایش نام مشتری
  showWeight?: boolean;          // نمایش وزن
  sampleRegistered?: string;     // نمونه(ثبت)
  showSampleWeight?: boolean;    // نمایش وزن نمونه
  showActive?: boolean;          // نمایش
  showGoldWeight?: boolean;      // نمایش وزن طلا
  showPrepTime?: boolean;        // نمایش زمان آماده سازی
  prepTime?: string;             // زمان آماده سازی
  showTitle?: boolean;           // نمایش عنوان
  titleSelect?: string;          // عنوان هنگام ثبت
  wageType?: 'percentage' | 'fixed'; // نوع محاسبه اجرت: اجرت درصدی یا اجرت ثابت
  wageAmount?: string;           // میزان اجرت
  documentType?: 'hallmark' | 'packet'; // نوع برگ ری: شماره انگ یا شماره پاکت
  packetNumber?: string;         // شماره پاکت (در صورت انتخاب شماره پاکت)
}

export interface GalleryItem {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string; // Will store compressed base64 image data or URL
  description?: string;
  createdAt: string;
  category?: string;
  order?: number;
}

export interface ServiceItem {
  id: string;
  title: string;
  iconName: 'Scale' | 'Timer' | 'Microscope' | 'Sparkles' | 'MessageCircle';
  accuracyTag: string;
  progressPercentage: number; // For the golden gauge line on the left
  shortDesc: string;
  fullDesc: string;
  timeEstimate: string;
}
