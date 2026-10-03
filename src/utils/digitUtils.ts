/**
 * Utility functions for universal digit conversion & sequence gap analysis.
 */

// Mapping of Persian (Farsi), Arabic, Extended Eastern Arabic, Fullwidth, Devanagari digits to standard English (0-9)
const DIGIT_MAP: Record<string, string> = {
  // Persian / Farsi
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  
  // Arabic / Eastern Arabic
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',

  // Devanagari (Hindi)
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',

  // Full-width numbers (East Asian keyboards \uFF10 - \uFF19)
  '\uFF10': '0', '\uFF11': '1', '\uFF12': '2', '\uFF13': '3', '\uFF14': '4',
  '\uFF15': '5', '\uFF16': '6', '\uFF17': '7', '\uFF18': '8', '\uFF19': '9',
};

// Also normalize Persian/Arabic letters commonly mis-typed or alternate keyboard characters:
const CHAR_MAP: Record<string, string> = {
  'ي': 'ی',
  'ك': 'ک',
  'ۀ': 'ه',
  'ة': 'ه',
  'ؤ': 'و',
  'إ': 'ا',
  'أ': 'ا',
  'آ': 'ا',
};

/**
 * Converts any non-English digits (Persian, Arabic, Eastern Arabic, Devanagari, Fullwidth) to standard English 0-9 digits.
 * Also trims and removes invisible direction marks (LRM/RLM).
 */
export function toEnglishDigits(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return '';
  const str = String(input);
  
  return str
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F]/g, '') // remove zero-width & directional marks
    .replace(/[۰-۹٠-٩०-९\uFF10-\uFF19]/g, (w) => DIGIT_MAP[w] || w)
    .replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (w) => DIGIT_MAP[w] || w)
    .trim();
}

/**
 * Converts any Persian/Arabic digits and also normalizes decimal points (e.g. '٫' or '،' -> '.')
 */
export function toEnglishNumberOrString(input: string | number | null | undefined): string {
  const normalized = toEnglishDigits(input);
  return normalized.replace(/[٫،]/g, '.');
}

export interface MissingCodeGap {
  prefix: string;
  padLength: number;
  fromCode: string;
  toCode: string;
  missingCodes: string[];
  count: number;
}

/**
 * Analyzes an array of certificate codes and discovers any missing sequential codes (Gaps in کد انگ).
 * Works for pure numeric codes (e.g. 28230, 28231, 28234 -> discovers 28232, 28233)
 * as well as alphanumeric codes with prefixes (e.g. A820, A821, A824 -> discovers A822, A823).
 */
export function findMissingHallmarkCodes(
  codes: string[],
  maxGapThreshold: number = 30
): {
  totalMissingCount: number;
  missingCodesList: string[];
  gaps: MissingCodeGap[];
} {
  if (!codes || codes.length < 2) {
    return { totalMissingCount: 0, missingCodesList: [], gaps: [] };
  }

  interface ParsedCode {
    raw: string;
    normalized: string;
    prefix: string;
    num: bigint;
    padLength: number;
    suffix: string;
  }

  const parsedList: ParsedCode[] = [];

  for (const rawCode of codes) {
    if (!rawCode) continue;
    const normalized = toEnglishDigits(rawCode).trim();
    if (!normalized) continue;

    // Match prefix + digits + suffix
    const match = normalized.match(/^(.*?)(\d+)(.*?)$/);
    if (match) {
      const prefix = match[1];
      const numStr = match[2];
      const suffix = match[3];
      try {
        parsedList.push({
          raw: rawCode,
          normalized,
          prefix: prefix.toUpperCase(),
          num: BigInt(numStr),
          padLength: numStr.length,
          suffix: suffix.toUpperCase(),
        });
      } catch {
        // ignore unparseable
      }
    }
  }

  const groups: Record<string, ParsedCode[]> = {};
  for (const item of parsedList) {
    const key = `${item.prefix}__${item.suffix}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }

  const allGaps: MissingCodeGap[] = [];
  const allMissingCodes: string[] = [];

  for (const key of Object.keys(groups)) {
    const items = groups[key];
    if (items.length < 2) continue;

    // Sort uniquely by numeric value ascending
    items.sort((a, b) => (a.num > b.num ? 1 : a.num < b.num ? -1 : 0));

    // Remove duplicates
    const uniqueItems: ParsedCode[] = [];
    for (const it of items) {
      if (uniqueItems.length === 0 || uniqueItems[uniqueItems.length - 1].num !== it.num) {
        uniqueItems.push(it);
      }
    }

    // Inspect intervals
    for (let i = 0; i < uniqueItems.length - 1; i++) {
      const curr = uniqueItems[i];
      const next = uniqueItems[i + 1];
      const diff = next.num - curr.num;

      if (diff > 1n && diff <= BigInt(maxGapThreshold + 1)) {
        const missing: string[] = [];
        const pad = Math.max(curr.padLength, next.padLength);
        
        for (let step = 1n; step < diff; step++) {
          const missingNum = curr.num + step;
          const formattedNum = missingNum.toString().padStart(pad, '0');
          const fullMissingCode = `${curr.prefix}${formattedNum}${curr.suffix}`;
          missing.push(fullMissingCode);
          allMissingCodes.push(fullMissingCode);
        }

        allGaps.push({
          prefix: curr.prefix,
          padLength: pad,
          fromCode: curr.normalized,
          toCode: next.normalized,
          missingCodes: missing,
          count: missing.length,
        });
      }
    }
  }

  return {
    totalMissingCount: allMissingCodes.length,
    missingCodesList: allMissingCodes,
    gaps: allGaps,
  };
}
