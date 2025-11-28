import React, { useState } from 'react';
import {
    ChevronRight,
    ChevronDown,
    Folder,
    FileText,
    BookOpen,
    Hash,
    MoreVertical,
    Search,
    Trash2
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
    selectedItem: VaultItem | null;
    onDelete?: (id: string) => void;
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

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (hasChildren) {
            setIsExpanded(!isExpanded);
        }
        onSelect(item);
    };

    const getIcon = () => {
        switch (item.type) {
            case 'subject': return <Folder className="w-4 h-4 text-neon-blue" />;
            case 'module': return <BookOpen className="w-4 h-4 text-neon-purple" />;
            case 'note': return <FileText className="w-4 h-4 text-starlight-400" />;
            case 'resource': return <Hash className="w-4 h-4 text-neon-green" />;
            default: return <FileText className="w-4 h-4" />;
        }
    };

    return (
        <div>
            <div
                className={`
          flex items-center gap-2 py-2 px-2 cursor-pointer select-none transition-all rounded-lg group
          ${isSelected
                        ? 'bg-neon-blue/10 text-neon-blue border border-neon-blue/20'
                        : 'hover:bg-void-800 text-starlight-400 hover:text-starlight-100 border border-transparent'
                    }
        `}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
                onClick={handleClick}
            >
                <span className="text-starlight-500 flex-shrink-0 w-4 h-4 flex items-center justify-center">
                    {hasChildren && (
                        isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
                    )}
                </span>
                {getIcon()}
                <span className="truncate text-sm font-medium flex-1">{item.title}</span>
            </div>
            {isExpanded && hasChildren && (
                <div className="mt-1">
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

const VaultSidebar: React.FC<VaultSidebarProps> = ({ items, onSelect, selectedItem }) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Filter items based on search (simple implementation for now)
    const filteredItems = items;

    return (
        <div className={`
        h-full w-full bg-void-900 border-r border-starlight-100/10 flex flex-col
      `}>
            {/* Header */}
            <div className="p-4 border-b border-starlight-100/10">
                <div className="flex items-center justify-between">
                    <h2 className="font-bold text-starlight-100 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-neon-purple" />
                        Knowledge Vault
                    </h2>
                </div>

                {/* Search */}
                <div className="mt-4 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-starlight-500" />
                    <input
                        type="text"
                        placeholder="Search files..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-void-950 border border-starlight-100/10 rounded-lg text-sm text-starlight-100 placeholder-starlight-600 focus:outline-none focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/50 transition-all"
                    />
                </div>
            </div>

            {/* Tree */}
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                {filteredItems.length > 0 ? (
                    filteredItems.map((item) => (
                        <VaultTreeItem
                            key={item.id}
                            item={item}
                            level={0}
                            onSelect={(i) => {
                                onSelect(i);
                                // if (window.innerWidth < 768) onClose(); // onClose is not a prop
                            }}
                            selectedId={selectedItem?.id}
                            viewMode="vault"
                        />
                    ))
                ) : (
                    <div className="p-4 text-center text-starlight-500 text-sm">
                        <p>No learning subjects found.</p>
                        <p className="mt-2 text-xs">Start a new study topic to create your first course!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VaultSidebar;
