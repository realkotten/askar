export function getTodayJalali(): string {
  try {
    const d = new Date();
    const formatter = new Intl.DateTimeFormat('en-US-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(d);
    const year = parts.find(p => p.type === 'year')?.value || '1405';
    const month = parts.find(p => p.type === 'month')?.value || '03';
    const day = parts.find(p => p.type === 'day')?.value || '10';
    return `${year}/${month}/${day}`;
  } catch (e) {
    return '1405/03/10';
  }
}

export function convertGregorianToJalaliString(dateInput: Date | string): string {
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '';
    const formatter = new Intl.DateTimeFormat('en-US-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(d);
    const year = parts.find(p => p.type === 'year')?.value || '1405';
    const month = parts.find(p => p.type === 'month')?.value || '03';
    const day = parts.find(p => p.type === 'day')?.value || '10';
    return `${year}/${month}/${day}`;
  } catch (e) {
    return '';
  }
}
