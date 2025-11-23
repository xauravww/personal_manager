import React from 'react';
import Navbar from '../Navbar';
import BottomNavigation from '../BottomNavigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navbar - Hidden on mobile for main nav, but we might want to keep it for Logo/Profile? 
          The user said "removed some feature but ideally u should show them".
          Let's keep the Navbar but maybe simplify it for mobile or rely on BottomNav for navigation.
          The Navbar component itself handles responsive hiding of links.
      */}
      <Navbar showNavigation={true} />

      {/* Main content area */}
      <main className="flex-1 bg-gray-50 mb-16 md:mb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <BottomNavigation />
    </div>
  );
};

export default DashboardLayout;