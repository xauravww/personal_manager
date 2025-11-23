import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, FolderOpen, Search, GraduationCap, User } from 'lucide-react';

const BottomNavigation: React.FC = () => {
    const location = useLocation();

    const navigation = [
        { name: 'Home', href: '/dashboard', icon: Home },
        { name: 'Search', href: '/search', icon: Search },
        { name: 'Resources', href: '/resources', icon: FolderOpen },
        { name: 'Learning', href: '/learning', icon: GraduationCap },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-50">
            <div className="flex justify-around items-center h-16">
                {navigation.map((item) => {
                    const isActive = location.pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            <item.icon
                                className={`w-6 h-6 ${isActive ? 'stroke-2' : 'stroke-1.5'}`}
                            />
                            <span className="text-[10px] font-medium">{item.name}</span>
                        </Link>
                    );
                })}
                {/* Profile Link - distinct from others if needed, or just part of the list */}
                {/* For now, let's keep it simple. Profile is usually top right, but on mobile maybe a tab? 
            Let's stick to the main 4 for now as per plan. 
        */}
            </div>
        </div>
    );
};

export default BottomNavigation;
