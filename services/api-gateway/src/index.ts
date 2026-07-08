import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.API_GATEWAY_PORT || 8000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Request logging
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Service routes (with proxy). Services mount their routers at the resource
// path (e.g. /votes), so the default rewrite only strips the /api prefix.
// A custom `rewriteTo` maps gateway paths that differ from the service mount.
const services: { path: string; target?: string; rewriteTo?: string }[] = [
  { path: '/api/users', target: process.env.USER_SERVICE_URL },
  { path: '/api/auth', target: process.env.USER_SERVICE_URL },
  { path: '/api/problems', target: process.env.PROBLEM_SERVICE_URL },
  { path: '/api/votes', target: process.env.VOTING_SERVICE_URL },
  { path: '/api/geocode', target: process.env.GEOLOCATION_SERVICE_URL, rewriteTo: '/geo' },
  { path: '/api/authorities', target: process.env.AUTHORITY_SERVICE_URL },
  { path: '/api/jurisdictions', target: process.env.AUTHORITY_SERVICE_URL },
  { path: '/api/payments', target: process.env.PAYMENT_SERVICE_URL },
  { path: '/api/crowdfunding', target: process.env.PAYMENT_SERVICE_URL },
  { path: '/api/bids', target: process.env.BIDDING_SERVICE_URL },
  { path: '/api/solvers', target: process.env.BIDDING_SERVICE_URL },
  { path: '/api/notifications', target: process.env.NOTIFICATION_SERVICE_URL },
  { path: '/api/search', target: process.env.SEARCH_SERVICE_URL },
  { path: '/api/media', target: process.env.MEDIA_SERVICE_URL },
  { path: '/api/analytics', target: process.env.ANALYTICS_SERVICE_URL },
  { path: '/api/moderation', target: process.env.MODERATION_SERVICE_URL },
];

// Apply auth middleware to protected routes
const publicRoutes = ['/api/auth/login', '/api/auth/register', '/health'];

app.use((req, res, next) => {
  const isPublicRoute = publicRoutes.some(route => req.path.startsWith(route));
  if (!isPublicRoute) {
    return authMiddleware(req, res, next);
  }
  return next();
});

// Setup proxies
services.forEach(({ path, target, rewriteTo }) => {
  if (!target) {
    logger.warn(`No target configured for ${path}`);
    return;
  }

  app.use(
    path,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      // Keep the resource segment: /api/votes/... → /votes/... (services
      // mount routers at /<resource>, not at the root).
      pathRewrite: {
        [`^${path}`]: rewriteTo ?? path.replace(/^\/api/, ''),
      },
      // express.json() consumes the request stream before the proxy runs;
      // re-serialize the parsed body so proxied POST/PATCH bodies aren't lost.
      onProxyReq: fixRequestBody,
      onError: (err, _req, res) => {
        logger.error(`Proxy error for ${path}:`, err);
        res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Service temporarily unavailable',
          },
        });
      },
    })
  );
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});
