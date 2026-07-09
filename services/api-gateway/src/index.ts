import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import {
  registry,
  httpRequestsTotal,
  httpRequestDuration,
  routeLabel,
} from './utils/metrics';

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

// Back the limiters with Redis when configured, so the budget is shared
// across gateway replicas (in-memory counters would let N pods serve N× the
// limit and reset on every deploy). Falls back to per-pod memory when
// REDIS_HOST/REDIS_URL is unset.
const redisUrl =
  process.env.REDIS_URL ||
  (process.env.REDIS_HOST
    ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`
    : null);
const redisClient = redisUrl
  ? createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 3000,
        // Bounded reconnect: after a handful of failures give up rather than
        // retry forever, so a Redis outage never wedges startup.
        reconnectStrategy: (retries) =>
          retries > 5 ? new Error('Redis unreachable') : Math.min(retries * 200, 1000),
      },
    })
  : null;
let redisReady = false;
if (redisClient) {
  redisClient.on('error', (err) => logger.error('Rate-limit Redis error:', err));
}

function makeStore(prefix: string) {
  // Only use Redis once a connection is established — the RedisStore
  // constructor pings Redis, so building it against a closed client throws.
  // When Redis is unset or unreachable we fall through to per-pod memory.
  if (!redisClient || !redisReady) return undefined;
  return new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    prefix,
  });
}

// The RedisStore pings Redis in its constructor, so the client must be
// connected before any limiter is built. Everything from the limiters through
// app.listen therefore runs inside this async bootstrap.
async function main() {
  if (redisClient) {
    // Fail fast: never let a Redis outage wedge startup. Race the connect
    // against a timeout; on failure, tear the client down and fall through to
    // the in-memory limiter store.
    let timeoutHandle: NodeJS.Timeout | undefined;
    const connectPromise = redisClient.connect();
    // If the timeout wins the race, connect() may still reject later — swallow
    // that so it isn't an unhandled rejection.
    connectPromise.catch(() => undefined);
    try {
      await Promise.race([
        connectPromise,
        new Promise((_, reject) => {
          timeoutHandle = setTimeout(() => reject(new Error('Redis connect timeout')), 4000);
        }),
      ]);
      redisReady = true;
      logger.info('Rate limiter backed by Redis (shared across replicas)');
    } catch (err) {
      logger.error('Redis connect failed; rate limiter falls back to memory:', err);
      try {
        await redisClient.disconnect();
      } catch {
        /* already closed */
      }
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }

  // Global limiter — a coarse flood guard across every route.
  const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('rl:global:'),
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
  store: makeStore('rl:auth:'),
  handler: (_req, res) => {
    const r = rateLimited('Too many authentication attempts. Please wait and try again.');
    res.status(r.status).json(r.body);
  },
});
// Logout is excluded — it isn't a guessing vector and clients call it freely.
app.use(['/api/auth/login', '/api/auth/register', '/api/auth/refresh'], authLimiter);

// Request id + structured access log + Prometheus metrics. A request id is
// taken from an upstream proxy if present, else generated, echoed on the
// response, and forwarded to services (see onProxyReq) so a single request
// is traceable across the whole stack.
app.use((req, res, next) => {
  const incoming = req.headers['x-request-id'];
  const requestId = (typeof incoming === 'string' && incoming) || crypto.randomUUID();
  (req as express.Request & { requestId: string }).requestId = requestId;
  res.setHeader('x-request-id', requestId);

  const endTimer = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const route = routeLabel(req.path);
    const labels = { method: req.method, route, status: String(res.statusCode) };
    httpRequestsTotal.inc(labels);
    endTimer(labels);
    logger.info(`${req.method} ${req.path}`, {
      requestId,
      status: res.statusCode,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Prometheus scrape endpoint. Public (no JWT) so a scraper can reach it;
// in production restrict it at the network layer — do NOT route /metrics
// through the public Ingress.
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
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
        // Propagate the trace id so a request is correlatable across services.
        const requestId = (req as express.Request & { requestId?: string }).requestId;
        if (requestId) proxyReq.setHeader('x-request-id', requestId);
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

  // Start server (inside main so it listens only after Redis is ready).
  app.listen(PORT, () => {
    logger.info(`API Gateway running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

main().catch((err) => {
  logger.error('Gateway failed to start:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  if (redisClient?.isOpen) {
    await redisClient.quit().catch(() => undefined);
  }
  process.exit(0);
});
