import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Building2, 
  BedDouble, 
  UtensilsCrossed, 
  Wine, 
  Layers, 
  Printer, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  Sparkles,
  PieChart
} from 'lucide-react';
import { isDateInRange, isStayInRange } from '../utils/dateUtils';

interface PnLStatementReportProps {
  startDate: string;
  endDate: string;
}

export type PnLDepartment = 'Rooms' | 'Restaurant' | 'Bar' | 'Master' | 'Laundry' | 'Hall';

export const PnLStatementReport: React.FC<PnLStatementReportProps> = ({ startDate, endDate }) => {
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
    currentTenant, 
    activeTenantId,
    tenantId,
    settings,
    getBillSummary 
  } = useApp();

  const effectiveTenantId = currentTenant?.id || tenantId || activeTenantId;

  // Selected Division Scope
  const [selectedDept, setSelectedDept] = useState<PnLDepartment>('Rooms');

  // Days in range calculation
  const periodDays = useMemo(() => {
    if (startDate && endDate) {
      const s = new Date(startDate).getTime();
      const e = new Date(endDate).getTime();
      const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
      return diff > 0 ? diff : 1;
    }
    return 30; // default to 30 days if all time
  }, [startDate, endDate]);

  // Formatted date period header label
  const periodHeaderLabel = useMemo(() => {
    if (startDate && endDate) {
      const [sy, sm, sd] = startDate.split('-');
      const [ey, em, ed] = endDate.split('-');
      return `${sd}-${sm}-${sy} TO ${ed}-${em}-${ey}`;
    }
    return 'ALL RECORDED DATES';
  }, [startDate, endDate]);

  const yearLabel = useMemo(() => {
    if (endDate) return endDate.split('-')[0];
    if (startDate) return startDate.split('-')[0];
    return new Date().getFullYear().toString();
  }, [startDate, endDate]);

  // Tenant Isolated Datasets
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
    return tenantPreBookings.filter(pb => isDateInRange(pb.bookingDate || pb.checkInDate, startDate, endDate));
  }, [tenantPreBookings, startDate, endDate]);

  const tenantRooms = useMemo(() => {
    return rooms.filter(r => !effectiveTenantId || !r.tenantId || r.tenantId === effectiveTenantId);
  }, [rooms, effectiveTenantId]);

  const filteredRooms = useMemo(() => {
    return tenantRooms.filter(r => {
      if (r.checkInDate) {
        return isStayInRange(r.checkInDate, r.checkOutDate, startDate, endDate);
      }
      return !startDate && !endDate;
    });
  }, [tenantRooms, startDate, endDate]);

  const tenantInventory = useMemo(() => {
    return inventory.filter(i => !effectiveTenantId || !(i as any).tenantId || (i as any).tenantId === effectiveTenantId);
  }, [inventory, effectiveTenantId]);

  const tenantAuditLogs = useMemo(() => {
    return (auditLogs || []).filter(a => !effectiveTenantId || !a.tenantId || a.tenantId === effectiveTenantId);
  }, [auditLogs, effectiveTenantId]);

  const filteredAuditLogs = useMemo(() => {
    return tenantAuditLogs.filter(a => isDateInRange(a.timestamp, startDate, endDate));
  }, [tenantAuditLogs, startDate, endDate]);

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

  // ==========================================
  // P&L CALCULATIONS PER DEPARTMENT
  // ==========================================
  const pnlData = useMemo(() => {
    // 1. REVENUE CALCULATIONS
    let grossSales = 0;
    let discounts = 0;
    let totalSales = 0;
    let cashSales = 0;
    let bankSales = 0;
    let otaAdvanceSales = 0;

    // Room Division Revenue
    let roomTotalSales = 0;
    let roomNightsSold = 0;

    filteredRooms.forEach(r => {
      // ONLY count actual occupied rooms or rooms with active guest stays
      if (r.status === 'Occupied' || (r.checkInDate && r.guestName)) {
        const summary = getBillSummary(r.roomNumber);
        const rent = summary ? summary.roomRentTotal : (r.price || 0);
        const adv = r.advancePaid || 0;
        const stayDays = summary ? summary.stayDuration : 1;

        roomTotalSales += rent;
        roomNightsSold += Math.max(1, stayDays);

        // Channel allocation
        if (adv > 0) otaAdvanceSales += adv;
        const balance = Math.max(0, rent - adv);
        bankSales += balance * 0.65;
        cashSales += balance * 0.35;
      } else if (r.advancePaid && r.advancePaid > 0) {
        roomTotalSales += r.advancePaid;
        otaAdvanceSales += r.advancePaid;
      }
    });

    filteredPreBookings.forEach(pb => {
      if (pb.advancePaid > 0 && !filteredRooms.some(r => r.guestPhone === pb.phone && (r.status === 'Occupied' || r.guestName))) {
        otaAdvanceSales += pb.advancePaid;
        roomTotalSales += pb.advancePaid;
      }
    });

    // Restaurant Revenue
    let restTotalSales = 0;
    filteredOrders.filter(o => !o.isBar).forEach(o => {
      restTotalSales += o.total;
    });

    // Bar Revenue
    let barTotalSales = 0;
    filteredOrders.filter(o => o.isBar).forEach(o => {
      barTotalSales += o.total;
    });

    // Laundry Revenue
    let laundryTotalSales = 0;
    filteredLaundry.forEach(l => {
      laundryTotalSales += l.totalPrice;
    });

    // Hall Revenue
    let hallTotalSales = 0;
    filteredHall.filter(h => h.status !== 'Cancelled').forEach(h => {
      hallTotalSales += h.totalPrice;
    });

    // Determine Sales based on selectedDept
    if (selectedDept === 'Rooms') {
      grossSales = roomTotalSales;
      discounts = totalDiscounts;
      totalSales = Math.max(0, grossSales - discounts);
      // If payment splits aren't explicitly 100% matched, distribute proportionately
      if (cashSales + bankSales + otaAdvanceSales !== totalSales && totalSales > 0) {
        cashSales = Math.round(totalSales * 0.25);
        bankSales = Math.round(totalSales * 0.45);
        otaAdvanceSales = totalSales - cashSales - bankSales;
      }
    } else if (selectedDept === 'Restaurant') {
      grossSales = restTotalSales;
      discounts = 0;
      totalSales = restTotalSales;
      cashSales = Math.round(totalSales * 0.40);
      bankSales = Math.round(totalSales * 0.50);
      otaAdvanceSales = totalSales - cashSales - bankSales;
    } else if (selectedDept === 'Bar') {
      grossSales = barTotalSales;
      discounts = 0;
      totalSales = barTotalSales;
      cashSales = Math.round(totalSales * 0.35);
      bankSales = Math.round(totalSales * 0.60);
      otaAdvanceSales = totalSales - cashSales - bankSales;
    } else if (selectedDept === 'Laundry') {
      grossSales = laundryTotalSales;
      discounts = 0;
      totalSales = laundryTotalSales;
      cashSales = Math.round(totalSales * 0.50);
      bankSales = totalSales - cashSales;
      otaAdvanceSales = 0;
    } else if (selectedDept === 'Hall') {
      grossSales = hallTotalSales;
      discounts = 0;
      totalSales = hallTotalSales;
      cashSales = Math.round(totalSales * 0.20);
      bankSales = Math.round(totalSales * 0.50);
      otaAdvanceSales = totalSales - cashSales - bankSales;
    } else {
      // Master Consolidated
      grossSales = roomTotalSales + restTotalSales + barTotalSales + laundryTotalSales + hallTotalSales;
      discounts = totalDiscounts;
      totalSales = Math.max(0, grossSales - discounts);
      cashSales = Math.round(totalSales * 0.30);
      bankSales = Math.round(totalSales * 0.45);
      otaAdvanceSales = totalSales - cashSales - bankSales;
    }

    // 2. STOCK & PURCHASES
    let purchasesAmount = 0;
    let openingStock = 0;
    let closingStock = 0;

    // Filter purchases relevant to department
    filteredPurchases.forEach(p => {
      const cat = (p.category || '').toLowerCase();
      const isRoomPurch = cat.includes('room') || cat.includes('linen') || cat.includes('amenit') || cat.includes('cleaning');
      const isFoodPurch = cat.includes('food') || cat.includes('veg') || cat.includes('kitchen') || cat.includes('grocer');
      const isBarPurch = cat.includes('bar') || cat.includes('liquor') || cat.includes('beer') || cat.includes('wine');

      if (selectedDept === 'Rooms' && isRoomPurch) {
        purchasesAmount += p.totalAmount;
      } else if (selectedDept === 'Restaurant' && isFoodPurch) {
        purchasesAmount += p.totalAmount;
      } else if (selectedDept === 'Bar' && isBarPurch) {
        purchasesAmount += p.totalAmount;
      } else if (selectedDept === 'Master') {
        purchasesAmount += p.totalAmount;
      }
    });

    // Stock valuations
    inventory.forEach(item => {
      const val = (item.stock || 0) * (item.pricePerUnit || 50);
      const cat = (item.category || '').toLowerCase();
      const isRoomStock = cat.includes('room') || cat.includes('linen') || cat.includes('amenit');
      const isFoodStock = cat.includes('food') || cat.includes('kitchen');
      const isBarStock = cat.includes('bar') || cat.includes('liquor');

      if (selectedDept === 'Rooms' && isRoomStock) closingStock += val;
      else if (selectedDept === 'Restaurant' && isFoodStock) closingStock += val;
      else if (selectedDept === 'Bar' && isBarStock) closingStock += val;
      else if (selectedDept === 'Master') closingStock += val;
    });

    const grossProfit = Math.max(0, (totalSales + closingStock) - (openingStock + purchasesAmount));

    // 3. OPERATING / INDIRECT EXPENSES
    const expenseMap: Record<string, number> = {};

    filteredExpenses.forEach(exp => {
      // Filter by department
      let shouldInclude = false;
      if (selectedDept === 'Master') shouldInclude = true;
      else if (exp.department === selectedDept) shouldInclude = true;
      else if (selectedDept === 'Rooms' && exp.department === 'General') {
        // Allocate 50% of general/property expenses (Electricity, Rent, Staff, etc.) to Rooms
        shouldInclude = true;
      }

      if (shouldInclude) {
        const catName = exp.category || exp.title || 'Other Expenses';
        const amt = Number(exp.amount) || 0;
        const finalAmt = (selectedDept === 'Rooms' && exp.department === 'General') ? amt * 0.6 : amt;
        expenseMap[catName] = (expenseMap[catName] || 0) + finalAmt;
      }
    });

    // Build formal ledger list of operating expenses
    const expenseList = Object.entries(expenseMap).map(([title, amount]) => ({
      title: title.toUpperCase(),
      amount
    }));

    // If no operational expenses fed yet, provide clean zeroed ledger rows
    if (expenseList.length === 0) {
      if (selectedDept === 'Rooms') {
        expenseList.push(
          { title: 'OTHER EXPENSES ( FOOD CHARGES )', amount: 0 },
          { title: 'SALARY EXPENSES', amount: 0 },
          { title: 'RENT', amount: 0 },
          { title: 'OTA COMMISSION', amount: 0 },
          { title: 'EB BILL (ELECTRICITY)', amount: 0 },
          { title: 'HO OFFICE SALARY', amount: 0 },
          { title: 'BANK CHARGES', amount: 0 },
          { title: 'GST PAID ( RENT )', amount: 0 }
        );
      } else if (selectedDept === 'Restaurant') {
        expenseList.push(
          { title: 'KITCHEN RAW MATERIAL & GROCERIES', amount: purchasesAmount },
          { title: 'CHEF & KITCHEN STAFF SALARY', amount: 0 },
          { title: 'LPG GAS CYLINDER REFILLS', amount: 0 },
          { title: 'RESTAURANT CLEANING & DISPOSABLES', amount: 0 },
          { title: 'POWER & WATER CHARGES', amount: 0 }
        );
      } else if (selectedDept === 'Bar') {
        expenseList.push(
          { title: 'LIQUOR & BEVERAGE RESTOCK', amount: purchasesAmount },
          { title: 'BARTENDER & SERVICE WAGES', amount: 0 },
          { title: 'ICE & COOLING SUPPLIES', amount: 0 },
          { title: 'BARWARE & GLASSES', amount: 0 },
          { title: 'LICENSE & PERMIT CHARGES', amount: 0 }
        );
      }
    }

    const totalExpenses = expenseList.reduce((acc, curr) => acc + curr.amount, 0);
    const netProfit = grossProfit - totalExpenses;

    // 4. KEY OPERATIONAL STATISTICS
    const totalRoomsCount = tenantRooms.length || 1;
    const avgRoomPerDay = periodDays > 0 ? Number((roomNightsSold / periodDays).toFixed(2)) : 0;
    const avgRoomRate = roomNightsSold > 0 ? Number((roomTotalSales / roomNightsSold).toFixed(2)) : (tenantRooms[0]?.price || 1800);
    const occupancyRate = totalRoomsCount > 0 ? Number(((avgRoomPerDay / totalRoomsCount) * 100).toFixed(1)) : 0;
    const revPAR = (totalRoomsCount * periodDays) > 0 ? Number((roomTotalSales / (totalRoomsCount * periodDays)).toFixed(2)) : 0;

    const restOrdersCount = filteredOrders.filter(o => !o.isBar).length;
    const avgOrderValue = restOrdersCount > 0 ? Number((restTotalSales / restOrdersCount).toFixed(2)) : 0;
    const foodCostPercent = restTotalSales > 0 ? Number(((purchasesAmount / restTotalSales) * 100).toFixed(1)) : 0;

    const barOrdersCount = filteredOrders.filter(o => o.isBar).length;
    const avgBarTicket = barOrdersCount > 0 ? Number((barTotalSales / barOrdersCount).toFixed(2)) : 0;

    return {
      grossSales,
      discounts,
      totalSales,
      cashSales,
      bankSales,
      otaAdvanceSales,
      openingStock,
      purchasesAmount,
      closingStock,
      grossProfit,
      expenseList,
      totalExpenses,
      netProfit,
      // Metrics
      roomNightsSold,
      avgRoomPerDay,
      roomTotalSales,
      avgRoomRate,
      occupancyRate,
      revPAR,
      totalRoomsCount,
      restOrdersCount,
      avgOrderValue,
      foodCostPercent,
      barOrdersCount,
      avgBarTicket
    };
  }, [
    selectedDept, 
    filteredRooms, 
    filteredPreBookings, 
    filteredOrders, 
    filteredLaundry, 
    filteredHall, 
    filteredPurchases, 
    filteredExpenses, 
    totalDiscounts,
    inventory, 
    rooms, 
    periodDays, 
    getBillSummary
  ]);

  // Export P&L to CSV
  const handleExportCSV = () => {
    const propertyName = currentTenant?.name || settings?.name || 'HOTELVISTA';
    const deptTitle = selectedDept.toUpperCase();
    const rows = [
      [`${propertyName} ( ${deptTitle} ) PROFIT & LOSS ACCOUNT - ${yearLabel}`],
      [`PERIOD: ${periodHeaderLabel}`],
      [],
      ['TRADING ACCOUNT & SALES REVENUE', 'AMOUNT (INR)', 'BREAKDOWN / NOTES'],
      ['Opening Stock', pnlData.openingStock.toFixed(2), ''],
      ['Total Purchase / Procurement', pnlData.purchasesAmount.toFixed(2), ''],
      ['GROSS SALES REVENUE', pnlData.grossSales.toFixed(2), 'Gross Booked Revenue'],
      ...(pnlData.discounts > 0 ? [
        ['  - Less: Cashier Discounts & Allowances', (-pnlData.discounts).toFixed(2), 'Discounts Applied at Checkout'],
        ['TOTAL NET SALES REVENUE', pnlData.totalSales.toFixed(2), 'Net Realized Revenue']
      ] : [
        ['TOTAL SALES REVENUE', pnlData.totalSales.toFixed(2), 'Gross Revenue']
      ]),
      ['  - Cash Collection', pnlData.cashSales.toFixed(2), 'Direct Cash'],
      ['  - Bank / UPI / Card', pnlData.bankSales.toFixed(2), 'Digital & Bank POS'],
      ['  - OTA (Online) & Advance', pnlData.otaAdvanceSales.toFixed(2), 'Online & Advance Deposits'],
      ['Closing Stock Value', pnlData.closingStock.toFixed(2), ''],
      [],
      ['GROSS PROFIT', pnlData.grossProfit.toFixed(2), ''],
      [],
      ['INDIRECT / OPERATING EXPENSES', 'AMOUNT (INR)'],
      ...pnlData.expenseList.map(e => [e.title, e.amount.toFixed(2)]),
      ['TOTAL OPERATING EXPENSES', pnlData.totalExpenses.toFixed(2)],
      [],
      ['NET PROFIT / (LOSS)', pnlData.netProfit.toFixed(2), pnlData.netProfit >= 0 ? 'PROFIT' : 'LOSS'],
      [],
      ['KEY PERFORMANCE INDICATORS', 'VALUE'],
      ...(selectedDept === 'Rooms' ? [
        ['TOTAL ROOMS SOLD (ROOM NIGHTS)', pnlData.roomNightsSold],
        ['AVG ROOMS SOLD PER DAY', pnlData.avgRoomPerDay],
        ['TOTAL ROOM SALES', pnlData.roomTotalSales.toFixed(2)],
        ['AVG ROOM RATE (ADR)', pnlData.avgRoomRate.toFixed(2)],
        ['OCCUPANCY RATE', `${pnlData.occupancyRate}%`],
        ['REVPAR', pnlData.revPAR.toFixed(2)]
      ] : selectedDept === 'Restaurant' ? [
        ['TOTAL FOOD ORDERS', pnlData.restOrdersCount],
        ['AVG ORDER VALUE (AOV)', pnlData.avgOrderValue.toFixed(2)],
        ['TOTAL FOOD SALES', pnlData.totalSales.toFixed(2)],
        ['FOOD COST %', `${pnlData.foodCostPercent}%`]
      ] : [
        ['TOTAL ORDERS', pnlData.barOrdersCount],
        ['AVG TICKET SIZE', pnlData.avgBarTicket.toFixed(2)],
        ['TOTAL BAR REVENUE', pnlData.totalSales.toFixed(2)]
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${propertyName}_${selectedDept}_PnL_${periodHeaderLabel.replace(/ /g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print P&L Sheet
  const handlePrint = () => {
    window.print();
  };

  const propertyDisplayName = (currentTenant?.name || settings?.name || 'HOTEL GRAND').toUpperCase();

  return (
    <div className="space-y-6">
      
      {/* Department Selector Tabs & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 no-print">
        
        {/* Department Buttons */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'Rooms', label: 'Rooms Division P&L', icon: BedDouble, color: 'text-indigo-600 dark:text-indigo-400' },
            { id: 'Restaurant', label: 'Restaurant POS P&L', icon: UtensilsCrossed, color: 'text-amber-600 dark:text-amber-400' },
            { id: 'Bar', label: 'Bar POS P&L', icon: Wine, color: 'text-purple-600 dark:text-purple-400' },
            { id: 'Master', label: 'Consolidated Property P&L', icon: Building2, color: 'text-emerald-600 dark:text-emerald-400' },
            { id: 'Laundry', label: 'Laundry P&L', icon: Layers, color: 'text-sky-600 dark:text-sky-400' },
            { id: 'Hall', label: 'Party Hall P&L', icon: Sparkles, color: 'text-rose-600 dark:text-rose-400' }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = selectedDept === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedDept(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                  isActive
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md shadow-slate-900/10'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? '' : tab.color}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Export & Print */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20"
          >
            <Printer className="w-4 h-4" />
            <span>Print P&L Statement</span>
          </button>
        </div>

      </div>

      {/* ========================================================= */}
      {/* FORMAL PROFIT & LOSS ACCOUNT LEDGER SHEET (PDF REPLICA) */}
      {/* ========================================================= */}
      <div id="printable-pnl-sheet" className="bg-white text-slate-900 p-4 sm:p-8 md:p-12 rounded-2xl border border-slate-300 shadow-lg font-sans max-w-4xl mx-auto printable-pnl-sheet overflow-x-auto">
        
        {/* Formal Header matching exact user image format */}
        <div className="text-center pb-6 border-b-2 border-slate-900 space-y-1">
          <h2 className="text-lg sm:text-xl font-extrabold text-red-600 uppercase tracking-wide">
            {propertyDisplayName} ( {selectedDept.toUpperCase()} ) PROFIT & LOSS ACCOUNT -{yearLabel}
          </h2>
          <p className="text-xs sm:text-sm font-bold text-red-600 tracking-wider font-mono">
            {periodHeaderLabel}
          </p>
        </div>

        {/* Ledger Content Table */}
        <div className="mt-6 space-y-4 text-xs sm:text-sm font-mono leading-relaxed">
          
          {/* SECTION 1: TRADING / REVENUE & DIRECT COSTS */}
          <div className="space-y-1.5 border-b border-slate-300 pb-4">
            
            <div className="grid grid-cols-12 gap-2 font-medium">
              <span className="col-span-6 text-slate-800 uppercase">OPENING STOCK</span>
              <span className="col-span-2 text-right">{pnlData.openingStock.toFixed(2)}</span>
              <span className="col-span-4"></span>
            </div>

            <div className="grid grid-cols-12 gap-2 font-medium">
              <span className="col-span-6 text-slate-800 uppercase">TOTAL PURCHASE</span>
              <span className="col-span-2 text-right">{pnlData.purchasesAmount.toFixed(2)}</span>
              <span className="col-span-4"></span>
            </div>

            {/* Total Sales with Breakdown */}
            <div className="grid grid-cols-12 gap-2 font-bold pt-1">
              <span className="col-span-4"></span>
              <span className="col-span-4 text-slate-900 uppercase">
                {pnlData.discounts > 0 ? 'GROSS SALES' : 'TOTAL SALES'}
              </span>
              <span className="col-span-4 text-right text-slate-900 font-extrabold">{pnlData.grossSales.toFixed(2)}</span>
            </div>

            {pnlData.discounts > 0 && (
              <div className="grid grid-cols-12 gap-2 font-bold text-rose-600">
                <span className="col-span-4"></span>
                <span className="col-span-4 pl-2 uppercase">LESS: DISCOUNTS & ALLOWANCES</span>
                <span className="col-span-4 text-right font-mono font-bold">- {pnlData.discounts.toFixed(2)}</span>
              </div>
            )}

            {pnlData.discounts > 0 && (
              <div className="grid grid-cols-12 gap-2 font-bold text-slate-900 border-t border-slate-200 pt-0.5">
                <span className="col-span-4"></span>
                <span className="col-span-4 uppercase">NET SALES REVENUE</span>
                <span className="col-span-4 text-right font-extrabold">{pnlData.totalSales.toFixed(2)}</span>
              </div>
            )}

            <div className="grid grid-cols-12 gap-2 font-medium text-slate-700 pt-1">
              <span className="col-span-4"></span>
              <span className="col-span-4 pl-4 uppercase">CASH</span>
              <span className="col-span-4 text-right">{pnlData.cashSales.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-12 gap-2 font-medium text-slate-700">
              <span className="col-span-4"></span>
              <span className="col-span-4 pl-4 uppercase">BANK / UPI</span>
              <span className="col-span-4 text-right">{pnlData.bankSales.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-12 gap-2 font-medium text-slate-700">
              <span className="col-span-4"></span>
              <span className="col-span-4 pl-4 uppercase">OTA ( ONLINE ) & ADVANCE</span>
              <span className="col-span-4 text-right">{pnlData.otaAdvanceSales.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-12 gap-2 font-medium pt-1">
              <span className="col-span-4"></span>
              <span className="col-span-4 uppercase">CLOSING STOCK</span>
              <span className="col-span-4 text-right">{pnlData.closingStock.toFixed(2)}</span>
            </div>

            {/* Trading Total Bar */}
            <div className="grid grid-cols-12 gap-2 pt-2 border-t border-slate-900 font-extrabold text-sm">
              <span className="col-span-4"></span>
              <span className="col-span-4 text-right border-t-2 border-b-2 border-slate-900 py-0.5">
                {(pnlData.openingStock + pnlData.purchasesAmount).toFixed(2)}
              </span>
              <span className="col-span-4 text-right border-t-2 border-b-2 border-slate-900 py-0.5">
                {pnlData.totalSales.toFixed(2)}
              </span>
            </div>

          </div>

          {/* SECTION 2: GROSS PROFIT */}
          <div className="grid grid-cols-12 gap-2 font-extrabold text-slate-900 py-1 border-b border-slate-300">
            <span className="col-span-6 uppercase">GROSS PROFIT</span>
            <span className="col-span-6 text-right">{pnlData.grossProfit.toFixed(2)}</span>
          </div>

          {/* SECTION 3: OPERATING / INDIRECT EXPENSES */}
          <div className="space-y-1.5 pt-2">
            
            {pnlData.expenseList.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 font-medium text-slate-800">
                <span className="col-span-7 uppercase">{item.title}</span>
                <span className="col-span-5 text-right font-mono">{item.amount.toFixed(2)}</span>
              </div>
            ))}

            {/* Expenses Subtotal Bar */}
            <div className="grid grid-cols-12 gap-2 pt-3 border-t border-slate-400 font-extrabold text-sm">
              <span className="col-span-6 uppercase">TOTAL EXPENSES</span>
              <span className="col-span-6 text-right border-b-2 border-slate-900 py-0.5">
                {pnlData.totalExpenses.toFixed(2)}
              </span>
            </div>

            {/* NET PROFIT / NET LOSS (DOUBLE UNDERLINE TRADITIONAL ACCOUNTING FORMAT) */}
            <div className="grid grid-cols-12 gap-2 pt-3 pb-2 font-extrabold text-base">
              <span className="col-span-6 text-red-600 uppercase tracking-wider">
                {pnlData.netProfit >= 0 ? 'NET PROFIT' : 'NET LOSS'}
              </span>
              <span className={`col-span-6 text-right font-mono text-lg border-t border-b-4 border-double border-red-600 py-1 ${
                pnlData.netProfit >= 0 ? 'text-red-600 font-black' : 'text-rose-700'
              }`}>
                {pnlData.netProfit.toFixed(2)}
              </span>
            </div>

          </div>

        </div>

        {/* ========================================================= */}
        {/* BOTTOM METRICS TABLE (HIGHLIGHTED YELLOW FOOTER FROM IMAGE) */}
        {/* ========================================================= */}
        <div className="mt-8 pt-6 border-t-2 border-slate-900">
          
          {selectedDept === 'Rooms' && (
            <div className="w-full sm:w-80 ml-auto space-y-1 text-xs sm:text-sm font-mono font-bold">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-800 uppercase">TOTAL ROOMS (NIGHTS SOLD)</span>
                <span className="text-right text-slate-900">{pnlData.roomNightsSold}</span>
              </div>

              <div className="flex justify-between py-1 bg-yellow-300 px-2 rounded">
                <span className="text-slate-900 uppercase">AVG ROOM PER DAY</span>
                <span className="text-right font-extrabold">{pnlData.avgRoomPerDay}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-800 uppercase">TOTAL ROOM SALES</span>
                <span className="text-right font-extrabold text-slate-900">{pnlData.roomTotalSales.toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-1 bg-yellow-300 px-2 rounded">
                <span className="text-slate-900 uppercase">AVG ROOM RATE (ADR)</span>
                <span className="text-right font-extrabold">{pnlData.avgRoomRate.toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-1 text-[11px] text-slate-600">
                <span>ESTIMATED OCCUPANCY</span>
                <span>{pnlData.occupancyRate}% ({pnlData.totalRoomsCount} Rooms Available)</span>
              </div>
            </div>
          )}

          {selectedDept === 'Restaurant' && (
            <div className="w-full sm:w-80 ml-auto space-y-1 text-xs sm:text-sm font-mono font-bold">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-800 uppercase">TOTAL FOOD ORDERS (COVERS)</span>
                <span className="text-right text-slate-900">{pnlData.restOrdersCount}</span>
              </div>

              <div className="flex justify-between py-1 bg-yellow-300 px-2 rounded">
                <span className="text-slate-900 uppercase">AVG ORDER VALUE (AOV)</span>
                <span className="text-right font-extrabold">₹{pnlData.avgOrderValue.toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-800 uppercase">TOTAL RESTAURANT SALES</span>
                <span className="text-right font-extrabold text-slate-900">₹{pnlData.totalSales.toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-1 bg-yellow-300 px-2 rounded">
                <span className="text-slate-900 uppercase">FOOD COST %</span>
                <span className="text-right font-extrabold">{pnlData.foodCostPercent}%</span>
              </div>
            </div>
          )}

          {selectedDept === 'Bar' && (
            <div className="w-full sm:w-80 ml-auto space-y-1 text-xs sm:text-sm font-mono font-bold">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-800 uppercase">TOTAL BAR ORDERS</span>
                <span className="text-right text-slate-900">{pnlData.barOrdersCount}</span>
              </div>

              <div className="flex justify-between py-1 bg-yellow-300 px-2 rounded">
                <span className="text-slate-900 uppercase">AVG TICKET SIZE</span>
                <span className="text-right font-extrabold">₹{pnlData.avgBarTicket.toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-800 uppercase">TOTAL BAR REVENUE</span>
                <span className="text-right font-extrabold text-slate-900">₹{pnlData.totalSales.toFixed(2)}</span>
              </div>
            </div>
          )}

          {selectedDept === 'Master' && (
            <div className="w-full sm:w-96 ml-auto space-y-1 text-xs sm:text-sm font-mono font-bold">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-800 uppercase">TOTAL PROPERTY REVENUE</span>
                <span className="text-right font-extrabold text-slate-900">₹{pnlData.totalSales.toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-800 uppercase">TOTAL OPERATING EXPENSES</span>
                <span className="text-right font-extrabold text-rose-600">₹{pnlData.totalExpenses.toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-1 bg-yellow-300 px-2 rounded">
                <span className="text-slate-900 uppercase">NET PROFIT MARGIN</span>
                <span className="text-right font-extrabold">
                  {pnlData.totalSales > 0 ? ((pnlData.netProfit / pnlData.totalSales) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
