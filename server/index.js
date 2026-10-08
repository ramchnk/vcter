import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});

const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vcter:livedb@cluster0.uxuamo6.mongodb.net/vcter?retryWrites=true&w=majority';

app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Middleware to ensure MongoDB connection in Serverless environments (e.g. Vercel)
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(MONGODB_URI);
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
  isAcSwitchedOff: { type: Boolean, default: false },
  status: { type: String, default: 'Available' },
  guestName: { type: String, default: '' },
  guestPhone: { type: String, default: '' },
  guestEmail: { type: String, default: '' },
  guestAddress: { type: String, default: '' },
  guestIdProof: { type: String, default: '' },
  gstNumber: { type: String, default: '' },
  checkInDate: { type: String, default: '' },
  checkOutDate: { type: String, default: '' },
  noOfGuests: { type: Number, default: 0 },
  advancePaid: { type: Number, default: 0 },
  restaurantCharges: { type: Number, default: 0 },
  barCharges: { type: Number, default: 0 },
  laundryCharges: { type: Number, default: 0 },
  hallCharges: { type: Number, default: 0 },
  otherCharges: { type: Number, default: 0 }
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
  description: String
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
  roomCategory: String,
  roomNumber: String,
  roomPrice: Number,
  bookingSource: { type: String, default: 'Direct / Walk-In' },
  isAcSwitchedOff: { type: Boolean, default: false },
  checkInDate: String,
  checkOutDate: String,
  noOfGuests: { type: Number, default: 1 },
  advancePaid: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  roomRentTotal: { type: Number, default: 0 },
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
  address: { type: String, default: '123 Beach Road, Resort City' },
  phone: { type: String, default: '+91 98765 43210' },
  email: { type: String, default: 'contact@hotelvistagrand.com' },
  gstNumber: { type: String, default: '33AAAAA0000A1Z5' },
  taxRate: { type: Number, default: 18 },
  barTaxRate: { type: Number, default: 20 },
  invoicePrefix: { type: String, default: 'HV-INV-' },
  logoUrl: String,
  checkInTime: { type: String, default: '12:00 PM' },
  checkOutTime: { type: String, default: '11:00 AM' }
}, { timestamps: true });

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

    if (order.items && Array.isArray(order.items)) {
      for (const item of order.items) {
        const inv = await Inventory.findOne({ 
          tenantId: order.tenantId, 
          name: new RegExp(`^${item.name}$`, 'i') 
        });
        if (inv) {
          inv.stock = Math.max(0, inv.stock - (Number(item.quantity) || 1));
          await inv.save();
          io.emit('inventory_updated', inv);
        }
      }
    }

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
      settings = await Settings.create({ tenantId });
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
      checkOutDate: '',
      noOfGuests: 0,
      advancePaid: 0,
      restaurantCharges: 0,
      barCharges: 0,
      laundryCharges: 0,
      hallCharges: 0,
      otherCharges: 0
    });

    io.emit('tenant_data_reset', tenantId);
    res.json({ success: true, message: `All operational data for tenant ${tenantId} reset successfully.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// SOCKET.IO CONNECTION
// ==========================================
io.on('connection', (socket) => {
  console.log('Client connected to real-time MongoDB Socket:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// ==========================================
// START SERVER (LOCAL / NON-SERVERLESS)
// ==========================================
if (!process.env.VERCEL) {
  mongoose.connect(MONGODB_URI)
    .then(async () => {
      console.log(' Connected to MongoDB Atlas:', MONGODB_URI.split('@')[1] || MONGODB_URI);
      await seedDefaultData();
      server.listen(PORT, () => {
        console.log(` HotelVista MongoDB REST & Socket.io Server running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error(' MongoDB Connection Error:', err);
    });
}

export default app;
export { app, server, io };
