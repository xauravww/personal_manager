import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, TrendingUp, Search, Eye, Plus, ArrowUpRight, Clock, Zap } from 'lucide-react';
import ResourceGrid from '../components/ResourceGrid';
import NewResourceModal from '../components/NewResourceModal';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

interface DashboardStats {
  totalResources: number;
  addedThisWeek: number;
  searchesToday: number;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
      setStatsLoading(true);
      const response = await apiClient.getDashboardStats();
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        console.error('Failed to fetch dashboard stats:', response.error);
        if (response.error?.includes('401') || response.error?.includes('Unauthorized')) {
          navigate('/login');
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch dashboard stats:', error);
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        navigate('/login');
      }
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-starlight-100 mb-1">
            {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">{user?.name?.split(' ')[0] || 'Explorer'}</span>
          </h1>
          <p className="text-starlight-400">Here's what's happening in your second brain today.</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            leftIcon={<Search className="w-4 h-4" />}
            onClick={() => navigate('/search')}
          >
            Search
          </Button>
          <Button
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsNewResourceModalOpen(true)}
          >
            Add Resource
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card glass className="p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <BookOpen className="w-24 h-24 text-neon-blue" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-neon-blue/20 flex items-center justify-center text-neon-blue">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-starlight-400 uppercase tracking-wider">Total Resources</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-display font-bold text-starlight-100">
                {statsLoading ? '...' : stats.totalResources}
              </span>
              <span className="text-xs text-neon-green flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" /> +12%
              </span>
            </div>
          </div>
        </Card>

        <Card glass className="p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="w-24 h-24 text-neon-purple" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-neon-purple/20 flex items-center justify-center text-neon-purple">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-starlight-400 uppercase tracking-wider">Added This Week</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-display font-bold text-starlight-100">
                {statsLoading ? '...' : stats.addedThisWeek}
              </span>
              <span className="text-xs text-starlight-500">items</span>
            </div>
          </div>
        </Card>

        <Card glass className="p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap className="w-24 h-24 text-neon-yellow" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-neon-yellow/20 flex items-center justify-center text-neon-yellow">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-starlight-400 uppercase tracking-wider">Brain Activity</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-display font-bold text-starlight-100">
                {statsLoading ? '...' : stats.searchesToday}
              </span>
              <span className="text-xs text-starlight-500">searches today</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recent Resources - Takes up 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-starlight-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-neon-blue" />
              Recent Activity
            </h2>
            <button
              onClick={() => navigate('/resources')}
              className="text-sm text-starlight-400 hover:text-neon-blue transition-colors"
            >
              View all
            </button>
          </div>

          <div className="bg-void-900/50 border border-starlight-100/5 rounded-2xl p-6 min-h-[400px]">
            <ResourceGrid key={refreshKey} currentPage={1} itemsPerPage={6} sortBy="recent" />
          </div>
        </div>

        {/* Sidebar Widgets - Takes up 1 column */}
        <div className="space-y-6">
          {/* AI Insight Widget */}
          <Card glass className="p-6 border-neon-purple/20 bg-gradient-to-br from-void-900 to-neon-purple/5">
            <div className="flex items-center gap-2 mb-4 text-neon-purple">
              <Zap className="w-5 h-5" />
              <span className="font-bold text-sm uppercase tracking-wider">Daily Insight</span>
            </div>
            <p className="text-starlight-200 italic leading-relaxed mb-4">
              "You've been focusing a lot on React patterns lately. Consider reviewing the 'Advanced Hooks' module to solidify your knowledge."
            </p>
            <Button variant="outline" size="sm" fullWidth className="border-neon-purple/30 text-neon-purple hover:bg-neon-purple/10">
              View Recommendation
            </Button>
          </Card>

          {/* Quick Actions */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-starlight-400 uppercase tracking-wider">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button className="p-4 rounded-xl bg-void-900 border border-starlight-100/5 hover:border-neon-blue/30 hover:bg-void-800 transition-all text-left group">
                <div className="w-8 h-8 rounded-lg bg-neon-blue/10 flex items-center justify-center text-neon-blue mb-3 group-hover:scale-110 transition-transform">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-starlight-200">New Note</span>
              </button>
              <button className="p-4 rounded-xl bg-void-900 border border-starlight-100/5 hover:border-neon-green/30 hover:bg-void-800 transition-all text-left group">
                <div className="w-8 h-8 rounded-lg bg-neon-green/10 flex items-center justify-center text-neon-green mb-3 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-starlight-200">Capture URL</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <NewResourceModal
        isOpen={isNewResourceModalOpen}
        onClose={() => setIsNewResourceModalOpen(false)}
        onSubmit={(resourceData) => {
          console.log('New resource created:', resourceData);
          setIsNewResourceModalOpen(false);
          setRefreshKey(prev => prev + 1);
          fetchStats();
        }}
      />
    </div>
  );
};

export default Dashboard;