import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch 
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured, cloudDbName } from '../firebase';

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
  checkInDate?: string;
  checkOutDate?: string;
  noOfGuests?: number;
  advancePaid?: number;
  // Charges posted to room
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
  roomNumber?: string; // Optional if assigned later
  bookingDate: string;
  checkInDate: string;
  checkOutDate: string;
  noOfGuests: number;
  advancePaid: number;
  status: 'Pending' | 'Confirmed' | 'CheckedIn' | 'Cancelled';
}

export interface MenuItem {
  id: string;
  name: string;
  category: string; // Food categories: Breakfast, Lunch, Dinner, Beverages, Desserts. Bar: Beer, Whisky, Rum, Vodka, Wine, Cocktails, Snacks
  price: number;
  isBar: boolean;
  isAvailable: boolean;
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
  roomNumber?: string; // If guest wants hall charge linked to room
  status: 'Confirmed' | 'Completed' | 'Cancelled';
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  minStock: number; // Low stock threshold
  unit: string; // bottle, kg, pcs, liters, packet
  expiryDate?: string;
  barcode?: string;
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
  password: string;
  role: UserRole;
  tenantName: string;
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
  taxRate: number; // general GST % e.g. 18
  barTaxRate: number; // bar specific tax % e.g. 20
  invoicePrefix: string;
  logoUrl?: string;
}

export interface BillSummary {
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  stayDuration: number; // in days
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
// CONTEXT TYPE DEFINITION
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

  // Live Cloud Database Status
  cloudDbConnected: boolean;
  cloudDbName: string;

  // Firebase Auth Integrations
  user: User | null;
  loadingAuth: boolean;
  tenantId: string | null;
  logout: () => Promise<void>;
  
  // State mutations
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
  updateSettings: (settings: HotelSettings) => Promise<void>;
  addRoom: (room: Omit<Room, 'status' | 'restaurantCharges' | 'barCharges' | 'laundryCharges' | 'hallCharges' | 'otherCharges'>) => Promise<void>;
  deleteRoom: (roomId: string) => Promise<void>;
  resetTenantData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ==========================================
// PRE-POPULATED INITIAL DATA FOR SEEDING
// ==========================================

const defaultRooms: Room[] = [
  { id: 'r101', roomNumber: '101', category: 'Standard', floor: 1, price: 1500, status: 'Available', restaurantCharges: 0, barCharges: 0, laundryCharges: 0, hallCharges: 0, otherCharges: 0 },
  { id: 'r102', roomNumber: '102', category: 'Standard', floor: 1, price: 1500, status: 'Available', restaurantCharges: 0, barCharges: 0, laundryCharges: 0, hallCharges: 0, otherCharges: 0 },
  { id: 'r103', roomNumber: '103', category: 'Standard', floor: 1, price: 1500, status: 'Available', restaurantCharges: 0, barCharges: 0, laundryCharges: 0, hallCharges: 0, otherCharges: 0 },
  { id: 'r104', roomNumber: '104', category: 'Standard', floor: 1, price: 1500, status: 'Available', restaurantCharges: 0, barCharges: 0, laundryCharges: 0, hallCharges: 0, otherCharges: 0 },
  { id: 'r105', roomNumber: '105', category: 'Standard', floor: 1, price: 1500, status: 'Available', restaurantCharges: 0, barCharges: 0, laundryCharges: 0, hallCharges: 0, otherCharges: 0 },
  { id: 'r106', roomNumber: '106', category: 'Standard', floor: 1, price: 1500, status: 'Available', restaurantCharges: 0, barCharges: 0, laundryCharges: 0, hallCharges: 0, otherCharges: 0 },
  { id: 'r201', roomNumber: '201', category: 'Semi Premium', floor: 2, price: 2500, status: 'Available', restaurantCharges: 0, barCharges: 0, laundryCharges: 0, hallCharges: 0, otherCharges: 0 },
  { id: 'r202', roomNumber: '202', category: 'Semi Premium', floor: 2, price: 2500, status: 'Available', restaurantCharges: 0, barCharges: 0, laundryCharges: 0, hallCharges: 0, otherCharges: 0 },
  { id: 'r203', roomNumber: '203', category: 'Semi Premium', floor: 2, price: 2500, status: 'Available', restaurantCharges: 0, barCharges: 0, laundryCharges: 0, hallCharges: 0, otherCharges: 0 },
  { id: 'r204', roomNumber: '204', category: 'Semi Premium', floor: 2, price: 2500, status: 'Available', restaurantCharges: 0, barCharges: 0, laundryCharges: 0, hallCharges: 0, otherCharges: 0 },
  { id: 'r205', roomNumber: '205', category: 'Semi Premium', floor: 2, price: 2500, status: 'Available', restaurantCharges: 0, barCharges: 0, laundryCharges: 0, hallCharges: 0, otherCharges: 0 },
  { id: 'r301', roomNumber: '301', category: 'Premium', floor: 3, price: 4000, status: 'Available', restaurantCharges: 0, barCharges: 0, laundryCharges: 0, hallCharges: 0, otherCharges: 0 },
  { id: 'r302', roomNumber: '302', category: 'Premium', floor: 3, price: 4000, status: 'Available', restaurantCharges: 0, barCharges: 0, laundryCharges: 0, hallCharges: 0, otherCharges: 0 },
  { id: 'r303', roomNumber: '303', category: 'Suite', floor: 3, price: 6500, status: 'Available', restaurantCharges: 0, barCharges: 0, laundryCharges: 0, hallCharges: 0, otherCharges: 0 },
  { id: 'r304', roomNumber: '304', category: 'Suite', floor: 3, price: 6500, status: 'Available', restaurantCharges: 0, barCharges: 0, laundryCharges: 0, hallCharges: 0, otherCharges: 0 },
  { id: 'r401', roomNumber: '401', category: 'Family Suite', floor: 4, price: 8000, status: 'Available', restaurantCharges: 0, barCharges: 0, laundryCharges: 0, hallCharges: 0, otherCharges: 0 },
  { id: 'r402', roomNumber: '402', category: 'Dormitory', floor: 4, price: 800, status: 'Available', restaurantCharges: 0, barCharges: 0, laundryCharges: 0, hallCharges: 0, otherCharges: 0 }
];

const defaultInventory: InventoryItem[] = [
  { id: 'inv_1', name: 'Basmati Rice 25kg Bag', category: 'Kitchen', stock: 8, minStock: 3, unit: 'bag', barcode: 'BAR-100201' },
  { id: 'inv_2', name: 'Kingfisher Premium Beer 650ml', category: 'Liquor', stock: 36, minStock: 12, unit: 'bottle', barcode: 'BAR-100202' },
  { id: 'inv_3', name: 'Premium Bath Towels', category: 'Housekeeping', stock: 45, minStock: 15, unit: 'pcs', barcode: 'BAR-100203' },
  { id: 'inv_4', name: 'Bed Linen Standard Set', category: 'Room Supplies', stock: 28, minStock: 10, unit: 'set', barcode: 'BAR-100204' },
  { id: 'inv_5', name: 'Toilet Cleaner & Disinfectant 5L', category: 'Cleaning', stock: 12, minStock: 4, unit: 'can', barcode: 'BAR-100205' },
  { id: 'inv_6', name: 'Laundry Detergent Eco 10kg', category: 'Laundry', stock: 6, minStock: 2, unit: 'bag', barcode: 'BAR-100206' }
];

const defaultMenuItems: MenuItem[] = [
  { id: 'm1', name: 'Continental Breakfast Platter', category: 'Breakfast', price: 350, isBar: false, isAvailable: true },
  { id: 'm2', name: 'Paneer Butter Masala & Naan', category: 'Lunch', price: 420, isBar: false, isAvailable: true },
  { id: 'm3', name: 'Chicken Biryani Special', category: 'Dinner', price: 480, isBar: false, isAvailable: true },
  { id: 'm4', name: 'Fresh Lime Soda', category: 'Beverages', price: 120, isBar: false, isAvailable: true },
  { id: 'm5', name: 'Chocolate Lava Cake', category: 'Desserts', price: 220, isBar: false, isAvailable: true },
  { id: 'b1', name: 'Kingfisher Ultra Beer 650ml', category: 'Beer', price: 380, isBar: true, isAvailable: true },
  { id: 'b2', name: 'Old Monk Dark Rum 60ml', category: 'Rum', price: 250, isBar: true, isAvailable: true },
  { id: 'b3', name: 'Johnnie Walker Red Label 60ml', category: 'Whisky', price: 450, isBar: true, isAvailable: true },
  { id: 'b4', name: 'Signature Mojito Cocktail', category: 'Cocktails', price: 400, isBar: true, isAvailable: true },
  { id: 'b5', name: 'Crispy Chilli Chicken', category: 'Snacks', price: 340, isBar: true, isAvailable: true }
];

const defaultSettings: HotelSettings = {
  name: 'HotelVista Resort & Spa',
  address: '45, Hill View Road, Ooty, Tamil Nadu - 643001',
  phone: '+91 98765 43210',
  email: 'bookings@hotelvistaresort.com',
  gstNumber: '33AAAAA1111A1ZA',
  taxRate: 18,
  barTaxRate: 20,
  invoicePrefix: 'HV-2026-'
};

export const defaultTenants: TenantAccount[] = [
  {
    id: 't_merridien',
    slug: 'hotel-le-merridien',
    name: 'Hotel Le Merridien',
    email: 'merridien@hotel.com',
    phone: '+91 98765 11223',
    gstNumber: '36AAACH1234M1Z5',
    subdomain: 'merridien.hotelvista.com',
    currency: 'INR (₹)',
    tier: 'Enterprise Multi-Property',
    status: 'Active',
    createdAt: '2026-01-01',
    maxRooms: 150,
    adminEmail: 'merridien@hotel.com',
    enabledMenus: DEFAULT_ENABLED_MENUS
  },
  {
    id: 't_main',
    slug: 'hotelvista-grand',
    name: 'HotelVista Grand',
    email: 'admin@hotelvista.com',
    phone: '+91 98765 43210',
    gstNumber: '36AAACH7412K1Z9',
    subdomain: 'grand.hotelvista.com',
    currency: 'INR (₹)',
    tier: 'Enterprise Multi-Property',
    status: 'Active',
    createdAt: '2026-01-01',
    maxRooms: 100,
    adminEmail: 'admin@hotelvista.com',
    enabledMenus: DEFAULT_ENABLED_MENUS
  },
  {
    id: 't_royal',
    slug: 'royal-orchid-resort',
    name: 'Royal Orchid Resort & Spa',
    email: 'royal@resort.com',
    phone: '+91 91234 56789',
    gstNumber: '29AAACR9988P1Z3',
    subdomain: 'royal.hotelvista.com',
    currency: 'INR (₹)',
    tier: 'Standard ERP',
    status: 'Active',
    createdAt: '2026-02-10',
    maxRooms: 60,
    adminEmail: 'royal@resort.com',
    enabledMenus: DEFAULT_ENABLED_MENUS
  }
];

export const defaultAccounts: ClientUserAccount[] = [
  {
    id: 'u_superadmin',
    name: 'Super Admin',
    email: 'superAdmin',
    password: 'greenBridge',
    role: 'super_admin',
    tenantName: 'HotelVista Central SaaS',
    status: 'Active',
    createdAt: '2026-01-01'
  },
  {
    id: 'u_merridien',
    name: 'Le Merridien Admin',
    email: 'merridien@hotel.com',
    password: '123456',
    role: 'admin',
    tenantName: 'Hotel Le Merridien',
    status: 'Active',
    createdAt: '2026-01-01'
  },
  {
    id: 'u_admin',
    name: 'HotelVista System Admin',
    email: 'admin@hotelvista.com',
    password: 'admin123',
    role: 'admin',
    tenantName: 'HotelVista Grand',
    status: 'Active',
    createdAt: '2026-01-01'
  },
  {
    id: 'u_reception',
    name: 'Front Desk Reception',
    email: 'reception@hotelvista.com',
    password: 'reception123',
    role: 'reception',
    tenantName: 'HotelVista Grand',
    status: 'Active',
    createdAt: '2026-01-01'
  }
];

export const defaultStockAdjustmentLogs: StockAdjustmentLog[] = [
  {
    id: 'adj_1',
    itemId: 'inv_1',
    itemName: 'Basmati Rice 25kg Bag',
    category: 'Kitchen',
    amount: 2,
    unit: 'kg',
    direction: 'out',
    description: 'Kitchen dinner preparation usage',
    date: '2026-09-10 10:15'
  },
  {
    id: 'adj_2',
    itemId: 'inv_2',
    itemName: 'Kingfisher Premium Beer 650ml',
    category: 'Liquor',
    amount: 6,
    unit: 'bottle',
    direction: 'in',
    description: 'Bar counter stock replenishment',
    date: '2026-09-10 11:30'
  }
];

// ==========================================
// CONTEXT PROVIDER COMPONENT
// ==========================================

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication states
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(() => {
    return localStorage.getItem('hv_active_tenant_id') || 't_merridien';
  });

  // Local ERP states, initialized to defaults and synced live via Firestore subscriptions
  const [rooms, setRooms] = useState<Room[]>(defaultRooms);
  const [preBookings, setPreBookings] = useState<PreBooking[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(defaultMenuItems);
  const [orders, setOrders] = useState<Order[]>([]);
  const [laundryOrders, setLaundryOrders] = useState<LaundryOrder[]>([]);
  const [hallBookings, setHallBookings] = useState<HallBooking[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>(defaultInventory);
  const [purchaseLogs, setPurchaseLogs] = useState<PurchaseLog[]>([]);
  const [stockAdjustmentLogs, setStockAdjustmentLogs] = useState<StockAdjustmentLog[]>(defaultStockAdjustmentLogs);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [settings, setSettings] = useState<HotelSettings>(defaultSettings);
  const [userAccounts, setUserAccounts] = useState<ClientUserAccount[]>(defaultAccounts);
  const [tenants, setTenants] = useState<TenantAccount[]>(defaultTenants);
  const [activeTenantId, setActiveTenantId] = useState<string>(() => {
    return localStorage.getItem('hv_active_tenant_id') || 't_merridien';
  });

  const [currentUser, setCurrentUser] = useState<ClientUserAccount | null>(() => {
    const saved = localStorage.getItem('hv_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return null; // Require login if not authenticated
  });

  const [userRole, setUserRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('hv_user_role');
    return (saved as UserRole) || 'admin';
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('hv_dark_mode');
    return saved === 'true';
  });

  // Track Auth state changes
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoadingAuth(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      // Retain property tenant context (do NOT lock tenantId to single firebaseUser.uid)
      const savedTenant = localStorage.getItem('hv_active_tenant_id') || 't_merridien';
      setTenantId(savedTenant);
      setActiveTenantId(savedTenant);
      setLoadingAuth(false);
    });
    return unsub;
  }, []);

  // Sync active property tenant context whenever logged in user changes
  useEffect(() => {
    if (currentUser && currentUser.role !== 'super_admin' && (tenants || []).length > 0) {
      const matchingTenant = (tenants || []).find(t => 
        (t.name || '').toLowerCase() === (currentUser.tenantName || '').toLowerCase() ||
        t.id === currentUser.tenantName
      );
      if (matchingTenant && matchingTenant.id !== activeTenantId) {
        setActiveTenantId(matchingTenant.id);
        setTenantId(matchingTenant.id);
        localStorage.setItem('hv_active_tenant_id', matchingTenant.id);
      }
    }
  }, [currentUser, tenants, activeTenantId]);

  // Theme Sync effect (remains local)
  useEffect(() => {
    localStorage.setItem('hv_dark_mode', String(darkMode));
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('hv_user_role', userRole);
  }, [userRole]);

  // Firestore subscriptions (active only when user is logged in / tenantId is set)
  
  // Settings sync
  useEffect(() => {
    if (!tenantId || !isFirebaseConfigured || !db) return;
    const unsub = onSnapshot(doc(db, 'tenants', tenantId, 'settings', 'hotel'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as HotelSettings);
      } else {
        setDoc(doc(db, 'tenants', tenantId, 'settings', 'hotel'), defaultSettings);
      }
    });
    return unsub;
  }, [tenantId]);

  // Rooms sync
  useEffect(() => {
    if (!tenantId || !isFirebaseConfigured || !db) return;
    const unsub = onSnapshot(collection(db, 'tenants', tenantId, 'rooms'), (snapshot) => {
      if (snapshot.empty) {
        // Seed default rooms
        const batch = writeBatch(db);
        defaultRooms.forEach((r) => {
          batch.set(doc(db, 'tenants', tenantId, 'rooms', r.id), r);
        });
        batch.commit();
      } else {
        const data = snapshot.docs.map(doc => doc.data() as Room);
        data.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));
        setRooms(data);
      }
    });
    return unsub;
  }, [tenantId]);

  // Pre-Bookings sync
  useEffect(() => {
    if (!tenantId || !isFirebaseConfigured || !db) return;
    const unsub = onSnapshot(collection(db, 'tenants', tenantId, 'preBookings'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as PreBooking);
      data.sort((a, b) => b.bookingDate.localeCompare(a.bookingDate));
      setPreBookings(data);
    });
    return unsub;
  }, [tenantId]);

  // Menu items sync
  useEffect(() => {
    if (!tenantId || !isFirebaseConfigured || !db) return;
    const unsub = onSnapshot(collection(db, 'tenants', tenantId, 'menuItems'), (snapshot) => {
      if (snapshot.empty) {
        const batch = writeBatch(db);
        defaultMenuItems.forEach(m => {
          batch.set(doc(db, 'tenants', tenantId, 'menuItems', m.id), m);
        });
        batch.commit();
      } else {
        const data = snapshot.docs.map(doc => doc.data() as MenuItem);
        setMenuItems(data);
      }
    });
    return unsub;
  }, [tenantId]);

  // Orders sync
  useEffect(() => {
    if (!tenantId || !isFirebaseConfigured || !db) return;
    const unsub = onSnapshot(collection(db, 'tenants', tenantId, 'orders'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Order);
      data.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      setOrders(data);
    });
    return unsub;
  }, [tenantId]);

  // Laundry Orders sync
  useEffect(() => {
    if (!tenantId || !isFirebaseConfigured || !db) return;
    const unsub = onSnapshot(collection(db, 'tenants', tenantId, 'laundryOrders'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as LaundryOrder);
      data.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      setLaundryOrders(data);
    });
    return unsub;
  }, [tenantId]);

  // Hall Bookings sync
  useEffect(() => {
    if (!tenantId || !isFirebaseConfigured || !db) return;
    const unsub = onSnapshot(collection(db, 'tenants', tenantId, 'hallBookings'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as HallBooking);
      setHallBookings(data);
    });
    return unsub;
  }, [tenantId]);

  // Inventory sync
  useEffect(() => {
    if (!tenantId || !isFirebaseConfigured || !db) return;
    const unsub = onSnapshot(collection(db, 'tenants', tenantId, 'inventory'), (snapshot) => {
      if (snapshot.empty) {
        // Only seed default demo inventory items for the initial demo hotel 't_merridien'
        if (tenantId === 't_merridien') {
          const batch = writeBatch(db);
          defaultInventory.forEach(inv => {
            batch.set(doc(db, 'tenants', tenantId, 'inventory', inv.id), inv);
          });
          batch.commit();
        } else {
          setInventory([]);
        }
      } else {
        const data = snapshot.docs.map(doc => doc.data() as InventoryItem);
        setInventory(data);
      }
    });
    return unsub;
  }, [tenantId]);

  // Purchase logs sync
  useEffect(() => {
    if (!tenantId || !isFirebaseConfigured || !db) return;
    const unsub = onSnapshot(collection(db, 'tenants', tenantId, 'purchaseLogs'), (snapshot) => {
      if (snapshot.empty) {
        setPurchaseLogs([]);
      } else {
        const data = snapshot.docs.map(doc => doc.data() as PurchaseLog);
        data.sort((a, b) => b.date.localeCompare(a.date));
        setPurchaseLogs(data);
      }
    });
    return unsub;
  }, [tenantId]);

  // Audit Logs sync
  useEffect(() => {
    if (!tenantId || !isFirebaseConfigured || !db) return;
    const unsub = onSnapshot(collection(db, 'tenants', tenantId, 'auditLogs'), (snapshot) => {
      if (snapshot.empty) {
        // Seed only a single system init audit log rather than mock guest records
        const id = 'a_init';
        const initLog: AuditLog = {
          id,
          username: 'System',
          role: 'admin',
          action: 'Workspace Init',
          details: 'Your real-time tenant environment is successfully initialized.',
          timestamp: new Date().toLocaleString()
        };
        setDoc(doc(db, 'tenants', tenantId, 'auditLogs', id), initLog);
      } else {
        const data = snapshot.docs.map(doc => doc.data() as AuditLog);
        data.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        setAuditLogs(data);
      }
    });
    return unsub;
  }, [tenantId]);

  // Notifications sync
  useEffect(() => {
    if (!tenantId || !isFirebaseConfigured || !db) return;
    const unsub = onSnapshot(collection(db, 'tenants', tenantId, 'notifications'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as AppNotification);
      data.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      setNotifications(data);
    });
    return unsub;
  }, [tenantId]);

  // Multi-tenant accounts sync from Live Firestore
  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;
    const unsub = onSnapshot(collection(db, 'tenants'), (snapshot) => {
      if (snapshot.empty) {
        // Seed initial default tenants to live cloud Firestore
        const batch = writeBatch(db);
        defaultTenants.forEach(t => {
          batch.set(doc(db, 'tenants', t.id), t);
        });
        batch.commit().catch(err => console.error('Failed to seed tenants in Firestore:', err));
      } else {
        const data = snapshot.docs.map(d => d.data() as TenantAccount);
        const validated = data.map(t => ({
          ...t,
          enabledMenus: t.enabledMenus && Array.isArray(t.enabledMenus) ? t.enabledMenus : DEFAULT_ENABLED_MENUS
        }));
        setTenants(validated);
        localStorage.setItem('hv_tenants', JSON.stringify(validated));
      }
    }, (err) => {
      console.error('Firestore tenants sync error:', err);
    });
    return unsub;
  }, []);

  // Global user accounts sync from Live Firestore
  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      if (snapshot.empty) {
        // Seed initial user accounts to live cloud Firestore
        const batch = writeBatch(db);
        defaultAccounts.forEach(u => {
          batch.set(doc(db, 'users', u.id), u);
        });
        batch.commit().catch(err => console.error('Failed to seed users in Firestore:', err));
      } else {
        const data = snapshot.docs.map(d => d.data() as ClientUserAccount);
        // Ensure superadmin account is always present
        const superAdminExists = data.some(u => u.role === 'super_admin' || u.email === 'superAdmin');
        if (!superAdminExists) {
          setDoc(doc(db, 'users', defaultAccounts[0].id), defaultAccounts[0]).catch(console.error);
        }
        setUserAccounts(data);
        localStorage.setItem('hv_user_accounts', JSON.stringify(data));
      }
    }, (err) => {
      console.error('Firestore users sync error:', err);
    });
    return unsub;
  }, []);

  // Stock Adjustment Logs sync from Live Firestore
  useEffect(() => {
    if (!tenantId || !isFirebaseConfigured || !db) return;
    const unsub = onSnapshot(collection(db, 'tenants', tenantId, 'stockAdjustmentLogs'), (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs.map(d => d.data() as StockAdjustmentLog);
        data.sort((a, b) => b.date.localeCompare(a.date));
        setStockAdjustmentLogs(data);
      } else {
        setStockAdjustmentLogs([]);
      }
    }, (err) => {
      console.error('Firestore stockAdjustmentLogs sync error:', err);
    });
    return unsub;
  }, [tenantId]);

  // ==========================================
  // STATE MUTATION FUNCTIONS (FIRESTORE)
  // ==========================================

  const logout = async () => {
    if (isFirebaseConfigured) {
      await signOut(auth);
      // Clear local states immediately for security/UX
      setRooms([]);
      setPreBookings([]);
      setMenuItems([]);
      setOrders([]);
      setLaundryOrders([]);
      setHallBookings([]);
      setInventory([]);
      setPurchaseLogs([]);
      setAuditLogs([]);
      setNotifications([]);
    }
  };

  const switchRole = (role: UserRole) => {
    setUserRole(role);
    addAudit('Role Switch', `User switched role to ${role.toUpperCase()}`);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const addAudit = async (action: string, details: string, oldValue?: string, newValue?: string) => {
    if (!tenantId) return;
    const id = 'a_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newLog: AuditLog = {
      id,
      username: userRole === 'admin' ? 'Admin User' : `${userRole.charAt(0).toUpperCase() + userRole.slice(1)} Staff`,
      role: userRole,
      action,
      details,
      oldValue: oldValue || '',
      newValue: newValue || '',
      timestamp: new Date().toLocaleString()
    };
    try {
      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, 'tenants', tenantId, 'auditLogs', id), newLog);
      } else {
        setAuditLogs(prev => [newLog, ...prev]);
      }
    } catch (e) {
      console.error('Failed to log audit:', e);
    }
  };

  const currentTenant: TenantAccount = tenants.find(t => t.id === activeTenantId) || tenants[0] || defaultTenants[0];

  const addTenantAccount = async (tenantData: Omit<TenantAccount, 'id' | 'createdAt'>, adminPassword?: string) => {
    const newTenant: TenantAccount = {
      ...tenantData,
      id: 't_' + Date.now(),
      createdAt: new Date().toISOString().split('T')[0],
      enabledMenus: tenantData.enabledMenus && Array.isArray(tenantData.enabledMenus) 
        ? tenantData.enabledMenus 
        : DEFAULT_ENABLED_MENUS
    };

    // Optimistic local update
    const updatedTenants = [newTenant, ...tenants];
    setTenants(updatedTenants);
    localStorage.setItem('hv_tenants', JSON.stringify(updatedTenants));

    // Live Cloud Database update
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'tenants', newTenant.id), newTenant);
      } catch (e) {
        console.error('Failed to create tenant in Firestore:', e);
      }
    }

    // Provision default Admin account for this tenant
    if (tenantData.adminEmail) {
      const adminPass = adminPassword || 'tenant123';
      const existingUser = (userAccounts || []).find(u => (u.email || '').toLowerCase() === (tenantData.adminEmail || '').toLowerCase());
      if (!existingUser) {
        const newAdminUser: ClientUserAccount = {
          id: 'u_' + Date.now(),
          name: `${tenantData.name} Admin`,
          email: tenantData.adminEmail,
          password: adminPass,
          role: 'admin',
          tenantName: tenantData.name,
          status: 'Active',
          createdAt: new Date().toISOString().split('T')[0]
        };
        const updatedUsers = [newAdminUser, ...userAccounts];
        setUserAccounts(updatedUsers);
        if (isFirebaseConfigured && db) {
          try {
            await setDoc(doc(db, 'users', newAdminUser.id), newAdminUser);
          } catch (e) {
            console.error('Failed to create admin user in Firestore:', e);
          }
        }
      }
    }

    addAudit('Tenant Onboarded', `Created new Multi-Tenant property account "${tenantData.name}" (${tenantData.tier})`);
  };

  const updateTenantStatus = async (id: string, status: 'Active' | 'Provisioning' | 'Suspended') => {
    const target = tenants.find(t => t.id === id);
    if (!target) return;

    setTenants(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'tenants', id), { status });
      } catch (e) {
        console.error('Failed to update tenant status in Firestore:', e);
      }
    }
    await addAudit('Tenant Status Change', `Tenant ${target.name} status updated to ${status}`);
  };

  const updateTenantMenus = async (id: string, enabledMenus: string[]) => {
    const target = tenants.find(t => t.id === id);
    if (!target) return;

    setTenants(prev => prev.map(t => t.id === id ? { ...t, enabledMenus } : t));
    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'tenants', id), { enabledMenus });
      } catch (e) {
        console.error('Failed to update tenant menus in Firestore:', e);
      }
    }
    await addAudit('Tenant Menu Permissions', `Updated menu access permissions for tenant ${target.name}`);
  };

  const deleteTenantAccount = async (id: string) => {
    const target = tenants.find(t => t.id === id);
    if (!target) return;

    setTenants(prev => prev.filter(t => t.id !== id));
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'tenants', id));
      } catch (e) {
        console.error('Failed to delete tenant from Firestore:', e);
      }
    }
    await addAudit('Tenant Deletion', `Deleted tenant account ${target.name}`);
  };

  const switchTenantContext = (tenantAccountId: string) => {
    setActiveTenantId(tenantAccountId);
    setTenantId(tenantAccountId);
    localStorage.setItem('hv_active_tenant_id', tenantAccountId);
  };

  // CLIENT USERS MANAGEMENT
  const addUserAccount = async (user: Omit<ClientUserAccount, 'id' | 'createdAt'>) => {
    const id = 'u_' + Date.now();
    const newUser: ClientUserAccount = {
      ...user,
      id: 'u_' + Date.now(),
      createdAt: new Date().toISOString().split('T')[0]
    };
    const updated = [newUser, ...userAccounts];
    setUserAccounts(updated);
    localStorage.setItem('hv_user_accounts', JSON.stringify(updated));

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'users', newUser.id), newUser);
      } catch (e) {
        console.error('Failed to save user account to Firestore:', e);
      }
    }

    addAudit('User Account Created', `Created client account ${user.email} (${user.role}) for ${user.tenantName}`);
  };

  const deleteUserAccount = async (id: string) => {
    const updated = userAccounts.filter(u => u.id !== id);
    setUserAccounts(updated);
    localStorage.setItem('hv_user_accounts', JSON.stringify(updated));

    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'users', id));
      } catch (e) {
        console.error('Failed to delete user account from Firestore:', e);
      }
    }
  };

  const loginUser = (emailInput: string, passwordInput: string) => {
    const cleanInput = (emailInput || '').trim().toLowerCase();
    const cleanPassword = (passwordInput || '').trim();

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
      const tenantMatch = (tenants || []).find(t => (t.name || '').toLowerCase() === (matched.tenantName || '').toLowerCase()) || tenants[0];
      const targetTId = tenantMatch ? tenantMatch.id : 't_merridien';
      setActiveTenantId(targetTId);
      setTenantId(targetTId);
      localStorage.setItem('hv_active_tenant_id', targetTId);
      localStorage.setItem('hv_current_user', JSON.stringify(matched));
      localStorage.setItem('hv_user_role', matched.role);
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

  // CHECK IN
  const checkInRoom = async (roomId: string, guestInfo: { name: string; phone: string; email?: string; address?: string; idProof: string; gstNumber?: string; noOfGuests: number; advancePaid: number }) => {
    if (!tenantId) return;
    try {
      const roomRef = doc(db, 'tenants', tenantId, 'rooms', roomId);
      await updateDoc(roomRef, {
        status: 'Occupied',
        guestName: guestInfo.name,
        guestPhone: guestInfo.phone,
        checkInDate: new Date().toISOString().split('T')[0],
        checkOutDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // default 1 day later
        noOfGuests: guestInfo.noOfGuests,
        advancePaid: guestInfo.advancePaid,
        restaurantCharges: 0,
        barCharges: 0,
        laundryCharges: 0,
        hallCharges: 0,
        otherCharges: 0
      });
      await addAudit('Check-In', `Guest ${guestInfo.name} checked into Room ${rooms.find(r => r.id === roomId)?.roomNumber}`, undefined, 'Occupied');
    } catch (e) {
      console.error(e);
    }
  };

  // CHECK OUT & PAYMENT RECEIVE
  const checkOutRoom = async (roomId: string, paymentDetails: { method: 'Cash' | 'Card' | 'UPI' | 'Split'; discount: number; splitDetails?: string }) => {
    if (!tenantId) return;
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    try {
      const batch = writeBatch(db);

      // Reset Room
      const roomRef = doc(db, 'tenants', tenantId, 'rooms', roomId);
      batch.update(roomRef, {
        status: 'Cleaning',
        guestName: '',
        guestPhone: '',
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

      // Clear notifications related to this room checkout
      const roomNotifications = notifications.filter(n => n.message.includes(`Room ${room.roomNumber} guest`));
      roomNotifications.forEach(n => {
        batch.delete(doc(db, 'tenants', tenantId, 'notifications', n.id));
      });

      await batch.commit();
      await addAudit('Check-Out', `Guest ${room.guestName} checked out of Room ${room.roomNumber}. Paid via ${paymentDetails.method}. Discount: ₹${paymentDetails.discount}`, 'Occupied', 'Cleaning');
    } catch (e) {
      console.error(e);
    }
  };

  // ROOM TRANSFER
  const transferRoom = async (fromRoomId: string, toRoomId: string) => {
    if (!tenantId) return;
    const sourceRoom = rooms.find(r => r.id === fromRoomId);
    const destRoom = rooms.find(r => r.id === toRoomId);
    if (!sourceRoom || !destRoom) return;

    try {
      const batch = writeBatch(db);

      batch.update(doc(db, 'tenants', tenantId, 'rooms', fromRoomId), {
        status: 'Cleaning',
        guestName: '',
        guestPhone: '',
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

      batch.update(doc(db, 'tenants', tenantId, 'rooms', toRoomId), {
        status: 'Occupied',
        guestName: sourceRoom.guestName || '',
        guestPhone: sourceRoom.guestPhone || '',
        checkInDate: sourceRoom.checkInDate || '',
        checkOutDate: sourceRoom.checkOutDate || '',
        noOfGuests: sourceRoom.noOfGuests || 0,
        advancePaid: sourceRoom.advancePaid || 0,
        restaurantCharges: sourceRoom.restaurantCharges || 0,
        barCharges: sourceRoom.barCharges || 0,
        laundryCharges: sourceRoom.laundryCharges || 0,
        hallCharges: sourceRoom.hallCharges || 0,
        otherCharges: sourceRoom.otherCharges || 0
      });

      await batch.commit();
      await addAudit('Room Transfer', `Transferred guest ${sourceRoom.guestName} from Room ${sourceRoom.roomNumber} to Room ${destRoom.roomNumber}`);
    } catch (e) {
      console.error(e);
    }
  };

  // UPDATE HOUSEKEEPING/CLEANING
  const updateHousekeeping = async (roomId: string, status: RoomStatus) => {
    if (!tenantId) return;
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    const oldStatus = room.status;

    try {
      await updateDoc(doc(db, 'tenants', tenantId, 'rooms', roomId), { status });
      await addAudit('Housekeeping Change', `Room ${room.roomNumber} status changed to ${status}`, oldStatus, status);
    } catch (e) {
      console.error(e);
    }
  };

  // EXTEND STAY
  const extendStay = async (roomId: string, days: number) => {
    if (!tenantId) return;
    const room = rooms.find(r => r.id === roomId);
    if (!room || !room.checkOutDate) return;

    const oldDate = room.checkOutDate;
    const currentOutDate = new Date(room.checkOutDate);
    currentOutDate.setDate(currentOutDate.getDate() + days);
    const newDate = currentOutDate.toISOString().split('T')[0];

    try {
      await updateDoc(doc(db, 'tenants', tenantId, 'rooms', roomId), { checkOutDate: newDate });
      await addAudit('Extend Stay', `Room ${room.roomNumber} checkout date extended by ${days} days`, oldDate, newDate);
    } catch (e) {
      console.error(e);
    }
  };

  // PRE-BOOKING ACTIONS
  const addPreBooking = async (booking: Omit<PreBooking, 'id' | 'status' | 'bookingDate'>) => {
    if (!tenantId) return;
    const id = 'pb_' + Date.now();
    const newBooking: PreBooking = {
      ...booking,
      id,
      status: 'Confirmed',
      bookingDate: new Date().toISOString().split('T')[0]
    };
    try {
      await setDoc(doc(db, 'tenants', tenantId, 'preBookings', id), newBooking);
      await addAudit('Pre-Booking', `Created reservation for ${booking.guestName} in ${booking.roomCategory}`);
    } catch (e) {
      console.error(e);
    }
  };

  const cancelPreBooking = async (id: string) => {
    if (!tenantId) return;
    const booking = preBookings.find(b => b.id === id);
    if (!booking) return;

    try {
      await updateDoc(doc(db, 'tenants', tenantId, 'preBookings', id), { status: 'Cancelled' });
      await addAudit('Cancel Pre-Booking', `Cancelled reservation for ${booking.guestName}`);
    } catch (e) {
      console.error(e);
    }
  };

  const confirmPreBookingCheckIn = async (id: string, roomId: string) => {
    if (!tenantId) return;
    const booking = preBookings.find(b => b.id === id);
    const room = rooms.find(r => r.id === roomId);
    if (!booking || !room) return;

    try {
      const batch = writeBatch(db);

      batch.update(doc(db, 'tenants', tenantId, 'preBookings', id), {
        status: 'CheckedIn',
        roomNumber: room.roomNumber
      });

      batch.update(doc(db, 'tenants', tenantId, 'rooms', roomId), {
        status: 'Occupied',
        guestName: booking.guestName,
        guestPhone: booking.phone,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        noOfGuests: booking.noOfGuests,
        advancePaid: booking.advancePaid,
        restaurantCharges: 0,
        barCharges: 0,
        laundryCharges: 0,
        hallCharges: 0,
        otherCharges: 0
      });

      await batch.commit();
      await addAudit('Check-In (Pre-Booking)', `Checked in reserved guest ${booking.guestName} to Room ${room.roomNumber}`, 'Reserved', 'Occupied');
    } catch (e) {
      console.error(e);
    }
  };

  // ADD RESTAURANT OR BAR ORDER
  const addRestaurantBarOrder = async (order: Omit<Order, 'id' | 'orderNumber' | 'timestamp' | 'tax' | 'total' | 'status'>) => {
    if (!tenantId) return;
    const newId = 'o_' + Date.now();
    const prefix = order.isBar ? 'BAR-' : 'KOT-';
    const orderNo = prefix + Math.floor(1000 + Math.random() * 9000);
    
    const taxRate = order.isBar ? settings.barTaxRate : settings.taxRate;
    const taxAmount = parseFloat(((order.subtotal * taxRate) / 100).toFixed(2));
    const grandTotal = parseFloat((order.subtotal + taxAmount).toFixed(2));
    
    const isPostedToRoom = order.type === 'Room' && order.roomNumber;
    
    const finalOrder: Order = {
      ...order,
      id: newId,
      orderNumber: orderNo,
      timestamp: new Date().toLocaleString(),
      tax: taxAmount,
      total: grandTotal,
      status: isPostedToRoom ? 'PostedToRoom' : 'Paid'
    };

    try {
      const batch = writeBatch(db);

      batch.set(doc(db, 'tenants', tenantId, 'orders', newId), finalOrder);

      // If linked to Room, post charges immediately
      if (isPostedToRoom) {
        const roomMatch = rooms.find(r => r.roomNumber === order.roomNumber);
        if (roomMatch) {
          batch.update(doc(db, 'tenants', tenantId, 'rooms', roomMatch.id), {
            restaurantCharges: order.isBar ? roomMatch.restaurantCharges : roomMatch.restaurantCharges + grandTotal,
            barCharges: order.isBar ? roomMatch.barCharges + grandTotal : roomMatch.barCharges
          });
        }
      }

      await batch.commit();

      if (isPostedToRoom) {
        await addAudit('POS Link to Room', `Posted ${order.isBar ? 'Bar' : 'Restaurant'} order ${orderNo} (₹${grandTotal}) to Room ${order.roomNumber}`);
      } else {
        await addAudit('POS Sale', `Cash/Direct Sale ${orderNo} of ₹${grandTotal}`);
      }

      // Update stock levels based on menu items sold
      order.items.forEach(async (orderItem) => {
        const match = (inventory || []).find(inv => (inv.name || '').toLowerCase() === (orderItem.name || '').toLowerCase());
        if (match) {
          await updateStockLevel(match.id, orderItem.quantity, 'out');
        }
      });
    } catch (e) {
      console.error(e);
    }
  };

  // LAUNDRY ORDERS
  const addLaundryOrder = async (order: Omit<LaundryOrder, 'id' | 'orderNumber' | 'timestamp' | 'status'>) => {
    if (!tenantId) return;
    const newId = 'lnd_' + Date.now();
    const orderNo = 'LND-' + Math.floor(1000 + Math.random() * 9000);

    const finalOrder: LaundryOrder = {
      ...order,
      id: newId,
      orderNumber: orderNo,
      timestamp: new Date().toLocaleString(),
      status: 'Pending'
    };

    try {
      const batch = writeBatch(db);

      batch.set(doc(db, 'tenants', tenantId, 'laundryOrders', newId), finalOrder);

      // Automatically route to Room Bill
      const roomMatch = rooms.find(r => r.roomNumber === order.roomNumber);
      if (roomMatch) {
        batch.update(doc(db, 'tenants', tenantId, 'rooms', roomMatch.id), {
          laundryCharges: roomMatch.laundryCharges + order.totalPrice
        });
      }

      await batch.commit();

      await addAudit('Laundry Post', `Created laundry ticket ${orderNo} (₹${order.totalPrice}) and added to Room ${order.roomNumber}`);
      
      // Notify room supply use
      const detergent = (inventory || []).find(i => (i.name || '').toLowerCase().includes('detergent'));
      if (detergent) {
        const detergentUsage = 0.2 * order.items.reduce((acc, it) => acc + it.quantity, 0);
        await updateStockLevel(detergent.id, detergentUsage, 'out');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateLaundryStatus = async (id: string, status: 'Pending' | 'Delivered' | 'Completed') => {
    if (!tenantId) return;
    const order = laundryOrders.find(o => o.id === id);
    if (!order) return;

    try {
      await updateDoc(doc(db, 'tenants', tenantId, 'laundryOrders', id), { status });
      await addAudit('Laundry Update', `Laundry order ${order.orderNumber} status changed to ${status}`);
    } catch (e) {
      console.error(e);
    }
  };

  // PARTY HALL BOOKING
  const addHallBooking = async (booking: Omit<HallBooking, 'id' | 'bookingNumber' | 'status' | 'totalPrice'>) => {
    if (!tenantId) return;
    const newId = 'h_' + Date.now();
    const bookingNo = 'HAL-' + Math.floor(1000 + Math.random() * 9000);

    // Calculate total price based on features selected
    const total = booking.hallRent + booking.foodPrice + booking.decorationPrice + booking.soundSystemPrice + booking.projectorPrice + booking.cleaningCharge;

    const finalBooking: HallBooking = {
      ...booking,
      id: newId,
      bookingNumber: bookingNo,
      status: 'Confirmed',
      totalPrice: total
    };

    try {
      const batch = writeBatch(db);

      batch.set(doc(db, 'tenants', tenantId, 'hallBookings', newId), finalBooking);

      // If Room number is specified and active, link the Rent/Charges
      if (booking.roomNumber) {
        const roomMatch = rooms.find(r => r.roomNumber === booking.roomNumber);
        if (roomMatch) {
          batch.update(doc(db, 'tenants', tenantId, 'rooms', roomMatch.id), {
            hallCharges: roomMatch.hallCharges + total
          });
        }
      }

      await batch.commit();

      if (booking.roomNumber) {
        await addAudit('Hall Link to Room', `Linked Hall Booking ${bookingNo} (₹${total}) to Room ${booking.roomNumber}`);
      } else {
        await addAudit('Hall Booking', `Created Hall Booking ${bookingNo} for ${booking.guestName}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const cancelHallBooking = async (id: string) => {
    if (!tenantId) return;
    const booking = hallBookings.find(h => h.id === id);
    if (!booking) return;

    try {
      await updateDoc(doc(db, 'tenants', tenantId, 'hallBookings', id), { status: 'Cancelled' });
      await addAudit('Cancel Hall Booking', `Cancelled hall booking ${booking.bookingNumber}`);
    } catch (e) {
      console.error(e);
    }
  };

  // INVENTORY ITEMS
  const addInventoryItem = async (item: Omit<InventoryItem, 'id'>) => {
    const targetTenant = tenantId || activeTenantId || 't_merridien';
    const id = 'i_' + Date.now();
    const newItem: InventoryItem = {
      ...item,
      id
    };
    // Optimistically add item to inventory state immediately
    setInventory(prev => [newItem, ...prev.filter(i => i.id !== id)]);

    try {
      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, 'tenants', targetTenant, 'inventory', id), newItem);
      }
      await addAudit('Add Stock Item', `Created inventory track for ${item.name}`);
    } catch (e) {
      console.error('Failed to save inventory item to Firestore:', e);
    }
  };

  const deleteInventoryItem = async (id: string) => {
    const targetTenant = tenantId || activeTenantId || 't_merridien';
    const item = inventory.find(i => i.id === id);
    setInventory(prev => prev.filter(i => i.id !== id));

    try {
      if (isFirebaseConfigured && db) {
        await deleteDoc(doc(db, 'tenants', targetTenant, 'inventory', id));
      }
      if (item) {
        await addAudit('Delete SKU Item', `Deleted inventory SKU track for ${item.name}`);
      }
    } catch (e) {
      console.error('Failed to delete inventory item from Firestore:', e);
    }
  };

  const recordPurchase = async (purchase: Omit<PurchaseLog, 'id' | 'date'>) => {
    const targetTenant = tenantId || activeTenantId || 't_merridien';
    const id = 'p_' + Date.now();
    const newPurchase: PurchaseLog = {
      ...purchase,
      id,
      date: new Date().toISOString().split('T')[0]
    };

    // Optimistically update purchaseLogs and inventory immediately
    setPurchaseLogs(prev => [newPurchase, ...prev]);
    setInventory(prev => prev.map(item => {
      if ((item.name || '').toLowerCase() === (purchase.itemName || '').toLowerCase()) {
        return { ...item, stock: item.stock + purchase.quantity };
      }
      return item;
    }));

    try {
      if (isFirebaseConfigured && db) {
        const batch = writeBatch(db);

        batch.set(doc(db, 'tenants', targetTenant, 'purchaseLogs', id), newPurchase);

        // Update stock levels
        const itemMatch = (inventory || []).find(item => (item.name || '').toLowerCase() === (purchase.itemName || '').toLowerCase());
        if (itemMatch) {
          const newStock = itemMatch.stock + purchase.quantity;
          
          batch.update(doc(db, 'tenants', targetTenant, 'inventory', itemMatch.id), { stock: newStock });

          // Remove low stock alert notification if stock rose above threshold
          if (newStock >= itemMatch.minStock) {
            const matchedNotifs = notifications.filter(n => n.message.includes(itemMatch.name));
            matchedNotifs.forEach(n => {
              batch.delete(doc(db, 'tenants', targetTenant, 'notifications', n.id));
            });
          }
        }

        await batch.commit();
      }
      await addAudit('Stock Purchase', `Stock In: ${purchase.quantity} ${purchase.unit} of ${purchase.itemName} from ${purchase.supplier}`);
    } catch (e) {
      console.error('Failed to record purchase:', e);
    }
  };

  const updateStockLevel = async (itemId: string, amount: number, direction: 'in' | 'out', category?: string, description?: string) => {
    const targetTenant = tenantId || activeTenantId || 't_merridien';
    let adjustedItem: InventoryItem | undefined = inventory.find(i => i.id === itemId);

    setInventory(prev => prev.map(item => {
      if (item.id === itemId) {
        adjustedItem = item;
        const change = direction === 'in' ? amount : -amount;
        return { ...item, stock: Math.max(0, item.stock + change) };
      }
      return item;
    }));

    if (adjustedItem) {
      const change = direction === 'in' ? amount : -amount;
      const newStock = Math.max(0, adjustedItem.stock + change);

      try {
        if (isFirebaseConfigured && db) {
          const batch = writeBatch(db);

          batch.update(doc(db, 'tenants', targetTenant, 'inventory', itemId), {
            stock: parseFloat(newStock.toFixed(1))
          });

          if (newStock < adjustedItem.minStock && adjustedItem.stock >= adjustedItem.minStock) {
            const notifId = 'n_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            const newNotif: AppNotification = {
              id: notifId,
              type: 'stock',
              message: `Low Stock Alert: ${adjustedItem.name} is below threshold (${newStock.toFixed(1)}${adjustedItem.unit} remaining, min ${adjustedItem.minStock}${adjustedItem.unit})`,
              timestamp: new Date().toLocaleString(),
              read: false
            };
            batch.set(doc(db, 'tenants', targetTenant, 'notifications', notifId), newNotif);
          }
          await batch.commit();
        }
      } catch (e) {
        console.error('Failed to update stock in Firestore:', e);
      }

      const itemCat = category || adjustedItem.category;
      const desc = description || (direction === 'in' ? 'Manual Stock In adjustment' : 'Manual Stock Out adjustment');
      const newLog: StockAdjustmentLog = {
        id: 'adj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        itemId,
        itemName: adjustedItem.name,
        category: itemCat,
        amount,
        unit: adjustedItem.unit,
        direction,
        description: desc,
        date: new Date().toISOString().split('T')[0] + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setStockAdjustmentLogs(prev => [newLog, ...prev]);

      if (isFirebaseConfigured && db) {
        try {
          await setDoc(doc(db, 'tenants', targetTenant, 'stockAdjustmentLogs', newLog.id), newLog);
        } catch (e) {
          console.error('Failed to write stock adjustment log to Firestore:', e);
        }
      }

      addAudit('Stock Adjustment', `Manual ${direction === 'in' ? 'Stock-In' : 'Stock-Out'} of ${amount} ${adjustedItem.unit} for ${adjustedItem.name} (${itemCat}) - Note: ${desc}`);
    }
  };

  // UNIFIED BILLING CALCULATIONS
  const getBillSummary = (roomNumber: string): BillSummary | null => {
    const room = rooms.find(r => r.roomNumber === roomNumber);
    if (!room || room.status !== 'Occupied' || !room.checkInDate) return null;

    // Calculate stay duration
    const checkIn = new Date(room.checkInDate);
    const today = new Date();
    // Clear hours to count dates
    checkIn.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    
    let stayDuration = Math.ceil((today.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    if (stayDuration <= 0) stayDuration = 1; // Minimum 1 day rent

    const roomRentTotal = stayDuration * room.price;
    const subtotal = roomRentTotal + room.restaurantCharges + room.barCharges + room.laundryCharges + room.hallCharges + room.otherCharges;
    
    const taxRate = settings.taxRate;
    const taxAmount = parseFloat(((subtotal * taxRate) / 100).toFixed(2));
    const grandTotal = subtotal + taxAmount;
    const pendingAmount = Math.max(0, grandTotal - (room.advancePaid || 0));

    return {
      guestName: room.guestName || 'Valued Guest',
      checkInDate: room.checkInDate,
      checkOutDate: new Date().toISOString().split('T')[0],
      stayDuration,
      roomRentTotal,
      restaurantTotal: room.restaurantCharges,
      barTotal: room.barCharges,
      laundryTotal: room.laundryCharges,
      hallTotal: room.hallCharges,
      otherCharges: room.otherCharges,
      subtotal,
      taxRate,
      taxAmount,
      discount: 0,
      advancePaid: room.advancePaid || 0,
      grandTotal,
      pendingAmount
    };
  };

  const clearNotification = async (id: string) => {
    if (!tenantId) return;
    try {
      await updateDoc(doc(db, 'tenants', tenantId, 'notifications', id), { read: true });
    } catch (e) {
      console.error(e);
    }
  };

  const addMenuItem = async (item: MenuItem) => {
    if (!tenantId) return;
    try {
      await setDoc(doc(db, 'tenants', tenantId, 'menuItems', item.id), item);
    } catch (e) {
      console.error(e);
    }
  };

  const updateSettings = async (newSettings: HotelSettings) => {
    if (!tenantId) return;
    try {
      await setDoc(doc(db, 'tenants', tenantId, 'settings', 'hotel'), newSettings);
    } catch (e) {
      console.error(e);
    }
  };

  const addRoom = async (room: Omit<Room, 'status' | 'restaurantCharges' | 'barCharges' | 'laundryCharges' | 'hallCharges' | 'otherCharges'>) => {
    if (!tenantId) return;
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
      await setDoc(doc(db, 'tenants', tenantId, 'rooms', newRoom.id), newRoom);
      await addAudit('Create Room', `Added new room ${room.roomNumber} (${room.category}) at ₹${room.price}`);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteRoom = async (roomId: string) => {
    if (!tenantId) return;
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    try {
      await deleteDoc(doc(db, 'tenants', tenantId, 'rooms', roomId));
      await addAudit('Delete Room', `Deleted room ${room.roomNumber} (${room.category})`);
    } catch (e) {
      console.error(e);
    }
  };

  const resetTenantData = async () => {
    if (!tenantId) return;
    try {
      const batch = writeBatch(db);

      // 1. Delete all pre-bookings
      preBookings.forEach(pb => {
        batch.delete(doc(db, 'tenants', tenantId, 'preBookings', pb.id));
      });

      // 2. Delete all menu items
      menuItems.forEach(item => {
        batch.delete(doc(db, 'tenants', tenantId, 'menuItems', item.id));
      });

      // 3. Delete all orders
      orders.forEach(o => {
        batch.delete(doc(db, 'tenants', tenantId, 'orders', o.id));
      });

      // 4. Delete all laundry orders
      laundryOrders.forEach(lo => {
        batch.delete(doc(db, 'tenants', tenantId, 'laundryOrders', lo.id));
      });

      // 5. Delete all hall bookings
      hallBookings.forEach(hb => {
        batch.delete(doc(db, 'tenants', tenantId, 'hallBookings', hb.id));
      });

      // 6. Delete all inventory
      inventory.forEach(inv => {
        batch.delete(doc(db, 'tenants', tenantId, 'inventory', inv.id));
      });

      // 7. Delete all purchase logs
      purchaseLogs.forEach(p => {
        batch.delete(doc(db, 'tenants', tenantId, 'purchaseLogs', p.id));
      });

      // 8. Delete all audit logs
      auditLogs.forEach(a => {
        batch.delete(doc(db, 'tenants', tenantId, 'auditLogs', a.id));
      });

      // 9. Delete all notifications
      notifications.forEach(n => {
        batch.delete(doc(db, 'tenants', tenantId, 'notifications', n.id));
      });

      // 10. Delete all current rooms and re-seed clean room templates
      rooms.forEach(r => {
        batch.delete(doc(db, 'tenants', tenantId, 'rooms', r.id));
      });
      defaultRooms.forEach(r => {
        batch.set(doc(db, 'tenants', tenantId, 'rooms', r.id), r);
      });

      await batch.commit();

      // Write a fresh audit log entry
      const logId = 'a_reset_' + Date.now();
      const resetLog: AuditLog = {
        id: logId,
        username: 'System',
        role: 'admin',
        action: 'Database Reset',
        details: 'All transactional records have been wiped and rooms reset to standard vacant list.',
        timestamp: new Date().toLocaleString()
      };
      await setDoc(doc(db, 'tenants', tenantId, 'auditLogs', logId), resetLog);

      alert('Database successfully reset to a fresh state!');
    } catch (e) {
      console.error(e);
      alert('Failed to reset database: ' + (e as Error).message);
    }
  };

  return (
    <AppContext.Provider value={{
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
      auditLogs,
      notifications,
      settings,

      // Auth values
      user,
      loadingAuth,
      tenantId,
      logout,
      cloudDbConnected: isFirebaseConfigured,
      cloudDbName,
      
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
      tenants,
      activeTenantId,
      currentTenant,
      addTenantAccount,
      updateTenantStatus,
      updateTenantMenus,
      deleteTenantAccount,
      switchTenantContext,
      currentUser,
      loginUser,
      logoutUser,

      addMenuItem,
      updateSettings,
      addRoom,
      deleteRoom,
      resetTenantData
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
