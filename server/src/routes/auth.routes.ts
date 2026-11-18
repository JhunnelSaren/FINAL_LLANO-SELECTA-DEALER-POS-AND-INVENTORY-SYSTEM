import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db.js';
import { generateToken, authenticateToken, recordAudit, AuthenticatedRequest } from '../auth.js';
import { sendPasswordResetEmail, maskEmail } from '../email.js';

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
      // A stale database may not have the optional accessKey column yet.
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        passwordHash: true,
        status: true,
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
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await bcrypt.hash(password, 10) },
        select: { id: true },
      });
    }
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
    }

    // Update lastLogin
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
      select: { id: true },
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

// POST /api/auth/forgot-password
// Recovers password using the user's Gmail or registered email address
router.post('/forgot-password', async (req, res: Response) => {
  const { email } = req.body;
  try {
    const target = String(email || '').trim().toLowerCase();
    if (!target) {
      return res.status(400).json({ error: 'Please enter your registered Gmail or email address.' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: target },
          { username: target },
        ],
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'No account found with this email or username. Please check and try again.',
      });
    }

    if (user.status !== 'Active') {
      return res.status(403).json({
        error: 'This account is inactive. Please contact your Dealership Administrator.',
      });
    }

    // Generate 6-digit verification code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetCode,
        resetCodeExpiry,
      },
    });

    const emailResult = await sendPasswordResetEmail({
      toEmail: user.email,
      userName: user.name,
      resetCode,
    });

    await recordAudit('Request Password Reset', 'Auth', user.name, {
      email: user.email,
      sentViaEmail: emailResult.sent,
    });

    const masked = maskEmail(user.email);
    res.json({
      success: true,
      message: emailResult.sent
        ? `A 6-digit verification code was sent to ${masked}. Please check your Gmail/inbox.`
        : `Verification code generated for ${masked}.`,
      email: user.email,
      maskedEmail: masked,
      devCode: emailResult.devCode, // available for offline/testing if SMTP is unconfigured
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/verify-reset-code
router.post('/verify-reset-code', async (req, res: Response) => {
  const { email, code } = req.body;
  try {
    const target = String(email || '').trim().toLowerCase();
    const cleanCode = String(code || '').trim();

    if (!target || !cleanCode) {
      return res.status(400).json({ error: 'Email and 6-digit verification code are required.' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: target },
          { username: target },
        ],
      },
    });

    if (!user || !user.resetCode) {
      return res.status(400).json({ error: 'Invalid reset request. Please request a new code.' });
    }

    if (user.resetCode !== cleanCode) {
      return res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
    }

    if (!user.resetCodeExpiry || user.resetCodeExpiry < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
    }

    res.json({
      success: true,
      message: 'Verification code verified successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res: Response) => {
  const { email, code, newPassword } = req.body;
  try {
    const target = String(email || '').trim().toLowerCase();
    const cleanCode = String(code || '').trim();
    const pass = String(newPassword || '').trim();

    if (!target || !cleanCode || !pass) {
      return res.status(400).json({ error: 'Email, verification code, and new password are required.' });
    }

    if (pass.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: target },
          { username: target },
        ],
      },
    });

    if (!user || !user.resetCode) {
      return res.status(400).json({ error: 'Invalid or expired password reset session.' });
    }

    if (user.resetCode !== cleanCode) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    if (!user.resetCodeExpiry || user.resetCodeExpiry < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
    }

    const passwordHash = await bcrypt.hash(pass, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetCode: null,
        resetCodeExpiry: null,
      },
    });

    await recordAudit('Reset Password', 'Auth', user.name, {
      email: user.email,
      method: 'Email Recovery',
    });

    res.json({
      success: true,
      message: 'Your password has been successfully reset. You can now log in with your new password.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
