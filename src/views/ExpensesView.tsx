import React, { useState, useMemo } from 'react';
import { useApp, Expense } from '../context/AppContext';
import { 
  WalletCards, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  Trash2, 
  Edit3, 
  X, 
  UtensilsCrossed, 
  Wine, 
  BedDouble, 
  Building2, 
  Receipt, 
  ArrowUpDown,
  CreditCard,
  Banknote,
  Smartphone,
  Building,
  Clock,
  PieChart,
  DollarSign,
  TrendingDown,
  RefreshCw,
  Printer
} from 'lucide-react';
import { getLocalTodayString, getMonthStartString, isDateInRange } from '../utils/dateUtils';

// Pre-defined departmental categories
export const DEPARTMENT_CATEGORIES: Record<Expense['department'], string[]> = {
  Restaurant: [
    'Fresh Vegetables & Fruits',
    'Meat, Poultry & Seafood',
    'Dairy, Milk & Bakery',
    'Groceries, Rice & Spices',
    'Cooking Oil & Condiments',
    'Kitchen LPG Gas Cylinder',
    'Kitchen Equipment & Utensils',
    'Takeaway Containers & Packaging',
    'Staff Meals & Welfare',
    'Restaurant Cleaning Supplies',
    'Miscellaneous Restaurant Expense'
  ],
  Bar: [
    'Spirits & Hard Liquor Restock',
    'Beer, Ciders & Coolers',
    'Wine & Champagne',
    'Mixers, Sodas & Juices',
    'Ice & Cooling Supplies',
    'Barware, Glasses & Shakers',
    'Bar Snacks & Fresh Garnishes',
    'Liquor License & Permit Fees',
    'Bar Disposables & Straws',
    'Miscellaneous Bar Expense'
  ],
  Rooms: [
    'Linen & Bedding Laundry',
    'Guest Amenities & Toiletries',
    'Cleaning Chemicals & Supplies',
    'Bedding, Pillows & Towels Replacement',
    'AC & Electrical Maintenance',
    'Plumbing & Bathroom Fittings',
    'Pest Control Service',
    'Room Keys, Tags & Stationery',
    'Miscellaneous Housekeeping'
  ],
  General: [
    'Electricity & Power Bill',
    'Water Supply & Tanker',
    'Staff Salary Advance & Daily Wages',
    'Internet, Wi-Fi & Telecom',
    'Property & Building Maintenance',
    'Office Stationery & Printing',
    'Marketing, Social Media & Ads',
    'Taxes, Licenses & Legal Fees',
    'Security & CCTV Maintenance',
    'Miscellaneous General'
  ]
};

export const ExpensesView: React.FC = () => {
  const { 
    expenses, 
    addExpense, 
    updateExpense, 
    deleteExpense, 
    currentTenant, 
    settings,
    refreshData 
  } = useApp();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [selectedDepartment, setSelectedDepartment] = useState<'ALL' | Expense['department']>('ALL');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'yesterday' | '7days' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('ALL');

  // Modal State for Add / Edit
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form Fields
  const [formDate, setFormDate] = useState<string>(getLocalTodayString());
  const [formDepartment, setFormDepartment] = useState<Expense['department']>('Restaurant');
  const [formCategory, setFormCategory] = useState<string>(DEPARTMENT_CATEGORIES.Restaurant[0]);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formPaymentMethod, setFormPaymentMethod] = useState<Expense['paymentMethod']>('Cash');
  const [formPaidTo, setFormPaidTo] = useState('');
  const [formReceiptNumber, setFormReceiptNumber] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Apply Date Preset
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
      const mStr = getMonthStartString();
      setStartDate(mStr);
      setEndDate(todayStr);
    }
  };

  // Switch form department and update default category
  const handleDepartmentChange = (dept: Expense['department']) => {
    setFormDepartment(dept);
    setIsCustomCategory(false);
    setFormCategory(DEPARTMENT_CATEGORIES[dept][0] || 'Miscellaneous');
  };

  // Open Add Modal
  const handleOpenAdd = (defaultDept?: Expense['department']) => {
    const targetDept = defaultDept || (selectedDepartment !== 'ALL' ? selectedDepartment : 'Restaurant');
    setEditingExpense(null);
    setFormDate(getLocalTodayString());
    setFormDepartment(targetDept);
    setFormCategory(DEPARTMENT_CATEGORIES[targetDept][0] || 'Miscellaneous');
    setIsCustomCategory(false);
    setCustomCategoryInput('');
    setFormTitle('');
    setFormAmount('');
    setFormPaymentMethod('Cash');
    setFormPaidTo('');
    setFormReceiptNumber('');
    setFormNotes('');
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setFormDate(exp.date || getLocalTodayString());
    setFormDepartment(exp.department);
    const isStandardCat = DEPARTMENT_CATEGORIES[exp.department]?.includes(exp.category);
    if (isStandardCat) {
      setFormCategory(exp.category);
      setIsCustomCategory(false);
      setCustomCategoryInput('');
    } else {
      setIsCustomCategory(true);
      setCustomCategoryInput(exp.category);
    }
    setFormTitle(exp.title);
    setFormAmount(exp.amount);
    setFormPaymentMethod(exp.paymentMethod);
    setFormPaidTo(exp.paidTo || '');
    setFormReceiptNumber(exp.receiptNumber || '');
    setFormNotes(exp.notes || '');
    setShowModal(true);
  };

  // Save Expense (Create or Update)
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Please enter an expense title / description.');
      return;
    }
    const numAmount = Number(formAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid expense amount greater than 0.');
      return;
    }

    const finalCategory = isCustomCategory 
      ? (customCategoryInput.trim() || 'Miscellaneous') 
      : formCategory;

    const payload = {
      date: formDate || getLocalTodayString(),
      department: formDepartment,
      category: finalCategory,
      title: formTitle.trim(),
      amount: numAmount,
      paymentMethod: formPaymentMethod,
      paidTo: formPaidTo.trim(),
      receiptNumber: formReceiptNumber.trim(),
      notes: formNotes.trim()
    };

    if (editingExpense) {
      await updateExpense(editingExpense.id, payload);
    } else {
      await addExpense(payload);
    }

    setShowModal(false);
  };

  // Delete Expense with confirmation
  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete expense "${title}"?`)) {
      await deleteExpense(id);
    }
  };

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return (expenses || []).filter(item => {
      // Department Filter
      if (selectedDepartment !== 'ALL' && item.department !== selectedDepartment) {
        return false;
      }

      // Payment Method Filter
      if (selectedPaymentMethod !== 'ALL' && item.paymentMethod !== selectedPaymentMethod) {
        return false;
      }

      // Date Range Filter
      if (!isDateInRange(item.date, startDate, endDate)) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = (item.title || '').toLowerCase().includes(query);
        const matchCat = (item.category || '').toLowerCase().includes(query);
        const matchPaidTo = (item.paidTo || '').toLowerCase().includes(query);
        const matchReceipt = (item.receiptNumber || '').toLowerCase().includes(query);
        const matchNotes = (item.notes || '').toLowerCase().includes(query);
        if (!matchTitle && !matchCat && !matchPaidTo && !matchReceipt && !matchNotes) {
          return false;
        }
      }

      return true;
    });
  }, [expenses, selectedDepartment, selectedPaymentMethod, startDate, endDate, searchQuery]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const todayStr = getLocalTodayString();
    let totalAll = 0;
    let totalRestaurant = 0;
    let totalBar = 0;
    let totalRooms = 0;
    let totalGeneral = 0;
    let totalToday = 0;

    filteredExpenses.forEach(exp => {
      const amt = Number(exp.amount) || 0;
      totalAll += amt;
      if (exp.department === 'Restaurant') totalRestaurant += amt;
      else if (exp.department === 'Bar') totalBar += amt;
      else if (exp.department === 'Rooms') totalRooms += amt;
      else if (exp.department === 'General') totalGeneral += amt;

      if (exp.date === todayStr) {
        totalToday += amt;
      }
    });

    return {
      totalAll,
      totalRestaurant,
      totalBar,
      totalRooms,
      totalGeneral,
      totalToday,
      count: filteredExpenses.length
    };
  }, [filteredExpenses]);

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredExpenses.length) {
      alert('No expense records to export.');
      return;
    }
    const headers = ['Date', 'Department', 'Category', 'Title / Description', 'Amount (INR)', 'Payment Mode', 'Paid To / Vendor', 'Receipt No.', 'Notes', 'Recorded By'];
    const rows = filteredExpenses.map(e => [
      e.date,
      e.department,
      `"${(e.category || '').replace(/"/g, '""')}"`,
      `"${(e.title || '').replace(/"/g, '""')}"`,
      e.amount,
      e.paymentMethod,
      `"${(e.paidTo || '').replace(/"/g, '""')}"`,
      `"${(e.receiptNumber || '').replace(/"/g, '""')}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
      `"${(e.recordedBy || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hotelvista_expenses_${selectedDepartment.toLowerCase()}_${getLocalTodayString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger Print
  const handlePrint = () => {
    window.print();
  };

  // Department icon helper
  const getDeptBadge = (dept: Expense['department']) => {
    switch (dept) {
      case 'Restaurant':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <UtensilsCrossed className="w-3 h-3" /> Restaurant
          </span>
        );
      case 'Bar':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Wine className="w-3 h-3" /> Bar
          </span>
        );
      case 'Rooms':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <BedDouble className="w-3 h-3" /> Rooms
          </span>
        );
      case 'General':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            <Building2 className="w-3 h-3" /> General
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Top Banner & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-br from-rose-500 to-red-600 text-white rounded-xl shadow-md shadow-rose-500/20">
              <WalletCards className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Operational Expenses Tracker
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 font-mono">
                  {currentTenant?.name || 'Property'}
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Feed and monitor day-by-day procurement & operating expenses separated by Bar, Restaurant, Rooms & General
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={async () => {
              setIsRefreshing(true);
              await refreshData();
              setTimeout(() => setIsRefreshing(false), 500);
            }}
            className="p-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-all text-xs font-semibold flex items-center gap-1.5"
            title="Refresh database records"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-500' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2.5 text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
          >
            <Printer className="w-4 h-4" /> Print Sheet
          </button>

          <button
            onClick={() => handleOpenAdd()}
            className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-xl font-bold text-xs shadow-md shadow-rose-600/20 transition-all flex items-center gap-2 hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Add Daily Expense
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        
        {/* Total Expenses */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white border border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Expense</span>
            <DollarSign className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-extrabold font-mono text-rose-400">
            ₹{metrics.totalAll.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {metrics.count} entries recorded
          </div>
        </div>

        {/* Restaurant Expenses */}
        <div 
          onClick={() => setSelectedDepartment(selectedDepartment === 'Restaurant' ? 'ALL' : 'Restaurant')}
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all cursor-pointer hover:border-amber-500/50 ${
            selectedDepartment === 'Restaurant' ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-500/5' : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
              <UtensilsCrossed className="w-3.5 h-3.5" /> Restaurant
            </span>
          </div>
          <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
            ₹{metrics.totalRestaurant.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            Kitchen & Food Supplies
          </div>
        </div>

        {/* Bar Expenses */}
        <div 
          onClick={() => setSelectedDepartment(selectedDepartment === 'Bar' ? 'ALL' : 'Bar')}
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all cursor-pointer hover:border-purple-500/50 ${
            selectedDepartment === 'Bar' ? 'ring-2 ring-purple-500 border-purple-500 bg-purple-500/5' : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Wine className="w-3.5 h-3.5" /> Bar POS
            </span>
          </div>
          <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
            ₹{metrics.totalBar.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            Liquor, Beer & Supplies
          </div>
        </div>

        {/* Rooms Expenses */}
        <div 
          onClick={() => setSelectedDepartment(selectedDepartment === 'Rooms' ? 'ALL' : 'Rooms')}
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all cursor-pointer hover:border-indigo-500/50 ${
            selectedDepartment === 'Rooms' ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-500/5' : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
              <BedDouble className="w-3.5 h-3.5" /> Rooms
            </span>
          </div>
          <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
            ₹{metrics.totalRooms.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            Linen, Amenities & Maint.
          </div>
        </div>

        {/* General Expenses */}
        <div 
          onClick={() => setSelectedDepartment(selectedDepartment === 'General' ? 'ALL' : 'General')}
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all cursor-pointer hover:border-slate-500/50 ${
            selectedDepartment === 'General' ? 'ring-2 ring-slate-500 border-slate-500 bg-slate-500/5' : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> General
            </span>
          </div>
          <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
            ₹{metrics.totalGeneral.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            Power, Wages & Utilities
          </div>
        </div>

        {/* Today's Expenses */}
        <div 
          onClick={() => applyDatePreset('today')}
          className="p-4 rounded-2xl bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/30 dark:to-orange-950/20 border border-rose-200 dark:border-rose-900/50 cursor-pointer hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Today's Total
            </span>
          </div>
          <div className="text-lg font-extrabold font-mono text-rose-600 dark:text-rose-400">
            ₹{metrics.totalToday.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-rose-700/70 dark:text-rose-400/70 mt-1">
            {getLocalTodayString()}
          </div>
        </div>

      </div>

      {/* Visual Department Expenditure Breakdown Bar */}
      {metrics.totalAll > 0 && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-indigo-500" />
              Department Expense Distribution
            </span>
            <span className="text-slate-400 font-normal">
              Total: <strong className="text-slate-800 dark:text-slate-200 font-mono">₹{metrics.totalAll.toLocaleString('en-IN')}</strong>
            </span>
          </div>

          <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
            {metrics.totalRestaurant > 0 && (
              <div 
                style={{ width: `${(metrics.totalRestaurant / metrics.totalAll) * 100}%` }}
                className="bg-amber-500 transition-all"
                title={`Restaurant: ₹${metrics.totalRestaurant} (${Math.round((metrics.totalRestaurant / metrics.totalAll) * 100)}%)`}
              />
            )}
            {metrics.totalBar > 0 && (
              <div 
                style={{ width: `${(metrics.totalBar / metrics.totalAll) * 100}%` }}
                className="bg-purple-500 transition-all"
                title={`Bar: ₹${metrics.totalBar} (${Math.round((metrics.totalBar / metrics.totalAll) * 100)}%)`}
              />
            )}
            {metrics.totalRooms > 0 && (
              <div 
                style={{ width: `${(metrics.totalRooms / metrics.totalAll) * 100}%` }}
                className="bg-indigo-500 transition-all"
                title={`Rooms: ₹${metrics.totalRooms} (${Math.round((metrics.totalRooms / metrics.totalAll) * 100)}%)`}
              />
            )}
            {metrics.totalGeneral > 0 && (
              <div 
                style={{ width: `${(metrics.totalGeneral / metrics.totalAll) * 100}%` }}
                className="bg-slate-500 transition-all"
                title={`General: ₹${metrics.totalGeneral} (${Math.round((metrics.totalGeneral / metrics.totalAll) * 100)}%)`}
              />
            )}
          </div>

          <div className="flex flex-wrap gap-4 text-[11px] pt-1">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Restaurant ({Math.round((metrics.totalRestaurant / metrics.totalAll) * 100) || 0}%)
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Bar POS ({Math.round((metrics.totalBar / metrics.totalAll) * 100) || 0}%)
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Rooms ({Math.round((metrics.totalRooms / metrics.totalAll) * 100) || 0}%)
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span> General ({Math.round((metrics.totalGeneral / metrics.totalAll) * 100) || 0}%)
            </span>
          </div>
        </div>
      )}

      {/* Department Tabs & Filter Controls */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        
        {/* Department Switcher Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'ALL', label: 'All Departments', icon: WalletCards, count: expenses.length },
              { id: 'Restaurant', label: 'Restaurant', icon: UtensilsCrossed, count: expenses.filter(e => e.department === 'Restaurant').length },
              { id: 'Bar', label: 'Bar POS', icon: Wine, count: expenses.filter(e => e.department === 'Bar').length },
              { id: 'Rooms', label: 'Rooms & Housekeeping', icon: BedDouble, count: expenses.filter(e => e.department === 'Rooms').length },
              { id: 'General', label: 'General & Admin', icon: Building2, count: expenses.filter(e => e.department === 'General').length }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = selectedDepartment === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedDepartment(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white/20 dark:bg-black/20 text-white dark:text-slate-900' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            Showing <strong>{filteredExpenses.length}</strong> of {expenses.length} records
          </div>
        </div>

        {/* Date presets, search & payment mode */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search expenses, title, payee, category..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          {/* Date Presets */}
          <div className="flex flex-wrap gap-1 text-xs">
            {[
              { id: 'all', label: 'All Dates' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '7days', label: 'Last 7 Days' },
              { id: 'month', label: 'This Month' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => applyDatePreset(p.id as any)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                  datePreset === p.id 
                    ? 'bg-rose-600 text-white shadow-sm' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date Range Inputs */}
          <div className="flex items-center gap-1.5 text-xs bg-slate-50 dark:bg-slate-800/40 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1" />
            <input
              type="date"
              value={startDate}
              onChange={e => {
                setStartDate(e.target.value);
                setDatePreset('custom');
              }}
              className="bg-transparent text-slate-700 dark:text-slate-300 text-xs focus:outline-none cursor-pointer"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={e => {
                setEndDate(e.target.value);
                setDatePreset('custom');
              }}
              className="bg-transparent text-slate-700 dark:text-slate-300 text-xs focus:outline-none cursor-pointer"
            />
          </div>

          {/* Payment Method Filter */}
          <select
            value={selectedPaymentMethod}
            onChange={e => setSelectedPaymentMethod(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Payment Modes</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI / GPay / PhonePe</option>
            <option value="Card">Credit/Debit Card</option>
            <option value="Bank Transfer">Bank Transfer / NEFT</option>
            <option value="Credit / Due">Vendor Credit / Due</option>
          </select>

        </div>

      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Daily Expense Transactions
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-mono">
              {filteredExpenses.length} Records
            </span>
          </div>

          <div className="text-xs text-slate-500 font-semibold font-mono">
            Sum: <span className="text-rose-600 dark:text-rose-400 font-bold">₹{metrics.totalAll.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Expense Description</th>
                <th className="py-3 px-4">Paid To / Payee</th>
                <th className="py-3 px-4">Payment Mode</th>
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <WalletCards className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-700 opacity-60" />
                    <p className="font-semibold text-sm">No expenses recorded yet</p>
                    <p className="text-xs mt-1 text-slate-500">
                      Click "+ Add Daily Expense" to record today's Bar, Restaurant, Rooms, or General expenses.
                    </p>
                    <button
                      onClick={() => handleOpenAdd()}
                      className="mt-3.5 px-3.5 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-500 transition-all inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Expense
                    </button>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(exp => (
                  <tr 
                    key={exp.id} 
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono whitespace-nowrap">
                      {exp.date}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {getDeptBadge(exp.department)}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {exp.category}
                      </span>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        {exp.title}
                      </div>
                      {exp.notes && (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5" title={exp.notes}>
                          {exp.notes}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {exp.paidTo || '—'}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {exp.paymentMethod}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500">
                      {exp.receiptNumber || '—'}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                      ₹{exp.amount.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(exp)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-all"
                          title="Edit Expense"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(exp.id, exp.title)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with grand total */}
        {filteredExpenses.length > 0 && (
          <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              Total {filteredExpenses.length} records in this view
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-600 dark:text-slate-300">Total Departmental Expense:</span>
              <span className="text-base font-extrabold font-mono text-rose-600 dark:text-rose-400">
                ₹{metrics.totalAll.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        )}

      </div>

      {/* Expense Modal (Add / Edit) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
                  <WalletCards className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {editingExpense ? 'Edit Expense Record' : 'Record Daily Operational Expense'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Log day-to-day purchases and bills for Bar, Restaurant, Rooms or General
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveExpense} className="space-y-4 text-xs">
              
              {/* Department Selector */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  1. Department <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'Restaurant', label: 'Restaurant', icon: UtensilsCrossed, color: 'hover:border-amber-500 hover:text-amber-600', active: 'bg-amber-500 text-white border-amber-500 shadow-sm' },
                    { id: 'Bar', label: 'Bar POS', icon: Wine, color: 'hover:border-purple-500 hover:text-purple-600', active: 'bg-purple-500 text-white border-purple-500 shadow-sm' },
                    { id: 'Rooms', label: 'Rooms / Rack', icon: BedDouble, color: 'hover:border-indigo-500 hover:text-indigo-600', active: 'bg-indigo-500 text-white border-indigo-500 shadow-sm' },
                    { id: 'General', label: 'General / Admin', icon: Building2, color: 'hover:border-slate-500 hover:text-slate-600', active: 'bg-slate-700 text-white border-slate-700 shadow-sm' }
                  ].map(d => {
                    const Icon = d.icon;
                    const isSelected = formDepartment === d.id;
                    return (
                      <button
                        type="button"
                        key={d.id}
                        onClick={() => handleDepartmentChange(d.id as any)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border font-bold transition-all text-xs gap-1.5 ${
                          isSelected ? d.active : `bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 ${d.color}`
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{d.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Expense Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="1"
                      placeholder="e.g. 2500"
                      value={formAmount}
                      onChange={e => setFormAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Category selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomCategory(!isCustomCategory)}
                    className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold hover:underline"
                  >
                    {isCustomCategory ? '← Choose from standard categories' : '+ Custom Category'}
                  </button>
                </div>

                {!isCustomCategory ? (
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                  >
                    {(DEPARTMENT_CATEGORIES[formDepartment] || []).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Enter custom category name..."
                    value={customCategoryInput}
                    onChange={e => setCustomCategoryInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                  />
                )}
              </div>

              {/* Title / Description */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Expense Title / Purpose <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    formDepartment === 'Restaurant' ? 'e.g. Weekly fresh vegetables & chicken restock' :
                    formDepartment === 'Bar' ? 'e.g. 5 cases Kingfisher Ultra Beer & Vodka bottles' :
                    formDepartment === 'Rooms' ? 'e.g. 50 Room Towels & Bathroom shampoo kits' :
                    'e.g. Monthly Electricity bill & generator diesel'
                  }
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                />
              </div>

              {/* Payment Mode & Paid To / Payee */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={formPaymentMethod}
                    onChange={e => setFormPaymentMethod(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / GPay / PhonePe / QR</option>
                    <option value="Card">Credit / Debit Card</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT / IMPS</option>
                    <option value="Credit / Due">Vendor Credit / Due</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Paid To / Vendor Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Metro Supermarket, Daily Dairy, Local Vendor"
                    value={formPaidTo}
                    onChange={e => setFormPaidTo(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                  />
                </div>
              </div>

              {/* Bill / Receipt No. & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Invoice / Receipt / Voucher #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-084 or Cash Voucher 12"
                    value={formReceiptNumber}
                    onChange={e => setFormReceiptNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Internal Notes / Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="Optional details or remarks..."
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-xl font-bold shadow-md shadow-rose-600/20 transition-all"
                >
                  {editingExpense ? 'Save Changes' : 'Record Expense'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
