import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { Prisma } from '../generated-prisma/index.js';

import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import productsRoutes from './routes/products.routes.js';
import customersRoutes from './routes/customers.routes.js';
import freezersRoutes from './routes/freezers.routes.js';
import bookingsRoutes from './routes/bookings.routes.js';
import bodegaRoutes from './routes/bodega.routes.js';
import receivingRoutes from './routes/receiving.routes.js';
import deliveryRoutes from './routes/delivery.routes.js';
import reconciliationRoutes from './routes/reconciliation.routes.js';
import invoicesRoutes from './routes/invoices.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import quotaRoutes from './routes/quota.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import { deactivateDormantCustomers } from './customers.service.js';

const app = express();
const PORT = process.env.PORT || 5000;
const projectRoot = path.resolve(__dirname, '../..');

function normalizeApiValues(value: any): any {
  if (Prisma.Decimal.isDecimal(value)) return value.toNumber();
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(normalizeApiValues);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, normalizeApiValues(child)]));
  }
  return value;
}

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use((_req, res, next) => {
  const json = res.json.bind(res);
  res.json = (body: any) => json(normalizeApiValues(body));
  next();
});

// Static uploads directory - support both root and server relative paths
const rootUploadDir = path.join(projectRoot, 'uploads');
const serverUploadDir = path.join(projectRoot, 'server', 'uploads');
if (!fs.existsSync(rootUploadDir)) fs.mkdirSync(rootUploadDir, { recursive: true });
if (!fs.existsSync(serverUploadDir)) fs.mkdirSync(serverUploadDir, { recursive: true });
app.use('/uploads', express.static(serverUploadDir));
app.use('/uploads', express.static(rootUploadDir));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'Healthy',
    system: 'Llano Selecta Dealer POS and Inventory System',
    timezone: 'Asia/Manila',
    timestamp: new Date().toISOString(),
  });
});

// Mount modular API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/freezers', freezersRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/bodega-orders', bodegaRoutes);
app.use('/api/bodega', bodegaRoutes);
app.use('/api/stock-receiving', receivingRoutes);
app.use('/api/receiving', receivingRoutes);
app.use('/api/delivery-runs', deliveryRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/delivery-stops', deliveryRoutes);
app.use('/api/reconciliation', reconciliationRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/quota', quotaRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationsRoutes);

// In production, serve static files from client/dist
const clientDist = path.join(projectRoot, 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server Unhandled Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(`🚀 Llano Selecta Dealer POS and Inventory Backend Server Running`);
    console.log(`   Port: ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Database: MySQL (Prisma ORM)`);
    console.log(`   Timezone: Asia/Manila`);
    console.log(`================================================================`);
    void deactivateDormantCustomers().catch((err) => console.error('Store inactivity check failed:', err));
    setInterval(() => {
      void deactivateDormantCustomers().catch((err) => console.error('Store inactivity check failed:', err));
    }, 6 * 60 * 60 * 1000).unref();
  });
}

export default app;
