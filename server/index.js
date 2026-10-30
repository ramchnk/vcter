import express from 'express';
import http from 'http';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);

// WebSocket real-time sync disabled for single-device operation
const io = {
  emit: () => {},
  on: () => {}
};

const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vcter:livedb@cluster0.uxuamo6.mongodb.net/vcter?retryWrites=true&w=majority';

// Mongoose connection options to prevent exhausting MongoDB Atlas M0 (500 connections limit)
const MONGO_OPTIONS = {
  maxPoolSize: process.env.VERCEL ? 5 : 10,
  minPoolSize: 1,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, MONGO_OPTIONS).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Middleware to ensure MongoDB connection in Serverless environments (e.g. Vercel)
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    try {
      await connectToDatabase();
      await seedDefaultData();
    } catch (err) {
      console.error('MongoDB Connection Middleware Error:', err);
    }
  }
  next();
});

// ==========================================
// MONGOOSE SCHEMAS & MODELS
// ==========================================

const tenantSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  slug: String,
  email: String,
  phone: String,
  gstNumber: String,
  subdomain: String,
  currency: { type: String, default: 'INR (₹)' },
  tier: { type: String, default: 'Standard ERP' },
  maxRooms: { type: Number, default: 50 },
  adminEmail: String,
  enabledMenus: { 
    type: [String], 
    default: ['dashboard', 'rooms', 'prebookings', 'menu_items', 'restaurant', 'bar', 'laundry', 'hall', 'stock', 'expenses', 'billing', 'reports', 'settings', 'audit'] 
  },
  status: { type: String, default: 'Active' },
  createdAt: { type: String, default: () => new Date().toISOString().split('T')[0] }
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  email: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  tenantName: String,
  tenantId: String,
  status: { type: String, default: 'Active' },
  createdAt: { type: String, default: () => new Date().toISOString().split('T')[0] }
}, { timestamps: true });

const roomSchema = new mongoose.Schema({
  id: { type: String, required: true },
  tenantId: { type: String, required: true },
  roomNumber: { type: String, required: true },
  category: { type: String, default: 'Standard' },
  floor: { type: Number, default: 1 },
  price: { type: Number, default: 1500 },
  basePrice: { type: Number, default: 1500 },
  bookingSource: { type: String, default: 'Direct / Walk-In' },
  bookingReference: { type: String, default: '' },
  isAcSwitchedOff: { type: Boolean, default: false },
  status: { type: String, default: 'Available' },
  groupBookingId: { type: String, default: '' },
  groupBookingName: { type: String, default: '' },
  guestName: { type: String, default: '' },
  guestPhone: { type: String, default: '' },
  guestEmail: { type: String, default: '' },
  guestAddress: { type: String, default: '' },
  guestIdProof: { type: String, default: '' },
  gstNumber: { type: String, default: '' },
  companyName: { type: String, default: '' },
  checkInDate: { type: String, default: '' },
  checkInTime: { type: String, default: '' },
  checkOutDate: { type: String, default: '' },
  noOfGuests: { type: Number, default: 0 },
  advancePaid: { type: Number, default: 0 },
  advanceReceiptNumber: { type: String, default: '' },
  advancePaymentDate: { type: String, default: '' },
  advancePaymentMethod: { type: String, default: 'Cash' },
  advanceReceivedBy: { type: String, default: 'Manager (Front Desk Manager)' },
  restaurantCharges: { type: Number, default: 0 },
  barCharges: { type: Number, default: 0 },
  laundryCharges: { type: Number, default: 0 },
  hallCharges: { type: Number, default: 0 },
  otherCharges: { type: Number, default: 0 },
  otherChargesDescription: { type: String, default: '' }
}, { timestamps: true });
roomSchema.index({ id: 1, tenantId: 1 }, { unique: true });

const orderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  tenantId: { type: String, required: true },
  orderNumber: String,
  type: { type: String, enum: ['Room', 'WalkIn'], default: 'Room' },
  roomNumber: String,
  guestName: String,
  items: [{
    menuItemId: String,
    name: String,
    price: Number,
    quantity: Number
  }],
  subtotal: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  status: { type: String, default: 'Paid' },
  paymentMethod: { type: String, default: 'Cash' },
  splitDetails: { type: String, default: '' },
  discount: { type: Number, default: 0 },
  tableNumber: { type: String, default: '' },
  isBar: { type: Boolean, default: false },
  timestamp: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true });

const menuItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  tenantId: { type: String, required: true },
  name: String,
  category: String,
  price: Number,
  isBar: { type: Boolean, default: false },
  isAvailable: { type: Boolean, default: true },
  imageUrl: String,
  dietary: { type: String, enum: ['Veg', 'Non-Veg', 'Drinks'], default: 'Veg' },
  isCombo: { type: Boolean, default: false },
  description: String,
  recipe: [{
    inventoryItemId: String,
    itemName: String,
    deductionType: { type: String, default: 'qty' }, // 'qty' | 'ml'
    quantity: { type: Number, default: 1 },
    unit: String
  }]
}, { timestamps: true });
menuItemSchema.index({ id: 1, tenantId: 1 }, { unique: true });

const inventorySchema = new mongoose.Schema({
  id: { type: String, required: true },
  tenantId: { type: String, required: true },
  name: String,
  category: String,
  stock: { type: Number, default: 0 },
  minStock: { type: Number, default: 5 },
  unit: { type: String, default: 'units' },
  bottleSizeMl: { type: Number, default: 750 },
  pricePerUnit: { type: Number, default: 0 },
  expiryDate: String,
  barcode: String,
  lastRestocked: String
}, { timestamps: true });
inventorySchema.index({ id: 1, tenantId: 1 }, { unique: true });

const purchaseLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  tenantId: { type: String, required: true },
  date: String,
  supplier: String,
  invoiceNo: String,
  itemName: String,
  category: String,
  quantity: Number,
  unit: String,
  pricePerUnit: Number,
  gstAmount: Number,
  totalAmount: Number
}, { timestamps: true });

const stockAdjustmentLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  tenantId: { type: String, required: true },
  itemId: String,
  itemName: String,
  category: String,
  direction: String,
  amount: Number,
  unit: String,
  description: String,
  date: String,
  performedBy: String,
  timestamp: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true });

const laundryOrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  tenantId: { type: String, required: true },
  orderNumber: String,
  roomNumber: String,
  guestName: String,
  items: [{
    itemType: String,
    service: String,
    quantity: Number,
    price: Number
  }],
  isExpress: { type: Boolean, default: false },
  subtotal: Number,
  tax: Number,
  totalPrice: Number,
  status: { type: String, default: 'Pending' },
  timestamp: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true });

const hallBookingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  tenantId: { type: String, required: true },
  bookingNumber: String,
  hallType: String,
  guestName: String,
  phone: String,
  date: String,
  timeSlot: String,
  slot: String,
  advancePaid: { type: Number, default: 0 },
  foodPackage: String,
  foodPrice: { type: Number, default: 0 },
  decorationPrice: { type: Number, default: 0 },
  soundSystemPrice: { type: Number, default: 0 },
  projectorPrice: { type: Number, default: 0 },
  cleaningCharge: { type: Number, default: 0 },
  hallRent: { type: Number, default: 0 },
  totalPrice: { type: Number, default: 0 },
  status: { type: String, default: 'Confirmed' },
  roomNumber: String,
  createdDate: { type: String, default: () => new Date().toISOString().split('T')[0] }
}, { timestamps: true });

const preBookingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  tenantId: { type: String, required: true },
  guestName: String,
  phone: String,
  email: String,
  address: String,
  idProof: String,
  gstNumber: String,
  companyName: String,
  roomCategory: String,
  roomNumber: String,
  roomPrice: Number,
  groupBookingId: { type: String, default: '' },
  groupBookingName: { type: String, default: '' },
  occupantName: { type: String, default: '' },
  bookingSource: { type: String, default: 'Direct / Walk-In' },
  bookingReference: { type: String, default: '' },
  isAcSwitchedOff: { type: Boolean, default: false },
  checkInDate: String,
  checkInTime: { type: String, default: '' },
  checkOutDate: String,
  noOfGuests: { type: Number, default: 1 },
  advancePaid: { type: Number, default: 0 },
  advanceReceiptNumber: { type: String, default: '' },
  advancePaymentDate: { type: String, default: '' },
  advancePaymentMethod: { type: String, default: '' },
  advanceReceivedBy: { type: String, default: 'Manager (Front Desk Manager)' },
  totalAmount: { type: Number, default: 0 },
  roomRentTotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  specialRequests: String,
  status: { type: String, default: 'Pending' },
  bookingDate: { type: String, default: () => new Date().toISOString().split('T')[0] }
}, { timestamps: true });

const auditLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  tenantId: String,
  username: { type: String, default: 'System' },
  role: { type: String, default: 'admin' },
  action: String,
  details: String,
  oldValue: String,
  newValue: String,
  timestamp: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true });

const settingsSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, unique: true },
  name: { type: String, default: 'HotelVista Grand' },
  tagline: { type: String, default: '' },
  address: { type: String, default: '123 Beach Road, Resort City' },
  phone: { type: String, default: '+91 98765 43210' },
  landline: { type: String, default: '' },
  email: { type: String, default: 'contact@hotelvistagrand.com' },
  gstNumber: { type: String, default: '33AAAAA0000A1Z5' },
  taxRate: { type: Number, default: 18 },
  barTaxRate: { type: Number, default: 20 },
  invoicePrefix: { type: String, default: 'HV-INV-' },
  logoUrl: String,
  checkInTime: { type: String, default: '12:00 PM' },
  checkOutTime: { type: String, default: '11:00 AM' },
  fast2smsApiKey: { type: String, default: 'Ey3CbXkpz0rv9tBH214oqRuawJAlnsF7eVUjQPcdD5OSiZLIxgT2r7aCFXujWlE105K4ZSAytOJfpUMI' },
  eodPhoneNumbers: { type: String, default: '9788866964, 9786136555' },
  eodAutoSend: { type: Boolean, default: false },
  eodSendTime: { type: String, default: '23:30' },
  eodLastSentAt: { type: String, default: '' }
}, { timestamps: true, strict: false });

const notificationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  tenantId: { type: String, required: true },
  type: { type: String, default: 'info' },
  message: String,
  timestamp: { type: String, default: () => new Date().toISOString() },
  read: { type: Boolean, default: false }
}, { timestamps: true });

const expenseSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  tenantId: { type: String, required: true },
  date: { type: String, default: () => new Date().toISOString().split('T')[0] },
  department: { type: String, required: true }, // 'Rooms' | 'Restaurant' | 'Bar' | 'General'
  category: { type: String, default: 'Miscellaneous' },
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, default: 'Cash' }, // 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Credit / Due'
  paidTo: String,
  receiptNumber: String,
  notes: String,
  recordedBy: { type: String, default: 'Staff' }
}, { timestamps: true });

const restaurantTableSchema = new mongoose.Schema({
  id: { type: String, required: true },
  tenantId: { type: String, required: true },
  tableNumber: { type: String, required: true },
  section: { type: String, default: 'Main Dining' },
  capacity: { type: Number, default: 4 },
  status: { type: String, enum: ['Available', 'Occupied', 'Billed'], default: 'Available' },
  guestName: { type: String, default: '' },
  pax: { type: Number, default: 2 },
  seatedAt: String,
  serverName: String,
  isBar: { type: Boolean, default: false },
  kotRounds: [{
    kotNumber: String,
    roundNumber: Number,
    timestamp: { type: String, default: () => new Date().toISOString() },
    instructions: String,
    items: [{
      menuItemId: String,
      name: String,
      price: Number,
      quantity: Number,
      notes: String
    }]
  }],
  runningItems: [{
    menuItemId: String,
    name: String,
    price: Number,
    quantity: Number,
    notes: String
  }],
  subtotal: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, default: 0 }
}, { timestamps: true });
restaurantTableSchema.index({ id: 1, tenantId: 1 }, { unique: true });

export const Tenant = mongoose.model('Tenant', tenantSchema);
export const User = mongoose.model('User', userSchema);
export const Room = mongoose.model('Room', roomSchema);
export const Order = mongoose.model('Order', orderSchema);
export const MenuItem = mongoose.model('MenuItem', menuItemSchema);
export const Inventory = mongoose.model('Inventory', inventorySchema);
export const PurchaseLog = mongoose.model('PurchaseLog', purchaseLogSchema);
export const StockAdjustmentLog = mongoose.model('StockAdjustmentLog', stockAdjustmentLogSchema);
export const LaundryOrder = mongoose.model('LaundryOrder', laundryOrderSchema);
export const HallBooking = mongoose.model('HallBooking', hallBookingSchema);
export const PreBooking = mongoose.model('PreBooking', preBookingSchema);
export const Expense = mongoose.model('Expense', expenseSchema);
export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export const Settings = mongoose.model('Settings', settingsSchema);
export const Notification = mongoose.model('Notification', notificationSchema);
export const RestaurantTable = mongoose.model('RestaurantTable', restaurantTableSchema);

const cashWalletTransactionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  tenantId: { type: String, required: true },
  department: { type: String, required: true }, // 'Rooms' | 'Bar'
  type: { type: String, required: true }, // 'TopUp' | 'Withdrawal' | 'OpeningAdjustment'
  amount: { type: Number, required: true },
  date: { type: String, default: () => new Date().toISOString().split('T')[0] },
  time: { type: String, default: '' },
  performedBy: { type: String, default: 'Cashier' },
  recipient: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { timestamps: true });
cashWalletTransactionSchema.index({ id: 1, tenantId: 1 }, { unique: true });

export const CashWalletTransaction = mongoose.model('CashWalletTransaction', cashWalletTransactionSchema);

// ==========================================
// SEED INITIAL DEFAULTS IF EMPTY
// ==========================================
async function seedDefaultData() {
  try {
    // 1. Ensure SuperAdmin exists
    const superAdmin = await User.findOne({ id: 'u_superadmin' });
    if (!superAdmin) {
      await User.create({
        id: 'u_superadmin',
        name: 'Super Admin',
        email: 'superAdmin',
        password: 'admin',
        role: 'super_admin',
        tenantName: 'HotelVista Central SaaS',
        status: 'Active'
      });
      console.log('Seeded superAdmin in MongoDB');
    }

    // 2. Ensure default tenants exist
    const tenantCount = await Tenant.countDocuments();
    if (tenantCount === 0) {
      await Tenant.create([
        {
          id: 't_1789027079838',
          name: 'Vari Park',
          slug: 'Dindigul',
          email: 'vari@dindigul.com',
          phone: '+91 9842414914',
          gstNumber: '36AAACH0000K1Z0',
          subdomain: 'Dindigul.hotelvista.com',
          tier: 'Standard ERP',
          maxRooms: 100,
          enabledMenus: ['stock', 'audit', 'dashboard', 'rooms', 'restaurant', 'bar', 'billing', 'reports'],
          status: 'Active',
          createdAt: '2026-09-10'
        },
        {
          id: 't_merridien',
          name: 'Hotel Le Merridien',
          slug: 'merridien',
          email: 'contact@merridien.com',
          phone: '+91 9342593038',
          gstNumber: '33AAACH1234K1Z0',
          subdomain: 'merridien.hotelvista.com',
          tier: 'Enterprise Multi-Property',
          maxRooms: 150,
          enabledMenus: ['dashboard', 'rooms', 'prebookings', 'restaurant', 'bar', 'laundry', 'hall', 'stock', 'billing', 'reports', 'settings', 'audit'],
          status: 'Active',
          createdAt: '2026-01-01'
        }
      ]);
      console.log('Seeded default tenants');
    }

    // 3. Seed Rooms for tenants if empty
    const roomCount = await Room.countDocuments();
    if (roomCount === 0) {
      const defaultRooms = [
        { id: 'r101', roomNumber: '101', category: 'Deluxe AC', floor: 1, price: 1500, status: 'Available' },
        { id: 'r102', roomNumber: '102', category: 'Deluxe AC', floor: 1, price: 1500, status: 'Available' },
        { id: 'r103', roomNumber: '103', category: 'Deluxe AC', floor: 1, price: 1500, status: 'Available' },
        { id: 'r104', roomNumber: '104', category: 'Deluxe AC', floor: 1, price: 1500, status: 'Available' },
        { id: 'r105', roomNumber: '105', category: 'Deluxe AC', floor: 1, price: 1500, status: 'Available' },
        { id: 'r106', roomNumber: '106', category: 'Deluxe AC', floor: 1, price: 1500, status: 'Available' },
        { id: 'r201', roomNumber: '201', category: 'Deluxe Superior', floor: 2, price: 2500, status: 'Available' },
        { id: 'r202', roomNumber: '202', category: 'Deluxe Superior', floor: 2, price: 2500, status: 'Available' },
        { id: 'r203', roomNumber: '203', category: 'Deluxe Superior', floor: 2, price: 2500, status: 'Available' },
        { id: 'r204', roomNumber: '204', category: 'Deluxe Superior', floor: 2, price: 2500, status: 'Available' },
        { id: 'r205', roomNumber: '205', category: 'Deluxe Superior', floor: 2, price: 2500, status: 'Available' },
        { id: 'r301', roomNumber: '301', category: 'Elite', floor: 3, price: 4000, status: 'Available' },
        { id: 'r302', roomNumber: '302', category: 'Elite', floor: 3, price: 4000, status: 'Available' },
        { id: 'r303', roomNumber: '303', category: 'Superior', floor: 3, price: 5500, status: 'Available' },
        { id: 'r304', roomNumber: '304', category: 'Superior', floor: 3, price: 5500, status: 'Available' },
        { id: 'r401', roomNumber: '401', category: 'Family Suite', floor: 4, price: 8000, status: 'Available' },
        { id: 'r402', roomNumber: '402', category: 'Family Suite', floor: 4, price: 8000, status: 'Available' }
      ];

      const tenants = await Tenant.find();
      for (const t of tenants) {
        for (const r of defaultRooms) {
          await Room.create({ ...r, tenantId: t.id });
        }
      }
      console.log('Seeded default rooms for tenants');
    }

    // 4. Seed Menu Items if empty
    const menuCount = await MenuItem.countDocuments();
    if (menuCount === 0) {
      const defaultMenuItems = [
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
      const tenants = await Tenant.find();
      for (const t of tenants) {
        for (const m of defaultMenuItems) {
          await MenuItem.create({ ...m, tenantId: t.id });
        }
      }
      console.log('Seeded default menu items for tenants');
    }

    // 5. Seed Inventory if empty
    const invCount = await Inventory.countDocuments();
    if (invCount === 0) {
      const defaultInventory = [
        { id: 'i1', name: 'Basmati Rice Premium 25kg', category: 'Food', stock: 12, minStock: 3, unit: 'bag', pricePerUnit: 2400, barcode: '8901234567890' },
        { id: 'i2', name: 'Cooking Oil 15L Tin', category: 'Food', stock: 8, minStock: 2, unit: 'tin', pricePerUnit: 2100, barcode: '8901234567891' },
        { id: 'i3', name: 'Kingfisher Ultra Beer 650ml Case', category: 'Liquor', stock: 15, minStock: 4, unit: 'case', pricePerUnit: 3200, barcode: '8901234567892' },
        { id: 'i4', name: 'Bed Linen Set - Queen', category: 'Housekeeping', stock: 45, minStock: 10, unit: 'set', pricePerUnit: 850, barcode: '8901234567893' },
        { id: 'i5', name: 'Toiletries Kit - Luxury', category: 'Housekeeping', stock: 180, minStock: 50, unit: 'kit', pricePerUnit: 45, barcode: '8901234567894' }
      ];
      const tenants = await Tenant.find();
      for (const t of tenants) {
        for (const inv of defaultInventory) {
          await Inventory.create({ ...inv, tenantId: t.id });
        }
      }
      console.log('Seeded default inventory for tenants');
    }

    // Ensure all existing tenants have 'expenses' in enabledMenus
    await Tenant.updateMany(
      { enabledMenus: { $exists: true, $ne: [] } },
      { $addToSet: { enabledMenus: 'expenses' } }
    );
  } catch (e) {
    console.error('Error seeding default data:', e);
  }
}

// ==========================================
// REST API ROUTES
// ==========================================

// --- TENANTS ---
app.get('/api/tenants', async (req, res) => {
  try {
    const tenants = await Tenant.find().sort({ createdAt: -1 });
    res.json(tenants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tenants', async (req, res) => {
  try {
    const allMenus = ['dashboard', 'rooms', 'prebookings', 'menu_items', 'restaurant', 'bar', 'laundry', 'hall', 'stock', 'expenses', 'billing', 'reports', 'settings', 'audit'];
    const tenantData = {
      ...req.body,
      enabledMenus: (req.body.enabledMenus && req.body.enabledMenus.length > 0) ? req.body.enabledMenus : allMenus
    };
    const tenant = await Tenant.create(tenantData);
    const defaultSettings = {
      tenantId: tenant.id,
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
      gstNumber: tenant.gstNumber || 'GST-PENDING'
    };
    await Settings.findOneAndUpdate({ tenantId: tenant.id }, defaultSettings, { upsert: true, returnDocument: 'after' });
    io.emit('tenant_created', tenant);
    res.json(tenant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tenants/:id', async (req, res) => {
  try {
    const tenant = await Tenant.findOneAndUpdate({ id: req.params.id }, req.body, { returnDocument: 'after' });
    io.emit('tenant_updated', tenant);
    res.json(tenant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tenants/:id', async (req, res) => {
  try {
    await Tenant.deleteOne({ id: req.params.id });
    await Room.deleteMany({ tenantId: req.params.id });
    await Order.deleteMany({ tenantId: req.params.id });
    await MenuItem.deleteMany({ tenantId: req.params.id });
    await Inventory.deleteMany({ tenantId: req.params.id });
    await User.deleteMany({ tenantId: req.params.id });
    io.emit('tenant_deleted', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- USERS ---
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const user = await User.create(req.body);
    io.emit('user_created', user);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findOneAndUpdate({ id: req.params.id }, req.body, { returnDocument: 'after' });
    io.emit('user_updated', user);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const result = await User.deleteOne({ id: req.params.id });
    io.emit('user_deleted', req.params.id);
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ROOMS ---
app.get('/api/rooms', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const filter = tenantId ? { tenantId } : {};
    const rooms = await Room.find(filter).sort({ roomNumber: 1 });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rooms', async (req, res) => {
  try {
    const room = await Room.create(req.body);
    io.emit('room_created', room);
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/rooms/:id', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const filter = tenantId ? { id: req.params.id, tenantId } : { id: req.params.id };
    const room = await Room.findOneAndUpdate(filter, req.body, { returnDocument: 'after' });
    io.emit('room_updated', room);
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rooms/:id/advance', async (req, res) => {
  const { tenantId } = req.query;
  const { amount, receiptNumber, paymentDate, paymentMethod, receivedBy } = req.body;
  try {
    const filter = tenantId ? { id: req.params.id, tenantId } : { id: req.params.id };
    const room = await Room.findOne(filter);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    room.advancePaid = (room.advancePaid || 0) + Number(amount || 0);
    if (receiptNumber) room.advanceReceiptNumber = receiptNumber;
    if (paymentDate) room.advancePaymentDate = paymentDate;
    if (paymentMethod) room.advancePaymentMethod = paymentMethod;
    if (receivedBy) room.advanceReceivedBy = receivedBy;

    await room.save();
    io.emit('room_updated', room);
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rooms/transfer', async (req, res) => {
  const { tenantId, fromRoomId, toRoomId } = req.body;
  try {
    const filterFrom = tenantId ? { id: fromRoomId, tenantId } : { id: fromRoomId };
    const filterTo = tenantId ? { id: toRoomId, tenantId } : { id: toRoomId };

    const source = await Room.findOne(filterFrom);
    const dest = await Room.findOne(filterTo);

    if (!source || !dest) {
      return res.status(404).json({ error: 'Source or destination room not found' });
    }

    // 1. Copy full guest, stay, price, booking, and payment details to destination room
    dest.status = 'Occupied';
    dest.guestName = source.guestName || '';
    dest.guestPhone = source.guestPhone || '';
    dest.guestEmail = source.guestEmail || '';
    dest.guestAddress = source.guestAddress || '';
    dest.guestIdProof = source.guestIdProof || '';
    dest.gstNumber = source.gstNumber || '';
    dest.companyName = source.companyName || '';
    dest.checkInDate = source.checkInDate || '';
    dest.checkInTime = source.checkInTime || '';
    dest.checkOutDate = source.checkOutDate || '';
    dest.noOfGuests = source.noOfGuests || 0;
    dest.price = source.price || dest.price;
    dest.bookingSource = source.bookingSource || 'Direct / Walk-In';
    dest.bookingReference = source.bookingReference || '';
    dest.isAcSwitchedOff = !!source.isAcSwitchedOff;
    dest.groupBookingId = source.groupBookingId || '';
    dest.groupBookingName = source.groupBookingName || '';

    // Payment details transfer
    dest.advancePaid = Number(source.advancePaid) || 0;
    dest.advanceReceiptNumber = source.advanceReceiptNumber || '';
    dest.advancePaymentDate = source.advancePaymentDate || source.checkInDate || '';
    dest.advancePaymentMethod = source.advancePaymentMethod || 'Cash';
    dest.advanceReceivedBy = source.advanceReceivedBy || 'Manager (Front Desk Manager)';

    // Service charges transfer
    dest.restaurantCharges = source.restaurantCharges || 0;
    dest.barCharges = source.barCharges || 0;
    dest.laundryCharges = source.laundryCharges || 0;
    dest.hallCharges = source.hallCharges || 0;
    dest.otherCharges = source.otherCharges || 0;
    dest.otherChargesDescription = source.otherChargesDescription || '';

    await dest.save();

    // 2. Reset source room back to standard clean state
    source.status = 'Cleaning';
    source.guestName = '';
    source.guestPhone = '';
    source.guestEmail = '';
    source.guestAddress = '';
    source.guestIdProof = '';
    source.gstNumber = '';
    source.companyName = '';
    source.checkInDate = '';
    source.checkInTime = '';
    source.checkOutDate = '';
    source.noOfGuests = 0;
    source.price = source.basePrice || source.price || 1500;
    source.bookingSource = '';
    source.bookingReference = '';
    source.isAcSwitchedOff = false;
    source.groupBookingId = '';
    source.groupBookingName = '';
    source.advancePaid = 0;
    source.advanceReceiptNumber = '';
    source.advancePaymentDate = '';
    source.advancePaymentMethod = 'Cash';
    source.advanceReceivedBy = '';
    source.restaurantCharges = 0;
    source.barCharges = 0;
    source.laundryCharges = 0;
    source.hallCharges = 0;
    source.otherCharges = 0;
    source.otherChargesDescription = '';

    await source.save();

    // 3. Update active matching preBooking / reservation to target room
    const pbFilter = tenantId 
      ? { tenantId, roomNumber: source.roomNumber, status: { $in: ['CheckedIn', 'Confirmed'] } }
      : { roomNumber: source.roomNumber, status: { $in: ['CheckedIn', 'Confirmed'] } };
    
    await PreBooking.updateMany(pbFilter, {
      $set: {
        roomNumber: dest.roomNumber,
        roomCategory: dest.category,
        advancePaid: dest.advancePaid,
        advancePaymentMethod: dest.advancePaymentMethod,
        advanceReceiptNumber: dest.advanceReceiptNumber,
        advancePaymentDate: dest.advancePaymentDate
      }
    });

    // 4. Transfer posted restaurant & bar orders to target room
    const orderFilter = tenantId 
      ? { tenantId, roomNumber: source.roomNumber, status: 'PostedToRoom' }
      : { roomNumber: source.roomNumber, status: 'PostedToRoom' };
    await Order.updateMany(orderFilter, { $set: { roomNumber: dest.roomNumber } });

    // 5. Transfer laundry orders to target room
    const laundryFilter = tenantId 
      ? { tenantId, roomNumber: source.roomNumber, status: { $ne: 'Delivered' } }
      : { roomNumber: source.roomNumber, status: { $ne: 'Delivered' } };
    await LaundryOrder.updateMany(laundryFilter, { $set: { roomNumber: dest.roomNumber } });

    io.emit('room_updated', source);
    io.emit('room_updated', dest);

    res.json({ success: true, source, dest });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/rooms/:id', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const filter = tenantId ? { id: req.params.id, tenantId } : { id: req.params.id };
    await Room.deleteOne(filter);
    io.emit('room_deleted', { id: req.params.id, tenantId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ORDERS (RESTAURANT & BAR POS) ---
app.get('/api/orders', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const filter = tenantId ? { tenantId } : {};
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: Deduct inventory stock for order/KOT items based on MenuItem recipe mappings or 1:1 match
async function deductInventoryForOrderItems(tenantId, items, referenceNo) {
  if (!items || !Array.isArray(items) || !tenantId) return;

  for (const item of items) {
    const itemQty = Number(item.quantity) || 1;
    let menuItem = null;

    if (item.menuItemId) {
      menuItem = await MenuItem.findOne({ tenantId, id: item.menuItemId });
    }
    if (!menuItem && item.name) {
      menuItem = await MenuItem.findOne({
        tenantId,
        name: new RegExp(`^${item.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
      });
    }
    if (!menuItem && item.name) {
      menuItem = await MenuItem.findOne({
        tenantId,
        name: new RegExp(item.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      });
    }

    let deducted = false;

    // 1. If MenuItem has mapped recipes / combo items
    if (menuItem && menuItem.recipe && Array.isArray(menuItem.recipe) && menuItem.recipe.length > 0) {
      for (const recipeItem of menuItem.recipe) {
        let inv = null;
        if (recipeItem.inventoryItemId) {
          inv = await Inventory.findOne({ tenantId, id: recipeItem.inventoryItemId });
        }
        if (!inv && recipeItem.itemName) {
          inv = await Inventory.findOne({
            tenantId,
            name: new RegExp(`^${recipeItem.itemName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
          });
        }
        if (!inv && recipeItem.itemName) {
          inv = await Inventory.findOne({
            tenantId,
            name: new RegExp(recipeItem.itemName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
          });
        }

        if (inv) {
          deducted = true;
          const recipeQty = Number(recipeItem.quantity) || 1;
          const totalDeduct = recipeQty * itemQty;
          let deductAmount = totalDeduct;
          let unitLabel = recipeItem.unit || inv.unit || 'units';

          if (recipeItem.deductionType === 'ml') {
            const isTrackedInMl = (inv.unit || '').toLowerCase() === 'ml';
            if (!isTrackedInMl) {
              const bottleSize = Number(inv.bottleSizeMl) || 750;
              deductAmount = parseFloat((totalDeduct / bottleSize).toFixed(4));
              unitLabel = `${inv.unit || 'bottle'} (${totalDeduct}ml)`;
            } else {
              deductAmount = totalDeduct;
              unitLabel = 'ml';
            }
          }

          const updatedStock = Math.max(0, parseFloat(((inv.stock || 0) - deductAmount).toFixed(4)));
          inv.stock = updatedStock;
          await inv.save();

          try {
            const adjLog = await StockAdjustmentLog.create({
              id: 'adj_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
              tenantId,
              itemId: inv.id,
              itemName: inv.name,
              category: inv.category,
              amount: deductAmount,
              unit: inv.unit,
              direction: 'out',
              description: `POS [${referenceNo || 'SALE'}]: ${itemQty}x ${item.name} (${deductAmount} ${unitLabel})`,
              date: new Date().toISOString().split('T')[0]
            });
            io.emit('stock_adjustment_created', adjLog);

            const audit = await AuditLog.create({
              id: 'aud_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
              tenantId,
              username: 'POS Auto-Stock',
              role: 'System',
              action: 'Stock Auto-Deduction',
              details: `Auto-deducted ${deductAmount} ${unitLabel} of ${inv.name} for ${referenceNo || 'POS Bill'}`
            });
            io.emit('audit_log_created', audit);
          } catch (logErr) {
            console.error('Stock adjustment log error:', logErr);
          }

          io.emit('inventory_updated', inv);
        }
      }
    }

    // 2. Fallback: Intelligent liquor volume / direct SKU matching
    if (!deducted) {
      const mlRegex = /(\d+)\s*(ml|ML)/i;
      const mlMatch = (item.name || '').match(mlRegex);
      const extractedMl = mlMatch ? parseInt(mlMatch[1]) : null;
      const baseName = (item.name || '').replace(mlRegex, '').replace(/[()\-–]/g, ' ').trim();

      let inv = null;
      if (item.menuItemId) {
        inv = await Inventory.findOne({ tenantId, id: item.menuItemId });
      }
      if (!inv && item.name) {
        inv = await Inventory.findOne({
          tenantId,
          name: new RegExp(`^${item.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
        });
      }
      if (!inv && baseName) {
        inv = await Inventory.findOne({
          tenantId,
          name: new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
        });
      }
      if (!inv && baseName) {
        inv = await Inventory.findOne({
          tenantId,
          name: new RegExp(baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
        });
      }

      if (inv) {
        const isLiquor = (inv.category || '').toLowerCase() === 'liquor' || Boolean(inv.bottleSizeMl && inv.bottleSizeMl > 0);
        let deductAmount = itemQty;
        let unitLabel = inv.unit || 'units';

        if (isLiquor && extractedMl && extractedMl > 0) {
          const totalMl = extractedMl * itemQty;
          const isTrackedInMl = (inv.unit || '').toLowerCase() === 'ml';
          if (!isTrackedInMl) {
            const bottleSize = Number(inv.bottleSizeMl) || 750;
            deductAmount = parseFloat((totalMl / bottleSize).toFixed(4));
            unitLabel = `${inv.unit || 'bottle'} (${totalMl}ml)`;
          } else {
            deductAmount = totalMl;
            unitLabel = 'ml';
          }
        }

        const updatedStock = Math.max(0, parseFloat(((inv.stock || 0) - deductAmount).toFixed(4)));
        inv.stock = updatedStock;
        await inv.save();

        try {
          const adjLog = await StockAdjustmentLog.create({
            id: 'adj_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
            tenantId,
            itemId: inv.id,
            itemName: inv.name,
            category: inv.category,
            amount: deductAmount,
            unit: inv.unit,
            direction: 'out',
            description: `POS [${referenceNo || 'SALE'}]: ${itemQty}x ${item.name} (${deductAmount} ${unitLabel})`,
            date: new Date().toISOString().split('T')[0]
          });
          io.emit('stock_adjustment_created', adjLog);

          const audit = await AuditLog.create({
            id: 'aud_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
            tenantId,
            username: 'POS Auto-Stock',
            role: 'System',
            action: 'Stock Auto-Deduction',
            details: `Auto-deducted ${deductAmount} ${unitLabel} of ${inv.name} for ${referenceNo || 'POS Bill'}`
          });
          io.emit('audit_log_created', audit);
        } catch (logErr) {
          console.error('Stock adjustment log error:', logErr);
        }

        io.emit('inventory_updated', inv);
      }
    }
  }
}

app.post('/api/orders', async (req, res) => {
  try {
    const orderData = req.body;
    const order = await Order.create(orderData);

    if (order.type === 'Room' && order.roomNumber && order.tenantId) {
      const room = await Room.findOne({ roomNumber: order.roomNumber, tenantId: order.tenantId });
      if (room) {
        if (order.isBar) {
          room.barCharges = (Number(room.barCharges) || 0) + order.total;
        } else {
          room.restaurantCharges = (Number(room.restaurantCharges) || 0) + order.total;
        }
        await room.save();
        io.emit('room_updated', room);
      }
    }

    // Deduct stock using recipe mappings
    await deductInventoryForOrderItems(order.tenantId, order.items, order.orderNumber);

    io.emit('order_created', order);
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/orders/settle-room', async (req, res) => {
  const { tenantId, roomNumber } = req.body;
  try {
    if (tenantId && roomNumber) {
      await Order.updateMany(
        { tenantId, roomNumber, status: 'PostedToRoom' },
        { $set: { status: 'Settled' } }
      );
      const updatedOrders = await Order.find({ tenantId }).sort({ createdAt: -1 });
      io.emit('orders_bulk_updated', updatedOrders);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  try {
    await Order.deleteOne({ id: req.params.id });
    io.emit('order_deleted', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RESTAURANT & BAR TABLES & KOT PARKING ---
const defaultRestaurantTables = [
  { id: 'tbl_1', tableNumber: 'T-1', section: 'Main Dining', capacity: 2, isBar: false },
  { id: 'tbl_2', tableNumber: 'T-2', section: 'Main Dining', capacity: 4, isBar: false },
  { id: 'tbl_3', tableNumber: 'T-3', section: 'Main Dining', capacity: 4, isBar: false },
  { id: 'tbl_4', tableNumber: 'T-4', section: 'Main Dining', capacity: 6, isBar: false },
  { id: 'tbl_5', tableNumber: 'T-5', section: 'Main Dining', capacity: 4, isBar: false },
  { id: 'tbl_6', tableNumber: 'T-6', section: 'VIP Cabana', capacity: 8, isBar: false },
  { id: 'tbl_b1', tableNumber: 'B-1', section: 'Bar Lounge', capacity: 2, isBar: true },
  { id: 'tbl_b2', tableNumber: 'B-2', section: 'Bar Lounge', capacity: 2, isBar: true },
  { id: 'tbl_b3', tableNumber: 'B-3', section: 'Bar Lounge', capacity: 4, isBar: true },
  { id: 'tbl_b4', tableNumber: 'B-4', section: 'Bar Lounge', capacity: 4, isBar: true },
  { id: 'tbl_g1', tableNumber: 'G-1', section: 'Outdoor', capacity: 4, isBar: false },
  { id: 'tbl_g2', tableNumber: 'G-2', section: 'Outdoor', capacity: 6, isBar: false }
];

app.get('/api/tables', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const filter = tenantId ? { tenantId } : {};
    let tables = await RestaurantTable.find(filter).sort({ tableNumber: 1 });
    
    // Auto-seed default tables for tenant if empty
    if (tables.length === 0 && tenantId) {
      for (const t of defaultRestaurantTables) {
        await RestaurantTable.create({ ...t, tenantId });
      }
      tables = await RestaurantTable.find(filter).sort({ tableNumber: 1 });
    }
    res.json(tables);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tables', async (req, res) => {
  try {
    const table = await RestaurantTable.create(req.body);
    io.emit('table_created', table);
    res.json(table);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tables/:id', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const filter = tenantId ? { id: req.params.id, tenantId } : { id: req.params.id };
    const updateData = { ...req.body };
    delete updateData._id;
    const table = await RestaurantTable.findOneAndUpdate(filter, updateData, { new: true });
    io.emit('table_updated', table);
    res.json(table);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tables/:id', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const filter = tenantId ? { id: req.params.id, tenantId } : { id: req.params.id };
    await RestaurantTable.findOneAndDelete(filter);
    io.emit('table_deleted', { id: req.params.id });
    res.json({ success: true, message: 'Table deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tables/:id/park-kot', async (req, res) => {
  const { tenantId } = req.query;
  const { items, instructions, guestName, pax, isBar, serverName } = req.body;
  try {
    const filter = tenantId ? { id: req.params.id, tenantId } : { id: req.params.id };
    const table = await RestaurantTable.findOne(filter);
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const roundNo = (table.kotRounds?.length || 0) + 1;
    const prefix = isBar || table.isBar ? 'BAR-' : 'KOT-';
    const kotNo = `${prefix}${table.tableNumber}-R${roundNo}-${Math.floor(100 + Math.random() * 900)}`;

    const newRound = {
      kotNumber: kotNo,
      roundNumber: roundNo,
      timestamp: new Date().toISOString(),
      instructions: instructions || '',
      items: items || []
    };

    if (!table.kotRounds) table.kotRounds = [];
    table.kotRounds.push(newRound);

    // Merge into running items
    const mergedMap = new Map();
    (table.runningItems || []).forEach(it => {
      mergedMap.set(it.menuItemId || it.name, { ...it.toObject?.() || it });
    });

    (items || []).forEach(it => {
      const key = it.menuItemId || it.name;
      if (mergedMap.has(key)) {
        const existing = mergedMap.get(key);
        existing.quantity = (Number(existing.quantity) || 0) + (Number(it.quantity) || 1);
        if (it.notes) existing.notes = [existing.notes, it.notes].filter(Boolean).join(', ');
      } else {
        mergedMap.set(key, { ...it });
      }
    });

    table.runningItems = Array.from(mergedMap.values());

    // Calculate totals (Inclusive GST)
    const settingsDoc = await Settings.findOne({ tenantId: table.tenantId });
    const taxRate = (isBar || table.isBar) ? (settingsDoc?.barTaxRate ?? 20) : (settingsDoc?.taxRate ?? 18);
    const grossTotal = table.runningItems.reduce((acc, it) => acc + ((Number(it.price) || 0) * (Number(it.quantity) || 1)), 0);
    const taxableBase = grossTotal > 0 ? parseFloat((grossTotal / (1 + taxRate / 100)).toFixed(2)) : 0;
    const taxAmt = grossTotal > 0 ? parseFloat((grossTotal - taxableBase).toFixed(2)) : 0;

    table.total = grossTotal;
    table.subtotal = taxableBase;
    table.tax = taxAmt;
    table.status = 'Occupied';
    if (guestName) table.guestName = guestName;
    if (pax) table.pax = Number(pax);
    if (serverName) table.serverName = serverName;
    if (!table.seatedAt) table.seatedAt = new Date().toISOString();

    await table.save();

    // Auto-deduct ingredient stock for new round items using recipe mappings
    await deductInventoryForOrderItems(table.tenantId, items, newRound.kotNumber);

    io.emit('table_updated', table);
    res.json({ success: true, table, newRound });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tables/:id/settle', async (req, res) => {
  const { tenantId } = req.query;
  const { paymentMethod, roomNumber, guestName, discount, splitDetails } = req.body;
  try {
    const filter = tenantId ? { id: req.params.id, tenantId } : { id: req.params.id };
    const table = await RestaurantTable.findOne(filter);
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const orderId = 'ord_' + Date.now();
    const prefix = table.isBar ? 'BAR-' : 'POS-';
    const orderNo = `${prefix}${table.tableNumber}-${Math.floor(1000 + Math.random() * 9000)}`;

    const totalBill = Math.max(0, (table.total || 0) - (Number(discount) || 0));
    const subtotal = table.subtotal;
    const tax = table.tax;
    const isPostedToRoom = paymentMethod === 'Room' && Boolean(roomNumber);

    const order = await Order.create({
      id: orderId,
      tenantId: table.tenantId,
      orderNumber: orderNo,
      type: isPostedToRoom ? 'Room' : 'WalkIn',
      roomNumber: isPostedToRoom ? roomNumber : undefined,
      tableNumber: table.tableNumber,
      guestName: guestName || table.guestName || (isPostedToRoom ? `Room ${roomNumber}` : `Table ${table.tableNumber}`),
      items: table.runningItems,
      subtotal,
      tax,
      total: totalBill,
      paymentMethod: paymentMethod || (isPostedToRoom ? 'Room' : 'Cash'),
      splitDetails: splitDetails || '',
      discount: Number(discount) || 0,
      status: isPostedToRoom ? 'PostedToRoom' : 'Paid',
      isBar: table.isBar,
      timestamp: new Date().toISOString()
    });

    if (isPostedToRoom) {
      const room = await Room.findOne({ roomNumber, tenantId: table.tenantId });
      if (room) {
        if (table.isBar) {
          room.barCharges = (Number(room.barCharges) || 0) + totalBill;
        } else {
          room.restaurantCharges = (Number(room.restaurantCharges) || 0) + totalBill;
        }
        await room.save();
        io.emit('room_updated', room);
      }
    }

    // Reset Table to Available
    table.status = 'Available';
    table.guestName = '';
    table.pax = 2;
    table.seatedAt = undefined;
    table.serverName = '';
    table.runningItems = [];
    table.kotRounds = [];
    table.subtotal = 0;
    table.tax = 0;
    table.total = 0;
    await table.save();

    io.emit('order_created', order);
    io.emit('table_updated', table);
    res.json({ success: true, order, table });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tables/:id/clear', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const filter = tenantId ? { id: req.params.id, tenantId } : { id: req.params.id };
    const table = await RestaurantTable.findOne(filter);
    if (!table) return res.status(404).json({ error: 'Table not found' });

    table.status = 'Available';
    table.guestName = '';
    table.pax = 2;
    table.seatedAt = undefined;
    table.serverName = '';
    table.runningItems = [];
    table.kotRounds = [];
    table.subtotal = 0;
    table.tax = 0;
    table.total = 0;
    await table.save();

    io.emit('table_updated', table);
    res.json({ success: true, table });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tables/transfer', async (req, res) => {
  const { tenantId } = req.query;
  const { sourceTableId, targetTableId } = req.body;
  try {
    const src = await RestaurantTable.findOne({ id: sourceTableId, tenantId });
    const tgt = await RestaurantTable.findOne({ id: targetTableId, tenantId });
    if (!src || !tgt) return res.status(404).json({ error: 'Source or target table not found' });

    tgt.status = 'Occupied';
    tgt.guestName = src.guestName;
    tgt.pax = src.pax;
    tgt.seatedAt = src.seatedAt;
    tgt.serverName = src.serverName;
    tgt.runningItems = src.runningItems;
    tgt.kotRounds = src.kotRounds;
    tgt.subtotal = src.subtotal;
    tgt.tax = src.tax;
    tgt.total = src.total;
    await tgt.save();

    src.status = 'Available';
    src.guestName = '';
    src.pax = 2;
    src.seatedAt = undefined;
    src.serverName = '';
    src.runningItems = [];
    src.kotRounds = [];
    src.subtotal = 0;
    src.tax = 0;
    src.total = 0;
    await src.save();

    io.emit('table_updated', src);
    io.emit('table_updated', tgt);
    res.json({ success: true, source: src, target: tgt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- MENU ITEMS ---
app.get('/api/menu-items', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const filter = tenantId ? { tenantId } : {};
    const items = await MenuItem.find(filter).sort({ name: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/menu-items', async (req, res) => {
  try {
    const item = await MenuItem.create(req.body);
    io.emit('menu_item_created', item);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/menu-items/:id', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const filter = tenantId ? { id: req.params.id, tenantId } : { id: req.params.id };
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.createdAt;
    const item = await MenuItem.findOneAndUpdate(filter, updateData, { new: true, returnDocument: 'after' });
    io.emit('menu_item_updated', item);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/menu-items/:id', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const filter = tenantId ? { id: req.params.id, tenantId } : { id: req.params.id };
    await MenuItem.deleteOne(filter);
    io.emit('menu_item_deleted', { id: req.params.id, tenantId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/menu-items/batch-delete', async (req, res) => {
  const { ids, tenantId } = req.body;
  try {
    const filter = tenantId ? { id: { $in: ids }, tenantId } : { id: { $in: ids } };
    await MenuItem.deleteMany(filter);
    io.emit('menu_items_batch_deleted', { ids, tenantId });
    res.json({ success: true, count: ids.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/menu-items/bulk', async (req, res) => {
  const { items } = req.body;
  try {
    const created = await MenuItem.insertMany(items);
    io.emit('menu_items_bulk_created', created);
    res.json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- INVENTORY ---
app.get('/api/inventory', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const filter = tenantId ? { tenantId } : {};
    const items = await Inventory.find(filter).sort({ name: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory', async (req, res) => {
  try {
    const item = await Inventory.create(req.body);
    io.emit('inventory_created', item);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/inventory/:id', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const filter = tenantId ? { id: req.params.id, tenantId } : { id: req.params.id };
    const item = await Inventory.findOneAndUpdate(filter, req.body, { returnDocument: 'after' });
    io.emit('inventory_updated', item);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/inventory/:id', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const filter = tenantId ? { id: req.params.id, tenantId } : { id: req.params.id };
    await Inventory.deleteOne(filter);
    io.emit('inventory_deleted', { id: req.params.id, tenantId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- PURCHASE LOGS ---
app.get('/api/purchase-logs', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const filter = tenantId ? { tenantId } : {};
    const logs = await PurchaseLog.find(filter).sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/purchase-logs', async (req, res) => {
  try {
    const log = await PurchaseLog.create(req.body);
    io.emit('purchase_log_created', log);
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- STOCK ADJUSTMENT LOGS ---
app.get('/api/stock-adjustments', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const filter = tenantId ? { tenantId } : {};
    const logs = await StockAdjustmentLog.find(filter).sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stock-adjustments', async (req, res) => {
  try {
    const log = await StockAdjustmentLog.create(req.body);
    io.emit('stock_adjustment_created', log);
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- LAUNDRY ORDERS ---
app.get('/api/laundry-orders', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const filter = tenantId ? { tenantId } : {};
    const orders = await LaundryOrder.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/laundry-orders', async (req, res) => {
  try {
    const order = await LaundryOrder.create(req.body);
    io.emit('laundry_order_created', order);
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/laundry-orders/:id', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const filter = tenantId ? { id: req.params.id, tenantId } : { id: req.params.id };
    const order = await LaundryOrder.findOneAndUpdate(filter, req.body, { returnDocument: 'after' });
    io.emit('laundry_order_updated', order);
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/laundry-orders/:id', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const filter = tenantId ? { id: req.params.id, tenantId } : { id: req.params.id };
    await LaundryOrder.deleteOne(filter);
    io.emit('laundry_order_deleted', { id: req.params.id, tenantId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- HALL BOOKINGS ---
app.get('/api/hall-bookings', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const filter = tenantId ? { tenantId } : {};
    const bookings = await HallBooking.find(filter).sort({ date: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/hall-bookings', async (req, res) => {
  try {
    const booking = await HallBooking.create(req.body);
    io.emit('hall_booking_created', booking);
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/hall-bookings/:id', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const filter = tenantId ? { id: req.params.id, tenantId } : { id: req.params.id };
    const booking = await HallBooking.findOneAndUpdate(filter, req.body, { returnDocument: 'after' });
    io.emit('hall_booking_updated', booking);
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/hall-bookings/:id', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const filter = tenantId ? { id: req.params.id, tenantId } : { id: req.params.id };
    await HallBooking.deleteOne(filter);
    io.emit('hall_booking_deleted', { id: req.params.id, tenantId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- PRE BOOKINGS ---
app.get('/api/pre-bookings', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const filter = tenantId ? { tenantId } : {};
    const bookings = await PreBooking.find(filter).sort({ checkInDate: 1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/pre-bookings', async (req, res) => {
  try {
    const booking = await PreBooking.create(req.body);
    io.emit('pre_booking_created', booking);
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/pre-bookings/bulk', async (req, res) => {
  try {
    const { bookings } = req.body;
    if (!Array.isArray(bookings) || bookings.length === 0) {
      return res.status(400).json({ error: 'No bookings provided' });
    }

    const tenantId = bookings[0].tenantId;
    const roomFilter = tenantId ? { tenantId } : {};
    const preBookingFilter = tenantId 
      ? { tenantId, status: { $in: ['Confirmed', 'Pending'] } } 
      : { status: { $in: ['Confirmed', 'Pending'] } };

    const allRooms = await Room.find(roomFilter);
    const existingBookings = await PreBooking.find(preBookingFilter);

    // Group incoming batch demands by category and date range
    const categoryDemands = {};
    for (const b of bookings) {
      const key = `${b.roomCategory}___${b.checkInDate}___${b.checkOutDate}`;
      if (!categoryDemands[key]) {
        categoryDemands[key] = {
          category: b.roomCategory,
          checkInDate: b.checkInDate,
          checkOutDate: b.checkOutDate,
          count: 0
        };
      }
      categoryDemands[key].count += 1;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const isOverlapping = (sA, eA, sB, eB) => Boolean(sA && eA && sB && eB && sA < eB && sB < eA);

    for (const key of Object.keys(categoryDemands)) {
      const demand = categoryDemands[key];
      const categoryRooms = allRooms.filter(r => r.category === demand.category);
      const totalRooms = categoryRooms.length;

      const overlapBookings = existingBookings.filter(eb =>
        eb.roomCategory === demand.category &&
        isOverlapping(demand.checkInDate, demand.checkOutDate, eb.checkInDate, eb.checkOutDate)
      );

      const overlapOccupied = categoryRooms.filter(r => {
        if (r.status !== 'Occupied') return false;
        const rIn = r.checkInDate || todayStr;
        const rOut = r.checkOutDate || '9999-12-31';
        return isOverlapping(demand.checkInDate, demand.checkOutDate, rIn, rOut);
      });

      const available = Math.max(0, totalRooms - (overlapBookings.length + overlapOccupied.length));
      if (demand.count > available) {
        return res.status(400).json({
          error: `Overbooking prevented: Category "${demand.category}" only has ${available} room(s) available between ${demand.checkInDate} and ${demand.checkOutDate}, but ${demand.count} were requested.`
        });
      }
    }

    const created = await PreBooking.insertMany(bookings);
    created.forEach(b => io.emit('pre_booking_created', b));
    res.json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/pre-bookings/:id', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const filter = tenantId ? { id: req.params.id, tenantId } : { id: req.params.id };
    const booking = await PreBooking.findOneAndUpdate(filter, req.body, { returnDocument: 'after' });
    io.emit('pre_booking_updated', booking);
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/pre-bookings/:id', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const filter = tenantId ? { id: req.params.id, tenantId } : { id: req.params.id };
    await PreBooking.deleteOne(filter);
    io.emit('pre_booking_deleted', { id: req.params.id, tenantId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- EXPENSES ---
app.get('/api/expenses', async (req, res) => {
  const { tenantId, department, startDate, endDate } = req.query;
  try {
    const filter = {};
    if (tenantId) filter.tenantId = tenantId;
    if (department && department !== 'ALL') filter.department = department;
    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      filter.date = { $gte: startDate };
    } else if (endDate) {
      filter.date = { $lte: endDate };
    }

    const expenses = await Expense.find(filter).sort({ date: -1, createdAt: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const expense = await Expense.create(req.body);
    io.emit('expense_created', expense);
    res.json(expense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/expenses/:id', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const filter = tenantId ? { id: req.params.id, tenantId } : { id: req.params.id };
    const expense = await Expense.findOneAndUpdate(filter, req.body, { returnDocument: 'after' });
    io.emit('expense_updated', expense);
    res.json(expense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const filter = tenantId ? { id: req.params.id, tenantId } : { id: req.params.id };
    await Expense.deleteOne(filter);
    io.emit('expense_deleted', { id: req.params.id, tenantId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CASH WALLET TRANSACTIONS (ROOMS & BAR) ---
app.get('/api/cash-wallet-transactions', async (req, res) => {
  const { tenantId, department, date, startDate, endDate } = req.query;
  try {
    const filter = {};
    if (tenantId) filter.tenantId = tenantId;
    if (department && department !== 'ALL') filter.department = department;
    if (date) filter.date = date;
    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      filter.date = { $gte: startDate };
    } else if (endDate) {
      filter.date = { $lte: endDate };
    }
    const transactions = await CashWalletTransaction.find(filter).sort({ date: 1, createdAt: 1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cash-wallet-transactions', async (req, res) => {
  try {
    const payload = {
      id: req.body.id || `cwt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      tenantId: req.body.tenantId || req.query.tenantId || 't_1791275687940',
      ...req.body
    };
    const tx = await CashWalletTransaction.create(payload);
    io.emit('cash_wallet_transaction_created', tx);
    res.json(tx);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/cash-wallet-transactions/:id', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const filter = tenantId ? { id: req.params.id, tenantId } : { id: req.params.id };
    await CashWalletTransaction.deleteOne(filter);
    io.emit('cash_wallet_transaction_deleted', { id: req.params.id, tenantId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- AUDIT LOGS ---
app.get('/api/audit-logs', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const filter = tenantId ? { $or: [{ tenantId }, { tenantId: 'global' }, { tenantId: { $exists: false } }] } : {};
    const logs = await AuditLog.find(filter).sort({ timestamp: -1 }).limit(200);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/audit-logs', async (req, res) => {
  try {
    const log = await AuditLog.create(req.body);
    io.emit('audit_log_created', log);
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SETTINGS ---
app.get('/api/settings', async (req, res) => {
  const { tenantId } = req.query;
  try {
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
    let settings = await Settings.findOne({ tenantId });
    if (!settings) {
      settings = await Settings.create({ 
        tenantId,
        fast2smsApiKey: 'Ey3CbXkpz0rv9tBH214oqRuawJAlnsF7eVUjQPcdD5OSiZLIxgT2r7aCFXujWlE105K4ZSAytOJfpUMI',
        eodPhoneNumbers: '9788866964, 9786136555',
        eodAutoSend: false,
        eodSendTime: '23:30'
      });
    } else {
      let updated = false;
      if (!settings.fast2smsApiKey) {
        settings.fast2smsApiKey = 'Ey3CbXkpz0rv9tBH214oqRuawJAlnsF7eVUjQPcdD5OSiZLIxgT2r7aCFXujWlE105K4ZSAytOJfpUMI';
        updated = true;
      }
      if (settings.eodPhoneNumbers === undefined || settings.eodPhoneNumbers === null) {
        settings.eodPhoneNumbers = '9788866964, 9786136555';
        updated = true;
      }
      if (updated) {
        await settings.save();
      }
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', async (req, res) => {
  const { tenantId } = req.body;
  try {
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
    const settings = await Settings.findOneAndUpdate({ tenantId }, req.body, { upsert: true, returnDocument: 'after' });
    io.emit('settings_updated', settings);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- NOTIFICATIONS ---
app.get('/api/notifications', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const filter = tenantId ? { tenantId } : {};
    const notifs = await Notification.find(filter).sort({ timestamp: -1 });
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications', async (req, res) => {
  try {
    const notif = await Notification.create(req.body);
    io.emit('notification_created', notif);
    res.json(notif);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notifications/:id', async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate({ id: req.params.id }, req.body, { returnDocument: 'after' });
    io.emit('notification_updated', notif);
    res.json(notif);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RESET / PURGE TENANT DATA ---
app.post('/api/tenants/:id/reset-data', async (req, res) => {
  const tenantId = req.params.id;
  try {
    await Order.deleteMany({ tenantId });
    await LaundryOrder.deleteMany({ tenantId });
    await HallBooking.deleteMany({ tenantId });
    await PreBooking.deleteMany({ tenantId });
    await Expense.deleteMany({ tenantId });
    await PurchaseLog.deleteMany({ tenantId });
    await StockAdjustmentLog.deleteMany({ tenantId });
    await Notification.deleteMany({ tenantId });

    await Room.updateMany({ tenantId }, {
      status: 'Available',
      guestName: '',
      guestPhone: '',
      guestEmail: '',
      guestAddress: '',
      guestIdProof: '',
      gstNumber: '',
      checkInDate: '',
      checkInTime: '',
      checkOutDate: '',
      noOfGuests: 0,
      advancePaid: 0,
      restaurantCharges: 0,
      barCharges: 0,
      laundryCharges: 0,
      hallCharges: 0,
      otherCharges: 0,
      otherChargesDescription: ''
    });

    io.emit('tenant_data_reset', tenantId);
    res.json({ success: true, message: `All operational data for tenant ${tenantId} reset successfully.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// FAST2SMS & EOD REPORT SERVICES
// ==========================================

// Helper: Sanitize & dispatch SMS via Fast2SMS Quick Route (q)
async function sendFast2Sms({ apiKey, numbers, message }) {
  const cleanNumbers = (numbers || '')
    .split(',')
    .map(n => n.replace(/[^0-9]/g, '').slice(-10))
    .filter(n => n.length === 10)
    .join(',');

  if (!cleanNumbers) {
    throw new Error('No valid 10-digit phone numbers configured.');
  }

  const effectiveKey = (apiKey && apiKey.trim()) || 'Ey3CbXkpz0rv9tBH214oqRuawJAlnsF7eVUjQPcdD5OSiZLIxgT2r7aCFXujWlE105K4ZSAytOJfpUMI';
  const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(effectiveKey)}&route=q&message=${encodeURIComponent(message)}&numbers=${encodeURIComponent(cleanNumbers)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });
  const data = await response.json();
  return { cleanNumbers, data };
}

// Helper: Compile today's concise EOD metrics for a tenant
async function generateEodSummary(tenantId, targetDate) {
  const todayStr = targetDate || new Date().toISOString().split('T')[0];
  const settings = await Settings.findOne({ tenantId });
  const tenant = await Tenant.findOne({ id: tenantId });
  const propertyName = settings?.name || tenant?.name || 'Hotel Vista';

  const [preBookings, rooms, orders, auditLogs] = await Promise.all([
    PreBooking.find({ tenantId }),
    Room.find({ tenantId }),
    Order.find({ tenantId }),
    AuditLog.find({ tenantId, action: { $in: ['Check-In', 'Check-Out'] } })
  ]);

  // 1. Rooms Booked Today
  const bookedPre = preBookings.filter(pb => {
    const bDate = pb.bookingDate || (pb.createdAt ? new Date(pb.createdAt).toISOString().split('T')[0] : '');
    return bDate === todayStr;
  });
  const directBookedRooms = rooms.filter(r => {
    const cDate = r.checkInDate || '';
    const notInPre = !bookedPre.some(pb => pb.roomNumber === r.roomNumber || (pb.phone && pb.phone === r.guestPhone));
    return cDate === todayStr && notInPre;
  });
  const totalBookedToday = bookedPre.length + directBookedRooms.length;

  // 2. Rooms Checked-in Today
  const inHouseCheckedIn = rooms.filter(r => r.status === 'Occupied' && r.checkInDate === todayStr);
  const preCheckedIn = preBookings.filter(pb => 
    (pb.status === 'CheckedIn' || pb.status === 'CheckedOut') && 
    pb.checkInDate === todayStr &&
    !inHouseCheckedIn.some(r => r.roomNumber === pb.roomNumber)
  );
  const totalCheckedInToday = inHouseCheckedIn.length + preCheckedIn.length;

  // 3. Departmental Revenues
  let roomRevenue = 0;
  // In-house active stays
  rooms.forEach(r => {
    if (r.status === 'Occupied' && r.checkInDate === todayStr) {
      roomRevenue += (r.price || 0);
    } else if (r.advancePaid && r.advancePaid > 0 && r.checkInDate === todayStr) {
      roomRevenue += r.advancePaid;
    }
  });
  // Checked-out folio totals & new advance payments today
  preBookings.forEach(pb => {
    const coDate = pb.checkOutDate || (pb.updatedAt ? new Date(pb.updatedAt).toISOString().split('T')[0] : '');
    if (pb.status === 'CheckedOut' && coDate === todayStr) {
      roomRevenue += (pb.roomRentTotal || pb.totalAmount || 0);
    } else if ((pb.status === 'Confirmed' || pb.status === 'Pending') && pb.bookingDate === todayStr && pb.advancePaid > 0) {
      roomRevenue += pb.advancePaid;
    }
  });

  // Restaurant & Bar Revenue
  let restRevenue = 0;
  let barRevenue = 0;
  orders.forEach(o => {
    const oDate = o.timestamp ? o.timestamp.substring(0, 10) : (o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : '');
    if (oDate === todayStr && o.status === 'Paid') {
      if (o.isBar) {
        barRevenue += (o.total || 0);
      } else {
        restRevenue += (o.total || 0);
      }
    }
  });

  const totalRevenue = roomRevenue + restRevenue + barRevenue;

  // Format date label e.g. "10-Oct"
  const d = new Date(todayStr + 'T00:00:00');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dateLabel = isNaN(d.getTime()) ? todayStr : `${d.getDate()}-${months[d.getMonth()]}`;

  // Short property name (trimmed if long to guarantee single SMS <= 160 characters)
  const shortPropName = propertyName.length > 20 ? propertyName.slice(0, 18) + '..' : propertyName;
  const fmt = (val) => Math.round(val).toLocaleString('en-IN');

  // GSM-7 Single SMS Template (Uses "Rs" instead of Unicode symbol to avoid 70-char split)
  const message = `[${shortPropName}] EOD ${dateLabel}:
Rooms: ${totalBookedToday} Booked, ${totalCheckedInToday} Check-in
Rev: Rm Rs.${fmt(roomRevenue)} | Rest Rs.${fmt(restRevenue)} | Bar Rs.${fmt(barRevenue)}
Total: Rs.${fmt(totalRevenue)}`;

  return {
    tenantId,
    propertyName,
    shortPropName,
    date: todayStr,
    dateLabel,
    totalBookedToday,
    totalCheckedInToday,
    roomRevenue,
    restRevenue,
    barRevenue,
    totalRevenue,
    message,
    charCount: message.length
  };
}

// GET /api/eod/status - Check Fast2SMS wallet balance & tenant EOD state
app.get('/api/eod/status', async (req, res) => {
  const { tenantId } = req.query;
  try {
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
    const settings = await Settings.findOne({ tenantId });
    const apiKey = settings?.fast2smsApiKey || 'Ey3CbXkpz0rv9tBH214oqRuawJAlnsF7eVUjQPcdD5OSiZLIxgT2r7aCFXujWlE105K4ZSAytOJfpUMI';

    let walletData = null;
    try {
      const wRes = await fetch(`https://www.fast2sms.com/dev/wallet?authorization=${encodeURIComponent(apiKey)}`, {
        headers: { 'Accept': 'application/json' }
      });
      walletData = await wRes.json();
    } catch (e) {
      console.warn('Fast2SMS Wallet check error:', e.message);
    }

    const preview = await generateEodSummary(tenantId);

    res.json({
      success: true,
      apiKeyConfigured: !!apiKey,
      phoneNumbers: settings?.eodPhoneNumbers || '9788866964, 9786136555',
      autoSend: !!settings?.eodAutoSend,
      sendTime: settings?.eodSendTime || '23:30',
      lastSentAt: settings?.eodLastSentAt || '',
      wallet: walletData,
      preview
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/eod/preview - Get live preview of today's EOD SMS
app.get('/api/eod/preview', async (req, res) => {
  const { tenantId, date } = req.query;
  try {
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
    const summary = await generateEodSummary(tenantId, date);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/eod/send-sms - Dispatch EOD SMS (or test SMS)
app.post('/api/eod/send-sms', async (req, res) => {
  const { tenantId, customNumbers, isTest, date } = req.body;
  try {
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
    const settings = await Settings.findOne({ tenantId });
    const apiKey = settings?.fast2smsApiKey || 'Ey3CbXkpz0rv9tBH214oqRuawJAlnsF7eVUjQPcdD5OSiZLIxgT2r7aCFXujWlE105K4ZSAytOJfpUMI';
    const numbersToSend = customNumbers || settings?.eodPhoneNumbers || '9788866964, 9786136555';

    let messageToSend = '';
    let summaryData = null;

    if (isTest) {
      const propName = settings?.name || 'Hotel Vista';
      messageToSend = `[${propName}] Fast2SMS Test: EOD reporting service is verified & connected successfully.`;
    } else {
      summaryData = await generateEodSummary(tenantId, date);
      messageToSend = summaryData.message;
    }

    const { cleanNumbers, data } = await sendFast2Sms({
      apiKey,
      numbers: numbersToSend,
      message: messageToSend
    });

    // Update last sent timestamp & audit log on success
    if (data?.return) {
      if (!isTest) {
        await Settings.findOneAndUpdate({ tenantId }, { eodLastSentAt: new Date().toISOString() });
      }
      await AuditLog.create({
        id: 'aud_sms_' + Date.now(),
        tenantId,
        username: 'Fast2SMS Gateway',
        role: 'system',
        action: isTest ? 'Test SMS Dispatched' : 'EOD Report SMS Dispatched',
        details: `Sent to ${cleanNumbers}: "${messageToSend.replace(/\n/g, ' ')}"`
      });
    }

    res.json({
      success: !!data?.return,
      fast2smsResponse: data,
      recipients: cleanNumbers,
      messageSent: messageToSend,
      summary: summaryData
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Automated Daily EOD SMS Cron Check (runs every minute in background)
setInterval(async () => {
  try {
    // Current IST time HH:MM
    const now = new Date();
    // Offset to IST (+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    const hours = String(istDate.getUTCHours()).padStart(2, '0');
    const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
    const currentTimeStr = `${hours}:${minutes}`;
    const todayStr = istDate.toISOString().split('T')[0];

    const activeSettings = await Settings.find({ eodAutoSend: true });
    for (const s of activeSettings) {
      if (s.eodSendTime === currentTimeStr) {
        const lastSentDate = s.eodLastSentAt ? s.eodLastSentAt.split('T')[0] : '';
        if (lastSentDate !== todayStr) {
          console.log(`[EOD Cron] Dispatching scheduled EOD SMS for tenant ${s.tenantId} at ${currentTimeStr} IST`);
          const summary = await generateEodSummary(s.tenantId, todayStr);
          const apiKey = s.fast2smsApiKey || 'Ey3CbXkpz0rv9tBH214oqRuawJAlnsF7eVUjQPcdD5OSiZLIxgT2r7aCFXujWlE105K4ZSAytOJfpUMI';
          const numbers = s.eodPhoneNumbers || '9788866964, 9786136555';
          
          const result = await sendFast2Sms({
            apiKey,
            numbers,
            message: summary.message
          });

          if (result.data?.return) {
            await Settings.findOneAndUpdate({ tenantId: s.tenantId }, { eodLastSentAt: new Date().toISOString() });
            console.log(`[EOD Cron] Successfully dispatched to ${result.cleanNumbers}`);
          } else {
            console.warn(`[EOD Cron] Gateway returned failure:`, result.data);
          }
        }
      }
    }
  } catch (e) {
    console.error('[EOD Cron Error]:', e.message);
  }
}, 60000);

// ==========================================
// START SERVER (LOCAL / NON-SERVERLESS)
// ==========================================
if (!process.env.VERCEL) {
  connectToDatabase()
    .then(async () => {
      console.log(' Connected to MongoDB Atlas:', MONGODB_URI.split('@')[1] || MONGODB_URI);
      await seedDefaultData();
      server.listen(PORT, () => {
        console.log(` HotelVista MongoDB REST Server running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error(' MongoDB Connection Error:', err);
    });

  const handleShutdown = async (signal) => {
    console.log(`\nReceived ${signal}. Closing server and MongoDB connections gracefully...`);
    try {
      setTimeout(() => process.exit(0), 800).unref();
      await mongoose.connection.close(false);
      console.log('MongoDB connection closed cleanly.');
      server.close(() => {
        process.exit(0);
      });
    } catch (e) {
      process.exit(0);
    }
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
}

export default app;
export { app, server, io };
