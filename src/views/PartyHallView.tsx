import React, { useState } from 'react';
import { useApp, HallBooking, Room } from '../context/AppContext';
import { Calendar, Plus, Sparkles, AlertCircle, XCircle } from 'lucide-react';

export const PartyHallView: React.FC = () => {
  const { hallBookings, rooms, addHallBooking, cancelHallBooking } = useApp();

  const [hallType, setHallType] = useState<'Meeting Room' | 'Conference Hall' | 'Banquet Hall' | 'Marriage Hall'>('Banquet Hall');
  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState<'Morning' | 'Evening' | 'Full Day'>('Evening');
  
  // Pricing/Features
  const [foodPackage, setFoodPackage] = useState('Standard Buffet');
  const [foodPrice, setFoodPrice] = useState(0);
  const [decorationPrice, setDecorationPrice] = useState(0);
  const [soundSystemPrice, setSoundSystemPrice] = useState(0);
  const [projectorPrice, setProjectorPrice] = useState(0);
  const [cleaningCharge, setCleaningCharge] = useState(500);
  const [advancePaid, setAdvancePaid] = useState(0);

  // Link Option
  const [linkToRoom, setLinkToRoom] = useState(false);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState('');

  // Calendar toggle view filters
  const [calendarFilter, setCalendarFilter] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  const hallBaseRents = {
    'Meeting Room': 1500,
    'Conference Hall': 3000,
    'Banquet Hall': 7000,
    'Marriage Hall': 20000
  };

  const occupiedRooms = rooms.filter(r => r.status === 'Occupied');
  const activeGuestName = rooms.find(r => r.roomNumber === selectedRoomNumber)?.guestName || '';

  // Auto pre-fill guest name if link to room is selected
  const handleRoomSelectChange = (roomNo: string) => {
    setSelectedRoomNumber(roomNo);
    const matchedRoom = rooms.find(r => r.roomNumber === roomNo);
    if (matchedRoom && matchedRoom.guestName) {
      setGuestName(matchedRoom.guestName);
      setPhone(matchedRoom.guestPhone || '');
    }
  };

  // Calculations
  const hallRent = hallBaseRents[hallType];
  const totalPrice = hallRent + foodPrice + decorationPrice + soundSystemPrice + projectorPrice + cleaningCharge;
  const balanceOutstanding = Math.max(0, totalPrice - advancePaid);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !phone || !date) return;

    addHallBooking({
      hallType,
      guestName,
      phone,
      date,
      timeSlot,
      advancePaid: Number(advancePaid),
      foodPackage,
      foodPrice: Number(foodPrice),
      decorationPrice: Number(decorationPrice),
      soundSystemPrice: Number(soundSystemPrice),
      projectorPrice: Number(projectorPrice),
      cleaningCharge: Number(cleaningCharge),
      hallRent,
      roomNumber: linkToRoom && selectedRoomNumber ? selectedRoomNumber : undefined
    });

    // Reset Form
    setGuestName('');
    setPhone('');
    setDate('');
    setAdvancePaid(0);
    setFoodPrice(0);
    setDecorationPrice(0);
    setSoundSystemPrice(0);
    setProjectorPrice(0);
    setCleaningCharge(500);
    setLinkToRoom(false);
    setSelectedRoomNumber('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* 1. Hall Booking Form */}
      <div className="lg:col-span-1 p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b pb-2 border-slate-100 dark:border-slate-800">
          <Calendar className="w-5 h-5 text-indigo-500" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Book Party Hall / Services
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          
          {/* Hall Type Select */}
          <div className="space-y-1">
            <label className="font-bold text-slate-500">Hall Category *</label>
            <select
              value={hallType}
              onChange={e => setHallType(e.target.value as any)}
              className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg font-bold"
            >
              <option value="Meeting Room">Meeting Room (Base: ₹1,500)</option>
              <option value="Conference Hall">Conference Hall (Base: ₹3,000)</option>
              <option value="Banquet Hall">Banquet Hall (Base: ₹7,000)</option>
              <option value="Marriage Hall">Marriage Hall (Base: ₹20,000)</option>
            </select>
          </div>

          {/* Room Link Toggle */}
          <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950/60 border dark:border-slate-800 rounded-xl">
            <span className="font-semibold text-slate-700 dark:text-slate-350">Link Charges to Room Bill?</span>
            <input
              type="checkbox"
              checked={linkToRoom}
              onChange={e => {
                setLinkToRoom(e.target.checked);
                if (!e.target.checked) {
                  setSelectedRoomNumber('');
                }
              }}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          {linkToRoom && (
            <div className="space-y-1 animate-in fade-in duration-200">
              <label className="font-bold text-slate-500">Choose Occupied Room *</label>
              <select
                required
                value={selectedRoomNumber}
                onChange={e => handleRoomSelectChange(e.target.value)}
                className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg font-bold"
              >
                <option value="">-- Room Number --</option>
                {occupiedRooms.map(r => (
                  <option key={r.id} value={r.roomNumber}>Room {r.roomNumber} ({r.guestName})</option>
                ))}
              </select>
            </div>
          )}

          {/* Client Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-500">Guest Name *</label>
              <input
                type="text"
                required
                disabled={linkToRoom && selectedRoomNumber !== ''}
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg disabled:bg-slate-50 dark:disabled:bg-slate-900/50 text-slate-700"
                placeholder="Client Name"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-500">Phone *</label>
              <input
                type="tel"
                required
                disabled={linkToRoom && selectedRoomNumber !== ''}
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg disabled:bg-slate-50 dark:disabled:bg-slate-900/50 text-slate-700"
                placeholder="Phone Number"
              />
            </div>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-500">Booking Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg font-mono font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-500">Time Slot *</label>
              <select
                value={timeSlot}
                onChange={e => setTimeSlot(e.target.value as any)}
                className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg font-semibold"
              >
                <option value="Morning">Morning (8AM - 2PM)</option>
                <option value="Evening">Evening (4PM - 11PM)</option>
                <option value="Full Day">Full Day Slot</option>
              </select>
            </div>
          </div>

          {/* Event Customizations */}
          <div className="space-y-2 border-t pt-2 border-slate-100 dark:border-slate-800/80">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Service Packages & Custom Prices</label>
            
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="space-y-0.5">
                <label className="font-semibold text-slate-500">Food Menu</label>
                <input
                  type="text"
                  value={foodPackage}
                  onChange={e => setFoodPackage(e.target.value)}
                  className="w-full p-1.5 border dark:border-slate-800 dark:bg-slate-950 rounded-lg"
                  placeholder="Buffet Details"
                />
              </div>
              <div className="space-y-0.5">
                <label className="font-semibold text-slate-500">Food Cost (₹)</label>
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={foodPrice}
                  onChange={e => setFoodPrice(e.target.value === '' ? 0 : Number(e.target.value))}
                  className="w-full p-1.5 border dark:border-slate-800 dark:bg-slate-950 rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="space-y-0.5">
                <label className="font-semibold text-slate-500">Decoration Cost (₹)</label>
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={decorationPrice}
                  onChange={e => setDecorationPrice(e.target.value === '' ? 0 : Number(e.target.value))}
                  className="w-full p-1.5 border dark:border-slate-800 dark:bg-slate-950 rounded-lg font-mono"
                />
              </div>
              <div className="space-y-0.5">
                <label className="font-semibold text-slate-500">Sound System Cost (₹)</label>
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={soundSystemPrice}
                  onChange={e => setSoundSystemPrice(e.target.value === '' ? 0 : Number(e.target.value))}
                  className="w-full p-1.5 border dark:border-slate-800 dark:bg-slate-950 rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="space-y-0.5">
                <label className="font-semibold text-slate-500">Projector Price (₹)</label>
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={projectorPrice}
                  onChange={e => setProjectorPrice(e.target.value === '' ? 0 : Number(e.target.value))}
                  className="w-full p-1.5 border dark:border-slate-800 dark:bg-slate-950 rounded-lg font-mono"
                />
              </div>
              <div className="space-y-0.5">
                <label className="font-semibold text-slate-500">Cleaning Charges (₹)</label>
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={cleaningCharge}
                  onChange={e => setCleaningCharge(e.target.value === '' ? 0 : Number(e.target.value))}
                  className="w-full p-1.5 border dark:border-slate-800 dark:bg-slate-950 rounded-lg font-mono"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-500">Advance Paid (₹)</label>
            <input
              type="number"
              step="any"
              min={0}
              value={advancePaid}
              onChange={e => setAdvancePaid(e.target.value === '' ? 0 : Number(e.target.value))}
              className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg font-bold font-mono"
            />
          </div>

          {/* Pricing summary */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border dark:border-slate-800 space-y-1 font-mono text-[11px]">
            <div className="flex justify-between">
              <span>Hall Rental (Base):</span>
              <span>₹{hallRent}</span>
            </div>
            <div className="flex justify-between">
              <span>Extra Add-ons:</span>
              <span>₹{foodPrice + decorationPrice + soundSystemPrice + projectorPrice + cleaningCharge}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-1 mt-1">
              <span className="font-sans">Grand Total:</span>
              <span className="text-indigo-600 dark:text-indigo-400">₹{totalPrice}</span>
            </div>
            <div className="flex justify-between text-slate-400 text-[10px]">
              <span>Advance Paid:</span>
              <span>-₹{advancePaid}</span>
            </div>
            <div className="flex justify-between font-extrabold text-xs text-rose-500 border-t border-dashed pt-1 mt-1">
              <span className="font-sans">Pending Balance:</span>
              <span>₹{balanceOutstanding}</span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors"
          >
            Confirm Booking
          </button>

        </form>
      </div>

      {/* 2. Hall Bookings Calendar View (List of Schedules) */}
      <div className="lg:col-span-2 p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm space-y-4">
        
        {/* Calendar controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-2 border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Hall Calendar View
          </h3>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold">
            <button
              onClick={() => setCalendarFilter('daily')}
              className={`px-3 py-1 rounded ${calendarFilter === 'daily' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow' : 'text-slate-400'}`}
            >
              Daily
            </button>
            <button
              onClick={() => setCalendarFilter('weekly')}
              className={`px-3 py-1 rounded ${calendarFilter === 'weekly' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow' : 'text-slate-400'}`}
            >
              Weekly
            </button>
            <button
              onClick={() => setCalendarFilter('monthly')}
              className={`px-3 py-1 rounded ${calendarFilter === 'monthly' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow' : 'text-slate-400'}`}
            >
              Monthly
            </button>
          </div>
        </div>

        {/* Dynamic Booking timeline list */}
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {hallBookings
            .filter(booking => {
              if (calendarFilter === 'daily') {
                const todayStr = new Date().toISOString().split('T')[0];
                return booking.date === todayStr;
              }
              // simplistic filter weekly/monthly show all active bookings sorted by date
              return booking.status !== 'Cancelled';
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(booking => (
              <div 
                key={booking.id}
                className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-850 rounded-2xl flex items-center justify-between gap-4 group"
              >
                <div className="space-y-2 flex-1">
                  
                  {/* Category & Status */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 rounded">
                      {booking.hallType}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {booking.timeSlot}
                    </span>
                  </div>

                  {/* Customer / Detail */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                      {booking.guestName}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Phone: {booking.phone} {booking.roomNumber && `● Linked to Room ${booking.roomNumber}`}
                    </p>
                  </div>

                  {/* Add-ons badges */}
                  <div className="flex flex-wrap gap-1 text-[9px] text-slate-400">
                    {booking.foodPrice > 0 && <span className="bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">Catering</span>}
                    {booking.decorationPrice > 0 && <span className="bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">Decorations</span>}
                    {booking.soundSystemPrice > 0 && <span className="bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">Sound/DJ</span>}
                  </div>

                </div>

                {/* Date & Cost side */}
                <div className="text-right space-y-2.5 min-w-[100px]">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Event Date</span>
                    <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400">{booking.date}</span>
                  </div>
                  
                  <div>
                    <span className="text-[10px] text-slate-400 block leading-none">Total Rent</span>
                    <span className="text-xs font-extrabold font-mono text-slate-800 dark:text-slate-200">
                      ₹{booking.totalPrice}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => cancelHallBooking(booking.id)}
                      className="px-2 py-0.5 text-[9px] bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 rounded font-semibold flex items-center gap-0.5"
                    >
                      <XCircle className="w-3 h-3" /> Cancel Booking
                    </button>
                  </div>

                </div>
              </div>
            ))}
          
          {hallBookings.length === 0 && (
            <div className="text-center py-12 text-xs text-slate-400 font-medium">
              No hall bookings scheduled.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
