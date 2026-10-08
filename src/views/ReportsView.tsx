import React, { useState, useMemo } from 'react';
import { useApp, ROOM_CATEGORIES } from '../context/AppContext';
import { 
  BarChart3, 
  FileSpreadsheet, 
  TrendingUp, 
  DollarSign, 
  PieChart, 
  Landmark, 
  Calendar, 
  Download, 
  Filter, 
  ShoppingBag, 
  Package, 
  AlertCircle,
  RefreshCw,
  Layers,
  Building2,
  CheckCircle2,
  BedDouble,
  Users
} from 'lucide-react';

import { 
  getLocalTodayString, 
  getMonthStartString, 
  isDateInRange, 
  isStayInRange 
} from '../utils/dateUtils';
import { PnLStatementReport } from '../components/PnLStatementReport';

export const ReportsView: React.FC = () => {
  const { 
    rooms, 
    orders, 
    laundryOrders, 
    hallBookings, 
    purchaseLogs, 
    expenses,
    inventory, 
    preBookings, 
    auditLogs, 
    getBillSummary, 
    settings,
    refreshData,
    currentTenant,
    activeTenantId,
    tenantId
  } = useApp();

  const effectiveTenantId = currentTenant?.id || tenantId || activeTenantId;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Active Sub Tab (persisted on reload, default to pnl)
  const [activeReportTab, setActiveReportTab] = useState<
    'pnl' | 'sales' | 'transactions' | 'occupancy' | 'gst' | 'stock' | 'outstanding'
  >(() => {
    const saved = localStorage.getItem('hotelvista_reports_subtab');
    return (saved as any) || 'pnl';
  });

  React.useEffect(() => {
    localStorage.setItem('hotelvista_reports_subtab', activeReportTab);
  }, [activeReportTab]);

  // Date Range State
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'yesterday' | '7days' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Handle Preset selection
  const applyDatePreset = (preset: 'all' | 'today' | 'yesterday' | '7days' | 'month' | 'custom') => {
    setDatePreset(preset);
    const todayStr = getLocalTodayString();

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const yStr = getLocalTodayString(-1);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === '7days') {
      const d7Str = getLocalTodayString(-6);
      setStartDate(d7Str);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const mStart = getMonthStartString();
      setStartDate(mStart);
      setEndDate(todayStr);
    }
  };

  // Live Refresh Handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Tenant Isolated & Date Filtered Datasets
  const tenantOrders = useMemo(() => {
    return orders.filter(o => !effectiveTenantId || !o.tenantId || o.tenantId === effectiveTenantId);
  }, [orders, effectiveTenantId]);

  const filteredOrders = useMemo(() => {
    return tenantOrders.filter(o => isDateInRange(o.timestamp, startDate, endDate));
  }, [tenantOrders, startDate, endDate]);

  const tenantLaundry = useMemo(() => {
    return laundryOrders.filter(l => !effectiveTenantId || !l.tenantId || l.tenantId === effectiveTenantId);
  }, [laundryOrders, effectiveTenantId]);

  const filteredLaundry = useMemo(() => {
    return tenantLaundry.filter(l => isDateInRange(l.timestamp, startDate, endDate));
  }, [tenantLaundry, startDate, endDate]);

  const tenantHall = useMemo(() => {
    return hallBookings.filter(h => !effectiveTenantId || !h.tenantId || h.tenantId === effectiveTenantId);
  }, [hallBookings, effectiveTenantId]);

  const filteredHall = useMemo(() => {
    return tenantHall.filter(h => isDateInRange(h.date, startDate, endDate));
  }, [tenantHall, startDate, endDate]);

  const tenantPurchases = useMemo(() => {
    return purchaseLogs.filter(p => !effectiveTenantId || !p.tenantId || p.tenantId === effectiveTenantId);
  }, [purchaseLogs, effectiveTenantId]);

  const filteredPurchases = useMemo(() => {
    return tenantPurchases.filter(p => isDateInRange(p.date, startDate, endDate));
  }, [tenantPurchases, startDate, endDate]);

  const tenantExpenses = useMemo(() => {
    return (expenses || []).filter(e => !effectiveTenantId || !e.tenantId || e.tenantId === effectiveTenantId);
  }, [expenses, effectiveTenantId]);

  const filteredExpenses = useMemo(() => {
    return tenantExpenses.filter(e => isDateInRange(e.date, startDate, endDate));
  }, [tenantExpenses, startDate, endDate]);

  const tenantPreBookings = useMemo(() => {
    return (preBookings || []).filter(pb => !effectiveTenantId || !pb.tenantId || pb.tenantId === effectiveTenantId);
  }, [preBookings, effectiveTenantId]);

  const filteredPreBookings = useMemo(() => {
    return tenantPreBookings.filter(pb => isDateInRange(pb.checkOutDate || pb.checkInDate || pb.bookingDate, startDate, endDate));
  }, [tenantPreBookings, startDate, endDate]);

  const tenantRooms = useMemo(() => {
    return rooms.filter(r => !effectiveTenantId || !r.tenantId || r.tenantId === effectiveTenantId);
  }, [rooms, effectiveTenantId]);

  const tenantAuditLogs = useMemo(() => {
    return (auditLogs || []).filter(a => !effectiveTenantId || !a.tenantId || a.tenantId === effectiveTenantId);
  }, [auditLogs, effectiveTenantId]);

  const filteredAuditLogs = useMemo(() => {
    return tenantAuditLogs.filter(a => isDateInRange(a.timestamp, startDate, endDate));
  }, [tenantAuditLogs, startDate, endDate]);

  const filteredRooms = useMemo(() => {
    return tenantRooms.filter(r => {
      // If room has stay dates, filter by stay in range
      if (r.checkInDate) {
        return isStayInRange(r.checkInDate, r.checkOutDate, startDate, endDate);
      }
      return !startDate && !endDate; // If no stay dates, only show in all-time view
    });
  }, [tenantRooms, startDate, endDate]);

  // Calculations for Reports
  // 1. Departmental sales (date filtered & strictly tenant matched)
  const roomRev = useMemo(() => {
    let rev = 0;
    // 1. In-House occupied rooms
    filteredRooms.forEach(r => {
      if (r.status === 'Occupied' || (r.checkInDate && r.guestName)) {
        const bill = getBillSummary(r.roomNumber);
        rev += bill ? bill.roomRentTotal : (r.price || 0);
      } else if (r.advancePaid && r.advancePaid > 0) {
        rev += r.advancePaid;
      }
    });

    // 2. Completed / Checked-Out Stays & Pre-Bookings
    filteredPreBookings.forEach(pb => {
      if (pb.status === 'CheckedOut') {
        let stayDays = 1;
        if (pb.checkInDate && pb.checkOutDate) {
          const s = new Date(pb.checkInDate).getTime();
          const e = new Date(pb.checkOutDate).getTime();
          stayDays = Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)));
        }
        const matchedRoom = tenantRooms.find(r => r.roomNumber === pb.roomNumber || r.category === pb.roomCategory);
        const roomPrice = matchedRoom ? matchedRoom.price : 2000;
        const rent = (pb as any).roomRentTotal || ((pb as any).totalAmount ? (pb as any).totalAmount : (stayDays * roomPrice));
        rev += rent;
      } else if (pb.status === 'Confirmed' || pb.status === 'Pending') {
        if (pb.advancePaid > 0 && !filteredRooms.some(r => r.guestPhone === pb.phone && (r.status === 'Occupied' || r.guestName))) {
          rev += pb.advancePaid;
        }
      }
    });

    // 3. Fallback: Parse check-out audit logs for past checkouts
    filteredAuditLogs.forEach(a => {
      if (a.action === 'Check-Out') {
        const matchRoom = a.details?.match(/Room\s+([A-Za-z0-9_-]+)/i);
        const roomNo = matchRoom ? matchRoom[1] : '';
        const alreadyInPre = filteredPreBookings.some(pb => pb.status === 'CheckedOut' && pb.roomNumber === roomNo);
        if (!alreadyInPre) {
          const matchRent = a.details?.match(/Room Rent:\s*₹?([0-9]+(?:\.[0-9]+)?)/i);
          const matchTotal = a.details?.match(/Total Folio:\s*₹?([0-9]+(?:\.[0-9]+)?)/i) || a.details?.match(/Total Bill:\s*₹?([0-9]+(?:\.[0-9]+)?)/i);
          const matchPrice = matchRent ? parseFloat(matchRent[1]) : (matchTotal ? parseFloat(matchTotal[1]) : 0);
          if (matchPrice > 0) {
            rev += matchPrice;
          } else {
            const matchedRoom = tenantRooms.find(r => r.roomNumber === roomNo);
            if (matchedRoom) rev += (matchedRoom.price || 0);
          }
        }
      }
    });

    return rev;
  }, [filteredRooms, filteredPreBookings, filteredAuditLogs, tenantRooms, getBillSummary]);

  const restSales = useMemo(() => filteredOrders.filter(o => !o.isBar).reduce((acc, o) => acc + o.total, 0), [filteredOrders]);
  const barSales = useMemo(() => filteredOrders.filter(o => o.isBar).reduce((acc, o) => acc + o.total, 0), [filteredOrders]);
  const laundrySales = useMemo(() => filteredLaundry.reduce((acc, o) => acc + o.totalPrice, 0), [filteredLaundry]);
  const hallSales = useMemo(() => filteredHall.filter(o => o.status !== 'Cancelled').reduce((acc, o) => acc + o.totalPrice, 0), [filteredHall]);
  const purchaseExpenses = useMemo(() => filteredPurchases.reduce((acc, p) => acc + p.totalAmount, 0), [filteredPurchases]);
  const operationalExpenses = useMemo(() => filteredExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0), [filteredExpenses]);

  const totalDiscounts = useMemo(() => {
    let sum = 0;
    filteredAuditLogs.forEach(a => {
      if (a.action === 'Check-Out' || a.details?.includes('Discount:')) {
        const match = a.details?.match(/Discount:\s*₹?([0-9]+(?:\.[0-9]+)?)/i);
        if (match && match[1]) {
          sum += parseFloat(match[1]);
        }
      }
    });
    return sum;
  }, [filteredAuditLogs]);

  const grossSales = roomRev + restSales + barSales + laundrySales + hallSales;
  const netSales = Math.max(0, grossSales - totalDiscounts);
  const totalSales = netSales;
  const totalOutflow = purchaseExpenses + operationalExpenses;
  const netOperatingIncome = totalSales - totalOutflow;

  // GST calculations
  const generalTaxRate = settings?.taxRate || 18;
  const barTaxRate = settings?.barTaxRate || 20;

  const generalTaxableBase = roomRev + restSales + laundrySales + hallSales;
  const generalGstTax = (generalTaxableBase * generalTaxRate) / 100;
  const barVatTax = (barSales * barTaxRate) / 100;
  const totalTax = generalGstTax + barVatTax;

  // Outstanding bills list
  const outstandingList = useMemo(() => {
    return tenantRooms
      .filter(r => r.status === 'Occupied')
      .map(r => {
        const summary = getBillSummary(r.roomNumber);
        return {
          roomNumber: r.roomNumber,
          guestName: r.guestName || 'In-House Guest',
          phone: r.guestPhone || 'N/A',
          checkInDate: r.checkInDate || 'N/A',
          roomCategory: r.category,
          roomCharges: summary ? summary.roomRentTotal : r.price,
          advancePaid: r.advancePaid || 0,
          pendingAmount: summary ? summary.pendingAmount : (r.price - (r.advancePaid || 0))
        };
      })
      .filter(o => o.pendingAmount > 0);
  }, [tenantRooms, getBillSummary]);

  // Detailed Room Category Booking & Occupancy Summary
  const roomCategorySummary = useMemo(() => {
    const categoriesSet = new Set<string>(ROOM_CATEGORIES);
    tenantRooms.forEach(r => { if (r.category) categoriesSet.add(r.category); });
    tenantPreBookings.forEach(pb => { if (pb.roomCategory) categoriesSet.add(pb.roomCategory); });

    const categories = Array.from(categoriesSet);

    const statsMap: Record<string, {
      category: string;
      totalInventory: number;
      inHouseOccupied: number;
      vacantRooms: number;
      totalBookings: number;
      nightsSold: number;
      totalRevenue: number;
      adr: number;
      occupancyRate: number;
    }> = {};

    categories.forEach(cat => {
      const catRooms = tenantRooms.filter(r => r.category === cat);
      const catOccupied = filteredRooms.filter(r => r.category === cat && (r.status === 'Occupied' || (r.checkInDate && r.guestName))).length;
      statsMap[cat] = {
        category: cat,
        totalInventory: catRooms.length,
        inHouseOccupied: catOccupied,
        vacantRooms: Math.max(0, catRooms.length - catOccupied),
        totalBookings: 0,
        nightsSold: 0,
        totalRevenue: 0,
        adr: 0,
        occupancyRate: catRooms.length > 0 ? Math.round((catOccupied / catRooms.length) * 100) : 0
      };
    });

    // 1. In-house occupied rooms
    filteredRooms.forEach(r => {
      if (r.status === 'Occupied' || (r.checkInDate && r.guestName)) {
        const cat = r.category || 'Standard';
        if (!statsMap[cat]) {
          statsMap[cat] = { category: cat, totalInventory: 0, inHouseOccupied: 1, vacantRooms: 0, totalBookings: 0, nightsSold: 0, totalRevenue: 0, adr: 0, occupancyRate: 0 };
        }
        const bill = getBillSummary(r.roomNumber);
        const stayNights = bill?.stayDuration || 1;
        const rent = bill ? bill.roomRentTotal : (r.price || 0);
        
        statsMap[cat].totalBookings += 1;
        statsMap[cat].nightsSold += stayNights;
        statsMap[cat].totalRevenue += rent;
      }
    });

    // 2. Pre-Bookings & Completed Checkouts
    filteredPreBookings.forEach(pb => {
      let cat = pb.roomCategory;
      if (!cat && pb.roomNumber) {
        const rm = tenantRooms.find(r => r.roomNumber === pb.roomNumber);
        if (rm) cat = rm.category;
      }
      cat = cat || 'Standard';
      if (!statsMap[cat]) {
        statsMap[cat] = { category: cat, totalInventory: 0, inHouseOccupied: 0, vacantRooms: 0, totalBookings: 0, nightsSold: 0, totalRevenue: 0, adr: 0, occupancyRate: 0 };
      }

      if (pb.status === 'CheckedOut') {
        let stayDays = 1;
        if (pb.checkInDate && pb.checkOutDate) {
          const s = new Date(pb.checkInDate).getTime();
          const e = new Date(pb.checkOutDate).getTime();
          stayDays = Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)));
        }
        const matchedRoom = tenantRooms.find(r => r.roomNumber === pb.roomNumber || r.category === pb.roomCategory);
        const roomPrice = matchedRoom ? matchedRoom.price : 2000;
        const rent = (pb as any).roomRentTotal || ((pb as any).totalAmount ? (pb as any).totalAmount : (stayDays * roomPrice));

        statsMap[cat].totalBookings += 1;
        statsMap[cat].nightsSold += stayDays;
        statsMap[cat].totalRevenue += rent;
      } else if (pb.status === 'Confirmed' || pb.status === 'Pending') {
        let stayDays = 1;
        if (pb.checkInDate && pb.checkOutDate) {
          const s = new Date(pb.checkInDate).getTime();
          const e = new Date(pb.checkOutDate).getTime();
          stayDays = Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)));
        }
        const isAlreadyOccupied = filteredRooms.some(r => r.guestPhone === pb.phone && (r.status === 'Occupied' || r.guestName));
        if (!isAlreadyOccupied) {
          statsMap[cat].totalBookings += 1;
          statsMap[cat].nightsSold += stayDays;
          if (pb.advancePaid > 0) {
            statsMap[cat].totalRevenue += pb.advancePaid;
          }
        }
      }
    });

    // 3. Fallback audit logs for checkouts
    filteredAuditLogs.forEach(a => {
      if (a.action === 'Check-Out') {
        const matchRoom = a.details?.match(/Room\s+([A-Za-z0-9_-]+)/i);
        const roomNo = matchRoom ? matchRoom[1] : '';
        const matchedRoom = tenantRooms.find(r => r.roomNumber === roomNo);
        const cat = matchedRoom?.category || 'Standard';
        
        const alreadyInPre = filteredPreBookings.some(pb => pb.status === 'CheckedOut' && pb.roomNumber === roomNo);
        if (!alreadyInPre) {
          if (!statsMap[cat]) {
            statsMap[cat] = { category: cat, totalInventory: 0, inHouseOccupied: 0, vacantRooms: 0, totalBookings: 0, nightsSold: 0, totalRevenue: 0, adr: 0, occupancyRate: 0 };
          }
          const matchRent = a.details?.match(/Room Rent:\s*₹?([0-9]+(?:\.[0-9]+)?)/i);
          const matchTotal = a.details?.match(/Total Folio:\s*₹?([0-9]+(?:\.[0-9]+)?)/i) || a.details?.match(/Total Bill:\s*₹?([0-9]+(?:\.[0-9]+)?)/i);
          const matchPrice = matchRent ? parseFloat(matchRent[1]) : (matchTotal ? parseFloat(matchTotal[1]) : (matchedRoom?.price || 0));
          
          statsMap[cat].totalBookings += 1;
          statsMap[cat].nightsSold += 1;
          statsMap[cat].totalRevenue += matchPrice;
        }
      }
    });

    // Calculate ADR & format
    return Object.values(statsMap).map(s => ({
      ...s,
      adr: s.nightsSold > 0 ? Math.round(s.totalRevenue / s.nightsSold) : 0
    }));
  }, [tenantRooms, filteredRooms, filteredPreBookings, filteredAuditLogs, tenantPreBookings, getBillSummary]);

  // Occupancy stats by category helper for backward compatibility
  const categoriesCount = useMemo(() => {
    const counts: { [key: string]: { total: number; occupied: number } } = {};
    roomCategorySummary.forEach(c => {
      counts[c.category] = { total: c.totalInventory, occupied: c.inHouseOccupied };
    });
    return counts;
  }, [roomCategorySummary]);

  // Unified Master Transactions List
  const masterTransactions = useMemo(() => {
    const list: {
      id: string;
      date: string;
      source: string;
      reference: string;
      customer: string;
      category: string;
      amount: number;
      tax: number;
      status: string;
    }[] = [];

    // Orders
    filteredOrders.forEach(o => {
      list.push({
        id: o.id,
        date: o.timestamp || 'N/A',
        source: o.isBar ? 'Bar POS' : 'Restaurant POS',
        reference: o.orderNumber,
        customer: o.guestName || (o.roomNumber ? `Room ${o.roomNumber}` : 'Walk-in Customer'),
        category: o.isBar ? 'Bar Drinks' : 'Food & Dining',
        amount: o.total,
        tax: o.tax || 0,
        status: o.status
      });
    });

    // Laundry
    filteredLaundry.forEach(l => {
      list.push({
        id: l.id,
        date: l.timestamp || 'N/A',
        source: 'Laundry Service',
        reference: l.orderNumber,
        customer: l.guestName ? `${l.guestName} (Room ${l.roomNumber})` : `Room ${l.roomNumber}`,
        category: 'Housekeeping & Laundry',
        amount: l.totalPrice,
        tax: l.totalPrice * 0.18,
        status: l.status
      });
    });

    // Hall Bookings
    filteredHall.forEach(h => {
      list.push({
        id: h.id,
        date: h.date || 'N/A',
        source: 'Banquet & Events',
        reference: h.bookingNumber,
        customer: h.guestName,
        category: h.hallType,
        amount: h.totalPrice,
        tax: h.totalPrice * 0.18,
        status: h.status
      });
    });

    // Room Check-Out Settlements & Discounts
    filteredAuditLogs.filter(a => a.action === 'Check-Out').forEach(a => {
      const roomMatch = a.details?.match(/Room\s+([A-Za-z0-9\-]+)/i);
      const guestMatch = a.details?.match(/Guest\s+(.+?)\s+checked out/i);
      const discMatch = a.details?.match(/Discount:\s*₹?([0-9]+(?:\.[0-9]+)?)/i);
      const discountVal = discMatch ? parseFloat(discMatch[1]) : 0;
      
      list.push({
        id: a.id,
        date: a.timestamp || 'N/A',
        source: 'Room Settlement',
        reference: roomMatch ? `Room ${roomMatch[1]}` : 'Room Checkout',
        customer: guestMatch ? guestMatch[1] : 'In-House Guest',
        category: discountVal > 0 ? `Checkout (Discount: ₹${discountVal})` : 'Checkout Settle',
        amount: 0,
        tax: 0,
        status: 'Settled'
      });
    });

    // Sort descending by date
    return list.sort((a, b) => (b.date > a.date ? 1 : -1));
  }, [filteredOrders, filteredLaundry, filteredHall, filteredAuditLogs]);

  // Generic Excel CSV Exporter Helper
  const downloadExcel = (filename: string, rows: (string | number)[][]) => {
    const csvContent = "\uFEFF" + rows.map(row => 
      row.map(cell => {
        const cellStr = String(cell ?? '').replace(/"/g, '""');
        return `"${cellStr}"`;
      }).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export Active Tab to Excel
  const handleExportCurrentTab = () => {
    const dateTag = startDate || endDate ? `_${startDate}_to_${endDate}` : '_all_time';

    if (activeReportTab === 'sales') {
      const rows: (string | number)[][] = [
        ['HotelVista ERP - Departmental Sales Summary Report'],
        ['Filter Period', startDate && endDate ? `${startDate} to ${endDate}` : 'All Time'],
        ['Generated Date', new Date().toLocaleString()],
        [],
        ['Department Category', 'Revenue (INR)', 'Percentage Share (%)'],
        ['Room Rent Sales', roomRev, grossSales > 0 ? ((roomRev / grossSales) * 100).toFixed(2) : 0],
        ['Restaurant POS', restSales, grossSales > 0 ? ((restSales / grossSales) * 100).toFixed(2) : 0],
        ['Bar POS Terminal', barSales, grossSales > 0 ? ((barSales / grossSales) * 100).toFixed(2) : 0],
        ['Laundry Service', laundrySales, grossSales > 0 ? ((laundrySales / grossSales) * 100).toFixed(2) : 0],
        ['Party & Banquet Hall', hallSales, grossSales > 0 ? ((hallSales / grossSales) * 100).toFixed(2) : 0],
        [],
        ['TOTAL GROSS SALES', grossSales, '100%'],
        ...(totalDiscounts > 0 ? [['Less: Cashier Discounts Allowed', -totalDiscounts, 'Discounts at Checkout']] : []),
        ['NET REALIZED SALES', totalSales, 'Net Operating'],
        ['Less: Stock Purchase Expenses', purchaseExpenses, ''],
        ['Less: Direct Operational Expenses', operationalExpenses, ''],
        ['NET OPERATING INCOME', netOperatingIncome, '']
      ];
      downloadExcel(`Sales_Report${dateTag}`, rows);
    } else if (activeReportTab === 'transactions') {
      const rows: (string | number)[][] = [
        ['HotelVista ERP - Detailed Master Transactions Log'],
        ['Filter Period', startDate && endDate ? `${startDate} to ${endDate}` : 'All Time'],
        ['Total Count', masterTransactions.length],
        [],
        ['Date / Time', 'Reference No', 'Source POS', 'Customer / Room', 'Category', 'Tax Amount (INR)', 'Total Amount (INR)', 'Status']
      ];
      masterTransactions.forEach(t => {
        rows.push([t.date, t.reference, t.source, t.customer, t.category, t.tax.toFixed(2), t.amount, t.status]);
      });
      downloadExcel(`Master_Transactions${dateTag}`, rows);
    } else if (activeReportTab === 'occupancy') {
      const rows: (string | number)[][] = [
        ['HotelVista ERP - Room Category Booking Summary & Occupancy Report'],
        ['Filter Period', startDate && endDate ? `${startDate} to ${endDate}` : 'All Time'],
        ['Generated Date', new Date().toLocaleString()],
        [],
        ['1. ROOM CATEGORY BOOKING & REVENUE ANALYTICS'],
        ['Room Category', 'Total Inventory', 'Occupied In-House', 'Vacant Rooms', 'Total Bookings / Stays', 'Room Nights Sold', 'Total Room Revenue (INR)', 'Average Daily Rate (ADR INR)', 'Occupancy Rate (%)']
      ];
      roomCategorySummary.forEach(s => {
        rows.push([
          s.category,
          s.totalInventory,
          s.inHouseOccupied,
          s.vacantRooms,
          s.totalBookings,
          s.nightsSold,
          s.totalRevenue,
          s.adr,
          `${s.occupancyRate}%`
        ]);
      });
      rows.push([]);
      rows.push(['2. ACTIVE IN-HOUSE GUESTS CHECKLIST']);
      rows.push(['Room No', 'Category', 'Guest Name', 'Phone', 'Check-In Date', 'Advance Paid']);
      rooms.filter(r => r.status === 'Occupied').forEach(r => {
        rows.push([r.roomNumber, r.category, r.guestName || '', r.guestPhone || '', r.checkInDate || '', r.advancePaid || 0]);
      });
      downloadExcel(`Room_Category_Bookings_Report${dateTag}`, rows);
    } else if (activeReportTab === 'gst') {
      const rows: (string | number)[][] = [
        ['HotelVista ERP - GST & Tax Returns Audit Report'],
        ['Filter Period', startDate && endDate ? `${startDate} to ${endDate}` : 'All Time'],
        [],
        ['Tax Component', 'Taxable Revenue (INR)', 'Tax Rate (%)', 'Tax Collected (INR)'],
        ['General / Room GST (CGST 9% + SGST 9%)', generalTaxableBase, `${generalTaxRate}%`, generalGstTax.toFixed(2)],
        ['Bar & Liquor VAT', barSales, `${barTaxRate}%`, barVatTax.toFixed(2)],
        [],
        ['TOTAL TAX LIABILITY', generalTaxableBase + barSales, '', totalTax.toFixed(2)]
      ];
      downloadExcel(`GST_Tax_Audit${dateTag}`, rows);
    } else if (activeReportTab === 'stock') {
      const rows: (string | number)[][] = [
        ['HotelVista ERP - Stock Inventory & Purchase Expense Report'],
        ['Filter Period', startDate && endDate ? `${startDate} to ${endDate}` : 'All Time'],
        [],
        ['CURRENT STOCK INVENTORY LEVELS'],
        ['Item / SKU Name', 'Category', 'Barcode', 'Current Stock', 'Min Stock Threshold', 'Unit', 'Stock Status']
      ];
      inventory.forEach(i => {
        const isLow = i.stock < i.minStock;
        rows.push([i.name, i.category, i.barcode || 'N/A', i.stock, i.minStock, i.unit, isLow ? 'LOW STOCK' : 'Good']);
      });
      rows.push([]);
      rows.push(['STOCK PURCHASE LOG HISTORY']);
      rows.push(['Purchase Date', 'Supplier', 'Item Name', 'Category', 'Quantity', 'Unit', 'Price / Unit', 'GST Tax', 'Total Amount']);
      filteredPurchases.forEach(p => {
        rows.push([p.date, p.supplier, p.itemName, p.category, p.quantity, p.unit, p.pricePerUnit, p.gstAmount, p.totalAmount]);
      });
      downloadExcel(`Stock_Purchase_Report${dateTag}`, rows);
    } else if (activeReportTab === 'outstanding') {
      const rows: (string | number)[][] = [
        ['HotelVista ERP - Unsettled Outstanding Balances Report'],
        ['Generated Date', new Date().toLocaleString()],
        [],
        ['Room Number', 'Guest Name', 'Contact Phone', 'Check-In Date', 'Room Charges', 'Advance Paid', 'Pending Balance (INR)']
      ];
      outstandingList.forEach(o => {
        rows.push([o.roomNumber, o.guestName, o.phone, o.checkInDate, o.roomCharges, o.advancePaid, o.pendingAmount]);
      });
      rows.push([]);
      rows.push(['TOTAL OUTSTANDING UNSETTLED', '', '', '', '', '', outstandingList.reduce((acc, o) => acc + o.pendingAmount, 0)]);
      downloadExcel(`Outstanding_Bills_Report${dateTag}`, rows);
    }
  };

  // Export Complete Consolidated Master ERP Excel Report
  const handleExportFullMasterReport = () => {
    const dateTag = startDate && endDate ? `_${startDate}_to_${endDate}` : '_consolidated';
    const rows: (string | number)[][] = [
      ['========================================================================'],
      ['HOTELVISTA ERP - MASTER FINANCIAL & OPERATIONAL CONSOLIDATED REPORT'],
      ['========================================================================'],
      ['Filter Period', startDate && endDate ? `${startDate} to ${endDate}` : 'All Time'],
      ['Generated On', new Date().toLocaleString()],
      [],
      ['1. FINANCIAL PERFORMANCE EXECUTIVE SUMMARY'],
      ['Gross Departmental Sales', totalSales],
      ['Less: Inventory Purchase Expenses', purchaseExpenses],
      ['Net Operating Income', netOperatingIncome],
      ['Total Tax Duties (GST + VAT)', totalTax.toFixed(2)],
      ['Total Unsettled Outstanding', outstandingList.reduce((acc, o) => acc + o.pendingAmount, 0)],
      [],
      ['2. DEPARTMENTAL REVENUE BREAKDOWN'],
      ['Department', 'Revenue (INR)', 'Share (%)'],
      ['Rooms Rent Revenue', roomRev, totalSales > 0 ? ((roomRev / totalSales) * 100).toFixed(2) : 0],
      ['Restaurant POS Sales', restSales, totalSales > 0 ? ((restSales / totalSales) * 100).toFixed(2) : 0],
      ['Bar & Beverage POS', barSales, totalSales > 0 ? ((barSales / totalSales) * 100).toFixed(2) : 0],
      ['Laundry & Dry Cleaning', laundrySales, totalSales > 0 ? ((laundrySales / totalSales) * 100).toFixed(2) : 0],
      ['Banquet & Hall Rentals', hallSales, totalSales > 0 ? ((hallSales / totalSales) * 100).toFixed(2) : 0],
      [],
      ['2b. ROOM CATEGORY BOOKING & REVENUE SUMMARY'],
      ['Room Category', 'Inventory', 'In-House Occupied', 'Bookings Count', 'Nights Sold', 'Revenue (INR)', 'ADR (INR)', 'Occupancy (%)'],
      ...roomCategorySummary.map(s => [s.category, s.totalInventory, s.inHouseOccupied, s.totalBookings, s.nightsSold, s.totalRevenue, s.adr, `${s.occupancyRate}%`]),
      [],
      ['3. TAXATION & DUTIES AUDIT'],
      ['General GST (18%) Taxable Base', generalTaxableBase, 'Duty Collected:', generalGstTax.toFixed(2)],
      ['Liquor VAT (20%) Taxable Base', barSales, 'Duty Collected:', barVatTax.toFixed(2)],
      ['Total Combined Tax Liability', generalTaxableBase + barSales, 'Total Duty:', totalTax.toFixed(2)],
      [],
      ['4. MASTER ORDERS & TRANSACTIONS LOG'],
      ['Date / Time', 'Reference', 'Source', 'Customer / Room', 'Category', 'Tax', 'Total Amount', 'Status']
    ];

    masterTransactions.forEach(t => {
      rows.push([t.date, t.reference, t.source, t.customer, t.category, t.tax.toFixed(2), t.amount, t.status]);
    });

    rows.push([]);
    rows.push(['5. INVENTORY & STOCK LEVELS']);
    rows.push(['Item Name', 'Category', 'Barcode', 'Current Stock', 'Min Stock', 'Unit', 'Status']);
    inventory.forEach(i => {
      rows.push([i.name, i.category, i.barcode || 'N/A', i.stock, i.minStock, i.unit, i.stock < i.minStock ? 'LOW' : 'OK']);
    });

    rows.push([]);
    rows.push(['6. UNSETTLED GUEST OUTSTANDINGS']);
    rows.push(['Room No', 'Guest Name', 'Phone', 'Check-In Date', 'Advance Paid', 'Pending Balance']);
    outstandingList.forEach(o => {
      rows.push([o.roomNumber, o.guestName, o.phone, o.checkInDate, o.advancePaid, o.pendingAmount]);
    });

    downloadExcel(`Master_ERP_Report${dateTag}`, rows);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Export All Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm no-print">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-500/20">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              ERP Reports & Analytics
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Comprehensive financial statements, departmental sales, tax audits & stock analytics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live Data Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all shrink-0"
            title="Fetch latest data from MongoDB"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh Data'}</span>
          </button>

          {/* Master Excel Export Button */}
          <button
            onClick={handleExportFullMasterReport}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Master Excel Report</span>
          </button>
        </div>
      </div>

      {/* Date Range & Custom Filter Controls Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-3 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Filter Period:
            </span>
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '7days', label: 'Last 7 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'custom', label: 'Custom Range' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => applyDatePreset(p.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  datePreset === p.id 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Pickers */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 p-1.5 px-2.5 rounded-xl border dark:border-slate-800">
              <span className="text-slate-400 font-bold">Start:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="bg-transparent font-bold font-mono text-slate-700 dark:text-slate-300 focus:outline-none"
              />
            </div>
            <span className="text-slate-400 font-bold">-</span>
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 p-1.5 px-2.5 rounded-xl border dark:border-slate-800">
              <span className="text-slate-400 font-bold">End:</span>
              <input
                type="date"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="bg-transparent font-bold font-mono text-slate-700 dark:text-slate-300 focus:outline-none"
              />
            </div>

            {(startDate || endDate) && (
              <button
                onClick={() => applyDatePreset('all')}
                className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                title="Reset Date Filters"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        
        {/* Total Sales */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Net Realized Sales</span>
            <span className="text-xl font-bold font-mono text-slate-800 dark:text-slate-200">
              ₹{totalSales.toLocaleString()}
            </span>
            {totalDiscounts > 0 && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-mono">
                Gross: ₹{grossSales.toLocaleString()} | Disc: -₹{totalDiscounts.toLocaleString()}
              </span>
            )}
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-500 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Expenses Outflow */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Expenses & Stock</span>
            <span className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
              ₹{totalOutflow.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 block">
              Ops: ₹{operationalExpenses.toLocaleString()} | Stock: ₹{purchaseExpenses.toLocaleString()}
            </span>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950 text-rose-500 rounded-xl">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* GST Tax Liabilities */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Tax Liabilities (GST+VAT)</span>
            <span className="text-xl font-bold font-mono text-violet-600 dark:text-violet-400">
              ₹{totalTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="p-3 bg-violet-50 dark:bg-violet-950 text-violet-500 rounded-xl">
            <Landmark className="w-5 h-5" />
          </div>
        </div>

        {/* Unsettled Outstanding */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Unsettled Outstanding</span>
            <span className="text-xl font-bold font-mono text-rose-500">
              ₹{outstandingList.reduce((acc, o) => acc + o.pendingAmount, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950 text-rose-500 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Selector Controls for Sub Reports & Export Button for Active Tab */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm no-print">
        
        <div className="flex flex-wrap bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveReportTab('pnl')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeReportTab === 'pnl' 
                ? 'bg-red-600 text-white shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>P&L Account Statement</span>
          </button>
          <button
            onClick={() => setActiveReportTab('sales')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeReportTab === 'sales' 
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-500'
            }`}
          >
            Departmental Sales
          </button>
          <button
            onClick={() => setActiveReportTab('transactions')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeReportTab === 'transactions' 
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-500'
            }`}
          >
            Transactions Log ({masterTransactions.length})
          </button>
          <button
            onClick={() => setActiveReportTab('occupancy')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeReportTab === 'occupancy' 
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-500'
            }`}
          >
            Room Bookings & Occupancy
          </button>
          <button
            onClick={() => setActiveReportTab('gst')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeReportTab === 'gst' 
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-500'
            }`}
          >
            GST Audit
          </button>
          <button
            onClick={() => setActiveReportTab('stock')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeReportTab === 'stock' 
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-500'
            }`}
          >
            Stock & Purchases
          </button>
          <button
            onClick={() => setActiveReportTab('outstanding')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeReportTab === 'outstanding' 
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-500'
            }`}
          >
            Outstanding ({outstandingList.length})
          </button>
        </div>

        {/* Tab-Specific Excel Download Button */}
        <button
          onClick={handleExportCurrentTab}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all"
        >
          <Download className="w-4 h-4 text-emerald-500" />
          <span>Export Tab to Excel (.csv)</span>
        </button>

      </div>

      {/* Sub Report Render Area */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm print:p-0 print:border-none print:shadow-none print:bg-transparent">
        
        {/* TAB 0: P&L Statement (Formal Hotel Profit & Loss Account) */}
        {activeReportTab === 'pnl' && (
          <PnLStatementReport startDate={startDate} endDate={endDate} />
        )}

        {/* TAB 1: Departmental Sales */}
        {activeReportTab === 'sales' && (
          <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b pb-2 border-slate-100 dark:border-slate-800">
              Departmental Sales & Revenue Breakdown
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              
              {/* Detailed Breakdown */}
              <div className="space-y-3 text-xs font-mono">
                <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border dark:border-slate-850">
                  <span className="text-slate-500 uppercase font-semibold">1. Rooms Rent Sales</span>
                  <span className="font-bold text-slate-800 dark:text-white">₹{roomRev.toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border dark:border-slate-850">
                  <span className="text-slate-500 uppercase font-semibold">2. Restaurant POS</span>
                  <span className="font-bold text-slate-800 dark:text-white">₹{restSales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border dark:border-slate-850">
                  <span className="text-slate-500 uppercase font-semibold">3. Bar POS Terminal</span>
                  <span className="font-bold text-slate-800 dark:text-white">₹{barSales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border dark:border-slate-850">
                  <span className="text-slate-500 uppercase font-semibold">4. Laundry Service</span>
                  <span className="font-bold text-slate-800 dark:text-white">₹{laundrySales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border dark:border-slate-850">
                  <span className="text-slate-500 uppercase font-semibold">5. Banquet / Party Hall</span>
                  <span className="font-bold text-slate-800 dark:text-white">₹{hallSales.toLocaleString()}</span>
                </div>

                {totalDiscounts > 0 && (
                  <div className="flex justify-between p-3 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-200/50 dark:border-rose-900/30 text-rose-600 dark:text-rose-400">
                    <span className="uppercase font-semibold">Less: Cashier Discounts Allowed</span>
                    <span className="font-bold font-mono">-₹{totalDiscounts.toLocaleString()}</span>
                  </div>
                )}
                
                <div className="border-t-2 border-slate-300 dark:border-slate-800 my-2 pt-3 flex justify-between font-extrabold text-sm text-indigo-600 dark:text-indigo-400">
                  <span className="font-sans uppercase">{totalDiscounts > 0 ? 'Net Realized Revenue' : 'Combined Revenues'}</span>
                  <span>₹{totalSales.toLocaleString()}</span>
                </div>
              </div>

              {/* Progress bar list */}
              <div className="space-y-4 p-4 rounded-xl border dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Visual Revenue Share</span>
                {[
                  { label: 'Rooms Rent', val: roomRev, color: 'bg-indigo-500' },
                  { label: 'Restaurant', val: restSales, color: 'bg-emerald-500' },
                  { label: 'Bar Drinks', val: barSales, color: 'bg-violet-500' },
                  { label: 'Laundry Services', val: laundrySales, color: 'bg-rose-500' },
                  { label: 'Party Hall Rents', val: hallSales, color: 'bg-amber-500' }
                ].map(item => {
                  const percent = totalSales > 0 ? (item.val / totalSales) * 100 : 0;
                  return (
                    <div key={item.label} className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between font-medium">
                        <span className="text-slate-650 dark:text-slate-350">{item.label}</span>
                        <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{percent.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color}`} style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Room Category Revenue Summary Subsection */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Room Categories Revenue & Booking Performance
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Breakdown of room revenues and room nights sold by room category
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveReportTab('occupancy')}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  View Full Room Analytics →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {roomCategorySummary.map(cat => (
                  <div key={cat.category} className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border dark:border-slate-850 space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 dark:text-slate-200 font-sans">{cat.category}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold font-mono">
                        {cat.occupancyRate}% Occ
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Bookings / Stays:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{cat.totalBookings}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Room Nights:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{cat.nightsSold}N</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-1 text-slate-900 dark:text-white font-extrabold">
                      <span className="font-sans">Revenue:</span>
                      <span className="text-indigo-600 dark:text-indigo-400">₹{cat.totalRevenue.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: Detailed Master Transactions */}
        {activeReportTab === 'transactions' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b pb-2 border-slate-100 dark:border-slate-800">
              Detailed Master Transactions & Orders Log
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2">Date / Time</th>
                    <th className="py-2">Reference No</th>
                    <th className="py-2">Source / Department</th>
                    <th className="py-2">Customer / Room</th>
                    <th className="py-2 text-right">Tax</th>
                    <th className="py-2 text-right">Total Amount</th>
                    <th className="py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {masterTransactions.map(item => (
                    <tr key={item.id} className="text-slate-700 dark:text-slate-300">
                      <td className="py-3 font-mono text-[11px] text-slate-500">{item.date}</td>
                      <td className="py-3 font-mono font-bold text-slate-800 dark:text-slate-200">{item.reference}</td>
                      <td className="py-3 font-medium text-indigo-500">{item.source}</td>
                      <td className="py-3 font-medium">{item.customer}</td>
                      <td className="py-3 text-right font-mono text-slate-400">₹{item.tax.toFixed(0)}</td>
                      <td className="py-3 text-right font-mono font-bold text-slate-850 dark:text-slate-150">
                        ₹{item.amount.toLocaleString()}
                      </td>
                      <td className="py-3 text-center">
                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                          item.status === 'Paid' || item.status === 'Completed' || item.status === 'Confirmed'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                            : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {masterTransactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-slate-400">No transactions recorded for the selected date range.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Room Category Booking Summary & Occupancy Rate Analytics */}
        {activeReportTab === 'occupancy' && (
          <div className="space-y-6">
            
            {/* Header & KPI Metrics Cards */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <BedDouble className="w-4 h-4 text-indigo-500" />
                    Room Category Booking Summary & Occupancy Analytics
                  </h3>
                  <p className="text-xs text-slate-400">
                    Comprehensive overview of what room types are booked, how many stays, room nights sold, and revenue generated
                  </p>
                </div>
              </div>

              {/* Top KPI Cards for Rooms */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border dark:border-slate-850 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Bookings & Stays</span>
                  <p className="text-xl font-black font-mono text-slate-900 dark:text-white">
                    {roomCategorySummary.reduce((acc, c) => acc + c.totalBookings, 0)}
                  </p>
                  <span className="text-[10px] text-slate-400">In-house & completed stays</span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border dark:border-slate-850 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Room Nights Sold</span>
                  <p className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                    {roomCategorySummary.reduce((acc, c) => acc + c.nightsSold, 0)} Nights
                  </p>
                  <span className="text-[10px] text-slate-400">Total duration billed</span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border dark:border-slate-850 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">In-House Occupied</span>
                  <p className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {roomCategorySummary.reduce((acc, c) => acc + c.inHouseOccupied, 0)} / {tenantRooms.length}
                  </p>
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    {tenantRooms.length > 0 ? Math.round((roomCategorySummary.reduce((acc, c) => acc + c.inHouseOccupied, 0) / tenantRooms.length) * 100) : 0}% Active Occupancy
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border dark:border-slate-850 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Room Revenue</span>
                  <p className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                    ₹{roomCategorySummary.reduce((acc, c) => acc + c.totalRevenue, 0).toLocaleString()}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    ADR: ₹{roomCategorySummary.reduce((acc, c) => acc + c.nightsSold, 0) > 0 ? Math.round(roomCategorySummary.reduce((acc, c) => acc + c.totalRevenue, 0) / roomCategorySummary.reduce((acc, c) => acc + c.nightsSold, 0)).toLocaleString() : 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Main Room Category Booking Summary Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200/50 dark:border-slate-800/50">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/70 text-slate-400 border-b border-slate-200/50 dark:border-slate-800/50">
                    <th className="py-3 px-4 font-bold">Room Category</th>
                    <th className="py-3 px-3 text-center font-bold">Inventory</th>
                    <th className="py-3 px-3 text-center font-bold">Occupied Now</th>
                    <th className="py-3 px-3 text-center font-bold">Vacant</th>
                    <th className="py-3 px-3 text-center font-bold">Total Bookings</th>
                    <th className="py-3 px-3 text-center font-bold">Nights Sold</th>
                    <th className="py-3 px-4 text-right font-bold">Total Revenue</th>
                    <th className="py-3 px-4 text-right font-bold">ADR (₹/Night)</th>
                    <th className="py-3 px-4 text-right font-bold">Occupancy %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {roomCategorySummary.map(cat => (
                    <tr key={cat.category} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 text-slate-700 dark:text-slate-300">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        <span>{cat.category}</span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-medium">{cat.totalInventory}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {cat.inHouseOccupied}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-400">{cat.vacantRooms}</td>
                      <td className="py-3 px-3 text-center font-mono font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/20">
                        {cat.totalBookings}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold">{cat.nightsSold}</td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900 dark:text-slate-100">
                        ₹{cat.totalRevenue.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                        ₹{cat.adr.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-indigo-600 dark:text-indigo-400">
                        {cat.occupancyRate}%
                      </td>
                    </tr>
                  ))}

                  {/* Summary Totals Row */}
                  <tr className="bg-slate-100/70 dark:bg-slate-950/80 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                    <td className="py-3 px-4 uppercase font-sans">Total Across Categories</td>
                    <td className="py-3 px-3 text-center font-mono">{tenantRooms.length}</td>
                    <td className="py-3 px-3 text-center font-mono text-emerald-600 dark:text-emerald-400">
                      {roomCategorySummary.reduce((acc, c) => acc + c.inHouseOccupied, 0)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-400">
                      {roomCategorySummary.reduce((acc, c) => acc + c.vacantRooms, 0)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-indigo-600 dark:text-indigo-400">
                      {roomCategorySummary.reduce((acc, c) => acc + c.totalBookings, 0)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      {roomCategorySummary.reduce((acc, c) => acc + c.nightsSold, 0)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-indigo-600 dark:text-indigo-400">
                      ₹{roomCategorySummary.reduce((acc, c) => acc + c.totalRevenue, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      ₹{roomCategorySummary.reduce((acc, c) => acc + c.nightsSold, 0) > 0 
                        ? Math.round(roomCategorySummary.reduce((acc, c) => acc + c.totalRevenue, 0) / roomCategorySummary.reduce((acc, c) => acc + c.nightsSold, 0)).toLocaleString() 
                        : 0}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-indigo-600 dark:text-indigo-400">
                      {tenantRooms.length > 0 
                        ? Math.round((roomCategorySummary.reduce((acc, c) => acc + c.inHouseOccupied, 0) / tenantRooms.length) * 100) 
                        : 0}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Active In-House Guests Checklist */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                Active In-House Guests Checklist ({tenantRooms.filter(r => r.status === 'Occupied').length})
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/70 text-slate-400 border-b border-slate-200/50 dark:border-slate-800/50">
                      <th className="py-2.5 px-3">Room No</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Guest Name</th>
                      <th className="py-2.5 px-3">Contact Phone</th>
                      <th className="py-2.5 px-3">Check-In Date</th>
                      <th className="py-2.5 px-3 text-right">Advance Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {tenantRooms.filter(r => r.status === 'Occupied').map(r => (
                      <tr key={r.id} className="text-slate-700 dark:text-slate-300">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">Room {r.roomNumber}</td>
                        <td className="py-2.5 px-3 text-slate-500 font-medium">{r.category}</td>
                        <td className="py-2.5 px-3 font-bold">{r.guestName || 'In-House Guest'}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">{r.guestPhone || '—'}</td>
                        <td className="py-2.5 px-3 font-mono">{r.checkInDate || '—'}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-600 font-bold">₹{r.advancePaid || 0}</td>
                      </tr>
                    ))}
                    {tenantRooms.filter(r => r.status === 'Occupied').length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-slate-400">No rooms currently occupied.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: GST Returns Audit */}
        {activeReportTab === 'gst' && (
          <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b pb-2 border-slate-100 dark:border-slate-800">
              Tax Liabilities & Returns Audit
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border dark:border-slate-850 space-y-2">
                <span className="font-bold text-slate-400 text-[10px] uppercase block">Room & General GST ({generalTaxRate}%)</span>
                <p className="text-slate-500">Taxable Sales: ₹{generalTaxableBase.toLocaleString()}</p>
                <p className="text-slate-400 text-[10px]">CGST ({(generalTaxRate/2).toFixed(1)}%): ₹{(generalGstTax/2).toFixed(0)} | SGST ({(generalTaxRate/2).toFixed(1)}%): ₹{(generalGstTax/2).toFixed(0)}</p>
                <p className="text-sm font-extrabold text-slate-800 dark:text-slate-150 border-t pt-1.5">Duty Payable: ₹{generalGstTax.toFixed(0)}</p>
              </div>
              
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border dark:border-slate-850 space-y-2">
                <span className="font-bold text-slate-400 text-[10px] uppercase block">Bar & Liquor VAT ({barTaxRate}%)</span>
                <p className="text-slate-500">Taxable Sales: ₹{barSales.toLocaleString()}</p>
                <p className="text-slate-400 text-[10px]">State Excise VAT ({barTaxRate}%)</p>
                <p className="text-sm font-extrabold text-slate-800 dark:text-slate-150 border-t pt-1.5">VAT Duty: ₹{barVatTax.toFixed(0)}</p>
              </div>

              <div className="p-4 bg-indigo-50/20 dark:bg-indigo-950/20 rounded-xl border border-indigo-500/20 space-y-2">
                <span className="font-bold text-indigo-500 text-[10px] uppercase block">Total Net Tax Collected</span>
                <p className="text-slate-400 text-[10px]">Gross Duties Payable</p>
                <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 border-t pt-1.5">₹{totalTax.toFixed(0)}</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Stock & Purchases */}
        {activeReportTab === 'stock' && (
          <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b pb-2 border-slate-100 dark:border-slate-800">
              Inventory Levels & Purchase Ledger
            </h3>

            {/* Current Stock Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Active Inventory Stock Levels</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      <th className="py-2">Item Name / Barcode</th>
                      <th className="py-2">Category</th>
                      <th className="py-2 text-center">Min Threshold</th>
                      <th className="py-2 text-right">In Stock</th>
                      <th className="py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {inventory.map(item => {
                      const isLow = item.stock < item.minStock;
                      return (
                        <tr key={item.id} className="text-slate-700 dark:text-slate-300">
                          <td className="py-2.5">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono block">{item.barcode || 'N/A'}</span>
                          </td>
                          <td className="py-2.5 font-medium text-slate-500">{item.category}</td>
                          <td className="py-2.5 text-center font-mono">{item.minStock} {item.unit}</td>
                          <td className={`py-2.5 text-right font-mono font-bold ${isLow ? 'text-rose-500' : 'text-slate-800 dark:text-slate-200'}`}>
                            {item.stock} {item.unit}
                          </td>
                          <td className="py-2.5 text-center">
                            <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                              isLow ? 'bg-rose-500 text-white' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                            }`}>
                              {isLow ? 'Low Stock' : 'Good'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Purchase Entries History */}
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Stock Purchases Log History</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      <th className="py-2">Date / Item</th>
                      <th className="py-2">Supplier Name</th>
                      <th className="py-2 text-center">Qty</th>
                      <th className="py-2 text-right">Price / Unit</th>
                      <th className="py-2 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {filteredPurchases.map(p => (
                      <tr key={p.id} className="text-slate-700 dark:text-slate-300">
                        <td className="py-2.5">
                          <span className="text-[10px] font-mono text-indigo-500 font-semibold block">{p.date}</span>
                          <span className="font-bold">{p.itemName}</span>
                        </td>
                        <td className="py-2.5 font-medium text-slate-500">{p.supplier}</td>
                        <td className="py-2.5 text-center font-mono">{p.quantity} {p.unit}</td>
                        <td className="py-2.5 text-right font-mono">₹{p.pricePerUnit}</td>
                        <td className="py-2.5 text-right font-mono font-bold text-amber-600 dark:text-amber-400">₹{p.totalAmount}</td>
                      </tr>
                    ))}
                    {filteredPurchases.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-slate-400">No stock purchase entries found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 6: Outstanding Bills */}
        {activeReportTab === 'outstanding' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b pb-2 border-slate-100 dark:border-slate-800">
              Unsettled Outstanding Guest Balances
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2">Room No</th>
                    <th className="py-2">Guest Name / Contact</th>
                    <th className="py-2 font-mono">Check-In Date</th>
                    <th className="py-2 text-right">Room Charges</th>
                    <th className="py-2 text-right">Advance Paid</th>
                    <th className="py-2 text-right">Pending Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {outstandingList.map(item => (
                    <tr key={item.roomNumber} className="text-slate-700 dark:text-slate-300">
                      <td className="py-3 font-extrabold font-mono text-indigo-600 dark:text-indigo-400">Room {item.roomNumber}</td>
                      <td className="py-3">
                        <p className="font-bold">{item.guestName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{item.phone}</p>
                      </td>
                      <td className="py-3 font-mono text-slate-500">{item.checkInDate}</td>
                      <td className="py-3 text-right font-mono">₹{item.roomCharges}</td>
                      <td className="py-3 text-right font-mono text-emerald-600">₹{item.advancePaid}</td>
                      <td className="py-3 text-right font-mono font-bold text-rose-500">
                        ₹{item.pendingAmount.toFixed(0)}
                      </td>
                    </tr>
                  ))}
                  {outstandingList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400">All room balances have been settled. No outstandings!</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
