import React, { useState } from 'react';
import { useApp, UserRole } from '../context/AppContext';
import { Sun, Moon, Menu, LogOut } from 'lucide-react';

interface RoleHeaderProps {
  onToggleSidebar: () => void;
}

export const RoleHeader: React.FC<RoleHeaderProps> = ({ onToggleSidebar }) => {
  const { 
    userRole, 
    darkMode, 
    toggleDarkMode, 
    currentUser, 
    logoutUser,
    user,
    logout,
    settings 
  } = useApp();

  const roles: { value: UserRole; label: string; icon: string; desc: string }[] = [
    { value: 'super_admin', label: 'Super Admin', icon: '👑', desc: 'Global multi-tenant SaaS management & property onboarding' },
    { value: 'admin', label: 'Administrator', icon: '⚡', desc: 'Full access to all property systems & configuration' },
    { value: 'reception', label: 'Receptionist', icon: '🔑', desc: 'Room bookings, Check-In, Unified billing' },
    { value: 'restaurant', label: 'Restaurant Staff', icon: '🍳', desc: 'Create restaurant orders, KOT printing' },
    { value: 'bar', label: 'Bar Staff', icon: '🍷', desc: 'Create bar orders, Bar billing' },
    { value: 'store_manager', label: 'Store Manager', icon: '📦', desc: 'Stock inventory, Purchase logging' }
  ];

  const currentRoleInfo = roles.find(r => r.value === userRole);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 border-b glass bg-white/80 dark:bg-slate-900/80 border-slate-200/50 dark:border-slate-800/50 transition-all duration-300">
      
      {/* Brand & Toggle & Active Area Indicator */}
      <div className="flex items-center gap-3">
        {/* Hamburger Menu Toggle Button */}
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-2 text-slate-650 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
          title="Toggle Sidebar Layout"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-bold shadow-md shadow-indigo-500/20 flex-shrink-0">
          <span>{settings?.name ? settings.name.substring(0, 2).toUpperCase() : 'HV'}</span>
        </div>
        <div className="max-w-[200px] md:max-w-xs">
          <h1 className="text-sm md:text-base font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent truncate" title={settings?.name || 'HotelVista ERP'}>
            {settings?.name || 'HotelVista ERP'}
          </h1>
          <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold flex items-center gap-1">
            <span>●</span> {currentUser ? currentUser.tenantName : 'Active Property'}: {currentRoleInfo?.label}
          </p>
        </div>
      </div>

      {/* Action buttons (Right) */}
      <div className="flex items-center gap-3">
        
        {/* DARK MODE TOGGLE */}
        <button
          onClick={toggleDarkMode}
          className="p-2 text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
          title="Toggle Dark Mode"
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* STAFF SIGNATURE PROFILE / CURRENT USER */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200/50 dark:border-slate-800/50">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-white text-xs shadow-sm">
            {currentUser ? currentUser.name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : userRole.charAt(0).toUpperCase())}
          </div>
          <div className="hidden md:block max-w-[120px]">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight truncate" title={currentUser?.name || user?.email || 'Staff'}>
              {currentUser ? currentUser.name : (user?.email ? user.email.split('@')[0] : 'Staff On-Duty')}
            </p>
            <p className="text-[9px] font-mono text-indigo-500 truncate">
              {currentUser ? currentUser.email : (user?.email || currentRoleInfo?.label)}
            </p>
          </div>

          {(currentUser || user) && (
            <button
              onClick={() => {
                if (logoutUser) logoutUser();
                if (logout) logout();
              }}
              className="flex items-center gap-1 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors ml-1"
              title="Log Out Account"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
