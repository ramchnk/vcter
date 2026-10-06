import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Receipt, CreditCard, Landmark, DollarSign, Printer, Mail, PhoneCall, CheckCircle, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface UnifiedBillingViewProps {
  selectedRoomNo: string;
  setSelectedRoomNo: (roomNo: string) => void;
}

export const UnifiedBillingView: React.FC<UnifiedBillingViewProps> = ({ selectedRoomNo, setSelectedRoomNo }) => {
  const { rooms, getBillSummary, checkOutRoom, settings, addAudit, orders, laundryOrders, hallBookings } = useApp();

  const [searchRoomInput, setSearchRoomInput] = useState(selectedRoomNo);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'UPI' | 'Split'>('UPI');
  
  // Split details
  const [splitCash, setSplitCash] = useState(0);
  const [splitCard, setSplitCard] = useState(0);
  const [splitUpi, setSplitUpi] = useState(0);

  // Print Invoice details
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printFormat, setPrintFormat] = useState<'a4' | 'thermal'>('a4');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [successAction, setSuccessAction] = useState('');

  const numberToWords = (num: number): string => {
    if (num === 0) return 'Zero Rupees Only';
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const inWords = (n: number): string => {
      let str = '';
      if (n > 99) {
        str += a[Math.floor(n / 100)] + 'Hundred ';
        n %= 100;
      }
      if (n > 19) {
        str += b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : ' ');
      } else if (n > 0) {
        str += a[n];
      }
      return str;
    };

    let n = Math.floor(num);
    let output = '';
    if (n >= 10000000) {
      output += inWords(Math.floor(n / 10000000)) + 'Crore ';
      n %= 10000000;
    }
    if (n >= 100000) {
      output += inWords(Math.floor(n / 100000)) + 'Lakh ';
      n %= 100000;
    }
    if (n >= 1000) {
      output += inWords(Math.floor(n / 1000)) + 'Thousand ';
      n %= 1000;
    }
    if (n > 0) {
      output += inWords(n);
    }
    return ('Rupees ' + output.trim() + ' Only');
  };

  // Sync inputs
  useEffect(() => {
    setSearchRoomInput(selectedRoomNo);
  }, [selectedRoomNo]);

  const activeOccupiedRooms = rooms.filter(r => r.status === 'Occupied');
  const matchedRoom = rooms.find(r => r.roomNumber === searchRoomInput);
  
  // Real-time bill calculations
  const summary = getBillSummary(searchRoomInput);

  const roomRentTotal = summary?.roomRentTotal || 0;
  const restaurantTotal = summary?.restaurantTotal || 0;
  const barTotal = summary?.barTotal || 0;
  const laundryTotal = summary?.laundryTotal || 0;
  const hallTotal = summary?.hallTotal || 0;
  const otherCharges = summary?.otherCharges || 0;
  
  const subtotal = roomRentTotal + restaurantTotal + barTotal + laundryTotal + hallTotal + otherCharges;
  const taxAmount = summary ? parseFloat(((subtotal * summary.taxRate) / 100).toFixed(2)) : 0;
  const grandTotal = subtotal + taxAmount;
  
  const advancePaid = summary?.advancePaid || 0;
  const outstandingAmount = Math.max(0, grandTotal - advancePaid - discount);

  const roomOrders = orders.filter(o => o.roomNumber === searchRoomInput && o.status === 'PostedToRoom');
  const roomLaundry = laundryOrders.filter(l => l.roomNumber === searchRoomInput);
  const roomHalls = hallBookings.filter(h => h.roomNumber === searchRoomInput && h.status !== 'Cancelled');

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchedRoom || !summary) return;

    let splitDetails = '';
    if (paymentMethod === 'Split') {
      splitDetails = `Cash: ₹${splitCash}, Card: ₹${splitCard}, UPI: ₹${splitUpi}`;
    }

    checkOutRoom(matchedRoom.id, {
      method: paymentMethod,
      discount,
      splitDetails: paymentMethod === 'Split' ? splitDetails : undefined
    });

    // Fun confetti effect!
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });

    setSuccessAction(`Checked out Room ${searchRoomInput} successfully! Recieved ₹${outstandingAmount.toFixed(0)}`);
    setTimeout(() => setSuccessAction(''), 4000);

    // Clear inputs
    setSelectedRoomNo('');
    setSearchRoomInput('');
    setDiscount(0);
  };

  const handlePrintTrigger = () => {
    if (!summary) return;
    if (!invoiceNumber) {
      setInvoiceNumber(`${settings.invoicePrefix || 'INV-'}${Math.floor(100000 + Math.random() * 900000)}`);
    }
    setShowPrintModal(true);
  };

  const handleSendEmail = () => {
    if (!summary) return;
    addAudit('Email Invoice', `Invoice sent to guest for Room ${searchRoomInput}`);
    setSuccessAction('Simulated: Invoice sent to customer Email successfully!');
    setTimeout(() => setSuccessAction(''), 3000);
  };

  const handleSendWhatsapp = () => {
    if (!summary) return;
    addAudit('WhatsApp Invoice', `Invoice dispatched to guest WhatsApp for Room ${searchRoomInput}`);
    setSuccessAction('Simulated: Invoice sent to customer WhatsApp successfully!');
    setTimeout(() => setSuccessAction(''), 3000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Search & Bill Calculator (Left - 7 Cols) */}
      <div className="lg:col-span-7 space-y-4">
        
        {/* Search header */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm space-y-3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Receptionist Bill Lookup (Room Check)
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input
              type="text"
              list="occupied-room-search"
              placeholder="Enter Room Number (e.g. 101, 201)..."
              value={searchRoomInput}
              onChange={e => {
                setSearchRoomInput(e.target.value);
                setSelectedRoomNo(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2.5 text-sm border dark:border-slate-800 dark:bg-slate-950 rounded-xl font-bold font-mono focus:ring-2 focus:ring-indigo-500/20"
            />
            <datalist id="occupied-room-search">
              {activeOccupiedRooms.map(r => (
                <option key={r.id} value={r.roomNumber}>{`Room ${r.roomNumber} - ${r.guestName}`}</option>
              ))}
            </datalist>
          </div>
          <p className="text-[10px] text-slate-400">
            Type any occupied room number above to aggregate charges instantly.
          </p>
        </div>

        {/* Dynamic Aggregated Bill Screen */}
        {summary ? (
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
            
            {/* Guest Summary details */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-indigo-500">
                  Consolidated Room Invoice
                </h3>
                <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {summary.guestName}
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                  Stay: {summary.checkInDate} to {summary.checkOutDate} ({summary.stayDuration} Days)
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded uppercase tracking-wider">
                  Occupied
                </span>
                <p className="text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-1.5">
                  Room {searchRoomInput}
                </p>
              </div>
            </div>

            {/* Departmental breakdown items */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Departmental Charges Ledger</h4>
              
              <div className="space-y-2 border dark:border-slate-800 p-4 rounded-xl font-mono text-xs">
                
                <div className="flex justify-between">
                  <span className="text-slate-500">Room rent total ({summary.stayDuration} Days @ ₹{matchedRoom?.price}/day)</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-250">₹{roomRentTotal}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Restaurant charges (F&B orders)</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-250">₹{restaurantTotal}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Bar charges (liquor orders)</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-250">₹{barTotal}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Laundry services (orders linked)</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-250">₹{laundryTotal}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Party Hall & booking services</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-250">₹{hallTotal}</span>
                </div>

                {otherCharges > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mini-bar / Misc services</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-250">₹{otherCharges}</span>
                  </div>
                )}

                <div className="border-t border-slate-100 dark:border-slate-800 my-2 pt-2 flex justify-between font-bold text-sm">
                  <span className="text-slate-600 dark:text-slate-355 font-sans">Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>

                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>General Taxes (GST @{summary.taxRate}%)</span>
                  <span>₹{taxAmount}</span>
                </div>

                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Advance Payments Logged</span>
                  <span className="text-emerald-500">-₹{advancePaid}</span>
                </div>

              </div>
            </div>

            {/* Detailed Itemized Customer Breakdown */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Detailed Itemized Breakdown (Customer Copy)</h4>
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/30 dark:border-slate-800/50 space-y-3 text-xs">
                
                {/* Room Rent Nights */}
                <div className="space-y-1">
                  <span className="text-[10px] text-indigo-500 font-extrabold uppercase">● Room Rent</span>
                  <div className="flex justify-between pl-3 font-mono text-[11px] text-slate-650 dark:text-slate-350">
                    <span>{summary.stayDuration} Nights @ ₹{matchedRoom?.price}/night (Room {searchRoomInput})</span>
                    <span className="font-bold">₹{roomRentTotal}</span>
                  </div>
                </div>

                {/* Restaurant Orders */}
                {roomOrders.filter(o => !o.isBar).length > 0 && (
                  <div className="space-y-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="text-[10px] text-emerald-600 font-extrabold uppercase">● Restaurant Orders</span>
                    {roomOrders.filter(o => !o.isBar).map(order => (
                      <div key={order.id} className="pl-3 space-y-0.5">
                        <div className="flex justify-between font-bold font-mono text-[10px] text-slate-500">
                          <span>Order {order.orderNumber} ({order.timestamp})</span>
                          <span>₹{order.total}</span>
                        </div>
                        <ul className="list-disc list-inside pl-2 space-y-0.5 text-slate-500 text-[10px]">
                          {order.items.map((item, idx) => (
                            <li key={idx} className="font-sans">
                              {item.name} x{item.quantity} (₹{item.price} each)
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bar Orders */}
                {roomOrders.filter(o => o.isBar).length > 0 && (
                  <div className="space-y-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="text-[10px] text-violet-500 font-extrabold uppercase">● Bar Beverage Orders</span>
                    {roomOrders.filter(o => o.isBar).map(order => (
                      <div key={order.id} className="pl-3 space-y-0.5">
                        <div className="flex justify-between font-bold font-mono text-[10px] text-slate-500">
                          <span>Order {order.orderNumber} ({order.timestamp})</span>
                          <span>₹{order.total}</span>
                        </div>
                        <ul className="list-disc list-inside pl-2 space-y-0.5 text-slate-500 text-[10px]">
                          {order.items.map((item, idx) => (
                            <li key={idx} className="font-sans">
                              {item.name} x{item.quantity} (₹{item.price} each)
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {/* Laundry Orders */}
                {roomLaundry.length > 0 && (
                  <div className="space-y-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="text-[10px] text-rose-500 font-extrabold uppercase">● Laundry Services</span>
                    {roomLaundry.map(order => (
                      <div key={order.id} className="pl-3 space-y-0.5 font-mono text-[11px] text-slate-650 dark:text-slate-350">
                        <div className="flex justify-between">
                          <span>
                            {order.orderNumber} ({order.items.map(it => `${it.itemType} x${it.quantity}`).join(', ')})
                            {order.isExpress && ' [EXPRESS]'}
                          </span>
                          <span className="font-bold">₹{order.totalPrice}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Hall Bookings */}
                {roomHalls.length > 0 && (
                  <div className="space-y-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="text-[10px] text-amber-500 font-extrabold uppercase">● Party Hall Bookings</span>
                    {roomHalls.map(booking => (
                      <div key={booking.id} className="pl-3 space-y-1 text-slate-500">
                        <div className="flex justify-between font-bold font-mono text-[10px]">
                          <span>{booking.bookingNumber} - {booking.hallType} ({booking.date})</span>
                          <span>₹{booking.totalPrice}</span>
                        </div>
                        <div className="pl-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] font-sans">
                          <div>Base Hall Rent: <span className="font-mono">₹{booking.hallRent}</span></div>
                          {booking.foodPrice > 0 && <div>Catering Package: <span className="font-mono">₹{booking.foodPrice}</span></div>}
                          {booking.decorationPrice > 0 && <div>Decorations: <span className="font-mono">₹{booking.decorationPrice}</span></div>}
                          {booking.soundSystemPrice > 0 && <div>Sound/DJ: <span className="font-mono">₹{booking.soundSystemPrice}</span></div>}
                          {booking.projectorPrice > 0 && <div>Projector: <span className="font-mono">₹{booking.projectorPrice}</span></div>}
                          {booking.cleaningCharge > 0 && <div>Cleaning: <span className="font-mono">₹{booking.cleaningCharge}</span></div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </div>

            {/* Quick Actions Panel: PDF / WhatsApp */}
            <div className="flex flex-wrap gap-2 border-t pt-4 border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handlePrintTrigger}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold"
              >
                <Printer className="w-4 h-4" /> Print Invoice
              </button>
              
              <button
                type="button"
                onClick={handleSendEmail}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold"
              >
                <Mail className="w-4 h-4" /> Email Invoice
              </button>

              <button
                type="button"
                onClick={handleSendWhatsapp}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold"
              >
                <PhoneCall className="w-4 h-4 text-emerald-500" /> WhatsApp
              </button>
            </div>

          </div>
        ) : (
          <div className="p-12 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm text-center text-slate-400 opacity-60">
            <span className="text-4xl">🔑</span>
            <h4 className="text-xs font-bold uppercase tracking-wider mt-3">No Room Selected</h4>
            <p className="text-[10px] text-slate-500 mt-1 max-w-sm mx-auto">
              Please enter an active occupied room number in the search bar above to generate a unified bill.
            </p>
          </div>
        )}

      </div>

      {/* Checkout Payment Form (Right - 5 Cols) */}
      {summary && (
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm p-5 space-y-4 h-fit">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b pb-2 border-slate-100 dark:border-slate-800">
            Process Outstanding Settlement
          </h3>

          <form onSubmit={handleCheckoutSubmit} className="space-y-4 text-xs">
            
            {/* Input Discount */}
            <div className="space-y-1">
              <label className="font-bold text-slate-500">Apply Cashier Discount (₹)</label>
              <input
                type="number"
                min={0}
                max={outstandingAmount + discount} // limit discount to outstanding total
                value={discount}
                onChange={e => setDiscount(Number(e.target.value))}
                className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg font-bold font-mono text-indigo-500"
              />
            </div>

            {/* Selector Payment Mode */}
            <div className="space-y-2">
              <label className="font-bold text-slate-500 block">Payment Mode</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'UPI', label: 'UPI QR Pay', icon: Landmark },
                  { id: 'Cash', label: 'Cash Drawer', icon: DollarSign },
                  { id: 'Card', label: 'POS Card Swiper', icon: CreditCard },
                  { id: 'Split', label: 'Split Payment', icon: Receipt }
                ].map(mode => {
                  const Icon = mode.icon;
                  const isActive = paymentMethod === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setPaymentMethod(mode.id as any)}
                      className={`p-3 rounded-xl border flex items-center gap-2 font-bold text-left transition-all ${
                        isActive 
                          ? 'border-indigo-600 bg-indigo-50/20 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400' 
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Split Details Input */}
            {paymentMethod === 'Split' && (
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border dark:border-slate-800 space-y-2 animate-in fade-in duration-200">
                <p className="font-semibold text-slate-500 text-[10px] uppercase">Split Details Breakdowns</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-0.5">
                    <label className="text-[10px] text-slate-400">Cash Amt</label>
                    <input
                      type="number"
                      value={splitCash}
                      onChange={e => setSplitCash(Number(e.target.value))}
                      className="w-full p-1.5 border dark:border-slate-800 dark:bg-slate-900 rounded font-mono"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] text-slate-400">Card Amt</label>
                    <input
                      type="number"
                      value={splitCard}
                      onChange={e => setSplitCard(Number(e.target.value))}
                      className="w-full p-1.5 border dark:border-slate-800 dark:bg-slate-900 rounded font-mono"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] text-slate-400">UPI Amt</label>
                    <input
                      type="number"
                      value={splitUpi}
                      onChange={e => setSplitUpi(Number(e.target.value))}
                      className="w-full p-1.5 border dark:border-slate-800 dark:bg-slate-900 rounded font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-between text-[10px] font-bold font-mono pt-1 text-indigo-500">
                  <span>Split Sum Total:</span>
                  <span>₹{splitCash + splitCard + splitUpi}</span>
                </div>
              </div>
            )}

            {/* Outstanding Summary banner */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded-xl text-center space-y-1 relative overflow-hidden">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Outstanding Settlement</span>
              <span className="text-3xl font-black font-mono text-rose-600 dark:text-rose-400">
                ₹{outstandingAmount.toLocaleString()}
              </span>
              <p className="text-[9px] text-slate-400 italic">Net charges minus advance deposits and discounts.</p>
            </div>

            {successAction && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 rounded-xl text-xs font-semibold flex items-center gap-1.5 animate-in slide-in-from-top-1">
                <CheckCircle className="w-4 h-4 text-emerald-500" /> {successAction}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all text-xs"
            >
              Confirm Checkout & Release Room
            </button>

          </form>
        </div>
      )}

      {/* ==========================================
          INVOICE PRINT DIALOG (A4 & THERMAL ENGINE)
          ========================================== */}
      {showPrintModal && summary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-4xl space-y-4 my-auto">
            
            {/* Top Control Bar (Hidden during printing) */}
            <div className="no-print bg-slate-900/90 text-white p-3 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 border border-slate-700/60 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-600 rounded-lg">
                  <Printer className="w-4 h-4 text-white" />
                </span>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">Invoice Print Preview</h4>
                  <p className="text-[10px] text-slate-400">Standard A4 Tax Invoice & Guest Folio</p>
                </div>
              </div>

              {/* Format Toggle & Action Buttons */}
              <div className="flex items-center gap-2">
                <div className="bg-slate-800 p-0.5 rounded-lg border border-slate-700 flex text-xs">
                  <button
                    type="button"
                    onClick={() => setPrintFormat('a4')}
                    className={`px-3 py-1 rounded-md font-bold text-[11px] transition-all ${
                      printFormat === 'a4' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    📄 Standard A4 Size
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintFormat('thermal')}
                    className={`px-3 py-1 rounded-md font-bold text-[11px] transition-all ${
                      printFormat === 'thermal' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🧾 80mm Thermal Slip
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / Save as PDF
                </button>

                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs border border-slate-700 transition-all"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* =========================================================================
                A4 SIZE TAX INVOICE SHEET (Standard 210mm x 297mm)
                ========================================================================= */}
            {printFormat === 'a4' ? (
              <div 
                id="printable-invoice-a4" 
                className="bg-white text-slate-900 w-full max-w-[210mm] mx-auto p-8 sm:p-10 rounded-xl shadow-2xl border border-slate-200 space-y-6 font-sans text-xs leading-normal"
              >
                {/* 1. Header: Property Info & Tax Invoice Title */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
                  <div className="space-y-1 max-w-[60%]">
                    <h1 className="text-xl font-black tracking-tight text-slate-950 uppercase">
                      {settings.name || 'HotelVista Luxury Suites & Resorts'}
                    </h1>
                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                      {settings.address || 'Beach Road, Hospitality Enclave, Coastal Zone'}
                    </p>
                    <div className="flex flex-wrap gap-x-4 text-[10px] text-slate-500 font-medium pt-1">
                      <span><strong>Phone:</strong> {settings.phone || '+91 98765 43210'}</span>
                      <span><strong>Email:</strong> {settings.email || 'billing@hotelvista.com'}</span>
                    </div>
                    <div className="text-[10px] text-slate-800 font-mono font-bold pt-0.5">
                      GSTIN: {settings.gstNumber || '29AAAAA0000A1Z5'} • State Code: 29
                    </div>
                  </div>

                  {/* Invoice Meta Box */}
                  <div className="text-right space-y-1">
                    <div className="bg-slate-950 text-white px-3 py-1 rounded inline-block text-xs font-black uppercase tracking-wider">
                      TAX INVOICE / GUEST FOLIO
                    </div>
                    <p className="font-mono font-bold text-sm text-slate-900 pt-1">
                      Invoice No: {invoiceNumber || `${settings.invoicePrefix || 'INV-'}984210`}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Date of Issue: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      SAC Code: 996311 (Hotel) / 996331 (F&B)
                    </p>
                  </div>
                </div>

                {/* 2. Guest Info & Stay Summary Cards (2 Columns) */}
                <div className="grid grid-cols-2 gap-4 border border-slate-300 rounded-lg p-3.5 bg-slate-50/60 text-xs">
                  {/* Left: Guest Details */}
                  <div className="space-y-1 pr-2 border-r border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Billed To (Guest Details)</p>
                    <p className="text-sm font-bold text-slate-950">{summary.guestName}</p>
                    <p className="text-slate-600 font-mono text-[11px]">Phone: {matchedRoom?.guestPhone || 'Not provided'}</p>
                    {matchedRoom?.guestEmail && <p className="text-slate-600 text-[10px]">Email: {matchedRoom.guestEmail}</p>}
                    {matchedRoom?.guestAddress && <p className="text-slate-600 text-[10px]">Address: {matchedRoom.guestAddress}</p>}
                    {matchedRoom?.guestIdProof && (
                      <p className="text-[10px] text-slate-500 font-mono">ID Proof: {matchedRoom.guestIdProof}</p>
                    )}
                    {matchedRoom?.gstNumber && (
                      <p className="text-[10px] font-bold text-indigo-700 font-mono">Corporate GSTIN: {matchedRoom.gstNumber}</p>
                    )}
                  </div>

                  {/* Right: Stay Details */}
                  <div className="space-y-1 pl-2 font-mono text-[11px]">
                    <p className="text-[10px] font-bold text-slate-400 font-sans uppercase tracking-wider">Stay & Room Details</p>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Room Number:</span>
                      <strong className="text-slate-900 text-xs font-sans">Room {searchRoomInput} ({matchedRoom?.category})</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Check-In:</span>
                      <span className="font-semibold text-slate-800">{summary.checkInDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Check-Out:</span>
                      <span className="font-semibold text-slate-800">{summary.checkOutDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Duration:</span>
                      <span className="font-bold text-indigo-700">{summary.stayDuration} Night(s)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payment Mode:</span>
                      <span className="font-bold uppercase text-slate-900 font-sans">{paymentMethod}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Itemized Departmental Charges Table */}
                <div className="space-y-2">
                  <table className="w-full border-collapse border border-slate-300 text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                        <th className="p-2 text-center w-10 border-r border-slate-300">#</th>
                        <th className="p-2 text-left border-r border-slate-300">Description & Department</th>
                        <th className="p-2 text-center w-20 border-r border-slate-300">SAC/HSN</th>
                        <th className="p-2 text-center w-16 border-r border-slate-300">Qty/Nights</th>
                        <th className="p-2 text-right w-24 border-r border-slate-300 font-mono">Rate (₹)</th>
                        <th className="p-2 text-right w-28 font-mono">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      
                      {/* Row 1: Room Rent */}
                      <tr>
                        <td className="p-2 text-center text-slate-400 border-r border-slate-200">1</td>
                        <td className="p-2 border-r border-slate-200">
                          <p className="font-bold text-slate-900">Room Accommodation Charges</p>
                          <p className="text-[10px] text-slate-500">Room {searchRoomInput} ({matchedRoom?.category}) • {summary.stayDuration} Night Stay</p>
                        </td>
                        <td className="p-2 text-center font-mono text-slate-500 border-r border-slate-200">996311</td>
                        <td className="p-2 text-center font-mono border-r border-slate-200">{summary.stayDuration}</td>
                        <td className="p-2 text-right font-mono border-r border-slate-200">₹{(matchedRoom?.price || 0).toLocaleString()}</td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900">₹{roomRentTotal.toLocaleString()}</td>
                      </tr>

                      {/* Row 2: Restaurant Orders */}
                      {roomOrders.filter(o => !o.isBar).length > 0 && (
                        <tr>
                          <td className="p-2 text-center text-slate-400 border-r border-slate-200">2</td>
                          <td className="p-2 border-r border-slate-200">
                            <p className="font-bold text-slate-900">Restaurant & In-Room Dining (F&B)</p>
                            <div className="text-[10px] text-slate-500 space-y-0.5 pt-0.5">
                              {roomOrders.filter(o => !o.isBar).map(o => (
                                <div key={o.id}>
                                  <span>{o.orderNumber}: </span>
                                  <span>{o.items.map(it => `${it.name} (${it.quantity})`).join(', ')}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="p-2 text-center font-mono text-slate-500 border-r border-slate-200">996331</td>
                          <td className="p-2 text-center font-mono border-r border-slate-200">
                            {roomOrders.filter(o => !o.isBar).reduce((sum, o) => sum + o.items.reduce((s, it) => s + it.quantity, 0), 0)}
                          </td>
                          <td className="p-2 text-right font-mono border-r border-slate-200 text-slate-400">—</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">₹{restaurantTotal.toLocaleString()}</td>
                        </tr>
                      )}

                      {/* Row 3: Bar Orders */}
                      {roomOrders.filter(o => o.isBar).length > 0 && (
                        <tr>
                          <td className="p-2 text-center text-slate-400 border-r border-slate-200">3</td>
                          <td className="p-2 border-r border-slate-200">
                            <p className="font-bold text-slate-900">Bar & Lounge Beverage Orders</p>
                            <div className="text-[10px] text-slate-500 space-y-0.5 pt-0.5">
                              {roomOrders.filter(o => o.isBar).map(o => (
                                <div key={o.id}>
                                  <span>{o.orderNumber}: </span>
                                  <span>{o.items.map(it => `${it.name} (${it.quantity})`).join(', ')}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="p-2 text-center font-mono text-slate-500 border-r border-slate-200">996331</td>
                          <td className="p-2 text-center font-mono border-r border-slate-200">
                            {roomOrders.filter(o => o.isBar).reduce((sum, o) => sum + o.items.reduce((s, it) => s + it.quantity, 0), 0)}
                          </td>
                          <td className="p-2 text-right font-mono border-r border-slate-200 text-slate-400">—</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">₹{barTotal.toLocaleString()}</td>
                        </tr>
                      )}

                      {/* Row 4: Laundry Orders */}
                      {roomLaundry.length > 0 && (
                        <tr>
                          <td className="p-2 text-center text-slate-400 border-r border-slate-200">4</td>
                          <td className="p-2 border-r border-slate-200">
                            <p className="font-bold text-slate-900">Laundry & Dry Cleaning Services</p>
                            <p className="text-[10px] text-slate-500">
                              {roomLaundry.map(l => `${l.orderNumber} (${l.items.map(it => `${it.itemType} x${it.quantity}`).join(', ')})`).join(' • ')}
                            </p>
                          </td>
                          <td className="p-2 text-center font-mono text-slate-500 border-r border-slate-200">999799</td>
                          <td className="p-2 text-center font-mono border-r border-slate-200">{roomLaundry.length}</td>
                          <td className="p-2 text-right font-mono border-r border-slate-200 text-slate-400">—</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">₹{laundryTotal.toLocaleString()}</td>
                        </tr>
                      )}

                      {/* Row 5: Hall Bookings */}
                      {roomHalls.length > 0 && (
                        <tr>
                          <td className="p-2 text-center text-slate-400 border-r border-slate-200">5</td>
                          <td className="p-2 border-r border-slate-200">
                            <p className="font-bold text-slate-900">Banquet & Party Hall Bookings</p>
                            <p className="text-[10px] text-slate-500">
                              {roomHalls.map(h => `${h.bookingNumber} (${h.hallType} on ${h.date})`).join(' • ')}
                            </p>
                          </td>
                          <td className="p-2 text-center font-mono text-slate-500 border-r border-slate-200">997212</td>
                          <td className="p-2 text-center font-mono border-r border-slate-200">{roomHalls.length}</td>
                          <td className="p-2 text-right font-mono border-r border-slate-200 text-slate-400">—</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">₹{hallTotal.toLocaleString()}</td>
                        </tr>
                      )}

                      {/* Row 6: Misc / Mini-bar if any */}
                      {otherCharges > 0 && (
                        <tr>
                          <td className="p-2 text-center text-slate-400 border-r border-slate-200">6</td>
                          <td className="p-2 border-r border-slate-200">
                            <p className="font-bold text-slate-900">Mini-Bar / Miscellaneous Services</p>
                          </td>
                          <td className="p-2 text-center font-mono text-slate-500 border-r border-slate-200">999799</td>
                          <td className="p-2 text-center font-mono border-r border-slate-200">1</td>
                          <td className="p-2 text-right font-mono border-r border-slate-200">₹{otherCharges}</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">₹{otherCharges}</td>
                        </tr>
                      )}

                    </tbody>
                  </table>
                </div>

                {/* 4. Financial Calculations & Bank / Tax Breakdown Grid */}
                <div className="grid grid-cols-12 gap-6 pt-2">
                  
                  {/* Left Column (7 Cols): Amount in Words, Bank Info, Terms */}
                  <div className="col-span-7 space-y-3">
                    
                    {/* Amount in words */}
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Settlement in Words:</p>
                      <p className="font-bold text-slate-900 text-xs italic mt-0.5">
                        {numberToWords(Math.round(outstandingAmount))}
                      </p>
                    </div>

                    {/* Payment Mode & Settlement Stamp */}
                    <div className="flex items-center gap-3 p-2.5 border border-emerald-300 bg-emerald-50/50 rounded-lg">
                      <div className="p-1 bg-emerald-500 text-white rounded font-bold text-[10px]">
                        ✓ SETTLED
                      </div>
                      <div className="text-[11px] font-mono">
                        <span>Payment Method: <strong>{paymentMethod}</strong></span>
                        {paymentMethod === 'Split' && (
                          <p className="text-[10px] text-slate-500">Cash: ₹{splitCash}, Card: ₹{splitCard}, UPI: ₹{splitUpi}</p>
                        )}
                      </div>
                    </div>

                    {/* Terms & Conditions */}
                    <div className="text-[9px] text-slate-500 space-y-0.5">
                      <p className="font-bold text-slate-700 uppercase">Terms & Conditions:</p>
                      <p>1. Check-out time is 11:00 AM. Late check-out is subject to room availability and extra charges.</p>
                      <p>2. Goods once sold or services rendered will not be refunded.</p>
                      <p>3. This invoice is computer generated and valid for all GST input tax credit purposes.</p>
                    </div>
                  </div>

                  {/* Right Column (5 Cols): Math Breakdown & Tax Ledger */}
                  <div className="col-span-5 border border-slate-300 rounded-lg p-3 bg-slate-50/40 space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal (Taxable Value):</span>
                      <span className="font-bold text-slate-900">₹{subtotal.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>CGST @ {(summary.taxRate / 2).toFixed(1)}%:</span>
                      <span>₹{(taxAmount / 2).toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>SGST @ {(summary.taxRate / 2).toFixed(1)}%:</span>
                      <span>₹{(taxAmount / 2).toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-slate-600 border-t border-slate-200 pt-1">
                      <span>Gross Amount:</span>
                      <span className="font-bold">₹{grandTotal.toLocaleString()}</span>
                    </div>

                    {advancePaid > 0 && (
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>Less Advance Paid:</span>
                        <span>-₹{advancePaid.toLocaleString()}</span>
                      </div>
                    )}

                    {discount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>Less Discount:</span>
                        <span>-₹{discount.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="border-t-2 border-slate-900 my-1 pt-1.5 flex justify-between items-center text-sm font-black text-slate-950">
                      <span className="font-sans">NET PAYABLE:</span>
                      <span className="text-base text-indigo-900">₹{outstandingAmount.toLocaleString()}</span>
                    </div>
                  </div>

                </div>

                {/* 5. Signatures Block */}
                <div className="pt-8 grid grid-cols-2 gap-12 text-center text-xs">
                  <div className="border-t border-slate-400 pt-1.5">
                    <p className="font-bold text-slate-800">Guest Signature</p>
                    <p className="text-[10px] text-slate-400">Acknowledged receipt of services</p>
                  </div>
                  <div className="border-t border-slate-400 pt-1.5">
                    <p className="font-bold text-slate-800">Authorized Signatory</p>
                    <p className="text-[10px] text-slate-400">For {settings.name || 'HotelVista'}</p>
                  </div>
                </div>

                {/* Footer Greeting */}
                <div className="text-center text-[10px] text-slate-400 italic pt-2 border-t border-slate-200">
                  Thank you for staying with us! We look forward to welcoming you back soon.
                </div>

              </div>
            ) : (
              /* =========================================================================
                  80MM THERMAL SLIP VIEW (For POS Printers)
                  ========================================================================= */
              <div 
                id="printable-invoice-a4" 
                className="bg-white text-slate-900 w-full max-w-sm mx-auto rounded-lg shadow-2xl p-5 border border-slate-200 space-y-4 receipt-print font-mono text-xs"
              >
                <div className="text-center border-b border-dashed border-slate-400 pb-3 space-y-0.5">
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">{settings.name}</h3>
                  <p className="text-[9px] text-slate-500">{settings.address}</p>
                  <p className="text-[9px] text-slate-500">Phone: {settings.phone}</p>
                  <p className="text-[9px] text-slate-500 font-bold">GSTIN: {settings.gstNumber}</p>
                  <p className="text-[10px] font-bold mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded">
                    Invoice: {invoiceNumber || `${settings.invoicePrefix}984210`}
                  </p>
                </div>

                <div className="text-[9px] space-y-0.5 border-b border-dashed border-slate-400 pb-2">
                  <div className="flex justify-between"><span>Guest:</span><strong className="font-bold">{summary.guestName}</strong></div>
                  <div className="flex justify-between"><span>Room:</span><strong>Room {searchRoomInput} ({matchedRoom?.category})</strong></div>
                  <div className="flex justify-between"><span>Stay:</span><span>{summary.checkInDate} to {summary.checkOutDate} ({summary.stayDuration}N)</span></div>
                </div>

                <div className="border-b border-dashed border-slate-400 py-2 text-[9px] space-y-1.5">
                  <div className="flex justify-between">
                    <span>ROOM RENT ({summary.stayDuration}N @ ₹{matchedRoom?.price})</span>
                    <span className="font-bold">₹{roomRentTotal}</span>
                  </div>
                  {restaurantTotal > 0 && (
                    <div className="flex justify-between"><span>RESTAURANT (F&B)</span><span className="font-bold">₹{restaurantTotal}</span></div>
                  )}
                  {barTotal > 0 && (
                    <div className="flex justify-between"><span>BAR BEVERAGES</span><span className="font-bold">₹{barTotal}</span></div>
                  )}
                  {laundryTotal > 0 && (
                    <div className="flex justify-between"><span>LAUNDRY</span><span className="font-bold">₹{laundryTotal}</span></div>
                  )}
                  {hallTotal > 0 && (
                    <div className="flex justify-between"><span>HALL / BANQUET</span><span className="font-bold">₹{hallTotal}</span></div>
                  )}
                </div>

                <div className="text-[9px] space-y-1">
                  <div className="flex justify-between"><span>SUBTOTAL</span><span>₹{subtotal}</span></div>
                  <div className="flex justify-between text-slate-500"><span>GST Tax ({summary.taxRate}%)</span><span>₹{taxAmount}</span></div>
                  {advancePaid > 0 && <div className="flex justify-between text-emerald-600"><span>Pre-Paid Advance</span><span>-₹{advancePaid}</span></div>}
                  {discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-₹{discount}</span></div>}
                  <div className="flex justify-between font-extrabold text-sm border-t border-dashed border-slate-400 pt-1 text-slate-950">
                    <span>TOTAL SETTLED</span>
                    <span>₹{outstandingAmount}</span>
                  </div>
                </div>

                <div className="text-center text-[9px] text-slate-500 italic border-t border-slate-200 pt-2">
                  Thank you for visiting!
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
