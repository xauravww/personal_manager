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
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-4 sm:mb-0">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <BookOpen className="w-6 h-6 text-primary-600" strokeWidth={1.5} />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
                </div>
                <p className="text-gray-600 text-lg">Welcome back! Here's what's happening with your resources today.</p>
              </div>
              <button
                onClick={() => setIsNewResourceModalOpen(true)}
                className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                Add Resource
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl">
                  <BookOpen className="w-6 h-6 text-blue-600" strokeWidth={1.5} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Resources</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {statsLoading ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                    ) : (
                      stats.totalResources
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-green-600" strokeWidth={1.5} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 mb-1">Added This Week</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {statsLoading ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                    ) : (
                      stats.addedThisWeek
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl">
                  <Search className="w-6 h-6 text-orange-600" strokeWidth={1.5} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 mb-1">Searches Today</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {statsLoading ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                    ) : (
                      stats.searchesToday
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Resources */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Eye className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Recent Resources</h2>
              </div>
              <button
                onClick={() => navigate('/resources')}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium transition-colors duration-200"
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