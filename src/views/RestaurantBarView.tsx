import React, { useState, useMemo } from 'react';
import { useApp, MenuItem, OrderItem, Order } from '../context/AppContext';
import { 
  ShoppingBag, 
  UtensilsCrossed, 
  Wine, 
  Search, 
  Plus, 
  Minus, 
  Printer, 
  X, 
  Check, 
  CheckSquare,
  Sparkles,
  History,
  Receipt,
  FileText,
  Clock,
  User,
  Bed,
  DollarSign,
  BookOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const RestaurantBarView: React.FC = () => {
  const { menuItems, rooms, addRestaurantBarOrder, settings, orders } = useApp();
  
  // View mode: 'pos' or 'history'
  const [activeViewTab, setActiveViewTab] = useState<'pos' | 'history'>('pos');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Cart state
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [orderType, setOrderType] = useState<'WalkIn' | 'Room'>('Room');
  const [selectedRoomNumber, setSelectedRoomNumber] = useState('');
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');

  // Modals & Selected Order
  const [showKotModal, setShowKotModal] = useState(false);
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<Order | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Mode: Restaurant vs Bar
  const [isBarMode, setIsBarMode] = useState(false);

  // History search & filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilterType, setHistoryFilterType] = useState<'all' | 'Room' | 'WalkIn'>('all');

  const [posDietaryFilter, setPosDietaryFilter] = useState<'All' | 'Veg' | 'Non-Veg' | 'Drinks'>('All');

  // Active categories based on mode + dynamically from items
  const defaultFoodCats = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Beverages', 'Starters', 'Main Course', 'Desserts'];
  const defaultLiquorCats = ['All', 'Beer & Wine', 'Whisky', 'Rum', 'Vodka', 'Cocktails', 'Liquor', 'Snacks', 'Beverages'];
  
  const categories = useMemo(() => {
    const set = new Set<string>(isBarMode ? defaultLiquorCats : defaultFoodCats);
    (menuItems || []).filter(i => i && i.isBar === isBarMode).forEach(i => {
      if (i.category && i.category !== 'None') set.add(i.category);
    });
    return Array.from(set);
  }, [menuItems, isBarMode]);

  // Filter menu items by Mode (Bar/Restaurant), dietary, search, and category
  const filteredMenuItems = (menuItems || []).filter(item => {
    if (!item) return false;
    const term = (searchTerm || '').toLowerCase().trim();
    const matchesMode = item.isBar === isBarMode;
    const matchesSearch = !term || (item.name || '').toLowerCase().includes(term) || (item.category || '').toLowerCase().includes(term);
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    
    // Dietary filter
    let matchesDietary = true;
    if (posDietaryFilter !== 'All') {
      const itemDietary = item.dietary || (item.category === 'Beverages' || item.isBar ? 'Drinks' : 'Veg');
      matchesDietary = itemDietary === posDietaryFilter;
    }

    return matchesMode && matchesSearch && matchesCategory && matchesDietary;
  });

  const activeOccupiedRooms = rooms.filter(r => r.status === 'Occupied');
  const activeGuestName = rooms.find(r => r.roomNumber === selectedRoomNumber)?.guestName || '';

  // Filter orders for history
  const filteredOrders = (orders || []).filter(order => {
    const matchesMode = order.isBar === isBarMode;
    const matchesType = historyFilterType === 'all' || order.type === historyFilterType;
    const term = historySearch.toLowerCase().trim();
    const matchesSearch = !term || 
      (order.orderNumber || '').toLowerCase().includes(term) ||
      (order.guestName || '').toLowerCase().includes(term) ||
      (order.roomNumber || '').toLowerCase().includes(term);
    return matchesMode && matchesType && matchesSearch;
  });

  // Today sales stats for active mode
  const modeOrders = (orders || []).filter(o => o.isBar === isBarMode);
  const modeSalesTotal = modeOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
  const modeTodayOrders = modeOrders.length;

  // Cart operations
  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const match = prev.find(i => i.menuItemId === item.id);
      if (match) {
        return prev.map(i => i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const removeFromCart = (menuItemId: string) => {
    setCart(prev => prev.map(i => {
      if (i.menuItemId === menuItemId) {
        return { ...i, quantity: i.quantity - 1 };
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const taxRate = isBarMode ? (settings?.barTaxRate ?? 20) : (settings?.taxRate ?? 18);
  const taxAmount = parseFloat(((subtotal * taxRate) / 100).toFixed(2));
  const total = parseFloat((subtotal + taxAmount).toFixed(2));

  // KOT Printing Simulation
  const handlePrintKOT = () => {
    if (cart.length === 0) return;
    setShowKotModal(true);
  };

  // Submit POS Order
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (orderType === 'Room' && !selectedRoomNumber) {
      alert('Please select an occupied room number');
      return;
    }

    const finalGuestName = orderType === 'Room' 
      ? (activeGuestName || `Room ${selectedRoomNumber}`) 
      : (walkInName.trim() || 'Walk-In Guest');

    await addRestaurantBarOrder({
      type: orderType,
      roomNumber: orderType === 'Room' ? selectedRoomNumber : undefined,
      guestName: finalGuestName,
      items: cart,
      subtotal,
      isBar: isBarMode
    });

    // Success effect
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.8 }
    });

    setSuccessMessage(`Bill completed successfully! Amount: ₹${total} (${orderType === 'Room' ? `Posted to Room ${selectedRoomNumber}` : 'Recorded as Direct Cash Sale'})`);
    setTimeout(() => setSuccessMessage(''), 5000);
    
    // Clear inputs
    clearCart();
    setSelectedRoomNumber('');
    setWalkInName('');
    setWalkInPhone('');
  };

  return (
    <div className="space-y-4">
      
      {/* Top Controls: Mode Switcher + View Tab Switcher + Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
        
        {/* Mode Switcher: Restaurant vs Bar */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setIsBarMode(false);
                setSelectedCategory('All');
                clearCart();
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !isBarMode 
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5 text-indigo-500" /> Restaurant POS
            </button>
            <button
              type="button"
              onClick={() => {
                setIsBarMode(true);
                setSelectedCategory('All');
                clearCart();
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isBarMode 
                  ? 'bg-violet-600 text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Wine className="w-3.5 h-3.5" /> Bar POS
            </button>
          </div>

          {/* POS vs History Navigation */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveViewTab('pos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeViewTab === 'pos'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" /> New Order
            </button>
            <button
              type="button"
              onClick={() => setActiveViewTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeViewTab === 'history'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <History className="w-3.5 h-3.5" /> Order History ({modeTodayOrders})
            </button>
          </div>
        </div>

        {/* Live Total Sales Badge & Manage Menu Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { window.location.hash = 'menu_items'; }}
            className="px-3.5 py-2 bg-amber-50 dark:bg-slate-800 text-[#C2410C] dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-slate-700 border border-amber-200/80 dark:border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Manage Menu Catalog</span>
          </button>

          <div className="px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 rounded-xl flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total {isBarMode ? 'Bar' : 'Restaurant'} Sales</p>
              <p className="text-xs font-extrabold font-mono text-emerald-600 dark:text-emerald-400">₹{modeSalesTotal.toLocaleString()}</p>
            </div>
          </div>
        </div>

      </div>

      {/* Global Success Notification */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setActiveViewTab('history')} className="underline hover:text-emerald-800 text-[11px] font-semibold">
            View in Order History →
          </button>
        </div>
      )}

      {/* =========================================================
          VIEW TAB 1: POS ORDER TERMINAL (Menu + Basket)
          ========================================================= */}
      {activeViewTab === 'pos' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-210px)]">
          
          {/* 1. Item Selection Area (Left - 7 Cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4 h-full overflow-hidden">
            
            {/* Search, Dietary & Categories */}
            <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm shrink-0">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={`Search ${isBarMode ? 'drinks, cocktails, snacks' : 'dishes, meals, beverages'}...`}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs border dark:border-slate-800 dark:bg-slate-950 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dietary Filter Segmented Pills */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
                  {(['All', 'Veg', 'Non-Veg', 'Drinks'] as const).map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setPosDietaryFilter(d)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        posDietaryFilter === d
                          ? 'bg-slate-900 text-white dark:bg-amber-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {d === 'Veg' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />}
                      {d === 'Non-Veg' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 mr-1" />}
                      {d === 'Drinks' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 mr-1" />}
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories select list */}
              <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-500 dark:bg-slate-800/40 dark:hover:bg-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* POS Menu Grid with High-Quality Images */}
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                {filteredMenuItems.map(item => {
                  const cartItem = cart.find(c => c.menuItemId === item.id);
                  const inCartQty = cartItem?.quantity || 0;
                  const dietary = item.dietary || (item.category === 'Beverages' || item.isBar ? 'Drinks' : 'Veg');
                  const hasImage = Boolean(item.imageUrl && item.imageUrl.trim().length > 0);

                  return (
                    <div
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className={`group cursor-pointer bg-white dark:bg-slate-900 border rounded-2xl shadow-sm text-left transition-all duration-200 overflow-hidden flex flex-col justify-between hover:shadow-md hover:border-amber-500/50 active:scale-[0.98] ${
                        inCartQty > 0
                          ? 'border-amber-500 dark:border-amber-500 ring-2 ring-amber-500/20'
                          : 'border-slate-200/60 dark:border-slate-800/60'
                      }`}
                    >
                      {/* Image Thumbnail Container */}
                      <div className="relative h-28 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        {hasImage ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={e => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 dark:from-slate-800 dark:to-slate-850 p-2 text-center">
                            {item.isBar ? (
                              <Wine className="w-7 h-7 text-rose-400 mb-0.5" />
                            ) : (
                              <UtensilsCrossed className="w-7 h-7 text-amber-500 mb-0.5" />
                            )}
                            <span className="text-[9px] font-bold text-slate-400 line-clamp-1">
                              {item.category || 'Menu Item'}
                            </span>
                          </div>
                        )}

                        {/* Dietary Badge */}
                        <div className="absolute top-2 right-2 z-10">
                          <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase shadow-sm ${
                            dietary === 'Drinks'
                              ? 'bg-amber-500 text-white'
                              : dietary === 'Non-Veg'
                              ? 'bg-rose-500 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}>
                            {dietary}
                          </span>
                        </div>

                        {/* In-Cart Quantity Indicator */}
                        {inCartQty > 0 && (
                          <div className="absolute top-2 left-2 z-10">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-600 text-white shadow-md animate-pulse">
                              {inCartQty} in cart
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Card Body */}
                      <div className="p-3 flex flex-col justify-between flex-1">
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">
                            {item.category || 'Standard'}
                          </span>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {item.name}
                          </h4>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                          <span className="text-xs font-black font-mono text-[#C2410C] dark:text-amber-400">
                            ₹{Number(item.price || 0).toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(item);
                            }}
                            className="p-1 bg-amber-50 dark:bg-slate-800 text-[#C2410C] dark:text-amber-400 rounded-lg group-hover:bg-[#C2410C] group-hover:text-white transition-all shadow-sm"
                            title="Add to basket"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredMenuItems.length === 0 && (
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 mt-2">
                  <UtensilsCrossed className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-slate-500 font-semibold">No menu items found</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Try changing search or dietary filter</p>
                </div>
              )}
            </div>

          </div>

          {/* 2. Active Cart & Link Form (Right - 5 Cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm h-full flex flex-col overflow-hidden">
            
            {/* Cart Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-indigo-500" /> Active Basket ({cart.reduce((a, b) => a + b.quantity, 0)} Items)
              </h3>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-[10px] text-slate-400 hover:text-rose-500 font-bold"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {/* Cart Items list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 opacity-60">
                  <span className="text-3xl mb-2">{isBarMode ? '🍷' : '🍽️'}</span>
                  <p className="text-xs font-semibold uppercase">Basket is Empty</p>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">Click menu items on the left to start building order.</p>
                </div>
              ) : (
                cart.map(item => (
                  <div 
                    key={item.menuItemId} 
                    className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-950/30 border border-slate-200/20 dark:border-slate-800/20 rounded-xl"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{item.name}</h5>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">₹{item.price} each</p>
                    </div>
                    
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border dark:border-slate-800 p-0.5 rounded-lg">
                        <button 
                          onClick={() => removeFromCart(item.menuItemId)} 
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                          {item.quantity}
                        </span>
                        <button 
                          onClick={() => {
                            const match = menuItems.find(i => i.id === item.menuItemId);
                            if (match) addToCart(match);
                          }} 
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="w-16 text-right text-xs font-bold font-mono text-slate-950 dark:text-white">
                        ₹{item.price * item.quantity}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Customer Routing & Calculations Panel */}
            {cart.length > 0 && (
              <form onSubmit={handlePlaceOrder} className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
                
                {/* Routing Tabs */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bill Destination</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-200/50 dark:bg-slate-900 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setOrderType('Room')}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                        orderType === 'Room' 
                          ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm' 
                          : 'text-slate-500'
                      }`}
                    >
                      Link to Room
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderType('WalkIn')}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                        orderType === 'WalkIn' 
                          ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm' 
                          : 'text-slate-500'
                      }`}
                    >
                      Walk-In Bill
                    </button>
                  </div>
                </div>

                {/* Sub-form fields */}
                {orderType === 'Room' ? (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-500">Select Room *</label>
                      <select
                        required
                        value={selectedRoomNumber}
                        onChange={e => setSelectedRoomNumber(e.target.value)}
                        className="w-full p-2 border dark:border-slate-850 dark:bg-slate-900 rounded-lg font-bold"
                      >
                        <option value="">-- Room Number --</option>
                        {activeOccupiedRooms.map(r => (
                          <option key={r.id} value={r.roomNumber}>
                            Room {r.roomNumber} ({r.guestName})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-500">Guest Name</label>
                      <input
                        type="text"
                        disabled
                        value={activeGuestName}
                        className="w-full p-2 border dark:border-slate-850 bg-slate-100 dark:bg-slate-900/50 rounded-lg text-slate-400 font-semibold"
                        placeholder="Guest details auto-filled"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-500">Guest Name (Optional)</label>
                      <input
                        type="text"
                        value={walkInName}
                        onChange={e => setWalkInName(e.target.value)}
                        className="w-full p-2 border dark:border-slate-850 dark:bg-slate-900 rounded-lg font-semibold"
                        placeholder="e.g., Table 4 / Walk-In (Optional)"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-500">Phone Number</label>
                      <input
                        type="tel"
                        value={walkInPhone}
                        onChange={e => setWalkInPhone(e.target.value)}
                        className="w-full p-2 border dark:border-slate-850 dark:bg-slate-900 rounded-lg"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                )}

                {/* Calculations Summary */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">POS Subtotal</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>GST Tax (@{taxRate}%)</span>
                    <span>₹{taxAmount}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-200/30">
                    <span className="text-slate-800 dark:text-slate-200 font-sans">Total Bill</span>
                    <span className="text-indigo-600 dark:text-indigo-400">₹{total}</span>
                  </div>
                </div>

                {/* Actions: Print KOT / Send Charges */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handlePrintKOT}
                    className="px-3.5 py-2.5 border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 flex items-center justify-center gap-1.5 transition-all text-xs font-semibold"
                    title="Print Kitchen Order Ticket"
                  >
                    <Printer className="w-4 h-4" /> KOT
                  </button>
                  
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all text-xs"
                  >
                    <CheckSquare className="w-4 h-4" />
                    {orderType === 'Room' ? `Post to Room ${selectedRoomNumber}` : 'Record Cash Payment'}
                  </button>
                </div>

              </form>
            )}

          </div>

        </div>
      ) : (
        /* =========================================================
           VIEW TAB 2: ORDER HISTORY & COMPLETED BILLS
           ========================================================= */
        <div className="space-y-4">
          {/* History Filters Header */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Order #, Room #, or Guest..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border dark:border-slate-800 dark:bg-slate-950 rounded-xl font-medium"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Filter:</span>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setHistoryFilterType('all')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    historyFilterType === 'all'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  All ({modeOrders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilterType('Room')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    historyFilterType === 'Room'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Room Charged
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilterType('WalkIn')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    historyFilterType === 'WalkIn'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Direct Cash/Paid
                </button>
              </div>
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm overflow-hidden">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40 text-indigo-500" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No {isBarMode ? 'Bar' : 'Restaurant'} orders found</p>
                <p className="text-xs text-slate-400 mt-1">Orders placed in POS will appear here immediately.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th className="py-3.5 px-4">Order Ref</th>
                      <th className="py-3.5 px-4">Date & Time</th>
                      <th className="py-3.5 px-4">Destination</th>
                      <th className="py-3.5 px-4">Guest / Room</th>
                      <th className="py-3.5 px-4">Items Ordered</th>
                      <th className="py-3.5 px-4 text-right">Tax</th>
                      <th className="py-3.5 px-4 text-right">Total Amount</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-center">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredOrders.map(order => (
                      <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {order.orderNumber}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                          {order.timestamp ? new Date(order.timestamp).toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            order.type === 'Room'
                              ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                              : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          }`}>
                            {order.type === 'Room' ? 'Room Linked' : 'Walk-In'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          {order.type === 'Room' ? (
                            <span className="flex items-center gap-1.5">
                              <Bed className="w-3.5 h-3.5 text-indigo-500" />
                              Room {order.roomNumber} ({order.guestName || 'In-House'})
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              {order.guestName || 'Direct Customer'}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="truncate text-[11px] text-slate-600 dark:text-slate-300 font-medium" title={order.items.map(i => `${i.name} x${i.quantity}`).join(', ')}>
                            {order.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-400 text-[11px]">
                          ₹{(order.tax || 0).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                          ₹{order.total}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            order.status === 'Paid'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setSelectedOrderForReceipt(order)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="View / Print Customer Receipt"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          KOT PRINT DIALOG (SIMULATED TICKET)
          ========================================== */}
      {showKotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white text-slate-900 w-full max-w-xs rounded-lg shadow-2xl p-5 border border-slate-200 space-y-4 receipt-print animate-in zoom-in-95 duration-200">
            
            {/* Ticket header */}
            <div className="text-center border-b border-dashed border-slate-400 pb-3">
              <h3 className="font-extrabold text-sm uppercase tracking-wider">
                *** KITCHEN ORDER ***
              </h3>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                HOTELVISTA RESORT & SPA
              </p>
              <p className="text-[10px] font-bold mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded">
                Ticket No: KOT-{Math.floor(1000 + Math.random() * 9000)}
              </p>
            </div>

            {/* Ticket details */}
            <div className="text-[10px] space-y-0.5 font-mono">
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Time:</span>
                <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Order Source:</span>
                <span>{orderType === 'Room' ? `Room ${selectedRoomNumber}` : 'Walk-in'}</span>
              </div>
              {orderType === 'Room' && (
                <div className="flex justify-between text-slate-600">
                  <span>Guest:</span>
                  <span className="truncate max-w-[120px]">{activeGuestName}</span>
                </div>
              )}
            </div>

            {/* Order Items list */}
            <div className="border-t border-b border-dashed border-slate-400 py-2.5 font-mono text-[10px]">
              <div className="flex justify-between font-bold pb-1.5">
                <span>Item Name</span>
                <span>Qty</span>
              </div>
              <div className="space-y-1">
                {cart.map(item => (
                  <div key={item.menuItemId} className="flex justify-between">
                    <span className="truncate max-w-[170px] uppercase font-bold">● {item.name}</span>
                    <span className="font-bold">x{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ticket footer */}
            <div className="text-center text-[9px] text-slate-500 italic font-mono pt-1">
              Sent to Kitchen Queue successfully.
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100 font-sans">
              <button
                onClick={() => setShowKotModal(false)}
                className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-[10px] font-bold text-center"
              >
                Close Ticket View
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* ==========================================
          CUSTOMER RECEIPT MODAL
          ========================================== */}
      {selectedOrderForReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white text-slate-900 w-full max-w-sm rounded-2xl shadow-2xl p-6 border border-slate-200 space-y-4 receipt-print animate-in zoom-in-95 duration-200">
            
            {/* Receipt Header */}
            <div className="text-center border-b border-dashed border-slate-300 pb-3">
              <h3 className="font-black text-base uppercase tracking-tight text-slate-900">
                HOTELVISTA RESORT & SPA
              </h3>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                {selectedOrderForReceipt.isBar ? 'Bar & Lounge Terminal' : 'Fine Dining Restaurant & Room Service'}
              </p>
              <p className="text-[11px] font-bold font-mono mt-1 text-indigo-600 bg-indigo-50 inline-block px-2.5 py-0.5 rounded-full">
                {selectedOrderForReceipt.orderNumber}
              </p>
            </div>

            {/* Bill Details */}
            <div className="text-[11px] space-y-1 font-mono text-slate-600">
              <div className="flex justify-between">
                <span>Date/Time:</span>
                <span>{selectedOrderForReceipt.timestamp ? new Date(selectedOrderForReceipt.timestamp).toLocaleString() : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer:</span>
                <span className="font-bold text-slate-900">
                  {selectedOrderForReceipt.type === 'Room' ? `Room ${selectedOrderForReceipt.roomNumber} (${selectedOrderForReceipt.guestName})` : selectedOrderForReceipt.guestName}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Payment Mode:</span>
                <span className="font-bold text-emerald-600">
                  {selectedOrderForReceipt.status === 'PostedToRoom' ? 'Charged to Room Folio' : 'Cash / Direct Paid'}
                </span>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="border-t border-b border-dashed border-slate-300 py-3 font-mono text-xs space-y-2">
              <div className="flex justify-between font-bold text-slate-800 pb-1 border-b border-slate-100">
                <span>Item</span>
                <div className="flex gap-4">
                  <span>Qty</span>
                  <span>Amount</span>
                </div>
              </div>
              {selectedOrderForReceipt.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-slate-700">
                  <span className="truncate max-w-[160px] font-semibold">{item.name}</span>
                  <div className="flex gap-6 text-right">
                    <span className="w-4 text-center">x{item.quantity}</span>
                    <span className="font-bold font-mono">₹{item.price * item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span>₹{selectedOrderForReceipt.subtotal}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>GST Tax:</span>
                <span>₹{(selectedOrderForReceipt.tax || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1.5 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="text-indigo-600 font-mono">₹{selectedOrderForReceipt.total}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-slate-100 font-sans">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Print Receipt
              </button>
              <button
                onClick={() => setSelectedOrderForReceipt(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
