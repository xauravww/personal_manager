import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Home,
    FolderOpen,
    Search,
    GraduationCap,
    Database,
    Settings,
    LogOut,
    Menu,
    X,
    Bell,
    UserCircle,
    ChevronRight,
    Plus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: Home },
        { name: 'Resources', href: '/resources', icon: FolderOpen },
        { name: 'Search', href: '/search', icon: Search },
        { name: 'Learning', href: '/learning', icon: GraduationCap },
        { name: 'Vault', href: '/vault', icon: Database },
    ];

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const getPageTitle = () => {
        const path = location.pathname.split('/')[1];
        if (!path) return 'Dashboard';
        return path.charAt(0).toUpperCase() + path.slice(1);
    };

    return (
        <div className="h-screen bg-void-950 text-starlight-100 font-sans selection:bg-neon-blue selection:text-white flex overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-void-950/80 backdrop-blur-sm lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-void-900 border-r border-starlight-100/5 transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
                <div className="h-full flex flex-col">
                    {/* Logo */}
                    <div className="h-16 flex items-center px-6 border-b border-starlight-100/5">
                        <Link to="/dashboard" className="flex items-center gap-2 group">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center text-white font-bold font-display shadow-lg shadow-neon-blue/20 group-hover:shadow-neon-blue/40 transition-all">
                                N
                            </div>
                            <span className="font-display font-bold text-lg text-starlight-100 tracking-tight">
                                Nexus<span className="text-starlight-400">Brain</span>
                            </span>
                        </Link>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                        <div className="mb-6">
                            <Button fullWidth leftIcon={<Plus className="w-4 h-4" />} className="justify-center">
                                New Capture
                            </Button>
                        </div>

                        {navigation.map((item) => {
                            const isActive = location.pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
                    ${isActive
                                            ? 'bg-neon-blue/10 text-neon-blue'
                                            : 'text-starlight-400 hover:text-starlight-100 hover:bg-void-800'
                                        }
                  `}
                                >
                                    <item.icon className={`w-5 h-5 ${isActive ? 'text-neon-blue' : 'text-starlight-500 group-hover:text-starlight-300'}`} />
                                    {item.name}
                                    {isActive && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-neon-blue shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Profile */}
                    <div className="p-4 border-t border-starlight-100/5 bg-void-900/50">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-void-700 to-void-800 border border-starlight-100/10 flex items-center justify-center">
                                <UserCircle className="w-6 h-6 text-starlight-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-starlight-100 truncate">{user?.name || 'User'}</p>
                                <p className="text-xs text-starlight-500 truncate">{user?.email || 'user@example.com'}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button className="flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-medium text-starlight-400 hover:text-starlight-100 hover:bg-void-800 transition-colors">
                                <Settings className="w-4 h-4" />
                                Settings
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 bg-void-950">
                {/* Topbar */}
                <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-starlight-100/5 bg-void-950/80 backdrop-blur-xl sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 -ml-2 text-starlight-400 hover:text-starlight-100"
                        >
                            <Menu className="w-6 h-6" />
                        </button>

                        {/* Breadcrumbs */}
                        <nav className="hidden sm:flex items-center text-sm font-medium text-starlight-500">
                            <span className="hover:text-starlight-300 transition-colors cursor-pointer">NexusBrain</span>
                            <ChevronRight className="w-4 h-4 mx-2 text-starlight-700" />
                            <span className="text-starlight-100">{getPageTitle()}</span>
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Global Search Trigger */}
                        <div className="relative hidden sm:block group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-starlight-500 group-focus-within:text-neon-blue transition-colors" />
                            <input
                                type="text"
                                placeholder="Search anything..."
                                className="w-64 bg-void-900/50 border border-starlight-100/10 rounded-full py-1.5 pl-10 pr-4 text-sm text-starlight-100 placeholder-starlight-600 focus:outline-none focus:border-neon-blue/30 focus:bg-void-900 transition-all"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                <span className="text-[10px] font-mono text-starlight-600 border border-starlight-100/10 rounded px-1.5 py-0.5">⌘K</span>
                            </div>
                        </div>

                        <button className="p-2 text-starlight-400 hover:text-starlight-100 transition-colors relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-neon-pink rounded-full animate-pulse" />
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto animate-fade-in h-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
