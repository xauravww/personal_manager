import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import dotenv from 'dotenv';
import cron from 'node-cron';
import fetch from 'node-fetch';

import authRoutes from './routes/auth';
import resourceRoutes from './routes/resources';
import searchRoutes from './routes/search';
import urlReaderRoutes from './routes/urlReader';
import webSearchRoutes from './routes/webSearch';
import deepResearchRoutes from './routes/deepResearch';
import learningRoutes from './routes/learning';
import captureRoutes from './routes/capture';
import instagramWebhookRoutes from './routes/instagram-webhook';
import instagramRoutes from './routes/instagram';
import { errorHandler } from './middleware/errorHandler';
import dashboardRoutes from './routes/dashboard';
import conversationsRoutes from './routes/conversations';
import knowledgeGraphRoutes from './routes/knowledgeGraph';
import prisma from './config/database';
import './workers/transcriptionWorker'; // Start worker on server startup

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));

// Rate limiting (disabled in development)
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
  });
  app.use(limiter);
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
app.use(morgan('combined'));

// Swagger documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Personal Resource Manager API',
      version: '1.0.0',
      description: 'API for managing personal resources with AI-powered search',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{
      bearerAuth: [],
    }],
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/url-reader', urlReaderRoutes);
app.use('/api/web-search', webSearchRoutes);
app.use('/api/deep-research', deepResearchRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/capture', captureRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/knowledge-graph', knowledgeGraphRoutes);
app.use('/api/webhooks', instagramWebhookRoutes);
app.use('/api', instagramRoutes);

// BullMQ Dashboard
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { transcriptionQueue } from './queues/transcriptionQueue';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(transcriptionQueue)],
  serverAdapter: serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

// Health check
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  });

  // Self-ping cron job to prevent Render spin-down (every 1 minute)
  const selfPing = async () => {
    try {
      const healthUrl = `http://localhost:${PORT}/health`;
      const response = await fetch(healthUrl);
      if (response.ok) {
        console.log(`✅ Self-ping successful at ${new Date().toISOString()}`);
      } else {
        console.log(`❌ Self-ping failed: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Self-ping error: ${error}`);
    }
  };

  // Run every minute
  cron.schedule('* * * * *', selfPing);

  // Temp file cleanup job (every hour)
  const { cleanupOldTempFiles } = require('./utils/cleanupTemp');
  cron.schedule('0 * * * *', async () => {
    console.log('🧹 Running scheduled temp file cleanup...');
    await cleanupOldTempFiles();
  });

  // Initial ping after server starts
  setTimeout(selfPing, 5000);

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
    });
  });
}

export default app;