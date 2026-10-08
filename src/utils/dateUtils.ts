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

/**
 * Parses time string in various formats (e.g. "11:00 AM", "14:30", "11:00", "01:15 PM")
 * Returns hours (0-23) and minutes (0-59).
 */
export const parseTimeString = (timeStr?: string): { hours: number; minutes: number } => {
  if (!timeStr) return { hours: 11, minutes: 0 };
  const str = String(timeStr).trim();
  
  // Match 12-hour format with AM/PM (e.g., "11:00 AM", "01:30 PM", "9:15am")
  const ampmMatch = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = parseInt(ampmMatch[2], 10);
    const period = ampmMatch[3]?.toUpperCase();
    if (period === 'PM' && h < 12) {
      h += 12;
    } else if (period === 'AM' && h === 12) {
      h = 0;
    }
    return { 
      hours: isNaN(h) ? 11 : Math.min(23, Math.max(0, h)), 
      minutes: isNaN(m) ? 0 : Math.min(59, Math.max(0, m)) 
    };
  }
  
  // Match 24-hour format like "14:30" or "09:00"
  const parts = str.split(':');
  if (parts.length >= 2) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!isNaN(h) && !isNaN(m)) {
      return { 
        hours: Math.min(23, Math.max(0, h)), 
        minutes: Math.min(59, Math.max(0, m)) 
      };
    }
  }

  return { hours: 11, minutes: 0 };
};

/**
 * Converts standard time string or {hours, minutes} to 12-hour format (e.g. "11:00 AM", "02:30 PM")
 */
export const formatTime12h = (timeStrOrObj?: string | { hours: number; minutes: number }): string => {
  let h = 11;
  let m = 0;
  if (typeof timeStrOrObj === 'object' && timeStrOrObj !== null) {
    h = timeStrOrObj.hours;
    m = timeStrOrObj.minutes;
  } else {
    const parsed = parseTimeString(timeStrOrObj);
    h = parsed.hours;
    m = parsed.minutes;
  }
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHours = h % 12 === 0 ? 12 : h % 12;
  const displayMinutes = String(m).padStart(2, '0');
  return `${String(displayHours).padStart(2, '0')}:${displayMinutes} ${period}`;
};

/**
 * Converts standard time string or {hours, minutes} to 24-hour format (e.g. "11:00", "14:30") for <input type="time">
 */
export const formatTime24h = (timeStrOrObj?: string | { hours: number; minutes: number }): string => {
  let h = 11;
  let m = 0;
  if (typeof timeStrOrObj === 'object' && timeStrOrObj !== null) {
    h = timeStrOrObj.hours;
    m = timeStrOrObj.minutes;
  } else {
    const parsed = parseTimeString(timeStrOrObj);
    h = parsed.hours;
    m = parsed.minutes;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export type RoomCheckoutAlertStatus = 'none' | 'approaching' | 'overdue';

export interface RoomCheckoutAlert {
  status: RoomCheckoutAlertStatus;
  diffMinutes: number;
  formattedCheckoutTime: string;
  label: string;
  isToday: boolean;
  isPastDate: boolean;
}

/**
 * Computes live checkout status for an occupied room based on configured check-out time.
 * - 'overdue' if now >= checkout date & time (Crossed checkout time)
 * - 'approaching' if checkout is today and within alertWindowMinutes (e.g. 60 mins before checkout time)
 * - 'none' if checkout time is far in the future
 */
export const getRoomCheckoutAlert = (
  checkOutDate?: string,
  checkOutTimeConfig?: string,
  alertWindowMinutes: number = 60,
  referenceNow: Date = new Date()
): RoomCheckoutAlert => {
  const defaultTime = formatTime12h(checkOutTimeConfig || '11:00 AM');
  if (!checkOutDate) {
    return {
      status: 'none',
      diffMinutes: 9999,
      formattedCheckoutTime: defaultTime,
      label: '',
      isToday: false,
      isPastDate: false
    };
  }

  const normCheckOut = normalizeDateString(checkOutDate);
  if (!normCheckOut) {
    return {
      status: 'none',
      diffMinutes: 9999,
      formattedCheckoutTime: defaultTime,
      label: '',
      isToday: false,
      isPastDate: false
    };
  }

  const [year, month, day] = normCheckOut.split('-').map(Number);
  const { hours, minutes } = parseTimeString(checkOutTimeConfig || '11:00 AM');
  
  const checkoutDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
  const nowMs = referenceNow.getTime();
  const checkoutMs = checkoutDateTime.getTime();
  const diffMs = checkoutMs - nowMs;
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  const todayStr = getLocalTodayString();
  const isToday = normCheckOut === todayStr;
  const isPastDate = normCheckOut < todayStr;

  // If past checkout date, or if today and time is crossed (diffMinutes <= 0)
  if (isPastDate || (isToday && diffMinutes <= 0) || (!isToday && diffMinutes <= 0)) {
    const absDiff = Math.abs(diffMinutes);
    let label = 'Check-out time crossed!';
    if (isPastDate) {
      label = `Checkout overdue (${normCheckOut})`;
    } else if (absDiff < 60) {
      label = `Overdue by ${absDiff}m (Due ${defaultTime})`;
    } else {
      const hrs = Math.floor(absDiff / 60);
      const mins = absDiff % 60;
      label = `Overdue by ${hrs}h ${mins > 0 ? `${mins}m ` : ''}(Due ${defaultTime})`;
    }

    return {
      status: 'overdue',
      diffMinutes,
      formattedCheckoutTime: defaultTime,
      label,
      isToday,
      isPastDate
    };
  }

  // If today and within alert window (approaching checkout time)
  if (isToday && diffMinutes > 0 && diffMinutes <= alertWindowMinutes) {
    let label = `Checkout due in ${diffMinutes}m (${defaultTime})`;
    if (diffMinutes === 1) {
      label = `Checkout due in 1 min (${defaultTime})`;
    }

    return {
      status: 'approaching',
      diffMinutes,
      formattedCheckoutTime: defaultTime,
      label,
      isToday: true,
      isPastDate: false
    };
  }

  return {
    status: 'none',
    diffMinutes,
    formattedCheckoutTime: defaultTime,
    label: isToday ? `Checkout due today at ${defaultTime}` : `Checkout ${normCheckOut}`,
    isToday,
    isPastDate: false
  };
};

