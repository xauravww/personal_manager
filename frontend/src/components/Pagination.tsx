import React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  maxVisiblePages?: number;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  maxVisiblePages = 5
}) => {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const delta = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, currentPage - delta);
    let end = Math.min(totalPages, start + maxVisiblePages - 1);

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const visiblePages = getVisiblePages();

  return (
    <nav className="flex items-center justify-between px-4 py-2 bg-void-900 border border-starlight-100/10 rounded-xl shadow-lg sm:px-6" aria-label="Pagination">
      <div className="flex justify-between flex-1 sm:hidden">
        {currentPage > 1 && (
          <button
            onClick={() => onPageChange(currentPage - 1)}
            className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-starlight-300 bg-void-950 border border-starlight-100/10 rounded-lg hover:bg-void-800 transition-colors"
          >
            Previous
          </button>
        )}
        {currentPage < totalPages && (
          <button
            onClick={() => onPageChange(currentPage + 1)}
            className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-starlight-300 bg-void-950 border border-starlight-100/10 rounded-lg hover:bg-void-800 transition-colors"
          >
            Next
          </button>
        )}
      </div>

       <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-end">
         <div>
          <nav className="relative z-0 inline-flex rounded-lg shadow-sm -space-x-px" aria-label="Pagination">
            {/* First page */}
            {showFirstLast && currentPage > maxVisiblePages / 2 + 1 && (
              <>
                <button
                  onClick={() => onPageChange(1)}
                  className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-starlight-400 bg-void-950 border border-starlight-100/10 rounded-l-lg hover:bg-void-800 hover:text-starlight-100 transition-colors"
                >
                  <span className="sr-only">First</span>
                  <ChevronLeft className="w-4 h-4" />
                  <ChevronLeft className="w-4 h-4 -ml-2" />
                </button>
                {visiblePages[0] > 2 && (
                  <span className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-starlight-400 bg-void-950 border border-starlight-100/10">
                    <MoreHorizontal className="w-4 h-4" />
                  </span>
                )}
              </>
            )}

            {/* Previous page */}
            {currentPage > 1 && (
              <button
                onClick={() => onPageChange(currentPage - 1)}
                className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-starlight-400 bg-void-950 border border-starlight-100/10 hover:bg-void-800 hover:text-starlight-100 transition-colors"
              >
                <span className="sr-only">Previous</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            {/* Page numbers */}
            {visiblePages.map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`relative inline-flex items-center px-4 py-2 text-sm font-medium border transition-colors ${page === currentPage
                  ? 'z-10 bg-neon-blue/10 border-neon-blue/50 text-neon-blue'
                  : 'bg-void-950 border-starlight-100/10 text-starlight-400 hover:bg-void-800 hover:text-starlight-100'
                  }`}
              >
                {page}
              </button>
            ))}

            {/* Next page */}
            {currentPage < totalPages && (
              <button
                onClick={() => onPageChange(currentPage + 1)}
                className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-starlight-400 bg-void-950 border border-starlight-100/10 hover:bg-void-800 hover:text-starlight-100 transition-colors"
              >
                <span className="sr-only">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {/* Last page */}
            {showFirstLast && currentPage < totalPages - maxVisiblePages / 2 && (
              <>
                {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
                  <span className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-starlight-400 bg-void-950 border border-starlight-100/10">
                    <MoreHorizontal className="w-4 h-4" />
                  </span>
                )}
                <button
                  onClick={() => onPageChange(totalPages)}
                  className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-starlight-400 bg-void-950 border border-starlight-100/10 rounded-r-lg hover:bg-void-800 hover:text-starlight-100 transition-colors"
                >
                  <span className="sr-only">Last</span>
                  <ChevronRight className="w-4 h-4" />
                  <ChevronRight className="w-4 h-4 -ml-2" />
                </button>
              </>
            )}
          </nav>
        </div>
      </div>
    </nav>
  );
};

export default Pagination;