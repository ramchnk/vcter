import React, { useState, useMemo } from 'react';
import { Printer, X, Calendar, Download, RefreshCw, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isDateInRange } from '../utils/dateUtils';

interface DayBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
}

export const DayBookModal: React.FC<DayBookModalProps> = ({
  isOpen,
  onClose,
  initialDate
}) => {
  const { 
    rooms, 
    orders, 
    expenses, 
    preBookings, 
    auditLogs, 
    currentTenant, 
    settings,
    tenantId,
    activeTenantId,
    getBillSummary
  } = useApp();

  const effectiveTenantId = currentTenant?.id || tenantId || activeTenantId;

  // Selected Report Date (defaults to today: YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [reportDate, setReportDate] = useState<string>(initialDate || todayStr);

  // Sync initialDate when changed
  React.useEffect(() => {
    if (initialDate) setReportDate(initialDate);
  }, [initialDate]);

  if (!isOpen) return null;

  // Hotel details
  const hotelName = currentTenant?.name || 'Hotel Subra Grand';

  // Format Report Date for display: DD / MM / YYYY
  const formattedReportDate = useMemo(() => {
    if (!reportDate) return '';
    const [y, m, d] = reportDate.split('-');
    return `${d} / ${m} / ${y}`;
  }, [reportDate]);

  const generatedTimestamp = useMemo(() => {
    const now = new Date();
    const [y, m, d] = reportDate.split('-');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${d}-${m}-${y} ${hh}:${mm}`;
  }, [reportDate]);

  // Tenant-isolated datasets
  const tenantRooms = useMemo(() => {
    return rooms.filter(r => !effectiveTenantId || !r.tenantId || r.tenantId === effectiveTenantId);
  }, [rooms, effectiveTenantId]);

  const tenantPreBookings = useMemo(() => {
    return (preBookings || []).filter(pb => !effectiveTenantId || !pb.tenantId || pb.tenantId === effectiveTenantId);
  }, [preBookings, effectiveTenantId]);

  const tenantAuditLogs = useMemo(() => {
    return (auditLogs || []).filter(a => !effectiveTenantId || !a.tenantId || a.tenantId === effectiveTenantId);
  }, [auditLogs, effectiveTenantId]);

  const tenantOrders = useMemo(() => {
    return orders.filter(o => !effectiveTenantId || !o.tenantId || o.tenantId === effectiveTenantId);
  }, [orders, effectiveTenantId]);

  const tenantExpenses = useMemo(() => {
    return expenses.filter(e => !effectiveTenantId || !e.tenantId || e.tenantId === effectiveTenantId);
  }, [expenses, effectiveTenantId]);

  // ==========================================
  // 1. CHECK-INS ON REPORT DATE
  // ==========================================
  const checkInsList = useMemo(() => {
    const list: Array<{
      sNo: number;
      guestName: string;
      roomNumber: string;
      source: string;
      checkInTime: string;
      phone: string;
      pax: number;
      plan: string;
      roomRent: number;
      rawCheckInDate: string;
    }> = [];

    // Active rooms checked in on reportDate
    tenantRooms.forEach(r => {
      if ((r.status === 'Occupied' || r.guestName) && r.checkInDate === reportDate) {
        const timePart = r.checkInTime || '12:00 PM';
        const [y, m, d] = (r.checkInDate || reportDate).split('-');
        list.push({
          sNo: 0,
          guestName: (r.guestName || 'GUEST').toUpperCase(),
          roomNumber: r.roomNumber,
          source: r.bookingSource || 'Direct',
          checkInTime: `${d}-${m}-${y} ${timePart}`,
          phone: r.guestPhone || '—',
          pax: r.noOfGuests || 1,
          plan: 'EP',
          roomRent: r.price || 0,
          rawCheckInDate: r.checkInDate
        });
      }
    });

    // Completed / checked out stays that checked in on reportDate
    tenantPreBookings.forEach(pb => {
      if (pb.status === 'CheckedOut' && pb.checkInDate === reportDate) {
        if (!list.some(item => item.roomNumber === pb.roomNumber && item.guestName.toLowerCase() === (pb.guestName || '').toLowerCase())) {
          const [y, m, d] = (pb.checkInDate || reportDate).split('-');
          const timePart = pb.checkInTime || '12:00 PM';
          list.push({
            sNo: 0,
            guestName: (pb.guestName || pb.occupantName || 'GUEST').toUpperCase(),
            roomNumber: pb.roomNumber || '—',
            source: pb.bookingSource || 'Direct',
            checkInTime: `${d}-${m}-${y} ${timePart}`,
            phone: pb.phone || '—',
            pax: pb.noOfGuests || 1,
            plan: 'EP',
            roomRent: pb.roomPrice || pb.roomRentTotal || 0,
            rawCheckInDate: pb.checkInDate
          });
        }
      }
    });

    // Fallback: Check-in audit logs for reportDate
    tenantAuditLogs.forEach(a => {
      const aDate = a.timestamp ? a.timestamp.split('T')[0] : '';
      if (a.action === 'Check-In' && aDate === reportDate) {
        const match = a.details?.match(/Guest\s+(.+?)\s+checked into Room\s+([A-Za-z0-9_-]+)/i);
        if (match) {
          const gName = match[1].trim().toUpperCase();
          const rNo = match[2].trim();
          if (!list.some(item => item.roomNumber === rNo && item.guestName === gName)) {
            const timeObj = new Date(a.timestamp);
            const hh = String(timeObj.getHours()).padStart(2, '0');
            const mm = String(timeObj.getMinutes()).padStart(2, '0');
            const [y, m, d] = reportDate.split('-');
            const sourceMatch = a.details?.match(/via\s+(.+?)(?:\s*\(|$)/i);
            const rentMatch = a.details?.match(/@\s*₹?([0-9.]+)/);
            list.push({
              sNo: 0,
              guestName: gName,
              roomNumber: rNo,
              source: sourceMatch ? sourceMatch[1].trim() : 'Direct',
              checkInTime: `${d}-${m}-${y} ${hh}:${mm}`,
              phone: '—',
              pax: 1,
              plan: 'EP',
              roomRent: rentMatch ? parseFloat(rentMatch[1]) : 0,
              rawCheckInDate: reportDate
            });
          }
        }
      }
    });

    return list.map((item, idx) => ({ ...item, sNo: idx + 1 }));
  }, [tenantRooms, tenantPreBookings, tenantAuditLogs, reportDate]);

  // ==========================================
  // 2. ROOMS CONTINUED (Checked in before reportDate and staying through reportDate)
  // ==========================================
  const roomsContinuedList = useMemo(() => {
    const list: Array<{
      sNo: number;
      guestName: string;
      roomNumber: string;
      source: string;
      checkInDate: string;
      phone: string;
      pax: number;
      plan: string;
      roomRent: number;
    }> = [];

    tenantRooms.forEach(r => {
      if (
        r.status === 'Occupied' &&
        r.checkInDate &&
        r.checkInDate < reportDate &&
        (!r.checkOutDate || r.checkOutDate >= reportDate)
      ) {
        const [y, m, d] = r.checkInDate.split('-');
        const timePart = r.checkInTime ? ` ${r.checkInTime}` : '';
        list.push({
          sNo: 0,
          guestName: (r.guestName || 'GUEST').toUpperCase(),
          roomNumber: r.roomNumber,
          source: r.bookingSource || 'Direct',
          checkInDate: `${d}-${m}-${y}${timePart}`,
          phone: r.guestPhone || '—',
          pax: r.noOfGuests || 1,
          plan: 'EP',
          roomRent: r.price || 0
        });
      }
    });

    return list.map((item, idx) => ({ ...item, sNo: idx + 1 }));
  }, [tenantRooms, reportDate]);

  // ==========================================
  // 3. CHECK-OUTS ON REPORT DATE
  // ==========================================
  const checkOutsList = useMemo(() => {
    const list: Array<{
      sNo: number;
      guestName: string;
      roomNumber: string;
      source: string;
      checkOutTime: string;
      phone: string;
      pax: number;
      plan: string;
      folioTotal: number;
    }> = [];

    // From preBookings
    tenantPreBookings.forEach(pb => {
      const outDate = pb.checkOutDate || (pb.status === 'CheckedOut' ? pb.bookingDate : '');
      if (pb.status === 'CheckedOut' && outDate === reportDate) {
        const [y, m, d] = reportDate.split('-');
        list.push({
          sNo: 0,
          guestName: (pb.guestName || pb.occupantName || 'GUEST').toUpperCase(),
          roomNumber: pb.roomNumber || '—',
          source: pb.bookingSource || 'Direct',
          checkOutTime: `${d}-${m}-${y}`,
          phone: pb.phone || '—',
          pax: pb.noOfGuests || 1,
          plan: 'EP',
          folioTotal: pb.totalAmount || pb.roomRentTotal || 0
        });
      }
    });

    // From audit logs
    tenantAuditLogs.forEach(a => {
      const aDate = a.timestamp ? a.timestamp.split('T')[0] : '';
      if (a.action === 'Check-Out' && aDate === reportDate) {
        const match = a.details?.match(/Guest\s+(.+?)\s+checked out of Room\s+([A-Za-z0-9_-]+)/i);
        if (match) {
          const gName = match[1].trim().toUpperCase();
          const rNo = match[2].trim();
          if (!list.some(item => item.roomNumber === rNo && item.guestName === gName)) {
            const timeObj = new Date(a.timestamp);
            const hh = String(timeObj.getHours()).padStart(2, '0');
            const mm = String(timeObj.getMinutes()).padStart(2, '0');
            const [y, m, d] = reportDate.split('-');
            const totalMatch = a.details?.match(/Total Folio:\s*₹?([0-9.]+)/i);
            list.push({
              sNo: 0,
              guestName: gName,
              roomNumber: rNo,
              source: 'Direct',
              checkOutTime: `${d}-${m}-${y} ${hh}:${mm}`,
              phone: '—',
              pax: 1,
              plan: 'EP',
              folioTotal: totalMatch ? parseFloat(totalMatch[1]) : 0
            });
          }
        }
      }
    });

    return list.map((item, idx) => ({ ...item, sNo: idx + 1 }));
  }, [tenantPreBookings, tenantAuditLogs, reportDate]);

  // ==========================================
  // 4. DAYBOOK IN (COLLECTIONS ON REPORT DATE)
  // ==========================================
  const dayBookInList = useMemo(() => {
    const list: Array<{
      sNo: number;
      customerName: string;
      roomNumber: string;
      entryNumber: string;
      billItems: string;
      paymentMode: string;
      amount: number;
      orderDateTime: string;
    }> = [];

    let entryCounter = 1240;

    // 1. Advance payments received on reportDate from active rooms
    tenantRooms.forEach(r => {
      if (r.advancePaid && r.advancePaid > 0) {
        const payDate = r.advancePaymentDate || r.checkInDate;
        if (payDate === reportDate) {
          const [y, m, d] = reportDate.split('-');
          list.push({
            sNo: 0,
            customerName: (r.guestName || 'GUEST').toUpperCase(),
            roomNumber: r.roomNumber,
            entryNumber: r.advanceReceiptNumber || String(entryCounter--),
            billItems: 'Advance Paid',
            paymentMode: r.advancePaymentMethod || (r.bookingSource?.toLowerCase().includes('makemytrip') ? 'Prepaid' : 'Online (UPI)'),
            amount: Number(r.advancePaid),
            orderDateTime: `${d}-${m}-${y} ${r.checkInTime || '12:00'}`
          });
        }
      }
    });

    // 2. Advance payments from preBookings on reportDate
    tenantPreBookings.forEach(pb => {
      const payDate = pb.advancePaymentDate || pb.checkInDate;
      if (payDate === reportDate && pb.advancePaid && pb.advancePaid > 0) {
        if (!list.some(item => item.roomNumber === pb.roomNumber && item.amount === pb.advancePaid)) {
          const [y, m, d] = reportDate.split('-');
          list.push({
            sNo: 0,
            customerName: (pb.guestName || pb.occupantName || 'GUEST').toUpperCase(),
            roomNumber: pb.roomNumber || '—',
            entryNumber: pb.advanceReceiptNumber || String(entryCounter--),
            billItems: 'Advance Paid',
            paymentMode: pb.advancePaymentMethod || (pb.bookingSource?.toLowerCase().includes('makemytrip') ? 'Prepaid' : 'Online (UPI)'),
            amount: Number(pb.advancePaid),
            orderDateTime: `${d}-${m}-${y}`
          });
        }
      }
    });

    // 3. Check-Out collections from audit logs on reportDate
    tenantAuditLogs.forEach(a => {
      const aDate = a.timestamp ? a.timestamp.split('T')[0] : '';
      if (a.action === 'Check-Out' && aDate === reportDate) {
        const matchRoom = a.details?.match(/Room\s+([A-Za-z0-9_-]+)/i);
        const matchGuest = a.details?.match(/Guest\s+(.+?)\s+checked out/i);
        const matchTotal = a.details?.match(/Total Folio:\s*₹?([0-9.]+)/i);
        const matchMethod = a.details?.match(/Paid via\s+([^.]+)/i);
        if (matchTotal) {
          const amt = parseFloat(matchTotal[1]);
          const roomNo = matchRoom ? matchRoom[1] : '—';
          const guest = matchGuest ? matchGuest[1].trim().toUpperCase() : 'GUEST';
          // Avoid duplicate if already added
          if (!list.some(item => item.roomNumber === roomNo && item.customerName === guest && item.billItems === 'Checkout Settlement')) {
            const timeObj = new Date(a.timestamp);
            const hh = String(timeObj.getHours()).padStart(2, '0');
            const mm = String(timeObj.getMinutes()).padStart(2, '0');
            const [y, m, d] = reportDate.split('-');
            list.push({
              sNo: 0,
              customerName: guest,
              roomNumber: roomNo,
              entryNumber: String(entryCounter--),
              billItems: 'Checkout Settlement',
              paymentMode: matchMethod ? matchMethod[1].trim() : 'Online (UPI)',
              amount: amt,
              orderDateTime: `${d}-${m}-${y} ${hh}:${mm}`
            });
          }
        }
      }
    });

    // 4. Paid walk-in orders on reportDate
    tenantOrders.forEach(o => {
      const oDate = o.timestamp ? o.timestamp.split('T')[0] : '';
      if (oDate === reportDate && o.type === 'WalkIn' && o.status === 'Paid') {
        const [y, m, d] = reportDate.split('-');
        list.push({
          sNo: 0,
          customerName: (o.guestName || 'WALK-IN DINER').toUpperCase(),
          roomNumber: o.roomNumber || 'POS',
          entryNumber: o.orderNumber || String(entryCounter--),
          billItems: o.isBar ? 'Bar Order' : 'Restaurant Order',
          paymentMode: 'Cash',
          amount: Number(o.total || 0),
          orderDateTime: `${d}-${m}-${y}`
        });
      }
    });

    return list.map((item, idx) => ({ ...item, sNo: idx + 1 }));
  }, [tenantRooms, tenantPreBookings, tenantAuditLogs, tenantOrders, reportDate]);

  const totalDayBookIn = useMemo(() => {
    return dayBookInList.reduce((acc, item) => acc + item.amount, 0);
  }, [dayBookInList]);

  // ==========================================
  // 5. FOOD / KOT DETAILS ON REPORT DATE
  // ==========================================
  const foodKotList = useMemo(() => {
    const list: Array<{
      sNo: number;
      kotNo: string;
      roomTable: string;
      guestCustomer: string;
      items: string;
      amount: number;
      payment: string;
      dateTime: string;
    }> = [];

    tenantOrders.forEach((o, idx) => {
      const oDate = o.timestamp ? o.timestamp.split('T')[0] : '';
      if (oDate === reportDate) {
        const itemsSummary = (o.items || []).map(i => `${i.name} (${i.quantity})`).join(', ') || 'Food items';
        const [y, m, d] = reportDate.split('-');
        list.push({
          sNo: idx + 1,
          kotNo: o.orderNumber || `KOT-${idx + 1}`,
          roomTable: o.roomNumber ? `Room ${o.roomNumber}` : 'Dining Table',
          guestCustomer: o.guestName || 'Walk-In',
          items: itemsSummary,
          amount: Number(o.total || 0),
          payment: o.status || 'Paid',
          dateTime: `${d}-${m}-${y}`
        });
      }
    });

    return list;
  }, [tenantOrders, reportDate]);

  const totalFoodSales = useMemo(() => {
    return foodKotList.reduce((acc, item) => acc + item.amount, 0);
  }, [foodKotList]);

  // ==========================================
  // 6. DAYBOOK OUT / EXPENSE DETAILS ON REPORT DATE
  // ==========================================
  const expensesList = useMemo(() => {
    const list: Array<{
      sNo: number;
      expenseName: string;
      amount: number;
      extraRemarks: string;
      dateTime: string;
    }> = [];

    tenantExpenses.forEach((e, idx) => {
      const eDate = e.date ? e.date.split('T')[0] : '';
      if (eDate === reportDate) {
        const [y, m, d] = reportDate.split('-');
        list.push({
          sNo: idx + 1,
          expenseName: e.title || e.category || 'General Expense',
          amount: Number(e.amount || 0),
          extraRemarks: e.notes || e.paidTo || e.paymentMethod || '—',
          dateTime: `${d}-${m}-${y}`
        });
      }
    });

    return list;
  }, [tenantExpenses, reportDate]);

  const totalExpenses = useMemo(() => {
    return expensesList.reduce((acc, item) => acc + item.amount, 0);
  }, [expensesList]);

  // ==========================================
  // 7. PAYMENT BREAKUP (COLLECTION BREAKUP)
  // ==========================================
  const paymentBreakup = useMemo(() => {
    let cash = 0;
    let card = 0;
    let upi = 0;
    let bankTransfer = 0;
    let prepaid = 0;
    let btc = 0;

    dayBookInList.forEach(item => {
      const mode = (item.paymentMode || '').toLowerCase();
      if (mode.includes('cash')) {
        cash += item.amount;
      } else if (mode.includes('card') || mode.includes('pos')) {
        card += item.amount;
      } else if (mode.includes('upi') || mode.includes('gpay') || mode.includes('phonepe') || mode.includes('online')) {
        upi += item.amount;
      } else if (mode.includes('bank') || mode.includes('neft') || mode.includes('rtgs') || mode.includes('transfer')) {
        bankTransfer += item.amount;
      } else if (mode.includes('prepaid') || mode.includes('ota') || mode.includes('makemytrip') || mode.includes('agoda')) {
        prepaid += item.amount;
      } else if (mode.includes('btc') || mode.includes('crypto')) {
        btc += item.amount;
      } else {
        cash += item.amount;
      }
    });

    const total = cash + card + upi + bankTransfer + prepaid + btc;
    return { cash, card, upi, bankTransfer, prepaid, btc, total };
  }, [dayBookInList]);

  // ==========================================
  // 8. CHECK-IN & SALES SOURCE BREAKDOWN
  // ==========================================
  const sourceBreakdown = useMemo(() => {
    const map = new Map<string, { checkIns: number; roomSales: number; foodSales: number; otherSales: number; totalSales: number }>();

    checkInsList.forEach(item => {
      const src = item.source?.toUpperCase().includes('MAKE') ? 'MAKE MY TRIP' : (item.source || 'Direct');
      const existing = map.get(src) || { checkIns: 0, roomSales: 0, foodSales: 0, otherSales: 0, totalSales: 0 };
      existing.checkIns += 1;
      existing.roomSales += item.roomRent;
      existing.totalSales += item.roomRent;
      map.set(src, existing);
    });

    // If empty fallback
    if (map.size === 0) {
      map.set('Direct', { checkIns: 0, roomSales: 0, foodSales: 0, otherSales: 0, totalSales: 0 });
    }

    const rows: Array<{ source: string; checkIns: number; roomSales: number; foodSales: number; otherSales: number; totalSales: number }> = [];
    let totCheckIns = 0;
    let totRoom = 0;
    let totFood = 0;
    let totOther = 0;
    let totTotal = 0;

    map.forEach((val, key) => {
      rows.push({ source: key, ...val });
      totCheckIns += val.checkIns;
      totRoom += val.roomSales;
      totFood += val.foodSales;
      totOther += val.otherSales;
      totTotal += val.totalSales;
    });

    return { rows, total: { source: 'TOTAL', checkIns: totCheckIns, roomSales: totRoom, foodSales: totFood, otherSales: totOther, totalSales: totTotal } };
  }, [checkInsList]);

  // ==========================================
  // 9. BUSINESS SUMMARY & RECEIVABLES
  // ==========================================
  const roomSalesReceivable = useMemo(() => {
    // Total room rent generated by today's check-ins and continued rooms
    return sourceBreakdown.total.roomSales || totalDayBookIn;
  }, [sourceBreakdown, totalDayBookIn]);

  const totalCheckInsCount = checkInsList.length;
  const totalCheckOutsCount = checkOutsList.length;
  const roomsContinuedCount = roomsContinuedList.length;
  const totalOccupiedToday = totalCheckInsCount + roomsContinuedCount;
  const totalRoomsCount = tenantRooms.length || 33;
  const occupancyPercent = totalRoomsCount > 0 ? Number(((totalOccupiedToday / totalRoomsCount) * 100).toFixed(2)) : 0;
  const totalSalesAmount = totalDayBookIn > 0 ? totalDayBookIn : roomSalesReceivable;
  const arr = totalOccupiedToday > 0 ? Number((roomSalesReceivable / totalOccupiedToday).toFixed(2)) : 0;

  // Print function using isolated iframe for exact styling
  const handlePrint = () => {
    const printArea = document.getElementById('daybook-print-container');
    if (!printArea) return;

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

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Daily Sales Report - ${formattedReportDate}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm 12mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1e293b;
              background: #fff;
              font-size: 8.5pt;
              line-height: 1.35;
            }
            .page-container {
              width: 100%;
            }
            .page-break {
              page-break-before: always;
              margin-top: 15px;
            }
            .header-center {
              text-align: center;
              margin-bottom: 12px;
            }
            .hotel-name {
              font-size: 14pt;
              font-weight: 800;
              color: #0f172a;
              margin-bottom: 2px;
            }
            .report-date {
              font-size: 9pt;
              font-weight: 700;
              color: #334155;
              margin-bottom: 3px;
            }
            .report-title {
              font-size: 15pt;
              font-weight: 900;
              color: #0f172a;
              letter-spacing: -0.3px;
            }
            .section-title {
              font-size: 9.5pt;
              font-weight: 800;
              color: #0f172a;
              margin-top: 10px;
              margin-bottom: 4px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 8px;
              font-size: 8pt;
            }
            th {
              background-color: #f1f5f9;
              color: #334155;
              font-weight: 700;
              text-align: left;
              padding: 4px 6px;
              border: 0.5pt solid #cbd5e1;
            }
            td {
              padding: 3.5px 6px;
              border: 0.5pt solid #cbd5e1;
              color: #1e293b;
            }
            tr:nth-child(even) td {
              background-color: #fafbfc;
            }
            .text-right {
              text-align: right;
            }
            .text-center {
              text-align: center;
            }
            .font-bold {
              font-weight: 700;
            }
            .note-text {
              font-size: 6.8pt;
              color: #64748b;
              font-style: italic;
              margin: 4px 0 8px 0;
            }
          </style>
        </head>
        <body>
          ${printArea.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Top Control Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                Daily Sales Report — Day Book
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                A4 Official Day Book Printout matching standard hotel audit format
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Date Picker */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-[11px] font-bold text-slate-400">Date:</span>
              <input 
                type="date"
                value={reportDate}
                onChange={e => setReportDate(e.target.value)}
                className="bg-transparent font-mono font-bold text-slate-800 dark:text-slate-200 text-xs focus:outline-none"
              />
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60 dark:bg-slate-950/40">
          
          {/* Printable Container: Exact replica of the PDF */}
          <div 
            id="daybook-print-container" 
            className="bg-white text-slate-900 p-8 sm:p-10 rounded-xl shadow-sm border border-slate-200 max-w-[850px] mx-auto text-[11px] leading-relaxed select-text"
          >
            
            {/* PAGE 1: DAILY SALES REPORT */}
            <div className="page-container">
              
              {/* Header */}
              <div className="text-center mb-4">
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight">{hotelName}</h1>
                <p className="text-xs font-bold text-slate-700 mt-0.5">Report Date: {formattedReportDate}</p>
                <h2 className="text-lg font-black text-slate-900 mt-1">Daily Sales Report</h2>
              </div>

              {/* 1. Business Summary */}
              <div className="mb-3">
                <h3 className="text-xs font-bold text-slate-900 mb-1">Business Summary</h3>
                <table className="w-full border-collapse border border-slate-300 text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="border border-slate-300 p-1 text-left font-bold w-3/4">Metric</th>
                      <th className="border border-slate-300 p-1 text-right font-bold w-1/4">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 p-1">Total Check-ins</td>
                      <td className="border border-slate-300 p-1 text-right font-mono font-medium">{totalCheckInsCount}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-1">Total Check-outs</td>
                      <td className="border border-slate-300 p-1 text-right font-mono font-medium">{totalCheckOutsCount}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-1">Rooms Continued</td>
                      <td className="border border-slate-300 p-1 text-right font-mono font-medium">{roomsContinuedCount}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-1">Total Sales</td>
                      <td className="border border-slate-300 p-1 text-right font-mono font-medium">₹ {totalSalesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-1">Receivables</td>
                      <td className="border border-slate-300 p-1 text-right font-mono font-medium">₹ {roomSalesReceivable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-1">ARR</td>
                      <td className="border border-slate-300 p-1 text-right font-mono font-medium">₹ {arr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-1">Occupancy %</td>
                      <td className="border border-slate-300 p-1 text-right font-mono font-medium">{occupancyPercent} %</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 2. Sales Summary (Receivables) */}
              <div className="mb-3">
                <h3 className="text-xs font-bold text-slate-900 mb-1">Sales Summary (Receivables)</h3>
                <table className="w-full border-collapse border border-slate-300 text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="border border-slate-300 p-1 text-left font-bold w-3/4">Particular</th>
                      <th className="border border-slate-300 p-1 text-right font-bold w-1/4">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 p-1">Room Sales</td>
                      <td className="border border-slate-300 p-1 text-right font-mono font-medium">₹ {roomSalesReceivable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-1">Food Sales</td>
                      <td className="border border-slate-300 p-1 text-right font-mono font-medium">₹ {totalFoodSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-1">Other Services Sales</td>
                      <td className="border border-slate-300 p-1 text-right font-mono font-medium">₹ 0.00</td>
                    </tr>
                    <tr className="font-bold bg-slate-50">
                      <td className="border border-slate-300 p-1">Total</td>
                      <td className="border border-slate-300 p-1 text-right font-mono">₹ {(roomSalesReceivable + totalFoodSales).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 3. Total Sale - Collection Breakup */}
              <div className="mb-3">
                <h3 className="text-xs font-bold text-slate-900 mb-1">Total Sale - Collection Breakup</h3>
                <table className="w-full border-collapse border border-slate-300 text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="border border-slate-300 p-1 text-left font-bold w-3/4">Payment Mode</th>
                      <th className="border border-slate-300 p-1 text-right font-bold w-1/4">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 p-1">Cash</td>
                      <td className="border border-slate-300 p-1 text-right font-mono font-medium">₹ {paymentBreakup.cash.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-1">Card</td>
                      <td className="border border-slate-300 p-1 text-right font-mono font-medium">₹ {paymentBreakup.card.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-1">UPI</td>
                      <td className="border border-slate-300 p-1 text-right font-mono font-medium">₹ {paymentBreakup.upi.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-1">Bank Transfer</td>
                      <td className="border border-slate-300 p-1 text-right font-mono font-medium">₹ {paymentBreakup.bankTransfer.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-1">Prepaid</td>
                      <td className="border border-slate-300 p-1 text-right font-mono font-medium">₹ {paymentBreakup.prepaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-1">BTC</td>
                      <td className="border border-slate-300 p-1 text-right font-mono font-medium">₹ {paymentBreakup.btc.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="font-bold bg-slate-50">
                      <td className="border border-slate-300 p-1">Total</td>
                      <td className="border border-slate-300 p-1 text-right font-mono">₹ {paymentBreakup.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 4. Check-in & Sales Source Breakdown */}
              <div className="mb-3">
                <h3 className="text-xs font-bold text-slate-900 mb-1">Check-in & Sales Source Breakdown</h3>
                <table className="w-full border-collapse border border-slate-300 text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="border border-slate-300 p-1 text-left font-bold">Source</th>
                      <th className="border border-slate-300 p-1 text-center font-bold">Check-ins</th>
                      <th className="border border-slate-300 p-1 text-right font-bold">Room Sales</th>
                      <th className="border border-slate-300 p-1 text-right font-bold">Food Sales</th>
                      <th className="border border-slate-300 p-1 text-right font-bold">Other Sales</th>
                      <th className="border border-slate-300 p-1 text-right font-bold">Total Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourceBreakdown.rows.map((row, idx) => (
                      <tr key={idx}>
                        <td className="border border-slate-300 p-1 font-semibold">{row.source}</td>
                        <td className="border border-slate-300 p-1 text-center font-mono">{row.checkIns}</td>
                        <td className="border border-slate-300 p-1 text-right font-mono">₹ {row.roomSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="border border-slate-300 p-1 text-right font-mono">₹ {row.foodSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="border border-slate-300 p-1 text-right font-mono">₹ {row.otherSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="border border-slate-300 p-1 text-right font-mono">₹ {row.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                    <tr className="font-bold bg-slate-50">
                      <td className="border border-slate-300 p-1">TOTAL</td>
                      <td className="border border-slate-300 p-1 text-center font-mono">{sourceBreakdown.total.checkIns}</td>
                      <td className="border border-slate-300 p-1 text-right font-mono">₹ {sourceBreakdown.total.roomSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="border border-slate-300 p-1 text-right font-mono">₹ {sourceBreakdown.total.foodSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="border border-slate-300 p-1 text-right font-mono">₹ {sourceBreakdown.total.otherSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="border border-slate-300 p-1 text-right font-mono">₹ {sourceBreakdown.total.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 5. Total Expenses */}
              <div className="mb-2">
                <h3 className="text-xs font-bold text-slate-900 mb-1">Total Expenses</h3>
                <table className="w-full border-collapse border border-slate-300 text-[10px]">
                  <tbody>
                    <tr className="bg-slate-50">
                      <td className="border border-slate-300 p-1 font-bold w-3/4">Total Expenses</td>
                      <td className="border border-slate-300 p-1 text-right font-mono font-bold w-1/4">₹ {totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-[9px] text-slate-500 italic mt-1">
                  Guest details, DayBook In, food/KOT details and expense details are attached only when selected during report download.
                </p>
              </div>

            </div>

            {/* PAGE BREAK FOR DETAILED DAILY REPORT */}
            <div className="page-break pt-4 border-t-2 border-dashed border-slate-200 mt-6">
              
              {/* Detailed Daily Report Header */}
              <div className="text-center mb-3">
                <h2 className="text-sm font-black text-slate-900">Detailed Daily Report</h2>
                <p className="text-[10px] text-slate-700 font-bold mt-0.5">
                  {hotelName} &nbsp; Date: {formattedReportDate} &nbsp; Generated: {generatedTimestamp}
                </p>
              </div>

              {/* 6. Check-ins Table */}
              <div className="mb-4">
                <h3 className="text-[11px] font-bold text-slate-900 mb-1">Check-ins</h3>
                <table className="w-full border-collapse border border-slate-300 text-[9.5px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="border border-slate-300 p-1 text-center w-8">S.No.</th>
                      <th className="border border-slate-300 p-1 text-left">Guest Name</th>
                      <th className="border border-slate-300 p-1 text-center">Room</th>
                      <th className="border border-slate-300 p-1 text-left">Source</th>
                      <th className="border border-slate-300 p-1 text-center">Check-in</th>
                      <th className="border border-slate-300 p-1 text-center">Phone</th>
                      <th className="border border-slate-300 p-1 text-center w-8">Pax</th>
                      <th className="border border-slate-300 p-1 text-center w-10">Plan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkInsList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="border border-slate-300 p-2 text-center text-slate-400">No check-ins recorded for this date.</td>
                      </tr>
                    ) : (
                      checkInsList.map(item => (
                        <tr key={item.sNo}>
                          <td className="border border-slate-300 p-1 text-center font-mono">{item.sNo}</td>
                          <td className="border border-slate-300 p-1 font-bold">{item.guestName}</td>
                          <td className="border border-slate-300 p-1 text-center font-mono font-bold">{item.roomNumber}</td>
                          <td className="border border-slate-300 p-1">{item.source}</td>
                          <td className="border border-slate-300 p-1 text-center font-mono">{item.checkInTime}</td>
                          <td className="border border-slate-300 p-1 text-center font-mono">{item.phone}</td>
                          <td className="border border-slate-300 p-1 text-center font-mono">{item.pax}</td>
                          <td className="border border-slate-300 p-1 text-center font-mono">{item.plan}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* 7. Rooms Continued Table */}
              <div className="mb-4">
                <h3 className="text-[11px] font-bold text-slate-900 mb-1">Rooms Continued</h3>
                <table className="w-full border-collapse border border-slate-300 text-[9.5px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="border border-slate-300 p-1 text-center w-8">S.No.</th>
                      <th className="border border-slate-300 p-1 text-left">Guest Name</th>
                      <th className="border border-slate-300 p-1 text-center">Room</th>
                      <th className="border border-slate-300 p-1 text-left">Source</th>
                      <th className="border border-slate-300 p-1 text-center">Check-in Date</th>
                      <th className="border border-slate-300 p-1 text-center">Phone</th>
                      <th className="border border-slate-300 p-1 text-center w-8">Pax</th>
                      <th className="border border-slate-300 p-1 text-center w-10">Plan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomsContinuedList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="border border-slate-300 p-2 text-center text-slate-400">No continuing stays recorded.</td>
                      </tr>
                    ) : (
                      roomsContinuedList.map(item => (
                        <tr key={item.sNo}>
                          <td className="border border-slate-300 p-1 text-center font-mono">{item.sNo}</td>
                          <td className="border border-slate-300 p-1 font-bold">{item.guestName}</td>
                          <td className="border border-slate-300 p-1 text-center font-mono font-bold">{item.roomNumber}</td>
                          <td className="border border-slate-300 p-1">{item.source}</td>
                          <td className="border border-slate-300 p-1 text-center font-mono">{item.checkInDate}</td>
                          <td className="border border-slate-300 p-1 text-center font-mono">{item.phone}</td>
                          <td className="border border-slate-300 p-1 text-center font-mono">{item.pax}</td>
                          <td className="border border-slate-300 p-1 text-center font-mono">{item.plan}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* 8. Check-outs Table */}
              <div className="mb-4">
                <h3 className="text-[11px] font-bold text-slate-900 mb-1">Check-outs</h3>
                <table className="w-full border-collapse border border-slate-300 text-[9.5px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="border border-slate-300 p-1 text-center w-8">S.No.</th>
                      <th className="border border-slate-300 p-1 text-left">Guest Name</th>
                      <th className="border border-slate-300 p-1 text-center">Room</th>
                      <th className="border border-slate-300 p-1 text-left">Source</th>
                      <th className="border border-slate-300 p-1 text-center">Check-out</th>
                      <th className="border border-slate-300 p-1 text-center">Phone</th>
                      <th className="border border-slate-300 p-1 text-center w-8">Pax</th>
                      <th className="border border-slate-300 p-1 text-center w-10">Plan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkOutsList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="border border-slate-300 p-2 text-center text-slate-400">No check-outs recorded for this date.</td>
                      </tr>
                    ) : (
                      checkOutsList.map(item => (
                        <tr key={item.sNo}>
                          <td className="border border-slate-300 p-1 text-center font-mono">{item.sNo}</td>
                          <td className="border border-slate-300 p-1 font-bold">{item.guestName}</td>
                          <td className="border border-slate-300 p-1 text-center font-mono font-bold">{item.roomNumber}</td>
                          <td className="border border-slate-300 p-1">{item.source}</td>
                          <td className="border border-slate-300 p-1 text-center font-mono">{item.checkOutTime}</td>
                          <td className="border border-slate-300 p-1 text-center font-mono">{item.phone}</td>
                          <td className="border border-slate-300 p-1 text-center font-mono">{item.pax}</td>
                          <td className="border border-slate-300 p-1 text-center font-mono">{item.plan}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* 9. DayBook In Table */}
              <div className="mb-4">
                <h3 className="text-[11px] font-bold text-slate-900 mb-1">DayBook In</h3>
                <table className="w-full border-collapse border border-slate-300 text-[9.5px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="border border-slate-300 p-1 text-center w-8">S.No.</th>
                      <th className="border border-slate-300 p-1 text-left">Customer Name</th>
                      <th className="border border-slate-300 p-1 text-center">Room Number</th>
                      <th className="border border-slate-300 p-1 text-center">Entry Number</th>
                      <th className="border border-slate-300 p-1 text-left">Bill Items</th>
                      <th className="border border-slate-300 p-1 text-left">Payment Mode</th>
                      <th className="border border-slate-300 p-1 text-right">Amount</th>
                      <th className="border border-slate-300 p-1 text-center">Order Date and Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayBookInList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="border border-slate-300 p-2 text-center text-slate-400">No collections recorded for this date.</td>
                      </tr>
                    ) : (
                      dayBookInList.map(item => (
                        <tr key={item.sNo}>
                          <td className="border border-slate-300 p-1 text-center font-mono">{item.sNo}</td>
                          <td className="border border-slate-300 p-1 font-bold">{item.customerName}</td>
                          <td className="border border-slate-300 p-1 text-center font-mono font-bold">{item.roomNumber}</td>
                          <td className="border border-slate-300 p-1 text-center font-mono">{item.entryNumber}</td>
                          <td className="border border-slate-300 p-1">{item.billItems}</td>
                          <td className="border border-slate-300 p-1">{item.paymentMode}</td>
                          <td className="border border-slate-300 p-1 text-right font-mono font-semibold">₹ {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="border border-slate-300 p-1 text-center font-mono">{item.orderDateTime}</td>
                        </tr>
                      ))
                    )}
                    <tr className="font-bold bg-slate-50">
                      <td colSpan={6} className="border border-slate-300 p-1 text-left">TOTAL</td>
                      <td className="border border-slate-300 p-1 text-right font-mono font-bold">₹ {totalDayBookIn.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="border border-slate-300 p-1"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 10. Food / KOT Details */}
              <div className="mb-4">
                <h3 className="text-[11px] font-bold text-slate-900 mb-1">Food / KOT Details</h3>
                <table className="w-full border-collapse border border-slate-300 text-[9.5px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="border border-slate-300 p-1 text-center w-8">S.No.</th>
                      <th className="border border-slate-300 p-1 text-center">KOT No.</th>
                      <th className="border border-slate-300 p-1 text-center">Room / Table</th>
                      <th className="border border-slate-300 p-1 text-left">Guest / Customer</th>
                      <th className="border border-slate-300 p-1 text-left">Items</th>
                      <th className="border border-slate-300 p-1 text-right">Amount</th>
                      <th className="border border-slate-300 p-1 text-center">Payment</th>
                      <th className="border border-slate-300 p-1 text-center">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {foodKotList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="border border-slate-300 p-2 text-center text-slate-400">No Food / KOT entries for this date.</td>
                      </tr>
                    ) : (
                      foodKotList.map(item => (
                        <tr key={item.sNo}>
                          <td className="border border-slate-300 p-1 text-center font-mono">{item.sNo}</td>
                          <td className="border border-slate-300 p-1 text-center font-mono">{item.kotNo}</td>
                          <td className="border border-slate-300 p-1 text-center">{item.roomTable}</td>
                          <td className="border border-slate-300 p-1 font-semibold">{item.guestCustomer}</td>
                          <td className="border border-slate-300 p-1 truncate max-w-[150px]">{item.items}</td>
                          <td className="border border-slate-300 p-1 text-right font-mono">₹ {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="border border-slate-300 p-1 text-center">{item.payment}</td>
                          <td className="border border-slate-300 p-1 text-center font-mono">{item.dateTime}</td>
                        </tr>
                      ))
                    )}
                    <tr className="font-bold bg-slate-50">
                      <td colSpan={5} className="border border-slate-300 p-1 text-left">TOTAL</td>
                      <td className="border border-slate-300 p-1 text-right font-mono">₹ {totalFoodSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td colSpan={2} className="border border-slate-300 p-1"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 11. DayBook Out / Expense Details */}
              <div className="mb-2">
                <h3 className="text-[11px] font-bold text-slate-900 mb-1">DayBook Out / Expense Details</h3>
                <table className="w-full border-collapse border border-slate-300 text-[9.5px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="border border-slate-300 p-1 text-center w-8">S.No.</th>
                      <th className="border border-slate-300 p-1 text-left">Expense Name</th>
                      <th className="border border-slate-300 p-1 text-right">Amount</th>
                      <th className="border border-slate-300 p-1 text-left">Extra Remarks</th>
                      <th className="border border-slate-300 p-1 text-center">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expensesList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="border border-slate-300 p-2 text-center text-slate-400">No expense entries for this date.</td>
                      </tr>
                    ) : (
                      expensesList.map(item => (
                        <tr key={item.sNo}>
                          <td className="border border-slate-300 p-1 text-center font-mono">{item.sNo}</td>
                          <td className="border border-slate-300 p-1 font-semibold">{item.expenseName}</td>
                          <td className="border border-slate-300 p-1 text-right font-mono">₹ {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="border border-slate-300 p-1">{item.extraRemarks}</td>
                          <td className="border border-slate-300 p-1 text-center font-mono">{item.dateTime}</td>
                        </tr>
                      ))
                    )}
                    <tr className="font-bold bg-slate-50">
                      <td className="border border-slate-300 p-1">TOTAL EXPENSES</td>
                      <td className="border border-slate-300 p-1"></td>
                      <td className="border border-slate-300 p-1 text-right font-mono">₹ {totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td colSpan={2} className="border border-slate-300 p-1"></td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-[9px] text-slate-500 italic mt-1">
                  Detailed attachment for the Daily Sales Report. Guest, DayBook In, Food/KOT and DayBook Out details are included.
                </p>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
