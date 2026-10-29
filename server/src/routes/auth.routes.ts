import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db.js';
import { generateToken, authenticateToken, recordAudit, AuthenticatedRequest } from '../auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res: Response) => {
  const { usernameOrEmail, password } = req.body;
  try {
    if (!usernameOrEmail || !password) {
      return res.status(400).json({ error: 'Please provide username/email and password.' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: usernameOrEmail.trim() },
          { email: usernameOrEmail.trim().toLowerCase() },
        ],
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. User not found.' });
    }

    if (user.status !== 'Active') {
      return res.status(403).json({ error: 'Account is inactive. Please contact the Dealer Admin.' });
    }

    let isMatch = false;
    try { isMatch = await bcrypt.compare(password, user.passwordHash); } catch { /* legacy plaintext will be upgraded below */ }
    if (!isMatch && user.passwordHash === password) {
      isMatch = true;
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, 10) } });
    }
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
    }

    // Update lastLogin
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const safeUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const token = generateToken(safeUser);
    await recordAudit('Login', 'Auth', user.name, { username: user.username });

    res.json({ success: true, token, user: safeUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        status: true,
        lastLogin: true,
      },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
