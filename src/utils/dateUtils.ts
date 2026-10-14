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
 * Parses time string or {hours, minutes} object in various formats (e.g. "11:00 AM", "14:30", "11:00", "01:15 PM")
 * Returns hours (0-23) and minutes (0-59).
 */
export const parseTimeString = (
  timeInput?: string | { hours: number; minutes: number } | null
): { hours: number; minutes: number } => {
  if (!timeInput) return { hours: 11, minutes: 0 };

  if (typeof timeInput === 'object') {
    const h = typeof timeInput.hours === 'number' ? timeInput.hours : 11;
    const m = typeof timeInput.minutes === 'number' ? timeInput.minutes : 0;
    return {
      hours: isNaN(h) ? 11 : Math.min(23, Math.max(0, h)),
      minutes: isNaN(m) ? 0 : Math.min(59, Math.max(0, m))
    };
  }

  const str = String(timeInput).trim();
  
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
export const formatTime12h = (timeStrOrObj?: string | { hours: number; minutes: number } | null): string => {
  const { hours: h, minutes: m } = parseTimeString(timeStrOrObj);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHours = h % 12 === 0 ? 12 : h % 12;
  const displayMinutes = String(m).padStart(2, '0');
  return `${String(displayHours).padStart(2, '0')}:${displayMinutes} ${period}`;
};

/**
 * Converts standard time string or {hours, minutes} to 24-hour format (e.g. "11:00", "14:30") for <input type="time">
 */
export const formatTime24h = (timeStrOrObj?: string | { hours: number; minutes: number } | null): string => {
  const { hours: h, minutes: m } = parseTimeString(timeStrOrObj);
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
  is24HourCycle?: boolean;
}

/**
 * Determines if a booking source is Direct / Walk-In.
 */
export const isDirectBookingSource = (source?: string): boolean => {
  if (!source) return true;
  const s = source.toLowerCase().trim();
  return (
    s === 'direct / walk-in' ||
    s === 'walk-in' ||
    s === 'walkin' ||
    s.includes('direct') ||
    s.includes('walk')
  );
};

/**
 * Calculates the expected checkout time for a room or booking based on booking source and check-in time:
 * - Direct / Walk-In: 24-Hour checkout rule.
 *   The checkout time is identical to the check-in time (e.g. check-in at 11:00 AM -> check-out at 11:00 AM next day; check-in at 3:00 PM -> check-out at 3:00 PM next day).
 * - Non-Direct / Online (MakeMyTrip, Booking.com, Agoda, Goibibo, Airbnb, Online / OTA, Corporate, etc.):
 *   Fixed standard 12:00 PM checkout rule (e.g. check-in at 10:00 PM -> check-out next day at 12:00 PM).
 */
export const getEffectiveCheckoutTime = (
  bookingSource?: string,
  checkInTime?: string,
  configuredDefaultCheckoutTime?: string
): string => {
  if (isDirectBookingSource(bookingSource)) {
    if (checkInTime && checkInTime.trim()) {
      return formatTime12h(checkInTime);
    }
    return formatTime12h(configuredDefaultCheckoutTime || '12:00 PM');
  }

  // Non-Direct / Online: Whatever time they check in, next day 12:00 PM is check-out time
  const onlineStandardTime = configuredDefaultCheckoutTime && configuredDefaultCheckoutTime !== '11:00 AM'
    ? configuredDefaultCheckoutTime
    : '12:00 PM';
  return formatTime12h(onlineStandardTime);
};

/**
 * Computes live checkout status for an occupied room based on booking source and check-in time:
 * - Direct / Walk-in: 24-hour cycle (checkout at check-in time)
 * - Online / OTA: Standard 12:00 PM checkout
 * - 'overdue' if now >= checkout date & time (Crossed checkout time)
 * - 'approaching' if checkout is today and within alertWindowMinutes (e.g. 60 mins before checkout time)
 * - 'none' if checkout time is far in the future
 */
export const getRoomCheckoutAlert = (
  checkOutDate?: string,
  checkOutTimeConfig?: string,
  alertWindowMinutes: number = 60,
  referenceNow: Date = new Date(),
  bookingSource?: string,
  checkInTime?: string
): RoomCheckoutAlert => {
  const isDirect = isDirectBookingSource(bookingSource);
  const defaultTime = getEffectiveCheckoutTime(bookingSource, checkInTime, checkOutTimeConfig);
  if (!checkOutDate) {
    return {
      status: 'none',
      diffMinutes: 9999,
      formattedCheckoutTime: defaultTime,
      label: '',
      isToday: false,
      isPastDate: false,
      is24HourCycle: isDirect
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
      isPastDate: false,
      is24HourCycle: isDirect
    };
  }

  const [year, month, day] = normCheckOut.split('-').map(Number);
  const { hours, minutes } = parseTimeString(defaultTime);
  
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
      isPastDate,
      is24HourCycle: isDirect
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
      isPastDate: false,
      is24HourCycle: isDirect
    };
  }

  return {
    status: 'none',
    diffMinutes,
    formattedCheckoutTime: defaultTime,
    label: isToday ? `Checkout due today at ${defaultTime}` : `Checkout ${normCheckOut}`,
    isToday,
    isPastDate: false,
    is24HourCycle: isDirect
  };
};

/**
 * Formats a date into "13 Oct 2026" style as requested for Advance Receipts.
 */
export const formatReceiptDate = (val?: string | Date | null): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (!val) {
    const now = new Date();
    return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  }
  const norm = normalizeDateString(val);
  if (!norm) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
    return String(val);
  }
  const parts = norm.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return `${day} ${months[monthIdx] || parts[1]} ${year}`;
  }
  return String(val);
};

/**
 * Returns the next sequential advance receipt number (e.g. 1243, 1244...).
 */
export const getNextAdvanceReceiptNumber = (existingNumbers: (string | undefined | null)[] = []): string => {
  const stored = localStorage.getItem('hv_advance_receipt_counter');
  let currentNum = stored ? parseInt(stored, 10) : 1243;
  if (isNaN(currentNum) || currentNum < 1) currentNum = 1243;

  for (const numStr of existingNumbers) {
    if (!numStr) continue;
    const n = parseInt(numStr.replace(/\D/g, ''), 10);
    if (!isNaN(n) && n >= currentNum) {
      currentNum = n + 1;
    }
  }

  localStorage.setItem('hv_advance_receipt_counter', String(currentNum + 1));
  return String(currentNum);
};
