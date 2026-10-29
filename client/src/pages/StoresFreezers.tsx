import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { formatPeso, formatDate } from '../utils/formatters';
import { getAuthToken } from '../utils/api';

// ─── TypeScript Interfaces ────────────────────────────────────────────────────

interface Customer {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  address: string;
  area: string;
  route: string;
  outstandingBalance: number;
  isActive: boolean;
  createdAt: string;
  subArea?: string;
  purok?: string;
  storePhotoPath?: string | null;
}

interface Booking {
  id: number;
  bookingNumber?: string;
  date: string;
  total: number;
  status: string;
  area: string;
}

interface Payment {
  id: number;
  date: string;
  amount: number;
  method: string;
  reference: string;
}

interface CustomerHistory {
  customer: Customer;
  bookings: Booking[];
  payments: Payment[];
  balance: number;
}

interface Verification {
  id: number;
  verifiedAt: string;
  barcode: string;
  photo?: string;
  verifiedBy: { name: string };
  notes?: string;
}

interface FreezerTransaction {
  id: string;
  action: string;
  fromStoreName?: string | null;
  fromArea?: string | null;
  toStoreName?: string | null;
  toArea?: string | null;
  reason: string;
  performedBy: string;
  createdAt: string;
}

interface Freezer {
  id: string;
  serialNumber: string;
  barcode: string;
  model: string;
  area: string;
  capacity: string;
  installDate: string;
  status: string;
  currentCustomer?: { name: string; id?: string };
  customer?: { storeName: string; id?: string };
  assignedStoreName?: string;
  nextVerificationDue?: string;
  nextDueAt?: string;
  lastVerifiedAt?: string;
  verifications: Verification[];
  transactions: FreezerTransaction[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AREAS = ['Valencia', 'Cabanglasan', 'San Fernando'];
const FREEZER_STATUSES = ['Active', 'Under Maintenance', 'Returned', 'Unassigned', 'Damaged'];
const manilaToday = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return `${parts.find(part => part.type === 'year')?.value}-${parts.find(part => part.type === 'month')?.value}-${parts.find(part => part.type === 'day')?.value}`;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function jsonHeaders(): Record<string, string> {
  return { ...authHeaders(), 'Content-Type': 'application/json' };
}

function verificationDueBadge(nextDue?: string): JSX.Element {
  if (!nextDue) return <span className="text-gray-400 text-xs">—</span>;
  const due = new Date(nextDue);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)
    return <span className="inline-block px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">Overdue</span>;
  if (diffDays <= 7)
    return <span className="inline-block px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">Due in {diffDays}d</span>;
  return <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">{formatDate(nextDue)}</span>;
}

// ─── Modal Wrapper ────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="overflow-y-auto p-6 flex-1">{children}</div>
      </div>
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORES & CUSTOMERS SUB-TAB
// ═══════════════════════════════════════════════════════════════════════════════

function StoresTab() {
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<CustomerHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: '', contactPerson: '', phone: '', address: '', area: AREAS[0], subArea: '', purok: '', dateAdded: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (areaFilter) params.set('area', areaFilter);
      const res = await fetch(`/api/customers?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCustomers((Array.isArray(data) ? data : data.customers ?? []).map((c: any) => ({
        id: c.id, name: c.storeName, contactPerson: c.ownerName, phone: c.contact ?? '',
        address: c.address ?? '', area: c.area, route: c.route ?? '',
        outstandingBalance: c.currentBalance ?? 0, isActive: c.status === 'Active',
        createdAt: c.dateAdded ?? c.createdAt, subArea: c.subArea, purok: c.purok,
        storePhotoPath: c.storePhotoPath,
      })));
    } catch {
      showToast('Failed to load customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, [search, areaFilter]);

  const openAdd = () => {
    setEditingCustomer(null);
    setForm({ name: '', contactPerson: '', phone: '', address: '', area: AREAS[0], subArea: '', purok: '', dateAdded: new Date().toISOString().slice(0, 10) });
    setPhotoFile(null);
    setShowForm(true);
  };

  const openEdit = (c: Customer) => {
    setEditingCustomer(c);
    setForm({ name: c.name, contactPerson: c.contactPerson, phone: c.phone, address: c.address, area: c.area, subArea: c.subArea ?? '', purok: c.purok ?? '', dateAdded: c.createdAt.slice(0, 10) });
    setPhotoFile(null);
    setShowForm(true);
  };

  const openHistory = async (c: Customer) => {
    setHistoryLoading(true);
    setHistoryCustomer(null);
    try {
      const res = await fetch(`/api/customers/${c.id}/history`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load history');
      const data = await res.json();
      const store: any = data.customer;
      setHistoryCustomer({
        customer: { id: store.id, name: store.storeName, contactPerson: store.ownerName, phone: store.contact ?? '', address: store.address ?? '', area: store.area, route: store.route ?? '', outstandingBalance: store.currentBalance ?? 0, isActive: store.status === 'Active', createdAt: store.dateAdded ?? store.createdAt },
        bookings: (data.bookings ?? []).map((b: any) => ({ id: b.id, bookingNumber: b.bookingNumber, date: b.bookingDate, total: b.subtotal, status: b.status })),
        payments: (data.invoices ?? []).flatMap((invoice: any) => (invoice.payments ?? []).map((p: any) => ({ id: p.id, date: p.recordedAt, amount: p.amount, method: p.paymentMethod, reference: p.referenceNumber ?? '' }))),
        balance: store.currentBalance ?? 0,
      });
    } catch {
      showToast('Failed to load customer history', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('Store name is required', 'error'); return; }
    setSaving(true);
    try {
      const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers';
      const method = editingCustomer ? 'PUT' : 'POST';
      const payload = new FormData();
      payload.append('storeName', form.name.trim());
      payload.append('ownerName', form.contactPerson.trim());
      payload.append('contact', form.phone.trim());
      payload.append('address', form.address.trim());
      payload.append('area', form.area);
      payload.append('subArea', form.subArea.trim());
      payload.append('purok', form.purok.trim());
      payload.append('dateAdded', form.dateAdded);
      if (photoFile) payload.append('storePhoto', photoFile);
      const res = await fetch(url, { method, headers: authHeaders(), body: payload });
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || 'Save failed'); }
      showToast(editingCustomer ? 'Customer updated' : 'Customer created', 'success');
      setShowForm(false);
      fetchCustomers();
    } catch {
      showToast('Failed to save customer', 'error');
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (isActive: boolean) => isActive
    ? <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Active</span>
    : <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">Inactive</span>;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          placeholder="Search by name or area..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[180px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
        />
        <select value={areaFilter} onChange={e => setAreaFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300">
          <option value="">All Areas</option>
          {AREAS.filter(a => a !== 'Other').map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <button onClick={openAdd}
          className="bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          + Add New Store
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        {loading ? <Spinner /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3 font-semibold text-gray-600">Store Name</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Contact</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Phone</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Area</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Purok / Lugar</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Date Added</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Balance</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">No customers found</td></tr>
              ) : customers.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-rose-50/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800"><div className="flex items-center gap-2">{c.storePhotoPath && <img src={c.storePhotoPath} alt="Store front" className="h-9 w-9 rounded object-cover" />}<span>{c.name}</span></div></td>
                  <td className="px-4 py-3 text-gray-600">{c.contactPerson || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.area}</td>
                  <td className="px-4 py-3 text-gray-600">{[c.purok, c.subArea].filter(Boolean).join(' · ') || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(c.createdAt)}</td>
                  <td className={`px-4 py-3 font-semibold ${c.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatPeso(c.outstandingBalance)}
                  </td>
                  <td className="px-4 py-3">{statusBadge(c.isActive)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openHistory(c)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition-colors">
                        History
                      </button>
                      <button onClick={() => openEdit(c)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-medium transition-colors">
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <Modal title={editingCustomer ? 'Edit Store/Customer' : 'Add New Store'} onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store/Customer Name <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="Enter store name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
              <input value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="Contact person name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="e.g. 09XX XXX XXXX" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address / Location</label>
              <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="Store address" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
                <select value={form.area} onChange={e => setForm({ ...form, area: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300">
                  {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lugar / Barangay</label>
                <input value={form.subArea} onChange={e => setForm({ ...form, subArea: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Enter barangay or lugar" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Purok</label><input value={form.purok} onChange={e => setForm({ ...form, purok: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Purok / sitio" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Date Added</label><input type="date" value={form.dateAdded} onChange={e => setForm({ ...form, dateAdded: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Front Store Photo</label><input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files?.[0] ?? null)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />{editingCustomer?.storePhotoPath && <img src={editingCustomer.storePhotoPath} alt="Current store front" className="mt-2 h-24 rounded object-cover" />}</div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 text-sm rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold disabled:opacity-60 transition-colors">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* History Modal */}
      {(historyLoading || historyCustomer) && (
        <Modal title="Customer History" onClose={() => { setHistoryCustomer(null); }}>
          {historyLoading ? <Spinner /> : historyCustomer && (
            <div className="space-y-5">
              {/* Info */}
              <div className="bg-rose-50 rounded-xl p-4 space-y-1">
                <p className="font-semibold text-gray-800 text-base">{historyCustomer.customer.name}</p>
                <p className="text-sm text-gray-600">Contact: {historyCustomer.customer.contactPerson || '—'} · {historyCustomer.customer.phone || '—'}</p>
                <p className="text-sm text-gray-600">Address: {historyCustomer.customer.address || '—'}</p>
                <p className={`text-sm font-semibold mt-1 ${historyCustomer.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  Outstanding Balance: {formatPeso(historyCustomer.balance)}
                </p>
              </div>

              {/* Bookings */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent Bookings</h3>
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Booking #</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Date</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Total</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyCustomer.bookings.length === 0 ? (
                        <tr><td colSpan={4} className="text-center py-4 text-gray-400">No bookings</td></tr>
                      ) : historyCustomer.bookings.map(b => (
                        <tr key={b.id} className="border-t border-gray-50">
                          <td className="px-3 py-2 text-gray-700">{b.bookingNumber ?? `#${b.id}`}</td>
                          <td className="px-3 py-2 text-gray-600">{formatDate(b.date)}</td>
                          <td className="px-3 py-2 font-medium">{formatPeso(b.total)}</td>
                          <td className="px-3 py-2 capitalize text-gray-600">{b.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payments */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent Payments</h3>
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Date</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Amount</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Method</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyCustomer.payments.length === 0 ? (
                        <tr><td colSpan={4} className="text-center py-4 text-gray-400">No payments</td></tr>
                      ) : historyCustomer.payments.map(p => (
                        <tr key={p.id} className="border-t border-gray-50">
                          <td className="px-3 py-2 text-gray-600">{formatDate(p.date)}</td>
                          <td className="px-3 py-2 font-medium text-green-700">{formatPeso(p.amount)}</td>
                          <td className="px-3 py-2 text-gray-600">{p.method}</td>
                          <td className="px-3 py-2 text-gray-500">{p.reference || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FREEZERS & VERIFICATION SUB-TAB
// ═══════════════════════════════════════════════════════════════════════════════

function FreezersTab() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [freezers, setFreezers] = useState<Freezer[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editingFreezer, setEditingFreezer] = useState<Freezer | null>(null);
  const [verifyFreezer, setVerifyFreezer] = useState<Freezer | null>(null);
  const [historyFreezer, setHistoryFreezer] = useState<Freezer | null>(null);
  const [lifecycleFreezer, setLifecycleFreezer] = useState<Freezer | null>(null);
  const [lifecycleAction, setLifecycleAction] = useState<'transfer' | 'pull-out' | 'damaged'>('transfer');
  const [destinationCustomerId, setDestinationCustomerId] = useState('');
  const [lifecycleReason, setLifecycleReason] = useState('');
  const [lifecycleSaving, setLifecycleSaving] = useState(false);

  // Freezer form
  const [form, setForm] = useState({
    serialNumber: '', barcode: '', model: '', capacity: '', installDate: '', customerId: '', area: AREAS[0], status: FREEZER_STATUSES[0],
  });
  const [saving, setSaving] = useState(false);

  // Verification form
  const [vForm, setVForm] = useState({ barcode: '', date: manilaToday(), notes: '' });
  const [vFile, setVFile] = useState<File | null>(null);
  const [vSubmitting, setVSubmitting] = useState(false);
  const [vAlreadyDone, setVAlreadyDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFreezers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (customerFilter) params.set('customerId', customerFilter);
      if (areaFilter) params.set('area', areaFilter);
      const res = await fetch(`/api/freezers?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setFreezers((Array.isArray(data) ? data : data.freezers ?? []).map((f: any) => ({
        id: f.id, serialNumber: f.serialNumber, barcode: f.barcode, model: f.model,
        capacity: '', installDate: f.custodyDate ?? '', status: f.status, area: f.area,
        currentCustomer: f.customer ? { id: f.customer.id, name: f.customer.storeName } : undefined,
        assignedStoreName: f.assignedStoreName, nextVerificationDue: f.nextDueAt,
        nextDueAt: f.nextDueAt, lastVerifiedAt: f.lastVerifiedAt,
        verifications: (f.verifications ?? []).map((v: any) => {
          const rawPhoto = String(v.photoUrl ?? v.photoPath ?? '');
          const photo = !rawPhoto || /^(https?:|data:)/.test(rawPhoto)
            ? rawPhoto
            : `/uploads/${rawPhoto.replace(/^(?:\/?uploads\/)+/, '')}`;
          return { id: v.id, verifiedAt: v.scannedAt, barcode: v.barcodeScanned, photo, verifiedBy: { name: v.staffName }, notes: v.notes };
        }),
        transactions: (f.transactions ?? []).map((t: any) => ({ id: t.id, action: t.action, fromStoreName: t.fromStoreName, fromArea: t.fromArea, toStoreName: t.toStoreName, toArea: t.toArea, reason: t.reason, performedBy: t.performedBy, createdAt: t.createdAt })),
      })));
    } catch {
      showToast('Failed to load freezers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers', { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setCustomers((Array.isArray(data) ? data : data.customers ?? []).map((c: any) => ({
        id: c.id, name: c.storeName, contactPerson: c.ownerName, phone: c.contact ?? '', address: c.address ?? '',
        area: c.area, route: c.route ?? '', outstandingBalance: c.currentBalance ?? 0,
        isActive: c.status === 'Active', createdAt: c.dateAdded ?? c.createdAt, subArea: c.subArea, purok: c.purok,
      })));
    } catch { /* silent */ }
  };

  useEffect(() => { fetchFreezers(); }, [statusFilter, customerFilter, areaFilter]);
  useEffect(() => { fetchCustomers(); }, []);

  const openAdd = () => {
    setEditingFreezer(null);
    setForm({ serialNumber: '', barcode: '', model: '', capacity: '', installDate: '', customerId: '', area: AREAS[0], status: FREEZER_STATUSES[0] });
    setShowForm(true);
  };

  const openEdit = (f: Freezer) => {
    setEditingFreezer(f);
    setForm({
      serialNumber: f.serialNumber,
      barcode: f.barcode,
      model: f.model,
      capacity: f.capacity,
      installDate: f.installDate ? f.installDate.split('T')[0] : '',
      customerId: f.currentCustomer?.id?.toString() ?? '',
      area: AREAS.includes(f.area) ? f.area : AREAS[0],
      status: f.status,
    });
    setShowForm(true);
  };

  const openVerify = (f: Freezer) => {
    setVerifyFreezer(f);
    setVForm({ barcode: '', date: manilaToday(), notes: '' });
    setVFile(null);
    setVAlreadyDone(false);
  };

  const openHistory = (f: Freezer) => setHistoryFreezer(f);

  const openLifecycle = (freezer: Freezer, action: 'transfer' | 'pull-out' | 'damaged') => {
    setLifecycleFreezer(freezer);
    setLifecycleAction(action);
    setDestinationCustomerId('');
    setLifecycleReason('');
  };

  const submitLifecycleAction = async () => {
    if (!lifecycleFreezer) return;
    if (!lifecycleReason.trim()) { showToast('Enter a reason for this freezer update', 'error'); return; }
    if (lifecycleAction === 'transfer' && !destinationCustomerId) { showToast('Select the destination store', 'error'); return; }
    setLifecycleSaving(true);
    try {
      const body: Record<string, string> = { reason: lifecycleReason.trim() };
      if (lifecycleAction === 'transfer') body.customerId = destinationCustomerId;
      const res = await fetch(`/api/freezers/${lifecycleFreezer.id}/${lifecycleAction}`, { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(body) });
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || 'Freezer update failed'); }
      const titles = { transfer: 'Freezer transferred', 'pull-out': 'Freezer pulled out', damaged: 'Freezer marked damaged' };
      showToast(titles[lifecycleAction], 'success');
      setLifecycleFreezer(null);
      await fetchFreezers();
    } catch (error: any) { showToast(error.message || 'Freezer update failed', 'error'); }
    finally { setLifecycleSaving(false); }
  };

  const handleFreezerSave = async () => {
    if (!form.serialNumber.trim() || !form.barcode.trim()) { showToast('Serial number and barcode are required', 'error'); return; }
    if (!form.model.trim()) { showToast('Freezer model or brand is required', 'error'); return; }
    setSaving(true);
    try {
      const url = editingFreezer ? `/api/freezers/${editingFreezer.id}` : '/api/freezers';
      const method = editingFreezer ? 'PUT' : 'POST';
      const body: Record<string, string> = {
        serialNumber: form.serialNumber,
        barcode: form.barcode,
        model: form.model,
        status: form.status,
        area: form.area,
      };
      if (form.installDate) body.custodyDate = form.installDate;
      if (form.customerId) body.assignedStoreId = form.customerId;
      const res = await fetch(url, { method, headers: jsonHeaders(), body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Save failed');
      showToast(editingFreezer ? 'Freezer updated' : 'Freezer added', 'success');
      setShowForm(false);
      fetchFreezers();
    } catch (error: any) {
      showToast(error.message || 'Failed to save freezer', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifySubmit = async () => {
    if (!verifyFreezer) return;
    if (!vForm.barcode.trim()) { showToast('Barcode is required', 'error'); return; }
    setVSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('barcodeScanned', vForm.barcode);
      fd.append('notes', vForm.notes);
      fd.append('verificationMonth', vForm.date.slice(0, 7));
      fd.append('scannedAt', new Date(`${vForm.date}T12:00:00+08:00`).toISOString());
      fd.append('staffName', user?.name || 'Staff');
      if (vFile) fd.append('photo', vFile);

      const res = await fetch(`/api/freezers/${verifyFreezer.id}/verify`, {
        method: 'POST',
        headers: authHeaders(), // NO Content-Type — browser sets multipart boundary
        body: fd,
      });

      if (res.status === 409) {
        setVAlreadyDone(true);
        return;
      }
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || 'Verification failed'); }
      showToast('Verification recorded successfully', 'success');
      setVerifyFreezer(null);
      fetchFreezers();
    } catch (error: any) {
      showToast(error.message || 'Failed to record verification', 'error');
    } finally {
      setVSubmitting(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      Active: 'bg-green-100 text-green-700',
      'Under Maintenance': 'bg-yellow-100 text-yellow-700',
      Unassigned: 'bg-gray-100 text-gray-600',
      Returned: 'bg-blue-100 text-blue-700',
      Damaged: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
        {status}
      </span>
    );
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={areaFilter} onChange={e => setAreaFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm"><option value="">All Areas</option>{AREAS.map(a => <option key={a} value={a}>{a}</option>)}</select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300">
          <option value="">All Statuses</option>
          {FREEZER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={customerFilter} onChange={e => setCustomerFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300">
          <option value="">All Customers</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={openAdd}
          className="ml-auto bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          + Add Freezer
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        {loading ? <Spinner /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3 font-semibold text-gray-600">Serial #</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Barcode #</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Model</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Capacity</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Assigned To</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Install Date</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Last Verified</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Next Due</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {freezers.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-gray-400">No freezers found</td></tr>
              ) : freezers.map(f => (
                <tr key={f.id} className="border-b border-gray-50 hover:bg-rose-50/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-gray-800 font-medium">{f.serialNumber}</td>
                  <td className="px-4 py-3 font-mono text-gray-600">{f.barcode}</td>
                  <td className="px-4 py-3 text-gray-600">{f.model || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{f.capacity || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{f.currentCustomer?.name || <span className="text-gray-400 italic">Unassigned</span>}</td>
                  <td className="px-4 py-3 text-gray-600">{f.installDate ? formatDate(f.installDate) : '—'}</td>
                  <td className="px-4 py-3">{statusBadge(f.status)}</td>
                  <td className="px-4 py-3 text-gray-600">{f.lastVerifiedAt ? formatDate(f.lastVerifiedAt) : <span className="text-gray-400">Never</span>}</td>
                  <td className="px-4 py-3">{verificationDueBadge(f.nextVerificationDue)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      <button onClick={() => openVerify(f)}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-medium transition-colors whitespace-nowrap">
                        Verify
                      </button>
                      <button onClick={() => openHistory(f)}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition-colors">
                        History
                      </button>
                      <button onClick={() => openEdit(f)}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 font-medium transition-colors">
                        Edit
                      </button>
                      <button onClick={() => openLifecycle(f, 'transfer')} disabled={f.status === 'Damaged'}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 font-medium transition-colors disabled:opacity-40">
                        Transfer
                      </button>
                      {f.currentCustomer && <button onClick={() => openLifecycle(f, 'pull-out')}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 font-medium transition-colors">
                        Pull Out
                      </button>}
                      {f.status !== 'Damaged' && <button onClick={() => openLifecycle(f, 'damaged')}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-medium transition-colors">
                        Damaged
                      </button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Freezer Modal */}
      {showForm && (
        <Modal title={editingFreezer ? 'Edit Freezer' : 'Add Freezer'} onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number <span className="text-red-500">*</span></label>
              <input value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="e.g. SLT-2024-001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Barcode Number <span className="text-red-500">*</span></label>
              <input value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Scan or enter freezer barcode" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model / Brand <span className="text-red-500">*</span></label>
                <input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                  placeholder="e.g. Selecta Chest 200L" />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Area</label><select value={form.area} onChange={e => setForm({ ...form, area: e.target.value, customerId: '' })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">{AREAS.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Install Date</label>
              <input type="date" value={form.installDate} onChange={e => setForm({ ...form, installDate: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Customer</label>
              <select value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300">
                <option value="">— Unassigned —</option>
                {customers.filter(c => c.area === form.area && (c.isActive || c.id === form.customerId)).map(c => <option key={c.id} value={c.id}>{c.name} ({c.area} · {c.subArea || 'No lugar'})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300">
                {FREEZER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleFreezerSave} disabled={saving}
                className="px-5 py-2 text-sm rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold disabled:opacity-60 transition-colors">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {lifecycleFreezer && (
        <Modal title={`${lifecycleAction === 'transfer' ? 'Transfer' : lifecycleAction === 'pull-out' ? 'Pull Out' : 'Report Damage'} — ${lifecycleFreezer.serialNumber}`} onClose={() => setLifecycleFreezer(null)}>
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              <p>Current store: <strong>{lifecycleFreezer.currentCustomer?.name ?? 'Unassigned'}</strong></p>
              <p>Area: <strong>{lifecycleFreezer.area}</strong></p>
            </div>
            {lifecycleAction === 'transfer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transfer to store / customer *</label>
                <select value={destinationCustomerId} onChange={e => setDestinationCustomerId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select destination</option>
                  {customers.filter(c => c.isActive).map(c => <option key={c.id} value={c.id}>{c.name} · {c.area} · {c.subArea || c.purok || 'No purok/lugar'}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
              <textarea value={lifecycleReason} onChange={e => setLifecycleReason(e.target.value)} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" placeholder={lifecycleAction === 'transfer' ? 'Why is this freezer being transferred?' : lifecycleAction === 'pull-out' ? 'Store closed, customer stopped ordering, or replacement…' : 'Describe the freezer damage…'} />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setLifecycleFreezer(null)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600">Cancel</button>
              <button onClick={submitLifecycleAction} disabled={lifecycleSaving} className="px-5 py-2 text-sm rounded-lg bg-rose-600 text-white font-semibold disabled:opacity-60">
                {lifecycleSaving ? 'Saving…' : lifecycleAction === 'transfer' ? 'Confirm Transfer' : lifecycleAction === 'pull-out' ? 'Confirm Pull Out' : 'Save Damage Report'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Verification Modal */}
      {verifyFreezer && (
        <Modal title={`Record Verification — ${verifyFreezer.serialNumber}`} onClose={() => setVerifyFreezer(null)}>
          <div className="space-y-4">
            {vAlreadyDone && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl px-4 py-3 text-sm">
                ⚠️ This freezer was already verified this period. Contact Admin to override.
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Barcode Number <span className="text-red-500">*</span></label>
              <input value={vForm.barcode} onChange={e => setVForm({ ...vForm, barcode: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 font-mono"
                placeholder="Scan or enter Selecta sticker barcode" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Verification</label>
              <input type="date" value={vForm.date} onChange={e => setVForm({ ...vForm, date: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Observations</label>
              <textarea value={vForm.notes} onChange={e => setVForm({ ...vForm, notes: e.target.value })} rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
                placeholder="Any issues, comments..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Photo Evidence</label>
              <input ref={fileInputRef} type="file" accept="image/*"
                onChange={e => setVFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100" />
              {vFile && (
                <p className="mt-1 text-xs text-gray-500">Selected: {vFile.name}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setVerifyFreezer(null)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleVerifySubmit} disabled={vSubmitting || vAlreadyDone}
                className="px-5 py-2 text-sm rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold disabled:opacity-60 transition-colors">
                {vSubmitting ? 'Submitting...' : 'Submit Verification'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Verification History Modal */}
      {historyFreezer && (
        <Modal title={`Verification History — ${historyFreezer.serialNumber}`} onClose={() => setHistoryFreezer(null)}>
          <div>
            <div className="mb-4 bg-rose-50 rounded-xl p-3 text-sm">
              <p className="font-semibold text-gray-700">{historyFreezer.model || 'Unknown Model'}</p>
              <p className="text-gray-500">Assigned to: {historyFreezer.currentCustomer?.name ?? 'Unassigned'}</p>
              <p className="text-gray-500">Status: {historyFreezer.status}</p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Date</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Barcode</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Verified By</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Photo</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {(historyFreezer.verifications ?? []).length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-gray-400">No verifications recorded yet</td></tr>
                  ) : [...(historyFreezer.verifications ?? [])].sort((a, b) => new Date(b.verifiedAt).getTime() - new Date(a.verifiedAt).getTime()).map(v => (
                    <tr key={v.id} className="border-t border-gray-50">
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{formatDate(v.verifiedAt)}</td>
                      <td className="px-3 py-2 font-mono text-gray-700">{v.barcode}</td>
                      <td className="px-3 py-2 text-gray-600">{v.verifiedBy?.name ?? '—'}</td>
                      <td className="px-3 py-2">
                        {v.photo ? (
                          <a href={v.photo.startsWith('/uploads/') ? v.photo : `/uploads/${v.photo}`} target="_blank" rel="noopener noreferrer">
                            <img src={v.photo.startsWith('/uploads/') ? v.photo : `/uploads/${v.photo}`} alt="Verification photo"
                              className="w-12 h-12 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity" />
                          </a>
                        ) : <span className="text-gray-400 text-xs">No photo</span>}
                      </td>
                      <td className="px-3 py-2 text-gray-500">{v.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h3 className="font-semibold text-gray-700 mt-5 mb-2">Assignment & condition history</h3>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  {['Date', 'Action', 'From', 'To', 'Reason', 'Recorded By'].map(label => <th key={label} className="px-3 py-2 text-left font-semibold text-gray-600">{label}</th>)}
                </tr></thead>
                <tbody>
                  {historyFreezer.transactions.length === 0 ? <tr><td colSpan={6} className="text-center py-6 text-gray-400">No assignment changes recorded yet</td></tr> : historyFreezer.transactions.map(transaction => (
                    <tr key={transaction.id} className="border-t border-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">{formatDate(transaction.createdAt)}</td>
                      <td className="px-3 py-2 font-medium">{transaction.action}</td>
                      <td className="px-3 py-2">{transaction.fromStoreName ? `${transaction.fromStoreName} · ${transaction.fromArea || ''}` : '—'}</td>
                      <td className="px-3 py-2">{transaction.toStoreName ? `${transaction.toStoreName} · ${transaction.toArea || ''}` : '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{transaction.reason}</td>
                      <td className="px-3 py-2 text-gray-600">{transaction.performedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function StoresFreezers() {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'stores' | 'freezers'>('stores');

  const tabs: { id: 'stores' | 'freezers'; label: string; icon: string }[] = [
    { id: 'stores', label: 'Stores & Customers', icon: '🏪' },
    { id: 'freezers', label: 'Freezers & Verification', icon: '🧊' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Stores & Freezers</h1>
        <p className="text-sm text-gray-500 mt-1">Manage customer stores and Selecta freezer deployments</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 mb-6 w-fit shadow-sm">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === tab.id
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeSubTab === 'stores' && <StoresTab />}
      {activeSubTab === 'freezers' && <FreezersTab />}
    </div>
  );
}
