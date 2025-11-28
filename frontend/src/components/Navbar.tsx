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
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';

interface NavbarProps {
  showNavigation?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ showNavigation = true }) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
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

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      {/* Floating Navbar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-4' : 'py-6'
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={`
              mx-auto rounded-2xl transition-all duration-300
              ${scrolled
                ? 'bg-void-900/80 backdrop-blur-xl border border-starlight-100/10 shadow-lg px-6 py-3'
                : 'bg-transparent px-0 py-2'
              }
            `}
          >
            <div className="flex items-center justify-between">
              {/* Left side - Logo */}
              <div className="flex items-center">
                <Link
                  to="/"
                  className="flex items-center gap-2 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center text-white font-bold font-display text-xl shadow-lg shadow-neon-blue/20 group-hover:shadow-neon-blue/40 transition-all duration-300">
                    N
                  </div>
                  <span className="font-display font-bold text-xl text-starlight-100 tracking-tight group-hover:text-white transition-colors">
                    Nexus<span className="text-starlight-400">Brain</span>
                  </span>
                </Link>
              </div>

              {/* Center - Desktop Navigation */}
              {showNavigation && (
                <nav className="hidden md:flex items-center gap-1 bg-void-800/50 rounded-full p-1 border border-starlight-100/5 backdrop-blur-md">
                  {navigation.map((item) => {
                    const isCurrent = location.pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`
                          relative px-4 py-2 text-sm font-medium rounded-full transition-all duration-300
                          ${isCurrent
                            ? 'text-white bg-void-700 shadow-sm'
                            : 'text-starlight-400 hover:text-starlight-100 hover:bg-void-800'
                          }
                        `}
                      >
                        {item.name}
                      </Link>
                    );
                  })}
                </nav>
              )}

              {/* Right side - Notifications, Profile */}
              <div className="flex items-center space-x-4">
                {user ? (
                  <>
                    <button className="p-2 text-starlight-400 hover:text-starlight-100 transition-colors relative">
                      <Bell className="h-5 w-5" />
                      <span className="absolute top-2 right-2 w-2 h-2 bg-neon-pink rounded-full animate-pulse"></span>
                    </button>

                    <div className="relative" ref={dropdownRef}>
                      <button
                        onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                        className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-void-800 transition-colors border border-transparent hover:border-starlight-100/10"
                      >
                        <div className="hidden lg:block text-right">
                          <p className="text-sm font-medium text-starlight-100 leading-none">{user.name}</p>
                          <p className="text-[10px] text-starlight-500 uppercase tracking-wider mt-0.5">Pro Plan</p>
                        </div>
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-void-700 to-void-800 border border-starlight-100/10 flex items-center justify-center overflow-hidden">
                          <UserCircle className="h-full w-full text-starlight-400" />
                        </div>
                      </button>

                      {/* Dropdown menu */}
                      {profileDropdownOpen && (
                        <div className="absolute right-0 mt-4 w-56 bg-void-900 rounded-xl shadow-2xl border border-starlight-100/10 py-2 animate-fade-in overflow-hidden">
                          <div className="px-4 py-3 border-b border-starlight-100/5 bg-void-800/30">
                            <p className="text-sm font-medium text-starlight-100">{user.name}</p>
                            <p className="text-xs text-starlight-500 truncate">{user.email}</p>
                          </div>
                          <div className="py-1">
                            <Link to="/settings" className="block px-4 py-2 text-sm text-starlight-300 hover:bg-void-800 hover:text-starlight-100 transition-colors">
                              Settings
                            </Link>
                            <Link to="/billing" className="block px-4 py-2 text-sm text-starlight-300 hover:bg-void-800 hover:text-starlight-100 transition-colors">
                              Billing
                            </Link>
                          </div>
                          <div className="border-t border-starlight-100/5 py-1">
                            <button
                              onClick={handleLogout}
                              className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <LogOut className="mr-2 h-4 w-4" />
                              Sign out
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    <Link to="/login" className="text-sm font-medium text-starlight-300 hover:text-starlight-100 transition-colors">
                      Log in
                    </Link>
                    <Link to="/signup">
                      <Button size="sm" variant="primary">
                        Get Started
                      </Button>
                    </Link>
                  </div>
                )}

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 text-starlight-300 hover:text-starlight-100"
                >
                  {mobileMenuOpen ? <X /> : <Menu />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-void-950/95 backdrop-blur-xl md:hidden pt-24 px-6">
          <nav className="flex flex-col gap-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-4 text-xl font-medium text-starlight-300 hover:text-starlight-100 py-4 border-b border-starlight-100/5"
              >
                <item.icon className="w-6 h-6" />
                {item.name}
              </Link>
            ))}
            {!user && (
              <div className="flex flex-col gap-4 mt-8">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="secondary" fullWidth>Log in</Button>
                </Link>
                <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" fullWidth>Get Started</Button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </>
  );
};

export default Navbar;