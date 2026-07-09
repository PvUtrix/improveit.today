import client from 'prom-client';

// Default process/runtime metrics (CPU, memory, event loop, GC, ...).
export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry, prefix: 'gateway_' });

export const httpRequestsTotal = new client.Counter({
  name: 'gateway_http_requests_total',
  help: 'Total HTTP requests handled by the gateway',
  labelNames: ['method', 'route', 'status'] as const,
  registers: [registry],
});

export const httpRequestDuration = new client.Histogram({
  name: 'gateway_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [registry],
});

/** Collapse high-cardinality paths (ids) to their route family so the label
 * set stays bounded. `/api/problems/abc-123` → `/api/problems`. */
export function routeLabel(path: string): string {
  const parts = path.split('/').filter(Boolean);
  // Keep the first two segments (e.g. api + resource); drop ids beyond that.
  return '/' + parts.slice(0, 2).join('/');
}
