import { Router, Response } from 'express';
import prisma from '../db.js';
import { authenticateToken, requireRole, recordAudit, AuthenticatedRequest } from '../auth.js';
import { imageUpload } from '../upload.js';

const router = Router();

export interface LoginSlide {
  imageUrl: string;
  headline: string;
  description: string;
}

export interface LoginPageConfig {
  brandName: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  logoUrl: string;
  logoIcon: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  loginButtonText: string;
  rememberMeText: string;
  forgotPasswordText: string;
  badgeHeadline: string;
  badgeDescription: string;
  themeStyle: string;
  showSocialButtons: boolean;
  socialGoogleText: string;
  socialAppleText: string;
  footerText: string;
  registerText: string;
  registerUrl: string;
  slides: LoginSlide[];
}

const defaultLoginPage: LoginPageConfig = {
  brandName: 'Llano Selecta',
  welcomeTitle: 'Welcome Back to Llano Selecta',
  welcomeSubtitle: 'Sign in to continue to your dealer dashboard',
  logoUrl: '/llano-selecta-logo.png',
  logoIcon: 'home',
  emailLabel: 'Username or Email',
  emailPlaceholder: 'Enter your username or email',
  passwordLabel: 'Password',
  passwordPlaceholder: 'Enter your password here',
  loginButtonText: 'Login',
  rememberMeText: 'Remember me',
  forgotPasswordText: 'Forgot Password?',
  badgeHeadline: 'Cold Chain. Reliable Delivery.',
  badgeDescription: 'Manage inventory, orders, routes, and freezer assets in one place.',
  themeStyle: 'modern-glass',
  showSocialButtons: false,
  socialGoogleText: 'Continue with Google',
  socialAppleText: 'Continue with Apple',
  footerText: "Don't have an account?",
  registerText: 'Register',
  registerUrl: '#register',
  slides: [
    {
      imageUrl: '/uploads/login-bg-modern.jpg',
      headline: 'Cold Chain. Reliable Delivery.',
      description: 'Manage inventory, orders, routes, and freezer assets in one place.',
    },
    {
      imageUrl: '/uploads/login-bg-modern.jpg',
      headline: 'Llano Selecta Dealer & Cold Chain',
      description: 'Reliable cold-chain ice cream distribution across Valencia, Cabanglasan, and San Fernando.',
    },
    {
      imageUrl: '/uploads/login-bg-modern.jpg',
      headline: 'Flawless Real-Time Inventory & Freezers',
      description: 'Track stock, route deliveries, invoices, and freezer assets from one dashboard.',
    },
  ],
};

function readLoginPage(value?: string | null): LoginPageConfig {
  try {
    const parsed = value ? JSON.parse(value) : {};
    const slides = Array.isArray(parsed.slides) ? parsed.slides : [];
    const currentText = (candidate: unknown, fallback: string, legacyValues?: string | string[]) => {
      const isLegacy = Array.isArray(legacyValues)
        ? legacyValues.includes(String(candidate))
        : candidate === legacyValues;
      return typeof candidate === 'string' && candidate.trim() && !isLegacy ? candidate : fallback;
    };
    return {
      brandName: typeof parsed.brandName === 'string' && parsed.brandName.trim() ? parsed.brandName : defaultLoginPage.brandName,
      welcomeTitle: typeof parsed.welcomeTitle === 'string' && parsed.welcomeTitle.trim() ? parsed.welcomeTitle : defaultLoginPage.welcomeTitle,
      welcomeSubtitle: currentText(parsed.welcomeSubtitle, defaultLoginPage.welcomeSubtitle, 'Sign in your account'),
      logoUrl: typeof parsed.logoUrl === 'string' ? parsed.logoUrl : defaultLoginPage.logoUrl,
      logoIcon: typeof parsed.logoIcon === 'string' ? parsed.logoIcon : defaultLoginPage.logoIcon,
      emailLabel: currentText(parsed.emailLabel, defaultLoginPage.emailLabel, 'Your Email'),
      emailPlaceholder: currentText(parsed.emailPlaceholder, defaultLoginPage.emailPlaceholder, 'Enter your email id here'),
      passwordLabel: typeof parsed.passwordLabel === 'string' && parsed.passwordLabel.trim() ? parsed.passwordLabel : defaultLoginPage.passwordLabel,
      passwordPlaceholder: typeof parsed.passwordPlaceholder === 'string' && parsed.passwordPlaceholder.trim() ? parsed.passwordPlaceholder : defaultLoginPage.passwordPlaceholder,
      loginButtonText: typeof parsed.loginButtonText === 'string' && parsed.loginButtonText.trim() ? parsed.loginButtonText : defaultLoginPage.loginButtonText,
      rememberMeText: typeof parsed.rememberMeText === 'string' && parsed.rememberMeText.trim() ? parsed.rememberMeText : defaultLoginPage.rememberMeText,
      forgotPasswordText: typeof parsed.forgotPasswordText === 'string' && parsed.forgotPasswordText.trim() ? parsed.forgotPasswordText : defaultLoginPage.forgotPasswordText,
      badgeHeadline: currentText(parsed.badgeHeadline, defaultLoginPage.badgeHeadline, 'Because Stays Should Feel Like Destinations'),
      badgeDescription: currentText(parsed.badgeDescription, defaultLoginPage.badgeDescription, 'Find a perfect stay for you much awaited vacation!'),
      themeStyle: typeof parsed.themeStyle === 'string' ? parsed.themeStyle : defaultLoginPage.themeStyle,
      showSocialButtons: parsed.showSocialButtons !== undefined ? Boolean(parsed.showSocialButtons) : defaultLoginPage.showSocialButtons,
      socialGoogleText: typeof parsed.socialGoogleText === 'string' ? parsed.socialGoogleText : defaultLoginPage.socialGoogleText,
      socialAppleText: typeof parsed.socialAppleText === 'string' ? parsed.socialAppleText : defaultLoginPage.socialAppleText,
      footerText: typeof parsed.footerText === 'string' ? parsed.footerText : defaultLoginPage.footerText,
      registerText: typeof parsed.registerText === 'string' ? parsed.registerText : defaultLoginPage.registerText,
      registerUrl: typeof parsed.registerUrl === 'string' ? parsed.registerUrl : defaultLoginPage.registerUrl,
      slides: Array.from({ length: 3 }, (_, index) => ({
        imageUrl: typeof slides[index]?.imageUrl === 'string' && slides[index].imageUrl.trim() ? slides[index].imageUrl : defaultLoginPage.slides[index].imageUrl,
        headline: currentText(slides[index]?.headline, defaultLoginPage.slides[index].headline, index === 0 ? 'Because Stays Should Feel Like Destinations' : undefined),
        description: currentText(slides[index]?.description, defaultLoginPage.slides[index].description, index === 0
          ? 'Find a perfect stay for you much awaited vacation!'
          : index === 2
            ? [
                'Complete stock traceability, route deliveries, and instant offline/online transactions.',
                'Complete stock traceability, instant invoices, and route reconciliation.',
              ]
            : undefined),
      })),
    };
  } catch {
    return defaultLoginPage;
  }
}

async function getOrCreateSystemSettings() {
  const existing = await prisma.systemSetting.findFirst();
  return existing || prisma.systemSetting.create({ data: { id: 'SYSTEM_SETTINGS' } });
}

// Public branding config so the sign-in page can render before authentication.
router.get('/login-page', async (_req, res: Response) => {
  try {
    const settings = await getOrCreateSystemSettings();
    res.setHeader('Cache-Control', 'no-store');
    res.json(readLoginPage(settings.loginPageConfig));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/login-page', authenticateToken, requireRole('Admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const input = req.body || {};
    const cleanText = (value: unknown, fallback: string, max: number) =>
      typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;
    const assetPath = (value: unknown, fallback = '') =>
      typeof value === 'string' && value.trim().length <= 1000 ? value.trim() : fallback;
    const slidesInput = Array.isArray(input.slides) ? input.slides : [];
    
    const config: LoginPageConfig = {
      brandName: cleanText(input.brandName, defaultLoginPage.brandName, 80),
      welcomeTitle: cleanText(input.welcomeTitle, defaultLoginPage.welcomeTitle, 100),
      welcomeSubtitle: cleanText(input.welcomeSubtitle, defaultLoginPage.welcomeSubtitle, 180),
      logoUrl: assetPath(input.logoUrl),
      logoIcon: cleanText(input.logoIcon, defaultLoginPage.logoIcon, 40),
      emailLabel: cleanText(input.emailLabel, defaultLoginPage.emailLabel, 80),
      emailPlaceholder: cleanText(input.emailPlaceholder, defaultLoginPage.emailPlaceholder, 100),
      passwordLabel: cleanText(input.passwordLabel, defaultLoginPage.passwordLabel, 80),
      passwordPlaceholder: cleanText(input.passwordPlaceholder, defaultLoginPage.passwordPlaceholder, 100),
      loginButtonText: cleanText(input.loginButtonText, defaultLoginPage.loginButtonText, 60),
      rememberMeText: cleanText(input.rememberMeText, defaultLoginPage.rememberMeText, 60),
      forgotPasswordText: cleanText(input.forgotPasswordText, defaultLoginPage.forgotPasswordText, 80),
      badgeHeadline: cleanText(input.badgeHeadline, defaultLoginPage.badgeHeadline, 140),
      badgeDescription: cleanText(input.badgeDescription, defaultLoginPage.badgeDescription, 200),
      themeStyle: cleanText(input.themeStyle, defaultLoginPage.themeStyle, 40),
      showSocialButtons: input.showSocialButtons !== undefined ? Boolean(input.showSocialButtons) : defaultLoginPage.showSocialButtons,
      socialGoogleText: cleanText(input.socialGoogleText, defaultLoginPage.socialGoogleText, 80),
      socialAppleText: cleanText(input.socialAppleText, defaultLoginPage.socialAppleText, 80),
      footerText: cleanText(input.footerText, defaultLoginPage.footerText, 100),
      registerText: cleanText(input.registerText, defaultLoginPage.registerText, 60),
      registerUrl: assetPath(input.registerUrl, defaultLoginPage.registerUrl),
      slides: Array.from({ length: 3 }, (_, index) => ({
        imageUrl: assetPath(slidesInput[index]?.imageUrl, defaultLoginPage.slides[index].imageUrl),
        headline: cleanText(slidesInput[index]?.headline, defaultLoginPage.slides[index].headline, 120),
        description: cleanText(slidesInput[index]?.description, defaultLoginPage.slides[index].description, 200),
      })),
    };

    const current = await getOrCreateSystemSettings();
    const updated = await prisma.systemSetting.update({
      where: { id: current.id },
      data: { loginPageConfig: JSON.stringify(config) },
    });
    await recordAudit('Update Login Page', 'Settings', req.user?.name || 'Admin', { brandName: config.brandName });
    res.json(readLoginPage(updated.loginPageConfig));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login-page/upload', authenticateToken, requireRole('Admin'), imageUpload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'Choose a JPEG, PNG, or WebP image to upload.' });
  const imageUrl = `/uploads/${req.file.filename}`;
  await recordAudit('Upload Login Page Image', 'Settings', req.user?.name || 'Admin', { filename: req.file.filename });
  res.status(201).json({ imageUrl });
});

// GET /api/settings
router.get('/', authenticateToken, requireRole('Admin'), async (_req, res: Response) => {
  try {
    let settings = await prisma.systemSetting.findFirst();
    if (!settings) {
      settings = await prisma.systemSetting.create({
        data: {
          id: 'SYSTEM_SETTINGS',
          dealerName: 'Llano Selecta Dealer',
          address: 'Sayre Highway, Valencia City, Bukidnon',
          contactNumber: '0917-123-4567',
          receiptHeader: 'Llano Selecta Authorized Dealer - Cold Chain Ice Cream Distribution',
          defaultQuotaTarget: 1000000.00,
          freezerTotalFee: 10000.00,
          freezerProductAllocation: 9000.00,
          freezerProcessingFee: 1000.00,
          allowNegativeStock: false,
        },
      });
    }
    const { mondayRoute, tuesdayRoute, wednesdayActivity, thursdayRoute, fridayRoute, ...operatingSettings } = settings;
    res.json(operatingSettings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings (Admin only)
router.put('/', authenticateToken, requireRole('Admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      dealerName,
      address,
      contactNumber,
      receiptHeader,
      defaultQuotaTarget,
      freezerTotalFee,
      freezerProductAllocation,
      freezerProcessingFee,
      allowNegativeStock,
    } = req.body;

    const current = await prisma.systemSetting.findFirst();
    const id = current?.id || 'SYSTEM_SETTINGS';

    const updated = await prisma.systemSetting.upsert({
      where: { id },
      update: {
        dealerName,
        address,
        contactNumber,
        receiptHeader,
        defaultQuotaTarget: defaultQuotaTarget !== undefined ? Number(defaultQuotaTarget) : undefined,
        freezerTotalFee: freezerTotalFee !== undefined ? Number(freezerTotalFee) : undefined,
        freezerProductAllocation: freezerProductAllocation !== undefined ? Number(freezerProductAllocation) : undefined,
        freezerProcessingFee: freezerProcessingFee !== undefined ? Number(freezerProcessingFee) : undefined,
        allowNegativeStock: allowNegativeStock !== undefined ? Boolean(allowNegativeStock) : undefined,
      },
      create: {
        id: 'SYSTEM_SETTINGS',
        dealerName: dealerName || 'Llano Selecta Dealer',
        address: address || 'Sayre Highway, Valencia City, Bukidnon',
        contactNumber: contactNumber || '0917-123-4567',
        receiptHeader: receiptHeader || 'Llano Selecta Authorized Dealer',
        defaultQuotaTarget: Number(defaultQuotaTarget) || 1000000.00,
        freezerTotalFee: Number(freezerTotalFee) || 10000.00,
        freezerProductAllocation: Number(freezerProductAllocation) || 9000.00,
        freezerProcessingFee: Number(freezerProcessingFee) || 1000.00,
        allowNegativeStock: Boolean(allowNegativeStock),
      },
    });

    await recordAudit('Update Settings', 'Settings', req.user?.name || 'Admin', { dealerName });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settings/audit-logs
router.get('/audit-logs', authenticateToken, requireRole('Admin'), async (_req, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
