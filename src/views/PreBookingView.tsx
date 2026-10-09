import React, { useState, useMemo, useEffect } from 'react';
import { useApp, PreBooking, RoomCategory, Room, BOOKING_SOURCES, BulkRoomItem, isOnlineBookingSource } from '../context/AppContext';
import { 
  Calendar, UserPlus, XCircle, CheckCircle, Clock, AlertTriangle, 
  CalendarDays, BedDouble, Search, Filter, ShieldCheck, ChevronLeft, ChevronRight,
  TrendingUp, Users, ArrowRight, Layers, Plus, Trash2, Copy, Building, Check, Globe
} from 'lucide-react';

interface BulkRoomDraft {
  id: string;
  roomCategory: RoomCategory;
  roomNumber: string;
  roomPrice: number;
  noOfGuests: number;
  occupantName: string;
  isAcSwitchedOff: boolean;
}

export const PreBookingView: React.FC = () => {
  const { 
    preBookings, 
    rooms, 
    addPreBooking, 
    addBulkPreBooking,
    cancelPreBooking, 
    confirmPreBookingCheckIn, 
    bulkConfirmPreBookingCheckIn,
    updatePreBookingStatus 
  } = useApp();

  // Tab: 'bookings' (List + Form) vs 'matrix' (Visual 14-Day Availability Timeline)
  const [activeTab, setActiveTab] = useState<'bookings' | 'matrix'>('bookings');

  // Reservation Mode: 'single' (1 Room) vs 'bulk' (Multiple Rooms / Group)
  const [bookingMode, setBookingMode] = useState<'single' | 'bulk'>('single');

  // Form State - Primary / Master Contact Info
  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [idProof, setIdProof] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [bookingSource, setBookingSource] = useState<string>('Direct / Walk-In');
  const [bookingReference, setBookingReference] = useState<string>('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  // Single Room Form State
  const [roomCategory, setRoomCategory] = useState<RoomCategory>('Deluxe AC');
  const [noOfGuests, setNoOfGuests] = useState(1);
  const [advancePaid, setAdvancePaid] = useState(0);
  const [roomPrice, setRoomPrice] = useState<number>(1500);
  const [isAcSwitchedOff, setIsAcSwitchedOff] = useState<boolean>(false);
  const [assignSpecificRoom, setAssignSpecificRoom] = useState(false);
  const [selectedSpecificRoomId, setSelectedSpecificRoomId] = useState('');

  // Bulk / Multi-Room Group State
  const [bulkAdvancePaid, setBulkAdvancePaid] = useState<number>(0);
  const [bulkBookingReference, setBulkBookingReference] = useState<string>('');
  const [bulkRooms, setBulkRooms] = useState<BulkRoomDraft[]>([]);
  const [batchCategory, setBatchCategory] = useState<RoomCategory>('Deluxe AC');
  const [batchRoomCount, setBatchRoomCount] = useState<number>(1);
  const [batchRoomPrice, setBatchRoomPrice] = useState<number>(1500);
  const [batchGuestsPerRoom, setBatchGuestsPerRoom] = useState<number>(2);
  const [batchIsNonAc, setBatchIsNonAc] = useState<boolean>(false);
  const [showRoomDetailEditor, setShowRoomDetailEditor] = useState<boolean>(false);

  // Bulk Group Check-In Modal
  const [showGroupCheckInModal, setShowGroupCheckInModal] = useState(false);
  const [selectedGroupBookingId, setSelectedGroupBookingId] = useState('');
  const [groupRoomAssignments, setGroupRoomAssignments] = useState<{ [preBookingId: string]: string }>({});

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Confirmed' | 'Pending' | 'CheckedIn' | 'CheckedOut' | 'Cancelled'>('ALL');

  // Assignment Modal for Check-In
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<PreBooking | null>(null);
  const [assignRoomId, setAssignRoomId] = useState('');

  // Timeline Matrix Date Navigation (Default: today)
  const [matrixStartDate, setMatrixStartDate] = useState(() => new Date().toISOString().split('T')[0]);

  const categories: RoomCategory[] = ['Deluxe AC', 'Deluxe Superior', 'Elite', 'Superior', 'Family Suite', 'Non AC'];

  // Helper: Get actual room rate configured for a category from rooms inventory
  const getCategoryDefaultPrice = (cat: RoomCategory, isNonAc: boolean = false): number => {
    const match = rooms.find(r => r.category === cat);
    if (match) {
      return isNonAc ? Math.max(500, Math.round(match.price * 0.67)) : match.price;
    }
    const fallbackPrices: Record<RoomCategory, number> = {
      'Deluxe AC': 1500,
      'Deluxe Superior': 2500,
      'Elite': 4000,
      'Superior': 5500,
      'Family Suite': 8000,
      'Non AC': 1000
    };
    const base = fallbackPrices[cat] || 1500;
    return isNonAc ? Math.max(500, Math.round(base * 0.67)) : base;
  };

  // Helper: Format Date
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Sync room price with actual room catalog price when rooms load or category changes
  useEffect(() => {
    if (rooms.length > 0) {
      if (selectedSpecificRoomId) {
        const specificRoom = rooms.find(r => r.id === selectedSpecificRoomId);
        if (specificRoom) {
          setRoomPrice(isAcSwitchedOff ? Math.max(500, Math.round(specificRoom.price * 0.67)) : specificRoom.price);
        }
      } else {
        setRoomPrice(getCategoryDefaultPrice(roomCategory, isAcSwitchedOff));
      }
    }
  }, [rooms, roomCategory, isAcSwitchedOff, selectedSpecificRoomId]);

  useEffect(() => {
    if (rooms.length > 0) {
      setBatchRoomPrice(getCategoryDefaultPrice(batchCategory, batchIsNonAc));
    }
  }, [rooms, batchCategory, batchIsNonAc]);

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

  // Reusable Category Live Availability Engine for any Category and Date Range
  const getCategoryAvailability = (cat: RoomCategory, cIn?: string, cOut?: string) => {
    const categoryRooms = rooms.filter(r => r.category === cat);
    const totalRooms = categoryRooms.length;

    if (totalRooms === 0) {
      return {
        totalRooms: 0,
        occupiedCount: 0,
        prebookedCount: 0,
        availableRooms: 0,
        isAvailable: false,
        availableRoomList: [] as Room[],
        hasDates: Boolean(cIn && cOut && cIn < cOut)
      };
    }

    if (!cIn || !cOut || cIn >= cOut) {
      return {
        totalRooms,
        occupiedCount: 0,
        prebookedCount: 0,
        availableRooms: totalRooms,
        isAvailable: totalRooms > 0,
        availableRoomList: categoryRooms,
        hasDates: false
      };
    }

    // 1. Confirmed / Pending Pre-Bookings overlapping with [cIn, cOut)
    const overlappingBookings = preBookings.filter(b => 
      (b.status === 'Confirmed' || b.status === 'Pending') &&
      b.roomCategory === cat &&
      isDateRangeOverlapping(cIn, cOut, b.checkInDate, b.checkOutDate)
    );

    // 2. Currently Occupied Rooms of this category overlapping with [cIn, cOut)
    const occupiedCategoryRooms = categoryRooms.filter(r => {
      if (r.status !== 'Occupied') return false;
      const roomCheckIn = r.checkInDate || todayStr;
      const roomCheckOut = r.checkOutDate || '9999-12-31';
      return isDateRangeOverlapping(cIn, cOut, roomCheckIn, roomCheckOut);
    });

    const bookedCount = overlappingBookings.length;
    const occupiedCount = occupiedCategoryRooms.length;
    const busyRoomIds = new Set([
      ...occupiedCategoryRooms.map(r => r.id),
      ...overlappingBookings.filter(b => b.roomNumber).map(b => {
        const found = rooms.find(rm => rm.roomNumber === b.roomNumber);
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
      hasDates: true
    };
  };

  // Single Booking Mode Availability Analysis
  const availabilityAnalysis = useMemo(() => {
    if (!checkInDate || !checkOutDate || checkInDate >= checkOutDate) {
      return null;
    }
    const res = getCategoryAvailability(roomCategory, checkInDate, checkOutDate);
    return {
      ...res,
      message: res.isAvailable 
        ? `${res.availableRooms} of ${res.totalRooms} ${roomCategory} rooms available for selected dates.`
        : `Sold Out! All ${res.totalRooms} ${roomCategory} rooms are booked/occupied for these dates.`
    };
  }, [checkInDate, checkOutDate, roomCategory, rooms, preBookings, todayStr]);

  // Bulk Mode: Live availability for currently selected batch category
  const batchAvailability = useMemo(() => {
    return getCategoryAvailability(batchCategory, checkInDate, checkOutDate);
  }, [batchCategory, checkInDate, checkOutDate, rooms, preBookings, todayStr]);

  // Bulk Mode: Count of currently draft-selected rooms for this batch category
  const batchDraftCount = useMemo(() => {
    return bulkRooms.filter(r => r.roomCategory === batchCategory).length;
  }, [bulkRooms, batchCategory]);

  // Bulk Mode: Remaining rooms available to add for batchCategory without overbooking
  const batchRemainingAvailable = useMemo(() => {
    return Math.max(0, batchAvailability.availableRooms - batchDraftCount);
  }, [batchAvailability, batchDraftCount]);

  // Calculate duration in nights
  const stayNights = useMemo(() => {
    if (!checkInDate || !checkOutDate || checkInDate >= checkOutDate) return 1;
    const s = new Date(checkInDate).getTime();
    const e = new Date(checkOutDate).getTime();
    return Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)));
  }, [checkInDate, checkOutDate]);

  // Identify any categories in bulkRooms that exceed live available rooms (Overbooking Detector)
  const bulkOverbookingIssues = useMemo(() => {
    if (!checkInDate || !checkOutDate || checkInDate >= checkOutDate) return [];
    
    // Group draft counts by category
    const catCountMap = new Map<RoomCategory, number>();
    bulkRooms.forEach(r => {
      catCountMap.set(r.roomCategory, (catCountMap.get(r.roomCategory) || 0) + 1);
    });

    const issues: { category: RoomCategory; draftCount: number; availableRooms: number; excess: number }[] = [];
    catCountMap.forEach((draftCount, cat) => {
      const avail = getCategoryAvailability(cat, checkInDate, checkOutDate);
      if (draftCount > avail.availableRooms) {
        issues.push({
          category: cat,
          draftCount,
          availableRooms: avail.availableRooms,
          excess: draftCount - avail.availableRooms
        });
      }
    });

    return issues;
  }, [bulkRooms, checkInDate, checkOutDate, rooms, preBookings, todayStr]);

  // Fix / Trim overbooked category back down to available room count
  const trimCategoryToAvailable = (cat: RoomCategory, maxAllowed: number) => {
    setBulkRooms(prev => {
      let keepCount = 0;
      return prev.filter(r => {
        if (r.roomCategory !== cat) return true;
        keepCount++;
        return keepCount <= maxAllowed;
      });
    });
  };

  // Form Submit Handler (Single Mode)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !phone || !checkInDate || !checkOutDate) return;

    if (checkInDate >= checkOutDate) {
      alert('Check-out date must be after check-in date.');
      return;
    }

    if (availabilityAnalysis && !availabilityAnalysis.isAvailable) {
      alert(`Cannot book: ${roomCategory} is fully booked for these dates.`);
      return;
    }

    if (isOnlineBookingSource(bookingSource) && !bookingReference.trim()) {
      alert(`Please enter the Online Booking Reference Number (e.g. OTA Confirmation / Voucher ID for ${bookingSource}).`);
      return;
    }

    let assignedRoomNumber: string | undefined = undefined;
    if (assignSpecificRoom && selectedSpecificRoomId) {
      const rm = rooms.find(r => r.id === selectedSpecificRoomId);
      if (rm) assignedRoomNumber = rm.roomNumber;
    }

    const nightlyRate = Number(roomPrice) || 1500;
    const estTotalFolio = stayNights * nightlyRate;

    await addPreBooking({
      guestName,
      phone,
      email,
      address,
      idProof: idProof || undefined,
      gstNumber: gstNumber || undefined,
      roomCategory,
      roomNumber: assignedRoomNumber,
      roomPrice: nightlyRate,
      bookingSource: bookingSource,
      bookingReference: bookingReference.trim() || undefined,
      isAcSwitchedOff: isAcSwitchedOff,
      checkInDate,
      checkOutDate,
      noOfGuests,
      advancePaid: Number(advancePaid),
      totalAmount: estTotalFolio,
      roomRentTotal: estTotalFolio,
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
    setRoomPrice(getCategoryDefaultPrice('Deluxe AC', false));
    setBookingSource('Direct / Walk-In');
    setBookingReference('');
    setIsAcSwitchedOff(false);
    setSpecialRequests('');
    setAssignSpecificRoom(false);
    setSelectedSpecificRoomId('');
  };

  // Bulk / Group Room Category Batch Handlers
  const handleBatchCategoryChange = (cat: RoomCategory) => {
    setBatchCategory(cat);
    const price = getCategoryDefaultPrice(cat, batchIsNonAc);
    setBatchRoomPrice(price);
    
    // Auto-adjust batch count if remaining is lower
    const avail = getCategoryAvailability(cat, checkInDate, checkOutDate);
    const inDraft = bulkRooms.filter(r => r.roomCategory === cat).length;
    const remaining = Math.max(0, avail.availableRooms - inDraft);
    if (remaining > 0 && batchRoomCount > remaining) {
      setBatchRoomCount(remaining);
    } else if (remaining > 0 && batchRoomCount === 0) {
      setBatchRoomCount(1);
    }
  };

  const handleAddBatchCategory = () => {
    if (!checkInDate || !checkOutDate || checkInDate >= checkOutDate) {
      alert('Please select valid Check-In and Check-Out dates first to check room inventory.');
      return;
    }

    const count = Number(batchRoomCount);
    if (count <= 0) {
      alert('Please select at least 1 room to add.');
      return;
    }

    if (count > batchRemainingAvailable) {
      alert(`⚠️ Overbooking Prevented: Cannot add ${count} rooms.\nOnly ${batchRemainingAvailable} "${batchCategory}" room(s) are available for the selected dates.\n(Total available: ${batchAvailability.availableRooms}, Already added in group: ${batchDraftCount})`);
      return;
    }

    const newItems: BulkRoomDraft[] = [];
    for (let i = 0; i < count; i++) {
      newItems.push({
        id: Date.now().toString() + '_' + i + '_' + Math.floor(Math.random() * 1000),
        roomCategory: batchCategory,
        roomNumber: '',
        roomPrice: Number(batchRoomPrice) || 1500,
        noOfGuests: Number(batchGuestsPerRoom) || 2,
        occupantName: '',
        isAcSwitchedOff: batchIsNonAc
      });
    }
    setBulkRooms(prev => [...prev, ...newItems]);
  };

  const removeCategoryBatch = (category: RoomCategory, isNonAc: boolean) => {
    setBulkRooms(prev => prev.filter(r => !(r.roomCategory === category && r.isAcSwitchedOff === isNonAc)));
  };

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { category: RoomCategory; count: number; totalRentPerNight: number; price: number; isNonAc: boolean }>();
    bulkRooms.forEach(r => {
      const key = `${r.roomCategory}_${r.isAcSwitchedOff ? 'nonac' : 'ac'}`;
      const existing = map.get(key) || { category: r.roomCategory, count: 0, totalRentPerNight: 0, price: r.roomPrice, isNonAc: r.isAcSwitchedOff };
      existing.count += 1;
      existing.totalRentPerNight += Number(r.roomPrice) || 1500;
      map.set(key, existing);
    });
    return Array.from(map.entries()).map(([key, val]) => ({
      key,
      category: val.category,
      isNonAc: val.isNonAc,
      count: val.count,
      price: val.price,
      totalRentPerNight: val.totalRentPerNight,
      totalStayRent: val.totalRentPerNight * stayNights
    }));
  }, [bulkRooms, stayNights]);

  const addBulkRoomRow = () => {
    if (batchRemainingAvailable <= 0) {
      alert(`Cannot add more rooms in "${batchCategory}": No more rooms available for these dates.`);
      return;
    }
    setBulkRooms(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        roomCategory: batchCategory,
        roomNumber: '',
        roomPrice: batchRoomPrice || 1500,
        noOfGuests: batchGuestsPerRoom || 2,
        occupantName: '',
        isAcSwitchedOff: batchIsNonAc
      }
    ]);
  };

  const duplicateBulkRoomRow = (id: string) => {
    const item = bulkRooms.find(r => r.id === id);
    if (!item) return;
    
    // Check availability for this category
    const avail = getCategoryAvailability(item.roomCategory, checkInDate, checkOutDate);
    const inDraft = bulkRooms.filter(r => r.roomCategory === item.roomCategory).length;
    if (inDraft >= avail.availableRooms) {
      alert(`Cannot duplicate: All ${avail.availableRooms} "${item.roomCategory}" rooms available for these dates are already allocated.`);
      return;
    }

    setBulkRooms(prev => [
      ...prev,
      {
        ...item,
        id: Date.now().toString() + '_' + Math.floor(Math.random() * 100),
        roomNumber: '' // reset room lock
      }
    ]);
  };

  const removeBulkRoomRow = (id: string) => {
    setBulkRooms(prev => prev.filter(r => r.id !== id));
  };

  const updateBulkRoom = (id: string, field: keyof BulkRoomDraft, value: any) => {
    setBulkRooms(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      if (field === 'roomCategory') {
        updated.roomPrice = getCategoryDefaultPrice(value as RoomCategory, updated.isAcSwitchedOff);
        updated.roomNumber = '';
      }
      return updated;
    }));
  };

  const bulkTotalRoomRent = useMemo(() => {
    return bulkRooms.reduce((sum, r) => sum + (Number(r.roomPrice) || 1500) * stayNights, 0);
  }, [bulkRooms, stayNights]);

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !phone || !checkInDate || !checkOutDate) {
      alert('Please fill all mandatory organizer fields (Name, Phone, Dates).');
      return;
    }
    if (checkInDate >= checkOutDate) {
      alert('Check-out date must be after check-in date.');
      return;
    }
    if (bulkRooms.length === 0) {
      alert('Please configure at least one room.');
      return;
    }

    if (isOnlineBookingSource(bookingSource) && !bulkBookingReference.trim()) {
      alert(`Please enter the Group Online Booking Reference Number (e.g. OTA Confirmation / Voucher ID for ${bookingSource}).`);
      return;
    }

    // Strict Overbooking Guard
    if (bulkOverbookingIssues.length > 0) {
      const issueDetails = bulkOverbookingIssues
        .map(i => `• ${i.category}: ${i.draftCount} rooms selected, but only ${i.availableRooms} available (${i.excess} overbooked)`)
        .join('\n');
      alert(`⚠️ Cannot Confirm Booking - Overbooking Detected!\n\n${issueDetails}\n\nPlease adjust room counts or change stay dates.`);
      return;
    }

    const res = await addBulkPreBooking({
      guestName,
      phone,
      email,
      address,
      idProof: idProof || undefined,
      gstNumber: gstNumber || undefined,
      bookingSource,
      bookingReference: bulkBookingReference.trim() || undefined,
      checkInDate,
      checkOutDate,
      totalAdvancePaid: Number(bulkAdvancePaid) || 0,
      specialRequests: specialRequests || undefined,
      rooms: bulkRooms.map(r => ({
        roomCategory: r.roomCategory,
        roomNumber: r.roomNumber || undefined,
        roomPrice: Number(r.roomPrice) || 1500,
        noOfGuests: Number(r.noOfGuests) || 1,
        occupantName: r.occupantName || guestName,
        isAcSwitchedOff: r.isAcSwitchedOff
      }))
    });

    if (res.createdCount > 0) {
      alert(`🎉 Group Reservation [${res.groupBookingId}] created successfully with ${res.createdCount} rooms!`);
      setGuestName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setIdProof('');
      setGstNumber('');
      setCheckInDate('');
      setCheckOutDate('');
      setBulkAdvancePaid(0);
      setBulkBookingReference('');
      setSpecialRequests('');
      setBulkRooms([]);
    }
  };

  const handleOpenAssign = (booking: PreBooking) => {
    setSelectedBooking(booking);
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

  // Bulk Group Check-In Handler
  const handleOpenGroupCheckIn = (groupBookingId: string) => {
    setSelectedGroupBookingId(groupBookingId);
    const grpList = preBookings.filter(p => p.groupBookingId === groupBookingId && (p.status === 'Confirmed' || p.status === 'Pending'));
    const initialMap: { [id: string]: string } = {};
    const used = new Set<string>();

    grpList.forEach(pb => {
      if (pb.roomNumber) {
        const match = rooms.find(r => r.roomNumber === pb.roomNumber);
        if (match && match.status === 'Available' && !used.has(match.id)) {
          initialMap[pb.id] = match.id;
          used.add(match.id);
        }
      }
    });

    // Auto assign unassigned ones
    grpList.forEach(pb => {
      if (!initialMap[pb.id]) {
        const match = rooms.find(r => r.category === pb.roomCategory && r.status === 'Available' && !used.has(r.id));
        if (match) {
          initialMap[pb.id] = match.id;
          used.add(match.id);
        }
      }
    });

    setGroupRoomAssignments(initialMap);
    setShowGroupCheckInModal(true);
  };

  const handleGroupCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupBookingId) return;
    await bulkConfirmPreBookingCheckIn(selectedGroupBookingId, groupRoomAssignments);
    setShowGroupCheckInModal(false);
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
        (b.roomNumber && b.roomNumber.toLowerCase().includes(q)) ||
        (b.bookingReference && b.bookingReference.toLowerCase().includes(q)) ||
        (b.groupBookingId && b.groupBookingId.toLowerCase().includes(q));
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
                  New Reservation
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                Live Availability Check
              </span>
            </div>

            {/* Mode Switcher: Single Room vs Bulk / Group Booking */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setBookingMode('single')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  bookingMode === 'single'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <BedDouble className="w-3.5 h-3.5" /> Single Room
              </button>
              <button
                type="button"
                onClick={() => setBookingMode('bulk')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  bookingMode === 'bulk'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Bulk / Group ({bulkRooms.length} Rooms)
              </button>
            </div>

            {/* ================= SINGLE ROOM FORM ================= */}
            {bookingMode === 'single' ? (
              <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                {/* Category & Date Range */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/50 dark:border-slate-800/60 space-y-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 dark:text-slate-300">Room Category *</label>
                    <select
                      value={roomCategory}
                      onChange={e => {
                        const newCat = e.target.value as RoomCategory;
                        setRoomCategory(newCat);
                        setSelectedSpecificRoomId('');
                        setRoomPrice(getCategoryDefaultPrice(newCat, isAcSwitchedOff));
                      }}
                      className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20"
                    >
                      {categories.map(cat => {
                        const count = rooms.filter(r => r.category === cat).length;
                        const defaultPrice = getCategoryDefaultPrice(cat, false);
                        return (
                          <option key={cat} value={cat}>
                            {cat} ({count} Total Rooms • ₹{defaultPrice}/night)
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
                          onChange={e => {
                            const rId = e.target.value;
                            setSelectedSpecificRoomId(rId);
                            if (rId) {
                              const specificRoom = rooms.find(r => r.id === rId);
                              if (specificRoom) {
                                setRoomPrice(isAcSwitchedOff ? Math.max(500, Math.round(specificRoom.price * 0.67)) : specificRoom.price);
                              }
                            } else {
                              setRoomPrice(getCategoryDefaultPrice(roomCategory, isAcSwitchedOff));
                            }
                          }}
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

                {/* Room Nightly Tariff & Booking Channel */}
                <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200/60 dark:border-indigo-800/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                      <span>💰</span>
                      <span>Agreed Room Rate & Channel Source</span>
                    </label>
                    <span className="text-[10px] font-bold font-mono text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                      Est. Total: ₹{(stayNights * (roomPrice || 1500)).toLocaleString()} ({stayNights}N)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 dark:text-slate-300 text-[11px] block">
                        Nightly Room Rate (₹/Day) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 font-mono font-bold text-slate-400">₹</span>
                        <input
                          type="number"
                          required
                          min={1}
                          value={roomPrice}
                          onChange={e => setRoomPrice(Number(e.target.value))}
                          className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 text-sm focus:ring-2 focus:ring-indigo-500/20"
                          placeholder="1500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 dark:text-slate-300 text-[11px] block">
                        Booking Channel / Source
                      </label>
                      <select
                        value={bookingSource}
                        onChange={e => setBookingSource(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-800 dark:text-slate-200 text-xs"
                      >
                        {BOOKING_SOURCES.map(source => (
                          <option key={source} value={source}>
                            {source}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Online OTA Booking Reference Number Field */}
                  {isOnlineBookingSource(bookingSource) && (
                    <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/80 rounded-xl space-y-1.5 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <label className="font-black text-amber-900 dark:text-amber-200 text-[11px] flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-amber-600" />
                          <span>Online Booking Reference / Voucher ID *</span>
                        </label>
                        <span className="text-[9px] font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 px-1.5 py-0.2 rounded">
                          Mandatory OTA Field
                        </span>
                      </div>
                      <input
                        type="text"
                        required
                        value={bookingReference}
                        onChange={e => setBookingReference(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg font-mono font-bold text-amber-950 dark:text-amber-100 text-xs uppercase"
                        placeholder="e.g. MMT98234120, BDC-88491, AGD-10294..."
                      />
                      <p className="text-[10px] text-amber-800 dark:text-amber-300">
                        Collect and store the OTA reservation ID for front-desk voucher verification and reconciliation.
                      </p>
                    </div>
                  )}

                  {/* Quick AC / Non-AC Mode Toggle */}
                  <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/40 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      AC Mode Option:
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAcSwitchedOff(false);
                          const base = selectedSpecificRoomId 
                            ? (rooms.find(r => r.id === selectedSpecificRoomId)?.price || getCategoryDefaultPrice(roomCategory, false))
                            : getCategoryDefaultPrice(roomCategory, false);
                          setRoomPrice(base);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          !isAcSwitchedOff
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        ❄️ AC Active
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAcSwitchedOff(true);
                          const base = selectedSpecificRoomId 
                            ? (rooms.find(r => r.id === selectedSpecificRoomId)?.price || getCategoryDefaultPrice(roomCategory, false))
                            : getCategoryDefaultPrice(roomCategory, false);
                          setRoomPrice(Math.max(500, Math.round(base * 0.67)));
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          isAcSwitchedOff
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        🍃 Non-AC (AC Off)
                      </button>
                    </div>
                  </div>
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
                    <label className="font-bold text-slate-500">ID Proof (Aadhaar / Passport) (Optional)</label>
                    <input
                      type="text"
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
            ) : (
              /* ================= BULK / GROUP BOOKING FORM ================= */
              <form onSubmit={handleBulkSubmit} className="space-y-4 text-xs">
                {/* Master / Primary Organizer Information */}
                <div className="p-3.5 bg-purple-50/60 dark:bg-purple-950/30 rounded-xl border border-purple-200/70 dark:border-purple-800/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      Organizer / Corporate Master Details
                    </h4>
                    <span className="text-[10px] font-bold bg-purple-200 dark:bg-purple-900/80 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded">
                      Group Master Contact
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 dark:text-slate-300">Primary Organizer / Company *</label>
                      <input
                        type="text"
                        required
                        value={guestName}
                        onChange={e => setGuestName(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                        placeholder="e.g. Reliance Group / Rajesh Sharma"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 dark:text-slate-300">Contact Phone *</label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono"
                        placeholder="+91 9876543210"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 dark:text-slate-300">Primary Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
                        placeholder="events@company.com"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 dark:text-slate-300">Organizer ID Proof (Optional)</label>
                      <input
                        type="text"
                        value={idProof}
                        onChange={e => setIdProof(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
                        placeholder="Aadhaar / Corporate ID (Optional)"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 dark:text-slate-300">Corporate GSTIN (B2B Invoice)</label>
                      <input
                        type="text"
                        value={gstNumber}
                        onChange={e => setGstNumber(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono uppercase"
                        placeholder="29ABCDE1234F1Z5"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 dark:text-slate-300">Booking Channel</label>
                      <select
                        value={bookingSource}
                        onChange={e => setBookingSource(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold"
                      >
                        {BOOKING_SOURCES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Bulk Group Online OTA Booking Reference Number Field */}
                  {isOnlineBookingSource(bookingSource) && (
                    <div className="p-3 bg-purple-100/70 dark:bg-purple-950/40 border-2 border-purple-300 dark:border-purple-700 rounded-xl space-y-1.5 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <label className="font-black text-purple-950 dark:text-purple-200 text-[11px] flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          <span>Group Online Booking Reference / Confirmation ID *</span>
                        </label>
                        <span className="text-[9px] font-bold bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-100 px-1.5 py-0.2 rounded">
                          Mandatory OTA Field
                        </span>
                      </div>
                      <input
                        type="text"
                        required
                        value={bulkBookingReference}
                        onChange={e => setBulkBookingReference(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-lg font-mono font-bold text-purple-950 dark:text-purple-100 text-xs uppercase"
                        placeholder="e.g. MMT-GRP-98234, BDC-GROUP-4912, AGD-GRP-1029..."
                      />
                      <p className="text-[10px] text-purple-800 dark:text-purple-300">
                        Collect and attach the OTA group voucher / master reservation number across all rooms in this group.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 dark:text-slate-300">Check-In Date *</label>
                      <input
                        type="date"
                        required
                        min={todayStr}
                        value={checkInDate}
                        onChange={e => setCheckInDate(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono"
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
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Category + Quantity Batch Selector Builder */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-indigo-200/70 dark:border-indigo-800/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                      <BedDouble className="w-4 h-4 text-indigo-500" />
                      <span>Select Room Type & Quantity</span>
                    </label>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                      Step 1: Add by Category
                    </span>
                  </div>

                  {/* Live Inventory Status for this Category */}
                  {checkInDate && checkOutDate && checkInDate < checkOutDate ? (
                    <div className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between gap-2 transition-all ${
                      batchRemainingAvailable > 0
                        ? batchRemainingAvailable <= 1
                          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                          : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 font-semibold'
                    }`}>
                      <div className="flex items-center gap-2">
                        {batchRemainingAvailable > 0 ? (
                          batchRemainingAvailable <= 1 ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          )
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        )}
                        <span>
                          {batchRemainingAvailable > 0
                            ? `Live Availability: ${batchRemainingAvailable} of ${batchAvailability.availableRooms} rooms available to add`
                            : `Sold Out for Selected Dates (0 available to add)`}
                        </span>
                      </div>
                      <span className="text-[10px] opacity-80">
                        {batchDraftCount > 0 ? `(${batchDraftCount} already in group)` : `(${batchAvailability.totalRooms} total property inventory)`}
                      </span>
                    </div>
                  ) : (
                    <div className="p-2 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Select Check-In & Check-Out dates above to view live available inventory.</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                    {/* Category Selector */}
                    <div className="sm:col-span-6 space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold">Room Category *</label>
                      <select
                        value={batchCategory}
                        onChange={e => handleBatchCategoryChange(e.target.value as RoomCategory)}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-800 dark:text-slate-100 text-xs"
                      >
                        {categories.map(c => {
                          const avail = getCategoryAvailability(c, checkInDate, checkOutDate);
                          const inDraft = bulkRooms.filter(r => r.roomCategory === c).length;
                          const remaining = Math.max(0, avail.availableRooms - inDraft);
                          return (
                            <option key={c} value={c}>
                              {c} — {remaining} / {avail.availableRooms} available
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Number of Rooms (Quantity) with strict bounds */}
                    <div className="sm:col-span-3 space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold">
                        No. of Rooms * {batchRemainingAvailable > 0 ? `(Max ${batchRemainingAvailable})` : '(0 left)'}
                      </label>
                      <div className="flex items-center">
                        <button
                          type="button"
                          disabled={batchRoomCount <= 1}
                          onClick={() => setBatchRoomCount(prev => Math.max(1, prev - 1))}
                          className="w-7 h-8 bg-slate-200 dark:bg-slate-800 disabled:opacity-40 text-slate-700 dark:text-slate-300 font-bold rounded-l-lg hover:bg-slate-300 transition-colors"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={Math.max(1, batchRemainingAvailable)}
                          value={batchRoomCount}
                          onChange={e => {
                            const val = Number(e.target.value);
                            if (val > batchRemainingAvailable) {
                              setBatchRoomCount(Math.max(1, batchRemainingAvailable));
                            } else {
                              setBatchRoomCount(Math.max(1, val));
                            }
                          }}
                          className="w-full h-8 text-center bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 font-bold font-mono text-xs"
                        />
                        <button
                          type="button"
                          disabled={batchRoomCount >= batchRemainingAvailable}
                          onClick={() => setBatchRoomCount(prev => Math.min(batchRemainingAvailable, prev + 1))}
                          className="w-7 h-8 bg-slate-200 dark:bg-slate-800 disabled:opacity-40 text-slate-700 dark:text-slate-300 font-bold rounded-r-lg hover:bg-slate-300 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Nightly Rate */}
                    <div className="sm:col-span-3 space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold">Rate (₹/Day)</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1.5 font-mono text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          min={1}
                          value={batchRoomPrice}
                          onChange={e => setBatchRoomPrice(Number(e.target.value))}
                          className="w-full pl-6 pr-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-400 text-[11px]">
                      <input
                        type="checkbox"
                        checked={batchIsNonAc}
                        onChange={e => {
                          const next = e.target.checked;
                          setBatchIsNonAc(next);
                          const match = rooms.find(r => r.category === batchCategory);
                          const base = match?.price || 1500;
                          setBatchRoomPrice(next ? Math.max(500, Math.round(base * 0.67)) : base);
                        }}
                        className="rounded text-emerald-600"
                      />
                      <span>🍃 Non-AC Rate Mode</span>
                    </label>

                    <button
                      type="button"
                      disabled={
                        !checkInDate || 
                        !checkOutDate || 
                        checkInDate >= checkOutDate || 
                        batchRemainingAvailable <= 0 || 
                        batchRoomCount > batchRemainingAvailable
                      }
                      onClick={handleAddBatchCategory}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {!checkInDate || !checkOutDate
                        ? 'Select Dates First'
                        : batchRemainingAvailable <= 0
                        ? `Sold Out (${batchCategory})`
                        : `Add ${batchRoomCount} ${batchCategory} ${batchRoomCount === 1 ? 'Room' : 'Rooms'}`}
                    </button>
                  </div>
                </div>

                {/* Overbooking Alert Banner for Draft Inventory */}
                {bulkOverbookingIssues.length > 0 && (
                  <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-400 dark:border-rose-700 rounded-xl text-rose-900 dark:text-rose-200 space-y-2 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span className="font-black text-xs uppercase tracking-wide">
                          Overbooking Warning! Live Inventory Exceeded
                        </span>
                      </div>
                      <span className="text-[10px] font-bold bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-100 px-2 py-0.5 rounded">
                        Action Required
                      </span>
                    </div>
                    <ul className="text-xs space-y-1 pl-5 list-disc font-medium">
                      {bulkOverbookingIssues.map(issue => (
                        <li key={issue.category}>
                          <strong>{issue.category}</strong>: {issue.draftCount} rooms selected, but only <strong>{issue.availableRooms}</strong> available for these dates ({issue.excess} overbooked).
                        </li>
                      ))}
                    </ul>
                    <div className="pt-1 flex gap-2">
                      {bulkOverbookingIssues.map(issue => (
                        <button
                          key={issue.category}
                          type="button"
                          onClick={() => trimCategoryToAvailable(issue.category, issue.availableRooms)}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[10px] transition-colors"
                        >
                          Auto-Trim {issue.category} to {issue.availableRooms} Rooms
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Added Category Batches Summary */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                      <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>Configured Group Inventory ({bulkRooms.length} Total Rooms)</span>
                    </label>
                    {bulkRooms.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setBulkRooms([])}
                        className="text-[10px] text-rose-500 hover:underline font-semibold"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {categoryBreakdown.length === 0 ? (
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center text-slate-400 text-xs">
                      No rooms added yet. Choose a category and room count above, then click <strong>"Add Rooms"</strong>.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {categoryBreakdown.map(item => {
                        const avail = getCategoryAvailability(item.category as RoomCategory, checkInDate, checkOutDate);
                        const totalCategoryDraft = bulkRooms.filter(r => r.roomCategory === item.category).length;
                        const isOverbooked = totalCategoryDraft > avail.availableRooms;

                        return (
                          <div
                            key={item.key}
                            className={`p-3 rounded-xl border flex items-center justify-between shadow-xs transition-all ${
                              isOverbooked
                                ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center text-xs font-mono ${
                                isOverbooked
                                  ? 'bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
                                  : 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                              }`}>
                                {item.count}×
                              </span>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 dark:text-white text-xs">
                                    {item.category}
                                  </span>
                                  {item.isNonAc && (
                                    <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded">
                                      Non-AC
                                    </span>
                                  )}
                                  {isOverbooked ? (
                                    <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200 text-[9px] font-black rounded border border-rose-300 flex items-center gap-1">
                                      <AlertTriangle className="w-2.5 h-2.5" /> Overbooked (Max {avail.availableRooms})
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold rounded">
                                      ✓ Available ({avail.availableRooms} max)
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  @ ₹{item.price.toLocaleString()}/night = ₹{item.totalRentPerNight.toLocaleString()}/day
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {isOverbooked && (
                                <button
                                  type="button"
                                  onClick={() => trimCategoryToAvailable(item.category as RoomCategory, avail.availableRooms)}
                                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold"
                                  title="Trim to live available count"
                                >
                                  Trim
                                </button>
                              )}
                              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                                ₹{item.totalStayRent.toLocaleString()} ({stayNights}N)
                              </span>
                              <button
                                type="button"
                                onClick={() => removeCategoryBatch(item.category as RoomCategory, item.isNonAc)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                                title="Remove this category batch"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Toggle Individual Room Details Editor */}
                  {bulkRooms.length > 0 && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowRoomDetailEditor(prev => !prev)}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        {showRoomDetailEditor ? '▲ Hide Individual Room Number & Occupant Customizer' : '▼ Customize Specific Room # & Occupant Names (Optional)'}
                      </button>

                      {showRoomDetailEditor && (
                        <div className="mt-2 space-y-2 max-h-[260px] overflow-y-auto pr-1">
                          {bulkRooms.map((rm, idx) => {
                            const availRooms = rooms.filter(r => r.category === rm.roomCategory && r.status === 'Available');
                            return (
                              <div
                                key={rm.id}
                                className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2"
                              >
                                <div className="flex justify-between items-center text-[11px] font-bold">
                                  <span>Room #{idx + 1} ({rm.roomCategory})</span>
                                  <button
                                    type="button"
                                    onClick={() => removeBulkRoomRow(rm.id)}
                                    className="text-rose-500 text-[10px] hover:underline"
                                  >
                                    Remove
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[9px] text-slate-400 font-semibold block">Occupant Name</label>
                                    <input
                                      type="text"
                                      value={rm.occupantName}
                                      onChange={e => updateBulkRoom(rm.id, 'occupantName', e.target.value)}
                                      placeholder={guestName || 'Guest name'}
                                      className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] text-slate-400 font-semibold block">Lock Specific Room #</label>
                                    <select
                                      value={rm.roomNumber}
                                      onChange={e => updateBulkRoom(rm.id, 'roomNumber', e.target.value)}
                                      className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold"
                                    >
                                      <option value="">Auto-assign on arrival</option>
                                      {availRooms.map(r => (
                                        <option key={r.id} value={r.roomNumber}>
                                          Room {r.roomNumber} (Fl {r.floor})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Group Financial Summary Card */}
                <div className="p-3.5 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-950 dark:to-purple-950/40 rounded-xl border border-indigo-200/80 dark:border-purple-800/60 space-y-2.5">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Total Group Rooms:</span>
                    <span className="font-mono text-purple-600 dark:text-purple-400">{bulkRooms.length} Rooms ({stayNights} Nights)</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Total Estimated Room Rent:</span>
                    <span className="font-mono text-lg font-black text-slate-900 dark:text-white">
                      ₹{bulkTotalRoomRent.toLocaleString()}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-indigo-200/60 dark:border-purple-800/60 flex items-center justify-between gap-3">
                    <label className="font-bold text-slate-700 dark:text-slate-300 text-xs shrink-0">
                      Total Advance Paid (₹):
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={bulkAdvancePaid}
                      onChange={e => setBulkAdvancePaid(Number(e.target.value))}
                      className="w-36 p-1.5 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-xl font-mono font-bold text-right text-purple-600 dark:text-purple-400 text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Group Requests / Notes</label>
                  <input
                    type="text"
                    value={specialRequests}
                    onChange={e => setSpecialRequests(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                    placeholder="Same floor preferred, buffet included, late checkout..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    bulkRooms.length === 0 || 
                    bulkOverbookingIssues.length > 0 || 
                    !checkInDate || 
                    !checkOutDate || 
                    checkInDate >= checkOutDate
                  }
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm mt-2"
                >
                  <Layers className="w-4 h-4" />
                  {bulkOverbookingIssues.length > 0 
                    ? '⚠️ Overbooking Detected (Fix to Confirm)'
                    : `Confirm Group Reservation (${bulkRooms.length} Rooms)`}
                </button>
              </form>
            )}
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
                      placeholder="Search guest, group ID, room..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap gap-1.5 text-xs">
                {(['ALL', 'Confirmed', 'Pending', 'CheckedIn', 'CheckedOut', 'Cancelled'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                      statusFilter === tab
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800/60 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab === 'ALL' ? 'All Reservations' : tab === 'CheckedOut' ? 'Checked Out' : tab}
                  </button>
                ))}
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800 font-semibold">
                      <th className="py-2.5">Guest & Group</th>
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
                        const assignedRoom = booking.roomNumber ? rooms.find(r => r.roomNumber === booking.roomNumber) : null;
                        const isRoomVacated = booking.status === 'CheckedIn' && assignedRoom && assignedRoom.status !== 'Occupied';
                        const effectiveStatus = isRoomVacated ? 'CheckedOut' : booking.status;
                        const isGroup = Boolean(booking.groupBookingId);

                        return (
                          <tr key={booking.id} className="text-slate-700 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-bold text-slate-900 dark:text-white leading-tight">
                                  {booking.occupantName || booking.guestName}
                                </p>
                                {isArrivalToday && (
                                  <span className="px-1.5 py-0.2 bg-emerald-500 text-white text-[9px] font-bold rounded">
                                    TODAY
                                  </span>
                                )}
                              </div>
                              {isGroup && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="px-1.5 py-0.2 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-[9px] rounded border border-purple-200 dark:border-purple-800">
                                    👥 {booking.groupBookingId}
                                  </span>
                                  {booking.occupantName && booking.occupantName !== booking.guestName && (
                                    <span className="text-[9px] text-slate-400 truncate max-w-[120px]">
                                      by {booking.guestName}
                                    </span>
                                  )}
                                </div>
                              )}
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{booking.phone}</p>
                              {booking.idProof && (
                                <p className="text-[9px] text-slate-400">ID: {booking.idProof}</p>
                              )}
                            </td>

                            <td className="py-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">{booking.roomCategory}</span>
                                {booking.bookingSource && booking.bookingSource !== 'Direct / Walk-In' && (
                                  <span className="text-[9px] px-1.5 py-0.2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold rounded border border-indigo-200 dark:border-indigo-800">
                                    {booking.bookingSource}
                                  </span>
                                )}
                                {booking.bookingReference && (
                                  <span className="text-[9px] px-1.5 py-0.2 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-mono font-bold rounded border border-amber-200 dark:border-amber-800 flex items-center gap-0.5">
                                    <Globe className="w-2.5 h-2.5" /> Ref: #{booking.bookingReference}
                                  </span>
                                )}
                                {booking.isAcSwitchedOff && (
                                  <span className="text-[9px] px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold rounded border border-emerald-200 dark:border-emerald-800">
                                    🍃 Non-AC
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                {booking.roomNumber ? (
                                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                                    Room {booking.roomNumber}
                                  </p>
                                ) : (
                                  <p className="text-[10px] text-slate-400 italic">Auto-pool</p>
                                )}
                                <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400">
                                  ₹{booking.roomPrice || 1500}/night
                                </span>
                              </div>
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
                              <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider inline-block ${
                                effectiveStatus === 'Confirmed' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800' :
                                effectiveStatus === 'CheckedIn' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' :
                                effectiveStatus === 'CheckedOut' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700' :
                                effectiveStatus === 'Pending' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800' :
                                'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                              }`}>
                                {effectiveStatus === 'CheckedOut' ? 'CHECKED OUT' : effectiveStatus}
                              </span>
                            </td>

                            <td className="py-3 text-right">
                              {(effectiveStatus === 'Confirmed' || effectiveStatus === 'Pending') && (
                                <div className="flex justify-end items-center gap-1.5 flex-wrap">
                                  {isGroup && (
                                    <button
                                      onClick={() => handleOpenGroupCheckIn(booking.groupBookingId!)}
                                      className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[9px] font-bold flex items-center gap-1 shadow-sm transition-all"
                                      title="Bulk Check-in All Rooms for this Group"
                                    >
                                      <Layers className="w-3 h-3" /> Group Check-In
                                    </button>
                                  )}
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
                              {effectiveStatus === 'CheckedIn' && (
                                <div className="flex items-center justify-end gap-2">
                                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                    ✓ In-House
                                  </span>
                                  <button
                                    onClick={() => updatePreBookingStatus(booking.id, 'CheckedOut')}
                                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-[9px] font-bold border border-slate-300 dark:border-slate-700 transition-all"
                                    title="Mark reservation as completed/checked out"
                                  >
                                    Complete
                                  </button>
                                </div>
                              )}
                              {effectiveStatus === 'CheckedOut' && (
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono flex items-center justify-end gap-1">
                                  ✓ Checked Out
                                </span>
                              )}
                              {effectiveStatus === 'Cancelled' && (
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

      {/* =========================================================================
          MODAL: BULK GROUP CHECK-IN
          ========================================================================= */}
      {showGroupCheckInModal && selectedGroupBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Bulk Group Check-In
                  </h3>
                  <p className="text-[11px] text-purple-600 dark:text-purple-400 font-mono font-bold">
                    Group Reference: {selectedGroupBookingId}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowGroupCheckInModal(false)} 
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleGroupCheckInSubmit} className="space-y-4 text-xs">
              <p className="text-slate-500 dark:text-slate-400">
                Allocate clean physical rooms to all group occupants below and complete 1-click bulk check-in:
              </p>

              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {preBookings
                  .filter(p => p.groupBookingId === selectedGroupBookingId && (p.status === 'Confirmed' || p.status === 'Pending'))
                  .map((pb, idx) => {
                    const availRooms = rooms.filter(r => r.category === pb.roomCategory && r.status === 'Available');
                    const selectedRoomId = groupRoomAssignments[pb.id] || '';

                    return (
                      <div
                        key={pb.id}
                        className="p-3.5 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white text-sm">
                              {pb.occupantName || pb.guestName}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] border border-indigo-200 dark:border-indigo-800">
                              {pb.roomCategory}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Stay: {pb.checkInDate} → {pb.checkOutDate} • Rate: ₹{pb.roomPrice}/day
                          </p>
                        </div>

                        <div className="w-full sm:w-64 space-y-1">
                          <label className="text-[10px] text-slate-500 font-semibold block">
                            Assign Room Number:
                          </label>
                          <select
                            required
                            value={selectedRoomId}
                            onChange={e => setGroupRoomAssignments(prev => ({ ...prev, [pb.id]: e.target.value }))}
                            className="w-full p-2 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded-xl font-bold text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500/20"
                          >
                            <option value="">-- Choose Clean Room --</option>
                            {availRooms.map(r => (
                              <option key={r.id} value={r.id}>
                                Room {r.roomNumber} (Floor {r.floor} • ₹{r.price}/night)
                              </option>
                            ))}
                            {/* If pre-assigned room is already loaded */}
                            {pb.roomNumber && !availRooms.some(r => r.roomNumber === pb.roomNumber) && (
                              <option value={rooms.find(r => r.roomNumber === pb.roomNumber)?.id || ''}>
                                Room {pb.roomNumber} (Reserved)
                              </option>
                            )}
                          </select>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 font-medium">
                  All checked-in rooms will be tagged with Group ID <strong className="font-mono text-purple-600 dark:text-purple-400">{selectedGroupBookingId}</strong>.
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowGroupCheckInModal(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Complete Group Check-In
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
