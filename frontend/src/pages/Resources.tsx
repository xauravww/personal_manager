import React, { useState, useMemo } from 'react';
import { Search, Filter, BookOpen } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import ResourceGrid from '../components/ResourceGrid';
import Pagination from '../components/Pagination';
import NewResourceModal from '../components/NewResourceModal';
import { useDebounce } from '../hooks/useDebounce';

const Resources: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [isNewResourceModalOpen, setIsNewResourceModalOpen] = useState(false);
  const [totalResources, setTotalResources] = useState(0);
  const itemsPerPage = 12;

  // Debounce search query to avoid excessive filtering
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Calculate total pages
  const totalPages = useMemo(() => Math.ceil(totalResources / itemsPerPage), [totalResources, itemsPerPage]);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-4 sm:mb-0">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <BookOpen className="w-6 h-6 text-primary-600" strokeWidth={1.5} />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Resources</h1>
                </div>
                <p className="text-gray-600 text-lg">Discover, organize, and manage your knowledge base</p>
              </div>
               <button
                 onClick={() => setIsNewResourceModalOpen(true)}
                 className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md"
               >
                 Add Resource
               </button>
            </div>
          </div>

          {/* Search and Filters Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Search Input */}
              <div className="flex-1 relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" strokeWidth={1.5} />
                  <input
                    type="text"
                    placeholder="Search resources, tags, or content..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 bg-gray-50 focus:bg-white"
                  />
                  {searchQuery !== debouncedSearchQuery && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-pulse text-sm text-gray-500">Searching...</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 lg:gap-6">
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-500" strokeWidth={1.5} />
                  <span className="text-sm font-medium text-gray-700 hidden sm:inline">Filters:</span>
                </div>

                {/* Type Filter */}
                <div className="relative">
                  <select
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-3 pr-8 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 cursor-pointer"
                  >
                    <option value="all">All Types</option>
                    <option value="note">📝 Notes</option>
                    <option value="document">📄 Documents</option>
                    <option value="link">🔗 Links</option>
                    <option value="image">🖼️ Images</option>
                    <option value="video">🎥 Videos</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-3 pr-8 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 cursor-pointer"
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
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-3 pr-8 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 cursor-pointer"
                  >
                    <option value="recent">🕒 Recent First</option>
                    <option value="oldest">📅 Oldest First</option>
                    <option value="a-z">🔤 A-Z</option>
                    <option value="z-a">🔡 Z-A</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Resources Grid */}
          <div className="mb-8">
            <ResourceGrid
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              searchQuery={debouncedSearchQuery}
              typeFilter={typeFilter}
              tagFilter={tagFilter}
              sortBy={sortBy}
              onTotalChange={setTotalResources}
            />
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center">
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
    </DashboardLayout>
  );
};

export default Resources;