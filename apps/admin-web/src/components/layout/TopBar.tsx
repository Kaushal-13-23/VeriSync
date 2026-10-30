/**
 * VeriSync Top Bar Component
 * Header navigation with notifications and admin profile dropdown matching UI_Sample.jpeg.
 * Traceability: FR-ADMIN-001, FR-AUTH-006, NFR-USE-001
 */

import React, { useState, useRef, useEffect } from 'react';
import { Bell, ChevronDown, LogOut, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../store/authContext';

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ title, subtitle = 'Welcome back, Admin' }) => {
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    await logout();
  };

  const displayName = user?.fullName || user?.username || 'Admin';
  const roleName = user?.role === 'TECHNICAL_EVALUATOR' ? 'Technical Evaluator' : 'Super Admin';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between select-none">
      {/* Title & Greeting */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
        <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
      </div>

      {/* Right controls: Notifications & Profile */}
      <div className="flex items-center space-x-4">
        {/* Notifications Icon with unread badge */}
        <div className="relative">
          <button
            type="button"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="View notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>
        </div>

        {/* Admin Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-3 p-1.5 pr-2.5 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
          >
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-blue-100 border border-blue-200 text-blue-700 font-bold text-sm flex items-center justify-center shadow-xs">
              {initial}
            </div>

            {/* Name & Role */}
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-slate-900 leading-tight">{displayName}</div>
              <div className="text-[11px] text-slate-500 leading-tight">{roleName}</div>
            </div>

            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
              role="menu"
            >
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-800">{displayName}</p>
                <p className="text-[11px] text-slate-500 truncate">
                  {user?.email || 'admin@verisync.com'}
                </p>
                <div className="mt-1.5 inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700">
                  <ShieldCheck className="w-3 h-3 text-blue-600" />
                  <span>{roleName}</span>
                </div>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(false)}
                  className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center space-x-2.5"
                  role="menuitem"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Admin Profile</span>
                </button>
              </div>

              <div className="border-t border-slate-100 pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center space-x-2.5 font-medium"
                  role="menuitem"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
