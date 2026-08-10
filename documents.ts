import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { apiKeyAuth } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import applicationRoutes from './routes/applications';
import documentRoutes from './routes/documents';
import adminRoutes from './routes/admin';

const app = express();

// Parse CORS origins from environment variable
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-api-key'],
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Stricter rate limit for application submissions
const applicationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 applications per hour per IP
  message: { error: 'Application limit reached. Please try again later.' },
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploaded documents
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check (no auth required)
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API Key Authentication for all /api routes
app.use('/api', apiKeyAuth);

// Routes
app.use('/api/applications', applicationLimiter, applicationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
