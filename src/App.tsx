import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { RoleHeader } from './components/RoleHeader';
import { LoginScreen } from './components/LoginScreen';
import { SuperAdminView } from './views/SuperAdminView';
import { DashboardView } from './views/DashboardView';
import { RoomsView } from './views/RoomsView';
import { PreBookingView } from './views/PreBookingView';
import { MenuView } from './views/MenuView';
import { RestaurantBarView } from './views/RestaurantBarView';
import { LaundryView } from './views/LaundryView';
import { PartyHallView } from './views/PartyHallView';
import { StockView } from './views/StockView';
import { UnifiedBillingView } from './views/UnifiedBillingView';
import { ReportsView } from './views/ReportsView';
import { ExpensesView } from './views/ExpensesView';
import { SettingsView } from './views/SettingsView';
import { AuditLogView } from './views/AuditLogView';

const AppContent: React.FC = () => {
  const { userRole, currentUser, user, loadingAuth, currentTenant } = useApp();
  
  // Read initial tab from location hash or localStorage to persist on reload
  const [currentTab, setCurrentTab] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) return hash;
    const saved = localStorage.getItem('hotelvista_active_tab');
    return saved || (userRole === 'super_admin' ? 'superadmin' : 'dashboard');
  });
  const [selectedRoomForBilling, setSelectedRoomForBilling] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  // Sync currentTab with localStorage and URL hash
  useEffect(() => {
    if (currentTab) {
      localStorage.setItem('hotelvista_active_tab', currentTab);
      if (window.location.hash !== `#${currentTab}`) {
        window.location.hash = currentTab;
      }
    }
  }, [currentTab]);

  // Listen for browser back/forward and hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && hash !== currentTab) {
        setCurrentTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentTab]);

  // Role & Tenant Tab Authorization Checks & Auto-Redirects
  useEffect(() => {
    const roleRoutes: Record<string, string[]> = {
      super_admin: [
        'superadmin', 'dashboard', 'rooms', 'prebookings', 'menu_items', 'restaurant', 'bar', 
        'laundry', 'hall', 'stock', 'expenses', 'billing', 'reports', 'settings', 'audit'
      ],
      admin: [
        'dashboard', 'rooms', 'prebookings', 'menu_items', 'restaurant', 'bar', 
        'laundry', 'hall', 'stock', 'expenses', 'billing', 'reports', 'settings', 'audit'
      ],
      reception: [
        'dashboard', 'rooms', 'prebookings', 'laundry', 'hall', 'expenses', 'billing', 'reports'
      ],
      restaurant: ['restaurant', 'menu_items', 'expenses'],
      bar: ['bar', 'menu_items', 'expenses'],
      store_manager: ['laundry', 'stock', 'expenses']
    };

    let allowed = roleRoutes[userRole] || [];
    
    // If not super_admin, filter by tenant's enabled menus (only if configured with at least 1 menu)
    if (userRole !== 'super_admin' && currentTenant?.enabledMenus && Array.isArray(currentTenant.enabledMenus) && currentTenant.enabledMenus.length > 0) {
      allowed = allowed.filter(tab => {
        if (tab === 'expenses' && (currentTenant.enabledMenus!.includes('stock') || currentTenant.enabledMenus!.includes('rooms') || currentTenant.enabledMenus!.includes('restaurant') || currentTenant.enabledMenus!.includes('billing') || currentTenant.enabledMenus!.includes('dashboard'))) {
          return true;
        }
        return currentTenant.enabledMenus!.includes(tab);
      });
    }

    if (allowed.length > 0 && !allowed.includes(currentTab)) {
      // Redirect to the first allowed tab for this role and tenant
      setCurrentTab(allowed[0]);
    }
  }, [userRole, currentTab, currentTenant]);

  if (loadingAuth) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-slate-200">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500/20 border-t-indigo-500 mb-4" />
        <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Loading HotelVista console...</p>
      </div>
    );
  }

  // If user is not logged in, render authentication page
  if (!currentUser && !user) {
    return <LoginScreen />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      
      {/* Sidebar navigation */}
      <Sidebar 
        currentTab={currentTab} 
        setTab={setCurrentTab} 
        collapsed={sidebarCollapsed} 
        onCloseMobile={() => setSidebarCollapsed(true)} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Header bar with status & role switchers */}
        <RoleHeader onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />

        {/* Dynamic viewport */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-6 bg-slate-50/50 dark:bg-slate-950/20">
          
          {currentTab === 'superadmin' && (
            <SuperAdminView />
          )}

          {currentTab === 'dashboard' && (
            <DashboardView setTab={setCurrentTab} />
          )}


          {currentTab === 'rooms' && (
            <RoomsView 
              setTab={setCurrentTab} 
              setSelectedRoomForBilling={setSelectedRoomForBilling} 
            />
          )}

          {currentTab === 'prebookings' && (
            <PreBookingView />
          )}

          {currentTab === 'menu_items' && (
            <MenuView />
          )}

          {currentTab === 'restaurant' && (
            <RestaurantBarView />
          )}

          {currentTab === 'bar' && (
            <RestaurantBarView />
          )}

          {currentTab === 'laundry' && (
            <LaundryView />
          )}

          {currentTab === 'hall' && (
            <PartyHallView />
          )}

          {currentTab === 'stock' && (
            <StockView />
          )}

          {currentTab === 'expenses' && (
            <ExpensesView />
          )}

          {currentTab === 'billing' && (
            <UnifiedBillingView 
              selectedRoomNo={selectedRoomForBilling} 
              setSelectedRoomNo={setSelectedRoomForBilling} 
            />
          )}

          {currentTab === 'reports' && (
            <ReportsView />
          )}

          {currentTab === 'settings' && (
            <SettingsView />
          )}

          {currentTab === 'audit' && (
            <AuditLogView />
          )}

        </main>
      </div>

    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
