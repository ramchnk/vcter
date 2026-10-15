import React, { useState, useMemo } from 'react';
import { 
  Printer, 
  X, 
  Calendar, 
  Download, 
  Wine, 
  ArrowLeft, 
  DollarSign, 
  Boxes, 
  Receipt, 
  TrendingUp, 
  CreditCard, 
  Smartphone, 
  Banknote, 
  Bed, 
  ShoppingBag,
  Search,
  CheckCircle2
} from 'lucide-react';
import { useApp, InventoryItem, Order, PurchaseLog, Expense } from '../context/AppContext';

interface BarDayBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
}

export const BarDayBookModal: React.FC<BarDayBookModalProps> = ({
  isOpen,
  onClose,
  initialDate
}) => {
  const { 
    orders = [], 
    inventory = [], 
    purchaseLogs = [], 
    expenses = [], 
    menuItems = [],
    currentTenant, 
    tenantId, 
    activeTenantId,
    settings 
  } = useApp();

  const effectiveTenantId = currentTenant?.id || tenantId || activeTenantId;

  // Selected Report Date (defaults to today: YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [reportDate, setReportDate] = useState<string>(initialDate || todayStr);
  const [searchTerm, setSearchTerm] = useState<string>('');

  React.useEffect(() => {
    if (initialDate) setReportDate(initialDate);
  }, [initialDate]);

  const hotelName = currentTenant?.name || 'Hotel Subra Grand';

  // Format Report Date for display: DD / MM / YYYY
  const formattedReportDate = useMemo(() => {
    if (!reportDate) return '';
    const [y, m, d] = reportDate.split('-');
    return `${d} / ${m} / ${y}`;
  }, [reportDate]);

  const generatedTimestamp = useMemo(() => {
    const now = new Date();
    const [y, m, d] = (reportDate || todayStr).split('-');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${d}-${m}-${y} ${hh}:${mm}`;
  }, [reportDate, todayStr]);

  // Tenant-isolated datasets
  const tenantInventory = useMemo(() => {
    return (inventory || []).filter(i => !effectiveTenantId || !i.tenantId || i.tenantId === effectiveTenantId);
  }, [inventory, effectiveTenantId]);

  const tenantOrders = useMemo(() => {
    return (orders || []).filter(o => !effectiveTenantId || !o.tenantId || o.tenantId === effectiveTenantId);
  }, [orders, effectiveTenantId]);

  const tenantPurchases = useMemo(() => {
    return (purchaseLogs || []).filter(p => !effectiveTenantId || !p.tenantId || p.tenantId === effectiveTenantId);
  }, [purchaseLogs, effectiveTenantId]);

  const tenantExpenses = useMemo(() => {
    return (expenses || []).filter(e => !effectiveTenantId || !e.tenantId || e.tenantId === effectiveTenantId);
  }, [expenses, effectiveTenantId]);

  // 1. Bar Orders on Selected Report Date
  const barOrdersOnDate = useMemo(() => {
    return tenantOrders.filter(o => {
      const orderDate = o.timestamp ? o.timestamp.split('T')[0] : '';
      return o.isBar && orderDate === reportDate && (o.status as any) !== 'Cancelled';
    });
  }, [tenantOrders, reportDate]);

  // Total Bar Sales Value
  const totalBarSalesValue = useMemo(() => {
    return barOrdersOnDate.reduce((sum, o) => sum + Number(o.total || 0), 0);
  }, [barOrdersOnDate]);

  // 2. Collection Breakup (Cash, UPI, Card, Room)
  const salesBreakup = useMemo(() => {
    let cash = 0;
    let upi = 0;
    let card = 0;
    let room = 0;

    barOrdersOnDate.forEach(o => {
      const amt = Number(o.total || 0);
      const method = (o.paymentMethod || '').toLowerCase();
      if (o.type === 'Room' || method === 'room' || o.status === 'PostedToRoom') {
        room += amt;
      } else if (method.includes('upi') || method.includes('gpay') || method.includes('phonepe') || method.includes('qr') || method.includes('online')) {
        upi += amt;
      } else if (method.includes('card') || method.includes('pos')) {
        card += amt;
      } else if (method.includes('split') && o.splitDetails) {
        try {
          if (o.splitDetails.trim().startsWith('{')) {
            const split = JSON.parse(o.splitDetails);
            cash += Number(split.cash || 0);
            card += Number(split.card || 0);
            upi += Number(split.upi || 0);
          } else {
            const cMatch = o.splitDetails.match(/Cash:\s*₹?([0-9.]+)/i);
            const cardMatch = o.splitDetails.match(/Card:\s*₹?([0-9.]+)/i);
            const uMatch = o.splitDetails.match(/UPI:\s*₹?([0-9.]+)/i);
            if (cMatch || cardMatch || uMatch) {
              cash += cMatch ? Number(cMatch[1]) : 0;
              card += cardMatch ? Number(cardMatch[1]) : 0;
              upi += uMatch ? Number(uMatch[1]) : 0;
            } else {
              cash += amt;
            }
          }
        } catch {
          cash += amt;
        }
      } else {
        cash += amt; // Default walk-in bar order
      }
    });

    const total = cash + upi + card + room;
    return { cash, upi, card, room, total };
  }, [barOrdersOnDate]);

  // 3. Bar Purchases on Selected Report Date
  const barPurchasesOnDate = useMemo(() => {
    return tenantPurchases.filter(p => {
      const pDate = p.date || (p.timestamp ? p.timestamp.split('T')[0] : '');
      const cat = (p.category || '').toLowerCase();
      const isBarCat = cat.includes('liquor') || cat.includes('bar') || cat.includes('beer') || cat.includes('wine') || cat.includes('whisky') || cat.includes('brandy') || cat.includes('rum');
      return pDate === reportDate && isBarCat;
    });
  }, [tenantPurchases, reportDate]);

  const totalPurchaseValue = useMemo(() => {
    return barPurchasesOnDate.reduce((sum, p) => sum + Number(p.totalAmount || (p.quantity * (p.pricePerUnit || 0))), 0);
  }, [barPurchasesOnDate]);

  // 4. Bar Expenses on Selected Report Date
  const barExpensesOnDate = useMemo(() => {
    return tenantExpenses.filter(e => {
      const eDate = e.date ? e.date.split('T')[0] : '';
      const cat = (e.category || '').toLowerCase();
      const title = (e.title || '').toLowerCase();
      const isBarExp = cat.includes('bar') || cat.includes('liquor') || title.includes('bar') || title.includes('liquor');
      return eDate === reportDate && isBarExp;
    });
  }, [tenantExpenses, reportDate]);

  const totalBarExpenses = useMemo(() => {
    return barExpensesOnDate.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [barExpensesOnDate]);

  // 5. Item-wise Sold Quantities Map from Bar Orders
  const itemsSoldMap = useMemo(() => {
    const map = new Map<string, { qty: number; salesAmount: number; price: number }>();
    barOrdersOnDate.forEach(o => {
      (o.items || []).forEach(it => {
        const cleanName = (it.name || '').trim().toUpperCase();
        const existing = map.get(cleanName) || { qty: 0, salesAmount: 0, price: it.price || 0 };
        existing.qty += it.quantity || 1;
        existing.salesAmount += (it.price || 0) * (it.quantity || 1);
        map.set(cleanName, existing);
      });
    });
    return map;
  }, [barOrdersOnDate]);

  // 6. Purchases Map by Item Name
  const purchasesItemMap = useMemo(() => {
    const map = new Map<string, { qty: number; amount: number }>();
    barPurchasesOnDate.forEach(p => {
      const cleanName = (p.itemName || '').trim().toUpperCase();
      const existing = map.get(cleanName) || { qty: 0, amount: 0 };
      existing.qty += p.quantity || 0;
      existing.amount += Number(p.totalAmount || (p.quantity * (p.pricePerUnit || 0)));
      map.set(cleanName, existing);
    });
    return map;
  }, [barPurchasesOnDate]);

  // 7. Comprehensive Stock Movement Register (Opening, Inward, Outward, Closing)
  const stockRegister = useMemo(() => {
    // Only liquor / bar inventory items
    const barInventoryItems = tenantInventory.filter(i => {
      const cat = (i.category || '').toLowerCase();
      return (
        cat.includes('liquor') || 
        cat.includes('whisky') || 
        cat.includes('brandy') || 
        cat.includes('rum') || 
        cat.includes('beer') || 
        cat.includes('wine') || 
        cat.includes('vodka') || 
        cat.includes('gin') ||
        Boolean(i.bottleSizeMl && i.bottleSizeMl > 0)
      );
    });

    const rows: Array<{
      sNo: number;
      id: string;
      name: string;
      category: string;
      unit: string;
      costPrice: number;
      sellingPrice: number;
      openingStock: number;
      purchasesQty: number;
      soldQty: number;
      closingStock: number;
      openingValue: number;
      purchaseValue: number;
      closingValue: number;
      salesValue: number;
    }> = [];

    let totalOpeningVal = 0;
    let totalClosingVal = 0;
    let totalPurchasesVal = 0;
    let totalItemSalesVal = 0;

    barInventoryItems.forEach((item, idx) => {
      const cleanName = item.name.trim().toUpperCase();
      const soldData = itemsSoldMap.get(cleanName) || { qty: 0, salesAmount: 0, price: 0 };
      const purchData = purchasesItemMap.get(cleanName) || { qty: 0, amount: 0 };

      // Find matching menu item selling price if available
      const matchingMenu = menuItems.find(m => m.name.trim().toUpperCase() === cleanName);
      const sellingPrice = matchingMenu ? matchingMenu.price : (soldData.price || item.pricePerUnit || 0);
      const costPrice = item.pricePerUnit || (sellingPrice * 0.4); // Cost estimation fallback

      const closingStock = Number(item.stock || 0);
      const soldQty = soldData.qty;
      const purchasesQty = purchData.qty;

      // Mathematical accounting equality: Opening + Purchases - Sold = Closing
      // => Opening = Closing + Sold - Purchases
      const openingStock = Math.max(0, closingStock + soldQty - purchasesQty);

      const openingValue = openingStock * costPrice;
      const closingValue = closingStock * costPrice;
      const purchaseValue = purchasesQty * costPrice;
      const salesValue = soldData.salesAmount || (soldQty * sellingPrice);

      totalOpeningVal += openingValue;
      totalClosingVal += closingValue;
      totalPurchasesVal += purchaseValue;
      totalItemSalesVal += salesValue;

      rows.push({
        sNo: idx + 1,
        id: item.id,
        name: cleanName,
        category: item.category || 'Liquor',
        unit: item.unit || 'btl',
        costPrice,
        sellingPrice,
        openingStock,
        purchasesQty,
        soldQty,
        closingStock,
        openingValue,
        purchaseValue,
        closingValue,
        salesValue
      });
    });

    // Also include any menu item sold that might not be mapped directly to inventory SKU
    itemsSoldMap.forEach((soldVal, soldKey) => {
      if (!rows.some(r => r.name === soldKey)) {
        rows.push({
          sNo: rows.length + 1,
          id: `extra_${soldKey}`,
          name: soldKey,
          category: 'Bar Sales',
          unit: 'pcs',
          costPrice: soldVal.price * 0.4,
          sellingPrice: soldVal.price,
          openingStock: 0,
          purchasesQty: 0,
          soldQty: soldVal.qty,
          closingStock: 0,
          openingValue: 0,
          purchaseValue: 0,
          closingValue: 0,
          salesValue: soldVal.salesAmount
        });
        totalItemSalesVal += soldVal.salesAmount;
      }
    });

    return {
      rows,
      totals: {
        openingValue: totalOpeningVal,
        purchaseValue: totalPurchaseValue > 0 ? totalPurchaseValue : totalPurchasesVal,
        closingValue: totalClosingVal,
        salesValue: totalBarSalesValue > 0 ? totalBarSalesValue : totalItemSalesVal
      }
    };
  }, [tenantInventory, itemsSoldMap, purchasesItemMap, menuItems, totalPurchaseValue, totalBarSalesValue]);

  // Overall Financial Summary Values (Opening Stock, Closing Stock, Sales, COGS)
  const openingStockValue = stockRegister.totals.openingValue;
  const closingStockValue = stockRegister.totals.closingValue;
  const salesValue = totalBarSalesValue > 0 ? totalBarSalesValue : stockRegister.totals.salesValue;
  const purchasesValue = totalPurchaseValue > 0 ? totalPurchaseValue : stockRegister.totals.purchaseValue;
  
  // Cost of Goods Sold (COGS) = Opening Stock + Purchases - Closing Stock
  const cogs = Math.max(0, (openingStockValue + purchasesValue) - closingStockValue);
  const grossProfit = Math.max(0, salesValue - cogs);
  const netCashInHand = Math.max(0, salesBreakup.cash - totalBarExpenses);

  // Search filtered rows for display
  const displayedStockRows = useMemo(() => {
    if (!searchTerm.trim()) return stockRegister.rows;
    const term = searchTerm.toLowerCase().trim();
    return stockRegister.rows.filter(r => 
      r.name.toLowerCase().includes(term) || 
      r.category.toLowerCase().includes(term)
    );
  }, [stockRegister.rows, searchTerm]);

  // Print function using isolated iframe for exact A4 printout
  const handlePrint = () => {
    const printArea = document.getElementById('bar-daybook-print-container');
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
          <title>Bar Day Book - ${formattedReportDate}</title>
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
              text-transform: uppercase;
            }
            .report-date {
              font-size: 9pt;
              font-weight: 700;
              color: #475569;
              margin-bottom: 2px;
            }
            .report-title {
              font-size: 14pt;
              font-weight: 900;
              color: #581c87;
              letter-spacing: -0.3px;
              text-transform: uppercase;
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
              background-color: #f8fafc;
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
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-bold { font-weight: 700; }
            .text-purple { color: #6b21a8; }
            .text-emerald { color: #047857; }
            .bg-highlight { background-color: #f3e8ff !important; font-weight: 700; }
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Top Action & Navigation Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-purple-500/20">
                <Wine className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                  Bar & Lounge Day Book
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Daily Opening Stock, Purchases, Sales, Closing Stock & Collection Report
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Date Picker */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
              <Calendar className="w-3.5 h-3.5 text-purple-600" />
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
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all shadow-purple-500/20"
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
          
          {/* Printable Report Container */}
          <div 
            id="bar-daybook-print-container" 
            className="bg-white text-slate-900 p-8 sm:p-10 rounded-xl shadow-sm border border-slate-200 max-w-[900px] mx-auto text-[11px] leading-relaxed select-text"
          >
            
            {/* Header */}
            <div className="text-center mb-5">
              <h1 className="text-base font-extrabold text-slate-900 uppercase tracking-wide">{hotelName}</h1>
              <p className="text-xs font-bold text-slate-700 mt-0.5">DATE: {formattedReportDate}</p>
              <h2 className="text-lg font-black text-purple-900 mt-1 uppercase tracking-tight">Bar & Lounge Day Book (Stock & Sales Report)</h2>
              <p className="text-[10px] text-slate-500 mt-0.5">Generated: {generatedTimestamp}</p>
            </div>

            {/* 1. EXECUTIVE FINANCIAL & STOCK SUMMARY (What user explicitly requested!) */}
            <div className="mb-4">
              <h3 className="text-xs font-bold text-slate-900 mb-1 flex items-center justify-between">
                <span>1. Stock & Sales Executive Summary</span>
                <span className="text-[10px] font-normal text-slate-500 italic">Figures in Indian Rupees (₹)</span>
              </h3>
              <table className="w-full border-collapse border border-slate-300 text-[10px]">
                <thead>
                  <tr className="bg-purple-50 text-purple-950">
                    <th className="border border-slate-300 p-1.5 text-left font-bold w-3/5">Financial / Stock Metric</th>
                    <th className="border border-slate-300 p-1.5 text-right font-bold w-2/5">Value (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-1.5 font-bold text-slate-800">OPENING STOCK VALUE</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono font-bold text-slate-900">
                      ₹ {openingStockValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-1.5 font-medium text-slate-700">PURCHASE VALUE (INWARD TODAY)</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono font-medium text-slate-800">
                      ₹ {purchasesValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="bg-emerald-50/50">
                    <td className="border border-slate-300 p-1.5 font-black text-emerald-800">BAR TOTAL SALES VALUE</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono font-black text-emerald-700">
                      ₹ {salesValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="bg-purple-50/40">
                    <td className="border border-slate-300 p-1.5 font-black text-purple-900">CLOSING STOCK VALUE</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono font-black text-purple-900">
                      ₹ {closingStockValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-1.5 text-slate-600">Cost of Goods Sold (COGS)</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono text-slate-700">
                      ₹ {cogs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="border border-slate-300 p-1.5">Gross Profit (Sales - COGS)</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono text-emerald-700">
                      ₹ {grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 2. SALES COLLECTION BREAKUP */}
            <div className="mb-4">
              <h3 className="text-xs font-bold text-slate-900 mb-1">2. Total Sale — Collection Breakup</h3>
              <table className="w-full border-collapse border border-slate-300 text-[10px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="border border-slate-300 p-1 text-left font-bold w-3/5">Payment Mode</th>
                    <th className="border border-slate-300 p-1 text-right font-bold w-2/5">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-1 font-medium">Cash Sales</td>
                    <td className="border border-slate-300 p-1 text-right font-mono font-medium">
                      ₹ {salesBreakup.cash.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-1 font-medium">UPI / QR (G-Pay / PhonePe / Online)</td>
                    <td className="border border-slate-300 p-1 text-right font-mono font-medium">
                      ₹ {salesBreakup.upi.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-1 font-medium">Card / POS</td>
                    <td className="border border-slate-300 p-1 text-right font-mono font-medium">
                      ₹ {salesBreakup.card.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-1 font-medium">Room Settlement (Posted to Room Folio)</td>
                    <td className="border border-slate-300 p-1 text-right font-mono font-medium">
                      ₹ {salesBreakup.room.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="font-bold bg-slate-100">
                    <td className="border border-slate-300 p-1">TOTAL BAR SALES</td>
                    <td className="border border-slate-300 p-1 text-right font-mono font-bold text-purple-900">
                      ₹ {salesBreakup.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 3. ITEM-WISE STOCK MOVEMENT & SALES REGISTER */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-bold text-slate-900">3. Item-wise Liquor Stock & Sales Register</h3>
                <div className="relative print:hidden">
                  <Search className="w-3 h-3 absolute left-2 top-1.5 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Search brand/SKU..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-6 pr-2 py-0.5 text-[10px] border border-slate-300 rounded-md focus:outline-none"
                  />
                </div>
              </div>

              <table className="w-full border-collapse border border-slate-300 text-[9px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold">
                    <th className="border border-slate-300 p-1 text-center w-8">S.No.</th>
                    <th className="border border-slate-300 p-1 text-left">Brand / SKU Name</th>
                    <th className="border border-slate-300 p-1 text-center">Category</th>
                    <th className="border border-slate-300 p-1 text-center">Unit</th>
                    <th className="border border-slate-300 p-1 text-right">Op. Stock</th>
                    <th className="border border-slate-300 p-1 text-right">Purchases</th>
                    <th className="border border-slate-300 p-1 text-right font-bold text-emerald-700">Sold</th>
                    <th className="border border-slate-300 p-1 text-right font-bold text-purple-900">Cl. Stock</th>
                    <th className="border border-slate-300 p-1 text-right">Sale Price</th>
                    <th className="border border-slate-300 p-1 text-right font-bold">Sales Value (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedStockRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="border border-slate-300 p-2 text-center text-slate-400">
                        No inventory stock items matching filter.
                      </td>
                    </tr>
                  ) : (
                    displayedStockRows.map(row => (
                      <tr key={row.id} className={row.soldQty > 0 ? 'bg-purple-50/30' : ''}>
                        <td className="border border-slate-300 p-1 text-center font-mono">{row.sNo}</td>
                        <td className="border border-slate-300 p-1 font-bold">{row.name}</td>
                        <td className="border border-slate-300 p-1 text-center text-slate-600">{row.category}</td>
                        <td className="border border-slate-300 p-1 text-center text-slate-500">{row.unit}</td>
                        <td className="border border-slate-300 p-1 text-right font-mono">{row.openingStock}</td>
                        <td className="border border-slate-300 p-1 text-right font-mono text-slate-600">{row.purchasesQty}</td>
                        <td className="border border-slate-300 p-1 text-right font-mono font-bold text-emerald-700">
                          {row.soldQty > 0 ? row.soldQty : '—'}
                        </td>
                        <td className="border border-slate-300 p-1 text-right font-mono font-bold text-purple-900">
                          {row.closingStock}
                        </td>
                        <td className="border border-slate-300 p-1 text-right font-mono text-slate-600">
                          ₹{row.sellingPrice.toFixed(0)}
                        </td>
                        <td className="border border-slate-300 p-1 text-right font-mono font-bold">
                          {row.salesValue > 0 ? `₹${row.salesValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                  <tr className="font-bold bg-slate-100">
                    <td colSpan={4} className="border border-slate-300 p-1 text-left">TOTAL</td>
                    <td className="border border-slate-300 p-1 text-right font-mono">
                      ₹{openingStockValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="border border-slate-300 p-1 text-right font-mono">
                      ₹{purchasesValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="border border-slate-300 p-1 text-right font-mono text-emerald-700">
                      {displayedStockRows.reduce((sum, r) => sum + r.soldQty, 0)}
                    </td>
                    <td className="border border-slate-300 p-1 text-right font-mono text-purple-900">
                      ₹{closingStockValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="border border-slate-300 p-1"></td>
                    <td className="border border-slate-300 p-1 text-right font-mono font-bold">
                      ₹{salesValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 4. BILLED ORDERS & RECEIPTS */}
            <div className="mb-4">
              <h3 className="text-xs font-bold text-slate-900 mb-1">
                4. Billed Orders & Receipts ({barOrdersOnDate.length} Orders)
              </h3>
              <table className="w-full border-collapse border border-slate-300 text-[9.5px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold">
                    <th className="border border-slate-300 p-1 text-center w-8">S.No.</th>
                    <th className="border border-slate-300 p-1 text-center">Order #</th>
                    <th className="border border-slate-300 p-1 text-center">Table / Destination</th>
                    <th className="border border-slate-300 p-1 text-left">Guest Name</th>
                    <th className="border border-slate-300 p-1 text-left">Items Sold</th>
                    <th className="border border-slate-300 p-1 text-center">Payment Mode</th>
                    <th className="border border-slate-300 p-1 text-right font-bold">Amount (₹)</th>
                    <th className="border border-slate-300 p-1 text-center">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {barOrdersOnDate.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="border border-slate-300 p-2 text-center text-slate-400">
                        No bar orders recorded on this date.
                      </td>
                    </tr>
                  ) : (
                    barOrdersOnDate.map((o, idx) => {
                      const timeStr = o.timestamp ? new Date(o.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
                      const itemsText = (o.items || []).map(i => `${i.name} (${i.quantity})`).join(', ');
                      return (
                        <tr key={o.id || idx}>
                          <td className="border border-slate-300 p-1 text-center font-mono">{idx + 1}</td>
                          <td className="border border-slate-300 p-1 text-center font-mono font-bold text-purple-700">{o.orderNumber}</td>
                          <td className="border border-slate-300 p-1 text-center font-semibold">
                            {o.tableNumber ? `Table ${o.tableNumber}` : (o.roomNumber ? `Room ${o.roomNumber}` : 'Bar Counter')}
                          </td>
                          <td className="border border-slate-300 p-1">{o.guestName || 'Bar Guest'}</td>
                          <td className="border border-slate-300 p-1 truncate max-w-[200px]" title={itemsText}>{itemsText}</td>
                          <td className="border border-slate-300 p-1 text-center font-medium">
                            <div>{o.paymentMethod || 'Cash'}</div>
                            {o.splitDetails && (
                              <div className="text-[8px] text-slate-500 font-mono leading-tight">{o.splitDetails}</div>
                            )}
                          </td>
                          <td className="border border-slate-300 p-1 text-right font-mono font-bold">
                            ₹{Number(o.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="border border-slate-300 p-1 text-center font-mono">{timeStr}</td>
                        </tr>
                      );
                    })
                  )}
                  <tr className="font-bold bg-slate-100">
                    <td colSpan={6} className="border border-slate-300 p-1 text-left">TOTAL BAR SALES</td>
                    <td className="border border-slate-300 p-1 text-right font-mono font-bold text-purple-900">
                      ₹{totalBarSalesValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="border border-slate-300 p-1"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 5. BAR EXPENSES & RECONCILIATION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
              <div>
                <h3 className="text-xs font-bold text-slate-900 mb-1">5. Bar Expenses / DayBook Out</h3>
                <table className="w-full border-collapse border border-slate-300 text-[9.5px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold">
                      <th className="border border-slate-300 p-1 text-left">Expense Particular</th>
                      <th className="border border-slate-300 p-1 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {barExpensesOnDate.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="border border-slate-300 p-1.5 text-center text-slate-400">No bar expenses on this date.</td>
                      </tr>
                    ) : (
                      barExpensesOnDate.map((e, idx) => (
                        <tr key={idx}>
                          <td className="border border-slate-300 p-1">{e.title || e.category || 'General Expense'}</td>
                          <td className="border border-slate-300 p-1 text-right font-mono">₹{Number(e.amount || 0).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                    <tr className="bg-slate-100 font-bold">
                      <td className="border border-slate-300 p-1">TOTAL EXPENSES</td>
                      <td className="border border-slate-300 p-1 text-right font-mono">₹{totalBarExpenses.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-900 mb-1">6. Cash In Hand Reconciliation</h3>
                <table className="w-full border-collapse border border-slate-300 text-[9.5px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold">
                      <th className="border border-slate-300 p-1 text-left">Cash Flow Particular</th>
                      <th className="border border-slate-300 p-1 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 p-1">Gross Cash Sales</td>
                      <td className="border border-slate-300 p-1 text-right font-mono font-bold text-slate-800">
                        ₹{salesBreakup.cash.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-1 text-red-600">Less: Cash Expenses</td>
                      <td className="border border-slate-300 p-1 text-right font-mono text-red-600 font-medium">
                        - ₹{totalBarExpenses.toFixed(2)}
                      </td>
                    </tr>
                    <tr className="bg-emerald-50 font-bold text-emerald-900">
                      <td className="border border-slate-300 p-1">NET CASH IN HAND</td>
                      <td className="border border-slate-300 p-1 text-right font-mono font-black text-emerald-700">
                        ₹{netCashInHand.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-[9px] text-slate-500 italic mt-1.5">
                  Official Bar Day Book summary generated from HotelVista ERP. Retain printed copy with cashier sign.
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
