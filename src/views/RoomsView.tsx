import React, { useState } from 'react';
import { useApp, Room, RoomStatus, RoomCategory, PreBooking } from '../context/AppContext';
import { 
  Plus, 
  ArrowRightLeft, 
  CalendarDays, 
  Clock, 
  UserPlus, 
  Trash2, 
  Check, 
  AlertCircle,
  Receipt,
  RotateCcw,
  Sparkles,
  Info,
  Search
} from 'lucide-react';

interface RoomsViewProps {
  setTab: (tab: string) => void;
  setSelectedRoomForBilling: (roomNo: string) => void;
}

export const RoomsView: React.FC<RoomsViewProps> = ({ setTab, setSelectedRoomForBilling }) => {
  const { 
    rooms, 
    checkInRoom, 
    transferRoom, 
    updateHousekeeping, 
    extendStay, 
    getBillSummary,
    preBookings,
    confirmPreBookingCheckIn
  } = useApp();

  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [roomSearchTerm, setRoomSearchTerm] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  
  // Modals state
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);

  // Forms state
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestIdProof, setGuestIdProof] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestAddress, setGuestAddress] = useState('');
  const [guestGst, setGuestGst] = useState('');
  const [noOfGuests, setNoOfGuests] = useState(1);
  const [advancePaid, setAdvancePaid] = useState(0);

  const [transferTargetRoomId, setTransferTargetRoomId] = useState('');
  const [extendDays, setExtendDays] = useState(1);

  // Status-based color mapping for cards
  const getStatusColorClass = (status: RoomStatus) => {
    switch (status) {
      case 'Available': return 'border-t-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10 text-emerald-800 dark:text-emerald-400';
      case 'Occupied': return 'border-t-rose-500 bg-rose-50/20 dark:bg-rose-950/10 text-rose-800 dark:text-rose-400';
      case 'Reserved': return 'border-t-amber-500 bg-amber-50/20 dark:bg-amber-950/10 text-amber-800 dark:text-amber-400';
      case 'Cleaning': return 'border-t-sky-500 bg-sky-50/20 dark:bg-sky-950/10 text-sky-800 dark:text-sky-400';
      case 'Maintenance': return 'border-t-slate-500 bg-slate-50/20 dark:bg-slate-900/40 text-slate-800 dark:text-slate-400';
      default: return 'border-t-slate-300';
    }
  };

  const getStatusBadgeClass = (status: RoomStatus) => {
    switch (status) {
      case 'Available': return 'bg-emerald-500 text-white';
      case 'Occupied': return 'bg-rose-500 text-white';
      case 'Reserved': return 'bg-amber-500 text-slate-900 font-medium';
      case 'Cleaning': return 'bg-sky-500 text-white';
      case 'Maintenance': return 'bg-slate-500 text-white';
    }
  };

  // Categories list for tabs
  const categories = ['All', 'Standard', 'Semi Premium', 'Premium', 'Suite', 'Family Suite', 'Dormitory'];
  const statuses = ['All', 'Available', 'Occupied', 'Reserved', 'Cleaning', 'Maintenance'];

  // Filter logic
  const filteredRooms = (rooms || []).filter(room => {
    if (!room) return false;
    const matchesCat = categoryFilter === 'All' || room.category === categoryFilter;
    const matchesStat = statusFilter === 'All' || room.status === statusFilter;
    
    const searchLower = (roomSearchTerm || '').toLowerCase().trim();
    const matchesSearch = 
      !searchLower ||
      (room.roomNumber || '').includes(searchLower) ||
      (room.guestName && (room.guestName || '').toLowerCase().includes(searchLower)) ||
      (room.guestPhone && (room.guestPhone || '').includes(searchLower));
      
    return matchesCat && matchesStat && matchesSearch;
  });

  const [selectedPreBookingId, setSelectedPreBookingId] = useState<string>('');

  const todayStr = new Date().toISOString().split('T')[0];

  const applyPreBookingData = (booking: PreBooking | null) => {
    if (booking) {
      setSelectedPreBookingId(booking.id);
      setGuestName(booking.guestName || '');
      setGuestPhone(booking.phone || '');
      setGuestEmail(booking.email || '');
      setGuestAddress(booking.address || '');
      setGuestIdProof(booking.idProof || '');
      setGuestGst(booking.gstNumber || '');
      setNoOfGuests(booking.noOfGuests || 1);
      setAdvancePaid(booking.advancePaid || 0);
    } else {
      setSelectedPreBookingId('');
      setGuestName('');
      setGuestPhone('');
      setGuestEmail('');
      setGuestAddress('');
      setGuestIdProof('');
      setGuestGst('');
      setNoOfGuests(1);
      setAdvancePaid(0);
    }
  };

  const handleOpenCheckIn = (room: Room) => {
    setSelectedRoom(room);

    // Look for a matching prebooking for this exact room number or category for today
    const matchingPre = preBookings.find(pb => 
      (pb.status === 'Confirmed' || pb.status === 'Pending') &&
      ((pb.roomNumber && pb.roomNumber === room.roomNumber) || (pb.roomCategory === room.category && pb.checkInDate === todayStr))
    );

    if (matchingPre) {
      applyPreBookingData(matchingPre);
    } else {
      applyPreBookingData(null);
    }

    setShowCheckInModal(true);
  };

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom || !guestName || !guestPhone || !guestIdProof) return;

    if (selectedPreBookingId) {
      await confirmPreBookingCheckIn(selectedPreBookingId, selectedRoom.id);
    } else {
      await checkInRoom(selectedRoom.id, {
        name: guestName,
        phone: guestPhone,
        email: guestEmail,
        address: guestAddress,
        idProof: guestIdProof,
        gstNumber: guestGst,
        noOfGuests: noOfGuests,
        advancePaid: Number(advancePaid)
      });
    }
    
    setShowCheckInModal(false);
  };

  const handleOpenTransfer = (room: Room) => {
    setSelectedRoom(room);
    setTransferTargetRoomId('');
    setShowTransferModal(true);
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom || !transferTargetRoomId) return;

    transferRoom(selectedRoom.id, transferTargetRoomId);
    setShowTransferModal(false);
  };

  const handleOpenExtend = (room: Room) => {
    setSelectedRoom(room);
    setExtendDays(1);
    setShowExtendModal(true);
  };

  const handleExtendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;

    extendStay(selectedRoom.id, Number(extendDays));
    setShowExtendModal(false);
  };

  const handleOpenBill = (room: Room) => {
    setSelectedRoom(room);
    setShowBillModal(true);
  };

  const handleGoToBilling = (room: Room) => {
    setSelectedRoomForBilling(room.roomNumber);
    setTab('billing');
  };

  return (
    <div className="space-y-6">
      
      {/* Category Tabs & Status Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
        
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                categoryFilter === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status:</span>
          <div className="flex gap-1 flex-wrap">
            {statuses.map(stat => (
              <button
                key={stat}
                onClick={() => setStatusFilter(stat)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all ${
                  statusFilter === stat
                    ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {stat}
              </button>
            ))}
          </div>
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search Room, Name, Phone..."
            value={roomSearchTerm}
            onChange={e => setRoomSearchTerm(e.target.value)}
            className="w-full pl-8 pr-4 py-1.5 text-xs border dark:border-slate-800 dark:bg-slate-950 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {filteredRooms.map(room => {
          const isOccupied = room.status === 'Occupied';
          const isReserved = room.status === 'Reserved';
          const activeBill = isOccupied ? getBillSummary(room.roomNumber) : null;
          
          return (
            <div 
              key={room.id}
              className={`p-5 rounded-2xl border-t-4 border border-slate-200/40 dark:border-slate-800/40 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 ${getStatusColorClass(room.status)}`}
            >
              {/* Header: Room info */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold font-mono text-slate-900 dark:text-white leading-none">
                      {room.roomNumber}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold tracking-wider">
                      Floor {room.floor} ● {room.category}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${getStatusBadgeClass(room.status)}`}>
                    {room.status}
                  </span>
                </div>

                {/* Body: Guest details if occupied */}
                {isOccupied && (
                  <div className="p-3 bg-white/40 dark:bg-slate-900/30 rounded-xl space-y-2 border border-white/30 dark:border-slate-800/30 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400 leading-none">Guest Name</p>
                      <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">{room.guestName}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <p className="text-slate-400">Checked In</p>
                        <p className="font-semibold text-slate-700 dark:text-slate-300 font-mono mt-0.5">{room.checkInDate}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Checkout Due</p>
                        <p className="font-semibold text-slate-700 dark:text-slate-300 font-mono mt-0.5">{room.checkOutDate}</p>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-slate-200/20 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Active Balance</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                        ₹{activeBill ? activeBill.pendingAmount.toFixed(0) : '0'}
                      </span>
                    </div>
                  </div>
                )}

                {isReserved && (
                  <div className="p-3 bg-white/40 dark:bg-slate-900/30 rounded-xl space-y-1.5 border border-white/30 dark:border-slate-800/30 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400 leading-none">Reserved For</p>
                      <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">{room.guestName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 leading-none">Expected Arrival</p>
                      <p className="font-semibold text-slate-700 dark:text-slate-300 font-mono mt-0.5">{room.checkInDate}</p>
                    </div>
                  </div>
                )}

                {!isOccupied && !isReserved && (
                  <div className="py-4 flex flex-col items-center justify-center text-center">
                    {(() => {
                      const matchingTodayPre = preBookings.find(pb => 
                        (pb.status === 'Confirmed' || pb.status === 'Pending') &&
                        ((pb.roomNumber && pb.roomNumber === room.roomNumber) || (pb.roomCategory === room.category && pb.checkInDate === todayStr))
                      );

                      if (matchingTodayPre) {
                        return (
                          <div className="w-full p-2 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 rounded-xl space-y-1">
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1">
                              ⚡ Arrival Today: {matchingTodayPre.guestName}
                            </span>
                            <p className="text-[9px] text-slate-400 font-mono">
                              Adv Paid: ₹{matchingTodayPre.advancePaid || 0}
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="opacity-60 space-y-1">
                          <span className="text-2xl inline-block">
                            {room.status === 'Cleaning' ? '🧹' : room.status === 'Maintenance' ? '🔧' : '✨'}
                          </span>
                          <p className="text-[10px] font-semibold text-slate-500 uppercase">
                            Room Rent: ₹{room.price}/day
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Actions footer */}
              <div className="mt-4 pt-3 border-t border-slate-200/20 flex items-center gap-1.5">
                
                {/* Available Room actions */}
                {room.status === 'Available' && (
                  <>
                    <button
                      onClick={() => handleOpenCheckIn(room)}
                      className="flex-1 py-1.5 text-center text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm"
                    >
                      <UserPlus className="w-3 h-3" /> Check In
                    </button>
                    <button
                      onClick={() => updateHousekeeping(room.id, 'Maintenance')}
                      className="py-1.5 px-2 bg-slate-200/60 dark:bg-slate-800/60 hover:bg-slate-300/60 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold transition-all"
                      title="Send to Maintenance"
                    >
                      Maintenance
                    </button>
                  </>
                )}

                {/* Occupied Room actions */}
                {isOccupied && (
                  <div className="flex flex-wrap gap-1 w-full">
                    <button
                      onClick={() => handleGoToBilling(room)}
                      className="flex-1 py-1.5 text-center text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg flex items-center justify-center gap-1 shadow-sm"
                    >
                      <Receipt className="w-3 h-3" /> Unified Checkout
                    </button>
                    <button
                      onClick={() => handleOpenBill(room)}
                      className="p-1.5 bg-slate-200/60 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold"
                      title="Quick Bill Summary"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenTransfer(room)}
                      className="p-1.5 bg-slate-200/60 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold"
                      title="Room Transfer"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenExtend(room)}
                      className="p-1.5 bg-slate-200/60 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold"
                      title="Extend Stay"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Reserved Room actions */}
                {isReserved && (
                  <>
                    <button
                      onClick={() => {
                        const matchingPre = preBookings.find(pb => pb.roomCategory === room.category && pb.status === 'Confirmed');
                        if (matchingPre) {
                          confirmPreBookingCheckIn(matchingPre.id, room.id);
                        } else {
                          handleOpenCheckIn(room);
                        }
                      }}
                      className="flex-1 py-1.5 text-center text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm"
                    >
                      Confirm Check In
                    </button>
                    <button
                      onClick={() => updateHousekeeping(room.id, 'Available')}
                      className="py-1.5 px-2 bg-slate-200/60 dark:bg-slate-800/60 hover:bg-slate-300/60 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold transition-all"
                    >
                      Release
                    </button>
                  </>
                )}

                {/* Cleaning & Maintenance Room actions */}
                {(room.status === 'Cleaning' || room.status === 'Maintenance') && (
                  <button
                    onClick={() => updateHousekeeping(room.id, 'Available')}
                    className="w-full py-1.5 text-center text-[10px] font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Mark Room Available
                  </button>
                )}

              </div>
            </div>
          );
        })}
      </div>

      {/* ==========================================
          MODAL DIALOGS
          ========================================== */}
      
      {/* 1. CHECK-IN MODAL */}
      {showCheckInModal && selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-150">
                Check In Details — Room {selectedRoom.roomNumber}
              </h3>
              <button onClick={() => setShowCheckInModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
            </div>
            
            <form onSubmit={handleCheckInSubmit} className="space-y-4 text-xs">
              
              {/* Pre-Booking Quick Autofill Selector */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs">
                    <span className="p-1 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">⚡</span>
                    Autofill from Pre-Booking:
                  </label>
                  {selectedPreBookingId && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                      Linked & Autofilled
                    </span>
                  )}
                </div>

                <select
                  value={selectedPreBookingId}
                  onChange={e => {
                    const found = preBookings.find(pb => pb.id === e.target.value);
                    applyPreBookingData(found || null);
                  }}
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-medium text-slate-800 dark:text-slate-200"
                >
                  <option value="">-- Walk-in Guest (Manual Entry) --</option>
                  {preBookings
                    .filter(b => b.status === 'Confirmed' || b.status === 'Pending')
                    .map(b => {
                      const isToday = b.checkInDate === todayStr;
                      const isCatMatch = b.roomCategory === selectedRoom.category;
                      const isRoomMatch = b.roomNumber === selectedRoom.roomNumber;
                      
                      return (
                        <option key={b.id} value={b.id}>
                          {isToday ? '🔥 [TODAY] ' : ''}
                          {b.guestName} ({b.phone}) — {b.roomCategory}
                          {isRoomMatch ? ` [Room ${b.roomNumber}]` : ''} 
                          {b.advancePaid ? ` • Adv: ₹${b.advancePaid}` : ''}
                          {isCatMatch ? ' ✓' : ''}
                        </option>
                      );
                    })}
                </select>

                {selectedPreBookingId && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ All guest details, ID proof, contact & ₹{advancePaid} advance deposit auto-fetched!
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Guest Name *</label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={e => setGuestName(e.target.value)}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg"
                    placeholder="e.g. Rajesh Kumar"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={guestPhone}
                    onChange={e => setGuestPhone(e.target.value)}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg"
                    placeholder="e.g. 9876543210"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Email Address</label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={e => setGuestEmail(e.target.value)}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg"
                    placeholder="guest@gmail.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">ID Proof Details *</label>
                  <input
                    type="text"
                    required
                    value={guestIdProof}
                    onChange={e => setGuestIdProof(e.target.value)}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg"
                    placeholder="Aadhaar / Passport Details"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Address</label>
                <input
                  type="text"
                  value={guestAddress}
                  onChange={e => setGuestAddress(e.target.value)}
                  className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg"
                  placeholder="Complete Address"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">GST Number</label>
                  <input
                    type="text"
                    value={guestGst}
                    onChange={e => setGuestGst(e.target.value)}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg"
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">No of Guests</label>
                  <input
                    type="number"
                    min={1}
                    value={noOfGuests}
                    onChange={e => setNoOfGuests(Number(e.target.value))}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Advance Paid (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={advancePaid}
                    onChange={e => setAdvancePaid(Number(e.target.value))}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCheckInModal(false)}
                  className="px-4 py-2 border dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm transition-colors"
                >
                  Confirm Check-In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. TRANSFER ROOM MODAL */}
      {showTransferModal && selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-150">
                Transfer Room {selectedRoom.roomNumber}
              </h3>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
            </div>
            
            <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                <p className="font-semibold text-slate-700 dark:text-slate-300">Active Guest:</p>
                <p className="text-sm font-bold text-indigo-500 mt-0.5">{selectedRoom.guestName}</p>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-500">Select Target Room *</label>
                <select
                  required
                  value={transferTargetRoomId}
                  onChange={e => setTransferTargetRoomId(e.target.value)}
                  className="w-full p-2.5 border dark:border-slate-800 dark:bg-slate-950 rounded-xl font-medium"
                >
                  <option value="">-- Choose Available Room --</option>
                  {rooms
                    .filter(r => r.status === 'Available')
                    .map(r => (
                      <option key={r.id} value={r.id}>
                        Room {r.roomNumber} ({r.category} - ₹{r.price})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 border dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!transferTargetRoomId}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-sm"
                >
                  Transfer Guest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. EXTEND STAY MODAL */}
      {showExtendModal && selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-150">
                Extend Stay — Room {selectedRoom.roomNumber}
              </h3>
              <button onClick={() => setShowExtendModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
            </div>
            
            <form onSubmit={handleExtendSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs space-y-1">
                <p><span className="text-slate-400">Guest:</span> <strong className="text-slate-700 dark:text-slate-200">{selectedRoom.guestName}</strong></p>
                <p><span className="text-slate-400">Current Checkout Date:</span> <strong className="text-slate-700 dark:text-slate-200 font-mono">{selectedRoom.checkOutDate}</strong></p>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-500">Extend Stay by (Days) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={extendDays}
                  onChange={e => setExtendDays(Number(e.target.value))}
                  className="w-full p-2.5 border dark:border-slate-800 dark:bg-slate-950 rounded-xl font-bold font-mono text-center"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowExtendModal(false)}
                  className="px-4 py-2 border dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm"
                >
                  Apply Extension
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. QUICK BILL SUMMARY MODAL */}
      {showBillModal && selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-150">
                Quick Bill Summary — Room {selectedRoom.roomNumber}
              </h3>
              <button onClick={() => setShowBillModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
            </div>
            
            {(() => {
              const summary = getBillSummary(selectedRoom.roomNumber);
              if (!summary) return <p className="text-xs text-rose-500">Error calculating bill details.</p>;
              
              return (
                <div className="space-y-4 text-xs">
                  {/* Guest details */}
                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
                    <div>
                      <span className="text-slate-400 text-[10px]">Guest Name</span>
                      <p className="font-bold text-slate-800 dark:text-slate-150">{summary.guestName}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 text-[10px]">Check-In Date</span>
                      <p className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{summary.checkInDate}</p>
                    </div>
                  </div>

                  {/* Itemized charges */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Itemized Departmental Charges</h4>
                    <div className="space-y-1.5 p-3 rounded-xl border border-slate-100 dark:border-slate-800 font-mono">
                      
                      <div className="flex justify-between">
                        <span className="text-slate-500">Room Rent ({summary.stayDuration} Days)</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">₹{summary.roomRentTotal}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-slate-500">Restaurant Charges</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">₹{summary.restaurantTotal}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-slate-500">Bar Charges</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">₹{summary.barTotal}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-slate-500">Laundry Charges</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">₹{summary.laundryTotal}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-slate-500">Party Hall Rental</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">₹{summary.hallTotal}</span>
                      </div>

                      {summary.otherCharges > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Other Services</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">₹{summary.otherCharges}</span>
                        </div>
                      )}

                      <div className="border-t border-slate-100 dark:border-slate-800/80 my-1 pt-1.5 flex justify-between font-bold">
                        <span className="text-slate-500 font-sans">Subtotal</span>
                        <span>₹{summary.subtotal}</span>
                      </div>

                      <div className="flex justify-between text-slate-500 text-[10px]">
                        <span>Taxes (GST @{summary.taxRate}%)</span>
                        <span>₹{summary.taxAmount}</span>
                      </div>

                      <div className="flex justify-between text-slate-500 text-[10px]">
                        <span>Advance Payments Paid</span>
                        <span className="text-emerald-500">-₹{summary.advancePaid}</span>
                      </div>

                      <div className="border-t-2 border-slate-200 dark:border-slate-800 my-1 pt-1.5 flex justify-between text-sm font-bold">
                        <span className="text-slate-700 dark:text-slate-200 font-sans">Outstanding Amount</span>
                        <span className="text-rose-500">₹{summary.pendingAmount}</span>
                      </div>

                    </div>
                  </div>

                  {/* Checkout redirect */}
                  <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => setShowBillModal(false)}
                      className="px-4 py-2 border dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        setShowBillModal(false);
                        handleGoToBilling(selectedRoom);
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl flex items-center gap-1.5 shadow-sm"
                    >
                      <Receipt className="w-3.5 h-3.5" /> Direct Checkout
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
};
