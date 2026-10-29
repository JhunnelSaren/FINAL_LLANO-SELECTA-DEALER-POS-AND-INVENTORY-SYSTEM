import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Truck,
  Package,
  Store,
  FileText,
  Settings as SettingsIcon,
  LogOut,
  User as UserIcon,
  Shield,
  ChevronDown,
  MapPin,
  Clock,
  CheckCircle2,
  Bell,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../utils/api';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout, isAdmin } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // Live Asia/Manila clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        new Intl.DateTimeFormat('en-PH', {
          timeZone: 'Asia/Manila',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }).format(now)
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const refreshNotifications = async () => {
      try {
        const response = await apiRequest<{ notifications: any[]; unreadCount: number }>('/notifications');
        if (active) { setNotifications(response.notifications || []); setNotificationCount(response.unreadCount || 0); }
      } catch { /* Notification loading should not interrupt staff work. */ }
    };
    refreshNotifications();
    const interval = window.setInterval(refreshNotifications, 60000);
    return () => { active = false; window.clearInterval(interval); };
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Primary navigation
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders-delivery', label: 'Orders & Delivery', icon: Truck },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'stores-freezers', label: 'Stores & Freezers', icon: Store },
    { id: 'sales-reports', label: 'Sales & Reports', icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm no-print">
      {/* ─── Ultra-Clean Top Status Bar ────────────────────────────────────────── */}
      <div className="bg-slate-900 text-slate-300 px-4 sm:px-6 lg:px-8 py-1.5 text-xs">
        <div className="max-w-screen-2xl mx-auto flex justify-between items-center">
          {/* Left: Location & Route Coverage */}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-rose-400 font-semibold tracking-wide uppercase text-[11px]">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Llano Selecta Dealer
            </span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="hidden sm:flex items-center gap-1 text-slate-400 text-[11px]">
              <MapPin className="w-3 h-3 text-slate-500" />
              Sayre Hwy, Valencia City • San Fernando • Cabanglasan
            </span>
          </div>

          {/* Right: Operational Status, Timezone & Live Manila Clock */}
          <div className="flex items-center gap-4 text-[11px]">
            <span className="hidden md:flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              System Operational
            </span>
            <span className="text-slate-600 hidden md:inline">•</span>
            <span className="flex items-center gap-1.5 text-slate-400 font-mono">
              <Clock className="w-3 h-3 text-slate-500" />
              {currentTime ? `${currentTime} (PHT)` : 'Asia/Manila'}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
              isAdmin
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
            }`}>
              {isAdmin ? '🛡️ Admin' : '👤 Staff'}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Main Navigation Bar ──────────────────────────────────────────────── */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 h-16">
          {/* Brand Identity */}
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            aria-label="Go to Dashboard"
            className="flex shrink-0 items-center gap-2.5 cursor-pointer select-none group text-left"
          >
            <div className="relative flex h-12 w-14 items-center justify-center overflow-hidden rounded-xl bg-white group-hover:scale-105 transition-transform">
              <img src="/llano-selecta-logo.png" alt="Llano Selecta logo" className="h-full w-full object-contain" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-base tracking-tight leading-none group-hover:text-rose-700 transition-colors">
                  LLANO SELECTA
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold tracking-wider bg-rose-50 text-rose-700 border border-rose-200/80">
                  POS
                </span>
              </div>
              <p className="hidden sm:block text-[11px] text-slate-500 font-medium tracking-normal mt-0.5">
                Authorized Cold-Chain Dealership
              </p>
            </div>
          </button>

          {/* Primary Navigation Tabs */}
          <nav aria-label="Main modules" className="hidden xl:flex flex-1 max-w-4xl mx-6 items-center justify-evenly bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 shadow-inner">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex shrink-0 items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                    isActive
                      ? 'bg-white text-rose-700 shadow-sm border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 transition-colors ${isActive ? 'text-rose-600' : 'text-slate-400'}`} />
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Header Actions: Settings & Staff Menu */}
        <div className="flex shrink-0 items-center gap-1.5">
            <div className="relative">
              <button onClick={() => setNotificationsOpen(value => !value)} title="Notifications" className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50">
                <Bell className="h-4 w-4" />
                {notificationCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-600 px-1 text-center text-[10px] font-bold text-white">{notificationCount > 9 ? '9+' : notificationCount}</span>}
              </button>
              {notificationsOpen && <div className="absolute right-0 mt-2 w-[min(90vw,24rem)] max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl z-50">
                <div className="flex items-center justify-between border-b px-4 py-3"><div><h3 className="text-sm font-bold text-slate-800">Staff Notifications</h3><p className="text-xs text-slate-500">Incoming bookings, stock, deliveries, and collections</p></div><button onClick={() => setNotificationsOpen(false)} className="text-sm text-slate-500">Close</button></div>
                {notifications.length ? notifications.map(item => <button key={item.id} onClick={() => { setActiveTab(item.module || 'dashboard'); setNotificationsOpen(false); }} className="block w-full border-b px-4 py-3 text-left hover:bg-slate-50">
                  <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${item.level === 'urgent' ? 'bg-rose-600' : item.level === 'warning' ? 'bg-amber-500' : 'bg-blue-400'}`} /><span className="text-sm font-semibold text-slate-800">{item.title}</span></div>
                  <p className="mt-1 pl-4 text-xs text-slate-600">{item.message}</p>
                  <p className="mt-1 pl-4 text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</p>
                </button>) : <p className="px-4 py-8 text-center text-sm text-slate-400">No notifications right now.</p>}
              </div>}
            </div>
            {/* Settings Gear Button */}
            <button
              onClick={() => setActiveTab('settings')}
              title="Dealership & System Settings"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-all shadow-sm ${
                activeTab === 'settings'
                  ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-rose-100'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <SettingsIcon className={`w-4 h-4 transition-transform duration-300 ${activeTab === 'settings' ? 'rotate-90 text-rose-600' : 'text-slate-500'}`} />
              <span className="hidden sm:inline text-xs">Settings</span>
            </button>

            {/* User Profile Dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl transition border ${
                  showUserMenu
                    ? 'bg-slate-100 border-slate-300'
                    : 'bg-white border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-slate-800 to-slate-700 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : 'U'}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="font-semibold text-slate-800 text-xs leading-tight truncate max-w-[120px]">
                    {user?.name || 'User'}
                  </div>
                  <div className="text-[10px] text-slate-500 capitalize">{user?.role || 'Staff'}</div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu Modal */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-800">{user?.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isAdmin ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {user?.role} Access
                      </span>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setActiveTab('settings');
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 text-left transition-colors"
                    >
                      <SettingsIcon className="w-4 h-4 text-slate-400" />
                      Dealership & Staff Settings
                    </button>
                  </div>

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 text-left transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Mobile Secondary Nav Strip ────────────────────────────────────── */}
        <nav aria-label="Main modules" className="grid grid-cols-2 sm:grid-cols-3 xl:hidden py-1.5 gap-1 border-t border-slate-100">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-w-0 w-full items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-semibold transition-all ${
                  isActive
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
