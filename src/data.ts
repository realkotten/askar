import { AssayCertificate, ServiceItem } from './types';
import { initialCertificatesMap } from './data/allCertificates';

export const mockCertificates: Record<string, AssayCertificate> = initialCertificatesMap;


export const servicesData: ServiceItem[] = [
  {
    id: 'cupellation',
    title: 'عیارسنجی دقیق (ری‌گیری نوین)',
    iconName: 'Scale',
    accuracyTag: '۹۹.۹۹٪ دقت آزمایشگاهی',
    progressPercentage: 100,
    shortDesc: 'تعیین دقیق عیار طلا با استفاده از روش‌های پیشرفته ری‌گیری نوین و ذوب القایی مطابق با استانداردهای ملی ایران.',
    fullDesc: 'آزمون‌های پیشرفته حرارتی و ری‌گیری متد رسمی و بین‌المللی برای تعیین خلوص و عیار آلیاژهای طلا است. در آزمایشگاه معتمد این آزمون با سیستم‌های حرارتی کالیبره شده با بالاترین دقت انجام می‌شود تا معامله‌گران طلا با آرامش خاطر مبادله کنند.',
    timeEstimate: '۲ تا ۳ ساعت کار کاری'
  },
  {
    id: 'speed',
    title: ' سرعت بالا در ارائه نتایج',
    iconName: 'Timer',
    accuracyTag: 'سرویس اکسپرس و فوری',
    progressPercentage: 85,
    shortDesc: 'فرایند سریع بررسی مقدماتی عیارسنجی با دستگاه‌های پیشرفته XRF بدون کوچک‌ترین تاخیر برای تجار گرامی.',
    fullDesc: 'زمان برای فعالان صنف طلا و نقره حکم پول را دارد. از این رو ما در آزمایشگاه، با فرآیندهای بهینه‌سازی شده و سیستم صف هوشمند، تلاش می‌کنیم تا نتایج اولیه عیارسنجی را ظرف کوتاه‌ترین زمان ممکن ارائه دهیم.',
    timeEstimate: '۳۰ تا ۴۵ دقیقه'
  },
  {
    id: 'transparency',
    title: 'شفافیت کامل فرایندها',
    iconName: 'Sparkles',
    accuracyTag: 'راستی‌آزمایی آنلاین و فیزیکی',
    progressPercentage: 90,
    shortDesc: 'ثبت و آرشیو نتایج عیارسنجی و قابلیت استعلام همزمان کدهای اختصاصی (انگ) در پورتال آنلاین مشتریان.',
    fullDesc: 'تمام کدهای بررسی شده (انگ) همراه با اطلاعات فیزیکی کالا، وزن رسمی و تصویر نمونه در بانک داده مرکزی ذخیره می‌گردند. هر فردی در هر زمان می‌تواند با اسکن بارکد یا درج شماره انگ فیزیکی از صحت گواهی صادره آگاه شود.',
    timeEstimate: 'آنی (سراسری)'
  },
  {
    id: 'consultation',
    title: 'مشاوره تخصصی و عارضه یابی',
    iconName: 'MessageCircle',
    accuracyTag: 'رایگان برای مراجعین رسمی',
    progressPercentage: 75,
    shortDesc: 'مشاوره فنی در خصوص فرمولاسیون آلیاژها و عیب‌یابی ریخته‌گری مصنوعات طلا و نقره جهت بهبود کیفیت ساخت.',
    fullDesc: 'آیا دستبند یا انگشترهای ساخته شده شما در خط تولید کدر می‌شوند یا عیار نهایی آن‌ها یکنواخت نیست؟ کارشناسان متالورژی ما در بخش مشاوره، عارضه یابی دقیق شمش‌های پایه و فرمول آلیاژسازها را برای کارگاه شما انجام می‌دهند.',
    timeEstimate: 'نیاز به هماهنگی قبلی'
  }
];

export const farsiDigits = (num: number | string): string => {
  const farsiNums = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num
    .toString()
    .replace(/[0-9]/g, (w) => farsiNums[parseInt(w, 10)]);
};

export function generateDynamicCertificate(query: string): AssayCertificate {
  // Normalize the query digits or letters
  const cleanQuery = query.trim().toUpperCase();
  // We pseudo-randomly generate details based on the query to feel completely realistic and beautiful!
  let hash = 0;
  for (let i = 0; i < cleanQuery.length; i++) {
    hash = cleanQuery.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const isGold = hash % 2 === 0;
  const puritiesGold = [750.3, 750.6, 751.1, 750.0, 999.1, 916.4];
  const declaredGoldLabels = ['۱۸ عیار (۷۵۰)', '۱۸ عیار (۷۵۰)', '۱۸ عیار (۷۵۰)', '۱۸ عیار (۷۵۰)', '۲۴ عیار (۹۹۹)', '۲۲ عیار (۹۱۶)'];
  const puritiesSilver = [925.3, 925.8, 999.0, 840.4];
  const declaredSilverLabels = ['نقره استرلینگ (۹۲۵)', 'نقره استرلینگ (۹۲۵)', 'نقره خالص (۹۹۹)', 'نقره عیار پایین (۸۴۰)'];
  
  const purityIdx = Math.abs(hash) % (isGold ? puritiesGold.length : puritiesSilver.length);
  const testedPurity = isGold ? puritiesGold[purityIdx] : puritiesSilver[purityIdx];
  const declaredPurity = isGold ? declaredGoldLabels[purityIdx] : declaredSilverLabels[purityIdx];
  
  const weight = Number((5 + Math.abs(hash % 95) + Math.abs((hash >> 2) % 100) / 100).toFixed(2));
  const inspector = 'مسئول فنی و ناظر رسمی آزمایشگاه عیارسنجی عسکرنژاد';
  
  const itemType = isGold ? 'ساخت' : 'نقره';
    
  // Days ago calculation to make dates feel fresh but dynamic
  const month = (Math.abs(hash >> 5) % 3) + 1;
  const day = (Math.abs(hash >> 6) % 28) + 1;
  const assayDate = `۱۴۰۵/۰${month}/${day < 10 ? '۰' + day : day}`;
  
  return {
    id: cleanQuery,
    certificateNo: `ATC-2026-${Math.abs(hash % 9000) + 1000}`,
    ownerName: `کارگاه طلا و جواهرسازی زرین طهران`,
    assayDate,
    metalType: isGold ? 'gold' : 'silver',
    declaredPurity,
    testedPurity,
    weight,
    inspector,
    status: 'approved',
    itemType,
    labBranch: 'آزمایشگاه عیار سنجی عسکرنژاد',
    qrValue: `https://standard-gold-verify.com/verify/${cleanQuery}`,
    remarks: 'آنالیز ساختار فیزیکی اتمی با روش‌های رسمی ری‌گیری طلا و تایید کامل عیار درج شده فیزیکی.'
  };
}
