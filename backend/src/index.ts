import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { Env } from './types';

import propertiesRoute from './routes/properties';
import leasesRoute from './routes/leases';
import rentsRoute from './routes/rents';
import dashboardRoute from './routes/dashboard';
import renewalsRoute from './routes/renewals';

const app = new Hono<{ Bindings: Env }>();

// Global Middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'apikey'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}));

// Health check
app.get('/', (c) => {
  return c.json({
    service: 'Lease Tracker Cloudflare API',
    status: 'online',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    environment: c.env.SUPABASE_URL ? 'configured' : 'missing_supabase_env'
  });
});

// Mount Routes
app.route('/api/properties', propertiesRoute);
app.route('/api/leases', leasesRoute);
app.route('/api/rents', rentsRoute);
app.route('/api/dashboard', dashboardRoute);
app.route('/api/renewals', renewalsRoute);

// 404 Not Found Handler
app.notFound((c) => {
  return c.json({ success: false, error: 'Endpoint not found' }, 404);
});

// Error Handler
app.onError((err, c) => {
  console.error('Unhandled Server Error:', err);
  return c.json({
    success: false,
    error: err.message || 'Internal Server Error'
  }, 500);
});

export default app;
