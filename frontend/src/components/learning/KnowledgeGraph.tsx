import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    MarkerType,
    Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { apiClient } from '../../api/client';
import { Brain, RefreshCw, Plus, Filter } from 'lucide-react';

// Custom Node Types could be defined here
const nodeTypes = {};

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 172;
const nodeHeight = 36;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({ rankdir: direction });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = isHorizontal ? 'left' : 'top';
        node.sourcePosition = isHorizontal ? 'right' : 'bottom';

        // We are shifting the dagre node position (anchor=center center) to the top left
        // so it matches the React Flow node anchor point (top left).
        node.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
        };

        return node;
    });

    return { nodes, edges };
};

const KnowledgeGraph = ({ onNodeClick, onNavigate }: { onNodeClick?: (node: Node) => void, onNavigate?: (node: Node) => void }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);

    const fetchGraph = useCallback(async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/knowledge-graph/graph');
            const { nodes: fetchedNodes, edges: fetchedEdges } = response.data;

            // Apply layout
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
                fetchedNodes,
                fetchedEdges
            );

            setNodes(layoutedNodes);
            setEdges(layoutedEdges);
        } catch (error) {
            console.error('Failed to fetch knowledge graph:', error);
        } finally {
            setLoading(false);
        }
    }, [setNodes, setEdges]);

    useEffect(() => {
        fetchGraph();
    }, [fetchGraph]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    const handleGenerateConnections = async () => {
        setGenerating(true);
        try {
            await apiClient.post('/knowledge-graph/generate', {});
            await fetchGraph();
        } catch (error) {
            console.error('Failed to generate connections:', error);
        } finally {
            setGenerating(false);
        }
    };

    const getNodeColor = (type: string) => {
        switch (type) {
            case 'subject': return '#3b82f6'; // blue
            case 'module': return '#8b5cf6'; // purple
            case 'resource': return '#10b981'; // green
            default: return '#64748b'; // slate
        }
    };

    // Filter and style nodes based on search and highlight
    const getStyledNodes = useCallback(() => {
        return nodes.map(node => {
            const isHidden = searchQuery && !node.data.label.toLowerCase().includes(searchQuery.toLowerCase());
            const isHighlighted = highlightedNodeId === node.id;
            const isConnected = highlightedNodeId && edges.some(e =>
                (e.source === highlightedNodeId && e.target === node.id) ||
                (e.target === highlightedNodeId && e.source === node.id)
            );
            const isDimmed = (highlightedNodeId && !isHighlighted && !isConnected) || (searchQuery && isHidden);

            return {
                ...node,
                style: {
                    background: '#1e293b',
                    color: '#f8fafc',
                    border: `1px solid ${getNodeColor(node.type)}`,
                    borderRadius: '8px',
                    padding: '10px',
                    fontSize: '12px',
                    width: nodeWidth,
                    opacity: isDimmed ? 0.2 : 1,
                    boxShadow: isHighlighted ? `0 0 15px ${getNodeColor(node.type)}` : 'none',
                    transition: 'all 0.3s ease'
                }
            };
        });
    }, [nodes, edges, searchQuery, highlightedNodeId]);

    const getStyledEdges = useCallback(() => {
        return edges.map(edge => {
            const isConnectedToHighlight = highlightedNodeId && (edge.source === highlightedNodeId || edge.target === highlightedNodeId);
            return {
                ...edge,
                style: {
                    stroke: isConnectedToHighlight ? '#f8fafc' : '#475569',
                    strokeWidth: isConnectedToHighlight ? 2 : 1,
                    opacity: highlightedNodeId && !isConnectedToHighlight ? 0.1 : 1
                },
                animated: isConnectedToHighlight || edge.data?.strength > 0.8
            };
        });
    }, [edges, highlightedNodeId]);

    return (
        <div className={`${isFullScreen ? 'fixed inset-0 z-50 bg-void-950' : 'h-[600px] w-full bg-void-950 rounded-xl border border-starlight-100/10 relative'} overflow-hidden transition-all duration-300`}>
            {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-void-950/80 backdrop-blur-sm">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon-blue"></div>
                </div>
            )}

            <ReactFlow
                nodes={getStyledNodes()}
                edges={getStyledEdges()}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={(_, node) => {
                    setSelectedNode(node);
                    if (onNodeClick) onNodeClick(node);
                }}
                fitView
                attributionPosition="bottom-right"
            >
                <Controls className="bg-void-900 border-starlight-100/10 fill-starlight-100 text-starlight-100" />
                <MiniMap
                    nodeColor={(node) => getNodeColor(node.type || '')}
                    maskColor="rgba(15, 23, 42, 0.8)"
                    className="bg-void-900 border border-starlight-100/10 rounded-lg"
                />
                <Background color="#334155" gap={16} />

                <Panel position="top-right" className="flex gap-2 items-center">
                    <div className="relative mr-2">
                        <input
                            type="text"
                            placeholder="Search nodes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-void-900 border border-starlight-100/20 rounded-lg pl-8 pr-3 py-2 text-sm text-starlight-100 focus:outline-none focus:border-neon-blue/50 w-48 shadow-lg"
                        />
                        <Filter className="w-4 h-4 text-starlight-400 absolute left-2.5 top-2.5" />
                    </div>

                    <button
                        onClick={() => setIsFullScreen(!isFullScreen)}
                        className="p-2 bg-void-900 border border-starlight-100/20 rounded-lg text-starlight-100 hover:bg-void-800 hover:border-neon-blue/50 transition-all shadow-lg"
                        title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                    >
                        {isFullScreen ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3" /><path d="M21 8h-3a2 2 0 0 1-2-2V3" /><path d="M3 16h3a2 2 0 0 1 2 2v3" /><path d="M16 21v-3a2 2 0 0 1 2-2h3" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" /></svg>
                        )}
                    </button>
                    <button
                        onClick={fetchGraph}
                        className="p-2 bg-void-900 border border-starlight-100/20 rounded-lg text-starlight-100 hover:bg-void-800 hover:border-neon-blue/50 transition-all shadow-lg"
                        title="Refresh Graph"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleGenerateConnections}
                        disabled={generating}
                        className="p-2 bg-neon-blue text-white rounded-lg hover:bg-neon-blue/90 transition-colors flex items-center gap-2 shadow-lg shadow-neon-blue/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Generate AI Connections"
                    >
                        <Brain className="w-5 h-5" />
                        <span className="text-sm font-bold hidden md:inline">
                            {generating ? 'Connecting...' : 'AI Connect'}
                        </span>
                    </button>
                </Panel>

                <Panel position="top-left" className="bg-void-900/95 p-4 rounded-xl border border-starlight-100/20 backdrop-blur-md shadow-xl">
                    <h3 className="text-starlight-100 font-bold mb-3 text-sm uppercase tracking-wider border-b border-starlight-100/10 pb-2">Legend</h3>
                    <div className="space-y-3 text-xs">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                            <span className="text-starlight-200 font-medium">Subjects</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]"></div>
                            <span className="text-starlight-200 font-medium">Modules</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                            <span className="text-starlight-200 font-medium">Resources</span>
                        </div>
                    </div>
                </Panel>
            </ReactFlow>

            {/* Node Details Modal */}
            {selectedNode && (
                <div className="absolute top-4 right-4 w-80 bg-void-900/95 backdrop-blur-md border border-starlight-100/20 rounded-xl shadow-2xl p-6 z-50 animate-in slide-in-from-right-10">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-bold text-starlight-100">{selectedNode.data.label}</h3>
                        <button
                            onClick={() => setSelectedNode(null)}
                            className="text-starlight-400 hover:text-starlight-100 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <span className="text-xs font-medium text-starlight-500 uppercase tracking-wider">Type</span>
                            <p className="text-sm text-starlight-200 capitalize flex items-center gap-2 mt-1">
                                <span className={`w-2 h-2 rounded-full ${selectedNode.type === 'subject' ? 'bg-blue-500' :
                                    selectedNode.type === 'module' ? 'bg-purple-500' : 'bg-green-500'
                                    }`}></span>
                                {selectedNode.type}
                            </p>
                        </div>

                        {selectedNode.data.description && (
                            <div>
                                <span className="text-xs font-medium text-starlight-500 uppercase tracking-wider">Description</span>
                                <p className="text-sm text-starlight-300 mt-1 line-clamp-3">{selectedNode.data.description}</p>
                            </div>
                        )}

                        <div className="pt-4 border-t border-starlight-100/10 flex gap-2">
                            <button
                                onClick={() => onNavigate && onNavigate(selectedNode)}
                                className="flex-1 px-3 py-2 bg-neon-blue/10 text-neon-blue rounded-lg text-sm font-medium hover:bg-neon-blue/20 transition-colors"
                            >
                                Open
                            </button>
                            <button
                                onClick={() => setHighlightedNodeId(highlightedNodeId === selectedNode.id ? null : selectedNode.id)}
                                disabled={!edges.some(e => e.source === selectedNode.id || e.target === selectedNode.id)}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${highlightedNodeId === selectedNode.id
                                    ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/50'
                                    : 'bg-void-800 text-starlight-300 hover:bg-void-700'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                title={!edges.some(e => e.source === selectedNode.id || e.target === selectedNode.id) ? "No connections found" : "Highlight connections"}
                            >
                                {highlightedNodeId === selectedNode.id ? 'Clear' : 'Connections'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KnowledgeGraph;
