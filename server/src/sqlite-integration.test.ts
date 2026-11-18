import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from './index.js';
import db from './db.js';

describe('SQLite & System Endpoints Verification', () => {
  it('loads database with SQLite records', async () => {
    const productCount = await db.product.count();
    const userCount = await db.user.count();
    expect(productCount).toBeGreaterThan(0);
    expect(userCount).toBeGreaterThan(0);
  });

  it('serves header and location branding', async () => {
    const res = await request(app).get('/api/settings/login-page');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('copyrightText');
    expect(res.body).toHaveProperty('footerAddress');
  });

  it('authenticates admin and staff users', async () => {
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ usernameOrEmail: 'admin', password: 'admin123' });
    expect(adminRes.status).toBe(200);
    expect(adminRes.body).toHaveProperty('token');
    expect(adminRes.body.user.role).toBe('Admin');

    const staffRes = await request(app)
      .post('/api/auth/login')
      .send({ usernameOrEmail: 'staff', password: 'staff123' });
    expect(staffRes.status).toBe(200);
    expect(staffRes.body).toHaveProperty('token');
    expect(staffRes.body.user.role).toBe('Staff');
  });

  it('handles forgot-password recovery endpoint', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'admin@llanoselecta.ph' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('message');
  });

  it('handles stock adjustment requests flow with Admin permission', async () => {
    // 1. Staff logs in
    const staffRes = await request(app)
      .post('/api/auth/login')
      .send({ usernameOrEmail: 'staff', password: 'staff123' });
    const staffToken = staffRes.body.token;

    // 2. Staff requests permission to adjust stock
    const products = await db.product.findMany({ take: 1 });
    expect(products.length).toBeGreaterThan(0);
    const testProduct = products[0];

    const reqRes = await request(app)
      .post('/api/inventory/adjustment-requests')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        productId: testProduct.id,
        requestedChange: 2,
        reason: 'Physical count check during testing',
        notes: 'Verified against freezer tray',
      });
    expect([200, 201]).toContain(reqRes.status);
    expect(reqRes.body.success).toBe(true);
    const requestId = reqRes.body.request?.id || reqRes.body.requestId;

    // 3. Admin logs in
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ usernameOrEmail: 'admin', password: 'admin123' });
    const adminToken = adminRes.body.token;

    // 4. Admin lists requests
    const listRes = await request(app)
      .get('/api/inventory/adjustment-requests')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);

    // 5. Admin approves or denies request if ID is present
    if (requestId) {
      const approveRes = await request(app)
        .post(`/api/inventory/adjustment-requests/${requestId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Verified and approved by Admin' });
      expect(approveRes.status).toBe(200);
      expect(approveRes.body.success).toBe(true);
    }
  });
});
