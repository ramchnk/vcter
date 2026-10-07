import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
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
  CheckCircle2
} from 'lucide-react';

import { 
  getLocalTodayString, 
  getMonthStartString, 
  isDateInRange, 
  isStayInRange 
} from '../utils/dateUtils';

export const ReportsView: React.FC = () => {
  const { 
    rooms, 
    orders, 
    laundryOrders, 
    hallBookings, 
    purchaseLogs, 
    inventory, 
    preBookings, 
    auditLogs, 
    getBillSummary, 
    settings,
    refreshData 
  } = useApp();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Active Sub Tab (persisted on reload)
  const [activeReportTab, setActiveReportTab] = useState<
    'sales' | 'transactions' | 'occupancy' | 'gst' | 'stock' | 'outstanding'
  >(() => {
    const saved = localStorage.getItem('hotelvista_reports_subtab');
    return (saved as any) || 'sales';
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

  // Filtered Datasets based on Date Range
  const filteredOrders = useMemo(() => {
    return orders.filter(o => isDateInRange(o.timestamp, startDate, endDate));
  }, [orders, startDate, endDate]);

  const filteredLaundry = useMemo(() => {
    return laundryOrders.filter(l => isDateInRange(l.timestamp, startDate, endDate));
  }, [laundryOrders, startDate, endDate]);

  const filteredHall = useMemo(() => {
    return hallBookings.filter(h => isDateInRange(h.date, startDate, endDate));
  }, [hallBookings, startDate, endDate]);

  const filteredPurchases = useMemo(() => {
    return purchaseLogs.filter(p => isDateInRange(p.date, startDate, endDate));
  }, [purchaseLogs, startDate, endDate]);

  const filteredRooms = useMemo(() => {
    return rooms.filter(r => isStayInRange(r.checkInDate, r.checkOutDate, startDate, endDate));
  }, [rooms, startDate, endDate]);

  // Calculations for Reports
  // 1. Departmental sales (date filtered)
  const roomRev = useMemo(() => {
    return filteredRooms.reduce((acc, r) => {
      const bill = getBillSummary(r.roomNumber);
      return acc + (bill ? bill.roomRentTotal : (r.price || 0));
    }, 0);
  }, [filteredRooms, getBillSummary]);

  const restSales = useMemo(() => filteredOrders.filter(o => !o.isBar).reduce((acc, o) => acc + o.total, 0), [filteredOrders]);
  const barSales = useMemo(() => filteredOrders.filter(o => o.isBar).reduce((acc, o) => acc + o.total, 0), [filteredOrders]);
  const laundrySales = useMemo(() => filteredLaundry.reduce((acc, o) => acc + o.totalPrice, 0), [filteredLaundry]);
  const hallSales = useMemo(() => filteredHall.filter(o => o.status !== 'Cancelled').reduce((acc, o) => acc + o.totalPrice, 0), [filteredHall]);
  const purchaseExpenses = useMemo(() => filteredPurchases.reduce((acc, p) => acc + p.totalAmount, 0), [filteredPurchases]);

  const totalSales = roomRev + restSales + barSales + laundrySales + hallSales;
  const netOperatingIncome = totalSales - purchaseExpenses;

  // GST calculations
  const generalTaxRate = settings?.taxRate || 18;
  const barTaxRate = settings?.barTaxRate || 20;

  const generalTaxableBase = roomRev + restSales + laundrySales + hallSales;
  const generalGstTax = (generalTaxableBase * generalTaxRate) / 100;
  const barVatTax = (barSales * barTaxRate) / 100;
  const totalTax = generalGstTax + barVatTax;

  // Outstanding bills list
  const outstandingList = useMemo(() => {
    return rooms
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
  }, [rooms, getBillSummary]);

  // Occupancy stats by category
  const categoriesCount = useMemo(() => {
    const counts: { [key: string]: { total: number; occupied: number } } = {
      'Standard': { total: 0, occupied: 0 },
      'Semi Premium': { total: 0, occupied: 0 },
      'Premium': { total: 0, occupied: 0 },
      'Suite': { total: 0, occupied: 0 },
      'Family Suite': { total: 0, occupied: 0 },
      'Dormitory': { total: 0, occupied: 0 }
    };

    rooms.forEach(r => {
      if (!counts[r.category]) {
        counts[r.category] = { total: 0, occupied: 0 };
      }
      counts[r.category].total += 1;
      if (r.status === 'Occupied') {
        counts[r.category].occupied += 1;
      }
    });
    return counts;
  }, [rooms]);

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

    // Sort descending by date
    return list.sort((a, b) => (b.date > a.date ? 1 : -1));
  }, [filteredOrders, filteredLaundry, filteredHall]);

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
        ['Room Rent Sales', roomRev, totalSales > 0 ? ((roomRev / totalSales) * 100).toFixed(2) : 0],
        ['Restaurant POS', restSales, totalSales > 0 ? ((restSales / totalSales) * 100).toFixed(2) : 0],
        ['Bar POS Terminal', barSales, totalSales > 0 ? ((barSales / totalSales) * 100).toFixed(2) : 0],
        ['Laundry Service', laundrySales, totalSales > 0 ? ((laundrySales / totalSales) * 100).toFixed(2) : 0],
        ['Party & Banquet Hall', hallSales, totalSales > 0 ? ((hallSales / totalSales) * 100).toFixed(2) : 0],
        [],
        ['TOTAL GROSS SALES', totalSales, '100%'],
        ['Less: Stock Purchase Expenses', purchaseExpenses, ''],
        ['NET OPERATING REVENUE', netOperatingIncome, '']
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
        ['HotelVista ERP - Room Occupancy & Category Breakdown Report'],
        ['Generated Date', new Date().toLocaleString()],
        [],
        ['Room Category', 'Total Rooms Count', 'Occupied Rooms', 'Vacant Rooms', 'Occupancy Rate (%)']
      ];
      Object.entries(categoriesCount).forEach(([cat, data]) => {
        const rate = data.total > 0 ? Math.round((data.occupied / data.total) * 100) : 0;
        rows.push([cat, data.total, data.occupied, data.total - data.occupied, `${rate}%`]);
      });
      rows.push([]);
      rows.push(['ACTIVE IN-HOUSE GUESTS CHECKLIST']);
      rows.push(['Room No', 'Category', 'Guest Name', 'Phone', 'Check-In Date', 'Advance Paid']);
      rooms.filter(r => r.status === 'Occupied').forEach(r => {
        rows.push([r.roomNumber, r.category, r.guestName || '', r.guestPhone || '', r.checkInDate || '', r.advancePaid || 0]);
      });
      downloadExcel(`Occupancy_Report${dateTag}`, rows);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
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
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-3">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Sales */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Booked Sales</span>
            <span className="text-xl font-bold font-mono text-slate-800 dark:text-slate-200">
              ₹{totalSales.toLocaleString()}
            </span>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-500 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Purchase Expenses */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Stock Purchases Expense</span>
            <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
              ₹{purchaseExpenses.toLocaleString()}
            </span>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950 text-amber-500 rounded-xl">
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
        
        <div className="flex flex-wrap bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
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
            Occupancy Logs
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
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm">
        
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
                
                <div className="border-t-2 border-slate-300 dark:border-slate-800 my-2 pt-3 flex justify-between font-extrabold text-sm text-indigo-600 dark:text-indigo-400">
                  <span className="font-sans uppercase">Combined Revenues</span>
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

        {/* TAB 3: Occupancy Rate breakdown */}
        {activeReportTab === 'occupancy' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b pb-2 border-slate-100 dark:border-slate-800">
              Occupancy Breakdown by Room Category
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2">Room Category</th>
                    <th className="py-2 text-center">Total Inventory</th>
                    <th className="py-2 text-center">Occupied Rooms</th>
                    <th className="py-2 text-center">Vacant Rooms</th>
                    <th className="py-2 text-right">Occupancy Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {Object.entries(categoriesCount).map(([category, count]) => {
                    const rate = count.total > 0 ? Math.round((count.occupied / count.total) * 100) : 0;
                    return (
                      <tr key={category} className="text-slate-700 dark:text-slate-300">
                        <td className="py-3 font-bold text-slate-800 dark:text-slate-200">{category}</td>
                        <td className="py-3 text-center font-mono font-medium">{count.total}</td>
                        <td className="py-3 text-center font-mono font-medium text-emerald-600 dark:text-emerald-400 font-bold">{count.occupied}</td>
                        <td className="py-3 text-center font-mono font-medium text-slate-400">{count.total - count.occupied}</td>
                        <td className="py-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {rate}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
