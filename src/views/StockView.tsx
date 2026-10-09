import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Package, 
  Plus, 
  AlertTriangle, 
  FileSpreadsheet, 
  ArrowDownCircle, 
  ArrowUpCircle,
  Calendar,
  Download,
  RefreshCw,
  BarChart3,
  TrendingUp,
  DollarSign,
  Search,
  Trash2,
  Edit2,
  X,
  Check
} from 'lucide-react';
import { InventoryItem } from '../context/AppContext';

export const StockView: React.FC = () => {
  const { 
    inventory, 
    purchaseLogs, 
    stockAdjustmentLogs,
    addInventoryItem, 
    updateInventoryItem,
    deleteInventoryItem,
    recordPurchase, 
    updateStockLevel 
  } = useApp();

  // Purchase Form
  const [supplier, setSupplier] = useState('');
  const [purchaseItemName, setPurchaseItemName] = useState('');
  const [purchaseCategory, setPurchaseCategory] = useState<string>('Room Supplies');
  const [isAddingPurchaseCustomCategory, setIsAddingPurchaseCustomCategory] = useState(false);
  const [purchaseCustomCategoryInput, setPurchaseCustomCategoryInput] = useState('');
  const [qty, setQty] = useState(0);
  const [pricePerUnit, setPricePerUnit] = useState(0);
  const [unit, setUnit] = useState('pcs');
  const [gstPercent, setGstPercent] = useState(18);
  const [expiryDate, setExpiryDate] = useState('');

  // Stock Adjust Form (In / Out) with Category & Description
  const [adjustItemId, setAdjustItemId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState<number | ''>('');
  const [adjustDirection, setAdjustDirection] = useState<'in' | 'out'>('out');
  const [adjustCategory, setAdjustCategory] = useState<string>('');
  const [adjustDescription, setAdjustDescription] = useState<string>('');

  // New Item Track Form
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<string>('Room Supplies');
  const [newItemBottleSizeMl, setNewItemBottleSizeMl] = useState<number>(750);
  const [isCustomMl, setIsCustomMl] = useState(false);
  const [isAddingCustomCategory, setIsAddingCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [newItemMinStock, setNewItemMinStock] = useState(5);
  const [newItemUnit, setNewItemUnit] = useState('pcs');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const LIQUOR_ML_PRESETS = [180, 375, 500, 650, 750, 1000];
  const isLiquorCategory = (cat: string) => (cat || '').trim().toLowerCase() === 'liquor';

  const formatStockBreakdown = (stock: number, unit: string, bottleSizeMl?: number, category?: string) => {
    const isLiquor = isLiquorCategory(category || '') || Boolean(bottleSizeMl && bottleSizeMl > 0);
    const bottleSize = bottleSizeMl || 750;
    const isBottleUnit = (unit || '').toLowerCase().includes('bottle') || 
                         (unit || '').toLowerCase().includes('btl') || 
                         (unit || '').toLowerCase().includes('pcs') ||
                         (unit || '').toLowerCase().includes('units') ||
                         (unit || '').toLowerCase().includes('nos');

    if (isLiquor && bottleSize > 0 && isBottleUnit && stock >= 0) {
      const fullBottles = Math.floor(stock);
      const decimal = parseFloat((stock - fullBottles).toFixed(4));
      const remainingMl = Math.round(decimal * bottleSize);

      if (fullBottles > 0 && remainingMl > 0) {
        return {
          primary: `${fullBottles} Btl + ${remainingMl}ml`,
          secondary: `${stock} btl`,
          hasBreakdown: true
        };
      } else if (fullBottles === 0 && remainingMl > 0) {
        return {
          primary: `${remainingMl}ml`,
          secondary: `${stock} btl`,
          hasBreakdown: true
        };
      } else {
        return {
          primary: `${fullBottles} ${unit || 'btl'}`,
          secondary: null,
          hasBreakdown: false
        };
      }
    }

    return {
      primary: `${parseFloat(Number(stock).toFixed(2))} ${unit}`,
      secondary: null,
      hasBreakdown: false
    };
  };

  // Edit Stock Item State
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editFormData, setEditFormData] = useState<{
    name: string;
    category: string;
    stock: number;
    minStock: number;
    unit: string;
    barcode: string;
    bottleSizeMl?: number;
    pricePerUnit?: number;
    expiryDate?: string;
  }>({
    name: '',
    category: 'Room Supplies',
    stock: 0,
    minStock: 5,
    unit: 'pcs',
    barcode: ''
  });
  const [isAddingEditCustomCategory, setIsAddingEditCustomCategory] = useState(false);
  const [editCustomCategoryInput, setEditCustomCategoryInput] = useState('');
  const [editError, setEditError] = useState('');

  // Custom categories state persisted in localStorage
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('hv_custom_stock_categories');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const DEFAULT_CATEGORIES = ['Liquor', 'Food', 'Cleaning', 'Laundry', 'Room Supplies', 'Kitchen', 'Housekeeping'];

  // All combined dynamic categories
  const categories = React.useMemo(() => {
    const list = [...DEFAULT_CATEGORIES];
    customCategories.forEach(cat => {
      if (cat && !list.some(c => c.toLowerCase() === cat.toLowerCase())) {
        list.push(cat);
      }
    });
    inventory.forEach(item => {
      if (item.category && !list.some(c => c.toLowerCase() === item.category.toLowerCase())) {
        list.push(item.category);
      }
    });
    purchaseLogs.forEach(p => {
      if (p.category && !list.some(c => c.toLowerCase() === p.category.toLowerCase())) {
        list.push(p.category);
      }
    });
    stockAdjustmentLogs.forEach(a => {
      if (a.category && !list.some(c => c.toLowerCase() === a.category.toLowerCase())) {
        list.push(a.category);
      }
    });
    return list;
  }, [customCategories, inventory, purchaseLogs, stockAdjustmentLogs]);

  const saveCustomCategory = (newCat: string) => {
    const trimmed = newCat.trim();
    if (!trimmed) return trimmed;
    const existing = categories.find(c => c.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;

    const updated = [...customCategories, trimmed];
    setCustomCategories(updated);
    try {
      localStorage.setItem('hv_custom_stock_categories', JSON.stringify(updated));
    } catch (err) {
      console.error('Failed saving custom categories to localStorage', err);
    }
    return trimmed;
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setEditFormData({
      name: item.name || '',
      category: item.category || 'Room Supplies',
      stock: item.stock || 0,
      minStock: item.minStock || 5,
      unit: item.unit || 'pcs',
      barcode: item.barcode || '',
      bottleSizeMl: item.bottleSizeMl,
      pricePerUnit: item.pricePerUnit,
      expiryDate: item.expiryDate || ''
    });
    setIsAddingEditCustomCategory(false);
    setEditCustomCategoryInput('');
    setEditError('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!editFormData.name.trim()) {
      setEditError('Item name is required');
      return;
    }

    const updates: Partial<InventoryItem> = {
      name: editFormData.name.trim(),
      category: editFormData.category,
      stock: Number(editFormData.stock),
      minStock: Number(editFormData.minStock),
      unit: editFormData.unit.trim(),
      barcode: editFormData.barcode.trim(),
      bottleSizeMl: editFormData.bottleSizeMl ? Number(editFormData.bottleSizeMl) : undefined,
      pricePerUnit: editFormData.pricePerUnit ? Number(editFormData.pricePerUnit) : undefined,
      expiryDate: editFormData.expiryDate || undefined
    };

    const res = await updateInventoryItem(editingItem.id, updates);
    if (res?.success !== false) {
      setEditingItem(null);
      setSuccessMsg(`Stock item "${editFormData.name}" updated successfully!`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setEditError(res?.error || 'Failed to update stock item');
    }
  };

  // Tabs for sub-views (persisted on reload)
  const [activeSubTab, setActiveSubTab] = useState<'ledger' | 'purchases' | 'adjust' | 'reports'>(() => {
    const saved = localStorage.getItem('hotelvista_stock_subtab');
    return (saved as any) || 'ledger';
  });

  React.useEffect(() => {
    localStorage.setItem('hotelvista_stock_subtab', activeSubTab);
  }, [activeSubTab]);

  // Search Filter State for Stock Reports & Tables
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Date Range State for Reports Tab
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'yesterday' | '7days' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Calculate totals for purchases
  const subtotal = qty * pricePerUnit;
  const gstAmount = parseFloat(((subtotal * gstPercent) / 100).toFixed(2));
  const totalPurchaseCost = subtotal + gstAmount;

  // Handle Preset selection
  const applyDatePreset = (preset: 'all' | 'today' | 'yesterday' | '7days' | 'month' | 'custom') => {
    setDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === '7days') {
      const d7 = new Date();
      d7.setDate(d7.getDate() - 7);
      setStartDate(d7.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const mStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      setStartDate(mStart);
      setEndDate(todayStr);
    }
  };

  const isDateInRange = (dateStr: string | undefined) => {
    if (!dateStr) return true;
    if (!startDate && !endDate) return true;
    const formatted = dateStr.split('T')[0].split(' ')[0];
    if (startDate && formatted < startDate) return false;
    if (endDate && formatted > endDate) return false;
    return true;
  };

  // Search & Filter Helpers
  const searchLower = (searchTerm || '').toLowerCase().trim();

  const filteredInventory = (inventory || []).filter(i => {
    if (!i) return false;
    return (
      !searchLower || 
      (i.name || '').toLowerCase().includes(searchLower) ||
      (i.category || '').toLowerCase().includes(searchLower) ||
      (i.barcode && (i.barcode || '').toLowerCase().includes(searchLower))
    );
  });

  const filteredPurchases = (purchaseLogs || []).filter(p => {
    if (!p) return false;
    return (
      isDateInRange(p.date) &&
      (!searchLower || 
        (p.itemName || '').toLowerCase().includes(searchLower) ||
        (p.category || '').toLowerCase().includes(searchLower) ||
        (p.supplier || '').toLowerCase().includes(searchLower)
      )
    );
  });

  const filteredAdjustments = (stockAdjustmentLogs || []).filter(a => {
    if (!a) return false;
    return (
      isDateInRange(a.date) &&
      (!searchLower || 
        (a.itemName || '').toLowerCase().includes(searchLower) ||
        (a.category || '').toLowerCase().includes(searchLower) ||
        (a.description || '').toLowerCase().includes(searchLower) ||
        (a.direction || '').toLowerCase().includes(searchLower)
      )
    );
  });

  const totalPurchaseSpend = filteredPurchases.reduce((acc, p) => acc + p.totalAmount, 0);
  const totalPurchaseGst = filteredPurchases.reduce((acc, p) => acc + (p.gstAmount || 0), 0);

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

  const handleExportStockReport = () => {
    const dateTag = startDate && endDate ? `_${startDate}_to_${endDate}` : '_all_time';
    const rows: (string | number)[][] = [
      ['HOTELVISTA ERP - STOCK INVENTORY, ADJUSTMENTS & PURCHASES REPORT'],
      ['Filter Period', startDate && endDate ? `${startDate} to ${endDate}` : 'All Time'],
      ['Search Filter', searchTerm || 'None'],
      ['Generated On', new Date().toLocaleString()],
      [],
      ['1. INVENTORY SUMMARY KPI'],
      ['Total SKUs Tracked', inventory.length],
      ['Low Stock Alert Items', lowStockItems.length],
      ['Stock Adjustments Logged', filteredAdjustments.length],
      ['Total Purchase Expenses (INR)', totalPurchaseSpend],
      ['Total GST Duties Paid (INR)', totalPurchaseGst],
      [],
      ['2. ACTIVE INVENTORY STOCK LEVELS'],
      ['SKU / Item Name', 'Category', 'Bottle Size (ML)', 'Barcode', 'Current Stock', 'Min Stock Threshold', 'Unit', 'Stock Status'],
    ];

    filteredInventory.forEach(i => {
      const isLow = i.stock < i.minStock;
      rows.push([
        i.name, 
        i.category, 
        i.bottleSizeMl ? `${i.bottleSizeMl} ML` : 'N/A', 
        i.barcode || 'N/A', 
        i.stock, 
        i.minStock, 
        i.unit, 
        isLow ? 'LOW STOCK' : 'Good'
      ]);
    });

    rows.push([]);
    rows.push(['3. STOCK IN & STOCK OUT ADJUSTMENT DETAILS']);
    rows.push(['Date / Time', 'SKU Item Name', 'Category', 'Type (In/Out)', 'Quantity', 'Unit', 'Manual Description / Notes']);
    filteredAdjustments.forEach(a => {
      rows.push([a.date, a.itemName, a.category, a.direction === 'in' ? 'Stock In' : 'Stock Out', a.amount, a.unit, a.description]);
    });

    rows.push([]);
    rows.push(['4. STOCK PURCHASE LOG HISTORY']);
    rows.push(['Purchase Date', 'Supplier', 'Item Name', 'Category', 'Quantity', 'Unit', 'Price / Unit', 'GST Tax Amount', 'Total Expense (INR)']);
    filteredPurchases.forEach(p => {
      rows.push([p.date, p.supplier, p.itemName, p.category, p.quantity, p.unit, p.pricePerUnit, p.gstAmount || 0, p.totalAmount]);
    });

    downloadExcel(`Stock_Inventory_Report${dateTag}`, rows);
  };

  const handleExportAdjustmentsOnly = () => {
    const dateTag = startDate && endDate ? `_${startDate}_to_${endDate}` : '_all_time';
    const rows: (string | number)[][] = [
      ['HOTELVISTA ERP - STOCK IN & STOCK OUT ADJUSTMENT DETAILS REPORT'],
      ['Filter Period', startDate && endDate ? `${startDate} to ${endDate}` : 'All Time'],
      ['Search Filter', searchTerm || 'None'],
      ['Total Records', filteredAdjustments.length],
      ['Generated Date', new Date().toLocaleString()],
      [],
      ['Date / Time', 'Stock Item SKU', 'Category', 'Adjustment Type', 'Quantity', 'Unit', 'Manual Description / Reason']
    ];

    filteredAdjustments.forEach(a => {
      rows.push([
        a.date,
        a.itemName,
        a.category,
        a.direction === 'in' ? 'Stock In' : 'Stock Out',
        a.amount,
        a.unit,
        a.description
      ]);
    });

    const totalIn = filteredAdjustments.filter(a => a.direction === 'in').reduce((acc, a) => acc + Number(a.amount), 0);
    const totalOut = filteredAdjustments.filter(a => a.direction === 'out').reduce((acc, a) => acc + Number(a.amount), 0);
    const netQty = totalIn - totalOut;

    rows.push([]);
    rows.push(['SUMMARY ADJUSTMENT TOTALS']);
    rows.push(['TOTAL ADJUSTMENT ENTRIES LOGGED', filteredAdjustments.length]);
    rows.push(['TOTAL STOCK IN QUANTITY SUM', totalIn]);
    rows.push(['TOTAL STOCK OUT QUANTITY SUM', totalOut]);
    rows.push(['NET ADJUSTMENT QUANTITY BALANCE', netQty]);

    downloadExcel(`Stock_In_Out_Adjustments${dateTag}`, rows);
  };

  const handlePurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier || !purchaseItemName || qty <= 0 || pricePerUnit <= 0) return;

    let finalCategory = purchaseCategory;
    if (isAddingPurchaseCustomCategory && purchaseCustomCategoryInput.trim()) {
      finalCategory = saveCustomCategory(purchaseCustomCategoryInput.trim());
      setPurchaseCategory(finalCategory);
      setIsAddingPurchaseCustomCategory(false);
      setPurchaseCustomCategoryInput('');
    }

    // Check if item exists in inventory tracker first. If not, automatically add it.
    const exists = inventory.find(i => (i.name || '').toLowerCase() === (purchaseItemName || '').toLowerCase());
    if (!exists) {
      addInventoryItem({
        name: purchaseItemName,
        category: finalCategory,
        stock: 0,
        minStock: 5,
        unit: unit,
        expiryDate: expiryDate || undefined,
        barcode: 'BAR-' + Math.floor(100000 + Math.random() * 900000)
      });
    }

    recordPurchase({
      itemName: purchaseItemName,
      category: finalCategory,
      quantity: qty,
      unit,
      supplier,
      pricePerUnit,
      gstAmount,
      totalAmount: totalPurchaseCost
    });

    // Reset Form
    setSupplier('');
    setPurchaseItemName('');
    setQty(0);
    setPricePerUnit(0);
    setExpiryDate('');
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItemId || !adjustAmount || Number(adjustAmount) <= 0) return;

    updateStockLevel(
      adjustItemId, 
      Number(adjustAmount), 
      adjustDirection, 
      adjustCategory, 
      adjustDescription
    );
    
    // Reset Form
    setAdjustItemId('');
    setAdjustAmount('');
    setAdjustCategory('');
    setAdjustDescription('');
  };

  const handleNewItemTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    let finalCategory = newItemCategory;
    if (isAddingCustomCategory && customCategoryInput.trim()) {
      finalCategory = saveCustomCategory(customCategoryInput.trim());
      setNewItemCategory(finalCategory);
      setIsAddingCustomCategory(false);
      setCustomCategoryInput('');
    }

    const itemName = newItemName.trim();
    const isLiquor = isLiquorCategory(finalCategory);
    const bottleSize = isLiquor ? (Number(newItemBottleSizeMl) || 750) : undefined;

    await addInventoryItem({
      name: itemName,
      category: finalCategory,
      stock: 0,
      minStock: Number(newItemMinStock) || 5,
      unit: newItemUnit.trim() || (isLiquor ? 'bottle' : 'pcs'),
      bottleSizeMl: bottleSize,
      barcode: 'BAR-' + Math.floor(100000 + Math.random() * 900000)
    });

    setSuccessMsg(`✓ Successfully tracked SKU: "${itemName}" in category "${finalCategory}"${isLiquor && bottleSize ? ` (${bottleSize}ML)` : ''}`);
    setTimeout(() => setSuccessMsg(null), 4000);

    setNewItemName('');
    setNewItemMinStock(5);
    setNewItemUnit('pcs');
    setNewItemBottleSizeMl(750);
    setIsCustomMl(false);
  };

  const lowStockItems = inventory.filter(item => item.stock < item.minStock);

  return (
    <div className="space-y-6">
      
      {/* Success Notification Banner */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm">
          <span>{successMsg}</span>
          <button 
            type="button" 
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-100 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Low Stock Alerts Banner */}
      {lowStockItems.length > 0 && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30 rounded-2xl flex items-start gap-3 animate-in fade-in duration-200 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
          <div className="text-xs space-y-1">
            <span className="font-extrabold uppercase tracking-wider block">Low Stock Alert Notifications</span>
            <p className="font-medium">
              The following inventory items are below minimum replenishment threshold. Please log stock purchases to restore levels:
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1.5">
              {lowStockItems.map(item => {
                const stockInfo = formatStockBreakdown(item.stock, item.unit, item.bottleSizeMl, item.category);
                return (
                  <span key={item.id} className="bg-rose-500 text-white font-bold px-2 py-0.5 rounded font-mono text-[11px]">
                    {item.name} ({stockInfo.primary} / {item.minStock} {item.unit})
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Stock Sub tabs & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
        
        {/* Toggle list tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit flex-wrap gap-1">
          <button
            onClick={() => setActiveSubTab('ledger')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'ledger' 
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-500'
            }`}
          >
            Inventory Ledger
          </button>
          <button
            onClick={() => setActiveSubTab('purchases')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'purchases' 
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-500'
            }`}
          >
            Purchase Entries
          </button>
          <button
            onClick={() => setActiveSubTab('adjust')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'adjust' 
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-500'
            }`}
          >
            Stock Adjustment
          </button>
          <button
            onClick={() => setActiveSubTab('reports')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'reports' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Stock Reports
          </button>
        </div>

        {/* Counter */}
        <div className="text-right">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Managed SKU Items</span>
          <span className="text-base font-bold font-mono text-slate-850 dark:text-slate-200">{inventory.length} SKUs</span>
        </div>

      </div>

      {/* Grid: Forms / Table based on tab */}
      {activeSubTab === 'ledger' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Tracking Form (Left - 1 Col) */}
          <div className="lg:col-span-1 p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm space-y-4 h-fit">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-350 flex items-center gap-1.5 border-b pb-2 border-slate-100 dark:border-slate-800">
              <Package className="w-4 h-4 text-indigo-500" /> Track New SKU
            </h3>
            
            <form onSubmit={handleNewItemTrackSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-500">Item / SKU Name *</label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg"
                  placeholder="e.g. Rice Basmati"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-500">Category *</label>
                  {!isAddingCustomCategory ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCustomCategory(true);
                        setCustomCategoryInput('');
                      }}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-0.5 hover:underline"
                    >
                      <Plus className="w-3 h-3" /> Custom
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingCustomCategory(false)}
                      className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {!isAddingCustomCategory ? (
                  <select
                    value={newItemCategory}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '__ADD_NEW__') {
                        setIsAddingCustomCategory(true);
                        setCustomCategoryInput('');
                      } else {
                        setNewItemCategory(val);
                        if (isLiquorCategory(val) && (newItemUnit === 'pcs' || !newItemUnit)) {
                          setNewItemUnit('bottle');
                        }
                      }
                    }}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg font-bold"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__ADD_NEW__" className="text-indigo-600 font-bold bg-indigo-50 dark:bg-slate-900">
                      + Add Custom Category...
                    </option>
                  </select>
                ) : (
                  <div className="space-y-1 animate-in fade-in duration-150">
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        autoFocus
                        value={customCategoryInput}
                        onChange={e => setCustomCategoryInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (customCategoryInput.trim()) {
                              const saved = saveCustomCategory(customCategoryInput.trim());
                              setNewItemCategory(saved);
                              if (isLiquorCategory(saved) && (newItemUnit === 'pcs' || !newItemUnit)) {
                                setNewItemUnit('bottle');
                              }
                              setIsAddingCustomCategory(false);
                              setCustomCategoryInput('');
                            }
                          } else if (e.key === 'Escape') {
                            setIsAddingCustomCategory(false);
                          }
                        }}
                        placeholder="Type custom category..."
                        className="flex-1 p-2 border border-indigo-400 dark:border-indigo-600 dark:bg-slate-950 rounded-lg font-semibold text-xs focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customCategoryInput.trim()) {
                            const saved = saveCustomCategory(customCategoryInput.trim());
                            setNewItemCategory(saved);
                            if (isLiquorCategory(saved) && (newItemUnit === 'pcs' || !newItemUnit)) {
                              setNewItemUnit('bottle');
                            }
                            setIsAddingCustomCategory(false);
                            setCustomCategoryInput('');
                          }
                        }}
                        disabled={!customCategoryInput.trim()}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded-lg text-xs shrink-0 transition-colors shadow-sm"
                      >
                        Add
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Press Enter to add and select category
                    </p>
                  </div>
                )}
              </div>

              {/* Liquor Bottle Volume (ML) Selector */}
              {isLiquorCategory(newItemCategory) && (
                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 rounded-xl space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-amber-900 dark:text-amber-200 text-xs flex items-center gap-1.5">
                      <span>Bottle Volume (ML) *</span>
                    </label>
                    <span className="text-[10px] font-mono font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-md border border-amber-300/60 dark:border-amber-700/60">
                      {newItemBottleSizeMl ? `${newItemBottleSizeMl} ML` : 'Select ML'}
                    </span>
                  </div>

                  {/* Quick selection chips for 180ML, 375ML, 500ML, 650ML, 750ML, 1000ML */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {LIQUOR_ML_PRESETS.map(ml => (
                      <button
                        key={ml}
                        type="button"
                        onClick={() => {
                          setNewItemBottleSizeMl(ml);
                          setIsCustomMl(false);
                        }}
                        className={`py-1.5 px-1 rounded-lg text-xs font-bold font-mono transition-all text-center border ${
                          !isCustomMl && newItemBottleSizeMl === ml
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-500/30'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400'
                        }`}
                      >
                        {ml}ML
                      </button>
                    ))}
                  </div>

                  {/* Dropdown & Custom ML Option */}
                  <div className="space-y-1.5 pt-0.5">
                    <select
                      value={isCustomMl ? '__CUSTOM__' : newItemBottleSizeMl}
                      onChange={e => {
                        if (e.target.value === '__CUSTOM__') {
                          setIsCustomMl(true);
                        } else {
                          setIsCustomMl(false);
                          setNewItemBottleSizeMl(Number(e.target.value));
                        }
                      }}
                      className="w-full p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-xs text-slate-800 dark:text-slate-200"
                    >
                      <option value={180}>180 ML (Quarter / Nip)</option>
                      <option value={375}>375 ML (Pint / Half)</option>
                      <option value={500}>500 ML (Can / 500ml)</option>
                      <option value={650}>650 ML (Beer Bottle / 650ml)</option>
                      <option value={750}>750 ML (Full Bottle / 750ml)</option>
                      <option value={1000}>1000 ML (1 Litre Bottle)</option>
                      <option value="__CUSTOM__">Other / Custom ML...</option>
                    </select>

                    {isCustomMl && (
                      <div className="animate-in fade-in duration-150">
                        <input
                          type="number"
                          min={1}
                          required
                          autoFocus
                          placeholder="Enter volume in ML (e.g. 200, 330)"
                          value={newItemBottleSizeMl || ''}
                          onChange={e => setNewItemBottleSizeMl(Number(e.target.value) || 0)}
                          className="w-full p-2 bg-white dark:bg-slate-950 border border-amber-400 dark:border-amber-600 rounded-lg font-mono font-bold text-xs"
                        />
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] text-amber-700/90 dark:text-amber-400/90 leading-tight">
                    Enables accurate peg shot deductions (30ml / 60ml) and inventory balance.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Min Threshold</label>
                  <input
                    type="number"
                    min={1}
                    value={newItemMinStock}
                    onChange={e => setNewItemMinStock(Number(e.target.value))}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Stock Unit</label>
                  <input
                    type="text"
                    required
                    value={newItemUnit}
                    onChange={e => setNewItemUnit(e.target.value)}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg"
                    placeholder="bottle, kg, etc."
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-colors mt-2"
              >
                Create SKU Track
              </button>
            </form>
          </div>

          {/* Table (Right - 3 Cols) */}
          <div className="lg:col-span-3 p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-350 border-b pb-2 border-slate-100 dark:border-slate-800">
              Active Stock Levels
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2">Item Name / Barcode</th>
                    <th className="py-2">Category</th>
                    <th className="py-2 text-center">Min Level</th>
                    <th className="py-2 text-right">In Stock</th>
                    <th className="py-2 text-center">Status</th>
                    <th className="py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {inventory.map(item => {
                    const isLow = item.stock < item.minStock;
                    return (
                      <tr key={item.id} className="text-slate-700 dark:text-slate-300">
                        <td className="py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-slate-800 dark:text-slate-150 leading-tight">{item.name}</p>
                            {isLiquorCategory(item.category) && item.bottleSizeMl && (
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 rounded border border-amber-300/60 dark:border-amber-800/60">
                                {item.bottleSizeMl}ML
                              </span>
                            )}
                          </div>
                          <p className="text-[9px] font-mono text-slate-400 mt-0.5">{item.barcode || 'NO-BARCODE'}</p>
                        </td>
                        <td className="py-3 font-semibold text-slate-500">
                          <span>{item.category}</span>
                        </td>
                        <td className="py-3 text-center font-mono text-slate-400">{item.minStock} {item.unit}</td>
                        <td className={`py-3 text-right font-mono font-bold ${isLow ? 'text-rose-600 dark:text-rose-400 animate-pulse-soft' : 'text-slate-800 dark:text-slate-200'}`}>
                          {(() => {
                            const stockInfo = formatStockBreakdown(item.stock, item.unit, item.bottleSizeMl, item.category);
                            return (
                              <div className="flex flex-col items-end">
                                <span className={stockInfo.hasBreakdown ? 'text-amber-600 dark:text-amber-400 font-extrabold text-xs' : ''}>
                                  {stockInfo.primary}
                                </span>
                                {stockInfo.secondary && (
                                  <span className="text-[10px] text-slate-400 font-normal">({stockInfo.secondary})</span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-3 text-center">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                            isLow ? 'bg-rose-500 text-white shadow-sm' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                          }`}>
                            {isLow ? 'Low Stock' : 'Good'}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                              title={`Edit SKU "${item.name}"`}
                            >
                              <Edit2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                              <span className="text-[11px] text-indigo-600 dark:text-indigo-400">Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete SKU "${item.name}"? This action cannot be undone.`)) {
                                  deleteInventoryItem(item.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                              title={`Delete SKU "${item.name}"`}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              <span className="text-[11px] text-rose-600 dark:text-rose-400">Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {inventory.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                        No inventory SKUs tracked yet. Use the form on the left to create a SKU track.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {activeSubTab === 'purchases' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Purchase Log Form (Left - 1 Col) */}
          <div className="lg:col-span-1 p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-350 border-b pb-2 border-slate-100 dark:border-slate-800">
              New Purchase Entry
            </h3>

            <form onSubmit={handlePurchaseSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-500">Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={supplier}
                  onChange={e => setSupplier(e.target.value)}
                  className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg"
                  placeholder="e.g. United Beverages Ltd"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Item Name *</label>
                  <input
                    type="text"
                    required
                    list="inventory-suggestions"
                    value={purchaseItemName}
                    onChange={e => {
                      const val = e.target.value;
                      setPurchaseItemName(val);
                      const matched = inventory.find(i => (i.name || '').toLowerCase() === (val || '').toLowerCase());
                      if (matched) {
                        setPurchaseCategory(matched.category || 'Kitchen');
                        setUnit(matched.unit || 'pcs');
                      }
                    }}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg"
                    placeholder="Item SKU Name"
                  />
                  <datalist id="inventory-suggestions">
                    {inventory.map(i => <option key={i.id} value={i.name} />)}
                  </datalist>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-500">Category *</label>
                    {!isAddingPurchaseCustomCategory ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingPurchaseCustomCategory(true);
                          setPurchaseCustomCategoryInput('');
                        }}
                        className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline flex items-center gap-0.5"
                      >
                        <Plus className="w-2.5 h-2.5" /> Custom
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsAddingPurchaseCustomCategory(false)}
                        className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  {!isAddingPurchaseCustomCategory ? (
                    <select
                      value={purchaseCategory}
                      onChange={e => {
                        if (e.target.value === '__ADD_NEW__') {
                          setIsAddingPurchaseCustomCategory(true);
                          setPurchaseCustomCategoryInput('');
                        } else {
                          setPurchaseCategory(e.target.value);
                        }
                      }}
                      className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg font-semibold"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="__ADD_NEW__" className="text-indigo-600 font-bold bg-indigo-50 dark:bg-slate-900">
                        + Add Custom Category...
                      </option>
                    </select>
                  ) : (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        autoFocus
                        value={purchaseCustomCategoryInput}
                        onChange={e => setPurchaseCustomCategoryInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (purchaseCustomCategoryInput.trim()) {
                              const saved = saveCustomCategory(purchaseCustomCategoryInput.trim());
                              setPurchaseCategory(saved);
                              setIsAddingPurchaseCustomCategory(false);
                              setPurchaseCustomCategoryInput('');
                            }
                          } else if (e.key === 'Escape') {
                            setIsAddingPurchaseCustomCategory(false);
                          }
                        }}
                        placeholder="Type new category..."
                        className="flex-1 p-2 border border-indigo-400 dark:border-indigo-600 dark:bg-slate-950 rounded-lg font-semibold text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (purchaseCustomCategoryInput.trim()) {
                            const saved = saveCustomCategory(purchaseCustomCategoryInput.trim());
                            setPurchaseCategory(saved);
                            setIsAddingPurchaseCustomCategory(false);
                            setPurchaseCustomCategoryInput('');
                          }
                        }}
                        disabled={!purchaseCustomCategoryInput.trim()}
                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded-lg text-xs"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Quantity *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={qty}
                    onChange={e => setQty(Number(e.target.value))}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Price / Unit *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={pricePerUnit}
                    onChange={e => setPricePerUnit(Number(e.target.value))}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Unit Type</label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg"
                    placeholder="pcs/kg/bottle"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">GST Percent (%)</label>
                  <input
                    type="number"
                    min={0}
                    value={gstPercent}
                    onChange={e => setGstPercent(Number(e.target.value))}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Expiry Date</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={e => setExpiryDate(e.target.value)}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Purchase total calculation */}
              {totalPurchaseCost > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border dark:border-slate-800 font-mono text-[10px] space-y-1">
                  <div className="flex justify-between">
                    <span>Purchase Cost:</span>
                    <span>₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>GST Tax ({gstPercent}%):</span>
                    <span>₹{gstAmount}</span>
                  </div>
                  <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-200 mt-1">
                    <span className="font-sans">Grand Total:</span>
                    <span className="text-indigo-600 dark:text-indigo-400">₹{totalPurchaseCost}</span>
                  </div>
                </div>
              )}

              <button
                onClick={handlePurchaseSubmit}
                type="button"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors"
              >
                Log Stock-In Purchase
              </button>

            </form>
          </div>

          {/* Ledger of Purchases (Right - 2 Cols) */}
          <div className="lg:col-span-2 p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-350 border-b pb-2 border-slate-100 dark:border-slate-800">
              Stock In / Purchase History Ledger
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2">Purchase Date / Item</th>
                    <th className="py-2">Supplier details</th>
                    <th className="py-2 text-center">Quantity</th>
                    <th className="py-2 text-right">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {purchaseLogs.map(log => (
                    <tr key={log.id} className="text-slate-700 dark:text-slate-300">
                      <td className="py-3">
                        <span className="text-[10px] font-mono text-indigo-500 font-semibold">{log.date}</span>
                        <p className="font-bold text-slate-800 dark:text-slate-150 leading-tight mt-0.5">{log.itemName}</p>
                      </td>
                      <td className="py-3 font-semibold text-slate-500 leading-tight">{log.supplier}</td>
                      <td className="py-3 text-center font-mono font-medium">{log.quantity} {log.unit}</td>
                      <td className="py-3 text-right font-mono font-bold text-slate-850 dark:text-slate-150">
                        ₹{log.totalAmount}
                      </td>
                    </tr>
                  ))}
                  {purchaseLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-slate-400">No purchase entry logs.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Stock Adjustment Tab with Category & Manual Description */}
      {activeSubTab === 'adjust' && (
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm max-w-lg mx-auto space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-350 border-b pb-2 border-slate-100 dark:border-slate-800">
            Manual Stock Adjustments
          </h3>
          
          <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
            {/* Select Item */}
            <div className="space-y-1">
              <label className="font-bold text-slate-500">Select Stock Item *</label>
              <select
                required
                value={adjustItemId}
                onChange={e => {
                  const selectedId = e.target.value;
                  setAdjustItemId(selectedId);
                  const matched = inventory.find(i => i.id === selectedId);
                  if (matched) {
                    setAdjustCategory(matched.category);
                  }
                }}
                className="w-full p-2.5 border dark:border-slate-850 dark:bg-slate-900 rounded-xl font-bold"
              >
                <option value="">-- Select SKU --</option>
                {inventory.map(i => {
                  const stockInfo = formatStockBreakdown(i.stock, i.unit, i.bottleSizeMl, i.category);
                  return (
                    <option key={i.id} value={i.id}>
                      {i.name} {i.bottleSizeMl ? `(${i.bottleSizeMl}ML)` : ''} (Current: {stockInfo.primary} - {i.category})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Category Option (Dropdown with Search Option) */}
            <div className="space-y-1">
              <label className="font-bold text-slate-500 flex justify-between items-center">
                <span>Category *</span>
                <span className="text-[10px] text-indigo-500 font-normal">Type to search category</span>
              </label>
              <input
                type="text"
                required
                list="adjust-category-options"
                value={adjustCategory}
                onChange={e => setAdjustCategory(e.target.value)}
                placeholder="Select or search category..."
                className="w-full p-2.5 border dark:border-slate-850 dark:bg-slate-900 rounded-xl font-bold text-xs"
              />
              <datalist id="adjust-category-options">
                {categories.map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            {/* Adjustment Type & Quantity */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-500">Adjustment Type *</label>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setAdjustDirection('in')}
                    className={`flex-1 py-1.5 rounded flex items-center justify-center gap-1 ${adjustDirection === 'in' ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-450'}`}
                  >
                    <ArrowUpCircle className="w-3.5 h-3.5" /> Stock In
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustDirection('out')}
                    className={`flex-1 py-1.5 rounded flex items-center justify-center gap-1 ${adjustDirection === 'out' ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-450'}`}
                  >
                    <ArrowDownCircle className="w-3.5 h-3.5" /> Stock Out
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Quantity *</label>
                <input
                  type="number"
                  required
                  min={0.1}
                  step="any"
                  value={adjustAmount}
                  placeholder=""
                  onChange={e => setAdjustAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full p-2.5 border dark:border-slate-850 dark:bg-slate-900 rounded-xl font-bold font-mono"
                />
              </div>
            </div>

            {/* Manual Description Option */}
            <div className="space-y-1">
              <label className="font-bold text-slate-500">Description / Reason *</label>
              <textarea
                required
                rows={2}
                value={adjustDescription}
                onChange={e => setAdjustDescription(e.target.value)}
                placeholder="Enter manual details (e.g. Spoilage, Kitchen Transfer, Bar Counter Replenishment, Inventory Audit Correction)"
                className="w-full p-2.5 border dark:border-slate-850 dark:bg-slate-900 rounded-xl font-medium text-xs resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={!adjustItemId || !adjustAmount || Number(adjustAmount) <= 0 || !adjustCategory || !adjustDescription}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-all"
            >
              Commit Adjustment
            </button>
          </form>
        </div>
      )}

      {/* Stock Reports Tab with Search Option & Stock In/Out Details */}
      {activeSubTab === 'reports' && (
        <div className="space-y-6">
          
          {/* Header & Date Range Filter & Search Option */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-4">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  Stock Inventory & Adjustment Analytics Reports
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Detailed Stock In & Stock Out history with Category, Description, and downloadable Excel reports
                </p>
              </div>

              {/* Excel Export Button */}
              <button
                onClick={handleExportStockReport}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all shrink-0"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Stock Report to Excel (.csv)</span>
              </button>
            </div>

            {/* Search Input & Date Filters Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 items-center">
              
              {/* Search Option */}
              <div className="lg:col-span-5 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search by SKU name, category, supplier, or description..."
                  className="w-full pl-9 pr-8 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Date Presets */}
              <div className="lg:col-span-7 flex flex-wrap items-center justify-end gap-1.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Filter:
                </span>
                {[
                  { id: 'all', label: 'All Time' },
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: '7days', label: 'Last 7 Days' },
                  { id: 'month', label: 'This Month' },
                  { id: 'custom', label: 'Custom' }
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

                {/* Custom Pickers if selected */}
                {datePreset === 'custom' && (
                  <div className="flex items-center gap-1 text-xs">
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="bg-slate-100 dark:bg-slate-950 p-1.5 border dark:border-slate-800 rounded-lg text-xs font-mono font-bold"
                    />
                    <span>-</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="bg-slate-100 dark:bg-slate-950 p-1.5 border dark:border-slate-800 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Stock KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total SKUs</span>
                <span className="text-xl font-bold font-mono text-slate-800 dark:text-slate-200">
                  {filteredInventory.length} Items
                </span>
              </div>
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-500 rounded-xl">
                <Package className="w-5 h-5" />
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Stock Adjustments Logged</span>
                <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {filteredAdjustments.length} Entries
                </span>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950 text-emerald-500 rounded-xl">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Purchase Expense</span>
                <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                  ₹{totalPurchaseSpend.toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950 text-amber-500 rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Purchase GST Paid</span>
                <span className="text-xl font-bold font-mono text-violet-600 dark:text-violet-400">
                  ₹{totalPurchaseGst.toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-violet-50 dark:bg-violet-950 text-violet-500 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

          </div>

          {/* STOCK IN & STOCK OUT ADJUSTMENT DETAILS TABLE */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <ArrowUpCircle className="w-4 h-4 text-emerald-500" />
                <ArrowDownCircle className="w-4 h-4 text-rose-500" />
                Stock In & Stock Out Adjustment Details ({filteredAdjustments.length})
              </h4>
              
              <div className="flex items-center gap-3">
                {searchTerm && (
                  <span className="text-[10px] text-indigo-500 font-semibold font-mono">
                    Filtered by: "{searchTerm}"
                  </span>
                )}

                {/* Download Excel Button */}
                <button
                  onClick={handleExportAdjustmentsOnly}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all shrink-0"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Download Excel (.csv)</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2 font-mono">Date / Time</th>
                    <th className="py-2">Stock Item SKU</th>
                    <th className="py-2">Category</th>
                    <th className="py-2 text-center">Adjustment Type</th>
                    <th className="py-2 text-right">Quantity</th>
                    <th className="py-2">Manual Description / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {filteredAdjustments.map(log => (
                    <tr key={log.id} className="text-slate-700 dark:text-slate-300">
                      <td className="py-3 font-mono text-[11px] text-slate-400">{log.date}</td>
                      <td className="py-3 font-bold text-slate-850 dark:text-slate-150">{log.itemName}</td>
                      <td className="py-3 font-semibold text-slate-500">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px]">
                          {log.category}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                          log.direction === 'in' 
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' 
                            : 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400'
                        }`}>
                          {log.direction === 'in' ? <ArrowUpCircle className="w-3 h-3" /> : <ArrowDownCircle className="w-3 h-3" />}
                          {log.direction === 'in' ? 'Stock In' : 'Stock Out'}
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        {log.amount} {log.unit}
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-400 italic">
                        "{log.description}"
                      </td>
                    </tr>
                  ))}
                  {filteredAdjustments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400">
                        No stock in/out adjustment logs match the search or date filter.
                      </td>
                    </tr>
                  )}
                </tbody>

                {filteredAdjustments.length > 0 && (
                  <tfoot className="border-t-2 border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 font-bold text-xs">
                    <tr>
                      <td colSpan={3} className="py-3 px-3 font-mono text-[11px] text-slate-500 uppercase">
                        Total Summary ({filteredAdjustments.length} Entries)
                      </td>
                      <td className="py-3 text-center">
                        <div className="flex flex-col items-center gap-0.5 text-[10px]">
                          <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                            + {filteredAdjustments.filter(a => a.direction === 'in').reduce((acc, a) => acc + Number(a.amount), 0)} Stock In
                          </span>
                          <span className="text-rose-500 font-mono font-bold">
                            - {filteredAdjustments.filter(a => a.direction === 'out').reduce((acc, a) => acc + Number(a.amount), 0)} Stock Out
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-right font-mono text-sm text-indigo-600 dark:text-indigo-400 font-extrabold">
                        {(() => {
                          const totalIn = filteredAdjustments.filter(a => a.direction === 'in').reduce((acc, a) => acc + Number(a.amount), 0);
                          const totalOut = filteredAdjustments.filter(a => a.direction === 'out').reduce((acc, a) => acc + Number(a.amount), 0);
                          const net = totalIn - totalOut;
                          return `${net >= 0 ? '+' : ''}${net} Net`;
                        })()}
                      </td>
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400 text-[10px] font-mono">
                        Sum: {filteredAdjustments.filter(a => a.direction === 'in').reduce((acc, a) => acc + Number(a.amount), 0)} In / {filteredAdjustments.filter(a => a.direction === 'out').reduce((acc, a) => acc + Number(a.amount), 0)} Out
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Active Inventory Stock Levels & Purchase History */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Active Inventory Stock Table */}
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-350 border-b pb-2 border-slate-100 dark:border-slate-800">
                Active Inventory Stock Valuation & Status
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      <th className="py-2">Item SKU / Barcode</th>
                      <th className="py-2">Category</th>
                      <th className="py-2 text-right">Min / Current</th>
                      <th className="py-2 text-center">Status</th>
                      <th className="py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {filteredInventory.map(item => {
                      const isLow = item.stock < item.minStock;
                      return (
                        <tr key={item.id} className="text-slate-700 dark:text-slate-300">
                          <td className="py-2.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                              {isLiquorCategory(item.category) && item.bottleSizeMl && (
                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 rounded border border-amber-300/60 dark:border-amber-800/60">
                                  {item.bottleSizeMl}ML
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 block">{item.barcode || 'NO BARCODE'}</span>
                          </td>
                          <td className="py-2.5 font-medium text-slate-500">{item.category}</td>
                          <td className="py-2.5 text-right font-mono font-bold">
                            <span className="text-slate-400 font-normal">{item.minStock} / </span>
                            {(() => {
                              const stockInfo = formatStockBreakdown(item.stock, item.unit, item.bottleSizeMl, item.category);
                              return (
                                <span className={isLow ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}>
                                  {stockInfo.primary} {stockInfo.secondary ? `(${stockInfo.secondary})` : ''}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="py-2.5 text-center">
                            <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                              isLow ? 'bg-rose-500 text-white' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                            }`}>
                              {isLow ? 'Low Stock' : 'Optimal'}
                            </span>
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                              title={`Edit SKU "${item.name}"`}
                            >
                              <Edit2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                              <span className="text-[11px] text-indigo-600 dark:text-indigo-400">Edit</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Purchase Entries History Report */}
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-350 border-b pb-2 border-slate-100 dark:border-slate-800">
                Purchases Expense Ledger ({filteredPurchases.length} Records)
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      <th className="py-2">Date / Item</th>
                      <th className="py-2">Supplier</th>
                      <th className="py-2 text-center">Quantity</th>
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
                        <td className="py-2.5 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                          ₹{p.totalAmount}
                        </td>
                      </tr>
                    ))}
                    {filteredPurchases.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-slate-400">No purchase entries match the search or date filter.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* =========================================================================
          MODAL: EDIT INVENTORY STOCK ITEM
          ========================================================================= */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden p-5 space-y-4">
            
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-xl">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Edit Stock Item: {editingItem.name}
                  </h3>
                  <p className="text-[10px] text-slate-400">Modify SKU details, stock levels, unit, or category</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingItem(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-xl text-rose-600 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-500 block">Item Name *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={e => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500 block">Category *</label>
                {!isAddingEditCustomCategory ? (
                  <select
                    value={editFormData.category}
                    onChange={e => {
                      if (e.target.value === '__ADD_NEW__') {
                        setIsAddingEditCustomCategory(true);
                        setEditCustomCategoryInput('');
                      } else {
                        setEditFormData(prev => ({ ...prev, category: e.target.value }));
                      }
                    }}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__ADD_NEW__" className="text-indigo-600 font-bold bg-indigo-50 dark:bg-slate-900">
                      + Add Custom Category...
                    </option>
                  </select>
                ) : (
                  <div className="space-y-1 animate-in fade-in duration-150">
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        autoFocus
                        value={editCustomCategoryInput}
                        onChange={e => setEditCustomCategoryInput(e.target.value)}
                        placeholder="Type custom category..."
                        className="flex-1 p-2 bg-slate-50 dark:bg-slate-950 border border-indigo-400 dark:border-indigo-600 rounded-xl font-bold text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (editCustomCategoryInput.trim()) {
                            const saved = saveCustomCategory(editCustomCategoryInput.trim());
                            setEditFormData(prev => ({ ...prev, category: saved }));
                            setIsAddingEditCustomCategory(false);
                            setEditCustomCategoryInput('');
                          }
                        }}
                        disabled={!editCustomCategoryInput.trim()}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs shrink-0"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingEditCustomCategory(false)}
                        className="px-2 py-2 border dark:border-slate-800 rounded-xl text-slate-400 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 block">Current Stock *</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    required
                    value={editFormData.stock}
                    onChange={e => setEditFormData(prev => ({ ...prev, stock: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500 block">Min Level Alert *</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    required
                    value={editFormData.minStock}
                    onChange={e => setEditFormData(prev => ({ ...prev, minStock: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500 block">Stock Unit *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.unit}
                    onChange={e => setEditFormData(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="pcs, bottle, kg..."
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500 block">Barcode / SKU Code</label>
                <input
                  type="text"
                  value={editFormData.barcode}
                  onChange={e => setEditFormData(prev => ({ ...prev, barcode: e.target.value }))}
                  placeholder="Optional barcode / SKU"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs"
                />
              </div>

              {isLiquorCategory(editFormData.category) ? (
                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-amber-900 dark:text-amber-200 text-xs">Bottle Volume (ML) *</label>
                    <span className="text-[10px] font-mono font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded border border-amber-300/60 dark:border-amber-700/60">
                      {editFormData.bottleSizeMl ? `${editFormData.bottleSizeMl} ML` : '750 ML'}
                    </span>
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {LIQUOR_ML_PRESETS.map(ml => (
                      <button
                        key={ml}
                        type="button"
                        onClick={() => setEditFormData(prev => ({ ...prev, bottleSizeMl: ml }))}
                        className={`py-1.5 rounded text-[11px] font-bold font-mono transition-all text-center border ${
                          editFormData.bottleSizeMl === ml
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-400'
                        }`}
                      >
                        {ml}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={editFormData.bottleSizeMl || ''}
                    onChange={e => setEditFormData(prev => ({ ...prev, bottleSizeMl: e.target.value ? parseInt(e.target.value) : undefined }))}
                    placeholder="Custom volume in ML (e.g. 750)"
                    className="w-full p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-xs font-bold"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 block">Bottle Volume (ml)</label>
                  <input
                    type="number"
                    min={0}
                    value={editFormData.bottleSizeMl || ''}
                    onChange={e => setEditFormData(prev => ({ ...prev, bottleSizeMl: e.target.value ? parseInt(e.target.value) : undefined }))}
                    placeholder="e.g. 750 (for bar/drinks)"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 block">Price Per Unit (₹)</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={editFormData.pricePerUnit || ''}
                    onChange={e => setEditFormData(prev => ({ ...prev, pricePerUnit: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    placeholder="Cost price ₹"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500 block">Expiry Date</label>
                  <input
                    type="date"
                    value={editFormData.expiryDate || ''}
                    onChange={e => setEditFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 border dark:border-slate-800 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
