import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, TrendingUp, Search, Eye } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import ResourceGrid from '../components/ResourceGrid';
import NewResourceModal from '../components/NewResourceModal';
import { apiClient } from '../api/client';

interface DashboardStats {
  totalResources: number;
  addedThisWeek: number;
  searchesToday: number;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isNewResourceModalOpen, setIsNewResourceModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState<DashboardStats>({
    totalResources: 0,
    addedThisWeek: 0,
    searchesToday: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      // Get total resources count
      const resourcesResponse = await apiClient.getResources({ limit: 1 });
      const totalResources = resourcesResponse.success && resourcesResponse.data
        ? resourcesResponse.data.total
        : 0;

      // For now, we'll use placeholder values for addedThisWeek and searchesToday
      // In a real app, you'd have dedicated endpoints for these metrics
      setStats({
        totalResources,
        addedThisWeek: 0, // Would need a dedicated endpoint
        searchesToday: 0  // Would need a dedicated endpoint
      });
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      setStats({
        totalResources: 0,
        addedThisWeek: 0,
        searchesToday: 0
      });
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
           {/* Welcome Section */}
           <div className="mb-12 bg-gradient-to-r from-primary-50 to-blue-50 rounded-2xl p-8 border border-primary-100">
             <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
               <div className="mb-6 lg:mb-0">
                 <div className="flex items-center space-x-4 mb-3">
                   <div className="p-3 bg-primary-100 rounded-xl">
                     <BookOpen className="w-8 h-8 text-primary-600" strokeWidth={1.5} />
                   </div>
                   <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
                 </div>
                 <p className="text-gray-700 text-xl font-medium leading-relaxed">Welcome back! Here's what's happening with your resources today.</p>
               </div>
               <button
                 onClick={() => setIsNewResourceModalOpen(true)}
                 className="inline-flex items-center px-8 py-4 bg-primary-600 text-white font-semibold text-lg rounded-xl hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
               >
                 Add Resource
               </button>
             </div>
           </div>

           {/* Stats Cards */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
             <div className="group bg-white rounded-2xl shadow-sm border border-gray-200 p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
               <div className="flex items-center">
                 <div className="p-4 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl">
                   <BookOpen className="w-8 h-8 text-blue-600" strokeWidth={1.5} />
                 </div>
                 <div className="ml-6">
                   <p className="text-base font-semibold text-gray-700 mb-2 uppercase tracking-wide">Total Resources</p>
                   <div className="text-4xl font-bold text-gray-900">
                     {statsLoading ? (
                       <div className="animate-pulse bg-gray-200 h-10 w-20 rounded"></div>
                     ) : (
                       stats.totalResources
                     )}
                   </div>
                 </div>
               </div>
             </div>

             <div className="group bg-white rounded-2xl shadow-sm border border-gray-200 p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
               <div className="flex items-center">
                 <div className="p-4 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl">
                   <TrendingUp className="w-8 h-8 text-green-600" strokeWidth={1.5} />
                 </div>
                 <div className="ml-6">
                   <p className="text-base font-semibold text-gray-700 mb-2 uppercase tracking-wide">Added This Week</p>
                   <div className="text-4xl font-bold text-gray-900">
                     {statsLoading ? (
                       <div className="animate-pulse bg-gray-200 h-10 w-20 rounded"></div>
                     ) : (
                       stats.addedThisWeek
                     )}
                   </div>
                 </div>
               </div>
             </div>

             <div className="group bg-white rounded-2xl shadow-sm border border-gray-200 p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
               <div className="flex items-center">
                 <div className="p-4 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl">
                   <Search className="w-8 h-8 text-orange-600" strokeWidth={1.5} />
                 </div>
                 <div className="ml-6">
                   <p className="text-base font-semibold text-gray-700 mb-2 uppercase tracking-wide">Searches Today</p>
                   <div className="text-4xl font-bold text-gray-900">
                     {statsLoading ? (
                       <div className="animate-pulse bg-gray-200 h-10 w-20 rounded"></div>
                     ) : (
                       stats.searchesToday
                     )}
                   </div>
                 </div>
               </div>
             </div>
           </div>

           {/* Recent Resources */}
           <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
             <div className="flex items-center justify-between mb-8">
               <div className="flex items-center space-x-4">
                 <div className="p-3 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl">
                   <Eye className="w-6 h-6 text-gray-600" strokeWidth={1.5} />
                 </div>
                 <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Recent Resources</h2>
               </div>
               <button
                 onClick={() => navigate('/resources')}
                 className="inline-flex items-center px-4 py-2 bg-primary-50 text-primary-700 hover:bg-primary-100 text-sm font-semibold rounded-lg transition-all duration-200 hover:shadow-sm"
               >
                 View all →
               </button>
             </div>
             <ResourceGrid key={refreshKey} currentPage={1} itemsPerPage={6} sortBy="recent" />
           </div>

          {/* New Resource Modal */}
          <NewResourceModal
            isOpen={isNewResourceModalOpen}
            onClose={() => setIsNewResourceModalOpen(false)}
            onSubmit={(resourceData) => {
              console.log('New resource created:', resourceData);
              setIsNewResourceModalOpen(false);
              // Refresh stats and resource grid
              setRefreshKey(prev => prev + 1);
              // Re-fetch stats
              fetchStats();
            }}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;