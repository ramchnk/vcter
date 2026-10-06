import React from 'react';
import { useApp, UserRole } from '../context/AppContext';
import { 
  LayoutDashboard, 
  BedDouble, 
  CalendarDays, 
  UtensilsCrossed, 
  Wine, 
  Shirt, 
  PartyPopper, 
  Package, 
  Receipt, 
  BarChart3, 
  Settings, 
  History,
  Crown,
  BookOpen
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setTab: (tab: string) => void;
  collapsed: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setTab, collapsed }) => {
  const { userRole, currentTenant } = useApp();

  // Route definitions with icon, roles allowed, and label
  const navItems = [
    { id: 'superadmin', label: 'Super Admin Portal', icon: Crown, roles: ['super_admin'] },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'reception'] },
    { id: 'rooms', label: 'Room Management', icon: BedDouble, roles: ['super_admin', 'admin', 'reception'] },
    { id: 'prebookings', label: 'Pre Bookings', icon: CalendarDays, roles: ['super_admin', 'admin', 'reception'] },
    { id: 'menu_items', label: 'Menu Items', icon: BookOpen, roles: ['super_admin', 'admin', 'restaurant', 'bar'] },
    { id: 'restaurant', label: 'Restaurant POS', icon: UtensilsCrossed, roles: ['super_admin', 'admin', 'restaurant'] },
    { id: 'bar', label: 'Bar POS', icon: Wine, roles: ['super_admin', 'admin', 'bar'] },
    { id: 'laundry', label: 'Laundry Service', icon: Shirt, roles: ['super_admin', 'admin', 'reception', 'store_manager'] },
    { id: 'hall', label: 'Party Hall', icon: PartyPopper, roles: ['super_admin', 'admin', 'reception'] },
    { id: 'stock', label: 'Stock / Inventory', icon: Package, roles: ['super_admin', 'admin', 'store_manager'] },
    { id: 'billing', label: 'Unified Billing', icon: Receipt, roles: ['super_admin', 'admin', 'reception'] },
    { id: 'reports', label: 'Reports', icon: BarChart3, roles: ['super_admin', 'admin', 'reception'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['super_admin', 'admin'] },
    { id: 'audit', label: 'Audit Log', icon: History, roles: ['super_admin', 'admin'] }
  ];

  // Filter navigation items by active role & tenant enabled menus
  const visibleItems = navItems.filter(item => {
    // 1. Check user role permission
    if (!item.roles.includes(userRole)) return false;
    // 2. Super admin gets all permitted modules
    if (userRole === 'super_admin') return true;
    // 3. For client accounts, check if module is enabled for this tenant
    const enabledMenus = currentTenant?.enabledMenus;
    if (enabledMenus && Array.isArray(enabledMenus) && enabledMenus.length > 0) {
      return enabledMenus.includes(item.id);
    }
    return true;
  });

  return (
    <aside className={`${collapsed ? 'w-20' : 'w-64'} bg-slate-900 border-r border-slate-800 flex flex-col justify-between text-slate-300 transition-all duration-300`}>
      
      {/* Upper Logo / Banner */}
      <div className="flex-1 flex flex-col py-6 overflow-y-auto">
        <div className={collapsed ? "px-4 mb-6" : "px-6 mb-6"}>
          {!collapsed ? (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-800/40 border border-slate-700/30">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Departmental Terminal
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center py-1">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
          )}
        </div>

        {/* Navigation Link list */}
        <nav className={collapsed ? "px-2 space-y-1.5" : "px-3 space-y-1"}>
          {visibleItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-3.5 rounded-xl text-sm font-semibold transition-all duration-200 group relative ${
                  collapsed ? 'justify-center p-3.5 mx-auto w-12' : 'w-full px-4 py-3 text-left'
                } ${
                  isActive 
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/10' 
                    : 'hover:bg-slate-800 hover:text-slate-100 text-slate-400'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 transition-transform group-hover:scale-105 duration-200 ${
                  isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                }`} />
                {!collapsed && <span>{item.label}</span>}
                
                {/* Micro animation dot */}
                {isActive && !collapsed && (
                  <span className="absolute right-3.5 w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer with system stats */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/20 text-center">
        {!collapsed ? (
          <>
            <div className="text-[10px] text-slate-500 font-medium font-mono">
              SYSTEM VER: 1.0.4 PRO
            </div>
            <div className="text-[9px] text-slate-600 mt-0.5">
              HotelVista ERP © 2026
            </div>
          </>
        ) : (
          <div className="text-[9px] font-mono text-slate-500 font-bold uppercase">
            Pro
          </div>
        )}
      </div>
      
    </aside>
  );
};
