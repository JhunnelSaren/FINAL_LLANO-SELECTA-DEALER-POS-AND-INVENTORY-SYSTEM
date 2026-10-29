import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, Home, Store, Snowflake, Building2, HelpCircle, X, Check, ArrowRight } from 'lucide-react';
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
  registerText: string;
  registerUrl: string;
  slides: LoginSlide[];
};

export const defaultLoginPage: LoginPageConfig = {
  brandName: 'Llano Selecta',
  welcomeTitle: 'Welcome Back to Llano Selecta',
  welcomeSubtitle: 'Sign in your account',
  logoUrl: '/llano-selecta-logo.png',
  logoIcon: 'home',
  emailLabel: 'Your Email',
  emailPlaceholder: 'Enter your email id here',
  passwordLabel: 'Password',
  passwordPlaceholder: 'Enter your password here',
  loginButtonText: 'Login',
  rememberMeText: 'Remember me',
  forgotPasswordText: 'Forgot Password?',
  badgeHeadline: 'Because Stays Should Feel Like Destinations',
  badgeDescription: 'Find a perfect stay for you much awaited vacation!',
  themeStyle: 'modern-glass',
  showSocialButtons: true,
  socialGoogleText: 'Continue with Google',
  socialAppleText: 'Continue with Apple',
  footerText: "Don't have an account?",
  registerText: 'Register',
  registerUrl: '#register',
  slides: [
    {
      imageUrl: '/uploads/login-bg-modern.jpg',
      headline: 'Because Stays Should Feel Like Destinations',
      description: 'Find a perfect stay for you much awaited vacation!',
    },
    {
      imageUrl: '/uploads/login-bg-modern.jpg',
      headline: 'Llano Selecta Dealer & Cold Chain',
      description: 'Reliable cold-chain ice cream distribution across Valencia, Cabanglasan & San Fernando.',
    },
    {
      imageUrl: '/uploads/login-bg-modern.jpg',
      headline: 'Flawless Real-Time Inventory & Freezers',
      description: 'Complete stock traceability, route deliveries, and instant offline/online transactions.',
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
      await login(usernameOrEmail.trim(), password);
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
      await login(user, pass);
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
        return <Snowflake className="h-4 w-4 text-white" />;
      case 'store':
        return <Store className="h-4 w-4 text-white" />;
      case 'building':
        return <Building2 className="h-4 w-4 text-white" />;
      case 'home':
      default:
        return <Home className="h-4 w-4 text-white" />;
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
    // Default: 'modern-glass' -> sleek black pill button matching the photo
    return 'bg-slate-950 hover:bg-black shadow-black/25';
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-slate-950 font-sans flex flex-col justify-between selection:bg-slate-900 selection:text-white">
      {/* 1. Fullscreen Background Image with Smooth Crossfade */}
      {loginPage.slides.map((slide, index) => {
        const isSelected = index === activeSlide;
        const bgUrl = slide.imageUrl ? imagePath(slide.imageUrl) : '/uploads/login-bg-modern.jpg';
        return (
          <div
            key={index}
            className={`absolute inset-0 -z-30 transition-opacity duration-1000 ease-in-out ${
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

      {/* Subtle Ambient Vignette / Lighting Overlay for high contrast */}
      <div className="absolute inset-0 -z-20 bg-gradient-to-r from-black/25 via-transparent to-black/10 pointer-events-none" />

      {/* Main Container Layout */}
      <div className="relative z-10 flex min-h-screen w-full flex-col justify-between p-4 sm:p-8 lg:p-12">
        {/* Top bar (Optional small status/time or dealer banner) */}
        <div className="flex items-center justify-between">
          <div />
          <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-4 py-1.5 text-[11px] font-medium text-white/90 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            System Live · Online &amp; Offline Ready
          </div>
        </div>

        {/* Content Row: Bottom Left Badge & Right Frosted Glass Modal */}
        <div className="my-auto flex flex-col lg:flex-row items-center lg:items-end justify-between gap-8 pt-6 pb-2">
          {/* LEFT BOTTOM FLOATING BADGE & CAROUSEL (Identical to Photo) */}
          <div className="w-full max-w-lg self-start lg:mb-4">
            <div className="rounded-2xl border border-white/25 bg-black/35 p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl text-white transition-all duration-300">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight leading-snug text-white">
                {currentSlide.headline || loginPage.badgeHeadline}
              </h2>
              <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-white/80 font-normal">
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
                        ? 'h-2.5 w-14 rounded-full bg-white shadow-sm'
                        : 'h-2.5 w-2.5 rounded-full bg-white/60 hover:bg-white hover:scale-125'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* RIGHT SIDE: LIQUID FROSTED GLASS LOGIN CARD (Identical to Photo) */}
          <div className="w-full max-w-[460px] sm:max-w-[480px] lg:max-w-[490px] self-center lg:self-center">
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/50 bg-white/35 p-7 sm:p-10 shadow-[0_30px_90px_rgba(0,0,0,0.35)] backdrop-blur-2xl transition-all duration-300">
              
              {/* Brand Pill Badge at the top */}
              <div className="mb-6 flex justify-center">
                <div className="inline-flex items-center gap-2.5 rounded-full bg-slate-950 px-5 py-2 text-white shadow-lg shadow-black/20">
                  <div className="flex h-10 w-14 items-center justify-center overflow-hidden rounded-lg bg-white p-1">
                    {renderBrandIcon()}
                  </div>
                  <span className="font-serif italic text-sm tracking-wide font-normal">
                    {loginPage.brandName}
                  </span>
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="mb-7 text-center">
                <h1 className="font-serif text-3xl sm:text-[2.2rem] font-normal leading-tight tracking-tight text-slate-900">
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
                    className="w-full rounded-xl border border-slate-700/60 bg-white/45 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 backdrop-blur-sm transition focus:border-slate-950 focus:bg-white/60 focus:outline-none focus:ring-2 focus:ring-slate-950/15"
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
                      className="w-full rounded-xl border border-slate-700/60 bg-white/45 px-4 py-3 pr-11 text-sm text-slate-900 placeholder:text-slate-500 backdrop-blur-sm transition focus:border-slate-950 focus:bg-white/60 focus:outline-none focus:ring-2 focus:ring-slate-950/15"
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
                      className="h-4 w-4 rounded border-slate-500 text-slate-950 focus:ring-slate-950/20 cursor-pointer"
                    />
                    <span>{loginPage.rememberMeText}</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="font-medium text-slate-700 hover:text-slate-950 hover:underline transition"
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

                {/* Social Logins: Google & Apple (Matching Photo) */}
                {loginPage.showSocialButtons && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {/* Google Button */}
                    <button
                      type="button"
                      onClick={() => setShowQuickAccessModal(true)}
                      className="flex items-center justify-center gap-2 rounded-xl border border-slate-300/80 bg-white/50 px-3 py-2.5 text-xs font-semibold text-slate-800 shadow-sm backdrop-blur-sm transition hover:bg-white/80 active:scale-[0.98] cursor-pointer"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.13z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                        />
                      </svg>
                      <span className="truncate">{loginPage.socialGoogleText}</span>
                    </button>

                    {/* Apple Button */}
                    <button
                      type="button"
                      onClick={() => setShowQuickAccessModal(true)}
                      className="flex items-center justify-center gap-2 rounded-xl border border-slate-300/80 bg-white/50 px-3 py-2.5 text-xs font-semibold text-slate-800 shadow-sm backdrop-blur-sm transition hover:bg-white/80 active:scale-[0.98] cursor-pointer"
                    >
                      <svg className="h-4 w-4 fill-slate-900" viewBox="0 0 24 24">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.76 1.04-1.82.93-2.88-.9.04-2 .6-2.65 1.36-.57.66-.99 1.74-.86 2.78 1.01.08 2.03-.5 2.58-1.26z" />
                      </svg>
                      <span className="truncate">{loginPage.socialAppleText}</span>
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
                  className="font-semibold text-blue-600 hover:text-blue-800 hover:underline transition ml-1"
                >
                  {loginPage.registerText}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer / Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-white/60 gap-2 pt-4 border-t border-white/10">
          <p>© {new Date().getFullYear()} {loginPage.brandName} · Llano Dealer Operations</p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowQuickAccessModal(true)}
              className="text-white/80 hover:text-white underline transition"
            >
              Demo Staff Access
            </button>
            <span>·</span>
            <span>Sayre Hwy, Valencia City, Bukidnon</span>
          </div>
        </div>
      </div>

      {/* MODAL 1: Forgot Password */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-[fadeIn_.2s_ease-out]">
          <div className="w-full max-w-md rounded-2xl border border-white/30 bg-white/95 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Reset Your Password</h3>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 py-4 text-sm text-slate-600">
              <p>For security, dealer access passwords are authenticated by the Dealership Administrator.</p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1">
                <p className="text-xs font-semibold text-slate-800">Dealer Admin Contact:</p>
                <p className="text-xs text-slate-600">Sayre Highway, Valencia City, Bukidnon</p>
                <p className="text-xs text-slate-600">Mobile: 0917-123-4567 / 0917-000-0001</p>
                <p className="text-xs text-slate-600">Email: admin@selecta.com</p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white hover:bg-black transition"
              >
                Got it
              </button>
            </div>
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
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRegisterModal(false);
                  setShowQuickAccessModal(true);
                }}
                className="text-xs font-medium text-rose-700 hover:underline"
              >
                Use Quick Demo
              </button>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white hover:bg-black transition"
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
