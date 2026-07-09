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

// Rate limiting. The platform envelope is used for the 429 body so clients
// parse errors uniformly.
const rateLimited = (message: string) => ({
  status: 429,
  body: { success: false, error: { code: 'RATE_LIMITED', message } },
});

// Global limiter — a coarse flood guard across every route.
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    const r = rateLimited('Too many requests from this IP, please try again later.');
    res.status(r.status).json(r.body);
  },
});
app.use(limiter);

// Strict limiter for credential endpoints — brute-force / credential-stuffing
// protection. Defaults to 20 attempts per 15 minutes per IP; tune via env.
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '20'),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    const r = rateLimited('Too many authentication attempts. Please wait and try again.');
    res.status(r.status).json(r.body);
  },
});
// Logout is excluded — it isn't a guessing vector and clients call it freely.
app.use(['/api/auth/login', '/api/auth/register', '/api/auth/refresh'], authLimiter);

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
const publicRoutes = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/health',
];

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
      onProxyReq: (proxyReq, req) => {
        // Identity propagation: never forward client-supplied identity
        // headers; set them from the JWT this gateway verified. Services
        // take the acting user from these headers, never from the body.
        proxyReq.removeHeader('x-user-id');
        proxyReq.removeHeader('x-user-role');
        proxyReq.removeHeader('x-user-email');
        const user = (req as express.Request).user;
        if (user) {
          proxyReq.setHeader('x-user-id', user.userId);
          proxyReq.setHeader('x-user-role', user.role || 'user');
          if (user.email) proxyReq.setHeader('x-user-email', user.email);
        }
        // express.json() consumes the request stream before the proxy runs;
        // re-serialize the parsed body so proxied POST/PATCH bodies aren't
        // lost. Must run after header changes.
        fixRequestBody(proxyReq, req);
      },
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
