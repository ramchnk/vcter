import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  DollarSign, 
  Bed, 
  Users, 
  Utensils, 
  GlassWater, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight,
  PlusCircle,
  Receipt,
  LogOut,
  Sparkles,
  Wine,
  Package,
  RefreshCw,
  Filter,
  CheckCircle,
  ShoppingBag
} from 'lucide-react';

import { 
  getLocalTodayString, 
  getMonthStartString, 
  isDateInRange, 
  isStayInRange, 
  normalizeDateString 
} from '../utils/dateUtils';

interface DashboardViewProps {
  setTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ setTab }) => {
  const { 
    rooms, 
    orders, 
    laundryOrders, 
    hallBookings, 
    preBookings, 
    auditLogs,
    getBillSummary, 
    currentTenant, 
    activeTenantId,
    tenantId,
    userRole,
    refreshData 
  } = useApp();

  const effectiveTenantId = currentTenant?.id || tenantId || activeTenantId;

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Time Range Filter State (defaults to Local Today)
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | '7days' | 'month' | 'all' | 'custom'>('today');
  const [startDate, setStartDate] = useState<string>(() => getLocalTodayString());
  const [endDate, setEndDate] = useState<string>(() => getLocalTodayString());

  // Preset switch handler
  const handleApplyPreset = (preset: 'today' | 'yesterday' | '7days' | 'month' | 'all' | 'custom') => {
    setDatePreset(preset);
    const todayStr = getLocalTodayString();

    if (preset === 'today') {
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
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
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

  const isMenuEnabled = (menuId: string) => {
    if (userRole === 'super_admin') return true;
    if (!currentTenant?.enabledMenus || !Array.isArray(currentTenant.enabledMenus)) return true;
    return currentTenant.enabledMenus.includes(menuId);
  };

  // ==========================================
  // DYNAMIC CALCULATIONS BASED ON FILTER RANGE
  // ==========================================

  // Filter raw collections strictly for this tenant
  const tenantRooms = useMemo(() => {
    return rooms.filter(r => !effectiveTenantId || !r.tenantId || r.tenantId === effectiveTenantId);
  }, [rooms, effectiveTenantId]);

  const tenantOrders = useMemo(() => {
    return orders.filter(o => !effectiveTenantId || !o.tenantId || o.tenantId === effectiveTenantId);
  }, [orders, effectiveTenantId]);

  const tenantLaundry = useMemo(() => {
    return laundryOrders.filter(l => !effectiveTenantId || !l.tenantId || l.tenantId === effectiveTenantId);
  }, [laundryOrders, effectiveTenantId]);

  const tenantHalls = useMemo(() => {
    return hallBookings.filter(h => !effectiveTenantId || !h.tenantId || h.tenantId === effectiveTenantId);
  }, [hallBookings, effectiveTenantId]);

  const tenantPreBookings = useMemo(() => {
    return (preBookings || []).filter(pb => !effectiveTenantId || !pb.tenantId || pb.tenantId === effectiveTenantId);
  }, [preBookings, effectiveTenantId]);

  const tenantAuditLogs = useMemo(() => {
    return (auditLogs || []).filter(a => !effectiveTenantId || !a.tenantId || a.tenantId === effectiveTenantId);
  }, [auditLogs, effectiveTenantId]);

  // 1. Rooms Status Counters (Live in-house state)
  const totalRooms = tenantRooms.length;
  const occupiedRooms = tenantRooms.filter(r => r.status === 'Occupied').length;
  const availableRooms = tenantRooms.filter(r => r.status === 'Available').length;
  const cleaningRooms = tenantRooms.filter(r => r.status === 'Cleaning').length;
  const maintenanceRooms = tenantRooms.filter(r => r.status === 'Maintenance').length;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  
  // Active guest headcount
  const guestsCheckedIn = tenantRooms.reduce((acc, r) => acc + (r.noOfGuests || 0), 0);

  // 2. Filtered Dataset by Date Range
  const filteredOrders = useMemo(() => {
    return tenantOrders.filter(o => isDateInRange(o.timestamp, startDate, endDate));
  }, [tenantOrders, startDate, endDate]);

  const filteredLaundry = useMemo(() => {
    return tenantLaundry.filter(l => isDateInRange(l.timestamp, startDate, endDate));
  }, [tenantLaundry, startDate, endDate]);

  const filteredHalls = useMemo(() => {
    return tenantHalls.filter(h => isDateInRange(h.date, startDate, endDate));
  }, [tenantHalls, startDate, endDate]);

  // 3. Departmental Sales in Selected Period
  // Room Bookings / Rent Sales (including active occupied rooms, checked out rooms, and past checkout records)
  const roomSales = useMemo(() => {
    let total = 0;
    // 1. In-house / currently occupied rooms in this tenant
    tenantRooms.forEach(r => {
      if (r.status === 'Occupied' || (r.checkInDate && r.guestName)) {
        if (isStayInRange(r.checkInDate, r.checkOutDate, startDate, endDate)) {
          const summary = getBillSummary(r.roomNumber);
          total += summary ? summary.roomRentTotal : (r.price || 0);
        }
      } else if (r.advancePaid && r.advancePaid > 0 && isDateInRange(r.checkInDate, startDate, endDate)) {
        total += r.advancePaid;
      }
    });

    // 2. Completed / Checked-Out stays and Pre-Bookings
    tenantPreBookings.forEach(pb => {
      const matchDate = pb.checkOutDate || pb.checkInDate || pb.bookingDate;
      if (isDateInRange(matchDate, startDate, endDate)) {
        if (pb.status === 'CheckedOut') {
          let stayDays = 1;
          if (pb.checkInDate && pb.checkOutDate) {
            const s = new Date(pb.checkInDate).getTime();
            const e = new Date(pb.checkOutDate).getTime();
            stayDays = Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)));
          }
          const matchedRoom = tenantRooms.find(r => r.roomNumber === pb.roomNumber || r.category === pb.roomCategory);
          const roomPrice = matchedRoom ? matchedRoom.price : 2000;
          const rent = pb.roomRentTotal || (pb.totalAmount ? pb.totalAmount : (stayDays * roomPrice));
          total += rent;
        } else if (pb.status === 'Confirmed' || pb.status === 'Pending') {
          if (pb.advancePaid > 0 && !tenantRooms.some(r => r.guestPhone === pb.phone && (r.status === 'Occupied' || r.guestName))) {
            total += pb.advancePaid;
          }
        }
      }
    });

    // 3. Fallback: Parse check-out audit logs for past check-outs not already in preBookings
    tenantAuditLogs.forEach(a => {
      if (a.action === 'Check-Out' && isDateInRange(a.timestamp, startDate, endDate)) {
        const matchRoom = a.details?.match(/Room\s+([A-Za-z0-9_-]+)/i);
        const roomNo = matchRoom ? matchRoom[1] : '';
        const alreadyInPre = tenantPreBookings.some(pb => pb.status === 'CheckedOut' && pb.roomNumber === roomNo && isDateInRange(pb.checkOutDate || pb.bookingDate, startDate, endDate));
        if (!alreadyInPre) {
          const matchRent = a.details?.match(/Room Rent:\s*₹?([0-9]+(?:\.[0-9]+)?)/i);
          const matchTotal = a.details?.match(/Total Folio:\s*₹?([0-9]+(?:\.[0-9]+)?)/i) || a.details?.match(/Total Bill:\s*₹?([0-9]+(?:\.[0-9]+)?)/i);
          const matchPrice = matchRent ? parseFloat(matchRent[1]) : (matchTotal ? parseFloat(matchTotal[1]) : 0);
          if (matchPrice > 0) {
            total += matchPrice;
          } else {
            const matchedRoom = tenantRooms.find(r => r.roomNumber === roomNo);
            if (matchedRoom) total += (matchedRoom.price || 0);
          }
        }
      }
    });

    return total;
  }, [tenantRooms, tenantPreBookings, tenantAuditLogs, startDate, endDate, getBillSummary]);

  const restaurantSales = useMemo(() => {
    return filteredOrders
      .filter(o => !o.isBar)
      .reduce((acc, o) => acc + (o.total || 0), 0);
  }, [filteredOrders]);

  const barSales = useMemo(() => {
    return filteredOrders
      .filter(o => o.isBar)
      .reduce((acc, o) => acc + (o.total || 0), 0);
  }, [filteredOrders]);

  const hallSales = useMemo(() => {
    return filteredHalls
      .filter(h => h.status !== 'Cancelled')
      .reduce((acc, h) => acc + (h.totalPrice || 0), 0);
  }, [filteredHalls]);

  const laundrySales = useMemo(() => {
    return filteredLaundry.reduce((acc, l) => acc + (l.totalPrice || 0), 0);
  }, [filteredLaundry]);

  const laundryPendingCount = useMemo(() => {
    return tenantLaundry.filter(l => l.status === 'Pending').length;
  }, [tenantLaundry]);

  // 4. Period Revenue Calculation
  const periodRevenue = useMemo(() => {
    return roomSales + restaurantSales + barSales + hallSales + laundrySales;
  }, [roomSales, restaurantSales, barSales, hallSales, laundrySales]);

  // 5. Outstanding Balances for Occupied Rooms
  const outstandingPayments = useMemo(() => {
    return tenantRooms
      .filter(r => r.status === 'Occupied')
      .reduce((acc, r) => {
        const summary = getBillSummary(r.roomNumber);
        return acc + (summary ? summary.pendingAmount : 0);
      }, 0);
  }, [tenantRooms, getBillSummary]);

  // Check-ins & Check-outs in selected range
  const periodCheckIns = useMemo(() => {
    return tenantRooms.filter(r => r.status === 'Occupied' && isDateInRange(r.checkInDate, startDate, endDate));
  }, [tenantRooms, startDate, endDate]);

  const periodCheckOuts = useMemo(() => {
    return tenantRooms.filter(r => r.status === 'Occupied' && isDateInRange(r.checkOutDate, startDate, endDate));
  }, [tenantRooms, startDate, endDate]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-700/30 relative overflow-hidden">
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
              HotelVista Control Terminal <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 text-[10px] font-bold border border-indigo-400/30">
              {currentTenant?.name || 'Live ERP'}
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Real-time status overview, multi-department sales tracking, and cashier folios.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all shrink-0"
            title="Fetch latest data from MongoDB"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh Data'}</span>
          </button>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial-gradient from-indigo-500/10 to-transparent opacity-60 pointer-events-none"></div>
      </div>

      {/* Date Range & Quick Preset Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-500" /> Filter Period:
            </span>
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '7days', label: 'Last 7 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'all', label: 'All Time' },
              { id: 'custom', label: 'Custom' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => handleApplyPreset(p.id as any)}
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

          {/* Date Range Inputs */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 p-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 font-bold">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="bg-transparent font-bold font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>
            <span className="text-slate-400 font-bold">to</span>
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 p-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 font-bold">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="bg-transparent font-bold font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>

            {(startDate || endDate) && datePreset !== 'today' && (
              <button
                onClick={() => handleApplyPreset('today')}
                className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                title="Reset to Today"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* STAT 1: Period Revenue */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm flex items-center justify-between group hover:shadow-md hover:border-indigo-500/20 transition-all duration-300">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
              {datePreset === 'today' ? "Today's Revenue" : 'Period Revenue'}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                ₹{periodRevenue.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-emerald-500 flex items-center bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded">
                <ArrowUpRight className="w-3 h-3" /> Live
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              {filteredOrders.length} POS order(s) logged
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xl transition-transform group-hover:scale-105 duration-200">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* STAT 2: Occupancy Rate */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm flex items-center justify-between group hover:shadow-md hover:border-indigo-500/20 transition-all duration-300">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Occupancy Rate</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                {occupancyRate}%
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {occupiedRooms}/{totalRooms} Rooms
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              {availableRooms} clean available
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xl transition-transform group-hover:scale-105 duration-200">
            <Bed className="w-6 h-6" />
          </div>
        </div>

        {/* STAT 3: Active Guest Count */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm flex items-center justify-between group hover:shadow-md hover:border-indigo-500/20 transition-all duration-300">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Guests Checked In</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                {guestsCheckedIn}
              </span>
              <span className="text-xs text-slate-400">Headcount</span>
            </div>
            <p className="text-[10px] text-slate-400">
              {periodCheckIns.length} arrival(s) in period
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xl transition-transform group-hover:scale-105 duration-200">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* STAT 4: Outstanding Balances */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm flex items-center justify-between group hover:shadow-md hover:border-indigo-500/20 transition-all duration-300">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Outstanding Due</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
                ₹{outstandingPayments.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-rose-500 flex items-center bg-rose-50 dark:bg-rose-950/20 px-1.5 py-0.5 rounded">
                <Clock className="w-3 h-3 mr-0.5" /> Due
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Across in-house room folios
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xl transition-transform group-hover:scale-105 duration-200">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Secondary Department Sales Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Room Sales */}
        {isMenuEnabled('rooms') && (
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl flex items-center gap-3 shadow-sm">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <Bed className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Room Bookings</p>
              <p className="text-base font-bold font-mono text-slate-800 dark:text-slate-200">₹{roomSales.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Restaurant Sales */}
        {isMenuEnabled('restaurant') && (
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl flex items-center gap-3 shadow-sm">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Restaurant Sales</p>
              <p className="text-base font-bold font-mono text-slate-800 dark:text-slate-200">₹{restaurantSales.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Bar Sales */}
        {isMenuEnabled('bar') && (
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl flex items-center gap-3 shadow-sm">
            <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">
              <GlassWater className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bar Sales</p>
              <p className="text-base font-bold font-mono text-slate-800 dark:text-slate-200">₹{barSales.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Hall Rent Booked */}
        {isMenuEnabled('hall') && (
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl flex items-center gap-3 shadow-sm">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hall Bookings</p>
              <p className="text-base font-bold font-mono text-slate-800 dark:text-slate-200">₹{hallSales.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Laundry Sales */}
        {isMenuEnabled('laundry') && (
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl flex items-center gap-3 shadow-sm">
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Laundry Sales</p>
              <p className="text-base font-bold font-mono text-slate-800 dark:text-slate-200">
                ₹{laundrySales.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal font-sans">({laundryPendingCount} pending)</span>
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Quick Actions Shortcuts */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Operational Shortcuts
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          
          {isMenuEnabled('rooms') && (
            <button 
              onClick={() => setTab('rooms')} 
              className="flex flex-col items-center justify-center p-3.5 bg-indigo-50/50 hover:bg-indigo-100/60 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 rounded-xl transition-all"
            >
              <PlusCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-1.5" />
              <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">Room Check-In</span>
            </button>
          )}

          {isMenuEnabled('restaurant') && (
            <button 
              onClick={() => setTab('restaurant')} 
              className="flex flex-col items-center justify-center p-3.5 bg-emerald-50/50 hover:bg-emerald-100/60 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30 rounded-xl transition-all"
            >
              <Utensils className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-1.5" />
              <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">Restaurant POS</span>
            </button>
          )}

          {isMenuEnabled('bar') && (
            <button 
              onClick={() => setTab('bar')} 
              className="flex flex-col items-center justify-center p-3.5 bg-violet-50/50 hover:bg-violet-100/60 dark:bg-violet-950/20 dark:hover:bg-violet-950/40 border border-violet-100 dark:border-violet-900/30 rounded-xl transition-all"
            >
              <Wine className="w-5 h-5 text-violet-600 dark:text-violet-400 mb-1.5" />
              <span className="text-xs font-bold text-violet-950 dark:text-violet-200">Bar POS</span>
            </button>
          )}

          {isMenuEnabled('hall') && (
            <button 
              onClick={() => setTab('hall')} 
              className="flex flex-col items-center justify-center p-3.5 bg-amber-50/50 hover:bg-amber-100/60 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 border border-amber-100 dark:border-amber-900/30 rounded-xl transition-all"
            >
              <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400 mb-1.5" />
              <span className="text-xs font-bold text-amber-950 dark:text-amber-200">Hall Booking</span>
            </button>
          )}

          {isMenuEnabled('billing') && (
            <button 
              onClick={() => setTab('billing')} 
              className="flex flex-col items-center justify-center p-3.5 bg-rose-50/50 hover:bg-rose-100/60 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 border border-rose-100 dark:border-rose-900/30 rounded-xl transition-all"
            >
              <Receipt className="w-5 h-5 text-rose-600 dark:text-rose-400 mb-1.5" />
              <span className="text-xs font-bold text-rose-950 dark:text-rose-200">Check Out Bill</span>
            </button>
          )}

          {isMenuEnabled('stock') && (
            <button 
              onClick={() => setTab('stock')} 
              className="flex flex-col items-center justify-center p-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 rounded-xl transition-all"
            >
              <Package className="w-5 h-5 text-slate-600 dark:text-slate-400 mb-1.5" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Inventory</span>
            </button>
          )}

        </div>
      </div>

      {/* Grid of Tables: In-House Guests & Outstanding Bills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Active In-House Guests in Period */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              {datePreset === 'today' ? "Today's Arrivals" : "In-House Arrivals (Period)"}
            </h3>
            <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded">
              {periodCheckIns.length} Guests
            </span>
          </div>
          {periodCheckIns.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">No arrivals recorded in selected period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2">Room</th>
                    <th className="py-2">Guest Name</th>
                    <th className="py-2">Checkout Due</th>
                    <th className="py-2 text-right">Advance Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {periodCheckIns.map(r => (
                    <tr key={r.id} className="text-slate-700 dark:text-slate-300">
                      <td className="py-2 font-bold font-mono text-indigo-600 dark:text-indigo-400">Room {r.roomNumber}</td>
                      <td className="py-2 font-semibold">{r.guestName}</td>
                      <td className="py-2 text-slate-400 font-mono">{r.checkOutDate}</td>
                      <td className="py-2 text-right font-mono font-medium">₹{r.advancePaid || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Outstanding Overviews / High Pending Balances */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Pending Folio Balances
            </h3>
            <span className="text-[10px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded">
              {tenantRooms.filter(r => r.status === 'Occupied').length} Occupied
            </span>
          </div>
          {tenantRooms.filter(r => r.status === 'Occupied').length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">No rooms currently occupied.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2">Room</th>
                    <th className="py-2">Guest Name</th>
                    <th className="py-2">Check In</th>
                    <th className="py-2 text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {tenantRooms
                    .filter(r => r.status === 'Occupied')
                    .map(r => {
                      const summary = getBillSummary(r.roomNumber);
                      return { room: r, summary };
                    })
                    .sort((a, b) => (b.summary?.pendingAmount || 0) - (a.summary?.pendingAmount || 0))
                    .slice(0, 5)
                    .map(({ room, summary }) => (
                      <tr key={room.id} className="text-slate-700 dark:text-slate-300">
                        <td className="py-2 font-bold font-mono text-indigo-600 dark:text-indigo-400">Room {room.roomNumber}</td>
                        <td className="py-2 font-semibold">{room.guestName}</td>
                        <td className="py-2 text-slate-400 font-mono">{room.checkInDate}</td>
                        <td className="py-2 text-right font-bold text-rose-600 dark:text-rose-400 font-mono">
                          ₹{summary ? summary.pendingAmount.toFixed(0) : '0'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
