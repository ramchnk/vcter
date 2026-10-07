/**
 * Date Utility Helpers for HotelVista ERP
 * Provides timezone-safe date normalization, presets, and range matching.
 */

export const getLocalTodayString = (offsetDays: number = 0): string => {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getMonthStartString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

export const normalizeDateString = (val: string | Date | undefined | null): string => {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const day = String(val.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const str = String(val).trim();
  if (!str) return '';

  // If pure YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // If starts with YYYY-MM-DD (e.g. YYYY-MM-DDTHH:mm:ss.sssZ or YYYY-MM-DD HH:mm:ss)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return str.substring(0, 10);
  }

  // If other parsable format (e.g. MM/DD/YYYY or Mon Oct 07 2026)
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return str.split('T')[0].split(' ')[0];
};

export const isDateInRange = (
  dateVal: string | Date | undefined | null,
  startDate?: string,
  endDate?: string
): boolean => {
  if (!startDate && !endDate) return true;
  const key = normalizeDateString(dateVal);
  if (!key) return true; // If no date on record, keep visible

  if (startDate && key < startDate) return false;
  if (endDate && key > endDate) return false;
  return true;
};

export const isStayInRange = (
  checkIn?: string,
  checkOut?: string,
  startDate?: string,
  endDate?: string
): boolean => {
  if (!startDate && !endDate) return true;
  const cIn = normalizeDateString(checkIn);
  const cOut = normalizeDateString(checkOut);

  // If guest left before start date
  if (startDate && cOut && cOut < startDate) return false;
  // If guest checked in after end date
  if (endDate && cIn && cIn > endDate) return false;

  return true;
};
