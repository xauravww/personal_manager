import React, { useState } from 'react';
import {
    ChevronRight,
    ChevronDown,
    Folder,
    FileText,
    BookOpen,
    Hash,
    MoreVertical,
    Search
} from 'lucide-react';

// Types for the tree structure
export interface VaultItem {
    id: string;
    title: string;
    type: 'subject' | 'module' | 'note' | 'resource';
    children?: VaultItem[];
    data?: any; // Original data object
}

interface VaultSidebarProps {
    items: VaultItem[];
    onSelect: (item: VaultItem) => void;
    selectedId?: string;
    isOpen: boolean;
    onClose: () => void;
    viewMode: 'study' | 'vault';
    onViewModeChange: (mode: 'study' | 'vault') => void;
}

const VaultTreeItem: React.FC<{
    item: VaultItem;
    level: number;
    onSelect: (item: VaultItem) => void;
    selectedId?: string;
    viewMode?: 'study' | 'vault';
}> = ({ item, level, onSelect, selectedId, viewMode }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Filter children based on viewMode
    const visibleChildren = item.children?.filter(child => {
        if (viewMode === 'vault') {
            // In vault mode, show everything (Subjects, Modules, Notes)
            return true;
        }
        return true;
    });

    const hasChildren = visibleChildren && visibleChildren.length > 0;
    const isSelected = item.id === selectedId;

    // In vault mode, we show everything now
    if (viewMode === 'vault' && (item.type === 'note' || item.type === 'resource')) {
        // return null; // Don't hide anymore
    }

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (hasChildren) {
            setIsExpanded(!isExpanded);
        }
        onSelect(item);
    };

    const getIcon = () => {
        switch (item.type) {
            case 'subject': return <Folder className="w-4 h-4 text-blue-500" />;
            case 'module': return <BookOpen className="w-4 h-4 text-purple-500" />;
            case 'note': return <FileText className="w-4 h-4 text-slate-500" />;
            case 'resource': return <Hash className="w-4 h-4 text-green-500" />;
            default: return <FileText className="w-4 h-4" />;
        }
    };

    return (
        <div>
            <div
                className={`
          flex items-center gap-2 py-1.5 px-2 cursor-pointer select-none transition-colors rounded-md
          ${isSelected ? 'bg-blue-100 text-blue-900' : 'hover:bg-slate-100 text-slate-700'}
        `}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
                onClick={handleClick}
            >
                <span className="text-slate-400 flex-shrink-0 w-4 h-4 flex items-center justify-center">
                    {hasChildren && (
                        isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
                    )}
                </span>
                {getIcon()}
                <span className="truncate text-sm font-medium">{item.title}</span>
            </div>
            {isExpanded && hasChildren && (
                <div>
                    {visibleChildren!.map((child) => (
                        <VaultTreeItem
                            key={child.id}
                            item={child}
                            level={level + 1}
                            onSelect={onSelect}
                            selectedId={selectedId}
                            viewMode={viewMode}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const VaultSidebar: React.FC<VaultSidebarProps> = ({ items, onSelect, selectedId, isOpen, onClose, viewMode, onViewModeChange }) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Filter items based on search (simple implementation for now)
    // A real recursive filter would be better but let's start simple
    const filteredItems = items;

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={onClose}
                />
            )}

            <div className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-slate-50 border-r border-slate-200 flex flex-col transition-transform duration-300
        md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
                {/* Header */}
                <div className="p-4 border-b border-slate-200">
                    {/* Mode Toggle */}
                    <div className="flex bg-slate-200 p-1 rounded-lg mb-4">
                        <button
                            onClick={() => onViewModeChange('study')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'study'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Study Mode
                        </button>
                        <button
                            onClick={() => onViewModeChange('vault')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'vault'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Vault Mode
                        </button>
                    </div>

                    <div className="flex items-center justify-between">
                        <h2 className="font-bold text-slate-800 flex items-center gap-2">
                            {viewMode === 'study' ? (
                                <BookOpen className="w-5 h-5 text-purple-600" />
                            ) : (
                                <Folder className="w-5 h-5 text-blue-600" />
                            )}
                            {viewMode === 'study' ? 'My Courses' : 'Knowledge Base'}
                        </h2>
                        <button className="p-1 hover:bg-slate-200 rounded text-slate-500">
                            <MoreVertical className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="p-3">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search files..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Tree */}
                <div className="flex-1 overflow-y-auto p-2">
                    {filteredItems.map((item) => (
                        <VaultTreeItem
                            key={item.id}
                            item={item}
                            level={0}
                            onSelect={(i) => {
                                onSelect(i);
                                if (window.innerWidth < 768) onClose();
                            }}
                            selectedId={selectedId}
                            viewMode={viewMode}
                        />
                    ))}
                </div>
            </div>
        </>
    );
};

export default VaultSidebar;
