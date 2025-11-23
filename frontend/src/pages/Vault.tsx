import React, { useState, useEffect } from 'react';
import { Menu, Sparkles, PanelLeft } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import VaultSidebar, { VaultItem } from '../components/vault/VaultSidebar';
import VaultContent from '../components/vault/VaultContent';
import VaultChat from '../components/vault/VaultChat';
import { apiClient } from '../api/client';

const Vault: React.FC = () => {
    const [items, setItems] = useState<VaultItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                // Fetch Subjects
                const subjectsRes = await apiClient.getLearningSubjects();

                // Fetch Resources (Notes/Links)
                const resourcesRes = await apiClient.getResources({ limit: 1000 });

                if (subjectsRes.success && subjectsRes.data) {
                    const subjects = subjectsRes.data;
                    const resources = resourcesRes.data?.resources || [];

                    // Build Tree Structure
                    const tree: VaultItem[] = await Promise.all(subjects.map(async (subject: any) => {
                        // Fetch modules for this subject
                        const modulesRes = await apiClient.getLearningModules(subject.id);
                        const modules = modulesRes.data?.modules || [];

                        // Filter resources that have tags matching the subject name
                        // This is a simple heuristic for "folders". 
                        // Ideally, we'd have a proper folder ID in the resource, but tags work for now.
                        const subjectResources = resources.filter(r =>
                            r.tags.some(t => t.name.toLowerCase() === subject.name.toLowerCase())
                        );

                        const children: VaultItem[] = [
                            ...modules.map((m: any) => ({
                                id: m.id,
                                title: m.title,
                                type: 'module' as const,
                                data: m
                            })),
                            ...subjectResources.map(r => ({
                                id: r.id,
                                title: r.title,
                                type: r.type === 'link' ? 'resource' as const : 'note' as const,
                                data: r
                            }))
                        ];

                        return {
                            id: subject.id,
                            title: subject.name,
                            type: 'subject' as const,
                            children,
                            data: subject
                        };
                    }));

                    setItems(tree);
                }
            } catch (error) {
                console.error("Failed to fetch vault data", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    // Mobile responsive check
    useEffect(() => {
        if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }
    }, []);

    const handleAction = (action: string, data?: any) => {
        if (action === 'start_module') {
            // Navigate to learning mode
            // For now, we can just redirect or show a modal. 
            // Since Learning page handles modules, maybe we redirect there?
            // Or we can implement an inline player.
            // Let's redirect for simplicity and consistency.
            window.location.href = '/learning'; // In a real app, pass module ID via URL or state
        }
    };

    return (
        <DashboardLayout>
            <div className="flex h-[calc(100vh-64px)] md:h-[calc(100vh-100px)] bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 relative">

                {/* Sidebar */}
                <VaultSidebar
                    items={items}
                    onSelect={setSelectedItem}
                    selectedId={selectedItem?.id}
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                />

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-white relative">
                    {/* Toolbar */}
                    <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4 bg-white">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                            >
                                <PanelLeft className="w-5 h-5" />
                            </button>
                            <div className="text-sm text-slate-500 breadcrumbs">
                                {selectedItem ? (
                                    <span className="flex items-center gap-2">
                                        <span className="font-medium text-slate-800">{selectedItem.title}</span>
                                    </span>
                                ) : (
                                    <span>Select a file</span>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => setIsChatOpen(!isChatOpen)}
                            className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${isChatOpen ? 'bg-purple-100 text-purple-700' : 'hover:bg-slate-100 text-slate-600'
                                }`}
                        >
                            <Sparkles className="w-4 h-4" />
                            <span className="hidden md:inline">AI Assistant</span>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden relative">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                            </div>
                        ) : (
                            <VaultContent selectedItem={selectedItem} onAction={handleAction} />
                        )}
                    </div>
                </div>

                {/* Chat Sidebar (Right) */}
                <VaultChat
                    contextItem={selectedItem}
                    isOpen={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                />

            </div>
        </DashboardLayout>
    );
};

export default Vault;
