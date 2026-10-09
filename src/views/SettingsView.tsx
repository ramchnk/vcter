import React, { useState, useMemo } from 'react';
import { useApp, MenuItem, UserRole, HotelSettings, RoomCategory, Room, DEFAULT_ENABLED_MENUS, ClientUserAccount } from '../context/AppContext';
import { 
  Settings, 
  Plus, 
  ToggleLeft, 
  ToggleRight, 
  Building2, 
  Users, 
  Globe, 
  ShieldCheck, 
  CheckCircle, 
  UtensilsCrossed, 
  Landmark, 
  Check, 
  Key,
  Trash2,
  Lock,
  UserCheck,
  Save,
  Database,
  Clock,
  Pencil,
  Eye,
  EyeOff,
  X,
  RefreshCw,
  Edit2
} from 'lucide-react';
import { formatTime12h, formatTime24h } from '../utils/dateUtils';

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
}

export const SettingsView: React.FC = () => {
  const { 
    userRole,
    currentTenant,
    settings, 
    menuItems, 
    userAccounts,  
    addUserAccount, 
    updateUserAccount,
    deleteUserAccount, 
    switchRole, 
    addInventoryItem, 
    addAudit,
    tenants,
    addTenantAccount,
    updateTenantStatus,
    deleteTenantAccount,
    activeTenantId,
    switchTenantContext,
    addMenuItem,
    updateSettings,
    rooms,
    addRoom,
    updateRoom,
    deleteRoom,
    cloudDbConnected,
    cloudDbName
  } = useApp();

  // Hotel settings local copy
  const [hotelName, setHotelName] = useState(settings.name);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email);
  const [gstNumber, setGstNumber] = useState(settings.gstNumber);
  const [taxRate, setTaxRate] = useState(settings.taxRate);
  const [barTaxRate, setBarTaxRate] = useState(settings.barTaxRate);
  const [invoicePrefix, setInvoicePrefix] = useState(settings.invoicePrefix);
  const [checkInTime, setCheckInTime] = useState(settings.checkInTime || '12:00 PM');
  const [checkOutTime, setCheckOutTime] = useState(settings.checkOutTime || '11:00 AM');

  // Synchronize state when settings context changes
  React.useEffect(() => {
    if (settings) {
      setHotelName(settings.name || '');
      setAddress(settings.address || '');
      setPhone(settings.phone || '');
      setEmail(settings.email || '');
      setGstNumber(settings.gstNumber || '');
      setTaxRate(settings.taxRate ?? 18);
      setBarTaxRate(settings.barTaxRate ?? 20);
      setInvoicePrefix(settings.invoicePrefix || 'HV-INV-');
      setCheckInTime(settings.checkInTime || '12:00 PM');
      setCheckOutTime(settings.checkOutTime || '11:00 AM');
    }
  }, [settings]);

  // Settings Sub-Tabs
  const [activeSettingsTab, setActiveSettingsTab] = useState<'hotel' | 'tenants' | 'users' | 'rooms'>('hotel');

  const isSuperAdmin = userRole === 'super_admin';

  // Strict Multi-Tenant User Account Isolation:
  // - Super Admin sees all user accounts across all properties.
  // - Property Admin only sees staff accounts for their own property, excluding super_admin.
  const visibleUserAccounts = useMemo(() => {
    if (isSuperAdmin) return userAccounts;
    return (userAccounts || []).filter(u => {
      if (u.role === 'super_admin') return false;
      const matchesTenantId = u.tenantId && u.tenantId === activeTenantId;
      const matchesTenantName = u.tenantName && currentTenant && u.tenantName.toLowerCase() === currentTenant.name.toLowerCase();
      return matchesTenantId || matchesTenantName;
    });
  }, [userAccounts, isSuperAdmin, activeTenantId, currentTenant]);

  // New Tenant Registration Form State
  const [tenantName, setTenantName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [tenantGst, setTenantGst] = useState('');
  const [tenantSubdomain, setTenantSubdomain] = useState('');
  const [tenantCurrency, setTenantCurrency] = useState('INR (₹)');
  const [tenantTier, setTenantTier] = useState<'Boutique' | 'Standard ERP' | 'Enterprise Multi-Property'>('Standard ERP');

  // New Client User Account Form State
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [clientRole, setClientRole] = useState<UserRole>(isSuperAdmin ? 'admin' : 'reception');
  const [clientTenantName, setClientTenantName] = useState('Hotel Le Merridien');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Edit User / Password State
  const [editingUser, setEditingUser] = useState<ClientUserAccount | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserRole, setEditUserRole] = useState<UserRole>('reception');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [isSubmittingEditUser, setIsSubmittingEditUser] = useState(false);

  // Sync clientRole if isSuperAdmin state changes
  React.useEffect(() => {
    if (!isSuperAdmin && clientRole === 'admin') {
      setClientRole('reception');
    }
  }, [isSuperAdmin, clientRole]);

  // New Room States
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomFloor, setNewRoomFloor] = useState(1);
  const [newRoomCategory, setNewRoomCategory] = useState<RoomCategory>('Deluxe AC');
  const [newRoomPrice, setNewRoomPrice] = useState(1500);

  // Edit Room Modal state
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [editRoomId, setEditRoomId] = useState('');
  const [editRoomNumber, setEditRoomNumber] = useState('');
  const [editRoomFloor, setEditRoomFloor] = useState<number>(1);
  const [editRoomCategory, setEditRoomCategory] = useState<RoomCategory>('Deluxe AC');
  const [editRoomPrice, setEditRoomPrice] = useState<number>(2500);
  const [isSubmittingEditRoom, setIsSubmittingEditRoom] = useState(false);

  const handleOpenEditRoom = (room: Room) => {
    setEditRoomId(room.id);
    setEditRoomNumber(room.roomNumber);
    setEditRoomFloor(room.floor || 1);
    setEditRoomCategory(room.category);
    setEditRoomPrice(room.price || 0);
    setShowEditRoomModal(true);
  };

  const handleEditRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRoomId || !editRoomNumber || editRoomPrice <= 0) return;
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
      alert('Failed to update room details.');
    } finally {
      setIsSubmittingEditRoom(false);
    }
  };

  const foodCategories = ['Breakfast', 'Lunch', 'Dinner', 'Beverages', 'Desserts'];
  const barCategories = ['Beer', 'Whisky', 'Rum', 'Vodka', 'Wine', 'Cocktails', 'Snacks'];

  const handleHotelSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    const formattedCheckIn = formatTime12h(checkInTime);
    const formattedCheckOut = formatTime12h(checkOutTime);

    const updatedSettings: HotelSettings = {
      name: hotelName,
      address,
      phone,
      email,
      gstNumber,
      taxRate,
      barTaxRate,
      invoicePrefix,
      checkInTime: formattedCheckIn,
      checkOutTime: formattedCheckOut
    };
    
    if (updateSettings) {
      updateSettings(updatedSettings);
    }
    settings.name = hotelName;
    settings.address = address;
    settings.phone = phone;
    settings.email = email;
    settings.gstNumber = gstNumber;
    settings.taxRate = taxRate;
    settings.barTaxRate = barTaxRate;
    settings.invoicePrefix = invoicePrefix;
    settings.checkInTime = formattedCheckIn;
    settings.checkOutTime = formattedCheckOut;
    localStorage.setItem('hv_settings', JSON.stringify(settings));
    addAudit('Save Settings', `Updated property settings. Check-in: ${formattedCheckIn}, Check-out: ${formattedCheckOut}`);
    alert('Hotel settings updated successfully!');
  };

  // Create New Multi-Tenant Account
  const handleCreateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantName || !tenantEmail) return;

    const generatedSlug = tenantSlug || tenantName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const generatedSubdomain = tenantSubdomain || `${generatedSlug}.hotelvista.com`;

    addTenantAccount({
      slug: generatedSlug,
      name: tenantName,
      email: tenantEmail,
      phone: tenantPhone || '+91 90000 00000',
      gstNumber: tenantGst || 'UNREGISTERED-GST',
      subdomain: generatedSubdomain,
      currency: tenantCurrency,
      tier: tenantTier,
      status: 'Active',
      maxRooms: 100,
      adminEmail: tenantEmail,
      enabledMenus: DEFAULT_ENABLED_MENUS
    }, '123456');

    setTenantName('');
    setTenantSlug('');
    setTenantEmail('');
    setTenantPhone('');
    setTenantGst('');
    setTenantSubdomain('');

    alert(`Tenant account "${tenantName}" and admin login (${tenantEmail} / 123456) created successfully!`);
  };

  const handleSwitchTenant = (tenant: TenantAccount) => {
    switchTenantContext(tenant.id);
    setHotelName(tenant.name);
    setEmail(tenant.email);
    setPhone(tenant.phone);
    setGstNumber(tenant.gstNumber);

    settings.name = tenant.name;
    settings.email = tenant.email;
    settings.phone = tenant.phone;
    settings.gstNumber = tenant.gstNumber;
    localStorage.setItem('hv_settings', JSON.stringify(settings));

    addAudit('Tenant Switch', `Switched active property account context to ${tenant.name}`);
  };

  // Create New Client / Staff User Credentials
  const handleCreateUserAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientEmail || !clientPassword) return;

    const assignedTenantName = isSuperAdmin ? (clientTenantName || currentTenant?.name || 'HotelVista Property') : (currentTenant?.name || 'Hotel Property');
    const assignedTenantId = isSuperAdmin 
      ? (tenants.find(t => t.name.toLowerCase() === assignedTenantName.toLowerCase())?.id || activeTenantId) 
      : activeTenantId;

    const targetRole = (!isSuperAdmin && clientRole === 'admin') ? 'reception' : clientRole;

    addUserAccount({
      name: clientName || `${targetRole.toUpperCase()} User`,
      email: clientEmail,
      password: clientPassword,
      role: targetRole,
      tenantName: assignedTenantName,
      tenantId: assignedTenantId,
      status: 'Active'
    });

    setClientName('');
    setClientEmail('');
    setClientPassword('');
    setClientRole(isSuperAdmin ? 'admin' : 'reception');
    alert(`User credentials for ${clientEmail} created successfully!`);
  };

  const toggleShowPassword = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenEditUser = (user: ClientUserAccount) => {
    setEditingUser(user);
    setEditUserName(user.name);
    setEditUserEmail(user.email);
    setEditUserPassword(user.password || '');
    setEditUserRole(user.role);
    setShowEditPassword(false);
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editUserPassword.trim()) {
      alert('Password cannot be empty');
      return;
    }
    setIsSubmittingEditUser(true);
    try {
      await updateUserAccount(editingUser.id, {
        name: editUserName.trim() || editingUser.name,
        password: editUserPassword.trim(),
        role: isSuperAdmin ? editUserRole : (editingUser.role === 'admin' ? 'admin' : editUserRole),
      });
      alert(`Password and details for ${editingUser.email} updated successfully!`);
      setEditingUser(null);
    } catch (err) {
      console.error(err);
      alert('Failed to update user password.');
    } finally {
      setIsSubmittingEditUser(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setEditUserPassword(pass);
    setShowEditPassword(true);
  };

  const handleAddRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNumber || newRoomPrice <= 0) return;

    const exists = rooms.some(r => r.roomNumber === newRoomNumber);
    if (exists) {
      alert(`Room number ${newRoomNumber} already exists!`);
      return;
    }

    await addRoom({
      id: 'r_' + newRoomNumber + '_' + Date.now(),
      roomNumber: newRoomNumber,
      category: newRoomCategory,
      floor: newRoomFloor,
      price: newRoomPrice
    });

    alert(`Room ${newRoomNumber} created successfully!`);
    setNewRoomNumber('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* 1. Sub Tabs Panel */}
      <div className="lg:col-span-1 p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm space-y-4 h-fit">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-350 flex items-center gap-1.5 border-b pb-2 border-slate-100 dark:border-slate-800">
          <Settings className="w-4 h-4 text-indigo-500" /> ERP Settings Configuration
        </h3>

        <div className="space-y-1.5 flex flex-col">
          <button
            onClick={() => setActiveSettingsTab('hotel')}
            className={`w-full px-4 py-2.5 rounded-xl text-left text-xs font-semibold transition-all ${
              activeSettingsTab === 'hotel' 
                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 font-bold' 
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            Hotel Details & Taxation Settings
          </button>

          {isSuperAdmin && (
            <button
              onClick={() => setActiveSettingsTab('tenants')}
              className={`w-full px-4 py-2.5 rounded-xl text-left text-xs font-semibold transition-all flex items-center justify-between ${
                activeSettingsTab === 'tenants' 
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 font-bold' 
                  : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <span>Multi-Tenant Organizations</span>
              <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-full text-[10px] font-mono">
                {tenants.length}
              </span>
            </button>
          )}

          <button
            onClick={() => setActiveSettingsTab('users')}
            className={`w-full px-4 py-2.5 rounded-xl text-left text-xs font-semibold transition-all flex items-center justify-between ${
              activeSettingsTab === 'users' 
                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 font-bold' 
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <span>{isSuperAdmin ? 'User Accounts & Credentials' : 'Staff Accounts & Logins'}</span>
            <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-full text-[10px] font-mono">
              {visibleUserAccounts.length}
            </span>
          </button>
          
          <button
            onClick={() => setActiveSettingsTab('rooms')}
            className={`w-full px-4 py-2.5 rounded-xl text-left text-xs font-semibold transition-all flex items-center justify-between ${
              activeSettingsTab === 'rooms' 
                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 font-bold' 
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            Manage Rooms List
          </button>
        </div>

        {/* Active Property Account Card */}
        {(() => {
          const activeTenant = (tenants || []).find(t => t.id === activeTenantId) || tenants[0];
          return (
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border dark:border-slate-800 space-y-1.5 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Property Context</span>
              <p className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {activeTenant?.name || 'HotelVista Property'}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">{activeTenant?.subdomain || 'hotelvista.com'}</p>
            </div>
          );
        })()}

      </div>

      {/* 2. Detail View Panel */}
      <div className="lg:col-span-2 p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm">
        
        {/* Hotel Details Edit Form */}
        {activeSettingsTab === 'hotel' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-455 border-b pb-2 border-slate-100 dark:border-slate-800">
              Hotel Information Metadata & Taxes config
            </h3>

            <form onSubmit={handleHotelSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Hotel Name *</label>
                  <input
                    type="text"
                    required
                    value={hotelName}
                    onChange={e => setHotelName(e.target.value)}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">GST Registration Number *</label>
                  <input
                    type="text"
                    required
                    value={gstNumber}
                    onChange={e => setGstNumber(e.target.value)}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Complete Address *</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Contact Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t pt-4 border-slate-100 dark:border-slate-800/80">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">General GST Tax (%)</label>
                  <input
                    type="number"
                    min={0}
                    value={taxRate}
                    onChange={e => setTaxRate(Number(e.target.value))}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Bar VAT / Tax (%)</label>
                  <input
                    type="number"
                    min={0}
                    value={barTaxRate}
                    onChange={e => setBarTaxRate(Number(e.target.value))}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Invoice Prefix *</label>
                  <input
                    type="text"
                    required
                    value={invoicePrefix}
                    onChange={e => setInvoicePrefix(e.target.value)}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg font-bold"
                  />
                </div>
              </div>

              {/* Standard Hotel Timings (Check-in & Check-out Live Alert Triggers) */}
              <div className="border-t pt-4 border-slate-100 dark:border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      Property Standard Check-In & Check-Out Timings
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Powers live room status alerts and dynamic color-coded blinkers on the Room Management grid.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Check-in Time */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/70 dark:border-slate-800/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">Check-In Time *</span>
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                        {formatTime12h(checkInTime)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={formatTime24h(checkInTime)}
                        onChange={e => setCheckInTime(e.target.value ? formatTime12h(e.target.value) : '12:00 PM')}
                        className="flex-1 p-2 border dark:border-slate-800 dark:bg-slate-900 rounded-lg text-xs font-mono font-bold"
                      />
                      <input
                        type="text"
                        placeholder="e.g. 12:00 PM"
                        value={checkInTime}
                        onChange={e => setCheckInTime(e.target.value)}
                        className="w-28 p-2 border dark:border-slate-800 dark:bg-slate-900 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div className="flex gap-1 flex-wrap pt-1">
                      {['11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM'].map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCheckInTime(preset)}
                          className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                            formatTime12h(checkInTime) === preset
                              ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200/50'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Check-out Time */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/70 dark:border-slate-800/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">Check-Out Time *</span>
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                        {formatTime12h(checkOutTime)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={formatTime24h(checkOutTime)}
                        onChange={e => setCheckOutTime(e.target.value ? formatTime12h(e.target.value) : '11:00 AM')}
                        className="flex-1 p-2 border dark:border-slate-800 dark:bg-slate-900 rounded-lg text-xs font-mono font-bold"
                      />
                      <input
                        type="text"
                        placeholder="e.g. 11:00 AM"
                        value={checkOutTime}
                        onChange={e => setCheckOutTime(e.target.value)}
                        className="w-28 p-2 border dark:border-slate-800 dark:bg-slate-900 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div className="flex gap-1 flex-wrap pt-1">
                      {['10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM'].map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCheckOutTime(preset)}
                          className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                            formatTime12h(checkOutTime) === preset
                              ? 'bg-rose-600 text-white border-rose-600 font-bold'
                              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200/50'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Blinker Alert Guide Box */}
                <div className="p-3 bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-[11px]">
                  <span className="text-base leading-none">💡</span>
                  <div className="space-y-1 text-slate-700 dark:text-slate-300">
                    <p className="font-semibold text-amber-800 dark:text-amber-300">How Room Checkout Blinkers Work:</p>
                    <div className="flex flex-wrap gap-3 pt-0.5">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
                        <strong className="text-amber-700 dark:text-amber-400">Amber Blinker:</strong> Triggered when a room is approaching check-out time on its departure date (within 60 mins).
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                        <strong className="text-rose-700 dark:text-rose-400">Red Blinker:</strong> Triggered once the room has crossed the {formatTime12h(checkOutTime)} check-out time.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors"
              >
                Save Hotel Settings
              </button>
            </form>
          </div>
        )}

        {/* Multi-Tenant Organizations Management */}
        {activeSettingsTab === 'tenants' && (
          <div className="space-y-6">
            
            <div className="border-b pb-3 border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-500" />
                  Multi-Tenant Property Organizations & Account Management
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Create and manage isolated multi-tenant property accounts, domain slugs, and license tiers
                </p>
              </div>
            </div>

            {/* List of Registered Tenants */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Registered Property Accounts ({tenants.length})</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tenants.map(t => {
                  const isActive = t.id === activeTenantId;
                  return (
                    <div 
                      key={t.id} 
                      className={`p-4 rounded-xl border transition-all space-y-2 ${
                        isActive 
                          ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 shadow-sm' 
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-xs">{t.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{t.subdomain}</p>
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                          t.status === 'Active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {t.status}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-500 space-y-0.5 font-mono">
                        <p>Owner: {t.email}</p>
                        <p>GSTIN: {t.gstNumber}</p>
                        <p>Tier: {t.tier} ({t.currency})</p>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex justify-between items-center">
                        {isActive ? (
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Currently Active Account
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSwitchTenant(t)}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition-all"
                          >
                            Switch to this Tenant
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Create New Multi-Tenant Account Form */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border dark:border-slate-800 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-indigo-500" /> Provision New Multi-Tenant Property Account
              </h4>

              <form onSubmit={handleCreateTenant} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Property / Tenant Name *</label>
                    <input
                      type="text"
                      required
                      value={tenantName}
                      onChange={e => {
                        setTenantName(e.target.value);
                        if (!tenantSlug) {
                          setTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                        }
                      }}
                      className="w-full p-2 border dark:border-slate-800 dark:bg-slate-900 rounded-xl"
                      placeholder="e.g. Hotel Le Merridien"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Tenant Slug / ID *</label>
                    <input
                      type="text"
                      required
                      value={tenantSlug}
                      onChange={e => setTenantSlug(e.target.value)}
                      className="w-full p-2 border dark:border-slate-800 dark:bg-slate-900 rounded-xl font-mono text-xs"
                      placeholder="hotel-le-merridien"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Owner / Admin Email *</label>
                    <input
                      type="email"
                      required
                      value={tenantEmail}
                      onChange={e => setTenantEmail(e.target.value)}
                      className="w-full p-2 border dark:border-slate-800 dark:bg-slate-900 rounded-xl"
                      placeholder="merridien@hotel.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Phone Contact</label>
                    <input
                      type="text"
                      value={tenantPhone}
                      onChange={e => setTenantPhone(e.target.value)}
                      className="w-full p-2 border dark:border-slate-800 dark:bg-slate-900 rounded-xl"
                      placeholder="+91 98765 11223"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Subdomain</label>
                    <input
                      type="text"
                      value={tenantSubdomain}
                      onChange={e => setTenantSubdomain(e.target.value)}
                      className="w-full p-2 border dark:border-slate-800 dark:bg-slate-900 rounded-xl font-mono text-[11px]"
                      placeholder="merridien.hotelvista.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">License Tier</label>
                    <select
                      value={tenantTier}
                      onChange={e => setTenantTier(e.target.value as any)}
                      className="w-full p-2 border dark:border-slate-800 dark:bg-slate-900 rounded-xl font-semibold"
                    >
                      <option value="Boutique">Boutique Hotel</option>
                      <option value="Standard ERP">Standard ERP</option>
                      <option value="Enterprise Multi-Property">Enterprise Multi-Property</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Currency</label>
                    <select
                      value={tenantCurrency}
                      onChange={e => setTenantCurrency(e.target.value)}
                      className="w-full p-2 border dark:border-slate-800 dark:bg-slate-900 rounded-xl font-semibold"
                    >
                      <option value="INR (₹)">INR (₹)</option>
                      <option value="USD ($)">USD ($)</option>
                      <option value="EUR (€)">EUR (€)</option>
                      <option value="AED (🇦🇪)">AED (🇦🇪)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all"
                >
                  Create & Provision Tenant Account
                </button>
              </form>
            </div>

          </div>
        )}

        {/* User Accounts & Client Credentials Management */}
        {activeSettingsTab === 'users' && (
          <div className="space-y-6">
            
            <div className="border-b pb-3 border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-500" />
                  {isSuperAdmin ? 'Client User Accounts & Login Credentials Management' : `${currentTenant?.name || 'Property'} Staff Accounts & Login Credentials`}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {isSuperAdmin 
                    ? 'Create and manage client email IDs, passwords, roles, and assigned property tenants across the SaaS'
                    : `Create and manage receptionist, restaurant, bar, and store staff logins for ${currentTenant?.name || 'your property'}`}
                </p>
              </div>
            </div>

            {/* List of User Accounts (Isolated per Tenant) */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isSuperAdmin ? `All Client Accounts (${visibleUserAccounts.length})` : `Active Staff Accounts for ${currentTenant?.name || 'This Property'} (${visibleUserAccounts.length})`}
              </h4>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <th className="py-2.5 px-3">Staff / User Name</th>
                      <th className="py-2.5 px-3">Email ID (Username)</th>
                      <th className="py-2.5 px-3 font-mono">Password</th>
                      <th className="py-2.5 px-3">Assigned Role</th>
                      <th className="py-2.5 px-3">Property / Tenant</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {visibleUserAccounts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                          No staff accounts created for this property yet. Use the form below to create one.
                        </td>
                      </tr>
                    ) : (
                      visibleUserAccounts.map(u => {
                        const isShown = showPasswords[u.id];
                        return (
                          <tr key={u.id} className="text-slate-700 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-850/40">
                            <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                              {u.name}
                            </td>
                            <td className="py-3 px-3 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                              {u.email}
                            </td>
                            <td className="py-3 px-3 font-mono">
                              <div className="flex items-center gap-1.5">
                                <span>{isShown ? u.password : '••••••••'}</span>
                                <button
                                  onClick={() => toggleShowPassword(u.id)}
                                  className="text-[10px] text-slate-400 hover:text-slate-600 underline"
                                >
                                  {isShown ? 'Hide' : 'Show'}
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-3 font-semibold">
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] uppercase font-mono">
                                {u.role}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-medium text-slate-500">
                              {u.tenantName}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleOpenEditUser(u)}
                                  className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800/60 rounded text-[10px] font-bold transition-all flex items-center gap-1 shadow-xs"
                                  title="Edit staff details & reset/change password"
                                >
                                  <Key className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                  Edit Password
                                </button>

                                <button
                                  onClick={() => {
                                    switchRole(u.role);
                                    alert(`Switched context to ${u.name} (${u.email})!`);
                                  }}
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold transition-all flex items-center gap-1"
                                >
                                  <UserCheck className="w-3 h-3" />
                                  Switch Role
                                </button>

                                {u.role !== 'super_admin' && u.email !== 'admin@hotelvista.com' && (
                                  <button
                                    onClick={() => deleteUserAccount(u.id)}
                                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                                    title="Delete User"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Create New Staff User Account Form */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border dark:border-slate-800 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-500" /> {isSuperAdmin ? 'Create New Client Credentials & User Account' : `Add Staff User Account (${currentTenant?.name || 'This Property'})`}
              </h4>

              <form onSubmit={handleCreateUserAccount} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Staff / Full Name *</label>
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      className="w-full p-2 border dark:border-slate-800 dark:bg-slate-900 rounded-xl"
                      placeholder={isSuperAdmin ? 'e.g. Le Merridien Manager' : 'e.g. Front Desk Staff'}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Email ID (Username) *</label>
                    <input
                      type="email"
                      required
                      value={clientEmail}
                      onChange={e => setClientEmail(e.target.value)}
                      className="w-full p-2 border dark:border-slate-800 dark:bg-slate-900 rounded-xl font-mono text-xs"
                      placeholder="staff@hotel.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Password *</label>
                    <input
                      type="text"
                      required
                      value={clientPassword}
                      onChange={e => setClientPassword(e.target.value)}
                      className="w-full p-2 border dark:border-slate-800 dark:bg-slate-900 rounded-xl font-mono text-xs"
                      placeholder="123456"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Assigned Role *</label>
                    <select
                      value={clientRole}
                      onChange={e => setClientRole(e.target.value as UserRole)}
                      className="w-full p-2 border dark:border-slate-800 dark:bg-slate-900 rounded-xl font-semibold"
                    >
                      {isSuperAdmin && <option value="admin">Property Administrator</option>}
                      <option value="reception">Receptionist / Front Desk</option>
                      <option value="restaurant">Restaurant Staff / Captain</option>
                      <option value="bar">Bar Staff / Bartender</option>
                      <option value="store_manager">Store & Inventory Manager</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Property / Tenant</label>
                    <input
                      type="text"
                      disabled={!isSuperAdmin}
                      value={isSuperAdmin ? clientTenantName : (currentTenant?.name || 'Active Property')}
                      onChange={e => setClientTenantName(e.target.value)}
                      className={`w-full p-2 border dark:border-slate-800 rounded-xl font-semibold ${
                        !isSuperAdmin ? 'bg-slate-100 dark:bg-slate-850 text-slate-400 cursor-not-allowed' : 'dark:bg-slate-900'
                      }`}
                      placeholder="Hotel Property"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all"
                >
                  {isSuperAdmin ? 'Create & Provision Client Account' : 'Create Staff Login Account'}
                </button>
              </form>
            </div>

          </div>
        )}

        {/* Rooms Manager */}
        {activeSettingsTab === 'rooms' && (
          <div className="space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-455 border-b pb-2 border-slate-100 dark:border-slate-800">
              Customize Rooms Inventory & Pricing
            </h3>

            {/* Form to add Room */}
            <form onSubmit={handleAddRoomSubmit} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-850 rounded-xl space-y-3.5 text-xs">
              <span className="font-bold text-[10px] uppercase text-indigo-500 block">Create New Hotel Room</span>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Room Number *</label>
                  <input
                    type="text"
                    required
                    value={newRoomNumber}
                    onChange={e => setNewRoomNumber(e.target.value)}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-900 rounded-lg font-bold"
                    placeholder="e.g. 107"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Floor Number *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newRoomFloor}
                    onChange={e => setNewRoomFloor(Number(e.target.value))}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-900 rounded-lg font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Room Category *</label>
                  <select
                    value={newRoomCategory}
                    onChange={e => setNewRoomCategory(e.target.value as RoomCategory)}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-900 rounded-lg font-semibold"
                  >
                    {['Deluxe AC', 'Deluxe Superior', 'Elite', 'Superior', 'Family Suite', 'Non AC'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Room Rent Price (₹/day) *</label>
                  <input
                    type="number"
                    required
                    min={100}
                    value={newRoomPrice}
                    onChange={e => setNewRoomPrice(Number(e.target.value))}
                    className="w-full p-2 border dark:border-slate-800 dark:bg-slate-900 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-colors mt-2"
              >
                Create Room Entry
              </button>
            </form>

            {/* Rooms List preview with Delete */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Existing Rooms Catalog ({rooms.length})</span>
              <div className="max-h-[300px] overflow-y-auto border border-slate-100 dark:border-slate-800/80 rounded-xl divide-y divide-slate-100 dark:divide-slate-800/50 bg-white dark:bg-slate-900">
                {rooms.map(room => (
                  <div key={room.id} className="flex justify-between items-center p-3 text-xs">
                    <div>
                      <p className="font-bold text-slate-850 dark:text-slate-150 flex items-center gap-2">
                        <span>Room {room.roomNumber}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">{room.category}</span>
                      </p>
                      <span className="text-[9px] text-slate-450 font-semibold">Floor {room.floor} • ₹{room.price}/day • Status: <span className="font-bold text-emerald-500">{room.status}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditRoom(room)}
                        className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg transition-colors"
                        title="Edit Room Details (Floor, Price, Category, Room #)"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (room.status !== 'Available') {
                            alert('Cannot delete an active, occupied or reserved room!');
                            return;
                          }
                          if (confirm(`Are you sure you want to delete Room ${room.roomNumber}?`)) {
                            await deleteRoom(room.id);
                          }
                        }}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors"
                        title="Delete Room"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* EDIT ROOM DETAILS MODAL */}
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
                    min="1"
                    step="1"
                    required
                    value={editRoomPrice || ''}
                    onChange={e => setEditRoomPrice(Number(e.target.value))}
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
                  disabled={isSubmittingEditRoom || !editRoomNumber || editRoomPrice <= 0}
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

      {/* EDIT USER / PASSWORD MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-indigo-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 font-bold">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Edit User Password & Details</h3>
                  <p className="text-[11px] text-indigo-300/80">Update credentials for {editingUser.email}</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingUser(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEditUserSubmit} className="p-5 space-y-4 text-xs">
              {/* User info summary card */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Account Email</span>
                  <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">{editingUser.email}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Property</span>
                  <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">{editingUser.tenantName || currentTenant?.name}</p>
                </div>
              </div>

              {/* Staff Name */}
              <div className="space-y-1">
                <label className="font-bold text-slate-600 dark:text-slate-300">Staff / User Full Name *</label>
                <input
                  type="text"
                  required
                  value={editUserName}
                  onChange={e => setEditUserName(e.target.value)}
                  className="w-full p-2.5 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  placeholder="e.g. Front Desk Staff"
                />
              </div>

              {/* Password Field with Show/Hide & Generate */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-indigo-500" />
                    New Password *
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[10px] text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold flex items-center gap-1 hover:underline"
                  >
                    <RefreshCw className="w-3 h-3" /> Generate Random
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    required
                    value={editUserPassword}
                    onChange={e => setEditUserPassword(e.target.value)}
                    className="w-full p-2.5 pr-10 border dark:border-slate-800 dark:bg-slate-950 rounded-xl font-mono text-xs text-slate-900 dark:text-white"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Staff member can use this updated password immediately to log in.
                </p>
              </div>

              {/* Role Selection */}
              <div className="space-y-1">
                <label className="font-bold text-slate-600 dark:text-slate-300">Assigned Role</label>
                <select
                  value={editUserRole}
                  disabled={!isSuperAdmin && editingUser.role === 'admin'}
                  onChange={e => setEditUserRole(e.target.value as UserRole)}
                  className="w-full p-2.5 border dark:border-slate-800 dark:bg-slate-950 rounded-xl font-semibold text-xs text-slate-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {(isSuperAdmin || editingUser.role === 'admin') && <option value="admin">Property Administrator</option>}
                  <option value="reception">Receptionist / Front Desk</option>
                  <option value="restaurant">Restaurant Staff / Captain</option>
                  <option value="bar">Bar Staff / Bartender</option>
                  <option value="store_manager">Store & Inventory Manager</option>
                </select>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEditUser}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSubmittingEditUser ? 'Updating...' : 'Save Password & Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
