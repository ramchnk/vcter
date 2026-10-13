import React, { useState, useEffect } from 'react';
import { Printer, X, Edit3, Check, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatReceiptDate } from '../utils/dateUtils';

export interface AdvanceReceiptData {
  receiptNumber: string;
  guestName: string;
  roomNumber?: string;
  roomCategory?: string;
  amount: number;
  date?: string; // Formatted date or raw ISO date
  paymentMethod?: string;
  receivedBy?: string;
  hotelName?: string;
  tagline?: string;
  address?: string;
  email?: string;
  phone?: string;
  gstNumber?: string;
  notes?: string;
  bookingReference?: string;
  isBulkGroup?: boolean;
}

interface AdvanceReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AdvanceReceiptData | null;
  onSave?: (updatedData: AdvanceReceiptData) => void;
}

export const AdvanceReceiptModal: React.FC<AdvanceReceiptModalProps> = ({
  isOpen,
  onClose,
  data,
  onSave
}) => {
  const { settings, userRole } = useApp();

  // Local editable fields
  const [receiptNumber, setReceiptNumber] = useState('');
  const [guestName, setGuestName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [roomCategory, setRoomCategory] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [receiptDate, setReceiptDate] = useState('');
  const [receivedBy, setReceivedBy] = useState('Manager (Front Desk Manager)');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (data) {
      setReceiptNumber(data.receiptNumber || '1243');
      setGuestName(data.guestName || '');
      setRoomNumber(data.roomNumber || '');
      setRoomCategory(data.roomCategory || '');
      setAmount(Number(data.amount) || 0);
      setReceiptDate(formatReceiptDate(data.date));
      setReceivedBy(
        data.receivedBy ||
          (userRole === 'admin'
            ? 'Manager (Front Desk Manager)'
            : 'Manager (Front Desk Manager)')
      );
      setIsEditing(false);
    }
  }, [data, userRole]);

  if (!isOpen || !data) return null;

  const currentHotelName =
    data.hotelName || settings.name || 'HOTEL SUBRA GRAND';
  const currentTagline =
    data.tagline ||
    settings.tagline ||
    'A Unit Of Jagoda Hospitality Pvt. Ltd.';
  const currentAddress =
    data.address ||
    settings.address ||
    '57, New street, near church corner , Karur - 01';
  const currentEmail =
    data.email || settings.email || 'jagodahospitality@gmail.com';
  const currentPhone = data.phone || settings.phone || '9991118512';
  const currentGst =
    data.gstNumber || settings.gstNumber || '33AAHCJ3990L1Z5';

  const formattedAmount = Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  // Construct room details string: "Room number 303" or "Room: Deluxe AC"
  const getRoomDetails = () => {
    if (roomNumber && roomNumber !== 'Pre-Booking' && roomNumber !== 'Unassigned') {
      return `Room number ${roomNumber}`;
    }
    if (roomCategory) {
      return `Room: ${roomCategory}`;
    }
    return 'Room: Pending Assignment';
  };

  const handlePrint = () => {
    // Isolated iframe printing for high-fidelity exact receipt output
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const roomText = getRoomDetails();
    const guestDisplayName = (guestName || 'GUEST').toUpperCase();

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Advance Receipt - ${receiptNumber}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: Georgia, 'Times New Roman', Times, serif;
              background: #ffffff;
              color: #000000;
              padding: 20px 10px;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .receipt-wrapper {
              width: 100%;
              max-width: 760px;
              margin: 0 auto;
              border: 3px solid #374151;
              padding: 28px 32px;
              background: #ffffff;
            }
            .banner {
              background-color: #374151 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color: #ffffff !important;
              text-align: center;
              padding: 11px 16px;
              font-size: 24px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 2px;
              margin-bottom: 24px;
              font-family: Georgia, 'Times New Roman', serif;
            }
            .header-columns {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 20px;
              margin-bottom: 18px;
            }
            .left-col {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              font-size: 13px;
              line-height: 1.55;
              color: #1f2937;
              max-width: 60%;
            }
            .tagline {
              font-weight: 700;
              font-size: 14px;
              color: #111827;
              margin-bottom: 4px;
            }
            .contact-row {
              display: flex;
              align-items: center;
              gap: 6px;
              margin-bottom: 3px;
              color: #374151;
            }
            .phone-row {
              font-weight: 700;
              color: #111827;
            }
            .gst-row {
              font-weight: 800;
              font-size: 13.5px;
              color: #000000;
              margin-top: 5px;
              letter-spacing: 0.3px;
            }
            .right-col {
              text-align: right;
              font-family: Georgia, 'Times New Roman', serif;
            }
            .receipt-heading {
              font-size: 28px;
              font-weight: 700;
              color: #111827;
              line-height: 1.2;
            }
            .receipt-no {
              font-size: 28px;
              font-weight: 700;
              color: #111827;
              line-height: 1.2;
              margin-top: 4px;
            }
            .divider {
              border: 0;
              border-top: 2px solid #374151;
              margin: 18px 0 24px 0;
            }
            .body-text {
              font-size: 16.5px;
              line-height: 1.75;
              color: #111827;
              font-family: Georgia, 'Times New Roman', serif;
              margin-bottom: 36px;
            }
            .bold {
              font-weight: 800;
              color: #000000;
            }
            .received-by {
              font-size: 15px;
              color: #1f2937;
              font-family: Georgia, 'Times New Roman', serif;
            }
          </style>
        </head>
        <body>
          <div class="receipt-wrapper">
            <div class="banner">
              ${currentHotelName}
            </div>

            <div class="header-columns">
              <div class="left-col">
                <div class="tagline">${currentTagline}</div>
                <div class="contact-row">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span>${currentAddress}</span>
                </div>
                <div class="contact-row">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                  <span>${currentEmail}</span>
                </div>
                <div class="contact-row phone-row">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  <span>${currentPhone}</span>
                </div>
                <div class="gst-row">
                  GSTIN: ${currentGst}
                </div>
              </div>

              <div class="right-col">
                <div class="receipt-heading">Advance Receipt</div>
                <div class="receipt-no">Number:- ${receiptNumber}</div>
              </div>
            </div>

            <hr class="divider" />

            <div class="body-text">
              Received with thanks <span class="bold">₹${formattedAmount}</span> from <span class="bold">${guestDisplayName}</span> (Entry number ${receiptNumber}, ${roomText}) as advance/final payment on ${receiptDate} against his stay at ${currentHotelName}.
            </div>

            <div class="received-by">
              Received by ${receivedBy}
            </div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.print();
      }
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 250);
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
    if (onSave) {
      onSave({
        ...data,
        receiptNumber,
        guestName,
        roomNumber,
        roomCategory,
        amount,
        date: receiptDate,
        receivedBy
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-4xl w-full my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Toolbar Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              🧾
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Advance Payment Receipt
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  #{receiptNumber}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Official guest advance payment counterfoil & print preview
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                isEditing
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Close Edit' : 'Edit Details'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Edit Drawer (if active) */}
        {isEditing && (
          <div className="p-4 bg-slate-850 border-b border-slate-800 text-xs text-slate-200">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Receipt / Entry No.</label>
                <input
                  type="text"
                  value={receiptNumber}
                  onChange={e => setReceiptNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Guest Name</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Room No. / Category</label>
                <input
                  type="text"
                  value={roomNumber}
                  onChange={e => setRoomNumber(e.target.value)}
                  placeholder="e.g. 303"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-emerald-400 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Date</label>
                <input
                  type="text"
                  value={receiptDate}
                  onChange={e => setReceiptDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Received By</label>
                <input
                  type="text"
                  value={receivedBy}
                  onChange={e => setReceivedBy(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow"
              >
                <Check className="w-3.5 h-3.5" /> Save Changes
              </button>
            </div>
          </div>
        )}

        {/* Receipt Container Preview */}
        <div className="p-6 sm:p-10 bg-slate-950 flex justify-center items-center overflow-x-auto">
          <div
            id="printable-advance-receipt"
            className="w-full max-w-[760px] bg-white text-slate-900 border-[3.5px] border-slate-700 p-7 sm:p-10 rounded-sm shadow-2xl space-y-6 font-serif select-none"
            style={{
              fontFamily: "Georgia, 'Times New Roman', Times, serif"
            }}
          >
            {/* Top Hotel Banner */}
            <div className="bg-slate-700 text-white font-serif font-black tracking-[0.18em] text-center py-2.5 px-4 text-xl sm:text-2xl uppercase rounded-none shadow-sm">
              {currentHotelName}
            </div>

            {/* Below Banner: Left & Right Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              {/* Left Column: Property Metadata */}
              <div
                className="space-y-1 text-xs text-slate-700"
                style={{
                  fontFamily:
                    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                }}
              >
                <h4 className="font-extrabold text-[13.5px] text-slate-900">
                  {currentTagline}
                </h4>

                <div className="flex items-center gap-1.5 text-slate-700 text-[11.5px] leading-tight">
                  <span className="text-slate-500 text-xs">📍</span>
                  <span>{currentAddress}</span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-700 text-[11.5px] leading-tight">
                  <span className="text-slate-500 text-xs">✉️</span>
                  <span>{currentEmail}</span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-950 font-bold text-[12px] leading-tight">
                  <span className="text-slate-800 text-xs">📞</span>
                  <span>{currentPhone}</span>
                </div>

                <div className="font-black text-slate-950 text-[12.5px] tracking-wide pt-0.5">
                  GSTIN: {currentGst}
                </div>
              </div>

              {/* Right Column: Receipt Title & Number */}
              <div className="text-left sm:text-right space-y-0.5">
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-950 tracking-tight">
                  Advance Receipt
                </h2>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-950 tracking-tight">
                  Number:- {receiptNumber}
                </h2>
              </div>
            </div>

            {/* Horizontal Line Divider */}
            <hr className="border-t-2 border-slate-700 my-4" />

            {/* Receipt Body Paragraph */}
            <div className="text-[15px] sm:text-[16px] text-slate-950 leading-[1.8] font-serif text-justify">
              Received with thanks{' '}
              <strong className="font-extrabold text-slate-950 font-serif">
                ₹{formattedAmount}
              </strong>{' '}
              from{' '}
              <strong className="font-extrabold text-slate-950 uppercase font-serif">
                {guestName || 'GUEST'}
              </strong>{' '}
              (Entry number {receiptNumber}, {getRoomDetails()}) as
              advance/final payment on {receiptDate} against his stay at{' '}
              {currentHotelName}.
            </div>

            {/* Bottom Received By */}
            <div className="pt-4 text-sm font-serif text-slate-800 font-medium">
              Received by {receivedBy}
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex justify-between items-center px-6 py-3.5 bg-slate-950 border-t border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Ready for printing or PDF export (A4 Landscape / Standard Receipt)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors"
            >
              Done / Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow transition-colors"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
