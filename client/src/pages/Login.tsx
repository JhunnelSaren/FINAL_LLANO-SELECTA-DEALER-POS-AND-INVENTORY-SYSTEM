import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, Home, Store, Snowflake, Building2, HelpCircle, X, Check, ArrowRight, Mail, KeyRound, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type LoginSlide = {
  imageUrl: string;
  headline: string;
  description: string;
};

export type LoginPageConfig = {
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
  copyrightText?: string;
  footerAddress?: string;
  footerSubtext?: string;
  registerText: string;
  registerUrl: string;
  slides: LoginSlide[];
};

export const defaultLoginPage: LoginPageConfig = {
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
  copyrightText: '© 2026 Llano Selecta',
  footerAddress: 'Sayre Hwy, Valencia City, Bukidnon',
  footerSubtext: '',
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

function imagePath(path: string) {
  if (!path) return '/uploads/login-bg-modern.jpg';
  if (path.startsWith('/') || /^https?:\/\//i.test(path)) return path;
  return `/uploads/${path}`;
}

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginPage, setLoginPage] = useState<LoginPageConfig>(defaultLoginPage);
  const [activeSlide, setActiveSlide] = useState(0);

  // Modals for Forgot Password, Register & Quick Demo Access
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showQuickAccessModal, setShowQuickAccessModal] = useState(false);

  // Password Recovery Flow States
  const [forgotStep, setForgotStep] = useState<'email' | 'code' | 'newpass' | 'success'>('email');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySuccessMsg, setRecoverySuccessMsg] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);

  const resetRecoveryState = () => {
    setForgotStep('email');
    setRecoveryEmail(usernameOrEmail.includes('@') ? usernameOrEmail : '');
    setRecoveryCode('');
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setRecoveryLoading(false);
    setRecoveryError('');
    setRecoverySuccessMsg('');
    setMaskedEmail('');
    setDevCode(null);
  };

  const handleOpenForgot = () => {
    resetRecoveryState();
    setShowForgotModal(true);
  };

  const handleSendRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail.trim()) {
      setRecoveryError('Please enter your registered Gmail or email address.');
      return;
    }
    setRecoveryError('');
    setRecoveryLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send recovery code.');
      setMaskedEmail(data.maskedEmail || recoveryEmail);
      if (data.devCode) setDevCode(data.devCode);
      setRecoverySuccessMsg(data.message || 'Verification code sent to your email.');
      setForgotStep('code');
    } catch (err: any) {
      setRecoveryError(err.message || 'Failed to request recovery code.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryCode.trim()) {
      setRecoveryError('Please enter the 6-digit verification code.');
      return;
    }
    setRecoveryError('');
    setRecoveryLoading(true);
    try {
      const res = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail.trim(), code: recoveryCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification code is invalid or expired.');
      setRecoverySuccessMsg('Code verified. Set your new password below.');
      setForgotStep('newpass');
    } catch (err: any) {
      setRecoveryError(err.message || 'Verification failed.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      setRecoveryError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setRecoveryError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setRecoveryError('Passwords do not match.');
      return;
    }
    setRecoveryError('');
    setRecoveryLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: recoveryEmail.trim(),
          code: recoveryCode.trim(),
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password.');
      setRecoverySuccessMsg(data.message || 'Password reset successfully!');
      setForgotStep('success');
    } catch (err: any) {
      setRecoveryError(err.message || 'Failed to reset password.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleFinishRecovery = () => {
    setShowForgotModal(false);
    setUsernameOrEmail(recoveryEmail);
    setPassword('');
    setError('');
  };

  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings/login-page')
      .then((response) => (response.ok ? response.json() : null))
      .then((data: Partial<LoginPageConfig> | null) => {
        if (!data || cancelled) return;
        setLoginPage({
          ...defaultLoginPage,
          ...data,
          logoUrl: data.logoUrl || defaultLoginPage.logoUrl,
          slides: defaultLoginPage.slides.map((slide, index) => ({
            ...slide,
            ...(data.slides?.[index] || {}),
          })),
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Slide rotation timer
  useEffect(() => {
    if (loginPage.slides.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % loginPage.slides.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [loginPage.slides.length]);

  const currentSlide = loginPage.slides[activeSlide] || defaultLoginPage.slides[0];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!usernameOrEmail.trim() || !password.trim()) {
      setError('Please enter your email/username and password.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await login(usernameOrEmail.trim(), password, rememberMe);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = async (user: string, pass: string) => {
    setUsernameOrEmail(user);
    setPassword(pass);
    setShowQuickAccessModal(false);
    setIsLoading(true);
    setError('');
    try {
      await login(user, pass, rememberMe);
    } catch (err: any) {
      setError(err.message || 'Quick login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Render appropriate brand icon
  const renderBrandIcon = () => {
    if (loginPage.logoUrl) {
      return (
        <img
          src={imagePath(loginPage.logoUrl)}
          alt={loginPage.brandName}
          className="h-full w-full object-contain"
        />
      );
    }
    switch (loginPage.logoIcon) {
      case 'snowflake':
        return <Snowflake className="h-4 w-4 text-rose-700" />;
      case 'store':
        return <Store className="h-4 w-4 text-rose-700" />;
      case 'building':
        return <Building2 className="h-4 w-4 text-rose-700" />;
      case 'home':
      default:
        return <Home className="h-4 w-4 text-rose-700" />;
    }
  };

  // Button style matching the system / selected theme
  const getButtonBgClass = () => {
    if (loginPage.themeStyle === 'selecta-red') {
      return 'bg-rose-700 hover:bg-rose-800 shadow-rose-900/20';
    }
    if (loginPage.themeStyle === 'midnight-dark') {
      return 'bg-slate-900 hover:bg-slate-800 shadow-slate-950/30';
    }
    // Default brand color matches the dashboard's primary actions.
    return 'bg-rose-600 hover:bg-rose-700 shadow-rose-900/20';
  };

  return (
    <main className="relative isolate min-h-screen w-full overflow-hidden bg-slate-50 font-sans flex flex-col justify-between selection:bg-rose-600 selection:text-white">
      {/* 1. Fullscreen Background Image with Smooth Crossfade */}
      {loginPage.slides.map((slide, index) => {
        const isSelected = index === activeSlide;
        const bgUrl = slide.imageUrl ? imagePath(slide.imageUrl) : '/uploads/login-bg-modern.jpg';
        return (
          <div
            key={index}
            className={`absolute inset-0 z-0 transition-opacity duration-1000 ease-in-out ${
              isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
            }`}
            style={{ transitionProperty: 'opacity, transform' }}
          >
            <img
              src={bgUrl}
              alt="Login Background"
              className="h-full w-full object-cover object-center"
              onError={(e) => {
                // Graceful fallback to client public image
                if (e.currentTarget.src !== window.location.origin + '/login-bg-modern.jpg') {
                  e.currentTarget.src = '/login-bg-modern.jpg';
                }
              }}
            />
          </div>
        );
      })}

      {/* Soft dashboard palette keeps uploaded background photos subdued. */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-50/95 via-slate-50/85 to-rose-50/90 pointer-events-none" />

      {/* Main Container Layout */}
      <div className="relative z-10 flex min-h-screen w-full flex-col justify-between p-4 sm:p-8 lg:p-12">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div />
          <div />
        </div>

        {/* Content Row: Bottom Left Badge & Right Frosted Glass Modal */}
        <div className="my-auto flex flex-col lg:flex-row items-center lg:items-end justify-between gap-8 pt-6 pb-2">
          {/* LEFT BOTTOM FLOATING BADGE & CAROUSEL (Identical to Photo) */}
          <div className="w-full max-w-lg self-start lg:mb-4">
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-6 sm:p-7 shadow-sm transition-all duration-300">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight leading-snug text-slate-800">
                {currentSlide.headline || loginPage.badgeHeadline}
              </h2>
              <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-slate-500 font-normal">
                {currentSlide.description || loginPage.badgeDescription}
              </p>
            </div>

            {/* Carousel Navigation Indicators (Pill + Dots matching photo) */}
            <div className="mt-5 flex items-center gap-2.5" aria-label="Slide indicators">
              {loginPage.slides.map((_, index) => {
                const isActive = index === activeSlide;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setActiveSlide(index)}
                    aria-label={`View slide ${index + 1}`}
                    className={`transition-all duration-300 ${
                      isActive
                        ? 'h-2.5 w-14 rounded-full bg-rose-600 shadow-sm'
                        : 'h-2.5 w-2.5 rounded-full bg-rose-200 hover:bg-rose-400 hover:scale-125'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* RIGHT SIDE: LIQUID FROSTED GLASS LOGIN CARD (Identical to Photo) */}
          <div className="w-full max-w-[460px] sm:max-w-[480px] lg:max-w-[490px] self-center lg:self-center">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-7 sm:p-10 shadow-sm transition-all duration-300">
              
              {/* Brand Pill Badge at the top */}
              <div className="mb-6 flex justify-center">
                <div className="inline-flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
                  <div className="flex h-10 w-12 items-center justify-center overflow-hidden rounded-lg bg-white p-1">
                    {renderBrandIcon()}
                  </div>
                  <span className="font-black text-sm uppercase tracking-tight text-slate-900">
                    {loginPage.brandName}
                  </span>
                  <span className="rounded border border-rose-200/80 bg-rose-50 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wider text-rose-700">
                    POS
                  </span>
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="mb-7 text-center">
                <h1 className="font-sans text-3xl sm:text-[2.2rem] font-black leading-tight tracking-tight text-slate-800">
                  {loginPage.welcomeTitle}
                </h1>
                <p className="mt-2 text-xs sm:text-sm font-medium text-slate-600">
                  {loginPage.welcomeSubtitle}
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 rounded-xl border border-rose-300/80 bg-rose-50/90 p-3 text-xs text-rose-800 shadow-sm backdrop-blur-sm"
                  >
                    <span className="font-bold">!</span>
                    <span>{error}</span>
                  </div>
                )}

                {/* Email / Username Input */}
                <div>
                  <label
                    htmlFor="email-input"
                    className="mb-1.5 block text-xs font-semibold text-slate-800"
                  >
                    {loginPage.emailLabel}
                  </label>
                  <input
                    id="email-input"
                    type="text"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    placeholder={loginPage.emailPlaceholder}
                    disabled={isLoading}
                    autoComplete="username"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/15"
                  />
                </div>

                {/* Password Input */}
                <div>
                  <label
                    htmlFor="password-input"
                    className="mb-1.5 block text-xs font-semibold text-slate-800"
                  >
                    {loginPage.passwordLabel}
                  </label>
                  <div className="relative">
                    <input
                      id="password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={loginPage.passwordPlaceholder}
                      disabled={isLoading}
                      autoComplete="current-password"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-11 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/15"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-600 hover:text-slate-900 transition"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password Row */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500/20 cursor-pointer"
                    />
                    <span>{loginPage.rememberMeText}</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleOpenForgot}
                    className="font-medium text-rose-700 hover:text-rose-800 hover:underline transition"
                  >
                    {loginPage.forgotPasswordText}
                  </button>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full rounded-xl py-3.5 px-4 text-sm font-semibold text-white shadow-lg active:scale-[0.99] transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer ${getButtonBgClass()}`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <span>{loginPage.loginButtonText}</span>
                    </>
                  )}
                </button>

                {/* Optional quick demo access */}
                {loginPage.showSocialButtons && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowQuickAccessModal(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.98] cursor-pointer"
                    >
                      <HelpCircle className="h-4 w-4 text-rose-600" />
                      <span className="truncate">Quick demo access</span>
                    </button>
                  </div>
                )}
              </form>

              {/* Bottom Register Link */}
              <div className="mt-7 text-center text-xs text-slate-600 font-medium">
                <span>{loginPage.footerText} </span>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(true)}
                  className="font-semibold text-rose-700 hover:text-rose-800 hover:underline transition ml-1"
                >
                  {loginPage.registerText}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer / Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2 pt-4 border-t border-slate-200">
          <p>{loginPage.copyrightText || `© 2026 ${loginPage.brandName}`}</p>
          <div className="text-center sm:text-right">
            <span>{loginPage.footerAddress || 'Sayre Hwy, Valencia City, Bukidnon'}</span>
            {loginPage.footerSubtext && (
              <p className="text-[10px] text-slate-400 mt-0.5">{loginPage.footerSubtext}</p>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: Password Recovery via Gmail / Email */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-[fadeIn_.2s_ease-out]">
          <div className="w-full max-w-md rounded-2xl border border-white/40 bg-white/95 p-6 sm:p-7 shadow-2xl backdrop-blur-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">Password Recovery</h3>
                  <p className="text-[11px] text-slate-500">Recover using your registered Gmail or email</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Step Progress Pills */}
            <div className="my-4 flex items-center justify-between gap-1 text-[11px] font-semibold text-slate-400 border-b border-slate-100 pb-3">
              <span className={`flex items-center gap-1 ${forgotStep === 'email' ? 'text-rose-600 font-bold' : ''}`}>
                1. Email
              </span>
              <span>&rarr;</span>
              <span className={`flex items-center gap-1 ${forgotStep === 'code' ? 'text-rose-600 font-bold' : ''}`}>
                2. Verify Code
              </span>
              <span>&rarr;</span>
              <span className={`flex items-center gap-1 ${forgotStep === 'newpass' ? 'text-rose-600 font-bold' : ''}`}>
                3. New Password
              </span>
            </div>

            {/* Error & Info Alerts */}
            {recoveryError && (
              <div role="alert" className="mb-3.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                {recoveryError}
              </div>
            )}
            {recoverySuccessMsg && forgotStep !== 'success' && (
              <div className="mb-3.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                {recoverySuccessMsg}
              </div>
            )}

            {/* STEP 1: Enter Email / Gmail */}
            {forgotStep === 'email' && (
              <form onSubmit={handleSendRecoveryCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Your Gmail or Registered Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      autoFocus
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="e.g. staff@selecta.com or username"
                      disabled={recoveryLoading}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    We will dispatch a 6-digit verification code to this address for secure account recovery.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={recoveryLoading}
                    className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-semibold text-white hover:bg-rose-700 transition disabled:opacity-60 flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20"
                  >
                    {recoveryLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Sending Code...</span>
                      </>
                    ) : (
                      <span>Send Recovery Code &rarr;</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Enter 6-digit Code */}
            {forgotStep === 'code' && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Enter 6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={6}
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    disabled={recoveryLoading}
                    className="w-full text-center tracking-[0.4em] font-mono text-2xl font-black rounded-xl border border-slate-300 bg-white py-3 text-slate-800 placeholder:text-slate-300 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Check your Gmail inbox or spam folder for the code sent to <strong>{maskedEmail}</strong>.
                  </p>
                  {devCode && (
                    <div className="mt-2 text-center">
                      <button
                        type="button"
                        onClick={() => setRecoveryCode(devCode)}
                        className="inline-flex items-center gap-1 text-[11px] bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-2.5 py-1 font-mono font-semibold hover:bg-amber-100 transition cursor-pointer"
                      >
                        Demo/Offline Code: <strong className="underline">{devCode}</strong> (Click to auto-fill)
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setForgotStep('email')}
                    className="text-slate-500 hover:text-slate-800 transition"
                  >
                    &larr; Change Email
                  </button>
                  <button
                    type="button"
                    onClick={handleSendRecoveryCode}
                    disabled={recoveryLoading}
                    className="font-medium text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" /> Resend Code
                  </button>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={recoveryLoading || recoveryCode.length < 6}
                    className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-semibold text-white hover:bg-rose-700 transition disabled:opacity-60 flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20"
                  >
                    {recoveryLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <span>Verify Code &rarr;</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Enter New Password */}
            {forgotStep === 'newpass' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      autoFocus
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter minimum 6 characters"
                      disabled={recoveryLoading}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    disabled={recoveryLoading}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={recoveryLoading || !newPassword || newPassword !== confirmPassword}
                    className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-semibold text-white hover:bg-rose-700 transition disabled:opacity-60 flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20"
                  >
                    {recoveryLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <span>Reset Password</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 4: Success confirmation */}
            {forgotStep === 'success' && (
              <div className="text-center py-4 space-y-3">
                <div className="flex justify-center">
                  <CheckCircle2 className="h-14 w-14 text-emerald-500 animate-bounce" />
                </div>
                <h4 className="text-lg font-bold text-slate-900">Password Reset Complete!</h4>
                <p className="text-xs text-slate-600 max-w-xs mx-auto">
                  Your account password has been updated. You can now log in using your new credentials.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleFinishRecovery}
                    className="w-full rounded-xl bg-rose-600 py-3 text-xs font-bold text-white hover:bg-rose-700 transition shadow-lg shadow-rose-600/20"
                  >
                    Sign In Now &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: Register Staff / Customer */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-[fadeIn_.2s_ease-out]">
          <div className="w-full max-w-md rounded-2xl border border-white/30 bg-white/95 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Staff Account Registration</h3>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 py-4 text-sm text-slate-600">
              <p>Authorized personnel accounts (Cashier, Bodega, Delivery Driver, Supervisor) are provisioned through the Dealership Admin portal.</p>
              <p className="text-xs text-slate-500">
                If you are a store owner or authorized retailer applying for a Selecta freezer, please contact our Valencia central hub directly.
              </p>
            </div>
            <div className="flex justify-end items-center pt-2">
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-rose-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Quick Demo / 1-Click Role Access */}
      {showQuickAccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-[fadeIn_.2s_ease-out]">
          <div className="w-full max-w-md rounded-2xl border border-white/30 bg-white/95 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Quick 1-Click Demo Login</h3>
              <button
                type="button"
                onClick={() => setShowQuickAccessModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="py-3 text-xs text-slate-500">
              Select an authorized account below to automatically fill credentials and sign in:
            </p>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleQuickDemo('admin', 'admin123')}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-slate-400 hover:shadow-sm"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">Dealer Admin (Owner)</p>
                  <p className="text-xs text-slate-500">Username: admin · Full system control</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('staff', 'staff123')}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-slate-400 hover:shadow-sm"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">Cashier &amp; POS Staff</p>
                  <p className="text-xs text-slate-500">Username: staff · Bookings, invoices &amp; pos</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Login;
