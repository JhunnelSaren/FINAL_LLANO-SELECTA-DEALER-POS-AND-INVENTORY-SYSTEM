import React, { useState, useEffect, useCallback } from 'react';
import {
  Store,
  Users,
  Shield,
  History,
  Save,
  Plus,
  Key,
  CheckCircle,
  AlertCircle,
  Package,
  Image as ImageIcon,
  Upload,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { apiRequest } from '../utils/api';
import { formatDateTime } from '../utils/formatters';

type SettingsSection = 'profile' | 'login' | 'products' | 'staff' | 'audit';

type LoginPageSlide = { imageUrl: string; headline: string; description: string };
type LoginPageConfig = {
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
  slides: LoginPageSlide[];
};

const defaultLoginPage: LoginPageConfig = {
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
      description: 'Fast, reliable ice cream distribution across Valencia, Cabanglasan & San Fernando.',
    },
    {
      imageUrl: '/uploads/login-bg-modern.jpg',
      headline: 'Flawless Real-Time Inventory & Freezers',
      description: 'Complete stock traceability, instant invoices, and route reconciliation.',
    },
  ],
};

export default function Settings() {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');

  // Dealership Settings State
  const [settings, setSettings] = useState<{ [key: string]: any }>({
    dealerName: 'Llano Selecta Dealer',
    address: 'Sayre Highway, Poblacion, Valencia City, Bukidnon',
    contactNumber: '0917-555-4321 / (088) 828-5555',
    receiptHeader: 'LLANO ICE CREAM DEALERSHIP - VALENCIA CITY',
    defaultQuotaTarget: 1000000,
    freezerTotalFee: 10000,
    freezerProductAllocation: 9000,
    freezerProcessingFee: 1000,
    allowNegativeStock: false,
  });
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [loginPage, setLoginPage] = useState<LoginPageConfig>(defaultLoginPage);
  const [savingLoginPage, setSavingLoginPage] = useState(false);
  const [uploadingLoginAsset, setUploadingLoginAsset] = useState<string | null>(null);

  // Products State
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    category: 'CORNETTO',
    flavor: '',
    newFlavor: '',
    dealerPrice: 0,
    sellingPrice: 0,
    srp: 0,
    minStock: 10,
    unit: 'Pieces',
  });

  // Staff State
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [staffForm, setStaffForm] = useState({
    username: '',
    name: '',
    email: '',
    role: 'Staff',
    password: '',
    status: 'Active',
  });
  const [newPassword, setNewPassword] = useState('');

  // Audit Log State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Load Settings
  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const data = await apiRequest<any>('/settings');
      if (data && typeof data === 'object') {
        setSettings((prev) => ({ ...prev, ...data }));
      }
    } catch {
      // Default to seeded values if error
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  const loadLoginPage = useCallback(async () => {
    try {
      const data = await apiRequest<Partial<LoginPageConfig>>('/settings/login-page');
      setLoginPage({ ...defaultLoginPage, ...data, slides: defaultLoginPage.slides.map((slide, index) => ({ ...slide, ...(data.slides?.[index] || {}) })) });
    } catch (err: any) {
      showToast(err.message || 'Could not load login page content', 'error');
    }
  }, [showToast]);

  // Load Products
  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const data = await apiRequest<any>('/products');
      setProducts(Array.isArray(data) ? data : data.products || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load products', 'error');
    } finally {
      setLoadingProducts(false);
    }
  }, [showToast]);

  // Load Staff
  const loadStaff = useCallback(async () => {
    setLoadingStaff(true);
    try {
      const data = await apiRequest<any>('/users');
      setStaffList(Array.isArray(data) ? data : data.users || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load staff list', 'error');
    } finally {
      setLoadingStaff(false);
    }
  }, [showToast]);

  // Load Audit Logs
  const loadAuditLogs = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const data = await apiRequest<any>('/settings/audit-logs');
      setAuditLogs(Array.isArray(data) ? data : data.entries || []);
    } catch {
      // ignore
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'profile') {
      loadSettings();
    } else if (activeSection === 'login') {
      loadLoginPage();
    } else if (activeSection === 'products') {
      loadProducts();
    } else if (activeSection === 'staff') {
      loadStaff();
    } else if (activeSection === 'audit') {
      loadAuditLogs();
    }
  }, [activeSection, loadSettings, loadLoginPage, loadProducts, loadStaff, loadAuditLogs]);

  // Save Settings handler
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Admin privilege required to update settings', 'warning');
      return;
    }
    setSavingSettings(true);
    try {
      await apiRequest('/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      showToast('Settings saved successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveLoginPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSavingLoginPage(true);
    try {
      const saved = await apiRequest<LoginPageConfig>('/settings/login-page', {
        method: 'PUT',
        body: JSON.stringify(loginPage),
      });
      setLoginPage(saved);
      showToast('Login page updated', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not save login page', 'error');
    } finally {
      setSavingLoginPage(false);
    }
  };

  const uploadLoginAsset = async (file: File, target: 'logo' | number) => {
    setUploadingLoginAsset(String(target));
    try {
      const body = new FormData();
      body.append('file', file);
      const result = await apiRequest<{ imageUrl: string }>('/settings/login-page/upload', { method: 'POST', body });
      const updatedLoginPage = target === 'logo'
        ? { ...loginPage, logoUrl: result.imageUrl }
        : { ...loginPage, slides: loginPage.slides.map((slide, index) => index === target ? { ...slide, imageUrl: result.imageUrl } : slide) };
      setLoginPage(updatedLoginPage);
      const saved = await apiRequest<LoginPageConfig>('/settings/login-page', {
        method: 'PUT',
        body: JSON.stringify(updatedLoginPage),
      });
      setLoginPage(saved);
      showToast(target === 'logo' ? 'Logo uploaded and published.' : 'Login photo replaced and published.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Image upload failed', 'error');
    } finally {
      setUploadingLoginAsset(null);
    }
  };

  // Save Product handler
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Admin privilege required', 'warning');
      return;
    }
    try {
      const { newFlavor, ...catalogFields } = productForm;
      const productData = {
        ...catalogFields,
        flavor: productForm.flavor === '__new__' ? newFlavor.trim() : productForm.flavor,
      };
      if (productForm.flavor === '__new__' && !newFlavor.trim()) {
        showToast('Enter the new product flavor or variant', 'error');
        return;
      }
      if (editingProduct) {
        await apiRequest(`/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(productData),
        });
        showToast('Product updated successfully', 'success');
      } else {
        await apiRequest('/products', {
          method: 'POST',
          body: JSON.stringify(productData),
        });
        showToast('Product added successfully', 'success');
      }
      setShowProductModal(false);
      setEditingProduct(null);
      loadProducts();
    } catch (err: any) {
      showToast(err.message || 'Failed to save product', 'error');
    }
  };

  // Save Staff handler
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Admin privilege required', 'warning');
      return;
    }
    try {
      await apiRequest(editingStaff ? `/users/${editingStaff.id}` : '/users', {
        method: editingStaff ? 'PUT' : 'POST',
        body: JSON.stringify({ ...staffForm, password: staffForm.password.trim() || undefined }),
      });
      showToast(editingStaff ? 'User account updated' : 'User account added', 'success');
      setShowStaffModal(false);
      setEditingStaff(null);
      setStaffForm({ username: '', name: '', email: '', role: 'Staff', password: '', status: 'Active' });
      loadStaff();
    } catch (err: any) {
      showToast(err.message || 'Failed to add staff', 'error');
    }
  };

  // Change Password handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !newPassword.trim()) return;
    try {
      await apiRequest(`/users/${selectedStaff.id}`, {
        method: 'PUT',
        body: JSON.stringify({ password: newPassword.trim() }),
      });
      showToast(`Password updated for ${selectedStaff.name}`, 'success');
      setShowPasswordModal(false);
      setNewPassword('');
      setSelectedStaff(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to change password', 'error');
    }
  };

  const setStaffAccess = async (member: any) => {
    try {
      const status = member.status === 'Active' ? 'Inactive' : 'Active';
      await apiRequest(`/users/${member.id}`, { method: 'PUT', body: JSON.stringify({ status }) });
      showToast(status === 'Active' ? 'Account access allowed' : 'Account access stopped', 'success');
      loadStaff();
    } catch (err: any) {
      showToast(err.message || 'Unable to change account access', 'error');
    }
  };

  const deleteStaff = async (member: any) => {
    if (!window.confirm(`Delete the account for ${member.name}?`)) return;
    try {
      await apiRequest(`/users/${member.id}`, { method: 'DELETE' });
      showToast('User account deleted', 'success');
      loadStaff();
    } catch (err: any) {
      showToast(err.message || 'Unable to delete account', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">System & Dealership Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure dealership profile, staff accounts, and product catalog
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isAdmin ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
            Role: {user?.role || 'Staff'}
          </span>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Nav */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 space-y-1.5 h-fit">
          <button
            onClick={() => setActiveSection('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeSection === 'profile'
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Store className="w-4 h-4 text-rose-600" />
            Dealership Profile
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveSection('login')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeSection === 'login'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ImageIcon className="w-4 h-4 text-rose-600" />
              Login Page
            </button>
          )}

          <button
            onClick={() => setActiveSection('products')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeSection === 'products'
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Package className="w-4 h-4 text-amber-600" />
            Product Catalog
          </button>

          <button
            onClick={() => setActiveSection('staff')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeSection === 'staff'
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-600" />
            Staff Accounts
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveSection('audit')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeSection === 'audit'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <History className="w-4 h-4 text-purple-600" />
              Audit Logs
            </button>
          )}
        </div>

        {/* Section Content */}
        <div className="lg:col-span-3">
          {/* PROFILE SECTION */}
          {activeSection === 'profile' && (
            <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Dealership Information</h2>
                  <p className="text-xs text-slate-500">Official business profile appearing on invoices, receipts, and order sheets</p>
                </div>
                {isAdmin && (
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {savingSettings ? 'Saving...' : 'Save Changes'}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Dealership Name</label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={settings.dealerName || ''}
                    onChange={(e) => setSettings({ ...settings, dealerName: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Numbers</label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={settings.contactNumber || ''}
                    onChange={(e) => setSettings({ ...settings, contactNumber: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Official Address / Sayre Highway Location</label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={settings.address || ''}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Receipt Printed Header Banner</label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={settings.receiptHeader || ''}
                    onChange={(e) => setSettings({ ...settings, receiptHeader: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Freezer Deployment Program Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Total Package Fee (₱)</label>
                    <input
                      type="number"
                      disabled={!isAdmin}
                      value={settings.freezerTotalFee || 10000}
                      onChange={(e) => setSettings({ ...settings, freezerTotalFee: parseFloat(e.target.value) || 0 })}
                      className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Product Allocation (₱)</label>
                    <input
                      type="number"
                      disabled={!isAdmin}
                      value={settings.freezerProductAllocation || 9000}
                      onChange={(e) => setSettings({ ...settings, freezerProductAllocation: parseFloat(e.target.value) || 0 })}
                      className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Processing Fee (₱)</label>
                    <input
                      type="number"
                      disabled={!isAdmin}
                      value={settings.freezerProcessingFee || 1000}
                      onChange={(e) => setSettings({ ...settings, freezerProcessingFee: parseFloat(e.target.value) || 0 })}
                      className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>
              </div>
            </form>
          )}

          {activeSection === 'login' && isAdmin && (
            <form onSubmit={handleSaveLoginPage} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Sign-in page branding</h2>
                  <p className="text-xs text-slate-500 mt-1">Change the logo, welcome text, and up to three rotating background photos.</p>
                </div>
                <button
                  type="submit"
                  disabled={savingLoginPage || uploadingLoginAsset !== null}
                  className="flex shrink-0 items-center justify-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {savingLoginPage ? 'Saving...' : 'Save Login Page'}
                </button>
              </div>

              {/* BRANDING & LOGO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-950 text-white shadow-md">
                    {loginPage.logoUrl ? (
                      <img src={loginPage.logoUrl} alt="Logo preview" className="h-full w-full object-contain p-1" />
                    ) : (
                      <span className="font-serif italic text-lg font-bold">
                        {loginPage.brandName.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">Brand Logo / Pill Icon</p>
                    <p className="text-xs text-slate-500 mt-0.5">Upload a transparent PNG, JPEG, or WebP logo (up to 8 MB), or choose a built-in icon.</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm">
                        <Upload className="h-3.5 w-3.5" />
                        {uploadingLoginAsset === 'logo' ? 'Uploading...' : 'Upload custom logo'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="sr-only"
                          disabled={uploadingLoginAsset !== null}
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0];
                            if (file) void uploadLoginAsset(file, 'logo');
                            event.currentTarget.value = '';
                          }}
                        />
                      </label>
                      {loginPage.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setLoginPage((current) => ({ ...current, logoUrl: '' }))}
                          className="text-xs font-medium text-rose-700 hover:underline"
                        >
                          Remove custom logo
                        </button>
                      )}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500">Built-in icon:</span>
                        <select
                          value={loginPage.logoIcon}
                          onChange={(e) => setLoginPage({ ...loginPage, logoIcon: e.target.value })}
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs focus:ring-2 focus:ring-rose-500"
                        >
                          <option value="home">Home / Villa</option>
                          <option value="store">Store / Retailer</option>
                          <option value="snowflake">Snowflake (Selecta)</option>
                          <option value="building">Building / Corporate</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Brand Name</label>
                  <input
                    maxLength={80}
                    value={loginPage.brandName}
                    onChange={(event) => setLoginPage({ ...loginPage, brandName: event.target.value })}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="e.g. Serenique or Llano Selecta Dealer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Theme Palette / Style</label>
                  <select
                    value={loginPage.themeStyle}
                    onChange={(event) => setLoginPage({ ...loginPage, themeStyle: event.target.value })}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                  >
                    <option value="modern-glass">Onyx Modern Glass (Exact match to Photo)</option>
                    <option value="selecta-red">Selecta Dealer Crimson</option>
                    <option value="midnight-dark">Midnight Slate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Welcome Heading (Large Serif)</label>
                  <input
                    maxLength={100}
                    value={loginPage.welcomeTitle}
                    onChange={(event) => setLoginPage({ ...loginPage, welcomeTitle: event.target.value })}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-serif"
                    placeholder="e.g. Welcome Back to Serenique"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Welcome Subheading</label>
                  <input
                    maxLength={180}
                    value={loginPage.welcomeSubtitle}
                    onChange={(event) => setLoginPage({ ...loginPage, welcomeSubtitle: event.target.value })}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="e.g. Sign in your account"
                  />
                </div>
              </div>

              {/* FORM LABELS & BUTTONS */}
              <div className="border-t pt-5">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Login Form Labels &amp; Text</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Email Input Label</label>
                    <input
                      value={loginPage.emailLabel}
                      onChange={(e) => setLoginPage({ ...loginPage, emailLabel: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Email Placeholder</label>
                    <input
                      value={loginPage.emailPlaceholder}
                      onChange={(e) => setLoginPage({ ...loginPage, emailPlaceholder: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Login Button Text</label>
                    <input
                      value={loginPage.loginButtonText}
                      onChange={(e) => setLoginPage({ ...loginPage, loginButtonText: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Password Label</label>
                    <input
                      value={loginPage.passwordLabel}
                      onChange={(e) => setLoginPage({ ...loginPage, passwordLabel: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Password Placeholder</label>
                    <input
                      value={loginPage.passwordPlaceholder}
                      onChange={(e) => setLoginPage({ ...loginPage, passwordPlaceholder: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Forgot Password Link</label>
                    <input
                      value={loginPage.forgotPasswordText}
                      onChange={(e) => setLoginPage({ ...loginPage, forgotPasswordText: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-6 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={loginPage.showSocialButtons}
                      onChange={(e) => setLoginPage({ ...loginPage, showSocialButtons: e.target.checked })}
                      className="rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span className="font-semibold">Show Google &amp; Apple Action Buttons</span>
                  </label>
                </div>
              </div>

              {/* FLOATING BADGE & SLIDES */}
              <div className="border-t pt-5 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Fullscreen Rotating Photos &amp; Glass Badge</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Upload your high-definition architecture, dealership, freezer, or fleet photos. The glass card on the bottom-left will display the corresponding headline and description.
                  </p>
                </div>

                {loginPage.slides.map((slide, index) => (
                  <div key={index} className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4 rounded-xl border border-slate-200 p-4 bg-white shadow-sm">
                    <div className="relative flex min-h-36 items-center justify-center overflow-hidden rounded-xl bg-slate-900 border border-slate-200">
                      {slide.imageUrl ? (
                        <img
                          src={slide.imageUrl.startsWith('/') || slide.imageUrl.startsWith('http') ? slide.imageUrl : `/uploads/${slide.imageUrl}`}
                          alt={`Slide ${index + 1} preview`}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="relative h-8 w-8 text-white/50" />
                      )}
                      <label className="absolute bottom-2 left-2 right-2 inline-flex cursor-pointer items-center justify-center gap-1 rounded-md bg-white/95 px-2 py-1.5 text-[11px] font-bold text-slate-700 shadow hover:bg-white transition">
                        <Upload className="h-3.5 w-3.5" />
                        {uploadingLoginAsset === String(index) ? 'Uploading...' : slide.imageUrl ? 'Replace Photo' : 'Upload Photo'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="sr-only"
                          disabled={uploadingLoginAsset !== null}
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0];
                            if (file) void uploadLoginAsset(file, index);
                            event.currentTarget.value = '';
                          }}
                        />
                      </label>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Slide {index + 1} Badge Headline
                        </label>
                        <input
                          maxLength={120}
                          value={slide.headline}
                          onChange={(event) =>
                            setLoginPage((current) => ({
                              ...current,
                              slides: current.slides.map((item, i) =>
                                i === index ? { ...item, headline: event.target.value } : item
                              ),
                            }))
                          }
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Slide {index + 1} Badge Description
                        </label>
                        <textarea
                          rows={2}
                          maxLength={180}
                          value={slide.description}
                          onChange={(event) =>
                            setLoginPage((current) => ({
                              ...current,
                              slides: current.slides.map((item, i) =>
                                i === index ? { ...item, description: event.target.value } : item
                              ),
                            }))
                          }
                          className="w-full resize-y border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                      </div>
                      {slide.imageUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setLoginPage((current) => ({
                              ...current,
                              slides: current.slides.map((item, i) =>
                                i === index ? { ...item, imageUrl: '' } : item
                              ),
                            }))
                          }
                          className="text-xs font-medium text-rose-700 hover:underline"
                        >
                          Reset photo to default
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </form>
          )}

          {/* PRODUCTS SECTION */}
          {activeSection === 'products' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Selecta Product Catalog ({products.length})</h2>
                  <p className="text-xs text-slate-500">Manage dealer prices, minimum stock triggers, and catalog SKUs</p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setEditingProduct(null);
                      setProductForm({
                        name: '',
                        sku: '',
                        category: 'CORNETTO',
                        flavor: '',
                        newFlavor: '',
                        dealerPrice: 0,
                        sellingPrice: 0,
                        srp: 0,
                        minStock: 10,
                        unit: 'Pieces',
                      });
                      setShowProductModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Add Product
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">SKU / Code</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Product Name</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Category</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">Price (₱)</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">Min Stock</th>
                      {isAdmin && <th className="text-center px-4 py-3 font-semibold text-slate-600">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {loadingProducts ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400">Loading products...</td>
                      </tr>
                    ) : products.map((prod) => (
                      <tr key={prod.id} className="border-b hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-rose-700">{prod.sku || prod.id}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{prod.name}</td>
                        <td className="px-4 py-3 text-slate-500">{prod.category}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-700">₱{(prod.sellingPrice || prod.unitPrice || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-slate-500">{prod.minStock || prod.minStockLevel || 10}</td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => {
                                setEditingProduct(prod);
                                setProductForm({
                                  name: prod.name,
                                  sku: prod.sku || prod.id,
                                  category: prod.category || 'CORNETTO',
                                  flavor: prod.flavor || prod.name || '',
                                  newFlavor: '',
                                  dealerPrice: prod.dealerPrice || prod.sellingPrice || 0,
                                  sellingPrice: prod.sellingPrice || prod.unitPrice || 0,
                                  srp: prod.srp || prod.sellingPrice || 0,
                                  minStock: prod.minStock || prod.minStockLevel || 10,
                                  unit: prod.unit || 'Pieces',
                                });
                                setShowProductModal(true);
                              }}
                              className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                            >
                              Edit
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STAFF SECTION */}
          {activeSection === 'staff' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Staff Accounts & Permissions</h2>
                  <p className="text-xs text-slate-500">Bookers, checkers, drivers, and dealer administrative accounts</p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setEditingStaff(null);
                      setStaffForm({ username: '', name: '', email: '', role: 'Staff', password: '', status: 'Active' });
                      setShowStaffModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Add Staff
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Name</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Username</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Role</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingStaff ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-400">Loading staff...</td>
                      </tr>
                    ) : staffList.map((member) => (
                      <tr key={member.id} className="border-b hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{member.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{member.username}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${member.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {member.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1 text-xs font-medium ${member.status === 'Active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                            <CheckCircle className="w-3 h-3" /> {member.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isAdmin && (
                            <div className="flex flex-wrap justify-center gap-1.5">
                              <button onClick={() => {
                                setEditingStaff(member);
                                setStaffForm({ username: member.username || '', name: member.name || '', email: member.email || '', role: member.role || 'Staff', password: '', status: member.status || 'Active' });
                                setShowStaffModal(true);
                              }} className="text-xs text-blue-700 border px-2 py-1 rounded-lg">Edit</button>
                              <button onClick={() => setStaffAccess(member)} className="text-xs text-slate-700 border px-2 py-1 rounded-lg">{member.status === 'Active' ? 'Stop access' : 'Allow access'}</button>
                              <button onClick={() => {
                                setSelectedStaff(member);
                                setNewPassword('');
                                setShowPasswordModal(true);
                              }} className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 border px-2 py-1 rounded-lg">
                                <Key className="w-3 h-3 text-amber-500" /> Password
                              </button>
                              {member.id !== user?.id && <button onClick={() => deleteStaff(member)} className="text-xs text-rose-700 border border-rose-200 px-2 py-1 rounded-lg">Delete</button>}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AUDIT LOGS SECTION */}
          {activeSection === 'audit' && isAdmin && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="border-b pb-4">
                <h2 className="text-lg font-bold text-slate-800">System Audit Trail</h2>
                <p className="text-xs text-slate-500">Security and operations log recording all bookings, dispatches, and overrides</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Timestamp</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">User / Staff</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Action</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Module</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingAudit ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-400">Loading audit records...</td>
                      </tr>
                    ) : auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-400">No audit records logged yet</td>
                      </tr>
                    ) : auditLogs.map((log, idx) => (
                      <tr key={idx} className="border-b hover:bg-slate-50 text-xs">
                        <td className="px-4 py-2.5 text-slate-500">{formatDateTime(log.createdAt || log.timestamp)}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-800">{log.userName || log.staffName || log.user?.name || 'System'}</td>
                        <td className="px-4 py-2.5 font-semibold text-rose-700">{log.action}</td>
                        <td className="px-4 py-2.5 text-slate-600">{log.module || log.entityType || 'General'}</td>
                        <td className="px-4 py-2.5 text-slate-500 font-mono truncate max-w-xs">{typeof log.details === 'object' ? JSON.stringify(log.details) : log.details || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">
              {editingProduct ? 'Edit Selecta SKU' : 'Add New Selecta SKU'}
            </h3>
            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">SKU / Code *</label>
                  <input
                    type="text"
                    required
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value, flavor: '', newFlavor: '' })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    {[...new Set(['CORNETTO', 'MAGNUM', 'STICK', 'TUB', 'BULK', ...products.map(p => p.category).filter(Boolean)])].map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Flavor / Variant</label>
                <select
                  value={productForm.flavor}
                  onChange={(e) => setProductForm({ ...productForm, flavor: e.target.value, newFlavor: '' })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select flavor / variant</option>
                  {[...new Set(products.filter(p => p.category === productForm.category).map(p => p.flavor?.trim() || p.name).filter(Boolean).concat(editingProduct?.flavor && !products.some(p => p.category === productForm.category && p.flavor === editingProduct.flavor) ? [editingProduct.flavor] : []))].map(flavor => (
                    <option key={flavor} value={flavor}>{flavor}</option>
                  ))}
                  <option value="__new__">Add a new flavor / variant…</option>
                </select>
                {productForm.flavor === '__new__' && (
                  <input
                    type="text"
                    value={productForm.newFlavor}
                    onChange={(e) => setProductForm({ ...productForm, newFlavor: e.target.value })}
                    placeholder="Enter the new flavor / variant"
                    className="mt-2 w-full border rounded-lg px-3 py-2 text-sm"
                  />
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Dealer Price (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.dealerPrice}
                    onChange={(e) => setProductForm({ ...productForm, dealerPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Selling Price (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.sellingPrice}
                    onChange={(e) => setProductForm({ ...productForm, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Min Alert Stock</label>
                  <input
                    type="number"
                    value={productForm.minStock}
                    onChange={(e) => setProductForm({ ...productForm, minStock: parseInt(e.target.value) || 10 })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 border rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">{editingStaff ? 'Edit User Account' : 'Add User Account'}</h3>
            <form onSubmit={handleSaveStaff} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={staffForm.username}
                    onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Role</label>
                  <select
                    value={staffForm.role}
                    onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="Staff">Staff / Booker / Driver</option>
                    <option value="Admin">Dealer Admin</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{editingStaff ? 'New Password (leave blank to keep current)' : 'Initial Password *'}</label>
                <input
                  type="password"
                  required={!editingStaff}
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              {editingStaff && <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Account Access</label>
                <select value={staffForm.status} onChange={(e) => setStaffForm({ ...staffForm, status: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="Active">Allowed</option><option value="Inactive">Stopped</option>
                </select>
              </div>}
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="px-4 py-2 border rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700"
                >
                  {editingStaff ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && selectedStaff && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-800">
              Reset Password for {selectedStaff.name}
            </h3>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-3 py-1.5 border rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
