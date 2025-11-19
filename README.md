# Personal Resource Manager

A comprehensive application for managing personal resources with AI-powered search capabilities.

## 🎯 Overview

This application allows users to store, organize, and retrieve resources (notes, videos, links, documents) using natural language queries powered by AI.

## ✅ Current Status

### Frontend (Complete)
- **Framework**: React with TypeScript
- **UI**: Modern, responsive design with Tailwind CSS
- **Features**:
  - Landing page with hero section, features, testimonials
  - Authentication pages (login/signup)
  - Dashboard with resource statistics
  - Resource management (CRUD operations)
  - AI-powered search interface
  - File upload support
  - Pagination and virtualization for performance

### Backend (Complete)
- **Framework**: Node.js/Express with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Features**:
  - JWT authentication
  - Resource CRUD API with type-safe database operations
  - AI-powered search with full-text capabilities
  - Model Context Protocol (MCP) integration for external tools
  - Comprehensive error handling and logging
  - Swagger API documentation
  - Rate limiting and security middleware
  - Database migrations and schema management

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### Environment Setup

1. **Copy environment files:**
   ```bash
   cp frontend/.env.example frontend/.env
   cp backend/.env.example backend/.env
   ```

2. **Configure your environment variables** in the respective `.env` files.

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Backend Setup
```bash
cd backend
npm install
# Set up your .env file
npm run db:init
npm run dev
```

## 🤖 AI Configuration

### Local AI Proxy Setup
The application uses a local AI proxy for all AI operations. Configure your proxy server to handle OpenAI-compatible API requests.

**Required Environment Variables:**
```bash
# Backend .env
AI_PROXY_URL=http://localhost:3010  # Your local proxy URL
AI_API_KEY=your-proxy-api-key       # API key for your proxy
AI_MODEL=grok-code                  # Model to use (grok-code, gpt-4, etc.)
```

**Proxy Requirements:**
- Must accept OpenAI-compatible API format
- Support `/v1/chat/completions` endpoint
- Handle streaming responses for real-time chat
- Accept `Authorization: Bearer <key>` header

**Testing Your Proxy:**
```bash
curl -X POST http://localhost:3010/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{"model": "grok-code", "messages": [{"role": "user", "content": "Hello"}], "stream": true}'
```

### Streaming Implementation
The application uses Server-Sent Events (SSE) for smooth, real-time streaming responses:
- Word-by-word streaming with 50ms delays for natural typing effect
- No buffering - responses appear character-by-character
- Automatic handling of stream completion and errors

## 🔗 Model Context Protocol (MCP) Integration

The application includes experimental support for the Model Context Protocol (MCP), allowing integration with external tools and services to enhance search capabilities.

### MCP Configuration

**Environment Variables:**
```bash
# Backend .env
MCP_ENABLED=true                                    # Enable/disable MCP integration
MCP_SERVER_URLS=http://mcp-server-1.com,http://mcp-server-2.com  # Comma-separated MCP server URLs
MCP_SERVER_API_KEYS=key1,key2                        # Optional API keys for servers
MCP_ENABLED_TOOLS=web_search,github_search           # Tools to enable across servers
MCP_REQUEST_TIMEOUT=30000                            # Request timeout in milliseconds
MCP_CACHE_ENABLED=true                               # Enable result caching
MCP_CACHE_TTL=300000                                 # Cache TTL in milliseconds
```

### Supported MCP Tools

- **web_search**: Search the web for information
- **github_search**: Search GitHub repositories and code
- **file_system**: Access and manipulate files (when available)
- **database_query**: Query databases (when available)

### Using MCP in Search

When MCP is enabled, users can enhance their searches with external tools:

1. **Enable MCP**: Set `useMCP=true` in search requests
2. **Provide Credentials**: Pass user-specific credentials via `mcpCredentials` parameter
3. **Automatic Tool Selection**: The system automatically selects relevant tools based on query analysis
4. **Enhanced Results**: Search results include data from external tools with summaries

**Example API Request:**
```bash
curl -X GET "http://localhost:3001/api/search?q=react%20hooks&useMCP=true&mcpCredentials[github_token]=your-token" \
  -H "Authorization: Bearer your-jwt-token"
```

**Response includes:**
- `mcpResults`: Array of tool execution results
- `mcpSummary`: Summary of external tool contributions
- Enhanced query with context from external tools

### MCP Security

- User credentials are never stored permanently
- Credentials are only used for the duration of the request
- MCP results are sanitized before being returned to users
- Failed tool executions don't break the search functionality

### Current Status

The MCP integration is currently in **mock mode** for development and testing. Real MCP servers can be connected by:
1. Setting up MCP-compatible servers
2. Configuring server URLs and credentials
3. Replacing mock implementations with actual MCP SDK calls

For production use, ensure MCP servers are properly secured and credentials are managed appropriately.

## 🔧 Proxy Configuration

### Development
The frontend includes Vite proxy configuration to avoid CORS issues during development. API calls to `/api/*` are automatically proxied to the backend server running on `http://localhost:3001`.

**Current Vite Proxy Setup:**
```javascript
// frontend/vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
      secure: false,
      rewrite: (path) => path.replace(/^\/api/, '/api')
    }
  }
}
```

### Production Deployment
For production deployments, configure your web server or CDN to proxy API requests:

#### Nginx Example:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API Proxy
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Apache Example:
```apache
<VirtualHost *:80>
    ServerName yourdomain.com

    # Frontend
    ProxyPass / http://localhost:5173/
    ProxyPassReverse / http://localhost:5173/

    # API Proxy
    ProxyPass /api http://localhost:3001/api
    ProxyPassReverse /api http://localhost:3001/api
</VirtualHost>
```

#### Environment Variables for Production:
```bash
# Frontend .env
VITE_API_URL=/api
VITE_NODE_ENV=production

# Backend .env
ALLOWED_ORIGINS=https://yourdomain.com
TRUST_PROXY=true
```

### Testing Proxy Configuration

1. **Development**: Start both frontend and backend servers
2. **Check Network Tab**: API calls should show as going to the same origin
3. **CORS Issues**: Should be resolved automatically in development
4. **Production**: Test with your configured proxy server

The proxy setup ensures seamless communication between frontend and backend while maintaining security and avoiding CORS issues.

## 📁 Project Structure

```
personal_manager/
├── frontend/          # React application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── ...
│   └── package.json
├── backend/           # Express API
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── config/
│   │   └── ...
│   ├── schema.sql
│   └── package.json
└── README.md
```

## 🎯 Features

### Core Features
- ✅ User authentication and authorization
- ✅ Resource management (notes, videos, links, documents)
- ✅ Tag-based organization
- ✅ Full-text search
- ✅ Responsive web interface
- ✅ File upload support

### AI Features
- ✅ Natural language search queries with AI enhancement
- ✅ Model Context Protocol (MCP) integration for external tools
- 📝 Content extraction from documents (planned)
- 🏷️ Automatic tagging suggestions (planned)
- 📊 Usage analytics and insights (planned)

## 🛠️ Technology Stack

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- React Router
- Axios
- React Query (planned)

### Backend
- Node.js
- Express.js
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Swagger/OpenAPI

## 📚 API Documentation

When the backend is running, visit `http://localhost:3001/api-docs` for interactive API documentation.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.