import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, BookOpen, Grid3X3, GraduationCap } from 'lucide-react';
import LayoutComponent from '../components/Layout';
import ResourceGrid from '../components/ResourceGrid';
import Pagination from '../components/Pagination';
import NewResourceModal from '../components/NewResourceModal';
import { useDebounce } from '../hooks/useDebounce';
import { apiClient } from '../api/client';
import { CheckCircle, Clock, ArrowRight } from 'lucide-react';

const Resources: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [isNewResourceModalOpen, setIsNewResourceModalOpen] = useState(false);
  const [totalResources, setTotalResources] = useState(0);
  const [completedModules, setCompletedModules] = useState<any[]>([]);
  const itemsPerPage = 8;

  // Debounce search query to avoid excessive filtering
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Calculate total pages
  const totalPages = useMemo(() => Math.ceil(totalResources / itemsPerPage), [totalResources, itemsPerPage]);

  useEffect(() => {
    const fetchCompletedModules = async () => {
      try {
        const res = await apiClient.getLearningSubjects();
        if (res.success && res.data) {
          const allModules = res.data.flatMap((subject: any) =>
            (subject.modules || []).map((module: any) => ({
              ...module,
              subjectName: subject.name
            }))
          );
          const completed = allModules.filter((m: any) =>
            m.progress && m.progress.length > 0 && m.progress[0].status === 'completed'
          );
          setCompletedModules(completed);
        }
      } catch (error) {
        console.error("Failed to fetch completed modules", error);
      }
    };

    if (typeFilter === 'learning') {
      fetchCompletedModules();
    }
  }, [typeFilter]);

  return (
    <div className="h-full bg-void-950 flex flex-col">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-full flex flex-col">
        {/* Header Section */}
        <div className="flex-none mb-6 bg-gradient-to-r from-void-900 to-void-800 rounded-2xl p-6 border border-starlight-100/10 shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-4 lg:mb-0">
              <div className="flex items-center space-x-4 mb-2">
                <div className="p-2 bg-neon-blue/10 rounded-xl border border-neon-blue/20">
                  <BookOpen className="w-6 h-6 text-neon-blue" strokeWidth={1.5} />
                </div>
                <h1 className="text-3xl font-bold text-starlight-100 tracking-tight font-display">Resources</h1>
              </div>
              <p className="text-starlight-400 text-lg font-medium leading-relaxed">Discover, organize, and manage your knowledge base</p>
            </div>
            <button
              onClick={() => setIsNewResourceModalOpen(true)}
              className="inline-flex items-center px-6 py-3 bg-neon-blue text-white font-semibold text-base rounded-xl hover:bg-neon-blue/90 focus:outline-none focus:ring-2 focus:ring-neon-blue/50 focus:ring-offset-2 transition-all duration-200 shadow-lg shadow-neon-blue/20 transform hover:-translate-y-0.5"
            >
              Add Resource
            </button>
          </div>
        </div>

        {/* Search and Filters Section */}
        <div className="flex-none bg-void-900 rounded-2xl shadow-sm border border-starlight-100/10 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-starlight-500" strokeWidth={1.5} />
                <input
                  type="text"
                  placeholder="Search resources, tags, or content..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-void-950 border border-starlight-100/10 rounded-lg focus:outline-none focus:border-neon-blue/50 text-starlight-100 placeholder-starlight-600 transition-colors duration-200"
                />
                {searchQuery !== debouncedSearchQuery && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-pulse text-sm text-starlight-500">Searching...</div>
                  </div>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-starlight-500" strokeWidth={1.5} />
                <span className="text-sm font-medium text-starlight-400 hidden sm:inline">Filters:</span>
              </div>

              {/* Type Filter */}
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="appearance-none bg-void-950 border border-starlight-100/10 rounded-lg px-4 py-2.5 pr-8 focus:outline-none focus:border-neon-blue/50 text-starlight-200 transition-colors duration-200 cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="note">📝 Notes</option>
                  <option value="document">📄 Documents</option>
                  <option value="link">🔗 Links</option>
                  <option value="video">🎥 Videos</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-4 h-4 text-starlight-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Tag Filter */}
              <div className="relative">
                <select
                  value={tagFilter}
                  onChange={(e) => {
                    setTagFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="appearance-none bg-void-950 border border-starlight-100/10 rounded-lg px-4 py-2.5 pr-8 focus:outline-none focus:border-neon-blue/50 text-starlight-200 transition-colors duration-200 cursor-pointer"
                >
                  <option value="all">All Tags</option>
                  <option value="React">⚛️ React</option>
                  <option value="JavaScript">🟨 JavaScript</option>
                  <option value="TypeScript">🔷 TypeScript</option>
                  <option value="Python">🐍 Python</option>
                  <option value="Database">🗄️ Database</option>
                  <option value="API">🔌 API</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-4 h-4 text-starlight-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Sort Filter */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="appearance-none bg-void-950 border border-starlight-100/10 rounded-lg px-4 py-2.5 pr-8 focus:outline-none focus:border-neon-blue/50 text-starlight-200 transition-colors duration-200 cursor-pointer"
                >
                  <option value="recent">🕒 Recent First</option>
                  <option value="oldest">📅 Oldest First</option>
                  <option value="a-z">🔤 A-Z</option>
                  <option value="z-a">🔡 Z-A</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-4 h-4 text-starlight-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resources Grid */}
        <div className="flex-1 mb-6">
          <>
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-2 bg-void-900 rounded-xl border border-starlight-100/10">
                <Grid3X3 className="w-5 h-5 text-starlight-400" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-bold text-starlight-100 tracking-tight">Your Resources</h2>
            </div>
            <ResourceGrid
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              searchQuery={debouncedSearchQuery}
              typeFilter={typeFilter}
              tagFilter={tagFilter}
              sortBy={sortBy}
              onTotalChange={setTotalResources}
            />
          </>
        </div>

        {/* Pagination */}
        {totalPages > 1 && typeFilter !== 'learning' && (
          <div className="flex-none flex justify-center pb-4 sticky bottom-0 z-20">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* New Resource Modal */}
      <NewResourceModal
        isOpen={isNewResourceModalOpen}
        onClose={() => setIsNewResourceModalOpen(false)}
        onSubmit={(resourceData) => {
          console.log('New resource:', resourceData);
          setIsNewResourceModalOpen(false);
          // Optionally refresh the resource list
        }}
      />
    </div>
  );
};

export default Resources;