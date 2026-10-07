import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, socket } from '../api';

// ==========================================
// TYPES DEFINITIONS
// ==========================================

export type UserRole = 'super_admin' | 'admin' | 'reception' | 'restaurant' | 'bar' | 'store_manager';

export interface TenantMenuDefinition {
  id: string;
  label: string;
  category: 'Core' | 'Operations' | 'F&B' | 'Services' | 'Events' | 'Inventory' | 'Finance' | 'Administration' | 'Security';
  description: string;
}

export const ALL_TENANT_MENUS: TenantMenuDefinition[] = [
  { id: 'dashboard', label: 'Dashboard', category: 'Core', description: 'Overview KPI metrics, occupancy & recent activities' },
  { id: 'rooms', label: 'Room Management', category: 'Operations', description: 'Live room rack, check-in, checkout & housekeeping' },
  { id: 'prebookings', label: 'Pre Bookings', category: 'Operations', description: 'Advance room reservations & guest deposits' },
  { id: 'menu_items', label: 'Menu Items', category: 'F&B', description: 'Digital menu catalog, Bar/Restaurant switch, dietary & combo items' },
  { id: 'restaurant', label: 'Restaurant POS', category: 'F&B', description: 'Dining POS table orders & room charge billing' },
  { id: 'bar', label: 'Bar POS', category: 'F&B', description: 'Liquor / Bar POS orders & bottle dispensing' },
  { id: 'laundry', label: 'Laundry Service', category: 'Services', description: 'Guest garment laundry tracking & express service' },
  { id: 'hall', label: 'Party Hall', category: 'Events', description: 'Banquet hall reservations, sound, catering & slots' },
  { id: 'stock', label: 'Stock / Inventory', category: 'Inventory', description: 'SKU tracking, reorder thresholds & purchase logs' },
  { id: 'billing', label: 'Unified Billing', category: 'Finance', description: 'Consolidated folio checkout, invoices & settlements' },
  { id: 'reports', label: 'Reports', category: 'Finance', description: 'Sales, collection summaries & tax reports' },
  { id: 'settings', label: 'Settings', category: 'Administration', description: 'Property details, tax rates & invoice prefixes' },
  { id: 'audit', label: 'Audit Log', category: 'Security', description: 'Security trails, user actions & modification logs' }
];

export const DEFAULT_ENABLED_MENUS: string[] = ALL_TENANT_MENUS.map(m => m.id);

export interface TenantAccount {
  id: string;
  slug: string;
  name: string;
  email: string;
  phone: string;
  gstNumber: string;
  subdomain: string;
  currency: string;
  tier: 'Boutique' | 'Standard ERP' | 'Enterprise Multi-Property';
  status: 'Active' | 'Provisioning' | 'Suspended';
  createdAt: string;
  maxRooms: number;
  adminEmail: string;
  enabledMenus?: string[];
}

export type RoomCategory = 'Standard' | 'Premium' | 'Semi Premium' | 'Suite' | 'Family Suite' | 'Dormitory';
export type RoomStatus = 'Available' | 'Occupied' | 'Reserved' | 'Cleaning' | 'Maintenance';

export interface Room {
  id: string;
  roomNumber: string;
  category: RoomCategory;
  floor: number;
  price: number;
  status: RoomStatus;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  guestAddress?: string;
  guestIdProof?: string;
  gstNumber?: string;
  checkInDate?: string;
  checkOutDate?: string;
  noOfGuests?: number;
  advancePaid?: number;
  restaurantCharges: number;
  barCharges: number;
  laundryCharges: number;
  hallCharges: number;
  otherCharges: number;
}

export interface PreBooking {
  id: string;
  guestName: string;
  phone: string;
  email: string;
  address: string;
  idProof: string;
  gstNumber?: string;
  roomCategory: RoomCategory;
  roomNumber?: string;
  bookingDate: string;
  checkInDate: string;
  checkOutDate: string;
  noOfGuests: number;
  advancePaid: number;
  specialRequests?: string;
  status: 'Pending' | 'Confirmed' | 'CheckedIn' | 'Cancelled';
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  isBar: boolean;
  isAvailable: boolean;
  imageUrl?: string;
  dietary?: 'Veg' | 'Non-Veg' | 'Drinks';
  isCombo?: boolean;
  description?: string;
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  type: 'WalkIn' | 'Room';
  roomNumber?: string;
  guestName?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'Pending' | 'Paid' | 'PostedToRoom';
  isBar: boolean;
  timestamp: string;
}

export interface LaundryOrder {
  id: string;
  orderNumber: string;
  roomNumber: string;
  guestName: string;
  items: {
    itemType: 'Clothes' | 'Blanket' | 'Bedsheet' | 'Iron Only' | 'Dry Clean';
    quantity: number;
    price: number;
  }[];
  isExpress: boolean;
  totalPrice: number;
  status: 'Pending' | 'Delivered' | 'Completed';
  timestamp: string;
}

export interface HallBooking {
  id: string;
  bookingNumber: string;
  hallType: 'Meeting Room' | 'Conference Hall' | 'Banquet Hall' | 'Marriage Hall';
  guestName: string;
  phone: string;
  date: string;
  timeSlot: 'Morning' | 'Evening' | 'Full Day';
  advancePaid: number;
  foodPackage: string;
  foodPrice: number;
  decorationPrice: number;
  soundSystemPrice: number;
  projectorPrice: number;
  cleaningCharge: number;
  hallRent: number;
  totalPrice: number;
  roomNumber?: string;
  status: 'Confirmed' | 'Completed' | 'Cancelled';
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  unit: string;
  expiryDate?: string;
  barcode?: string;
  pricePerUnit?: number;
}

export interface PurchaseLog {
  id: string;
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
  supplier: string;
  pricePerUnit: number;
  gstAmount: number;
  totalAmount: number;
  date: string;
}

export interface StockAdjustmentLog {
  id: string;
  itemId: string;
  itemName: string;
  category: string;
  amount: number;
  unit: string;
  direction: 'in' | 'out';
  description: string;
  date: string;
}

export interface ClientUserAccount {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  tenantName: string;
  tenantId?: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  username: string;
  role: UserRole;
  action: string;
  details: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
}

export interface AppNotification {
  id: string;
  type: 'checkout' | 'stock' | 'booking' | 'birthday' | 'payment';
  message: string;
  timestamp: string;
  read: boolean;
}

export interface HotelSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  gstNumber: string;
  taxRate: number;
  barTaxRate: number;
  invoicePrefix: string;
  logoUrl?: string;
}

export interface BillSummary {
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  stayDuration: number;
  roomRentTotal: number;
  restaurantTotal: number;
  barTotal: number;
  laundryTotal: number;
  hallTotal: number;
  otherCharges: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  advancePaid: number;
  grandTotal: number;
  pendingAmount: number;
}

// ==========================================
// CONTEXT INTERFACE
// ==========================================

interface AppContextType {
  userRole: UserRole;
  switchRole: (role: UserRole) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  rooms: Room[];
  preBookings: PreBooking[];
  menuItems: MenuItem[];
  orders: Order[];
  laundryOrders: LaundryOrder[];
  hallBookings: HallBooking[];
  inventory: InventoryItem[];
  purchaseLogs: PurchaseLog[];
  stockAdjustmentLogs: StockAdjustmentLog[];
  userAccounts: ClientUserAccount[];
  currentUser: ClientUserAccount | null;
  tenants: TenantAccount[];
  activeTenantId: string;
  currentTenant: TenantAccount;
  auditLogs: AuditLog[];
  notifications: AppNotification[];
  settings: HotelSettings;

  cloudDbConnected: boolean;
  cloudDbName: string;

  user: any | null;
  loadingAuth: boolean;
  tenantId: string | null;
  logout: () => Promise<void>;
  
  checkInRoom: (roomId: string, guestInfo: { name: string; phone: string; email?: string; address?: string; idProof: string; gstNumber?: string; noOfGuests: number; advancePaid: number }) => Promise<void>;
  checkOutRoom: (roomId: string, paymentDetails: { method: 'Cash' | 'Card' | 'UPI' | 'Split'; discount: number; splitDetails?: string }) => Promise<void>;
  transferRoom: (fromRoomId: string, toRoomId: string) => Promise<void>;
  updateHousekeeping: (roomId: string, status: RoomStatus) => Promise<void>;
  extendStay: (roomId: string, days: number) => Promise<void>;
  
  addPreBooking: (booking: Omit<PreBooking, 'id' | 'status' | 'bookingDate'>) => Promise<void>;
  cancelPreBooking: (id: string) => Promise<void>;
  confirmPreBookingCheckIn: (id: string, roomId: string) => Promise<void>;
  
  addRestaurantBarOrder: (order: Omit<Order, 'id' | 'orderNumber' | 'timestamp' | 'tax' | 'total' | 'status'>) => Promise<void>;
  addLaundryOrder: (order: Omit<LaundryOrder, 'id' | 'orderNumber' | 'timestamp' | 'status'>) => Promise<void>;
  updateLaundryStatus: (id: string, status: 'Pending' | 'Delivered' | 'Completed') => Promise<void>;
  
  addHallBooking: (booking: Omit<HallBooking, 'id' | 'bookingNumber' | 'status' | 'totalPrice'>) => Promise<void>;
  cancelHallBooking: (id: string) => Promise<void>;
  
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => any;
  deleteInventoryItem: (id: string) => Promise<void>;
  recordPurchase: (purchase: Omit<PurchaseLog, 'id' | 'date'>) => any;
  updateStockLevel: (itemId: string, amount: number, direction: 'in' | 'out', category?: string, description?: string) => any;
  
  getBillSummary: (roomNumber: string) => BillSummary | null;
  addAudit: (action: string, details: string, oldValue?: string, newValue?: string) => any;
  clearNotification: (id: string) => any;
  addUserAccount: (user: Omit<ClientUserAccount, 'id' | 'createdAt'>) => void;
  deleteUserAccount: (id: string) => void;
  addTenantAccount: (tenant: Omit<TenantAccount, 'id' | 'createdAt'>, adminPassword?: string) => void;
  updateTenantStatus: (id: string, status: 'Active' | 'Provisioning' | 'Suspended') => void;
  updateTenantMenus: (id: string, enabledMenus: string[]) => void;
  deleteTenantAccount: (id: string) => void;
  switchTenantContext: (tenantId: string) => void;
  loginUser: (email: string, password: string) => { success: boolean; error?: string };
  logoutUser: () => void;

  addMenuItem: (item: MenuItem) => Promise<void>;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  batchDeleteMenuItems: (ids: string[]) => Promise<void>;
  bulkAddMenuItems: (items: MenuItem[]) => Promise<void>;
  updateSettings: (settings: HotelSettings) => Promise<void>;
  addRoom: (room: Omit<Room, 'status' | 'restaurantCharges' | 'barCharges' | 'laundryCharges' | 'hallCharges' | 'otherCharges'>) => Promise<void>;
  deleteRoom: (roomId: string) => Promise<void>;
  resetTenantData: () => Promise<void>;
  isMenuEnabled: (menuId: string) => boolean;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('hv_dark_mode') === 'true';
  });

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('hv_dark_mode', String(next));
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const [currentUser, setCurrentUser] = useState<ClientUserAccount | null>(() => {
    const saved = localStorage.getItem('hv_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [userRole, setUserRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('hv_user_role');
    return (saved as UserRole) || (currentUser ? currentUser.role : 'super_admin');
  });

  const [activeTenantId, setActiveTenantId] = useState<string>(() => {
    return localStorage.getItem('hv_active_tenant_id') || '';
  });

  const [tenantId, setTenantId] = useState<string | null>(() => {
    return localStorage.getItem('hv_active_tenant_id') || null;
  });
  const [loadingAuth] = useState(false);

  const [tenants, setTenants] = useState<TenantAccount[]>([]);
  const [userAccounts, setUserAccounts] = useState<ClientUserAccount[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [purchaseLogs, setPurchaseLogs] = useState<PurchaseLog[]>([]);
  const [stockAdjustmentLogs, setStockAdjustmentLogs] = useState<StockAdjustmentLog[]>([]);
  const [laundryOrders, setLaundryOrders] = useState<LaundryOrder[]>([]);
  const [hallBookings, setHallBookings] = useState<HallBooking[]>([]);
  const [preBookings, setPreBookings] = useState<PreBooking[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [settings, setSettings] = useState<HotelSettings>({
    name: 'HotelVista Grand',
    address: '123 Beach Road, Resort City',
    phone: '+91 98765 43210',
    email: 'contact@hotelvistagrand.com',
    gstNumber: '33AAAAA0000A1Z5',
    taxRate: 18,
    barTaxRate: 20,
    invoicePrefix: 'HV-INV-'
  });

  const currentTenant = (tenants || []).find(t => t.id === tenantId) || 
    (tenants || []).find(t => t.id === activeTenantId) || 
    tenants[0] || ({
    id: tenantId || activeTenantId || 't_default',
    name: 'HotelVista Property',
    slug: 'default',
    email: 'contact@hotelvista.com',
    phone: '+91 98765 43210',
    gstNumber: 'GST-DEFAULT',
    subdomain: 'hotelvista.com',
    currency: 'INR (₹)',
    tier: 'Enterprise Multi-Property',
    status: 'Active',
    createdAt: '2026-01-01',
    maxRooms: 100,
    adminEmail: 'admin@hotelvista.com'
  } as TenantAccount);

  const effectiveTenantId = currentTenant?.id || tenantId || activeTenantId;

  const isMenuEnabled = (menuId: string): boolean => {
    if (userRole === 'super_admin') return true;
    if (!currentTenant) return true;
    if (!currentTenant.enabledMenus || currentTenant.enabledMenus.length === 0) return true;
    return currentTenant.enabledMenus.includes(menuId);
  };

  const switchRole = (role: UserRole) => {
    setUserRole(role);
    localStorage.setItem('hv_user_role', role);
  };

  const switchTenantContext = (newTenantId: string) => {
    setActiveTenantId(newTenantId);
    setTenantId(newTenantId);
    localStorage.setItem('hv_active_tenant_id', newTenantId);
    fetchTenantData(newTenantId);
  };

  const fetchTenantData = useCallback(async (tId: string) => {
    if (!tId) return;
    try {
      const [
        roomsRes,
        ordersRes,
        menuRes,
        invRes,
        purchasesRes,
        adjustmentsRes,
        laundryRes,
        hallRes,
        preBookRes,
        auditRes,
        settingsRes,
        notifRes
      ] = await Promise.all([
        api.get(`/rooms?tenantId=${tId}`),
        api.get(`/orders?tenantId=${tId}`),
        api.get(`/menu-items?tenantId=${tId}`),
        api.get(`/inventory?tenantId=${tId}`),
        api.get(`/purchase-logs?tenantId=${tId}`),
        api.get(`/stock-adjustments?tenantId=${tId}`),
        api.get(`/laundry-orders?tenantId=${tId}`),
        api.get(`/hall-bookings?tenantId=${tId}`),
        api.get(`/pre-bookings?tenantId=${tId}`),
        api.get(`/audit-logs?tenantId=${tId}`),
        api.get(`/settings?tenantId=${tId}`),
        api.get(`/notifications?tenantId=${tId}`)
      ]);

      setRooms(roomsRes.data || []);
      setOrders(ordersRes.data || []);
      setMenuItems(menuRes.data || []);
      setInventory(invRes.data || []);
      setPurchaseLogs(purchasesRes.data || []);
      setStockAdjustmentLogs(adjustmentsRes.data || []);
      setLaundryOrders(laundryRes.data || []);
      setHallBookings(hallRes.data || []);
      setPreBookings(preBookRes.data || []);
      setAuditLogs(auditRes.data || []);
      if (settingsRes.data) setSettings(settingsRes.data);
      setNotifications(notifRes.data || []);
    } catch (e) {
      console.error(`Error fetching tenant data for ${tId} from MongoDB:`, e);
    }
  }, []);

  // FETCH DATA FROM MONGODB API
  const fetchGlobalData = useCallback(async () => {
    try {
      const [tenantsRes, usersRes] = await Promise.all([
        api.get('/tenants'),
        api.get('/users')
      ]);
      const loadedTenants: TenantAccount[] = tenantsRes.data || [];
      setTenants(loadedTenants);
      setUserAccounts(usersRes.data || []);

      if (loadedTenants.length > 0) {
        const savedTenantId = localStorage.getItem('hv_active_tenant_id');
        const userAssignedTenantId = currentUser?.tenantId;
        const exists = loadedTenants.find(t => t.id === (userAssignedTenantId || savedTenantId || tenantId));
        const resolvedId = exists ? exists.id : loadedTenants[0].id;

        setActiveTenantId(resolvedId);
        setTenantId(resolvedId);
        localStorage.setItem('hv_active_tenant_id', resolvedId);
        fetchTenantData(resolvedId);
      }
    } catch (e) {
      console.error('Error fetching global data from MongoDB:', e);
    }
  }, [currentUser, tenantId, fetchTenantData]);

  useEffect(() => {
    fetchGlobalData();
  }, [fetchGlobalData]);

  useEffect(() => {
    if (tenantId) {
      fetchTenantData(tenantId);
    }
  }, [tenantId, fetchTenantData]);

  // SOCKET.IO REAL-TIME LISTENERS
  useEffect(() => {
    socket.on('tenant_created', (t: TenantAccount) => setTenants(prev => [t, ...prev.filter(x => x.id !== t.id)]));
    socket.on('tenant_updated', (t: TenantAccount) => setTenants(prev => prev.map(x => x.id === t.id ? t : x)));
    socket.on('tenant_deleted', (id: string) => setTenants(prev => prev.filter(x => x.id !== id)));

    socket.on('user_created', (u: ClientUserAccount) => setUserAccounts(prev => [u, ...prev.filter(x => x.id !== u.id)]));
    socket.on('user_updated', (u: ClientUserAccount) => setUserAccounts(prev => prev.map(x => x.id === u.id ? u : x)));
    socket.on('user_deleted', (id: string) => setUserAccounts(prev => prev.filter(x => x.id !== id)));

    socket.on('room_created', (r: Room) => setRooms(prev => [...prev.filter(x => x.id !== r.id), r]));
    socket.on('room_updated', (r: Room) => setRooms(prev => prev.map(x => x.id === r.id ? r : x)));
    socket.on('room_deleted', ({ id }) => setRooms(prev => prev.filter(x => x.id !== id)));

    socket.on('order_created', (o: Order) => setOrders(prev => [o, ...prev.filter(x => x.id !== o.id)]));
    socket.on('orders_bulk_updated', (updated: Order[]) => setOrders(updated));
    socket.on('order_deleted', (id: string) => setOrders(prev => prev.filter(x => x.id !== id)));

    socket.on('menu_item_created', (m: MenuItem) => setMenuItems(prev => [...prev.filter(x => x.id !== m.id), m]));
    socket.on('menu_item_updated', (m: MenuItem) => setMenuItems(prev => prev.map(x => x.id === m.id ? m : x)));
    socket.on('menu_item_deleted', ({ id }) => setMenuItems(prev => prev.filter(x => x.id !== id)));
    socket.on('menu_items_batch_deleted', ({ ids }: { ids: string[] }) => setMenuItems(prev => prev.filter(x => !ids.includes(x.id))));
    socket.on('menu_items_bulk_created', (items: MenuItem[]) => {
      setMenuItems(prev => {
        const itemIds = items.map(i => i.id);
        return [...prev.filter(x => !itemIds.includes(x.id)), ...items];
      });
    });

    socket.on('inventory_created', (i: InventoryItem) => setInventory(prev => [...prev.filter(x => x.id !== i.id), i]));
    socket.on('inventory_updated', (i: InventoryItem) => setInventory(prev => prev.map(x => x.id === i.id ? i : x)));
    socket.on('inventory_deleted', ({ id }) => setInventory(prev => prev.filter(x => x.id !== id)));

    socket.on('purchase_log_created', (p: PurchaseLog) => setPurchaseLogs(prev => [p, ...prev.filter(x => x.id !== p.id)]));
    socket.on('stock_adjustment_created', (s: StockAdjustmentLog) => setStockAdjustmentLogs(prev => [s, ...prev.filter(x => x.id !== s.id)]));

    socket.on('laundry_order_created', (l: LaundryOrder) => setLaundryOrders(prev => [l, ...prev.filter(x => x.id !== l.id)]));
    socket.on('laundry_order_updated', (l: LaundryOrder) => setLaundryOrders(prev => prev.map(x => x.id === l.id ? l : x)));
    socket.on('laundry_order_deleted', ({ id }) => setLaundryOrders(prev => prev.filter(x => x.id !== id)));

    socket.on('hall_booking_created', (h: HallBooking) => setHallBookings(prev => [h, ...prev.filter(x => x.id !== h.id)]));
    socket.on('hall_booking_updated', (h: HallBooking) => setHallBookings(prev => prev.map(x => x.id === h.id ? h : x)));
    socket.on('hall_booking_deleted', ({ id }) => setHallBookings(prev => prev.filter(x => x.id !== id)));

    socket.on('pre_booking_created', (p: PreBooking) => setPreBookings(prev => [p, ...prev.filter(x => x.id !== p.id)]));
    socket.on('pre_booking_updated', (p: PreBooking) => setPreBookings(prev => prev.map(x => x.id === p.id ? p : x)));
    socket.on('pre_booking_deleted', ({ id }) => setPreBookings(prev => prev.filter(x => x.id !== id)));

    socket.on('audit_log_created', (a: AuditLog) => setAuditLogs(prev => [a, ...prev.filter(x => x.id !== a.id)]));
    socket.on('settings_updated', (s: HotelSettings) => setSettings(s));
    socket.on('notification_created', (n: AppNotification) => setNotifications(prev => [n, ...prev.filter(x => x.id !== n.id)]));
    socket.on('notification_updated', (n: AppNotification) => setNotifications(prev => prev.map(x => x.id === n.id ? n : x)));

    socket.on('tenant_data_reset', (tId: string) => {
      if (tenantId === tId) {
        fetchTenantData(tId);
      }
    });

    return () => {
      socket.off('tenant_created');
      socket.off('tenant_updated');
      socket.off('tenant_deleted');
      socket.off('user_created');
      socket.off('user_updated');
      socket.off('user_deleted');
      socket.off('room_created');
      socket.off('room_updated');
      socket.off('room_deleted');
      socket.off('order_created');
      socket.off('order_deleted');
      socket.off('menu_item_created');
      socket.off('menu_item_updated');
      socket.off('menu_item_deleted');
      socket.off('inventory_created');
      socket.off('inventory_updated');
      socket.off('inventory_deleted');
      socket.off('purchase_log_created');
      socket.off('stock_adjustment_created');
      socket.off('laundry_order_created');
      socket.off('laundry_order_updated');
      socket.off('laundry_order_deleted');
      socket.off('hall_booking_created');
      socket.off('hall_booking_updated');
      socket.off('hall_booking_deleted');
      socket.off('pre_booking_created');
      socket.off('pre_booking_updated');
      socket.off('pre_booking_deleted');
      socket.off('audit_log_created');
      socket.off('settings_updated');
      socket.off('notification_created');
      socket.off('notification_updated');
      socket.off('tenant_data_reset');
    };
  }, [tenantId, fetchTenantData]);

  // AUDIT LOG
  const addAudit = async (action: string, details: string, oldValue?: string, newValue?: string) => {
    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      username: currentUser ? currentUser.name : 'System',
      role: userRole,
      action,
      details,
      oldValue,
      newValue,
      timestamp: new Date().toISOString()
    };
    try {
      await api.post('/audit-logs', { ...newLog, tenantId: tenantId || 'global' });
    } catch (e) {
      console.error('Failed to log audit event:', e);
    }
  };

  // TENANT MANAGEMENT
  const addTenantAccount = async (tenant: Omit<TenantAccount, 'id' | 'createdAt'>, adminPassword?: string) => {
    const id = 't_' + Date.now();
    const defaultMenus = tenant.enabledMenus && tenant.enabledMenus.length > 0 
      ? tenant.enabledMenus 
      : DEFAULT_ENABLED_MENUS;
    const newTenant: TenantAccount = {
      ...tenant,
      id,
      enabledMenus: defaultMenus,
      createdAt: new Date().toISOString().split('T')[0]
    };
    try {
      await api.post('/tenants', newTenant);
      if (tenant.adminEmail) {
        await api.post('/users', {
          id: 'u_' + Date.now(),
          name: `${tenant.name} Admin`,
          email: tenant.adminEmail,
          password: adminPassword || 'admin123',
          role: 'admin',
          tenantName: tenant.name,
          tenantId: id,
          status: 'Active',
          createdAt: new Date().toISOString().split('T')[0]
        });
      }
      addAudit('Tenant Onboarded', `Created new tenant ${newTenant.name} (${newTenant.tier})`);
    } catch (e) {
      console.error('Failed to create tenant:', e);
    }
  };

  const updateTenantStatus = async (tId: string, status: 'Active' | 'Provisioning' | 'Suspended') => {
    try {
      await api.put(`/tenants/${tId}`, { status });
      addAudit('Tenant Status Updated', `Updated tenant ${tId} status to ${status}`);
    } catch (e) {
      console.error('Failed to update tenant status:', e);
    }
  };

  const updateTenantMenus = async (tId: string, enabledMenus: string[]) => {
    try {
      await api.put(`/tenants/${tId}`, { enabledMenus });
      addAudit('Tenant Menus Configured', `Configured modules for tenant ${tId}`);
    } catch (e) {
      console.error('Failed to update tenant menus:', e);
    }
  };

  const deleteTenantAccount = async (tId: string) => {
    try {
      await api.delete(`/tenants/${tId}`);
      addAudit('Tenant Purged', `Deleted tenant account ${tId}`);
    } catch (e) {
      console.error('Failed to delete tenant:', e);
    }
  };

  const resetTenantData = async () => {
    if (!tenantId) return;
    try {
      await api.post(`/tenants/${tenantId}/reset-data`);
      addAudit('Database Reset', 'All transactional records wiped and rooms reset.');
    } catch (e) {
      console.error('Failed to reset tenant data:', e);
    }
  };

  // USER MANAGEMENT
  const addUserAccount = async (user: Omit<ClientUserAccount, 'id' | 'createdAt'>) => {
    const id = 'u_' + Date.now();
    const newUser: ClientUserAccount = {
      ...user,
      id,
      createdAt: new Date().toISOString().split('T')[0]
    };
    try {
      await api.post('/users', newUser);
      addAudit('User Account Created', `Created client account ${user.email} (${user.role}) for ${user.tenantName}`);
    } catch (e) {
      console.error('Failed to save user account:', e);
    }
  };

  const deleteUserAccount = async (id: string) => {
    try {
      await api.delete(`/users/${id}`);
      addAudit('User Account Deleted', `Deleted client user account ${id}`);
    } catch (e) {
      console.error('Failed to delete user account:', e);
    }
  };

  const loginUser = (emailInput: string, passwordInput: string) => {
    const cleanInput = (emailInput || '').trim().toLowerCase();
    const cleanPassword = (passwordInput || '').trim();

    if ((cleanInput === 'superadmin' || cleanInput === 'super_admin') && cleanPassword === 'admin') {
      const superAdminUser: ClientUserAccount = {
        id: 'u_superadmin',
        name: 'Super Admin',
        email: 'superAdmin',
        role: 'super_admin',
        tenantName: 'HotelVista Central SaaS',
        status: 'Active',
        createdAt: '2026-01-01'
      };
      setCurrentUser(superAdminUser);
      setUserRole('super_admin');
      localStorage.setItem('hv_current_user', JSON.stringify(superAdminUser));
      localStorage.setItem('hv_user_role', 'super_admin');
      addAudit('Super Admin Login', `Super Admin logged in successfully`);
      return { success: true };
    }

    const matched = (userAccounts || []).find(u => {
      if (!u) return false;
      const matchEmail = (u.email || '').toLowerCase() === cleanInput;
      const matchName = (u.name || '').toLowerCase() === cleanInput;
      const matchSuper = (cleanInput === 'superadmin' || cleanInput === 'super_admin') && u.role === 'super_admin';
      return (matchEmail || matchName || matchSuper) && u.password === cleanPassword;
    });

    if (matched) {
      setCurrentUser(matched);
      setUserRole(matched.role);
      const tenantMatch = (tenants || []).find(t => 
        (matched.tenantId && t.id === matched.tenantId) ||
        (t.name || '').toLowerCase() === (matched.tenantName || '').toLowerCase()
      );
      const targetTId = matched.tenantId || (tenantMatch ? tenantMatch.id : (tenants[0]?.id || activeTenantId));
      setActiveTenantId(targetTId);
      setTenantId(targetTId);
      localStorage.setItem('hv_active_tenant_id', targetTId);
      localStorage.setItem('hv_current_user', JSON.stringify(matched));
      localStorage.setItem('hv_user_role', matched.role);
      fetchTenantData(targetTId);
      addAudit('User Login', `User ${matched.email} (${matched.name}) logged in successfully as ${matched.role}`);
      return { success: true };
    }

    return { success: false, error: 'Invalid Username/Email or Password. Please check your credentials.' };
  };

  const logoutUser = () => {
    if (currentUser) {
      addAudit('User Logout', `User ${currentUser.email} logged out.`);
    }
    setCurrentUser(null);
    localStorage.removeItem('hv_current_user');
    localStorage.removeItem('hv_user_role');
    localStorage.removeItem('hotelvista_active_tab');
  };

  const logout = async () => {
    logoutUser();
  };

  // ROOMS OPERATIONS
  const addRoom = async (room: Omit<Room, 'status' | 'restaurantCharges' | 'barCharges' | 'laundryCharges' | 'hallCharges' | 'otherCharges'>) => {
    const tId = effectiveTenantId;
    if (!tId) return;
    const newRoom: Room = {
      ...room,
      status: 'Available',
      restaurantCharges: 0,
      barCharges: 0,
      laundryCharges: 0,
      hallCharges: 0,
      otherCharges: 0
    };
    try {
      await api.post('/rooms', { ...newRoom, tenantId: tId });
      addAudit('Room Created', `Added room ${room.roomNumber} (${room.category})`);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteRoom = async (roomId: string) => {
    const tId = effectiveTenantId;
    if (!tId) return;
    try {
      await api.delete(`/rooms/${roomId}?tenantId=${tId}`);
      addAudit('Room Deleted', `Deleted room ${roomId}`);
    } catch (e) {
      console.error(e);
    }
  };

  const checkInRoom = async (roomId: string, guestInfo: { name: string; phone: string; email?: string; address?: string; idProof: string; gstNumber?: string; noOfGuests: number; advancePaid: number }) => {
    const tId = effectiveTenantId;
    if (!tId) return;
    try {
      const roomUpdate = {
        status: 'Occupied',
        guestName: guestInfo.name,
        guestPhone: guestInfo.phone,
        guestEmail: guestInfo.email || '',
        guestAddress: guestInfo.address || '',
        guestIdProof: guestInfo.idProof || '',
        gstNumber: guestInfo.gstNumber || '',
        checkInDate: new Date().toISOString().split('T')[0],
        checkOutDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        noOfGuests: guestInfo.noOfGuests,
        advancePaid: guestInfo.advancePaid,
        restaurantCharges: 0,
        barCharges: 0,
        laundryCharges: 0,
        hallCharges: 0,
        otherCharges: 0
      };
      await api.put(`/rooms/${roomId}?tenantId=${tId}`, roomUpdate);
      addAudit('Check-In', `Guest ${guestInfo.name} checked into Room ${rooms.find(r => r.id === roomId)?.roomNumber}`, undefined, 'Occupied');
    } catch (e) {
      console.error(e);
    }
  };

  const checkOutRoom = async (roomId: string, paymentDetails: { method: 'Cash' | 'Card' | 'UPI' | 'Split'; discount: number; splitDetails?: string }) => {
    const tId = effectiveTenantId;
    if (!tId) return;
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    try {
      const resetData = {
        status: 'Cleaning',
        guestName: '',
        guestPhone: '',
        guestEmail: '',
        guestAddress: '',
        guestIdProof: '',
        gstNumber: '',
        checkInDate: '',
        checkOutDate: '',
        noOfGuests: 0,
        advancePaid: 0,
        restaurantCharges: 0,
        barCharges: 0,
        laundryCharges: 0,
        hallCharges: 0,
        otherCharges: 0
      };
      await api.put(`/rooms/${roomId}?tenantId=${tId}`, resetData);
      await api.put('/orders/settle-room', { tenantId: tId, roomNumber: room.roomNumber });
      addAudit('Check-Out', `Guest ${room.guestName} checked out of Room ${room.roomNumber}. Paid via ${paymentDetails.method}. Discount: ₹${paymentDetails.discount}`, 'Occupied', 'Cleaning');
    } catch (e) {
      console.error(e);
    }
  };

  const transferRoom = async (fromRoomId: string, toRoomId: string) => {
    const tId = effectiveTenantId;
    if (!tId) return;
    const source = rooms.find(r => r.id === fromRoomId);
    const dest = rooms.find(r => r.id === toRoomId);
    if (!source || !dest) return;
    try {
      await api.put(`/rooms/${fromRoomId}?tenantId=${tId}`, {
        status: 'Cleaning',
        guestName: '',
        guestPhone: '',
        guestEmail: '',
        guestAddress: '',
        guestIdProof: '',
        gstNumber: '',
        checkInDate: '',
        checkOutDate: '',
        noOfGuests: 0,
        advancePaid: 0,
        restaurantCharges: 0,
        barCharges: 0,
        laundryCharges: 0,
        hallCharges: 0,
        otherCharges: 0
      });

      await api.put(`/rooms/${toRoomId}?tenantId=${tId}`, {
        status: 'Occupied',
        guestName: source.guestName || '',
        guestPhone: source.guestPhone || '',
        guestEmail: source.guestEmail || '',
        guestAddress: source.guestAddress || '',
        guestIdProof: source.guestIdProof || '',
        gstNumber: source.gstNumber || '',
        checkInDate: source.checkInDate || '',
        checkOutDate: source.checkOutDate || '',
        noOfGuests: source.noOfGuests || 0,
        advancePaid: source.advancePaid || 0,
        restaurantCharges: source.restaurantCharges || 0,
        barCharges: source.barCharges || 0,
        laundryCharges: source.laundryCharges || 0,
        hallCharges: source.hallCharges || 0,
        otherCharges: source.otherCharges || 0
      });

      addAudit('Room Transfer', `Transferred guest ${source.guestName} from Room ${source.roomNumber} to Room ${dest.roomNumber}`);
    } catch (e) {
      console.error(e);
    }
  };

  const updateHousekeeping = async (roomId: string, status: RoomStatus) => {
    const tId = effectiveTenantId;
    if (!tId) return;
    try {
      await api.put(`/rooms/${roomId}?tenantId=${tId}`, { status });
      addAudit('Housekeeping Update', `Room status updated to ${status}`);
    } catch (e) {
      console.error(e);
    }
  };

  const extendStay = async (roomId: string, days: number) => {
    const tId = effectiveTenantId;
    if (!tId) return;
    const room = rooms.find(r => r.id === roomId);
    if (!room || !room.checkOutDate) return;
    const current = new Date(room.checkOutDate);
    current.setDate(current.getDate() + days);
    const newCheckOut = current.toISOString().split('T')[0];
    try {
      await api.put(`/rooms/${roomId}?tenantId=${tId}`, { checkOutDate: newCheckOut });
      addAudit('Stay Extended', `Extended stay for Room ${room.roomNumber} by ${days} days`);
    } catch (e) {
      console.error(e);
    }
  };

  // RESTAURANT & BAR ORDERS
  const addRestaurantBarOrder = async (order: Omit<Order, 'id' | 'orderNumber' | 'timestamp' | 'tax' | 'total' | 'status'>) => {
    const tId = effectiveTenantId;
    if (!tId) return;
    const newId = 'o_' + Date.now();
    const prefix = order.isBar ? 'BAR-' : 'KOT-';
    const orderNo = prefix + Math.floor(1000 + Math.random() * 9000);
    const taxRate = order.isBar ? (settings.barTaxRate ?? 20) : (settings.taxRate ?? 18);
    const subtotal = Number(order.subtotal) || 0;
    const taxAmount = parseFloat(((subtotal * taxRate) / 100).toFixed(2));
    const grandTotal = parseFloat((subtotal + taxAmount).toFixed(2));
    const isPostedToRoom = order.type === 'Room' && Boolean(order.roomNumber);

    const finalOrder: Order = {
      ...order,
      tenantId: tId,
      subtotal,
      id: newId,
      orderNumber: orderNo,
      timestamp: new Date().toISOString(),
      tax: taxAmount,
      total: grandTotal,
      status: isPostedToRoom ? 'PostedToRoom' : 'Paid'
    } as any;

    try {
      await api.post('/orders', finalOrder);
      if (isPostedToRoom) {
        addAudit('POS Link to Room', `Posted ${order.isBar ? 'Bar' : 'Restaurant'} order ${orderNo} (₹${grandTotal}) to Room ${order.roomNumber}`);
      } else {
        addAudit('POS Sale', `Cash/Direct Sale ${orderNo} of ₹${grandTotal}`);
      }
    } catch (e) {
      console.error('Error adding POS order:', e);
    }
  };

  // LAUNDRY ORDERS
  const addLaundryOrder = async (order: Omit<LaundryOrder, 'id' | 'orderNumber' | 'timestamp' | 'status'>) => {
    const tId = effectiveTenantId;
    if (!tId) return;
    const newId = 'lnd_' + Date.now();
    const orderNo = 'LND-' + Math.floor(1000 + Math.random() * 9000);
    const finalOrder: LaundryOrder = {
      ...order,
      tenantId: tId,
      id: newId,
      orderNumber: orderNo,
      timestamp: new Date().toISOString(),
      status: 'Pending'
    } as any;

    try {
      await api.post('/laundry-orders', finalOrder);
      addAudit('Laundry Order', `New laundry order ${orderNo} for Room ${order.roomNumber}`);
    } catch (e) {
      console.error(e);
    }
  };

  const updateLaundryStatus = async (id: string, status: 'Pending' | 'Delivered' | 'Completed') => {
    const tId = effectiveTenantId;
    if (!tId) return;
    try {
      await api.put(`/laundry-orders/${id}?tenantId=${tId}`, { status });
      addAudit('Laundry Status Update', `Updated laundry order ${id} to ${status}`);
    } catch (e) {
      console.error(e);
    }
  };

  // HALL BOOKINGS
  const addHallBooking = async (booking: Omit<HallBooking, 'id' | 'bookingNumber' | 'status' | 'totalPrice'>) => {
    const tId = effectiveTenantId;
    if (!tId) return;
    const newId = 'hall_' + Date.now();
    const bookingNo = 'BK-' + Math.floor(1000 + Math.random() * 9000);
    const totalPrice = (booking.hallRent || 0) + (booking.foodPrice || 0) + (booking.decorationPrice || 0) + (booking.soundSystemPrice || 0) + (booking.projectorPrice || 0) + (booking.cleaningCharge || 0);

    const finalBooking: HallBooking = {
      ...booking,
      tenantId: tId,
      id: newId,
      bookingNumber: bookingNo,
      totalPrice,
      status: 'Confirmed'
    } as any;

    try {
      await api.post('/hall-bookings', finalBooking);
      addAudit('Hall Booking', `Booked ${booking.hallType} for ${booking.guestName} on ${booking.date}`);
    } catch (e) {
      console.error(e);
    }
  };

  const cancelHallBooking = async (id: string) => {
    const tId = effectiveTenantId;
    if (!tId) return;
    try {
      await api.put(`/hall-bookings/${id}?tenantId=${tId}`, { status: 'Cancelled' });
      addAudit('Hall Booking Cancelled', `Cancelled hall booking ${id}`);
    } catch (e) {
      console.error(e);
    }
  };

  // PRE BOOKINGS
  const addPreBooking = async (booking: Omit<PreBooking, 'id' | 'status' | 'bookingDate'>) => {
    const tId = effectiveTenantId;
    if (!tId) return;
    const newId = 'pb_' + Date.now();
    const finalBooking: PreBooking = {
      ...booking,
      tenantId: tId,
      id: newId,
      bookingDate: new Date().toISOString().split('T')[0],
      status: 'Pending'
    } as any;

    try {
      await api.post('/pre-bookings', finalBooking);
      addAudit('Pre-Booking', `Created reservation for ${booking.guestName} (${booking.roomCategory})`);
    } catch (e) {
      console.error(e);
    }
  };

  const cancelPreBooking = async (id: string) => {
    const tId = effectiveTenantId;
    if (!tId) return;
    try {
      await api.put(`/pre-bookings/${id}?tenantId=${tId}`, { status: 'Cancelled' });
      addAudit('Pre-Booking Cancelled', `Cancelled pre-booking ${id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const confirmPreBookingCheckIn = async (id: string, roomId: string) => {
    const tId = effectiveTenantId;
    if (!tId) return;
    const pb = preBookings.find(p => p.id === id);
    if (!pb) return;
    const targetRoom = rooms.find(r => r.id === roomId);
    try {
      await checkInRoom(roomId, {
        name: pb.guestName,
        phone: pb.phone,
        email: pb.email,
        address: pb.address,
        idProof: pb.idProof,
        gstNumber: pb.gstNumber,
        noOfGuests: pb.noOfGuests || 1,
        advancePaid: pb.advancePaid || 0
      });
      await api.put(`/pre-bookings/${id}?tenantId=${tId}`, { 
        status: 'CheckedIn', 
        roomNumber: targetRoom ? targetRoom.roomNumber : undefined 
      });
    } catch (e) {
      console.error(e);
    }
  };

  // INVENTORY & PURCHASES
  const addInventoryItem = async (item: Omit<InventoryItem, 'id'>) => {
    const tId = effectiveTenantId;
    if (!tId) return;
    const newId = 'i_' + Date.now();
    const finalItem: InventoryItem = {
      ...item,
      tenantId: tId,
      id: newId
    } as any;
    try {
      await api.post('/inventory', finalItem);
      addAudit('Inventory Added', `Added SKU ${item.name} (${item.category})`);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteInventoryItem = async (id: string) => {
    const tId = effectiveTenantId;
    if (!tId) return;
    try {
      await api.delete(`/inventory/${id}?tenantId=${tId}`);
      addAudit('Inventory Deleted', `Deleted SKU ${id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const recordPurchase = async (purchase: Omit<PurchaseLog, 'id' | 'date'>) => {
    const tId = effectiveTenantId;
    if (!tId) return;
    const newId = 'p_' + Date.now();
    const finalPurchase: PurchaseLog = {
      ...purchase,
      tenantId: tId,
      id: newId,
      date: new Date().toISOString().split('T')[0]
    } as any;

    try {
      await api.post('/purchase-logs', finalPurchase);
      const match = inventory.find(i => (i.name || '').toLowerCase() === (purchase.itemName || '').toLowerCase());
      if (match) {
        await updateStockLevel(match.id, purchase.quantity, 'in');
      }
      addAudit('Stock Purchase', `Purchased ${purchase.quantity} ${purchase.unit} of ${purchase.itemName}`);
    } catch (e) {
      console.error(e);
    }
  };

  const updateStockLevel = async (itemId: string, amount: number, direction: 'in' | 'out', category?: string, description?: string) => {
    const tId = effectiveTenantId;
    if (!tId) return;
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;
    const newStock = direction === 'in' ? item.stock + amount : Math.max(0, item.stock - amount);
    try {
      await api.put(`/inventory/${itemId}?tenantId=${tId}`, { stock: newStock });
      if (description) {
        await api.post('/stock-adjustments', {
          id: 'adj_' + Date.now(),
          tenantId: tId,
          itemId,
          itemName: item.name,
          category: category || item.category,
          amount,
          unit: item.unit,
          direction,
          description,
          date: new Date().toISOString().split('T')[0],
          timestamp: new Date().toISOString()
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // MENU ITEMS
  const addMenuItem = async (item: MenuItem) => {
    const tId = effectiveTenantId;
    if (!tId) return;
    try {
      await api.post('/menu-items', { ...item, tenantId: tId });
      addAudit('Menu Item Added', `Added menu dish/drink ${item.name}`);
    } catch (e) {
      console.error(e);
    }
  };

  const updateMenuItem = async (id: string, updates: Partial<MenuItem>) => {
    const tId = effectiveTenantId;
    if (!tId) return;
    try {
      await api.put(`/menu-items/${id}`, { ...updates, tenantId: tId });
      addAudit('Menu Item Updated', `Updated menu item details`);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteMenuItem = async (id: string) => {
    const tId = effectiveTenantId;
    if (!tId) return;
    try {
      await api.delete(`/menu-items/${id}?tenantId=${tId}`);
      addAudit('Menu Item Deleted', `Deleted menu item ${id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const batchDeleteMenuItems = async (ids: string[]) => {
    const tId = effectiveTenantId;
    if (!tId || !ids.length) return;
    try {
      await api.post('/menu-items/batch-delete', { ids, tenantId: tId });
      addAudit('Bulk Menu Items Deleted', `Deleted ${ids.length} menu items`);
    } catch (e) {
      console.error(e);
    }
  };

  const bulkAddMenuItems = async (items: MenuItem[]) => {
    const tId = effectiveTenantId;
    if (!tId || !items.length) return;
    try {
      const itemsWithTenant = items.map(i => ({ ...i, tenantId: tId }));
      await api.post('/menu-items/bulk', { items: itemsWithTenant });
      addAudit('Bulk Menu Items Added', `Added ${items.length} menu items`);
    } catch (e) {
      console.error(e);
    }
  };

  // SETTINGS & NOTIFICATIONS
  const updateSettings = async (newSettings: HotelSettings) => {
    const tId = effectiveTenantId;
    if (!tId) return;
    try {
      const res = await api.put('/settings', { ...newSettings, tenantId: tId });
      setSettings(res.data);
      addAudit('Settings Updated', `Updated property settings`);
    } catch (e) {
      console.error(e);
    }
  };

  const clearNotification = async (id: string) => {
    try {
      await api.put(`/notifications/${id}`, { read: true });
    } catch (e) {
      console.error(e);
    }
  };

  // BILLING CALCULATION
  const getBillSummary = (roomNumber: string): BillSummary | null => {
    const room = rooms.find(r => r.roomNumber === roomNumber);
    if (!room || room.status !== 'Occupied' || !room.checkInDate) return null;

    const checkIn = new Date(room.checkInDate);
    const today = new Date();
    checkIn.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    
    let stayDuration = Math.ceil((today.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    if (stayDuration <= 0) stayDuration = 1;

    const roomRentTotal = stayDuration * (room.price || 0);
    const restaurantTotal = Number(room.restaurantCharges) || 0;
    const barTotal = Number(room.barCharges) || 0;
    const laundryTotal = Number(room.laundryCharges) || 0;
    const hallTotal = Number(room.hallCharges) || 0;
    const otherCharges = Number(room.otherCharges) || 0;
    const subtotal = roomRentTotal + restaurantTotal + barTotal + laundryTotal + hallTotal + otherCharges;
    
    const taxRate = settings?.taxRate ?? 18;
    const taxAmount = parseFloat(((subtotal * taxRate) / 100).toFixed(2));
    const grandTotal = subtotal + taxAmount;
    const advancePaid = Number(room.advancePaid) || 0;
    const pendingAmount = Math.max(0, grandTotal - advancePaid);

    return {
      guestName: room.guestName || 'Valued Guest',
      checkInDate: room.checkInDate,
      checkOutDate: new Date().toISOString().split('T')[0],
      stayDuration,
      roomRentTotal,
      restaurantTotal,
      barTotal,
      laundryTotal,
      hallTotal,
      otherCharges,
      subtotal,
      taxRate,
      taxAmount,
      discount: 0,
      advancePaid,
      grandTotal,
      pendingAmount
    };
  };

  const refreshData = async () => {
    await fetchGlobalData();
    if (tenantId) {
      await fetchTenantData(tenantId);
    }
  };

  return (
    <AppContext.Provider
      value={{
        userRole,
        switchRole,
        darkMode,
        toggleDarkMode,
        rooms,
        preBookings,
        menuItems,
        orders,
        laundryOrders,
        hallBookings,
        inventory,
        purchaseLogs,
        stockAdjustmentLogs,
        userAccounts,
        currentUser,
        tenants,
        activeTenantId,
        currentTenant,
        auditLogs,
        notifications,
        settings,

        cloudDbConnected: true,
        cloudDbName: 'MongoDB Atlas (cluster0.uxuamo6.mongodb.net)',

        user: currentUser,
        loadingAuth,
        tenantId,
        logout,

        checkInRoom,
        checkOutRoom,
        transferRoom,
        updateHousekeeping,
        extendStay,

        addPreBooking,
        cancelPreBooking,
        confirmPreBookingCheckIn,

        addRestaurantBarOrder,
        addLaundryOrder,
        updateLaundryStatus,

        addHallBooking,
        cancelHallBooking,

        addInventoryItem,
        deleteInventoryItem,
        recordPurchase,
        updateStockLevel,

        getBillSummary,
        addAudit,
        clearNotification,
        addUserAccount,
        deleteUserAccount,
        addTenantAccount,
        updateTenantStatus,
        updateTenantMenus,
        deleteTenantAccount,
        switchTenantContext,
        loginUser,
        logoutUser,

        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        batchDeleteMenuItems,
        bulkAddMenuItems,
        updateSettings,
        addRoom,
        deleteRoom,
        resetTenantData,
        isMenuEnabled,
        refreshData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
