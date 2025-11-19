// MCP Service - Simplified implementation for initial integration
// TODO: Replace with full MCP SDK implementation when stable

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

interface MCPServerConfig {
  url: string;
  apiKey?: string;
  transport: 'sse' | 'websocket';
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

interface MCPToolResult {
  serverUrl: string;
  toolName: string;
  result: any;
  success: boolean;
  error?: string;
}

interface MCPServiceConfig {
  enabled: boolean;
  servers: MCPServerConfig[];
  enabledTools: string[];
  requestTimeout: number;
  cacheEnabled: boolean;
  cacheTTL: number;
}

class MCPService {
  private config: MCPServiceConfig;
  private clients: Map<string, Client> = new Map();
  private toolCache: Map<string, { tools: MCPTool[], timestamp: number }> = new Map();
  private requestCache: Map<string, { result: any, timestamp: number }> = new Map();

  constructor() {
    this.config = this.loadConfig();
    // Initialize clients asynchronously without blocking constructor
    this.initializeClients().catch(error => {
      console.warn('MCP client initialization failed:', error.message);
    });
  }

  private loadConfig(): MCPServiceConfig {
    // Use sequentialthinking server by default
    const enabled = process.env.MCP_ENABLED !== 'false'; // Default to enabled
    const sequentialThinkingUrl = process.env.SEQUENTIAL_THINKING_URL || 'http://localhost:3001/sse';
    const enabledTools = process.env.MCP_ENABLED_TOOLS?.split(',') || ['sequentialthinking'];
    const requestTimeout = parseInt(process.env.MCP_REQUEST_TIMEOUT || '30000');
    const cacheEnabled = process.env.MCP_CACHE_ENABLED !== 'false';
    const cacheTTL = parseInt(process.env.MCP_CACHE_TTL || '300000');

    const servers: MCPServerConfig[] = [{
      url: sequentialThinkingUrl,
      transport: 'sse'
    }];

    return {
      enabled,
      servers,
      enabledTools,
      requestTimeout,
      cacheEnabled,
      cacheTTL
    };
  }

  private detectTransport(url: string): 'sse' | 'websocket' {
    if (url.includes('ws://') || url.includes('wss://')) {
      return 'websocket';
    }
    return 'sse';
  }

  private async initializeClients(): Promise<void> {
    if (!this.config.enabled) return;

    for (const server of this.config.servers) {
      try {
        // For now, use SSE transport only
        const transport = new SSEClientTransport(new URL(server.url));

        const client = new Client(
          {
            name: 'personal-manager-mcp-client',
            version: '1.0.0'
          },
          {
            capabilities: {}
          }
        );

        await client.connect(transport);
        this.clients.set(server.url, client);

        console.log(`✅ Connected to MCP server: ${server.url}`);
      } catch (error) {
        console.error(`❌ Failed to connect to MCP server ${server.url}:`, error);
      }
    }
  }

  async getAvailableTools(): Promise<MCPTool[]> {
    if (!this.config.enabled) return [];

    const allTools: MCPTool[] = [];

    for (const [serverUrl, client] of this.clients) {
      try {
        const toolsResponse = await client.request({ method: 'tools/list' }, {} as any);
        const tools = (toolsResponse as any).tools || [];

        for (const tool of tools) {
          allTools.push({
            name: tool.name,
            description: tool.description || '',
            inputSchema: tool.inputSchema
          });
        }
      } catch (error) {
        console.error(`Failed to get tools from ${serverUrl}:`, error);
      }
    }

    // Filter by enabled tools if specified
    if (this.config.enabledTools.length > 0) {
      return allTools.filter(tool => this.config.enabledTools.includes(tool.name));
    }

    return allTools;
  }

  async executeTool(toolName: string, parameters: any, userCredentials?: Record<string, string>): Promise<MCPToolResult[]> {
    if (!this.config.enabled) {
      return [{
        serverUrl: '',
        toolName,
        result: null,
        success: false,
        error: 'MCP integration is disabled'
      }];
    }

    const results: MCPToolResult[] = [];

    for (const [serverUrl, client] of this.clients) {
      try {
        const response = await client.request(
          { method: 'tools/call' },
          {
            name: toolName,
            arguments: parameters
          } as any
        );

        results.push({
          serverUrl,
          toolName,
          result: response,
          success: true
        });
      } catch (error) {
        console.error(`Failed to execute tool ${toolName} on ${serverUrl}:`, error);
        results.push({
          serverUrl,
          toolName,
          result: null,
          success: false,
          error: error instanceof Error ? error.message : 'Tool execution failed'
        });
      }
    }

    return results;
  }

  private getServerForTool(tool: MCPTool): string | null {
    // This is a simplified implementation - in practice, you'd need to track which server provides which tools
    // For now, we'll assume tools are unique across servers
    return null; // Let the execution loop find the right server
  }

  async searchWithMCP(query: string, context?: any, userCredentials?: Record<string, string>): Promise<{
    results: MCPToolResult[];
    enhancedQuery?: string;
    summary?: string;
  }> {
    if (!this.config.enabled) {
      return { results: [] };
    }

    const results: MCPToolResult[] = [];

    try {
      // Get available tools
      const tools = await this.getAvailableTools();

      // Execute relevant tools based on query analysis
      const relevantTools = this.analyzeQueryForTools(query, tools);

      for (const tool of relevantTools) {
        const toolResults = await this.executeTool(tool.name, {
          query,
          context,
          ...this.getToolSpecificParams(tool.name, query)
        }, userCredentials);

        results.push(...toolResults);
      }

      // Generate enhanced query and summary if we have results
      let enhancedQuery: string | undefined;
      let summary: string | undefined;

      if (results.length > 0) {
        enhancedQuery = this.generateEnhancedQuery(query, results);
        summary = this.generateSummary(query, results);
      }

      return {
        results,
        enhancedQuery,
        summary
      };

    } catch (error) {
      console.error('Error in MCP search:', error);
      return {
        results: [{
          serverUrl: '',
          toolName: 'search',
          result: null,
          success: false,
          error: error instanceof Error ? error.message : 'MCP search failed'
        }]
      };
    }
  }

  private analyzeQueryForTools(query: string, tools: MCPTool[]): MCPTool[] {
    // For sequential thinking, use it for complex reasoning tasks
    const queryLower = query.toLowerCase();
    const relevantTools: MCPTool[] = [];

    for (const tool of tools) {
      const toolName = tool.name.toLowerCase();

      // Use sequential thinking for complex queries that require step-by-step reasoning
      if (toolName.includes('sequential') && toolName.includes('thinking') &&
          (queryLower.includes('how') || queryLower.includes('why') || queryLower.includes('explain') ||
           queryLower.includes('analyze') || queryLower.includes('plan') || query.length > 100)) {
        relevantTools.push(tool);
      }
    }

    // If no specific tools match, return all available tools
    return relevantTools.length > 0 ? relevantTools : tools;
  }

  private getToolSpecificParams(toolName: string, query: string): any {
    switch (toolName.toLowerCase()) {
      case 'sequentialthinking':
        return {
          query: query,
          maxSteps: 10,
          temperature: 0.7
        };
      default:
        return {};
    }
  }

  private generateEnhancedQuery(originalQuery: string, results: MCPToolResult[]): string {
    const successfulResults = results.filter(r => r.success);
    if (successfulResults.length === 0) return originalQuery;

    let enhancedQuery = originalQuery;
    const contexts: string[] = [];

    for (const result of successfulResults) {
      if (result.result && typeof result.result === 'object') {
        if (result.toolName.includes('sequential') && result.result.thinking) {
          contexts.push(`sequential thinking: ${result.result.thinking.substring(0, 200)}...`);
        }
      }
    }

    if (contexts.length > 0) {
      enhancedQuery += ` (with sequential reasoning: ${contexts.join('; ')})`;
    }

    return enhancedQuery;
  }

  private generateSummary(query: string, results: MCPToolResult[]): string {
    const successfulResults = results.filter(r => r.success);

    if (successfulResults.length === 0) {
      return 'No additional information found from external tools.';
    }

    let summary = `Enhanced understanding using ${successfulResults.length} tool(s): `;

    const summaries: string[] = [];
    for (const result of successfulResults) {
      if (result.toolName.includes('sequential') && result.result?.thinking) {
        summaries.push(`sequential reasoning analysis`);
      } else {
        summaries.push(`${result.toolName} processing`);
      }
    }

    summary += summaries.join(', ');

    return summary;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getConfig(): MCPServiceConfig {
    return this.config;
  }

  disconnect(): void {
    // Clear caches - full MCP SDK would handle client disconnection
    console.log('MCP service disconnected');
  }

  // For testing purposes - reload config from environment
  reloadConfig(): void {
    this.config = this.loadConfig();
  }
}

// Export singleton instance
export default new MCPService();