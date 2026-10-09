import React, { useState, useMemo } from 'react';
import { useApp, MenuItem, OrderItem, Order, RestaurantTable, KotRound } from '../context/AppContext';
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
  BookOpen,
  Boxes,
  Droplets,
  LayoutGrid,
  Coffee,
  ArrowRightLeft,
  Users,
  AlertCircle,
  Trash2,
  Edit2,
  ArrowRight,
  ShieldCheck,
  Flame,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const RestaurantBarView: React.FC = () => {
  const { 
    menuItems, 
    rooms, 
    tables = [], 
    orders = [], 
    addRestaurantBarOrder, 
    addTable,
    updateTable,
    deleteTable,
    parkTableKot, 
    settleTableTab, 
    clearTableTab, 
    transferTableTab, 
    settings 
  } = useApp();
  
  // Navigation tab: 'tables' | 'pos' | 'tabs' | 'history'
  const [activeViewTab, setActiveViewTab] = useState<'tables' | 'pos' | 'tabs' | 'history'>('tables');

  // Mode: Restaurant vs Bar
  const [isBarMode, setIsBarMode] = useState(false);

  // Table Floor filter
  const [tableSectionFilter, setTableSectionFilter] = useState<'All' | 'Main Dining' | 'Bar Lounge' | 'Outdoor' | 'VIP Cabana'>('All');

  // Search & Categories in POS Menu
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [posDietaryFilter, setPosDietaryFilter] = useState<'All' | 'Veg' | 'Non-Veg' | 'Drinks'>('All');

  // POS Order Routing & State
  const [posOrderMode, setPosOrderMode] = useState<'Table' | 'Room' | 'WalkIn'>('Table');
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [selectedRoomNumber, setSelectedRoomNumber] = useState('');
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [tableGuestName, setTableGuestName] = useState('');
  const [tablePax, setTablePax] = useState<number>(2);
  const [kotInstructions, setKotInstructions] = useState('');
  const [serverName, setServerName] = useState('Captain / Waiter');

  // Cart state
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [showAlreadyBoughtInPos, setShowAlreadyBoughtInPos] = useState(true);

  // Modals state
  const [showKotPrintModal, setShowKotPrintModal] = useState(false);
  const [activeKotForPrint, setActiveKotForPrint] = useState<{
    kotNumber: string;
    roundNumber: number;
    tableNumber: string;
    section: string;
    serverName?: string;
    timestamp: string;
    instructions?: string;
    items: OrderItem[];
    isBar?: boolean;
  } | null>(null);

  // Table Details & Already Bought Items Modal
  const [showTableDetailsModal, setShowTableDetailsModal] = useState(false);
  const [selectedTableForDetails, setSelectedTableForDetails] = useState<RestaurantTable | null>(null);
  const [tableDetailsTab, setTableDetailsTab] = useState<'rounds' | 'consolidated'>('rounds');

  // Settle Bill Modal
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleTargetTable, setSettleTargetTable] = useState<RestaurantTable | null>(null);
  const [settlePaymentMethod, setSettlePaymentMethod] = useState<'Cash' | 'Card' | 'UPI' | 'Room' | 'Split'>('Cash');
  const [settleRoomNumber, setSettleRoomNumber] = useState('');
  const [settleDiscount, setSettleDiscount] = useState<number>(0);
  const [settleSplitDetails, setSettleSplitDetails] = useState({ cash: 0, card: 0, upi: 0 });

  // Transfer Table Modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferSourceTable, setTransferSourceTable] = useState<RestaurantTable | null>(null);
  const [transferTargetTableId, setTransferTargetTableId] = useState('');

  // Add / Edit Table Modal
  const [showTableModal, setShowTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [tableFormData, setTableFormData] = useState<{
    tableNumber: string;
    section: 'Main Dining' | 'Bar Lounge' | 'Outdoor' | 'VIP Cabana';
    capacity: number;
    isBar: boolean;
  }>({
    tableNumber: '',
    section: 'Main Dining',
    capacity: 4,
    isBar: false
  });
  const [tableFormError, setTableFormError] = useState('');

  // Selected Order for Receipt / History Modal
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<Order | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  // History search & filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilterType, setHistoryFilterType] = useState<'all' | 'Room' | 'WalkIn'>('all');

  // Categories based on mode
  const defaultFoodCats = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Beverages', 'Starters', 'Main Course', 'Desserts'];
  const defaultLiquorCats = ['All', 'Beer & Wine', 'Whisky', 'Rum', 'Vodka', 'Cocktails', 'Liquor', 'Snacks', 'Beverages'];
  
  const categories = useMemo(() => {
    const set = new Set<string>(isBarMode ? defaultLiquorCats : defaultFoodCats);
    (menuItems || []).filter(i => i && i.isBar === isBarMode).forEach(i => {
      if (i.category && i.category !== 'None') set.add(i.category);
    });
    return Array.from(set);
  }, [menuItems, isBarMode]);

  // Filtered menu items
  const filteredMenuItems = useMemo(() => {
    return (menuItems || []).filter(item => {
      if (!item) return false;
      const term = (searchTerm || '').toLowerCase().trim();
      const matchesMode = item.isBar === isBarMode;
      const matchesSearch = !term || (item.name || '').toLowerCase().includes(term) || (item.category || '').toLowerCase().includes(term);
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      
      let matchesDietary = true;
      if (posDietaryFilter !== 'All') {
        const itemDietary = item.dietary || (item.category === 'Beverages' || item.isBar ? 'Drinks' : 'Veg');
        matchesDietary = itemDietary === posDietaryFilter;
      }

      return matchesMode && matchesSearch && matchesCategory && matchesDietary;
    });
  }, [menuItems, isBarMode, searchTerm, selectedCategory, posDietaryFilter]);

  const activeOccupiedRooms = useMemo(() => rooms.filter(r => r.status === 'Occupied'), [rooms]);
  const activeGuestName = useMemo(() => rooms.find(r => r.roomNumber === selectedRoomNumber)?.guestName || '', [rooms, selectedRoomNumber]);

  // Selected Table Object
  const currentSelectedTable = useMemo(() => {
    return tables.find(t => t.id === selectedTableId) || null;
  }, [tables, selectedTableId]);

  // Active Table Details for Modal
  const activeTableDetails = useMemo(() => {
    if (!selectedTableForDetails) return null;
    return tables.find(t => t.id === selectedTableForDetails.id) || selectedTableForDetails;
  }, [tables, selectedTableForDetails]);

  // Filtered Tables for Floor Map
  const filteredTables = useMemo(() => {
    return tables.filter(t => {
      if (tableSectionFilter === 'All') return true;
      return t.section === tableSectionFilter;
    });
  }, [tables, tableSectionFilter]);

  // Active Parked Tabs count & value
  const occupiedTables = useMemo(() => tables.filter(t => t.status === 'Occupied' || (t.runningItems && t.runningItems.length > 0)), [tables]);
  const totalParkedValue = useMemo(() => occupiedTables.reduce((sum, t) => sum + (t.total || 0), 0), [occupiedTables]);

  // Calculations for current POS cart
  const cartGross = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const taxRate = isBarMode ? (settings?.barTaxRate ?? 20) : (settings?.taxRate ?? 18);
  const taxableSubtotal = cartGross > 0 ? parseFloat((cartGross / (1 + taxRate / 100)).toFixed(2)) : 0;
  const taxAmount = cartGross > 0 ? parseFloat((cartGross - taxableSubtotal).toFixed(2)) : 0;
  const cartTotal = cartGross;

  // Cart operations
  const addToCart = (item: MenuItem, notes?: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.menuItemId === item.id && (i.notes || '') === (notes || ''));
      if (existing) {
        return prev.map(i => 
          i.menuItemId === item.id && (i.notes || '') === (notes || '')
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, {
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        notes: notes || ''
      }];
    });
  };

  const removeFromCart = (menuItemId: string, notes?: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.menuItemId === menuItemId && (i.notes || '') === (notes || ''));
      if (existing && existing.quantity > 1) {
        return prev.map(i => 
          i.menuItemId === menuItemId && (i.notes || '') === (notes || '')
            ? { ...i, quantity: i.quantity - 1 }
            : i
        );
      }
      return prev.filter(i => !(i.menuItemId === menuItemId && (i.notes || '') === (notes || '')));
    });
  };

  const clearCart = () => {
    setCart([]);
    setKotInstructions('');
  };

  // Helper: Open POS terminal directly targeted to a Table
  const handleOpenTableInPOS = (table: RestaurantTable) => {
    setSelectedTableId(table.id);
    setPosOrderMode('Table');
    setTableGuestName(table.guestName || '');
    setTablePax(table.pax || table.capacity || 2);
    setIsBarMode(Boolean(table.isBar));
    setActiveViewTab('pos');
  };

  // Helper: Open Settle Modal for a Table
  const handleOpenSettleTable = (table: RestaurantTable) => {
    setSettleTargetTable(table);
    setSettlePaymentMethod('Cash');
    setSettleRoomNumber('');
    setSettleDiscount(0);
    setSettleSplitDetails({ cash: 0, card: 0, upi: 0 });
    setShowSettleModal(true);
  };

  // Helper: Open Transfer Modal
  const handleOpenTransferModal = (table: RestaurantTable) => {
    setTransferSourceTable(table);
    setTransferTargetTableId('');
    setShowTransferModal(true);
  };

  // Helper: Open Table Details & Already Bought Items Modal
  const handleOpenTableDetails = (table: RestaurantTable) => {
    setSelectedTableForDetails(table);
    setTableDetailsTab('rounds');
    setShowTableDetailsModal(true);
  };

  // Helper: Add / Edit / Delete Table Handlers
  const handleOpenAddTable = () => {
    const existingNums = tables.map(t => parseInt(t.tableNumber.replace(/\D/g, ''))).filter(n => !isNaN(n));
    const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : tables.length + 1;
    setEditingTable(null);
    setTableFormData({
      tableNumber: isBarMode ? `B-${nextNum}` : `T-${nextNum}`,
      section: isBarMode ? 'Bar Lounge' : 'Main Dining',
      capacity: 4,
      isBar: isBarMode
    });
    setTableFormError('');
    setShowTableModal(true);
  };

  const handleOpenEditTable = (table: RestaurantTable, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTable(table);
    setTableFormData({
      tableNumber: table.tableNumber,
      section: (table.section as any) || 'Main Dining',
      capacity: table.capacity || 4,
      isBar: !!table.isBar
    });
    setTableFormError('');
    setShowTableModal(true);
  };

  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableFormData.tableNumber.trim()) {
      setTableFormError('Table number or name is required');
      return;
    }

    const duplicate = tables.find(t => 
      t.tableNumber.trim().toLowerCase() === tableFormData.tableNumber.trim().toLowerCase() &&
      (!editingTable || t.id !== editingTable.id)
    );
    if (duplicate) {
      setTableFormError(`Table "${tableFormData.tableNumber}" already exists!`);
      return;
    }

    if (editingTable) {
      const res = await updateTable(editingTable.id, {
        tableNumber: tableFormData.tableNumber.trim(),
        section: tableFormData.section,
        capacity: Number(tableFormData.capacity) || 4,
        isBar: tableFormData.isBar
      });
      if (res.success) {
        setShowTableModal(false);
        setSuccessMessage(`Table ${tableFormData.tableNumber} updated successfully!`);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setTableFormError(res.error || 'Failed to update table');
      }
    } else {
      const res = await addTable({
        tableNumber: tableFormData.tableNumber.trim(),
        section: tableFormData.section,
        capacity: Number(tableFormData.capacity) || 4,
        isBar: tableFormData.isBar
      });
      if (res.success) {
        setShowTableModal(false);
        setSuccessMessage(`Table ${tableFormData.tableNumber} created successfully!`);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setTableFormError(res.error || 'Failed to create table');
      }
    }
  };

  const handleDeleteTable = async (table: RestaurantTable, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isOccupied = table.status === 'Occupied' || (table.runningItems && table.runningItems.length > 0);
    if (isOccupied) {
      alert(`Cannot delete Table ${table.tableNumber} while it has an active tab / parked items. Please settle or clear the table first.`);
      return;
    }
    if (window.confirm(`Are you sure you want to delete Table ${table.tableNumber}?`)) {
      const res = await deleteTable(table.id);
      if (res.success) {
        if (showTableModal) setShowTableModal(false);
        setSuccessMessage(`Table ${table.tableNumber} deleted successfully.`);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        alert(res.error || 'Failed to delete table');
      }
    }
  };

  // =========================================================================
  // UNIVERSAL THERMAL PRINTER DRIVER (80mm / 58mm ESC/POS COMPATIBLE)
  // =========================================================================
  const triggerThermalPrint = (title: string, htmlBody: string) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace;
              font-size: 12px;
              line-height: 1.3;
              color: #000000;
              background: #ffffff;
              width: 74mm;
              max-width: 80mm;
              margin: 0 auto;
              padding: 4mm 2mm;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .black { font-weight: 900; }
            .uppercase { text-transform: uppercase; }
            .dash-line {
              border-bottom: 1px dashed #000000;
              margin: 4px 0;
            }
            .double-line {
              border-bottom: 2px solid #000000;
              margin: 4px 0;
            }
            .row {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .item-desc {
              flex: 1;
              padding-right: 4px;
            }
            .table-header {
              font-weight: 900;
              border-bottom: 1px solid #000;
              padding-bottom: 2px;
              margin-bottom: 3px;
            }
            .notes {
              padding-left: 10px;
              font-size: 10px;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          ${htmlBody}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.print();
      }
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 250);
  };

  // Helper: Print Thermal Kitchen / Bar Order Ticket (KOT Slip)
  const printThermalKotSlip = (kot: {
    kotNumber: string;
    roundNumber: number;
    tableNumber: string;
    section: string;
    serverName?: string;
    timestamp: string;
    instructions?: string;
    items: OrderItem[];
    isBar?: boolean;
  }) => {
    const hotelName = settings.name || 'HOTEL SUBRA GRAND';
    const kotType = kot.isBar ? 'BAR ORDER TICKET (BOT)' : 'KITCHEN ORDER TICKET (KOT)';
    const dateStr = new Date(kot.timestamp).toLocaleDateString('en-GB');
    const timeStr = new Date(kot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const totalQty = (kot.items || []).reduce((s, it) => s + (it.quantity || 1), 0);

    const itemsHtml = (kot.items || []).map(it => `
      <div style="margin-bottom: 4px;">
        <div class="row">
          <span class="bold">[ ${it.quantity} ]</span>
          <span class="bold uppercase item-desc" style="padding-left: 6px;">${it.name}</span>
        </div>
        ${it.notes ? `<div class="notes">* Prep: ${it.notes}</div>` : ''}
      </div>
    `).join('');

    const html = `
      <div class="center bold uppercase" style="font-size: 13px;">${hotelName}</div>
      <div class="center bold" style="font-size: 11px; margin: 2px 0;">*** ${kotType} ***</div>
      <div class="double-line"></div>
      
      <div class="row" style="font-size: 11px;">
        <span>KOT #: <strong class="black">${kot.kotNumber}</strong></span>
        <span class="bold">[ROUND: ${kot.roundNumber}]</span>
      </div>
      <div class="row" style="font-size: 10px;">
        <span>DATE: ${dateStr}</span>
        <span>TIME: ${timeStr}</span>
      </div>
      
      <div class="dash-line"></div>
      <div class="row" style="font-size: 13px; font-weight: 900;">
        <span>TABLE:</span>
        <span>Table ${kot.tableNumber} (${kot.section})</span>
      </div>
      <div class="row" style="font-size: 10px;">
        <span>SERVER: <strong class="uppercase">${kot.serverName || 'Captain'}</strong></span>
        <span>TYPE: <strong>DINE-IN</strong></span>
      </div>
      
      <div class="double-line"></div>
      <div class="row table-header" style="font-size: 10px;">
        <span>QTY   ITEM DESCRIPTION</span>
      </div>
      
      <div style="padding: 2px 0;">
        ${itemsHtml}
      </div>
      
      <div class="dash-line"></div>
      <div class="row bold" style="font-size: 11px;">
        <span>TOTAL ITEMS: ${(kot.items || []).length}</span>
        <span>TOTAL QTY: ${totalQty}</span>
      </div>
      
      ${kot.instructions ? `
        <div class="dash-line"></div>
        <div style="font-size: 10px;">
          <div class="bold">CHEF / BAR INSTRUCTIONS:</div>
          <div style="padding: 2px; font-weight: bold;">&gt;&gt; ${kot.instructions} &lt;&lt;</div>
        </div>
      ` : ''}
      
      <div class="double-line"></div>
      <div class="center bold" style="font-size: 10px; margin-top: 3px;">
        *** ${kot.isBar ? 'BAR DISPENSE COPY' : 'KITCHEN DISPLAY COPY'} ***
      </div>
    `;

    triggerThermalPrint(`KOT-${kot.kotNumber}`, html);
  };

  // Helper: Print Thermal Final Bill / Guest Check
  const printThermalFinalBill = (bill: {
    billNumber: string;
    tableNumber?: string;
    section?: string;
    guestName?: string;
    roomNumber?: string;
    serverName?: string;
    timestamp?: string;
    items: OrderItem[];
    subtotal: number;
    tax: number;
    total: number;
    paymentMethod?: string;
    discount?: number;
    isBar?: boolean;
    status?: string;
  }) => {
    const hotelName = settings.name || 'HOTEL SUBRA GRAND';
    const address = settings.address || '';
    const phone = settings.phone || '';
    const gstNumber = settings.gstNumber || '';
    const dateStr = new Date(bill.timestamp || Date.now()).toLocaleDateString('en-GB');
    const timeStr = new Date(bill.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const totalQty = (bill.items || []).reduce((s, it) => s + (it.quantity || 1), 0);
    const isGuestCheck = bill.status === 'PreBill' || bill.status === 'Running';
    const billTitle = isGuestCheck ? 'GUEST CHECK (PRE-BILL)' : 'TAX INVOICE / FINAL RECEIPT';

    const cgst = (Number(bill.tax || 0) / 2).toFixed(2);
    const sgst = (Number(bill.tax || 0) / 2).toFixed(2);

    const itemsHtml = (bill.items || []).map(it => `
      <div class="row" style="margin-bottom: 2px; font-size: 11px;">
        <span class="item-desc uppercase">${it.name}</span>
        <span style="width: 24px; text-align: center;">${it.quantity}</span>
        <span style="width: 44px; text-align: right;">${Number(it.price).toFixed(2)}</span>
        <span style="width: 50px; text-align: right; font-weight: bold;">${(Number(it.price) * it.quantity).toFixed(2)}</span>
      </div>
    `).join('');

    const html = `
      <div class="center bold uppercase" style="font-size: 13px;">${hotelName}</div>
      ${address ? `<div class="center" style="font-size: 9px;">${address}</div>` : ''}
      ${phone ? `<div class="center" style="font-size: 9px;">Ph: ${phone}</div>` : ''}
      ${gstNumber ? `<div class="center bold" style="font-size: 9px;">GSTIN: ${gstNumber}</div>` : ''}
      
      <div class="double-line"></div>
      <div class="center bold" style="font-size: 11px; margin: 1px 0;">*** ${billTitle} ***</div>
      <div class="double-line"></div>
      
      <div class="row" style="font-size: 10px;">
        <span>BILL NO: <strong class="black">${bill.billNumber}</strong></span>
        <span>DATE: ${dateStr}</span>
      </div>
      <div class="row" style="font-size: 10px;">
        <span>TIME: ${timeStr}</span>
        ${bill.tableNumber ? `<span>TABLE: <strong>Table ${bill.tableNumber} (${bill.section || ''})</strong></span>` : ''}
      </div>
      
      <div class="row" style="font-size: 10px;">
        <span>GUEST: <strong>${bill.guestName || 'Dine-In Guest'}</strong></span>
        ${bill.roomNumber ? `<span>ROOM: <strong>Room ${bill.roomNumber}</strong></span>` : ''}
      </div>
      ${bill.serverName ? `<div class="row" style="font-size: 10px;"><span>SERVER: ${bill.serverName}</span></div>` : ''}
      
      <div class="double-line"></div>
      <div class="row table-header" style="font-size: 10px;">
        <span class="item-desc">ITEM</span>
        <span style="width: 24px; text-align: center;">QTY</span>
        <span style="width: 44px; text-align: right;">RATE</span>
        <span style="width: 50px; text-align: right;">AMT</span>
      </div>
      
      <div style="padding: 2px 0;">
        ${itemsHtml}
      </div>
      
      <div class="dash-line"></div>
      <div class="row" style="font-size: 10px;">
        <span>TOTAL ITEMS: ${(bill.items || []).length} (QTY: ${totalQty})</span>
      </div>
      
      <div class="dash-line"></div>
      <div class="row" style="font-size: 10px;">
        <span>TAXABLE BASE (Subtotal):</span>
        <span>₹ ${Number(bill.subtotal || 0).toFixed(2)}</span>
      </div>
      <div class="row" style="font-size: 10px;">
        <span>CGST (Inclusive split):</span>
        <span>₹ ${cgst}</span>
      </div>
      <div class="row" style="font-size: 10px;">
        <span>SGST (Inclusive split):</span>
        <span>₹ ${sgst}</span>
      </div>
      ${bill.discount && bill.discount > 0 ? `
        <div class="row" style="font-size: 10px; color: #b91c1c;">
          <span>DISCOUNT:</span>
          <span>- ₹ ${Number(bill.discount).toFixed(2)}</span>
        </div>
      ` : ''}
      
      <div class="double-line"></div>
      <div class="row bold" style="font-size: 13px;">
        <span>NET PAYABLE:</span>
        <span class="black">₹ ${Number(bill.total || 0).toFixed(2)}</span>
      </div>
      <div class="double-line"></div>
      
      <div class="row" style="font-size: 10px; margin-top: 2px;">
        <span>PAYMENT MODE:</span>
        <strong class="uppercase">${bill.paymentMethod ? `${bill.paymentMethod} ${bill.roomNumber ? `(Room ${bill.roomNumber})` : ''}` : (isGuestCheck ? 'PENDING SETTLEMENT' : 'PAID')}</strong>
      </div>
      
      <div class="dash-line"></div>
      <div class="center bold" style="font-size: 10px; margin-top: 4px;">
        Thank you for dining with us! Please visit again.
      </div>
      <div class="center" style="font-size: 9px; margin-top: 2px;">
        -- Software generated bill --
      </div>
    `;

    triggerThermalPrint(`BILL-${bill.billNumber}`, html);
  };

  // Action: Park Table with new KOT Round
  const handleParkTableKot = async () => {
    if (!selectedTableId) {
      alert('Please select a Table to park this KOT order.');
      return;
    }
    if (cart.length === 0) {
      alert('Please add at least 1 item to generate a KOT.');
      return;
    }

    const table = tables.find(t => t.id === selectedTableId);
    if (!table) return;

    const res = await parkTableKot(selectedTableId, {
      items: cart,
      instructions: kotInstructions.trim() || undefined,
      guestName: tableGuestName.trim() || undefined,
      pax: Number(tablePax) || 2,
      isBar: isBarMode,
      serverName: serverName || undefined
    });

    if (res.success && res.newRound) {
      setActiveKotForPrint({
        kotNumber: res.newRound.kotNumber,
        roundNumber: res.newRound.roundNumber,
        tableNumber: table.tableNumber,
        section: table.section,
        serverName: serverName,
        timestamp: res.newRound.timestamp,
        instructions: res.newRound.instructions,
        items: res.newRound.items,
        isBar: isBarMode
      });
      setShowKotPrintModal(true);
      clearCart();

      // Confetti effect
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 }
      });
    } else {
      alert(res.error || 'Failed to generate KOT and park table.');
    }
  };

  // Action: Settle Table Tab & Release
  const handleConfirmSettleTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleTargetTable) return;

    if (settlePaymentMethod === 'Room' && !settleRoomNumber) {
      alert('Please select an occupied guest room to post charges.');
      return;
    }

    let splitDetailsStr = '';
    if (settlePaymentMethod === 'Split') {
      splitDetailsStr = `Cash: ₹${settleSplitDetails.cash}, Card: ₹${settleSplitDetails.card}, UPI: ₹${settleSplitDetails.upi}`;
    }

    const res = await settleTableTab(settleTargetTable.id, {
      paymentMethod: settlePaymentMethod,
      roomNumber: settlePaymentMethod === 'Room' ? settleRoomNumber : undefined,
      guestName: settleTargetTable.guestName,
      discount: Number(settleDiscount) || 0,
      splitDetails: settlePaymentMethod === 'Split' ? splitDetailsStr : undefined
    });

    if (res.success && res.order) {
      setShowSettleModal(false);
      setSelectedOrderForReceipt(res.order);
      printThermalFinalBill({
        billNumber: res.order.orderNumber,
        tableNumber: settleTargetTable.tableNumber,
        section: settleTargetTable.section,
        guestName: res.order.guestName,
        roomNumber: res.order.roomNumber,
        serverName: settleTargetTable.serverName,
        timestamp: res.order.timestamp,
        items: res.order.items,
        subtotal: res.order.subtotal,
        tax: res.order.tax,
        total: res.order.total,
        paymentMethod: settlePaymentMethod,
        discount: Number(settleDiscount) || 0,
        isBar: isBarMode,
        status: 'Settled'
      });
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.7 }
      });
    } else {
      alert(res.error || 'Failed to settle table.');
    }
  };

  // Action: Transfer Table
  const handleConfirmTransferTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferSourceTable || !transferTargetTableId) return;

    const res = await transferTableTab(transferSourceTable.id, transferTargetTableId);
    if (res.success) {
      setShowTransferModal(false);
      setSuccessMessage(`Successfully transferred tab to Table ${tables.find(t => t.id === transferTargetTableId)?.tableNumber}!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
      alert(res.error || 'Failed to transfer table tab.');
    }
  };

  // Action: Submit Direct POS Order (for Walk-In Takeaway or Instant Room Order)
  const handleDirectPlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (posOrderMode === 'Room' && !selectedRoomNumber) {
      alert('Please select an occupied room number');
      return;
    }

    const finalGuestName = posOrderMode === 'Room' 
      ? (activeGuestName || `Room ${selectedRoomNumber}`) 
      : (walkInName.trim() || 'Walk-In Guest');

    await addRestaurantBarOrder({
      type: posOrderMode === 'Room' ? 'Room' : 'WalkIn',
      roomNumber: posOrderMode === 'Room' ? selectedRoomNumber : undefined,
      guestName: finalGuestName,
      items: cart,
      subtotal: cartTotal,
      isBar: isBarMode
    });

    clearCart();
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.8 }
    });
  };

  // Filtered orders for history tab
  const filteredOrders = useMemo(() => {
    return (orders || []).filter(order => {
      const matchesMode = order.isBar === isBarMode;
      const matchesType = historyFilterType === 'all' || order.type === historyFilterType;
      const term = historySearch.toLowerCase().trim();
      const matchesSearch = !term || 
        (order.orderNumber || '').toLowerCase().includes(term) ||
        (order.guestName || '').toLowerCase().includes(term) ||
        (order.roomNumber || '').toLowerCase().includes(term);
      return matchesMode && matchesType && matchesSearch;
    });
  }, [orders, isBarMode, historyFilterType, historySearch]);

  // Helper: Format elapsed seating time
  const getElapsedMinutes = (seatedAt?: string) => {
    if (!seatedAt) return null;
    const diffMs = Date.now() - new Date(seatedAt).getTime();
    const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  };

  return (
    <div className="space-y-4">
      
      {/* Top Banner & Header */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isBarMode ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-600' : 'bg-amber-100 dark:bg-amber-950/40 text-amber-600'}`}>
            {isBarMode ? <Wine className="w-5 h-5" /> : <UtensilsCrossed className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isBarMode ? 'Bar & Lounge POS & Table KOT' : 'Restaurant Dining POS & Table KOT'}
              </h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isBarMode 
                  ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300' 
                  : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
              }`}>
                {isBarMode ? '🍸 Bar Mode' : '🍽️ Dining Mode'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Interactive Table Parking, Multi-Round KOTs, Running Tabs & Direct Room Folio Settlement.
            </p>
          </div>
        </div>

        {/* Global Controls & Mode Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => {
                setIsBarMode(false);
                setSelectedCategory('All');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !isBarMode 
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" /> Dining
            </button>
            <button
              onClick={() => {
                setIsBarMode(true);
                setSelectedCategory('All');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isBarMode 
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Wine className="w-3.5 h-3.5" /> Bar & Lounge
            </button>
          </div>

          {/* View Tab Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveViewTab('tables')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeViewTab === 'tables' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Tables Map ({tables.length})
            </button>
            <button
              onClick={() => setActiveViewTab('pos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeViewTab === 'pos' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" /> POS Terminal {cart.length > 0 && `(${cart.length})`}
            </button>
            <button
              onClick={() => setActiveViewTab('tabs')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeViewTab === 'tabs' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" /> Parked Tabs ({occupiedTables.length})
            </button>
            <button
              onClick={() => setActiveViewTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeViewTab === 'history' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" /> History
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* =========================================================================
          VIEW 1: INTERACTIVE TABLE FLOOR MAP & PARKING MANAGER
          ========================================================================= */}
      {activeViewTab === 'tables' && (
        <div className="space-y-4">
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Tables</p>
                <p className="text-lg font-black text-slate-800 dark:text-white mt-0.5">{tables.length}</p>
              </div>
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600">
                <LayoutGrid className="w-4 h-4" />
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Available Tables</p>
                <p className="text-lg font-black text-emerald-600 mt-0.5">
                  {tables.filter(t => t.status === 'Available').length}
                </p>
              </div>
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-600">
                <Check className="w-4 h-4" />
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider">Occupied / Parked Tabs</p>
                <p className="text-lg font-black text-purple-600 mt-0.5">{occupiedTables.length}</p>
              </div>
              <div className="p-2 bg-purple-50 dark:bg-purple-950/40 rounded-lg text-purple-600">
                <Flame className="w-4 h-4" />
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Running Tab Value</p>
                <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">₹{totalParkedValue.toLocaleString()}</p>
              </div>
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg text-indigo-600">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Section Filter Pills & Add Table Header */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px] mr-1">Floor Section:</span>
              {(['All', 'Main Dining', 'Bar Lounge', 'Outdoor', 'VIP Cabana'] as const).map(sec => (
                <button
                  key={sec}
                  onClick={() => setTableSectionFilter(sec)}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                    tableSectionFilter === sec
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {sec}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-3 text-[11px] font-medium text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Available</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span> Parked Tab / KOT</span>
              </div>
              <button
                type="button"
                onClick={handleOpenAddTable}
                className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm hover:shadow flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Table</span>
              </button>
            </div>
          </div>

          {/* Interactive Table Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredTables.map(table => {
              const isOccupied = table.status === 'Occupied' || (table.runningItems && table.runningItems.length > 0);
              const elapsed = getElapsedMinutes(table.seatedAt);
              const roundsCount = table.kotRounds?.length || 0;
              const totalItemsCount = (table.runningItems || []).reduce((sum, it) => sum + (it.quantity || 1), 0);

              return (
                <div 
                  key={table.id}
                  className={`rounded-2xl border p-4 transition-all hover:shadow-md flex flex-col justify-between ${
                    isOccupied 
                      ? 'bg-gradient-to-b from-purple-50/50 to-white dark:from-purple-950/20 dark:to-slate-900 border-purple-300 dark:border-purple-800' 
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {/* Card Header & Content */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div 
                        onClick={() => isOccupied ? handleOpenTableDetails(table) : handleOpenTableInPOS(table)}
                        className="flex items-center gap-2 cursor-pointer flex-1"
                        title={isOccupied ? "Click to view already bought items & tab details" : "Click to seat guests and start order"}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                          isOccupied 
                            ? 'bg-purple-600 text-white shadow-md' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                          {table.tableNumber}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>Table {table.tableNumber}</span>
                            {table.isBar && <Wine className="w-3 h-3 text-purple-500" />}
                          </h4>
                          <p className="text-[10px] text-slate-400">{table.section} • {table.capacity} Pax</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditTable(table, e)}
                          className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                          title="Edit Table Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!isOccupied && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteTable(table, e)}
                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                            title="Delete Table"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isOccupied 
                            ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800' 
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }`}>
                          {isOccupied ? 'Occupied' : 'Available'}
                        </span>
                      </div>
                    </div>

                    {/* Table Status Details */}
                    {isOccupied ? (
                      <div className="mt-3 p-2.5 bg-white dark:bg-slate-950/80 rounded-xl border border-purple-100 dark:border-purple-900/40 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-medium truncate">
                            👤 {table.guestName || 'Dine-In Guest'} {table.pax ? `(${table.pax}P)` : ''}
                          </span>
                          {elapsed && (
                            <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {elapsed}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {totalItemsCount} bought ({roundsCount} {roundsCount > 1 ? 'rounds' : 'round'})
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                            ₹{(table.total || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 py-4 text-center text-slate-400 text-xs">
                        <p className="text-[11px]">Table is ready for seating</p>
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5">
                    {isOccupied ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenTableDetails(table)}
                          className="py-1.5 px-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-950 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
                          title="View already bought items"
                        >
                          <Eye className="w-3 h-3" /> Items
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenTableInPOS(table)}
                          className="flex-1 py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Round
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenSettleTable(table)}
                          className="py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
                          title="Settle Bill & Release Table"
                        >
                          <Receipt className="w-3 h-3" /> Settle
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenTransferModal(table)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs"
                          title="Transfer Table"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenTableInPOS(table)}
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Take Order / Park Table
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* =========================================================================
          VIEW 2: POS MENU TERMINAL & ORDER BASKET
          ========================================================================= */}
      {activeViewTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* LEFT 7-8 COLS: MENU BROWSER & FILTERS */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Search, Categories & Dietary Controls */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-3">
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={`Search ${isBarMode ? 'liquors, cocktails, beers, mixers...' : 'dishes, starters, biryani, desserts...'}`}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs border dark:border-slate-800 dark:bg-slate-950 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Dietary Toggle */}
                {!isBarMode && (
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                    {(['All', 'Veg', 'Non-Veg'] as const).map(d => (
                      <button
                        key={d}
                        onClick={() => setPosDietaryFilter(d)}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          posDietaryFilter === d 
                            ? d === 'Veg' ? 'bg-emerald-600 text-white shadow-sm' : d === 'Non-Veg' ? 'bg-rose-600 text-white shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        {d === 'Veg' ? '🟢 Veg' : d === 'Non-Veg' ? '🔴 Non-Veg' : 'All'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Horizontal Category Carousel */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-thin">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-bold transition-all ${
                      selectedCategory === cat
                        ? isBarMode
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                          : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

            </div>

            {/* Menu Items Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[620px] overflow-y-auto p-1">
              {filteredMenuItems.map(item => {
                const inCart = cart.find(i => i.menuItemId === item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className={`relative p-3.5 bg-white dark:bg-slate-900 border rounded-2xl cursor-pointer select-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between ${
                      inCart 
                        ? 'border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20' 
                        : 'border-slate-200/60 dark:border-slate-800/60 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1.5 mb-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                          {item.category || (item.isBar ? 'Bar' : 'Kitchen')}
                        </span>
                        {!item.isBar && (
                          <span className={`w-2 h-2 rounded-full shrink-0 ${item.dietary === 'Non-Veg' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                        )}
                      </div>

                      <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-2 leading-tight">
                        {item.name}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                      <span className="font-mono font-extrabold text-xs text-slate-900 dark:text-white">
                        ₹{item.price}
                      </span>
                      {inCart ? (
                        <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold font-mono">
                          {inCart.quantity} in cart
                        </span>
                      ) : (
                        <span className="p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 hover:bg-indigo-600 hover:text-white transition-all">
                          <Plus className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* RIGHT 4-5 COLS: KOT PARKING & ACTIVE ORDER TERMINAL */}
          <div className="lg:col-span-4 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm overflow-hidden min-h-[640px]">
            
            {/* Terminal Top: Order Routing Mode Selector */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200/50 dark:border-slate-800/50 space-y-2.5">
              <div className="grid grid-cols-3 gap-1.5 bg-slate-200/50 dark:bg-slate-900 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPosOrderMode('Table')}
                  className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                    posOrderMode === 'Table' 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" /> Table Dine-In
                </button>
                <button
                  type="button"
                  onClick={() => setPosOrderMode('Room')}
                  className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                    posOrderMode === 'Room' 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Bed className="w-3.5 h-3.5" /> Room
                </button>
                <button
                  type="button"
                  onClick={() => setPosOrderMode('WalkIn')}
                  className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                    posOrderMode === 'WalkIn' 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" /> Takeaway
                </button>
              </div>

              {/* Sub-Target Input based on Destination */}
              {posOrderMode === 'Table' && (
                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-500 text-[11px]">Select Table *</label>
                      <select
                        value={selectedTableId}
                        onChange={e => {
                          const tId = e.target.value;
                          setSelectedTableId(tId);
                          const t = tables.find(tbl => tbl.id === tId);
                          if (t) {
                            setTableGuestName(t.guestName || '');
                            setTablePax(t.pax || t.capacity || 2);
                          }
                        }}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-800 dark:text-white"
                      >
                        <option value="">-- Choose Table --</option>
                        {tables.map(t => (
                          <option key={t.id} value={t.id}>
                            Table {t.tableNumber} ({t.section}) {t.status === 'Occupied' ? '• [Occupied Tab]' : '• Available'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-500 text-[11px]">Covers / Pax</label>
                      <input
                        type="number"
                        min={1}
                        value={tablePax}
                        onChange={e => setTablePax(Number(e.target.value))}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold font-mono"
                        placeholder="2"
                      />
                    </div>
                  </div>

                  {currentSelectedTable && currentSelectedTable.status === 'Occupied' && (
                    <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-950/30 overflow-hidden space-y-1">
                      <div 
                        onClick={() => setShowAlreadyBoughtInPos(!showAlreadyBoughtInPos)}
                        className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-purple-100/60 dark:hover:bg-purple-900/40 transition-all select-none"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                          <span className="font-bold text-xs text-purple-950 dark:text-purple-200">
                            Already Ordered Items ({(currentSelectedTable.runningItems || []).reduce((sum, it) => sum + (it.quantity || 1), 0)} items)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs text-purple-700 dark:text-purple-300">
                            ₹{(currentSelectedTable.total || 0).toLocaleString()}
                          </span>
                          {showAlreadyBoughtInPos ? <ChevronUp className="w-3.5 h-3.5 text-purple-600" /> : <ChevronDown className="w-3.5 h-3.5 text-purple-600" />}
                        </div>
                      </div>

                      {showAlreadyBoughtInPos && (
                        <div className="p-2.5 pt-0 border-t border-purple-100 dark:border-purple-900/40 space-y-2 max-h-48 overflow-y-auto">
                          {currentSelectedTable.kotRounds && currentSelectedTable.kotRounds.length > 0 ? (
                            currentSelectedTable.kotRounds.map((round, rIdx) => (
                              <div key={rIdx} className="bg-white dark:bg-slate-900 rounded-lg p-2 border border-purple-100 dark:border-purple-900/40 text-[11px] space-y-1">
                                <div className="flex justify-between font-bold text-[10px] text-purple-600 dark:text-purple-400 border-b border-slate-100 dark:border-slate-800 pb-1">
                                  <span>ROUND {round.roundNumber} ({round.kotNumber})</span>
                                  <span>{new Date(round.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="space-y-1 pt-0.5">
                                  {round.items.map((it, iIdx) => (
                                    <div key={iIdx} className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                                      <span className="truncate pr-2">
                                        <strong className="text-slate-900 dark:text-white font-mono">{it.quantity}x</strong> {it.name}
                                        {it.notes && <span className="text-[10px] text-indigo-500 italic block pl-2">↳ {it.notes}</span>}
                                      </span>
                                      <span className="font-mono font-semibold text-slate-900 dark:text-white shrink-0">₹{it.price * it.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))
                          ) : (
                            (currentSelectedTable.runningItems || []).map((it, idx) => (
                              <div key={idx} className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                                <span>{it.quantity}x {it.name}</span>
                                <span className="font-mono">₹{it.price * it.quantity}</span>
                              </div>
                            ))
                          )}

                          <div className="flex items-center justify-between pt-1 border-t border-purple-100 dark:border-purple-900/40 text-[11px]">
                            <button
                              type="button"
                              onClick={() => handleOpenTableDetails(currentSelectedTable)}
                              className="text-purple-700 dark:text-purple-300 font-bold hover:underline flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" /> Full Tab Details
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenSettleTable(currentSelectedTable)}
                              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
                            >
                              <Receipt className="w-3 h-3" /> Settle Tab
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {posOrderMode === 'Room' && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 text-[11px]">Select Occupied Room *</label>
                    <select
                      value={selectedRoomNumber}
                      onChange={e => setSelectedRoomNumber(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
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
                    <label className="font-bold text-slate-500 text-[11px]">Guest Name</label>
                    <input
                      type="text"
                      disabled
                      value={activeGuestName}
                      className="w-full p-2 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 font-bold"
                      placeholder="Auto-filled from room"
                    />
                  </div>
                </div>
              )}

              {posOrderMode === 'WalkIn' && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 text-[11px]">Guest Name</label>
                    <input
                      type="text"
                      value={walkInName}
                      onChange={e => setWalkInName(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
                      placeholder="e.g. Ramesh"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 text-[11px]">Phone (Optional)</label>
                    <input
                      type="tel"
                      value={walkInPhone}
                      onChange={e => setWalkInPhone(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono"
                      placeholder="+91..."
                    />
                  </div>
                </div>
              )}

            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[300px]">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />
                  {currentSelectedTable?.status === 'Occupied' 
                    ? `New Items for Next Round (Round ${(currentSelectedTable.kotRounds?.length || 0) + 1})`
                    : 'New Basket Items'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{cart.length} item{cart.length !== 1 ? 's' : ''}</span>
              </div>

              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-400 opacity-60">
                  <span className="text-3xl mb-1 block">{isBarMode ? '🍷' : '🍽️'}</span>
                  <p className="text-xs font-bold uppercase">Basket is Empty</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Click menu cards on the left to add items.</p>
                </div>
              ) : (
                cart.map(item => (
                  <div 
                    key={item.menuItemId + (item.notes || '')}
                    className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-800/40 rounded-xl flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{item.name}</h5>
                      <p className="text-[10px] text-slate-400 font-mono">₹{item.price} each</p>
                      {item.notes && (
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 italic">📝 {item.notes}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-0.5 rounded-lg">
                        <button 
                          onClick={() => removeFromCart(item.menuItemId, item.notes)} 
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold font-mono text-slate-800 dark:text-slate-100">
                          {item.quantity}
                        </span>
                        <button 
                          onClick={() => {
                            const match = menuItems.find(i => i.id === item.menuItemId);
                            if (match) addToCart(match, item.notes);
                          }} 
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="w-14 text-right font-mono font-bold text-xs text-slate-900 dark:text-white">
                        ₹{item.price * item.quantity}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer: KOT Instructions, Financial Breakdown & Actions */}
            {cart.length > 0 && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200/50 dark:border-slate-800/50 space-y-3">
                
                {/* Special Instructions / Chef Note */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Kitchen / Bar Special Notes
                  </label>
                  <input
                    type="text"
                    value={kotInstructions}
                    onChange={e => setKotInstructions(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                    placeholder="e.g. Less spicy, No onions, Extra ice..."
                  />
                </div>

                {/* Inclusive GST Calculations */}
                <div className="space-y-1 font-mono text-xs pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                  <div className="flex justify-between text-slate-500">
                    <span>Taxable Base:</span>
                    <span>₹{taxableSubtotal}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>GST Taxes ({taxRate}% Incl.):</span>
                    <span>₹{taxAmount}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800">
                    <span className="font-sans">Order Total (Gross):</span>
                    <span className="text-indigo-600 dark:text-indigo-400">₹{cartTotal}</span>
                  </div>
                </div>

                {/* Main Action Buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={clearCart}
                    className="p-2 border border-slate-200 dark:border-slate-800 text-slate-500 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all text-xs"
                    title="Clear Basket"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {posOrderMode === 'Table' ? (
                    <button
                      type="button"
                      onClick={handleParkTableKot}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all text-xs"
                    >
                      <Printer className="w-4 h-4" />
                      Park Table & Print KOT {currentSelectedTable ? `(Round ${(currentSelectedTable.kotRounds?.length || 0) + 1})` : ''}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleDirectPlaceOrder}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all text-xs"
                    >
                      <CheckSquare className="w-4 h-4" />
                      {posOrderMode === 'Room' ? `Post to Room ${selectedRoomNumber}` : 'Record Settlement'}
                    </button>
                  )}
                </div>

              </div>
            )}

          </div>

        </div>
      )}

      {/* =========================================================================
          VIEW 3: RUNNING TABS & PARKED BILLS MANAGER
          ========================================================================= */}
      {activeViewTab === 'tabs' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-purple-600" />
                <span>Active Parked Table Tabs ({occupiedTables.length} Open Tabs)</span>
              </h3>
              <p className="text-xs text-slate-500">
                View running KOT rounds, add next rounds, transfer tables, or print itemized guest check.
              </p>
            </div>

            <button
              onClick={() => setActiveViewTab('pos')}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> New Order / KOT
            </button>
          </div>

          {occupiedTables.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-2">
              <span className="text-4xl">🍽️</span>
              <h4 className="text-sm font-bold text-slate-800 dark:text-white">No Active Parked Tabs</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                All tables are currently free. Go to the Tables Floor Map or POS to seat guests and generate KOTs.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {occupiedTables.map(table => {
                const elapsed = getElapsedMinutes(table.seatedAt);
                return (
                  <div 
                    key={table.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-purple-200 dark:border-purple-850 p-4 space-y-3 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-purple-600 text-white font-black text-sm flex items-center justify-center">
                            {table.tableNumber}
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                              Table {table.tableNumber} ({table.section})
                            </h4>
                            <p className="text-[10px] text-slate-400">
                              👤 {table.guestName || 'Guest'} • {table.pax || table.capacity} Pax
                            </p>
                          </div>
                        </div>

                        {elapsed && (
                          <span className="text-[10px] font-mono font-bold bg-purple-50 dark:bg-purple-950 text-purple-600 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {elapsed}
                          </span>
                        )}
                      </div>

                      {/* Running Items List */}
                      <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 max-h-48 overflow-y-auto">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <span>Running Items ({table.runningItems?.length || 0})</span>
                          <span>Qty • Amount</span>
                        </div>

                        {(table.runningItems || []).map((it, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs font-medium">
                            <span className="text-slate-800 dark:text-slate-200 truncate pr-2">
                              {it.name} {it.notes && <span className="text-[10px] text-indigo-500">({it.notes})</span>}
                            </span>
                            <span className="font-mono text-slate-900 dark:text-white shrink-0">
                              {it.quantity}x ₹{it.price * it.quantity}
                            </span>
                          </div>
                        ))}

                        {/* KOT Rounds Summary */}
                        {table.kotRounds && table.kotRounds.length > 0 && (
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 space-y-1">
                            <p className="font-bold uppercase text-purple-600 dark:text-purple-400">
                              KOT Rounds ({table.kotRounds.length}):
                            </p>
                            {table.kotRounds.map((r, i) => (
                              <div key={i} className="flex justify-between items-center py-0.5 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 px-1 rounded">
                                <div>
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">Round {r.roundNumber}</span>{' '}
                                  <span className="font-mono text-slate-400">({r.kotNumber})</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span>{new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      printThermalKotSlip({
                                        kotNumber: r.kotNumber,
                                        roundNumber: r.roundNumber,
                                        tableNumber: table.tableNumber,
                                        section: table.section,
                                        serverName: table.serverName,
                                        timestamp: r.timestamp,
                                        instructions: r.instructions,
                                        items: r.items,
                                        isBar: isBarMode
                                      });
                                    }}
                                    className="p-1 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-400"
                                    title="Print this KOT Slip on Thermal Printer"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Financial Total & Actions */}
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-xs text-slate-500 font-sans font-bold">Gross Tab Total:</span>
                        <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                          ₹{(table.total || 0).toLocaleString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5 text-xs font-bold pt-1">
                        <button
                          type="button"
                          onClick={() => handleOpenTableDetails(table)}
                          className="py-1.5 px-1 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 flex items-center justify-center gap-1 text-[11px]"
                          title="View all bought items"
                        >
                          <Eye className="w-3 h-3" /> Items
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            printThermalFinalBill({
                              billNumber: `BILL-${table.tableNumber}-${Date.now().toString().slice(-4)}`,
                              tableNumber: table.tableNumber,
                              section: table.section,
                              guestName: table.guestName,
                              serverName: table.serverName,
                              timestamp: table.seatedAt || new Date().toISOString(),
                              items: table.runningItems || [],
                              subtotal: table.subtotal || 0,
                              tax: table.tax || 0,
                              total: table.total || 0,
                              status: 'PreBill',
                              isBar: isBarMode
                            });
                          }}
                          className="py-1.5 px-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg flex items-center justify-center gap-1 text-[11px]"
                          title="Print Thermal Guest Bill Check"
                        >
                          <Printer className="w-3 h-3" /> Bill
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenTableInPOS(table)}
                          className="py-1.5 px-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-1 text-[11px]"
                          title="Add Next KOT Round"
                        >
                          <Plus className="w-3 h-3" /> Next KOT
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenSettleTable(table)}
                          className="py-1.5 px-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-1 text-[11px]"
                          title="Settle Bill & Release Table"
                        >
                          <Receipt className="w-3 h-3" /> Settle
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* =========================================================================
          VIEW 4: SETTLED ORDERS & RECEIPT HISTORY
          ========================================================================= */}
      {activeViewTab === 'history' && (
        <div className="space-y-4">
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
                {(['all', 'Room', 'WalkIn'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setHistoryFilterType(f)}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      historyFilterType === f 
                        ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {f === 'all' ? 'All Orders' : f === 'Room' ? 'Room Folio' : 'Direct / Walk-In'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 uppercase font-bold border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Order #</th>
                    <th className="p-3.5">Destination / Guest</th>
                    <th className="p-3.5">Date & Time</th>
                    <th className="p-3.5">Items Ordered</th>
                    <th className="p-3.5">Taxable Base</th>
                    <th className="p-3.5">GST Tax</th>
                    <th className="p-3.5 font-bold text-slate-900 dark:text-white">Total Billed</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        No settled orders found for this view.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map(order => (
                      <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/50 font-medium">
                        <td className="p-3.5 font-bold font-mono text-indigo-600 dark:text-indigo-400">
                          {order.orderNumber}
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{order.guestName}</div>
                          {order.roomNumber && (
                            <span className="text-[10px] text-purple-600 bg-purple-50 dark:bg-purple-950 px-1.5 py-0.5 rounded">
                              Room {order.roomNumber}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-400 font-mono">
                          {new Date(order.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                          {order.items.map(it => `${it.name} (${it.quantity})`).join(', ')}
                        </td>
                        <td className="p-3.5 font-mono text-slate-500">
                          ₹{order.subtotal || 0}
                        </td>
                        <td className="p-3.5 font-mono text-slate-500">
                          ₹{order.tax || 0}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">
                          ₹{order.total || 0}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            order.status === 'PostedToRoom'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => setSelectedOrderForReceipt(order)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-indigo-600 transition-all"
                            title="Print Tax Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 0: TABLE RUNNING TAB & ALREADY BOUGHT ITEMS DETAILS
          ========================================================================= */}
      {showTableDetailsModal && activeTableDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white font-black text-base flex items-center justify-center shadow-md">
                  {activeTableDetails.tableNumber}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                      Table {activeTableDetails.tableNumber} ({activeTableDetails.section})
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                      Active Parked Tab
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    👤 {activeTableDetails.guestName || 'Dine-In Guest'} • {activeTableDetails.pax || activeTableDetails.capacity} Pax • Server: {activeTableDetails.serverName || 'Captain'}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setShowTableDetailsModal(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              
              {/* Summary Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-purple-50/60 dark:bg-purple-950/40 rounded-xl border border-purple-100 dark:border-purple-900/40">
                  <span className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400 tracking-wider">Gross Tab Total</span>
                  <p className="text-base font-black font-mono text-purple-950 dark:text-purple-100 mt-0.5">
                    ₹{(activeTableDetails.total || 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Total Items Bought</span>
                  <p className="text-base font-black font-mono text-slate-800 dark:text-white mt-0.5">
                    {(activeTableDetails.runningItems || []).reduce((sum, it) => sum + (it.quantity || 1), 0)} items
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">KOT Rounds</span>
                  <p className="text-base font-black font-mono text-slate-800 dark:text-white mt-0.5">
                    {activeTableDetails.kotRounds?.length || 1} {activeTableDetails.kotRounds?.length === 1 ? 'Round' : 'Rounds'}
                  </p>
                </div>
              </div>

              {/* View Breakdown Tabs */}
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTableDetailsTab('rounds')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      tableDetailsTab === 'rounds'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    Grouped by KOT Rounds ({activeTableDetails.kotRounds?.length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTableDetailsTab('consolidated')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      tableDetailsTab === 'consolidated'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    All Items Consolidated ({(activeTableDetails.runningItems || []).length})
                  </button>
                </div>
                <span className="text-[10px] text-slate-400">
                  Seated: {activeTableDetails.seatedAt ? new Date(activeTableDetails.seatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                </span>
              </div>

              {/* Items Content: By Rounds */}
              {tableDetailsTab === 'rounds' && (
                <div className="space-y-3">
                  {(!activeTableDetails.kotRounds || activeTableDetails.kotRounds.length === 0) ? (
                    <div className="p-6 text-center text-slate-400 bg-slate-50 dark:bg-slate-950 rounded-xl">
                      No KOT rounds recorded yet.
                    </div>
                  ) : (
                    activeTableDetails.kotRounds.map((round, rIdx) => (
                      <div key={rIdx} className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                        <div className="p-2.5 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-purple-700 dark:text-purple-300">
                              ROUND {round.roundNumber}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500">
                              ({round.kotNumber})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-slate-400">
                              {new Date(round.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                printThermalKotSlip({
                                  kotNumber: round.kotNumber,
                                  roundNumber: round.roundNumber,
                                  tableNumber: activeTableDetails.tableNumber,
                                  section: activeTableDetails.section,
                                  serverName: activeTableDetails.serverName,
                                  timestamp: round.timestamp,
                                  instructions: round.instructions,
                                  items: round.items,
                                  isBar: isBarMode
                                });
                              }}
                              className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 flex items-center gap-1 shadow-sm"
                              title="Print this KOT Slip on Thermal Printer"
                            >
                              <Printer className="w-3 h-3" /> Print KOT
                            </button>
                          </div>
                        </div>

                        <div className="p-3 space-y-2">
                          {round.items.map((it, iIdx) => (
                            <div key={iIdx} className="flex items-start justify-between text-xs">
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  <span className="font-mono text-purple-600 dark:text-purple-400 mr-1.5">[{it.quantity}]</span>
                                  {it.name}
                                </span>
                                {it.notes && (
                                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 italic pl-5">↳ {it.notes}</p>
                                )}
                              </div>
                              <span className="font-mono font-bold text-slate-900 dark:text-white">
                                ₹{it.price * it.quantity}
                              </span>
                            </div>
                          ))}

                          {round.instructions && (
                            <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800 text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                              📝 Notes: {round.instructions}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Items Content: Consolidated */}
              {tableDetailsTab === 'consolidated' && (
                <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800 p-3 space-y-2 max-h-72 overflow-y-auto font-mono text-xs">
                  <div className="flex justify-between font-bold text-slate-400 uppercase text-[10px] pb-1 border-b border-slate-200 dark:border-slate-800">
                    <span>Qty & Description</span>
                    <span>Total</span>
                  </div>
                  {(activeTableDetails.runningItems || []).map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-850">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900 dark:text-white">
                          [{it.quantity}] {it.name}
                        </span>
                        <p className="text-[10px] text-slate-400 font-normal font-sans">₹{it.price} each</p>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">₹{it.price * it.quantity}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Financial Calculation Bar */}
              <div className="p-3.5 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-800 font-mono text-xs space-y-1">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Taxable Base Subtotal:</span>
                  <span>₹{activeTableDetails.subtotal || 0}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400 text-[11px]">
                  <span>GST Tax (Inclusive running):</span>
                  <span>₹{activeTableDetails.tax || 0}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800">
                  <span className="font-sans">Grand Total:</span>
                  <span className="text-purple-600 dark:text-purple-400">₹{(activeTableDetails.total || 0).toLocaleString()}</span>
                </div>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowTableDetailsModal(false)}
                className="px-4 py-2 border dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                Close
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    printThermalFinalBill({
                      billNumber: `BILL-${activeTableDetails.tableNumber}-${Date.now().toString().slice(-4)}`,
                      tableNumber: activeTableDetails.tableNumber,
                      section: activeTableDetails.section,
                      guestName: activeTableDetails.guestName,
                      serverName: activeTableDetails.serverName,
                      timestamp: activeTableDetails.seatedAt || new Date().toISOString(),
                      items: activeTableDetails.runningItems || [],
                      subtotal: activeTableDetails.subtotal || 0,
                      tax: activeTableDetails.tax || 0,
                      total: activeTableDetails.total || 0,
                      status: 'PreBill',
                      isBar: isBarMode
                    });
                  }}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
                  title="Print 80mm Thermal Bill / Guest Check"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Bill (Thermal)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const tbl = activeTableDetails;
                    setShowTableDetailsModal(false);
                    handleOpenTransferModal(tbl);
                  }}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const tbl = activeTableDetails;
                    setShowTableDetailsModal(false);
                    handleOpenTableInPOS(tbl);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Next Round
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const tbl = activeTableDetails;
                    setShowTableDetailsModal(false);
                    handleOpenSettleTable(tbl);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Receipt className="w-3.5 h-3.5" /> Settle Bill
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: KITCHEN / BAR ORDER TICKET (KOT) THERMAL PRINT SLIP
          ========================================================================= */}
      {showKotPrintModal && activeKotForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn print:p-0 print:bg-white print:static print:backdrop-blur-none">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-4 p-5 print:p-0 print:border-none print:shadow-none print:bg-white print:max-w-none">
            
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800 print:hidden">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-indigo-600" />
                <span>Kitchen Order Ticket (Thermal 80mm Slip)</span>
              </h3>
              <button 
                onClick={() => setShowKotPrintModal(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable 80mm Thermal KOT Slip */}
            <div 
              id="printable-kot-slip" 
              className="printable-kot-slip bg-white text-black p-4 rounded-lg font-mono text-xs border border-dashed border-neutral-300 shadow-sm max-w-[340px] mx-auto select-none print:max-w-[80mm] print:border-none print:p-0 print:shadow-none"
              style={{ fontFamily: "'Courier New', Courier, 'Lucida Console', Monaco, monospace", color: '#000000' }}
            >
              {/* Thermal Slip Top Header */}
              <div className="text-center pb-2 border-b-2 border-dashed border-black space-y-1">
                <div className="text-xs font-black uppercase tracking-wider text-black">
                  {settings.name || 'HOTEL SUBRA GRAND'}
                </div>
                <div className="text-xs font-black tracking-wider bg-black text-white px-2 py-0.5 inline-block rounded-sm">
                  {activeKotForPrint.isBar ? '*** BAR ORDER TICKET (BOT) ***' : '*** KITCHEN ORDER TICKET (KOT) ***'}
                </div>
              </div>

              {/* Ticket & Table Meta */}
              <div className="py-2 border-b border-dashed border-black text-[11px] leading-tight space-y-1.5 text-black">
                <div className="flex justify-between font-black">
                  <span>KOT #: {activeKotForPrint.kotNumber}</span>
                  <span className="bg-neutral-200 text-black px-1 font-black">ROUND {activeKotForPrint.roundNumber}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>DATE: {new Date(activeKotForPrint.timestamp).toLocaleDateString('en-GB')}</span>
                  <span>TIME: {new Date(activeKotForPrint.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
                
                {/* Prominent Table Banner */}
                <div className="pt-1.5 pb-1 border-t border-b border-dotted border-black flex items-center justify-between">
                  <span className="font-bold text-[11px] uppercase">TABLE:</span>
                  <span className="text-base font-black tracking-wide">
                    Table {activeKotForPrint.tableNumber} ({activeKotForPrint.section})
                  </span>
                </div>

                <div className="flex justify-between text-[10px]">
                  <span>SERVER: <strong className="font-black uppercase">{activeKotForPrint.serverName || 'Captain'}</strong></span>
                  <span>TYPE: <strong className="font-black uppercase">DINE-IN</strong></span>
                </div>
              </div>

              {/* Order Items List */}
              <div className="py-2 border-b border-dashed border-black text-black">
                <div className="flex justify-between font-black text-[11px] uppercase pb-1 border-b border-black">
                  <span>[QTY]  ITEM DESCRIPTION</span>
                </div>
                <div className="space-y-2 pt-2">
                  {activeKotForPrint.items.map((it, idx) => (
                    <div key={idx} className="leading-snug">
                      <div className="flex items-start">
                        <span className="font-black text-xs font-mono inline-block min-w-[32px]">[ {it.quantity} ]</span>
                        <span className="font-bold text-xs uppercase flex-1">{it.name}</span>
                      </div>
                      {it.notes && (
                        <div className="pl-8 text-[10px] font-bold text-neutral-800 italic">
                          * Prep: {it.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Qty / Items summary */}
              <div className="py-1.5 border-b border-dashed border-black flex justify-between text-[11px] font-black text-black">
                <span>TOTAL ITEMS: {activeKotForPrint.items.length}</span>
                <span>TOTAL QTY: {activeKotForPrint.items.reduce((acc, curr) => acc + (curr.quantity || 1), 0)}</span>
              </div>

              {/* Special Instructions */}
              {activeKotForPrint.instructions && (
                <div className="py-2 border-b border-dashed border-black text-[11px] space-y-1 text-black">
                  <div className="font-black uppercase tracking-wider">CHEF / BAR NOTES:</div>
                  <div className="font-bold p-1.5 bg-neutral-100 border border-black rounded-sm">
                    &gt;&gt; {activeKotForPrint.instructions} &lt;&lt;
                  </div>
                </div>
              )}

              {/* Slip Footer Cut Line */}
              <div className="pt-2 text-center text-[10px] font-bold tracking-wider space-y-0.5 text-black">
                <div>================================</div>
                <div>*** {activeKotForPrint.isBar ? 'BAR DISPENSE COPY' : 'KITCHEN DISPLAY COPY'} ***</div>
                <div>================================</div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 justify-end pt-2 print:hidden">
              <button
                type="button"
                onClick={() => setShowKotPrintModal(false)}
                className="px-4 py-2 border dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => printThermalKotSlip(activeKotForPrint)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all"
              >
                <Printer className="w-4 h-4" /> Print Thermal KOT
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: TABLE BILL SETTLEMENT & ROOM POSTING
          ========================================================================= */}
      {showSettleModal && settleTargetTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden p-5 space-y-4">
            
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>Settle Table Bill & Release (Table {settleTargetTable.tableNumber})</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  {settleTargetTable.section} • {settleTargetTable.guestName || 'Dine-In Guest'} • {settleTargetTable.kotRounds?.length || 0} KOT Rounds
                </p>
              </div>
              <button 
                onClick={() => setShowSettleModal(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSettleTable} className="space-y-4 text-xs">
              
              {/* Itemized Running Summary */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/50 rounded-xl space-y-2 max-h-40 overflow-y-auto font-mono">
                {(settleTargetTable.runningItems || []).map((it, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="truncate pr-2">{it.name} x{it.quantity}</span>
                    <span className="font-bold shrink-0">₹{it.price * it.quantity}</span>
                  </div>
                ))}
              </div>

              {/* Financial Calculations (GST Inclusive) */}
              <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-800/50 rounded-xl space-y-1.5 font-mono text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Base Value:</span>
                  <span>₹{settleTargetTable.subtotal}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>GST Taxes (Inclusive):</span>
                  <span>₹{settleTargetTable.tax}</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-1 border-t border-indigo-200 dark:border-indigo-800 text-slate-950 dark:text-white">
                  <span>Total Gross Folio:</span>
                  <span className="text-indigo-600 dark:text-indigo-400">₹{settleTargetTable.total}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="font-bold text-slate-500 block">Select Settlement Mode *</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['Cash', 'Card', 'UPI', 'Room'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSettlePaymentMethod(mode)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        settlePaymentMethod === mode
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {mode === 'Room' ? '🏨 Post to Room' : mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* If Room is selected */}
              {settlePaymentMethod === 'Room' && (
                <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl space-y-1.5">
                  <label className="font-bold text-purple-900 dark:text-purple-200 block text-xs">
                    Choose Occupied Room to Charge *
                  </label>
                  <select
                    required
                    value={settleRoomNumber}
                    onChange={e => setSettleRoomNumber(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-lg font-bold"
                  >
                    <option value="">-- Select Room Number --</option>
                    {activeOccupiedRooms.map(r => (
                      <option key={r.id} value={r.roomNumber}>
                        Room {r.roomNumber} ({r.guestName} • Floor {r.floor})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="px-4 py-2 border dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
                >
                  <CheckSquare className="w-4 h-4" /> Settle & Clear Table
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: TABLE TRANSFER TAB
          ========================================================================= */}
      {showTransferModal && transferSourceTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden p-5 space-y-4">
            
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                <span>Transfer Table Tab</span>
              </h3>
              <button 
                onClick={() => setShowTransferModal(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmTransferTable} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">From Active Table:</span>
                <p className="font-bold text-sm text-slate-900 dark:text-white">
                  Table {transferSourceTable.tableNumber} ({transferSourceTable.section} • ₹{transferSourceTable.total})
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-500 block">Transfer to Destination Table *</label>
                <select
                  required
                  value={transferTargetTableId}
                  onChange={e => setTransferTargetTableId(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                >
                  <option value="">-- Choose Target Table --</option>
                  {tables.filter(t => t.id !== transferSourceTable.id && t.status === 'Available').map(t => (
                    <option key={t.id} value={t.id}>
                      Table {t.tableNumber} ({t.section} • {t.capacity} Pax)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 border dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!transferTargetTableId}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: SETTLED ORDER RECEIPT PRINT PREVIEW
          ========================================================================= */}
      {selectedOrderForReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 font-mono text-xs">
            
            <div className="flex justify-between items-center border-b pb-2 border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-slate-800 dark:text-white font-sans">Settlement Receipt</h4>
              <button 
                onClick={() => setSelectedOrderForReceipt(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 dark:border-slate-700 pb-2">
              <h3 className="font-extrabold text-sm uppercase">{settings.name || 'HotelVista'}</h3>
              <p className="text-[9px] text-slate-500">{settings.address}</p>
              <p className="text-[9px] text-slate-500 font-bold">GSTIN: {settings.gstNumber}</p>
              <p className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 inline-block px-2 py-0.5 rounded mt-1">
                Order #{selectedOrderForReceipt.orderNumber}
              </p>
            </div>

            <div className="text-[10px] space-y-0.5 border-b border-dashed border-slate-300 dark:border-slate-700 pb-2">
              <div className="flex justify-between">
                <span>Guest:</span>
                <strong>{selectedOrderForReceipt.guestName}</strong>
              </div>
              {selectedOrderForReceipt.roomNumber && (
                <div className="flex justify-between">
                  <span>Room:</span>
                  <strong>Room {selectedOrderForReceipt.roomNumber}</strong>
                </div>
              )}
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date(selectedOrderForReceipt.timestamp).toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-1 py-1 border-b border-dashed border-slate-300 dark:border-slate-700 text-[10px]">
              {selectedOrderForReceipt.items.map((it, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{it.name} x{it.quantity}</span>
                  <span>₹{it.price * it.quantity}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span>TAXABLE VALUE:</span>
                <span>₹{selectedOrderForReceipt.subtotal}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>GST TAX (INCL.):</span>
                <span>₹{selectedOrderForReceipt.tax}</span>
              </div>
              <div className="flex justify-between font-extrabold text-sm border-t border-slate-200 dark:border-slate-800 pt-1 text-slate-950 dark:text-white">
                <span>TOTAL SETTLED:</span>
                <span>₹{selectedOrderForReceipt.total}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedOrderForReceipt(null)}
                className="flex-1 py-2 border dark:border-slate-800 rounded-xl font-bold font-sans text-slate-500"
              >
                Close
              </button>
              <button
                onClick={() => printThermalFinalBill({
                  billNumber: selectedOrderForReceipt.orderNumber,
                  guestName: selectedOrderForReceipt.guestName,
                  roomNumber: selectedOrderForReceipt.roomNumber,
                  timestamp: selectedOrderForReceipt.timestamp,
                  items: selectedOrderForReceipt.items,
                  subtotal: selectedOrderForReceipt.subtotal,
                  tax: selectedOrderForReceipt.tax,
                  total: selectedOrderForReceipt.total,
                  paymentMethod: selectedOrderForReceipt.status === 'PostedToRoom' ? 'Room' : 'Settled',
                  status: 'Settled',
                  isBar: selectedOrderForReceipt.isBar
                })}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold font-sans flex items-center justify-center gap-1 shadow-md transition-all"
              >
                <Printer className="w-3.5 h-3.5" /> Print Thermal Receipt
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: ADD / EDIT RESTAURANT OR BAR TABLE
          ========================================================================= */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden p-5 space-y-4">
            
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 rounded-xl">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {editingTable ? `Edit Table ${editingTable.tableNumber}` : 'Add New Dining / Bar Table'}
                  </h3>
                  <p className="text-[10px] text-slate-400">Configure floor location, capacity, and service type</p>
                </div>
              </div>
              <button 
                onClick={() => setShowTableModal(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {tableFormError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-xl text-rose-600 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{tableFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveTable} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 block">Table Number / Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. T-1, B-4, VIP-2"
                    value={tableFormData.tableNumber}
                    onChange={e => setTableFormData(prev => ({ ...prev, tableNumber: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500 block">Seating Capacity (Pax) *</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={tableFormData.capacity}
                    onChange={e => setTableFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 1 }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500 block">Floor / Dining Section *</label>
                <select
                  value={tableFormData.section}
                  onChange={e => setTableFormData(prev => ({ ...prev, section: e.target.value as any }))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                >
                  <option value="Main Dining">Main Dining</option>
                  <option value="Bar Lounge">Bar Lounge</option>
                  <option value="Outdoor">Outdoor / Garden</option>
                  <option value="VIP Cabana">VIP Cabana / AC Section</option>
                </select>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Bar Counter / High Top</span>
                  <span className="text-[10px] text-slate-400">Mark as bar-specific table with cocktail focus</span>
                </div>
                <input
                  type="checkbox"
                  checked={tableFormData.isBar}
                  onChange={e => setTableFormData(prev => ({ ...prev, isBar: e.target.checked }))}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                {editingTable ? (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteTable(editingTable, e)}
                    className="px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl font-bold transition-all flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                ) : <div />}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTableModal(false)}
                    className="px-4 py-2 border dark:border-slate-800 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    {editingTable ? 'Update Table' : 'Create Table'}
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
