import React, { useState, useEffect, useMemo } from 'react';
import { useApp, Room, RoomStatus, RoomCategory, PreBooking, BOOKING_SOURCES, isOnlineBookingSource } from '../context/AppContext';
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
  Search,
  BellRing,
  AlertTriangle,
  BedDouble,
  Pencil,
  Globe,
  IndianRupee,
  Printer,
  Edit3,
  CreditCard,
  WalletCards,
  BookOpen
} from 'lucide-react';
import { getRoomCheckoutAlert, getEffectiveCheckoutTime, isDirectBookingSource, formatTime12h, formatTime24h, RoomCheckoutAlert, getNextAdvanceReceiptNumber, formatReceiptDate, getLocalTodayString } from '../utils/dateUtils';
import { AdvanceReceiptModal, AdvanceReceiptData } from '../components/AdvanceReceiptModal';
import { CashWalletModal } from '../components/CashWalletModal';
import { DayBookModal } from '../components/DayBookModal';

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
    addRoomCharge,
    recordRoomAdvance,
    updateRoom,
    getBillSummary,
    preBookings,
    confirmPreBookingCheckIn,
    updatePreBookingStatus,
    settings,
    addAudit
  } = useApp();

  // Real-time clock ticker to dynamically update checkout countdowns and blinkers every 15s
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [roomSearchTerm, setRoomSearchTerm] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  
  // Modals state
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [extendModalTab, setExtendModalTab] = useState<'service' | 'extend'>('service');
  const [extendDays, setExtendDays] = useState(0);
  const [extraServiceName, setExtraServiceName] = useState('');
  const [extraServiceAmount, setExtraServiceAmount] = useState<number | string>('');
  const [extraServicePaymentOption, setExtraServicePaymentOption] = useState<'checkout' | 'collect_now'>('checkout');
  const [extraServicePaymentMode, setExtraServicePaymentMode] = useState<string>('Cash');
  const [extraServiceReceiptNo, setExtraServiceReceiptNo] = useState<string>('');
  const [isSubmittingExtendOrCharge, setIsSubmittingExtendOrCharge] = useState(false);
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [chargeAmount, setChargeAmount] = useState<number | string>(500);
  const [chargeDescription, setChargeDescription] = useState<string>('Extra Bed / Rollaway Mattress');
  const [isSubmittingCharge, setIsSubmittingCharge] = useState(false);

  // Edit Room Modal state
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [editRoomId, setEditRoomId] = useState('');
  const [editRoomNumber, setEditRoomNumber] = useState('');
  const [editRoomFloor, setEditRoomFloor] = useState<number>(1);
  const [editRoomCategory, setEditRoomCategory] = useState<RoomCategory>('Deluxe AC');
  const [editRoomPrice, setEditRoomPrice] = useState<number | string>(2500);
  const [isSubmittingEditRoom, setIsSubmittingEditRoom] = useState(false);

  // Advance Receipt Modal state
  const [receiptModalData, setReceiptModalData] = useState<AdvanceReceiptData | null>(null);
  const [showAdvanceReceiptModal, setShowAdvanceReceiptModal] = useState(false);
  const [showRoomWalletModal, setShowRoomWalletModal] = useState(false);
  const [showDayBookModal, setShowDayBookModal] = useState(false);

  // Collect Advance Payment Modal state
  const [showCollectAdvanceModal, setShowCollectAdvanceModal] = useState(false);
  const [advanceAmountInput, setAdvanceAmountInput] = useState<number | string>(1000);
  const [advancePaymentMethod, setAdvancePaymentMethod] = useState<string>('Cash');
  const [advanceReceiptNoInput, setAdvanceReceiptNoInput] = useState<string>('');
  const [advanceReceivedByInput, setAdvanceReceivedByInput] = useState<string>('Manager (Front Desk Manager)');
  const [advanceNotesInput, setAdvanceNotesInput] = useState<string>('');
  const [isSubmittingAdvance, setIsSubmittingAdvance] = useState(false);
  const [applyAdvanceToGroup, setApplyAdvanceToGroup] = useState(false);
  const [advanceEntryMode, setAdvanceEntryMode] = useState<'add' | 'set'>('add');

  // Forms state
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestIdProof, setGuestIdProof] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestAddress, setGuestAddress] = useState('');
  const [guestGst, setGuestGst] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [noOfGuests, setNoOfGuests] = useState(1);
  const [advancePaid, setAdvancePaid] = useState<number | string>(0);
  const [checkInPaymentMethod, setCheckInPaymentMethod] = useState<string>('Cash');
  const [checkInPrice, setCheckInPrice] = useState<number | string>(1500);
  const [bookingSource, setBookingSource] = useState<string>('Direct / Walk-In');
  const [bookingReference, setBookingReference] = useState<string>('');
  const [isAcSwitchedOff, setIsAcSwitchedOff] = useState<boolean>(false);
  const [checkOutDate, setCheckOutDate] = useState<string>('');
  const [checkInTimeInput, setCheckInTimeInput] = useState<string>('');

  const [transferTargetRoomId, setTransferTargetRoomId] = useState('');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

  // Edit Check-In Details Modal state
  const [showEditCheckInModal, setShowEditCheckInModal] = useState(false);
  const [editCheckInRoom, setEditCheckInRoom] = useState<Room | null>(null);
  const [editGuestName, setEditGuestName] = useState('');
  const [editGuestPhone, setEditGuestPhone] = useState('');
  const [editGuestIdProof, setEditGuestIdProof] = useState('');
  const [editGuestEmail, setEditGuestEmail] = useState('');
  const [editGuestAddress, setEditGuestAddress] = useState('');
  const [editGuestGst, setEditGuestGst] = useState('');
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editNoOfGuests, setEditNoOfGuests] = useState(1);
  const [editCheckInPrice, setEditCheckInPrice] = useState<number | string>(1500);
  const [editBookingSource, setEditBookingSource] = useState<string>('Direct / Walk-In');
  const [editBookingReference, setEditBookingReference] = useState<string>('');
  const [editIsAcSwitchedOff, setEditIsAcSwitchedOff] = useState<boolean>(false);
  const [editCheckInDate, setEditCheckInDate] = useState<string>('');
  const [editCheckInTimeInput, setEditCheckInTimeInput] = useState<string>('');
  const [editCheckOutDate, setEditCheckOutDate] = useState<string>('');
  const [editAdvancePaid, setEditAdvancePaid] = useState<number | string>(0);
  const [editAdvancePaymentMethod, setEditAdvancePaymentMethod] = useState<string>('Cash');
  const [editAdvanceReceiptNumber, setEditAdvanceReceiptNumber] = useState<string>('');
  const [editAdvancePaymentDate, setEditAdvancePaymentDate] = useState<string>('');
  const [isSubmittingEditCheckIn, setIsSubmittingEditCheckIn] = useState(false);

  // Quick Edit Payment Mode Modal state
  const [showEditPaymentModeModal, setShowEditPaymentModeModal] = useState(false);
  const [paymentModeEditRoom, setPaymentModeEditRoom] = useState<Room | null>(null);
  const [quickPaymentMethod, setQuickPaymentMethod] = useState<string>('Cash');
  const [quickAdvancePaid, setQuickAdvancePaid] = useState<number | string>(0);
  const [quickReceiptNumber, setQuickReceiptNumber] = useState<string>('');
  const [quickPaymentDate, setQuickPaymentDate] = useState<string>('');
  const [isSubmittingPaymentMode, setIsSubmittingPaymentMode] = useState(false);

  // Pre-calculate real-time checkout alerts for all occupied rooms
  const roomAlertMap = useMemo(() => {
    const map = new Map<string, RoomCheckoutAlert>();
    (rooms || []).forEach(room => {
      if (room.status === 'Occupied') {
        const alertInfo = getRoomCheckoutAlert(
          room.checkOutDate, 
          settings?.checkOutTime, 
          60, 
          currentTime,
          room.bookingSource,
          room.checkInTime,
          room.checkInDate
        );
        map.set(room.id, alertInfo);
      }
    });
    return map;
  }, [rooms, settings?.checkOutTime, currentTime]);

  // Aggregate counts of alert states
  const overdueCount = useMemo(() => {
    let count = 0;
    roomAlertMap.forEach(alert => {
      if (alert.status === 'overdue') count++;
    });
    return count;
  }, [roomAlertMap]);

  const approachingCount = useMemo(() => {
    let count = 0;
    roomAlertMap.forEach(alert => {
      if (alert.status === 'approaching') count++;
    });
    return count;
  }, [roomAlertMap]);

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
  const categories = ['All', 'Deluxe AC', 'Deluxe Superior', 'Elite', 'Superior', 'Family Suite', 'Non AC'];
  const statuses = ['All', 'Available', 'Occupied', 'Reserved', 'Cleaning', 'Maintenance'];

  // Filter logic
  const filteredRooms = (rooms || []).filter(room => {
    if (!room) return false;
    const matchesCat = categoryFilter === 'All' || room.category === categoryFilter;
    
    let matchesStat = true;
    if (statusFilter === 'All') {
      matchesStat = true;
    } else if (statusFilter === 'Overdue Checkout') {
      matchesStat = room.status === 'Occupied' && roomAlertMap.get(room.id)?.status === 'overdue';
    } else if (statusFilter === 'Due Soon') {
      matchesStat = room.status === 'Occupied' && roomAlertMap.get(room.id)?.status === 'approaching';
    } else {
      matchesStat = room.status === statusFilter;
    }
    
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
      setCompanyName(booking.companyName || '');
      setNoOfGuests(booking.noOfGuests || 1);
      setAdvancePaid(booking.advancePaid || 0);
      setCheckInPaymentMethod(booking.advancePaymentMethod || (booking.bookingSource?.toLowerCase().includes('makemytrip') ? 'UPI' : 'Cash'));
      setCheckInPrice(booking.roomPrice || selectedRoom?.price || 1500);
      setBookingSource(booking.bookingSource || 'MakeMyTrip');
      setBookingReference(booking.bookingReference || '');
      setIsAcSwitchedOff(!!booking.isAcSwitchedOff);
      setCheckOutDate(booking.checkOutDate || '');
      setCheckInTimeInput(booking.checkInTime || formatTime12h({ hours: new Date().getHours(), minutes: new Date().getMinutes() }));
    } else {
      setSelectedPreBookingId('');
      setGuestName('');
      setGuestPhone('');
      setGuestEmail('');
      setGuestAddress('');
      setGuestIdProof('');
      setGuestGst('');
      setCompanyName('');
      setNoOfGuests(1);
      setAdvancePaid(0);
      setCheckInPaymentMethod('Cash');
      setBookingReference('');
      setCheckOutDate(getLocalTodayString(1, todayStr));
      setCheckInTimeInput(formatTime12h({ hours: new Date().getHours(), minutes: new Date().getMinutes() }));
      if (selectedRoom) {
        setCheckInPrice(selectedRoom.price || 1500);
        setBookingSource('Direct / Walk-In');
        setIsAcSwitchedOff(false);
      }
    }
  };

  const handleOpenCheckIn = (room: Room) => {
    setSelectedRoom(room);
    setCheckInPrice(room.price || 1500);
    setBookingSource('Direct / Walk-In');
    setBookingReference('');
    setIsAcSwitchedOff(false);
    setCheckInTimeInput(formatTime12h({ hours: new Date().getHours(), minutes: new Date().getMinutes() }));

    // Look for a matching prebooking for this exact room number or category for today or upcoming early arrival
    const matchingPre = preBookings.find(pb => 
      (pb.status === 'Confirmed' || pb.status === 'Pending') &&
      ((pb.roomNumber && pb.roomNumber === room.roomNumber) || (pb.roomCategory === room.category && pb.checkInDate === todayStr))
    );

    if (matchingPre) {
      applyPreBookingData(matchingPre);
    } else {
      applyPreBookingData(null);
      setCheckInPrice(room.price || 1500);
      setBookingSource('Direct / Walk-In');
      setBookingReference('');
      setIsAcSwitchedOff(false);
      setCheckInTimeInput(formatTime12h({ hours: new Date().getHours(), minutes: new Date().getMinutes() }));
    }

    setShowCheckInModal(true);
  };

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom || !guestName || !guestPhone) return;

    if (isOnlineBookingSource(bookingSource) && !bookingReference.trim()) {
      alert(`Please enter the Online Booking Reference Number (e.g. OTA Confirmation / Voucher ID for ${bookingSource}).`);
      return;
    }

    if (guestGst.trim() && !companyName.trim()) {
      alert('Please enter the Company Name since GST Number is provided.');
      return;
    }

    const paidAdv = Number(advancePaid) || 0;
    const existingAdvNo = selectedRoom.advanceReceiptNumber;
    let receiptNo = existingAdvNo || '';
    if (paidAdv > 0 && !receiptNo) {
      receiptNo = getNextAdvanceReceiptNumber(rooms.map(r => r.advanceReceiptNumber));
    }

    const finalCheckInTime = checkInTimeInput.trim() || formatTime12h({ hours: new Date().getHours(), minutes: new Date().getMinutes() });

    if (selectedPreBookingId) {
      await checkInRoom(selectedRoom.id, {
        name: guestName,
        phone: guestPhone,
        email: guestEmail,
        address: guestAddress,
        idProof: guestIdProof,
        gstNumber: guestGst.trim().toUpperCase(),
        companyName: companyName.trim(),
        noOfGuests: noOfGuests,
        advancePaid: paidAdv,
        advanceReceiptNumber: receiptNo,
        advancePaymentDate: todayStr,
        advancePaymentMethod: checkInPaymentMethod,
        price: Number(checkInPrice),
        bookingSource: bookingSource,
        bookingReference: bookingReference.trim() || undefined,
        isAcSwitchedOff: isAcSwitchedOff,
        checkInDate: todayStr,
        checkInTime: finalCheckInTime,
        checkOutDate: checkOutDate || undefined
      });
      await updatePreBookingStatus(selectedPreBookingId, 'CheckedIn');
    } else {
      await checkInRoom(selectedRoom.id, {
        name: guestName,
        phone: guestPhone,
        email: guestEmail,
        address: guestAddress,
        idProof: guestIdProof,
        gstNumber: guestGst.trim().toUpperCase(),
        companyName: companyName.trim(),
        noOfGuests: noOfGuests,
        advancePaid: paidAdv,
        advanceReceiptNumber: receiptNo,
        advancePaymentDate: todayStr,
        advancePaymentMethod: checkInPaymentMethod,
        price: Number(checkInPrice),
        bookingSource: bookingSource,
        bookingReference: bookingReference.trim() || undefined,
        isAcSwitchedOff: isAcSwitchedOff,
        checkInDate: todayStr,
        checkInTime: finalCheckInTime,
        checkOutDate: checkOutDate || undefined
      });
    }
    
    setShowCheckInModal(false);
    setCompanyName('');

    // If advance was paid at check-in, automatically display the advance receipt
    if (paidAdv > 0) {
      setReceiptModalData({
        receiptNumber: receiptNo || '1243',
        guestName: guestName.trim(),
        roomNumber: selectedRoom.roomNumber,
        roomCategory: selectedRoom.category,
        amount: paidAdv,
        date: todayStr,
        paymentMethod: checkInPaymentMethod,
        receivedBy: 'Manager (Front Desk Manager)',
        hotelName: settings.name || 'HOTEL SUBRA GRAND',
        tagline: settings.tagline || 'A Unit Of Jagoda Hospitality Pvt. Ltd.',
        address: settings.address || '57, New street, near church corner , Karur - 01',
        email: settings.email || 'jagodahospitality@gmail.com',
        phone: settings.phone || '9991118512',
        gstNumber: settings.gstNumber || '33AAHCJ3990L1Z5'
      });
      setShowAdvanceReceiptModal(true);
    }
  };

  const selectedRoomGroupMembers = useMemo(() => {
    if (!selectedRoom?.groupBookingId) return [];
    return rooms.filter(r => r.groupBookingId === selectedRoom.groupBookingId && r.status === 'Occupied');
  }, [selectedRoom, rooms]);

  const handleOpenCollectAdvance = (room: Room) => {
    setSelectedRoom(room);
    setAdvanceAmountInput(1000);
    setAdvancePaymentMethod('Cash');
    const nextNo = getNextAdvanceReceiptNumber(rooms.map(r => r.advanceReceiptNumber));
    setAdvanceReceiptNoInput(nextNo);
    setAdvanceReceivedByInput('Manager (Front Desk Manager)');
    setAdvanceNotesInput('');
    setApplyAdvanceToGroup(Boolean(room.groupBookingId));
    setAdvanceEntryMode('add');
    setShowCollectAdvanceModal(true);
  };

  const handleCollectAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom || Number(advanceAmountInput) <= 0) return;
    setIsSubmittingAdvance(true);
    try {
      const receiptNo = advanceReceiptNoInput.trim() || getNextAdvanceReceiptNumber(rooms.map(r => r.advanceReceiptNumber));
      const payAmount = Number(advanceAmountInput);

      if (applyAdvanceToGroup && selectedRoomGroupMembers.length > 1) {
        const count = selectedRoomGroupMembers.length;
        const totalCents = Math.round(payAmount * 100);
        const baseCents = Math.floor(totalCents / count);
        const remCents = totalCents - (baseCents * count);

        for (let idx = 0; idx < count; idx++) {
          const rm = selectedRoomGroupMembers[idx];
          const splitAmt = (baseCents + (idx < remCents ? 1 : 0)) / 100;
          if (advanceEntryMode === 'set') {
            await updateRoom(rm.id, {
              advancePaid: splitAmt,
              advanceReceiptNumber: receiptNo,
              advancePaymentDate: todayStr,
              advancePaymentMethod: advancePaymentMethod,
              advanceReceivedBy: advanceReceivedByInput
            });
            addAudit(
              'Advance Payment',
              `Set group total advance to ₹${payAmount} (₹${splitAmt} for Room ${rm.roomNumber}) [Receipt #${receiptNo}]`
            );
          } else {
            await recordRoomAdvance(rm.id, {
              amount: splitAmt,
              receiptNumber: receiptNo,
              paymentDate: todayStr,
              paymentMethod: advancePaymentMethod,
              receivedBy: advanceReceivedByInput,
              notes: advanceNotesInput ? `${advanceNotesInput} (Group ${selectedRoom.groupBookingId})` : `Group ${selectedRoom.groupBookingId} Equal Split`
            });
          }
        }

        setShowCollectAdvanceModal(false);

        setReceiptModalData({
          receiptNumber: receiptNo,
          guestName: selectedRoom.groupBookingName || selectedRoom.guestName || 'Group Guest',
          roomNumber: `Group: ${selectedRoom.groupBookingId} (${selectedRoomGroupMembers.map(r => r.roomNumber).join(', ')})`,
          roomCategory: 'Group Booking',
          amount: payAmount,
          date: todayStr,
          paymentMethod: advancePaymentMethod,
          receivedBy: advanceReceivedByInput,
          hotelName: settings.name || 'HOTEL SUBRA GRAND',
          tagline: settings.tagline || 'A Unit Of Jagoda Hospitality Pvt. Ltd.',
          address: settings.address || '57, New street, near church corner , Karur - 01',
          email: settings.email || 'jagodahospitality@gmail.com',
          phone: settings.phone || '9991118512',
          gstNumber: settings.gstNumber || '33AAHCJ3990L1Z5',
          notes: advanceNotesInput,
          isBulkGroup: true
        });
        setShowAdvanceReceiptModal(true);
      } else {
        if (advanceEntryMode === 'set') {
          await updateRoom(selectedRoom.id, {
            advancePaid: payAmount,
            advanceReceiptNumber: receiptNo,
            advancePaymentDate: todayStr,
            advancePaymentMethod: advancePaymentMethod,
            advanceReceivedBy: advanceReceivedByInput
          });
          addAudit(
            'Advance Payment',
            `Set advance for Room ${selectedRoom.roomNumber} to ₹${payAmount} via ${advancePaymentMethod} [Receipt #${receiptNo}]`
          );
        } else {
          await recordRoomAdvance(selectedRoom.id, {
            amount: payAmount,
            receiptNumber: receiptNo,
            paymentDate: todayStr,
            paymentMethod: advancePaymentMethod,
            receivedBy: advanceReceivedByInput,
            notes: advanceNotesInput
          });
        }

        setShowCollectAdvanceModal(false);

        setReceiptModalData({
          receiptNumber: receiptNo,
          guestName: selectedRoom.guestName || 'Guest',
          roomNumber: selectedRoom.roomNumber,
          roomCategory: selectedRoom.category,
          amount: payAmount,
          date: todayStr,
          paymentMethod: advancePaymentMethod,
          receivedBy: advanceReceivedByInput,
          hotelName: settings.name || 'HOTEL SUBRA GRAND',
          tagline: settings.tagline || 'A Unit Of Jagoda Hospitality Pvt. Ltd.',
          address: settings.address || '57, New street, near church corner , Karur - 01',
          email: settings.email || 'jagodahospitality@gmail.com',
          phone: settings.phone || '9991118512',
          gstNumber: settings.gstNumber || '33AAHCJ3990L1Z5',
          notes: advanceNotesInput
        });
        setShowAdvanceReceiptModal(true);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to record advance payment.');
    } finally {
      setIsSubmittingAdvance(false);
    }
  };

  const handlePrintRoomAdvanceReceipt = (room: Room) => {
    const receiptNo = room.advanceReceiptNumber || getNextAdvanceReceiptNumber(rooms.map(r => r.advanceReceiptNumber));
    setReceiptModalData({
      receiptNumber: receiptNo,
      guestName: room.guestName || 'Guest',
      roomNumber: room.roomNumber,
      roomCategory: room.category,
      amount: room.advancePaid || 0,
      date: room.advancePaymentDate || room.checkInDate || todayStr,
      paymentMethod: room.advancePaymentMethod || 'Cash',
      receivedBy: room.advanceReceivedBy || 'Manager (Front Desk Manager)',
      hotelName: settings.name || 'HOTEL SUBRA GRAND',
      tagline: settings.tagline || 'A Unit Of Jagoda Hospitality Pvt. Ltd.',
      address: settings.address || '57, New street, near church corner , Karur - 01',
      email: settings.email || 'jagodahospitality@gmail.com',
      phone: settings.phone || '9991118512',
      gstNumber: settings.gstNumber || '33AAHCJ3990L1Z5'
    });
    setShowAdvanceReceiptModal(true);
  };

  const handleOpenTransfer = (room: Room) => {
    setSelectedRoom(room);
    setTransferTargetRoomId('');
    setShowTransferModal(true);
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom || !transferTargetRoomId) return;

    const targetRoom = rooms.find(r => r.id === transferTargetRoomId);
    if (!targetRoom) return;

    setIsSubmittingTransfer(true);
    try {
      await transferRoom(selectedRoom.id, transferTargetRoomId);
      setShowTransferModal(false);
      alert(`Room transfer successful!\n\nGuest ${selectedRoom.guestName} and ₹${selectedRoom.advancePaid || 0} payment details (${selectedRoom.advancePaymentMethod || 'Cash'}) have been successfully transferred to Room ${targetRoom.roomNumber}.`);
    } catch (err) {
      console.error('Room transfer failed:', err);
      alert('Failed to transfer room. Please try again.');
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const handleOpenExtend = (room: Room) => {
    setSelectedRoom(room);
    setExtendDays(0);
    setExtraServiceName('');
    setExtraServiceAmount('');
    setExtraServicePaymentOption('checkout');
    setExtraServicePaymentMode('Cash');
    setExtraServiceReceiptNo(getNextAdvanceReceiptNumber(rooms.map(r => r.advanceReceiptNumber)));
    setExtendModalTab('service');
    setShowExtendModal(true);
  };

  const handleExtendOrChargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;
    setIsSubmittingExtendOrCharge(true);
    try {
      let auditMsgs: string[] = [];
      const isCollectNow = extraServicePaymentOption === 'collect_now';
      const receiptNo = extraServiceReceiptNo.trim() || getNextAdvanceReceiptNumber(rooms.map(r => r.advanceReceiptNumber));
      const amountNum = Number(extraServiceAmount);

      if (extendModalTab === 'service') {
        if (amountNum > 0) {
          const serviceDesc = extraServiceName.trim() || 'Other Service';
          await addRoomCharge(selectedRoom.id, amountNum, serviceDesc, {
            collectNow: isCollectNow,
            paymentMethod: isCollectNow ? extraServicePaymentMode : undefined,
            receiptNumber: isCollectNow ? receiptNo : undefined,
            receivedBy: 'Front Desk / Cashier',
            notes: `${serviceDesc} payment`
          });

          if (isCollectNow) {
            auditMsgs.push(`Added ₹${amountNum} (${serviceDesc}) & collected via ${extraServicePaymentMode} [Receipt #${receiptNo}]`);
          } else {
            auditMsgs.push(`Added ₹${amountNum} (${serviceDesc}) to invoice (To settle at checkout)`);
          }
        }
        if (Number(extendDays) > 0) {
          await extendStay(selectedRoom.id, Number(extendDays));
          auditMsgs.push(`Extended stay by ${extendDays} day(s)`);
        }
      } else {
        if (Number(extendDays) > 0) {
          await extendStay(selectedRoom.id, Number(extendDays));
          auditMsgs.push(`Extended stay by ${extendDays} day(s)`);
        }
      }

      setShowExtendModal(false);
      setExtraServiceName('');
      setExtraServiceAmount('');
      setExtraServicePaymentOption('checkout');
      setExtraServicePaymentMode('Cash');
      setExtraServiceReceiptNo('');
      setExtendDays(0);

      if (auditMsgs.length > 0) {
        if (isCollectNow && amountNum > 0) {
          if (window.confirm(`Room ${selectedRoom.roomNumber}: ${auditMsgs.join(' & ')} successfully!\n\nWould you like to view & print the Advance Payment Receipt now?`)) {
            setReceiptModalData({
              receiptNumber: receiptNo,
              guestName: selectedRoom.guestName || 'In-House Guest',
              roomNumber: selectedRoom.roomNumber,
              roomCategory: selectedRoom.category,
              amount: (selectedRoom.advancePaid || 0) + amountNum,
              date: formatReceiptDate(new Date().toISOString().split('T')[0]),
              paymentMethod: extraServicePaymentMode,
              receivedBy: 'Manager (Front Desk Manager)',
              phone: selectedRoom.guestPhone,
              hotelName: settings.name || 'HOTEL SUBRA GRAND',
              tagline: settings.tagline || 'A Unit Of Jagoda Hospitality Pvt. Ltd.',
              address: settings.address || '57, New street, near church corner , Karur - 01',
              email: settings.email || 'jagodahospitality@gmail.com'
            });
            setShowAdvanceReceiptModal(true);
          }
        } else {
          alert(`Room ${selectedRoom.roomNumber}: ${auditMsgs.join(' & ')} successfully!`);
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update room charges / extension.');
    } finally {
      setIsSubmittingExtendOrCharge(false);
    }
  };

  const handleOpenBill = (room: Room) => {
    setSelectedRoom(room);
    setShowBillModal(true);
  };

  const handleOpenCharge = (room: Room) => {
    setSelectedRoom(room);
    setChargeAmount(500);
    setChargeDescription('Extra Bed / Rollaway Mattress');
    setShowChargeModal(true);
  };

  const handleAddChargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom || Number(chargeAmount) <= 0) return;
    setIsSubmittingCharge(true);
    try {
      await addRoomCharge(selectedRoom.id, Number(chargeAmount), chargeDescription || 'Extra Bed / Other Service');
      setShowChargeModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingCharge(false);
    }
  };

  const handleGoToBilling = (room: Room) => {
    setSelectedRoomForBilling(room.roomNumber);
    setTab('billing');
  };

  const handleOpenEditRoom = (room: Room, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditRoomId(room.id);
    setEditRoomNumber(room.roomNumber);
    setEditRoomFloor(room.floor || 1);
    setEditRoomCategory(room.category);
    setEditRoomPrice(room.price || 0);
    setShowEditRoomModal(true);
  };

  const handleEditRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRoomId || !editRoomNumber || Number(editRoomPrice) <= 0) return;
    setIsSubmittingEditRoom(true);
    try {
      await updateRoom(editRoomId, {
        roomNumber: editRoomNumber,
        floor: Number(editRoomFloor),
        category: editRoomCategory,
        price: Number(editRoomPrice)
      });
      setShowEditRoomModal(false);
    } catch (err) {
      console.error(err);
      alert('Failed to update room details. Please try again.');
    } finally {
      setIsSubmittingEditRoom(false);
    }
  };

  const handleOpenEditCheckIn = (room: Room, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditCheckInRoom(room);
    setEditGuestName(room.guestName || '');
    setEditGuestPhone(room.guestPhone || '');
    setEditGuestEmail(room.guestEmail || '');
    setEditGuestAddress(room.guestAddress || '');
    setEditGuestIdProof(room.guestIdProof || '');
    setEditGuestGst(room.gstNumber || '');
    setEditCompanyName(room.companyName || '');
    setEditBookingSource(room.bookingSource || 'Direct / Walk-In');
    setEditBookingReference(room.bookingReference || '');
    setEditNoOfGuests(room.noOfGuests || 1);
    setEditCheckInPrice(room.price || room.basePrice || 1500);
    setEditIsAcSwitchedOff(!!room.isAcSwitchedOff);
    setEditCheckInDate(room.checkInDate || todayStr);
    setEditCheckInTimeInput(room.checkInTime || formatTime12h({ hours: new Date().getHours(), minutes: new Date().getMinutes() }));
    setEditCheckOutDate(room.checkOutDate || new Date(Date.now() + 86400000).toISOString().split('T')[0]);
    setEditAdvancePaid(room.advancePaid ?? 0);
    setEditAdvancePaymentMethod(room.advancePaymentMethod || (isDirectBookingSource(room.bookingSource) ? 'Cash' : 'UPI'));
    setEditAdvanceReceiptNumber(room.advanceReceiptNumber || '');
    setEditAdvancePaymentDate(room.advancePaymentDate || room.checkInDate || todayStr);
    setShowEditCheckInModal(true);
  };

  const handleEditCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCheckInRoom) return;
    setIsSubmittingEditCheckIn(true);
    if (editGuestGst.trim() && !editCompanyName.trim()) {
      alert('Please enter the Company Name since GST Number is provided.');
      setIsSubmittingEditCheckIn(false);
      return;
    }

    try {
      const finalPrice = Number(editCheckInPrice) > 0 ? Number(editCheckInPrice) : (editCheckInRoom.price || 1500);
      const numAdv = Number(editAdvancePaid) || 0;
      let recNo = editAdvanceReceiptNumber.trim();
      if (numAdv > 0 && !recNo) {
        recNo = editCheckInRoom.advanceReceiptNumber || getNextAdvanceReceiptNumber(rooms.map(r => r.advanceReceiptNumber));
      }

      const updates: Partial<Room> = {
        guestName: editGuestName.trim(),
        guestPhone: editGuestPhone.trim(),
        guestEmail: editGuestEmail.trim(),
        guestAddress: editGuestAddress.trim(),
        guestIdProof: editGuestIdProof.trim(),
        gstNumber: editGuestGst.trim().toUpperCase(),
        companyName: editCompanyName.trim(),
        bookingSource: editBookingSource,
        bookingReference: editBookingReference.trim() || '',
        noOfGuests: Number(editNoOfGuests) || 1,
        price: finalPrice,
        isAcSwitchedOff: editIsAcSwitchedOff,
        checkInDate: editCheckInDate || editCheckInRoom.checkInDate,
        checkInTime: editCheckInTimeInput || editCheckInRoom.checkInTime,
        checkOutDate: editCheckOutDate || editCheckInRoom.checkOutDate,
        advancePaid: numAdv,
        advancePaymentMethod: editAdvancePaymentMethod,
        advanceReceiptNumber: recNo,
        advancePaymentDate: editAdvancePaymentDate || editCheckInRoom.advancePaymentDate || todayStr
      };

      await updateRoom(editCheckInRoom.id, updates);
      setShowEditCheckInModal(false);
    } catch (err) {
      console.error('Failed to update check-in details:', err);
      alert('Failed to update check-in details. Please try again.');
    } finally {
      setIsSubmittingEditCheckIn(false);
    }
  };

  const handleOpenQuickPaymentMode = (room: Room, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPaymentModeEditRoom(room);
    setQuickPaymentMethod(room.advancePaymentMethod || (isDirectBookingSource(room.bookingSource) ? 'Cash' : 'UPI'));
    setQuickAdvancePaid(room.advancePaid ?? 0);
    setQuickReceiptNumber(room.advanceReceiptNumber || '');
    setQuickPaymentDate(room.advancePaymentDate || room.checkInDate || todayStr);
    setShowEditPaymentModeModal(true);
  };

  const handleQuickPaymentModeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModeEditRoom) return;
    setIsSubmittingPaymentMode(true);
    try {
      const numAdv = Number(quickAdvancePaid) || 0;
      let recNo = quickReceiptNumber.trim() || paymentModeEditRoom.advanceReceiptNumber || '';
      if (numAdv > 0 && !recNo) {
        recNo = getNextAdvanceReceiptNumber(rooms.map(r => r.advanceReceiptNumber));
      }
      const updates: Partial<Room> = {
        advancePaymentMethod: quickPaymentMethod,
        advancePaid: numAdv,
        advanceReceiptNumber: recNo,
        advancePaymentDate: quickPaymentDate || paymentModeEditRoom.advancePaymentDate || todayStr
      };
      await updateRoom(paymentModeEditRoom.id, updates);
      setShowEditPaymentModeModal(false);
    } catch (err) {
      console.error('Failed to update payment mode:', err);
      alert('Failed to update payment mode. Please try again.');
    } finally {
      setIsSubmittingPaymentMode(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* LIVE FRONT-DESK CHECK-OUT ALERTS BANNER */}
      {(overdueCount > 0 || approachingCount > 0) && (
        <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl shadow-xl border border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-xl border flex items-center justify-center ${
              overdueCount > 0 
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-400' 
                : 'bg-amber-500/20 border-amber-500/50 text-amber-400'
            }`}>
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-100">
                  Live Front-Desk Check-Out Alerts
                </h4>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Walk-In: 24h Policy | Online: 12:00 PM
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs">
                {overdueCount > 0 && (
                  <span className="flex items-center gap-1.5 text-rose-400 font-bold bg-rose-950/70 border border-rose-800/80 px-2.5 py-1 rounded-lg">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-90"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                    {overdueCount} {overdueCount === 1 ? 'Room has' : 'Rooms have'} Crossed Check-Out Time (Red Blinker)
                  </span>
                )}
                {approachingCount > 0 && (
                  <span className="flex items-center gap-1.5 text-amber-300 font-semibold bg-amber-950/70 border border-amber-800/80 px-2.5 py-1 rounded-lg">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-90"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                    </span>
                    {approachingCount} {approachingCount === 1 ? 'Room is' : 'Rooms are'} Approaching Check-Out (Amber Blinker)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Filter Buttons on Banner */}
          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            {overdueCount > 0 && (
              <button
                onClick={() => setStatusFilter(statusFilter === 'Overdue Checkout' ? 'All' : 'Overdue Checkout')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                  statusFilter === 'Overdue Checkout'
                    ? 'bg-rose-600 text-white ring-2 ring-rose-300'
                    : 'bg-rose-600/30 text-rose-200 hover:bg-rose-600 hover:text-white border border-rose-500/50'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                View Overdue ({overdueCount})
              </button>
            )}
            {approachingCount > 0 && (
              <button
                onClick={() => setStatusFilter(statusFilter === 'Due Soon' ? 'All' : 'Due Soon')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                  statusFilter === 'Due Soon'
                    ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300'
                    : 'bg-amber-500/30 text-amber-200 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/50'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                View Due Soon ({approachingCount})
              </button>
            )}
          </div>
        </div>
      )}

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

        {/* Status Filter Chips + Alert Badges */}
        <div className="flex items-center gap-2 flex-wrap">
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

            {/* Quick Alert Filter: Overdue Checkout */}
            {overdueCount > 0 && (
              <button
                onClick={() => setStatusFilter(statusFilter === 'Overdue Checkout' ? 'All' : 'Overdue Checkout')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all flex items-center gap-1 ${
                  statusFilter === 'Overdue Checkout'
                    ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                    : 'border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                Overdue ({overdueCount})
              </button>
            )}

            {/* Quick Alert Filter: Due Soon */}
            {approachingCount > 0 && (
              <button
                onClick={() => setStatusFilter(statusFilter === 'Due Soon' ? 'All' : 'Due Soon')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all flex items-center gap-1 ${
                  statusFilter === 'Due Soon'
                    ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-sm'
                    : 'border-amber-300 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 hover:bg-amber-100'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                Due Soon ({approachingCount})
              </button>
            )}
          </div>
        </div>

        {/* Actions & Search */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 flex-wrap">
          {/* Room Cash Wallet Button */}
          <button
            type="button"
            onClick={() => setShowRoomWalletModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition-all shrink-0 cursor-pointer shadow-emerald-500/20"
            title="Room Cash Drawer & Wallet (Opening balance, float top-ups & withdrawals)"
          >
            <WalletCards className="w-3.5 h-3.5" />
            <span>Cash Wallet</span>
          </button>

          {/* Room Day Book Button */}
          <button
            type="button"
            onClick={() => setShowDayBookModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition-all shrink-0 cursor-pointer shadow-indigo-500/20"
            title="Room Day Book & Daily Sales Summary"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Day Book</span>
          </button>

          {/* Search input */}
          <div className="relative w-full sm:w-52">
            <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Room, Name..."
              value={roomSearchTerm}
              onChange={e => setRoomSearchTerm(e.target.value)}
              className="w-full pl-8 pr-4 py-1.5 text-xs border dark:border-slate-800 dark:bg-slate-950 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {filteredRooms.map(room => {
          const isOccupied = room.status === 'Occupied';
          const isReserved = room.status === 'Reserved';
          const activeBill = isOccupied ? getBillSummary(room.roomNumber) : null;
          const checkoutAlert = isOccupied ? roomAlertMap.get(room.id) : null;
          
          // Determine card styling based on status and live checkout alert
          let cardClassName = `p-5 rounded-2xl border-t-4 border border-slate-200/40 dark:border-slate-800/40 shadow-sm flex flex-col justify-between transition-all duration-300 ${getStatusColorClass(room.status)}`;
          
          if (checkoutAlert?.status === 'overdue') {
            cardClassName = 'p-5 rounded-2xl border-2 border-rose-600 dark:border-rose-500 shadow-xl shadow-rose-500/10 flex flex-col justify-between transition-all duration-300 animate-blinker-red';
          } else if (checkoutAlert?.status === 'approaching') {
            cardClassName = 'p-5 rounded-2xl border-2 border-amber-500 dark:border-amber-400 shadow-lg shadow-amber-500/10 flex flex-col justify-between transition-all duration-300 animate-blinker-amber';
          }
          
          return (
            <div 
              key={room.id}
              className={cardClassName}
            >
              {/* Header: Room info */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xl font-bold font-mono text-slate-900 dark:text-white leading-none">
                        {room.roomNumber}
                      </h3>
                      <button
                        onClick={(e) => handleOpenEditRoom(room, e)}
                        className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-md transition-colors"
                        title="Edit Room Details (Floor, Price, Category, Room #)"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                      <span>Floor {room.floor}</span>
                      <span>●</span>
                      <span>{room.category}</span>
                      <span>●</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-200">₹{room.price}/day</span>
                    </div>

                    {isOccupied && (room.isAcSwitchedOff || (room.bookingSource && room.bookingSource !== 'Direct / Walk-In') || room.groupBookingId || room.bookingReference || room.gstNumber) && (
                      <div className="flex flex-wrap items-center gap-1 mt-1.5">
                        {room.groupBookingId && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold border border-purple-200/50 dark:border-purple-800/50">
                            👥 Group: {room.groupBookingId}
                          </span>
                        )}
                        {room.isAcSwitchedOff && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200/50 dark:border-emerald-800/50">
                            🍃 Non-AC Rate
                          </span>
                        )}
                        {room.bookingSource && room.bookingSource !== 'Direct / Walk-In' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200/50 dark:border-indigo-800/50">
                            {room.bookingSource}
                          </span>
                        )}
                        {room.bookingReference && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-mono font-bold border border-amber-200/60 dark:border-amber-800/60 flex items-center gap-0.5">
                            <Globe className="w-2.5 h-2.5" /> Ref: #{room.bookingReference}
                          </span>
                        )}
                        {room.gstNumber && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono font-bold border border-blue-200/50 dark:border-blue-800/50">
                            GST: {room.gstNumber}{room.companyName ? ` (${room.companyName})` : ''}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${getStatusBadgeClass(room.status)}`}>
                      {room.status}
                    </span>
                    {checkoutAlert?.status === 'overdue' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-600 text-white font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                        Crossed
                      </span>
                    )}
                    {checkoutAlert?.status === 'approaching' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-900 animate-ping"></span>
                        Due Soon
                      </span>
                    )}
                  </div>
                </div>

                {/* LIVE CHECK-OUT ALERT BLINKER NOTIFICATION ON CARD */}
                {checkoutAlert && checkoutAlert.status === 'overdue' && (
                  <div className="p-2.5 bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-xl shadow-md flex items-center justify-between gap-2 border border-rose-400">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="relative flex h-3 w-3 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-wider leading-tight">Check-Out Crossed!</p>
                        <p className="text-[10px] text-rose-100 font-medium truncate mt-0.5">{checkoutAlert.label}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-black bg-rose-950/70 text-rose-200 px-2 py-0.5 rounded shrink-0">
                      {checkoutAlert.formattedCheckoutTime}
                    </span>
                  </div>
                )}

                {checkoutAlert && checkoutAlert.status === 'approaching' && (
                  <div className="p-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 rounded-xl shadow-md flex items-center justify-between gap-2 border border-amber-300">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="relative flex h-3 w-3 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-80"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-950"></span>
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-wider leading-tight">Check-Out Due Soon</p>
                        <p className="text-[10px] text-slate-900 font-bold truncate mt-0.5">{checkoutAlert.label}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-black bg-slate-950 text-amber-300 px-2 py-0.5 rounded shrink-0">
                      {checkoutAlert.formattedCheckoutTime}
                    </span>
                  </div>
                )}

                {/* Body: Guest details if occupied */}
                {isOccupied && (
                  <div className="p-3 bg-white/50 dark:bg-slate-900/40 rounded-xl space-y-2 border border-white/40 dark:border-slate-800/40 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 leading-none">Guest Name</p>
                        <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">{room.guestName}</p>
                      </div>
                      <button
                        onClick={(e) => handleOpenEditCheckIn(room, e)}
                        className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300 rounded-md text-[10px] font-bold border border-indigo-200/60 dark:border-indigo-800/60 flex items-center gap-1 transition-colors shrink-0 shadow-xs"
                        title="Edit Check-In Details (Channel, GST, Rate, Contact)"
                      >
                        <Edit3 className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                        <span>Edit</span>
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <p className="text-slate-400 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 text-indigo-500" />
                          <span>Checked In</span>
                        </p>
                        <p className="font-semibold text-slate-700 dark:text-slate-300 font-mono mt-0.5">
                          {room.checkInDate}{' '}
                          <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-semibold font-mono">
                            ({room.checkInTime || settings.checkInTime || '12:00 PM'})
                          </span>
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-slate-400">
                          <p className="flex items-center gap-1">
                            <span>Checkout Due</span>
                            {checkoutAlert?.status === 'overdue' && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>}
                            {checkoutAlert?.status === 'approaching' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>}
                          </p>
                          <span className={`text-[8px] font-bold uppercase tracking-wider px-1 py-0.2 rounded ${
                            isDirectBookingSource(room.bookingSource)
                              ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300'
                              : 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300'
                          }`} title={isDirectBookingSource(room.bookingSource) ? 'Direct / Walk-In: 24-Hour Checkout' : 'Online / OTA: 12:00 PM Checkout'}>
                            {isDirectBookingSource(room.bookingSource) ? '24h' : '12 PM'}
                          </span>
                        </div>
                        <p className={`font-mono mt-0.5 ${
                          checkoutAlert?.status === 'overdue'
                            ? 'font-bold text-rose-600 dark:text-rose-400'
                            : checkoutAlert?.status === 'approaching'
                            ? 'font-bold text-amber-600 dark:text-amber-400'
                            : 'font-semibold text-slate-700 dark:text-slate-300'
                        }`}>
                          {checkoutAlert?.effectiveCheckoutDate || room.checkOutDate}{' '}
                          <span className="text-[9px] opacity-75 font-normal">
                            ({checkoutAlert ? checkoutAlert.formattedCheckoutTime : getEffectiveCheckoutTime(room.bookingSource, room.checkInTime, settings.checkOutTime)})
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-slate-200/30 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Active Balance</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                        ₹{activeBill ? activeBill.pendingAmount.toFixed(0) : '0'}
                      </span>
                    </div>

                    {(room.advancePaid || 0) > 0 && (
                      <div className="pt-1.5 border-t border-slate-200/30 flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-slate-400 font-medium">Adv Paid:</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">₹{room.advancePaid}</span>
                          <span className="font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/60 px-1.5 py-0.2 rounded text-[9px]">
                            {room.advancePaymentMethod || 'Cash'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleOpenQuickPaymentMode(room, e)}
                          className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-bold hover:underline flex items-center gap-0.5"
                          title="Edit Advance Payment Mode"
                        >
                          <Edit3 className="w-2.5 h-2.5" /> Edit Mode
                        </button>
                      </div>
                    )}
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
                  <div className="flex flex-wrap gap-1.5 w-full">
                    <button
                      onClick={() => handleGoToBilling(room)}
                      className="flex-1 py-1.5 text-center text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg flex items-center justify-center gap-1 shadow-sm"
                    >
                      <Receipt className="w-3 h-3" /> Unified Checkout
                    </button>
                    <button
                      onClick={() => handleOpenCharge(room)}
                      className="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-[10px] font-bold border border-indigo-200/60 dark:border-indigo-800/60 flex items-center gap-1 transition-colors"
                      title="Add Extra Bed or Additional Charges"
                    >
                      <BedDouble className="w-3.5 h-3.5" />
                      <span>+ Extra Bed</span>
                    </button>
                    <button
                      onClick={() => handleOpenCollectAdvance(room)}
                      className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-lg text-[10px] font-bold border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-1 transition-colors"
                      title="Collect Advance Payment & Print Receipt"
                    >
                      <IndianRupee className="w-3 h-3" />
                      <span>+ Adv</span>
                    </button>
                    {(room.advancePaid || 0) > 0 && (
                      <>
                        <button
                          onClick={() => handlePrintRoomAdvanceReceipt(room)}
                          className="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-[10px] font-bold border border-indigo-200/60 dark:border-indigo-800/60 flex items-center gap-1 transition-colors"
                          title="Print Advance Receipt"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Receipt</span>
                        </button>
                        <button
                          onClick={() => handleOpenQuickPaymentMode(room)}
                          className="px-2 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-lg text-[10px] font-bold border border-amber-200/60 dark:border-amber-800/60 flex items-center gap-1 transition-colors"
                          title="Edit Advance Payment Mode (Cash, UPI, Card, etc.)"
                        >
                          <CreditCard className="w-3 h-3" />
                          <span>Edit Mode</span>
                        </button>
                      </>
                    )}
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
                      title="Add Other Service Charges / Extend Stay"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEditCheckIn(room)}
                      className="p-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-[10px] font-bold border border-indigo-200/60 dark:border-indigo-800/60"
                      title="Edit Check-In Details (Channel, GST, Rate, Contact)"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
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
              
              {/* Dynamic Check-Out Policy Banner */}
              {(() => {
                const isDirect = isDirectBookingSource(bookingSource);
                const expectedCheckoutTime = getEffectiveCheckoutTime(bookingSource, checkInTimeInput, settings.checkOutTime);
                return (
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                    isDirect 
                      ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-800/60' 
                      : 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200/80 dark:border-indigo-800/60'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Clock className={`w-4 h-4 shrink-0 ${isDirect ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'}`} />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            {isDirect ? 'Direct / Walk-In Timing Policy' : `${bookingSource} Online Timing Policy`}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${
                            isDirect 
                              ? 'bg-amber-200 text-amber-950 dark:bg-amber-900 dark:text-amber-200' 
                              : 'bg-indigo-200 text-indigo-950 dark:bg-indigo-900 dark:text-indigo-200'
                          }`}>
                            {isDirect ? '⚡ 24-Hour Checkout' : '🏨 12:00 PM Fixed Checkout'}
                          </span>
                        </div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] mt-0.5 block">
                          Check-In: <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{checkInTimeInput || '12:00 PM'}</strong>
                          {' '}➔ Check-Out Due: <strong className="text-rose-600 dark:text-rose-400 font-mono">{expectedCheckoutTime}</strong>
                          {' '}<span className="text-[10px] text-slate-400 font-normal">({isDirect ? 'Same time 24h later' : 'Next day 12:00 PM'})</span>
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 text-right max-w-[130px] leading-tight hidden sm:block">
                      {isDirect ? '24h checkout from check-in time' : 'Fixed 12:00 PM checkout'}
                    </span>
                  </div>
                );
              })()}

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
                      const isEarly = todayStr < b.checkInDate;
                      const isCatMatch = b.roomCategory === selectedRoom.category;
                      const isRoomMatch = b.roomNumber === selectedRoom.roomNumber;
                      
                      return (
                        <option key={b.id} value={b.id}>
                          {isToday ? '🔥 [TODAY] ' : isEarly ? `⚡ [EARLY - Reserved ${b.checkInDate}] ` : ''}
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

              {/* Room Nightly Tariff & Booking Channel */}
              <div className="p-3.5 bg-indigo-50/40 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                    <span>💰</span>
                    <span>Room Nightly Rate & Booking Source</span>
                  </label>
                  <span className="text-[10px] font-bold font-mono text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                    Base Standard: ₹{selectedRoom.basePrice || selectedRoom.price}/day
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Editable Check-In Nightly Rate */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 dark:text-slate-300 text-[11px] block">
                      Agreed Room Rate (₹/Night) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 font-mono font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        required
                        step="any"
                        min="0"
                        value={checkInPrice}
                        onChange={e => setCheckInPrice(e.target.value)}
                        className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-bold font-mono text-indigo-600 dark:text-indigo-400 text-sm focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="e.g. 1500, 1000, 1850..."
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Adjust for online OTA rates, discounts, or Non-AC usage.
                    </p>
                  </div>

                  {/* Booking Channel / Source */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 dark:text-slate-300 text-[11px] block">
                      Booking Channel / Source
                    </label>
                    <select
                      value={bookingSource}
                      onChange={e => setBookingSource(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-semibold text-slate-800 dark:text-slate-200 text-xs"
                    >
                      {BOOKING_SOURCES.map(source => (
                        <option key={source} value={source}>
                          {source === 'Direct / Walk-In' ? '🚶 ' : ''}
                          {source === 'MakeMyTrip' ? '🌐 ' : ''}
                          {source === 'Booking.com' ? '🏨 ' : ''}
                          {source === 'Agoda' ? '✈️ ' : ''}
                          {source === 'Goibibo' ? '🌍 ' : ''}
                          {source === 'Airbnb' ? '🏡 ' : ''}
                          {source === 'Corporate / Travel Agent' ? '🏢 ' : ''}
                          {source === 'Phone / WhatsApp Booking' ? '📞 ' : ''}
                          {source}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400">
                      Channel helps track OTA vs Walk-in rate variations.
                    </p>
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
                      OTA reservation / confirmation reference for guest billing & channel audit.
                    </p>
                  </div>
                )}

                {/* Quick AC / Non-AC Mode Toggle Button */}
                <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/40 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    Room AC Usage Mode:
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAcSwitchedOff(false);
                        setCheckInPrice(selectedRoom.basePrice || selectedRoom.price || 1500);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        !isAcSwitchedOff
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      ❄️ Standard AC Tariff (₹{selectedRoom.basePrice || selectedRoom.price})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAcSwitchedOff(true);
                        const base = selectedRoom.basePrice || selectedRoom.price || 1500;
                        const discounted = Math.max(500, Math.round(base * 0.67));
                        setCheckInPrice(discounted);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        isAcSwitchedOff
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      🍃 Non-AC Tariff (AC Off)
                    </button>
                  </div>
                </div>
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
                  <label className="font-bold text-slate-500">ID Proof Details (Aadhaar / Passport) (Optional)</label>
                  <input
                    type="text"
                    value={guestIdProof}
                    onChange={e => setGuestIdProof(e.target.value)}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg"
                    placeholder="Aadhaar / Passport Details (Optional)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">GST Number</label>
                    <input
                      type="text"
                      value={guestGst}
                      onChange={e => setGuestGst(e.target.value.toUpperCase())}
                      className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg uppercase font-mono text-xs"
                      placeholder="Optional (e.g. 33AAAAA0000A1Z5)"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 flex items-center justify-between">
                      <span>Company Name</span>
                      {guestGst.trim() && (
                        <span className="text-[10px] text-rose-500 font-bold">* Required for GST</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      className={`w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg text-xs ${guestGst.trim() && !companyName.trim() ? 'border-amber-500 ring-1 ring-amber-500' : ''}`}
                      placeholder={guestGst.trim() ? "Required: Legal Business / Company Name" : "Optional (Company Name)"}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 flex items-center justify-between">
                    <span>Check-In Time *</span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                      {checkInTimeInput || '12:00 PM'}
                    </span>
                  </label>
                  <input
                    type="time"
                    value={formatTime24h(checkInTimeInput)}
                    onChange={e => setCheckInTimeInput(e.target.value ? formatTime12h(e.target.value) : formatTime12h({ hours: new Date().getHours(), minutes: new Date().getMinutes() }))}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 flex items-center justify-between">
                    <span>Expected Check-Out *</span>
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-mono font-bold">
                      Due {getEffectiveCheckoutTime(bookingSource, checkInTimeInput, settings.checkOutTime)}
                    </span>
                  </label>
                  <input
                    type="date"
                    required
                    min={isDirectBookingSource(bookingSource) ? getLocalTodayString(1, todayStr) : todayStr}
                    value={checkOutDate}
                    onChange={e => setCheckOutDate(e.target.value)}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg text-xs font-semibold"
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
                    step="any"
                    min="0"
                    placeholder="0"
                    value={advancePaid}
                    onChange={e => setAdvancePaid(e.target.value)}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg font-mono font-bold text-emerald-600 dark:text-emerald-400"
                  />
                </div>
              </div>

              {Number(advancePaid) > 0 && (
                <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/60 rounded-xl flex items-center justify-between gap-4">
                  <div>
                    <label className="font-bold text-emerald-800 dark:text-emerald-300 text-xs block">
                      Advance Payment Mode *
                    </label>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Select collection mode for ₹{advancePaid} advance
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={checkInPaymentMethod}
                      onChange={e => setCheckInPaymentMethod(e.target.value)}
                      className="p-2 border rounded-xl bg-white dark:bg-slate-950 dark:border-slate-800 font-bold text-xs focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Cash">💵 Cash</option>
                      <option value="UPI">📱 UPI / GPay / PhonePe</option>
                      <option value="Card">💳 Debit / Credit Card</option>
                      <option value="Bank Transfer">🏦 Bank Transfer / NEFT</option>
                      <option value="Prepaid/OTI">🌐 Prepaid/OTI</option>
                    </select>
                  </div>
                </div>
              )}

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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2.5 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    Transfer Room {selectedRoom.roomNumber}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Move guest & transfer all advance payments and folio bills
                  </p>
                </div>
              </div>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">×</button>
            </div>
            
            <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
              
              {/* Active Guest & Current Stay Info */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-800/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium">Active Guest</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      {selectedRoom.guestName || 'In-House Guest'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-medium">Current Room</span>
                    <p className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                      Room {selectedRoom.roomNumber} ({selectedRoom.category})
                    </p>
                  </div>
                </div>

                {/* Transferred Payment Details Card */}
                <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300 text-[11px] flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5" /> Payment Details to Transfer:
                    </span>
                    <span className="font-mono font-black text-emerald-700 dark:text-emerald-300 text-xs">
                      ₹{selectedRoom.advancePaid || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-300">
                    <span>
                      Mode: <strong className="text-emerald-800 dark:text-emerald-300">{selectedRoom.advancePaymentMethod || 'Cash'}</strong>
                      {selectedRoom.advanceReceiptNumber ? ` • Receipt #${selectedRoom.advanceReceiptNumber}` : ''}
                    </span>
                    <span>Tariff: ₹{selectedRoom.price}/night</span>
                  </div>
                </div>
              </div>

              {/* Target Room Selector */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 text-xs flex items-center justify-between">
                  <span>Select Target Room <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-400">Available clean rooms</span>
                </label>
                <select
                  required
                  value={transferTargetRoomId}
                  onChange={e => setTransferTargetRoomId(e.target.value)}
                  className="w-full p-2.5 border dark:border-slate-800 dark:bg-slate-950 rounded-xl font-bold text-xs focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Choose Available Target Room --</option>
                  {rooms
                    .filter(r => r.status === 'Available' && r.id !== selectedRoom.id)
                    .map(r => (
                      <option key={r.id} value={r.id}>
                        Room {r.roomNumber} ({r.category} • Base: ₹{r.price}/night)
                      </option>
                    ))}
                </select>
              </div>

              {/* Helpful assurance notice */}
              <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/60 text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                <span>
                  The <strong>₹{selectedRoom.advancePaid || 0}</strong> payment, mode (<strong>{selectedRoom.advancePaymentMethod || 'Cash'}</strong>), and active stay will immediately transfer to the new room across Day Book, Front Office, and Unified Billing.
                </span>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 border dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!transferTargetRoomId || isSubmittingTransfer}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>{isSubmittingTransfer ? 'Transferring...' : 'Confirm Room Transfer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. ADD OTHER SERVICE CHARGE / EXTEND STAY MODAL */}
      {showExtendModal && selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    Add Charges / Extend Stay
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Room {selectedRoom.roomNumber} ({selectedRoom.category}) • Guest: <strong className="text-slate-700 dark:text-slate-200">{selectedRoom.guestName || 'In-House Guest'}</strong>
                  </p>
                </div>
              </div>
              <button onClick={() => setShowExtendModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold">×</button>
            </div>

            {/* Room Folio Snapshot */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Current Checkout Due:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedRoom.checkOutDate}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Existing Other Charges on Folio:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  ₹{selectedRoom.otherCharges || 0} {selectedRoom.otherChargesDescription ? `(${selectedRoom.otherChargesDescription})` : ''}
                </span>
              </div>
            </div>

            {/* Tab switch between Add Service Charge & Extend Stay */}
            <div className="flex bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setExtendModalTab('service')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  extendModalTab === 'service'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Other Services / Cost</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setExtendModalTab('extend');
                  if (extendDays <= 0) setExtendDays(1);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  extendModalTab === 'extend'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Extend Stay Duration</span>
              </button>
            </div>
            
            <form onSubmit={handleExtendOrChargeSubmit} className="space-y-4 text-xs">
              {extendModalTab === 'service' ? (
                <>
                  {/* Service Presets */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Quick Service Presets
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { label: 'Early Check-in (₹500)', amount: 500, desc: 'Early Check-in Fee' },
                        { label: 'Late Checkout (₹500)', amount: 500, desc: 'Late Check-out Fee' },
                        { label: 'Extra Bed (₹500)', amount: 500, desc: 'Extra Bed / Rollaway Mattress' },
                        { label: 'Extra Bed (₹800)', amount: 800, desc: 'Extra Bed / Rollaway Mattress' },
                        { label: 'Laundry (₹300)', amount: 300, desc: 'Laundry & Ironing' },
                        { label: 'Airport Cab (₹800)', amount: 800, desc: 'Airport Cab Transfer' },
                        { label: 'Extra Towels (₹150)', amount: 150, desc: 'Extra Towel & Linen' },
                        { label: 'Room Upgrade (₹1000)', amount: 1000, desc: 'Room Category Upgrade Fee' },
                        { label: 'Minibar / Snacks (₹250)', amount: 250, desc: 'Minibar & Refreshment Charges' },
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setExtraServiceName(preset.desc);
                            setExtraServiceAmount(preset.amount);
                          }}
                          className={`p-1.5 text-center rounded-lg border text-[10px] font-bold transition-all ${
                            extraServiceAmount === preset.amount && extraServiceName === preset.desc
                              ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500'
                              : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Input 1: Service Name / Description */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-200">
                      Service Name / Description <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Early Check-in, Extra Bed, Laundry, Airport Cab, Minibar"
                      value={extraServiceName}
                      onChange={e => setExtraServiceName(e.target.value)}
                      className="w-full p-2.5 border rounded-xl dark:bg-slate-950 dark:border-slate-800 text-slate-800 dark:text-slate-100 font-medium text-xs focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Input 2: Amount of Charges */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-200">
                      Amount of Charges (₹) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        required
                        placeholder="500"
                        value={extraServiceAmount}
                        onChange={e => setExtraServiceAmount(e.target.value)}
                        className="w-full pl-8 pr-3 py-2.5 border rounded-xl dark:bg-slate-950 dark:border-slate-800 text-slate-800 dark:text-slate-100 font-mono font-bold text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Input 3: Payment Settlement Mode (Collect Now or Pay at Checkout) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700 dark:text-slate-200">
                        Payment Settlement Mode <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400">Collect now or bill to room</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setExtraServicePaymentOption('checkout')}
                        className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                          extraServicePaymentOption === 'checkout'
                            ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500'
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg ${extraServicePaymentOption === 'checkout' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                          <Receipt className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold leading-tight">Pay at Check-Out</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">Bill to Room Folio</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setExtraServicePaymentOption('collect_now');
                          if (!extraServiceReceiptNo) {
                            setExtraServiceReceiptNo(getNextAdvanceReceiptNumber(rooms.map(r => r.advanceReceiptNumber)));
                          }
                        }}
                        className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                          extraServicePaymentOption === 'collect_now'
                            ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500'
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg ${extraServicePaymentOption === 'collect_now' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                          <IndianRupee className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold leading-tight">Collect Now</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">Immediate Payment</div>
                        </div>
                      </button>
                    </div>

                    {extraServicePaymentOption === 'collect_now' ? (
                      <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/80 dark:border-emerald-800/80 space-y-2.5 animate-in fade-in duration-150">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                              Payment Mode <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={extraServicePaymentMode}
                              onChange={e => setExtraServicePaymentMode(e.target.value)}
                              className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 font-bold text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                            >
                              <option value="Cash">Cash</option>
                              <option value="UPI">UPI / GPay / PhonePe</option>
                              <option value="Card">Debit / Credit Card</option>
                              <option value="Bank Transfer">Bank Transfer / NEFT</option>
                              <option value="Cheque">Cheque</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                              Receipt / Voucher No.
                            </label>
                            <input
                              type="text"
                              value={extraServiceReceiptNo}
                              onChange={e => setExtraServiceReceiptNo(e.target.value)}
                              placeholder="Auto-assigned"
                              className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 font-mono font-bold text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                        <div className="text-[10px] text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>
                            ₹{Number(extraServiceAmount) || 0} will be recorded as collected via {extraServicePaymentMode} with instant receipt generation option.
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span>Payment mode will be chosen while checking out the room in Unified Billing.</span>
                      </div>
                    )}
                  </div>

                  {/* Optional: Also Extend Stay Checkbox */}
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={extendDays > 0}
                        onChange={e => setExtendDays(e.target.checked ? 1 : 0)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Also extend checkout date?</span>
                    </label>
                    {extendDays > 0 && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          value={extendDays}
                          onChange={e => setExtendDays(Math.max(1, Number(e.target.value)))}
                          className="w-16 p-1 border dark:border-slate-800 dark:bg-slate-900 rounded-lg text-center font-mono font-bold text-xs"
                        />
                        <span className="text-[10px] text-slate-500 font-semibold">day(s)</span>
                      </div>
                    )}
                  </div>

                  {/* Live Impact Preview */}
                  <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/70 dark:border-emerald-800/70 text-xs space-y-1">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Service Charge to Invoice:</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-300">
                        +₹{Number(extraServiceAmount) || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Settlement Status:</span>
                      {extraServicePaymentOption === 'checkout' ? (
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          Pay at Check-Out (Added to Bill)
                        </span>
                      ) : (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          Paid Now via {extraServicePaymentMode} (Advance Deposit)
                        </span>
                      )}
                    </div>
                    {extendDays > 0 && (
                      <div className="flex justify-between text-[11px] text-indigo-600 dark:text-indigo-400">
                        <span>New Checkout Due:</span>
                        <span className="font-mono font-bold">
                          {(() => {
                            try {
                              const d = new Date(selectedRoom.checkOutDate || '');
                              d.setDate(d.getDate() + Number(extendDays));
                              return d.toISOString().split('T')[0];
                            } catch {
                              return 'Extended';
                            }
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Extend Stay Tab */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-200">Extend Stay by (Days) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={extendDays || 1}
                      onChange={e => setExtendDays(Math.max(1, Number(e.target.value)))}
                      className="w-full p-2.5 border dark:border-slate-800 dark:bg-slate-950 rounded-xl font-bold font-mono text-center text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-xs space-y-1">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Current Checkout:</span>
                      <span className="font-mono font-semibold">{selectedRoom.checkOutDate}</span>
                    </div>
                    <div className="flex justify-between text-indigo-700 dark:text-indigo-300 font-bold">
                      <span>Extended Checkout:</span>
                      <span className="font-mono">
                        {(() => {
                          try {
                            const d = new Date(selectedRoom.checkOutDate || '');
                            d.setDate(d.getDate() + Number(extendDays || 1));
                            return d.toISOString().split('T')[0];
                          } catch {
                            return 'Extended';
                          }
                        })()}
                      </span>
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowExtendModal(false)}
                  className="px-4 py-2 border dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmittingExtendOrCharge ||
                    (extendModalTab === 'service' && (!extraServiceName.trim() || Number(extraServiceAmount) <= 0)) ||
                    (extendModalTab === 'extend' && extendDays <= 0)
                  }
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {extendModalTab === 'service'
                      ? extraServicePaymentOption === 'checkout'
                        ? 'Add Charge (Pay at Checkout)'
                        : `Collect ₹${Number(extraServiceAmount) || 0} & Add Charge`
                      : 'Apply Extension'}
                  </span>
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
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[10px]">Guest Name</span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowBillModal(false);
                            handleOpenEditCheckIn(selectedRoom);
                          }}
                          className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-0.5"
                          title="Edit Guest & Check-In Details"
                        >
                          <Edit3 className="w-2.5 h-2.5" /> Edit
                        </button>
                      </div>
                      <p className="font-bold text-slate-800 dark:text-slate-150">{summary.guestName}</p>
                      {selectedRoom.gstNumber && (
                        <p className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                          GST: {selectedRoom.gstNumber}{selectedRoom.companyName ? ` (${selectedRoom.companyName})` : ''}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 text-[10px]">Check-In</span>
                      <p className="font-mono text-slate-700 dark:text-slate-300 font-semibold">
                        {summary.checkInDate}{' '}
                        <span className="text-indigo-600 dark:text-indigo-400 text-[11px]">
                          ({selectedRoom.checkInTime || summary.checkInTime || settings.checkInTime || '12:00 PM'})
                        </span>
                      </p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Channel: <span className="font-semibold text-slate-600 dark:text-slate-300">{selectedRoom.bookingSource || 'Direct'}</span></p>
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
                        <span className="text-slate-500 font-sans">Total Folio (Incl. GST)</span>
                        <span>₹{summary.grandTotal}</span>
                      </div>

                      <div className="flex justify-between text-slate-500 text-[10px]">
                        <span>Taxable Base: ₹{summary.subtotal}</span>
                        <span>GST @{summary.taxRate}%: ₹{summary.taxAmount}</span>
                      </div>

                      <div className="flex justify-between items-center text-slate-500 text-[10px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>Advance Payments Paid</span>
                          {summary.advancePaid > 0 && selectedRoom && (
                            <>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 rounded border border-emerald-300/50 dark:border-emerald-700/50">
                                {selectedRoom.advancePaymentMethod || 'Cash'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowBillModal(false);
                                  handlePrintRoomAdvanceReceipt(selectedRoom);
                                }}
                                className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-bold underline flex items-center gap-0.5 ml-1"
                                title="Print Advance Receipt"
                              >
                                <Printer className="w-3 h-3 inline" /> Print
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowBillModal(false);
                                  handleOpenQuickPaymentMode(selectedRoom);
                                }}
                                className="text-amber-600 hover:text-amber-700 dark:text-amber-400 font-bold underline flex items-center gap-0.5 ml-1"
                                title="Edit Mode of Payment"
                              >
                                <Edit3 className="w-2.5 h-2.5 inline" /> Edit Mode
                              </button>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {selectedRoom && (
                            <button
                              type="button"
                              onClick={() => {
                                setShowBillModal(false);
                                handleOpenCollectAdvance(selectedRoom);
                              }}
                              className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-0.5"
                            >
                              + Add Adv
                            </button>
                          )}
                          <span className="text-emerald-500 font-mono font-bold">-₹{summary.advancePaid}</span>
                        </div>
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

      {/* 5. ADD EXTRA BED & SERVICE CHARGE MODAL */}
      {showChargeModal && selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                  <BedDouble className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    Add Extra Bed & Charges
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Room {selectedRoom.roomNumber} ({selectedRoom.category}) • Guest: <strong className="text-slate-700 dark:text-slate-200">{selectedRoom.guestName || 'In-House Guest'}</strong>
                  </p>
                </div>
              </div>
              <button onClick={() => setShowChargeModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold">×</button>
            </div>

            {/* Current Extra / Other Charges Status */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Existing Other Charges on Folio:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">
                ₹{selectedRoom.otherCharges || 0}
              </span>
            </div>

            <form onSubmit={handleAddChargeSubmit} className="space-y-4 text-xs">
              {/* Quick Preset Buttons */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Quick Charge Presets
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Early Check-in Fee (₹500)', amount: 500, desc: 'Early Check-in Charge' },
                    { label: 'Late Checkout Fee (₹500)', amount: 500, desc: 'Late Check-out Charge' },
                    { label: 'Extra Bed (₹500)', amount: 500, desc: 'Extra Bed / Rollaway Mattress' },
                    { label: 'Extra Bed (₹800)', amount: 800, desc: 'Extra Bed / Rollaway Mattress' },
                    { label: 'Extra Bed (₹1000)', amount: 1000, desc: 'Extra Bed / Rollaway Mattress' },
                    { label: 'Rollaway Cot (₹600)', amount: 600, desc: 'Rollaway Cot' },
                    { label: 'Extra Linen / Towel (₹150)', amount: 150, desc: 'Extra Linen & Towel Set' },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setChargeAmount(preset.amount);
                        setChargeDescription(preset.desc);
                      }}
                      className={`p-2 rounded-xl text-left border text-[11px] font-semibold transition-all ${
                        chargeAmount === preset.amount && chargeDescription === preset.desc
                          ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                      }`}
                    >
                      <div className="truncate font-bold">{preset.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Charge Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    required
                    value={chargeAmount !== undefined ? chargeAmount : ''}
                    onChange={e => setChargeAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border rounded-xl dark:bg-slate-950 dark:border-slate-800 text-slate-800 dark:text-slate-100 font-mono font-bold text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="500"
                  />
                </div>
              </div>

              {/* Description / Notes */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Description / Service Note <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={chargeDescription}
                  onChange={e => setChargeDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl dark:bg-slate-950 dark:border-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Extra Bed, Rollaway Mattress, Additional Linen"
                />
              </div>

              {/* Total preview */}
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400 text-xs">New Total Other Charges:</span>
                <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">
                  ₹{(Number(selectedRoom.otherCharges) || 0) + (Number(chargeAmount) || 0)}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowChargeModal(false)}
                  className="px-4 py-2 border dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCharge || !chargeAmount || Number(chargeAmount) <= 0}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                  {isSubmittingCharge ? 'Adding...' : 'Post Charge to Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. EDIT ROOM DETAILS MODAL */}
      {showEditRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    Edit Room Details
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Modify floor number, rent price, category, or room number
                  </p>
                </div>
              </div>
              <button onClick={() => setShowEditRoomModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold">×</button>
            </div>

            <form onSubmit={handleEditRoomSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Room Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editRoomNumber}
                    onChange={e => setEditRoomNumber(e.target.value)}
                    className="w-full p-2.5 border rounded-xl dark:bg-slate-950 dark:border-slate-800 text-slate-800 dark:text-slate-100 font-mono font-bold text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. 101"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Floor Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editRoomFloor}
                    onChange={e => setEditRoomFloor(Number(e.target.value))}
                    className="w-full p-2.5 border rounded-xl dark:bg-slate-950 dark:border-slate-800 text-slate-800 dark:text-slate-100 font-bold text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Room Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editRoomCategory}
                  onChange={e => setEditRoomCategory(e.target.value as RoomCategory)}
                  className="w-full p-2.5 border rounded-xl dark:bg-slate-950 dark:border-slate-800 text-slate-800 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-indigo-500"
                >
                  {['Deluxe AC', 'Deluxe Superior', 'Elite', 'Superior', 'Family Suite', 'Non AC'].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Room Rent Price / Day (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    required
                    value={editRoomPrice !== undefined ? editRoomPrice : ''}
                    onChange={e => setEditRoomPrice(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 border rounded-xl dark:bg-slate-950 dark:border-slate-800 text-slate-800 dark:text-slate-100 font-mono font-bold text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="2500"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditRoomModal(false)}
                  className="px-4 py-2 border dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEditRoom || !editRoomNumber || Number(editRoomPrice) <= 0}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                  {isSubmittingEditRoom ? 'Saving...' : 'Save Room Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          COLLECT ADVANCE PAYMENT MODAL (ANY TIME DURING STAY)
          ========================================================================= */}
      {showCollectAdvanceModal && selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <IndianRupee className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                    Collect Advance Payment
                  </h3>
                  <p className="text-xs text-slate-400">
                    Room {selectedRoom.roomNumber} • {selectedRoom.guestName || 'In-House Guest'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCollectAdvanceModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCollectAdvanceSubmit} className="space-y-4 text-xs">
              {/* Existing Advance info card */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/60 dark:border-slate-800/60 flex justify-between items-center">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Previously Paid Advance</span>
                  <span className="text-slate-700 dark:text-slate-300 font-mono font-bold text-sm">
                    ₹{(selectedRoom.advancePaid || 0).toLocaleString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Stay Rate</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold text-xs">
                    ₹{selectedRoom.price}/night
                  </span>
                </div>
              </div>

              {/* Action Mode (Add vs Set) if advance already exists */}
              {(selectedRoom.advancePaid || 0) > 0 && (
                <div className="space-y-1.5 p-2.5 bg-slate-100 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Advance Action Mode:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdvanceEntryMode('add')}
                      className={`p-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                        advanceEntryMode === 'add'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <span>➕ Add to Existing</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdvanceEntryMode('set')}
                      className={`p-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                        advanceEntryMode === 'set'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <span>✏️ Set / Correct Total</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Advance Amount */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                  <span>
                    {advanceEntryMode === 'set' ? 'New Total Advance Amount (₹) *' : 'Advance Deposit Amount (₹) *'}
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    required
                    value={advanceAmountInput !== undefined ? advanceAmountInput : ''}
                    onChange={e => setAdvanceAmountInput(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border rounded-xl dark:bg-slate-950 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-base focus:ring-2 focus:ring-emerald-500"
                    placeholder="1000"
                    autoFocus
                  />
                </div>
              </div>

              {/* Group Advance Equal Split Option */}
              {selectedRoomGroupMembers.length > 1 && (
                <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/30 rounded-xl border border-purple-200 dark:border-purple-800 space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyAdvanceToGroup}
                      onChange={e => setApplyAdvanceToGroup(e.target.checked)}
                      className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                    />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                        👥 Split Advance equally across all {selectedRoomGroupMembers.length} rooms in Group {selectedRoom.groupBookingId}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        Group Rooms: {selectedRoomGroupMembers.map(r => `Room ${r.roomNumber}`).join(', ')}
                      </span>
                    </div>
                  </label>

                  {applyAdvanceToGroup && Number(advanceAmountInput) > 0 && (
                    <div className="pt-2 border-t border-purple-200/60 dark:border-purple-800/60 flex items-center justify-between text-xs font-semibold text-purple-700 dark:text-purple-300">
                      <span>
                        Total ₹{Number(advanceAmountInput).toLocaleString()} ÷ {selectedRoomGroupMembers.length} Rooms
                      </span>
                      <span className="font-mono font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-purple-300 dark:border-purple-700 text-emerald-600 dark:text-emerald-400">
                        = ₹{(Number(advanceAmountInput) / selectedRoomGroupMembers.length).toFixed(2)} / room
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Live Resulting Advance Summary */}
              {Number(advanceAmountInput) > 0 && (
                <div className="p-2.5 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-xs flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">
                    {advanceEntryMode === 'add' ? 'Resulting Total on Folio:' : 'Updated Total on Folio:'}
                  </span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                    {applyAdvanceToGroup && selectedRoomGroupMembers.length > 1
                      ? advanceEntryMode === 'add'
                        ? `₹${((selectedRoom.advancePaid || 0) + (Number(advanceAmountInput) / selectedRoomGroupMembers.length)).toLocaleString()} per room`
                        : `₹${(Number(advanceAmountInput) / selectedRoomGroupMembers.length).toFixed(2)} per room`
                      : advanceEntryMode === 'add'
                        ? `₹${((selectedRoom.advancePaid || 0) + Number(advanceAmountInput)).toLocaleString()}`
                        : `₹${Number(advanceAmountInput).toLocaleString()}`
                    }
                  </span>
                </div>
              )}

              {/* Payment Mode & Receipt Number */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Payment Mode</label>
                  <select
                    value={advancePaymentMethod}
                    onChange={e => setAdvancePaymentMethod(e.target.value)}
                    className="w-full p-2 border rounded-xl dark:bg-slate-950 dark:border-slate-800 font-bold text-xs"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="Card">Debit / Credit Card</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="Prepaid/OTI">Prepaid/OTI</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Receipt / Entry No.</label>
                  <input
                    type="text"
                    value={advanceReceiptNoInput}
                    onChange={e => setAdvanceReceiptNoInput(e.target.value)}
                    className="w-full p-2 border rounded-xl dark:bg-slate-950 dark:border-slate-800 font-mono font-bold text-xs"
                    placeholder="1243"
                  />
                </div>
              </div>

              {/* Received By */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Received By</label>
                <input
                  type="text"
                  value={advanceReceivedByInput}
                  onChange={e => setAdvanceReceivedByInput(e.target.value)}
                  className="w-full p-2 border rounded-xl dark:bg-slate-950 dark:border-slate-800 font-medium text-xs"
                  placeholder="Manager (Front Desk Manager)"
                />
              </div>

              {/* Optional Notes */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Payment Note (Optional)</label>
                <input
                  type="text"
                  value={advanceNotesInput}
                  onChange={e => setAdvanceNotesInput(e.target.value)}
                  className="w-full p-2 border rounded-xl dark:bg-slate-950 dark:border-slate-800 text-xs"
                  placeholder="e.g. Paid via UPI Txn #92837482"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCollectAdvanceModal(false)}
                  className="px-4 py-2 border dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdvance || Number(advanceAmountInput) <= 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-md transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  {isSubmittingAdvance ? 'Recording...' : 'Collect & Print Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. EDIT CHECK-IN DETAILS MODAL */}
      {showEditCheckInModal && editCheckInRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2.5 border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
                    <Edit3 className="w-4 h-4" />
                  </span>
                  <span>Edit Check-In Details — Room {editCheckInRoom.roomNumber}</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Update booking channel, corporate GSTIN, guest contact info, or tariff for this active stay
                </p>
              </div>
              <button 
                onClick={() => setShowEditCheckInModal(false)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold p-1 rounded-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleEditCheckInSubmit} className="space-y-4 text-xs">
              
              {/* Dynamic Timing Policy Banner */}
              {(() => {
                const isDirect = isDirectBookingSource(editBookingSource);
                const expectedCheckoutTime = getEffectiveCheckoutTime(editBookingSource, editCheckInTimeInput, settings.checkOutTime);
                return (
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                    isDirect 
                      ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-800/60' 
                      : 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200/80 dark:border-indigo-800/60'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Clock className={`w-4 h-4 shrink-0 ${isDirect ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'}`} />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                            {isDirect ? 'Direct / Walk-In Timing Policy' : `${editBookingSource} Online Timing Policy`}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${
                            isDirect 
                              ? 'bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-100' 
                              : 'bg-indigo-200 dark:bg-indigo-900/80 text-indigo-900 dark:text-indigo-100'
                          }`}>
                            {isDirect ? '24-Hour Checkout' : '12:00 PM Standard'}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                          Expected Checkout: <span className="font-mono font-bold">{expectedCheckoutTime}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 1. Fast Booking Channel / Source & OTA Reference */}
              <div className="p-3.5 bg-indigo-50/40 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                    <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Booking Channel / Source *</span>
                  </label>
                  <span className="text-[10px] font-bold text-slate-400">
                    Channel tracks OTA vs Walk-in rate variations & checkout policy
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 dark:text-slate-300 text-[11px] block">
                      Booking Channel
                    </label>
                    <select
                      value={editBookingSource}
                      onChange={e => setEditBookingSource(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-semibold text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
                    >
                      {BOOKING_SOURCES.map(source => (
                        <option key={source} value={source}>
                          {source === 'Direct / Walk-In' ? '🚶 ' : ''}
                          {source === 'MakeMyTrip' ? '🌐 ' : ''}
                          {source === 'Booking.com' ? '🏨 ' : ''}
                          {source === 'Agoda' ? '✈️ ' : ''}
                          {source === 'Goibibo' ? '🌍 ' : ''}
                          {source === 'Airbnb' ? '🏡 ' : ''}
                          {source === 'Corporate / Travel Agent' ? '🏢 ' : ''}
                          {source === 'Phone / WhatsApp Booking' ? '📞 ' : ''}
                          {source}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 dark:text-slate-300 text-[11px] block">
                      Booking Reference / Voucher ID
                    </label>
                    <input
                      type="text"
                      value={editBookingReference}
                      onChange={e => setEditBookingReference(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-mono font-bold text-xs uppercase"
                      placeholder={isOnlineBookingSource(editBookingSource) ? "e.g. MMT98234120, BDC-88491..." : "Optional booking ref"}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Fast Corporate GSTIN / GST Details */}
              <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/70 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5 text-xs">
                    <Receipt className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Corporate GSTIN & Company Details</span>
                  </label>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                    B2B Tax Invoice & Audit
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Corporate GSTIN</label>
                    <input
                      type="text"
                      value={editGuestGst}
                      onChange={e => setEditGuestGst(e.target.value.toUpperCase())}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded-lg font-mono font-bold text-blue-950 dark:text-blue-100 text-xs uppercase tracking-wider focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. 33AAHCJ3990L1Z5"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between">
                      <span>Company Name</span>
                      {editGuestGst.trim() && (
                        <span className="text-[10px] text-rose-500 font-bold">* Required</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={editCompanyName}
                      onChange={e => setEditCompanyName(e.target.value)}
                      className={`w-full p-2 bg-white dark:bg-slate-900 border ${editGuestGst.trim() && !editCompanyName.trim() ? 'border-amber-500 ring-1 ring-amber-500' : 'border-blue-300 dark:border-blue-700'} rounded-lg text-xs font-semibold`}
                      placeholder={editGuestGst.trim() ? "Required: Company Name" : "Company / Business Name"}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Directly updates invoice GSTIN and Company Name for corporate billing and Unified Checkout.
                </p>
              </div>

              {/* 3. Tariff & AC Mode */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 dark:text-slate-300 text-[11px] block">
                      Agreed Room Rate (₹/Night) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 font-mono font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        required
                        step="any"
                        min="0"
                        value={editCheckInPrice}
                        onChange={e => setEditCheckInPrice(e.target.value)}
                        className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-bold font-mono text-indigo-600 dark:text-indigo-400 text-sm focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 dark:text-slate-300 text-[11px] block">
                      Room AC Usage Mode
                    </label>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditIsAcSwitchedOff(false);
                          setEditCheckInPrice(editCheckInRoom.basePrice || editCheckInRoom.price || 1500);
                        }}
                        className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold transition-all ${
                          !editIsAcSwitchedOff
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        ❄️ AC Mode
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditIsAcSwitchedOff(true);
                          const base = editCheckInRoom.basePrice || editCheckInRoom.price || 1500;
                          setEditCheckInPrice(Math.max(500, Math.round(base * 0.67)));
                        }}
                        className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold transition-all ${
                          editIsAcSwitchedOff
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        🍃 Non-AC
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Guest Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 dark:text-slate-300">Guest Name *</label>
                  <input
                    type="text"
                    required
                    value={editGuestName}
                    onChange={e => setEditGuestName(e.target.value)}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg text-xs"
                    placeholder="e.g. Rajesh Kumar"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 dark:text-slate-300">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={editGuestPhone}
                    onChange={e => setEditGuestPhone(e.target.value)}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg text-xs"
                    placeholder="e.g. 9876543210"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 dark:text-slate-300">Email Address</label>
                  <input
                    type="email"
                    value={editGuestEmail}
                    onChange={e => setEditGuestEmail(e.target.value)}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg text-xs"
                    placeholder="guest@gmail.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 dark:text-slate-300">ID Proof Details</label>
                  <input
                    type="text"
                    value={editGuestIdProof}
                    onChange={e => setEditGuestIdProof(e.target.value)}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg text-xs"
                    placeholder="Aadhaar / Passport Details"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 dark:text-slate-300">Address</label>
                  <input
                    type="text"
                    value={editGuestAddress}
                    onChange={e => setEditGuestAddress(e.target.value)}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg text-xs"
                    placeholder="Complete Address"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 dark:text-slate-300">No of Guests</label>
                  <input
                    type="number"
                    min={1}
                    value={editNoOfGuests}
                    onChange={e => setEditNoOfGuests(Number(e.target.value))}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* 5. Advance Deposit & Mode of Payment */}
              <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/70 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5 text-xs">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Advance Payment & Mode of Payment</span>
                  </label>
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                    Editable for Receptionist
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Advance Paid (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 font-mono font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={editAdvancePaid}
                        onChange={e => setEditAdvancePaid(e.target.value)}
                        className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 text-xs focus:ring-2 focus:ring-emerald-500"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Mode of Payment *</span>
                      <span className="text-[9px] text-slate-400 font-normal">Collection method</span>
                    </label>
                    <select
                      value={editAdvancePaymentMethod}
                      onChange={e => setEditAdvancePaymentMethod(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-lg font-bold text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Cash">💵 Cash</option>
                      <option value="UPI">📱 UPI / GPay / PhonePe</option>
                      <option value="Card">💳 Debit / Credit Card</option>
                      <option value="Bank Transfer">🏦 Bank Transfer / NEFT</option>
                      <option value="Prepaid/OTI">🌐 Prepaid/OTI</option>
                      <option value="Cheque">📄 Cheque</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Advance Receipt No.
                    </label>
                    <input
                      type="text"
                      value={editAdvanceReceiptNumber}
                      onChange={e => setEditAdvanceReceiptNumber(e.target.value)}
                      className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-xs"
                      placeholder="Receipt / Entry No."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Advance Payment Date
                    </label>
                    <input
                      type="date"
                      value={editAdvancePaymentDate}
                      onChange={e => setEditAdvancePaymentDate(e.target.value)}
                      className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-xs"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  💡 Correct the mode of payment here if mistakenly entered at check-in. Day Book reports and cash registers reflect this immediately.
                </p>
              </div>

              {/* Stay Dates & Timings */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 dark:text-slate-300">Check-In Date</label>
                  <input
                    type="date"
                    value={editCheckInDate}
                    onChange={e => setEditCheckInDate(e.target.value)}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 dark:text-slate-300">Check-In Time</label>
                  <input
                    type="time"
                    value={formatTime24h(editCheckInTimeInput)}
                    onChange={e => setEditCheckInTimeInput(e.target.value ? formatTime12h(e.target.value) : editCheckInTimeInput)}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 dark:text-slate-300">Expected Check-Out</label>
                  <input
                    type="date"
                    min={isDirectBookingSource(editBookingSource) ? getLocalTodayString(1, editCheckInDate || todayStr) : (editCheckInDate || todayStr)}
                    value={editCheckOutDate}
                    onChange={e => setEditCheckOutDate(e.target.value)}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditCheckInModal(false)}
                  className="px-4 py-2 border dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEditCheckIn}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSubmittingEditCheckIn ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. QUICK EDIT PAYMENT MODE MODAL */}
      {showEditPaymentModeModal && paymentModeEditRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2.5 border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400">
                    <CreditCard className="w-4 h-4" />
                  </span>
                  <span>Edit Mode of Payment — Room {paymentModeEditRoom.roomNumber}</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Update payment method if wrongly selected by receptionist during check-in
                </p>
              </div>
              <button 
                onClick={() => setShowEditPaymentModeModal(false)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold p-1 rounded-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleQuickPaymentModeSubmit} className="space-y-4 text-xs">
              
              {/* Room & Guest Summary Card */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-medium">Guest Name</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    {paymentModeEditRoom.guestName || 'In-House Guest'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Checked In: {paymentModeEditRoom.checkInDate} ({paymentModeEditRoom.checkInTime || '12:00 PM'})
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-medium">Current Mode</span>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1 justify-end">
                    {paymentModeEditRoom.advancePaymentMethod || 'Cash'}
                  </p>
                  <span className="text-[10px] font-mono text-slate-500">
                    Adv: ₹{paymentModeEditRoom.advancePaid || 0}
                  </span>
                </div>
              </div>

              {/* Mode of Payment Selection Grid */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 text-xs flex items-center justify-between">
                  <span>Select Correct Mode of Payment <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Selected: {quickPaymentMethod}</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'Cash', label: 'Cash', icon: '💵' },
                    { id: 'UPI', label: 'UPI / GPay', icon: '📱' },
                    { id: 'Card', label: 'Debit / Card', icon: '💳' },
                    { id: 'Bank Transfer', label: 'Bank / NEFT', icon: '🏦' },
                    { id: 'Prepaid/OTI', label: 'Prepaid / OTA', icon: '🌐' },
                    { id: 'Cheque', label: 'Cheque', icon: '📄' }
                  ].map(mode => {
                    const isSelected = quickPaymentMethod.toLowerCase() === mode.id.toLowerCase() || 
                      (mode.id === 'UPI' && quickPaymentMethod.toLowerCase().includes('upi')) ||
                      (mode.id === 'Card' && quickPaymentMethod.toLowerCase().includes('card'));
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setQuickPaymentMethod(mode.id)}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/30 text-emerald-950 dark:text-emerald-100 font-bold shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <span className="text-base">{mode.icon}</span>
                        <div>
                          <div className="text-xs leading-none">{mode.label}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Advance Amount & Receipt No */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    Advance Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={quickAdvancePaid}
                    onChange={e => setQuickAdvancePaid(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    Receipt / Entry No.
                  </label>
                  <input
                    type="text"
                    value={quickReceiptNumber}
                    onChange={e => setQuickReceiptNumber(e.target.value)}
                    placeholder="e.g. 1243"
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-xs"
                  />
                </div>
              </div>

              {/* Informative note */}
              <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/60 text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                <span>
                  Changing the mode of payment will automatically update the <strong>Day Book report</strong>, <strong>Front-Office Cash in Hand</strong>, and room folio records.
                </span>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditPaymentModeModal(false);
                    handleOpenEditCheckIn(paymentModeEditRoom);
                  }}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                >
                  Edit other stay details →
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditPaymentModeModal(false)}
                    className="px-4 py-2 border dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPaymentMode}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSubmittingPaymentMode ? 'Saving...' : 'Update Payment Mode'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          ADVANCE PAYMENT RECEIPT MODAL (STANDARDIZED SAMPLE FORMAT)
          ========================================================================= */}
      <AdvanceReceiptModal
        isOpen={showAdvanceReceiptModal}
        onClose={() => {
          setShowAdvanceReceiptModal(false);
          setReceiptModalData(null);
        }}
        data={receiptModalData}
      />

      {/* Room Cash Drawer Wallet Modal */}
      {showRoomWalletModal && (
        <CashWalletModal
          isOpen={showRoomWalletModal}
          onClose={() => setShowRoomWalletModal(false)}
          defaultDepartment="Rooms"
        />
      )}

      {/* Room Day Book Modal */}
      {showDayBookModal && (
        <DayBookModal
          isOpen={showDayBookModal}
          onClose={() => setShowDayBookModal(false)}
        />
      )}

    </div>
  );
};
