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
            <div className="mb-8 border-b border-slate-200 pb-8">
                <h1 className="text-4xl font-bold text-slate-900 mb-4">{subject.name}</h1>
                <p className="text-xl text-slate-600 leading-relaxed">{subject.description}</p>

                <div className="flex gap-4 mt-6">
                    <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {subject.current_level || 'Beginner'}
                    </div>
                    {subject.estimated_hours && (
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                            <Clock className="w-4 h-4" />
                            {subject.estimated_hours} hours
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-purple-500" />
                        Modules
                    </h3>
                    <div className="space-y-2">
                        {item.children?.filter(c => c.type === 'module').map(mod => (
                            <div key={mod.id} className="p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-all cursor-pointer">
                                <div className="font-medium text-slate-800">{mod.title}</div>
                                <div className="text-xs text-slate-500 mt-1 line-clamp-1">{mod.data.description}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Tag className="w-5 h-5 text-green-500" />
                        Related Notes
                    </h3>
                    <div className="space-y-2">
                        {item.children?.filter(c => c.type === 'note' || c.type === 'resource').map(note => (
                            <div key={note.id} className="p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-all cursor-pointer">
                                <div className="font-medium text-slate-800">{note.title}</div>
                                <div className="text-xs text-slate-500 mt-1">
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
                <span className="text-sm font-medium text-purple-600 mb-2 block uppercase tracking-wider">Learning Module</span>
                <h1 className="text-3xl font-bold text-slate-900 mb-4">{module.title}</h1>
                <div className="flex items-center gap-4 text-slate-500 text-sm mb-6">
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {module.estimated_time} mins</span>
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Updated {new Date(module.updated_at).toLocaleDateString()}</span>
                </div>
                <p className="text-lg text-slate-700 leading-relaxed border-l-4 border-purple-200 pl-4">
                    {module.description}
                </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-4">What you'll learn</h3>
                <div className="prose prose-slate max-w-none">
                    <ReactMarkdown>{module.content || 'No content preview available.'}</ReactMarkdown>
                </div>
            </div>

            <button
                onClick={onStart}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg"
            >
                <Play className="w-5 h-5" />
                Start Learning Session
            </button>
        </div>
    );
};

const NoteView: React.FC<{ item: VaultItem }> = ({ item }) => {
    const note = item.data;

    return (
        <div className="max-w-4xl mx-auto p-8 min-h-full">
            <div className="mb-6 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                    <FileText className="w-4 h-4" />
                    <span>Last updated: {new Date(note.created_at).toLocaleDateString()}</span>
                </div>
                <h1 className="text-3xl font-bold text-slate-900">{note.title}</h1>
            </div>

            <div className="prose prose-slate max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h2:text-purple-700 prose-h2:mt-8 prose-h2:mb-4 prose-p:text-slate-700 prose-p:leading-relaxed prose-code:text-purple-600 prose-code:bg-purple-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-900 prose-pre:text-slate-50">
                <ReactMarkdown
                    components={{
                        code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                                <div className="rounded-lg overflow-hidden my-4 bg-slate-900 shadow-lg">
                                    <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                                        <span className="text-xs text-slate-400 font-mono">{match[1]}</span>
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
                    {note.content || note.description || 'No content available.'}
                </ReactMarkdown>
            </div>
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
        return <div className="p-8 text-center text-slate-500">Analyzing knowledge base...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-8">
            <div className="mb-8 border-b border-slate-200 pb-8">
                <h1 className="text-4xl font-bold text-slate-900 mb-4">{subject.name}</h1>
                <p className="text-xl text-slate-600 leading-relaxed">{subject.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                    <h3 className="font-bold text-green-800 mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5" /> Strengths
                    </h3>
                    <ul className="space-y-2">
                        {summary?.strengths.map((s: string, i: number) => (
                            <li key={i} className="flex items-center gap-2 text-green-700 text-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                {s}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="bg-red-50 p-6 rounded-xl border border-red-100">
                    <h3 className="font-bold text-red-800 mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" /> Weaknesses
                    </h3>
                    <ul className="space-y-2">
                        {summary?.weaknesses.map((s: string, i: number) => (
                            <li key={i} className="flex items-center gap-2 text-red-700 text-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                {s}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                    <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5" /> Next Steps
                    </h3>
                    <ul className="space-y-2">
                        {summary?.nextMilestones.map((s: string, i: number) => (
                            <li key={i} className="flex items-center gap-2 text-blue-700 text-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                {s}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Modules Section */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-purple-500" />
                        Learning Modules
                    </h3>
                    <div className="space-y-3">
                        {item.children?.filter(c => c.type === 'module').length === 0 ? (
                            <p className="text-slate-400 text-sm italic">No modules available yet.</p>
                        ) : (
                            item.children?.filter(c => c.type === 'module').map(module => (
                                <div
                                    key={module.id}
                                    onClick={() => onSelect?.(module)}
                                    className="p-4 hover:bg-purple-50 rounded-lg border border-slate-100 hover:border-purple-200 transition-all cursor-pointer group"
                                >
                                    <div className="font-medium text-slate-800 group-hover:text-purple-700 transition-colors flex items-center justify-between">
                                        {module.title}
                                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-400" />
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                        <Clock className="w-3 h-3" /> {module.data.estimated_time} mins
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Notes Section */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-slate-500" />
                        Related Notes & Resources
                    </h3>
                    <div className="space-y-3">
                        {item.children?.filter(c => c.type === 'note' || c.type === 'resource').length === 0 ? (
                            <p className="text-slate-400 text-sm italic">No notes or resources found.</p>
                        ) : (
                            item.children?.filter(c => c.type === 'note' || c.type === 'resource').map(note => (
                                <div
                                    key={note.id}
                                    onClick={() => onSelect?.(note)}
                                    className="p-4 hover:bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-200 transition-all cursor-pointer group"
                                >
                                    <div className="font-medium text-slate-800 group-hover:text-blue-600 transition-colors">{note.title}</div>
                                    <div className="text-xs text-slate-500 mt-1">
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
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <BookOpen className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg font-medium">Select a {viewMode === 'study' ? 'course' : 'file'} to view</p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-white">
            {selectedItem.type === 'subject' && viewMode === 'vault' && <KnowledgeDashboard item={selectedItem} onSelect={onSelect} />}
            {selectedItem.type === 'subject' && viewMode === 'study' && <SubjectView item={selectedItem} />}
            {selectedItem.type === 'module' && <ModuleView item={selectedItem} onStart={() => onAction?.('start_module', selectedItem.data)} />}
            {(selectedItem.type === 'note' || selectedItem.type === 'resource') && <NoteView item={selectedItem} />}
        </div>
    );
};

export default VaultContent;
