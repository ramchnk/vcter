import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Search, 
  Receipt, 
  CreditCard, 
  Landmark, 
  DollarSign, 
  Printer, 
  Mail, 
  PhoneCall, 
  CheckCircle, 
  History, 
  Calendar, 
  Filter, 
  Eye, 
  ArrowUpRight, 
  Download,
  Building,
  User,
  Clock,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface UnifiedBillingViewProps {
  selectedRoomNo: string;
  setSelectedRoomNo: (roomNo: string) => void;
}

export interface InvoicePrintData {
  invoiceNumber: string;
  guestName: string;
  guestPhone?: string;
  guestEmail?: string;
  guestAddress?: string;
  guestIdProof?: string;
  gstNumber?: string;
  roomNumber: string;
  roomCategory: string;
  checkInDate: string;
  checkOutDate: string;
  stayDuration: number;
  roomPrice: number;
  roomRentTotal: number;
  restaurantTotal: number;
  barTotal: number;
  laundryTotal: number;
  hallTotal: number;
  otherCharges: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  advancePaid: number;
  discount: number;
  netPayable: number;
  paymentMethod: string;
  splitDetails?: string;
  dateOfIssue: string;
  ordersList?: { orderNumber: string; items: string; isBar: boolean }[];
  laundryList?: { orderNumber: string; items: string }[];
  hallList?: { bookingNumber: string; hallType: string; date: string }[];
}

export const UnifiedBillingView: React.FC<UnifiedBillingViewProps> = ({ selectedRoomNo, setSelectedRoomNo }) => {
  const { 
    rooms, 
    preBookings, 
    auditLogs, 
    getBillSummary, 
    checkOutRoom, 
    settings, 
    addAudit, 
    orders, 
    laundryOrders, 
    hallBookings,
    effectiveTenantId 
  } = useApp();

  // Top tab selector: Live Check-Out vs Bill History
  const [activeBillingTab, setActiveBillingTab] = useState<'checkout' | 'history'>('checkout');

  // Live Checkout States
  const [searchRoomInput, setSearchRoomInput] = useState(selectedRoomNo);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'UPI' | 'Split'>('UPI');
  
  // Split details
  const [splitCash, setSplitCash] = useState(0);
  const [splitCard, setSplitCard] = useState(0);
  const [splitUpi, setSplitUpi] = useState(0);

  // Print Invoice details & modal
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printFormat, setPrintFormat] = useState<'a4' | 'thermal'>('a4');
  const [activePrintInvoice, setActivePrintInvoice] = useState<InvoicePrintData | null>(null);
  const [successAction, setSuccessAction] = useState('');

  // Bill History Filters & Search
  const [historySearch, setHistorySearch] = useState('');
  const [historyDatePreset, setHistoryDatePreset] = useState<'all' | 'today' | 'yesterday' | '7days' | 'month' | 'custom'>('all');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');

  const numberToWords = (num: number): string => {
    if (num === 0) return 'Zero Rupees Only';
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const inWords = (n: number): string => {
      let str = '';
      if (n > 99) {
        str += a[Math.floor(n / 100)] + 'Hundred ';
        n %= 100;
      }
      if (n > 19) {
        str += b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : ' ');
      } else if (n > 0) {
        str += a[n];
      }
      return str;
    };

    let n = Math.floor(num);
    let output = '';
    if (n >= 10000000) {
      output += inWords(Math.floor(n / 10000000)) + 'Crore ';
      n %= 10000000;
    }
    if (n >= 100000) {
      output += inWords(Math.floor(n / 100000)) + 'Lakh ';
      n %= 100000;
    }
    if (n >= 1000) {
      output += inWords(Math.floor(n / 1000)) + 'Thousand ';
      n %= 1000;
    }
    if (n > 0) {
      output += inWords(n);
    }
    return ('Rupees ' + output.trim() + ' Only');
  };

  // Sync inputs
  useEffect(() => {
    if (selectedRoomNo) {
      setSearchRoomInput(selectedRoomNo);
      setActiveBillingTab('checkout');
    }
  }, [selectedRoomNo]);

  const tenantRooms = useMemo(() => {
    return rooms.filter(r => !effectiveTenantId || !r.tenantId || r.tenantId === effectiveTenantId);
  }, [rooms, effectiveTenantId]);

  const activeOccupiedRooms = tenantRooms.filter(r => r.status === 'Occupied');
  const matchedRoom = tenantRooms.find(r => r.roomNumber === searchRoomInput);
  
  // Real-time bill calculations for live room
  const summary = getBillSummary(searchRoomInput);

  const roomRentTotal = summary?.roomRentTotal || 0;
  const restaurantTotal = summary?.restaurantTotal || 0;
  const barTotal = summary?.barTotal || 0;
  const laundryTotal = summary?.laundryTotal || 0;
  const hallTotal = summary?.hallTotal || 0;
  const otherCharges = summary?.otherCharges || 0;
  
  const grossFolioTotal = roomRentTotal + restaurantTotal + barTotal + laundryTotal + hallTotal + otherCharges;
  const taxRate = summary?.taxRate || 12;
  const taxableSubtotal = summary?.subtotal ?? (grossFolioTotal > 0 ? parseFloat((grossFolioTotal / (1 + taxRate / 100)).toFixed(2)) : 0);
  const taxAmount = summary?.taxAmount ?? (grossFolioTotal > 0 ? parseFloat((grossFolioTotal - taxableSubtotal).toFixed(2)) : 0);
  const grandTotal = grossFolioTotal;
  
  const advancePaid = summary?.advancePaid || 0;
  const outstandingAmount = Math.max(0, grandTotal - advancePaid - discount);

  const roomOrders = orders.filter(o => o.roomNumber === searchRoomInput && o.status === 'PostedToRoom');
  const roomLaundry = laundryOrders.filter(l => l.roomNumber === searchRoomInput);
  const roomHalls = hallBookings.filter(h => h.roomNumber === searchRoomInput && h.status !== 'Cancelled');

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchedRoom || !summary) return;

    let splitDetails = '';
    if (paymentMethod === 'Split') {
      splitDetails = `Cash: ₹${splitCash}, Card: ₹${splitCard}, UPI: ₹${splitUpi}`;
    }

    // Auto-generate invoice preview
    const invNo = `${settings.invoicePrefix || 'INV-'}${Math.floor(100000 + Math.random() * 900000)}`;
    const invoiceData: InvoicePrintData = {
      invoiceNumber: invNo,
      guestName: summary.guestName || matchedRoom.guestName || 'In-House Guest',
      guestPhone: matchedRoom.guestPhone,
      guestEmail: matchedRoom.guestEmail,
      guestAddress: matchedRoom.guestAddress,
      guestIdProof: matchedRoom.guestIdProof,
      gstNumber: matchedRoom.gstNumber,
      roomNumber: matchedRoom.roomNumber,
      roomCategory: matchedRoom.category,
      checkInDate: summary.checkInDate,
      checkOutDate: summary.checkOutDate,
      stayDuration: summary.stayDuration,
      roomPrice: matchedRoom.price || 0,
      roomRentTotal: roomRentTotal,
      restaurantTotal: restaurantTotal,
      barTotal: barTotal,
      laundryTotal: laundryTotal,
      hallTotal: hallTotal,
      otherCharges: otherCharges,
      subtotal: taxableSubtotal,
      taxRate: taxRate,
      taxAmount: taxAmount,
      grandTotal: grandTotal,
      advancePaid: advancePaid,
      discount: discount,
      netPayable: outstandingAmount,
      paymentMethod: paymentMethod,
      splitDetails: paymentMethod === 'Split' ? splitDetails : undefined,
      dateOfIssue: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      ordersList: roomOrders.map(o => ({
        orderNumber: o.orderNumber,
        items: o.items.map(it => `${it.name} (${it.quantity})`).join(', '),
        isBar: o.isBar
      })),
      laundryList: roomLaundry.map(l => ({
        orderNumber: l.orderNumber,
        items: l.items.map(it => `${it.itemType} x${it.quantity}`).join(', ')
      })),
      hallList: roomHalls.map(h => ({
        bookingNumber: h.bookingNumber,
        hallType: h.hallType,
        date: h.date
      }))
    };

    setActivePrintInvoice(invoiceData);

    checkOutRoom(matchedRoom.id, {
      method: paymentMethod,
      discount,
      splitDetails: paymentMethod === 'Split' ? splitDetails : undefined
    });

    // Fun confetti effect!
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });

    setSuccessAction(`Checked out Room ${searchRoomInput} successfully! Received ₹${outstandingAmount.toFixed(0)}`);
    setTimeout(() => setSuccessAction(''), 5000);

    // Prompt user if they want to print invoice immediately
    setShowPrintModal(true);

    // Clear inputs
    setSelectedRoomNo('');
    setSearchRoomInput('');
    setDiscount(0);
  };

  const handlePrintTriggerLive = () => {
    if (!summary || !matchedRoom) return;
    const invNo = `${settings.invoicePrefix || 'INV-'}${Math.floor(100000 + Math.random() * 900000)}`;
    let splitDetails = '';
    if (paymentMethod === 'Split') {
      splitDetails = `Cash: ₹${splitCash}, Card: ₹${splitCard}, UPI: ₹${splitUpi}`;
    }

    const invoiceData: InvoicePrintData = {
      invoiceNumber: invNo,
      guestName: summary.guestName || matchedRoom.guestName || 'In-House Guest',
      guestPhone: matchedRoom.guestPhone,
      guestEmail: matchedRoom.guestEmail,
      guestAddress: matchedRoom.guestAddress,
      guestIdProof: matchedRoom.guestIdProof,
      gstNumber: matchedRoom.gstNumber,
      roomNumber: matchedRoom.roomNumber,
      roomCategory: matchedRoom.category,
      checkInDate: summary.checkInDate,
      checkOutDate: summary.checkOutDate,
      stayDuration: summary.stayDuration,
      roomPrice: matchedRoom.price || 0,
      roomRentTotal: roomRentTotal,
      restaurantTotal: restaurantTotal,
      barTotal: barTotal,
      laundryTotal: laundryTotal,
      hallTotal: hallTotal,
      otherCharges: otherCharges,
      subtotal: taxableSubtotal,
      taxRate: taxRate,
      taxAmount: taxAmount,
      grandTotal: grandTotal,
      advancePaid: advancePaid,
      discount: discount,
      netPayable: outstandingAmount,
      paymentMethod: paymentMethod,
      splitDetails: paymentMethod === 'Split' ? splitDetails : undefined,
      dateOfIssue: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      ordersList: roomOrders.map(o => ({
        orderNumber: o.orderNumber,
        items: o.items.map(it => `${it.name} (${it.quantity})`).join(', '),
        isBar: o.isBar
      })),
      laundryList: roomLaundry.map(l => ({
        orderNumber: l.orderNumber,
        items: l.items.map(it => `${it.itemType} x${it.quantity}`).join(', ')
      })),
      hallList: roomHalls.map(h => ({
        bookingNumber: h.bookingNumber,
        hallType: h.hallType,
        date: h.date
      }))
    };

    setActivePrintInvoice(invoiceData);
    setShowPrintModal(true);
  };

  const handleSendEmail = () => {
    if (!summary) return;
    addAudit('Email Invoice', `Invoice sent to guest for Room ${searchRoomInput}`);
    setSuccessAction('Simulated: Invoice sent to customer Email successfully!');
    setTimeout(() => setSuccessAction(''), 3000);
  };

  const handleSendWhatsapp = () => {
    if (!summary) return;
    addAudit('WhatsApp Invoice', `Invoice dispatched to guest WhatsApp for Room ${searchRoomInput}`);
    setSuccessAction('Simulated: Invoice sent to customer WhatsApp successfully!');
    setTimeout(() => setSuccessAction(''), 3000);
  };

  // ==========================================
  // BILL & SETTLEMENT HISTORY AGGREGATION
  // ==========================================
  const tenantPreBookings = useMemo(() => {
    return (preBookings || []).filter(pb => !effectiveTenantId || !pb.tenantId || pb.tenantId === effectiveTenantId);
  }, [preBookings, effectiveTenantId]);

  const tenantAuditLogs = useMemo(() => {
    return (auditLogs || []).filter(a => !effectiveTenantId || !a.tenantId || a.tenantId === effectiveTenantId);
  }, [auditLogs, effectiveTenantId]);

  // Build Comprehensive Bill History List
  const allSettledBills = useMemo(() => {
    const list: InvoicePrintData[] = [];
    const seenMap = new Set<string>();

    // 1. Process PreBookings with CheckedOut status
    tenantPreBookings.forEach(pb => {
      if (pb.status === 'CheckedOut') {
        const roomNo = pb.roomNumber || 'Room';
        const checkIn = pb.checkInDate || pb.bookingDate || new Date().toISOString().split('T')[0];
        const checkOut = pb.checkOutDate || new Date().toISOString().split('T')[0];
        let stayNights = 1;
        if (checkIn && checkOut) {
          const s = new Date(checkIn).getTime();
          const e = new Date(checkOut).getTime();
          stayNights = Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)));
        }

        const rm = tenantRooms.find(r => r.roomNumber === roomNo || r.category === pb.roomCategory);
        const roomPrice = rm?.price || 2000;
        const roomRent = (pb as any).roomRentTotal || ((pb as any).totalAmount ? (pb as any).totalAmount : (stayNights * roomPrice));
        const grandTot = (pb as any).totalAmount || roomRent;
        const taxR = 12;
        const taxableSubtotal = parseFloat((grandTot / (1 + taxR / 100)).toFixed(2));
        const taxAmt = parseFloat((grandTot - taxableSubtotal).toFixed(2));
        const advPaid = pb.advancePaid || 0;
        const netPay = Math.max(0, grandTot - advPaid);

        const key = `${roomNo}_${checkOut}_${pb.guestName}`;
        seenMap.add(key);

        list.push({
          invoiceNumber: `${settings.invoicePrefix || 'INV-'}${pb.id.slice(-6).toUpperCase()}`,
          guestName: pb.guestName || 'Guest',
          guestPhone: pb.phone,
          guestEmail: pb.email,
          guestAddress: pb.address,
          guestIdProof: pb.idProof,
          gstNumber: pb.gstNumber,
          roomNumber: roomNo,
          roomCategory: pb.roomCategory || rm?.category || 'Standard',
          checkInDate: checkIn,
          checkOutDate: checkOut,
          stayDuration: stayNights,
          roomPrice: roomPrice,
          roomRentTotal: roomRent,
          restaurantTotal: 0,
          barTotal: 0,
          laundryTotal: 0,
          hallTotal: 0,
          otherCharges: 0,
          subtotal: taxableSubtotal,
          taxRate: taxR,
          taxAmount: taxAmt,
          grandTotal: grandTot,
          advancePaid: advPaid,
          discount: 0,
          netPayable: netPay,
          paymentMethod: 'UPI / Direct Settlement',
          dateOfIssue: checkOut
        });
      }
    });

    // 2. Process Check-Out Audit Logs for past checkouts
    tenantAuditLogs.forEach(a => {
      if (a.action === 'Check-Out') {
        const roomMatch = a.details?.match(/Room\s+([A-Za-z0-9_-]+)/i);
        const guestMatch = a.details?.match(/Guest\s+(.+?)\s+checked out/i);
        const rentMatch = a.details?.match(/Room Rent:\s*₹?([0-9]+(?:\.[0-9]+)?)/i);
        const folioMatch = a.details?.match(/Total Folio:\s*₹?([0-9]+(?:\.[0-9]+)?)/i) || a.details?.match(/Total Bill:\s*₹?([0-9]+(?:\.[0-9]+)?)/i);
        const discMatch = a.details?.match(/Discount:\s*₹?([0-9]+(?:\.[0-9]+)?)/i);
        const payMatch = a.details?.match(/Paid via\s+([A-Za-z0-9\s]+?)(?:\.|$)/i);

        const roomNo = roomMatch ? roomMatch[1] : 'N/A';
        const gName = guestMatch ? guestMatch[1] : 'In-House Guest';
        const dateStr = a.timestamp?.split('T')[0] || new Date().toISOString().split('T')[0];

        const key = `${roomNo}_${dateStr}_${gName}`;
        if (!seenMap.has(key)) {
          seenMap.add(key);
          const rm = tenantRooms.find(r => r.roomNumber === roomNo);
          const rent = rentMatch ? parseFloat(rentMatch[1]) : (rm?.price || 2000);
          const grandTot = folioMatch ? parseFloat(folioMatch[1]) : rent;
          const disc = discMatch ? parseFloat(discMatch[1]) : 0;
          const payMode = payMatch ? payMatch[1].trim() : 'UPI';
          const taxR = 12;
          const taxableSubtotal = parseFloat((grandTot / (1 + taxR / 100)).toFixed(2));
          const taxAmt = parseFloat((grandTot - taxableSubtotal).toFixed(2));
          const netPay = Math.max(0, grandTot - disc);

          list.push({
            invoiceNumber: `${settings.invoicePrefix || 'INV-'}${a.id.slice(-6).toUpperCase()}`,
            guestName: gName,
            guestPhone: rm?.guestPhone || '',
            guestEmail: rm?.guestEmail || '',
            guestAddress: rm?.guestAddress || '',
            guestIdProof: rm?.guestIdProof || '',
            gstNumber: rm?.gstNumber || '',
            roomNumber: roomNo,
            roomCategory: rm?.category || 'Standard',
            checkInDate: dateStr,
            checkOutDate: dateStr,
            stayDuration: 1,
            roomPrice: rm?.price || rent,
            roomRentTotal: rent,
            restaurantTotal: 0,
            barTotal: 0,
            laundryTotal: 0,
            hallTotal: 0,
            otherCharges: 0,
            subtotal: taxableSubtotal,
            taxRate: taxR,
            taxAmount: taxAmt,
            grandTotal: grandTot,
            advancePaid: 0,
            discount: disc,
            netPayable: netPay,
            paymentMethod: payMode,
            dateOfIssue: dateStr
          });
        }
      }
    });

    // Sort newest first
    return list.sort((a, b) => new Date(b.dateOfIssue).getTime() - new Date(a.dateOfIssue).getTime());
  }, [tenantPreBookings, tenantAuditLogs, tenantRooms, settings.invoicePrefix]);

  // Apply Date Presets for History
  const applyHistoryPreset = (preset: 'all' | 'today' | 'yesterday' | '7days' | 'month' | 'custom') => {
    setHistoryDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'all') {
      setHistoryStartDate('');
      setHistoryEndDate('');
    } else if (preset === 'today') {
      setHistoryStartDate(todayStr);
      setHistoryEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setHistoryStartDate(yStr);
      setHistoryEndDate(yStr);
    } else if (preset === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setHistoryStartDate(d.toISOString().split('T')[0]);
      setHistoryEndDate(todayStr);
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      setHistoryStartDate(firstDay);
      setHistoryEndDate(todayStr);
    }
  };

  // Filtered History
  const filteredBillHistory = useMemo(() => {
    return allSettledBills.filter(bill => {
      // Date filter
      if (historyStartDate && bill.dateOfIssue < historyStartDate) return false;
      if (historyEndDate && bill.dateOfIssue > historyEndDate) return false;

      // Text search
      if (historySearch.trim()) {
        const query = historySearch.toLowerCase();
        const matchesRoom = bill.roomNumber.toLowerCase().includes(query);
        const matchesGuest = bill.guestName.toLowerCase().includes(query);
        const matchesPhone = bill.guestPhone?.toLowerCase().includes(query);
        const matchesInv = bill.invoiceNumber.toLowerCase().includes(query);
        const matchesCategory = bill.roomCategory.toLowerCase().includes(query);
        if (!matchesRoom && !matchesGuest && !matchesPhone && !matchesInv && !matchesCategory) {
          return false;
        }
      }

      return true;
    });
  }, [allSettledBills, historyStartDate, historyEndDate, historySearch]);

  // Quick stats for Bill History
  const historyStats = useMemo(() => {
    const totalCount = filteredBillHistory.length;
    const totalRevenue = filteredBillHistory.reduce((acc, b) => acc + (b.netPayable || b.roomRentTotal), 0);
    const totalDiscounts = filteredBillHistory.reduce((acc, b) => acc + (b.discount || 0), 0);
    const avgBill = totalCount > 0 ? Math.round(totalRevenue / totalCount) : 0;
    return { totalCount, totalRevenue, totalDiscounts, avgBill };
  }, [filteredBillHistory]);

  const handleOpenHistoricalInvoice = (bill: InvoicePrintData) => {
    setActivePrintInvoice(bill);
    setShowPrintModal(true);
  };

  // Export Bill History to CSV
  const handleExportHistoryCSV = () => {
    const rows = [
      ['HotelVista ERP - Settled Bill & Invoices History Report'],
      ['Filter Period', historyStartDate && historyEndDate ? `${historyStartDate} to ${historyEndDate}` : 'All Time'],
      ['Generated On', new Date().toLocaleString()],
      ['Total Records', filteredBillHistory.length],
      [],
      ['Invoice No', 'Room No', 'Category', 'Guest Name', 'Phone', 'Check-In', 'Check-Out', 'Nights', 'Room Rent (INR)', 'Tax (INR)', 'Discount (INR)', 'Net Settled (INR)', 'Payment Mode', 'Date of Issue']
    ];

    filteredBillHistory.forEach(b => {
      rows.push([
        b.invoiceNumber,
        `Room ${b.roomNumber}`,
        b.roomCategory,
        b.guestName,
        b.guestPhone || 'N/A',
        b.checkInDate,
        b.checkOutDate,
        b.stayDuration,
        b.roomRentTotal,
        b.taxAmount,
        b.discount,
        b.netPayable,
        b.paymentMethod,
        b.dateOfIssue
      ]);
    });

    const csvContent = "\uFEFF" + rows.map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Bill_History_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">

      {/* Top Header Navigation Tabs: Live Checkout vs Bill History */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveBillingTab('checkout')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeBillingTab === 'checkout'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Live Check-Out & Settlement</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveBillingTab('history')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeBillingTab === 'history'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Bill & Settlement History ({allSettledBills.length})</span>
          </button>
        </div>

        {activeBillingTab === 'history' && (
          <button
            type="button"
            onClick={handleExportHistoryCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export History (.csv)</span>
          </button>
        )}
      </div>

      {/* =========================================================================
          TAB 1: LIVE CHECK-OUT & SETTLEMENT ENGINE
          ========================================================================= */}
      {activeBillingTab === 'checkout' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Search & Bill Calculator (Left - 7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Search header */}
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm space-y-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Receptionist Bill Lookup (Active Room Check)
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  list="occupied-room-search"
                  placeholder="Enter Room Number (e.g. 101, 201)..."
                  value={searchRoomInput}
                  onChange={e => {
                    setSearchRoomInput(e.target.value);
                    setSelectedRoomNo(e.target.value);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border dark:border-slate-800 dark:bg-slate-950 rounded-xl font-bold font-mono focus:ring-2 focus:ring-indigo-500/20"
                />
                <datalist id="occupied-room-search">
                  {activeOccupiedRooms.map(r => (
                    <option key={r.id} value={r.roomNumber}>{`Room ${r.roomNumber} (${r.category}) - ${r.guestName}`}</option>
                  ))}
                </datalist>
              </div>
              <p className="text-[10px] text-slate-400">
                Type any occupied room number above to aggregate charges instantly.
              </p>
            </div>

            {/* Dynamic Aggregated Bill Screen */}
            {summary ? (
              <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
                
                {/* Guest Summary details */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-indigo-500">
                      Consolidated Room Invoice
                    </h3>
                    <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">
                      {summary.guestName}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                      Stay: {summary.checkInDate} to {summary.checkOutDate} ({summary.stayDuration} Days)
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded uppercase tracking-wider">
                      Occupied
                    </span>
                    <p className="text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-1.5">
                      Room {searchRoomInput}
                    </p>
                    <span className="text-[11px] font-semibold text-indigo-500">
                      {matchedRoom?.category || 'Deluxe'}
                    </span>
                  </div>
                </div>

                {/* Departmental breakdown items */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Departmental Charges Ledger</h4>
                  
                  <div className="space-y-2 border dark:border-slate-800 p-4 rounded-xl font-mono text-xs">
                    
                    <div className="flex justify-between">
                      <span className="text-slate-500">Room rent total ({summary.stayDuration} Days @ ₹{matchedRoom?.price}/day)</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">₹{roomRentTotal}</span>
                    </div>

                    {restaurantTotal > 0 && (
                      <div className="flex justify-between border-t border-slate-100 dark:border-slate-850 pt-1">
                        <span className="text-slate-500">Restaurant POS charges (F&B)</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">₹{restaurantTotal}</span>
                      </div>
                    )}

                    {barTotal > 0 && (
                      <div className="flex justify-between border-t border-slate-100 dark:border-slate-850 pt-1">
                        <span className="text-slate-500">Bar & Lounge drinks charges</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">₹{barTotal}</span>
                      </div>
                    )}

                    {laundryTotal > 0 && (
                      <div className="flex justify-between border-t border-slate-100 dark:border-slate-850 pt-1">
                        <span className="text-slate-500">Laundry & dry cleaning charges</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">₹{laundryTotal}</span>
                      </div>
                    )}

                    {hallTotal > 0 && (
                      <div className="flex justify-between border-t border-slate-100 dark:border-slate-850 pt-1">
                        <span className="text-slate-500">Party & Banquet Hall bookings</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">₹{hallTotal}</span>
                      </div>
                    )}

                    {otherCharges > 0 && (
                      <div className="flex justify-between border-t border-slate-100 dark:border-slate-850 pt-1">
                        <span className="text-slate-500">Mini-bar & Other services</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">₹{otherCharges}</span>
                      </div>
                    )}

                    <div className="flex justify-between border-t-2 border-slate-200 dark:border-slate-700 pt-2 font-bold">
                      <span>Total Gross Folio (Incl. GST)</span>
                      <span>₹{grandTotal}</span>
                    </div>

                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Taxable Value (Base)</span>
                      <span>₹{taxableSubtotal}</span>
                    </div>

                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>GST Taxes ({taxRate}% Inclusive)</span>
                      <span>₹{taxAmount}</span>
                    </div>

                    {advancePaid > 0 && (
                      <div className="flex justify-between text-emerald-600 font-bold border-t border-slate-100 dark:border-slate-850 pt-1">
                        <span>Pre-Paid Advance Deposit</span>
                        <span>-₹{advancePaid}</span>
                      </div>
                    )}

                    {discount > 0 && (
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>Cashier Discount</span>
                        <span>-₹{discount}</span>
                      </div>
                    )}

                    <div className="flex justify-between border-t-2 border-slate-900 dark:border-slate-200 pt-2 text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                      <span>Net Outstanding Balance</span>
                      <span>₹{outstandingAmount.toFixed(0)}</span>
                    </div>

                  </div>
                </div>

                {/* Communication actions */}
                <div className="pt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handlePrintTriggerLive}
                    className="flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <Printer className="w-4 h-4" /> Print Tax Invoice (A4 / Thermal)
                  </button>
                  <button
                    type="button"
                    onClick={handleSendEmail}
                    className="py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Mail className="w-4 h-4" /> Email Invoice
                  </button>
                  <button
                    type="button"
                    onClick={handleSendWhatsapp}
                    className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <PhoneCall className="w-4 h-4" /> WhatsApp
                  </button>
                </div>

              </div>
            ) : (
              <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl text-slate-400">
                <span className="text-4xl">🔑</span>
                <h4 className="text-xs font-bold uppercase tracking-wider mt-3">No Room Selected</h4>
                <p className="text-[10px] text-slate-500 mt-1 max-w-sm mx-auto">
                  Please enter an active occupied room number in the search bar above to generate a unified bill.
                </p>
              </div>
            )}

          </div>

          {/* Checkout Payment Form (Right - 5 Cols) */}
          {summary && (
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm p-5 space-y-4 h-fit">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b pb-2 border-slate-100 dark:border-slate-800">
                Process Outstanding Settlement
              </h3>

              <form onSubmit={handleCheckoutSubmit} className="space-y-4 text-xs">
                
                {/* Input Discount */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Apply Cashier Discount (₹)</label>
                  <input
                    type="number"
                    min={0}
                    max={outstandingAmount + discount}
                    value={discount}
                    onChange={e => setDiscount(Number(e.target.value))}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg font-bold font-mono text-indigo-500"
                  />
                </div>

                {/* Selector Payment Mode */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-500 block">Payment Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'UPI', label: 'UPI QR Pay', icon: Landmark },
                      { id: 'Cash', label: 'Cash Drawer', icon: DollarSign },
                      { id: 'Card', label: 'POS Card Swiper', icon: CreditCard },
                      { id: 'Split', label: 'Split Payment', icon: Receipt }
                    ].map(mode => {
                      const Icon = mode.icon;
                      const isActive = paymentMethod === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setPaymentMethod(mode.id as any)}
                          className={`p-3 rounded-xl border flex items-center gap-2 font-bold text-left transition-all ${
                            isActive 
                              ? 'border-indigo-600 bg-indigo-50/20 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400' 
                              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{mode.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Split Details Input */}
                {paymentMethod === 'Split' && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border dark:border-slate-850 space-y-2 animate-in fade-in duration-200">
                    <p className="font-semibold text-slate-500 text-[10px] uppercase">Split Details Breakdowns</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-0.5">
                        <label className="text-[10px] text-slate-400">Cash Amt</label>
                        <input
                          type="number"
                          value={splitCash}
                          onChange={e => setSplitCash(Number(e.target.value))}
                          className="w-full p-1.5 border dark:border-slate-800 dark:bg-slate-900 rounded font-mono"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[10px] text-slate-400">Card Amt</label>
                        <input
                          type="number"
                          value={splitCard}
                          onChange={e => setSplitCard(Number(e.target.value))}
                          className="w-full p-1.5 border dark:border-slate-800 dark:bg-slate-900 rounded font-mono"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[10px] text-slate-400">UPI Amt</label>
                        <input
                          type="number"
                          value={splitUpi}
                          onChange={e => setSplitUpi(Number(e.target.value))}
                          className="w-full p-1.5 border dark:border-slate-800 dark:bg-slate-900 rounded font-mono"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold font-mono pt-1 text-indigo-500">
                      <span>Split Sum Total:</span>
                      <span>₹{splitCash + splitCard + splitUpi}</span>
                    </div>
                  </div>
                )}

                {/* Outstanding Summary banner */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded-xl text-center space-y-1 relative overflow-hidden">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Outstanding Settlement</span>
                  <span className="text-3xl font-black font-mono text-rose-600 dark:text-rose-400">
                    ₹{outstandingAmount.toLocaleString()}
                  </span>
                  <p className="text-[9px] text-slate-400 italic">Net charges minus advance deposits and discounts.</p>
                </div>

                {successAction && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 rounded-xl text-xs font-semibold flex items-center gap-1.5 animate-in slide-in-from-top-1">
                    <CheckCircle className="w-4 h-4 text-emerald-500" /> {successAction}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all text-xs"
                >
                  Confirm Checkout & Release Room
                </button>

              </form>
            </div>
          )}

        </div>
      )}

      {/* =========================================================================
          TAB 2: BILL & SETTLEMENT HISTORY TABLE
          ========================================================================= */}
      {activeBillingTab === 'history' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm space-y-1">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Settled Invoices</span>
              <p className="text-2xl font-black font-mono text-slate-900 dark:text-white">{historyStats.totalCount}</p>
              <span className="text-[10px] text-slate-400">Completed stays & folios</span>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm space-y-1">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Settled Value</span>
              <p className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">₹{historyStats.totalRevenue.toLocaleString()}</p>
              <span className="text-[10px] text-emerald-600 font-semibold">Realized room & folio sales</span>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm space-y-1">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Discounts Allowed</span>
              <p className="text-2xl font-black font-mono text-rose-500">₹{historyStats.totalDiscounts.toLocaleString()}</p>
              <span className="text-[10px] text-slate-400">Waived off at check-out</span>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm space-y-1">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Average Folio Size</span>
              <p className="text-2xl font-black font-mono text-slate-800 dark:text-slate-200">₹{historyStats.avgBill.toLocaleString()}</p>
              <span className="text-[10px] text-slate-400">Per settled invoice</span>
            </div>
          </div>

          {/* Search & Date Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              
              {/* Search input */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  placeholder="Search by Room #, Guest Name, Phone, Invoice #..."
                  className="w-full pl-9 pr-4 py-2 text-xs border dark:border-slate-800 dark:bg-slate-950 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Date Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all', label: 'All Time' },
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: '7days', label: 'Last 7 Days' },
                  { id: 'month', label: 'This Month' }
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyHistoryPreset(p.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      historyDatePreset === p.id 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Picker */}
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="date"
                  value={historyStartDate}
                  onChange={e => {
                    setHistoryStartDate(e.target.value);
                    setHistoryDatePreset('custom');
                  }}
                  className="p-1.5 px-2.5 border dark:border-slate-800 dark:bg-slate-950 rounded-xl font-bold font-mono text-slate-700 dark:text-slate-300"
                />
                <span className="text-slate-400 font-bold">-</span>
                <input
                  type="date"
                  value={historyEndDate}
                  onChange={e => {
                    setHistoryEndDate(e.target.value);
                    setHistoryDatePreset('custom');
                  }}
                  className="p-1.5 px-2.5 border dark:border-slate-800 dark:bg-slate-950 rounded-xl font-bold font-mono text-slate-700 dark:text-slate-300"
                />
              </div>

            </div>
          </div>

          {/* Settled Bills Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Settled Invoices & Guest Billing Records
                </h3>
                <p className="text-xs text-slate-400">
                  Showing {filteredBillHistory.length} completed room settlement records
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/60 text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Room & Category</th>
                    <th className="py-3 px-4">Guest Information</th>
                    <th className="py-3 px-4">Stay Duration</th>
                    <th className="py-3 px-4 text-right">Room Rent</th>
                    <th className="py-3 px-4 text-right">Discount</th>
                    <th className="py-3 px-4 text-right">Net Settled</th>
                    <th className="py-3 px-4 text-center">Payment Mode</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {filteredBillHistory.map((bill, idx) => (
                    <tr key={`${bill.invoiceNumber}_${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-colors">
                      
                      {/* Invoice # & Issue Date */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400 block">
                          {bill.invoiceNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {bill.dateOfIssue}
                        </span>
                      </td>

                      {/* Room & Category */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-bold font-mono text-slate-800 dark:text-slate-200">
                            Room {bill.roomNumber}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {bill.roomCategory}
                          </span>
                        </div>
                      </td>

                      {/* Guest Info */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800 dark:text-slate-200">{bill.guestName}</p>
                        {bill.guestPhone && (
                          <p className="text-[10px] text-slate-400 font-mono">{bill.guestPhone}</p>
                        )}
                      </td>

                      {/* Stay Duration */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        <span>{bill.checkInDate} → {bill.checkOutDate}</span>
                        <span className="block text-[10px] text-indigo-500 font-bold">({bill.stayDuration} Night{bill.stayDuration > 1 ? 's' : ''})</span>
                      </td>

                      {/* Room Rent */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                        ₹{bill.roomRentTotal.toLocaleString()}
                      </td>

                      {/* Discount */}
                      <td className="py-3.5 px-4 text-right font-mono text-rose-500 font-medium">
                        {bill.discount > 0 ? `-₹${bill.discount.toLocaleString()}` : '—'}
                      </td>

                      {/* Net Settled Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900 dark:text-white text-sm">
                        ₹{bill.netPayable.toLocaleString()}
                      </td>

                      {/* Payment Mode */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold font-mono text-[10px] rounded-lg border border-emerald-200/50 dark:border-emerald-800/40 uppercase">
                          {bill.paymentMethod}
                        </span>
                      </td>

                      {/* Action: View / Re-Print Tax Invoice */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenHistoricalInvoice(bill)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-600 dark:hover:text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 mx-auto transition-all shadow-sm"
                          title="View & Re-Print A4 / Thermal Tax Invoice"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Re-Print</span>
                        </button>
                      </td>

                    </tr>
                  ))}

                  {filteredBillHistory.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-400">
                        <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="font-bold">No bill history found</p>
                        <p className="text-[10px]">No settled room folios match your search query or date range.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* =========================================================================
          UNIFIED INVOICE PRINT DIALOG (A4 & THERMAL ENGINE FOR LIVE & HISTORY)
          ========================================================================= */}
      {showPrintModal && activePrintInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-4xl space-y-4 my-auto">
            
            {/* Top Control Bar (Hidden during printing) */}
            <div className="no-print bg-slate-900/90 text-white p-3 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 border border-slate-700/60 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-600 rounded-lg">
                  <Printer className="w-4 h-4 text-white" />
                </span>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">Invoice Print Preview</h4>
                  <p className="text-[10px] text-slate-400">Invoice: {activePrintInvoice.invoiceNumber} • Room {activePrintInvoice.roomNumber}</p>
                </div>
              </div>

              {/* Format Toggle & Action Buttons */}
              <div className="flex items-center gap-2">
                <div className="bg-slate-800 p-0.5 rounded-lg border border-slate-700 flex text-xs">
                  <button
                    type="button"
                    onClick={() => setPrintFormat('a4')}
                    className={`px-3 py-1 rounded-md font-bold text-[11px] transition-all ${
                      printFormat === 'a4' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    📄 Standard A4 Size
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintFormat('thermal')}
                    className={`px-3 py-1 rounded-md font-bold text-[11px] transition-all ${
                      printFormat === 'thermal' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🧾 80mm Thermal Slip
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / Save as PDF
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowPrintModal(false);
                    setActivePrintInvoice(null);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs border border-slate-700 transition-all"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* =========================================================================
                A4 SIZE TAX INVOICE SHEET (Standard 210mm x 297mm)
                ========================================================================= */}
            {printFormat === 'a4' ? (
              <div 
                id="printable-invoice-a4" 
                className="bg-white text-slate-900 w-full max-w-[210mm] mx-auto p-8 sm:p-10 rounded-xl shadow-2xl border border-slate-200 space-y-6 font-sans text-xs leading-normal"
              >
                {/* 1. Header: Property Info & Tax Invoice Title */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
                  <div className="space-y-1 max-w-[60%]">
                    <h1 className="text-xl font-black tracking-tight text-slate-950 uppercase">
                      {settings.name || 'HotelVista Luxury Suites & Resorts'}
                    </h1>
                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                      {settings.address || 'Beach Road, Hospitality Enclave, Coastal Zone'}
                    </p>
                    <div className="flex flex-wrap gap-x-4 text-[10px] text-slate-500 font-medium pt-1">
                      <span><strong>Phone:</strong> {settings.phone || '+91 98765 43210'}</span>
                      <span><strong>Email:</strong> {settings.email || 'billing@hotelvista.com'}</span>
                    </div>
                    <div className="text-[10px] text-slate-800 font-mono font-bold pt-0.5">
                      GSTIN: {settings.gstNumber || '29AAAAA0000A1Z5'} • State Code: 29
                    </div>
                  </div>

                  {/* Invoice Meta Box */}
                  <div className="text-right space-y-1">
                    <div className="bg-slate-950 text-white px-3 py-1 rounded inline-block text-xs font-black uppercase tracking-wider">
                      TAX INVOICE / GUEST FOLIO
                    </div>
                    <p className="font-mono font-bold text-sm text-slate-900 pt-1">
                      Invoice No: {activePrintInvoice.invoiceNumber}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Date of Issue: {activePrintInvoice.dateOfIssue}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      SAC Code: 996311 (Hotel) / 996331 (F&B)
                    </p>
                  </div>
                </div>

                {/* 2. Guest Info & Stay Summary Cards (2 Columns) */}
                <div className="grid grid-cols-2 gap-4 border border-slate-300 rounded-lg p-3.5 bg-slate-50/60 text-xs">
                  {/* Left: Guest Details */}
                  <div className="space-y-1 pr-2 border-r border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Billed To (Guest Details)</p>
                    <p className="text-sm font-bold text-slate-950">{activePrintInvoice.guestName}</p>
                    <p className="text-slate-600 font-mono text-[11px]">Phone: {activePrintInvoice.guestPhone || 'Not provided'}</p>
                    {activePrintInvoice.guestEmail && <p className="text-slate-600 text-[10px]">Email: {activePrintInvoice.guestEmail}</p>}
                    {activePrintInvoice.guestAddress && <p className="text-slate-600 text-[10px]">Address: {activePrintInvoice.guestAddress}</p>}
                    {activePrintInvoice.guestIdProof && (
                      <p className="text-[10px] text-slate-500 font-mono">ID Proof: {activePrintInvoice.guestIdProof}</p>
                    )}
                    {activePrintInvoice.gstNumber && (
                      <p className="text-[10px] font-bold text-indigo-700 font-mono">Corporate GSTIN: {activePrintInvoice.gstNumber}</p>
                    )}
                  </div>

                  {/* Right: Stay Details */}
                  <div className="space-y-1 pl-2 font-mono text-[11px]">
                    <p className="text-[10px] font-bold text-slate-400 font-sans uppercase tracking-wider">Stay & Room Details</p>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Room Number:</span>
                      <strong className="text-slate-900 text-xs font-sans">Room {activePrintInvoice.roomNumber} ({activePrintInvoice.roomCategory})</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Check-In:</span>
                      <span className="font-semibold text-slate-800">{activePrintInvoice.checkInDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Check-Out:</span>
                      <span className="font-semibold text-slate-800">{activePrintInvoice.checkOutDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Duration:</span>
                      <span className="font-bold text-indigo-700">{activePrintInvoice.stayDuration} Night(s)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payment Mode:</span>
                      <span className="font-bold uppercase text-slate-900 font-sans">{activePrintInvoice.paymentMethod}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Itemized Departmental Charges Table */}
                <div className="space-y-2">
                  <table className="w-full border-collapse border border-slate-300 text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                        <th className="p-2 text-center w-10 border-r border-slate-300">#</th>
                        <th className="p-2 text-left border-r border-slate-300">Description & Department</th>
                        <th className="p-2 text-center w-20 border-r border-slate-300">SAC/HSN</th>
                        <th className="p-2 text-center w-16 border-r border-slate-300">Qty/Nights</th>
                        <th className="p-2 text-right w-24 border-r border-slate-300 font-mono">Rate (₹)</th>
                        <th className="p-2 text-right w-28 font-mono">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      
                      {/* Row 1: Room Rent */}
                      <tr>
                        <td className="p-2 text-center text-slate-400 border-r border-slate-200">1</td>
                        <td className="p-2 border-r border-slate-200">
                          <p className="font-bold text-slate-900">Room Accommodation Charges</p>
                          <p className="text-[10px] text-slate-500">Room {activePrintInvoice.roomNumber} ({activePrintInvoice.roomCategory}) • {activePrintInvoice.stayDuration} Night Stay</p>
                        </td>
                        <td className="p-2 text-center font-mono text-slate-500 border-r border-slate-200">996311</td>
                        <td className="p-2 text-center font-mono border-r border-slate-200">{activePrintInvoice.stayDuration}</td>
                        <td className="p-2 text-right font-mono border-r border-slate-200">₹{(activePrintInvoice.roomPrice || 0).toLocaleString()}</td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900">₹{activePrintInvoice.roomRentTotal.toLocaleString()}</td>
                      </tr>

                      {/* Row 2: Restaurant Orders */}
                      {activePrintInvoice.restaurantTotal > 0 && (
                        <tr>
                          <td className="p-2 text-center text-slate-400 border-r border-slate-200">2</td>
                          <td className="p-2 border-r border-slate-200">
                            <p className="font-bold text-slate-900">Restaurant & In-Room Dining (F&B)</p>
                            {activePrintInvoice.ordersList && (
                              <div className="text-[10px] text-slate-500 space-y-0.5 pt-0.5">
                                {activePrintInvoice.ordersList.filter(o => !o.isBar).map((o, i) => (
                                  <div key={i}>
                                    <span>{o.orderNumber}: {o.items}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-center font-mono text-slate-500 border-r border-slate-200">996331</td>
                          <td className="p-2 text-center font-mono border-r border-slate-200">1</td>
                          <td className="p-2 text-right font-mono border-r border-slate-200 text-slate-400">—</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">₹{activePrintInvoice.restaurantTotal.toLocaleString()}</td>
                        </tr>
                      )}

                      {/* Row 3: Bar Orders */}
                      {activePrintInvoice.barTotal > 0 && (
                        <tr>
                          <td className="p-2 text-center text-slate-400 border-r border-slate-200">3</td>
                          <td className="p-2 border-r border-slate-200">
                            <p className="font-bold text-slate-900">Bar & Lounge Beverage Orders</p>
                            {activePrintInvoice.ordersList && (
                              <div className="text-[10px] text-slate-500 space-y-0.5 pt-0.5">
                                {activePrintInvoice.ordersList.filter(o => o.isBar).map((o, i) => (
                                  <div key={i}>
                                    <span>{o.orderNumber}: {o.items}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-center font-mono text-slate-500 border-r border-slate-200">996331</td>
                          <td className="p-2 text-center font-mono border-r border-slate-200">1</td>
                          <td className="p-2 text-right font-mono border-r border-slate-200 text-slate-400">—</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">₹{activePrintInvoice.barTotal.toLocaleString()}</td>
                        </tr>
                      )}

                      {/* Row 4: Laundry Orders */}
                      {activePrintInvoice.laundryTotal > 0 && (
                        <tr>
                          <td className="p-2 text-center text-slate-400 border-r border-slate-200">4</td>
                          <td className="p-2 border-r border-slate-200">
                            <p className="font-bold text-slate-900">Laundry & Dry Cleaning Services</p>
                            {activePrintInvoice.laundryList && (
                              <p className="text-[10px] text-slate-500">
                                {activePrintInvoice.laundryList.map(l => `${l.orderNumber} (${l.items})`).join(' • ')}
                              </p>
                            )}
                          </td>
                          <td className="p-2 text-center font-mono text-slate-500 border-r border-slate-200">999799</td>
                          <td className="p-2 text-center font-mono border-r border-slate-200">1</td>
                          <td className="p-2 text-right font-mono border-r border-slate-200 text-slate-400">—</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">₹{activePrintInvoice.laundryTotal.toLocaleString()}</td>
                        </tr>
                      )}

                      {/* Row 5: Hall Bookings */}
                      {activePrintInvoice.hallTotal > 0 && (
                        <tr>
                          <td className="p-2 text-center text-slate-400 border-r border-slate-200">5</td>
                          <td className="p-2 border-r border-slate-200">
                            <p className="font-bold text-slate-900">Banquet & Party Hall Bookings</p>
                            {activePrintInvoice.hallList && (
                              <p className="text-[10px] text-slate-500">
                                {activePrintInvoice.hallList.map(h => `${h.bookingNumber} (${h.hallType} on ${h.date})`).join(' • ')}
                              </p>
                            )}
                          </td>
                          <td className="p-2 text-center font-mono text-slate-500 border-r border-slate-200">997212</td>
                          <td className="p-2 text-center font-mono border-r border-slate-200">1</td>
                          <td className="p-2 text-right font-mono border-r border-slate-200 text-slate-400">—</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">₹{activePrintInvoice.hallTotal.toLocaleString()}</td>
                        </tr>
                      )}

                      {/* Row 6: Misc */}
                      {activePrintInvoice.otherCharges > 0 && (
                        <tr>
                          <td className="p-2 text-center text-slate-400 border-r border-slate-200">6</td>
                          <td className="p-2 border-r border-slate-200">
                            <p className="font-bold text-slate-900">Mini-Bar / Miscellaneous Services</p>
                          </td>
                          <td className="p-2 text-center font-mono text-slate-500 border-r border-slate-200">999799</td>
                          <td className="p-2 text-center font-mono border-r border-slate-200">1</td>
                          <td className="p-2 text-right font-mono border-r border-slate-200">₹{activePrintInvoice.otherCharges}</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">₹{activePrintInvoice.otherCharges}</td>
                        </tr>
                      )}

                    </tbody>
                  </table>
                </div>

                {/* 4. Financial Calculations & Bank / Tax Breakdown Grid */}
                <div className="grid grid-cols-12 gap-6 pt-2">
                  
                  {/* Left Column (7 Cols): Amount in Words, Bank Info, Terms */}
                  <div className="col-span-7 space-y-3">
                    
                    {/* Amount in words */}
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Settlement in Words:</p>
                      <p className="font-bold text-slate-900 text-xs italic mt-0.5">
                        {numberToWords(Math.round(activePrintInvoice.netPayable))}
                      </p>
                    </div>

                    {/* Payment Mode & Settlement Stamp */}
                    <div className="flex items-center gap-3 p-2.5 border border-emerald-300 bg-emerald-50/50 rounded-lg">
                      <div className="p-1 bg-emerald-500 text-white rounded font-bold text-[10px]">
                        ✓ SETTLED
                      </div>
                      <div className="text-[11px] font-mono">
                        <span>Payment Method: <strong>{activePrintInvoice.paymentMethod}</strong></span>
                        {activePrintInvoice.splitDetails && (
                          <p className="text-[10px] text-slate-500">{activePrintInvoice.splitDetails}</p>
                        )}
                      </div>
                    </div>

                    {/* Terms & Conditions */}
                    <div className="text-[9px] text-slate-500 space-y-0.5">
                      <p className="font-bold text-slate-700 uppercase">Terms & Conditions:</p>
                      <p>1. Check-out time is 11:00 AM. Late check-out is subject to room availability and extra charges.</p>
                      <p>2. Goods once sold or services rendered will not be refunded.</p>
                      <p>3. This invoice is computer generated and valid for all GST input tax credit purposes.</p>
                    </div>
                  </div>

                  {/* Right Column (5 Cols): Math Breakdown & Tax Ledger */}
                  <div className="col-span-5 border border-slate-300 rounded-lg p-3 bg-slate-50/40 space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal (Taxable Value):</span>
                      <span className="font-bold text-slate-900">₹{activePrintInvoice.subtotal.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>CGST @ {(activePrintInvoice.taxRate / 2).toFixed(1)}%:</span>
                      <span>₹{(activePrintInvoice.taxAmount / 2).toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>SGST @ {(activePrintInvoice.taxRate / 2).toFixed(1)}%:</span>
                      <span>₹{(activePrintInvoice.taxAmount / 2).toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-slate-900 border-t border-slate-200 pt-1 font-bold">
                      <span>Total Amount (Incl. GST):</span>
                      <span className="font-bold text-slate-900">₹{activePrintInvoice.grandTotal.toLocaleString()}</span>
                    </div>

                    {activePrintInvoice.advancePaid > 0 && (
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>Less Advance Paid:</span>
                        <span>-₹{activePrintInvoice.advancePaid.toLocaleString()}</span>
                      </div>
                    )}

                    {activePrintInvoice.discount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>Less Discount:</span>
                        <span>-₹{activePrintInvoice.discount.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="border-t-2 border-slate-900 my-1 pt-1.5 flex justify-between items-center text-sm font-black text-slate-950">
                      <span className="font-sans">NET PAYABLE:</span>
                      <span className="text-base text-indigo-900">₹{activePrintInvoice.netPayable.toLocaleString()}</span>
                    </div>
                  </div>

                </div>

                {/* 5. Signatures Block */}
                <div className="pt-8 grid grid-cols-2 gap-12 text-center text-xs">
                  <div className="border-t border-slate-400 pt-1.5">
                    <p className="font-bold text-slate-800">Guest Signature</p>
                    <p className="text-[10px] text-slate-400">Acknowledged receipt of services</p>
                  </div>
                  <div className="border-t border-slate-400 pt-1.5">
                    <p className="font-bold text-slate-800">Authorized Signatory</p>
                    <p className="text-[10px] text-slate-400">For {settings.name || 'HotelVista'}</p>
                  </div>
                </div>

                {/* Footer Greeting */}
                <div className="text-center text-[10px] text-slate-400 italic pt-2 border-t border-slate-200">
                  Thank you for staying with us! We look forward to welcoming you back soon.
                </div>

              </div>
            ) : (
              /* =========================================================================
                  80MM THERMAL SLIP VIEW (For POS Printers)
                  ========================================================================= */
              <div 
                id="printable-invoice-a4" 
                className="bg-white text-slate-900 w-full max-w-sm mx-auto rounded-lg shadow-2xl p-5 border border-slate-200 space-y-4 receipt-print font-mono text-xs"
              >
                <div className="text-center border-b border-dashed border-slate-400 pb-3 space-y-0.5">
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">{settings.name || 'HotelVista'}</h3>
                  <p className="text-[9px] text-slate-500">{settings.address}</p>
                  <p className="text-[9px] text-slate-500">Phone: {settings.phone}</p>
                  <p className="text-[9px] text-slate-500 font-bold">GSTIN: {settings.gstNumber}</p>
                  <p className="text-[10px] font-bold mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded">
                    Invoice: {activePrintInvoice.invoiceNumber}
                  </p>
                </div>

                <div className="text-[9px] space-y-0.5 border-b border-dashed border-slate-400 pb-2">
                  <div className="flex justify-between"><span>Guest:</span><strong className="font-bold">{activePrintInvoice.guestName}</strong></div>
                  <div className="flex justify-between"><span>Room:</span><strong>Room {activePrintInvoice.roomNumber} ({activePrintInvoice.roomCategory})</strong></div>
                  <div className="flex justify-between"><span>Stay:</span><span>{activePrintInvoice.checkInDate} to {activePrintInvoice.checkOutDate} ({activePrintInvoice.stayDuration}N)</span></div>
                </div>

                <div className="border-b border-dashed border-slate-400 py-2 text-[9px] space-y-1.5">
                  <div className="flex justify-between">
                    <span>ROOM RENT ({activePrintInvoice.stayDuration}N @ ₹{activePrintInvoice.roomPrice})</span>
                    <span className="font-bold">₹{activePrintInvoice.roomRentTotal}</span>
                  </div>
                  {activePrintInvoice.restaurantTotal > 0 && (
                    <div className="flex justify-between"><span>RESTAURANT (F&B)</span><span className="font-bold">₹{activePrintInvoice.restaurantTotal}</span></div>
                  )}
                  {activePrintInvoice.barTotal > 0 && (
                    <div className="flex justify-between"><span>BAR BEVERAGES</span><span className="font-bold">₹{activePrintInvoice.barTotal}</span></div>
                  )}
                  {activePrintInvoice.laundryTotal > 0 && (
                    <div className="flex justify-between"><span>LAUNDRY</span><span className="font-bold">₹{activePrintInvoice.laundryTotal}</span></div>
                  )}
                  {activePrintInvoice.hallTotal > 0 && (
                    <div className="flex justify-between"><span>HALL / BANQUET</span><span className="font-bold">₹{activePrintInvoice.hallTotal}</span></div>
                  )}
                </div>

                <div className="text-[9px] space-y-1">
                  <div className="flex justify-between"><span>TAXABLE VALUE</span><span>₹{activePrintInvoice.subtotal}</span></div>
                  <div className="flex justify-between text-slate-500"><span>GST ({activePrintInvoice.taxRate}% INCL.)</span><span>₹{activePrintInvoice.taxAmount}</span></div>
                  <div className="flex justify-between font-bold border-t border-slate-200 pt-0.5"><span>GROSS TOTAL</span><span>₹{activePrintInvoice.grandTotal}</span></div>
                  {activePrintInvoice.advancePaid > 0 && <div className="flex justify-between text-emerald-600"><span>Pre-Paid Advance</span><span>-₹{activePrintInvoice.advancePaid}</span></div>}
                  {activePrintInvoice.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-₹{activePrintInvoice.discount}</span></div>}
                  <div className="flex justify-between font-extrabold text-sm border-t border-dashed border-slate-400 pt-1 text-slate-950">
                    <span>TOTAL SETTLED</span>
                    <span>₹{activePrintInvoice.netPayable}</span>
                  </div>
                </div>

                <div className="text-center text-[9px] text-slate-500 italic border-t border-slate-200 pt-2">
                  Thank you for visiting!
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
