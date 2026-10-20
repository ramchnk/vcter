import React, { useState, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  ArrowLeft, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Plus, 
  Minus, 
  Printer, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Building2, 
  Wine, 
  Receipt,
  ArrowRight,
  Edit2
} from 'lucide-react';
import { useApp, CashWalletTransaction } from '../context/AppContext';
import { formatTime12h } from '../utils/dateUtils';

interface CashWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDepartment?: 'Rooms' | 'Bar';
  initialDate?: string;
}

export const CashWalletModal: React.FC<CashWalletModalProps> = ({
  isOpen,
  onClose,
  defaultDepartment = 'Rooms',
  initialDate
}) => {
  const { 
    cashWalletTransactions = [], 
    addCashWalletTransaction, 
    deleteCashWalletTransaction,
    expenses = [],
    orders = [],
    rooms = [],
    preBookings = [],
    auditLogs = [],
    settings,
    currentTenant,
    tenantId,
    activeTenantId,
    userRole
  } = useApp();

  const effectiveTenantId = currentTenant?.id || tenantId || activeTenantId;

  const [department, setDepartment] = useState<'Rooms' | 'Bar'>(defaultDepartment);
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr);

  // Sub-modal state for Top-Up & Withdrawal
  const [activeActionModal, setActiveActionModal] = useState<'TopUp' | 'Withdrawal' | null>(null);
  const [actionAmount, setActionAmount] = useState<number | string>('');
  const [actionTime, setActionTime] = useState<string>('');
  const [actionRecipient, setActionRecipient] = useState<string>('');
  const [actionNotes, setActionNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sub-modal state for Setting / Adjusting Opening Balance
  const [showOpeningModal, setShowOpeningModal] = useState<boolean>(false);
  const [openingInputAmount, setOpeningInputAmount] = useState<number | string>('');
  const [openingNotes, setOpeningNotes] = useState<string>('');

  // Filter transactions for this tenant and department
  const deptTransactions = useMemo(() => {
    return cashWalletTransactions.filter(tx => 
      (!effectiveTenantId || !tx.tenantId || tx.tenantId === effectiveTenantId) &&
      tx.department === department
    );
  }, [cashWalletTransactions, effectiveTenantId, department]);

  // Tenant filtered expenses for this department
  const deptExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (effectiveTenantId && e.tenantId && e.tenantId !== effectiveTenantId) return false;
      const dept = (e.department || '').toLowerCase().trim();
      const isCash = !e.paymentMethod || e.paymentMethod.toLowerCase() === 'cash';
      if (!isCash) return false;

      if (department === 'Rooms') {
        if (dept === 'rooms') return true;
        if (dept === 'bar' || dept === 'restaurant') return false;
        const cat = (e.category || '').toLowerCase();
        const title = (e.title || '').toLowerCase();
        return !(
          cat.includes('bar') || 
          cat.includes('liquor') || 
          cat.includes('beer') || 
          title.includes('bar') || 
          title.includes('liquor')
        );
      } else {
        // Bar
        if (dept === 'bar') return true;
        if (dept === 'restaurant' || dept === 'rooms') return false;
        const cat = (e.category || '').toLowerCase();
        const title = (e.title || '').toLowerCase();
        return (
          cat.includes('bar') || 
          cat.includes('liquor') || 
          cat.includes('beer') || 
          title.includes('bar') || 
          title.includes('liquor')
        );
      }
    });
  }, [expenses, effectiveTenantId, department]);

  // Compute Daily Cash Collections (Inflows) map by date
  // For Rooms: Cash advances + Cash checkout settlements
  // For Bar: Cash sales orders
  const dailyCashCollectionsMap = useMemo(() => {
    const map = new Map<string, number>();

    if (department === 'Rooms') {
      // 1. Advances paid in Cash
      rooms.forEach(r => {
        if (effectiveTenantId && r.tenantId && r.tenantId !== effectiveTenantId) return;
        const isCash = !r.advancePaymentMethod || r.advancePaymentMethod === 'Cash';
        const advDate = r.advancePaymentDate || r.checkInDate;
        if (isCash && advDate && Number(r.advancePaid || 0) > 0) {
          map.set(advDate, (map.get(advDate) || 0) + Number(r.advancePaid));
        }
      });

      preBookings.forEach(pb => {
        if (effectiveTenantId && pb.tenantId && pb.tenantId !== effectiveTenantId) return;
        const isCash = !pb.advancePaymentMethod || pb.advancePaymentMethod === 'Cash';
        const advDate = pb.advancePaymentDate || pb.checkInDate;
        if (isCash && advDate && Number(pb.advancePaid || 0) > 0) {
          map.set(advDate, (map.get(advDate) || 0) + Number(pb.advancePaid));
        }
      });

      // 2. Checkout Net Settled in Cash (from audit logs)
      auditLogs.forEach(a => {
        if (effectiveTenantId && a.tenantId && a.tenantId !== effectiveTenantId) return;
        if (a.action === 'Check-Out' && a.details) {
          const matchMethod = a.details.match(/Paid via\s+([A-Za-z0-9\s]+?)(?:\s*\(|\.|$)/i);
          const isCash = matchMethod && matchMethod[1].toLowerCase().includes('cash');
          if (isCash) {
            const dateStr = a.timestamp?.split('T')[0] || '';
            const matchNet = a.details.match(/Net Settled:\s*₹?([0-9.]+)/i);
            const matchRent = a.details.match(/Room Rent:\s*₹?([0-9.]+)/i);
            const amt = matchNet ? parseFloat(matchNet[1]) : (matchRent ? parseFloat(matchRent[1]) : 0);
            if (dateStr && amt > 0) {
              map.set(dateStr, (map.get(dateStr) || 0) + amt);
            }
          }
        }

        // 3. Extra Room Charges & Service collected in Cash
        if ((a.action === 'Room Charge & Payment Collected' || a.action === 'Room Charge Added') && a.details) {
          const matchMethod = a.details.match(/via\s+([A-Za-z0-9\s]+?)(?:\s*\(|\.|$)/i);
          const isCash = matchMethod && matchMethod[1].toLowerCase().includes('cash');
          if (isCash) {
            const dateStr = a.timestamp?.split('T')[0] || '';
            const matchAmt = a.details.match(/charge of ₹?([0-9.]+)/i);
            const amt = matchAmt ? parseFloat(matchAmt[1]) : 0;
            if (dateStr && amt > 0) {
              map.set(dateStr, (map.get(dateStr) || 0) + amt);
            }
          }
        }
      });
    } else {
      // Bar Cash Orders
      orders.forEach(o => {
        if (effectiveTenantId && o.tenantId && o.tenantId !== effectiveTenantId) return;
        if (!o.isBar || (o.status as any) === 'Cancelled') return;
        const oDate = o.timestamp ? o.timestamp.split('T')[0] : '';
        if (!oDate) return;

        const amt = Number(o.total || 0);
        const method = (o.paymentMethod || '').toLowerCase();
        
        let cashAmt = 0;
        if (o.type === 'Room' || method === 'room' || o.status === 'PostedToRoom') {
          cashAmt = 0;
        } else if (method.includes('upi') || method.includes('gpay') || method.includes('card') || method.includes('pos')) {
          cashAmt = 0;
        } else if (method.includes('split') && o.splitDetails) {
          try {
            if (o.splitDetails.trim().startsWith('{')) {
              const split = JSON.parse(o.splitDetails);
              cashAmt = Number(split.cash || 0);
            } else {
              const cMatch = o.splitDetails.match(/Cash:\s*₹?([0-9.]+)/i);
              cashAmt = cMatch ? Number(cMatch[1]) : 0;
            }
          } catch {
            cashAmt = amt;
          }
        } else {
          // Default direct walk-in cash
          cashAmt = amt;
        }

        if (cashAmt > 0) {
          map.set(oDate, (map.get(oDate) || 0) + cashAmt);
        }
      });
    }

    return map;
  }, [department, rooms, preBookings, auditLogs, orders, effectiveTenantId]);

  // Compute Daily Cash Expenses map by date
  const dailyCashExpensesMap = useMemo(() => {
    const map = new Map<string, number>();
    deptExpenses.forEach(e => {
      const eDate = e.date ? e.date.split('T')[0] : '';
      if (eDate) {
        map.set(eDate, (map.get(eDate) || 0) + Number(e.amount || 0));
      }
    });
    return map;
  }, [deptExpenses]);

  // 1. CARRY FORWARD OPENING BALANCE CALCULATION
  // Either starts from the latest explicit 'OpeningBalance' baseline on or before selectedDate,
  // or carries forward from inception.
  const openingBalance = useMemo(() => {
    // Find latest OpeningBalance baseline on or before selectedDate
    const baselines = deptTransactions
      .filter(tx => tx.type === 'OpeningBalance' && tx.date <= selectedDate)
      .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));

    const latestBaseline = baselines[0];
    const baselineAmount = latestBaseline ? Number(latestBaseline.amount || 0) : 0;
    const startDate = latestBaseline ? latestBaseline.date : '';

    let netCash = 0;

    // A. Cash Wallet Transactions between startDate and selectedDate (strictly before selectedDate)
    deptTransactions.forEach(tx => {
      if (tx.type === 'OpeningBalance') return;
      const isAfterBaseline = !startDate || tx.date >= startDate;
      if (isAfterBaseline && tx.date < selectedDate) {
        if (tx.type === 'TopUp' || tx.type === 'OpeningAdjustment') {
          netCash += Number(tx.amount || 0);
        } else if (tx.type === 'Withdrawal') {
          netCash -= Number(tx.amount || 0);
        }
      }
    });

    // B. Prior Cash Collections between startDate and selectedDate
    dailyCashCollectionsMap.forEach((amt, date) => {
      const isAfterBaseline = !startDate || date >= startDate;
      if (isAfterBaseline && date < selectedDate) {
        netCash += amt;
      }
    });

    // C. Prior Cash Expenses between startDate and selectedDate
    dailyCashExpensesMap.forEach((amt, date) => {
      const isAfterBaseline = !startDate || date >= startDate;
      if (isAfterBaseline && date < selectedDate) {
        netCash -= amt;
      }
    });

    return baselineAmount + netCash;
  }, [deptTransactions, dailyCashCollectionsMap, dailyCashExpensesMap, selectedDate]);

  // 2. TODAY'S TRANSACTIONS ON SELECTED DATE
  const todayTransactions = useMemo(() => {
    return deptTransactions
      .filter(tx => tx.date === selectedDate && tx.type !== 'OpeningBalance')
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [deptTransactions, selectedDate]);

  // Today Top-Ups
  const todayTopUpsList = useMemo(() => {
    return todayTransactions.filter(tx => tx.type === 'TopUp' || tx.type === 'OpeningAdjustment');
  }, [todayTransactions]);

  const totalTodayTopUps = useMemo(() => {
    return todayTopUpsList.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  }, [todayTopUpsList]);

  // Today Withdrawals
  const todayWithdrawalsList = useMemo(() => {
    return todayTransactions.filter(tx => tx.type === 'Withdrawal');
  }, [todayTransactions]);

  const totalTodayWithdrawals = useMemo(() => {
    return todayWithdrawalsList.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  }, [todayWithdrawalsList]);

  // Today Cash Collections
  const todayCashCollections = useMemo(() => {
    return dailyCashCollectionsMap.get(selectedDate) || 0;
  }, [dailyCashCollectionsMap, selectedDate]);

  // Today Cash Expenses
  const todayCashExpenses = useMemo(() => {
    return dailyCashExpensesMap.get(selectedDate) || 0;
  }, [dailyCashExpensesMap, selectedDate]);

  // TOTALS & NET CLOSING DRAWER BALANCE
  const totalAvailableCash = openingBalance + totalTodayTopUps + todayCashCollections;
  const totalDeductions = todayCashExpenses + totalTodayWithdrawals;
  const netClosingBalance = totalAvailableCash - totalDeductions;

  // Handler for opening the Add Top-Up / Withdrawal modal
  const handleOpenActionModal = (type: 'TopUp' | 'Withdrawal') => {
    setActiveActionModal(type);
    setActionAmount('');
    const nowTimeStr = formatTime12h({ hours: new Date().getHours(), minutes: new Date().getMinutes() });
    setActionTime(nowTimeStr);
    setActionRecipient(
      type === 'Withdrawal' 
        ? (department === 'Bar' ? 'Bar Manager / Owner Handover' : 'Owner / Bank Deposit') 
        : (department === 'Bar' ? 'Bar Float / Register Top-up' : 'Front Desk Register Float')
    );
    setActionNotes('');
  };

  // Submit Top-Up or Withdrawal
  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(actionAmount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    if (activeActionModal === 'Withdrawal' && amt > totalAvailableCash - todayCashExpenses) {
      const confirmExceed = window.confirm(
        `⚠️ Warning: Withdrawal amount (₹${amt}) is higher than the currently calculated drawer cash (₹${(totalAvailableCash - todayCashExpenses).toFixed(2)}).\n\nDo you still wish to record this cash withdrawal?`
      );
      if (!confirmExceed) return;
    }

    setIsSubmitting(true);
    try {
      await addCashWalletTransaction({
        tenantId: effectiveTenantId,
        department: department,
        type: activeActionModal!,
        amount: amt,
        date: selectedDate,
        time: actionTime.trim() || formatTime12h({ hours: new Date().getHours(), minutes: new Date().getMinutes() }),
        performedBy: userRole ? userRole.toUpperCase() : 'CASHIER',
        recipient: actionRecipient.trim() || undefined,
        notes: actionNotes.trim() || undefined
      });
      setActiveActionModal(null);
    } catch (err) {
      console.error(err);
      alert('Failed to save cash transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit direct Opening Balance configuration
  const handleSaveOpeningBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(openingInputAmount);
    if (isNaN(amt) || amt < 0) {
      alert('Please enter a valid opening balance amount.');
      return;
    }
    setIsSubmitting(true);
    try {
      const existing = deptTransactions.find(tx => tx.type === 'OpeningBalance' && tx.date === selectedDate);
      if (existing) {
        await deleteCashWalletTransaction(existing.id);
      }
      await addCashWalletTransaction({
        tenantId: effectiveTenantId,
        department: department,
        type: 'OpeningBalance',
        amount: amt,
        date: selectedDate,
        time: '00:00',
        performedBy: userRole ? userRole.toUpperCase() : 'MANAGER',
        recipient: 'Direct Opening Float Config',
        notes: openingNotes.trim() || 'Opening balance set directly'
      });
      setShowOpeningModal(false);
    } catch (err) {
      console.error(err);
      alert('Failed to update opening balance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete transaction
  const handleDeleteTx = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this cash transaction?')) {
      await deleteCashWalletTransaction(id);
    }
  };

  // Print Cash Handover Voucher / Shift Slip
  const handlePrintSlip = () => {
    const printArea = document.getElementById('wallet-print-container');
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
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${department} Cash Wallet - ${selectedDate}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm 15mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; padding: 10px; font-size: 10pt; }
            .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px; }
            .hotel-name { font-size: 16pt; font-weight: 900; text-transform: uppercase; color: #1e293b; }
            .wallet-title { font-size: 12pt; font-weight: 700; color: ${department === 'Bar' ? '#7e22ce' : '#059669'}; margin-top: 4px; }
            .date-badge { font-size: 10pt; font-weight: 600; color: #64748b; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 9.5pt; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; }
            th { background: #f8fafc; font-weight: 700; text-align: left; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-bold { font-weight: 700; }
            .font-mono { font-family: monospace; }
            .bg-highlight { background-color: #f1f5f9; font-weight: 800; }
            .sign-grid { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 20px; }
            .sign-box { border-top: 1px dashed #475569; width: 180px; text-align: center; font-size: 9pt; padding-top: 4px; }
            .no-print { display: none !important; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="hotel-name">${settings.name || 'HOTEL SUBRA GRAND'}</div>
            <div class="wallet-title">${department.toUpperCase()} CASH WALLET & REGISTER DRAWER SETTLEMENT</div>
            <div class="date-badge">Statement Date: ${selectedDate} | Generated at ${formatTime12h({ hours: new Date().getHours(), minutes: new Date().getMinutes() })}</div>
          </div>
          ${printArea.innerHTML}
          <div class="sign-grid">
            <div class="sign-box">Cashier / Front Staff Sign</div>
            <div class="sign-box">Manager Verification</div>
            <div class="sign-box">Proprietor / Handover Sign</div>
          </div>
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

  const isBar = department === 'Bar';
  const themeBg = isBar ? 'bg-purple-600' : 'bg-emerald-600';
  const themeBorder = isBar ? 'border-purple-200 dark:border-purple-800' : 'border-emerald-200 dark:border-emerald-800';
  const themePill = isBar ? 'bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300' : 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl ${themeBg} text-white flex items-center justify-center font-bold shadow-md`}>
                {isBar ? <Wine className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <span>{department} Cash Wallet & Register Float</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${themePill}`}>
                    Live Drawer Balance
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Carry-forward cash balance, float top-ups, sales collections & cash withdrawals
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Department Toggle */}
            <div className="flex items-center p-0.5 bg-slate-200/80 dark:bg-slate-800 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setDepartment('Rooms')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${department === 'Rooms' ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
              >
                <Building2 className="w-3.5 h-3.5" /> Rooms Wallet
              </button>
              <button
                type="button"
                onClick={() => setDepartment('Bar')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${department === 'Bar' ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
              >
                <Wine className="w-3.5 h-3.5" /> Bar Wallet
              </button>
            </div>

            {/* Date Selector */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[11px] font-bold text-slate-400">Date:</span>
              <input 
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent font-mono font-bold text-slate-800 dark:text-slate-200 text-xs focus:outline-none"
              />
            </div>

            {/* Print Slip */}
            <button
              onClick={handlePrintSlip}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" /> Print Statement
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* Top KPI Cards Waterfall */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. Opening Balance */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">1. Opening Bal.</span>
                <button
                  type="button"
                  onClick={() => {
                    setOpeningInputAmount(String(openingBalance || 0));
                    setOpeningNotes('');
                    setShowOpeningModal(true);
                  }}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                  title="Directly set or edit opening balance"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
              </div>
              <div>
                <p className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white">
                  ₹{openingBalance.toFixed(2)}
                </p>
                <p className="text-[9.5px] text-slate-400 mt-0.5">Carried forward from yesterday</p>
              </div>
            </div>

            {/* 2. Today Top-Ups */}
            <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">2. Float Top-Up</span>
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div>
                <p className="text-base sm:text-lg font-black font-mono text-emerald-700 dark:text-emerald-400">
                  + ₹{totalTodayTopUps.toFixed(2)}
                </p>
                <p className="text-[9.5px] text-emerald-600/80 dark:text-emerald-400/70 mt-0.5">
                  {todayTopUpsList.length} top-up(s) today
                </p>
              </div>
            </div>

            {/* 3. Today Collections */}
            <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-blue-700 dark:text-blue-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">3. Cash Sales</span>
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div>
                <p className="text-base sm:text-lg font-black font-mono text-blue-700 dark:text-blue-400">
                  + ₹{todayCashCollections.toFixed(2)}
                </p>
                <p className="text-[9.5px] text-blue-600/80 dark:text-blue-400/70 mt-0.5">
                  {department} cash collections
                </p>
              </div>
            </div>

            {/* 4. Today Cash Expenses */}
            <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">4. Cash Out</span>
                <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div>
                <p className="text-base sm:text-lg font-black font-mono text-amber-700 dark:text-amber-400">
                  - ₹{todayCashExpenses.toFixed(2)}
                </p>
                <p className="text-[9.5px] text-amber-600/80 dark:text-amber-400/70 mt-0.5">
                  Drawer petty expenses
                </p>
              </div>
            </div>

            {/* 5. Today Withdrawals */}
            <div className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">5. Withdrawals</span>
                <Minus className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <div>
                <p className="text-base sm:text-lg font-black font-mono text-rose-700 dark:text-rose-400">
                  - ₹{totalTodayWithdrawals.toFixed(2)}
                </p>
                <p className="text-[9.5px] text-rose-600/80 dark:text-rose-400/70 mt-0.5">
                  {todayWithdrawalsList.length} cash drop(s)
                </p>
              </div>
            </div>

            {/* 6. Net Closing Drawer Balance */}
            <div className={`p-3.5 rounded-xl ${isBar ? 'bg-purple-900 text-white border-purple-700' : 'bg-emerald-900 text-white border-emerald-700'} border flex flex-col justify-between shadow-lg`}>
              <div className="flex items-center justify-between opacity-80 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">6. Net Balance</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-base sm:text-lg font-black font-mono text-white">
                  ₹{netClosingBalance.toFixed(2)}
                </p>
                <p className="text-[9.5px] opacity-75 mt-0.5">Carries forward to next day</p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons for Top-Up and Withdrawal */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Register Cash Drawer Actions ({department})
              </h3>
              <p className="text-[11px] text-slate-500">
                Add starting register float or log cash handover drops with timestamp
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleOpenActionModal('TopUp')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Top Up Cash / Float
              </button>
              <button
                type="button"
                onClick={() => handleOpenActionModal('Withdrawal')}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
              >
                <Minus className="w-4 h-4" /> Withdraw Cash (Handover)
              </button>
            </div>
          </div>

          {/* Printable Container / Settlement Ledger */}
          <div id="wallet-print-container" className="space-y-4">

            {/* Reconciliation Breakdown Table */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                Cash Flow Reconciliation Ledger ({selectedDate})
              </h4>
              <table className="w-full border-collapse border border-slate-300 dark:border-slate-700 text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    <th className="border border-slate-300 dark:border-slate-700 p-2 text-left">Cash Movement Particular</th>
                    <th className="border border-slate-300 dark:border-slate-700 p-2 text-center w-24">Nature</th>
                    <th className="border border-slate-300 dark:border-slate-700 p-2 text-right w-36">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {/* Opening Balance */}
                  <tr>
                    <td className="border border-slate-300 dark:border-slate-700 p-2 font-medium">
                      <div className="flex items-center justify-between">
                        <span><strong>1. Opening Cash Balance</strong> (Carry forward from previous shift closing)</span>
                        <button
                          type="button"
                          onClick={() => {
                            setOpeningInputAmount(String(openingBalance || 0));
                            setOpeningNotes('');
                            setShowOpeningModal(true);
                          }}
                          className="no-print text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
                        >
                          <Edit2 className="w-2.5 h-2.5" /> Adjust
                        </button>
                      </div>
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 p-2 text-center text-slate-500 font-mono text-[10px]">
                      OPENING
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 p-2 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      ₹{openingBalance.toFixed(2)}
                    </td>
                  </tr>

                  {/* Top-Ups */}
                  <tr>
                    <td className="border border-slate-300 dark:border-slate-700 p-2 font-medium text-emerald-800 dark:text-emerald-300">
                      (+) <strong>Today Float Top-Ups</strong> ({todayTopUpsList.length} entry/entries)
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 p-2 text-center text-emerald-600 font-mono text-[10px]">
                      INFLOW
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 p-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      + ₹{totalTodayTopUps.toFixed(2)}
                    </td>
                  </tr>

                  {/* Collections */}
                  <tr>
                    <td className="border border-slate-300 dark:border-slate-700 p-2 font-medium text-blue-800 dark:text-blue-300">
                      (+) <strong>Today {department} Cash Sales Collections</strong>
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 p-2 text-center text-blue-600 font-mono text-[10px]">
                      INFLOW
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 p-2 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                      + ₹{todayCashCollections.toFixed(2)}
                    </td>
                  </tr>

                  {/* Total Handled */}
                  <tr className="bg-slate-50 dark:bg-slate-900 font-bold">
                    <td className="border border-slate-300 dark:border-slate-700 p-2 text-slate-800 dark:text-slate-200">
                      (=) TOTAL AVAILABLE CASH IN HAND
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 p-2 text-center text-slate-500 font-mono text-[10px]">
                      SUBTOTAL
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 p-2 text-right font-mono font-black text-slate-950 dark:text-white">
                      ₹{totalAvailableCash.toFixed(2)}
                    </td>
                  </tr>

                  {/* Cash Expenses */}
                  <tr>
                    <td className="border border-slate-300 dark:border-slate-700 p-2 font-medium text-amber-800 dark:text-amber-300">
                      (-) <strong>Less: Today Cash Expenses</strong> (Paid out from cash drawer)
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 p-2 text-center text-amber-600 font-mono text-[10px]">
                      EXPENSE
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 p-2 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                      - ₹{todayCashExpenses.toFixed(2)}
                    </td>
                  </tr>

                  {/* Withdrawals */}
                  <tr>
                    <td className="border border-slate-300 dark:border-slate-700 p-2 font-medium text-rose-800 dark:text-rose-300">
                      (-) <strong>Less: Today Withdrawals / Cash Drops</strong> ({todayWithdrawalsList.length} drop(s) to owner/bank)
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 p-2 text-center text-rose-600 font-mono text-[10px]">
                      DROPOUT
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 p-2 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      - ₹{totalTodayWithdrawals.toFixed(2)}
                    </td>
                  </tr>

                  {/* Closing Balance */}
                  <tr className="bg-emerald-50 dark:bg-emerald-950/50 font-black text-emerald-950 dark:text-emerald-200">
                    <td className="border border-slate-300 dark:border-slate-700 p-2 text-sm">
                      (=) NET CLOSING CASH BALANCE (In Register Drawer)
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 p-2 text-center text-emerald-700 dark:text-emerald-400 font-mono text-[10px]">
                      CLOSING
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 p-2 text-right font-mono text-base text-emerald-700 dark:text-emerald-400">
                      ₹{netClosingBalance.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* List of Float Top-Ups & Withdrawals Recorded on this Date */}
            <div className="space-y-1.5 pt-2">
              <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                Logged Top-Ups & Cash Handover Drops ({todayTransactions.length} transaction(s))
              </h4>
              <table className="w-full border-collapse border border-slate-300 dark:border-slate-700 text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    <th className="border border-slate-300 dark:border-slate-700 p-1.5 text-center w-8">#</th>
                    <th className="border border-slate-300 dark:border-slate-700 p-1.5 text-center w-24">Time</th>
                    <th className="border border-slate-300 dark:border-slate-700 p-1.5 text-center w-28">Type</th>
                    <th className="border border-slate-300 dark:border-slate-700 p-1.5 text-left">Person / Handed Over To</th>
                    <th className="border border-slate-300 dark:border-slate-700 p-1.5 text-left">Notes</th>
                    <th className="border border-slate-300 dark:border-slate-700 p-1.5 text-right w-28">Amount (₹)</th>
                    <th className="border border-slate-300 dark:border-slate-700 p-1.5 text-center w-12 no-print">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {todayTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="border border-slate-300 dark:border-slate-700 p-3 text-center text-slate-400">
                        No manual top-ups or cash drops logged for {selectedDate}.
                      </td>
                    </tr>
                  ) : (
                    todayTransactions.map((tx, idx) => {
                      const isTopUp = tx.type === 'TopUp' || tx.type === 'OpeningAdjustment';
                      return (
                        <tr key={tx.id || idx} className={idx % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-900/40' : ''}>
                          <td className="border border-slate-300 dark:border-slate-700 p-1.5 text-center font-mono text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="border border-slate-300 dark:border-slate-700 p-1.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                            {tx.time || '—'}
                          </td>
                          <td className="border border-slate-300 dark:border-slate-700 p-1.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isTopUp ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300'}`}>
                              {isTopUp ? 'Top-Up' : 'Withdrawal'}
                            </span>
                          </td>
                          <td className="border border-slate-300 dark:border-slate-700 p-1.5 font-semibold text-slate-800 dark:text-slate-200">
                            {tx.recipient || tx.performedBy || 'Cashier'}
                          </td>
                          <td className="border border-slate-300 dark:border-slate-700 p-1.5 text-slate-500">
                            {tx.notes || '—'}
                          </td>
                          <td className={`border border-slate-300 dark:border-slate-700 p-1.5 text-right font-mono font-black ${isTopUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {isTopUp ? '+' : '-'} ₹{Number(tx.amount || 0).toFixed(2)}
                          </td>
                          <td className="border border-slate-300 dark:border-slate-700 p-1.5 text-center no-print">
                            <button
                              type="button"
                              onClick={() => handleDeleteTx(tx.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                              title="Delete transaction"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>

        {/* Action Modal (Top-Up or Withdrawal) */}
        {activeActionModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg ${activeActionModal === 'TopUp' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'} flex items-center justify-center font-bold`}>
                    {activeActionModal === 'TopUp' ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {activeActionModal === 'TopUp' ? 'Top Up Cash / Register Float' : 'Record Cash Withdrawal / Drop'}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {department} Wallet • Date: {selectedDate}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveActionModal(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleActionSubmit} className="space-y-3.5 mt-4 text-xs">
                {/* How Much (Amount) */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    How Much (Amount in ₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      required
                      autoFocus
                      value={actionAmount}
                      onChange={e => setActionAmount(e.target.value)}
                      placeholder="e.g. 2000"
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl font-mono text-sm font-bold"
                    />
                  </div>
                </div>

                {/* Time of Withdrawal / Top Up */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Time of {activeActionModal === 'Withdrawal' ? 'Withdrawal' : 'Top-Up'} *</span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">{actionTime}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      value={actionTime}
                      onChange={e => setActionTime(e.target.value)}
                      placeholder="e.g. 02:30 PM"
                      className="flex-1 p-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl font-mono font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => setActionTime(formatTime12h({ hours: new Date().getHours(), minutes: new Date().getMinutes() }))}
                      className="px-2.5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-200"
                    >
                      Now
                    </button>
                  </div>
                </div>

                {/* Recipient / Handed Over To */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    {activeActionModal === 'Withdrawal' ? 'Withdrawn By / Handed Over To' : 'Added By / Float Source'}
                  </label>
                  <input
                    type="text"
                    value={actionRecipient}
                    onChange={e => setActionRecipient(e.target.value)}
                    placeholder={activeActionModal === 'Withdrawal' ? 'e.g. Owner, Bank Deposit, Safe Locker' : 'e.g. Owner, Manager float, Starting shift'}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Notes / Reference Reason (Optional)
                  </label>
                  <input
                    type="text"
                    value={actionNotes}
                    onChange={e => setActionNotes(e.target.value)}
                    placeholder="e.g. Cash drop before bank closing, Voucher #12"
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl"
                  />
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveActionModal(null)}
                    className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-4 py-2 rounded-xl text-white font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50 ${activeActionModal === 'TopUp' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'}`}
                  >
                    {isSubmitting ? 'Saving...' : (activeActionModal === 'TopUp' ? 'Confirm Float Top-Up' : 'Confirm Cash Withdrawal')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Set / Adjust Opening Balance Modal */}
        {showOpeningModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-5 text-xs text-slate-800 dark:text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Set Opening Cash Balance
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      {department} Register • Effective Date: {selectedDate}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOpeningModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveOpeningBalance} className="space-y-3.5">
                <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 text-[10.5px] text-blue-800 dark:text-blue-300">
                  Setting this will establish the opening cash balance for <strong>{selectedDate}</strong>. All subsequent cash collections, top-ups, expenses and withdrawals will carry forward automatically from this baseline.
                </div>

                {/* Amount */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Opening Cash Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      autoFocus
                      value={openingInputAmount}
                      onChange={e => setOpeningInputAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Reason / Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={openingNotes}
                    onChange={e => setOpeningNotes(e.target.value)}
                    placeholder="e.g. Physical cash count verification, Baseline setup"
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl"
                  />
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowOpeningModal(false)}
                    className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl text-white font-bold bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Opening Balance'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
