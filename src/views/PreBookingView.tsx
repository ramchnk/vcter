import React, { useState, useMemo } from 'react';
import { useApp, PreBooking, RoomCategory, Room } from '../context/AppContext';
import { 
  Calendar, UserPlus, XCircle, CheckCircle, Clock, AlertTriangle, 
  CalendarDays, BedDouble, Search, Filter, ShieldCheck, ChevronLeft, ChevronRight,
  TrendingUp, Users, ArrowRight
} from 'lucide-react';

export const PreBookingView: React.FC = () => {
  const { preBookings, rooms, addPreBooking, cancelPreBooking, confirmPreBookingCheckIn } = useApp();

  // Tab: 'bookings' (List + Form) vs 'matrix' (Visual 14-Day Availability Timeline)
  const [activeTab, setActiveTab] = useState<'bookings' | 'matrix'>('bookings');

  // Form State
  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [idProof, setIdProof] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [roomCategory, setRoomCategory] = useState<RoomCategory>('Standard');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [noOfGuests, setNoOfGuests] = useState(1);
  const [advancePaid, setAdvancePaid] = useState(0);
  const [specialRequests, setSpecialRequests] = useState('');
  
  // Specific room assignment option
  const [assignSpecificRoom, setAssignSpecificRoom] = useState(false);
  const [selectedSpecificRoomId, setSelectedSpecificRoomId] = useState('');

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Confirmed' | 'Pending' | 'CheckedIn' | 'Cancelled'>('ALL');

  // Assignment Modal for Check-In
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<PreBooking | null>(null);
  const [assignRoomId, setAssignRoomId] = useState('');

  // Timeline Matrix Date Navigation (Default: today)
  const [matrixStartDate, setMatrixStartDate] = useState(() => new Date().toISOString().split('T')[0]);

  const categories: RoomCategory[] = ['Standard', 'Semi Premium', 'Premium', 'Suite', 'Family Suite', 'Dormitory'];

  // Helper: Format Date
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Check if two date ranges overlap: [A_start, A_end) and [B_start, B_end)
  const isDateRangeOverlapping = (
    startA: string, 
    endA: string, 
    startB: string, 
    endB: string
  ): boolean => {
    if (!startA || !endA || !startB || !endB) return false;
    // Overlap condition: startA < endB and startB < endA
    return startA < endB && startB < endA;
  };

  // Live Inventory Availability Engine for Selected Category & Dates
  const availabilityAnalysis = useMemo(() => {
    if (!checkInDate || !checkOutDate || checkInDate >= checkOutDate) {
      return null;
    }

    const categoryRooms = rooms.filter(r => r.category === roomCategory);
    const totalRooms = categoryRooms.length;

    if (totalRooms === 0) {
      return {
        totalRooms: 0,
        occupiedCount: 0,
        prebookedCount: 0,
        availableRooms: 0,
        isAvailable: false,
        availableRoomList: [] as Room[],
        message: `No rooms configured in "${roomCategory}" category.`
      };
    }

    // 1. Confirmed / Pending Pre-Bookings that overlap with [checkInDate, checkOutDate)
    const overlappingBookings = preBookings.filter(b => 
      (b.status === 'Confirmed' || b.status === 'Pending') &&
      b.roomCategory === roomCategory &&
      isDateRangeOverlapping(checkInDate, checkOutDate, b.checkInDate, b.checkOutDate)
    );

    // 2. Currently Occupied Rooms of this category that overlap with checkInDate
    const occupiedCategoryRooms = categoryRooms.filter(r => {
      if (r.status !== 'Occupied') return false;
      const roomCheckIn = r.checkInDate || todayStr;
      const roomCheckOut = r.checkOutDate || '9999-12-31';
      return isDateRangeOverlapping(checkInDate, checkOutDate, roomCheckIn, roomCheckOut);
    });

    const bookedCount = overlappingBookings.length;
    const occupiedCount = occupiedCategoryRooms.length;
    const busyRoomIds = new Set([
      ...occupiedCategoryRooms.map(r => r.id),
      ...overlappingBookings.filter(b => b.roomNumber).map(b => {
        const found = rooms.find(r => r.roomNumber === b.roomNumber);
        return found ? found.id : '';
      }).filter(Boolean)
    ]);

    const availableRoomList = categoryRooms.filter(r => !busyRoomIds.has(r.id));
    const availableCount = Math.max(0, totalRooms - (bookedCount + occupiedCount));
    const isAvailable = availableCount > 0;

    return {
      totalRooms,
      occupiedCount,
      prebookedCount: bookedCount,
      availableRooms: availableCount,
      isAvailable,
      availableRoomList,
      message: isAvailable 
        ? `${availableCount} of ${totalRooms} ${roomCategory} rooms available for selected dates.`
        : `Sold Out! All ${totalRooms} ${roomCategory} rooms are booked/occupied for these dates.`
    };
  }, [checkInDate, checkOutDate, roomCategory, rooms, preBookings, todayStr]);

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !phone || !checkInDate || !checkOutDate || !idProof) return;

    if (checkInDate >= checkOutDate) {
      alert('Check-out date must be after check-in date.');
      return;
    }

    if (availabilityAnalysis && !availabilityAnalysis.isAvailable) {
      alert(`Cannot book: ${roomCategory} is fully booked for these dates.`);
      return;
    }

    let assignedRoomNumber: string | undefined = undefined;
    if (assignSpecificRoom && selectedSpecificRoomId) {
      const rm = rooms.find(r => r.id === selectedSpecificRoomId);
      if (rm) assignedRoomNumber = rm.roomNumber;
    }

    await addPreBooking({
      guestName,
      phone,
      email,
      address,
      idProof,
      gstNumber: gstNumber || undefined,
      roomCategory,
      roomNumber: assignedRoomNumber,
      checkInDate,
      checkOutDate,
      noOfGuests,
      advancePaid: Number(advancePaid),
      specialRequests: specialRequests || undefined
    });

    // Reset Form
    setGuestName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setIdProof('');
    setGstNumber('');
    setCheckInDate('');
    setCheckOutDate('');
    setNoOfGuests(1);
    setAdvancePaid(0);
    setSpecialRequests('');
    setAssignSpecificRoom(false);
    setSelectedSpecificRoomId('');
  };

  const handleOpenAssign = (booking: PreBooking) => {
    setSelectedBooking(booking);
    // If booking already had a specific room locked, pre-select it
    if (booking.roomNumber) {
      const match = rooms.find(r => r.roomNumber === booking.roomNumber);
      setAssignRoomId(match ? match.id : '');
    } else {
      setAssignRoomId('');
    }
    setShowAssignModal(true);
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || !assignRoomId) return;

    confirmPreBookingCheckIn(selectedBooking.id, assignRoomId);
    setShowAssignModal(false);
  };

  // Filtered Pre-Bookings List
  const filteredBookings = useMemo(() => {
    return preBookings.filter(b => {
      const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || 
        b.guestName.toLowerCase().includes(q) ||
        b.phone.toLowerCase().includes(q) ||
        b.roomCategory.toLowerCase().includes(q) ||
        (b.roomNumber && b.roomNumber.toLowerCase().includes(q));
      return matchStatus && matchQuery;
    });
  }, [preBookings, statusFilter, searchQuery]);

  // KPIs
  const totalConfirmed = preBookings.filter(b => b.status === 'Confirmed').length;
  const totalAdvancePaid = preBookings
    .filter(b => b.status === 'Confirmed' || b.status === 'CheckedIn')
    .reduce((sum, b) => sum + (b.advancePaid || 0), 0);
  const todayArrivals = preBookings.filter(b => b.status === 'Confirmed' && b.checkInDate === todayStr).length;

  // 14-Day Matrix Date Array
  const matrixDays = useMemo(() => {
    const days: string[] = [];
    const base = new Date(matrixStartDate || new Date());
    for (let i = 0; i < 14; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  }, [matrixStartDate]);

  // Navigate Matrix Dates
  const shiftMatrixDays = (delta: number) => {
    const d = new Date(matrixStartDate);
    d.setDate(d.getDate() + delta);
    setMatrixStartDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Header & Overview Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Calendar className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Pre-Bookings & Advance Reservations
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time room availability forecasting, advance security deposits & check-in assignment.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'bookings'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Bookings & Reservations
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'matrix'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" /> 14-Day Availability Matrix
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Confirmed</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{totalConfirmed}</h3>
            <p className="text-[11px] text-indigo-500 font-semibold mt-1">Upcoming future stays</p>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Arrivals</p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{todayArrivals}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Ready for check-in today</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <UserPlus className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Advance Deposits</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 font-mono">₹{totalAdvancePaid.toLocaleString()}</h3>
            <p className="text-[11px] text-emerald-500 font-semibold mt-1">Collected in advance</p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Inventory</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{rooms.length} Rooms</h3>
            <p className="text-[11px] text-slate-400 mt-1">Across {categories.length} room tiers</p>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-2xl">
            <BedDouble className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: BOOKINGS LIST & ADVANCE RESERVATION CREATION
          ========================================================================= */}
      {activeTab === 'bookings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Pre-Booking Form (Col 5) */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  New Advance Reservation
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                Live Availability Check
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              
              {/* Category & Date Range */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/50 dark:border-slate-800/60 space-y-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 dark:text-slate-300">Room Category *</label>
                  <select
                    value={roomCategory}
                    onChange={e => setRoomCategory(e.target.value as RoomCategory)}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {categories.map(cat => {
                      const count = rooms.filter(r => r.category === cat).length;
                      return (
                        <option key={cat} value={cat}>
                          {cat} ({count} Total Rooms in Property)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 dark:text-slate-300">Check-In Date *</label>
                    <input
                      type="date"
                      required
                      min={todayStr}
                      value={checkInDate}
                      onChange={e => setCheckInDate(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 dark:text-slate-300">Check-Out Date *</label>
                    <input
                      type="date"
                      required
                      min={checkInDate || todayStr}
                      value={checkOutDate}
                      onChange={e => setCheckOutDate(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                {/* Live Availability Feedback Banner */}
                {checkInDate && checkOutDate && availabilityAnalysis && (
                  <div className={`p-3 rounded-xl border transition-all text-xs ${
                    availabilityAnalysis.isAvailable
                      ? availabilityAnalysis.availableRooms <= 1
                        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                        : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      {availabilityAnalysis.isAvailable ? (
                        availabilityAnalysis.availableRooms <= 1 ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        )
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1 flex-1">
                        <p className="font-bold leading-tight">{availabilityAnalysis.message}</p>
                        <div className="flex flex-wrap gap-2 text-[10px] opacity-80 pt-0.5">
                          <span>Total: {availabilityAnalysis.totalRooms}</span>
                          <span>• Overlapping Pre-Bookings: {availabilityAnalysis.prebookedCount}</span>
                          <span>• Currently Occupied: {availabilityAnalysis.occupiedCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Optional: Lock Specific Room */}
                {availabilityAnalysis && availabilityAnalysis.isAvailable && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={assignSpecificRoom}
                        onChange={e => setAssignSpecificRoom(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                        Lock Specific Room Number Now (Optional)
                      </span>
                    </label>

                    {assignSpecificRoom && (
                      <select
                        value={selectedSpecificRoomId}
                        onChange={e => setSelectedSpecificRoomId(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                      >
                        <option value="">-- Auto-assign on Arrival (Default) --</option>
                        {availabilityAnalysis.availableRoomList.map(r => (
                          <option key={r.id} value={r.id}>
                            Room {r.roomNumber} (Floor {r.floor} • ₹{r.price}/night)
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>

              {/* Guest Details */}
              <div className="space-y-1">
                <label className="font-bold text-slate-500">Guest Full Name *</label>
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  placeholder="e.g. Vikramaditya Sharma"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                    placeholder="+91 9876543210"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                    placeholder="guest@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">ID Proof (Aadhaar / Passport) *</label>
                  <input
                    type="text"
                    required
                    value={idProof}
                    onChange={e => setIdProof(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                    placeholder="e.g. Aadhaar 4432-xxxx"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Corporate GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={gstNumber}
                    onChange={e => setGstNumber(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                    placeholder="29ABCDE1234F1Z5"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">City / Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  placeholder="Mumbai, Maharashtra"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">No. of Guests</label>
                  <input
                    type="number"
                    min={1}
                    value={noOfGuests}
                    onChange={e => setNoOfGuests(Number(e.target.value))}
                    className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Advance Deposit (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={advancePaid}
                    onChange={e => setAdvancePaid(Number(e.target.value))}
                    className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Special Notes / Requests</label>
                <input
                  type="text"
                  value={specialRequests}
                  onChange={e => setSpecialRequests(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  placeholder="Late check-in, extra bed, sea view..."
                />
              </div>

              <button
                type="submit"
                disabled={Boolean(availabilityAnalysis && !availabilityAnalysis.isAvailable)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm mt-2"
              >
                <ShieldCheck className="w-4 h-4" />
                Confirm Pre-Booking
              </button>
            </form>
          </div>

          {/* Active Pre-Bookings Table (Col 7) */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-sm p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              
              {/* Table Header & Search Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Reservations Master
                  </h3>
                  <span className="text-[10px] font-bold bg-indigo-500 text-white px-2 py-0.5 rounded-full">
                    {filteredBookings.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search guest or room..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap gap-1.5 text-xs">
                {(['ALL', 'Confirmed', 'Pending', 'CheckedIn', 'Cancelled'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                      statusFilter === tab
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800/60 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab === 'ALL' ? 'All Reservations' : tab}
                  </button>
                ))}
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800 font-semibold">
                      <th className="py-2.5">Guest & Contact</th>
                      <th className="py-2.5">Category & Room</th>
                      <th className="py-2.5">Stay Dates</th>
                      <th className="py-2.5 text-right">Advance Paid</th>
                      <th className="py-2.5 text-center">Status</th>
                      <th className="py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No reservations found matching current filter.
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map(booking => {
                        const isArrivalToday = booking.checkInDate === todayStr && booking.status === 'Confirmed';

                        return (
                          <tr key={booking.id} className="text-slate-700 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-3">
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-slate-900 dark:text-white leading-tight">
                                  {booking.guestName}
                                </p>
                                {isArrivalToday && (
                                  <span className="px-1.5 py-0.2 bg-emerald-500 text-white text-[9px] font-bold rounded">
                                    TODAY
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{booking.phone}</p>
                              {booking.idProof && (
                                <p className="text-[9px] text-slate-400">ID: {booking.idProof}</p>
                              )}
                            </td>

                            <td className="py-3">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">{booking.roomCategory}</span>
                              {booking.roomNumber ? (
                                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-bold mt-0.5">
                                  Room {booking.roomNumber}
                                </p>
                              ) : (
                                <p className="text-[10px] text-slate-400 italic mt-0.5">Auto-pool</p>
                              )}
                            </td>

                            <td className="py-3 font-mono">
                              <p className="text-slate-800 dark:text-slate-200 font-semibold">{booking.checkInDate}</p>
                              <p className="text-[10px] text-slate-400">to {booking.checkOutDate}</p>
                              <p className="text-[9px] text-slate-400">{booking.noOfGuests} Guest(s)</p>
                            </td>

                            <td className="py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                              ₹{(booking.advancePaid || 0).toLocaleString()}
                            </td>

                            <td className="py-3 text-center">
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider inline-block ${
                                booking.status === 'Confirmed' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800' :
                                booking.status === 'CheckedIn' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' :
                                booking.status === 'Pending' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800' :
                                'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                              }`}>
                                {booking.status}
                              </span>
                            </td>

                            <td className="py-3 text-right">
                              {(booking.status === 'Confirmed' || booking.status === 'Pending') && (
                                <div className="flex justify-end items-center gap-1.5">
                                  <button
                                    onClick={() => handleOpenAssign(booking)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm transition-all"
                                    title="Assign Room and Check In"
                                  >
                                    <UserPlus className="w-3 h-3" /> Check In
                                  </button>
                                  <button
                                    onClick={() => cancelPreBooking(booking.id)}
                                    className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                                    title="Cancel Booking"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                              {booking.status === 'CheckedIn' && (
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                  ✓ In-House
                                </span>
                              )}
                              {booking.status === 'Cancelled' && (
                                <span className="text-[10px] text-slate-400 italic">Cancelled</span>
                              )}
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

        </div>
      )}

      {/* =========================================================================
          TAB 2: 14-DAY ROOM AVAILABILITY & OCCUPANCY MATRIX (TIMELINE)
          ========================================================================= */}
      {activeTab === 'matrix' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-sm p-5 space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                14-Day Room Inventory & Occupancy Matrix
              </h3>
              <p className="text-xs text-slate-400">
                Live date-by-date availability tracking across physical rooms & active pre-bookings.
              </p>
            </div>

            {/* Matrix Date Controller */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => shiftMatrixDays(-7)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                title="Previous 7 Days"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMatrixStartDate(todayStr)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Today
              </button>
              <button
                onClick={() => shiftMatrixDays(7)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                title="Next 7 Days"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Matrix Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span> Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-500 inline-block"></span> Pre-Booked (Advance Reservation)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-500 inline-block"></span> Currently Occupied (In-House)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500 inline-block"></span> Cleaning / Maintenance
            </span>
          </div>

          {/* Timeline Grid */}
          <div className="overflow-x-auto border border-slate-200/70 dark:border-slate-800/70 rounded-xl">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3 sticky left-0 z-20 bg-slate-50 dark:bg-slate-950 font-bold min-w-[140px] border-r border-slate-200 dark:border-slate-800">
                    Room
                  </th>
                  {matrixDays.map(dateStr => {
                    const isToday = dateStr === todayStr;
                    const d = new Date(dateStr);
                    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                    const dateNum = d.getDate();
                    const monthName = d.toLocaleDateString('en-US', { month: 'short' });

                    return (
                      <th
                        key={dateStr}
                        className={`p-2 text-center min-w-[75px] border-r border-slate-200 dark:border-slate-800 ${
                          isToday ? 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold' : ''
                        }`}
                      >
                        <div className="text-[10px] uppercase font-semibold">{dayName}</div>
                        <div className="text-xs font-mono font-bold">{dateNum} {monthName}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {rooms.map(room => (
                  <tr key={room.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="p-3 sticky left-0 z-10 bg-white dark:bg-slate-900 font-bold border-r border-slate-200 dark:border-slate-800 shadow-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-slate-900 dark:text-white">Room {room.roomNumber}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal">{room.category}</span>
                    </td>

                    {matrixDays.map(dateStr => {
                      // 1. Is room currently occupied on this date?
                      const isOccupied = room.status === 'Occupied' && (
                        (!room.checkInDate || room.checkInDate <= dateStr) &&
                        (!room.checkOutDate || dateStr < room.checkOutDate)
                      );

                      // 2. Is room reserved specifically via Pre-Booking on this date?
                      const specificBooking = preBookings.find(b => 
                        (b.status === 'Confirmed' || b.status === 'Pending') &&
                        b.roomNumber === room.roomNumber &&
                        b.checkInDate <= dateStr && dateStr < b.checkOutDate
                      );

                      // 3. Maintenance or Cleaning
                      const isMaintenance = room.status === 'Maintenance' || room.status === 'Cleaning';

                      let cellColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400';
                      let cellText = 'Free';

                      if (isOccupied) {
                        cellColor = 'bg-rose-500 text-white font-bold';
                        cellText = room.guestName ? room.guestName.split(' ')[0] : 'Occupied';
                      } else if (specificBooking) {
                        cellColor = 'bg-indigo-500 text-white font-bold';
                        cellText = specificBooking.guestName.split(' ')[0];
                      } else if (isMaintenance) {
                        cellColor = 'bg-amber-500 text-white font-bold';
                        cellText = room.status;
                      }

                      return (
                        <td
                          key={dateStr}
                          className="p-1.5 text-center border-r border-slate-200/50 dark:border-slate-800/50"
                        >
                          <div className={`p-1.5 rounded-lg text-[10px] truncate max-w-[80px] mx-auto transition-all ${cellColor}`} title={cellText}>
                            {cellText}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* =========================================================================
          MODAL: ASSIGN ROOM & CONFIRM CHECK IN
          ========================================================================= */}
      {showAssignModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-150">
                  Assign Room & Check In
                </h3>
              </div>
              <button 
                onClick={() => setShowAssignModal(false)} 
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
              
              {/* Reservation summary card */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-1.5 border border-slate-200/60 dark:border-slate-800/60">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Guest:</span>
                  <strong className="text-slate-900 dark:text-white font-bold">{selectedBooking.guestName}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Reserved Category:</span>
                  <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{selectedBooking.roomCategory}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Stay Duration:</span>
                  <strong className="text-slate-700 dark:text-slate-300 font-mono">
                    {selectedBooking.checkInDate} → {selectedBooking.checkOutDate}
                  </strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Advance Deposit Paid:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                    ₹{(selectedBooking.advancePaid || 0).toLocaleString()}
                  </strong>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-600 dark:text-slate-300">
                  Select Clean & Available Room *
                </label>
                <select
                  required
                  value={assignRoomId}
                  onChange={e => setAssignRoomId(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl font-bold text-slate-900 dark:text-white"
                >
                  <option value="">-- Select Room Number --</option>
                  {rooms
                    .filter(r => r.status === 'Available' && r.category === selectedBooking.roomCategory)
                    .map(r => (
                      <option key={r.id} value={r.id}>
                        Room {r.roomNumber} (Floor {r.floor} • Rate: ₹{r.price}/night)
                      </option>
                    ))}
                  {rooms.filter(r => r.status === 'Available' && r.category === selectedBooking.roomCategory).length === 0 && (
                    <option disabled value="">⚠️ No clean available rooms in {selectedBooking.roomCategory}!</option>
                  )}
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!assignRoomId}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  Confirm Check-In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
