import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import prisma from '../db.js';
import { authenticateToken, requireRole, recordAudit, AuthenticatedRequest } from '../auth.js';

const router = Router();
const safeUserFields = {
  id: true,
  username: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  status: true,
  lastLogin: true,
  createdAt: true,
} as const;

router.get('/', authenticateToken, async (_req, res: Response) => {
  try {
    res.json(await prisma.user.findMany({ select: safeUserFields, orderBy: { createdAt: 'desc' } }));
  } catch {
    res.status(500).json({ error: 'Unable to load user accounts.' });
  }
});

router.post('/', authenticateToken, requireRole('Admin'), async (req: AuthenticatedRequest, res: Response) => {
  const { username, name, email, role, password, phone, status } = req.body;
  try {
    if (!username?.trim() || !name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ error: 'Username, name, email, and password are required.' });
    }
    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findFirst({ where: { OR: [{ username: normalizedUsername }, { email: normalizedEmail }] } });
    if (existing) return res.status(409).json({ error: 'Username or email is already in use.' });

    const newUser = await prisma.user.create({
      data: {
        username: normalizedUsername,
        name: name.trim(),
        email: normalizedEmail,
        role: role === 'Admin' ? 'Admin' : 'Staff',
        accessKey: randomUUID(),
        passwordHash: await bcrypt.hash(password.trim(), 10),
        phone: phone?.trim() || null,
        status: status === 'Inactive' ? 'Inactive' : 'Active',
      },
      select: safeUserFields,
    });
    await recordAudit('Create User', 'Staff Management', req.user?.name || 'Admin', { username: newUser.username });
    res.status(201).json(newUser);
  } catch {
    res.status(500).json({ error: 'Unable to create this user account.' });
  }
});

router.put('/:id', authenticateToken, requireRole('Admin'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { username, name, email, role, phone, status, password, newPassword } = req.body;
  try {
    const current = await prisma.user.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ error: 'User account not found.' });

    const normalizedUsername = username === undefined ? undefined : String(username).trim();
    const normalizedEmail = email === undefined ? undefined : String(email).trim().toLowerCase();
    if (normalizedUsername === '' || normalizedEmail === '') {
      return res.status(400).json({ error: 'Username and email cannot be blank.' });
    }
    if (normalizedUsername || normalizedEmail) {
      const duplicate = await prisma.user.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(normalizedUsername ? [{ username: normalizedUsername }] : []),
            ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
          ],
        },
      });
      if (duplicate) return res.status(409).json({ error: 'Username or email is already in use.' });
    }

    const nextRole = role === undefined ? current.role : (role === 'Admin' ? 'Admin' : 'Staff');
    const nextStatus = status === undefined ? current.status : (status === 'Active' ? 'Active' : 'Inactive');
    if (current.role === 'Admin' && current.status === 'Active' && (nextRole !== 'Admin' || nextStatus !== 'Active')) {
      const otherActiveAdmins = await prisma.user.count({ where: { id: { not: id }, role: 'Admin', status: 'Active' } });
      if (otherActiveAdmins === 0) return res.status(400).json({ error: 'Keep at least one active Admin account.' });
    }

    const passwordValue = String(password ?? newPassword ?? '').trim();
    const updated = await prisma.user.update({
      where: { id },
      data: {
        username: normalizedUsername,
        name: name === undefined ? undefined : String(name).trim(),
        email: normalizedEmail,
        role: role === undefined ? undefined : nextRole,
        status: status === undefined ? undefined : nextStatus,
        phone: phone === undefined ? undefined : (String(phone).trim() || null),
        passwordHash: passwordValue ? await bcrypt.hash(passwordValue, 10) : undefined,
      },
      select: safeUserFields,
    });
    await recordAudit('Update User', 'Staff Management', req.user?.name || 'Admin', { userId: id, username: updated.username, status: updated.status });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Unable to update this user account.' });
  }
});

router.delete('/:id', authenticateToken, requireRole('Admin'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    if (req.user?.id === id) return res.status(400).json({ error: 'You cannot delete the account currently signed in.' });
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User account not found.' });
    if (user.role === 'Admin' && user.status === 'Active') {
      const otherActiveAdmins = await prisma.user.count({ where: { id: { not: id }, role: 'Admin', status: 'Active' } });
      if (otherActiveAdmins === 0) return res.status(400).json({ error: 'Keep at least one active Admin account.' });
    }
    await prisma.user.delete({ where: { id } });
    await recordAudit('Delete User', 'Staff Management', req.user?.name || 'Admin', { userId: id, username: user.username });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Unable to delete this user account.' });
  }
});

export default router;
