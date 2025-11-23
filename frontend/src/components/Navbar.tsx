import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  FolderOpen,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  UserCircle,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NavbarProps {
  showNavigation?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ showNavigation = true }) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Resources', href: '/resources', icon: FolderOpen },
    { name: 'Search', href: '/search', icon: Search },
    { name: 'Learning', href: '/learning', icon: GraduationCap },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <>
      {/* Top Navbar */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side - Logo */}
            <div className="flex items-center">
              <Link
                to="/"
                className="hover:opacity-80 transition-opacity"
              >
                <svg width="140" height="32" viewBox="0 0 140 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-auto">
                  {/* Book Icon */}
                  <rect x="2" y="6" width="16" height="20" rx="2" fill="#2563EB" />
                  <path d="M6 10h8M6 14h8M6 18h6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M10 6v20" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="10" cy="4" r="2" fill="#2563EB" />
                  <circle cx="10" cy="28" r="2" fill="#2563EB" />

                  {/* Text */}
                  <text x="26" y="22" fontFamily="system-ui, -apple-system, sans-serif" fontSize="14" fontWeight="700" fill="#111827">Personal Manager</text>
                </svg>
              </Link>
            </div>

            {/* Center - Desktop Navigation */}
            {showNavigation && (
              <nav className="hidden md:flex space-x-8">
                {navigation.map((item) => {
                  const isCurrent = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`inline-flex items-center px-3 py-2 text-base font-medium rounded-md transition-all duration-200 ${isCurrent
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            )}

            {/* Right side - Notifications, Profile */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="p-2 text-gray-500 hover:text-gray-600 focus:outline-none">
                <Bell className="h-5 w-5" strokeWidth={1.5} />
              </button>

              {/* Profile dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center max-w-xs bg-white rounded-full focus:outline-none p-1"
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                      <UserCircle className="h-5 w-5 text-primary-600" strokeWidth={1.5} />
                    </div>
                    <div className="hidden lg:block text-left">
                      <p className="text-sm font-medium text-gray-700">{user?.name || 'User'}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} strokeWidth={1.5} />
                  </div>
                </button>

                {/* Dropdown menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    >
                      <LogOut className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default Navbar;