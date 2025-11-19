// Mock environment variables before importing
process.env.MCP_ENABLED = 'true';
process.env.SEQUENTIAL_THINKING_URL = 'http://localhost:3001/sse';
process.env.MCP_ENABLED_TOOLS = 'sequentialthinking';

// Mock the MCP SDK
jest.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    request: jest.fn()
  }))
}));

jest.mock('@modelcontextprotocol/sdk/client/sse.js', () => ({
  SSEClientTransport: jest.fn().mockImplementation(() => ({}))
}));

import mcpService from '../services/mcpService';

describe('MCP Service', () => {
  beforeEach(() => {
    // Reset service state if needed
    jest.clearAllMocks();
    mcpService.reloadConfig();
  });

  describe('Configuration', () => {
    test('should load config from environment', () => {
      const config = mcpService.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.servers).toHaveLength(1);
      expect(config.servers[0].url).toBe('http://localhost:3001/sse');
      expect(config.enabledTools).toEqual(['sequentialthinking']);
    });

    test('should be disabled when MCP_ENABLED is false', () => {
      process.env.MCP_ENABLED = 'false';
      mcpService.reloadConfig();
      const isEnabled = mcpService.isEnabled();
      expect(isEnabled).toBe(false);
      process.env.MCP_ENABLED = 'true'; // Reset
      mcpService.reloadConfig();
    });
  });

  describe('Tool Discovery', () => {
    test('should return available tools', async () => {
      // Mock the client request for tools/list
      const mockClient = { request: jest.fn() };
      mockClient.request.mockResolvedValue({
        tools: [
          {
            name: 'sequentialthinking',
            description: 'Sequential thinking tool',
            inputSchema: { type: 'object', properties: { query: { type: 'string' } } }
          }
        ]
      });

      // Access the private clients map (this is a test, so we can do this)
      (mcpService as any).clients.set('http://localhost:3001/sse', mockClient);

      const tools = await mcpService.getAvailableTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('sequentialthinking');
    });

    test('should filter tools by enabled list', async () => {
      process.env.MCP_ENABLED_TOOLS = 'sequentialthinking';
      mcpService.reloadConfig();
      const tools = await mcpService.getAvailableTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('sequentialthinking');
      process.env.MCP_ENABLED_TOOLS = 'sequentialthinking'; // Reset
      mcpService.reloadConfig();
    });
  });

  describe('Tool Execution', () => {
    test('should execute sequentialthinking tool', async () => {
      const mockClient = { request: jest.fn() };
      mockClient.request.mockResolvedValue({
        thinking: 'Step-by-step analysis of the query',
        result: 'Final conclusion'
      });

      (mcpService as any).clients.set('http://localhost:3001/sse', mockClient);

      const results = await mcpService.executeTool('sequentialthinking', { query: 'test query' });
      expect(results).toHaveLength(1);
      expect(results[0].toolName).toBe('sequentialthinking');
      expect(results[0].success).toBe(true);
      expect(results[0].result.thinking).toBeDefined();
    });

    test('should handle tool execution errors', async () => {
      const mockClient = { request: jest.fn() };
      mockClient.request.mockRejectedValue(new Error('Tool execution failed'));

      (mcpService as any).clients.set('http://localhost:3001/sse', mockClient);

      const results = await mcpService.executeTool('sequentialthinking', { query: 'test' });
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('Tool execution failed');
    });

    test('should return error when MCP disabled', async () => {
      process.env.MCP_ENABLED = 'false';
      mcpService.reloadConfig();
      const results = await mcpService.executeTool('web_search', { query: 'test' });
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('MCP integration is disabled');
      process.env.MCP_ENABLED = 'true'; // Reset
      mcpService.reloadConfig();
    });
  });

  describe('MCP Search', () => {
    test('should perform MCP-enhanced search', async () => {
      const mockClient = { request: jest.fn() };
      mockClient.request
        .mockResolvedValueOnce({
          tools: [{ name: 'sequentialthinking', description: 'Sequential thinking tool' }]
        })
        .mockResolvedValueOnce({
          thinking: 'Analyzed the query step by step',
          result: 'Enhanced understanding'
        });

      (mcpService as any).clients.set('http://localhost:3001/sse', mockClient);

      const result = await mcpService.searchWithMCP('how to analyze this complex problem');
      expect(result.results).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.enhancedQuery).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    test('should return empty results when disabled', async () => {
      process.env.MCP_ENABLED = 'false';
      const result = await mcpService.searchWithMCP('test query');
      expect(result.results).toEqual([]);
      expect(result.enhancedQuery).toBeUndefined();
      expect(result.summary).toBeUndefined();
      process.env.MCP_ENABLED = 'true'; // Reset
    });
  });
});