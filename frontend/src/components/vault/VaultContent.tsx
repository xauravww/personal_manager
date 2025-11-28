import React from 'react';
import ReactMarkdown from 'react-markdown';
import { VaultItem } from './VaultSidebar';
import { Clock, BookOpen, Tag, Calendar, ArrowRight, Play, Sparkles, AlertTriangle, Target, FileText, ChevronRight } from 'lucide-react';

interface VaultContentProps {
    selectedItem: VaultItem | null;
    onAction?: (action: string, data?: any) => void;
    onSelect?: (item: VaultItem) => void;
}

const SubjectView: React.FC<{ item: VaultItem }> = ({ item }) => {
    const subject = item.data;
    return (
        <div className="max-w-4xl mx-auto p-8">
            <div className="mb-8 border-b border-starlight-100/10 pb-8">
                <h1 className="text-4xl font-bold text-starlight-100 mb-4 font-display">{subject.name}</h1>
                <p className="text-xl text-starlight-400 leading-relaxed">{subject.description}</p>

                <div className="flex gap-4 mt-6">
                    <div className="px-3 py-1 bg-neon-blue/10 text-neon-blue rounded-full text-sm font-medium border border-neon-blue/20">
                        {subject.current_level || 'Beginner'}
                    </div>
                    {subject.estimated_hours && (
                        <div className="flex items-center gap-2 text-starlight-500 text-sm">
                            <Clock className="w-4 h-4" />
                            {subject.estimated_hours} hours
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-void-900 p-6 rounded-xl border border-starlight-100/10 shadow-sm">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-starlight-100">
                        <BookOpen className="w-5 h-5 text-neon-purple" />
                        Modules
                    </h3>
                    <div className="space-y-2">
                        {item.children?.filter(c => c.type === 'module').map(mod => (
                            <div key={mod.id} className="p-3 hover:bg-void-800 rounded-lg border border-transparent hover:border-starlight-100/10 transition-all cursor-pointer">
                                <div className="font-medium text-starlight-200">{mod.title}</div>
                                <div className="text-xs text-starlight-500 mt-1 line-clamp-1">{mod.data.description}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-void-900 p-6 rounded-xl border border-starlight-100/10 shadow-sm">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-starlight-100">
                        <Tag className="w-5 h-5 text-neon-green" />
                        Related Notes
                    </h3>
                    <div className="space-y-2">
                        {item.children?.filter(c => c.type === 'note' || c.type === 'resource').map(note => (
                            <div key={note.id} className="p-3 hover:bg-void-800 rounded-lg border border-transparent hover:border-starlight-100/10 transition-all cursor-pointer">
                                <div className="font-medium text-starlight-200">{note.title}</div>
                                <div className="text-xs text-starlight-500 mt-1">
                                    {new Date(note.data.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ModuleView: React.FC<{ item: VaultItem; onStart: () => void }> = ({ item, onStart }) => {
    const module = item.data;
    return (
        <div className="max-w-3xl mx-auto p-8">
            <div className="mb-8">
                <span className="text-sm font-medium text-neon-purple mb-2 block uppercase tracking-wider">Learning Module</span>
                <h1 className="text-3xl font-bold text-starlight-100 mb-4 font-display">{module.title}</h1>
                <div className="flex items-center gap-4 text-starlight-500 text-sm mb-6">
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {module.estimated_time} mins</span>
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Updated {new Date(module.updated_at).toLocaleDateString()}</span>
                </div>
                <p className="text-lg text-starlight-300 leading-relaxed border-l-4 border-neon-purple/50 pl-4">
                    {module.description}
                </p>
            </div>

            <div className="bg-void-900 rounded-xl p-6 mb-8 border border-starlight-100/10">
                <h3 className="font-bold text-starlight-100 mb-4">What you'll learn</h3>
                <div className="prose prose-invert max-w-none prose-p:text-starlight-300 prose-headings:text-starlight-100">
                    <ReactMarkdown>{module.content || 'No content preview available.'}</ReactMarkdown>
                </div>
            </div>

            <button
                onClick={onStart}
                className="w-full py-4 bg-neon-blue text-white rounded-xl font-bold hover:bg-neon-blue/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-neon-blue/20"
            >
                <Play className="w-5 h-5" />
                Start Learning Session
            </button>
        </div>
    );
};

const NoteView: React.FC<{ item: VaultItem; onUpdate?: (id: string, content: string) => void }> = ({ item, onUpdate }) => {
    const note = item.data;
    const [isEditing, setIsEditing] = React.useState(false);
    const [content, setContent] = React.useState(note.content || note.description || '');
    const [isSaving, setIsSaving] = React.useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (onUpdate) {
                await onUpdate(item.id, content);
            }
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to save note", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-8 min-h-full">
            <div className="mb-6 border-b border-starlight-100/10 pb-4 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 text-sm text-starlight-500 mb-2">
                        <FileText className="w-4 h-4" />
                        <span>Last updated: {new Date(note.updated_at || note.created_at).toLocaleDateString()}</span>
                    </div>
                    <h1 className="text-3xl font-bold text-starlight-100 font-display">{note.title}</h1>
                </div>
                <button
                    onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                    disabled={isSaving}
                    className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${isEditing
                        ? 'bg-neon-green text-white hover:bg-neon-green/90'
                        : 'bg-void-800 text-starlight-300 hover:text-starlight-100 hover:bg-void-700'
                        }`}
                >
                    {isSaving ? (
                        <span className="animate-pulse">Saving...</span>
                    ) : isEditing ? (
                        <>Save Changes</>
                    ) : (
                        <>Edit Note</>
                    )}
                </button>
            </div>

            {isEditing ? (
                <div className="bg-void-900 rounded-xl border border-starlight-100/10 p-4 h-[calc(100vh-300px)]">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full h-full bg-transparent text-starlight-200 font-mono text-sm focus:outline-none resize-none"
                        placeholder="Start writing your note..."
                    />
                </div>
            ) : (
                <div className="prose prose-invert max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h2:text-neon-purple prose-h2:mt-8 prose-h2:mb-4 prose-p:text-starlight-300 prose-p:leading-relaxed prose-code:text-neon-purple prose-code:bg-neon-purple/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-void-950 prose-pre:border prose-pre:border-starlight-100/10">
                    <ReactMarkdown
                        components={{
                            code({ node, inline, className, children, ...props }: any) {
                                const match = /language-(\w+)/.exec(className || '');
                                return !inline && match ? (
                                    <div className="rounded-lg overflow-hidden my-4 bg-void-950 shadow-lg border border-starlight-100/10">
                                        <div className="flex items-center justify-between px-4 py-2 bg-void-900 border-b border-starlight-100/10">
                                            <span className="text-xs text-starlight-400 font-mono">{match[1]}</span>
                                        </div>
                                        <div className="p-4 overflow-x-auto">
                                            <code className={className} {...props}>
                                                {children}
                                            </code>
                                        </div>
                                    </div>
                                ) : (
                                    <code className={className} {...props}>
                                        {children}
                                    </code>
                                );
                            }
                        }}
                    >
                        {content}
                    </ReactMarkdown>
                </div>
            )}
        </div>
    );
};

const KnowledgeDashboard: React.FC<{ item: VaultItem; onSelect?: (item: VaultItem) => void }> = ({ item, onSelect }) => {
    const subject = item.data;
    const [summary, setSummary] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        const fetchSummary = async () => {
            setLoading(true);
            try {
                // In a real app, we'd fetch this from the API
                // const res = await apiClient.getKnowledgeSummary(subject.id);
                // setSummary(res.data);

                // Mock data for now as the endpoint might not be fully populated
                setTimeout(() => {
                    setSummary({
                        strengths: ['Async Programming', 'Type System', 'Components'],
                        weaknesses: ['Error Handling', 'Testing'],
                        confidence: 78,
                        nextMilestones: ['Master Generics', 'Build a Full Stack App']
                    });
                    setLoading(false);
                }, 500);
            } catch (e) {
                setLoading(false);
            }
        };
        fetchSummary();
    }, [subject.id]);

    if (loading) {
        return <div className="p-8 text-center text-starlight-500">Analyzing knowledge base...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-8">
            <div className="mb-8 border-b border-starlight-100/10 pb-8">
                <h1 className="text-4xl font-bold text-starlight-100 mb-4 font-display">{subject.name}</h1>
                <p className="text-xl text-starlight-400 leading-relaxed">{subject.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-neon-green/5 p-6 rounded-xl border border-neon-green/20">
                    <h3 className="font-bold text-neon-green mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5" /> Strengths
                    </h3>
                    <ul className="space-y-2">
                        {summary?.strengths.map((s: string, i: number) => (
                            <li key={i} className="flex items-center gap-2 text-starlight-300 text-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-neon-green"></div>
                                {s}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="bg-red-500/5 p-6 rounded-xl border border-red-500/20">
                    <h3 className="font-bold text-red-400 mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" /> Weaknesses
                    </h3>
                    <ul className="space-y-2">
                        {summary?.weaknesses.map((s: string, i: number) => (
                            <li key={i} className="flex items-center gap-2 text-starlight-300 text-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                                {s}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="bg-neon-blue/5 p-6 rounded-xl border border-neon-blue/20">
                    <h3 className="font-bold text-neon-blue mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5" /> Next Steps
                    </h3>
                    <ul className="space-y-2">
                        {summary?.nextMilestones.map((s: string, i: number) => (
                            <li key={i} className="flex items-center gap-2 text-starlight-300 text-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-neon-blue"></div>
                                {s}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Modules Section */}
                <div className="bg-void-900 p-6 rounded-xl border border-starlight-100/10 shadow-sm">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-starlight-100">
                        <BookOpen className="w-5 h-5 text-neon-purple" />
                        Learning Modules
                    </h3>
                    <div className="space-y-3">
                        {item.children?.filter(c => c.type === 'module').length === 0 ? (
                            <p className="text-starlight-500 text-sm italic">No modules available yet.</p>
                        ) : (
                            item.children?.filter(c => c.type === 'module').map(module => (
                                <div
                                    key={module.id}
                                    onClick={() => onSelect?.(module)}
                                    className="p-4 hover:bg-neon-purple/5 rounded-lg border border-starlight-100/5 hover:border-neon-purple/20 transition-all cursor-pointer group"
                                >
                                    <div className="font-medium text-starlight-200 group-hover:text-neon-purple transition-colors flex items-center justify-between">
                                        {module.title}
                                        <ChevronRight className="w-4 h-4 text-starlight-600 group-hover:text-neon-purple" />
                                    </div>
                                    <div className="text-xs text-starlight-500 mt-1 flex items-center gap-2">
                                        <Clock className="w-3 h-3" /> {module.data.estimated_time} mins
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Notes Section */}
                <div className="bg-void-900 p-6 rounded-xl border border-starlight-100/10 shadow-sm">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-starlight-100">
                        <FileText className="w-5 h-5 text-starlight-500" />
                        Related Notes & Resources
                    </h3>
                    <div className="space-y-3">
                        {item.children?.filter(c => c.type === 'note' || c.type === 'resource').length === 0 ? (
                            <p className="text-starlight-500 text-sm italic">No notes or resources found.</p>
                        ) : (
                            item.children?.filter(c => c.type === 'note' || c.type === 'resource').map(note => (
                                <div
                                    key={note.id}
                                    onClick={() => onSelect?.(note)}
                                    className="p-4 hover:bg-void-800 rounded-lg border border-starlight-100/5 hover:border-starlight-100/10 transition-all cursor-pointer group"
                                >
                                    <div className="font-medium text-starlight-200 group-hover:text-neon-blue transition-colors">{note.title}</div>
                                    <div className="text-xs text-starlight-500 mt-1">
                                        {new Date(note.data.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const VaultContent: React.FC<VaultContentProps & { viewMode: 'study' | 'vault' }> = ({ selectedItem, onAction, viewMode, onSelect }) => {
    if (!selectedItem) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-starlight-500">
                <BookOpen className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg font-medium">Select a {viewMode === 'study' ? 'course' : 'file'} to view</p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-void-950">
            {selectedItem.type === 'subject' && viewMode === 'vault' && <KnowledgeDashboard item={selectedItem} onSelect={onSelect} />}
            {selectedItem.type === 'subject' && viewMode === 'study' && <SubjectView item={selectedItem} />}
            {selectedItem.type === 'module' && <ModuleView item={selectedItem} onStart={() => onAction?.('start_module', selectedItem.data)} />}
            {(selectedItem.type === 'note' || selectedItem.type === 'resource') && <NoteView item={selectedItem} onUpdate={(id, content) => onAction?.('update_note', { id, content })} />}
        </div>
    );
};

export default VaultContent;
